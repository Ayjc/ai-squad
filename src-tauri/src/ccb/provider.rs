// Provider 管理模块

use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Provider {
    pub id: String,
    pub name: String,
    pub display_name: String,
    pub color: String,
    pub avatar: String,
}

/// 获取所有支持的 providers
pub fn get_supported_providers() -> Vec<Provider> {
    vec![
        Provider {
            id: "codex".to_string(),
            name: "Codex".to_string(),
            display_name: "OpenAI Codex".to_string(),
            color: "#10A37F".to_string(),
            avatar: "🤖".to_string(),
        },
        Provider {
            id: "claude".to_string(),
            name: "Claude".to_string(),
            display_name: "Anthropic Claude".to_string(),
            color: "#D97706".to_string(),
            avatar: "🧠".to_string(),
        },
        Provider {
            id: "gemini".to_string(),
            name: "Gemini".to_string(),
            display_name: "Google Gemini".to_string(),
            color: "#4285F4".to_string(),
            avatar: "🔷".to_string(),
        },
        Provider {
            id: "opencode".to_string(),
            name: "OpenCode".to_string(),
            display_name: "OpenCode".to_string(),
            color: "#8B5CF6".to_string(),
            avatar: "⚡".to_string(),
        },
    ]
}

/// 检查 provider 是否在线
pub fn check_provider_status(provider_id: &str) -> bool {
    let output = Command::new("ping")
        .arg(provider_id)
        .output();

    match output {
        Ok(o) => o.status.success(),
        Err(_) => false,
    }
}
