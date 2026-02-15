// Task 调度模块

use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskInput {
    pub title: String,
    pub description: String,
    pub mode: String,
    pub assignees: Vec<String>,
}

/// 向指定 provider 发送任务
pub fn send_task(provider: &str, task: &TaskInput) -> Result<String, String> {
    let message = if task.description.is_empty() {
        task.title.clone()
    } else {
        format!("{}\n\n{}", task.title, task.description)
    };

    let output = Command::new("ask")
        .arg(provider)
        .arg(&message)
        .output()
        .map_err(|e| format!("Failed to execute ask: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

/// 取消正在执行的任务
pub fn cancel_task(_task_id: &str) -> Result<(), String> {
    // v1 暂无真实取消能力，先提供可扩展接口。
    Ok(())
}
