use tauri::State;
use tauri::Manager;
use crate::AppState;
use crate::db::queries;
use std::path::Path;
use std::io::Write;

#[tauri::command]
pub async fn create_backup(
    output_path: String,
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let storage_path_str = queries::get_setting(&conn, "storage_path")
        .map_err(|e| e.to_string())?
        .ok_or("Storage path not configured")?;

    let out = Path::new(&output_path);
    if let Some(parent) = out.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // Checkpoint WAL so the main .db file is fully up to date
    conn.execute_batch("PRAGMA wal_checkpoint(FULL)").ok();

    // VACUUM INTO creates a clean, compact copy of the database at a temp path.
    // This is the correct way to snapshot a live SQLite connection.
    let tmp_db = std::env::temp_dir().join(format!("docvault_bak_{}.db", uuid::Uuid::new_v4()));
    let vacuum_sql = format!(
        "VACUUM INTO '{}'",
        tmp_db.to_string_lossy().replace('\'', "''")
    );
    conn.execute_batch(&vacuum_sql).map_err(|e| e.to_string())?;

    let file = std::fs::File::create(out).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);

    let options = zip::write::FileOptions::<zip::write::ExtendedFileOptions>::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o644);

    // Add the database snapshot
    let db_bytes = std::fs::read(&tmp_db).map_err(|e| e.to_string())?;
    std::fs::remove_file(&tmp_db).ok();
    zip.start_file("docvault.db", options.clone()).map_err(|e| e.to_string())?;
    zip.write_all(&db_bytes).map_err(|e| e.to_string())?;

    // Add all files from the storage directory
    let storage_path = Path::new(&storage_path_str);
    for entry in walkdir::WalkDir::new(storage_path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        let path = entry.path();
        let relative = path.strip_prefix(storage_path).map_err(|e| e.to_string())?;
        let zip_path = format!("files/{}", relative.to_string_lossy().replace('\\', "/"));

        zip.start_file(&zip_path, options.clone()).map_err(|e| e.to_string())?;
        let contents = std::fs::read(path).map_err(|e| e.to_string())?;
        zip.write_all(&contents).map_err(|e| e.to_string())?;
    }

    // Record backup path for the about/settings page (best-effort)
    let _ = app; // AppHandle available for future use

    zip.finish().map_err(|e| e.to_string())?;
    Ok(output_path)
}

#[tauri::command]
pub async fn restore_backup(
    zip_path: String,
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let storage_path_str = queries::get_setting(&conn, "storage_path")
        .map_err(|e| e.to_string())?
        .ok_or("Storage path not configured")?;

    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let storage_path = Path::new(&storage_path_str);

    let file = std::fs::File::open(&zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut zip_file = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = zip_file.name().to_string();

        if name == "docvault.db" {
            // Write to a .restore file; schema.rs will rename it on next startup
            let restore_path = app_data_dir.join("docvault.db.restore");
            let mut outfile = std::fs::File::create(&restore_path).map_err(|e| e.to_string())?;
            std::io::copy(&mut zip_file, &mut outfile).map_err(|e| e.to_string())?;
        } else if let Some(rel) = name.strip_prefix("files/") {
            // Files are stored under files/ prefix in the ZIP
            let outpath = storage_path.join(rel);
            if name.ends_with('/') {
                std::fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
            } else {
                if let Some(parent) = outpath.parent() {
                    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                }
                let mut outfile = std::fs::File::create(&outpath).map_err(|e| e.to_string())?;
                std::io::copy(&mut zip_file, &mut outfile).map_err(|e| e.to_string())?;
            }
        } else if !name.ends_with('/') {
            // Legacy backup format: files directly at root (no files/ prefix)
            let outpath = storage_path.join(&name);
            if let Some(parent) = outpath.parent() {
                std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut outfile = std::fs::File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut zip_file, &mut outfile).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

