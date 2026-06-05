use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub storage_path: String,
    pub device_id: String,
    pub setup_complete: bool,
    pub license_status: String,
    pub theme: String,
    pub language: String,
    pub last_sync_at: Option<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            storage_path: String::new(),
            device_id: String::new(),
            setup_complete: false,
            license_status: "free".to_string(),
            theme: "system".to_string(),
            language: "it".to_string(),
            last_sync_at: None,
        }
    }
}
