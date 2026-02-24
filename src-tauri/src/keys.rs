use crate::paths;
use crate::secure::{self, EncryptedBlob};
use base64::Engine as _;
use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;

const KEYRING_SERVICE: &str = "ai-squad";
const KEYRING_USER: &str = "default";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct KeysFile {
    /// provider_id -> encrypted api key
    pub providers: BTreeMap<String, EncryptedBlob>,
}

fn keyring_entry() -> Entry {
    Entry::new(KEYRING_SERVICE, KEYRING_USER).expect("keyring entry")
}

pub fn load_or_create_master_key() -> Result<[u8; 32], String> {
    let entry = keyring_entry();
    match entry.get_password() {
        Ok(b64) => {
            let raw = base64::engine::general_purpose::STANDARD
                .decode(b64)
                .map_err(|e| format!("Invalid master key base64 in keyring: {e}"))?;
            if raw.len() != 32 {
                return Err("Invalid master key length".to_string());
            }
            let mut out = [0u8; 32];
            out.copy_from_slice(&raw);
            Ok(out)
        }
        Err(_) => {
            let key = secure::generate_key_32();
            let b64 = base64::engine::general_purpose::STANDARD.encode(key);
            entry
                .set_password(&b64)
                .map_err(|e| format!("Failed to store master key in keyring: {e}"))?;
            Ok(key)
        }
    }
}

fn load_keys_file() -> Result<KeysFile, String> {
    let path = paths::keys_path()?;
    if !path.exists() {
        return Ok(KeysFile::default());
    }

    let bytes = fs::read(&path).map_err(|e| format!("Failed to read keys file: {e}"))?;
    serde_json::from_slice::<KeysFile>(&bytes).map_err(|e| format!("Invalid keys.json.enc: {e}"))
}

fn save_keys_file(file: &KeysFile) -> Result<(), String> {
    let base = paths::aisquad_home_dir()?;
    fs::create_dir_all(&base).map_err(|e| format!("Failed to create ~/.ai-squad: {e}"))?;

    let path = paths::keys_path()?;
    let json = serde_json::to_vec_pretty(file).map_err(|e| format!("Failed to serialize keys file: {e}"))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write keys file: {e}"))?;
    Ok(())
}

pub fn set_provider_key(provider_id: &str, api_key: &str) -> Result<(), String> {
    let master = load_or_create_master_key()?;
    let mut file = load_keys_file()?;

    let blob = secure::encrypt(&master, api_key.as_bytes())?;
    file.providers.insert(provider_id.to_string(), blob);
    save_keys_file(&file)
}

pub fn has_provider_key(provider_id: &str) -> Result<bool, String> {
    let file = load_keys_file()?;
    Ok(file.providers.contains_key(provider_id))
}

/// Used for making API calls; does not require revealing keys to the UI.
pub fn get_provider_key_plain(provider_id: &str) -> Result<Option<String>, String> {
    let master = load_or_create_master_key()?;
    let file = load_keys_file()?;
    let Some(blob) = file.providers.get(provider_id) else {
        return Ok(None);
    };

    let pt = secure::decrypt(&master, blob)?;
    let s = String::from_utf8(pt).map_err(|e| format!("Invalid UTF-8 in decrypted key: {e}"))?;
    Ok(Some(s))
}

/// Reveals the API key to the UI. In V1 we keep this command but you should gate it behind
/// explicit user action + a confirmation UI.
pub fn reveal_provider_key(provider_id: &str) -> Result<Option<String>, String> {
    get_provider_key_plain(provider_id)
}
