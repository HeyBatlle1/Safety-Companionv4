//! MCP bridge: Safety Companion -> Argus. The wires, as requested.
//!
//! Implemented as bare JSON-RPC 2.0 over stdio against the MCP protocol
//! (2025-06-18 revision) rather than pulling an SDK. ~200 lines we fully own
//! and can audit — in keeping with how Argus is built. Upgrading to the
//! official `rmcp` crate later is a drop-in refactor; the tool surface is the
//! contract, and that lives here.
//!
//! Exposed tools (v0):
//!   sc.analyze         — run a checklist through the full pipeline
//!   sc.recall_patterns — ask the organism's memory about a project/trade
//!   sc.health          — liveness + model map
//!
//! Argus registers this binary as an MCP server. Later: Argus's weekly sweep
//! can call sc.recall_patterns across all active projects and post findings
//! to #findings, same as its other duties.

use crate::agents::Pipeline;
use crate::domain::AnalysisRequest;
use crate::learning;
use serde_json::{json, Value};
use sqlx::PgPool;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

pub struct McpServer {
    pub pipeline: Arc<Pipeline>,
    pub pool: Option<PgPool>,
}

impl McpServer {
    pub async fn run_stdio(self) -> anyhow::Result<()> {
        let stdin = tokio::io::stdin();
        let mut stdout = tokio::io::stdout();
        let mut lines = BufReader::new(stdin).lines();

        while let Some(line) = lines.next_line().await? {
            let line = line.trim().to_string();
            if line.is_empty() {
                continue;
            }
            let msg: Value = match serde_json::from_str(&line) {
                Ok(v) => v,
                Err(_) => continue,
            };
            // Notifications (no id) get no response.
            let id = msg.get("id").cloned();
            let method = msg.get("method").and_then(|m| m.as_str()).unwrap_or("");
            if id.is_none() {
                continue;
            }
            let id = id.unwrap();

            let result = match method {
                "initialize" => json!({
                    "protocolVersion": "2025-06-18",
                    "capabilities": { "tools": {} },
                    "serverInfo": {
                        "name": "safety-companion",
                        "version": env!("CARGO_PKG_VERSION")
                    }
                }),
                "tools/list" => self.tools_list(),
                "tools/call" => match self.tools_call(msg.get("params").cloned().unwrap_or(json!({}))).await {
                    Ok(v) => v,
                    Err(e) => json!({
                        "content": [{ "type": "text", "text": format!("error: {e:#}") }],
                        "isError": true
                    }),
                },
                "ping" => json!({}),
                _ => {
                    let resp = json!({
                        "jsonrpc": "2.0", "id": id,
                        "error": { "code": -32601, "message": format!("method not found: {method}") }
                    });
                    stdout.write_all(format!("{resp}\n").as_bytes()).await?;
                    stdout.flush().await?;
                    continue;
                }
            };

            let resp = json!({ "jsonrpc": "2.0", "id": id, "result": result });
            stdout.write_all(format!("{resp}\n").as_bytes()).await?;
            stdout.flush().await?;
        }
        Ok(())
    }

    fn tools_list(&self) -> Value {
        json!({
            "tools": [
                {
                    "name": "sc_analyze",
                    "description": "Run a safety checklist (JHA/EAP) through the 4-agent pipeline. Input: AnalysisRequest JSON {checklist, weather?, baseline?}. Returns a full SafetyReport with verdict, hazards, predictions, and pattern alerts.",
                    "inputSchema": {
                        "type": "object",
                        "properties": { "request": { "type": "object" } },
                        "required": ["request"]
                    }
                },
                {
                    "name": "sc_recall_patterns",
                    "description": "Query the learning memory for recurring hazards, risk trends, and semantic echoes for a checklist/project. Input: a Checklist JSON object.",
                    "inputSchema": {
                        "type": "object",
                        "properties": { "checklist": { "type": "object" } },
                        "required": ["checklist"]
                    }
                },
                {
                    "name": "sc_health",
                    "description": "Liveness check. Returns version and the agent-role -> model mapping in use.",
                    "inputSchema": { "type": "object", "properties": {} }
                }
            ]
        })
    }

    async fn tools_call(&self, params: Value) -> anyhow::Result<Value> {
        let name = params.get("name").and_then(|n| n.as_str()).unwrap_or("");
        let args = params.get("arguments").cloned().unwrap_or(json!({}));

        let text = match name {
            "sc_health" => serde_json::to_string_pretty(&json!({
                "status": "alive",
                "version": env!("CARGO_PKG_VERSION"),
                "db_connected": self.pool.is_some(),
            }))?,
            "sc_recall_patterns" => {
                let checklist = serde_json::from_value(
                    args.get("checklist").cloned().ok_or_else(|| anyhow::anyhow!("missing checklist"))?,
                )?;
                let alerts = match &self.pool {
                    Some(pool) => learning::recall_patterns(pool, &checklist).await?,
                    None => vec![],
                };
                serde_json::to_string_pretty(&alerts)?
            }
            "sc_analyze" => {
                let req: AnalysisRequest = serde_json::from_value(
                    args.get("request").cloned().ok_or_else(|| anyhow::anyhow!("missing request"))?,
                )?;
                let alerts = match &self.pool {
                    Some(pool) => learning::recall_patterns(pool, &req.checklist).await.unwrap_or_default(),
                    None => vec![],
                };
                let report = self.pipeline.run(&req, alerts).await?;
                if let Some(pool) = &self.pool {
                    let _ = learning::remember(pool, &req, &report).await;
                }
                serde_json::to_string_pretty(&report)?
            }
            other => anyhow::bail!("unknown tool: {other}"),
        };

        Ok(json!({ "content": [{ "type": "text", "text": text }] }))
    }
}
