//! GC Profiles — BUILD 2 (enterprise-profiles board, ~/Desktop/SC_ENTERPRISE_BOARD.md).
//!
//! Same intelligence, dressed in the GC's own document format. A profile is
//! just a layout choice (+ optional logo, + a standard PPE line) — creating
//! one changes nothing about how a job is analyzed. The render route reads
//! the SAME persisted SafetyReport that GET /v1/analyses/{id} and the in-app
//! report view already read (sc_analyses.report); it only chooses which
//! table to print it into. Brain: untouched. Skin: swappable.
//!
//! Two real layouts back this, reverse-engineered from actual vendor
//! JHAs/SSSPs:
//!   - three_col:    AGM's Task / Hazard / Mitigation grid.
//!   - numbered_row: Shiel Sexton / Eli Lilly's numbered Work Activity /
//!     Potential Hazards / Preventive Measures rows, with a title block
//!     (Project #, Contractor, Superintendent, PPE, Reviewed/Approved By).
//!
//! Two things worth flagging rather than silently deciding, for the review
//! pass:
//!   1. Neither real layout's row structure exists in SafetyReport's Hazard
//!      type (it's description + controls, not task + hazard + mitigation).
//!      Rather than fabricate a task-level split, the Task/Work-Activity
//!      column is the job's work_type/trade — real data, repeated per row —
//!      and Project is joined from sc_projects when the analysis is tagged
//!      (BUILD 4's plumbing, reused here rather than duplicated).
//!   2. Project #, Contractor, and Superintendent aren't tracked anywhere in
//!      SC yet. v0 accepts them as optional query params and prints blank
//!      hand-fill lines when absent — matching how these paper fields
//!      actually get used on site — rather than guessing at values or
//!      building an intake form nobody asked for.
//!
//! Logo storage mirrors drawings.rs's filesystem pattern exactly (own
//! directory, extension-in-path, existence-checked-at-serve-time) rather
//! than inventing a new one. Logos are customer-uploaded only: the GC hands
//! you their own approved header asset. SC never sources or fabricates one.

use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::{header, StatusCode};
use axum::response::{Html, IntoResponse};
use axum::routing::{get, put};
use axum::{Json, Router};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use uuid::Uuid;

use crate::domain::{SafetyReport, Severity, Verdict};

pub fn router() -> Router<super::AppState> {
    Router::new()
        .route("/v1/gc-profiles", get(list_profiles).post(create_profile))
        .route(
            "/v1/gc-profiles/{id}/logo/{ext}",
            put(upload_logo).layer(axum::extract::DefaultBodyLimit::max(5 * 1024 * 1024)),
        )
        .route("/v1/gc-profiles/{id}/logo", get(serve_logo))
        .route("/gc/{profile_id}/{report_id}", get(render_document))
}

fn need_db(state: &super::AppState) -> Result<&sqlx::PgPool, (StatusCode, String)> {
    state.pool.as_ref().ok_or((
        StatusCode::SERVICE_UNAVAILABLE,
        "no database connected; GC profiles need persistence".into(),
    ))
}

fn logos_dir() -> PathBuf {
    PathBuf::from(std::env::var("SC_LOGOS_DIR").unwrap_or_else(|_| "./gc_logos".into()))
}

const LOGO_EXTS: [&str; 5] = ["png", "jpg", "jpeg", "svg", "webp"];

fn has_logo_file(id: Uuid) -> bool {
    LOGO_EXTS.iter().any(|ext| logos_dir().join(format!("{id}.{ext}")).exists())
}

// ---------------------------------------------------------------------------
// Profiles — CRUD
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
struct ProfileOut {
    id: Uuid,
    gc_name: String,
    layout: String,
    default_ppe: Option<String>,
    has_logo: bool,
    created_at: DateTime<Utc>,
}

async fn list_profiles(State(state): State<super::AppState>) -> Result<Json<Vec<ProfileOut>>, (StatusCode, String)> {
    let pool = need_db(&state)?;
    let rows: Vec<(Uuid, String, String, Option<String>, DateTime<Utc>)> = sqlx::query_as(
        "select id, gc_name, layout, default_ppe, created_at from sc_gc_profiles order by gc_name",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(
        rows.into_iter()
            .map(|(id, gc_name, layout, default_ppe, created_at)| ProfileOut {
                has_logo: has_logo_file(id),
                id,
                gc_name,
                layout,
                default_ppe,
                created_at,
            })
            .collect(),
    ))
}

