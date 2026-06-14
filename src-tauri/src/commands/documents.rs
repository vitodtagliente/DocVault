use tauri::State;
use crate::AppState;
use crate::models::*;
use crate::db::queries;
use crate::utils::{hash::sha256_file, file_ops::*};
use std::path::Path;

#[tauri::command]
pub async fn create_document(
    payload: CreateDocumentPayload,
    state: State<'_, AppState>,
) -> Result<Document, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let storage_path_str = queries::get_setting(&conn, "storage_path")
        .map_err(|e| e.to_string())?
        .ok_or("Storage path not configured")?;
    let device_id = queries::get_setting(&conn, "device_id")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();

    let source = Path::new(&payload.source_file_path);
    if !source.exists() {
        return Err(format!("Source file not found: {}", payload.source_file_path));
    }

    // Compute hash
    let file_hash = sha256_file(source).map_err(|e| e.to_string())?;

    // Check for duplicates (skipped when force=true so the same file can be catalogued multiple times)
    if !payload.force.unwrap_or(false) {
        if let Some(existing_id) = queries::find_document_by_hash(&conn, &file_hash)
            .map_err(|e| e.to_string())? {
            return Err(format!("DUPLICATE:{}", existing_id));
        }
    }

    // Get category for slug
    let category = queries::get_category_by_id(&conn, &payload.category_id)
        .map_err(|e| e.to_string())?
        .ok_or("Category not found")?;

    let original_name = source.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("document")
        .to_string();
    let extension = source.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_string();
    let file_size = source.metadata().map_err(|e| e.to_string())?.len() as i64;
    let mime_type = mime_from_extension(&extension).to_string();

    let parent_slug = queries::get_parent_slug(&conn, &category);
    let base_path = Path::new(&storage_path_str);
    let rel_path = generate_storage_path(
        &category.slug,
        parent_slug.as_deref(),
        &payload.document_date,
        &payload.title,
        &extension,
        base_path,
    );

    let dest = base_path.join(&rel_path);
    copy_and_verify(source, &dest, &file_hash)?;

    let id = uuid::Uuid::new_v4().to_string();
    let now = crate::utils::date::now_iso();

    conn.execute(
        "INSERT INTO documents (id, title, original_name, file_extension, file_size, file_hash,
                               mime_type, storage_path, category_id, document_date, expiry_date,
                               notes, is_favorite, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,0,?13,?13)",
        rusqlite::params![
            id, payload.title, original_name, format!(".{}", extension),
            file_size, file_hash, mime_type, rel_path,
            payload.category_id, payload.document_date, payload.expiry_date,
            payload.notes, now
        ],
    ).map_err(|e| e.to_string())?;

    // Handle tags
    for tag_name in &payload.tags {
        let tag = queries::get_or_create_tag(&conn, tag_name, &device_id)
            .map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT OR IGNORE INTO document_tags (document_id, tag_id, created_at) VALUES (?1,?2,?3)",
            rusqlite::params![id, tag.id, now],
        ).map_err(|e| e.to_string())?;
        queries::write_event(&conn, &device_id, "tag.linked", "document_tag", &id,
            &serde_json::json!({"document_id": id, "tag_id": tag.id}))
            .map_err(|e| e.to_string())?;
    }

    // Handle custom fields
    for cf in &payload.custom_fields {
        if !cf.value.is_empty() {
            let cf_id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO document_fields (id, document_id, field_id, field_value, created_at, updated_at)
                 VALUES (?1,?2,?3,?4,?5,?5)",
                rusqlite::params![cf_id, id, cf.field_id, cf.value, now],
            ).map_err(|e| e.to_string())?;
        }
    }

    // Write creation event
    queries::write_event(&conn, &device_id, "document.created", "document", &id,
        &serde_json::json!({
            "id": id, "title": payload.title, "category_id": payload.category_id,
            "document_date": payload.document_date, "file_hash": file_hash,
            "file_extension": format!(".{}", extension), "file_size": file_size
        }))
        .map_err(|e| e.to_string())?;

    let doc = queries::get_document_by_id(&conn, &id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Document not found after insert".to_string())?;

    Ok(doc)
}

