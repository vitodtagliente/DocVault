use serde::{Deserialize, Serialize};
use super::category::Category;
use super::document::Document;
use super::preset_field::PresetField;
use super::tag::Tag;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventLogEntry {
    pub event_id: String,
    pub device_id: String,
    pub event_type: String,
    pub entity_type: String,
    pub entity_id: String,
    pub payload: serde_json::Value,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncSnapshot {
    pub snapshot_id: String,
    pub device_id: String,
    pub event_count: i64,
    pub timestamp: String,
    pub data: SyncSnapshotData,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncSnapshotData {
    pub categories: Vec<Category>,
    pub preset_fields: Vec<PresetField>,
    pub documents: Vec<Document>,
    pub document_fields: Vec<DocumentFieldRecord>,
    pub tags: Vec<Tag>,
    pub document_tags: Vec<DocumentTagRecord>,
    pub settings: Vec<SettingRecord>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DocumentFieldRecord {
    pub id: String,
    pub document_id: String,
    pub field_id: String,
    pub field_value: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DocumentTagRecord {
    pub document_id: String,
    pub tag_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SettingRecord {
    pub key: String,
    pub value: String,
}
