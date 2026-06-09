# DocVault — AI Context File

> **RULE: Keep this file up to date.**  
> Any time you add a feature, rename a file, change a command, add a dependency, change a build step, or alter a key architectural decision — update the relevant section here before finishing your work.

---

## Project Identity

| Field | Value |
|---|---|
| App name | DocVault |
| Identifier | `com.docvault.app` |
| Version | 1.0.0 |
| Stack | Tauri 2, Vanilla JS (no framework), Tailwind CSS 3, SQLite (rusqlite) |
| Platforms | Desktop (Windows, macOS, Linux) — mobile targets wired but not shipped |

---

## Repository Layout

```
project-docvault/
├── src/                        ← Frontend (served as static files by Tauri)
│   ├── index.html              ← Single HTML shell; all routing is hash-based
│   ├── app.config.json         ← App name, version, tagline (read at runtime)
│   ├── css/
│   │   ├── input.css           ← Tailwind source
│   │   └── output.css          ← Compiled CSS (committed; regenerate with tw:build)
│   ├── js/
│   │   ├── app.js              ← Entry point: init, theme, router bootstrap
│   │   ├── api.js              ← All Tauri invoke() wrappers (1-to-1 with Rust commands)
│   │   ├── router.js           ← Hash-router; maps #/path → page render functions
│   │   ├── store.js            ← Minimal reactive state store (no Redux/Zustand)
│   │   ├── i18n.js             ← EN + IT translations; t() helper
│   │   ├── app-config.js       ← Reads app.config.json at startup
│   │   ├── pages/              ← One file per route; each exports render(container)
│   │   ├── components/         ← Reusable UI fragments (modal, toast, header…)
│   │   ├── viewers/            ← PDF (pdf.js), image, Markdown (marked) viewers
│   │   └── utils/              ← date, debounce, dom, format, icons helpers
│   └── assets/lib/             ← Vendored: pdf.mjs, pdf.worker.mjs, marked.min.js
│
├── src-tauri/                  ← Rust backend
│   ├── Cargo.toml
│   ├── tauri.conf.json         ← Window config, bundle targets, CSP
│   ├── build.rs
│   ├── migrations/             ← SQL files run in order at startup (001_, 002_…)
│   └── src/
│       ├── lib.rs              ← AppState (Mutex<Connection>), plugin registration, invoke_handler
│       ├── main.rs             ← Thin binary entry point
│       ├── commands/           ← Tauri commands grouped by domain
│       │   ├── mod.rs          ← pub mod declarations
│       │   ├── settings.rs     ← App settings, storage path, setup
│       │   ├── documents.rs    ← CRUD, duplicate detection (hash)
│       │   ├── search.rs       ← FTS5 full-text search, suggestions, stats
│       │   ├── categories.rs   ← Category + preset field management
│       │   ├── tags.rs         ← Tag CRUD
│       │   ├── files.rs        ← reveal_in_file_manager, open_with_system, read bytes/text
│       │   ├── ocr.rs          ← Tesseract CLI subprocess wrapper
│       │   ├── export.rs       ← CSV export
│       │   ├── backup.rs       ← ZIP backup / restore
│       │   ├── sync.rs         ← Google Drive sync (OAuth2 + Drive API, Phase 8 TODO)
│       │   └── license.rs      ← License key verify + status (HMAC-SHA256, offline)
│       ├── db/
│       │   ├── schema.rs       ← open_and_migrate(): opens DB, runs pending migrations
│       │   ├── queries.rs      ← Low-level get_setting/set_setting + write_event helpers
│       │   └── mod.rs
│       ├── models/             ← Serde structs: Document, Category, Tag, AppSettings…
│       └── utils/              ← date (ISO helpers), file_ops (copy/move/hash), hash (SHA-256)
│
├── keygen/                     ← Standalone Rust binary: generate DocVault license keys
│   ├── Cargo.toml
│   └── src/main.rs             ← cargo run -- N  →  prints N valid license keys
│
├── docs/
│   ├── DocVault_Technical_Specification.md
│   └── USER_GUIDE.md           ← Customer-facing: what the app does and how to use it
│
├── package.json                ← npm scripts (tw:watch, tw:build, dev, build)
├── tailwind.config.js
└── CLAUDE.md                   ← This file
```

---

## Architecture Decisions

