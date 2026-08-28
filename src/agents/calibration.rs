//! Deterministic risk calibration in log-odds space.
//!
//! WHAT THE PROBABILITY MEANS (the referent — defined explicitly so it is not
//! ambiguous to a reviewer, and so the incident-feedback loop is well-posed):
//!
//!   `probability`          = P(one OSHA-recordable injury to one exposed worker,
//!                            during one shift (~8h / ~2000h-year ÷ 250 shifts) of
//!                            exposure to THIS hazard, BEFORE credited controls).
//!   `residual_probability` = the same, AFTER credited controls.
//!
//! The window is PER-WORKER-SHIFT on purpose: it matches the artifact (a daily JHA /
//! toolbox talk) and the decision a foreman actually makes ("is my crew safe on THIS
//! shift"). Base rates arrive as annual BLS/OSHA TRIR (recordable injuries per 100
//! full-time workers per year) and are converted to per-shift here. A per-shift number
//! is small by nature (recordable injuries are, thankfully, rare on any single shift);
//! calibration accuracy comes from AGGREGATING many per-shift predictions over time
//! (sc_incident_reports + Brier scoring), which the daily→weekly→monthly profile does
//! by design — not from the size of any single number.
//!
//! NOTE: this precise probability is for the audit trail and the feedback loop. It is
//! NOT the human-facing number. Crews see the severity-weighted risk score (1-100) and
//! a three-state verdict (STOP / CAUTION / GO) — an instantly actionable read, not a
//! decimal. Precise underneath, legible on top.
//!
//! V1 stacked multipliers on a base rate (height x3-5, weather x1.5-3...).
//! Multipliers compound unboundedly and nothing justifies x3 over x4. This
//! module replaces that with evidence accumulation in logit space:
//!
//!   final_logit = blend( logit(model_p),  logit(base_rate) + Σ evidence )
//!
//! Each risk factor contributes a bounded, named delta. The output is always
//! a valid probability, every contribution is listed in the factor trail that
//! ships inside the report, and the weights below are explicit constants that
//! the incident-feedback loop (sc_incident_reports + Brier scoring) will
//! eventually tune from ground truth instead of judgment.
//!
//! Nothing here is an LLM. Same inputs, same output, forever.

use crate::domain::{Hazard, IndustryBaseline, Severity, Validation, Weather};

/// A full-time work-year is ~2000 h; at ~8 h/shift that's ~250 shifts/year.
/// Single source of truth for the annual<->per-shift conversion, used both to
/// convert the base rate DOWN to per-shift (in calibrate) and to reconstruct the
/// annual-equivalent UP for the human-facing risk score (in risk_score).
const SHIFTS_PER_YEAR: f64 = 250.0;

// Probability bounds, on the PER-SHIFT scale. (Fix caught by Fable: the old
// [0.005, 0.95] bounds were tuned for the annual scale and are nonsense per-shift —
// 0.005/shift annualizes to a ~71% chance of recordable injury per worker per YEAR
// as the *minimum* for any hazard, and a 0.95/shift ceiling is beyond absurd.)
// Re-justified on the per-shift scale, sayable out loud:
//   FLOOR 1e-5/shift ≈ 0.25% annual — "rare but real"; no hazard is truly zero.
//   CEILING 0.05/shift ≈ "near-certain injury within the year" — the humility cap;
//     we never assert per-shift certainty.
const PROB_FLOOR: f64 = 1e-5;
const PROB_CEILING: f64 = 0.05;

fn logit(p: f64) -> f64 {
    // Clamp widened to 1e-6 (was 1e-4): on the per-shift scale a TRIR-1.0 industry
    // has a base of ~4e-5, which the old 1e-4 clamp silently rounded UP ~2.5x. The
    // clamp must sit below the realistic per-shift dynamic range (~1e-5..1e-2), not
    // inside it. (Fix caught by Fable.)
    let p = p.clamp(1e-6, 1.0 - 1e-6);
    (p / (1.0 - p)).ln()
}

fn sigmoid(x: f64) -> f64 {
    1.0 / (1.0 + (-x).exp())
}

pub struct Calibrated {
    pub probability: f64,
    pub residual_probability: f64,
    pub factor_trail: Vec<String>,
}

