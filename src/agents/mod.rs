//! The four-agent adversarial pipeline, clean-roomed from Safety Companion V1/V3.
//!
//! Agent 1 (Validator, temp 0.3)      — is the field data good enough to trust?
//! Agent 2 (Risk Assessor, temp 0.7)  — what are the top hazards, quantified against BLS/OSHA baselines?
//! Agent 3 (Predictor, temp 1.0)      — what does the incident look like before it happens?
//! Agent 4 (Synthesizer)              — DETERMINISTIC RUST. Never an LLM. It assembles,
//!                                      it does not imagine. This was right in V1 and it stays.

pub mod calibration;
pub mod soul;
pub mod vision;

use crate::domain::*;
use crate::providers::{extract_json, AgentRole, CompletionRequest, LlmProvider};
use anyhow::{Context, Result};
use chrono::Utc;
use std::collections::BTreeMap;
use std::sync::Arc;
use uuid::Uuid;

pub struct Pipeline {
    provider: Arc<dyn LlmProvider>,
}

struct AgentMeta {
    model: String,
    latency_ms: u64,
}

impl Pipeline {
    pub fn new(provider: Arc<dyn LlmProvider>) -> Self {
        Self { provider }
    }

    pub fn provider(&self) -> Arc<dyn LlmProvider> {
        self.provider.clone()
    }

    /// Run the full pipeline. Pattern alerts from the learning layer are passed
    /// in so the final report carries the organism's memory, not just today's data.
    pub async fn run(
        &self,
        req: &AnalysisRequest,
        pattern_alerts: Vec<PatternAlert>,
    ) -> Result<SafetyReport> {
        let mut provenance = Provenance {
            schema_version: "4.1".into(),
            engine_version: env!("CARGO_PKG_VERSION").into(),
            ..Default::default()
        };

        let (validation, m1) = self.validate(req).await.context("agent 1 (validator)")?;
        provenance.agent_models.insert("validator".into(), m1.model);
        provenance.agent_latency_ms.insert("validator".into(), m1.latency_ms);

        // Hard gate: garbage in, no analysis out. V1 lesson preserved.
        //
        // But a REJECT flag must be CORROBORATED by the evidence. Free models
        // are inconsistent — they'll stamp REJECT_UNSAFE while scoring the same
        // plan 7/10 with zero missing fields, which bounces good JHAs with an
        // empty reason. We reject only when the data actually supports it: an
        // empty/near-empty plan, OR a reject flag backed by a low score or a
        // real list of missing critical fields. A flag alone is not evidence.
        let critical_missing = validation.missing_critical.len();
        let flagged_reject = validation.recommended_action == "REJECT_UNSAFE";
        let corroborated_reject = flagged_reject
            && (validation.quality_score < 4 || critical_missing >= 3);
        if validation.quality_score == 0 || corroborated_reject {
            return Ok(synthesize_rejection(req, validation, pattern_alerts, self.provider.model_map(), provenance));
        }
        if flagged_reject {
            tracing::warn!(
                quality = validation.quality_score,
                missing = critical_missing,
                "validator flagged REJECT_UNSAFE but evidence does not corroborate it; \
                 proceeding to full analysis (the synthesizer will still gate the final verdict)"
            );
        }

        let (mut risk, m2) = self.assess_risk(req, &validation, &pattern_alerts).await.context("agent 2 (risk assessor)")?;
        provenance.agent_models.insert("risk_assessor".into(), m2.model);
        provenance.agent_latency_ms.insert("risk_assessor".into(), m2.latency_ms);

        // Deterministic calibration pass: blend model judgment with coded
        // evidence; attach the auditable factor trail to every hazard.
        for h in &mut risk.hazards {
            let cal = calibration::calibrate(h, &req.weather, &validation, &req.baseline);
            h.probability = cal.probability;
            h.residual_probability = Some(cal.residual_probability);
            h.factor_trail = cal.factor_trail;
            h.risk_score = calibration::risk_score(cal.probability, h.severity);
        }
        if let Some(worst) = risk.hazards.iter().map(|h| h.risk_score).fold(None::<f64>, |acc, x| Some(acc.map_or(x, |a| a.max(x)))) {
            // overall = max hazard, softened by the mean of the rest
            let mean: f64 = risk.hazards.iter().map(|h| h.risk_score).sum::<f64>() / risk.hazards.len().max(1) as f64;
            risk.overall_risk_score = (0.7 * worst + 0.3 * mean).clamp(1.0, 100.0);
        }

        let (prediction, m3) = self.predict(req, &validation, &risk, &pattern_alerts).await.context("agent 3 (predictor)")?;
        provenance.agent_models.insert("predictor".into(), m3.model);
        provenance.agent_latency_ms.insert("predictor".into(), m3.latency_ms);

        Ok(synthesize(req, validation, risk, prediction, pattern_alerts, self.provider.model_map(), provenance))
    }

