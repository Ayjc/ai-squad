// 数据库模块

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use std::sync::Mutex;
use rusqlite::{Connection, params};

use crate::paths;

pub struct DbState(pub Mutex<Connection>);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskRecord {
    pub id: String,
    pub title: String,
    pub description: String,
    pub status: String,
    pub mode: String,
    pub assignees: String,
    pub progress: i32,
    pub created_at: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskResultRecord {
    pub result_id: Option<String>,
    pub task_id: String,
    pub agent_id: String,
    pub content: String,
    pub success: bool,
    pub error: Option<String>,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskStepRecord {
    pub id: Option<i64>,
    pub task_id: String,
    pub agent_id: String,
    pub step_index: i32,
    pub title: String,
    pub content: Option<String>,
    pub status: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollaborationStatRecord {
    pub id: Option<i64>,
    pub agent_combo: String,
    pub mode: String,
    pub total_tasks: i32,
    pub success_count: i32,
    pub avg_duration_ms: i64,
    pub last_used_at: Option<String>,
    pub created_at: Option<String>,
}

/// 初始化数据库
pub fn init_database(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Ensure workspace directories exist under ~/.ai-squad
    let base_dir = paths::aisquad_home_dir().map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
    let data_dir = paths::data_dir().map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
    std::fs::create_dir_all(&base_dir)?;
    std::fs::create_dir_all(&data_dir)?;

    let db_path = paths::db_path().map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
    let conn = Connection::open(&db_path)?;

    // 创建表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            mode TEXT NOT NULL DEFAULT 'parallel',
            assignees TEXT NOT NULL,
            progress INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            started_at TIMESTAMP,
            completed_at TIMESTAMP
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS task_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            result_id TEXT,
            task_id TEXT NOT NULL,
            agent_id TEXT NOT NULL,
            content TEXT,
            success BOOLEAN DEFAULT FALSE,
            error TEXT,
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            FOREIGN KEY (task_id) REFERENCES tasks(id)
        )",
        [],
    )?;

    run_migrations(&conn)?;

    // Chat schema (V1)
    crate::chat_db::migrate_chat_schema(&conn)
        .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS agent_stats (
            agent_id TEXT PRIMARY KEY,
            level INTEGER DEFAULT 1,
            experience INTEGER DEFAULT 0,
            tasks_completed INTEGER DEFAULT 0,
            tasks_failed INTEGER DEFAULT 0,
            total_time_ms INTEGER DEFAULT 0
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS collaboration_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_combo TEXT NOT NULL,
            mode TEXT NOT NULL,
            total_tasks INTEGER DEFAULT 0,
            success_count INTEGER DEFAULT 0,
            avg_duration_ms INTEGER DEFAULT 0,
            last_used_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS achievements (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            icon TEXT NOT NULL,
            description TEXT,
            unlocked_at TIMESTAMP,
            progress INTEGER DEFAULT 0
        )",
        [],
    )?;

    // 存储到 app state
    app.manage(DbState(Mutex::new(conn)));

    Ok(())
}

fn get_schema_version(conn: &Connection) -> Result<i32, rusqlite::Error> {
    conn.query_row("PRAGMA user_version", [], |row| row.get(0))
}

fn set_schema_version(conn: &Connection, version: i32) -> Result<(), rusqlite::Error> {
    conn.pragma_update(None, "user_version", version)
}

fn has_column(conn: &Connection, table_name: &str, column_name: &str) -> Result<bool, rusqlite::Error> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({})", table_name))?;
    let mut rows = stmt.query([])?;

    while let Some(row) = rows.next()? {
        let current_name: String = row.get(1)?;
        if current_name == column_name {
            return Ok(true);
        }
    }

    Ok(false)
}

fn build_result_id(task_id: &str, agent_id: &str, started_at: Option<&str>, completed_at: Option<&str>) -> String {
    format!(
        "{}|{}|{}|{}",
        task_id,
        agent_id,
        started_at.unwrap_or(""),
        completed_at.unwrap_or("")
    )
}

