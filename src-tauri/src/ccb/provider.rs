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

/// Check provider status using CCB's ping command with work_dir context
pub fn check_provider_status(provider_id: &str, work_dir: Option<&str>) -> bool {
    let ccb_ping = dirs::home_dir()
        .map(|h| h.join(".local/share/codex-dual/bin/ping"))
        .unwrap_or_default();

    // Prefer CCB ping binary path, fall back to "ping" in PATH
    let ping_cmd = if ccb_ping.exists() {
        ccb_ping.to_string_lossy().to_string()
    } else {
        "ping".to_string()
    };

    let mut cmd = Command::new(&ping_cmd);
    cmd.arg(provider_id);

    if let Some(wd) = work_dir {
        cmd.current_dir(wd);
    }

    match cmd.output() {
        Ok(o) => o.status.success(),
        Err(_) => false,
    }
}
