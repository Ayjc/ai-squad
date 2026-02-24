use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskInput {
    pub title: String,
    pub description: String,
    pub mode: String,
    pub assignees: Vec<String>,
}

/// Send task to provider using CCB's ask command with work_dir
pub fn send_task(provider: &str, task: &TaskInput, work_dir: Option<&str>) -> Result<String, String> {
    let message = if task.description.is_empty() {
        task.title.clone()
    } else {
        format!("{}\n\n{}", task.title, task.description)
    };

    let ask_path = dirs::home_dir()
        .map(|h| h.join(".local/share/codex-dual/bin/ask"))
        .unwrap_or_default();

    let ask_cmd = if ask_path.exists() {
        ask_path.to_string_lossy().to_string()
    } else {
        "ask".to_string()
    };

    let mut cmd = Command::new(&ask_cmd);
    cmd.arg(provider).arg(&message);

    if let Some(wd) = work_dir {
        cmd.current_dir(wd);
    }

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute ask: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub fn cancel_task(_task_id: &str) -> Result<(), String> {
    Ok(())
}
