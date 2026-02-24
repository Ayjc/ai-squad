use crate::paths;
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetentionConfig {
    pub max_bytes: u64,
    pub max_days: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub concurrency_limit: u32,
    pub context_max_chars: u32,
    pub retention: RetentionConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            concurrency_limit: 4,
            context_max_chars: 200_000,
            retention: RetentionConfig {
                max_bytes: 1_000_000_000,
                max_days: 90,
            },
        }
    }
}

#[tauri::command]
pub async fn get_config() -> Result<AppConfig, String> {
    load_config()
}

#[tauri::command]
pub async fn save_config_cmd(config: AppConfig) -> Result<(), String> {
    save_config(&config)
}

pub fn load_config() -> Result<AppConfig, String> {
    let path = paths::config_path()?;

    if !path.exists() {
        return Ok(AppConfig::default());
    }

    let bytes = fs::read(&path).map_err(|e| format!("Failed to read config: {e}"))?;
    serde_json::from_slice::<AppConfig>(&bytes).map_err(|e| format!("Invalid config.json: {e}"))
}

pub fn save_config(config: &AppConfig) -> Result<(), String> {
    let base = paths::aisquad_home_dir()?;
    fs::create_dir_all(&base).map_err(|e| format!("Failed to create ~/.ai-squad: {e}"))?;

    let path = paths::config_path()?;
    let json = serde_json::to_vec_pretty(config).map_err(|e| format!("Failed to serialize config: {e}"))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write config: {e}"))?;
    Ok(())
}
