//! Reproducibility ledger — the forensic promise made true.
//!
//! SC's core claim is forensic: "here is the reproducible reasoning behind this
//! verdict." But the pipeline has a stochastic LLM upstream of the deterministic
//! engine, so the SAME JHA can produce DIFFERENT scores on two runs — which a
//! defense attorney falsifies in thirty seconds by re-running the input. This
//! module closes that: every scored input is content-addressed (SHA-256 of the
//! exact input + model IDs + engine version), and if the identical input is seen
//! again we return the SAME stored output. Identical input -> identical output,
//! by construction, not by hope.
//!
//! The ledger is also TAMPER-EVIDENT: each entry chains to the previous
//! (entry_hash = SHA-256 of the entry's fields + prev_entry_hash), the Merkle
//! pattern lifted from Argus's `argus-audit` crate (our own DNA). Any silent
//! alteration of a historical row invalidates every entry_hash after it, so the
//! ledger can prove "produced on this date, unchanged since." The cache entry IS
//! the forensic record — one build, two wins (reproducibility + tamper-evidence).

use sha2::{Digest, Sha256};
use sqlx::{PgPool, Row};

use crate::domain::{AnalysisRequest, SafetyReport};

/// The SCORING-CONTRACT version — the single source of truth for the reproducibility
/// fingerprint. Deliberately DISTINCT from CARGO_PKG_VERSION (the software build
/// version, which bumps on every patch/alpha): this bumps ONLY when the scoring logic
/// itself changes (calibration math, verdict gates, the evidence/severity contract).
///
/// Why decoupled: if the fingerprint keyed on the software version, every alpha bump
/// would silently invalidate the entire content-addressed cache even though identical
/// inputs still score identically — breaking reproducibility for no reason. Keying on
/// the scoring contract means the cache stays valid across builds that don't touch the
/// math, and correctly invalidates when the math changes (a new-logic result should not
/// be masked by a stale cached one). BUMP THIS when calibration.rs or the verdict logic
/// changes in a way that could change a score.
pub const SCORING_CONTRACT_VERSION: &str = "4.0";

/// SHA-256 of a string, lowercase hex. (Mirrors argus-audit::sha256_hex.)
pub fn sha256_hex(input: &str) -> String {
    let digest = Sha256::digest(input.as_bytes());
    let mut s = String::with_capacity(64);
    for b in digest {
        // inline hex to avoid a dep; {:02x} is lowercase, zero-padded
        s.push_str(&format!("{b:02x}"));
    }
    s
}

/// The genesis prev-hash for the very first ledger entry (mirrors argus-audit).
pub fn genesis_prev_hash() -> String {
    sha256_hex("GENESIS")
}

/// Content-address the EXACT scored input. Deterministic: the same input always
/// produces the same fingerprint. `model_ids` and `engine_version` are folded in
/// so that swapping a model or bumping the engine is, correctly, a DIFFERENT input
/// (a new model can legitimately produce a new answer — that must not be masked by
/// returning a stale cached result from the old model).
///
/// CONTENT, not identity: we hash the fields that determine the OUTPUT — the
/// checklist responses, work type, NAICS, weather, baseline — and deliberately
/// EXCLUDE the per-submission identity/timestamp fields (checklist.id, submitted_at,
/// project/company/submitter ids). Two field-identical JHAs submitted at different
/// times with different record ids are the SAME scored input and must fingerprint
/// identically — otherwise the cache never hits and reproducibility is a no-op.
pub fn input_fingerprint(req: &AnalysisRequest, model_ids: &str, engine_version: &str) -> String {
    // Build a canonical CONTENT view by hand (not serde on the whole struct, which
    // would fold in id/timestamp). responses is a BTreeMap, so it iterates in stable
    // key order — the content string is deterministic.
    let c = &req.checklist;
    let mut content = String::new();
    content.push_str(&format!("work_type={}\n", c.work_type));
    content.push_str(&format!("naics={}\n", c.naics_code));
    for (k, v) in &c.responses {
        content.push_str(&format!("r:{k}={v}\n"));
    }
    content.push_str(&format!(
        "wind={:?}\ntemp={:?}\n",
        req.weather.wind_speed_mph, req.weather.temperature_f
    ));
    // Baseline affects the score, so it's part of the content. Serialize just it
    // (it has no volatile identity fields).
    let baseline_json = req
        .baseline
        .as_ref()
        .map(|b| serde_json::to_string(b).unwrap_or_default())
        .unwrap_or_default();
    content.push_str(&format!("baseline={baseline_json}\n"));

    let canonical = format!("{content}|models={model_ids}|engine={engine_version}");
    sha256_hex(&canonical)
}

