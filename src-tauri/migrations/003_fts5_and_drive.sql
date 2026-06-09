-- =============================================================
-- MIGRATION 003: FTS5 full-text search + Google Drive tracking
-- =============================================================

-- Drop if partially applied from a previous failed run
DROP TRIGGER IF EXISTS documents_fts_au;
DROP TRIGGER IF EXISTS documents_fts_ad;
DROP TRIGGER IF EXISTS documents_fts_ai;
DROP TABLE IF EXISTS documents_fts;

-- Full-text virtual table over documents.
-- Indexes title, notes, and OCR text.
-- rowid links back to documents.rowid for joins.
CREATE VIRTUAL TABLE documents_fts USING fts5(
    title,
    notes,
    ocr_text,
    content   = 'documents',
    tokenize  = 'unicode61 remove_diacritics 1'
);

-- ── Sync triggers ─────────────────────────────────────────────────────────────

CREATE TRIGGER documents_fts_ai
AFTER INSERT ON documents BEGIN
    INSERT INTO documents_fts (rowid, title, notes, ocr_text)
    VALUES (new.rowid, new.title,
            COALESCE(new.notes, ''), COALESCE(new.ocr_text, ''));
END;

CREATE TRIGGER documents_fts_ad
AFTER DELETE ON documents BEGIN
    INSERT INTO documents_fts (documents_fts, rowid, title, notes, ocr_text)
    VALUES ('delete', old.rowid, old.title,
            COALESCE(old.notes, ''), COALESCE(old.ocr_text, ''));
END;

CREATE TRIGGER documents_fts_au
AFTER UPDATE ON documents BEGIN
    INSERT INTO documents_fts (documents_fts, rowid, title, notes, ocr_text)
    VALUES ('delete', old.rowid, old.title,
            COALESCE(old.notes, ''), COALESCE(old.ocr_text, ''));
    INSERT INTO documents_fts (rowid, title, notes, ocr_text)
    VALUES (new.rowid, new.title,
            COALESCE(new.notes, ''), COALESCE(new.ocr_text, ''));
END;

-- Populate from existing documents
INSERT INTO documents_fts (rowid, title, notes, ocr_text)
SELECT rowid, title, COALESCE(notes, ''), COALESCE(ocr_text, '')
FROM documents;

-- ── Google Drive file tracking ────────────────────────────────────────────────
-- Records which local documents have been uploaded to Drive and their Drive file IDs.
CREATE TABLE IF NOT EXISTS drive_files (
    document_id     TEXT PRIMARY KEY,
    drive_file_id   TEXT NOT NULL,
    drive_folder_id TEXT NOT NULL DEFAULT '',
    file_name       TEXT NOT NULL DEFAULT '',
    synced_at       TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (document_id) REFERENCES documents(id)
);
