//! HTTP surface. Deliberately webhook-shaped: POST a checklist, get a report.
//! The same surface serves the web frontend, Procore webhooks, and Argus.

pub mod drawings;
pub mod eap;
pub mod gc_profiles;
pub mod people;
pub mod projects;

use crate::agents::Pipeline;
use crate::domain::*;
use crate::{db, learning, repro};
use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
use sqlx::PgPool;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub pool: Option<PgPool>,
    pub pipeline: Arc<Pipeline>,
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/", get(app_page))
        .route("/health", get(health))
        .route("/v1/stats", get(stats))
        .route("/v1/analyses", get(list_analyses))
        .route("/v1/analyses/{id}", get(get_analysis))
        .route("/v1/incidents", get(list_incidents))
        .merge(drawings::router())
        .merge(eap::router())
        .merge(gc_profiles::router())
        .merge(people::router())
        .merge(projects::router())
        .route("/v1/analyze", post(analyze))
        .route("/v1/webhooks/procore", post(procore_webhook))
        .route("/v1/incidents", post(report_incident))
        .route("/v1/vision/analyze", post(vision_analyze).layer(axum::extract::DefaultBodyLimit::max(50 * 1024 * 1024)))
        .layer(tower_http::cors::CorsLayer::permissive())
        .layer(tower_http::trace::TraceLayer::new_for_http())
        .with_state(state)
}

async fn app_page() -> axum::response::Html<&'static str> {
    axum::response::Html(include_str!("app.html"))
}

fn need_db(state: &AppState) -> Result<&sqlx::PgPool, (StatusCode, String)> {
    state.pool.as_ref().ok_or((
        StatusCode::SERVICE_UNAVAILABLE,
        "no database connected; the engine is running stateless".into(),
    ))
}

async fn stats(State(state): State<AppState>) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let pool = need_db(&state)?;
    let err = |e: sqlx::Error| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string());

    let (analyses, hazards, incidents, near_misses): (i64, i64, i64, i64) = sqlx::query_as(
        r#"select (select count(*) from sc_analyses),
                  (select count(*) from sc_hazard_events),
                  (select count(*) from sc_incident_reports),
                  (select count(*) from sc_incident_reports where near_miss)"#,
    )
    .fetch_one(pool).await.map_err(err)?;

    let verdicts: Vec<(String, i64)> = sqlx::query_as(
        "select verdict, count(*) from sc_analyses group by verdict",
    ).fetch_all(pool).await.map_err(err)?;

    let trend: Vec<(chrono::NaiveDate, f64)> = sqlx::query_as(
        r#"select created_at::date as day, avg(overall_risk_score)
           from sc_analyses where created_at >= now() - interval '14 days'
           group by day order by day"#,
    ).fetch_all(pool).await.map_err(err)?;

    // Recurring hazard patterns across the whole corpus, 30-day window.
    let patterns: Vec<(String, i64, f64)> = sqlx::query_as(
        r#"select incident_type_hint, count(*), max(risk_score)
           from sc_hazard_events where created_at >= now() - interval '30 days'
           group by incident_type_hint having count(*) >= 2
           order by count(*) desc limit 6"#,
    ).fetch_all(pool).await.map_err(err)?;

    Ok(Json(serde_json::json!({
        "analyses": analyses, "hazards": hazards,
        "incidents": incidents, "near_misses": near_misses,
        "verdicts": verdicts.into_iter().map(|(v,n)| serde_json::json!({"verdict": v, "n": n})).collect::<Vec<_>>(),
        "trend": trend.into_iter().map(|(d,r)| serde_json::json!({"day": d.to_string(), "risk": r})).collect::<Vec<_>>(),
        "patterns": patterns.into_iter().map(|(k,n,w)| serde_json::json!({"kind": k, "n": n, "worst": w})).collect::<Vec<_>>(),
    })))
}

async fn list_analyses(State(state): State<AppState>) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let pool = need_db(&state)?;
    let rows: Vec<(uuid::Uuid, chrono::DateTime<chrono::Utc>, String, String, f64, i32, f64)> = sqlx::query_as(
        r#"select id, created_at, work_type, verdict, overall_risk_score, quality_score, prediction_confidence
           from sc_analyses order by created_at desc limit 25"#,
    ).fetch_all(pool).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(serde_json::json!(rows.into_iter().map(|(id,t,w,v,r,q,c)| serde_json::json!({
        "id": id, "created_at": t, "work_type": w, "verdict": v,
        "risk": r, "quality": q, "confidence": c
    })).collect::<Vec<_>>())))
}

