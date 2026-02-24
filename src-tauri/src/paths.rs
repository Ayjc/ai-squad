use std::path::PathBuf;

/// Workspace root for AI Squad local state.
///
/// We intentionally store user data under `~/.ai-squad` (developer-friendly, easy to back up),
/// rather than platform-specific app data dirs.
pub fn aisquad_home_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or_else(|| "Unable to resolve home directory".to_string())?;
    Ok(home.join(".ai-squad"))
}

pub fn data_dir() -> Result<PathBuf, String> {
    Ok(aisquad_home_dir()?.join("data"))
}

pub fn cache_dir() -> Result<PathBuf, String> {
    Ok(aisquad_home_dir()?.join("cache"))
}

pub fn logs_dir() -> Result<PathBuf, String> {
    Ok(aisquad_home_dir()?.join("logs"))
}

pub fn config_path() -> Result<PathBuf, String> {
    Ok(aisquad_home_dir()?.join("config.json"))
}

pub fn keys_path() -> Result<PathBuf, String> {
    Ok(aisquad_home_dir()?.join("keys.json.enc"))
}

pub fn db_path() -> Result<PathBuf, String> {
    Ok(data_dir()?.join("ai-squad.db"))
}
