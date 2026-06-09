//! Google Drive sync — OAuth2 PKCE flow + Drive API.
//!
//! # Setup
//! 1. Go to https://console.cloud.google.com/
//! 2. Create a project, enable the Google Drive API.
//! 3. Create an OAuth 2.0 credential → "Desktop app".
//! 4. Add the authorized redirect URI: http://127.0.0.1:38765/oauth/callback
//! 5. Build with the client ID:
//!      $Env:GOOGLE_CLIENT_ID="YOUR_ID.apps.googleusercontent.com"; cargo tauri build
//!
//! Without GOOGLE_CLIENT_ID the auth commands return a clear configuration error.

use tauri::State;
use serde::{Deserialize, Serialize};
use crate::AppState;
use crate::db::queries;
use std::collections::HashMap;
use sha2::{Sha256, Digest};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};

// ─── Constants ────────────────────────────────────────────────────────────────

const OAUTH_PORT: u16 = 38765;
const REDIRECT_URI: &str = "http://127.0.0.1:38765/oauth/callback";
const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const USERINFO_URL: &str = "https://www.googleapis.com/oauth2/v2/userinfo";
const DRIVE_API: &str = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API: &str = "https://www.googleapis.com/upload/drive/v3";
const DRIVE_FOLDER_NAME: &str = "DocVault";
const SCOPE: &str =
    "https://www.googleapis.com/auth/drive.file \
     https://www.googleapis.com/auth/userinfo.email";

// ─── Public types ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct SyncReport {
    pub events_downloaded: i32,
    pub events_uploaded: i32,
    pub files_downloaded: i32,
    pub files_uploaded: i32,
    pub conflicts_resolved: i32,
    pub errors: Vec<String>,
    pub duration_ms: i64,
}

#[derive(Debug, Serialize)]
pub struct GoogleAuthStatus {
    pub is_authenticated: bool,
    pub email: Option<String>,
    pub last_sync: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct GoogleTokens {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: i64,
}

#[derive(Debug, Deserialize, Serialize)]
struct OAuthTokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: i64,
    #[serde(default)]
    token_type: String,
}

// ─── Build-time config ─────────────────────────────────────────────────────────

fn google_client_id() -> Result<&'static str, String> {
    let id = option_env!("GOOGLE_CLIENT_ID").unwrap_or("");
    if id.is_empty() {
        Err(
            "Google Drive sync is not configured for this build. \
             Set GOOGLE_CLIENT_ID at compile time. \
             See docs/USER_GUIDE.md for setup instructions."
                .to_string(),
        )
    } else {
        Ok(id)
    }
}

// ─── PKCE / CSRF helpers ───────────────────────────────────────────────────────

fn generate_pkce() -> (String, String) {
    let b1 = uuid::Uuid::new_v4().as_bytes().to_vec();
    let b2 = uuid::Uuid::new_v4().as_bytes().to_vec();
    let verifier = URL_SAFE_NO_PAD.encode([b1, b2].concat());
    let mut h = Sha256::new();
    h.update(verifier.as_bytes());
    let challenge = URL_SAFE_NO_PAD.encode(h.finalize());
    (verifier, challenge)
}

fn generate_state() -> String {
    URL_SAFE_NO_PAD.encode(uuid::Uuid::new_v4().as_bytes())
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

fn urlencode(s: &str) -> String {
    let mut out = String::with_capacity(s.len() * 3);
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9'
            | b'-' | b'_' | b'.' | b'~' => out.push(b as char),
            _ => out.push_str(&format!("%{:02X}", b)),
        }
    }
    out
}

fn percent_decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = String::with_capacity(s.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            let hi = (bytes[i + 1] as char).to_digit(16);
            let lo = (bytes[i + 2] as char).to_digit(16);
            if let (Some(h), Some(l)) = (hi, lo) {
                out.push((h * 16 + l) as u8 as char);
                i += 3;
                continue;
            }
        } else if bytes[i] == b'+' {
            out.push(' ');
            i += 1;
            continue;
        }
        out.push(bytes[i] as char);
        i += 1;
    }
    out
}

// ─── Browser helper ───────────────────────────────────────────────────────────

