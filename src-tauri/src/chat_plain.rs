use serde::{Deserialize, Serialize};

use crate::chat::ChatMessageRecord;
use crate::keys;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessagePlain {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub provider_id: Option<String>,
    pub content: String,
    pub created_at: String,
    pub kind: Option<String>,
}

pub fn decrypt_message(record: ChatMessageRecord) -> Result<ChatMessagePlain, String> {
    let key = keys::load_or_create_master_key()?;
    let content = crate::chat::decrypt_to_string(&key, &record.content_enc)?;

    Ok(ChatMessagePlain {
        id: record.id,
        conversation_id: record.conversation_id,
        role: record.role,
        provider_id: record.provider_id,
        content,
        created_at: record.created_at,
        kind: record.kind,
    })
}
