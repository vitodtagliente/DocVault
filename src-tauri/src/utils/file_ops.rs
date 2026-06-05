use std::path::{Path, PathBuf};
use std::fs;

/// Sanitizes a string for use as a filename component.
/// - Lowercases
/// - Replaces spaces with underscores
/// - Removes characters that are not a-z, 0-9, underscore, or hyphen
/// - Truncates to 60 characters
pub fn sanitize_filename(name: &str) -> String {
    let lower = name.to_lowercase();
    let mut result = String::with_capacity(lower.len());
    for ch in lower.chars() {
        if ch.is_ascii_alphanumeric() || ch == '-' {
            result.push(ch);
        } else if ch == ' ' || ch == '_' {
            result.push('_');
        }
        // skip other characters
    }
    // Collapse repeated underscores
    let mut out = String::new();
    let mut prev_underscore = false;
    for ch in result.chars() {
        if ch == '_' {
            if !prev_underscore {
                out.push(ch);
            }
            prev_underscore = true;
        } else {
            out.push(ch);
            prev_underscore = false;
        }
    }
    // Trim leading/trailing underscores and truncate
    let trimmed = out.trim_matches('_');
    trimmed.chars().take(60).collect()
}

/// Generates the relative storage path for a document.
/// Format: `{category_slug}/{year}/{YYYYMMDD}_{sanitized_title}.{ext}`
/// Appends `_N` suffix to avoid collisions.
pub fn generate_storage_path(
    category_slug: &str,
    document_date: &str,
    title: &str,
    extension: &str,
    base_path: &Path,
) -> String {
    let year = &document_date[..4]; // YYYY
    let date_compact = document_date.replace('-', ""); // YYYYMMDD
    let safe_title = sanitize_filename(title);
    let ext = extension.trim_start_matches('.');

    let base_rel = format!("{}/{}/{}_{}",
        category_slug, year, date_compact, safe_title);

    let mut candidate = format!("{}.{}", base_rel, ext);
    let mut n = 2u32;
    loop {
        let full_path = base_path.join(&candidate);
        if !full_path.exists() {
            break;
        }
        candidate = format!("{}_{}.{}", base_rel, n, ext);
        n += 1;
    }
    candidate
}

/// Creates all intermediate directories for a path.
pub fn ensure_directory(path: &Path) -> Result<(), std::io::Error> {
    fs::create_dir_all(path)
}

/// Copies a file from `source` to `dest`, verifying the SHA-256 hash.
pub fn copy_and_verify(
    source: &Path,
    dest: &Path,
    expected_hash: &str,
) -> Result<(), String> {
    if let Some(parent) = dest.parent() {
        ensure_directory(parent).map_err(|e| e.to_string())?;
    }
    fs::copy(source, dest).map_err(|e| e.to_string())?;

    let actual_hash = crate::utils::hash::sha256_file(dest)
        .map_err(|e| e.to_string())?;
    if actual_hash != expected_hash {
        fs::remove_file(dest).ok();
        return Err(format!(
            "Hash mismatch after copy: expected {}, got {}",
            expected_hash, actual_hash
        ));
    }
    Ok(())
}

/// Infers MIME type from file extension.
pub fn mime_from_extension(ext: &str) -> &'static str {
    match ext.to_lowercase().trim_start_matches('.') {
        "pdf"               => "application/pdf",
        "jpg" | "jpeg"      => "image/jpeg",
        "png"               => "image/png",
        "gif"               => "image/gif",
        "webp"              => "image/webp",
        "bmp"               => "image/bmp",
        "tiff" | "tif"      => "image/tiff",
        "md" | "markdown"   => "text/markdown",
        "txt"               => "text/plain",
        "csv"               => "text/csv",
        "log"               => "text/plain",
        "doc"               => "application/msword",
        "docx"              => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xls"               => "application/vnd.ms-excel",
        "xlsx"              => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "zip"               => "application/zip",
        _                   => "application/octet-stream",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_basic() {
        assert_eq!(sanitize_filename("Bolletta Luce Gennaio"), "bolletta_luce_gennaio");
    }

    #[test]
    fn test_sanitize_special_chars() {
        assert_eq!(sanitize_filename("Ricevuta #123 (Copia)"), "ricevuta_123_copia");
    }

    #[test]
    fn test_sanitize_accents() {
        // Accented chars are not a-z so they're removed
        let result = sanitize_filename("Caffè Espresso");
        assert_eq!(result, "caff_espresso");
    }

    #[test]
    fn test_sanitize_truncation() {
        let long = "a".repeat(100);
        assert_eq!(sanitize_filename(&long).len(), 60);
    }
}