/// A prior identical-input result, if one exists.
pub struct ReproHit {
    pub report: SafetyReport,
    pub original_created_at: chrono::DateTime<chrono::Utc>,
    pub input_hash: String,
}

/// Look up a prior analysis of the EXACT same input. Returns the most recent
/// identical-input result if present. This is what makes re-running the same JHA
/// return the same verdict — the reproducibility guarantee.
pub async fn lookup(pool: &PgPool, input_hash: &str) -> anyhow::Result<Option<ReproHit>> {
    let row = sqlx::query(
        r#"select report, created_at
             from sc_repro_ledger
            where input_hash = $1
            order by created_at desc
            limit 1"#,
    )
    .bind(input_hash)
    .fetch_optional(pool)
    .await?;

    match row {
        Some(r) => {
            let report_json: serde_json::Value = r.try_get("report")?;
            let created_at: chrono::DateTime<chrono::Utc> = r.try_get("created_at")?;
            let report: SafetyReport = serde_json::from_value(report_json)?;
            Ok(Some(ReproHit {
                report,
                original_created_at: created_at,
                input_hash: input_hash.to_string(),
            }))
        }
        None => Ok(None),
    }
}

/// Append a new entry to the tamper-evident ledger. Append-only: this is the only
/// write path — never an UPDATE or DELETE. Reads the last entry_hash to chain from
/// it, then stores (input_hash, output_hash, prev_entry_hash, entry_hash, report).
pub async fn record(
    pool: &PgPool,
    input_hash: &str,
    report: &SafetyReport,
    model_ids: &str,
    engine_version: &str,
) -> anyhow::Result<String> {
    // Resume the chain from the last persisted entry (genesis if empty).
    let prev_entry_hash = sqlx::query(
        r#"select entry_hash from sc_repro_ledger order by id desc limit 1"#,
    )
    .fetch_optional(pool)
    .await?
    .and_then(|r| r.try_get::<String, _>("entry_hash").ok())
    .unwrap_or_else(genesis_prev_hash);

    let report_json = serde_json::to_value(report)?;
    let output_hash = sha256_hex(&serde_json::to_string(report)?);

    // entry_hash = SHA-256 of this entry's own fields + prev_entry_hash. Chains the
    // ledger so any historical tampering invalidates all subsequent entry_hashes.
    let canonical = format!(
        "{input_hash}|{output_hash}|{analysis}|{models}|{engine}|{prev}",
        analysis = report.id,
        models = model_ids,
        engine = engine_version,
        prev = prev_entry_hash,
    );
    let entry_hash = sha256_hex(&canonical);

    sqlx::query(
        r#"insert into sc_repro_ledger
             (input_hash, output_hash, analysis_id, model_ids, engine_version,
              report, prev_entry_hash, entry_hash)
           values ($1,$2,$3,$4,$5,$6,$7,$8)"#,
    )
    .bind(input_hash)
    .bind(&output_hash)
    .bind(report.id)
    .bind(model_ids)
    .bind(engine_version)
    .bind(&report_json)
    .bind(&prev_entry_hash)
    .bind(&entry_hash)
    .execute(pool)
    .await?;

    Ok(entry_hash)
}

