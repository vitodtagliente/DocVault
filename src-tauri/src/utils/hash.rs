use sha2::{Sha256, Digest};
use std::path::Path;
use std::fs::File;
use std::io::Read;

/// Computes SHA-256 hash of a file. Reads in 8 KB chunks.
pub fn sha256_file(path: &Path) -> Result<String, std::io::Error> {
    let mut file = File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];
    loop {
        let bytes_read = file.read(&mut buffer)?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use std::fs;

    #[test]
    fn test_sha256_empty_file() {
        let path = std::env::temp_dir().join("docvault_test_empty.tmp");
        fs::write(&path, b"").unwrap();
        let hash = sha256_file(&path).unwrap();
        assert_eq!(hash, "e3b0c44298fc1c149afbf4c8996fb924\
                          27ae41e4649b934ca495991b7852b855");
        fs::remove_file(&path).ok();
    }

    #[test]
    fn test_sha256_known_content() {
        let path = std::env::temp_dir().join("docvault_test_known.tmp");
        fs::write(&path, b"hello world\n").unwrap();
        let hash = sha256_file(&path).unwrap();
        // SHA-256 of "hello world\n"
        assert_eq!(hash, "a948904f2f0f479b8f8564e9d39752e3\
                          7d8ad4acafd9c97ab20b7a3b83c7d45e");
        fs::remove_file(&path).ok();
    }

    #[test]
    fn test_sha256_nonexistent_file() {
        let result = sha256_file(Path::new("/nonexistent_file_docvault.tmp"));
        assert!(result.is_err());
    }
}
