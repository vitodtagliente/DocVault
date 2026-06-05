use tauri::State;
use crate::AppState;
use crate::commands::search::SearchFilters;
use crate::db::queries;
use std::path::Path;
use std::io::Write;

#[tauri::command]
pub async fn export_csv(
    filters: SearchFilters,
    output_path: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let storage_path = queries::get_setting(&conn, "storage_path")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();

    let out = Path::new(&output_path);
    if let Some(parent) = out.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // Build query directly (no pagination — export all)
    let mut conditions = vec!["d.deleted_at IS NULL".to_string()];
    let mut params: Vec<String> = Vec::new();
    let mut param_idx = 1usize;

    if let Some(ref cat_id) = filters.category_id {
        if !cat_id.is_empty() {
            conditions.push(format!("d.category_id = ?{}", param_idx));
            params.push(cat_id.clone());
            param_idx += 1;
        }
    }
    if filters.favorites_only.unwrap_or(false) {
        conditions.push("d.is_favorite = 1".to_string());
    }
    if filters.expiring_only.unwrap_or(false) {
        conditions.push("d.expiry_date IS NOT NULL AND d.expiry_date <= date('now', '+30 days')".to_string());
    }
    let _ = param_idx;

    let where_clause = conditions.join(" AND ");
    let sql = format!(
        "SELECT d.id, d.title, c.name, d.document_date, d.expiry_date, d.notes, d.storage_path
         FROM documents d JOIN categories c ON d.category_id = c.id
         WHERE {} ORDER BY d.document_date DESC LIMIT 10000",
        where_clause
    );

    let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter()
        .map(|s| s as &dyn rusqlite::ToSql).collect();

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows: Vec<(String, String, String, String, Option<String>, String, String)> = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?,
                row.get(4)?, row.get(5)?, row.get(6)?))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let mut file = std::fs::File::create(out).map_err(|e| e.to_string())?;
    file.write_all(b"\xEF\xBB\xBF").map_err(|e| e.to_string())?; // UTF-8 BOM for Excel
    writeln!(file, "Titolo,Categoria,Data Documento,Data Scadenza,Tag,Note,Path File")
        .map_err(|e| e.to_string())?;

    for (id, title, cat_name, doc_date, expiry, notes, rel_path) in &rows {
        let tags: Vec<String> = queries::get_tags_for_document(&conn, id)
            .unwrap_or_default().into_iter().map(|t| t.name).collect();
        let file_path = Path::new(&storage_path).join(rel_path);
        writeln!(file, "{},{},{},{},{},{},{}",
            csv_escape(&title),
            csv_escape(&cat_name),
            doc_date,
            expiry.as_deref().unwrap_or(""),
            csv_escape(&tags.join("; ")),
            csv_escape(&notes),
            csv_escape(&file_path.to_string_lossy()),
        ).map_err(|e| e.to_string())?;
    }

    Ok(output_path)
}

fn csv_escape(s: &str) -> String {
    if s.contains(',') || s.contains('"') || s.contains('\n') {
        format!("\"{}\"", s.replace('"', "\"\""))
    } else {
        s.to_string()
    }
}