async fn get_analysis(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<uuid::Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let pool = need_db(&state)?;
    let row: Option<(serde_json::Value,)> = sqlx::query_as(
        "select report from sc_analyses where id = $1",
    ).bind(id).fetch_optional(pool).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    row.map(|(r,)| Json(r)).ok_or((StatusCode::NOT_FOUND, "no analysis with that id".into()))
}

async fn list_incidents(State(state): State<AppState>) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let pool = need_db(&state)?;
    let rows: Vec<(uuid::Uuid, String, String, bool, String, chrono::DateTime<chrono::Utc>)> = sqlx::query_as(
        r#"select id, incident_type, severity, near_miss, description, occurred_at
           from sc_incident_reports order by occurred_at desc limit 25"#,
    ).fetch_all(pool).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(serde_json::json!(rows.into_iter().map(|(id,t,s,nm,d,o)| serde_json::json!({
        "id": id, "incident_type": t, "severity": s, "near_miss": nm, "description": d, "occurred_at": o
    })).collect::<Vec<_>>())))
}

async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "alive",
        "service": "safety-companion",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}

/// Primary entry: run a checklist through memory recall -> pipeline -> remember.
async fn analyze(
    State(state): State<AppState>,
    Json(mut req): Json<AnalysisRequest>,
) -> Result<Json<SafetyReport>, (StatusCode, String)> {
    // Memory recall first — the seer's pass.
    let alerts = match &state.pool {
        Some(pool) => learning::recall_patterns(pool, &req.checklist)
            .await
            .unwrap_or_else(|e| {
                tracing::warn!(error = %e, "pattern recall failed; proceeding without memory");
                vec![]
            }),
        None => vec![],
    };

    // Fill industry baseline from DB if not supplied.
    if req.baseline.is_none() {
        if let Some(pool) = &state.pool {
            req.baseline = db::baseline_for(pool, &req.checklist.naics_code)
                .await
                .ok()
                .flatten();
        }
    }

    // Reproducibility fingerprint of the EXACT scored input: the request (JHA +
    // weather + baseline), the model IDs, and the engine version. Same fingerprint
    // -> same stored output, so re-running the same paperwork yields the same
    // verdict — the forensic promise ("reproducible reasoning") made literally true.
    //
    // NOTE: pattern alerts (memory recall) are deliberately EXCLUDED from the
    // fingerprint. Fable suggested folding them in for a maximally-exact "same input
    // AND same context" hash, but the live determinism test showed that's
    // self-defeating: run 1 writes a new analysis that run 2's recall then finds, so
    // the context changes between two identical submissions and the cache never hits
    // — defeating the whole guarantee. The forensic promise is about the input the
    // foreman controls; alerts still fully inform the fresh analysis, they just don't
    // fracture the content address.
    let model_ids = state
        .pipeline
        .provider()
        .model_map()
        .iter()
        .map(|(k, v)| format!("{k}={v}"))
        .collect::<Vec<_>>()
        .join(";");
    let engine_version = repro::SCORING_CONTRACT_VERSION; // single source of truth; bumps only on scoring-logic change
    let fingerprint = repro::input_fingerprint(&req, &model_ids, engine_version);

    // Cache lookup: have we scored this exact input+context before? If so, return
    // the stored report — identical input, identical output, by construction.
    if let Some(pool) = &state.pool {
        match repro::lookup(pool, &fingerprint).await {
            Ok(Some(hit)) => {
                tracing::info!(
                    fingerprint = %&fingerprint[..16],
                    original = %hit.original_created_at,
                    "repro cache HIT — returning the identical prior result (reproducibility)"
                );
                return Ok(Json(hit.report));
            }
            Ok(None) => {}
            Err(e) => tracing::warn!(error = %e, "repro lookup failed; running fresh"),
        }
    }

    let report = state
        .pipeline
        .run(&req, alerts)
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("pipeline failure: {e:#}")))?;

    // Remember. A failure to remember is logged loudly but never destroys the
    // report — the field gets its answer either way.
    if let Some(pool) = &state.pool {
        if let Err(e) = learning::remember(pool, &req, &report).await {
            tracing::error!(error = %e, report_id = %report.id, "FAILED to persist analysis — learning loop lost this data point");
        }
        // Record in the tamper-evident reproducibility ledger. Also best-effort:
        // a ledger failure logs but never destroys the field's answer.
        if let Err(e) = repro::record(pool, &fingerprint, &report, &model_ids, engine_version).await {
            tracing::error!(error = %e, report_id = %report.id, "FAILED to record repro ledger entry");
        }
    }

    Ok(Json(report))
}

