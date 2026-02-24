use serde::{Deserialize, Serialize};

use crate::secure::{self, EncryptedBlob};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatConversationRecord {
    pub id: String,
    pub title: String,
    pub project_path: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub pinned: bool,
    pub tags_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessageRecord {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub provider_id: Option<String>,
    pub content_enc: EncryptedBlob,
    pub created_at: String,
    pub kind: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRunRecord {
    pub id: String,
    pub conversation_id: String,
    pub question_enc: EncryptedBlob,
    pub providers_json: String,
    pub aggregator_provider_id: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRunStepRecord {
    pub id: Option<i64>,
    pub run_id: String,
    pub provider_id: String,
    pub status: String,
    pub duration_ms: Option<i64>,
    pub error_category: Option<String>,
    pub error_raw_enc: Option<EncryptedBlob>,
    pub input_enc: Option<EncryptedBlob>,
    pub output_enc: Option<EncryptedBlob>,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatConversationSummary {
    pub id: String,
    pub title: String,
    pub updated_at: String,
    pub pinned: bool,
    pub project_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateConversationInput {
    pub title: String,
    pub project_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppendMessageInput {
    pub conversation_id: String,
    pub role: String,
    pub provider_id: Option<String>,
    pub content: String,
    pub kind: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewRunInput {
    pub conversation_id: String,
    pub question: String,
    pub providers: Vec<String>,
    pub aggregator_provider_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewStepInput {
    pub run_id: String,
    pub provider_id: String,
    pub status: String,
    pub duration_ms: Option<i64>,
    pub error_category: Option<String>,
    pub error_raw: Option<String>,
    pub input: Option<String>,
    pub output: Option<String>,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptionKeyB64 {
    pub key_b64: String,
}

fn utc_now_iso() -> String {
    // ISO-8601 timestamp via `date` command; keeps deps minimal.
    // If it fails, fall back to milliseconds since epoch.
    match std::process::Command::new("date")
        .arg("-u")
        .arg("+%Y-%m-%dT%H:%M:%SZ")
        .output()
    {
        Ok(o) if o.status.success() => String::from_utf8_lossy(&o.stdout).trim().to_string(),
        _ => format!("{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis()),
    }
}

pub fn encrypt_str(key32: &[u8; 32], s: &str) -> Result<EncryptedBlob, String> {
    secure::encrypt(key32, s.as_bytes())
}

pub fn decrypt_to_string(key32: &[u8; 32], blob: &EncryptedBlob) -> Result<String, String> {
    let pt = secure::decrypt(key32, blob)?;
    String::from_utf8(pt).map_err(|e| format!("Invalid UTF-8: {e}"))
}
