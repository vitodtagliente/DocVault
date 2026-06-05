use rusqlite::{Connection, Result, params};
use crate::models::*;

// ─── Settings ────────────────────────────────────────────────────────────────

pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>> {
    let result = conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get(0),
    );
    match result {
        Ok(v) => Ok(Some(v)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<()> {
    conn.execute(
        "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = datetime('now')",
        params![key, value],
    )?;
    Ok(())
}

pub fn load_app_settings(conn: &Connection) -> Result<AppSettings> {
    let storage_path = get_setting(conn, "storage_path")?.unwrap_or_default();
    let device_id = get_setting(conn, "device_id")?.unwrap_or_default();
    let setup_complete = get_setting(conn, "setup_complete")?.unwrap_or_else(|| "0".into()) == "1";
    let license_status = get_setting(conn, "license_status")?.unwrap_or_else(|| "free".into());
    let theme = get_setting(conn, "theme")?.unwrap_or_else(|| "system".into());
    let language = get_setting(conn, "language")?.unwrap_or_default();
    let last_sync_at = get_setting(conn, "last_sync_at")?;

    Ok(AppSettings {
        storage_path,
        device_id,
        setup_complete,
        license_status,
        theme,
        language,
        last_sync_at,
    })
}

// ─── Categories ──────────────────────────────────────────────────────────────

pub fn get_all_categories(conn: &Connection) -> Result<Vec<Category>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, slug, icon, color, is_system, sort_order, created_at, updated_at, deleted_at
         FROM categories WHERE deleted_at IS NULL ORDER BY sort_order, name"
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Category {
            id: row.get(0)?,
            name: row.get(1)?,
            slug: row.get(2)?,
            icon: row.get(3)?,
            color: row.get(4)?,
            is_system: row.get::<_, i32>(5)? != 0,
            sort_order: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
            deleted_at: row.get(9)?,
        })
    })?;
    rows.collect()
}

pub fn get_category_by_id(conn: &Connection, id: &str) -> Result<Option<Category>> {
    let result = conn.query_row(
        "SELECT id, name, slug, icon, color, is_system, sort_order, created_at, updated_at, deleted_at
         FROM categories WHERE id = ?1",
        params![id],
        |row| Ok(Category {
            id: row.get(0)?,
            name: row.get(1)?,
            slug: row.get(2)?,
            icon: row.get(3)?,
            color: row.get(4)?,
            is_system: row.get::<_, i32>(5)? != 0,
            sort_order: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
            deleted_at: row.get(9)?,
        }),
    );
    match result {
        Ok(c) => Ok(Some(c)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

// ─── Tags ────────────────────────────────────────────────────────────────────

pub fn get_all_tags(conn: &Connection) -> Result<Vec<Tag>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, color, created_at FROM tags ORDER BY name"
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Tag {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            created_at: row.get(3)?,
        })
    })?;
    rows.collect()
}

pub fn get_tags_for_document(conn: &Connection, document_id: &str) -> Result<Vec<Tag>> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name, t.color, t.created_at
         FROM tags t JOIN document_tags dt ON t.id = dt.tag_id
         WHERE dt.document_id = ?1 ORDER BY t.name"
    )?;
    let rows = stmt.query_map(params![document_id], |row| {
        Ok(Tag {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            created_at: row.get(3)?,
        })
    })?;
    rows.collect()
}

pub fn get_or_create_tag(conn: &Connection, name: &str, device_id: &str) -> Result<Tag> {
    // Try to find existing
    let existing = conn.query_row(
        "SELECT id, name, color, created_at FROM tags WHERE name = ?1",
        params![name],
        |row| Ok(Tag {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            created_at: row.get(3)?,
        }),
    );

    match existing {
        Ok(tag) => Ok(tag),
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            let id = uuid::Uuid::new_v4().to_string();
            let now = chrono::Utc::now().to_rfc3339();
            conn.execute(
                "INSERT INTO tags (id, name, color, created_at) VALUES (?1, ?2, '#64748b', ?3)",
                params![id, name, now],
            )?;
            // Write event
            write_event(conn, device_id, "tag.created", "tag", &id,
                &serde_json::json!({"id": id, "name": name, "color": "#64748b"}))?;
            Ok(Tag { id, name: name.to_string(), color: "#64748b".into(), created_at: now })
        }
        Err(e) => Err(e),
    }
}

