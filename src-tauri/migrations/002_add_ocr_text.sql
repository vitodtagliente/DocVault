-- Migration 002: Add OCR text index and thumbnail tracking
-- (documents.ocr_text already exists from migration 001)
-- This migration adds a thumbnails tracking table

CREATE TABLE IF NOT EXISTS thumbnails (
    document_id     TEXT PRIMARY KEY,
    thumb_path      TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (document_id) REFERENCES documents(id)
);