    async fn validate(&self, req: &AnalysisRequest) -> Result<(Validation, AgentMeta)> {
        let trade_fields = trade_specific_fields(&req.checklist.work_type);
        let baseline = baseline_text(&req.baseline);
        let system = format!("{}You are a construction safety data validator with expertise in OSHA 1926 standards. \
            You analyze checklists and weather data for completeness, quality, and safety adequacy. \
            You respond ONLY with valid JSON. No markdown, no prose, no preamble.", soul::SOUL);
        let user = format!(
            r#"INPUT DATA:
Checklist: {checklist}
Weather: {weather}
{baseline}

VALIDATION REQUIREMENTS:

1. CRITICAL FIELD VERIFICATION — universal critical fields:
   - Emergency evacuation plan with specific assembly point
   - Worker certifications (OSHA 10/30 etc., listed by type)
   - Equipment specifications (manufacturer, model, or last inspection date)
   - PPE requirements (specific types)
   - Hazard identification (minimum 3 specific hazards)
{trade_fields}

2. RESPONSE QUALITY CHECK:
   - Flag "No response", "N/A", "Same", bare "Yes/No"
   - Flag responses under 3 words for critical fields
   - Flag contradictions (e.g. "no hazards" while listing PPE)
   - Flag generic non-answers ("be careful" is not a control measure)

3. WEATHER RISK ASSESSMENT — flag if:
   - Temp < 32F or > 95F with no heat/cold stress plan
   - Wind > 25 mph with crane/scaffold work
   - Precipitation with no slip prevention
   - Visibility < 1 mile with no enhanced barriers

4. SCORING (objective):
   10 = all critical fields, specific responses, weather addressed
   8-9 = 90%+ critical fields
   6-7 = 70-89%
   4-5 = 50-69%
   1-3 = under 50%
   0 = empty/malformed

Respond ONLY with this JSON shape:
{{
  "quality_score": <0-10>,
  "data_quality": "HIGH|MEDIUM|LOW",
  "missing_critical": ["..."],
  "insufficient_responses": [{{"field": "...", "issue": "..."}}],
  "weather_risks": ["..."],
  "concerns": {{"CRITICAL": ["..."], "HIGH": ["..."], "MEDIUM": ["..."], "LOW": ["..."]}},
  "trade_specific_gaps": ["..."],
  "recommended_action": "PROCEED|REQUEST_CLARIFICATION|REJECT_UNSAFE"
}}"#,
            checklist = serde_json::to_string_pretty(&req.checklist.responses)?,
            weather = serde_json::to_string(&req.weather)?,
            baseline = baseline,
            trade_fields = trade_fields,
        );

        let t0 = std::time::Instant::now();
        let resp = self
            .provider
            .complete(CompletionRequest {
                role: AgentRole::Validator,
                system,
                user,
                temperature: 0.3,
                max_tokens: 4096,
            })
            .await?;
        let meta = AgentMeta { model: resp.model.clone(), latency_ms: t0.elapsed().as_millis() as u64 };

        let json = extract_json(&resp.text)
            .ok_or_else(|| anyhow::anyhow!("validator returned non-JSON output"))?;
        let v: Validation = serde_json::from_value(json)
            .context("validator JSON did not match expected shape")?;
        Ok((v, meta))
    }

    async fn assess_risk(&self, req: &AnalysisRequest, validation: &Validation, alerts: &[PatternAlert]) -> Result<(RiskAssessment, AgentMeta)> {
        let baseline = baseline_text(&req.baseline);
        let rate = req.baseline.as_ref().map(|b| b.injury_rate_per_100).unwrap_or(3.0);
        let system = format!("{}You are a construction risk assessor certified in OSHA 1926 standards with \
            expertise in quantitative risk analysis. You respond ONLY with valid JSON.", soul::SOUL);
        let user = format!(
            r#"SITE MEMORY (organism recall — recurring patterns on this project/trade; weigh these heavily):
{memory}

VALIDATED DATA SUMMARY:
Quality: {quality} ({score}/10)
Missing critical: {missing}
Key concerns: {concerns}

FULL CHECKLIST:
{checklist}

{baseline}

WEATHER: {weather}

METHODOLOGY:
1. Identify the TOP 3 SPECIFIC hazards. Specific means "fall from 30ft swing stage in 35mph winds",
   never "fall hazard". Hazards must be grounded in actual checklist content.
2. For each hazard:
   probability: a ROUGH first-pass estimate only. Start from base = industry injury rate / 100 =
   {base_p:.4}, then reason up for aggravating conditions (working at height, energized electrical,
   adverse weather, a missing critical control) and down for strong controls. Cap at 0.95. This is
   a STARTING SIGNAL, not the final number — a deterministic calibration engine downstream sets the
   authoritative risk index from site evidence; your estimate only nudges it. Do not agonize over
   precision here; get the ordering and the direction right.
   severity: LOW | MEDIUM | HIGH | CRITICAL by worst credible outcome.
   risk_score: leave as a rough estimate (the engine recomputes it); order-of-magnitude is enough.
   osha_citations: relevant 29 CFR 1926 sections.
   controls: hierarchy of controls, most effective first.
3. overall_risk_score: weighted toward the worst hazard, 1-100.

Respond ONLY with this JSON shape:
{{
  "hazards": [
    {{"description": "...", "probability": 0.0, "severity": "HIGH",
      "risk_score": 0.0, "osha_citations": ["1926.501(b)(1)"], "controls": ["..."],
      "inspection_checkpoints": ["physical items a competent person verifies before work starts"]}}
  ],
  "overall_risk_score": 0.0,
  "industry_percentile": null,
  "notes": ["..."]
}}"#,
            memory = memory_text(alerts),
            quality = validation.data_quality,
            score = validation.quality_score,
            missing = serde_json::to_string(&validation.missing_critical)?,
            concerns = serde_json::to_string(&validation.concerns)?,
            checklist = serde_json::to_string_pretty(&req.checklist.responses)?,
            baseline = baseline,
            weather = serde_json::to_string(&req.weather)?,
            base_p = rate / 100.0,
        );

        let t0 = std::time::Instant::now();
        let resp = self
            .provider
            .complete(CompletionRequest {
                role: AgentRole::RiskAssessor,
                system,
                user,
                temperature: 0.7,
                max_tokens: 6144,
            })
            .await?;
        let meta = AgentMeta { model: resp.model.clone(), latency_ms: t0.elapsed().as_millis() as u64 };

        let json = extract_json(&resp.text)
            .ok_or_else(|| anyhow::anyhow!("risk assessor returned non-JSON output"))?;
        let mut r: RiskAssessment =
            serde_json::from_value(json).context("risk assessor JSON did not match shape")?;
        // Deterministic sanity clamps — never let a model exceed physics.
        for h in &mut r.hazards {
            h.probability = h.probability.clamp(0.0, 0.95);
            h.risk_score = h.risk_score.clamp(1.0, 100.0);
        }
        r.overall_risk_score = r.overall_risk_score.clamp(1.0, 100.0);
        r.hazards.truncate(3);
        Ok((r, meta))
    }

