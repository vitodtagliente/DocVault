pub mod db;
pub mod models;
pub mod commands;
pub mod utils;

use std::sync::Mutex;
use rusqlite::Connection;
use tauri::{Emitter, Manager};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

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
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                            let _ = win.emit("focus-search", ());
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            let app_dir = app.path().app_data_dir()
                .expect("Failed to resolve app data dir");
            std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");

            let db_path = app_dir.join("docvault.db");
            let conn = db::schema::open_and_migrate(&db_path)
                .expect("Failed to open/migrate database");

            app.manage(AppState { db: Mutex::new(conn) });

            // ── Global shortcut (loaded from DB, default Shift+Alt+D) ────
            let shortcut_str = {
                let st = app.state::<AppState>();
                let db = st.db.lock().map_err(|e| e.to_string())?;
                crate::db::queries::get_setting(&db, "global_shortcut")
                    .unwrap_or(None)
                    .unwrap_or_else(|| "Shift+Alt+D".to_string())
            };
            if !shortcut_str.is_empty() {
                if let Ok(sc) = commands::settings::parse_shortcut_str(&shortcut_str) {
                    let _ = app.global_shortcut().register(sc);
                }
            }

            // ── Native menu bar ──────────────────────────────────────────
            let file_menu = {
                let add = MenuItem::with_id(app, "add_document", "&Add Document", true, Some("CmdOrCtrl+N"))?;
                let settings = MenuItem::with_id(app, "settings", "&Settings", true, Some("CmdOrCtrl+Comma"))?;
                let hide = MenuItem::with_id(app, "hide", "&Hide DocVault", true, None::<&str>)?;
                let quit = MenuItem::with_id(app, "quit", "&Quit DocVault", true, Some("CmdOrCtrl+Q"))?;
                let sep1 = PredefinedMenuItem::separator(app)?;
                let sep2 = PredefinedMenuItem::separator(app)?;
                let sep3 = PredefinedMenuItem::separator(app)?;
                Submenu::with_items(app, "&File", true, &[&add, &sep1, &settings, &sep2, &hide, &sep3, &quit])?
            };

            let view_menu = {
                let home  = MenuItem::with_id(app, "nav_home", "&Home", true, Some("CmdOrCtrl+H"))?;
                let cats  = MenuItem::with_id(app, "nav_categories", "&Categories", true, None::<&str>)?;
                let backup= MenuItem::with_id(app, "nav_backup", "&Backup", true, None::<&str>)?;
                let sync  = MenuItem::with_id(app, "nav_sync", "Cloud &Sync", true, None::<&str>)?;
                let sep   = PredefinedMenuItem::separator(app)?;
                let notif = MenuItem::with_id(app, "nav_notifications", "&Notifications", true, None::<&str>)?;
                Submenu::with_items(app, "&View", true, &[&home, &cats, &backup, &sync, &sep, &notif])?
            };

            let help_menu = {
                let about = MenuItem::with_id(app, "about", "About DocVault", true, None::<&str>)?;
                Submenu::with_items(app, "&Help", true, &[&about])?
            };

            let menu = Menu::with_items(app, &[&file_menu, &view_menu, &help_menu])?;
            app.set_menu(menu)?;

            app.on_menu_event(|app, event| {
                let emit_navigate = |hash: &str| {
                    if let Some(w) = app.get_webview_window("main") {
                        let _ = w.show();
                        let _ = w.set_focus();
                        let _ = w.emit("navigate", hash);
                    }
                };
                match event.id().as_ref() {
                    "add_document"      => emit_navigate("#/add"),
                    "settings"          => emit_navigate("#/settings"),
                    "nav_home"          => emit_navigate("#/"),
                    "nav_categories"    => emit_navigate("#/categories"),
                    "nav_backup"        => emit_navigate("#/backup"),
                    "nav_sync"          => emit_navigate("#/sync"),
                    "nav_notifications" => emit_navigate("#/notifications"),
                    "hide" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.hide();
                        }
                    }
                    "quit" => app.exit(0),
                    "about" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                            let _ = w.emit("show-about", ());
                        }
                    }
                    _ => {}
                }
            });

            // ── System tray ───────────────────────────────────────────────
            let tray_show = MenuItem::with_id(app, "tray_show", "Show DocVault", true, None::<&str>)?;
            let tray_sep  = PredefinedMenuItem::separator(app)?;
            let tray_quit = MenuItem::with_id(app, "tray_quit", "Quit DocVault", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&tray_show, &tray_sep, &tray_quit])?;

            let icon = tauri::include_image!("icons/32x32.png");

            TrayIconBuilder::new()
                .icon(icon)
                .menu(&tray_menu)
                .tooltip("DocVault")
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "tray_show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "tray_quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;

            // ── Storage watcher (background thread) ──────────────────────
            {
                let watcher_app = app.app_handle().clone();
                std::thread::spawn(move || {
                    // Brief delay to let the app finish initialising
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    commands::untracked::run_storage_watcher(watcher_app);
                });
            }

            Ok(())
        })
        // Intercept close request: hide to tray instead of closing
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            // Settings
            commands::settings::get_settings,
            commands::settings::update_setting,
            commands::settings::validate_storage_path,
            commands::settings::check_vault_path,
            commands::settings::folder_exists,
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
            // Export
            commands::export::export_csv,
            // Backup
            commands::backup::create_backup,
            commands::backup::restore_backup,
            // License
            commands::license::verify_license,
            commands::license::get_license_status,
            // Shortcut
            commands::settings::update_global_shortcut,
            // Import
            commands::import::scan_import_folder,
            commands::import::import_documents,
            // Untracked
            commands::untracked::check_untracked_files,
            commands::untracked::import_untracked_files,
            commands::untracked::check_missing_files,
            commands::untracked::delete_documents_batch,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