/// Verify the tamper-evident chain: walk the ledger oldest-first, recomputing each
/// entry_hash from its fields + the previous hash. Returns the id of the first
/// broken link, or None if the whole chain is intact. This is the "prove it wasn't
/// altered" operation you hand to a court.
pub async fn verify_chain(pool: &PgPool) -> anyhow::Result<Option<i64>> {
    let rows = sqlx::query(
        r#"select id, input_hash, output_hash, analysis_id, model_ids,
                  engine_version, prev_entry_hash, entry_hash
             from sc_repro_ledger order by id asc"#,
    )
    .fetch_all(pool)
    .await?;

    let mut expected_prev = genesis_prev_hash();
    for r in rows {
        let id: i64 = r.try_get("id")?;
        let input_hash: String = r.try_get("input_hash")?;
        let output_hash: String = r.try_get("output_hash")?;
        let analysis_id: uuid::Uuid = r.try_get("analysis_id")?;
        let model_ids: String = r.try_get("model_ids")?;
        let engine_version: String = r.try_get("engine_version")?;
        let prev_entry_hash: String = r.try_get("prev_entry_hash")?;
        let entry_hash: String = r.try_get("entry_hash")?;

        // 1. the chain link must match what we expect from the previous entry
        if prev_entry_hash != expected_prev {
            return Ok(Some(id));
        }
        // 2. the entry_hash must recompute from the row's own fields
        let canonical = format!(
            "{input_hash}|{output_hash}|{analysis_id}|{model_ids}|{engine_version}|{prev_entry_hash}"
        );
        if sha256_hex(&canonical) != entry_hash {
            return Ok(Some(id));
        }
        expected_prev = entry_hash;
    }
    Ok(None)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fingerprint_is_deterministic_and_input_sensitive() {
        use crate::domain::{Checklist, Weather};
        use std::collections::BTreeMap;

        let mk = |desc: &str| AnalysisRequest {
            checklist: Checklist {
                id: uuid::Uuid::nil(),
                responses: {
                    let mut m = BTreeMap::new();
                    m.insert("Work description".to_string(), desc.to_string());
                    m
                },
                work_type: "glazing".to_string(),
                naics_code: "238150".to_string(),
                project_id: None,
                company_id: None,
                submitted_by: None,
                submitted_at: chrono::DateTime::<chrono::Utc>::from_timestamp(0, 0).unwrap(),
                external_ref: None,
            },
            weather: Weather { wind_speed_mph: Some(16.0), temperature_f: Some(74.0), ..Default::default() },
            baseline: None,
        };

        let a1 = input_fingerprint(&mk("curtainwall install"), "m1", "4.0");
        let a2 = input_fingerprint(&mk("curtainwall install"), "m1", "4.0");
        let b = input_fingerprint(&mk("different work"), "m1", "4.0");
        let c = input_fingerprint(&mk("curtainwall install"), "m2", "4.0"); // model changed
        let d = input_fingerprint(&mk("curtainwall install"), "m1", "5.0"); // engine changed

        assert_eq!(a1, a2, "identical input must fingerprint identically (reproducibility)");
        assert_ne!(a1, b, "different input must fingerprint differently");
        assert_ne!(a1, c, "a model swap is a different input — must not reuse the old cache");
        assert_ne!(a1, d, "an engine bump is a different input — must not reuse the old cache");
        assert_eq!(a1.len(), 64, "SHA-256 hex is 64 chars");
    }

    #[test]
    fn genesis_and_hash_are_stable() {
        assert_eq!(genesis_prev_hash(), sha256_hex("GENESIS"));
        assert_eq!(sha256_hex("GENESIS").len(), 64);
        // known SHA-256 of the empty string, as a sanity check on the hasher
        assert_eq!(
            sha256_hex(""),
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    }
}