fn open_url_in_browser(url: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    std::process::Command::new("cmd")
        .args(["/c", "start", "", url])
        .spawn()
        .map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")]
    std::process::Command::new("open")
        .arg(url)
        .spawn()
        .map_err(|e| e.to_string())?;
    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open")
        .arg(url)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ─── OAuth2 redirect listener ─────────────────────────────────────────────────

/// Blocks until the browser delivers the OAuth callback or 5 minutes elapse.
/// Returns the authorization code.
async fn wait_for_oauth_callback(expected_state: &str) -> Result<String, String> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    let listener = TcpListener::bind(format!("127.0.0.1:{}", OAUTH_PORT))
        .await
        .map_err(|e| {
            format!(
                "Cannot start OAuth listener on port {}: {}. \
                 Another process may be using the port.",
                OAUTH_PORT, e
            )
        })?;

    let expected = expected_state.to_string();

    let result = tokio::time::timeout(
        std::time::Duration::from_secs(300),
        async move {
            let (mut stream, _) = listener.accept().await?;
            let mut buf = vec![0u8; 8192];
            let n = stream.read(&mut buf).await.unwrap_or(0);
            let request = String::from_utf8_lossy(&buf[..n]).to_string();

            let body = b"<!DOCTYPE html><html><head><title>DocVault</title>\
                <style>body{font-family:sans-serif;display:flex;align-items:center;\
                justify-content:center;min-height:100vh;margin:0;background:#f0fdf4}\
                .c{text-align:center;padding:2rem 3rem;border-radius:16px;background:#fff;\
                box-shadow:0 4px 24px rgba(0,0,0,.08)}\
                h2{color:#16a34a;margin:0 0 .5rem}p{color:#64748b;margin:0}\
                </style></head><body><div class='c'>\
                <div style='font-size:3.5rem;margin-bottom:1rem'>&#x2705;</div>\
                <h2>Authentication successful!</h2>\
                <p>You can close this tab and return to DocVault.</p>\
                </div></body></html>";

            let header = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\n\
                 Content-Length: {}\r\nConnection: close\r\n\r\n",
                body.len()
            );
            let _ = stream.write_all(header.as_bytes()).await;
            let _ = stream.write_all(body).await;
            let _ = stream.shutdown().await;
            Ok::<_, std::io::Error>(request)
        },
    )
    .await;

    let request = result
        .map_err(|_| "Google authentication timed out (5 min). Please try again.".to_string())?
        .map_err(|e| e.to_string())?;

    let path = request.lines().next().unwrap_or("")
        .split_whitespace().nth(1).unwrap_or("");
    let query = path.splitn(2, '?').nth(1).unwrap_or("");
    let params: HashMap<&str, &str> = query
        .split('&')
        .filter_map(|pair| {
            let mut it = pair.splitn(2, '=');
            Some((it.next()?, it.next()?))
        })
        .collect();

    if let Some(e) = params.get("error") {
        return Err(format!("Google auth error: {}", percent_decode(e)));
    }
    if percent_decode(params.get("state").copied().unwrap_or("")) != expected {
        return Err("OAuth state mismatch — possible CSRF. Please try again.".to_string());
    }

    params
        .get("code")
        .map(|s| percent_decode(s))
        .ok_or_else(|| "No authorization code in OAuth callback".to_string())
}

// ─── Token management ─────────────────────────────────────────────────────────

async fn exchange_code_for_tokens(
    code: &str,
    verifier: &str,
    client_id: &str,
) -> Result<OAuthTokenResponse, String> {
    let client = reqwest::Client::new();
    let resp = client
        .post(TOKEN_URL)
        .form(&[
            ("code", code),
            ("client_id", client_id),
            ("redirect_uri", REDIRECT_URI),
            ("grant_type", "authorization_code"),
            ("code_verifier", verifier),
        ])
        .send()
        .await
        .map_err(|e| format!("Token exchange failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!(
            "Token exchange error: {}",
            resp.text().await.unwrap_or_default()
        ));
    }
    resp.json::<OAuthTokenResponse>()
        .await
        .map_err(|e| format!("Token parse error: {}", e))
}

