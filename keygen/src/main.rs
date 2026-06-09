/// DocVault license key generator.
///
/// Uses the same HMAC-SHA256 algorithm as the app's key validator.
/// Format: AAAAA-BBBBB-CCCCC-DDDDD-CHECK
///   - First four groups: random base-36 characters
///   - Fifth group: SHA-256 checksum of the first four groups
///
/// Usage:
///   cargo run                  # generate 1 key
///   cargo run -- 5             # generate 5 keys

use rand::Rng;
use sha2::{Digest, Sha256};

/// Must match the constant in src-tauri/src/commands/license.rs
const SECRET: &[u8] = b"docvault-license-secret-v1";
const BASE36: &[u8] = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

fn to_base36(mut n: u32, len: usize) -> String {
    let mut result = vec![b'0'; len];
    for i in (0..len).rev() {
        result[i] = BASE36[(n % 36) as usize];
        n /= 36;
    }
    String::from_utf8(result).unwrap()
}

fn random_group() -> String {
    let mut rng = rand::thread_rng();
    let n: u32 = rng.gen_range(0..36u32.pow(5));
    to_base36(n, 5)
}

fn compute_check(data: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(SECRET);
    hasher.update(data.as_bytes());
    let hash = hasher.finalize();
    let n = u32::from_be_bytes([hash[0], hash[1], hash[2], hash[3]]);
    to_base36(n, 5)
}

fn generate_key() -> String {
    let groups: Vec<String> = (0..4).map(|_| random_group()).collect();
    let data = groups.join("-");
    let check = compute_check(&data);
    format!("{}-{}", data, check)
}

fn main() {
    let count: usize = std::env::args()
        .nth(1)
        .and_then(|s| s.parse().ok())
        .unwrap_or(1);

    println!("DocVault License Key Generator");
    println!("================================");
    for _ in 0..count {
        println!("{}", generate_key());
    }
}
