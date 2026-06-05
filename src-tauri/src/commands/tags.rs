use tauri::State;
use crate::AppState;
use crate::models::*;
use crate::db::queries;

#[tauri::command]
pub async fn list_tags(state: State<'_, AppState>) -> Result<Vec<Tag>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    queries::get_all_tags(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_tags_with_count(state: State<'_, AppState>) -> Result<Vec<TagWithCount>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name, t.color, t.created_at,
                COUNT(dt.document_id) as doc_count
         FROM tags t
         LEFT JOIN document_tags dt ON t.id = dt.tag_id
         LEFT JOIN documents d ON dt.document_id = d.id AND d.deleted_at IS NULL
         GROUP BY t.id ORDER BY t.name"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(TagWithCount {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            created_at: row.get(3)?,
            document_count: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_tag(
    name: String,
    color: Option<String>,
    state: State<'_, AppState>,
) -> Result<Tag, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let device_id = queries::get_setting(&conn, "device_id")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();
    let id = uuid::Uuid::new_v4().to_string();
    let tag_color = color.unwrap_or_else(|| "#64748b".into());
    let now = crate::utils::date::now_iso();
    conn.execute(
        "INSERT INTO tags (id, name, color, created_at) VALUES (?1,?2,?3,?4)",
        rusqlite::params![id, name, tag_color, now],
    ).map_err(|e| e.to_string())?;
    queries::write_event(&conn, &device_id, "tag.created", "tag", &id,
        &serde_json::json!({"id": id, "name": name, "color": tag_color}))
        .map_err(|e| e.to_string())?;
    Ok(Tag { id, name, color: tag_color, created_at: now })
}

#[tauri::command]
pub async fn delete_tag(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let device_id = queries::get_setting(&conn, "device_id")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();
    conn.execute("DELETE FROM document_tags WHERE tag_id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM tags WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    queries::write_event(&conn, &device_id, "tag.deleted", "tag", &id,
        &serde_json::json!({"id": id}))
        .map_err(|e| e.to_string())?;
    Ok(())
}
