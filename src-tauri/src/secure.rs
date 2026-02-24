use base64::{engine::general_purpose, Engine as _};
use rand::rngs::OsRng;
use rand::RngCore;
use serde::{Deserialize, Serialize};

use chacha20poly1305::aead::{Aead, KeyInit};
use chacha20poly1305::{XChaCha20Poly1305, XNonce};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedBlob {
    /// base64(nonce)
    pub nonce_b64: String,
    /// base64(ciphertext)
    pub ct_b64: String,
}

pub fn generate_key_32() -> [u8; 32] {
    let mut key = [0u8; 32];
    OsRng.fill_bytes(&mut key);
    key
}

pub fn encrypt(key32: &[u8; 32], plaintext: &[u8]) -> Result<EncryptedBlob, String> {
    let cipher = XChaCha20Poly1305::new(key32.into());

    let mut nonce = [0u8; 24];
    OsRng.fill_bytes(&mut nonce);
    let xnonce = XNonce::from_slice(&nonce);

    let ciphertext = cipher
        .encrypt(xnonce, plaintext)
        .map_err(|e| format!("Encrypt failed: {e}"))?;

    Ok(EncryptedBlob {
        nonce_b64: general_purpose::STANDARD.encode(nonce),
        ct_b64: general_purpose::STANDARD.encode(ciphertext),
    })
}

pub fn decrypt(key32: &[u8; 32], blob: &EncryptedBlob) -> Result<Vec<u8>, String> {
    let cipher = XChaCha20Poly1305::new(key32.into());

    let nonce = general_purpose::STANDARD
        .decode(&blob.nonce_b64)
        .map_err(|e| format!("Invalid nonce base64: {e}"))?;
    if nonce.len() != 24 {
        return Err("Invalid nonce length".to_string());
    }
    let xnonce = XNonce::from_slice(&nonce);

    let ct = general_purpose::STANDARD
        .decode(&blob.ct_b64)
        .map_err(|e| format!("Invalid ciphertext base64: {e}"))?;

    cipher
        .decrypt(xnonce, ct.as_ref())
        .map_err(|e| format!("Decrypt failed: {e}"))
}
