use serde::{Deserialize, Serialize};

use crate::keys;
use crate::providers;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderChatRequest {
    pub provider_id: String,
    pub model: String,
    pub messages: Vec<ProviderChatMessage>,
    pub max_tokens: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProviderChatRole {
    User,
    Assistant,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderChatMessage {
    pub role: ProviderChatRole,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderChatResponse {
    pub content: String,
}

#[tauri::command]
pub async fn provider_chat(req: ProviderChatRequest) -> Result<ProviderChatResponse, String> {
    if req.provider_id != "claude" {
        return Err("provider_chat: only 'claude' is supported in this build".to_string());
    }

    let api_key = keys::get_provider_key_plain("claude")?
        .ok_or_else(|| "Claude API key is not configured".to_string())?;

    let max_tokens = req.max_tokens.unwrap_or(1024);

    // Map to Anthropic's message format. (System messages are ignored for now.)
    let mut msgs: Vec<providers::anthropic::AnthropicMessage> = Vec::new();
    for m in req.messages {
        match m.role {
            ProviderChatRole::User => msgs.push(providers::anthropic::AnthropicMessage {
                role: providers::anthropic::AnthropicRole::User,
                content: m.content,
            }),
            ProviderChatRole::Assistant => msgs.push(providers::anthropic::AnthropicMessage {
                role: providers::anthropic::AnthropicRole::Assistant,
                content: m.content,
            }),
            ProviderChatRole::System => {
                // TODO: support Anthropic `system` field. For V1 we keep system prompts in content.
            }
        }
    }

    let out = providers::anthropic::chat(&api_key, &req.model, msgs, max_tokens)
        .await
        .map_err(|e| format!("{}: {}", e.category(), e.message))?;

    Ok(ProviderChatResponse { content: out })
}
