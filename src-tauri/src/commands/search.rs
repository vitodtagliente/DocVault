use tauri::State;
use serde::{Deserialize, Serialize};
use crate::AppState;
use crate::models::{DocumentListItem, TagBrief};
use crate::db::queries;

#[derive(Debug, Deserialize)]
pub struct SearchFilters {
    pub query: Option<String>,
    pub category_id: Option<String>,
    pub tag_ids: Option<Vec<String>>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub year_filter: Option<i32>,
    pub month_filter: Option<i32>,
    pub favorites_only: Option<bool>,
    pub expiring_only: Option<bool>,
    pub sort_by: Option<String>,
    pub page: Option<i32>,
    pub page_size: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct SearchResult {
    pub documents: Vec<DocumentListItem>,
    pub total_count: i64,
    pub page: i32,
    pub page_size: i32,
    pub total_pages: i32,
}

#[derive(Debug, Serialize)]
pub struct DashboardStats {
    pub total_documents: i64,
    pub documents_this_month: i64,
    pub total_categories: i64,
    pub total_tags: i64,
    pub total_size_bytes: i64,
    pub expiring_soon: i64,
    pub by_category: Vec<CategoryStat>,
    pub by_month: Vec<MonthlyStat>,
}

#[derive(Debug, Serialize)]
pub struct CategoryStat {
    pub category_id: String,
    pub category_name: String,
    pub category_color: String,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct MonthlyStat {
    pub year_month: String,
    pub count: i64,
}

#[tauri::command]
pub async fn search_documents(
    filters: SearchFilters,
    state: State<'_, AppState>,
) -> Result<SearchResult, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let page = filters.page.unwrap_or(0).max(0);
    let page_size = filters.page_size.unwrap_or(24).clamp(1, 100);
    let offset = page * page_size;

    // Build WHERE clause dynamically
    let mut conditions = vec!["d.deleted_at IS NULL".to_string()];
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    let mut param_idx = 1usize;

    if let Some(ref cat_id) = filters.category_id {
        if !cat_id.is_empty() {
            conditions.push(format!("d.category_id = ?{}", param_idx));
            params.push(Box::new(cat_id.clone()));
            param_idx += 1;
        }
    }

    if let Some(ref date_from) = filters.date_from {
        if !date_from.is_empty() {
            conditions.push(format!("d.document_date >= ?{}", param_idx));
            params.push(Box::new(date_from.clone()));
            param_idx += 1;
        }
    }

    if let Some(ref date_to) = filters.date_to {
        if !date_to.is_empty() {
            conditions.push(format!("d.document_date <= ?{}", param_idx));
            params.push(Box::new(date_to.clone()));
            param_idx += 1;
        }
    }

    if let Some(year) = filters.year_filter {
        if year > 0 {
            conditions.push(format!("strftime('%Y', d.document_date) = ?{}", param_idx));
            params.push(Box::new(format!("{:04}", year)));
            param_idx += 1;
        }
    }

    if let Some(month) = filters.month_filter {
        if month > 0 {
            conditions.push(format!("strftime('%m', d.document_date) = ?{}", param_idx));
            params.push(Box::new(format!("{:02}", month)));
            param_idx += 1;
        }
    }

    if filters.favorites_only.unwrap_or(false) {
        conditions.push("d.is_favorite = 1".to_string());
    }

    if filters.expiring_only.unwrap_or(false) {
        conditions.push("d.expiry_date IS NOT NULL AND d.expiry_date <= date('now', '+30 days')".to_string());
    }

    let order_clause = match filters.sort_by.as_deref().unwrap_or("date_desc") {
        "date_asc"     => "d.document_date ASC",
        "title_asc"    => "d.title ASC",
        "created_desc" => "d.created_at DESC",
        _              => "d.document_date DESC",
    };

