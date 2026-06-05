# DocVault

Desktop + mobile document cataloging app built with **Tauri 2**, **Vanilla JS**, **Tailwind CSS**, and **SQLite**.

## Features

- 📂 Offline-first document catalog (PDF, images, Word, Excel, Markdown, …)
- 🏷️ Custom presets and fields per category
- 🔍 Full-text search with FTS5
- 📅 Expiry date tracking with notifications
- 👁️ Integrated viewer (PDF, images, Markdown)
- 🔎 Optional OCR via Tesseract
- 📤 CSV export & ZIP backup/restore
- ☁️ Google Drive sync (Pro)
- 🌙 Dark mode

## Requirements

| Tool | Version |
|------|---------|
| Rust | stable (≥1.77) |
| Node.js | ≥20 LTS |
| Tauri CLI | v2 |
| Tailwind CSS CLI | standalone or npm |

### Windows extra
- Visual Studio Build Tools (Desktop dev with C++)
- WebView2 (preinstalled on Windows 11)
- Tesseract for OCR (optional): https://github.com/UB-Mannheim/tesseract/wiki

### Linux extra
```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential libssl-dev libgtk-3-dev \
  libayatana-appindicator3-dev librsvg2-dev tesseract-ocr tesseract-ocr-ita
```

## Setup

```bash
# 1. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Install Tauri CLI
cargo install tauri-cli --version "^2"

# 3. Install npm deps (Tailwind)
npm install

# 4. Build Tailwind (watch mode in separate terminal)
npm run tw:watch

# 5. Run in dev mode
npm run dev

# 6. Production build
npm run build
```

## PDF Viewer (optional)

Download `pdf.mjs` and `pdf.worker.mjs` from https://mozilla.github.io/pdf.js/getting_started/
and place them in `src/assets/lib/`.

## Markdown Viewer (optional)

Download `marked.min.js` from https://cdn.jsdelivr.net/npm/marked/marked.min.js
and place it in `src/assets/lib/`.

## Project Structure

```
docvault/
├── src-tauri/          ← Rust backend
│   ├── src/
│   │   ├── commands/   ← Tauri commands (CRUD, search, sync, …)
│   │   ├── db/         ← SQLite schema + queries
│   │   ├── models/     ← Serde data structures
│   │   └── utils/      ← Hash, file ops, date helpers
│   └── migrations/     ← SQL migration files
└── src/                ← Frontend (Vanilla JS + Tailwind)
    ├── js/
    │   ├── pages/      ← Page components
    │   ├── components/ ← Reusable UI components
    │   ├── viewers/    ← PDF, image, Markdown viewers
    │   └── utils/      ← DOM, date, format helpers
    └── css/
```

## License

Free tier: full offline functionality.  
Pro tier (€9.99 one-time): Google Drive sync.
