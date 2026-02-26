use serde::{Deserialize, Serialize};

use reqwest::StatusCode;

use super::{ProviderError, ProviderErrorKind};

const ANTHROPIC_API_URL: &str = "https://api.anthropic.com/v1/messages";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AnthropicRole {
    User,
    Assistant,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnthropicMessage {
    pub role: AnthropicRole,
    pub content: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct AnthropicMessagesRequest {
    pub model: String,
    pub max_tokens: u32,
    pub messages: Vec<AnthropicMessage>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AnthropicContentBlock {
    #[serde(rename = "type")]
    pub block_type: String,
    pub text: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AnthropicMessagesResponse {
    pub content: Vec<AnthropicContentBlock>,
}

fn map_reqwest_err(e: reqwest::Error) -> ProviderError {
    if e.is_timeout() {
        return ProviderError::new(ProviderErrorKind::Timeout, e.to_string(), "anthropic");
    }
    if e.is_connect() {
        return ProviderError::new(ProviderErrorKind::Network, e.to_string(), "anthropic");
    }
    ProviderError::new(ProviderErrorKind::Unknown, e.to_string(), "anthropic")
}

pub async fn chat(api_key: &str, model: &str, messages: Vec<AnthropicMessage>, max_tokens: u32) -> Result<String, ProviderError> {
    let client = reqwest::Client::new();

    let req = AnthropicMessagesRequest {
        model: model.to_string(),
        max_tokens,
        messages,
    };

    let resp = client
        .post(ANTHROPIC_API_URL)
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&req)
        .send()
        .await
        .map_err(map_reqwest_err)?;

    let status = resp.status();
    let body = resp.text().await.map_err(map_reqwest_err)?;

    if status == StatusCode::UNAUTHORIZED || status == StatusCode::FORBIDDEN {
        return Err(ProviderError::new(ProviderErrorKind::Auth, body, "anthropic"));
    }
    if status == StatusCode::TOO_MANY_REQUESTS {
        return Err(ProviderError::new(ProviderErrorKind::RateLimit, body, "anthropic"));
    }
    if status == StatusCode::BAD_REQUEST {
        return Err(ProviderError::new(ProviderErrorKind::BadRequest, body, "anthropic"));
    }
    if !status.is_success() {
        return Err(ProviderError::new(ProviderErrorKind::Unknown, format!("HTTP {}: {}", status, body), "anthropic"));
    }

    let parsed: AnthropicMessagesResponse = serde_json::from_str(&body)
        .map_err(|e| ProviderError::new(ProviderErrorKind::Unknown, format!("Failed to parse response: {e}. Body: {body}"), "anthropic"))?;

    let mut out = String::new();
    for block in parsed.content {
        if block.block_type == "text" {
            if let Some(t) = block.text {
                if !out.is_empty() {
                    out.push_str("\n");
                }
                out.push_str(&t);
            }
        }
    }

    Ok(out)
}