    // Handle tag filter (needs EXISTS subquery)
    if let Some(ref tag_ids) = filters.tag_ids {
        if !tag_ids.is_empty() {
            let placeholders: Vec<String> = tag_ids.iter().enumerate()
                .map(|(i, _)| format!("?{}", param_idx + i))
                .collect();
            conditions.push(format!(
                "EXISTS (SELECT 1 FROM document_tags dt WHERE dt.document_id = d.id AND dt.tag_id IN ({}))",
                placeholders.join(",")
            ));
            for tag_id in tag_ids {
                params.push(Box::new(tag_id.clone()));
                param_idx += 1;
            }
        }
    }

    // Text search — FTS5 with prefix matching, fallback to LIKE if query is empty after sanitization
    let mut fts_param: Option<String> = None;
    if let Some(ref q) = filters.query {
        let q_trim = q.trim();
        if !q_trim.is_empty() {
            let fts_q = build_fts5_query(q_trim);
            if !fts_q.is_empty() {
                // Use FTS5 rowid subquery — integrates cleanly with the dynamic WHERE builder
                conditions.push(format!(
                    "d.rowid IN (SELECT rowid FROM documents_fts WHERE documents_fts MATCH ?{})",
                    param_idx
                ));
                params.push(Box::new(fts_q.clone()));
                fts_param = Some(fts_q);
                param_idx += 1;
            } else {
                // Fallback: LIKE on title, notes, ocr_text
                let like_q = format!("%{}%", q_trim);
                conditions.push(format!(
                    "(d.title LIKE ?{0} OR d.notes LIKE ?{0} OR d.ocr_text LIKE ?{0})",
                    param_idx
                ));
                params.push(Box::new(like_q));
                param_idx += 1;
            }
        }
    }
    let _ = fts_param; // used above

    let where_clause = conditions.join(" AND ");
    let _ = param_idx;

    let count_sql = format!(
        "SELECT COUNT(*) FROM documents d WHERE {}",
        where_clause
    );

    let main_sql = format!(
        "SELECT d.id, d.title, d.file_extension, d.file_size, d.mime_type, d.storage_path,
                d.category_id, c.name as category_name, c.color as category_color,
                d.document_date, d.expiry_date, d.is_favorite, d.created_at
         FROM documents d
         JOIN categories c ON d.category_id = c.id
         WHERE {}
         ORDER BY {}
         LIMIT {} OFFSET {}",
        where_clause, order_clause, page_size, offset
    );

    // Execute count
    let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let total_count: i64 = conn
        .query_row(&count_sql, params_refs.as_slice(), |r| r.get(0))
        .unwrap_or(0);

