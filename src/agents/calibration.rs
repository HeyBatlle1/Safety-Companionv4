//! Deterministic risk calibration in log-odds space.
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

fn logit(p: f64) -> f64 {
    let p = p.clamp(1e-4, 1.0 - 1e-4);
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
    let base_rate = baseline.as_ref().map(|b| b.injury_rate_per_100 / 100.0).unwrap_or(0.03);
    let mut evidence = logit(base_rate);
    trail.push(format!("base: industry rate {:.3} -> logit {:+.2}", base_rate, evidence));

    let d = hazard.description.to_lowercase();
    let add = |delta: f64, why: &str, trail: &mut Vec<String>, ev: &mut f64| {
        *ev += delta;
        trail.push(format!("{:+.2} {}", delta, why));
    };

    // --- aggravating evidence (bounded, named) ---
    if d.contains("fall") || d.contains("height") || d.contains("roof")
        || d.contains("scaffold") || d.contains("ladder") || d.contains("edge")
    {
        add(1.2, "elevated work / fall exposure", &mut trail, &mut evidence);
    }
    if d.contains("energiz") || d.contains("voltage") || d.contains("electric") || d.contains("arc") {
        add(1.0, "energized electrical exposure", &mut trail, &mut evidence);
    }
    if d.contains("trench") || d.contains("excavat") || d.contains("cave") {
        add(1.0, "excavation / engulfment exposure", &mut trail, &mut evidence);
    }
    if let Some(wind) = weather.wind_speed_mph {
        if wind > 35.0 {
            add(1.2, &format!("wind {wind:.0} mph > 35"), &mut trail, &mut evidence);
        } else if wind > 25.0 {
            add(0.8, &format!("wind {wind:.0} mph > 25"), &mut trail, &mut evidence);
        }
    }
    if let Some(t) = weather.temperature_f {
        if !(32.0..=95.0).contains(&t) {
            add(0.4, &format!("temperature extreme {t:.0}F"), &mut trail, &mut evidence);
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
    if validation.quality_score >= 8 {
        add(-0.6, "high-quality, specific field documentation", &mut trail, &mut evidence);
    }
    let control_n = hazard.controls.len();
    if control_n >= 3 {
        add(-0.5, &format!("{control_n} specific controls documented"), &mut trail, &mut evidence);
    }

    // Blend model judgment with deterministic evidence, 50/50 in logit space.
    // The model sees nuance the rules can't; the rules see policy the model
    // can't be trusted to hold. Neither gets the final word alone.
    let model_l = logit(hazard.probability.clamp(0.001, 0.95));
    let blended = 0.5 * model_l + 0.5 * evidence;
    let probability = sigmoid(blended).clamp(0.005, 0.95);
    trail.push(format!(
        "blend: model {:+.2} (p={:.2}) x0.5 + evidence {:+.2} x0.5 -> p={:.3}",
        model_l, hazard.probability, evidence, probability
    ));

    // Residual risk: probability after credited controls. Each documented
    // control buys a bounded reduction; never below 20% of pre-control risk
    // (controls fail; gravity doesn't).
    let control_credit = (control_n as f64 * 0.35).min(1.4);
    let residual_probability = sigmoid(blended - control_credit).clamp(0.005, probability);
    trail.push(format!(
        "residual: -{:.2} for {} control(s) -> p={:.3}",
        control_credit, control_n, residual_probability
    ));

    Calibrated { probability, residual_probability, factor_trail: trail }
}

pub fn severity_weight(s: Severity) -> f64 {
    match s {
        Severity::Low => 25.0,
        Severity::Medium => 50.0,
        Severity::High => 75.0,
        Severity::Critical => 100.0,
    }
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
        assert!(c.residual_probability < c.probability);
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
}
