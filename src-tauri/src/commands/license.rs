use tauri::State;
use serde::Serialize;
use crate::AppState;
use crate::db::queries;

#[derive(Debug, Serialize)]
pub struct LicenseStatus {
    pub is_pro: bool,
    pub email: Option<String>,
    pub activated_at: Option<String>,
}

/// Verifies a license key offline using HMAC-SHA256 checksum.
/// Format: XXXXX-XXXXX-XXXXX-XXXXX-CHECK
#[tauri::command]
pub async fn verify_license(
    license_key: String,
    state: State<'_, AppState>,
) -> Result<LicenseStatus, String> {
    let key = license_key.trim().to_uppercase();
    let parts: Vec<&str> = key.split('-').collect();

    if parts.len() != 5 || parts.iter().any(|p| p.len() != 5) {
        return Err("INVALID_FORMAT".to_string());
    }

    // Verify checksum: HMAC-SHA256 of first 4 groups, take first 5 base36 chars
    let data = parts[..4].join("-");
    let expected_check = compute_license_check(&data);

    if parts[4] != expected_check {
        return Err("INVALID_LICENSE".to_string());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = crate::utils::date::now_iso();

    queries::set_setting(&conn, "license_status", "pro").map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "license_key", &key).map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "license_activated_at", &now).map_err(|e| e.to_string())?;

    Ok(LicenseStatus {
        is_pro: true,
        email: None,
        activated_at: Some(now),
    })
}

#[tauri::command]
pub async fn get_license_status(state: State<'_, AppState>) -> Result<LicenseStatus, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let status = queries::get_setting(&conn, "license_status")
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "free".into());
    let activated_at = queries::get_setting(&conn, "license_activated_at")
        .map_err(|e| e.to_string())?;
    Ok(LicenseStatus {
        is_pro: status == "pro",
        email: None,
        activated_at,
    })
}

/// Computes a 5-char base36 checksum for license key validation.
fn compute_license_check(data: &str) -> String {
    use sha2::{Sha256, Digest};
    const SECRET: &[u8] = b"docvault-license-secret-v1";
    let mut hasher = Sha256::new();
    hasher.update(SECRET);
    hasher.update(data.as_bytes());
    let hash = hasher.finalize();
    // Take first 4 bytes, convert to base36
    let n = u32::from_be_bytes([hash[0], hash[1], hash[2], hash[3]]);
    to_base36(n, 5)
}

fn to_base36(mut n: u32, len: usize) -> String {
    const CHARS: &[u8] = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let mut result = vec![b'0'; len];
    for i in (0..len).rev() {
        result[i] = CHARS[(n % 36) as usize];
        n /= 36;
    }
    String::from_utf8(result).unwrap_or_default()
}
