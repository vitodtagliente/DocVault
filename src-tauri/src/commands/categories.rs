use tauri::State;
use crate::AppState;
use crate::models::*;
use crate::db::queries;
use crate::utils::file_ops::sanitize_filename;

#[tauri::command]
pub async fn list_categories(state: State<'_, AppState>) -> Result<Vec<Category>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::get_all_categories(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_category(
    payload: CreateCategoryPayload,
    state: State<'_, AppState>,
) -> Result<Category, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let device_id = queries::get_setting(&conn, "device_id")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();

    let id = uuid::Uuid::new_v4().to_string();
    let slug = sanitize_filename(&payload.name).replace('_', "-");
    let icon = payload.icon.unwrap_or_else(|| "folder".into());
    let color = payload.color.unwrap_or_else(|| "#3b82f6".into());
    let now = crate::utils::date::now_iso();

    // Get next sort_order
    let max_order: i32 = conn
        .query_row("SELECT COALESCE(MAX(sort_order), 0) FROM categories", [], |r| r.get(0))
        .unwrap_or(0);

    conn.execute(
        "INSERT INTO categories (id, name, slug, icon, color, is_system, sort_order, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,0,?6,?7,?7)",
        rusqlite::params![id, payload.name, slug, icon, color, max_order + 1, now],
    ).map_err(|e| e.to_string())?;

    // Create preset fields
    for (i, field) in payload.fields.iter().enumerate() {
        let field_id = uuid::Uuid::new_v4().to_string();
        let options_json = field.field_options.as_ref().map(|o| serde_json::to_string(o).unwrap_or_default());
        conn.execute(
            "INSERT INTO preset_fields (id, category_id, field_name, field_label, field_type, field_options, is_required, sort_order, created_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
            rusqlite::params![
                field_id, id, field.field_name, field.field_label, field.field_type,
                options_json, if field.is_required { 1 } else { 0 }, i as i32, now
            ],
        ).map_err(|e| e.to_string())?;
    }

    // Create storage directory
    if let Ok(Some(storage_path)) = queries::get_setting(&conn, "storage_path") {
        crate::utils::file_ops::ensure_directory(&std::path::Path::new(&storage_path).join(&slug)).ok();
    }

    queries::write_event(&conn, &device_id, "category.created", "category", &id,
        &serde_json::json!({"id": id, "name": payload.name, "slug": slug}))
        .map_err(|e| e.to_string())?;

    queries::get_category_by_id(&conn, &id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Category not found after insert".to_string())
}

#[tauri::command]
pub async fn update_category(
    payload: UpdateCategoryPayload,
    state: State<'_, AppState>,
) -> Result<Category, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let device_id = queries::get_setting(&conn, "device_id")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();

    conn.execute(
        "UPDATE categories SET
            name = COALESCE(?2, name),
            icon = COALESCE(?3, icon),
            color = COALESCE(?4, color),
            sort_order = COALESCE(?5, sort_order),
            updated_at = datetime('now')
         WHERE id = ?1",
        rusqlite::params![
            payload.id, payload.name, payload.icon, payload.color, payload.sort_order
        ],
    ).map_err(|e| e.to_string())?;

    queries::write_event(&conn, &device_id, "category.updated", "category", &payload.id,
        &serde_json::json!({"id": payload.id}))
        .map_err(|e| e.to_string())?;

    queries::get_category_by_id(&conn, &payload.id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Category not found".to_string())
}

#[tauri::command]
pub async fn delete_category(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let device_id = queries::get_setting(&conn, "device_id")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();

    // Check for associated documents
    let doc_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM documents WHERE category_id = ?1 AND deleted_at IS NULL",
            rusqlite::params![id], |r| r.get(0))
        .unwrap_or(0);
    if doc_count > 0 {
        return Err(format!("Cannot delete category: {} document(s) are associated", doc_count));
    }

    conn.execute(
        "UPDATE categories SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?1",
        rusqlite::params![id],
    ).map_err(|e| e.to_string())?;

    queries::write_event(&conn, &device_id, "category.deleted", "category", &id,
        &serde_json::json!({"id": id}))
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_preset_fields(
    category_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<PresetField>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::get_preset_fields_for_category(&conn, &category_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_preset_field(
    category_id: String,
    payload: CreatePresetFieldPayload,
    state: State<'_, AppState>,
) -> Result<PresetField, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let device_id = queries::get_setting(&conn, "device_id")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();

    let id = uuid::Uuid::new_v4().to_string();
    let now = crate::utils::date::now_iso();
    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), 0) FROM preset_fields WHERE category_id = ?1",
            rusqlite::params![category_id], |r| r.get(0))
        .unwrap_or(0);

    let options_json = payload.field_options.as_ref()
        .map(|o| serde_json::to_string(o).unwrap_or_default());

    conn.execute(
        "INSERT INTO preset_fields (id, category_id, field_name, field_label, field_type, field_options, is_required, sort_order, created_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
        rusqlite::params![
            id, category_id, payload.field_name, payload.field_label, payload.field_type,
            options_json, if payload.is_required { 1 } else { 0 }, max_order + 1, now
        ],
    ).map_err(|e| e.to_string())?;

    queries::write_event(&conn, &device_id, "preset_field.created", "preset_field", &id,
        &serde_json::json!({"id": id, "category_id": category_id}))
        .map_err(|e| e.to_string())?;

    Ok(PresetField {
        id,
        category_id,
        field_name: payload.field_name,
        field_label: payload.field_label,
        field_type: payload.field_type,
        field_options: payload.field_options,
        is_required: payload.is_required,
        sort_order: max_order + 1,
        created_at: now,
        deleted_at: None,
    })
}

#[tauri::command]
pub async fn remove_preset_field(field_id: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let device_id = queries::get_setting(&conn, "device_id")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();
    conn.execute(
        "UPDATE preset_fields SET deleted_at = datetime('now') WHERE id = ?1",
        rusqlite::params![field_id],
    ).map_err(|e| e.to_string())?;
    queries::write_event(&conn, &device_id, "preset_field.deleted", "preset_field", &field_id,
        &serde_json::json!({"id": field_id}))
        .map_err(|e| e.to_string())?;
    Ok(())
}
