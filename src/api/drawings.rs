//! Shop drawings & blueprints.
//!
//! v0 scope: file-backed sheet storage + a zero-build interactive viewer
//! (deep zoom, pinch, rotate) served straight from the daemon. PDFs render
//! client-side via PDF.js into OpenSeadragon — no server-side rasterization,
//! no exotic dependencies, works on a phone in a jobsite trailer.
//!
//! Procore note: Procore's Drawings API exposes sheets as PDFs/PNGs; this
//! viewer consumes any URL or uploaded file, so the Procore hookup is an
//! auth'd proxy route later, not a rewrite. DWG/DXF native support requires
//! conversion (DWG is a closed format); the working path in this industry is
//! PDF sheets, which is what Procore serves anyway.

use axum::body::Bytes;
use axum::extract::{DefaultBodyLimit, Path};
use axum::http::{header, StatusCode};
use axum::response::{Html, IntoResponse};
use axum::extract::State;
use axum::routing::{get, put};
use axum::{Json, Router};
use std::path::PathBuf;
use uuid::Uuid;

pub fn router() -> Router<super::AppState> {
    Router::new()
        .route("/viewer", get(viewer_page))
        .route("/v1/drawings", get(list_drawings))
        .route("/v1/markups/{name}", get(get_markups).put(save_markups))
        .route(
            "/v1/drawings/{name}",
            put(upload_drawing)
                .get(serve_drawing)
                .layer(DefaultBodyLimit::max(200 * 1024 * 1024)), // blueprints are big
        )
}

fn drawings_dir() -> PathBuf {
    PathBuf::from(std::env::var("SC_DRAWINGS_DIR").unwrap_or_else(|_| "./drawings".into()))
}

/// Reject path traversal and junk names.
fn safe_name(name: &str) -> Option<String> {
    if name.is_empty()
        || name.len() > 200
        || name.contains("..")
        || name.contains('/')
        || name.contains('\\')
        || name.starts_with('.')
    {
        return None;
    }
    Some(name.to_string())
}

async fn viewer_page() -> Html<&'static str> {
    Html(include_str!("viewer.html"))
}

async fn list_drawings() -> Result<Json<Vec<String>>, (StatusCode, String)> {
    let dir = drawings_dir();
    if !dir.exists() {
        return Ok(Json(vec![]));
    }
    let mut names = vec![];
    let mut rd = tokio::fs::read_dir(&dir)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    while let Ok(Some(entry)) = rd.next_entry().await.map_err(|e| e.to_string()) {
        if entry.file_type().await.map(|t| t.is_file()).unwrap_or(false) {
            if let Some(n) = entry.file_name().to_str() {
                names.push(n.to_string());
            }
        }
    }
    names.sort();
    Ok(Json(names))
}

async fn upload_drawing(
    Path(name): Path<String>,
    body: Bytes,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let name = safe_name(&name).ok_or((StatusCode::BAD_REQUEST, "invalid name".into()))?;
    let dir = drawings_dir();
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let path = dir.join(&name);
    tokio::fs::write(&path, &body)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    tracing::info!(%name, bytes = body.len(), "drawing stored");
    Ok(Json(serde_json::json!({ "stored": name, "bytes": body.len() })))
}

#[derive(serde::Deserialize)]
struct MarkupIn { author: String, shapes: serde_json::Value }

/// All markups for a drawing, every author's layer.
async fn get_markups(
    State(state): State<super::AppState>,
    Path(name): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let pool = state.pool.as_ref().ok_or((StatusCode::SERVICE_UNAVAILABLE, "no database".to_string()))?;
    let rows: Vec<(String, serde_json::Value, chrono::DateTime<chrono::Utc>)> = sqlx::query_as(
        "select author, shapes, updated_at from sc_markups where drawing=$1 order by updated_at")
        .bind(&name).fetch_all(pool).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(serde_json::json!(rows.into_iter().map(|(a,s,t)| serde_json::json!({
        "author": a, "shapes": s, "updated_at": t })).collect::<Vec<_>>())))
}

/// Upsert one author's markup layer for a drawing. Each person owns their
/// own layer; nobody silently overwrites anyone else's marks.
async fn save_markups(
    State(state): State<super::AppState>,
    Path(name): Path<String>,
    Json(m): Json<MarkupIn>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let pool = state.pool.as_ref().ok_or((StatusCode::SERVICE_UNAVAILABLE, "no database".to_string()))?;
    sqlx::query(
        "insert into sc_markups (id, drawing, author, shapes, updated_at) values ($1,$2,$3,$4,now())          on conflict (drawing, author) do update set shapes=$4, updated_at=now()")
        .bind(Uuid::new_v4()).bind(&name).bind(m.author.trim()).bind(&m.shapes)
        .execute(pool).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(serde_json::json!({"saved": true})))
}

async fn serve_drawing(Path(name): Path<String>) -> Result<impl IntoResponse, (StatusCode, String)> {
    let name = safe_name(&name).ok_or((StatusCode::BAD_REQUEST, "invalid name".into()))?;
    let path = drawings_dir().join(&name);
    let bytes = tokio::fs::read(&path)
        .await
        .map_err(|_| (StatusCode::NOT_FOUND, format!("no drawing named {name}")))?;
    let ct = match name.rsplit('.').next().unwrap_or("").to_ascii_lowercase().as_str() {
        "pdf" => "application/pdf",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "svg" => "image/svg+xml",
        "webp" => "image/webp",
        "dxf" => "application/dxf",
        _ => "application/octet-stream",
    };
    Ok(([(header::CONTENT_TYPE, ct)], bytes))
}