async fn do_refresh_token(
    refresh: &str,
    client_id: &str,
) -> Result<OAuthTokenResponse, String> {
    let client = reqwest::Client::new();
    let resp = client
        .post(TOKEN_URL)
        .form(&[
            ("refresh_token", refresh),
            ("client_id", client_id),
            ("grant_type", "refresh_token"),
        ])
        .send()
        .await
        .map_err(|e| format!("Token refresh failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!(
            "Token refresh error: {}",
            resp.text().await.unwrap_or_default()
        ));
    }
    resp.json::<OAuthTokenResponse>()
        .await
        .map_err(|e| format!("Refresh parse error: {}", e))
}

async fn fetch_user_email_inner(token: &str) -> Option<String> {
    let json: serde_json::Value = reqwest::Client::new()
        .get(USERINFO_URL)
        .bearer_auth(token)
        .send()
        .await
        .ok()?
        .json()
        .await
        .ok()?;
    json["email"].as_str().map(|s| s.to_string())
}

/// Returns a valid access token without holding a `Connection` reference across `.await`.
/// Returns `(token, Option<(new_token, new_expiry_rfc3339)>)`.
/// The caller must write the `Some` values back to the DB after this returns.
async fn resolve_access_token(
    token: String,
    refresh: Option<String>,
    exp_str: String,
    client_id: &str,
) -> Result<(String, Option<(String, String)>), String> {
    if token.is_empty() {
        return Err("Not connected to Google Drive. Please authenticate first.".to_string());
    }

    let expired = chrono::DateTime::parse_from_rfc3339(&exp_str)
        .map(|exp| chrono::Utc::now() >= exp)
        .unwrap_or(true);

    if !expired {
        return Ok((token, None));
    }

    let rt = refresh
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "Session expired. Please reconnect Google Drive.".to_string())?;

    let refreshed = do_refresh_token(&rt, client_id).await?;
    let new_exp = chrono::Utc::now()
        + chrono::Duration::seconds(refreshed.expires_in.saturating_sub(60));
    let new_exp_str = new_exp.to_rfc3339();
    Ok((refreshed.access_token.clone(), Some((refreshed.access_token, new_exp_str))))
}

// ─── Drive helpers ────────────────────────────────────────────────────────────

