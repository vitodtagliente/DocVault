use tauri::State;
use crate::AppState;
use crate::db::queries;
use std::path::Path;

#[tauri::command]
pub async fn reveal_in_file_manager(
    document_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let doc = queries::get_document_by_id(&conn, &document_id)
        .map_err(|e| e.to_string())?
        .ok_or("Document not found")?;
    let storage_path = queries::get_setting(&conn, "storage_path")
        .map_err(|e| e.to_string())?
        .ok_or("Storage path not configured")?;
    let full_path = Path::new(&storage_path).join(&doc.storage_path);
    let parent = full_path.parent().unwrap_or(&full_path);

    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer").arg(parent).spawn().ok();
    #[cfg(target_os = "macos")]
    std::process::Command::new("open").arg(parent).spawn().ok();
    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open").arg(parent).spawn().ok();

    Ok(())
}

#[tauri::command]
pub async fn open_with_system(
    document_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let doc = queries::get_document_by_id(&conn, &document_id)
        .map_err(|e| e.to_string())?
        .ok_or("Document not found")?;
    let storage_path = queries::get_setting(&conn, "storage_path")
        .map_err(|e| e.to_string())?
        .ok_or("Storage path not configured")?;
    let full_path = Path::new(&storage_path).join(&doc.storage_path);

    #[cfg(target_os = "windows")]
    std::process::Command::new("cmd").args(["/c", "start", "", &full_path.to_string_lossy()]).spawn().ok();
    #[cfg(target_os = "macos")]
    std::process::Command::new("open").arg(&full_path).spawn().ok();
    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open").arg(&full_path).spawn().ok();

    Ok(())
}

#[tauri::command]
pub async fn read_file_bytes(
    document_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<u8>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let doc = queries::get_document_by_id(&conn, &document_id)
        .map_err(|e| e.to_string())?
        .ok_or("Document not found")?;
    let storage_path = queries::get_setting(&conn, "storage_path")
        .map_err(|e| e.to_string())?
        .ok_or("Storage path not configured")?;
    let full_path = Path::new(&storage_path).join(&doc.storage_path);
    std::fs::read(&full_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn read_file_text(
    document_id: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let doc = queries::get_document_by_id(&conn, &document_id)
        .map_err(|e| e.to_string())?
        .ok_or("Document not found")?;
    let storage_path = queries::get_setting(&conn, "storage_path")
        .map_err(|e| e.to_string())?
        .ok_or("Storage path not configured")?;
    let full_path = Path::new(&storage_path).join(&doc.storage_path);
    std::fs::read_to_string(&full_path).map_err(|e| e.to_string())
}
