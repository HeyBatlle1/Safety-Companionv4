//! Model-agnostic LLM access.
//!
//! The pipeline never names a vendor. It asks a `LlmProvider` to complete a
//! prompt at a given temperature with a given role. Which physical model
//! answers is configuration, not code. Swap OpenRouter for Anthropic, a local
//! Ollama, or anything else by implementing one trait.

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::time::Duration;

/// Logical roles in the pipeline. Config maps each role to a model string.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AgentRole {
    Validator,
    RiskAssessor,
    Predictor,
    /// Document compiler + background analysis (EAP tailoring, wellbeing scans).
    Compiler,
}

impl AgentRole {
    pub fn as_str(&self) -> &'static str {
        match self {
            AgentRole::Validator => "validator",
            AgentRole::RiskAssessor => "risk_assessor",
            AgentRole::Predictor => "predictor",
            AgentRole::Compiler => "compiler",
        }
    }
}

#[derive(Debug, Clone)]
pub struct CompletionRequest {
    pub role: AgentRole,
    pub system: String,
    pub user: String,
    pub temperature: f32,
    pub max_tokens: u32,
}

#[derive(Debug, Clone)]
pub struct CompletionResponse {
    pub text: String,
    pub model: String,
}

#[derive(Debug, thiserror::Error)]
pub enum ProviderError {
    #[error("transport error: {0}")]
    Transport(String),
    #[error("provider returned status {0}: {1}")]
    Status(u16, String),
    #[error("empty or malformed completion")]
    Malformed,
}

#[derive(Debug, Clone)]
pub struct VisionRequest {
    pub system: String,
    pub user_text: String,
    /// Raw base64 image data (no data: prefix).
    pub image_b64: String,
    pub media_type: String, // image/png, image/jpeg, image/webp
    pub temperature: f32,
    pub max_tokens: u32,
}

#[async_trait]
pub trait LlmProvider: Send + Sync {
    async fn complete(&self, req: CompletionRequest) -> Result<CompletionResponse, ProviderError>;
    /// Multimodal completion. Providers without vision return an error.
    async fn complete_vision(&self, _req: VisionRequest) -> Result<CompletionResponse, ProviderError> {
        Err(ProviderError::Transport("vision not supported by this provider".into()))
    }
    /// Human-readable map of role -> model, for report provenance.
    fn model_map(&self) -> BTreeMap<String, String>;
}

// ---------------------------------------------------------------------------
// OpenRouter implementation
// ---------------------------------------------------------------------------

pub struct OpenRouter {
    client: reqwest::Client,
    api_key: String,
    base_url: String,
    /// role -> model id, with a fallback chain per role.
    models: BTreeMap<AgentRole, Vec<String>>,
    vision_chain: Vec<String>,
}

impl OpenRouter {
    pub fn from_env() -> anyhow::Result<Self> {
        let api_key = std::env::var("OPENROUTER_API_KEY")
            .map_err(|_| anyhow::anyhow!("OPENROUTER_API_KEY not set"))?;
        let base_url = std::env::var("OPENROUTER_BASE_URL")
            .unwrap_or_else(|_| "https://openrouter.ai/api/v1".to_string());

        // Defaults: free-tier models for development. Override per-role via env:
        //   SC_MODEL_VALIDATOR, SC_MODEL_RISK_ASSESSOR, SC_MODEL_PREDICTOR
        // Comma-separated values form a fallback chain (rate-limit resilience).
        let default_chain = vec![
            "nex-agi/nex-n2-pro:free".to_string(),
            "google/gemma-4-31b-it:free".to_string(),
        ];
        let mut models = BTreeMap::new();
        for (role, var, hard_default) in [
            (AgentRole::Validator, "SC_MODEL_VALIDATOR", "nex-agi/nex-n2-pro:free"),
            (AgentRole::RiskAssessor, "SC_MODEL_RISK_ASSESSOR", "nex-agi/nex-n2-pro:free"),
            (AgentRole::Predictor, "SC_MODEL_PREDICTOR", "nex-agi/nex-n2-pro:free"),
            (AgentRole::Compiler, "SC_MODEL_COMPILER", "nex-agi/nex-n2-pro:free"),
        ] {
            let chain: Vec<String> = match std::env::var(var) {
                Ok(v) => v.split(',').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect(),
                Err(_) => {
                    let mut c = vec![hard_default.to_string()];
                    c.extend(default_chain.iter().cloned());
                    c.dedup();
                    c
                }
            };
            models.insert(role, chain);
        }

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(180))
            .build()?;

        let vision_chain: Vec<String> = std::env::var("SC_MODEL_VISION")
            .unwrap_or_else(|_| "nex-agi/nex-n2-pro:free,google/gemma-4-31b-it:free".to_string())
            .split(',').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect();

        Ok(Self { client, api_key, base_url, models, vision_chain })
    }
}

#[derive(Serialize)]
struct OrMessage<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Serialize)]
struct OrRequest<'a> {
    model: &'a str,
    messages: Vec<OrMessage<'a>>,
    temperature: f32,
    max_tokens: u32,
}

#[derive(Deserialize)]
struct OrChoiceMsg {
    content: Option<String>,
}
#[derive(Deserialize)]
struct OrChoice {
    message: OrChoiceMsg,
}
#[derive(Deserialize)]
struct OrResponse {
    choices: Vec<OrChoice>,
    model: Option<String>,
}