    async fn predict(
        &self,
        req: &AnalysisRequest,
        validation: &Validation,
        risk: &RiskAssessment,
        alerts: &[PatternAlert],
    ) -> Result<(Prediction, AgentMeta)> {
        let system = format!("{}You are an incident prediction specialist. You think like an accident \
            investigator working in reverse: given today's conditions, you narrate the most \
            credible incident BEFORE it happens, so it can be prevented. You respond ONLY with valid JSON.", soul::SOUL);
        let user = format!(
            r#"SITE MEMORY (recurring patterns here — your scenarios should account for these):
{memory}

TODAY'S PICTURE:
Validation: quality {score}/10, gaps: {gaps}
Quantified hazards: {hazards}
Weather: {weather}
Work type: {work_type}

TASK:
1. Write 1-3 credible incident scenarios for TODAY, on THIS site, with THESE gaps.
   Each is a short narrative an experienced super would nod at — concrete sequence of events,
   not generic warnings. Name the trigger, the failure chain, the injury.
2. List the leading indicators visible RIGHT NOW that precede each scenario
   (the things a foreman could check in the next 30 minutes).
3. Prevention: the minimum set of actions that breaks each failure chain.
4. confidence: 0.0-1.0, honest. Low data quality means low confidence — say so.

Respond ONLY with this JSON shape:
{{
  "scenarios": [
    {{"narrative": "...", "incident_type": "fall|struck-by|caught-between|electrocution|other",
      "likelihood": 0.0, "severity": "HIGH", "prevention": ["..."],
      "toolbox_talk": "3-4 plain sentences a foreman reads aloud at the pre-task huddle for this scenario"}}
  ],
  "leading_indicators": ["..."],
  "confidence": 0.0
}}"#,
            memory = memory_text(alerts),
            score = validation.quality_score,
            gaps = serde_json::to_string(&validation.missing_critical)?,
            hazards = serde_json::to_string(&risk.hazards)?,
            weather = serde_json::to_string(&req.weather)?,
            work_type = req.checklist.work_type,
        );

        let t0 = std::time::Instant::now();
        let resp = self
            .provider
            .complete(CompletionRequest {
                role: AgentRole::Predictor,
                system,
                user,
                temperature: 1.0,
                max_tokens: 6144,
            })
            .await?;
        let meta = AgentMeta { model: resp.model.clone(), latency_ms: t0.elapsed().as_millis() as u64 };

        let json = extract_json(&resp.text)
            .ok_or_else(|| anyhow::anyhow!("predictor returned non-JSON output"))?;
        let mut p: Prediction =
            serde_json::from_value(json).context("predictor JSON did not match shape")?;
        p.confidence = p.confidence.clamp(0.0, 1.0);
        // Confidence is bounded by data quality. A model cannot be more confident
        // than the field data allows. Deterministic, non-negotiable.
        let quality_ceiling = (validation.quality_score as f64 / 10.0).max(0.1);
        if p.confidence > quality_ceiling {
            p.confidence = quality_ceiling;
        }
        Ok((p, meta))
    }
}

// ---------------------------------------------------------------------------
// Agent 4: Synthesizer — deterministic, auditable, boring on purpose.
// ---------------------------------------------------------------------------

