use tauri::State;
use serde::Serialize;
use crate::AppState;
use crate::db::queries;

#[derive(Debug, Serialize)]
pub struct SyncReport {
    pub events_downloaded: i32,
    pub events_uploaded: i32,
    pub files_downloaded: i32,
    pub files_uploaded: i32,
    pub conflicts_resolved: i32,
    pub errors: Vec<String>,
    pub duration_ms: i64,
}

#[derive(Debug, Serialize)]
pub struct GoogleAuthStatus {
    pub is_authenticated: bool,
    pub email: Option<String>,
    pub last_sync: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct GoogleTokens {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: i64,
}

/// Sync with Google Drive (Pro feature).
#[tauri::command]
pub async fn sync_now(state: State<'_, AppState>) -> Result<SyncReport, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let license = queries::get_setting(&conn, "license_status")
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "free".into());
    if license != "pro" {
        return Err("PRO_REQUIRED".to_string());
    }
    // TODO: Implement full sync in Phase 8
    Err("Sync not yet implemented".to_string())
}

#[tauri::command]
pub async fn google_auth_start(_state: State<'_, AppState>) -> Result<(), String> {
    // TODO: Implement OAuth2 PKCE flow in Phase 8
    Err("PRO_REQUIRED".to_string())
}

#[tauri::command]
pub async fn google_auth_callback(
    _code: String,
    _state: State<'_, AppState>,
) -> Result<GoogleTokens, String> {
    Err("PRO_REQUIRED".to_string())
}

#[tauri::command]
pub async fn google_auth_status(state: State<'_, AppState>) -> Result<GoogleAuthStatus, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let last_sync = queries::get_setting(&conn, "last_sync_at").map_err(|e| e.to_string())?;
    Ok(GoogleAuthStatus {
        is_authenticated: false,
        email: None,
        last_sync,
    })
}

#[tauri::command]
pub async fn google_auth_logout(state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "google_access_token", "")
        .map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "google_refresh_token", "")
        .map_err(|e| e.to_string())?;
    Ok(())
}
