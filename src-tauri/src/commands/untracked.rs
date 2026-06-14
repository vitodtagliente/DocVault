use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{Manager, State};
use crate::AppState;
use crate::db::queries;
use crate::utils::file_ops::mime_from_extension;
use crate::utils::hash::sha256_file;
use crate::commands::import::{SUPPORTED_EXT, ImportResult};

#[derive(Debug, Serialize, Clone)]
pub struct UntrackedFile {
    pub full_path: String,
    pub relative_path: String,
    pub filename: String,
    pub stem: String,
    pub extension: String,
    pub file_size: i64,
    pub suggested_category_id: Option<String>,
    pub suggested_category_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UntrackedImportItem {
    pub full_path: String,
    pub relative_path: String,
    pub title: String,
    pub category_id: String,
    pub document_date: String,
}

/// Return all files in the storage folder that have no matching record in the documents table.
/// Fast: compares relative paths only, no hashing.
#[tauri::command]
pub async fn check_untracked_files(state: State<'_, AppState>) -> Result<Vec<UntrackedFile>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let storage_path = queries::get_setting(&conn, "storage_path")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();

    if storage_path.is_empty() { return Ok(vec![]); }

    let base = Path::new(&storage_path);
    if !base.exists() { return Ok(vec![]); }

    // All relative paths currently tracked
    let mut stmt = conn.prepare("SELECT storage_path FROM documents WHERE deleted_at IS NULL")
        .map_err(|e| e.to_string())?;
    let db_paths: HashSet<String> = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .map(|p| p.replace('\\', "/"))
        .collect();

    let categories = queries::get_all_categories(&conn).map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    scan_untracked(base, base, &db_paths, &categories, &mut out);
    Ok(out)
}

fn scan_untracked(
    base: &Path,
    current: &Path,
    db_paths: &HashSet<String>,
    categories: &[crate::models::Category],
    out: &mut Vec<UntrackedFile>,
) {
    let Ok(entries) = std::fs::read_dir(current) else { return };
    for entry in entries.flatten() {
        let path = entry.path();
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };
        if name.starts_with('.') { continue; }

        if path.is_dir() {
            scan_untracked(base, &path, db_paths, categories, out);
        } else if path.is_file() {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
            if !SUPPORTED_EXT.contains(&ext.as_str()) { continue; }

            let rel = match path.strip_prefix(base) {
                Ok(r) => r.to_string_lossy().replace('\\', "/"),
                Err(_) => continue,
            };
            if db_paths.contains(&rel) { continue; }

            // Suggest category by matching first path component against category slugs
            let first = rel.split('/').next().unwrap_or("");
            let suggested = categories.iter()
                .find(|c| c.slug == first || c.name.to_lowercase() == first.to_lowercase())
                .map(|c| (c.id.clone(), c.name.clone()));

            let stem = path.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("document")
                .to_string();
            let file_size = path.metadata().map(|m| m.len() as i64).unwrap_or(0);

            out.push(UntrackedFile {
                full_path: path.to_string_lossy().to_string(),
                relative_path: rel,
                filename: name,
                stem,
                extension: ext,
                file_size,
                suggested_category_id: suggested.as_ref().map(|(id, _)| id.clone()),
                suggested_category_name: suggested.map(|(_, n)| n),
            });
        }
    }
}