fn normalize_agent_combo(agent_combo: &str) -> String {
    let mut ids: Vec<&str> = agent_combo
        .split('+')
        .map(str::trim)
        .filter(|item| !item.is_empty())
        .collect();
    ids.sort_unstable();

    if ids.is_empty() {
        return agent_combo.trim().to_string();
    }

    ids.join("+")
}

fn run_migrations(conn: &Connection) -> Result<(), rusqlite::Error> {
    let mut version = get_schema_version(conn)?;

    if version < 1 {
        if !has_column(conn, "task_results", "result_id")? {
            conn.execute("ALTER TABLE task_results ADD COLUMN result_id TEXT", [])?;
        }

        conn.execute(
            "UPDATE task_results
             SET result_id = task_id || '|' || agent_id || '|' || IFNULL(started_at, '') || '|' || IFNULL(completed_at, '')
             WHERE result_id IS NULL OR result_id = ''",
            [],
        )?;

        conn.execute(
            "DELETE FROM task_results
             WHERE id NOT IN (
                 SELECT MIN(id)
                 FROM task_results
                 GROUP BY result_id
             )",
            [],
        )?;

        conn.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_task_results_result_id
             ON task_results(result_id)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_task_results_task_id
             ON task_results(task_id)",
            [],
        )?;

        set_schema_version(conn, 1)?;
        version = 1;
    }

    if version < 2 {
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_created_at
             ON tasks(created_at DESC)",
            [],
        )?;
        set_schema_version(conn, 2)?;
        version = 2;
    }

    if version < 3 {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS collaboration_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_combo TEXT NOT NULL,
                mode TEXT NOT NULL,
                total_tasks INTEGER DEFAULT 0,
                success_count INTEGER DEFAULT 0,
                avg_duration_ms INTEGER DEFAULT 0,
                last_used_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;
        set_schema_version(conn, 3)?;
        version = 3;
    }

    if version < 4 {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS task_steps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT NOT NULL,
                agent_id TEXT NOT NULL,
                step_index INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                FOREIGN KEY (task_id) REFERENCES tasks(id)
            )",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_task_steps_task_id
             ON task_steps(task_id)",
            [],
        )?;

        set_schema_version(conn, 4)?;
        version = 4;
    }

    if version < 5 {
        conn.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_collaboration_stats_combo_mode
             ON collaboration_stats(agent_combo, mode)",
            [],
        )?;

        set_schema_version(conn, 5)?;
    }

    Ok(())
}

