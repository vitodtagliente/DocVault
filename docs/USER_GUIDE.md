# DocVault — User Guide

## What is DocVault?

DocVault is a personal document vault for your desktop. It helps you catalog, organize, and find all your important documents — contracts, invoices, ID cards, warranties, receipts, medical records, and anything else — without relying on cloud services or internet access.

Everything is stored **on your computer**, in a folder you choose. Nothing is sent anywhere unless you explicitly connect Google Drive.

---

## Core Features

### Catalog Any File Type
Add PDFs, images (JPG, PNG, TIFF, WebP), Word documents, Excel spreadsheets, Markdown files, text files, ZIP archives, and more. DocVault copies the file into your vault and keeps the original untouched.

### Categories and Custom Fields
Organize documents by category — Invoices, Contracts, Medical, Taxes, Warranty, etc. Each category can have its own custom fields (text, number, date, dropdown) so you capture exactly the metadata that matters for that type of document.

For example, an **Invoice** category might have fields for *Amount*, *Supplier*, and *Payment date*. A **Warranty** category might have *Product*, *Store*, and *Warranty period*.

### Full-Text Search
Search across document titles, notes, tags, and — if OCR is enabled — the actual text inside scanned PDFs and images. Results appear instantly as you type.

### Expiry Date Tracking
Set an expiry date on any document. DocVault shows a countdown badge on each document card and provides a dedicated **Expiring** page that lists everything due to expire in the next 30 days. Great for passports, driving licences, insurance policies, and contracts.

### Integrated Viewer
Open documents directly inside DocVault:
- **PDFs** — rendered page by page with zoom controls
- **Images** — displayed with pan and zoom
- **Markdown** — rendered as formatted text

You can also open any document with your system's default application, or reveal it in File Explorer / Finder.

### Tags
Add free-form tags to any document for cross-category grouping. Tags can be colour-coded. Filter the home view by one or more tags.

### OCR (Optional)
If [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) is installed on your system, DocVault can extract text from scanned PDFs and images and store it alongside the document, making it fully searchable.

### Backup & Restore
Create a single ZIP archive containing your entire vault database and all files. Store it on an external drive or cloud storage of your choice. Restore from any previous backup at any time.

### CSV Export
Export your full document catalog (or a filtered view) as a CSV file for use in Excel, Google Sheets, or any other tool.

### Google Drive Sync *(coming soon)*
Connect your Google account to sync your vault across multiple devices. This feature is currently in development.

### Dark Mode
Supports light, dark, and system-preference modes. Switch at any time in Settings.

### Two Languages
The interface is available in **English** and **Italian**. Language auto-detects from your system or can be set manually in Settings.

---

## Getting Started

### 1. First Launch — Choose Your Vault Folder
On the first launch (or when clicking **Add Document** with no folder configured), DocVault asks you to choose a folder where your documents will be stored. This can be anywhere — a local drive, an external drive, a folder inside your existing cloud sync (Dropbox, OneDrive, etc.).

DocVault creates a hidden `.docvault/` subfolder inside your chosen folder to keep its files organised. Your documents are stored inside `.docvault/files/`.

### 2. Set Up Categories
Go to **Categories** to see the built-in categories or create your own. Add custom fields to any category to capture structured data specific to that document type.

### 3. Add a Document
Click the **+** button (bottom navigation on mobile, sidebar button on desktop) or navigate to **Add Document**. 

- Click the drop area or drag a file onto it
- Select a category
- Fill in the title, date, and any custom fields
- Optionally add tags and notes
- Click **Save document**

DocVault copies the file into your vault and it appears on the home page immediately.

### 4. Find Documents
Use the **search bar** at the top to search by title, notes, tags, or OCR text. Use the **filter bar** below to narrow results by category, year, or tag.

### 5. View and Manage
Click any document card to open the detail view. From there you can:
- View the file inline (PDF, image, Markdown)
- Open it with your system's default app
- Show it in File Explorer / Finder
- Edit metadata
- Run OCR (if Tesseract is installed)
- Delete the catalog entry (the physical file is kept)

---

## Settings

| Setting | Description |
|---|---|
| **Theme** | Light, dark, or follow system |
| **Language** | English or Italian |
| **Documents folder** | Change the vault storage location |
| **License** | Enter a license key to show your support (optional — the app is fully free) |

---

## License

DocVault is **free and fully functional**. If you find it useful and want to support its development, you can purchase a license key. Entering a valid key shows a thank-you acknowledgment — there are no locked features.

---

## Privacy

- All data stays on your device.
- No telemetry, no analytics, no network requests unless you connect Google Drive.
- The vault folder can be placed inside an existing encrypted volume for additional security.