/// Pure verdict decision — the most safety-critical rule in the system, so it
/// is isolated, named, and directly testable. Inputs are the two risk tracks
/// plus the hard validator gates; output is the STOP/CAUTION/GO verdict.
///
/// Design (two-track): INHERENT risk sets the ceiling of concern (a severe
/// hazard can't be talked down to GO by *listing* controls, which may be
/// claimed-not-verified); RESIDUAL risk moves the verdict down within that
/// ceiling so that doing the safe thing is rewarded.
fn decide_verdict(
    worst_inherent: f64,
    worst_inherent_p: f64,
    worst_residual: f64,
    has_critical_concern: bool,
    uncorroborated_critical: bool,
    needs_clarification: bool,
    quality_score: u8,
    has_pattern_alerts: bool,
) -> Verdict {
    // Per-shift risk index above which injury is likely enough over a year that the
    // job cannot read GO on the inherent track, REGARDLESS of the severity label the
    // model assigned. 0.01/shift ≈ 92% annualized chance of at least one recordable
    // event — a hazard that will more-likely-than-not injure someone this year. This
    // gate exists because the severity-weighted score caps a "High" hazard at ~75,
    // below the 85 stop line, so without it a near-certain High hazard reads GO. The
    // EVIDENCE governs the stop, not the model's label. (Fable P0.)
    const INHERENT_P_STOP: f64 = 0.01;

    if has_critical_concern {
        // Hard regulatory gate (e.g. no competent person on an excavation),
        // CORROBORATED by the evidence (see call site). A corroborated CRITICAL
        // concern is a hard stop no listed controls override.
        Verdict::StopWork
    } else if worst_inherent >= 85.0 {
        // Severe inherent hazard. If controls did NOT meaningfully reduce it
        // (residual still >=85), hold at StopWork. If real controls pulled the
        // residual down, reward that with ProceedWithControls rather than a flat
        // stop — but never all the way to GO on listed mitigations alone.
        if worst_residual >= 85.0 {
            Verdict::StopWork
        } else {
            Verdict::ProceedWithControls
        }
    } else if worst_inherent_p >= INHERENT_P_STOP {
        // Evidence-track gate: the raw per-shift index says injury is likely, but
        // the severity-weighted score didn't reach the 85 ceiling (the model labeled
        // it High, capping the score at ~75). The label must NOT talk a dangerous
        // hazard down to GO. Force CAUTION-or-worse: hold StopWork if controls didn't
        // meaningfully help, else ProceedWithControls — never Proceed on the label alone.
        if worst_residual >= 50.0 {
            Verdict::StopWork
        } else {
            Verdict::ProceedWithControls
        }
    } else if uncorroborated_critical {
        // The validator raised a CRITICAL concern the rest of the evidence does not
        // corroborate. Do NOT auto-slam a hard StopWork on one flaky flag (cries wolf,
        // erodes trust), but do NOT ignore it either (safety). Surface it for HUMAN
        // review — the constitutional move: an uncorroborated outlier escalates to a
        // person rather than being decided unilaterally by one model. (Fable P0.)
        Verdict::RequestClarification
    } else if needs_clarification || quality_score < 5 {
        Verdict::RequestClarification
    } else if worst_residual >= 50.0 || has_pattern_alerts {
        Verdict::ProceedWithControls
    } else {
        Verdict::Proceed
    }
}

fn synthesize(
    req: &AnalysisRequest,
    validation: Validation,
    risk: RiskAssessment,
    prediction: Prediction,
    pattern_alerts: Vec<PatternAlert>,
    models_used: BTreeMap<String, String>,
    provenance: Provenance,
) -> SafetyReport {
    // Two-track decision (residual moves the verdict, inherent sets the floor).
    //
    // INHERENT worst = how bad this job could be before controls. It sets a
    // hard floor on concern: a genuinely severe hazard cannot be fully talked
    // down to GO just because controls were *listed* (they may be claimed, not
    // verified — "unverified PFAS is not PFAS"). This preserves the property
    // that you cannot type your way out of a serious hazard.
    //
    // RESIDUAL worst = where the job lands *after* the controls the crew listed.
    // This is what moves the verdict down within the band the floor allows, so
    // that doing the safe thing is actually rewarded by a softer verdict.
    let worst_inherent = risk
        .hazards
        .iter()
        .map(|h| h.risk_score)
        .fold(0.0_f64, f64::max)
        .max(risk.overall_risk_score);

    // Worst-case INHERENT per-shift risk index across hazards, INDEPENDENT of the
    // severity label. This is the raw evidence — the calibrated per-shift number
    // itself, before it gets multiplied by a severity weight (which caps a "High"
    // score at ~75, below the 85 stop line, so a near-certain High hazard could
    // otherwise read GO — the model's *label* silently governing the stop decision).
    // Gating on this raw index means the EVIDENCE can force a stop even when the
    // model called a dangerous hazard High instead of Critical. The label can't
    // talk the evidence down.
    let worst_inherent_p = risk
        .hazards
        .iter()
        .map(|h| h.probability)
        .fold(0.0_f64, f64::max);

    // Residual score per hazard: same scoring function, fed the residual
    // (post-control) probability instead of the inherent one. Falls back to the
    // inherent score if a hazard has no residual (no controls credited).
    let worst_residual = risk
        .hazards
        .iter()
        .map(|h| match h.residual_probability {
            Some(rp) => calibration::risk_score(rp, h.severity),
            None => h.risk_score,
        })
        .fold(0.0_f64, f64::max);

    // A CRITICAL validator concern forcing an instant hard StopWork must be
    // CORROBORATED — same principle as `corroborated_reject` above: "a flag alone
    // is not evidence." A temp-0.3 model will stamp a CRITICAL concern while scoring
    // the same plan 8/10 with zero missing fields; letting that single unbacked flag
    // auto-slam a hard StopWork means the model's word unilaterally governs the
    // verdict (and cries wolf, eroding foreman trust). We corroborate against the
    // rest of the evidence: a low quality score, real missing critical fields, or a
    // genuinely elevated risk index. (Fable P0.)
    let raw_critical_concern = validation
        .concerns
        .get("CRITICAL")
        .map(|v| !v.is_empty())
        .unwrap_or(false);
    let critical_missing = validation.missing_critical.len();
    let critical_concern_corroborated = raw_critical_concern
        && (validation.quality_score < 5
            || critical_missing >= 1
            || worst_inherent_p >= 0.01);
    // An uncorroborated CRITICAL concern is NOT ignored (safety) — it is surfaced
    // for human review rather than auto-slamming a hard stop on one flaky flag.
    let uncorroborated_critical = raw_critical_concern && !critical_concern_corroborated;
    if uncorroborated_critical {
        tracing::warn!(
            quality = validation.quality_score,
            missing = critical_missing,
            "validator raised a CRITICAL concern the rest of the evidence does not \
             corroborate; routing to RequestClarification for human review rather than \
             an automatic hard StopWork"
        );
    }
    let has_critical_concern = critical_concern_corroborated;

    let verdict = decide_verdict(
        worst_inherent,
        worst_inherent_p,
        worst_residual,
        has_critical_concern,
        uncorroborated_critical,
        validation.recommended_action == "REQUEST_CLARIFICATION",
        validation.quality_score,
        !pattern_alerts.is_empty(),
    );

    let summary = build_summary(&validation, &risk, &prediction, &pattern_alerts, verdict);

    SafetyReport {
        id: Uuid::new_v4(),
        checklist_id: req.checklist.id,
        created_at: Utc::now(),
        validation,
        risk,
        prediction,
        verdict,
        summary,
        pattern_alerts,
        models_used,
        provenance: Some(provenance),
    }
}