/// Calibrate one hazard's probability against deterministic site evidence.
pub fn calibrate(
    hazard: &Hazard,
    weather: &Weather,
    validation: &Validation,
    baseline: &Option<IndustryBaseline>,
) -> Calibrated {
    let mut trail = Vec::new();
    // Convert annual TRIR to a PER-WORKER-SHIFT base probability so the whole
    // calibration speaks one window (see module header for the full definition).
    //   injury_rate_per_100 = recordable injuries per 100 full-time workers PER YEAR
    //   / 100                -> annual probability for ONE worker
    //   / SHIFTS_PER_YEAR    -> per-shift probability for ONE worker
    // A full-time work-year is ~2000 h; at ~8 h/shift that's ~250 shifts/year.
    // This is a unit conversion, not a change in the underlying risk — same truth,
    // right-sized window for a daily JHA. Fallback 0.03 (annual) is likewise converted.
    // A per-shift number is small by nature; calibration accuracy comes from
    // aggregating many per-shift predictions over time (see module header).
    let annual_per_worker = baseline.as_ref().map(|b| b.injury_rate_per_100 / 100.0).unwrap_or(0.03);
    let base_rate = annual_per_worker / SHIFTS_PER_YEAR;
    let mut evidence = logit(base_rate);
    trail.push(format!(
        "base: TRIR {:.3}/100/yr -> {:.5}/worker/shift -> logit {:+.2}",
        annual_per_worker * 100.0, base_rate, evidence
    ));

    let d = hazard.description.to_lowercase();
    let add = |delta: f64, why: &str, trail: &mut Vec<String>, ev: &mut f64| {
        *ev += delta;
        trail.push(format!("{:+.2} {}", delta, why));
    };

    // Hazard-keyword matching. Two failure modes to avoid, both caught in review:
    //  - False POSITIVE (naive substring): `contains("arc")` fires inside "hierarchy".
    //  - False NEGATIVE (prefix-only stems): matching only token-prefixes misses
    //    "leading edge" (the token is "leading", not "edge") — a real, common
    //    fall-exposure phrase that would get dangerously UNDER-scored.
    //
    // Fix: match a stem if it appears anywhere in the full description as a bounded
    // word-stem — i.e. the stem sits at a word boundary (start of the description or
    // preceded by a non-letter). This catches "leading edge", "guardrail edge",
    // "aerial lift", "powered platform" while still rejecting "hierarchy"/"scavenge"
    // (where the target letters are mid-word, not at a boundary). We also carry the
    // multi-word phrases construction crews actually write.
    let has_stem = |stems: &[&str]| -> bool {
        stems.iter().any(|s| {
            let mut from = 0;
            while let Some(pos) = d[from..].find(s) {
                let abs = from + pos;
                let boundary = abs == 0
                    || !d.as_bytes()[abs - 1].is_ascii_alphabetic();
                if boundary {
                    return true;
                }
                from = abs + s.len();
                if from >= d.len() { break; }
            }
            false
        })
    };

    // --- aggravating evidence (bounded, named) ---
    //
    // Base deltas are ordered to the OSHA "Fatal Four" share of construction
    // deaths (BLS): falls ~36%, struck-by ~15%, electrocution ~7%, caught-
    // between/engulfment ~5%. Falls carry the most weight; electrical outranks
    // engulfment. These are the deterministic PRIOR; the incident-feedback loop
    // (sc_incident_reports + Brier scoring) is what will replace this ordering
    // with weights learned from THIS customer's ground truth.
    if has_stem(&["fall", "height", "roof", "scaffold", "ladder", "elevat", "aerial",
                   "edge", "guardrail", "platform", "lift", "leading edge", "unprotected",
                   "opening", "aloft", "suspended", "staging"]) {
        add(1.2, "elevated work / fall exposure (Fatal Four: falls ~36%)", &mut trail, &mut evidence);
    }
    if has_stem(&["struck", "swing", "crane", "hoist", "rigging", "load", "vehicle",
                   "backing", "falling object", "overhead", "material handling",
                   "moving equipment", "in the path"]) {
        add(0.9, "struck-by exposure (Fatal Four: struck-by ~15%)", &mut trail, &mut evidence);
    }
    if has_stem(&["energiz", "voltage", "electric", "arc", "loto", "lockout",
                   "live wire", "power line", "conductor", "cable"]) {
        add(0.8, "energized electrical exposure (Fatal Four: electrocution ~7%)", &mut trail, &mut evidence);
    }
    if has_stem(&["trench", "excavat", "engulf", "collaps", "cave-in", "cavein",
                   "shoring", "confined space", "caught-between", "pinch point"]) {
        add(0.6, "excavation / caught-between / engulfment (Fatal Four: ~5%)", &mut trail, &mut evidence);
    }
    if let Some(wind) = weather.wind_speed_mph {
        if wind > 35.0 {
            add(1.2, &format!("wind {wind:.0} mph > 35"), &mut trail, &mut evidence);
        } else if wind > 25.0 {
            add(0.8, &format!("wind {wind:.0} mph > 25"), &mut trail, &mut evidence);
        }
    }
    if let Some(t) = weather.temperature_f {
        // Graduated, not flat: a 96F day and a 110F day are not equal risk, and
        // heat is a rising OSHA enforcement priority (2026 Heat NEP). Each 10F
        // beyond the 32-95F comfort band adds evidence, capped so it can't
        // dominate the physical-hazard signal.
        let over = (t - 95.0).max(0.0);
        let under = (32.0 - t).max(0.0);
        let excursion = over.max(under);
        if excursion > 0.0 {
            let delta = (0.3 + (excursion / 10.0) * 0.3).min(1.0);
            let kind = if over > 0.0 { "heat" } else { "cold" };
            add(delta, &format!("{kind} extreme {t:.0}F ({excursion:.0}F beyond band)"), &mut trail, &mut evidence);
        }
    }
    let critical_n = validation.concerns.get("CRITICAL").map(|v| v.len()).unwrap_or(0);
    if critical_n > 0 {
        let delta = (critical_n as f64 * 0.5).min(1.5);
        add(delta, &format!("{critical_n} CRITICAL validation concern(s)"), &mut trail, &mut evidence);
    }
    if !validation.trade_specific_gaps.is_empty() {
        let delta = (validation.trade_specific_gaps.len() as f64 * 0.2).min(0.8);
        add(delta, &format!("{} trade-specific gap(s)", validation.trade_specific_gaps.len()), &mut trail, &mut evidence);
    }

    // --- mitigating evidence ---
    // NOTE: documentation QUALITY is mitigating evidence about the INHERENT risk
    // estimate (a well-documented JHA means the model/rules are working from better
    // information), so it belongs here. CONTROLS do NOT — they don't change the
    // inherent risk, they reduce the RESIDUAL risk, and they are applied exactly once
    // in the residual calculation below.
    if validation.quality_score >= 8 {
        add(-0.6, "high-quality, specific field documentation", &mut trail, &mut evidence);
    }
    let control_n = hazard.controls.len();
    // Controls are deliberately NOT credited in the evidence sum. (Fix caught by Fable:
    // they were double-counted — once here as -0.25n and again as 0.85^n on the
    // residual. `probability` is INHERENT risk, before controls; `residual_probability`
    // is after. Controls apply exactly ONCE, in the residual below. Crediting them here
    // too made a documented site look less inherently hazardous than an identical
    // undocumented one, which is wrong — the hazard is the hazard; controls manage it.)

    // Blend model judgment with deterministic evidence — but as an OFFSET, not a
    // second absolute level. (Fix caught by Fable: the model's probability is an
    // unanchored ~annual judgment with no defined window; averaging logit(0.3)
    // directly against a per-shift evidence sum blends two different referents and
    // inflates the odds ~31x. LLMs are also just bad at absolute small probabilities.)
    //
    // The sturdy design: treat the model as evidence about RELATIVE risk. It sees
    // nuance the rules can't ("the operator is new", "two crews share this tie-back").
    // So we let it push the shared per-shift prior UP or DOWN by how much more/less
    // risky it judges THIS hazard vs. a typical elicited hazard (MODEL_REFERENCE_P),
    // weighted and bounded. The referent stays per-shift everywhere; the model can
    // only nudge, never redefine the scale.
    //
    // MODEL_REFERENCE_P (~0.3) is what a typical hazard elicitation returns from the
    // model given our prompt; it's the zero-point of the offset. Measure it from logs
    // and pin it here — a documented anchor, not a guess. The offset is clamped so a
    // wild model estimate can't dominate the deterministic prior.
    const MODEL_WEIGHT: f64 = 0.4;
    const MODEL_REFERENCE_P: f64 = 0.3;
    let model_offset = logit(hazard.probability.clamp(0.001, 0.95)) - logit(MODEL_REFERENCE_P);
    let bounded_offset = (MODEL_WEIGHT * model_offset).clamp(-2.0, 2.0);
    let blended = evidence + bounded_offset;
    // Bounded to a per-shift range [PROB_FLOOR, PROB_CEILING] (see the constants at
    // module top — both re-justified on the per-shift scale, NOT the old annual one).
    let probability = sigmoid(blended).clamp(PROB_FLOOR, PROB_CEILING);
    trail.push(format!(
        "blend: evidence {:+.2} + model offset {:+.2} (p={:.2} vs ref {:.2}, x{:.1}, clamped) -> p={:.5}",
        evidence, bounded_offset, hazard.probability, MODEL_REFERENCE_P, MODEL_WEIGHT, probability
    ));

    // Residual risk: probability after credited controls. Controls reduce residual
    // MULTIPLICATIVELY (each control removes a bounded fraction of the remaining risk),
    // floored at 20% of pre-control probability — controls fail, gravity doesn't, so a
    // hazard is never driven to near-zero just because paperwork exists.
    //
    // Why multiplicative, not an additive logit shove (caught when the per-shift base-
    // rate conversion made probabilities ~250x smaller): an additive credit sized for
    // the old annual scale barely moves a tiny per-shift probability, so residual
    // collided with its own floor and controls stopped reducing anything. A fraction-
    // of-remaining reduction works identically at ANY magnitude — 0.5 and 0.0005 both
    // get the same proportional relief. Magnitude-independent by construction.
    //
    // Each control removes ~15% of remaining risk, capped at 80% total reduction before
    // the 20% floor also applies (so the floor is the binding safety limit, not the cap).
    let control_reduction = (1.0 - 0.15_f64).powi(control_n as i32); // fraction of risk REMAINING
    let reduced = probability * control_reduction.max(0.20); // never below 20% of pre-control
    let residual_probability = reduced.clamp(PROB_FLOOR, probability);
    trail.push(format!(
        "residual: {} control(s) x0.85 each ({:.0}% of pre-control risk remains, 20% floor) -> p={:.4}",
        control_n, control_reduction.max(0.20) * 100.0, residual_probability
    ));

    // Runtime proof-of-execution. This is the deterministic engine announcing, on
    // EVERY hazard, that it actually ran — and showing the numbers it produced. If
    // this line is absent from the log during an analysis, the engine was bypassed
    // and the score came from somewhere else (a wrapper). If it's present, the
    // factor_trail here is the ground truth behind the number the foreman sees.
    // INFO level on purpose: this is the "is the elegant logic actually firing?"
    // proof, and it must be unmissable — never gated behind a log-filter that might
    // silently not match. Concise (one line/hazard) so it informs without spamming.
    tracing::info!(
        target: "sc::calibration",
        "engine✓ p={:.6} residual={:.6} factors={} :: {}",
        probability, residual_probability, trail.len(),
        truncate(&hazard.description, 56)
    );

    Calibrated { probability, residual_probability, factor_trail: trail }
}

