use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct TagWithCount {
    pub id: String,
    pub name: String,
    pub color: String,
    pub created_at: String,
    pub document_count: i64,
}
