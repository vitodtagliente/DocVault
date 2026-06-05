-- =============================================================
-- MIGRATION 001: Initial Schema
-- DocVault - Document Management App
-- =============================================================

-- Settings: key-value store for app configuration
CREATE TABLE IF NOT EXISTS settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Categories / Presets
CREATE TABLE IF NOT EXISTS categories (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    slug            TEXT NOT NULL UNIQUE,
    icon            TEXT DEFAULT 'folder',
    color           TEXT DEFAULT '#3b82f6',
    is_system       INTEGER NOT NULL DEFAULT 0,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at      TEXT DEFAULT NULL
);

-- Preset Fields (custom fields per category)
CREATE TABLE IF NOT EXISTS preset_fields (
    id              TEXT PRIMARY KEY,
    category_id     TEXT NOT NULL,
    field_name      TEXT NOT NULL,
    field_label     TEXT NOT NULL,
    field_type      TEXT NOT NULL DEFAULT 'text',
    field_options   TEXT DEFAULT NULL,
    is_required     INTEGER NOT NULL DEFAULT 0,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at      TEXT DEFAULT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Documents: main catalog table
CREATE TABLE IF NOT EXISTS documents (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    original_name   TEXT NOT NULL,
    file_extension  TEXT NOT NULL,
    file_size       INTEGER NOT NULL,
    file_hash       TEXT NOT NULL,
    mime_type       TEXT NOT NULL,
    storage_path    TEXT NOT NULL,
    category_id     TEXT NOT NULL,
    document_date   TEXT NOT NULL,
    expiry_date     TEXT DEFAULT NULL,
    notes           TEXT DEFAULT '',
    ocr_text        TEXT DEFAULT NULL,
    is_favorite     INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at      TEXT DEFAULT NULL
);

-- Document custom field values
CREATE TABLE IF NOT EXISTS document_fields (
    id              TEXT PRIMARY KEY,
    document_id     TEXT NOT NULL,
    field_id        TEXT NOT NULL,
    field_value     TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (document_id) REFERENCES documents(id),
    FOREIGN KEY (field_id) REFERENCES preset_fields(id),
    UNIQUE(document_id, field_id)
);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    color           TEXT DEFAULT '#64748b',
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Document <-> Tag relation
CREATE TABLE IF NOT EXISTS document_tags (
    document_id     TEXT NOT NULL,
    tag_id          TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (document_id, tag_id),
    FOREIGN KEY (document_id) REFERENCES documents(id),
    FOREIGN KEY (tag_id) REFERENCES tags(id)
);

-- Event log for sync (event sourcing)
CREATE TABLE IF NOT EXISTS event_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id        TEXT NOT NULL UNIQUE,
    device_id       TEXT NOT NULL,
    event_type      TEXT NOT NULL,
    entity_type     TEXT NOT NULL,
    entity_id       TEXT NOT NULL,
    payload         TEXT NOT NULL,
    timestamp       TEXT NOT NULL,
    synced          INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
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

-- FTS5 for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
    title,
    notes,
    ocr_text,
    content='documents',
    content_rowid='rowid'
);

-- Triggers to keep FTS in sync
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

-- =============================================================
-- SEED DATA: System Categories
-- =============================================================
INSERT OR IGNORE INTO categories (id, name, slug, icon, color, is_system, sort_order) VALUES
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

-- Preset fields: Bolletta Luce
INSERT OR IGNORE INTO preset_fields (id, category_id, field_name, field_label, field_type, is_required, sort_order) VALUES
('pf-boll-luce-importo',    'cat-bolletta-luce', 'importo',    'Importo (€)',   'number', 1, 1),
('pf-boll-luce-fornitore',  'cat-bolletta-luce', 'fornitore',  'Fornitore',     'text',   0, 2),
('pf-boll-luce-periodo',    'cat-bolletta-luce', 'periodo',    'Periodo',       'text',   0, 3);