### Frontend
- **No framework.** Vanilla JS with a minimal hash-router. Each page is a module exporting `render(container)`.
- **No bundler.** Files are served directly by Tauri's frontend dist. ES module imports work natively in WebView2/WebKit.
- **State** is a simple pub/sub store (`store.js`). Pages read from it; API calls write to it.
- **All backend calls** go through `src/js/api.js`. Never call `window.__TAURI__.core.invoke` directly from a page.
- **i18n** lives entirely in `i18n.js`. Both EN and IT must be updated together every time a string changes.

### Backend
- **Single SQLite connection** shared via `Mutex<Connection>` in `AppState`. No connection pool needed.
- **Migrations** run on every startup from `migrations/001_initial.sql`, `002_add_ocr_text.sql`, etc. Add new migrations as `00N_description.sql`.
- **File storage**: documents are copied into the user-chosen `storage_path` folder under `.docvault/files/`. Original files are never moved or deleted.
- **Duplicate detection**: SHA-256 hash of the file content. On hash collision `create_document` returns `DUPLICATE:<title>` — the frontend retries with a numbered suffix.
- **OCR** calls `tesseract` CLI as a subprocess (no Leptess linking). Optional; gracefully absent if not installed.

### License
- Keys are validated **offline** via HMAC-SHA256 with the secret `docvault-license-secret-v1` (in `license.rs`).
- Format: `AAAAA-BBBBB-CCCCC-DDDDD-CHECK` — four random base-36 groups + one 5-char checksum group.
- The app is **fully functional without a license**. A valid key shows a thank-you banner only. No feature is gated.
- Keys are generated with the `keygen/` tool: `cd keygen && cargo run -- <count>`.

### Google Drive Sync
- Backend stubs exist in `sync.rs`; full implementation is Phase 8 TODO.
- The sync page is accessible to all users (no license gate).
- Auth flow: OAuth2 PKCE. Tokens stored in the `settings` table (`google_access_token`, `google_refresh_token`).

---

## Key Commands

```bash
# Install Rust (Windows)
winget install Rustlang.Rustup

# Install Tauri CLI (once)
cargo install tauri-cli --version "^2"

# Install JS deps
npm install

# Dev server (hot-reload Rust + WebView)
npm run dev                   # = cargo tauri dev

# Tailwind watch (separate terminal during dev)
npm run tw:watch

# Production desktop build
npm run build                 # = npm run tw:build && cargo tauri build

# Generate license keys
cd keygen && cargo run -- 5
```

---

## Database Schema (summary)

| Table | Purpose |
|---|---|
| `settings` | Key-value app config (`storage_path`, `setup_complete`, `theme`, `language`, `license_status`, `license_key`…) |
| `categories` | Document categories with icon, color, soft-delete |
| `preset_fields` | Custom fields per category (text, number, date, select) |
| `documents` | Main catalog — title, file hash, path, dates, soft-delete |
| `document_fields` | Values for preset fields on a specific document |
| `tags` | User-defined tags with color |
| `document_tags` | Many-to-many join |
| `event_log` | Append-only log for sync conflict resolution |
| `thumbnails` | Thumbnail path cache per document |

---

## Adding a New Page

1. Create `src/js/pages/my-page.js` exporting `async function render(container)`.
2. Add a route in `src/js/router.js`.
3. Add nav links in `components/sidebar.js` and `components/bottom-nav.js` if needed.
4. Add i18n keys in **both** `en` and `it` blocks in `i18n.js`.
5. **Update this file** if the page introduces a new pattern, dependency, or command.

## Adding a New Tauri Command

1. Implement `#[tauri::command] pub async fn my_command(...)` in the appropriate `commands/*.rs`.
2. Register it in the `invoke_handler!` list in `lib.rs`.
3. Add a wrapper `export const myCommand = (...) => call('my_command', {...})` in `api.js`.
4. **Update this file** if the command introduces a new crate dependency or architectural pattern.

## Adding a DB Migration

1. Create `src-tauri/migrations/00N_description.sql`.
2. Ensure `db/schema.rs` `open_and_migrate()` picks it up (check current logic).
3. **Update the schema summary table above.**

---

## Code Conventions

- Rust: standard `cargo fmt` style, `snake_case` everywhere, `map_err(|e| e.to_string())` for command errors.
- JS: ES modules, `camelCase`, template-literal HTML in render functions, no TypeScript.
- CSS: Tailwind utility classes; CSS custom properties for theme tokens (`--color-text`, `--color-primary`, etc.) in `input.css`.
- No `console.log` in production paths; use `console.error` for actual errors only.
- Strings must have both EN and IT entries in `i18n.js` — never add one without the other.
