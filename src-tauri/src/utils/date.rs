use chrono::{Utc, DateTime};

/// Returns current UTC timestamp in RFC 3339 format with milliseconds.
pub fn now_iso() -> String {
    Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

/// Returns current UTC date as YYYY-MM-DD.
pub fn today_iso() -> String {
    Utc::now().format("%Y-%m-%d").to_string()
}

/// Parses an ISO 8601 / RFC 3339 string to DateTime<Utc>.
pub fn parse_iso(s: &str) -> Option<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(s).ok().map(|dt| dt.with_timezone(&Utc))
}