-- Preset fields: Bolletta Gas
INSERT OR IGNORE INTO preset_fields (id, category_id, field_name, field_label, field_type, is_required, sort_order) VALUES
('pf-boll-gas-importo',     'cat-bolletta-gas',  'importo',    'Importo (€)',   'number', 1, 1),
('pf-boll-gas-fornitore',   'cat-bolletta-gas',  'fornitore',  'Fornitore',     'text',   0, 2),
('pf-boll-gas-periodo',     'cat-bolletta-gas',  'periodo',    'Periodo',       'text',   0, 3);

-- Preset fields: Bolletta Acqua
INSERT OR IGNORE INTO preset_fields (id, category_id, field_name, field_label, field_type, is_required, sort_order) VALUES
('pf-boll-acqua-importo',   'cat-bolletta-acqua','importo',    'Importo (€)',   'number', 1, 1),
('pf-boll-acqua-gestore',   'cat-bolletta-acqua','gestore',    'Gestore',       'text',   0, 2);

-- Preset fields: Certificato Medico
INSERT OR IGNORE INTO preset_fields (id, category_id, field_name, field_label, field_type, is_required, sort_order) VALUES
('pf-cert-medico-medico',   'cat-cert-medico',   'medico',     'Medico',        'text',   0, 1),
('pf-cert-medico-diagnosi', 'cat-cert-medico',   'diagnosi',   'Diagnosi',      'text',   0, 2),
('pf-cert-medico-struttura','cat-cert-medico',   'struttura',  'Struttura',     'text',   0, 3);

-- Preset fields: Affitto
INSERT OR IGNORE INTO preset_fields (id, category_id, field_name, field_label, field_type, is_required, sort_order) VALUES
('pf-affitto-importo',      'cat-affitto',       'importo',    'Importo (€)',   'number', 1, 1),
('pf-affitto-proprietario', 'cat-affitto',       'proprietario','Proprietario', 'text',   0, 2),
('pf-affitto-indirizzo',    'cat-affitto',       'indirizzo',  'Indirizzo',     'text',   0, 3);

-- Preset fields: Documento Identità
INSERT OR IGNORE INTO preset_fields (id, category_id, field_name, field_label, field_type, is_required, sort_order) VALUES
('pf-doc-id-numero',        'cat-documento-id',  'numero',     'Numero Doc.',   'text',   1, 1),
('pf-doc-id-ente',          'cat-documento-id',  'ente',       'Ente Rilascio', 'text',   0, 2);

-- Preset fields: Assicurazione
INSERT OR IGNORE INTO preset_fields (id, category_id, field_name, field_label, field_type, is_required, sort_order) VALUES
('pf-assic-compagnia',      'cat-assicurazione', 'compagnia',  'Compagnia',     'text',   0, 1),
('pf-assic-polizza',        'cat-assicurazione', 'polizza',    'N. Polizza',    'text',   0, 2),
('pf-assic-premio',         'cat-assicurazione', 'premio',     'Premio (€)',    'number', 0, 3);

-- Preset fields: Contratto
INSERT OR IGNORE INTO preset_fields (id, category_id, field_name, field_label, field_type, is_required, sort_order) VALUES
('pf-contratto-controparte','cat-contratto',     'controparte','Controparte',   'text',   0, 1),
('pf-contratto-tipo',       'cat-contratto',     'tipo',       'Tipo Contratto','text',   0, 2),
('pf-contratto-valore',     'cat-contratto',     'valore',     'Valore (€)',    'number', 0, 3);

-- Preset fields: Ricevuta / Fattura
INSERT OR IGNORE INTO preset_fields (id, category_id, field_name, field_label, field_type, is_required, sort_order) VALUES
('pf-ricevuta-importo',     'cat-ricevuta',      'importo',    'Importo (€)',   'number', 0, 1),
('pf-ricevuta-emittente',   'cat-ricevuta',      'emittente',  'Emittente',     'text',   0, 2),
('pf-ricevuta-numero',      'cat-ricevuta',      'numero',     'Numero',        'text',   0, 3);
