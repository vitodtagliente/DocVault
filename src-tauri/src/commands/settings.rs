use tauri::State;
use crate::AppState;
use crate::models::AppSettings;
use crate::db::queries;
use crate::utils::file_ops::ensure_directory;
use std::path::Path;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

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

/// Returns true if the given path already contains a .docvault directory,
/// meaning it was previously initialized as a DocVault storage folder.
#[tauri::command]
pub async fn check_vault_path(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).join(".docvault").exists())
}

/// Returns true if the given folder path exists on the filesystem.
#[tauri::command]
pub async fn folder_exists(path: String) -> bool {
    let p = Path::new(&path);
    p.exists() && p.is_dir()
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

/// Parse a human-readable shortcut string like "Shift+Alt+D" into a Shortcut.
/// Exported so lib.rs can use it on startup.
pub fn parse_shortcut_str(s: &str) -> Result<Shortcut, String> {
    let mut mods = Modifiers::empty();
    let mut key_code: Option<Code> = None;

    for part in s.split('+').map(|p| p.trim()) {
        match part {
            "Shift"                               => mods |= Modifiers::SHIFT,
            "Alt"                                 => mods |= Modifiers::ALT,
            "Ctrl" | "Control"                    => mods |= Modifiers::CONTROL,
            "Meta" | "Super" | "Win" | "Cmd"      => mods |= Modifiers::SUPER,
            key => {
                key_code = Some(match key {
                    "A" => Code::KeyA, "B" => Code::KeyB, "C" => Code::KeyC,
                    "D" => Code::KeyD, "E" => Code::KeyE, "F" => Code::KeyF,
                    "G" => Code::KeyG, "H" => Code::KeyH, "I" => Code::KeyI,
                    "J" => Code::KeyJ, "K" => Code::KeyK, "L" => Code::KeyL,
                    "M" => Code::KeyM, "N" => Code::KeyN, "O" => Code::KeyO,
                    "P" => Code::KeyP, "Q" => Code::KeyQ, "R" => Code::KeyR,
                    "S" => Code::KeyS, "T" => Code::KeyT, "U" => Code::KeyU,
                    "V" => Code::KeyV, "W" => Code::KeyW, "X" => Code::KeyX,
                    "Y" => Code::KeyY, "Z" => Code::KeyZ,
                    "0" => Code::Digit0, "1" => Code::Digit1, "2" => Code::Digit2,
                    "3" => Code::Digit3, "4" => Code::Digit4, "5" => Code::Digit5,
                    "6" => Code::Digit6, "7" => Code::Digit7, "8" => Code::Digit8,
                    "9" => Code::Digit9,
                    "F1"  => Code::F1,  "F2"  => Code::F2,  "F3"  => Code::F3,
                    "F4"  => Code::F4,  "F5"  => Code::F5,  "F6"  => Code::F6,
                    "F7"  => Code::F7,  "F8"  => Code::F8,  "F9"  => Code::F9,
                    "F10" => Code::F10, "F11" => Code::F11, "F12" => Code::F12,
                    "Space" => Code::Space,
                    _ => return Err(format!("Unknown key: '{}'", key)),
                });
            }
        }
    }

    let code = key_code.ok_or_else(|| "No key specified".to_string())?;
    Ok(Shortcut::new(
        if mods.is_empty() { None } else { Some(mods) },
        code,
    ))
}

/// Update the global shortcut. Pass an empty string to disable.
#[tauri::command]
pub async fn update_global_shortcut(
    shortcut_str: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        queries::set_setting(&conn, "global_shortcut", &shortcut_str)
            .map_err(|e| e.to_string())?;
    }
    let _ = app.global_shortcut().unregister_all();
    if !shortcut_str.is_empty() {
        let shortcut = parse_shortcut_str(&shortcut_str)?;
        app.global_shortcut()
            .register(shortcut)
            .map_err(|e| format!("Failed to register shortcut: {}", e))?;
    }
    Ok(())
}