/// Small helper so the trace line stays one-line readable.
fn truncate(s: &str, n: usize) -> String {
    if s.chars().count() <= n { s.to_string() }
    else { format!("{}…", s.chars().take(n).collect::<String>()) }
}

/// Severity → risk-score weight. NOTE: this is called from the pipeline
/// (`agents/mod.rs`, where `risk_score = probability * severity_weight(severity)`),
/// not from `calibrate()` above — so it reads as "unused" if you review this file
/// in isolation. It lives here because it's part of the deterministic scoring
/// contract, kept next to the probability math it multiplies against.
pub fn severity_weight(s: Severity) -> f64 {
    match s {
        Severity::Low => 25.0,
        Severity::Medium => 50.0,
        Severity::High => 75.0,
        Severity::Critical => 100.0,
    }
}

/// Human-facing risk score (1-100). severity_weight and the verdict thresholds
/// in mod.rs (50 -> ProceedWithControls, 85 -> StopWork) were calibrated against
/// ANNUAL-scale probability magnitudes. `probability` is now PER-SHIFT (≈250x
/// smaller by design), so a raw `probability * severity_weight` clamps to ~1 for
/// almost every real hazard — silently killing the graduated STOP/CAUTION signal
/// the foreman actually reads. (Caught by Sonnet in review; invisible from inside
/// calibrate() because calibrate() never computes risk_score.)
///
/// Fix: reconstruct the annual-equivalent ONLY for the 1-100 display score, reusing
/// the SAME SHIFTS_PER_YEAR constant (one source of truth, not a second magic
/// number). probability / residual_probability stay per-shift and honest everywhere
/// that matters — audit trail, Brier feedback loop. Precise underneath, legible on top.
pub fn risk_score(probability: f64, severity: Severity) -> f64 {
    // Annualize correctly: 1 - (1-p)^shifts, NOT p*shifts. (Fix caught by Fable: the
    // linear form p*250 overshoots badly in the high-p region — exactly where the
    // display number matters most — e.g. p=0.01/shift is ~0.918/yr the right way but
    // 2.5 (clamped to 1.0) the linear way. Both happen to saturate here, but the
    // correct form stays honest across the whole range and won't mislead once weights
    // are tuned.) This is the probability that AT LEAST ONE such event occurs across a
    // year of shifts — the natural "annual-equivalent" for a human-facing score.
    let annualized = 1.0 - (1.0 - probability).powf(SHIFTS_PER_YEAR);
    (annualized * severity_weight(severity)).clamp(1.0, 100.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeMap;

    fn hazard(desc: &str, p: f64, controls: usize) -> Hazard {
        Hazard {
            description: desc.into(),
            probability: p,
            severity: Severity::High,
            risk_score: 50.0,
            osha_citations: vec![],
            controls: (0..controls).map(|i| format!("control {i}")).collect(),
            residual_probability: None,
            inspection_checkpoints: vec![],
            factor_trail: vec![],
        }
    }
    fn validation(quality: u8, criticals: usize) -> Validation {
        let mut concerns = BTreeMap::new();
        concerns.insert("CRITICAL".to_string(), (0..criticals).map(|i| format!("c{i}")).collect());
        Validation {
            quality_score: quality,
            data_quality: "HIGH".into(),
            missing_critical: vec![],
            insufficient_responses: vec![],
            weather_risks: vec![],
            concerns,
            trade_specific_gaps: vec![],
            recommended_action: "PROCEED".into(),
        }
    }

    #[test]
    fn bounds_hold() {
        let c = calibrate(
            &hazard("fall from roof edge in wind, energized lines, trench nearby", 0.94, 0),
            &Weather { wind_speed_mph: Some(40.0), temperature_f: Some(100.0), ..Default::default() },
            &validation(1, 5),
            &None,
        );
        assert!(c.probability <= 0.95 && c.probability >= 0.005);
        assert!(c.residual_probability <= c.probability);
    }

    #[test]
    fn worse_conditions_mean_higher_probability() {
        let good = calibrate(
            &hazard("fall from roof edge", 0.2, 5),
            &Weather { wind_speed_mph: Some(5.0), temperature_f: Some(70.0), ..Default::default() },
            &validation(9, 0),
            &None,
        );
        let bad = calibrate(
            &hazard("fall from roof edge", 0.2, 0),
            &Weather { wind_speed_mph: Some(30.0), temperature_f: Some(98.0), ..Default::default() },
            &validation(3, 3),
            &None,
        );
        assert!(bad.probability > good.probability);
    }

    #[test]
    fn controls_reduce_residual() {
        let c = calibrate(
            &hazard("fall from scaffold", 0.3, 4),
            &Weather::default(),
            &validation(8, 0),
            &None,
        );
        // STRICT on purpose (Fable: don't loosen to <=, finish the migration). For a
        // plausible moderate fall hazard, pre-control probability must sit ABOVE the
        // floor — if it's floored, the referent migration is half-done and this test
        // is the smoke detector. And controls must then STRICTLY reduce residual.
        assert!(c.probability > PROB_FLOOR,
            "moderate fall hazard floored at {} — referent migration incomplete", c.probability);
        assert!(c.residual_probability < c.probability,
            "controls did not reduce residual: {} vs {}", c.residual_probability, c.probability);
        assert!(!c.factor_trail.is_empty());
    }

    #[test]
    fn trail_is_complete_audit() {
        let c = calibrate(
            &hazard("electrocution at panel", 0.4, 2),
            &Weather::default(),
            &validation(7, 1),
            &None,
        );
        let joined = c.factor_trail.join("|");
        assert!(joined.contains("base:"));
        assert!(joined.contains("blend:"));
        assert!(joined.contains("residual:"));
    }

    // Regression: the residual floor bug (Haiku + Grok caught). Controls must buy a
    // real reduction even on a low-probability hazard, but never below 20% of the
    // pre-control probability.
    #[test]
    fn residual_floored_at_twenty_percent_not_absolute_min() {
        // low-probability hazard with many controls: residual must sit at ~20% of
        // pre-control probability, not collapse to the 0.005 absolute floor.
        let c = calibrate(
            &hazard("minor housekeeping trip risk", 0.05, 6),
            &Weather::default(),
            &validation(9, 0),
            &None,
        );
        assert!(c.residual_probability >= c.probability * 0.2 - 1e-9,
            "residual {} fell below 20% of pre-control {}", c.residual_probability, c.probability);
        assert!(c.residual_probability <= c.probability);
    }

    // Regression: the "leading edge" false-negative (Grok caught). Real fall-exposure
    // phrasing that isn't a bare "edge" token must still register fall evidence and
    // NOT be under-scored.
    #[test]
    fn leading_edge_phrasing_is_not_under_scored() {
        let explicit = calibrate(
            &hazard("fall hazard at roof edge", 0.3, 0),
            &Weather::default(), &validation(7, 0), &None,
        );
        let phrased = calibrate(
            &hazard("worker on leading edge installing guardrail from aerial lift", 0.3, 0),
            &Weather::default(), &validation(7, 0), &None,
        );
        // the phrased version must catch fall exposure too (within a small margin),
        // not read as dramatically safer than the explicit one.
        assert!(phrased.probability >= explicit.probability * 0.9,
            "leading-edge phrasing under-scored: {} vs explicit {}", phrased.probability, explicit.probability);
        // and it must actually contain the fall-exposure factor in its trail
        assert!(phrased.factor_trail.iter().any(|f| f.contains("fall exposure")),
            "leading-edge phrasing did not register fall exposure; trail: {:?}", phrased.factor_trail);
    }

    // Regression: false positives must still be rejected — "hierarchy" must not
    // trigger the "arc" (electrical) stem.
    #[test]
    fn mid_word_letters_do_not_false_trigger() {
        let c = calibrate(
            &hazard("reviewed the safety hierarchy and scavenged materials", 0.1, 0),
            &Weather::default(), &validation(9, 0), &None,
        );
        assert!(!c.factor_trail.iter().any(|f| f.contains("electrical")),
            "'hierarchy' falsely triggered electrical; trail: {:?}", c.factor_trail);
    }

    // Regression (THE SHIP-BLOCKER, caught by Sonnet): after the per-shift base-rate
    // conversion made probabilities ~250x smaller, a raw `probability * severity_weight`
    // clamped to ~1 for real hazards — silently killing the STOP/CAUTION signal the
    // foreman reads. The alarm MUST be loud when the danger is real. A genuinely
    // dangerous hazard (fall + high wind + heat + criticals) must produce a high risk
    // score, not read like a trivial one.
    #[test]
    fn dangerous_hazard_produces_loud_risk_score() {
        let c = calibrate(
            &hazard("fall from unprotected roof leading edge", 0.6, 0),
            &Weather { wind_speed_mph: Some(30.0), temperature_f: Some(98.0), ..Default::default() },
            &validation(3, 3),
            &None,
        );
        let score = risk_score(c.probability, Severity::High);
        // must land in CAUTION-or-worse territory (>= 50 trips ProceedWithControls),
        // NOT crushed to the ~1 floor. This is the alarm being audibly loud.
        assert!(score >= 50.0,
            "dangerous hazard scored only {} — the foreman's alarm went quiet on real risk", score);
    }

    // Regression: a trivial hazard must still score LOW — the alarm must also be quiet
    // when there's little danger, or "loud" means nothing. (Guards against over-
    // correcting the ship-blocker fix into "everything is HIGH".)
    #[test]
    fn trivial_hazard_stays_quiet() {
        let c = calibrate(
            &hazard("minor housekeeping: coil extension cords at end of shift", 0.05, 4),
            &Weather { wind_speed_mph: Some(5.0), temperature_f: Some(70.0), ..Default::default() },
            &validation(9, 0),
            &None,
        );
        let score = risk_score(c.probability, Severity::Low);
        assert!(score < 50.0,
            "trivial hazard scored {} — the alarm cried wolf on a low risk", score);
    }

    // --- Keyword-scorer sensitivity eval -------------------------------------
    //
    // Six independent model reviews (four cold GUI instances + Claude Code with
    // repo access + Opus) converged on one question: how sensitive is the
    // keyword/stem scorer to how a hazard is PHRASED? Because the deterministic
    // engine fires evidence factors off the LLM's prose (not structured facts),
    // a model that describes the same hazard differently can silently under-score
    // it. This eval quantifies that fragility directly: for each Fatal-Four
    // category, run many real-world phrasings of the SAME underlying hazard
    // through the real calibrate() and check whether the expected factor fired.
    // Phrasings that SHOULD fire but DON'T are coverage gaps — the concrete,
    // actionable output. A high gap count = the structured-extraction layer
    // (planned) is urgent; a low count = current stems are robust enough to run
    // a mid-tier model on the RiskAssessor. This is Grok's "score facts not prose"
    // critique, measured.

    /// Did `desc` fire the factor whose trail line contains `marker`?
    fn fires(desc: &str, marker: &str) -> bool {
        let c = calibrate(
            &hazard(desc, 0.1, 0),
            &Weather::default(),
            &validation(8, 0),
            &None,
        );
        c.factor_trail.iter().any(|f| f.contains(marker))
    }

    /// Run a category's phrasings; return the ones that FAILED to fire (the gaps).
    fn coverage_gaps<'a>(marker: &str, phrasings: &[&'a str]) -> Vec<&'a str> {
        phrasings.iter().copied().filter(|p| !fires(p, marker)).collect()
    }

    #[test]
    fn keyword_scorer_phrasing_sensitivity() {
        // Each block: the SAME hazard, phrased the way different foremen / models
        // realistically would. All SHOULD fire the category. Any that don't = gap.
        let falls = [
            "fall from roof edge",
            "worker on scaffold near unprotected leading edge",
            "elevated work on aerial lift platform",
            "employee exposed at height without guardrail",
            "working on a powered platform 30 feet up",
            "risk of falling from the second-story deck",
            "worker near an open floor opening",          // likely GAP: no stem
            "personnel aloft on suspended staging",        // likely GAP: "aloft"/"staging"
        ];
        let struck = [
            "struck by swinging crane load",
            "overhead rigging during a hoist",
            "material handling with vehicle backing",
            "falling object from above",
            "worker in the path of moving equipment",      // likely GAP: no stem
            "caught in the fall zone of a suspended load",
        ];
        let electrical = [
            "energized 480V panel",
            "live wire near the work area",
            "electric shock from exposed conductor",
            "arc flash during lockout",
            "contact with overhead power line",
            "working near an unmarked buried cable",        // likely GAP: "cable"
        ];
        let excavation = [
            "trench cave-in risk",
            "excavation without shoring",
            "confined space entry",
            "caught-between pinch point on the press",
            "soil collapse in an unprotected ditch",        // likely GAP: "ditch"/"soil"
            "engulfment hazard in the grain bin",
        ];

        let gap_falls = coverage_gaps("fall exposure", &falls);
        let gap_struck = coverage_gaps("struck-by", &struck);
        let gap_elec = coverage_gaps("electrical", &electrical);
        let gap_exc = coverage_gaps("engulfment", &excavation);

        let total: usize =
            gap_falls.len() + gap_struck.len() + gap_elec.len() + gap_exc.len();
        let tested = falls.len() + struck.len() + electrical.len() + excavation.len();

        // Report — visible with `cargo test -- --nocapture`. This is the artifact:
        // the exact phrasings the current stems miss, per category.
        println!("\n=== keyword-scorer phrasing sensitivity ===");
        println!("tested {tested} phrasings; {total} coverage gaps ({:.0}% miss rate)",
            100.0 * total as f64 / tested as f64);
        for (cat, gaps) in [
            ("falls", &gap_falls), ("struck-by", &gap_struck),
            ("electrical", &gap_elec), ("excavation", &gap_exc),
        ] {
            if !gaps.is_empty() {
                println!("  {cat} misses:");
                for g in gaps { println!("    - \"{g}\""); }
            }
        }
        println!("(gaps = phrasings that should fire but don't → add stems, or ship the extractor)\n");

        // Not a hard failure: the eval's JOB is to measure, not to pass/fail. But we
        // lock a ceiling so a REGRESSION (someone breaks the matcher and doubles the
        // miss rate) trips CI. Tune this down as stems improve.
        assert!(total <= tested / 2,
            "over half of realistic phrasings missed their category ({total}/{tested}) — \
             the scorer is too phrasing-fragile to trust without the structured extractor");
    }
}
