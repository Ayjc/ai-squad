use crate::keys;

#[tauri::command]
pub async fn set_api_key(provider_id: String, api_key: String) -> Result<(), String> {
    keys::set_provider_key(&provider_id, &api_key)
}

#[tauri::command]
pub async fn has_api_key(provider_id: String) -> Result<bool, String> {
    keys::has_provider_key(&provider_id)
}

#[tauri::command]
pub async fn reveal_api_key(provider_id: String) -> Result<Option<String>, String> {
    keys::reveal_provider_key(&provider_id)
}
