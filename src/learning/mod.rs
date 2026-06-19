//! The organism layer.
//!
//! A JHA analyzed and forgotten is a form filled out. A JHA analyzed and
//! REMEMBERED is a data point in a pattern. This module is the difference.
//!
//! Honest framing: this is not precognition. It is leading-indicator pattern
//! detection — the same thing a 30-year superintendent does in his gut, made
//! explicit, queryable, and tireless. Falls are predicted by what precedes
//! them: missing tie-off answers, repeated "N/A" on fall protection fields,
//! wind trends, the same hazard surfacing on the same site three Mondays
//! running. That is what we watch.

use crate::domain::*;
use chrono::{Duration, Utc};
use pgvector::Vector;
use sqlx::PgPool;
use uuid::Uuid;

/// Embedding dimensionality. 384 matches common sentence-transformer models so
/// a real embedder can drop in later without a schema migration.
pub const EMBED_DIM: usize = 384;

/// Deterministic feature-hashing embedder (hashing trick over word tokens).
///
/// This is deliberately NOT a neural embedding. It is a zero-dependency,
/// zero-cost, fully deterministic baseline that makes the entire pgvector
/// pipeline real and testable today. Similar checklists genuinely land near
/// each other (shared vocabulary => shared buckets). When budget allows, swap
/// in a true embedding provider behind the same function signature — the
/// schema, queries, and alert logic do not change.
pub fn hash_embed(text: &str) -> Vector {
    let mut v = vec![0.0f32; EMBED_DIM];
    for token in text
        .to_lowercase()
        .split(|c: char| !c.is_alphanumeric())
        .filter(|t| t.len() > 2)
    {
        let h = fnv1a(token.as_bytes());
        let idx = (h % EMBED_DIM as u64) as usize;
        // Sign hashing reduces collision bias.
        let sign = if (h >> 32) & 1 == 0 { 1.0 } else { -1.0 };
        v[idx] += sign;
    }
    // L2 normalize so cosine distance is meaningful.
    let norm = v.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm > 0.0 {
        for x in &mut v {
            *x /= norm;
        }
    }
    Vector::from(v)
}

