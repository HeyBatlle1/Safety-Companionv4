//! scd — Safety Companion daemon. The HTTP face of the organism.

use safety_companion::agents::Pipeline;
use safety_companion::api::{router, AppState};
use safety_companion::providers::OpenRouter;
use std::sync::Arc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,sqlx=warn".into()),
        )
        .init();

    // `scd --migrate` applies pending SQL migrations, then exits. This is the
    // one path that REQUIRES a database (the server can run stateless; the
    // migrator cannot), so a missing/bad DATABASE_URL is a hard error here.
    if std::env::args().any(|a| a == "--migrate") {
        let pool = safety_companion::db::connect_from_env()
            .await
            .map_err(|e| anyhow::anyhow!("--migrate needs a database: {e}"))?;
        let n = safety_companion::db::migrate::run(&pool).await?;
        tracing::info!("{n} migration(s) applied. Done.");
        return Ok(());
    }

    let provider = Arc::new(OpenRouter::from_env()?);
    let pipeline = Arc::new(Pipeline::new(provider));

    // DB is optional at boot: the pipeline can answer without memory, it just
    // can't learn. We say so loudly instead of dying.
    let pool = match safety_companion::db::connect_from_env().await {
        Ok(p) => {
            tracing::info!("database connected — learning loop ACTIVE");
            Some(p)
        }
        Err(e) => {
            tracing::warn!(error = %e, "no database — running stateless. Analyses will NOT be remembered.");
            None
        }
    };

    let state = AppState { pool, pipeline };
    let addr = std::env::var("SC_BIND").unwrap_or_else(|_| "0.0.0.0:8787".into());
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!(%addr, "Safety Companion v{} listening", env!("CARGO_PKG_VERSION"));

    axum::serve(listener, router(state))
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
            tracing::info!("shutdown signal received");
        })
        .await?;
    Ok(())
}
