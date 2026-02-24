use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub path: String,
    pub name: String,
    pub has_ccb: bool,
    pub mounted_providers: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CcbStatus {
    pub running: bool,
    pub mounted: Vec<String>,
}

/// Check if a directory has .ccb/ config
fn has_ccb_config(project_path: &str) -> bool {
    let ccb_dir = Path::new(project_path).join(".ccb");
    let legacy_dir = Path::new(project_path).join(".ccb_config");
    ccb_dir.is_dir() || legacy_dir.is_dir()
}

/// Get mounted providers using ccb-mounted command
fn get_mounted_providers(project_path: &str) -> Vec<String> {
    let output = Command::new("ccb-mounted")
        .arg(project_path)
        .arg("--json")
        .output();

    match output {
        Ok(o) if o.status.success() => {
            let stdout = String::from_utf8_lossy(&o.stdout);
            // ccb-mounted --json returns: {"cwd":"...","mounted":["codex","claude"]}
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&stdout) {
                if let Some(mounted) = parsed.get("mounted").and_then(|v| v.as_array()) {
                    return mounted
                        .iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect();
                }
            }
            Vec::new()
        }
        _ => Vec::new(),
    }
}

/// Tauri command: get project info for a given path
#[tauri::command]
pub async fn get_project_info(path: String) -> Result<ProjectInfo, String> {
    let p = Path::new(&path);
    if !p.is_dir() {
        return Err(format!("Directory not found: {}", path));
    }

    let name = p
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.clone());

    let has_ccb = has_ccb_config(&path);
    let mounted_providers = if has_ccb {
        get_mounted_providers(&path)
    } else {
        Vec::new()
    };

    Ok(ProjectInfo {
        path: path.clone(),
        name,
        has_ccb,
        mounted_providers,
    })
}

/// Tauri command: start CCB in the project directory
#[tauri::command]
pub async fn start_ccb(project_path: String, providers: Vec<String>) -> Result<CcbStatus, String> {
    let p = Path::new(&project_path);
    if !p.is_dir() {
        return Err(format!("Directory not found: {}", project_path));
    }

    // Build ccb command args
    let args: Vec<&str> = providers.iter().map(|s| s.as_str()).collect();

    let output = Command::new("ccb")
        .args(&args)
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Failed to start ccb: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ccb start failed: {}", stderr));
    }

    // Wait briefly then check mounted status
    std::thread::sleep(std::time::Duration::from_secs(2));

    let mounted = get_mounted_providers(&project_path);
    Ok(CcbStatus {
        running: !mounted.is_empty(),
        mounted,
    })
}

/// Tauri command: stop CCB (ccb kill)
#[tauri::command]
pub async fn stop_ccb(project_path: String) -> Result<(), String> {
    Command::new("ccb")
        .arg("kill")
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Failed to stop ccb: {}", e))?;
    Ok(())
}

/// Tauri command: check CCB status for a project
#[tauri::command]
pub async fn get_ccb_status(project_path: String) -> Result<CcbStatus, String> {
    let mounted = get_mounted_providers(&project_path);
    Ok(CcbStatus {
        running: !mounted.is_empty(),
        mounted,
    })
}
