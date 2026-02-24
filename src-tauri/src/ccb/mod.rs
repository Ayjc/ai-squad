pub mod provider;
pub mod task;

use serde::{Deserialize, Serialize};
use task::TaskInput;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderStatus {
    pub id: String,
    pub name: String,
    pub online: bool,
    pub current_task: Option<String>,
}

#[tauri::command]
pub async fn ping_provider(provider: String, work_dir: Option<String>) -> Result<bool, String> {
    Ok(provider::check_provider_status(&provider, work_dir.as_deref()))
}

#[tauri::command]
pub async fn ask_provider(provider: String, message: String, work_dir: Option<String>) -> Result<String, String> {
    let input = TaskInput {
        title: message,
        description: String::new(),
        mode: "parallel".to_string(),
        assignees: vec![provider.clone()],
    };

    task::send_task(&provider, &input, work_dir.as_deref())
}

#[tauri::command]
pub async fn get_providers(work_dir: Option<String>) -> Result<Vec<ProviderStatus>, String> {
    let providers = provider::get_supported_providers();

    let mut statuses = Vec::new();

    for provider in providers {
        let online = provider::check_provider_status(&provider.id, work_dir.as_deref());
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