#[derive(Debug, Deserialize)]
struct ProfileIn {
    gc_name: String,
    layout: String, // "three_col" | "numbered_row"
    #[serde(default)]
    default_ppe: Option<String>,
}

async fn create_profile(
    State(state): State<super::AppState>,
    Json(p): Json<ProfileIn>,
) -> Result<Json<ProfileOut>, (StatusCode, String)> {
    let pool = need_db(&state)?;
    let gc_name = p.gc_name.trim();
    if gc_name.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "gc_name is required".into()));
    }
    if p.layout != "three_col" && p.layout != "numbered_row" {
        return Err((StatusCode::BAD_REQUEST, "layout must be 'three_col' or 'numbered_row'".into()));
    }
    let default_ppe = p.default_ppe.as_deref().map(str::trim).filter(|s| !s.is_empty());
    let row: (Uuid, String, String, Option<String>, DateTime<Utc>) = sqlx::query_as(
        r#"insert into sc_gc_profiles (id, gc_name, layout, default_ppe)
           values ($1, $2, $3, $4)
           returning id, gc_name, layout, default_ppe, created_at"#,
    )
    .bind(Uuid::new_v4())
    .bind(gc_name)
    .bind(&p.layout)
    .bind(default_ppe)
    .fetch_one(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(ProfileOut {
        has_logo: false,
        id: row.0,
        gc_name: row.1,
        layout: row.2,
        default_ppe: row.3,
        created_at: row.4,
    }))
}

// ---------------------------------------------------------------------------
// Logo — customer-uploaded only, filesystem-backed (mirrors drawings.rs)
// ---------------------------------------------------------------------------

fn safe_ext(ext: &str) -> Option<&'static str> {
    match ext.to_ascii_lowercase().as_str() {
        "png" => Some("png"),
        "jpg" | "jpeg" => Some("jpg"),
        "svg" => Some("svg"),
        "webp" => Some("webp"),
        _ => None,
    }
}

async fn upload_logo(
    Path((id, ext)): Path<(Uuid, String)>,
    body: Bytes,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let ext = safe_ext(&ext).ok_or((StatusCode::BAD_REQUEST, "logo must be png, jpg, svg, or webp".into()))?;
    let dir = logos_dir();
    tokio::fs::create_dir_all(&dir).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    // One logo per profile — clear any other extension left from a prior
    // upload so serve_logo can't find a stale one alongside the new one.
    for other in LOGO_EXTS {
        if other != ext {
            let _ = tokio::fs::remove_file(dir.join(format!("{id}.{other}"))).await;
        }
    }
    tokio::fs::write(dir.join(format!("{id}.{ext}")), &body)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    tracing::info!(%id, ext, bytes = body.len(), "GC logo stored (customer-supplied header asset)");
    Ok(Json(serde_json::json!({ "stored": true })))
}

async fn serve_logo(Path(id): Path<Uuid>) -> Result<impl IntoResponse, (StatusCode, String)> {
    for ext in LOGO_EXTS {
        let path = logos_dir().join(format!("{id}.{ext}"));
        if let Ok(bytes) = tokio::fs::read(&path).await {
            let ct = match ext {
                "png" => "image/png",
                "jpg" | "jpeg" => "image/jpeg",
                "svg" => "image/svg+xml",
                "webp" => "image/webp",
                _ => "application/octet-stream",
            };
            return Ok(([(header::CONTENT_TYPE, ct)], bytes));
        }
    }
    Err((StatusCode::NOT_FOUND, "no logo uploaded for this profile".into()))
}

// ---------------------------------------------------------------------------
// The render: same SafetyReport, GC's own table
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize, Default)]
struct RenderParams {
    project_no: Option<String>,
    contractor: Option<String>,
    superintendent: Option<String>,
}

struct GcDoc {
    gc_name: String,
    work_type: String,
    project_name: Option<String>,
    default_ppe: Option<String>,
    project_no: Option<String>,
    contractor: Option<String>,
    superintendent: Option<String>,
    logo_html: String,
    report: SafetyReport,
}