#[tauri::command]
pub async fn update_document(
    payload: UpdateDocumentPayload,
    state: State<'_, AppState>,
) -> Result<Document, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let device_id = queries::get_setting(&conn, "device_id")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();

    let doc = queries::get_document_by_id(&conn, &payload.id)
        .map_err(|e| e.to_string())?
        .ok_or("Document not found")?;

    let now = crate::utils::date::now_iso();

    // If category changed, move the file
    let new_category_id = payload.category_id.as_deref().unwrap_or(&doc.category_id);
    let new_title = payload.title.as_deref().unwrap_or(&doc.title);
    let new_date = payload.document_date.as_deref().unwrap_or(&doc.document_date);

    let mut new_storage_path = doc.storage_path.clone();

    if new_category_id != doc.category_id || new_title != doc.title || new_date != doc.document_date {
        let storage_path_str = queries::get_setting(&conn, "storage_path")
            .map_err(|e| e.to_string())?
            .ok_or("Storage path not configured")?;
        let base_path = Path::new(&storage_path_str);
        let new_cat = queries::get_category_by_id(&conn, new_category_id)
            .map_err(|e| e.to_string())?
            .ok_or("Category not found")?;
        let ext = doc.file_extension.trim_start_matches('.');

        let new_parent_slug = queries::get_parent_slug(&conn, &new_cat);
        let candidate = generate_storage_path(
            &new_cat.slug, new_parent_slug.as_deref(), new_date, new_title, ext, base_path,
        );
        let old_dest = base_path.join(&doc.storage_path);
        let new_dest = base_path.join(&candidate);
        if old_dest != new_dest {
            if let Some(parent) = new_dest.parent() {
                ensure_directory(parent).map_err(|e| e.to_string())?;
            }
            std::fs::rename(&old_dest, &new_dest).map_err(|e| e.to_string())?;
            new_storage_path = candidate;
        }
    }

    conn.execute(
        "UPDATE documents SET
            title = COALESCE(?2, title),
            category_id = COALESCE(?3, category_id),
            document_date = COALESCE(?4, document_date),
            expiry_date = ?5,
            notes = COALESCE(?6, notes),
            is_favorite = COALESCE(?7, is_favorite),
            storage_path = ?8,
            updated_at = ?9
         WHERE id = ?1",
        rusqlite::params![
            payload.id,
            payload.title,
            payload.category_id,
            payload.document_date,
            payload.expiry_date.as_deref().or(doc.expiry_date.as_deref()),
            payload.notes,
            payload.is_favorite.map(|b| if b { 1i32 } else { 0i32 }),
            new_storage_path,
            now,
        ],
    ).map_err(|e| e.to_string())?;

    // Update tags if provided
    if let Some(tags) = &payload.tags {
        conn.execute("DELETE FROM document_tags WHERE document_id = ?1",
            rusqlite::params![payload.id]).map_err(|e| e.to_string())?;
        for tag_name in tags {
            let tag = queries::get_or_create_tag(&conn, tag_name, &device_id)
                .map_err(|e| e.to_string())?;
            conn.execute(
                "INSERT OR IGNORE INTO document_tags (document_id, tag_id, created_at) VALUES (?1,?2,?3)",
                rusqlite::params![payload.id, tag.id, now],
            ).map_err(|e| e.to_string())?;
        }
    }

    // Update custom fields if provided
    if let Some(custom_fields) = &payload.custom_fields {
        for cf in custom_fields {
            conn.execute(
                "INSERT INTO document_fields (id, document_id, field_id, field_value, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?5)
                 ON CONFLICT(document_id, field_id) DO UPDATE SET field_value = ?4, updated_at = ?5",
                rusqlite::params![
                    uuid::Uuid::new_v4().to_string(),
                    payload.id, cf.field_id, cf.value, now
                ],
            ).map_err(|e| e.to_string())?;
        }
    }

    queries::write_event(&conn, &device_id, "document.updated", "document", &payload.id,
        &serde_json::json!({"id": payload.id}))
        .map_err(|e| e.to_string())?;

    queries::get_document_by_id(&conn, &payload.id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Document not found after update".to_string())
}

#[tauri::command]
pub async fn delete_document(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let device_id = queries::get_setting(&conn, "device_id")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();
    let now = crate::utils::date::now_iso();
    conn.execute(
        "UPDATE documents SET deleted_at = ?2, updated_at = ?2 WHERE id = ?1",
        rusqlite::params![id, now],
    ).map_err(|e| e.to_string())?;
    queries::write_event(&conn, &device_id, "document.deleted", "document", &id,
        &serde_json::json!({"id": id, "deleted_at": now}))
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn restore_document(id: String, state: State<'_, AppState>) -> Result<Document, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let device_id = queries::get_setting(&conn, "device_id")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();
    conn.execute(
        "UPDATE documents SET deleted_at = NULL, updated_at = datetime('now') WHERE id = ?1",
        rusqlite::params![id],
    ).map_err(|e| e.to_string())?;
    queries::write_event(&conn, &device_id, "document.restored", "document", &id,
        &serde_json::json!({"id": id}))
        .map_err(|e| e.to_string())?;
    queries::get_document_by_id(&conn, &id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Document not found".to_string())
}

#[tauri::command]
pub async fn purge_document(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let storage_path_str = queries::get_setting(&conn, "storage_path")
        .map_err(|e| e.to_string())?
        .ok_or("Storage path not configured")?;

    if let Some(doc) = queries::get_document_by_id(&conn, &id).map_err(|e| e.to_string())? {
        let file_path = Path::new(&storage_path_str).join(&doc.storage_path);
        std::fs::remove_file(&file_path).ok();
    }

    conn.execute("DELETE FROM document_tags WHERE document_id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM document_fields WHERE document_id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM documents WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_document(id: String, state: State<'_, AppState>) -> Result<DocumentDetail, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let doc = queries::get_document_by_id(&conn, &id)
        .map_err(|e| e.to_string())?
        .ok_or("Document not found")?;
    let category = queries::get_category_by_id(&conn, &doc.category_id)
        .map_err(|e| e.to_string())?
        .ok_or("Category not found")?;
    let tags = queries::get_tags_for_document(&conn, &id).map_err(|e| e.to_string())?;
    let custom_fields = queries::get_document_custom_fields(&conn, &id).map_err(|e| e.to_string())?;
    Ok(DocumentDetail { document: doc, category, tags, custom_fields })
}

#[tauri::command]
pub async fn get_document_file_path(id: String, state: State<'_, AppState>) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let doc = queries::get_document_by_id(&conn, &id)
        .map_err(|e| e.to_string())?
        .ok_or("Document not found")?;
    let storage_path_str = queries::get_setting(&conn, "storage_path")
        .map_err(|e| e.to_string())?
        .ok_or("Storage path not configured")?;
    let full_path = Path::new(&storage_path_str).join(&doc.storage_path);
    Ok(full_path.to_string_lossy().to_string())
}