#[async_trait]
impl LlmProvider for OpenRouter {
    async fn complete(&self, req: CompletionRequest) -> Result<CompletionResponse, ProviderError> {
        let chain = self
            .models
            .get(&req.role)
            .cloned()
            .unwrap_or_else(|| vec!["nvidia/nemotron-3-super-120b-a12b:free".to_string()]);

        let mut last_err = ProviderError::Malformed;
        for model in &chain {
            let body = OrRequest {
                model,
                messages: vec![
                    OrMessage { role: "system", content: &req.system },
                    OrMessage { role: "user", content: &req.user },
                ],
                temperature: req.temperature,
                max_tokens: req.max_tokens,
            };
            let resp = self
                .client
                .post(format!("{}/chat/completions", self.base_url))
                .bearer_auth(&self.api_key)
                .header("HTTP-Referer", "https://safety-companion.local")
                .header("X-Title", "Safety Companion v4")
                .json(&body)
                .send()
                .await;

            match resp {
                Err(e) => {
                    last_err = ProviderError::Transport(e.to_string());
                    tracing::warn!(model, error = %last_err, "model call failed, trying next in chain");
                    continue;
                }
                Ok(r) => {
                    let status = r.status();
                    if !status.is_success() {
                        let text = r.text().await.unwrap_or_default();
                        last_err = ProviderError::Status(status.as_u16(), truncate(&text, 300));
                        tracing::warn!(model, %status, "non-success from provider, trying next in chain");
                        continue;
                    }
                    let parsed: Result<OrResponse, _> = r.json().await;
                    match parsed {
                        Ok(p) => {
                            if let Some(text) =
                                p.choices.into_iter().next().and_then(|c| c.message.content)
                            {
                                if !text.trim().is_empty() {
                                    return Ok(CompletionResponse {
                                        text,
                                        model: p.model.unwrap_or_else(|| model.clone()),
                                    });
                                }
                            }
                            last_err = ProviderError::Malformed;
                        }
                        Err(e) => last_err = ProviderError::Transport(e.to_string()),
                    }
                }
            }
        }
        Err(last_err)
    }

    async fn complete_vision(&self, req: VisionRequest) -> Result<CompletionResponse, ProviderError> {
        let mut last_err = ProviderError::Malformed;
        for model in &self.vision_chain {
        let body = serde_json::json!({
            "model": model,
            "temperature": req.temperature,
            "max_tokens": req.max_tokens,
            "messages": [
                { "role": "system", "content": req.system },
                { "role": "user", "content": [
                    { "type": "text", "text": req.user_text },
                    { "type": "image_url", "image_url": {
                        "url": format!("data:{};base64,{}", req.media_type, req.image_b64)
                    }}
                ]}
            ]
        });
        let resp = match self
            .client
            .post(format!("{}/chat/completions", self.base_url))
            .bearer_auth(&self.api_key)
            .header("X-Title", "Safety Companion v4 Vision")
            .json(&body)
            .send()
            .await
        {
            Ok(r) => r,
            Err(e) => { last_err = ProviderError::Transport(e.to_string()); continue; }
        };
        let status = resp.status();
        if !status.is_success() {
            let text = resp.text().await.unwrap_or_default();
            last_err = ProviderError::Status(status.as_u16(), truncate(&text, 300));
            tracing::warn!(model, %status, "vision model failed, trying next in chain");
            continue;
        }
        let parsed: OrResponse = match resp.json().await {
            Ok(p) => p,
            Err(e) => { last_err = ProviderError::Transport(e.to_string()); continue; }
        };
        let model_name = parsed.model.clone().unwrap_or_else(|| model.clone());
        if let Some(text) = parsed.choices.into_iter().next().and_then(|c| c.message.content)
            .filter(|t| !t.trim().is_empty())
        {
            return Ok(CompletionResponse { text, model: model_name });
        }
        last_err = ProviderError::Malformed;
        }
        Err(last_err)
    }

    fn model_map(&self) -> BTreeMap<String, String> {
        self.models
            .iter()
            .map(|(role, chain)| (role.as_str().to_string(), chain.join(" -> ")))
            .collect()
    }
}

fn truncate(s: &str, n: usize) -> String {
    if s.len() <= n { s.to_string() } else { format!("{}…", &s[..n]) }
}

/// Strip markdown fences and extract the first JSON object from model output.
/// Free models are sloppy about "JSON only" instructions; we don't trust, we parse.
pub fn extract_json(text: &str) -> Option<serde_json::Value> {
    let cleaned = text.replace("```json", "").replace("```", "");
    // Fast path
    if let Ok(v) = serde_json::from_str::<serde_json::Value>(cleaned.trim()) {
        return Some(v);
    }
    // Scan for first balanced {...}
    let bytes = cleaned.as_bytes();
    let start = cleaned.find('{')?;
    let mut depth = 0usize;
    let mut in_str = false;
    let mut esc = false;
    for (i, &b) in bytes.iter().enumerate().skip(start) {
        let c = b as char;
        if in_str {
            if esc { esc = false; }
            else if c == '\\' { esc = true; }
            else if c == '"' { in_str = false; }
            continue;
        }
        match c {
            '"' => in_str = true,
            '{' => depth += 1,
            '}' => {
                depth -= 1;
                if depth == 0 {
                    return serde_json::from_str(&cleaned[start..=i]).ok();
                }
            }
            _ => {}
        }
    }
    None
}
