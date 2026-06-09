# DocVault

Offline-first personal document vault built with **Tauri 2**, **Vanilla JS**, **Tailwind CSS**, and **SQLite**.

> See [docs/USER_GUIDE.md](docs/USER_GUIDE.md) for the customer-facing feature guide.  
> See [CLAUDE.md](CLAUDE.md) for the full developer/AI context reference.

## Features

- 📂 Offline-first document catalog (PDF, images, Word, Excel, Markdown, …)
- 🏷️ Custom categories with per-category preset fields
- 🔍 Full-text search with FTS5 + optional OCR via Tesseract
- 📅 Expiry date tracking with notifications
- 👁️ Integrated viewer (PDF, images, Markdown)
- 📤 CSV export & ZIP backup/restore
- ☁️ Google Drive sync *(in development)*
- 🌙 Dark mode · 🌐 English / Italian

---

## Requirements

| Tool | Version | Notes |
|---|---|---|
| Rust | stable ≥ 1.77 | Install via `rustup` |
| Node.js | ≥ 20 LTS | For Tailwind CSS only |
| Tauri CLI | v2 | `cargo install tauri-cli --version "^2"` |
| WebView2 | — | Pre-installed on Windows 11; download for Windows 10 |

### Windows
- **Visual Studio Build Tools** — select the "Desktop development with C++" workload
- **WebView2** — already present on Windows 11; for Windows 10 download from Microsoft
- **Tesseract** (optional, for OCR) — https://github.com/UB-Mannheim/tesseract/wiki

### macOS
```bash
xcode-select --install
```

### Linux (Debian/Ubuntu)
```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential libssl-dev \
  libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev \
  tesseract-ocr tesseract-ocr-ita
```

---

## First-time Setup

```bash
# 1. Install Rust
# macOS / Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Windows
winget install Rustlang.Rustup

# 2. Install Tauri CLI (once per machine)
cargo install tauri-cli --version "^2"

# 3. Install JS/CSS dependencies
npm install
```

---

## Development Workflow

You need **two terminals** running in parallel during development.

**Terminal 1 — Tailwind watch** (recompiles CSS on every change):
```bash
npm run tw:watch
```

**Terminal 2 — Tauri dev** (Rust hot-reload + WebView):
```bash
npm run dev
```

The Tauri dev window opens automatically. Rust code changes trigger a recompile; frontend JS/CSS changes reload instantly in the WebView.

### Adding vendor libraries

Place vendored JS files in `src/assets/lib/`. They are served statically — no bundler step required.

- **PDF.js** (`pdf.mjs`, `pdf.worker.mjs`): https://mozilla.github.io/pdf.js/getting_started/
- **marked** (`marked.min.js`): https://cdn.jsdelivr.net/npm/marked/marked.min.js

---

## Building for Production

```bash
# Compiles Tailwind (minified) then builds the Tauri desktop bundle
npm run build
```

Output installers are written to `src-tauri/target/release/bundle/`:
- Windows: `.msi` and `.exe` (NSIS)
- macOS: `.dmg` and `.app`
- Linux: `.deb` and `.AppImage`

### Mobile (experimental)

```bash
npm run android   # Android APK via cargo tauri android build
npm run ios       # iOS IPA via cargo tauri ios build
```

---

## License Key Generator

```bash
node keygen/keygen.js          # generate 1 key
node keygen/keygen.js 10       # generate 10 keys
```

Keys are validated offline (HMAC-SHA256). The app is fully functional without a key; entering a valid key shows a thank-you acknowledgment only.

---

## Project Structure

```
project-docvault/
├── src/                    ← Frontend (Vanilla JS, no bundler)
│   ├── index.html
│   ├── app.config.json     ← Name, version, tagline
│   ├── css/
│   │   ├── input.css       ← Tailwind source
│   │   └── output.css      ← Compiled (commit this file)
│   ├── js/
│   │   ├── app.js          ← Entry point
│   │   ├── api.js          ← All Tauri invoke() wrappers
│   │   ├── router.js       ← Hash-router
│   │   ├── store.js        ← Reactive state
│   │   ├── i18n.js         ← EN + IT translations
│   │   ├── pages/          ← One file per route
│   │   ├── components/     ← Reusable UI fragments
│   │   ├── viewers/        ← PDF, image, Markdown viewers
│   │   └── utils/
│   └── assets/lib/         ← Vendored JS (pdf.js, marked)
│
├── src-tauri/              ← Rust backend
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── migrations/         ← SQL files, run in order at startup
│   └── src/
│       ├── lib.rs          ← AppState, plugin init, invoke_handler
│       ├── commands/       ← Tauri command handlers (one file per domain)
│       ├── db/             ← Schema migration + query helpers
│       ├── models/         ← Serde structs
│       └── utils/          ← date, file_ops, hash
│
├── keygen/                 ← Standalone CLI: license key generator
├── docs/
│   ├── USER_GUIDE.md       ← Customer-facing feature guide
│   └── DocVault_Technical_Specification.md
├── CLAUDE.md               ← Developer / AI context reference (keep updated)
└── package.json
```

---

## License

DocVault is free and fully functional for everyone. Optional license keys are available for users who want to support development.

