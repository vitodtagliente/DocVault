# DocVault — Technical Specification

> **Version:** 1.0.0  
> **Date:** June 2026  
> **Stack:** Tauri 2 + Vanilla JS + Tailwind CSS 3 + SQLite (rusqlite)  
> **Platforms:** Windows, macOS, Linux

---

## 1. Project Overview

DocVault is an offline-first desktop application for cataloguing, searching, and organising documents of any type. All data lives in a user-chosen folder on the local file system. No cloud account or internet connection is required.

### Core Principles

- **Offline-first** — the app works entirely without internet access.
- **Plain folder** — documents are stored in a human-readable folder hierarchy that remains usable even without the app.
- **No bundler / no framework** — Vanilla JS + Tailwind CSS served directly by Tauri's asset protocol.
- **Single SQLite connection** — all database access goes through a `Mutex<Connection>` in `AppState`.

---

## 2. Architecture

### 2.1 Stack

| Layer | Technology |
|---|---|
| Shell | Tauri 2 (WebView2 on Windows, WebKit on macOS/Linux) |
| Frontend | Vanilla JS, ES modules, hash-based SPA router |
| Styling | Tailwind CSS 3 (compiled, committed as `output.css`) |
| Backend | Rust (`rusqlite` for SQLite, `sha2` for hashing, `zip` for backup, `notify` for FS watching) |
| Database | SQLite via `rusqlite` with bundled SQLite |

### 2.2 Frontend Architecture

All frontend files are under `src/`. There is no bundler — ES module imports work natively in WebView2/WebKit.

Key conventions:
- All backend calls go through `api.js` — never call `window.__TAURI__.core.invoke` directly from a page.
- Pages export `async function render(container)`. The router calls this after clearing the previous page.
- State is a simple pub/sub store (`store.js`). Pages read from it; API calls write to it.
- i18n strings must be added in **both** `en` and `it` blocks every time.
- Page width convention: all structured pages use `max-w-5xl mx-auto` as the content wrapper.

### 2.3 Backend Architecture

All Rust source is under `src-tauri/src/`.

Key modules:
- `lib.rs` — AppState, plugin registration, menu, tray, invoke_handler
- `commands/documents.rs` — CRUD, duplicate detection (SHA-256 hash)
- `commands/search.rs` — FTS5 full-text search, suggestions, stats
- `commands/import.rs` — Bulk folder import (scan + import)
- `commands/untracked.rs` — Untracked file detection + FS watcher
- `commands/license.rs` — License key verify + status (HMAC-SHA256, offline)
- `db/schema.rs` — open_and_migrate(): opens DB, runs pending migrations
- `db/queries.rs` — Low-level helpers: get_setting, set_setting, write_event, etc.

---

## 3. Database Schema

Migrations live in `src-tauri/migrations/` and run automatically at every startup.

### Tables

| Table | Purpose |
|---|---|
| `settings` | Key-value app config (storage_path, setup_complete, theme, language, license_status, global_shortcut, ...) |
| `categories` | Document categories with icon, color, soft-delete |
| `preset_fields` | Custom fields per category (text, number, date, select) |
| `documents` | Main catalog — title, file hash, storage path, dates, soft-delete |
| `document_fields` | Values for preset fields on a specific document |
| `tags` | User-defined tags with color |
| `document_tags` | Many-to-many join |
| `event_log` | Append-only log (used for future sync conflict resolution) |
| `thumbnails` | Thumbnail path cache per document |
| `documents_fts` | FTS5 virtual table for full-text search (indexed: title, notes) |

### FTS5 Configuration

The `documents_fts` virtual table indexes `title` and `notes`. Triggers keep it in sync with the `documents` table automatically.

Search uses prefix matching (`token*`) with an AND-implicit query builder. A LIKE fallback on `title` and `notes` handles edge-case tokens that cannot be expressed as FTS5 tokens.

---

## 4. Key Commands (Tauri invoke handlers)

### Settings
| Command | Description |
|---|---|
| `get_settings` | Returns AppSettings struct |
| `update_setting` | Sets a single key-value in settings table |
| `complete_setup` | Wizard first-run: sets storage_path, creates folder structure, seeds categories |
| `validate_storage_path` | Checks the path exists and is writable |
| `check_vault_path` | Checks whether an existing vault DB is present at the path |
| `folder_exists` | Returns true if a path exists on the file system |
| `update_global_shortcut` | Saves shortcut string, re-registers with OS (empty = disable) |

### Documents
| Command | Description |
|---|---|
| `create_document` | Hash check, copy file, insert DB record, tags, custom fields |
| `update_document` | Update metadata; moves file if category/title/date changed |
| `delete_document` | Soft delete (deleted_at) |
| `restore_document` | Clear deleted_at |
| `purge_document` | Hard delete: removes DB record and physical file |
| `get_document` | Returns DocumentDetail (doc + category + tags + custom fields) |
| `get_document_file_path` | Returns absolute path for viewer |