// ─── Preset Fields ───────────────────────────────────────────────────────────

pub fn get_preset_fields_for_category(conn: &Connection, category_id: &str) -> Result<Vec<PresetField>> {
    let mut stmt = conn.prepare(
        "SELECT id, category_id, field_name, field_label, field_type, field_options,
                is_required, sort_order, created_at, deleted_at
         FROM preset_fields WHERE category_id = ?1 AND deleted_at IS NULL ORDER BY sort_order"
    )?;
    let rows = stmt.query_map(params![category_id], |row| {
        let options_json: Option<String> = row.get(5)?;
        let field_options = options_json.and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok());
        Ok(PresetField {
            id: row.get(0)?,
            category_id: row.get(1)?,
            field_name: row.get(2)?,
            field_label: row.get(3)?,
            field_type: row.get(4)?,
            field_options,
            is_required: row.get::<_, i32>(6)? != 0,
            sort_order: row.get(7)?,
            created_at: row.get(8)?,
            deleted_at: row.get(9)?,
        })
    })?;
    rows.collect()
}

// ─── Documents ───────────────────────────────────────────────────────────────

pub fn get_document_by_id(conn: &Connection, id: &str) -> Result<Option<Document>> {
    let result = conn.query_row(
        "SELECT id, title, original_name, file_extension, file_size, file_hash, mime_type,
                storage_path, category_id, document_date, expiry_date, notes, ocr_text,
                is_favorite, created_at, updated_at, deleted_at
         FROM documents WHERE id = ?1",
        params![id],
        |row| Ok(Document {
            id: row.get(0)?,
            title: row.get(1)?,
            original_name: row.get(2)?,
            file_extension: row.get(3)?,
            file_size: row.get(4)?,
            file_hash: row.get(5)?,
            mime_type: row.get(6)?,
            storage_path: row.get(7)?,
            category_id: row.get(8)?,
            document_date: row.get(9)?,
            expiry_date: row.get(10)?,
            notes: row.get(11)?,
            ocr_text: row.get(12)?,
            is_favorite: row.get::<_, i32>(13)? != 0,
            created_at: row.get(14)?,
            updated_at: row.get(15)?,
            deleted_at: row.get(16)?,
        }),
    );
    match result {
        Ok(d) => Ok(Some(d)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

pub fn get_document_custom_fields(conn: &Connection, document_id: &str) -> Result<Vec<CustomFieldWithValue>> {
    let mut stmt = conn.prepare(
        "SELECT pf.id, pf.field_name, pf.field_label, pf.field_type, pf.field_options,
                COALESCE(df.field_value, '') as value
         FROM preset_fields pf
         LEFT JOIN document_fields df ON pf.id = df.field_id AND df.document_id = ?1
         WHERE pf.category_id = (SELECT category_id FROM documents WHERE id = ?1)
           AND pf.deleted_at IS NULL
         ORDER BY pf.sort_order"
    )?;
    let rows = stmt.query_map(params![document_id], |row| {
        let options_json: Option<String> = row.get(4)?;
        let field_options = options_json.and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok());
        Ok(CustomFieldWithValue {
            field_id: row.get(0)?,
            field_name: row.get(1)?,
            field_label: row.get(2)?,
            field_type: row.get(3)?,
            field_options,
            value: row.get(5)?,
        })
    })?;
    rows.collect()
}

pub fn find_document_by_hash(conn: &Connection, hash: &str) -> Result<Option<String>> {
    let result = conn.query_row(
        "SELECT id FROM documents WHERE file_hash = ?1 AND deleted_at IS NULL LIMIT 1",
        params![hash],
        |row| row.get(0),
    );
    match result {
        Ok(id) => Ok(Some(id)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

// ─── Event Log ───────────────────────────────────────────────────────────────

pub fn write_event(
    conn: &Connection,
    device_id: &str,
    event_type: &str,
    entity_type: &str,
    entity_id: &str,
    payload: &serde_json::Value,
) -> Result<()> {
    let event_id = uuid::Uuid::new_v4().to_string();
    let timestamp = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    conn.execute(
        "INSERT INTO event_log (event_id, device_id, event_type, entity_type, entity_id, payload, timestamp)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![event_id, device_id, event_type, entity_type, entity_id, payload.to_string(), timestamp],
    )?;
    Ok(())
}
