use tauri::State;

use crate::chat::{AppendMessageInput, ChatConversationSummary, ChatMessageRecord, ChatRunRecord, ChatRunStepRecord, CreateConversationInput, NewRunInput, NewStepInput};
use crate::db::DbState;

#[tauri::command]
pub fn chat_create_conversation(db: State<'_, DbState>, input: CreateConversationInput) -> Result<ChatConversationSummary, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    crate::chat_db::create_conversation(&conn, input)
}

#[tauri::command]
pub fn chat_list_conversations(db: State<'_, DbState>, project_path: Option<String>) -> Result<Vec<ChatConversationSummary>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    crate::chat_db::list_conversations(&conn, project_path)
}

#[tauri::command]
pub fn chat_append_message(db: State<'_, DbState>, input: AppendMessageInput) -> Result<ChatMessageRecord, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    crate::chat_db::append_message(&conn, input)
}

#[tauri::command]
pub fn chat_list_messages(db: State<'_, DbState>, conversation_id: String) -> Result<Vec<ChatMessageRecord>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    crate::chat_db::list_messages(&conn, conversation_id)
}

#[tauri::command]
pub fn chat_list_messages_plain(db: State<'_, DbState>, conversation_id: String) -> Result<Vec<crate::chat_plain::ChatMessagePlain>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let enc = crate::chat_db::list_messages(&conn, conversation_id)?;
    enc.into_iter().map(crate::chat_plain::decrypt_message).collect()
}

#[tauri::command]
pub fn chat_create_run(db: State<'_, DbState>, input: NewRunInput) -> Result<ChatRunRecord, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    crate::chat_db::create_run(&conn, input)
}

#[tauri::command]
pub fn chat_log_step(db: State<'_, DbState>, input: NewStepInput) -> Result<ChatRunStepRecord, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    crate::chat_db::upsert_step(&conn, input)
}

#[tauri::command]
pub fn chat_list_run_steps_plain(db: State<'_, DbState>, run_id: String) -> Result<Vec<crate::chat_runs::ChatRunStepPlain>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    crate::chat_runs::list_steps_plain(&conn, run_id)
}
