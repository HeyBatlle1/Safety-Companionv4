//! Projects & CSI scope — BUILD 4 (enterprise-profiles board,
//! ~/Desktop/SC_ENTERPRISE_BOARD.md).
//!
//! A project is a job. CSI MasterFormat scope is entered ONCE per job, at
//! setup — not per-JHA — and every JHA submitted against that project
//! inherits the link automatically via the existing `checklist.project_id`
//! field. That field, and the `sc_analyses.project_id` column it flows into,
//! have existed since the v4 schema's first migration (001_init); the
//! pipeline, `learning::remember`, and pattern recall already read and write
//! it (see learning/mod.rs). The frontend simply never surfaced a project
//! concept, so every JHA has gone in with project_id = null. This module —
//! and the "Run JHA" project picker it enables — is the missing plumbing,
//! not a new capability in the intelligence layer.
//!
//! Presentation/organizational data only. Does not touch the hazard-
//! analysis pipeline, scoring, calibration, or verdict logic.

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::routing::{get, put};
use axum::{Json, Router};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub fn router() -> Router<super::AppState> {
    Router::new()
        .route("/v1/csi-codes", get(list_csi_codes))
        .route("/v1/projects", get(list_projects).post(create_project))
        .route("/v1/projects/{id}", get(get_project))
        .route("/v1/projects/{id}/scope", put(update_scope))
}

fn need_db(state: &super::AppState) -> Result<&sqlx::PgPool, (StatusCode, String)> {
    state.pool.as_ref().ok_or((
        StatusCode::SERVICE_UNAVAILABLE,
        "no database connected; projects need persistence".into(),
    ))
}

// ---------------------------------------------------------------------------
// CSI reference codes — read-only picker data
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
struct CsiCode {
    code: String,
    division: String,
    description: String,
    trade_hint: Option<String>,
}

async fn list_csi_codes(State(state): State<super::AppState>) -> Result<Json<Vec<CsiCode>>, (StatusCode, String)> {
    let pool = need_db(&state)?;
    let rows: Vec<(String, String, String, Option<String>)> = sqlx::query_as(
        "select code, division, description, trade_hint from sc_csi_codes order by code",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(
        rows.into_iter()
            .map(|(code, division, description, trade_hint)| CsiCode { code, division, description, trade_hint })
            .collect(),
    ))
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
struct ProjectOut {
    id: Uuid,
    name: String,
    address: Option<String>,
    csi_codes: Vec<String>,
    created_at: DateTime<Utc>,
}

type ProjectRow = (Uuid, String, Option<String>, Vec<String>, DateTime<Utc>);
fn project_out(row: ProjectRow) -> ProjectOut {
    let (id, name, address, csi_codes, created_at) = row;
    ProjectOut { id, name, address, csi_codes, created_at }
}

async fn list_projects(State(state): State<super::AppState>) -> Result<Json<Vec<ProjectOut>>, (StatusCode, String)> {
    let pool = need_db(&state)?;
    let rows: Vec<ProjectRow> = sqlx::query_as(
        "select id, name, address, csi_codes, created_at from sc_projects where active order by created_at desc",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(rows.into_iter().map(project_out).collect()))
}

#[derive(Debug, Deserialize)]
struct ProjectIn {
    name: String,
    #[serde(default)]
    address: Option<String>,
    #[serde(default)]
    csi_codes: Vec<String>,
}

async fn create_project(
    State(state): State<super::AppState>,
    Json(p): Json<ProjectIn>,
) -> Result<Json<ProjectOut>, (StatusCode, String)> {
    let pool = need_db(&state)?;
    let name = p.name.trim();
    if name.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "project name is required".into()));
    }
    let address = p.address.as_deref().map(str::trim).filter(|s| !s.is_empty());
    let row: ProjectRow = sqlx::query_as(
        r#"insert into sc_projects (id, name, address, csi_codes)
           values ($1, $2, $3, $4)
           returning id, name, address, csi_codes, created_at"#,
    )
    .bind(Uuid::new_v4())
    .bind(name)
    .bind(address)
    .bind(&p.csi_codes)
    .fetch_one(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(project_out(row)))
}

/// Detail view: the project's scope plus the JHAs run against it — the
/// cross-reference the board doc asks for ("legible to the whole project
/// org, not just the safety guy"), read straight off sc_analyses.project_id.
#[derive(Debug, Serialize)]
struct ProjectDetail {
    #[serde(flatten)]
    project: ProjectOut,
    recent_analyses: Vec<serde_json::Value>,
}

async fn get_project(
    State(state): State<super::AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ProjectDetail>, (StatusCode, String)> {
    let pool = need_db(&state)?;
    let row: Option<ProjectRow> = sqlx::query_as(
        "select id, name, address, csi_codes, created_at from sc_projects where id = $1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let project = project_out(row.ok_or((StatusCode::NOT_FOUND, "no project with that id".into()))?);

    let analyses: Vec<(Uuid, DateTime<Utc>, String, String, f64)> = sqlx::query_as(
        r#"select id, created_at, work_type, verdict, overall_risk_score
           from sc_analyses where project_id = $1 order by created_at desc limit 25"#,
    )
    .bind(id)
    .fetch_all(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(ProjectDetail {
        project,
        recent_analyses: analyses
            .into_iter()
            .map(|(id, created_at, work_type, verdict, risk)| {
                serde_json::json!({ "id": id, "created_at": created_at, "work_type": work_type, "verdict": verdict, "risk": risk })
            })
            .collect(),
    }))
}

#[derive(Debug, Deserialize)]
struct ScopeIn {
    csi_codes: Vec<String>,
}

/// Scope is set once at setup but not immutable — a PM correcting or
/// expanding it later is normal, so this is a plain update, not a new
/// versioned record. (If SC ever needs to show "the scope changed after
/// JHAs were already run against it," that's a real future need — flagging
/// it rather than building history tracking nobody asked for yet.)
async fn update_scope(
    State(state): State<super::AppState>,
    Path(id): Path<Uuid>,
    Json(s): Json<ScopeIn>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let pool = need_db(&state)?;
    let res = sqlx::query("update sc_projects set csi_codes = $1 where id = $2")
        .bind(&s.csi_codes)
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if res.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "no project with that id".into()));
    }
    Ok(Json(serde_json::json!({ "saved": true })))
}
