pub mod db;
pub mod models;
pub mod commands;
pub mod utils;

use std::sync::Mutex;
use rusqlite::Connection;

/// Shared application state — the SQLite connection protected by a Mutex.
pub struct AppState {
    pub db: Mutex<Connection>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir()
                .expect("Failed to resolve app data dir");
            std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");

            let db_path = app_dir.join("docvault.db");
            let conn = db::schema::open_and_migrate(&db_path)
                .expect("Failed to open/migrate database");

            app.manage(AppState { db: Mutex::new(conn) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Settings
            commands::settings::get_settings,
            commands::settings::update_setting,
            commands::settings::validate_storage_path,
            commands::settings::complete_setup,
            // Documents
            commands::documents::create_document,
            commands::documents::update_document,
            commands::documents::delete_document,
            commands::documents::restore_document,
            commands::documents::purge_document,
            commands::documents::get_document,
            commands::documents::get_document_file_path,
            // Search
            commands::search::search_documents,
            commands::search::search_suggestions,
            commands::search::get_stats,
            // Categories
            commands::categories::list_categories,
            commands::categories::create_category,
            commands::categories::update_category,
            commands::categories::delete_category,
            commands::categories::get_preset_fields,
            commands::categories::add_preset_field,
            commands::categories::remove_preset_field,
            // Tags
            commands::tags::list_tags,
            commands::tags::list_tags_with_count,
            commands::tags::create_tag,
            commands::tags::delete_tag,
            // Files
            commands::files::reveal_in_file_manager,
            commands::files::open_with_system,
            commands::files::read_file_bytes,
            commands::files::read_file_text,
            // OCR
            commands::ocr::run_ocr,
            // Export
            commands::export::export_csv,
            // Backup
            commands::backup::create_backup,
            commands::backup::restore_backup,
            // Sync
            commands::sync::sync_now,
            commands::sync::google_auth_start,
            commands::sync::google_auth_callback,
            commands::sync::google_auth_status,
            commands::sync::google_auth_logout,
            // License
            commands::license::verify_license,
            commands::license::get_license_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