async fn render_document(
    State(state): State<super::AppState>,
    Path((profile_id, report_id)): Path<(Uuid, Uuid)>,
    Query(params): Query<RenderParams>,
) -> Result<Html<String>, (StatusCode, String)> {
    let pool = state.pool.as_ref().ok_or((StatusCode::SERVICE_UNAVAILABLE, "no database".to_string()))?;

    let profile: Option<(String, String, Option<String>)> =
        sqlx::query_as("select gc_name, layout, default_ppe from sc_gc_profiles where id = $1")
            .bind(profile_id)
            .fetch_optional(pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let (gc_name, layout, default_ppe) =
        profile.ok_or((StatusCode::NOT_FOUND, "no GC profile with that id".into()))?;

    // Same source of truth the in-app report view and GET /v1/analyses/{id}
    // read — work_type and project name are separate sc_analyses/sc_projects
    // columns, not part of the SafetyReport JSON, so they're pulled with
    // their own join rather than reaching into the report blob for them.
    let row: Option<(serde_json::Value, String, Option<String>)> = sqlx::query_as(
        r#"select a.report, a.work_type, p.name
           from sc_analyses a left join sc_projects p on p.id = a.project_id
           where a.id = $1"#,
    )
    .bind(report_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let (report_json, work_type, project_name) =
        row.ok_or((StatusCode::NOT_FOUND, "no analysis with that id".into()))?;
    let report: SafetyReport = serde_json::from_value(report_json).map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, format!("stored report doesn't match current schema: {e}"))
    })?;

    let logo_html = if has_logo_file(profile_id) {
        format!(r#"<img class="gc-logo" src="/v1/gc-profiles/{profile_id}/logo" alt="{} logo">"#, e(&gc_name))
    } else {
        String::new()
    };

    let doc = GcDoc {
        gc_name,
        work_type,
        project_name,
        default_ppe,
        project_no: params.project_no,
        contractor: params.contractor,
        superintendent: params.superintendent,
        logo_html,
        report,
    };

    let body = match layout.as_str() {
        "numbered_row" => render_numbered_row(&doc),
        _ => render_three_col(&doc), // three_col is the only other value the check-constraint allows
    };
    Ok(Html(body))
}

fn e(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;")
}

fn line_or_blank(v: &Option<String>) -> String {
    match v.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        Some(s) => e(s),
        None => r#"<span class="fillin">&nbsp;</span>"#.into(),
    }
}

fn verdict_badge(v: Verdict) -> (&'static str, &'static str) {
    match v {
        Verdict::StopWork => ("danger", "STOP WORK"),
        Verdict::RequestClarification => ("warn", "FIX THE PLAN FIRST"),
        Verdict::ProceedWithControls => ("caution", "PROCEED WITH CONTROLS"),
        Verdict::Proceed => ("ok", "PROCEED"),
    }
}

fn sev_word(s: Severity) -> &'static str {
    match s {
        Severity::Critical => "CRITICAL",
        Severity::High => "HIGH",
        Severity::Medium => "MEDIUM",
        Severity::Low => "LOW",
    }
}

// ---------------------------------------------------------------------------
// Shared shell — same blueprint-vellum language as eap.rs's render_document,
// condensed: this is a working field document, not a second design system.
// ---------------------------------------------------------------------------