fn synthesize_rejection(
    req: &AnalysisRequest,
    validation: Validation,
    pattern_alerts: Vec<PatternAlert>,
    models_used: BTreeMap<String, String>,
    provenance: Provenance,
) -> SafetyReport {
    let summary = format!(
        "Checklist rejected at validation (quality {}/10). Analysis would be unsafe to rely on. \
         Missing critical fields: {}. Resubmit with the gaps closed.",
        validation.quality_score,
        if validation.missing_critical.is_empty() {
            "see concerns".to_string()
        } else {
            validation.missing_critical.join(", ")
        }
    );
    SafetyReport {
        id: Uuid::new_v4(),
        checklist_id: req.checklist.id,
        created_at: Utc::now(),
        validation,
        risk: RiskAssessment { hazards: vec![], overall_risk_score: 0.0, industry_percentile: None, notes: vec![] },
        prediction: Prediction { scenarios: vec![], leading_indicators: vec![], confidence: 0.0 },
        verdict: Verdict::RequestClarification,
        summary,
        pattern_alerts,
        models_used,
        provenance: Some(provenance),
    }
}

fn build_summary(
    v: &Validation,
    r: &RiskAssessment,
    p: &Prediction,
    alerts: &[PatternAlert],
    verdict: Verdict,
) -> String {
    let mut s = String::new();
    s.push_str(&format!(
        "Verdict: {:?}. Data quality {}/10 ({}). Overall risk {:.0}/100.",
        verdict, v.quality_score, v.data_quality, r.overall_risk_score
    ));
    if let Some(top) = r.hazards.first() {
        s.push_str(&format!(" Top hazard: {} (risk {:.0}).", top.description, top.risk_score));
    }
    if let Some(sc) = p.scenarios.first() {
        let band = if sc.likelihood >= 0.66 { "more likely" }
                   else if sc.likelihood >= 0.33 { "possible" }
                   else { "less likely" };
        s.push_str(&format!(
            " Most credible incident: {} ({}, {}).",
            sc.incident_type,
            format!("{:?}", sc.severity).to_uppercase(),
            band
        ));
    }
    if !alerts.is_empty() {
        s.push_str(&format!(
            " MEMORY: {} recurring pattern(s) on this site/trade — see pattern_alerts.",
            alerts.len()
        ));
    }
    s.push_str(&format!(" Prediction confidence: {:.0}%.", p.confidence * 100.0));
    s
}

fn memory_text(alerts: &[PatternAlert]) -> String {
    if alerts.is_empty() {
        return "(no recurring patterns on file for this project/trade)".to_string();
    }
    alerts
        .iter()
        .map(|a| format!("- [{:?}] {} (seen {}x)", a.severity, a.description, a.evidence_count.max(1)))
        .collect::<Vec<_>>()
        .join("\n")
}

fn trade_specific_fields(work_type: &str) -> String {
    let wt = work_type.to_lowercase();
    let fields: &[&str] = if wt.contains("electric") {
        &["LOTO procedures", "Arc flash PPE category (0-4)", "Voltage testing procedures",
          "Qualified person certifications", "Energized work permit"]
    } else if wt.contains("roof") {
        &["Fall protection system type", "Roof edge setback distance (6 ft)",
          "Weather monitoring for wind/rain", "Ladder tie-off and 3-point contact",
          "Material storage away from edge"]
    } else if wt.contains("crane") || wt.contains("lift") {
        &["Crane operator certification", "Load chart and capacity", "Wind speed monitoring",
          "Swing radius barricaded", "Signal person identified"]
    } else if wt.contains("excavat") || wt.contains("trench") {
        &["Competent person daily inspection", "Soil type classification (A/B/C)",
          "Ladder within 25 feet", "Utility locate (811)", "Spoil pile setback"]
    } else {
        return String::new();
    };
    let mut out = String::from("\n   Trade-specific critical fields for this work type:\n");
    for f in fields {
        out.push_str(&format!("   - {}\n", f));
    }
    out
}

fn baseline_text(b: &Option<IndustryBaseline>) -> String {
    match b {
        Some(b) => format!(
            "OSHA INDUSTRY DATA ({src}):\nIndustry: {name}\nNAICS: {naics}\nInjury rate: {rate} per 100 workers ({year})",
            src = b.data_source, name = b.industry_name, naics = b.naics_code,
            rate = b.injury_rate_per_100, year = b.year
        ),
        None => "OSHA INDUSTRY DATA: none on file — use conservative construction-wide baseline of 3.0 per 100 workers.".to_string(),
    }
}

#[cfg(test)]
mod verdict_tests {
    use super::*;

