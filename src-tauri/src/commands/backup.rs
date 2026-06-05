use tauri::State;
use crate::AppState;
use crate::db::queries;
use std::path::Path;
use std::io::Write;

#[tauri::command]
pub async fn create_backup(
    output_path: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let storage_path_str = queries::get_setting(&conn, "storage_path")
        .map_err(|e| e.to_string())?
        .ok_or("Storage path not configured")?;

    let out = Path::new(&output_path);
    if let Some(parent) = out.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let file = std::fs::File::create(out).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);

    let options = zip::write::FileOptions::<zip::write::ExtendedFileOptions>::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o644);

    let storage_path = Path::new(&storage_path_str);

    // Walk the storage directory and add all files
    for entry in walkdir::WalkDir::new(storage_path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        let path = entry.path();
        let relative = path.strip_prefix(storage_path).map_err(|e| e.to_string())?;
        let zip_path = relative.to_string_lossy().replace('\\', "/");

        zip.start_file(&zip_path, options.clone()).map_err(|e| e.to_string())?;
        let contents = std::fs::read(path).map_err(|e| e.to_string())?;
        zip.write_all(&contents).map_err(|e| e.to_string())?;
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(output_path)
}

#[tauri::command]
pub async fn restore_backup(
    zip_path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let storage_path_str = queries::get_setting(&conn, "storage_path")
        .map_err(|e| e.to_string())?
        .ok_or("Storage path not configured")?;

    let storage_path = Path::new(&storage_path_str);

    let file = std::fs::File::open(&zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut zip_file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = storage_path.join(zip_file.name());

        if zip_file.name().ends_with('/') {
            std::fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = outpath.parent() {
                std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut outfile = std::fs::File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut zip_file, &mut outfile).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}
