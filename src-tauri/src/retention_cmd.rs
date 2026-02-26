use tauri::State;

use crate::db::DbState;

#[tauri::command]
pub fn retention_run(db: State<'_, DbState>, dry_run: Option<bool>) -> Result<crate::retention::RetentionReport, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    crate::retention::run_retention(&conn, dry_run.unwrap_or(false))
}
