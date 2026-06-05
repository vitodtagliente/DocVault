use serde::{Deserialize, Serialize};
use super::category::Category;
use super::tag::Tag;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: String,
    pub title: String,
    pub original_name: String,
    pub file_extension: String,
    pub file_size: i64,
    pub file_hash: String,
    pub mime_type: String,
    pub storage_path: String,
    pub category_id: String,
    pub document_date: String,
    pub expiry_date: Option<String>,
    pub notes: String,
    pub ocr_text: Option<String>,
    pub is_favorite: bool,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDocumentPayload {
    pub title: String,
    pub source_file_path: String,
    pub category_id: String,
    pub document_date: String,
    pub expiry_date: Option<String>,
    pub notes: String,
    pub tags: Vec<String>,
    pub custom_fields: Vec<CustomFieldValue>,
    pub run_ocr: bool,
    /// When true, bypasses duplicate-hash check so the same file can be added
    /// multiple times (caller is responsible for giving a distinct title).
    pub force: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDocumentPayload {
    pub id: String,
    pub title: Option<String>,
    pub category_id: Option<String>,
    pub document_date: Option<String>,
    pub expiry_date: Option<String>,
    pub notes: Option<String>,
    pub tags: Option<Vec<String>>,
    pub custom_fields: Option<Vec<CustomFieldValue>>,
    pub is_favorite: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomFieldValue {
    pub field_id: String,
    pub value: String,
}

#[derive(Debug, Serialize)]
pub struct DocumentDetail {
    pub document: Document,
    pub category: Category,
    pub tags: Vec<Tag>,
    pub custom_fields: Vec<CustomFieldWithValue>,
}

#[derive(Debug, Serialize)]
pub struct CustomFieldWithValue {
    pub field_id: String,
    pub field_name: String,
    pub field_label: String,
    pub field_type: String,
    pub field_options: Option<Vec<String>>,
    pub value: String,
}

#[derive(Debug, Serialize)]
pub struct DocumentListItem {
    pub id: String,
    pub title: String,
    pub file_extension: String,
    pub file_size: i64,
    pub mime_type: String,
    pub storage_path: String,
    pub category_id: String,
    pub category_name: String,
    pub category_color: String,
    pub document_date: String,
    pub expiry_date: Option<String>,
    pub is_favorite: bool,
    pub tags: Vec<TagBrief>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct TagBrief {
    pub id: String,
    pub name: String,
    pub color: String,
}