    // A per-shift index below the evidence gate — used by tests that are exercising
    // OTHER paths and don't want the evidence-track gate to fire.
    const LOW_P: f64 = 0.001;

    // Baseline: a clean, low-risk job with good paperwork proceeds (GO).
    #[test]
    fn low_risk_clean_job_proceeds() {
        let v = decide_verdict(30.0, LOW_P, 20.0, false, false, false, 8, false);
        assert_eq!(v, Verdict::Proceed);
    }

    // A CORROBORATED CRITICAL concern is a hard gate: STOP regardless of how low
    // the residual risk is or how many controls were listed. You cannot type
    // your way past a missing competent person.
    #[test]
    fn critical_concern_always_stops_even_with_low_residual() {
        let v = decide_verdict(90.0, LOW_P, 5.0, true, false, false, 9, false);
        assert_eq!(v, Verdict::StopWork);
    }

    // THE FABLE P0 FIX (critical-concern corroboration): an UNCORROBORATED CRITICAL
    // concern must NOT auto-slam a hard StopWork on one flaky model flag — it routes
    // to RequestClarification (surface for human review). And it must not be ignored:
    // it can't read GO. The constitutional move — outlier escalates to a human.
    #[test]
    fn uncorroborated_critical_concern_routes_to_clarification_not_hard_stop() {
        // has_critical_concern=false (didn't corroborate), uncorroborated=true,
        // everything else benign: must be RequestClarification, never StopWork or GO.
        let v = decide_verdict(40.0, LOW_P, 20.0, false, true, false, 8, false);
        assert_eq!(v, Verdict::RequestClarification,
            "an uncorroborated CRITICAL concern must surface for human review, not auto-stop");
        assert_ne!(v, Verdict::StopWork,
            "one flaky CRITICAL flag must not slam a hard stop");
        assert_ne!(v, Verdict::Proceed,
            "an uncorroborated CRITICAL concern must never read GO");
    }

    // THE KEY CONTRACT (Grok fix #3): controls must move the verdict.
    // Same severe inherent hazard, two control states:
    //   - no meaningful controls (residual stays high) -> StopWork
    //   - real controls pull residual down             -> ProceedWithControls
    // Listing effective controls is rewarded with a softer verdict.
    #[test]
    fn controls_soften_a_severe_hazard_but_do_not_erase_it() {
        let uncontrolled = decide_verdict(90.0, LOW_P, 88.0, false, false, false, 8, false);
        assert_eq!(uncontrolled, Verdict::StopWork,
            "severe hazard with no residual reduction must STOP");

        let controlled = decide_verdict(90.0, LOW_P, 60.0, false, false, false, 8, false);
        assert_eq!(controlled, Verdict::ProceedWithControls,
            "real controls on the same hazard must soften STOP -> PROCEED_WITH_CONTROLS");

        // ...but never all the way to GO on listed mitigations alone: a severe
        // inherent hazard never returns Proceed, even if residual is tiny,
        // because listed controls may be claimed-not-verified.
        let heavily_controlled = decide_verdict(90.0, LOW_P, 10.0, false, false, false, 8, false);
        assert_ne!(heavily_controlled, Verdict::Proceed,
            "a severe inherent hazard must never become a bare GO on listed controls");
    }

    // THE FABLE P0 FIX (evidence gate): a High-severity hazard that is near-certain to
    // injure must NOT read GO just because the severity-weighted score caps at ~75
    // (below the 85 stop line). The raw per-shift evidence governs, not the label.
    #[test]
    fn high_severity_but_near_certain_injury_cannot_read_go() {
        let p_high = 0.02; // ~99% annualized chance of a recordable event — dangerous

        let bare = decide_verdict(75.0, p_high, 40.0, false, false, false, 8, false);
        assert_ne!(bare, Verdict::Proceed,
            "a near-certain High-severity hazard must never read GO — the evidence gate must fire");

        let uncontrolled = decide_verdict(75.0, p_high, 55.0, false, false, false, 8, false);
        assert_eq!(uncontrolled, Verdict::StopWork,
            "near-certain High hazard with elevated residual must STOP on the evidence track");

        let genuinely_low = decide_verdict(40.0, 0.0001, 20.0, false, false, false, 8, false);
        assert_eq!(genuinely_low, Verdict::Proceed,
            "the evidence gate must NOT fire on a genuinely low-probability hazard");
    }

    // The residual track (not inherent) drives the CAUTION threshold: a job
    // whose residual lands >=50 gets ProceedWithControls.
    #[test]
    fn moderate_residual_requires_controls_caution() {
        let v = decide_verdict(70.0, LOW_P, 55.0, false, false, false, 8, false);
        assert_eq!(v, Verdict::ProceedWithControls);
    }

    // Low residual but a recurring pattern alert still forces CAUTION — the
    // site's history is evidence.
    #[test]
    fn pattern_alert_forces_caution_even_at_low_residual() {
        let v = decide_verdict(40.0, LOW_P, 25.0, false, false, false, 8, true);
        assert_eq!(v, Verdict::ProceedWithControls);
    }

    // Poor paperwork quality routes to clarification rather than a false GO.
    #[test]
    fn low_quality_requests_clarification() {
        let v = decide_verdict(40.0, LOW_P, 30.0, false, false, false, 3, false);
        assert_eq!(v, Verdict::RequestClarification);
    }
}