### Search
| Command | Description |
|---|---|
| `search_documents` | FTS5 + dynamic WHERE builder, paginated results |
| `search_suggestions` | Autocomplete from titles and tags |
| `get_stats` | Dashboard counts, sizes, by-category and by-month breakdowns |

### Import
| Command | Description |
|---|---|
| `scan_import_folder` | Recursively scan a folder, auto-detect categories and years |
| `import_documents` | Copy confirmed batch into vault and insert DB records |
| `check_untracked_files` | Find files in vault folder with no DB record |
| `import_untracked_files` | Register in-place files without copying |

### Other
| Command | Description |
|---|---|
| `export_csv` | Export filtered document list as CSV |
| `create_backup` | ZIP of DB + all vault files |
| `restore_backup` | Overwrite DB + vault files from ZIP |
| `verify_license` | Offline HMAC-SHA256 license key check |
| `get_license_status` | Current license state from DB |
| `reveal_in_file_manager` | Open file location in OS file manager |
| `open_with_system` | Open file with system default app |
| `read_file_bytes` | Read file as bytes for integrated viewer |
| `read_file_text` | Read file as text for Markdown viewer |

---

## 5. File Storage

Documents are stored in a user-chosen folder (storage_path). The path structure is:

```
{storage_path}/
├── .docvault/
│   └── docvault.db          ← SQLite database
├── {category-slug}/
│   └── {year}/
│       └── {YYYYMMDD}_{sanitized-title}.{ext}
└── ...
```

- File names are sanitised (lowercase, spaces to underscores, special chars stripped, truncated to 60 chars).
- Duplicate storage paths get `_2`, `_3`, etc. appended before the extension.
- Duplicate content (same SHA-256 hash) is blocked by default; `force: true` bypasses this for intentional re-cataloguing with a distinct title.

---

## 6. Native Shell Features

### System Tray
- Closing the window hides to tray (CloseRequested intercepted).
- Left-click or "Show DocVault" menu item restores the window.
- Right-click menu: Show / Quit.

### Global Shortcut
- Default: **Shift+Alt+D** — shows window and focuses the search bar.
- Configurable from Settings with a keyboard-capture recorder UI.
- Empty string = disabled. Stored in settings table as `global_shortcut`.

### Native Menu Bar
- **File:** Add Document (Ctrl+N), Settings (Ctrl+,), Hide, Quit
- **View:** Home, Categories, Backup, Cloud Sync, Notifications
- **Help:** About DocVault

### File System Watcher
- `untracked.rs` spawns a background thread using the `notify` crate (v6).
- Watches `storage_path` recursively for Create / Modify events.
- 5-second debounce: only fires `storage-changed` event to the frontend once activity settles.
- Frontend responds by running `check_untracked_files` and showing the untracked-files modal if any are found.

---

## 7. License System

Keys are validated **offline** via HMAC-SHA256.

- Secret: `docvault-license-secret-v1` (in `license.rs`)
- Format: `AAAAA-BBBBB-CCCCC-DDDDD-CHECK` — four random base-36 groups + one 5-char checksum group
- A valid key shows a thank-you banner only. **No feature is gated behind a license.**
- Key generation: `cd keygen && cargo run -- <count>`

---

## 8. CI / Release

The release workflow is at `.github/workflows/release.yml`.

- Triggered by any `v*` tag push.
- Matrix: `windows-latest`, `macos-latest` (aarch64 + x86_64), `ubuntu-22.04`.
- Tailwind CSS is compiled (`npm run tw:build`) before `tauri-action` runs.
- Creates a GitHub Release with all platform installers attached automatically.

---

## 9. Development Setup

```bash
# Install Rust (Windows)
winget install Rustlang.Rustup

# Install Tauri CLI
cargo install tauri-cli --version "^2"

# Install JS deps
npm install

# Dev server (hot-reload Rust + WebView)
npm run dev

# Tailwind watch (separate terminal)
npm run tw:watch

# Production build
npm run build

# Generate license keys
cd keygen && cargo run -- 5
```

---

## 10. Extension Points

### Adding a New Page
1. Create `src/js/pages/my-page.js` exporting `async function render(container)`.
2. Add a route in `src/js/router.js`.
3. Add nav links in `components/sidebar.js` and `components/bottom-nav.js` if needed.
4. Add i18n keys in **both** `en` and `it` blocks in `i18n.js`.
5. Update `CLAUDE.md`.

### Adding a New Tauri Command
1. Implement `#[tauri::command] pub async fn my_command(...)` in the appropriate `commands/*.rs`.
2. Register it in the `invoke_handler!` list in `lib.rs`.
3. Add a wrapper in `api.js`.
4. Update `CLAUDE.md`.

### Adding a DB Migration
1. Create `src-tauri/migrations/00N_description.sql`.
2. Verify `db/schema.rs` `open_and_migrate()` picks it up.
3. Update the schema table in `CLAUDE.md`.
