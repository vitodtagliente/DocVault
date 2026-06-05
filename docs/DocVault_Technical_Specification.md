# DocVault — Specifica Tecnica Completa

> **Versione:** 1.0.0
> **Data:** Giugno 2026
> **Stack:** Tauri 2 + Vanilla JS + Tailwind CSS + SQLite
> **Piattaforme:** Windows, macOS, Linux, Android, iOS

---

## Indice

1. [Panoramica del Progetto](#1-panoramica-del-progetto)
2. [Setup Ambiente di Sviluppo](#2-setup-ambiente-di-sviluppo)
3. [Architettura del Progetto](#3-architettura-del-progetto)
4. [Schema Database SQLite](#4-schema-database-sqlite)
5. [Strutture Dati e Classi](#5-strutture-dati-e-classi)
6. [Moduli Backend (Rust)](#6-moduli-backend-rust)
7. [Moduli Frontend (Vanilla JS)](#7-moduli-frontend-vanilla-js)
8. [Sistema di File e Cartelle](#8-sistema-di-file-e-cartelle)
9. [Sistema di Preset e Campi Custom](#9-sistema-di-preset-e-campi-custom)
10. [Visualizzatore Integrato](#10-visualizzatore-integrato)
11. [Sistema di Sync Google Drive](#11-sistema-di-sync-google-drive)
12. [Sistema di Monetizzazione](#12-sistema-di-monetizzazione)
13. [Stile e UI/UX](#13-stile-e-uiux)
14. [Fasi di Implementazione](#14-fasi-di-implementazione)
15. [Strategia di Testing](#15-strategia-di-testing)

---

## 1. Panoramica del Progetto

### 1.1 Obiettivo

DocVault è un'applicazione desktop e mobile per catalogare, ricercare e organizzare documenti di varia natura (immagini, PDF, DOCX, ecc.) in modo completamente offline, con sync opzionale su Google Drive.

### 1.2 Principi Fondamentali

- **Offline-first**: l'app funziona integralmente senza connessione internet.
- **Cartella esplorabile**: i file sono organizzati in una cartella leggibile anche senza l'app.
- **Leggerezza**: nessun framework JS pesante; vanilla JS + Tailwind CSS.
- **Portabilità**: una singola codebase per desktop e mobile via Tauri 2.
- **Sync opzionale**: event sourcing su Google Drive per sincronizzazione multi-dispositivo.

### 1.3 Funzionalità Principali

- Importazione documenti con copia nella cartella gestita dall'app
- Form di catalogazione con tag, metadati, note, preset personalizzabili
- Campi custom per preset (es. "importo" per bollette, "medico" per certificati)
- Ricerca avanzata con filtri multipli
- Modifica metadati dei documenti catalogati
- Visualizzatore integrato per immagini, PDF e Markdown
- OCR opzionale per documenti scansionati
- Export filtrato in CSV
- Backup manuale ZIP
- Scadenze con notifiche
- Sync Google Drive (feature Pro)

---

## 2. Setup Ambiente di Sviluppo

### 2.1 Prerequisiti di Sistema

```
# Rust (ultima stable)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup update stable

# Node.js >= 20 LTS (per Tauri CLI e Tailwind CLI)
# Installare via nvm o dal sito ufficiale

# Tauri CLI v2
cargo install tauri-cli --version "^2"

# Tailwind CSS CLI (standalone, senza Node build step)
# Scaricare il binario standalone da:
# https://github.com/tailwindlabs/tailwindcss/releases
# Rinominare in `tailwindcss` e rendere eseguibile
```

### 2.2 Prerequisiti per Piattaforma

```
# --- Linux (Debian/Ubuntu) ---
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev \
  tesseract-ocr tesseract-ocr-ita tesseract-ocr-eng  # Per OCR

# --- macOS ---
xcode-select --install
brew install tesseract tesseract-lang

# --- Windows ---
# Installare Visual Studio Build Tools con "Desktop development with C++"
# Installare WebView2 (preinstallato su Windows 11)
# Installare Tesseract da https://github.com/UB-Mannheim/tesseract/wiki

# --- Android ---
# Installare Android Studio
# Configurare ANDROID_HOME e NDK
# Seguire https://v2.tauri.app/start/prerequisites/#android

# --- iOS ---
# Xcode 15+, CocoaPods
# Seguire https://v2.tauri.app/start/prerequisites/#ios
```

### 2.3 Inizializzazione del Progetto

```bash
# Creare il progetto Tauri 2
cargo tauri init

# Struttura iniziale dopo init:
# docvault/
# ├── src-tauri/          ← Backend Rust
# │   ├── Cargo.toml
# │   ├── tauri.conf.json
# │   ├── src/
# │   │   └── main.rs
# │   └── capabilities/
# └── src/                ← Frontend
#     ├── index.html
#     ├── css/
#     ├── js/
#     └── assets/
```

### 2.4 Dipendenze Rust (Cargo.toml)

```toml
[package]
name = "docvault"
version = "1.0.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = ["tray-icon", "protocol-asset"] }
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-notification = "2"
tauri-plugin-shell = "2"
tauri-plugin-os = "2"
tauri-plugin-http = "2"
tauri-plugin-clipboard-manager = "2"
tauri-plugin-opener = "2"

serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
rusqlite = { version = "0.31", features = ["bundled"] }
sha2 = "0.10"
zip = "0.6"
walkdir = "2"
leptess = "0.14"          # Binding Rust per Tesseract OCR
reqwest = { version = "0.12", features = ["json", "rustls-tls"] }
tokio = { version = "1", features = ["full"] }
```

### 2.5 Configurazione Tauri (tauri.conf.json)

```json
{
  "$schema": "https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-config-schema/schema.json",
  "productName": "DocVault",
  "version": "1.0.0",
  "identifier": "com.docvault.app",
  "build": {
    "frontendDist": "../src",
    "devUrl": "http://localhost:1420"
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "title": "DocVault",
        "width": 1200,
        "height": 800,
        "minWidth": 380,
        "minHeight": 600,
        "resizable": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
    }
  },
  "plugins": {
    "sql": {
      "preload": {
        "db": "sqlite:docvault.db"
      }
    }
  }
}
```

### 2.6 Configurazione Tailwind (tailwind.config.js)

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:   { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
        surface:   { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a' },
        success:   { 500: '#22c55e', 600: '#16a34a' },
        warning:   { 500: '#f59e0b', 600: '#d97706' },
        danger:    { 500: '#ef4444', 600: '#dc2626' }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      }
    }
  },
  plugins: []
}
```

### 2.7 Script di Sviluppo

```bash
# Compilare Tailwind CSS (watch mode)
./tailwindcss -i ./src/css/input.css -o ./src/css/output.css --watch

# Avviare Tauri in dev mode (in un altro terminale)
cargo tauri dev

# Build per produzione
./tailwindcss -i ./src/css/input.css -o ./src/css/output.css --minify
cargo tauri build

# Build per Android
cargo tauri android build

# Build per iOS
cargo tauri ios build
```

---

## 3. Architettura del Progetto

### 3.1 Struttura Directory del Progetto

```
docvault/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json
│   ├── src/
│   │   ├── main.rs                  # Entry point, registrazione comandi
│   │   ├── lib.rs                   # Modulo principale
│   │   ├── db/
│   │   │   ├── mod.rs               # Re-export moduli DB
│   │   │   ├── schema.rs            # Creazione tabelle e migrazioni
│   │   │   └── queries.rs           # Query SQL parametrizzate
│   │   ├── commands/
│   │   │   ├── mod.rs               # Re-export comandi
│   │   │   ├── documents.rs         # CRUD documenti
│   │   │   ├── categories.rs        # CRUD categorie/preset
│   │   │   ├── tags.rs              # CRUD tag
│   │   │   ├── search.rs            # Ricerca avanzata
│   │   │   ├── files.rs             # Operazioni filesystem
│   │   │   ├── settings.rs          # Configurazione app
│   │   │   ├── sync.rs              # Sync Google Drive
│   │   │   ├── backup.rs            # Backup/restore ZIP
│   │   │   ├── ocr.rs               # OCR Tesseract
│   │   │   ├── export.rs            # Export CSV
│   │   │   └── license.rs           # Verifica licenza Pro
│   │   ├── models/
│   │   │   ├── mod.rs
│   │   │   ├── document.rs          # Struct Document
│   │   │   ├── category.rs          # Struct Category
│   │   │   ├── tag.rs               # Struct Tag
│   │   │   ├── preset_field.rs      # Struct PresetField
│   │   │   ├── event_log.rs         # Struct EventLogEntry
│   │   │   └── settings.rs          # Struct AppSettings
│   │   ├── sync/
│   │   │   ├── mod.rs
│   │   │   ├── google_auth.rs       # OAuth2 PKCE per Google
│   │   │   ├── google_drive.rs      # API Google Drive
│   │   │   ├── event_store.rs       # Gestione event log NDJSON
│   │   │   └── merge.rs             # Risoluzione conflitti
│   │   └── utils/
│   │       ├── mod.rs
│   │       ├── hash.rs              # SHA-256 file hash
│   │       ├── file_ops.rs          # Copia, rinomina, organizza file
│   │       └── date.rs              # Utility date
│   └── migrations/
│       ├── 001_initial.sql
│       └── 002_add_ocr_text.sql
│
├── src/
│   ├── index.html                   # Entry point HTML
│   ├── css/
│   │   ├── input.css                # Tailwind @import + custom CSS
│   │   └── output.css               # Generato da Tailwind CLI
│   ├── js/
│   │   ├── app.js                   # Entry point JS, router, init
│   │   ├── router.js                # Router SPA basato su hash
│   │   ├── store.js                 # State management semplice
│   │   ├── api.js                   # Wrapper per Tauri invoke()
│   │   ├── components/
│   │   │   ├── header.js            # Header/Navbar
│   │   │   ├── sidebar.js           # Sidebar navigazione (desktop)
│   │   │   ├── bottom-nav.js        # Bottom navigation (mobile)
│   │   │   ├── modal.js             # Componente modale generico
│   │   │   ├── toast.js             # Notifiche toast
│   │   │   ├── file-picker.js       # Componente selezione file
│   │   │   ├── tag-input.js         # Input tag con autocomplete
│   │   │   ├── filter-bar.js        # Barra filtri ricerca
│   │   │   ├── document-card.js     # Card documento nella lista
│   │   │   ├── document-grid.js     # Griglia documenti
│   │   │   ├── preset-selector.js   # Selettore preset
│   │   │   ├── custom-field.js      # Campo custom dinamico
│   │   │   ├── expiry-badge.js      # Badge scadenza
│   │   │   └── pagination.js        # Paginazione risultati
│   │   ├── pages/
│   │   │   ├── home.js              # Dashboard / ricerca
│   │   │   ├── add-document.js      # Form aggiunta documento
│   │   │   ├── edit-document.js     # Form modifica documento
│   │   │   ├── view-document.js     # Dettaglio + visualizzatore
│   │   │   ├── categories.js        # Gestione categorie/preset
│   │   │   ├── settings.js          # Impostazioni app
│   │   │   ├── setup.js             # Wizard primo avvio
│   │   │   ├── sync.js              # Pagina sync/login Google
│   │   │   ├── backup.js            # Pagina backup/restore
│   │   │   └── expiring.js          # Documenti in scadenza
│   │   ├── viewers/
│   │   │   ├── image-viewer.js      # Visualizzatore immagini
│   │   │   ├── pdf-viewer.js        # Visualizzatore PDF (pdfjs)
│   │   │   └── md-viewer.js         # Visualizzatore Markdown
│   │   └── utils/
│   │       ├── dom.js               # Helper DOM: $, $$, html()
│   │       ├── date.js              # Formattazione date
│   │       ├── debounce.js          # Debounce per ricerca
│   │       └── format.js            # Formattazione file size, ecc.
│   └── assets/
│       ├── icons/                   # Icone SVG inline
│       ├── fonts/                   # Inter font (self-hosted)
│       └── logo.svg
│
├── tailwind.config.js
├── package.json                     # Solo per tailwindcss e dev scripts
└── README.md
```

### 3.2 Flusso Dati

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (Vanilla JS)                                      │
│                                                             │
│  ┌─────────┐   ┌──────────┐   ┌──────────────────────┐     │
│  │  Pages   │──>│  Store   │──>│  api.js (invoke())   │     │
│  │ (render) │<──│ (state)  │<──│                      │     │
│  └─────────┘   └──────────┘   └──────────┬───────────┘     │
│                                           │ IPC Bridge      │
├───────────────────────────────────────────┼─────────────────┤
│  BACKEND (Rust / Tauri)                   │                 │
│                                           ▼                 │
│  ┌──────────────────┐   ┌─────────────────────────────┐     │
│  │  Tauri Commands   │──>│  SQLite (tauri-plugin-sql)  │     │
│  │  (commands/*.rs)  │<──│  docvault.db                │     │
│  └──────┬───────────┘   └─────────────────────────────┘     │
│         │                                                   │
│  ┌──────▼───────────┐   ┌─────────────────────────────┐     │
│  │  File System      │   │  Sync Module               │     │
│  │  (copia, org.)    │   │  (Google Drive API)         │     │
│  └──────────────────┘   └─────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Pattern Architetturali

**Frontend**: Component-based Vanilla JS. Ogni componente è una funzione che:
1. Riceve proprietà come parametro
2. Ritorna HTML come stringa
3. Espone un metodo `mount()` per event binding post-render

**State Management**: Semplice pub/sub store. Lo `store.js` mantiene lo stato dell'app e notifica i componenti registrati quando lo stato cambia.

**Backend**: Command pattern via Tauri. Ogni operazione è un comando Rust invocabile dal frontend tramite `invoke()`.

---

## 4. Schema Database SQLite

### 4.1 Migrazione Iniziale (001_initial.sql)

```sql
-- =============================================================
-- TABELLA: settings
-- Configurazioni chiave-valore dell'applicazione
-- =============================================================
CREATE TABLE IF NOT EXISTS settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Valori iniziali obbligatori (inseriti al primo avvio)
-- key='storage_path'   → percorso cartella base scelta dall'utente
-- key='device_id'      → UUID v4 generato al primo avvio
-- key='setup_complete'  → '0' o '1'
-- key='license_status'  → 'free' o 'pro'
-- key='theme'           → 'light', 'dark', 'system'
-- key='language'        → 'it', 'en'
-- key='last_sync_at'    → ISO timestamp o NULL

-- =============================================================
-- TABELLA: categories
-- Categorie/Preset per classificare i documenti
-- =============================================================
CREATE TABLE IF NOT EXISTS categories (
    id              TEXT PRIMARY KEY,          -- UUID v4
    name            TEXT NOT NULL UNIQUE,      -- "Bolletta Luce", "Affitto", ecc.
    slug            TEXT NOT NULL UNIQUE,      -- "bolletta-luce" (usato per nome cartella)
    icon            TEXT DEFAULT 'folder',     -- Nome icona SVG
    color           TEXT DEFAULT '#3b82f6',    -- Colore HEX per badge UI
    is_system       INTEGER NOT NULL DEFAULT 0,-- 1 = preset di sistema, non eliminabile
    sort_order      INTEGER NOT NULL DEFAULT 0,-- Ordine di visualizzazione
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at      TEXT DEFAULT NULL          -- Soft delete
);

-- =============================================================
-- TABELLA: preset_fields
-- Campi custom associati a ciascuna categoria/preset
-- =============================================================
CREATE TABLE IF NOT EXISTS preset_fields (
    id              TEXT PRIMARY KEY,          -- UUID v4
    category_id     TEXT NOT NULL,             -- FK → categories.id
    field_name      TEXT NOT NULL,             -- "importo", "fornitore", "medico"
    field_label     TEXT NOT NULL,             -- Label UI: "Importo (€)", "Fornitore"
    field_type      TEXT NOT NULL DEFAULT 'text', -- 'text', 'number', 'date', 'select'
    field_options   TEXT DEFAULT NULL,         -- JSON array per tipo 'select': ["Enel","Eni"]
    is_required     INTEGER NOT NULL DEFAULT 0,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at      TEXT DEFAULT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- =============================================================
-- TABELLA: documents
-- Record principale di ogni documento catalogato
-- =============================================================
CREATE TABLE IF NOT EXISTS documents (
    id              TEXT PRIMARY KEY,          -- UUID v4
    title           TEXT NOT NULL,             -- Nome assegnato dall'utente
    original_name   TEXT NOT NULL,             -- Nome file originale con estensione
    file_extension  TEXT NOT NULL,             -- ".pdf", ".jpg", ".docx"
    file_size       INTEGER NOT NULL,          -- Dimensione in bytes
    file_hash       TEXT NOT NULL,             -- SHA-256 del file originale
    mime_type       TEXT NOT NULL,             -- "application/pdf", "image/jpeg"
    storage_path    TEXT NOT NULL,             -- Path relativo dalla cartella base
                                              -- Es: "bolletta-luce/2026/20260115_bolletta_gennaio.pdf"
    category_id     TEXT NOT NULL,             -- FK → categories.id
    document_date   TEXT NOT NULL,             -- Data del documento (YYYY-MM-DD)
    expiry_date     TEXT DEFAULT NULL,         -- Data di scadenza opzionale (YYYY-MM-DD)
    notes           TEXT DEFAULT '',           -- Note libere dell'utente
    ocr_text        TEXT DEFAULT NULL,         -- Testo estratto via OCR (può essere lungo)
    is_favorite     INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at      TEXT DEFAULT NULL          -- Soft delete
);

-- =============================================================
-- TABELLA: document_fields
-- Valori dei campi custom per ogni documento
-- =============================================================
CREATE TABLE IF NOT EXISTS document_fields (
    id              TEXT PRIMARY KEY,          -- UUID v4
    document_id     TEXT NOT NULL,             -- FK → documents.id
    field_id        TEXT NOT NULL,             -- FK → preset_fields.id
    field_value     TEXT NOT NULL,             -- Valore inserito dall'utente
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (document_id) REFERENCES documents(id),
    FOREIGN KEY (field_id) REFERENCES preset_fields(id),
    UNIQUE(document_id, field_id)
);

-- =============================================================
-- TABELLA: tags
-- Tag globali riutilizzabili
-- =============================================================
CREATE TABLE IF NOT EXISTS tags (
    id              TEXT PRIMARY KEY,          -- UUID v4
    name            TEXT NOT NULL UNIQUE,      -- "urgente", "deducibile", "2026"
    color           TEXT DEFAULT '#64748b',    -- Colore HEX opzionale
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================
-- TABELLA: document_tags
-- Relazione many-to-many documenti ↔ tag
-- =============================================================
CREATE TABLE IF NOT EXISTS document_tags (
    document_id     TEXT NOT NULL,
    tag_id          TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (document_id, tag_id),
    FOREIGN KEY (document_id) REFERENCES documents(id),
    FOREIGN KEY (tag_id) REFERENCES tags(id)
);

-- =============================================================
-- TABELLA: event_log
-- Log append-only per sync (event sourcing)
-- =============================================================
CREATE TABLE IF NOT EXISTS event_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id        TEXT NOT NULL UNIQUE,      -- UUID v4, identifica univocamente l'evento
    device_id       TEXT NOT NULL,             -- UUID del dispositivo che ha generato l'evento
    event_type      TEXT NOT NULL,             -- Tipo: vedi sezione 4.2
    entity_type     TEXT NOT NULL,             -- 'document', 'category', 'tag', ecc.
    entity_id       TEXT NOT NULL,             -- UUID dell'entità modificata
    payload         TEXT NOT NULL,             -- JSON con i dati completi dell'operazione
    timestamp       TEXT NOT NULL,             -- ISO 8601 con millisecondi e timezone
    synced          INTEGER NOT NULL DEFAULT 0,-- 0 = da sincronizzare, 1 = sincronizzato
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================
-- INDICI
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_documents_category    ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_date        ON documents(document_date);
CREATE INDEX IF NOT EXISTS idx_documents_expiry      ON documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_documents_deleted     ON documents(deleted_at);
CREATE INDEX IF NOT EXISTS idx_documents_hash        ON documents(file_hash);
CREATE INDEX IF NOT EXISTS idx_document_fields_doc   ON document_fields(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tags_doc     ON document_tags(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tags_tag     ON document_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_preset_fields_cat     ON preset_fields(category_id);
CREATE INDEX IF NOT EXISTS idx_event_log_synced      ON event_log(synced);
CREATE INDEX IF NOT EXISTS idx_event_log_timestamp   ON event_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_event_log_entity      ON event_log(entity_type, entity_id);

-- FTS5 per ricerca full-text
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
    title,
    notes,
    ocr_text,
    content='documents',
    content_rowid='rowid'
);

-- Trigger per mantenere sincronizzato FTS
CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
    INSERT INTO documents_fts(rowid, title, notes, ocr_text)
    VALUES (new.rowid, new.title, new.notes, new.ocr_text);
END;

CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
    INSERT INTO documents_fts(documents_fts, rowid, title, notes, ocr_text)
    VALUES ('delete', old.rowid, old.title, old.notes, old.ocr_text);
END;

CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
    INSERT INTO documents_fts(documents_fts, rowid, title, notes, ocr_text)
    VALUES ('delete', old.rowid, old.title, old.notes, old.ocr_text);
    INSERT INTO documents_fts(rowid, title, notes, ocr_text)
    VALUES (new.rowid, new.title, new.notes, new.ocr_text);
END;
```

### 4.2 Tipi di Evento (event_log.event_type)

| event_type            | entity_type  | Descrizione                                    |
|-----------------------|-------------|------------------------------------------------|
| `document.created`    | document    | Nuovo documento inserito                       |
| `document.updated`    | document    | Metadati documento modificati                  |
| `document.deleted`    | document    | Documento soft-deleted                         |
| `document.restored`   | document    | Documento ripristinato da soft-delete          |
| `document.file_added` | document    | File binario aggiunto (hash nel payload)       |
| `category.created`    | category    | Nuova categoria creata                         |
| `category.updated`    | category    | Categoria modificata                           |
| `category.deleted`    | category    | Categoria eliminata                            |
| `tag.created`         | tag         | Nuovo tag creato                               |
| `tag.deleted`         | tag         | Tag eliminato                                  |
| `tag.linked`          | document_tag| Tag associato a documento                      |
| `tag.unlinked`        | document_tag| Tag rimosso da documento                       |
| `field.updated`       | document_field | Valore campo custom aggiornato              |
| `preset_field.created`| preset_field| Campo custom aggiunto a preset                 |
| `preset_field.deleted`| preset_field| Campo custom rimosso                           |
| `settings.updated`    | settings    | Impostazione modificata                        |

### 4.3 Preset di Sistema (seed data)

Questi vengono inseriti al primo avvio dell'app:

```sql
-- Categorie di sistema
INSERT INTO categories (id, name, slug, icon, color, is_system, sort_order) VALUES
('cat-bolletta-luce',   'Bolletta Luce',       'bolletta-luce',      'zap',        '#f59e0b', 1, 1),
('cat-bolletta-gas',    'Bolletta Gas',         'bolletta-gas',       'flame',      '#ef4444', 1, 2),
('cat-bolletta-acqua',  'Bolletta Acqua',       'bolletta-acqua',     'droplet',    '#3b82f6', 1, 3),
('cat-affitto',         'Affitto',              'affitto',            'home',       '#8b5cf6', 1, 4),
('cat-cert-medico',     'Certificato Medico',   'certificato-medico', 'heart-pulse','#ec4899', 1, 5),
('cat-documento-id',    'Documento Identità',   'documento-identita', 'id-card',    '#06b6d4', 1, 6),
('cat-contratto',       'Contratto',            'contratto',          'file-text',  '#10b981', 1, 7),
('cat-ricevuta',        'Ricevuta / Fattura',   'ricevuta-fattura',   'receipt',    '#64748b', 1, 8),
('cat-assicurazione',   'Assicurazione',        'assicurazione',      'shield',     '#f97316', 1, 9),
('cat-altro',           'Altro',                'altro',              'folder',     '#94a3b8', 1, 99);

-- Campi custom per "Bolletta Luce"
INSERT INTO preset_fields (id, category_id, field_name, field_label, field_type, is_required, sort_order) VALUES
('pf-boll-luce-importo',    'cat-bolletta-luce', 'importo',    'Importo (€)',   'number', 1, 1),
('pf-boll-luce-fornitore',  'cat-bolletta-luce', 'fornitore',  'Fornitore',     'text',   0, 2),
('pf-boll-luce-periodo',    'cat-bolletta-luce', 'periodo',    'Periodo',       'text',   0, 3);

-- Campi custom per "Certificato Medico"
INSERT INTO preset_fields (id, category_id, field_name, field_label, field_type, is_required, sort_order) VALUES
('pf-cert-medico-medico',   'cat-cert-medico',   'medico',     'Medico',        'text',   0, 1),
('pf-cert-medico-diagnosi', 'cat-cert-medico',   'diagnosi',   'Diagnosi',      'text',   0, 2),
('pf-cert-medico-struttura','cat-cert-medico',   'struttura',  'Struttura',     'text',   0, 3);

-- Campi custom per "Affitto"
INSERT INTO preset_fields (id, category_id, field_name, field_label, field_type, is_required, sort_order) VALUES
('pf-affitto-importo',      'cat-affitto',       'importo',    'Importo (€)',   'number', 1, 1),
('pf-affitto-proprietario', 'cat-affitto',       'proprietario','Proprietario', 'text',   0, 2),
('pf-affitto-indirizzo',    'cat-affitto',       'indirizzo',  'Indirizzo',     'text',   0, 3);

-- Campi custom per "Documento Identità"
INSERT INTO preset_fields (id, category_id, field_name, field_label, field_type, is_required, sort_order) VALUES
('pf-doc-id-numero',        'cat-documento-id',  'numero',     'Numero Doc.',   'text',   1, 1),
('pf-doc-id-ente',          'cat-documento-id',  'ente',       'Ente Rilascio', 'text',   0, 2);

-- Campi custom per "Assicurazione"
INSERT INTO preset_fields (id, category_id, field_name, field_label, field_type, is_required, sort_order) VALUES
('pf-assic-compagnia',      'cat-assicurazione', 'compagnia',  'Compagnia',     'text',   0, 1),
('pf-assic-polizza',        'cat-assicurazione', 'polizza',    'N. Polizza',    'text',   0, 2),
('pf-assic-premio',         'cat-assicurazione', 'premio',     'Premio (€)',    'number', 0, 3);

-- Campi custom per "Contratto"
INSERT INTO preset_fields (id, category_id, field_name, field_label, field_type, is_required, sort_order) VALUES
('pf-contratto-controparte','cat-contratto',     'controparte','Controparte',   'text',   0, 1),
('pf-contratto-tipo',       'cat-contratto',     'tipo',       'Tipo Contratto','text',   0, 2),
('pf-contratto-valore',     'cat-contratto',     'valore',     'Valore (€)',    'number', 0, 3);
```

---

## 5. Strutture Dati e Classi

### 5.1 Modelli Rust (src-tauri/src/models/)

#### document.rs

```rust
use serde::{Deserialize, Serialize};

/// Rappresenta un documento catalogato nel database.
/// Usato per serializzazione/deserializzazione tra backend e frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: String,                    // UUID v4
    pub title: String,                 // Nome assegnato dall'utente
    pub original_name: String,         // Nome file originale
    pub file_extension: String,        // ".pdf", ".jpg"
    pub file_size: i64,                // Dimensione in bytes
    pub file_hash: String,             // SHA-256
    pub mime_type: String,             // MIME type
    pub storage_path: String,          // Path relativo
    pub category_id: String,           // FK categories
    pub document_date: String,         // YYYY-MM-DD
    pub expiry_date: Option<String>,   // YYYY-MM-DD opzionale
    pub notes: String,                 // Note utente
    pub ocr_text: Option<String>,      // Testo OCR
    pub is_favorite: bool,
    pub created_at: String,            // ISO 8601
    pub updated_at: String,            // ISO 8601
    pub deleted_at: Option<String>,    // Soft delete
}

/// Payload per la creazione di un nuovo documento.
/// Ricevuto dal frontend via invoke().
#[derive(Debug, Deserialize)]
pub struct CreateDocumentPayload {
    pub title: String,
    pub source_file_path: String,      // Path assoluto del file sorgente
    pub category_id: String,
    pub document_date: String,         // YYYY-MM-DD
    pub expiry_date: Option<String>,
    pub notes: String,
    pub tags: Vec<String>,             // Nomi tag (creati se non esistono)
    pub custom_fields: Vec<CustomFieldValue>, // Valori campi custom
    pub run_ocr: bool,                 // Se eseguire OCR
}

/// Payload per la modifica di un documento esistente.
/// Modifica solo metadati, non il file.
#[derive(Debug, Deserialize)]
pub struct UpdateDocumentPayload {
    pub id: String,
    pub title: Option<String>,
    pub category_id: Option<String>,
    pub document_date: Option<String>,
    pub expiry_date: Option<String>,
    pub notes: Option<String>,
    pub tags: Option<Vec<String>>,
    pub custom_fields: Option<Vec<CustomFieldValue>>,
    pub is_favorite: Option<bool>,
}

/// Singolo valore di campo custom.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomFieldValue {
    pub field_id: String,              // FK preset_fields.id
    pub value: String,                 // Valore inserito
}

/// Documento con tutti i dati relazionali inclusi.
/// Usato per la visualizzazione dettaglio.
#[derive(Debug, Serialize)]
pub struct DocumentDetail {
    pub document: Document,
    pub category: Category,
    pub tags: Vec<Tag>,
    pub custom_fields: Vec<CustomFieldWithValue>,
}

/// Campo custom con il suo valore per un dato documento.
#[derive(Debug, Serialize)]
pub struct CustomFieldWithValue {
    pub field_id: String,
    pub field_name: String,
    pub field_label: String,
    pub field_type: String,
    pub field_options: Option<Vec<String>>,
    pub value: String,
}
```

#### category.rs

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub icon: String,
    pub color: String,
    pub is_system: bool,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCategoryPayload {
    pub name: String,
    pub icon: Option<String>,          // Default: "folder"
    pub color: Option<String>,         // Default: "#3b82f6"
    pub fields: Vec<CreatePresetFieldPayload>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCategoryPayload {
    pub id: String,
    pub name: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub sort_order: Option<i32>,
}
```

#### tag.rs

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
    pub created_at: String,
}
```

#### preset_field.rs

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresetField {
    pub id: String,
    pub category_id: String,
    pub field_name: String,
    pub field_label: String,
    pub field_type: String,            // "text" | "number" | "date" | "select"
    pub field_options: Option<Vec<String>>, // Solo per "select"
    pub is_required: bool,
    pub sort_order: i32,
    pub created_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePresetFieldPayload {
    pub field_name: String,
    pub field_label: String,
    pub field_type: String,
    pub field_options: Option<Vec<String>>,
    pub is_required: bool,
}
```

#### event_log.rs

```rust
use serde::{Deserialize, Serialize};

/// Singola entry nell'event log per sync.
/// Formato compatibile con NDJSON su Google Drive.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventLogEntry {
    pub event_id: String,              // UUID v4
    pub device_id: String,             // UUID del dispositivo
    pub event_type: String,            // Es: "document.created"
    pub entity_type: String,           // Es: "document"
    pub entity_id: String,             // UUID dell'entità
    pub payload: serde_json::Value,    // JSON con dati completi
    pub timestamp: String,             // ISO 8601 con ms
}

/// Snapshot periodico del database.
/// Salvato su Google Drive ogni N eventi.
#[derive(Debug, Serialize, Deserialize)]
pub struct SyncSnapshot {
    pub snapshot_id: String,
    pub device_id: String,
    pub event_count: i64,              // Ultimo event_log.id incluso
    pub timestamp: String,
    pub data: SyncSnapshotData,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncSnapshotData {
    pub categories: Vec<Category>,
    pub preset_fields: Vec<PresetField>,
    pub documents: Vec<Document>,
    pub document_fields: Vec<DocumentFieldRecord>,
    pub tags: Vec<Tag>,
    pub document_tags: Vec<DocumentTagRecord>,
    pub settings: Vec<SettingRecord>,
}
```

#### settings.rs

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub storage_path: String,          // Cartella base
    pub device_id: String,             // UUID dispositivo
    pub setup_complete: bool,
    pub license_status: String,        // "free" | "pro"
    pub theme: String,                 // "light" | "dark" | "system"
    pub language: String,              // "it" | "en"
    pub last_sync_at: Option<String>,  // ISO 8601
}
```

### 5.2 Strutture Frontend (JS)

#### store.js — State Manager

```js
/**
 * Store centralizzato con pattern pub/sub.
 *
 * Stato iniziale:
 * {
 *   settings: AppSettings | null,
 *   documents: Document[],
 *   categories: Category[],
 *   tags: Tag[],
 *   searchQuery: string,
 *   searchFilters: SearchFilters,
 *   searchResults: Document[],
 *   currentPage: string,
 *   selectedDocument: DocumentDetail | null,
 *   isLoading: boolean,
 *   isSyncing: boolean,
 *   toasts: Toast[]
 * }
 *
 * Metodi pubblici:
 * - getState()           → oggetto stato corrente (read-only)
 * - setState(partial)    → merge parziale dello stato, notifica listeners
 * - subscribe(key, fn)   → registra callback su cambio di una chiave
 * - unsubscribe(key, fn) → rimuove callback
 */
```

#### SearchFilters (oggetto JS)

```js
/**
 * @typedef {Object} SearchFilters
 * @property {string}   query        - Testo libero (FTS)
 * @property {string}   categoryId   - UUID categoria o '' per tutte
 * @property {string[]} tagIds       - UUID tag selezionati
 * @property {string}   dateFrom     - YYYY-MM-DD inizio range
 * @property {string}   dateTo       - YYYY-MM-DD fine range
 * @property {number}   yearFilter   - Anno specifico (0 = tutti)
 * @property {number}   monthFilter  - Mese specifico (0 = tutti)
 * @property {boolean}  favoritesOnly - Solo preferiti
 * @property {boolean}  expiringOnly  - Solo in scadenza (<30gg)
 * @property {string}   sortBy       - 'date_desc' | 'date_asc' | 'title_asc' | 'created_desc'
 * @property {number}   page         - Pagina corrente (0-indexed)
 * @property {number}   pageSize     - Documenti per pagina (default: 24)
 */
```

---

## 6. Moduli Backend (Rust)

### 6.1 Comandi Tauri — Firma Completa

Ogni comando è registrato in `main.rs` via `.invoke_handler(tauri::generate_handler![...])`.

#### commands/documents.rs

```rust
/// Crea un nuovo documento:
/// 1. Calcola SHA-256 del file sorgente
/// 2. Verifica duplicati (stessa hash)
/// 3. Genera UUID, costruisce storage_path
/// 4. Copia il file nella cartella gestita
/// 5. Esegue OCR se richiesto
/// 6. Inserisce record in DB
/// 7. Inserisce tag (crea quelli nuovi)
/// 8. Inserisce valori campi custom
/// 9. Scrive evento nell'event_log
/// Ritorna il Document creato.
#[tauri::command]
async fn create_document(
    payload: CreateDocumentPayload,
    app_handle: tauri::AppHandle,
) -> Result<Document, String>

/// Aggiorna metadati di un documento esistente.
/// NON modifica il file fisico.
/// Se category_id cambia, sposta il file nella nuova cartella.
/// Scrive evento nell'event_log.
#[tauri::command]
async fn update_document(
    payload: UpdateDocumentPayload,
    app_handle: tauri::AppHandle,
) -> Result<Document, String>

/// Soft-delete: imposta deleted_at.
/// NON elimina il file fisico (rimane esplorabile).
/// Scrive evento nell'event_log.
#[tauri::command]
async fn delete_document(
    id: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String>

/// Ripristina un documento soft-deleted.
#[tauri::command]
async fn restore_document(
    id: String,
    app_handle: tauri::AppHandle,
) -> Result<Document, String>

/// Elimina definitivamente un documento:
/// rimuove record DB, file fisico, eventi associati.
/// Usato solo per pulizia manuale.
#[tauri::command]
async fn purge_document(
    id: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String>

/// Ritorna il dettaglio completo di un documento
/// con categoria, tag e campi custom.
#[tauri::command]
async fn get_document(
    id: String,
    app_handle: tauri::AppHandle,
) -> Result<DocumentDetail, String>

/// Ritorna il path assoluto del file per il visualizzatore.
#[tauri::command]
async fn get_document_file_path(
    id: String,
    app_handle: tauri::AppHandle,
) -> Result<String, String>
```

#### commands/search.rs

```rust
/// Ricerca avanzata con filtri multipli.
/// Usa FTS5 per ricerca testuale, JOIN per filtri relazionali.
/// Ritorna risultati paginati con conteggio totale.
///
/// Query SQL generata dinamicamente in base ai filtri attivi:
///   SELECT d.*, c.name as category_name, c.color as category_color
///   FROM documents d
///   JOIN categories c ON d.category_id = c.id
///   [LEFT JOIN documents_fts ON ...]
///   [JOIN document_tags dt ON ...]
///   WHERE d.deleted_at IS NULL
///   [AND d.category_id = ?]
///   [AND d.document_date BETWEEN ? AND ?]
///   [AND documents_fts MATCH ?]
///   [AND dt.tag_id IN (?)]
///   [AND d.is_favorite = 1]
///   [AND d.expiry_date <= date('now', '+30 days')]
///   ORDER BY [sortBy]
///   LIMIT ? OFFSET ?
#[tauri::command]
async fn search_documents(
    filters: SearchFilters,
    app_handle: tauri::AppHandle,
) -> Result<SearchResult, String>

/// Risultato paginato della ricerca.
#[derive(Serialize)]
pub struct SearchResult {
    pub documents: Vec<DocumentListItem>,
    pub total_count: i64,
    pub page: i32,
    pub page_size: i32,
    pub total_pages: i32,
}

/// Documento nella lista (senza dettaglio completo).
#[derive(Serialize)]
pub struct DocumentListItem {
    pub id: String,
    pub title: String,
    pub file_extension: String,
    pub file_size: i64,
    pub mime_type: String,
    pub storage_path: String,
    pub category_id: String,
    pub category_name: String,
    pub category_color: String,
    pub document_date: String,
    pub expiry_date: Option<String>,
    pub is_favorite: bool,
    pub tags: Vec<TagBrief>,          // Solo id + name
    pub created_at: String,
}

/// Ritorna suggerimenti autocomplete per la barra di ricerca.
/// Cerca tra titoli, tag e note.
#[tauri::command]
async fn search_suggestions(
    query: String,
    app_handle: tauri::AppHandle,
) -> Result<Vec<String>, String>

/// Ritorna statistiche aggregate per la dashboard.
#[tauri::command]
async fn get_stats(
    app_handle: tauri::AppHandle,
) -> Result<DashboardStats, String>

#[derive(Serialize)]
pub struct DashboardStats {
    pub total_documents: i64,
    pub documents_this_month: i64,
    pub total_categories: i64,
    pub total_tags: i64,
    pub total_size_bytes: i64,
    pub expiring_soon: i64,            // Entro 30 giorni
    pub by_category: Vec<CategoryStat>,// Conteggio per categoria
    pub by_month: Vec<MonthlyStat>,    // Ultimi 12 mesi
}
```

#### commands/categories.rs

```rust
#[tauri::command]
async fn list_categories(app_handle: tauri::AppHandle) -> Result<Vec<Category>, String>

#[tauri::command]
async fn create_category(
    payload: CreateCategoryPayload,
    app_handle: tauri::AppHandle,
) -> Result<Category, String>

/// Modifica categoria. Non permette modifica di categorie is_system=1
/// tranne per icon e color.
#[tauri::command]
async fn update_category(
    payload: UpdateCategoryPayload,
    app_handle: tauri::AppHandle,
) -> Result<Category, String>

/// Elimina categoria custom (soft delete).
/// Rifiuta se ha documenti associati non eliminati.
#[tauri::command]
async fn delete_category(
    id: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String>

/// Ritorna i campi custom di una categoria.
#[tauri::command]
async fn get_preset_fields(
    category_id: String,
    app_handle: tauri::AppHandle,
) -> Result<Vec<PresetField>, String>

/// Aggiunge un campo custom a una categoria.
#[tauri::command]
async fn add_preset_field(
    payload: CreatePresetFieldPayload,
    category_id: String,
    app_handle: tauri::AppHandle,
) -> Result<PresetField, String>

/// Rimuove un campo custom (soft delete).
#[tauri::command]
async fn remove_preset_field(
    field_id: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String>
```

#### commands/tags.rs

```rust
#[tauri::command]
async fn list_tags(app_handle: tauri::AppHandle) -> Result<Vec<Tag>, String>

#[tauri::command]
async fn create_tag(name: String, color: Option<String>, app_handle: tauri::AppHandle) -> Result<Tag, String>

#[tauri::command]
async fn delete_tag(id: String, app_handle: tauri::AppHandle) -> Result<(), String>

/// Ritorna tag con conteggio documenti associati.
#[tauri::command]
async fn list_tags_with_count(app_handle: tauri::AppHandle) -> Result<Vec<TagWithCount>, String>
```

#### commands/files.rs

```rust
/// Apre il file manager di sistema nella cartella del documento.
#[tauri::command]
async fn reveal_in_file_manager(document_id: String, app_handle: tauri::AppHandle) -> Result<(), String>

/// Apre il file con l'applicazione di sistema predefinita.
#[tauri::command]
async fn open_with_system(document_id: String, app_handle: tauri::AppHandle) -> Result<(), String>

/// Ritorna il contenuto del file come bytes (base64)
/// per il visualizzatore integrato.
#[tauri::command]
async fn read_file_bytes(document_id: String, app_handle: tauri::AppHandle) -> Result<Vec<u8>, String>

/// Ritorna il testo di un file Markdown.
#[tauri::command]
async fn read_file_text(document_id: String, app_handle: tauri::AppHandle) -> Result<String, String>
```

#### commands/settings.rs

```rust
#[tauri::command]
async fn get_settings(app_handle: tauri::AppHandle) -> Result<AppSettings, String>

#[tauri::command]
async fn update_setting(key: String, value: String, app_handle: tauri::AppHandle) -> Result<(), String>

/// Wizard primo avvio: imposta storage_path,
/// crea la struttura cartelle, inserisce seed data.
#[tauri::command]
async fn complete_setup(storage_path: String, app_handle: tauri::AppHandle) -> Result<AppSettings, String>

/// Verifica che la cartella di storage esista e sia scrivibile.
#[tauri::command]
async fn validate_storage_path(path: String) -> Result<bool, String>
```

#### commands/ocr.rs

```rust
/// Esegue OCR su un file immagine o PDF.
/// Usa Tesseract via leptess binding Rust.
/// Lingue supportate: ita, eng (configurabile).
/// Salva il testo estratto in documents.ocr_text.
#[tauri::command]
async fn run_ocr(
    document_id: String,
    languages: Vec<String>,         // ["ita", "eng"]
    app_handle: tauri::AppHandle,
) -> Result<String, String>         // Ritorna il testo estratto
```

#### commands/export.rs

```rust
/// Esporta i documenti filtrati in un file CSV.
/// Colonne: titolo, categoria, data, scadenza, tag, note, campi_custom, path_file
/// Ritorna il path del file CSV generato.
#[tauri::command]
async fn export_csv(
    filters: SearchFilters,
    output_path: String,
    app_handle: tauri::AppHandle,
) -> Result<String, String>
```

#### commands/backup.rs

```rust
/// Crea un backup ZIP completo:
/// - docvault.db (copia del database)
/// - Tutti i file nella cartella gestita
/// Ritorna il path del file ZIP.
#[tauri::command]
async fn create_backup(
    output_path: String,
    app_handle: tauri::AppHandle,
) -> Result<String, String>

/// Ripristina da backup ZIP.
/// Sovrascrive DB e file locali.
/// ATTENZIONE: operazione distruttiva.
#[tauri::command]
async fn restore_backup(
    zip_path: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String>
```

#### commands/sync.rs

```rust
/// Avvia il processo di sync con Google Drive.
/// 1. Verifica token OAuth2 valido
/// 2. Scarica event log remoto (NDJSON)
/// 3. Scarica snapshot più recente (se esistente)
/// 4. Merge eventi remoti con locali (risoluzione conflitti)
/// 5. Applica eventi remoti mancanti al DB locale
/// 6. Scarica file binari mancanti
/// 7. Carica eventi locali non sincronizzati
/// 8. Carica file binari nuovi
/// 9. Aggiorna flag synced nell'event_log
/// 10. Crea nuovo snapshot se necessario (ogni 100 eventi)
/// Ritorna report del sync.
#[tauri::command]
async fn sync_now(app_handle: tauri::AppHandle) -> Result<SyncReport, String>

#[derive(Serialize)]
pub struct SyncReport {
    pub events_downloaded: i32,
    pub events_uploaded: i32,
    pub files_downloaded: i32,
    pub files_uploaded: i32,
    pub conflicts_resolved: i32,
    pub errors: Vec<String>,
    pub duration_ms: i64,
}

/// Avvia il flusso OAuth2 PKCE per Google.
/// Apre il browser di sistema per il login.
/// Ritorna il token di accesso.
#[tauri::command]
async fn google_auth_start(app_handle: tauri::AppHandle) -> Result<(), String>

/// Callback OAuth2 — riceve il code e scambia per token.
#[tauri::command]
async fn google_auth_callback(code: String, app_handle: tauri::AppHandle) -> Result<GoogleTokens, String>

/// Verifica stato autenticazione Google.
#[tauri::command]
async fn google_auth_status(app_handle: tauri::AppHandle) -> Result<GoogleAuthStatus, String>

/// Logout da Google: rimuove token salvati.
#[tauri::command]
async fn google_auth_logout(app_handle: tauri::AppHandle) -> Result<(), String>

#[derive(Serialize)]
pub struct GoogleAuthStatus {
    pub is_authenticated: bool,
    pub email: Option<String>,
    pub last_sync: Option<String>,
}
```

#### commands/license.rs

```rust
/// Verifica se la licenza Pro è attiva.
/// La licenza è un codice firmato che contiene:
/// - email utente
/// - data acquisto
/// - firma HMAC
/// Verificato offline.
#[tauri::command]
async fn verify_license(
    license_key: String,
    app_handle: tauri::AppHandle,
) -> Result<LicenseStatus, String>

#[tauri::command]
async fn get_license_status(app_handle: tauri::AppHandle) -> Result<LicenseStatus, String>

#[derive(Serialize)]
pub struct LicenseStatus {
    pub is_pro: bool,
    pub email: Option<String>,
    pub activated_at: Option<String>,
}
```

### 6.2 Utility Rust

#### utils/hash.rs

```rust
use sha2::{Sha256, Digest};
use std::path::Path;
use std::fs::File;
use std::io::Read;

/// Calcola SHA-256 di un file.
/// Legge in chunk da 8KB per file grandi.
pub fn sha256_file(path: &Path) -> Result<String, std::io::Error> {
    let mut file = File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];
    loop {
        let bytes_read = file.read(&mut buffer)?;
        if bytes_read == 0 { break; }
        hasher.update(&buffer[..bytes_read]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}
```

#### utils/file_ops.rs

```rust
/// Genera il path di storage relativo per un documento.
///
/// Formula: {category_slug}/{year}/{YYYYMMDD}_{sanitized_title}.{ext}
///
/// Esempio: "bolletta-luce/2026/20260115_bolletta_gennaio.pdf"
///
/// Se il file esiste già, appende "_N" prima dell'estensione:
///   "bolletta-luce/2026/20260115_bolletta_gennaio_2.pdf"
pub fn generate_storage_path(
    category_slug: &str,
    document_date: &str,     // YYYY-MM-DD
    title: &str,
    extension: &str,
    base_path: &Path,
) -> String

/// Sanitizza una stringa per uso come nome file.
/// - Converte a lowercase
/// - Sostituisce spazi con underscore
/// - Rimuove caratteri speciali (mantiene a-z, 0-9, _, -)
/// - Tronca a 60 caratteri
pub fn sanitize_filename(name: &str) -> String

/// Crea le directory intermedie se non esistono.
/// Es: crea "bolletta-luce/2026/" dentro il base_path.
pub fn ensure_directory(path: &Path) -> Result<(), std::io::Error>

/// Copia un file dalla sorgente alla destinazione.
/// Verifica che l'hash corrisponda dopo la copia.
pub fn copy_and_verify(
    source: &Path,
    dest: &Path,
    expected_hash: &str,
) -> Result<(), String>
```

---

## 7. Moduli Frontend (Vanilla JS)

### 7.1 Router (router.js)

```js
/**
 * Router SPA basato su hash (#/).
 *
 * Route definite:
 *   '#/'              → pages/home.js        (Dashboard + Ricerca)
 *   '#/add'           → pages/add-document.js (Aggiungi documento)
 *   '#/edit/:id'      → pages/edit-document.js(Modifica documento)
 *   '#/view/:id'      → pages/view-document.js(Dettaglio + Viewer)
 *   '#/categories'    → pages/categories.js   (Gestione categorie)
 *   '#/settings'      → pages/settings.js     (Impostazioni)
 *   '#/setup'         → pages/setup.js        (Wizard primo avvio)
 *   '#/sync'          → pages/sync.js         (Sync Google Drive)
 *   '#/backup'        → pages/backup.js       (Backup/Restore)
 *   '#/expiring'      → pages/expiring.js     (Documenti in scadenza)
 *
 * Metodi:
 *   - init()                → ascolta hashchange, renderizza route iniziale
 *   - navigate(hash)        → cambia hash programmaticamente
 *   - getParam(name)        → estrae parametro dalla route (:id)
 *   - onBeforeNavigate(fn)  → hook pre-navigazione (per conferme unsaved)
 *
 * Implementazione:
 *   - Ascolta window.hashchange
 *   - Matcha hash con regex pattern delle route
 *   - Chiama la funzione render() della pagina corrispondente
 *   - Inietta HTML nel container #app-content
 *   - Chiama mount() per binding eventi
 */
```

### 7.2 API Wrapper (api.js)

```js
/**
 * Wrapper per tutte le chiamate Tauri invoke().
 * Centralizza error handling e logging.
 *
 * Ogni metodo corrisponde 1:1 a un comando Rust.
 *
 * Pattern:
 *   export async function createDocument(payload) {
 *       try {
 *           return await window.__TAURI__.core.invoke('create_document', { payload });
 *       } catch (error) {
 *           console.error('createDocument failed:', error);
 *           throw error;
 *       }
 *   }
 *
 * Metodi disponibili (raggruppati per modulo):
 *
 * === DOCUMENTS ===
 * createDocument(payload: CreateDocumentPayload) → Document
 * updateDocument(payload: UpdateDocumentPayload) → Document
 * deleteDocument(id: string) → void
 * restoreDocument(id: string) → Document
 * purgeDocument(id: string) → void
 * getDocument(id: string) → DocumentDetail
 * getDocumentFilePath(id: string) → string
 *
 * === SEARCH ===
 * searchDocuments(filters: SearchFilters) → SearchResult
 * searchSuggestions(query: string) → string[]
 * getStats() → DashboardStats
 *
 * === CATEGORIES ===
 * listCategories() → Category[]
 * createCategory(payload: CreateCategoryPayload) → Category
 * updateCategory(payload: UpdateCategoryPayload) → Category
 * deleteCategory(id: string) → void
 * getPresetFields(categoryId: string) → PresetField[]
 * addPresetField(categoryId: string, payload: CreatePresetFieldPayload) → PresetField
 * removePresetField(fieldId: string) → void
 *
 * === TAGS ===
 * listTags() → Tag[]
 * createTag(name: string, color?: string) → Tag
 * deleteTag(id: string) → void
 * listTagsWithCount() → TagWithCount[]
 *
 * === FILES ===
 * revealInFileManager(documentId: string) → void
 * openWithSystem(documentId: string) → void
 * readFileBytes(documentId: string) → Uint8Array
 * readFileText(documentId: string) → string
 *
 * === SETTINGS ===
 * getSettings() → AppSettings
 * updateSetting(key: string, value: string) → void
 * completeSetup(storagePath: string) → AppSettings
 * validateStoragePath(path: string) → boolean
 *
 * === OCR ===
 * runOcr(documentId: string, languages: string[]) → string
 *
 * === EXPORT ===
 * exportCsv(filters: SearchFilters, outputPath: string) → string
 *
 * === BACKUP ===
 * createBackup(outputPath: string) → string
 * restoreBackup(zipPath: string) → void
 *
 * === SYNC ===
 * syncNow() → SyncReport
 * googleAuthStart() → void
 * googleAuthCallback(code: string) → GoogleTokens
 * googleAuthStatus() → GoogleAuthStatus
 * googleAuthLogout() → void
 *
 * === LICENSE ===
 * verifyLicense(licenseKey: string) → LicenseStatus
 * getLicenseStatus() → LicenseStatus
 */
```

### 7.3 DOM Utilities (utils/dom.js)

```js
/**
 * Helper DOM per ridurre boilerplate.
 *
 * $(selector)         → document.querySelector(selector)
 * $$(selector)        → [...document.querySelectorAll(selector)]
 * html(el, content)   → el.innerHTML = content (sanitizzato)
 * on(el, event, fn)   → el.addEventListener(event, fn)
 * off(el, event, fn)  → el.removeEventListener(event, fn)
 * create(tag, attrs, children) → crea elemento DOM
 * show(el)            → el.classList.remove('hidden')
 * hide(el)            → el.classList.add('hidden')
 * toggle(el)          → el.classList.toggle('hidden')
 */
```

### 7.4 Componente Esempio: document-card.js

```js
/**
 * Renderizza una card documento nella griglia.
 *
 * @param {DocumentListItem} doc - Documento da renderizzare
 * @returns {string} HTML della card
 *
 * Struttura HTML:
 * <div class="doc-card" data-id="{id}">
 *   <div class="doc-card__preview">
 *     <!-- Thumbnail: icona tipo file o miniatura immagine -->
 *   </div>
 *   <div class="doc-card__body">
 *     <span class="doc-card__category" style="background:{color}">{category}</span>
 *     <h3 class="doc-card__title">{title}</h3>
 *     <p class="doc-card__date">{formatted_date}</p>
 *     <div class="doc-card__tags">
 *       <!-- Tag badges -->
 *     </div>
 *   </div>
 *   <div class="doc-card__actions">
 *     <button data-action="view">👁</button>
 *     <button data-action="edit">✏</button>
 *     <button data-action="favorite">{⭐/☆}</button>
 *   </div>
 * </div>
 *
 * Eventi (delegati dal parent document-grid):
 *   click [data-action="view"]     → router.navigate('#/view/' + id)
 *   click [data-action="edit"]     → router.navigate('#/edit/' + id)
 *   click [data-action="favorite"] → api.updateDocument({ id, is_favorite: !current })
 */
```

---

## 8. Sistema di File e Cartelle

### 8.1 Struttura Cartella Gestita

```
[storage_path]/                        ← Cartella scelta dall'utente in setup
├── .docvault/                         ← Metadati app (nascosta)
│   ├── docvault.db                    ← Database SQLite
│   ├── config.json                    ← Configurazione base
│   └── thumbnails/                    ← Cache thumbnail immagini
│       └── {document_id}.jpg          ← 200x200px JPEG thumbnail
│
├── bolletta-luce/                     ← Cartella categoria (slug)
│   ├── 2025/
│   │   ├── 20250315_bolletta_marzo.pdf
│   │   └── 20250615_bolletta_giugno.pdf
│   └── 2026/
│       └── 20260115_bolletta_gennaio.pdf
│
├── affitto/
│   └── 2026/
│       ├── 20260101_ricevuta_gennaio.pdf
│       └── 20260201_ricevuta_febbraio.pdf
│
├── certificato-medico/
│   └── 2026/
│       └── 20260310_certificato_visite.pdf
│
├── documento-identita/
│   └── 2026/
│       └── 20260520_carta_identita.jpg
│
└── altro/
    └── 2026/
        └── 20260604_documento_vario.pdf
```

### 8.2 Regole di Naming

| Elemento | Formato | Esempio |
|----------|---------|---------|
| Cartella categoria | `{slug}` (lowercase, hyphen-separated) | `bolletta-luce` |
| Cartella anno | `{YYYY}` | `2026` |
| Nome file | `{YYYYMMDD}_{sanitized_title}.{ext}` | `20260115_bolletta_gennaio.pdf` |
| Nome file duplicato | `{YYYYMMDD}_{sanitized_title}_{N}.{ext}` | `20260115_bolletta_gennaio_2.pdf` |
| Thumbnail | `{document_id}.jpg` | `a1b2c3d4-e5f6-7890.jpg` |

### 8.3 MIME Types Supportati

| Tipo | Estensioni | MIME Type | Viewer |
|------|------------|-----------|--------|
| Immagine | .jpg, .jpeg, .png, .gif, .webp, .bmp, .tiff | image/* | image-viewer.js |
| PDF | .pdf | application/pdf | pdf-viewer.js (pdfjs) |
| Markdown | .md, .markdown | text/markdown | md-viewer.js (marked) |
| Word | .doc, .docx | application/msword, application/vnd.openxmlformats* | Solo icona + open_with_system |
| Testo | .txt, .csv, .log | text/plain, text/csv | md-viewer.js (raw) |
| Foglio calcolo | .xls, .xlsx | application/vnd.ms-excel* | Solo icona + open_with_system |
| Archivio | .zip, .rar, .7z | application/* | Solo icona |

---

## 9. Sistema di Preset e Campi Custom

### 9.1 Flusso di Creazione Documento

```
1. Utente clicca "Aggiungi Documento"
2. Seleziona file da filesystem (tauri-plugin-dialog)
3. App mostra form con:
   a. Selettore preset/categoria (obbligatorio)
   b. Campi base: titolo, data documento, data scadenza, note
   c. Campi tag (autocomplete + creazione inline)
   d. Checkbox "Esegui OCR"
4. Utente seleziona una categoria
5. App carica campi custom del preset (via getPresetFields)
6. Form si espande con campi custom (dinamici)
7. Utente compila e conferma
8. Backend: crea record, copia file, esegue OCR se richiesto
9. Redirect a dettaglio documento
```

### 9.2 Creazione Preset Custom

```
1. Utente va in Impostazioni → Categorie
2. Clicca "Nuova Categoria"
3. Compila: nome, icona (lista predefinita), colore
4. Aggiunge campi custom:
   - Per ogni campo: nome, label, tipo (text/number/date/select), obbligatorio?
   - Per tipo "select": definisce le opzioni
5. Salva → crea categoria + preset_fields
6. Il nuovo preset appare nella lista durante l'inserimento documenti
```

---

## 10. Visualizzatore Integrato

### 10.1 image-viewer.js

```js
/**
 * Visualizzatore immagini integrato.
 * Nessuna libreria esterna — usa API DOM native.
 *
 * Funzionalità:
 * - Zoom in/out (pinch-to-zoom su mobile, scroll su desktop)
 * - Pan (drag per muovere immagine zoomata)
 * - Fit-to-screen / dimensione reale toggle
 * - Rotazione 90° oraria/antioraria
 * - Navigazione frecce se più documenti immagine nella stessa ricerca
 *
 * Implementazione:
 * - <img> dentro container con overflow:hidden
 * - CSS transform per zoom/rotate
 * - Touch events per mobile: touchstart/touchmove/touchend
 * - Wheel event per zoom desktop
 *
 * API:
 * - render(imageUrl: string, containerId: string) → void
 * - destroy() → cleanup event listeners
 */
```

### 10.2 pdf-viewer.js

```js
/**
 * Visualizzatore PDF integrato.
 * Usa pdfjs-dist (Mozilla) per rendering PDF → Canvas.
 *
 * Setup:
 *   Scaricare pdfjs-dist standalone (non NPM) da:
 *   https://mozilla.github.io/pdf.js/getting_started/
 *   Copiare pdf.mjs e pdf.worker.mjs in src/assets/lib/
 *
 * Funzionalità:
 * - Rendering pagina per pagina (lazy: carica solo pagine visibili)
 * - Navigazione: pagina precedente/successiva, vai a pagina N
 * - Zoom in/out + fit-to-width
 * - Scroll continuo tra pagine
 * - Indicatore pagina corrente / totale
 *
 * Implementazione:
 * - Carica PDF via pdfjsLib.getDocument(data)
 * - Per ogni pagina visibile: page.render({ canvasContext, viewport })
 * - IntersectionObserver per lazy rendering
 * - Viewport calcolato con page.getViewport({ scale })
 *
 * API:
 * - render(pdfData: Uint8Array, containerId: string) → void
 * - goToPage(n: number) → void
 * - setZoom(scale: number) → void
 * - destroy() → cleanup
 */
```

### 10.3 md-viewer.js

```js
/**
 * Visualizzatore Markdown integrato.
 * Usa marked.js per parsing MD → HTML.
 *
 * Setup:
 *   Scaricare marked.min.js da CDN/GitHub release:
 *   https://cdn.jsdelivr.net/npm/marked/marked.min.js
 *   Copiare in src/assets/lib/
 *
 * Funzionalità:
 * - Rendering Markdown → HTML
 * - Syntax highlighting per blocchi codice (opzionale, senza libreria)
 * - Stili tipografici per heading, liste, tabelle, blockquote
 * - Sanitizzazione output (no script injection)
 *
 * Implementazione:
 * - const html = marked.parse(markdownString)
 * - Inietta in container con classi Tailwind prose-like
 * - Sanitizza con DOMPurify se necessario (o usa marked con sanitize option)
 *
 * API:
 * - render(markdown: string, containerId: string) → void
 * - destroy() → void
 */
```

---

## 11. Sistema di Sync Google Drive

### 11.1 Architettura Sync

```
                    ┌─────────────────────────────────────┐
                    │         GOOGLE DRIVE                 │
                    │                                     │
                    │  /DocVault/                          │
                    │  ├── events.ndjson    (append-only) │
                    │  ├── snapshot_001.json.gz           │
                    │  ├── snapshot_002.json.gz           │
                    │  └── files/                          │
                    │      ├── {file_hash_1}               │
                    │      ├── {file_hash_2}               │
                    │      └── ...                         │
                    └──────────┬────────────┬─────────────┘
                               │            │
                          download       upload
                               │            │
                    ┌──────────▼────────────▼─────────────┐
                    │         SYNC ENGINE (Rust)           │
                    │                                     │
                    │  1. Download events.ndjson           │
                    │  2. Parse & compare con event_log    │
                    │  3. Merge (timestamp + device_id)    │
                    │  4. Apply eventi mancanti al DB      │
                    │  5. Download file binari mancanti    │
                    │  6. Upload eventi locali non-synced  │
                    │  7. Upload file binari nuovi         │
                    │  8. Snapshot se > 100 nuovi eventi   │
                    └─────────────────────────────────────┘
```

### 11.2 OAuth2 PKCE Flow

```
1. Frontend chiama googleAuthStart()
2. Backend genera:
   - code_verifier: random 128 byte base64url
   - code_challenge: SHA-256(code_verifier) base64url
   - state: random 32 byte
3. Backend apre browser a:
   https://accounts.google.com/o/oauth2/v2/auth?
     client_id={GOOGLE_CLIENT_ID}
     &redirect_uri=http://localhost:{PORT}/callback
     &response_type=code
     &scope=https://www.googleapis.com/auth/drive.file email profile
     &code_challenge={code_challenge}
     &code_challenge_method=S256
     &state={state}
     &access_type=offline
     &prompt=consent
4. Utente autorizza su Google
5. Google redirige a localhost:{PORT}/callback?code=...&state=...
6. Backend (server HTTP temporaneo su localhost) cattura il code
7. Backend scambia code per token:
   POST https://oauth2.googleapis.com/token
   {
     client_id, code, code_verifier,
     grant_type: "authorization_code",
     redirect_uri: "http://localhost:{PORT}/callback"
   }
8. Riceve: access_token, refresh_token, expires_in
9. Salva token criptato nel keychain OS (tauri-plugin-os)
10. Chiude server HTTP temporaneo
```

### 11.3 Struttura File Google Drive

```
/DocVault/                                 ← Cartella app su Google Drive
├── events.ndjson                          ← Event log completo (append-only)
├── snapshots/
│   ├── snapshot_20260601T120000Z.json.gz  ← Snapshot periodici
│   └── snapshot_20260604T080000Z.json.gz
└── files/
    ├── a3f5b2c1d8e9...                    ← File binari, nominati con SHA-256 hash
    ├── 7b1c4e9f0a2d...                    ← Nessuna duplicazione (content-addressed)
    └── ...
```

### 11.4 Formato NDJSON Event Log

Ogni riga è un JSON valido (newline-delimited):

```json
{"event_id":"uuid-1","device_id":"device-a","event_type":"document.created","entity_type":"document","entity_id":"doc-uuid-1","payload":{"title":"Bolletta Gennaio","category_id":"cat-bolletta-luce","document_date":"2026-01-15","file_hash":"abc123...","file_extension":".pdf","file_size":524288},"timestamp":"2026-01-15T10:30:00.000Z"}
{"event_id":"uuid-2","device_id":"device-a","event_type":"tag.linked","entity_type":"document_tag","entity_id":"doc-uuid-1","payload":{"tag_id":"tag-uuid-1","tag_name":"deducibile"},"timestamp":"2026-01-15T10:30:01.000Z"}
{"event_id":"uuid-3","device_id":"device-b","event_type":"document.updated","entity_type":"document","entity_id":"doc-uuid-1","payload":{"notes":"Pagata il 20/01"},"timestamp":"2026-01-20T14:00:00.000Z"}
```

### 11.5 Risoluzione Conflitti

Regole applicate durante il merge:

| Scenario | Regola |
|----------|--------|
| Stesso entity_id, stesso campo, timestamp diverso | **Last-write-wins**: vince il timestamp più recente |
| Stesso entity_id, campi diversi | **Merge non-conflittuale**: entrambe le modifiche vengono applicate |
| Create + Delete sullo stesso entity_id | Se delete.timestamp > create.timestamp → l'entità è eliminata |
| Stesso event_id su entrambi i log | **Deduplicazione**: l'evento esiste già, viene ignorato |
| File binario mancante localmente | Download da Drive basato su file_hash |
| File binario mancante su Drive | Upload su Drive con nome = file_hash |

### 11.6 Snapshot

Lo snapshot viene creato quando il numero di eventi non-snapshotted supera 100. Contiene il dump completo del database a quel punto temporale. Al sync, se esiste uno snapshot recente, il client lo usa come base e applica solo gli eventi successivi.

---

## 12. Sistema di Monetizzazione

### 12.1 Modello

| Tier | Prezzo | Funzionalità |
|------|--------|--------------|
| **Free** | €0 | App completa offline: catalogo, ricerca, visualizzatore, OCR, backup manuale, export CSV, preset illimitati |
| **Pro** | €9.99 una tantum | Tutto Free + sync Google Drive + ripristino da backup cloud + supporto prioritario |

### 12.2 Implementazione Licenza

La licenza è un codice alfanumerico acquistato sul sito web del progetto (es. Gumroad, LemonSqueezy, Paddle). Il codice viene verificato offline con questa logica:

```
Formato licenza: XXXXX-XXXXX-XXXXX-XXXXX-CHECK

Verifica:
1. L'utente inserisce il codice nell'app
2. Il backend verifica il formato
3. Il backend verifica il checksum (ultimi 5 caratteri = HMAC-SHA256 dei primi 20, troncato)
4. Se valido: imposta settings.license_status = 'pro'
5. Il codice viene salvato criptato nel database

Alternativa (con validazione online iniziale):
1. L'utente inserisce il codice
2. Il backend chiama l'API del provider di licenze (Gumroad/LemonSqueezy)
3. Se valido: salva licenza localmente
4. Le verifiche successive sono offline (il codice è già salvato)
```

### 12.3 Gate delle Feature Pro

Nel backend, ogni comando che richiede Pro verifica:

```rust
fn require_pro(app_handle: &tauri::AppHandle) -> Result<(), String> {
    let status = get_license_status_internal(app_handle)?;
    if !status.is_pro {
        return Err("PRO_REQUIRED".to_string());
    }
    Ok(())
}
```

Nel frontend, il gate è visuale:

```js
// Esempio: bottone sync
if (settings.license_status === 'pro') {
    // Mostra bottone sync attivo
} else {
    // Mostra bottone con lucchetto + "Attiva Pro per sincronizzare"
}
```

---

## 13. Stile e UI/UX

### 13.1 Design System

```css
/* src/css/input.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --color-bg:        #ffffff;
    --color-surface:   #f8fafc;
    --color-border:    #e2e8f0;
    --color-text:      #0f172a;
    --color-text-muted:#64748b;
    --color-primary:   #2563eb;
    --color-primary-hover: #1d4ed8;
    --radius-sm: 0.375rem;
    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
  }

  .dark {
    --color-bg:        #0f172a;
    --color-surface:   #1e293b;
    --color-border:    #334155;
    --color-text:      #f1f5f9;
    --color-text-muted:#94a3b8;
    --color-primary:   #3b82f6;
    --color-primary-hover: #60a5fa;
  }
}
```

### 13.2 Layout Responsive

```
┌─────────────────────────────────────────────────┐
│  DESKTOP (>= 1024px)                            │
│  ┌──────────┬──────────────────────────────────┐ │
│  │ Sidebar  │  Content Area                    │ │
│  │ (240px)  │                                  │ │
│  │          │  ┌──────────────────────────────┐ │ │
│  │ Logo     │  │ Search Bar + Filters         │ │ │
│  │ Nav      │  └──────────────────────────────┘ │ │
│  │ Links    │  ┌────┐ ┌────┐ ┌────┐ ┌────┐    │ │
│  │          │  │Card│ │Card│ │Card│ │Card│    │ │
│  │ Stats    │  └────┘ └────┘ └────┘ └────┘    │ │
│  │          │  ┌────┐ ┌────┐ ┌────┐ ┌────┐    │ │
│  │          │  │Card│ │Card│ │Card│ │Card│    │ │
│  │          │  └────┘ └────┘ └────┘ └────┘    │ │
│  └──────────┴──────────────────────────────────┘ │
└─────────────────────────────────────────────────┘

┌──────────────────┐
│ MOBILE (< 768px) │
│                  │
│ ┌──────────────┐ │
│ │ Header + ☰   │ │
│ └──────────────┘ │
│ ┌──────────────┐ │
│ │ Search       │ │
│ └──────────────┘ │
│ ┌──────────────┐ │
│ │   Card       │ │
│ └──────────────┘ │
│ ┌──────────────┐ │
│ │   Card       │ │
│ └──────────────┘ │
│ ┌──────────────┐ │
│ │   Card       │ │
│ └──────────────┘ │
│ ┌──────────────┐ │
│ │ Bottom Nav   │ │
│ │ 🏠 ➕ 🔍 ⚙  │ │
│ └──────────────┘ │
└──────────────────┘
```

### 13.3 Breakpoints

| Nome | Min-width | Colonne griglia | Layout |
|------|-----------|-----------------|--------|
| Mobile | 0px | 1 | Stack verticale, bottom nav |
| Tablet | 768px | 2-3 | Stack, sidebar collassabile |
| Desktop | 1024px | 3-4 | Sidebar + content |
| Wide | 1440px | 4-5 | Sidebar + content largo |

---

## 14. Fasi di Implementazione

### Fase 1 — Fondamenta (settimana 1-2)

**Obiettivo**: App funzionante con setup, database e struttura base.

| Step | Task | File coinvolti |
|------|------|---------------|
| 1.1 | Inizializzare progetto Tauri 2 | `cargo tauri init` |
| 1.2 | Configurare Cargo.toml con tutte le dipendenze | `src-tauri/Cargo.toml` |
| 1.3 | Configurare tauri.conf.json | `src-tauri/tauri.conf.json` |
| 1.4 | Setup Tailwind CSS con file input/output | `tailwind.config.js`, `src/css/` |
| 1.5 | Creare struttura directory frontend completa | `src/js/**` |
| 1.6 | Implementare `utils/dom.js` | `src/js/utils/dom.js` |
| 1.7 | Implementare `router.js` | `src/js/router.js` |
| 1.8 | Implementare `store.js` (state management) | `src/js/store.js` |
| 1.9 | Implementare `api.js` (stub con TODO) | `src/js/api.js` |
| 1.10 | Creare `index.html` con layout base | `src/index.html` |
| 1.11 | Implementare schema DB (001_initial.sql) | `src-tauri/migrations/` |
| 1.12 | Implementare `db/schema.rs` (creazione tabelle + seed) | `src-tauri/src/db/schema.rs` |
| 1.13 | Implementare modelli Rust (tutti i file in models/) | `src-tauri/src/models/` |
| 1.14 | Implementare `commands/settings.rs` (get/update/setup) | `src-tauri/src/commands/settings.rs` |
| 1.15 | Implementare pagina Setup wizard | `src/js/pages/setup.js` |
| 1.16 | Implementare `utils/file_ops.rs` | `src-tauri/src/utils/` |
| 1.17 | Registrare comandi in main.rs | `src-tauri/src/main.rs` |

**Criterio di completamento Fase 1**: L'app si avvia, mostra il wizard di setup, l'utente seleziona una cartella, il database viene creato con le categorie di sistema, e l'app naviga alla home (vuota).

---

### Fase 2 — CRUD Documenti (settimana 3-4)

**Obiettivo**: Inserimento, visualizzazione, modifica ed eliminazione documenti.

| Step | Task | File coinvolti |
|------|------|---------------|
| 2.1 | Implementare `utils/hash.rs` (SHA-256) | `src-tauri/src/utils/hash.rs` |
| 2.2 | Implementare `commands/documents.rs` (create) | `src-tauri/src/commands/documents.rs` |
| 2.3 | Implementare `commands/documents.rs` (update, delete, get) | come sopra |
| 2.4 | Implementare `commands/categories.rs` | `src-tauri/src/commands/categories.rs` |
| 2.5 | Implementare `commands/tags.rs` | `src-tauri/src/commands/tags.rs` |
| 2.6 | Implementare `commands/files.rs` | `src-tauri/src/commands/files.rs` |
| 2.7 | Implementare componente `file-picker.js` | `src/js/components/file-picker.js` |
| 2.8 | Implementare componente `tag-input.js` | `src/js/components/tag-input.js` |
| 2.9 | Implementare componente `preset-selector.js` | `src/js/components/preset-selector.js` |
| 2.10 | Implementare componente `custom-field.js` | `src/js/components/custom-field.js` |
| 2.11 | Implementare pagina `add-document.js` | `src/js/pages/add-document.js` |
| 2.12 | Implementare pagina `edit-document.js` | `src/js/pages/edit-document.js` |
| 2.13 | Implementare componente `document-card.js` | `src/js/components/document-card.js` |
| 2.14 | Collegare `api.js` ai comandi reali | `src/js/api.js` |
| 2.15 | Implementare event_log writing per ogni operazione | `src-tauri/src/db/queries.rs` |

**Criterio di completamento Fase 2**: L'utente può aggiungere un documento (selezionando file, compilando form con tag e campi custom), vederlo nella lista, modificare i metadati, eliminarlo (soft delete). I file vengono copiati nella struttura corretta.

---

### Fase 3 — Ricerca e Home (settimana 5-6)

**Obiettivo**: Dashboard funzionante con ricerca full-text e filtri.

| Step | Task | File coinvolti |
|------|------|---------------|
| 3.1 | Implementare `commands/search.rs` (query builder dinamico) | `src-tauri/src/commands/search.rs` |
| 3.2 | Implementare ricerca FTS5 | `src-tauri/src/db/queries.rs` |
| 3.3 | Implementare `commands/search.rs` (suggestions, stats) | come sopra |
| 3.4 | Implementare componente `filter-bar.js` | `src/js/components/filter-bar.js` |
| 3.5 | Implementare componente `document-grid.js` | `src/js/components/document-grid.js` |
| 3.6 | Implementare componente `pagination.js` | `src/js/components/pagination.js` |
| 3.7 | Implementare pagina `home.js` (dashboard + ricerca) | `src/js/pages/home.js` |
| 3.8 | Implementare `utils/debounce.js` per ricerca live | `src/js/utils/debounce.js` |
| 3.9 | Implementare componente `header.js` | `src/js/components/header.js` |
| 3.10 | Implementare componente `sidebar.js` (desktop) | `src/js/components/sidebar.js` |
| 3.11 | Implementare componente `bottom-nav.js` (mobile) | `src/js/components/bottom-nav.js` |

**Criterio di completamento Fase 3**: L'utente può cercare documenti per testo, filtrare per categoria/data/tag, vedere risultati paginati, e la dashboard mostra statistiche aggregate.

---

### Fase 4 — Visualizzatore e Dettaglio (settimana 7-8)

**Obiettivo**: Visualizzazione dettaglio documento con viewer integrati.

| Step | Task | File coinvolti |
|------|------|---------------|
| 4.1 | Integrare pdfjs-dist (copia standalone in assets) | `src/assets/lib/pdf.mjs`, `pdf.worker.mjs` |
| 4.2 | Implementare `viewers/pdf-viewer.js` | `src/js/viewers/pdf-viewer.js` |
| 4.3 | Implementare `viewers/image-viewer.js` | `src/js/viewers/image-viewer.js` |
| 4.4 | Integrare marked.js (copia in assets) | `src/assets/lib/marked.min.js` |
| 4.5 | Implementare `viewers/md-viewer.js` | `src/js/viewers/md-viewer.js` |
| 4.6 | Implementare pagina `view-document.js` | `src/js/pages/view-document.js` |
| 4.7 | Implementare `commands/files.rs` (read_file_bytes) | `src-tauri/src/commands/files.rs` |
| 4.8 | Implementare thumbnail generation per immagini | `src-tauri/src/utils/` |

**Criterio di completamento Fase 4**: L'utente può aprire il dettaglio di un documento, vedere i metadati completi, e visualizzare immagini, PDF e Markdown direttamente nell'app.

---

### Fase 5 — Categorie Custom e Gestione (settimana 9)

**Obiettivo**: Gestione completa categorie, preset e impostazioni.

| Step | Task | File coinvolti |
|------|------|---------------|
| 5.1 | Implementare pagina `categories.js` | `src/js/pages/categories.js` |
| 5.2 | Implementare CRUD campi custom da UI | `src/js/pages/categories.js` |
| 5.3 | Implementare pagina `settings.js` | `src/js/pages/settings.js` |
| 5.4 | Implementare dark mode toggle | `src/js/pages/settings.js`, `src/css/` |
| 5.5 | Implementare componente `modal.js` | `src/js/components/modal.js` |
| 5.6 | Implementare componente `toast.js` | `src/js/components/toast.js` |

**Criterio di completamento Fase 5**: L'utente può creare/modificare/eliminare categorie custom con campi personalizzati, cambiare tema, e riceve feedback visuale (toast) per ogni operazione.

---

### Fase 6 — OCR e Export (settimana 10)

**Obiettivo**: OCR su documenti e export dati.

| Step | Task | File coinvolti |
|------|------|---------------|
| 6.1 | Implementare `commands/ocr.rs` (Tesseract via leptess) | `src-tauri/src/commands/ocr.rs` |
| 6.2 | Aggiungere bottone "Esegui OCR" nel dettaglio documento | `src/js/pages/view-document.js` |
| 6.3 | Implementare `commands/export.rs` (CSV) | `src-tauri/src/commands/export.rs` |
| 6.4 | Aggiungere bottone export nella pagina ricerca | `src/js/pages/home.js` |
| 6.5 | Implementare `commands/backup.rs` (ZIP) | `src-tauri/src/commands/backup.rs` |
| 6.6 | Implementare pagina `backup.js` | `src/js/pages/backup.js` |

**Criterio di completamento Fase 6**: L'utente può eseguire OCR su immagini/PDF e il testo estratto è ricercabile. Può esportare risultati in CSV e creare/ripristinare backup ZIP.

---

### Fase 7 — Scadenze e Notifiche (settimana 11)

**Obiettivo**: Sistema di scadenze con notifiche.

| Step | Task | File coinvolti |
|------|------|---------------|
| 7.1 | Implementare query documenti in scadenza | `src-tauri/src/commands/search.rs` |
| 7.2 | Implementare pagina `expiring.js` | `src/js/pages/expiring.js` |
| 7.3 | Implementare componente `expiry-badge.js` | `src/js/components/expiry-badge.js` |
| 7.4 | Implementare notifiche push (tauri-plugin-notification) | `src-tauri/src/commands/` |
| 7.5 | Implementare check scadenze all'avvio dell'app | `src-tauri/src/main.rs` |

**Criterio di completamento Fase 7**: I documenti con scadenza mostrano badge colorati, una pagina dedicata lista i documenti in scadenza, e notifiche push avvisano l'utente.

---

### Fase 8 — Sync Google Drive (settimana 12-14)

**Obiettivo**: Sincronizzazione completa con Google Drive.

| Step | Task | File coinvolti |
|------|------|---------------|
| 8.1 | Registrare app su Google Cloud Console | Configurazione esterna |
| 8.2 | Implementare `sync/google_auth.rs` (OAuth2 PKCE) | `src-tauri/src/sync/google_auth.rs` |
| 8.3 | Implementare `sync/google_drive.rs` (API wrapper) | `src-tauri/src/sync/google_drive.rs` |
| 8.4 | Implementare `sync/event_store.rs` (NDJSON parse/write) | `src-tauri/src/sync/event_store.rs` |
| 8.5 | Implementare `sync/merge.rs` (risoluzione conflitti) | `src-tauri/src/sync/merge.rs` |
| 8.6 | Implementare `commands/sync.rs` (sync_now) | `src-tauri/src/commands/sync.rs` |
| 8.7 | Implementare upload/download file binari | `src-tauri/src/sync/google_drive.rs` |
| 8.8 | Implementare snapshot creation | `src-tauri/src/sync/event_store.rs` |
| 8.9 | Implementare pagina `sync.js` | `src/js/pages/sync.js` |
| 8.10 | Implementare auto-sync all'avvio (se Pro + online) | `src-tauri/src/main.rs` |

**Criterio di completamento Fase 8**: L'utente Pro può autenticarsi con Google, sincronizzare documenti su Drive, e la sincronizzazione gestisce correttamente conflitti multi-dispositivo.

---

### Fase 9 — Licenza e Monetizzazione (settimana 15)

**Obiettivo**: Sistema di licenza Pro funzionante.

| Step | Task | File coinvolti |
|------|------|---------------|
| 9.1 | Implementare `commands/license.rs` | `src-tauri/src/commands/license.rs` |
| 9.2 | Implementare UI inserimento licenza in settings | `src/js/pages/settings.js` |
| 9.3 | Implementare gate visuale per feature Pro | Tutti i componenti Pro |
| 9.4 | Implementare pagina upgrade con link acquisto | `src/js/pages/settings.js` |
| 9.5 | Setup provider licenze (Gumroad/LemonSqueezy) | Configurazione esterna |

**Criterio di completamento Fase 9**: Le feature Pro sono bloccate senza licenza, l'inserimento codice sblocca il sync, e il flusso di acquisto è fluido.

---

### Fase 10 — Polish e Build (settimana 16-17)

**Obiettivo**: App pronta per la pubblicazione.

| Step | Task |
|------|------|
| 10.1 | Ottimizzare performance (lazy loading, virtual scrolling se necessario) |
| 10.2 | Testare su tutti i target: Windows, macOS, Linux, Android, iOS |
| 10.3 | Implementare icone app per ogni piattaforma |
| 10.4 | Implementare splash screen |
| 10.5 | Implementare onboarding tutorial (overlay al primo avvio) |
| 10.6 | Localizzazione IT/EN (semplice JSON key-value) |
| 10.7 | Accessibilità: keyboard navigation, ARIA labels, focus management |
| 10.8 | Build firmate per ogni piattaforma |
| 10.9 | Preparare pagina web prodotto + listing store |
| 10.10 | Documentazione utente |

---

## 15. Strategia di Testing

### 15.1 Panoramica

| Livello | Strumento | Target |
|---------|-----------|--------|
| Unit test Rust | `cargo test` (built-in) | Modelli, utility, query DB |
| Unit test JS | Vitest (leggero, compatibile vanilla) | Store, router, utility |
| Integration test | Tauri test driver | Comandi end-to-end |
| E2E test | WebDriverIO + Tauri driver | Flussi utente completi |

### 15.2 Unit Test Rust

Posizione: `src-tauri/src/` (inline `#[cfg(test)]` modules).

#### Test per utils/hash.rs

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_sha256_known_value() {
        // SHA-256 di "hello world\n" è noto
        let mut file = NamedTempFile::new().unwrap();
        file.write_all(b"hello world\n").unwrap();
        let hash = sha256_file(file.path()).unwrap();
        assert_eq!(hash, "a948904f2f0f479b8f8564e9d3975945...");
    }

    #[test]
    fn test_sha256_empty_file() {
        let file = NamedTempFile::new().unwrap();
        let hash = sha256_file(file.path()).unwrap();
        assert_eq!(hash, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    }

    #[test]
    fn test_sha256_nonexistent_file() {
        let result = sha256_file(Path::new("/nonexistent"));
        assert!(result.is_err());
    }
}
```

#### Test per utils/file_ops.rs

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_filename_basic() {
        assert_eq!(sanitize_filename("Bolletta Luce Gennaio"), "bolletta_luce_gennaio");
    }

    #[test]
    fn test_sanitize_filename_special_chars() {
        assert_eq!(sanitize_filename("Ricevuta #123 (Copia)"), "ricevuta_123_copia");
    }

    #[test]
    fn test_sanitize_filename_truncate() {
        let long_name = "a".repeat(100);
        assert!(sanitize_filename(&long_name).len() <= 60);
    }

    #[test]
    fn test_sanitize_filename_unicode() {
        assert_eq!(sanitize_filename("Città di Roma"), "citta_di_roma");
    }

    #[test]
    fn test_generate_storage_path_basic() {
        let path = generate_storage_path(
            "bolletta-luce", "2026-01-15", "Bolletta Gennaio", ".pdf",
            Path::new("/tmp/test_storage")
        );
        assert_eq!(path, "bolletta-luce/2026/20260115_bolletta_gennaio.pdf");
    }

    #[test]
    fn test_generate_storage_path_duplicate() {
        // Crea file esistente nel path temporaneo
        let base = tempfile::tempdir().unwrap();
        let dir = base.path().join("bolletta-luce/2026");
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("20260115_bolletta_gennaio.pdf"), b"test").unwrap();

        let path = generate_storage_path(
            "bolletta-luce", "2026-01-15", "Bolletta Gennaio", ".pdf",
            base.path()
        );
        assert_eq!(path, "bolletta-luce/2026/20260115_bolletta_gennaio_2.pdf");
    }
}
```

#### Test per db/schema.rs

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        create_tables(&conn).unwrap();
        seed_default_data(&conn).unwrap();
        conn
    }

    #[test]
    fn test_create_tables() {
        let conn = setup_test_db();
        // Verifica che tutte le tabelle esistano
        let tables: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert!(tables.contains(&"documents".to_string()));
        assert!(tables.contains(&"categories".to_string()));
        assert!(tables.contains(&"tags".to_string()));
        assert!(tables.contains(&"document_tags".to_string()));
        assert!(tables.contains(&"preset_fields".to_string()));
        assert!(tables.contains(&"document_fields".to_string()));
        assert!(tables.contains(&"event_log".to_string()));
        assert!(tables.contains(&"settings".to_string()));
    }

    #[test]
    fn test_seed_categories() {
        let conn = setup_test_db();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM categories WHERE is_system = 1", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 10); // 10 categorie di sistema
    }

    #[test]
    fn test_seed_preset_fields() {
        let conn = setup_test_db();
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM preset_fields WHERE category_id = 'cat-bolletta-luce'",
                [], |row| row.get(0)
            ).unwrap();
        assert_eq!(count, 3); // importo, fornitore, periodo
    }

    #[test]
    fn test_fts_table_created() {
        let conn = setup_test_db();
        let exists: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM sqlite_master WHERE name = 'documents_fts'",
                [], |row| row.get(0)
            ).unwrap();
        assert!(exists);
    }
}
```

#### Test per db/queries.rs (CRUD)

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn setup_with_document() -> (Connection, String) {
        let conn = setup_test_db();
        let doc_id = "test-doc-001".to_string();
        insert_document(&conn, &Document {
            id: doc_id.clone(),
            title: "Test Bolletta".to_string(),
            original_name: "scan001.pdf".to_string(),
            file_extension: ".pdf".to_string(),
            file_size: 1024,
            file_hash: "abc123".to_string(),
            mime_type: "application/pdf".to_string(),
            storage_path: "bolletta-luce/2026/20260115_test_bolletta.pdf".to_string(),
            category_id: "cat-bolletta-luce".to_string(),
            document_date: "2026-01-15".to_string(),
            expiry_date: None,
            notes: "Pagata".to_string(),
            ocr_text: None,
            is_favorite: false,
            created_at: "2026-01-15T10:00:00Z".to_string(),
            updated_at: "2026-01-15T10:00:00Z".to_string(),
            deleted_at: None,
        }).unwrap();
        (conn, doc_id)
    }

    #[test]
    fn test_insert_and_get_document() {
        let (conn, doc_id) = setup_with_document();
        let doc = get_document_by_id(&conn, &doc_id).unwrap();
        assert_eq!(doc.title, "Test Bolletta");
        assert_eq!(doc.category_id, "cat-bolletta-luce");
    }

    #[test]
    fn test_update_document_title() {
        let (conn, doc_id) = setup_with_document();
        update_document_field(&conn, &doc_id, "title", "Bolletta Aggiornata").unwrap();
        let doc = get_document_by_id(&conn, &doc_id).unwrap();
        assert_eq!(doc.title, "Bolletta Aggiornata");
    }

    #[test]
    fn test_soft_delete_document() {
        let (conn, doc_id) = setup_with_document();
        soft_delete_document(&conn, &doc_id).unwrap();
        let doc = get_document_by_id(&conn, &doc_id).unwrap();
        assert!(doc.deleted_at.is_some());
    }

    #[test]
    fn test_search_fts() {
        let (conn, _) = setup_with_document();
        let results = search_documents_fts(&conn, "Bolletta").unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].title, "Test Bolletta");
    }

    #[test]
    fn test_search_by_category() {
        let (conn, _) = setup_with_document();
        let filters = SearchFilters {
            category_id: Some("cat-bolletta-luce".to_string()),
            ..Default::default()
        };
        let results = search_documents_filtered(&conn, &filters).unwrap();
        assert_eq!(results.total_count, 1);
    }

    #[test]
    fn test_search_by_date_range() {
        let (conn, _) = setup_with_document();
        let filters = SearchFilters {
            date_from: Some("2026-01-01".to_string()),
            date_to: Some("2026-01-31".to_string()),
            ..Default::default()
        };
        let results = search_documents_filtered(&conn, &filters).unwrap();
        assert_eq!(results.total_count, 1);
    }

    #[test]
    fn test_search_excludes_deleted() {
        let (conn, doc_id) = setup_with_document();
        soft_delete_document(&conn, &doc_id).unwrap();
        let results = search_documents_fts(&conn, "Bolletta").unwrap();
        assert_eq!(results.len(), 0);
    }

    #[test]
    fn test_duplicate_hash_detection() {
        let (conn, _) = setup_with_document();
        let exists = document_exists_by_hash(&conn, "abc123").unwrap();
        assert!(exists);
    }

    #[test]
    fn test_tag_operations() {
        let (conn, doc_id) = setup_with_document();
        let tag_id = create_tag(&conn, "urgente", "#ef4444").unwrap();
        link_tag_to_document(&conn, &doc_id, &tag_id).unwrap();
        let tags = get_document_tags(&conn, &doc_id).unwrap();
        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].name, "urgente");
    }

    #[test]
    fn test_custom_field_values() {
        let (conn, doc_id) = setup_with_document();
        upsert_document_field(&conn, &doc_id, "pf-boll-luce-importo", "150.00").unwrap();
        let fields = get_document_custom_fields(&conn, &doc_id).unwrap();
        assert_eq!(fields.len(), 1);
        assert_eq!(fields[0].value, "150.00");
    }
}
```

#### Test per sync/event_store.rs

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_serialize_event_to_ndjson_line() {
        let event = EventLogEntry {
            event_id: "evt-001".to_string(),
            device_id: "dev-a".to_string(),
            event_type: "document.created".to_string(),
            entity_type: "document".to_string(),
            entity_id: "doc-001".to_string(),
            payload: serde_json::json!({"title": "Test"}),
            timestamp: "2026-01-15T10:00:00.000Z".to_string(),
        };
        let line = serialize_event_ndjson(&event);
        assert!(!line.contains('\n'));
        let parsed: EventLogEntry = serde_json::from_str(&line).unwrap();
        assert_eq!(parsed.event_id, "evt-001");
    }

    #[test]
    fn test_parse_ndjson_log() {
        let log = r#"{"event_id":"1","device_id":"a","event_type":"document.created","entity_type":"document","entity_id":"d1","payload":{},"timestamp":"2026-01-01T00:00:00Z"}
{"event_id":"2","device_id":"b","event_type":"document.updated","entity_type":"document","entity_id":"d1","payload":{},"timestamp":"2026-01-02T00:00:00Z"}"#;
        let events = parse_ndjson_log(log).unwrap();
        assert_eq!(events.len(), 2);
    }

    #[test]
    fn test_merge_events_dedup() {
        let local = vec![make_event("evt-1", "2026-01-01T00:00:00Z")];
        let remote = vec![make_event("evt-1", "2026-01-01T00:00:00Z")];
        let merged = merge_event_logs(&local, &remote);
        assert_eq!(merged.len(), 1); // Deduplicato
    }

    #[test]
    fn test_merge_events_ordering() {
        let local = vec![make_event("evt-1", "2026-01-01T00:00:00Z")];
        let remote = vec![make_event("evt-2", "2026-01-02T00:00:00Z")];
        let merged = merge_event_logs(&local, &remote);
        assert_eq!(merged.len(), 2);
        assert_eq!(merged[0].event_id, "evt-1"); // Ordinato per timestamp
        assert_eq!(merged[1].event_id, "evt-2");
    }

    #[test]
    fn test_last_write_wins_conflict() {
        let local = vec![make_update_event("evt-1", "doc-1", "title", "Local Title", "2026-01-01T10:00:00Z")];
        let remote = vec![make_update_event("evt-2", "doc-1", "title", "Remote Title", "2026-01-01T12:00:00Z")];
        let resolved = resolve_conflicts(&local, &remote);
        // Remote vince perché timestamp è più recente
        assert_eq!(resolved[0].payload["title"], "Remote Title");
    }
}
```

### 15.3 Unit Test JavaScript

Posizione: `src/js/__tests__/`. Eseguiti con Vitest (leggero, zero-config).

```bash
# Setup
npm install -D vitest
```

#### Test per router.js

```js
// src/js/__tests__/router.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Router } from '../router.js';

describe('Router', () => {
    let router;

    beforeEach(() => {
        router = new Router();
        document.body.innerHTML = '<div id="app-content"></div>';
    });

    it('should match simple route', () => {
        const handler = vi.fn();
        router.add('#/', handler);
        router.resolve('#/');
        expect(handler).toHaveBeenCalled();
    });

    it('should extract route params', () => {
        const handler = vi.fn();
        router.add('#/view/:id', handler);
        router.resolve('#/view/abc-123');
        expect(handler).toHaveBeenCalledWith({ id: 'abc-123' });
    });

    it('should call 404 handler for unknown routes', () => {
        const notFound = vi.fn();
        router.setNotFound(notFound);
        router.resolve('#/nonexistent');
        expect(notFound).toHaveBeenCalled();
    });

    it('should execute onBeforeNavigate hook', () => {
        const hook = vi.fn(() => true);
        router.onBeforeNavigate(hook);
        router.add('#/test', vi.fn());
        router.navigate('#/test');
        expect(hook).toHaveBeenCalled();
    });

    it('should prevent navigation when hook returns false', () => {
        const hook = vi.fn(() => false);
        const handler = vi.fn();
        router.onBeforeNavigate(hook);
        router.add('#/test', handler);
        router.navigate('#/test');
        expect(handler).not.toHaveBeenCalled();
    });
});
```

#### Test per store.js

```js
// src/js/__tests__/store.test.js
import { describe, it, expect, vi } from 'vitest';
import { Store } from '../store.js';

describe('Store', () => {
    it('should initialize with default state', () => {
        const store = new Store({ count: 0 });
        expect(store.getState().count).toBe(0);
    });

    it('should update state with setState', () => {
        const store = new Store({ count: 0 });
        store.setState({ count: 5 });
        expect(store.getState().count).toBe(5);
    });

    it('should merge state partially', () => {
        const store = new Store({ count: 0, name: 'test' });
        store.setState({ count: 5 });
        expect(store.getState().name).toBe('test');
    });

    it('should notify subscribers on change', () => {
        const store = new Store({ count: 0 });
        const listener = vi.fn();
        store.subscribe('count', listener);
        store.setState({ count: 1 });
        expect(listener).toHaveBeenCalledWith(1, 0);
    });

    it('should not notify after unsubscribe', () => {
        const store = new Store({ count: 0 });
        const listener = vi.fn();
        store.subscribe('count', listener);
        store.unsubscribe('count', listener);
        store.setState({ count: 1 });
        expect(listener).not.toHaveBeenCalled();
    });

    it('should not notify if value unchanged', () => {
        const store = new Store({ count: 0 });
        const listener = vi.fn();
        store.subscribe('count', listener);
        store.setState({ count: 0 });
        expect(listener).not.toHaveBeenCalled();
    });
});
```

#### Test per utils/date.js

```js
// src/js/__tests__/date.test.js
import { describe, it, expect } from 'vitest';
import { formatDate, formatRelative, isExpiringSoon } from '../utils/date.js';

describe('formatDate', () => {
    it('should format YYYY-MM-DD to locale string', () => {
        expect(formatDate('2026-01-15', 'it')).toBe('15 gennaio 2026');
    });

    it('should handle invalid date', () => {
        expect(formatDate('invalid')).toBe('Data non valida');
    });
});

describe('isExpiringSoon', () => {
    it('should return true if within 30 days', () => {
        const future = new Date();
        future.setDate(future.getDate() + 15);
        expect(isExpiringSoon(future.toISOString().split('T')[0])).toBe(true);
    });

    it('should return false if more than 30 days', () => {
        const future = new Date();
        future.setDate(future.getDate() + 60);
        expect(isExpiringSoon(future.toISOString().split('T')[0])).toBe(false);
    });

    it('should return true if already expired', () => {
        expect(isExpiringSoon('2020-01-01')).toBe(true);
    });

    it('should return false for null', () => {
        expect(isExpiringSoon(null)).toBe(false);
    });
});
```

#### Test per utils/format.js

```js
// src/js/__tests__/format.test.js
import { describe, it, expect } from 'vitest';
import { formatFileSize, getFileIcon, slugify } from '../utils/format.js';

describe('formatFileSize', () => {
    it('should format bytes', () => {
        expect(formatFileSize(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
        expect(formatFileSize(1024)).toBe('1.0 KB');
    });

    it('should format megabytes', () => {
        expect(formatFileSize(1048576)).toBe('1.0 MB');
    });

    it('should format gigabytes', () => {
        expect(formatFileSize(1073741824)).toBe('1.0 GB');
    });
});

describe('slugify', () => {
    it('should convert to slug', () => {
        expect(slugify('Bolletta Luce')).toBe('bolletta-luce');
    });

    it('should handle special characters', () => {
        expect(slugify('Certificato Médico (Copia)')).toBe('certificato-medico-copia');
    });

    it('should collapse multiple hyphens', () => {
        expect(slugify('test --- multiple')).toBe('test-multiple');
    });
});

describe('getFileIcon', () => {
    it('should return pdf icon for .pdf', () => {
        expect(getFileIcon('.pdf')).toBe('file-text');
    });

    it('should return image icon for .jpg', () => {
        expect(getFileIcon('.jpg')).toBe('image');
    });

    it('should return default icon for unknown', () => {
        expect(getFileIcon('.xyz')).toBe('file');
    });
});
```

### 15.4 Test di Integrazione

```rust
// tests/integration_test.rs
// Testa il flusso completo: setup → create document → search → update → delete

#[tokio::test]
async fn test_full_document_lifecycle() {
    let app = setup_test_app().await;

    // 1. Setup
    let settings = app.invoke("complete_setup", json!({
        "storagePath": "/tmp/docvault_test"
    })).await.unwrap();
    assert!(settings.setup_complete);

    // 2. Create document
    let doc = app.invoke("create_document", json!({
        "payload": {
            "title": "Test Bolletta",
            "sourceFilePath": "/tmp/test_file.pdf",
            "categoryId": "cat-bolletta-luce",
            "documentDate": "2026-01-15",
            "notes": "Test note",
            "tags": ["test", "bolletta"],
            "customFields": [
                { "fieldId": "pf-boll-luce-importo", "value": "150.00" }
            ],
            "runOcr": false
        }
    })).await.unwrap();
    assert_eq!(doc.title, "Test Bolletta");

    // 3. Verify file was copied
    let expected_path = "/tmp/docvault_test/bolletta-luce/2026/20260115_test_bolletta.pdf";
    assert!(std::path::Path::new(expected_path).exists());

    // 4. Search
    let results = app.invoke("search_documents", json!({
        "filters": { "query": "Bolletta" }
    })).await.unwrap();
    assert_eq!(results.total_count, 1);

    // 5. Update
    let updated = app.invoke("update_document", json!({
        "payload": {
            "id": doc.id,
            "notes": "Updated notes"
        }
    })).await.unwrap();
    assert_eq!(updated.notes, "Updated notes");

    // 6. Delete
    app.invoke("delete_document", json!({ "id": doc.id })).await.unwrap();
    let results = app.invoke("search_documents", json!({
        "filters": { "query": "Bolletta" }
    })).await.unwrap();
    assert_eq!(results.total_count, 0); // Soft-deleted, non appare in ricerca
}
```

### 15.5 Automazione Test

```bash
# Script test completo (da aggiungere in package.json o Makefile)

# 1. Unit test Rust
cargo test --manifest-path src-tauri/Cargo.toml

# 2. Unit test JavaScript
npx vitest run

# 3. Unit test con coverage
npx vitest run --coverage
cargo tarpaulin --manifest-path src-tauri/Cargo.toml

# 4. Lint
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings

# 5. Format check
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
```

### 15.6 CI/CD (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test-rust:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: sudo apt-get update && sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev
      - run: cargo test --manifest-path src-tauri/Cargo.toml
      - run: cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings

  test-js:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx vitest run --coverage

  build:
    needs: [test-rust, test-js]
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: cargo tauri build
```

### 15.7 Checklist Qualità Pre-Release

| Check | Comando | Pass se |
|-------|---------|---------|
| Tutti i test Rust passano | `cargo test` | Exit 0 |
| Tutti i test JS passano | `npx vitest run` | Exit 0 |
| Nessun warning Clippy | `cargo clippy -- -D warnings` | Exit 0 |
| Code coverage Rust > 70% | `cargo tarpaulin` | ≥ 70% |
| Code coverage JS > 80% | `npx vitest --coverage` | ≥ 80% |
| Build desktop funziona | `cargo tauri build` | Genera .dmg/.msi/.deb |
| Build Android funziona | `cargo tauri android build` | Genera .apk |
| DB migration idempotente | Esegui migration 2x su DB vuoto | Nessun errore |
| Nessun file >5MB nel bundle | Check bundle size | Totale <15MB |

---

*Fine della specifica tecnica. Questo documento va tenuto aggiornato con ogni decisione architetturale e modifica strutturale durante lo sviluppo.*
