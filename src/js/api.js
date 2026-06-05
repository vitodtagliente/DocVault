/**
 * Tauri invoke() wrapper — all backend calls go through here.
 * Each function maps 1:1 to a Rust #[tauri::command].
 */

const invoke = window.__TAURI__?.core?.invoke
  ?? window.__TAURI__?.tauri?.invoke
  ?? (async (cmd, args) => {
    // Dev fallback: log to console
    console.warn(`[api] invoke('${cmd}', ...)`, args);
    throw new Error(`Tauri not available`);
  });

async function call(cmd, args) {
  try {
    return await invoke(cmd, args);
  } catch (err) {
    console.error(`[api] ${cmd} failed:`, err);
    throw err;
  }
}

// ─── Settings ────────────────────────────────────────────────────────────────
export const getSettings     = ()             => call('get_settings');
export const updateSetting   = (key, value)   => call('update_setting', { key, value });
export const validateStoragePath = (path)     => call('validate_storage_path', { path });
export const checkVaultPath  = (path)         => call('check_vault_path', { path });
export const completeSetup   = (storagePath)  => call('complete_setup', { storagePath });

// ─── Documents ───────────────────────────────────────────────────────────────
export const createDocument  = (payload)      => call('create_document', { payload });
export const updateDocument  = (payload)      => call('update_document', { payload });
export const deleteDocument  = (id)           => call('delete_document', { id });
export const restoreDocument = (id)           => call('restore_document', { id });
export const purgeDocument   = (id)           => call('purge_document', { id });
export const getDocument     = (id)           => call('get_document', { id });
export const getDocumentFilePath = (id)       => call('get_document_file_path', { id });

// ─── Search ──────────────────────────────────────────────────────────────────
export const searchDocuments  = (filters)     => call('search_documents', { filters });
export const searchSuggestions = (query)      => call('search_suggestions', { query });
export const getStats         = ()            => call('get_stats');

// ─── Categories ──────────────────────────────────────────────────────────────
export const listCategories   = ()            => call('list_categories');
export const createCategory   = (payload)     => call('create_category', { payload });
export const updateCategory   = (payload)     => call('update_category', { payload });
export const deleteCategory   = (id)          => call('delete_category', { id });
export const getPresetFields  = (categoryId)  => call('get_preset_fields', { categoryId });
export const addPresetField   = (categoryId, payload) => call('add_preset_field', { categoryId, payload });
export const removePresetField = (fieldId)    => call('remove_preset_field', { fieldId });

// ─── Tags ─────────────────────────────────────────────────────────────────────
export const listTags         = ()            => call('list_tags');
export const listTagsWithCount = ()           => call('list_tags_with_count');
export const createTag        = (name, color) => call('create_tag', { name, color });
export const deleteTag        = (id)          => call('delete_tag', { id });

// ─── Files ───────────────────────────────────────────────────────────────────
export const revealInFileManager = (documentId) => call('reveal_in_file_manager', { documentId });
export const openWithSystem   = (documentId)  => call('open_with_system', { documentId });
export const readFileBytes    = (documentId)  => call('read_file_bytes', { documentId });
export const readFileText     = (documentId)  => call('read_file_text', { documentId });

// ─── OCR ─────────────────────────────────────────────────────────────────────
export const runOcr           = (documentId, languages) => call('run_ocr', { documentId, languages });

// ─── Export ──────────────────────────────────────────────────────────────────
export const exportCsv        = (filters, outputPath) => call('export_csv', { filters, outputPath });

// ─── Backup ──────────────────────────────────────────────────────────────────
export const createBackup     = (outputPath)  => call('create_backup', { outputPath });
export const restoreBackup    = (zipPath)     => call('restore_backup', { zipPath });

// ─── Sync ─────────────────────────────────────────────────────────────────────
export const syncNow          = ()            => call('sync_now');
export const googleAuthStart  = ()            => call('google_auth_start');
export const googleAuthCallback = (code)      => call('google_auth_callback', { code });
export const googleAuthStatus = ()            => call('google_auth_status');
export const googleAuthLogout = ()            => call('google_auth_logout');

// ─── License ─────────────────────────────────────────────────────────────────
export const verifyLicense    = (licenseKey)  => call('verify_license', { licenseKey });
export const getLicenseStatus = ()            => call('get_license_status');

// ─── File dialog helpers (Tauri dialog plugin) ───────────────────────────────
export async function openFileDialog(filters = []) {
  const dialog = window.__TAURI__?.dialog;
  if (!dialog) throw new Error('Tauri dialog not available');
  return dialog.open({ multiple: false, filters });
}

export async function saveFileDialog(defaultPath, filters = []) {
  const dialog = window.__TAURI__?.dialog;
  if (!dialog) throw new Error('Tauri dialog not available');
  return dialog.save({ defaultPath, filters });
}

export async function openFolderDialog() {
  const dialog = window.__TAURI__?.dialog;
  if (!dialog) throw new Error('Tauri dialog not available');
  return dialog.open({ directory: true, multiple: false });
}