// ---------------------------------------------------------------------------
// Property-based sweep — Tier 1 punch-list item: exhaustive coverage of
// decide_verdict, the most safety-critical function in the system.
//
// The 8 hand-picked cases in `verdict_tests` above document the intent at
// named points. This module sweeps the actual PARAMETER SPACE (worst_inherent
// x worst_residual x worst_inherent_p x quality_score x the four booleans)
// with proptest, so boundary values (exactly 85.0, exactly 0.01, exactly 50.0,
// and values on either side chosen by proptest's shrinker) are exercised, not
// just the numbers a human happened to pick.
//
// APPROACH: each property below encodes ONE stated safety invariant — not a
// restatement of decide_verdict's branch order. Every property is scoped with
// an explicit precondition (a range on the generated inputs) so it asserts a
// real invariant rather than accidentally re-deriving the implementation.
// Where two gates could both be "live" for the same input (see the FLAG in
// PROPERTY 5's doc comment), the precondition excludes the overlap rather than
// silently asserting whichever branch happens to win — that overlap is a
// separate, reported finding, not something to paper over in a passing test.
//
// SCOPE: this module characterizes EXISTING behavior. It does not change
// decide_verdict, calibration.rs, or any production logic.
#[cfg(test)]
mod verdict_properties {
    use super::*;
    use proptest::prelude::*;

    // Mirrors the private constant inside decide_verdict (agents/mod.rs). Kept
    // in sync manually; if that constant ever moves, this must move with it —
    // there is no way to reach a private const from outside its function body.
    const INHERENT_P_STOP: f64 = 0.01;

