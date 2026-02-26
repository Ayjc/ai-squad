use rusqlite::{params, Connection};

use crate::chat::{
    AppendMessageInput, ChatConversationSummary, ChatMessageRecord, ChatRunRecord, ChatRunStepRecord,
    CreateConversationInput, NewRunInput, NewStepInput,
};
use crate::keys;
use crate::secure::EncryptedBlob;

fn now_iso(conn: &Connection) -> Result<String, String> {
    conn.query_row("SELECT strftime('%Y-%m-%dT%H:%M:%fZ','now')", [], |row| row.get(0))
        .map_err(|e| e.to_string())
}

fn encrypt_opt(key32: &[u8; 32], s: Option<String>) -> Result<Option<EncryptedBlob>, String> {
    match s {
        None => Ok(None),
        Some(v) => Ok(Some(crate::chat::encrypt_str(key32, &v)?)),
    }
}

pub fn migrate_chat_schema(conn: &Connection) -> Result<(), String> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS chat_conversations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            project_path TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            pinned INTEGER NOT NULL DEFAULT 0,
            tags_json TEXT NOT NULL DEFAULT '[]'
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS chat_messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            provider_id TEXT,
            content_nonce_b64 TEXT NOT NULL,
            content_ct_b64 TEXT NOT NULL,
            kind TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id
         ON chat_messages(conversation_id, created_at)",
        [],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS chat_runs (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            question_nonce_b64 TEXT NOT NULL,
            question_ct_b64 TEXT NOT NULL,
            providers_json TEXT NOT NULL,
            aggregator_provider_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_chat_runs_conversation_id
         ON chat_runs(conversation_id, created_at DESC)",
        [],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS chat_run_steps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT NOT NULL,
            provider_id TEXT NOT NULL,
            status TEXT NOT NULL,
            duration_ms INTEGER,
            error_category TEXT,
            error_raw_nonce_b64 TEXT,
            error_raw_ct_b64 TEXT,
            input_nonce_b64 TEXT,
            input_ct_b64 TEXT,
            output_nonce_b64 TEXT,
            output_ct_b64 TEXT,
            started_at TEXT,
            completed_at TEXT,
            FOREIGN KEY (run_id) REFERENCES chat_runs(id)
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_chat_run_steps_run_id
         ON chat_run_steps(run_id)",
        [],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn create_conversation(conn: &Connection, input: CreateConversationInput) -> Result<ChatConversationSummary, String> {
    let id = format!("conv-{}", uuid::Uuid::new_v4());
    let now = now_iso(conn)?;

    conn.execute(
        "INSERT INTO chat_conversations (id, title, project_path, created_at, updated_at, pinned, tags_json)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, '[]')",
        params![id, input.title, input.project_path, now, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(ChatConversationSummary {
        id,
        title: input.title,
        updated_at: now,
        pinned: false,
        project_path: input.project_path,
    })
}

pub fn list_conversations(conn: &Connection, project_path: Option<String>) -> Result<Vec<ChatConversationSummary>, String> {
    let mut out: Vec<ChatConversationSummary> = Vec::new();

    if let Some(p) = project_path {
        let mut stmt = conn
            .prepare(
                "SELECT id, title, updated_at, pinned, project_path
                 FROM chat_conversations
                 WHERE project_path = ?1
                 ORDER BY pinned DESC, updated_at DESC",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![p], |row| {
                Ok(ChatConversationSummary {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    updated_at: row.get(2)?,
                    pinned: row.get::<_, i64>(3)? != 0,
                    project_path: row.get(4)?,
                })
            })
            .map_err(|e| e.to_string())?;

        for r in rows {
            out.push(r.map_err(|e| e.to_string())?);
        }

        return Ok(out);
    }

    let mut stmt = conn
        .prepare(
            "SELECT id, title, updated_at, pinned, project_path
             FROM chat_conversations
             ORDER BY pinned DESC, updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(ChatConversationSummary {
                id: row.get(0)?,
                title: row.get(1)?,
                updated_at: row.get(2)?,
                pinned: row.get::<_, i64>(3)? != 0,
                project_path: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }

    Ok(out)
}

pub fn append_message(conn: &Connection, input: AppendMessageInput) -> Result<ChatMessageRecord, String> {
    let key = keys::load_or_create_master_key()?;
    let msg_id = format!("msg-{}", uuid::Uuid::new_v4());
    let now = now_iso(conn)?;

    let blob = crate::chat::encrypt_str(&key, &input.content)?;

    conn.execute(
        "INSERT INTO chat_messages
         (id, conversation_id, role, provider_id, content_nonce_b64, content_ct_b64, kind, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            msg_id,
            input.conversation_id,
            input.role,
            input.provider_id,
            blob.nonce_b64,
            blob.ct_b64,
            input.kind,
            now
        ],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE chat_conversations SET updated_at = ?1 WHERE id = ?2",
        params![now, input.conversation_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(ChatMessageRecord {
        id: msg_id,
        conversation_id: input.conversation_id,
        role: input.role,
        provider_id: input.provider_id,
        content_enc: blob,
        created_at: now,
        kind: input.kind,
    })
}

pub fn list_messages(conn: &Connection, conversation_id: String) -> Result<Vec<ChatMessageRecord>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, conversation_id, role, provider_id, content_nonce_b64, content_ct_b64, created_at, kind
             FROM chat_messages
             WHERE conversation_id = ?1
             ORDER BY created_at ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![conversation_id], |row| {
            Ok(ChatMessageRecord {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                role: row.get(2)?,
                provider_id: row.get(3)?,
                content_enc: EncryptedBlob {
                    nonce_b64: row.get(4)?,
                    ct_b64: row.get(5)?,
                },
                created_at: row.get(6)?,
                kind: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn create_run(conn: &Connection, input: NewRunInput) -> Result<ChatRunRecord, String> {
    let key = keys::load_or_create_master_key()?;
    let id = format!("run-{}", uuid::Uuid::new_v4());
    let now = now_iso(conn)?;
    let question_enc = crate::chat::encrypt_str(&key, &input.question)?;
    let providers_json = serde_json::to_string(&input.providers).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO chat_runs
         (id, conversation_id, question_nonce_b64, question_ct_b64, providers_json, aggregator_provider_id, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            id,
            input.conversation_id,
            question_enc.nonce_b64,
            question_enc.ct_b64,
            providers_json,
            input.aggregator_provider_id,
            now
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(ChatRunRecord {
        id,
        conversation_id: input.conversation_id,
        question_enc,
        providers_json,
        aggregator_provider_id: input.aggregator_provider_id,
        created_at: now,
    })
}

pub fn upsert_step(conn: &Connection, input: NewStepInput) -> Result<ChatRunStepRecord, String> {
    let key = keys::load_or_create_master_key()?;

    let error_raw_enc = encrypt_opt(&key, input.error_raw)?;
    let input_enc = encrypt_opt(&key, input.input)?;
    let output_enc = encrypt_opt(&key, input.output)?;

    // Simple approach: insert a new row each update.
    conn.execute(
        "INSERT INTO chat_run_steps
        (run_id, provider_id, status, duration_ms, error_category,
         error_raw_nonce_b64, error_raw_ct_b64,
         input_nonce_b64, input_ct_b64,
         output_nonce_b64, output_ct_b64,
         started_at, completed_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            input.run_id,
            input.provider_id,
            input.status,
            input.duration_ms,
            input.error_category,
            error_raw_enc.as_ref().map(|b| b.nonce_b64.clone()),
            error_raw_enc.as_ref().map(|b| b.ct_b64.clone()),
            input_enc.as_ref().map(|b| b.nonce_b64.clone()),
            input_enc.as_ref().map(|b| b.ct_b64.clone()),
            output_enc.as_ref().map(|b| b.nonce_b64.clone()),
            output_enc.as_ref().map(|b| b.ct_b64.clone()),
            input.started_at,
            input.completed_at
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(ChatRunStepRecord {
        id: Some(conn.last_insert_rowid()),
        run_id: input.run_id,
        provider_id: input.provider_id,
        status: input.status,
        duration_ms: input.duration_ms,
        error_category: input.error_category,
        error_raw_enc,
        input_enc,
        output_enc,
        started_at: input.started_at,
        completed_at: input.completed_at,
    })
}
