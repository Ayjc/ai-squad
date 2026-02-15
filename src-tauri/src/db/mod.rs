// 数据库模块

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use std::sync::Mutex;
use rusqlite::{Connection, params};

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

/// 初始化数据库
pub fn init_database(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let app_dir = app.path().app_data_dir()?;
    std::fs::create_dir_all(&app_dir)?;

    let db_path = app_dir.join("data.db");
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
    }

    Ok(())
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