    // Execute main query
    let mut stmt = conn.prepare(&main_sql).map_err(|e| e.to_string())?;
    let doc_ids: Vec<(String, DocumentListItem)> = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok((
                row.get::<_, String>(0)?,
                DocumentListItem {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    file_extension: row.get(2)?,
                    file_size: row.get(3)?,
                    mime_type: row.get(4)?,
                    storage_path: row.get(5)?,
                    category_id: row.get(6)?,
                    category_name: row.get(7)?,
                    category_color: row.get(8)?,
                    document_date: row.get(9)?,
                    expiry_date: row.get(10)?,
                    is_favorite: row.get::<_, i32>(11)? != 0,
                    tags: vec![],
                    created_at: row.get(12)?,
                },
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Fetch tags for each document
    let mut documents = Vec::new();
    for (doc_id, mut item) in doc_ids {
        let tags = queries::get_tags_for_document(&conn, &doc_id)
            .unwrap_or_default();
        item.tags = tags.into_iter().map(|t| TagBrief {
            id: t.id,
            name: t.name,
            color: t.color,
        }).collect();
        documents.push(item);
    }

    let total_pages = ((total_count as f64) / (page_size as f64)).ceil() as i32;

    Ok(SearchResult { documents, total_count, page, page_size, total_pages })
}

#[tauri::command]
pub async fn search_suggestions(
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let pattern = format!("%{}%", query);

    let mut titles: Vec<String> = conn
        .prepare("SELECT DISTINCT title FROM documents WHERE title LIKE ?1 AND deleted_at IS NULL LIMIT 5")
        .map_err(|e| e.to_string())?
        .query_map(rusqlite::params![pattern], |r| r.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let tag_names: Vec<String> = conn
        .prepare("SELECT DISTINCT name FROM tags WHERE name LIKE ?1 LIMIT 3")
        .map_err(|e| e.to_string())?
        .query_map(rusqlite::params![pattern], |r| r.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    titles.extend(tag_names);
    titles.dedup();
    Ok(titles)
}

#[tauri::command]
pub async fn get_stats(state: State<'_, AppState>) -> Result<DashboardStats, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let total_documents: i64 = conn
        .query_row("SELECT COUNT(*) FROM documents WHERE deleted_at IS NULL", [], |r| r.get(0))
        .unwrap_or(0);

    let documents_this_month: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM documents WHERE deleted_at IS NULL
             AND strftime('%Y-%m', document_date) = strftime('%Y-%m', 'now')",
            [], |r| r.get(0),
        ).unwrap_or(0);

    let total_categories: i64 = conn
        .query_row("SELECT COUNT(*) FROM categories WHERE deleted_at IS NULL", [], |r| r.get(0))
        .unwrap_or(0);

    let total_tags: i64 = conn
        .query_row("SELECT COUNT(*) FROM tags", [], |r| r.get(0))
        .unwrap_or(0);

    let total_size_bytes: i64 = conn
        .query_row("SELECT COALESCE(SUM(file_size), 0) FROM documents WHERE deleted_at IS NULL",
            [], |r| r.get(0))
        .unwrap_or(0);

    let expiring_soon: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM documents WHERE deleted_at IS NULL
             AND expiry_date IS NOT NULL AND expiry_date <= date('now', '+30 days')",
            [], |r| r.get(0),
        ).unwrap_or(0);

    let by_category: Vec<CategoryStat> = conn
        .prepare(
            "SELECT c.id, c.name, c.color, COUNT(d.id) as cnt
             FROM categories c
             LEFT JOIN documents d ON c.id = d.category_id AND d.deleted_at IS NULL
             WHERE c.deleted_at IS NULL
             GROUP BY c.id ORDER BY cnt DESC"
        ).map_err(|e| e.to_string())?
        .query_map([], |row| Ok(CategoryStat {
            category_id: row.get(0)?,
            category_name: row.get(1)?,
            category_color: row.get(2)?,
            count: row.get(3)?,
        })).map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let by_month: Vec<MonthlyStat> = conn
        .prepare(
            "SELECT strftime('%Y-%m', document_date) as ym, COUNT(*) as cnt
             FROM documents WHERE deleted_at IS NULL
             AND document_date >= date('now', '-12 months')
             GROUP BY ym ORDER BY ym"
        ).map_err(|e| e.to_string())?
        .query_map([], |row| Ok(MonthlyStat {
            year_month: row.get(0)?,
            count: row.get(1)?,
        })).map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(DashboardStats {
        total_documents,
        documents_this_month,
        total_categories,
        total_tags,
        total_size_bytes,
        expiring_soon,
        by_category,
        by_month,
    })
}

/// Build an FTS5 query that does prefix-matching on every whitespace-separated token.
/// E.g. "elec 2024" → `elec* 2024*` (implicit AND).
/// Returns an empty string if no valid tokens found (caller falls back to LIKE).
fn build_fts5_query(q: &str) -> String {
    let tokens: Vec<String> = q
        .split_whitespace()
        .filter_map(|word| {
            // Keep alphanumeric, hyphens, apostrophes; strip FTS5 operators
            let safe: String = word
                .chars()
                .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '\'')
                .collect();
            if safe.is_empty() { None } else { Some(format!("{}*", safe)) }
        })
        .collect();
    tokens.join(" ")
}

