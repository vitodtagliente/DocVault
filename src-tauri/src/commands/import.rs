use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::State;
use rusqlite::Connection;
use crate::AppState;
use crate::db::queries;
use crate::utils::{hash::sha256_file, file_ops::*};
use crate::utils::date::now_iso;


#[derive(Debug, Serialize)]
pub struct ImportCandidate {
    pub path: String,
    pub title: String,
    pub original_name: String,
    pub extension: String,
    pub file_size: i64,
    pub category_name: String,
    pub detected_year: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ImportItem {
    pub path: String,
    pub title: String,
    pub category_name: String,
    pub document_date: String,
}

#[derive(Debug, Serialize)]
pub struct ImportResult {
    pub imported: u32,
    pub skipped_duplicates: u32,
    pub failed: u32,
    pub errors: Vec<String>,
}

/// Scan a folder recursively (no depth limit) and return importable file candidates.
///
/// Category  = first non-year folder component relative to root (empty for root-level files).
/// Year      = first 4-digit (1900-2099) folder name, or the filename stem if it is a year.
/// Title     = intermediate non-year folder names (after the category) joined with " / ",
///             followed by the filename stem — giving full path context in one readable string.
#[tauri::command]
pub async fn scan_import_folder(root_path: String) -> Result<Vec<ImportCandidate>, String> {
    let root = Path::new(&root_path);
    if !root.exists() || !root.is_dir() {
        return Err(format!("Folder not found: {}", root_path));
    }
    let mut out = Vec::new();
    scan_recursive(root, root, &mut out);
    Ok(out)
}

fn is_year(s: &str) -> bool {
    if s.len() != 4 { return false; }
    s.parse::<u32>().map_or(false, |n| n >= 1900 && n <= 2099)
}

fn scan_recursive(base: &Path, current: &Path, out: &mut Vec<ImportCandidate>) {
    let Ok(entries) = std::fs::read_dir(current) else { return };
    for entry in entries.flatten() {
        let path = entry.path();
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };
        if name.starts_with('.') { continue; }

        if path.is_dir() {
            scan_recursive(base, &path, out);
        } else if path.is_file() {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();

            // Folder components between root and this file (no filename)
            let folder_components: Vec<String> = path
                .parent()
                .and_then(|p| p.strip_prefix(base).ok())
                .map(|rel| {
                    rel.components()
                        .filter_map(|c| c.as_os_str().to_str().map(String::from))
                        .filter(|s| !s.is_empty())
                        .collect()
                })
                .unwrap_or_default();

            let stem = path.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("document")
                .to_string();

            // Category = first non-year folder (skip years at the top level too)
            let mut category_name = String::new();
            let mut category_idx: Option<usize> = None;
            for (i, comp) in folder_components.iter().enumerate() {
                if !is_year(comp) {
                    category_name = comp.clone();
                    category_idx = Some(i);
                    break;
                }
            }

            // Year = first year-shaped folder component
            let mut detected_year: Option<String> = folder_components.iter()
                .find(|c| is_year(c))
                .cloned();
            // Fallback: if the filename stem itself is a year (e.g. "2020.pdf")
            if detected_year.is_none() && is_year(&stem) {
                detected_year = Some(stem.clone());
            }

            // Title = intermediate non-year folders (after category) + filename stem
            // Example: Cedolini/Pension Plan/stocks/2024/report.pdf
            //          → intermediate non-year after "Cedolini": ["Pension Plan", "stocks"]
            //          → title: "Pension Plan / stocks / report"
            let after_category = category_idx
                .map(|i| &folder_components[i + 1..])
                .unwrap_or(&[]);
            let mut title_parts: Vec<&str> = after_category.iter()
                .filter(|c| !is_year(c))
                .map(String::as_str)
                .collect();
            title_parts.push(&stem);
            let title = title_parts.join(" / ");

            let file_size = path.metadata().map(|m| m.len() as i64).unwrap_or(0);

            out.push(ImportCandidate {
                path: path.to_string_lossy().to_string(),
                title,
                original_name: name,
                extension: ext,
                file_size,
                category_name,
                detected_year,
            });
        }
    }
}