async fn get_or_create_drive_folder(
    client: &reqwest::Client,
    token: &str,
    name: &str,
) -> Result<String, String> {
    let q = format!(
        "name='{}' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        name.replace('\'', "\\'")
    );
    let resp = client
        .get(format!("{}/files", DRIVE_API))
        .bearer_auth(token)
        .query(&[("q", q.as_str()), ("fields", "files(id,name)")])
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    if let Some(id) = json["files"]
        .as_array()
        .and_then(|a| a.first())
        .and_then(|f| f["id"].as_str())
    {
        return Ok(id.to_string());
    }

    let resp = client
        .post(format!("{}/files", DRIVE_API))
        .bearer_auth(token)
        .json(&serde_json::json!({
            "name": name,
            "mimeType": "application/vnd.google-apps.folder"
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!(
            "Failed to create Drive folder: {}",
            resp.text().await.unwrap_or_default()
        ));
    }
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    Ok(json["id"].as_str().unwrap_or("").to_string())
}

/// Upload using the resumable upload protocol (works for any file size).
async fn upload_file_to_drive(
    client: &reqwest::Client,
    token: &str,
    folder_id: &str,
    file_path: &std::path::Path,
    file_name: &str,
    mime_type: &str,
    existing_id: Option<&str>,
) -> Result<String, String> {
    let file_bytes = tokio::fs::read(file_path)
        .await
        .map_err(|e| format!("Cannot read {:?}: {}", file_path, e))?;
    let file_size = file_bytes.len();

    let metadata = if existing_id.is_some() {
        serde_json::json!({ "name": file_name })
    } else {
        serde_json::json!({ "name": file_name, "parents": [folder_id] })
    };

    let (method, url) = match existing_id {
        Some(fid) => (
            reqwest::Method::PATCH,
            format!("{}/files/{}?uploadType=resumable", DRIVE_UPLOAD_API, fid),
        ),
        None => (
            reqwest::Method::POST,
            format!("{}/files?uploadType=resumable", DRIVE_UPLOAD_API),
        ),
    };

    let init = client
        .request(method, &url)
        .bearer_auth(token)
        .header("X-Upload-Content-Type", mime_type)
        .header("X-Upload-Content-Length", file_size.to_string())
        .json(&metadata)
        .send()
        .await
        .map_err(|e| format!("Upload init failed: {}", e))?;

    if !init.status().is_success() {
        return Err(format!(
            "Upload init error ({}): {}",
            init.status(),
            init.text().await.unwrap_or_default()
        ));
    }

    let session_url = init
        .headers()
        .get("location")
        .and_then(|v| v.to_str().ok())
        .ok_or("No upload session URL in Drive response")?
        .to_string();

    let upload = client
        .put(&session_url)
        .header("Content-Type", mime_type)
        .header("Content-Length", file_size.to_string())
        .body(file_bytes)
        .send()
        .await
        .map_err(|e| format!("File upload failed: {}", e))?;

    if !upload.status().is_success() {
        return Err(format!(
            "Drive upload error ({}): {}",
            upload.status(),
            upload.text().await.unwrap_or_default()
        ));
    }

    let json: serde_json::Value = upload.json().await.map_err(|e| e.to_string())?;
    Ok(json["id"].as_str().unwrap_or("").to_string())
}

// ─── Tauri commands ───────────────────────────────────────────────────────────

/// Opens the browser, listens for the OAuth callback, exchanges the code,
/// and stores the tokens. Blocks until complete (up to 5 minutes).
#[tauri::command]
pub async fn google_auth_start(state: State<'_, AppState>) -> Result<(), String> {
    let client_id = google_client_id()?;
    let (verifier, challenge) = generate_pkce();
    let oauth_state = generate_state();

    let auth_url = format!(
        "{}?client_id={}&redirect_uri={}&response_type=code\
         &scope={}&state={}&code_challenge={}&code_challenge_method=S256\
         &access_type=offline&prompt=consent",
        AUTH_URL,
        urlencode(client_id),
        urlencode(REDIRECT_URI),
        urlencode(SCOPE),
        oauth_state,
        challenge,
    );

    open_url_in_browser(&auth_url)?;
    let code = wait_for_oauth_callback(&oauth_state).await?;
    let tokens = exchange_code_for_tokens(&code, &verifier, client_id).await?;
    let email = fetch_user_email_inner(&tokens.access_token).await.unwrap_or_default();

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let exp = chrono::Utc::now()
        + chrono::Duration::seconds(tokens.expires_in.saturating_sub(60));

    queries::set_setting(&conn, "google_access_token", &tokens.access_token)
        .map_err(|e| e.to_string())?;
    if let Some(rt) = &tokens.refresh_token {
        queries::set_setting(&conn, "google_refresh_token", rt).map_err(|e| e.to_string())?;
    }
    queries::set_setting(&conn, "google_token_expires_at", &exp.to_rfc3339())
        .map_err(|e| e.to_string())?;
    if !email.is_empty() {
        queries::set_setting(&conn, "google_email", &email).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Legacy — callback is handled internally by `google_auth_start`.
#[tauri::command]
pub async fn google_auth_callback(
    _code: String,
    _state: State<'_, AppState>,
) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub async fn google_auth_status(state: State<'_, AppState>) -> Result<GoogleAuthStatus, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let token = queries::get_setting(&conn, "google_access_token")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();
    Ok(GoogleAuthStatus {
        is_authenticated: !token.is_empty(),
        email: queries::get_setting(&conn, "google_email").map_err(|e| e.to_string())?,
        last_sync: queries::get_setting(&conn, "last_sync_at").map_err(|e| e.to_string())?,
    })
}

#[tauri::command]
pub async fn google_auth_logout(state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    for key in &[
        "google_access_token",
        "google_refresh_token",
        "google_token_expires_at",
        "google_email",
    ] {
        queries::set_setting(&conn, key, "").map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Uploads new and modified documents to Google Drive.
#[tauri::command]
pub async fn sync_now(state: State<'_, AppState>) -> Result<SyncReport, String> {
    let start = std::time::Instant::now();
    let client_id = google_client_id()?;

    // Step 1: read token info + storage path from DB (sync, no await while locked)
    let (raw_token, raw_refresh, raw_exp_str, storage_path) = {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        let raw_token = queries::get_setting(&conn, "google_access_token")
            .map_err(|e| e.to_string())?
            .unwrap_or_default();
        let raw_refresh = queries::get_setting(&conn, "google_refresh_token")
            .map_err(|e| e.to_string())?;
        let raw_exp_str = queries::get_setting(&conn, "google_token_expires_at")
            .map_err(|e| e.to_string())?
            .unwrap_or_default();
        let storage = queries::get_setting(&conn, "storage_path")
            .map_err(|e| e.to_string())?
            .ok_or("Storage path not configured")?;
        (raw_token, raw_refresh, raw_exp_str, storage)
    }; // mutex released here

    // Step 2: resolve/refresh token (async, no lock held)
    let (access_token, maybe_new_tokens) =
        resolve_access_token(raw_token, raw_refresh, raw_exp_str, client_id).await?;

    // Step 3: if refreshed, write new tokens back to DB
    if let Some((ref new_token, ref new_exp_str)) = maybe_new_tokens {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        queries::set_setting(&conn, "google_access_token", new_token)
            .map_err(|e| e.to_string())?;
        queries::set_setting(&conn, "google_token_expires_at", new_exp_str)
            .map_err(|e| e.to_string())?;
    } // mutex released here

    // Step 4: load document list from DB
    let docs = {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
                "SELECT d.id, d.original_name, d.storage_path, d.mime_type, d.updated_at,
                        df.drive_file_id, df.synced_at
                 FROM documents d
                 LEFT JOIN drive_files df ON df.document_id = d.id
                 WHERE d.deleted_at IS NULL",
            )
            .map_err(|e| e.to_string())?;
        let rows: Vec<_> = stmt.query_map([], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, String>(2)?,
                    r.get::<_, String>(3)?,
                    r.get::<_, String>(4)?,
                    r.get::<_, Option<String>>(5)?,
                    r.get::<_, Option<String>>(6)?,
                ))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        drop(stmt);
        rows
    }; // mutex released here

    let client = reqwest::Client::new();
    let folder_id =
        get_or_create_drive_folder(&client, &access_token, DRIVE_FOLDER_NAME).await?;

    let mut uploaded = 0i32;
    let mut errors: Vec<String> = Vec::new();

    for (doc_id, original_name, rel_path, mime_type, updated_at, drive_file_id, synced_at) in
        &docs
    {
        let needs_upload = match drive_file_id {
            None => true,
            Some(_) => {
                let updated = chrono::DateTime::parse_from_rfc3339(updated_at).ok();
                let synced = synced_at
                    .as_ref()
                    .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok());
                match (updated, synced) {
                    (Some(u), Some(s)) => u > s,
                    _ => true,
                }
            }
        };
        if !needs_upload {
            continue;
        }

        let file_path = std::path::Path::new(&storage_path).join(rel_path);
        if !file_path.exists() {
            errors.push(format!("{}: file not found on disk", original_name));
            continue;
        }

        match upload_file_to_drive(
            &client,
            &access_token,
            &folder_id,
            &file_path,
            original_name,
            mime_type,
            drive_file_id.as_deref(),
        )
        .await
        {
            Ok(new_id) => {
                if let Ok(conn) = state.db.lock() {
                    let now = crate::utils::date::now_iso();
                    let _ = conn.execute(
                        "INSERT INTO drive_files
                             (document_id, drive_file_id, drive_folder_id, file_name, synced_at)
                         VALUES (?1,?2,?3,?4,?5)
                         ON CONFLICT(document_id) DO UPDATE SET
                             drive_file_id=?2, drive_folder_id=?3, file_name=?4, synced_at=?5",
                        rusqlite::params![doc_id, new_id, folder_id, original_name, now],
                    );
                }
                uploaded += 1;
            }
            Err(e) => errors.push(format!("{}: {}", original_name, e)),
        }
    }

    if let Ok(conn) = state.db.lock() {
        let _ = queries::set_setting(&conn, "last_sync_at", &crate::utils::date::now_iso());
    }

    Ok(SyncReport {
        events_downloaded: 0,
        events_uploaded: uploaded,
        files_downloaded: 0,
        files_uploaded: uploaded,
        conflicts_resolved: 0,
        errors,
        duration_ms: start.elapsed().as_millis() as i64,
    })
}
