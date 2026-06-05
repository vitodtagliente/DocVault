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

    let lang_str = if languages.is_empty() {
        "ita+eng".to_string()
    } else {
        languages.join("+")
    };

    // Write to temp file for stdout output
    let tmp_output = std::env::temp_dir().join(format!("docvault_ocr_{}", document_id));
    let output = std::process::Command::new("tesseract")
        .arg(full_path.to_string_lossy().as_ref())
        .arg(tmp_output.to_string_lossy().as_ref())
        .arg("-l")
        .arg(&lang_str)
        .output()
        .map_err(|e| format!("Tesseract not found or failed: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("OCR failed: {}", stderr));
    }

    // Tesseract writes to {output}.txt
    let txt_path = tmp_output.with_extension("txt");
    let ocr_text = std::fs::read_to_string(&txt_path)
        .map_err(|e| e.to_string())?;
    std::fs::remove_file(&txt_path).ok();

    // Save OCR text to database
    conn.execute(
        "UPDATE documents SET ocr_text = ?2, updated_at = datetime('now') WHERE id = ?1",
        rusqlite::params![document_id, ocr_text],
    ).map_err(|e| e.to_string())?;

    Ok(ocr_text)
}