/// Import a confirmed batch of files into DocVault.
#[tauri::command]
pub async fn import_documents(
    items: Vec<ImportItem>,
    state: State<'_, AppState>,
) -> Result<ImportResult, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let storage_path_str = queries::get_setting(&conn, "storage_path")
        .map_err(|e| e.to_string())?
        .ok_or("Storage path not configured")?;
    let device_id = queries::get_setting(&conn, "device_id")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();
    let base_path = Path::new(&storage_path_str).to_path_buf();

    let mut imported = 0u32;
    let mut skipped = 0u32;
    let mut failed = 0u32;
    let mut errors: Vec<String> = Vec::new();

    // Current year as fallback when no date is detected
    let current_year = chrono::Utc::now().format("%Y").to_string();

    for item in &items {
        let source = Path::new(&item.path);
        if !source.exists() {
            failed += 1;
            errors.push(format!("File not found: {}", item.path));
            continue;
        }

        let file_hash = match sha256_file(source) {
            Ok(h) => h,
            Err(e) => { failed += 1; errors.push(format!("{}: {}", item.title, e)); continue; }
        };

        match queries::find_document_by_hash(&conn, &file_hash) {
            Ok(Some(_)) => { skipped += 1; continue; }
            Err(e) => { failed += 1; errors.push(format!("{}: {}", item.title, e)); continue; }
            Ok(None) => {}
        }

        let cat_name = if item.category_name.is_empty() { "Uncategorized" } else { &item.category_name };
        let category_id = match get_or_create_category(&conn, cat_name, &device_id) {
            Ok(id) => id,
            Err(e) => { failed += 1; errors.push(format!("{}: {}", item.title, e)); continue; }
        };

        let category = match queries::get_category_by_id(&conn, &category_id) {
            Ok(Some(c)) => c,
            _ => { failed += 1; errors.push(format!("Category not found for {}", item.title)); continue; }
        };

        // Ensure document_date is a valid YYYY-MM-DD (at least 10 chars starting with YYYY)
        let doc_date = if item.document_date.len() >= 10 {
            item.document_date.clone()
        } else {
            format!("{}-01-01", current_year)
        };

        let ext = source.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
        let original_name = source.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
        let file_size = source.metadata().map(|m| m.len() as i64).unwrap_or(0);
        let mime_type = mime_from_extension(&ext).to_string();

        let rel_path = generate_storage_path(
            &category.slug, &doc_date, &item.title, &ext, &base_path,
        );
        let dest = base_path.join(&rel_path);

        if let Err(e) = copy_and_verify(source, &dest, &file_hash) {
            failed += 1; errors.push(format!("{}: {}", item.title, e)); continue;
        }

        let id = uuid::Uuid::new_v4().to_string();
        let now = now_iso();

        if let Err(e) = conn.execute(
            "INSERT INTO documents (id, title, original_name, file_extension, file_size, file_hash,
                                    mime_type, storage_path, category_id, document_date, expiry_date,
                                    notes, is_favorite, created_at, updated_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,NULL,'',0,?11,?11)",
            rusqlite::params![
                id, item.title, original_name, format!(".{}", ext),
                file_size, file_hash, mime_type, rel_path,
                category_id, doc_date, now
            ],
        ) {
            std::fs::remove_file(&dest).ok();
            failed += 1; errors.push(format!("{}: {}", item.title, e)); continue;
        }

        // Year as tag (e.g. "2023") when derived from folder structure
        let year = &doc_date[..4];
        if year != current_year.as_str() {
            if let Ok(tag) = queries::get_or_create_tag(&conn, year, &device_id) {
                conn.execute(
                    "INSERT OR IGNORE INTO document_tags (document_id, tag_id) VALUES (?1,?2)",
                    rusqlite::params![id, tag.id],
                ).ok();
            }
        }

        queries::write_event(&conn, &device_id, "document.imported", "document", &id,
            &serde_json::json!({"title": item.title, "category": category.name})).ok();

        imported += 1;
    }

    Ok(ImportResult { imported, skipped_duplicates: skipped, failed, errors })
}

fn get_or_create_category(conn: &Connection, name: &str, device_id: &str) -> Result<String, String> {
    let result: rusqlite::Result<String> = conn.query_row(
        "SELECT id FROM categories WHERE lower(name)=lower(?1) AND deleted_at IS NULL LIMIT 1",
        rusqlite::params![name],
        |row| row.get(0),
    );
    if let Ok(id) = result { return Ok(id); }

    let id = uuid::Uuid::new_v4().to_string();
    let slug = sanitize_filename(name).replace('_', "-");
    let now = now_iso();
    let max_order: i32 = conn
        .query_row("SELECT COALESCE(MAX(sort_order),0) FROM categories", [], |r| r.get(0))
        .unwrap_or(0);

    conn.execute(
        "INSERT INTO categories (id,name,slug,icon,color,is_system,sort_order,created_at,updated_at)
         VALUES (?1,?2,?3,'folder','#6366f1',0,?4,?5,?5)",
        rusqlite::params![id, name, slug, max_order + 1, now],
    ).map_err(|e| e.to_string())?;

    queries::write_event(conn, device_id, "category.created", "category", &id,
        &serde_json::json!({"id": id, "name": name})).ok();

    Ok(id)
}
