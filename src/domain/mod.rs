//! Core domain types for Safety Companion.
//!
//! Everything the organism thinks about is defined here: checklists in,
//! analyses out, and the learning signals that flow between them.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use uuid::Uuid;

/// A raw field-submitted checklist (JHA pre-task plan, EAP review, inspection).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Checklist {
    pub id: Uuid,
    /// Free-form key/value responses from the field. BTreeMap for stable ordering.
    pub responses: BTreeMap<String, String>,
    /// e.g. "electrical", "roofing", "crane", "excavation", "general"
    pub work_type: String,
    /// NAICS industry code, e.g. "238160" (roofing contractors)
    pub naics_code: String,
    pub project_id: Option<Uuid>,
    pub company_id: Option<Uuid>,
    pub submitted_by: Option<Uuid>,
    pub submitted_at: DateTime<Utc>,
    /// Optional Procore origin metadata (inspection id, project id on their side).
    pub external_ref: Option<ExternalRef>,
}

/// Reference back to an external system of record (Procore first).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExternalRef {
    pub system: String, // "procore"
    pub object_type: String,
    pub object_id: String,
}

/// Point-in-time weather at the worksite.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Weather {
    pub temperature_f: Option<f64>,
    pub wind_speed_mph: Option<f64>,
    pub conditions: Option<String>,
    pub precipitation: Option<String>,
    pub visibility_mi: Option<f64>,
}

/// BLS/OSHA industry baseline used to anchor probability math in real data.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndustryBaseline {
    pub naics_code: String,
    pub industry_name: String,
    pub year: i32,
    /// Recordable injury rate per 100 full-time workers.
    pub injury_rate_per_100: f64,
    pub total_cases: Option<i64>,
    pub data_source: String,
}

/// Severity buckets used across validation and risk output.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Severity {
    Low,
    Medium,
    High,
    Critical,
}

/// Agent 1 output: data quality verdict on the submitted checklist.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Validation {
    pub quality_score: u8, // 0..=10
    pub data_quality: String, // HIGH | MEDIUM | LOW
    #[serde(default)]
    pub missing_critical: Vec<String>,
    #[serde(default)]
    pub insufficient_responses: Vec<FieldIssue>,
    #[serde(default)]
    pub weather_risks: Vec<String>,
    #[serde(default)]
    pub concerns: BTreeMap<String, Vec<String>>, // keyed CRITICAL/HIGH/MEDIUM/LOW
    #[serde(default)]
    pub trade_specific_gaps: Vec<String>,
    pub recommended_action: String, // PROCEED | REQUEST_CLARIFICATION | REJECT_UNSAFE
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldIssue {
    pub field: String,
    pub issue: String,
}

/// A single quantified hazard from Agent 2.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Hazard {
    /// Specific description: "Fall from 30ft swing stage during 35mph winds"
    pub description: String,
    /// Engineered risk INDEX for this hazard (per-worker-per-shift scale internally).
    /// Serialized as `risk_index`, NOT `probability`: this is a hand-parameterized
    /// expert prior / ranking heuristic, deliberately labeled so it is never mistaken
    /// for a validated, incident-calibrated probability. The record says what it is.
    #[serde(rename = "risk_index", alias = "probability")]
    pub probability: f64, // 0.0..=1.0 internally; exposed as risk_index
    pub severity: Severity,
    pub risk_score: f64, // 1..=100
    #[serde(default)]
    pub osha_citations: Vec<String>,
    #[serde(default)]
    pub controls: Vec<String>,
    /// Residual risk index after credited controls (deterministic, from calibration).
    /// Serialized as `residual_risk_index` for the same honesty reason as `risk_index`.
    #[serde(default, rename = "residual_risk_index", alias = "residual_probability")]
    pub residual_probability: Option<f64>,
    /// What a competent person should physically verify before work starts.
    #[serde(default)]
    pub inspection_checkpoints: Vec<String>,
    /// Auditable calibration trail: every factor that moved this number.
    #[serde(default)]
    pub factor_trail: Vec<String>,
}

/// Agent 2 output.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskAssessment {
    pub hazards: Vec<Hazard>, // top 3
    pub overall_risk_score: f64,
    pub industry_percentile: Option<f64>,
    #[serde(default)]
    pub notes: Vec<String>,
}

/// Agent 3 output: forward-looking incident scenarios.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Prediction {
    pub scenarios: Vec<IncidentScenario>,
    #[serde(default)]
    pub leading_indicators: Vec<String>,
    pub confidence: f64, // 0.0..=1.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IncidentScenario {
    pub narrative: String,
    pub incident_type: String, // "fall", "struck-by", "caught-between", "electrocution", ...
    pub likelihood: f64,
    pub severity: Severity,
    #[serde(default)]
    pub prevention: Vec<String>,
    /// 3-4 sentence brief a foreman reads aloud at the pre-task huddle.
    #[serde(default)]
    pub toolbox_talk: Option<String>,
}

/// Final synthesized report (Agent 4 — deterministic Rust, never an LLM).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SafetyReport {
    pub id: Uuid,
    pub checklist_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub validation: Validation,
    pub risk: RiskAssessment,
    pub prediction: Prediction,
    pub verdict: Verdict,
    pub summary: String,
    /// Pinch-point alerts raised by the learning layer for this site/trade.
    #[serde(default)]
    pub pattern_alerts: Vec<PatternAlert>,
    pub models_used: BTreeMap<String, String>,
    #[serde(default)]
    pub provenance: Option<Provenance>,
}

/// Machine-readable record of how this report was produced. This is what
/// makes each row a training-grade data point rather than just a document.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Provenance {
    pub schema_version: String,
    /// role -> model that actually answered (not the configured chain)
    pub agent_models: BTreeMap<String, String>,
    /// role -> wall-clock latency in ms
    pub agent_latency_ms: BTreeMap<String, u64>,
    pub engine_version: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Verdict {
    Proceed,
    ProceedWithControls,
    RequestClarification,
    StopWork,
}

/// The organism's memory speaking up: a recurring pattern worth a human look.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternAlert {
    pub id: Uuid,
    pub pattern_kind: String, // "recurring_hazard", "risk_trend", "control_decay", "weather_cluster"
    pub description: String,
    pub evidence_count: i64,
    pub first_seen: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,
    pub severity: Severity,
}

/// Full input bundle for one pipeline run.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisRequest {
    pub checklist: Checklist,
    #[serde(default)]
    pub weather: Weather,
    pub baseline: Option<IndustryBaseline>,
}
