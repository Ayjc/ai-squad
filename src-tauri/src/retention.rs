use rusqlite::{params, Connection, OptionalExtension};
use std::fs;

use crate::config;
use crate::paths;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RetentionReport {
    pub db_path: String,
    pub db_size_bytes: u64,
    pub max_bytes: u64,
    pub max_days: u32,
    pub deleted_rows: i64,
}

fn db_file_size() -> Result<u64, String> {
    let p = paths::db_path()?;
    let meta = fs::metadata(&p).map_err(|e| format!("Failed to stat db: {e}"))?;
    Ok(meta.len())
}

fn delete_older_than(conn: &Connection, cutoff_days: u32) -> Result<i64, String> {
    // We store ISO strings; SQLite can compare with datetime('now', '-N days').
    let cutoff_expr = format!("datetime('now', '-{} days')", cutoff_days);

    // Delete chat data.
    let mut deleted: i64 = 0;

    // chat_run_steps -> chat_runs -> chat_messages -> chat_conversations (order matters)
    deleted += conn
        .execute(
            &format!(
                "DELETE FROM chat_run_steps WHERE run_id IN (
                   SELECT id FROM chat_runs WHERE created_at < {}
                 )",
                cutoff_expr
            ),
            [],
        )
        .map_err(|e| e.to_string())? as i64;

    deleted += conn
        .execute(
            &format!("DELETE FROM chat_runs WHERE created_at < {}", cutoff_expr),
            [],
        )
        .map_err(|e| e.to_string())? as i64;

    deleted += conn
        .execute(
            &format!("DELETE FROM chat_messages WHERE created_at < {}", cutoff_expr),
            [],
        )
        .map_err(|e| e.to_string())? as i64;

    // Only delete conversations that have no messages and are older than cutoff.
    deleted += conn
        .execute(
            &format!(
                "DELETE FROM chat_conversations
                 WHERE updated_at < {}
                   AND id NOT IN (SELECT DISTINCT conversation_id FROM chat_messages)",
                cutoff_expr
            ),
            [],
        )
        .map_err(|e| e.to_string())? as i64;

    Ok(deleted)
}

fn delete_until_size_below(conn: &Connection, max_bytes: u64) -> Result<i64, String> {
    // Best-effort: delete oldest conversations (by updated_at) until db file size is below threshold.
    // We do this in batches to avoid long locks.
    let mut deleted_rows: i64 = 0;

    loop {
        let size = db_file_size()?;
        if size <= max_bytes {
            break;
        }

        // Pick the oldest conversation.
        let oldest: Option<String> = conn
            .query_row(
                "SELECT id FROM chat_conversations ORDER BY pinned ASC, updated_at ASC LIMIT 1",
                [],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| e.to_string())?;

        let Some(conv_id) = oldest else {
            break;
        };

        // Delete related rows.
        deleted_rows += conn
            .execute(
                "DELETE FROM chat_run_steps WHERE run_id IN (
                    SELECT id FROM chat_runs WHERE conversation_id = ?1
                 )",
                params![conv_id],
            )
            .map_err(|e| e.to_string())? as i64;

        deleted_rows += conn
            .execute("DELETE FROM chat_runs WHERE conversation_id = ?1", params![conv_id])
            .map_err(|e| e.to_string())? as i64;

        deleted_rows += conn
            .execute("DELETE FROM chat_messages WHERE conversation_id = ?1", params![conv_id])
            .map_err(|e| e.to_string())? as i64;

        deleted_rows += conn
            .execute("DELETE FROM chat_conversations WHERE id = ?1", params![conv_id])
            .map_err(|e| e.to_string())? as i64;

        // Reclaim space incrementally.
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE)", [])
            .ok();
        conn.execute("VACUUM", []).ok();
    }

    Ok(deleted_rows)
}

pub fn run_retention(conn: &Connection, dry_run: bool) -> Result<RetentionReport, String> {
    let cfg = config::load_config()?;

    let _before_size = db_file_size()?;
    let mut deleted: i64 = 0;

    if !dry_run {
        deleted += delete_older_than(conn, cfg.retention.max_days)?;
        deleted += delete_until_size_below(conn, cfg.retention.max_bytes)?;

        conn.execute("PRAGMA wal_checkpoint(TRUNCATE)", []).ok();
        conn.execute("VACUUM", []).ok();
    }

    let after_size = db_file_size()?;

    Ok(RetentionReport {
        db_path: paths::db_path()?.to_string_lossy().to_string(),
        db_size_bytes: after_size,
        max_bytes: cfg.retention.max_bytes,
        max_days: cfg.retention.max_days,
        deleted_rows: if dry_run { 0 } else { deleted },
    })
}
