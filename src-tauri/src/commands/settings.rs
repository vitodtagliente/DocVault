use tauri::State;
use crate::AppState;
use crate::models::AppSettings;
use crate::db::queries;
use crate::utils::file_ops::ensure_directory;
use std::path::Path;

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::load_app_settings(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_setting(
    key: String,
    value: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let device_id = queries::get_setting(&conn, "device_id")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();
    queries::set_setting(&conn, &key, &value).map_err(|e| e.to_string())?;
    queries::write_event(&conn, &device_id, "settings.updated", "settings", &key,
        &serde_json::json!({"key": key, "value": value}))
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn validate_storage_path(path: String) -> Result<bool, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Ok(false);
    }
    // Check write permission by attempting to create a temp file
    let test_file = p.join(".docvault_write_test");
    match std::fs::write(&test_file, b"test") {
        Ok(_) => {
            std::fs::remove_file(&test_file).ok();
            Ok(true)
        }
        Err(_) => Ok(false),
    }
}

#[tauri::command]
pub async fn complete_setup(
    storage_path: String,
    state: State<'_, AppState>,
) -> Result<AppSettings, String> {
    let storage = Path::new(&storage_path);

    // Create .docvault hidden directory
    let docvault_dir = storage.join(".docvault");
    ensure_directory(&docvault_dir).map_err(|e| e.to_string())?;
    ensure_directory(&docvault_dir.join("thumbnails")).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Generate device_id if not set
    let device_id = match queries::get_setting(&conn, "device_id").map_err(|e| e.to_string())? {
        Some(id) if !id.is_empty() => id,
        _ => {
            let new_id = uuid::Uuid::new_v4().to_string();
            queries::set_setting(&conn, "device_id", &new_id).map_err(|e| e.to_string())?;
            new_id
        }
    };

    queries::set_setting(&conn, "storage_path", &storage_path).map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "setup_complete", "1").map_err(|e| e.to_string())?;

    // Ensure category directories exist
    let categories = queries::get_all_categories(&conn).map_err(|e| e.to_string())?;
    for cat in &categories {
        ensure_directory(&storage.join(&cat.slug)).map_err(|e| e.to_string())?;
    }

    queries::write_event(&conn, &device_id, "settings.updated", "settings", "setup",
        &serde_json::json!({"storage_path": storage_path, "setup_complete": true}))
        .map_err(|e| e.to_string())?;

    queries::load_app_settings(&conn).map_err(|e| e.to_string())
}