/// Procore webhook adapter. Maps Procore inspection payloads into our
/// AnalysisRequest shape. Stub mapping for now — the wire exists, the
/// field-by-field mapping lands when we have a live Procore sandbox.
async fn procore_webhook(
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    tracing::info!("procore webhook received");
    let checklist = map_procore_payload(&payload)
        .ok_or((StatusCode::UNPROCESSABLE_ENTITY, "unrecognized Procore payload shape".to_string()))?;

    let req = AnalysisRequest { checklist, weather: Weather::default(), baseline: None };
    let alerts = match &state.pool {
        Some(pool) => learning::recall_patterns(pool, &req.checklist).await.unwrap_or_default(),
        None => vec![],
    };
    let report = state
        .pipeline
        .run(&req, alerts)
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("pipeline failure: {e:#}")))?;
    if let Some(pool) = &state.pool {
        let _ = learning::remember(pool, &req, &report).await;
    }
    Ok(Json(serde_json::json!({ "report_id": report.id, "verdict": report.verdict, "summary": report.summary })))
}

/// Ground truth in. Without this route the organism predicts forever and
/// learns nothing — incident and near-miss reports are how predictions get
/// scored against reality.
#[derive(serde::Deserialize)]
struct IncidentIn {
    project_id: Option<uuid::Uuid>,
    incident_type: String,
    severity: String,
    #[serde(default)]
    near_miss: bool,
    description: String,
    occurred_at: chrono::DateTime<chrono::Utc>,
    related_analysis_id: Option<uuid::Uuid>,
}

async fn report_incident(
    State(state): State<AppState>,
    Json(inc): Json<IncidentIn>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let pool = state
        .pool
        .as_ref()
        .ok_or((StatusCode::SERVICE_UNAVAILABLE, "no database; incident cannot be recorded".into()))?;
    let id = uuid::Uuid::new_v4();
    let emb = crate::learning::hash_embed(&inc.description);
    sqlx::query(
        r#"insert into sc_incident_reports
           (id, project_id, incident_type, severity, near_miss, description,
            occurred_at, related_analysis_id, embedding)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9)"#,
    )
    .bind(id)
    .bind(inc.project_id)
    .bind(&inc.incident_type)
    .bind(inc.severity.to_uppercase())
    .bind(inc.near_miss)
    .bind(&inc.description)
    .bind(inc.occurred_at)
    .bind(inc.related_analysis_id)
    .bind(&emb)
    .execute(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    tracing::info!(%id, incident_type = %inc.incident_type, near_miss = inc.near_miss, "ground truth recorded");
    Ok(Json(serde_json::json!({ "recorded": id, "thank_you": "this is how the organism learns" })))
}

#[derive(serde::Deserialize)]
struct VisionIn {
    image_b64: String,
    #[serde(default = "default_media")]
    media_type: String,
    kind: crate::agents::vision::VisionKind,
    context: Option<String>,
}
fn default_media() -> String { "image/png".into() }

async fn vision_analyze(
    State(state): State<AppState>,
    Json(v): Json<VisionIn>,
) -> Result<Json<crate::agents::vision::VisionReport>, (StatusCode, String)> {
    let report = crate::agents::vision::analyze(
        state.pipeline.provider(),
        v.kind,
        v.image_b64,
        v.media_type,
        v.context,
    )
    .await
    .map_err(|e| (StatusCode::BAD_GATEWAY, format!("vision failure: {e:#}")))?;
    Ok(Json(report))
}

fn map_procore_payload(payload: &serde_json::Value) -> Option<Checklist> {
    // Minimal viable mapping: accept either our native shape nested under
    // "checklist", or a flat Procore-ish inspection with "items".
    if let Some(c) = payload.get("checklist") {
        return serde_json::from_value(c.clone()).ok();
    }
    let items = payload.get("items")?.as_array()?;
    let mut responses = std::collections::BTreeMap::new();
    for item in items {
        let q = item.get("name").or_else(|| item.get("question"))?.as_str()?;
        let a = item
            .get("response")
            .or_else(|| item.get("answer"))
            .and_then(|v| v.as_str())
            .unwrap_or("No response");
        responses.insert(q.to_string(), a.to_string());
    }
    Some(Checklist {
        id: uuid::Uuid::new_v4(),
        responses,
        work_type: payload.get("trade").and_then(|v| v.as_str()).unwrap_or("general").to_string(),
        naics_code: payload.get("naics_code").and_then(|v| v.as_str()).unwrap_or("236220").to_string(),
        project_id: None,
        company_id: None,
        submitted_by: None,
        submitted_at: chrono::Utc::now(),
        external_ref: Some(ExternalRef {
            system: "procore".into(),
            object_type: payload.get("resource_name").and_then(|v| v.as_str()).unwrap_or("inspection").into(),
            object_id: payload.get("resource_id").map(|v| v.to_string()).unwrap_or_default(),
        }),
    })
}
