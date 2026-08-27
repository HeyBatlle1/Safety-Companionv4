//! The four-agent adversarial pipeline, clean-roomed from Safety Companion V1/V3.
//!
//! Agent 1 (Validator, temp 0.3)      — is the field data good enough to trust?
//! Agent 2 (Risk Assessor, temp 0.7)  — what are the top hazards, quantified against BLS/OSHA baselines?
//! Agent 3 (Predictor, temp 1.0)      — what does the incident look like before it happens?
//! Agent 4 (Synthesizer)              — DETERMINISTIC RUST. Never an LLM. It assembles,
//!                                      it does not imagine. This was right in V1 and it stays.

pub mod calibration;
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
        let system = "You are a construction safety data validator with expertise in OSHA 1926 standards. \
            You analyze checklists and weather data for completeness, quality, and safety adequacy. \
            You respond ONLY with valid JSON. No markdown, no prose, no preamble."
            .to_string();
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
        let system = "You are a construction risk assessor certified in OSHA 1926 standards with \
            expertise in quantitative risk analysis. You respond ONLY with valid JSON."
            .to_string();
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
   probability: base = industry injury rate / 100 = {base_p:.4}, then apply hazard-type and
   condition multipliers (working at height x3-5, energized electrical x4, adverse weather x1.5-3,
   missing critical control x2-4). Cap at 0.95.
   severity: LOW | MEDIUM | HIGH | CRITICAL by worst credible outcome.
   risk_score: probability x severity weight (LOW=25, MEDIUM=50, HIGH=75, CRITICAL=100), 1-100.
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
        let system = "You are an incident prediction specialist. You think like an accident \
            investigator working in reverse: given today's conditions, you narrate the most \
            credible incident BEFORE it happens, so it can be prevented. You respond ONLY with valid JSON."
            .to_string();
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

fn synthesize(
    req: &AnalysisRequest,
    validation: Validation,
    risk: RiskAssessment,
    prediction: Prediction,
    pattern_alerts: Vec<PatternAlert>,
    models_used: BTreeMap<String, String>,
    provenance: Provenance,
) -> SafetyReport {
    let worst = risk
        .hazards
        .iter()
        .map(|h| h.risk_score)
        .fold(0.0_f64, f64::max)
        .max(risk.overall_risk_score);

    let has_critical_concern = validation
        .concerns
        .get("CRITICAL")
        .map(|v| !v.is_empty())
        .unwrap_or(false);

    let verdict = if has_critical_concern || worst >= 85.0 {
        Verdict::StopWork
    } else if validation.recommended_action == "REQUEST_CLARIFICATION" || validation.quality_score < 5 {
        Verdict::RequestClarification
    } else if worst >= 50.0 || !pattern_alerts.is_empty() {
        Verdict::ProceedWithControls
    } else {
        Verdict::Proceed
    };

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
