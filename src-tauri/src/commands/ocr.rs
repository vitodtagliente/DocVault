use tauri::State;
use crate::AppState;
use crate::db::queries;
use std::path::Path;

/// OCR is optional and requires Tesseract to be installed on the system.
/// Uses the `tesseract` CLI as a subprocess to avoid leptess compilation issues
/// across all platforms.
#[tauri::command]
pub async fn run_ocr(
    document_id: String,
    languages: Vec<String>,
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
    drop(conn); // release lock before the subprocess call

    let lang_str = if languages.is_empty() {
        "ita+eng".to_string()
    } else {
        languages.join("+")
    };

    let ocr_text = run_tesseract_sync(&full_path, &lang_str)
        .ok_or_else(|| "Tesseract not found or OCR failed".to_string())?;

    // Save OCR text to database
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE documents SET ocr_text = ?2, updated_at = datetime('now') WHERE id = ?1",
        rusqlite::params![document_id, ocr_text],
    ).map_err(|e| e.to_string())?;

    Ok(ocr_text)
}

/// Run Tesseract CLI on `file_path` with the given language string (e.g. "ita+eng").
/// Returns the extracted text, or `None` if Tesseract is not installed or fails.
pub fn run_tesseract_sync(file_path: &Path, langs: &str) -> Option<String> {
    let tmp = std::env::temp_dir()
        .join(format!("docvault_ocr_{}", uuid::Uuid::new_v4()));

    let output = std::process::Command::new("tesseract")
        .arg(file_path.to_string_lossy().as_ref())
        .arg(tmp.to_string_lossy().as_ref())
        .arg("-l")
        .arg(langs)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let txt_path = tmp.with_extension("txt");
    let text = std::fs::read_to_string(&txt_path).ok()?;
    std::fs::remove_file(&txt_path).ok();
    Some(text)
}