/// 获取协作统计（按 total_tasks 降序）
#[tauri::command]
pub fn get_collaboration_stats(
    db: tauri::State<'_, DbState>,
) -> Result<Vec<CollaborationStatRecord>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, agent_combo, mode, total_tasks, success_count, avg_duration_ms, last_used_at, created_at
             FROM collaboration_stats
             ORDER BY total_tasks DESC, id ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(CollaborationStatRecord {
                id: row.get(0)?,
                agent_combo: row.get(1)?,
                mode: row.get(2)?,
                total_tasks: row.get(3)?,
                success_count: row.get(4)?,
                avg_duration_ms: row.get(5)?,
                last_used_at: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

/// 写入或更新协作统计
#[tauri::command]
pub fn upsert_collaboration_stat(
    db: tauri::State<'_, DbState>,
    agent_combo: String,
    mode: String,
    success: bool,
    duration_ms: i64,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let normalized_combo = normalize_agent_combo(&agent_combo);

    conn.execute(
        "INSERT INTO collaboration_stats
         (agent_combo, mode, total_tasks, success_count, avg_duration_ms, last_used_at)
         VALUES (?1, ?2, 1, CASE WHEN ?3 THEN 1 ELSE 0 END, ?4, CURRENT_TIMESTAMP)
         ON CONFLICT(agent_combo, mode) DO UPDATE SET
           total_tasks = collaboration_stats.total_tasks + 1,
           success_count = collaboration_stats.success_count + CASE WHEN excluded.success_count > 0 THEN 1 ELSE 0 END,
           avg_duration_ms = (
             (collaboration_stats.avg_duration_ms * collaboration_stats.total_tasks) + excluded.avg_duration_ms
           ) / (collaboration_stats.total_tasks + 1),
           last_used_at = CURRENT_TIMESTAMP",
        params![normalized_combo, mode, success, duration_ms],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// 获取最佳协作组合（按 success_count 降序）
#[tauri::command]
pub fn get_best_combo(
    db: tauri::State<'_, DbState>,
) -> Result<Option<CollaborationStatRecord>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, agent_combo, mode, total_tasks, success_count, avg_duration_ms, last_used_at, created_at
             FROM collaboration_stats
             ORDER BY success_count DESC, total_tasks DESC, id ASC
             LIMIT 1",
        )
        .map_err(|e| e.to_string())?;

    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let record = CollaborationStatRecord {
            id: row.get(0).map_err(|e| e.to_string())?,
            agent_combo: row.get(1).map_err(|e| e.to_string())?,
            mode: row.get(2).map_err(|e| e.to_string())?,
            total_tasks: row.get(3).map_err(|e| e.to_string())?,
            success_count: row.get(4).map_err(|e| e.to_string())?,
            avg_duration_ms: row.get(5).map_err(|e| e.to_string())?,
            last_used_at: row.get(6).map_err(|e| e.to_string())?,
            created_at: row.get(7).map_err(|e| e.to_string())?,
        };
        return Ok(Some(record));
    }

    Ok(None)
}

/// 获取所有任务
#[tauri::command]
pub fn get_tasks(db: tauri::State<'_, DbState>) -> Result<Vec<TaskRecord>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, status, mode, assignees, progress,
                    created_at, started_at, completed_at FROM tasks ORDER BY created_at DESC"
        )
        .map_err(|e| e.to_string())?;

    let tasks = stmt
        .query_map([], |row| {
            Ok(TaskRecord {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                status: row.get(3)?,
                mode: row.get(4)?,
                assignees: row.get(5)?,
                progress: row.get(6)?,
                created_at: row.get(7)?,
                started_at: row.get(8)?,
                completed_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(tasks)
}

/// 保存任务
#[tauri::command]
pub fn save_task(db: tauri::State<'_, DbState>, task: TaskRecord) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO tasks
         (id, title, description, status, mode, assignees, progress, created_at, started_at, completed_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            task.id,
            task.title,
            task.description,
            task.status,
            task.mode,
            task.assignees,
            task.progress,
            task.created_at,
            task.started_at,
            task.completed_at
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// 获取任务结果（可按 task_id 过滤）
#[tauri::command]
pub fn get_task_results(
    db: tauri::State<'_, DbState>,
    task_id: Option<String>,
) -> Result<Vec<TaskResultRecord>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    if let Some(task_id) = task_id {
        let mut stmt = conn
            .prepare(
                "SELECT result_id, task_id, agent_id, content, success, error, started_at, completed_at
                 FROM task_results
                 WHERE task_id = ?1
                 ORDER BY id ASC",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![task_id], |row| {
                Ok(TaskResultRecord {
                    result_id: row.get(0)?,
                    task_id: row.get(1)?,
                    agent_id: row.get(2)?,
                    content: row.get(3)?,
                    success: row.get(4)?,
                    error: row.get(5)?,
                    started_at: row.get(6)?,
                    completed_at: row.get(7)?,
                })
            })
            .map_err(|e| e.to_string())?;

        return rows
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string());
    }

    let mut stmt = conn
        .prepare(
            "SELECT result_id, task_id, agent_id, content, success, error, started_at, completed_at
             FROM task_results
             ORDER BY id ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(TaskResultRecord {
                result_id: row.get(0)?,
                task_id: row.get(1)?,
                agent_id: row.get(2)?,
                content: row.get(3)?,
                success: row.get(4)?,
                error: row.get(5)?,
                started_at: row.get(6)?,
                completed_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

/// 保存单条任务结果
#[tauri::command]
pub fn save_task_result(
    db: tauri::State<'_, DbState>,
    mut result: TaskResultRecord,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    if result.result_id.is_none() {
        result.result_id = Some(build_result_id(
            &result.task_id,
            &result.agent_id,
            result.started_at.as_deref(),
            result.completed_at.as_deref(),
        ));
    }

    conn.execute(
        "INSERT INTO task_results
         (result_id, task_id, agent_id, content, success, error, started_at, completed_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(result_id) DO UPDATE SET
           task_id = excluded.task_id,
           agent_id = excluded.agent_id,
           content = excluded.content,
           success = excluded.success,
           error = excluded.error,
           started_at = excluded.started_at,
           completed_at = excluded.completed_at",
        params![
            result.result_id,
            result.task_id,
            result.agent_id,
            result.content,
            result.success,
            result.error,
            result.started_at,
            result.completed_at,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// 清空指定任务的结果（用于全量重写）
#[tauri::command]
pub fn delete_task_results(
    db: tauri::State<'_, DbState>,
    task_id: String,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "DELETE FROM task_results WHERE task_id = ?1",
        params![task_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// 获取任务步骤（按 step_index 升序）
#[tauri::command]
pub fn get_task_steps(
    db: tauri::State<'_, DbState>,
    task_id: String,
) -> Result<Vec<TaskStepRecord>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, task_id, agent_id, step_index, title, content, status, started_at, completed_at
             FROM task_steps
             WHERE task_id = ?1
             ORDER BY step_index ASC, id ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![task_id], |row| {
            Ok(TaskStepRecord {
                id: row.get(0)?,
                task_id: row.get(1)?,
                agent_id: row.get(2)?,
                step_index: row.get(3)?,
                title: row.get(4)?,
                content: row.get(5)?,
                status: row.get(6)?,
                started_at: row.get(7)?,
                completed_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

/// 保存单条任务步骤，返回步骤 id
#[tauri::command]
pub fn save_task_step(
    db: tauri::State<'_, DbState>,
    step: TaskStepRecord,
) -> Result<i64, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO task_steps
         (id, task_id, agent_id, step_index, title, content, status, started_at, completed_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(id) DO UPDATE SET
           task_id = excluded.task_id,
           agent_id = excluded.agent_id,
           step_index = excluded.step_index,
           title = excluded.title,
           content = excluded.content,
           status = excluded.status,
           started_at = excluded.started_at,
           completed_at = excluded.completed_at",
        params![
            step.id,
            step.task_id,
            step.agent_id,
            step.step_index,
            step.title,
            step.content,
            step.status,
            step.started_at,
            step.completed_at,
        ],
    )
    .map_err(|e| e.to_string())?;

    if let Some(id) = step.id {
        return Ok(id);
    }

    Ok(conn.last_insert_rowid())
}

/// 清空指定任务的步骤（用于全量重写）
#[tauri::command]
pub fn delete_task_steps(
    db: tauri::State<'_, DbState>,
    task_id: String,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "DELETE FROM task_steps WHERE task_id = ?1",
        params![task_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_v0_schema(conn: &Connection) -> Result<(), rusqlite::Error> {
        conn.execute(
            "CREATE TABLE tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                mode TEXT NOT NULL DEFAULT 'parallel',
                assignees TEXT NOT NULL,
                progress INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                started_at TIMESTAMP,
                completed_at TIMESTAMP
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE task_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT NOT NULL,
                agent_id TEXT NOT NULL,
                content TEXT,
                success BOOLEAN DEFAULT FALSE,
                error TEXT,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                FOREIGN KEY (task_id) REFERENCES tasks(id)
            )",
            [],
        )?;

        Ok(())
    }

    fn create_schema_with_result_id(conn: &Connection) -> Result<(), rusqlite::Error> {
        conn.execute(
            "CREATE TABLE tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                mode TEXT NOT NULL DEFAULT 'parallel',
                assignees TEXT NOT NULL,
                progress INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                started_at TIMESTAMP,
                completed_at TIMESTAMP
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE task_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                result_id TEXT,
                task_id TEXT NOT NULL,
                agent_id TEXT NOT NULL,
                content TEXT,
                success BOOLEAN DEFAULT FALSE,
                error TEXT,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                FOREIGN KEY (task_id) REFERENCES tasks(id)
            )",
            [],
        )?;

        Ok(())
    }

    fn object_exists(conn: &Connection, object_type: &str, name: &str) -> Result<bool, rusqlite::Error> {
        let exists: i64 = conn.query_row(
            "SELECT EXISTS(
                SELECT 1
                FROM sqlite_master
                WHERE type = ?1 AND name = ?2
            )",
            params![object_type, name],
            |row| row.get(0),
        )?;
        Ok(exists == 1)
    }

    #[test]
    fn test_fresh_migration() {
        let conn = Connection::open_in_memory().expect("open in-memory db");
        create_v0_schema(&conn).expect("create v0 schema");

        run_migrations(&conn).expect("run migrations");

        let version = get_schema_version(&conn).expect("read user_version");
        assert_eq!(version, 5);

        let has_result_id = has_column(&conn, "task_results", "result_id").expect("check result_id column");
        assert!(has_result_id);

        let collaboration_stats_exists =
            object_exists(&conn, "table", "collaboration_stats").expect("check collaboration_stats table");
        assert!(collaboration_stats_exists);

        let tasks_created_at_index_exists =
            object_exists(&conn, "index", "idx_tasks_created_at").expect("check idx_tasks_created_at index");
        assert!(tasks_created_at_index_exists);

        let task_steps_exists =
            object_exists(&conn, "table", "task_steps").expect("check task_steps table");
        assert!(task_steps_exists);

        let collaboration_combo_mode_index_exists = object_exists(
            &conn,
            "index",
            "idx_collaboration_stats_combo_mode",
        )
        .expect("check idx_collaboration_stats_combo_mode index");
        assert!(collaboration_combo_mode_index_exists);
    }

    #[test]
    fn test_migration_idempotent() {
        let conn = Connection::open_in_memory().expect("open in-memory db");
        create_v0_schema(&conn).expect("create v0 schema");

        run_migrations(&conn).expect("first run_migrations");
        run_migrations(&conn).expect("second run_migrations should be idempotent");

        let version = get_schema_version(&conn).expect("read user_version");
        assert_eq!(version, 5);
    }

    #[test]
    fn test_migration_v1_dedup() {
        let conn = Connection::open_in_memory().expect("open in-memory db");
        create_schema_with_result_id(&conn).expect("create schema with result_id");

        conn.execute(
            "INSERT INTO tasks
             (id, title, description, status, mode, assignees, progress, created_at, started_at, completed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                "task-1",
                "Dedup Task",
                "for dedup test",
                "pending",
                "parallel",
                "agent-a",
                0,
                "2026-01-01T00:00:00Z",
                Option::<String>::None,
                Option::<String>::None
            ],
        )
        .expect("insert task for foreign key");

        conn.execute(
            "INSERT INTO task_results
             (result_id, task_id, agent_id, content, success, error, started_at, completed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                "dup-result-id",
                "task-1",
                "agent-a",
                "first",
                true,
                Option::<String>::None,
                Some("2026-01-01T00:00:00Z"),
                Some("2026-01-01T00:01:00Z")
            ],
        )
        .expect("insert duplicate row #1");

        conn.execute(
            "INSERT INTO task_results
             (result_id, task_id, agent_id, content, success, error, started_at, completed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                "dup-result-id",
                "task-1",
                "agent-a",
                "second",
                false,
                Some("error"),
                Some("2026-01-01T00:00:00Z"),
                Some("2026-01-01T00:01:00Z")
            ],
        )
        .expect("insert duplicate row #2");

        run_migrations(&conn).expect("run migrations");

        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM task_results WHERE result_id = ?1",
                params!["dup-result-id"],
                |row| row.get(0),
            )
            .expect("count dedup rows");
        assert_eq!(count, 1);
    }

    #[test]
    fn test_migration_preserves_data() {
        let conn = Connection::open_in_memory().expect("open in-memory db");
        create_v0_schema(&conn).expect("create v0 schema");

        conn.execute(
            "INSERT INTO tasks
             (id, title, description, status, mode, assignees, progress, created_at, started_at, completed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                "task-1",
                "Title 1",
                "Desc 1",
                "running",
                "parallel",
                "agent-a,agent-b",
                42,
                "2026-01-01T00:00:00Z",
                Some("2026-01-01T00:00:10Z"),
                Option::<String>::None
            ],
        )
        .expect("insert task");

        conn.execute(
            "INSERT INTO task_results
             (task_id, agent_id, content, success, error, started_at, completed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                "task-1",
                "agent-a",
                "Result content",
                true,
                Option::<String>::None,
                Some("2026-01-01T00:00:10Z"),
                Some("2026-01-01T00:01:00Z")
            ],
        )
        .expect("insert task_result");

        run_migrations(&conn).expect("run migrations");

        let task = conn
            .query_row(
                "SELECT id, title, description, status, mode, assignees, progress, created_at, started_at, completed_at
                 FROM tasks WHERE id = ?1",
                params!["task-1"],
                |row| {
                    Ok(TaskRecord {
                        id: row.get(0)?,
                        title: row.get(1)?,
                        description: row.get(2)?,
                        status: row.get(3)?,
                        mode: row.get(4)?,
                        assignees: row.get(5)?,
                        progress: row.get(6)?,
                        created_at: row.get(7)?,
                        started_at: row.get(8)?,
                        completed_at: row.get(9)?,
                    })
                },
            )
            .expect("read task");

        assert_eq!(task.id, "task-1");
        assert_eq!(task.title, "Title 1");
        assert_eq!(task.description, "Desc 1");
        assert_eq!(task.status, "running");
        assert_eq!(task.mode, "parallel");
        assert_eq!(task.assignees, "agent-a,agent-b");
        assert_eq!(task.progress, 42);
        assert_eq!(task.created_at, "2026-01-01T00:00:00Z");
        assert_eq!(task.started_at.as_deref(), Some("2026-01-01T00:00:10Z"));
        assert_eq!(task.completed_at, None);

        let result = conn
            .query_row(
                "SELECT result_id, task_id, agent_id, content, success, error, started_at, completed_at
                 FROM task_results WHERE task_id = ?1",
                params!["task-1"],
                |row| {
                    Ok(TaskResultRecord {
                        result_id: row.get(0)?,
                        task_id: row.get(1)?,
                        agent_id: row.get(2)?,
                        content: row.get(3)?,
                        success: row.get(4)?,
                        error: row.get(5)?,
                        started_at: row.get(6)?,
                        completed_at: row.get(7)?,
                    })
                },
            )
            .expect("read task_result");

        assert_eq!(
            result.result_id.as_deref(),
            Some("task-1|agent-a|2026-01-01T00:00:10Z|2026-01-01T00:01:00Z")
        );
        assert_eq!(result.task_id, "task-1");
        assert_eq!(result.agent_id, "agent-a");
        assert_eq!(result.content, "Result content");
        assert!(result.success);
        assert_eq!(result.error, None);
        assert_eq!(result.started_at.as_deref(), Some("2026-01-01T00:00:10Z"));
        assert_eq!(result.completed_at.as_deref(), Some("2026-01-01T00:01:00Z"));
    }

    #[test]
    fn test_build_result_id() {
        let all_some = build_result_id("task-a", "agent-x", Some("start"), Some("end"));
        assert_eq!(all_some, "task-a|agent-x|start|end");

        let no_started_at = build_result_id("task-a", "agent-x", None, Some("end"));
        assert_eq!(no_started_at, "task-a|agent-x||end");

        let no_completed_at = build_result_id("task-a", "agent-x", Some("start"), None);
        assert_eq!(no_completed_at, "task-a|agent-x|start|");

        let none_both = build_result_id("task-a", "agent-x", None, None);
        assert_eq!(none_both, "task-a|agent-x||");
    }
}