fn shell(doc: &GcDoc, title_block: &str, rows_html: &str, caption: &str) -> String {
    let (badge_cls, badge_word) = verdict_badge(doc.report.verdict);
    let short_id = doc.report.id.to_string().split('-').next().unwrap_or("").to_uppercase();
    let date = doc.report.created_at.format("%b %e %Y");

    format!(
        r#"<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Job Hazard Analysis — {gc}</title>
<style>
:root{{
  --paper:#f6f2e7; --paper-line:#e9e1cd; --ink:#201d16; --ink-soft:#4a453a;
  --line:#16324f; --line-soft:#4d6885; --caution:#b5790f; --danger:#9c2b22;
  --ok:#2f6b3f; --warn:#9c6b12; --muted:#79705c;
  --display:"Bahnschrift","Arial Narrow",Haettenschweiler,"Helvetica Neue",Arial,sans-serif;
  --serif:"Iowan Old Style","Palatino Linotype","Book Antiqua",Georgia,serif;
  --mono:Consolas,"SF Mono",Menlo,"Courier New",monospace;
}}
*{{box-sizing:border-box}}
html{{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
body{{margin:0;padding:26px 14px 48px;background:var(--paper);color:var(--ink);font-family:var(--serif);display:flex;justify-content:center}}
.sheet{{position:relative;width:100%;max-width:900px;background:var(--paper);
  background-image:repeating-linear-gradient(var(--paper-line) 0 1px, transparent 1px 26px),repeating-linear-gradient(90deg, var(--paper-line) 0 1px, transparent 1px 26px);
  border:2px solid var(--line);padding:30px 26px 22px}}
.actions{{display:flex;gap:10px;padding-bottom:16px;margin-bottom:16px;border-bottom:1px solid var(--paper-line)}}
.actions button{{font:700 11px var(--mono);letter-spacing:1px;text-transform:uppercase;padding:9px 16px;border:1.5px solid var(--line);background:var(--paper);color:var(--line);cursor:pointer;border-radius:2px}}
.actions button:hover{{background:#ece5d2}}
.actions .p{{background:var(--line);color:var(--paper)}}
.actions .p:hover{{background:#0f253d}}
header.hd{{display:flex;justify-content:space-between;align-items:center;gap:18px;border-bottom:2px solid var(--line);padding-bottom:14px;margin-bottom:14px;flex-wrap:wrap}}
.hd-name{{display:flex;align-items:center;gap:12px}}
.gc-logo{{max-height:52px;max-width:220px;object-fit:contain}}
h1{{margin:0;font-family:var(--display);font-weight:700;font-size:clamp(18px,3.4vw,24px);text-transform:uppercase;letter-spacing:1px;color:var(--ink)}}
.hd-sub{{margin-top:4px;font:600 10.5px var(--mono);letter-spacing:1.5px;text-transform:uppercase;color:var(--muted)}}
.hd-cells{{display:flex;border:1px solid var(--line-soft)}}
.hd-cell{{padding:5px 12px;border-left:1px solid var(--line-soft);display:flex;flex-direction:column;gap:3px;min-width:76px}}
.hd-cell:first-child{{border-left:none}}
.hd-label{{font:700 9px var(--mono);letter-spacing:1px;text-transform:uppercase;color:var(--muted)}}
.hd-value{{font:700 13px var(--display);letter-spacing:.3px;color:var(--ink)}}
.tb{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));border:1px solid var(--line-soft);margin-bottom:16px}}
.tb-cell{{padding:8px 14px;border-top:1px solid var(--line-soft);border-left:1px solid var(--line-soft);display:flex;flex-direction:column;gap:2px}}
.tb-cell:nth-child(-n+4){{border-top:none}}
.tb-label{{font:700 9.5px var(--mono);letter-spacing:1px;text-transform:uppercase;color:var(--muted)}}
.tb-value{{font:600 14px var(--display);color:var(--ink);letter-spacing:.2px}}
.fillin{{display:inline-block;min-width:110px;border-bottom:1px solid var(--ink-soft)}}
.badge{{display:inline-block;font:800 12px/1.3 var(--mono);letter-spacing:1.5px;text-transform:uppercase;padding:7px 14px;border:3px double currentColor;border-radius:2px;background:transparent;mix-blend-mode:multiply}}
.badge.ok{{color:var(--ok)}} .badge.caution{{color:var(--caution)}} .badge.warn{{color:var(--warn)}} .badge.danger{{color:var(--danger)}}
.stamp-row{{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:20px}}
.stamp-note{{font:italic 12px var(--serif);color:var(--muted)}}
table.rows{{width:100%;border-collapse:collapse;margin-bottom:16px}}
table.rows th{{text-align:left;font:700 10.5px var(--mono);letter-spacing:.8px;text-transform:uppercase;color:var(--muted);border-bottom:2px solid var(--line);padding:6px 10px}}
table.rows td{{vertical-align:top;font-size:14.5px;line-height:1.55;color:var(--ink-soft);border-bottom:1px solid var(--paper-line);padding:10px}}
table.rows td.n{{font:700 13px var(--display);color:var(--line-soft);width:2.5ch}}
table.rows td.trade{{font-weight:600;color:var(--ink);width:16ch}}
table.rows ul{{margin:0;padding-left:18px}}
.sevtag{{display:inline-block;font:700 10px var(--mono);letter-spacing:.5px;padding:1px 6px;border-radius:2px;margin-right:6px}}
.sevtag.CRITICAL{{background:rgba(156,43,34,.15);color:var(--danger)}}
.sevtag.HIGH{{background:rgba(181,121,15,.15);color:var(--caution)}}
.sevtag.MEDIUM,.sevtag.LOW{{background:rgba(77,104,133,.15);color:var(--line-soft)}}
.caption{{font:italic 12px var(--serif);color:var(--muted);margin:-8px 0 14px}}
.summary{{border:1px solid var(--line-soft);background:rgba(255,255,255,.3);padding:10px 14px;margin-bottom:16px;font-size:14.5px;color:var(--ink-soft)}}
footer.ft{{display:flex;border:1px solid var(--line-soft);margin-top:22px;flex-wrap:wrap}}
footer .tb-cell{{border-top:none;flex:1;min-width:150px}}
footer .tb-cell.wide{{flex:2}}
footer .tb-value{{font:600 11px var(--mono);letter-spacing:.2px;word-break:break-all}}
.sig-row{{display:flex;gap:24px;margin-top:20px;flex-wrap:wrap}}
.sig{{flex:1;min-width:200px;border-top:1px solid var(--ink-soft);padding-top:5px;font:700 9.5px var(--mono);letter-spacing:1px;text-transform:uppercase;color:var(--muted)}}
@media (max-width:600px){{
  .sheet{{padding:22px 14px 16px}}
  header.hd{{flex-direction:column;align-items:flex-start}}
  footer.ft{{flex-direction:column}}
  footer .tb-cell{{border-left:none !important;border-top:1px solid var(--line-soft)}}
  footer .tb-cell:first-child{{border-top:none}}
}}
@page{{size:letter;margin:14mm}}
@media print{{ body{{padding:0;background:#fff}} .sheet{{background:#fff;max-width:none;border-width:1.5px}} .actions{{display:none}} .badge{{mix-blend-mode:normal}} }}
</style></head><body>
<div class="sheet">
  <div class="actions">
    <button class="p" onclick="print()">Print / Save as PDF</button>
    <button onclick="navigator.clipboard.writeText(location.href).then(()=>this.textContent='Link copied')">Copy share link</button>
  </div>
  <header class="hd">
    <div class="hd-name">{logo}<div><h1>{gc}</h1><div class="hd-sub">Job Hazard Analysis</div></div></div>
    <div class="hd-cells">
      <div class="hd-cell"><span class="hd-label">Date</span><span class="hd-value">{date}</span></div>
      <div class="hd-cell"><span class="hd-label">Record</span><span class="hd-value">{short_id}</span></div>
    </div>
  </header>
  {title_block}
  <div class="stamp-row">
    <span class="badge {badge_cls}">{badge_word}</span>
    <span class="stamp-note">{summary}</span>
  </div>
  <table class="rows">{rows_html}</table>
  <div class="caption">{caption}</div>
  <div class="sig-row">
    <div class="sig">Reviewed By / Date</div>
    <div class="sig">Approved By / Date</div>
  </div>
  <footer class="ft">
    <div class="tb-cell"><span class="tb-label">Software</span><span class="tb-value">Safety Companion v4</span></div>
    <div class="tb-cell wide"><span class="tb-label">Same analysis, GC format</span><span class="tb-value">record {id} · engine {engine}</span></div>
  </footer>
</div>
</body></html>"#,
        gc = e(&doc.gc_name),
        logo = doc.logo_html,
        date = date,
        short_id = short_id,
        title_block = title_block,
        badge_cls = badge_cls,
        badge_word = badge_word,
        summary = e(&doc.report.summary),
        rows_html = rows_html,
        caption = e(caption),
        id = doc.report.id,
        engine = e(doc.report.provenance.as_ref().map(|p| p.engine_version.as_str()).unwrap_or("—")),
    )
}

// ---------------------------------------------------------------------------
// three_col — AGM: Task / Hazard / Mitigation
// ---------------------------------------------------------------------------

fn render_three_col(doc: &GcDoc) -> String {
    let title_block = format!(
        r#"<div class="tb">
      <div class="tb-cell"><span class="tb-label">Project</span><span class="tb-value">{proj}</span></div>
      <div class="tb-cell"><span class="tb-label">Trade / Scope</span><span class="tb-value">{trade}</span></div>
    </div>"#,
        proj = doc.project_name.as_deref().map(e).unwrap_or_else(|| "—".into()),
        trade = e(&doc.work_type),
    );

    let rows: String = doc.report.risk.hazards.iter().map(|h| {
        let mitigation = if h.controls.is_empty() {
            "<span class=\"fillin\">&nbsp;</span>".to_string()
        } else {
            format!("<ul>{}</ul>", h.controls.iter().map(|c| format!("<li>{}</li>", e(c))).collect::<String>())
        };
        format!(
            r#"<tr><td class="trade">{trade}</td><td><span class="sevtag {sev}">{sev}</span>{hazard}</td><td>{mit}</td></tr>"#,
            trade = e(&doc.work_type),
            sev = sev_word(h.severity),
            hazard = e(&h.description),
            mit = mitigation,
        )
    }).collect();

    let rows_html = format!(
        r#"<thead><tr><th>Task</th><th>Hazard</th><th>Mitigation</th></tr></thead><tbody>{rows}</tbody>"#
    );

    shell(
        doc,
        &title_block,
        &rows_html,
        "Task repeats the trade this scope covers — SC scores hazards for the scope of work submitted, not step-by-step.",
    )
}

// ---------------------------------------------------------------------------
// numbered_row — Shiel Sexton / Eli Lilly: Work Activity / Potential
// Hazards / Preventive Measures, with the fuller title block
// ---------------------------------------------------------------------------

fn render_numbered_row(doc: &GcDoc) -> String {
    let ppe = doc.default_ppe.as_deref().unwrap_or(
        "Hard hat, safety glasses, high-visibility vest, gloves, steel-toe boots, and fall protection where applicable",
    );
    let title_block = format!(
        r#"<div class="tb">
      <div class="tb-cell"><span class="tb-label">Project</span><span class="tb-value">{proj}</span></div>
      <div class="tb-cell"><span class="tb-label">Project #</span><span class="tb-value">{pno}</span></div>
      <div class="tb-cell"><span class="tb-label">Contractor</span><span class="tb-value">{contractor}</span></div>
      <div class="tb-cell"><span class="tb-label">Superintendent</span><span class="tb-value">{super_}</span></div>
      <div class="tb-cell" style="grid-column:1/-1"><span class="tb-label">Required PPE</span><span class="tb-value">{ppe}</span></div>
    </div>"#,
        proj = doc.project_name.as_deref().map(e).unwrap_or_else(|| "—".into()),
        pno = line_or_blank(&doc.project_no),
        contractor = line_or_blank(&doc.contractor),
        super_ = line_or_blank(&doc.superintendent),
        ppe = e(ppe),
    );

    let rows: String = doc.report.risk.hazards.iter().enumerate().map(|(n, h)| {
        let measures = if h.controls.is_empty() {
            "<span class=\"fillin\">&nbsp;</span>".to_string()
        } else {
            format!("<ul>{}</ul>", h.controls.iter().map(|c| format!("<li>{}</li>", e(c))).collect::<String>())
        };
        format!(
            r#"<tr><td class="n">{n:02}</td><td class="trade">{trade}</td><td><span class="sevtag {sev}">{sev}</span>{hazard}</td><td>{measures}</td></tr>"#,
            n = n + 1,
            trade = e(&doc.work_type),
            sev = sev_word(h.severity),
            hazard = e(&h.description),
            measures = measures,
        )
    }).collect();

    let rows_html = format!(
        r#"<thead><tr><th>#</th><th>Work Activity</th><th>Potential Hazards</th><th>Preventive Measures</th></tr></thead><tbody>{rows}</tbody>"#
    );

    shell(
        doc,
        &title_block,
        &rows_html,
        "Project #, Contractor, and Superintendent are hand-filled if not supplied at print time — SC doesn't track them yet.",
    )
}
