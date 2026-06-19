//! sc-mcp — MCP stdio server exposing Safety Companion to Argus.
//!
//! Register in Argus (or any MCP client) as:
//!   command: /path/to/sc-mcp
//!   env: OPENROUTER_API_KEY, DATABASE_URL (optional)

use safety_companion::agents::Pipeline;
use safety_companion::mcp::McpServer;
use safety_companion::providers::OpenRouter;
use std::sync::Arc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    // Logs to stderr only — stdout is the protocol channel.
    tracing_subscriber::fmt()
        .with_writer(std::io::stderr)
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "warn".into()),
        )
        .init();

    let provider = Arc::new(OpenRouter::from_env()?);
    let pipeline = Arc::new(Pipeline::new(provider));
    let pool = safety_companion::db::connect_from_env().await.ok();

    McpServer { pipeline, pool }.run_stdio().await
}