    proptest! {
        // PROPERTY 1 — corroborated CRITICAL concern is an absolute, unconditional
        // hard stop. Nothing in the rest of the input space can override it — this
        // is the strongest guarantee in the system and the sweep proves it holds
        // no matter how low every other risk signal is.
        #[test]
        fn corroborated_critical_is_always_stopwork(
            worst_inherent in 0.0f64..=100.0,
            worst_inherent_p in 0.0f64..=0.06,
            worst_residual in 0.0f64..=100.0,
            uncorroborated_critical in any::<bool>(),
            needs_clarification in any::<bool>(),
            quality_score in 0u8..=10,
            has_pattern_alerts in any::<bool>(),
        ) {
            let v = decide_verdict(
                worst_inherent, worst_inherent_p, worst_residual,
                true, uncorroborated_critical, needs_clarification,
                quality_score, has_pattern_alerts,
            );
            prop_assert_eq!(v, Verdict::StopWork);
        }

        // PROPERTY 2 — the INHERENT-risk floor: a hazard scored >=85 (severe) can
        // never fully clear, regardless of residual, quality, pattern alerts, or
        // an uncorroborated critical concern layered on top. Never Proceed, never
        // RequestClarification. This is "you cannot type your way out of a severe
        // hazard" as an exhaustive sweep rather than the two hand-picked points
        // the unit tests checked.
        #[test]
        fn severe_inherent_hazard_never_fully_clears(
            worst_inherent in 85.0f64..=100.0,
            worst_inherent_p in 0.0f64..=0.06,
            worst_residual in 0.0f64..=100.0,
            uncorroborated_critical in any::<bool>(),
            needs_clarification in any::<bool>(),
            quality_score in 0u8..=10,
            has_pattern_alerts in any::<bool>(),
        ) {
            let v = decide_verdict(
                worst_inherent, worst_inherent_p, worst_residual,
                false, uncorroborated_critical, needs_clarification,
                quality_score, has_pattern_alerts,
            );
            prop_assert!(
                matches!(v, Verdict::StopWork | Verdict::ProceedWithControls),
                "severe inherent hazard ({worst_inherent}) produced {v:?} — the floor was undercut"
            );
        }

        // PROPERTY 2b — the exact residual boundary that decides StopWork vs
        // ProceedWithControls within the severe-hazard floor (the "controls
        // soften but do not erase" contract, swept across the boundary instead
        // of checked at three hand-picked points).
        #[test]
        fn severe_hazard_residual_boundary(
            worst_inherent in 85.0f64..=100.0,
            worst_residual in 0.0f64..=100.0,
        ) {
            let v = decide_verdict(worst_inherent, 0.0, worst_residual, false, false, false, 8, false);
            if worst_residual >= 85.0 {
                prop_assert_eq!(v, Verdict::StopWork);
            } else {
                prop_assert_eq!(v, Verdict::ProceedWithControls);
            }
        }

        // PROPERTY 3 — the EVIDENCE-track floor: a near-certain per-shift injury
        // probability (>= INHERENT_P_STOP) can never fully clear even when the
        // severity-weighted score (worst_inherent) sits below the 85 line — the
        // raw evidence overrides a model's severity label. Never Proceed, never
        // RequestClarification.
        #[test]
        fn evidence_gate_never_clears_below_severity_floor(
            worst_inherent in 0.0f64..85.0,
            worst_inherent_p in INHERENT_P_STOP..=0.06,
            worst_residual in 0.0f64..=100.0,
            uncorroborated_critical in any::<bool>(),
            needs_clarification in any::<bool>(),
            quality_score in 0u8..=10,
            has_pattern_alerts in any::<bool>(),
        ) {
            let v = decide_verdict(
                worst_inherent, worst_inherent_p, worst_residual,
                false, uncorroborated_critical, needs_clarification,
                quality_score, has_pattern_alerts,
            );
            prop_assert!(
                matches!(v, Verdict::StopWork | Verdict::ProceedWithControls),
                "near-certain per-shift injury (p={worst_inherent_p}) produced {v:?}"
            );
        }

        // PROPERTY 3b — the exact residual boundary (50.0) inside the evidence gate.
        #[test]
        fn evidence_gate_residual_boundary(
            worst_inherent in 0.0f64..85.0,
            worst_inherent_p in INHERENT_P_STOP..=0.06,
            worst_residual in 0.0f64..=100.0,
        ) {
            let v = decide_verdict(worst_inherent, worst_inherent_p, worst_residual, false, false, false, 8, false);
            if worst_residual >= 50.0 {
                prop_assert_eq!(v, Verdict::StopWork);
            } else {
                prop_assert_eq!(v, Verdict::ProceedWithControls);
            }
        }

        // PROPERTY 4 — quality_score < 5 forces RequestClarification once neither
        // severity gate (inherent or evidence) is independently live.
        #[test]
        fn low_quality_forces_clarification_absent_severity(
            worst_inherent in 0.0f64..85.0,
            worst_inherent_p in 0.0f64..INHERENT_P_STOP,
            worst_residual in 0.0f64..=100.0,
            quality_score in 0u8..5,
            has_pattern_alerts in any::<bool>(),
        ) {
            let v = decide_verdict(
                worst_inherent, worst_inherent_p, worst_residual,
                false, false, false, quality_score, has_pattern_alerts,
            );
            prop_assert_eq!(v, Verdict::RequestClarification);
        }

        // PROPERTY 5 — uncorroborated CRITICAL concern routes to human review,
        // ONLY ONCE NEITHER SEVERITY GATE IS INDEPENDENTLY LIVE.
        //
        // *** FLAG, not fixed (see write-up) ***: this property does NOT hold
        // unconditionally. decide_verdict checks worst_inherent>=85 and
        // worst_inherent_p>=INHERENT_P_STOP *before* it checks
        // uncorroborated_critical. So if a hazard is independently severe by
        // either measure AND the validator separately raised an uncorroborated
        // CRITICAL concern, the severity gate wins and the verdict can be
        // StopWork or ProceedWithControls — the uncorroborated concern is never
        // routed to a human, it's silently absorbed into a verdict that happens
        // to already be conservative. The precondition below (worst_inherent<85
        // AND worst_inherent_p<INHERENT_P_STOP) excludes exactly that overlap so
        // this property states only what's actually true. See the write-up for
        // whether the overlap itself is intended.
        #[test]
        fn uncorroborated_critical_routes_to_clarification_when_not_independently_severe(
            worst_inherent in 0.0f64..85.0,
            worst_inherent_p in 0.0f64..INHERENT_P_STOP,
            worst_residual in 0.0f64..=100.0,
            needs_clarification in any::<bool>(),
            quality_score in 0u8..=10,
            has_pattern_alerts in any::<bool>(),
        ) {
            let v = decide_verdict(
                worst_inherent, worst_inherent_p, worst_residual,
                false, true, needs_clarification, quality_score, has_pattern_alerts,
            );
            prop_assert_eq!(
                v, Verdict::RequestClarification,
                "uncorroborated critical concern (hazard not independently severe) must route to human review, got {:?}", v
            );
        }

        // PROPERTY 6 — the "clean regime" (no critical concern of either kind, no
        // explicit clarification request, decent quality, hazard not independently
        // severe by either measure): residual crossing 50 or a pattern alert is
        // exactly what separates Proceed from ProceedWithControls, and nothing
        // else does.
        #[test]
        fn clean_regime_residual_and_pattern_alert_gate(
            worst_inherent in 0.0f64..85.0,
            worst_inherent_p in 0.0f64..INHERENT_P_STOP,
            worst_residual in 0.0f64..=100.0,
            quality_score in 5u8..=10,
            has_pattern_alerts in any::<bool>(),
        ) {
            let v = decide_verdict(
                worst_inherent, worst_inherent_p, worst_residual,
                false, false, false, quality_score, has_pattern_alerts,
            );
            if worst_residual >= 50.0 || has_pattern_alerts {
                prop_assert_eq!(v, Verdict::ProceedWithControls);
            } else {
                prop_assert_eq!(v, Verdict::Proceed);
            }
        }

        // PROPERTY 7 — monotonicity: in the clean regime, raising worst_residual
        // never makes the verdict SAFER. A property test's classic catch — an
        // implementation bug that inverted a comparison, or a clamp that folds
        // high values back down, would show up here even though no hand-picked
        // example would stumble onto it.
        #[test]
        fn residual_monotonic_in_clean_regime(
            worst_inherent in 0.0f64..85.0,
            worst_inherent_p in 0.0f64..INHERENT_P_STOP,
            a in 0.0f64..=100.0,
            b in 0.0f64..=100.0,
            quality_score in 5u8..=10,
        ) {
            let (lo, hi) = if a <= b { (a, b) } else { (b, a) };
            let v_lo = decide_verdict(worst_inherent, worst_inherent_p, lo, false, false, false, quality_score, false);
            let v_hi = decide_verdict(worst_inherent, worst_inherent_p, hi, false, false, false, quality_score, false);
            let rank = |v: Verdict| -> u8 {
                match v {
                    Verdict::Proceed => 0,
                    Verdict::ProceedWithControls => 1,
                    other => panic!("unexpected verdict {other:?} in clean regime"),
                }
            };
            prop_assert!(
                rank(v_lo) <= rank(v_hi),
                "residual {lo} -> {v_lo:?} but higher residual {hi} -> {v_hi:?} (verdict got safer as residual increased)"
            );
        }
    }
}
