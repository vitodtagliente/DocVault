use serde::{Deserialize, Serialize};
use super::preset_field::CreatePresetFieldPayload;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub icon: String,
    pub color: String,
    pub is_system: bool,
    pub sort_order: i32,
    pub parent_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCategoryPayload {
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub parent_id: Option<String>,
    pub fields: Vec<CreatePresetFieldPayload>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCategoryPayload {
    pub id: String,
    pub name: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub sort_order: Option<i32>,
    pub parent_id: Option<String>,
}
