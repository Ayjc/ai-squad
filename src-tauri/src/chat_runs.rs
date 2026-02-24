use rusqlite::{params, Connection};

use crate::keys;
use crate::secure::EncryptedBlob;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ChatRunStepPlain {
    pub id: i64,
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

pub fn list_steps_plain(conn: &Connection, run_id: String) -> Result<Vec<ChatRunStepPlain>, String> {
    let key = keys::load_or_create_master_key()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, run_id, provider_id, status, duration_ms, error_category,
                    error_raw_nonce_b64, error_raw_ct_b64,
                    input_nonce_b64, input_ct_b64,
                    output_nonce_b64, output_ct_b64,
                    started_at, completed_at
             FROM chat_run_steps
             WHERE run_id = ?1
             ORDER BY id ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![run_id], |row| {
            let mk_blob = |nonce: Option<String>, ct: Option<String>| -> Option<EncryptedBlob> {
                match (nonce, ct) {
                    (Some(n), Some(c)) => Some(EncryptedBlob { nonce_b64: n, ct_b64: c }),
                    _ => None,
                }
            };

            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Option<i64>>(4)?,
                row.get::<_, Option<String>>(5)?,
                mk_blob(row.get(6)?, row.get(7)?),
                mk_blob(row.get(8)?, row.get(9)?),
                mk_blob(row.get(10)?, row.get(11)?),
                row.get::<_, Option<String>>(12)?,
                row.get::<_, Option<String>>(13)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut out: Vec<ChatRunStepPlain> = Vec::new();
    for row in rows {
        let (
            id,
            run_id,
            provider_id,
            status,
            duration_ms,
            error_category,
            error_raw_enc,
            input_enc,
            output_enc,
            started_at,
            completed_at,
        ) = row.map_err(|e| e.to_string())?;

        let decrypt_opt = |b: Option<EncryptedBlob>| -> Result<Option<String>, String> {
            match b {
                None => Ok(None),
                Some(blob) => {
                    let pt = crate::secure::decrypt(&key, &blob)?;
                    let s = String::from_utf8(pt).map_err(|e| format!("Invalid UTF-8: {e}"))?;
                    Ok(Some(s))
                }
            }
        };

        out.push(ChatRunStepPlain {
            id,
            run_id,
            provider_id,
            status,
            duration_ms,
            error_category,
            error_raw: decrypt_opt(error_raw_enc)?,
            input: decrypt_opt(input_enc)?,
            output: decrypt_opt(output_enc)?,
            started_at,
            completed_at,
        });
    }

    Ok(out)
}