fn fnv1a(bytes: &[u8]) -> u64 {
    let mut hash: u64 = 0xcbf29ce484222325;
    for &b in bytes {
        hash ^= b as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

/// Persist a finished report and its embedding into the organism's memory.
pub async fn remember(pool: &PgPool, req: &AnalysisRequest, report: &SafetyReport) -> anyhow::Result<()> {
    let checklist_text = req
        .checklist
        .responses
        .iter()
        .map(|(k, v)| format!("{}: {}", k, v))
        .collect::<Vec<_>>()
        .join("\n");
    let hazard_text = report
        .risk
        .hazards
        .iter()
        .map(|h| h.description.clone())
        .collect::<Vec<_>>()
        .join("\n");

    let combined = format!("{}\n{}", checklist_text, hazard_text);
    let embedding = hash_embed(&combined);

    sqlx::query(
        r#"insert into sc_analyses
           (id, checklist_id, project_id, company_id, work_type, naics_code,
            verdict, overall_risk_score, quality_score, prediction_confidence,
            report, embedding, created_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)"#,
    )
    .bind(report.id)
    .bind(req.checklist.id)
    .bind(req.checklist.project_id)
    .bind(req.checklist.company_id)
    .bind(&req.checklist.work_type)
    .bind(&req.checklist.naics_code)
    .bind(format!("{:?}", report.verdict))
    .bind(report.risk.overall_risk_score)
    .bind(report.validation.quality_score as i32)
    .bind(report.prediction.confidence)
    .bind(serde_json::to_value(report)?)
    .bind(&embedding)
    .bind(report.created_at)
    .execute(pool)
    .await?;

    // Hazards as individual rows so patterns are queryable per-hazard.
    for h in &report.risk.hazards {
        sqlx::query(
            r#"insert into sc_hazard_events
               (id, analysis_id, project_id, work_type, description, incident_type_hint,
                probability, severity, risk_score, embedding, created_at)
               values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)"#,
        )
        .bind(Uuid::new_v4())
        .bind(report.id)
        .bind(req.checklist.project_id)
        .bind(&req.checklist.work_type)
        .bind(&h.description)
        .bind(classify_incident_type(&h.description))
        .bind(h.probability)
        .bind(format!("{:?}", h.severity).to_uppercase())
        .bind(h.risk_score)
        .bind(hash_embed(&h.description))
        .bind(report.created_at)
        .execute(pool)
        .await?;
    }
    Ok(())
}

/// The seer's pass: BEFORE running the pipeline, ask memory what it already
/// knows about this project + trade. Returned alerts ride along into the
/// final report so today's analysis carries yesterday's lessons.
pub async fn recall_patterns(
    pool: &PgPool,
    checklist: &Checklist,
) -> anyhow::Result<Vec<PatternAlert>> {
    let mut alerts = Vec::new();
    let window_start = Utc::now() - Duration::days(30);

    // 1. Recurring hazards: same project, similar hazard text, >= 3 occurrences
    //    in 30 days. The "same loose guardrail flagged three Mondays running" case.
    if let Some(project_id) = checklist.project_id {
        let rows: Vec<(String, i64, chrono::DateTime<Utc>, chrono::DateTime<Utc>, f64)> =
            sqlx::query_as(
                r#"select incident_type_hint, count(*) as n,
                          min(created_at) as first_seen, max(created_at) as last_seen,
                          max(risk_score) as worst
                   from sc_hazard_events
                   where project_id = $1 and created_at >= $2
                   group by incident_type_hint
                   having count(*) >= 3
                   order by n desc"#,
            )
            .bind(project_id)
            .bind(window_start)
            .fetch_all(pool)
            .await?;

        for (kind, n, first, last, worst) in rows {
            alerts.push(PatternAlert {
                id: Uuid::new_v4(),
                pattern_kind: "recurring_hazard".into(),
                description: format!(
                    "'{}' hazards flagged {} times on this project in 30 days (worst risk {:.0}). \
                     This is a pinch point forming, not a coincidence.",
                    kind, n, worst
                ),
                evidence_count: n,
                first_seen: first,
                last_seen: last,
                severity: if worst >= 75.0 { Severity::Critical } else { Severity::High },
            });
        }

        // 2. Risk trend: is overall risk on this project climbing week over week?
        let trend: Option<(Option<f64>, Option<f64>)> = sqlx::query_as(
            r#"select
                 avg(overall_risk_score) filter (where created_at >= now() - interval '7 days') as recent,
                 avg(overall_risk_score) filter (where created_at < now() - interval '7 days'
                                                  and created_at >= now() - interval '30 days') as prior
               from sc_analyses where project_id = $1"#,
        )
        .bind(project_id)
        .fetch_optional(pool)
        .await?;

        if let Some((Some(recent), Some(prior))) = trend {
            if prior > 0.0 && recent > prior * 1.25 && recent >= 40.0 {
                alerts.push(PatternAlert {
                    id: Uuid::new_v4(),
                    pattern_kind: "risk_trend".into(),
                    description: format!(
                        "Project risk trending up: 7-day avg {:.0} vs prior {:.0} (+{:.0}%). \
                         Conditions are degrading faster than controls are adapting.",
                        recent, prior, (recent / prior - 1.0) * 100.0
                    ),
                    evidence_count: 0,
                    first_seen: window_start,
                    last_seen: Utc::now(),
                    severity: Severity::High,
                });
            }
        }
    }

    // 3. Semantic neighbors: has memory seen a checklist like this one end badly?
    let text = checklist
        .responses
        .iter()
        .map(|(k, v)| format!("{}: {}", k, v))
        .collect::<Vec<_>>()
        .join("\n");
    let emb = hash_embed(&text);
    let neighbors: Vec<(String, f64, f64)> = sqlx::query_as(
        r#"select verdict, overall_risk_score, 1 - (embedding <=> $1) as similarity
           from sc_analyses
           where work_type = $2
           order by embedding <=> $1
           limit 5"#,
    )
    .bind(&emb)
    .bind(&checklist.work_type)
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let bad_neighbors: Vec<&(String, f64, f64)> = neighbors
        .iter()
        .filter(|(verdict, risk, sim)| *sim > 0.6 && (*risk >= 70.0 || verdict == "StopWork"))
        .collect();
    if bad_neighbors.len() >= 2 {
        alerts.push(PatternAlert {
            id: Uuid::new_v4(),
            pattern_kind: "semantic_echo".into(),
            description: format!(
                "{} highly similar past checklists in this trade scored high-risk or stop-work. \
                 Whatever pattern they shared, this submission shares it too.",
                bad_neighbors.len()
            ),
            evidence_count: bad_neighbors.len() as i64,
            first_seen: window_start,
            last_seen: Utc::now(),
            severity: Severity::High,
        });
    }

    Ok(alerts)
}

/// Cheap keyword classifier mapping hazard text to OSHA "focus four" buckets.
/// Deterministic on purpose — alert grouping must be stable and auditable.
pub fn classify_incident_type(description: &str) -> String {
    let d = description.to_lowercase();
    if d.contains("fall") || d.contains("ladder") || d.contains("scaffold")
        || d.contains("roof") || d.contains("height") || d.contains("tie-off")
        || d.contains("guardrail") || d.contains("harness")
    {
        "fall".into()
    } else if d.contains("electro") || d.contains("electric") || d.contains("voltage")
        || d.contains("energiz") || d.contains("arc flash") || d.contains("loto")
    {
        "electrocution".into()
    } else if d.contains("struck") || d.contains("falling object") || d.contains("crane")
        || d.contains("vehicle") || d.contains("equipment strike")
    {
        "struck-by".into()
    } else if d.contains("caught") || d.contains("trench") || d.contains("excavat")
        || d.contains("cave-in") || d.contains("pinch") || d.contains("crush")
    {
        "caught-between".into()
    } else {
        "other".into()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embeddings_are_normalized_and_deterministic() {
        let a = hash_embed("fall protection harness tie-off roof edge");
        let b = hash_embed("fall protection harness tie-off roof edge");
        assert_eq!(a.as_slice(), b.as_slice());
        let norm: f32 = a.as_slice().iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!((norm - 1.0).abs() < 1e-4);
    }

    #[test]
    fn similar_text_is_closer_than_dissimilar() {
        let a = hash_embed("worker fall from scaffold no harness high wind roof edge");
        let b = hash_embed("fall hazard scaffold harness missing wind roof");
        let c = hash_embed("concrete pour rebar inspection slump test formwork");
        let cos = |x: &Vector, y: &Vector| -> f32 {
            x.as_slice().iter().zip(y.as_slice()).map(|(p, q)| p * q).sum()
        };
        assert!(cos(&a, &b) > cos(&a, &c));
    }

    #[test]
    fn focus_four_classification() {
        assert_eq!(classify_incident_type("Fall from 30ft swing stage"), "fall");
        assert_eq!(classify_incident_type("Arc flash during energized panel work"), "electrocution");
        assert_eq!(classify_incident_type("Trench cave-in, no shoring"), "caught-between");
        assert_eq!(classify_incident_type("Crane load swing over workers"), "struck-by");
    }
}
