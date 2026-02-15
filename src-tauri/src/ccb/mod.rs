pub mod provider;
pub mod task;

use serde::{Deserialize, Serialize};
use task::TaskInput;

/// AI Provider 状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderStatus {
    pub id: String,
    pub name: String,
    pub online: bool,
    pub current_task: Option<String>,
}

/// 调用 CCB ping 命令检查 provider 状态
#[tauri::command]
pub async fn ping_provider(provider: String) -> Result<bool, String> {
    Ok(provider::check_provider_status(&provider))
}

/// 调用 CCB ask 命令发送任务
#[tauri::command]
pub async fn ask_provider(provider: String, message: String) -> Result<String, String> {
    let input = TaskInput {
        title: message,
        description: String::new(),
        mode: "parallel".to_string(),
        assignees: vec![provider.clone()],
    };

    task::send_task(&provider, &input)
}

/// 获取所有可用的 providers
#[tauri::command]
pub async fn get_providers() -> Result<Vec<ProviderStatus>, String> {
    let providers = provider::get_supported_providers();

    let mut statuses = Vec::new();

    for provider in providers {
        let online = provider::check_provider_status(&provider.id);
        statuses.push(ProviderStatus {
            id: provider.id,
            name: provider.name,
            online,
            current_task: None,
        });
    }

    Ok(statuses)
}

#[tauri::command]
pub async fn cancel_task(task_id: String) -> Result<(), String> {
    task::cancel_task(&task_id)
}
