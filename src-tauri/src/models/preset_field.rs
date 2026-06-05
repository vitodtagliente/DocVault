use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresetField {
    pub id: String,
    pub category_id: String,
    pub field_name: String,
    pub field_label: String,
    pub field_type: String,
    pub field_options: Option<Vec<String>>,
    pub is_required: bool,
    pub sort_order: i32,
    pub created_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePresetFieldPayload {
    pub field_name: String,
    pub field_label: String,
    pub field_type: String,
    pub field_options: Option<Vec<String>>,
    pub is_required: bool,
}