/// Register untracked files in-place — file is already in the storage folder, no copy needed.
#[tauri::command]
pub async fn import_untracked_files(
    items: Vec<UntrackedImportItem>,
    state: State<'_, AppState>,
) -> Result<ImportResult, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let device_id = queries::get_setting(&conn, "device_id")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();
    let current_year = chrono::Utc::now().format("%Y").to_string();

    let mut imported = 0u32;
    let mut skipped = 0u32;
    let mut failed = 0u32;
    let mut errors: Vec<String> = Vec::new();

    for item in &items {
        let source = Path::new(&item.full_path);
        if !source.exists() {
            failed += 1;
            errors.push(format!("File not found: {}", item.full_path));
            continue;
        }

        let file_hash = match sha256_file(source) {
            Ok(h) => h,
            Err(e) => { failed += 1; errors.push(format!("{}: {}", item.title, e)); continue; }
        };

        // If same content already tracked under a different path, skip
        if let Ok(Some(_)) = queries::find_document_by_hash(&conn, &file_hash) {
            skipped += 1; continue;
        }

        let doc_date = if item.document_date.len() >= 10 {
            item.document_date.clone()
        } else {
            format!("{}-01-01", current_year)
        };

        let ext = source.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
        let original_name = source.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
        let file_size = source.metadata().map(|m| m.len() as i64).unwrap_or(0);
        let mime_type = mime_from_extension(&ext).to_string();

        let id = uuid::Uuid::new_v4().to_string();
        let now = crate::utils::date::now_iso();

        if let Err(e) = conn.execute(
            "INSERT INTO documents (id, title, original_name, file_extension, file_size, file_hash,
                                    mime_type, storage_path, category_id, document_date, expiry_date,
                                    notes, is_favorite, created_at, updated_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,NULL,'',0,?11,?11)",
            rusqlite::params![
                id, item.title, original_name, format!(".{}", ext),
                file_size, file_hash, mime_type, item.relative_path,
                item.category_id, doc_date, now
            ],
        ) {
            failed += 1;
            errors.push(format!("{}: {}", item.title, e));
            continue;
        }

        queries::write_event(&conn, &device_id, "document.registered", "document", &id,
            &serde_json::json!({"title": item.title, "path": item.relative_path})).ok();

        imported += 1;
    }

    Ok(ImportResult { imported, skipped_duplicates: skipped, failed, errors })
}

// ── File system watcher ───────────────────────────────────────────────────────

/// Long-running function (call from a dedicated thread).
/// Watches the storage path for new files and emits `storage-changed` to the
/// main window after a 5-second debounce.
pub fn run_storage_watcher(app: tauri::AppHandle) {
    loop {
        let storage_path = resolve_storage_path(&app);
        if storage_path.is_empty() || !Path::new(&storage_path).exists() {
            std::thread::sleep(Duration::from_secs(30));
            continue;
        }
        watch_path(&app, &storage_path); // blocks until path changes or watcher dies
        std::thread::sleep(Duration::from_secs(5));
    }
}

fn resolve_storage_path(app: &tauri::AppHandle) -> String {
    let st = app.state::<AppState>();
    let Ok(db) = st.db.lock() else { return String::new() };
    queries::get_setting(&db, "storage_path")
        .ok().flatten().unwrap_or_default()
}

fn watch_path(app: &tauri::AppHandle, storage_path: &str) {
    use notify::{recommended_watcher, Watcher, RecursiveMode, EventKind};

    let last_event: Arc<Mutex<Option<Instant>>> = Arc::new(Mutex::new(None));

    // Timer thread: fires `storage-changed` after 5 s of no new relevant events
    {
        let timer_app = app.clone();
        let timer_last = last_event.clone();
        std::thread::spawn(move || {
            let debounce = Duration::from_secs(5);
            loop {
                std::thread::sleep(Duration::from_secs(1));
                let fire = {
                    let mut g = timer_last.lock().unwrap();
                    match *g {
                        Some(t) if t.elapsed() >= debounce => { *g = None; true }
                        _ => false,
                    }
                };
                if fire {
                    if let Some(w) = timer_app.get_webview_window("main") {
                        let _ = tauri::Emitter::emit(&w, "storage-changed", ());
                    }
                }
            }
        });
    }

    // Watcher
    let watcher_last = last_event.clone();
    let Ok(mut watcher) = recommended_watcher(move |res: notify::Result<notify::Event>| {
        if let Ok(event) = res {
            if matches!(event.kind, EventKind::Create(_) | EventKind::Modify(..)) {
                let relevant = event.paths.iter().any(|p| {
                    // Ignore hidden files and non-document files
                    let hidden = p.file_name()
                        .and_then(|n| n.to_str())
                        .map(|n| n.starts_with('.'))
                        .unwrap_or(false);
                    if hidden { return false; }
                    p.extension()
                        .and_then(|e| e.to_str())
                        .map(|e| SUPPORTED_EXT.contains(&e.to_lowercase().as_str()))
                        .unwrap_or(false)
                });
                if relevant {
                    *watcher_last.lock().unwrap() = Some(Instant::now());
                }
            }
        }
    }) else { return };

    if watcher.watch(Path::new(storage_path), RecursiveMode::Recursive).is_err() {
        return;
    }

    // Keep watcher alive; restart if storage path changes
    let initial = storage_path.to_string();
    loop {
        std::thread::sleep(Duration::from_secs(60));
        let current = resolve_storage_path(app);
        if current != initial || !Path::new(&current).exists() {
            break;
        }
    }
    // `watcher` is dropped here, stopping the watch
}
