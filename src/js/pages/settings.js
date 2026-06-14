/**
 * Settings page.
 */

import * as api from '../api.js';
import store from '../store.js';
import { t, initI18n, getCurrentLang } from '../i18n.js';
import { appConfig } from '../app-config.js';
import { showToast } from '../components/toast.js';
import { confirm, openModal, closeModal } from '../components/modal.js';

export async function render(container) {
  let settings;
  try {
    settings = await api.getSettings();
    store.setState({ settings });
  } catch (err) {
    container.innerHTML = `<p class="text-red-500">${err}</p>`;
    return;
  }

  let licenseStatus;
  try {
    licenseStatus = await api.getLicenseStatus();
  } catch {
    licenseStatus = { is_pro: false };
  }

  container.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-6">
      <h1 class="text-xl font-bold text-[var(--color-text)]">${t('settings.title')}</h1>

      <!-- Appearance -->
      <div class="card space-y-4">
        <h2 class="text-sm font-semibold text-[var(--color-text)]">${t('settings.appearance')}</h2>
        <div>
          <label class="label text-xs">${t('settings.theme')}</label>
          <select id="theme-select" class="input text-sm" style="max-width:200px">
            <option value="system" ${settings.theme === 'system' ? 'selected' : ''}>${t('settings.themeSystem')}</option>
            <option value="light"  ${settings.theme === 'light'  ? 'selected' : ''}>${t('settings.themeLight')}</option>
            <option value="dark"   ${settings.theme === 'dark'   ? 'selected' : ''}>${t('settings.themeDark')}</option>
          </select>
        </div>
        <div>
          <label class="label text-xs">${t('settings.language')}</label>
          <select id="lang-select" class="input text-sm" style="max-width:200px">
            <option value=""   ${!settings.language ? 'selected' : ''}>${t('settings.langAuto')}</option>
            <option value="it" ${settings.language === 'it' ? 'selected' : ''}>${t('settings.langIt')}</option>
            <option value="en" ${settings.language === 'en' ? 'selected' : ''}>${t('settings.langEn')}</option>
          </select>
        </div>
      </div>

      <!-- Storage -->
      <div class="card space-y-4">
        <h2 class="text-sm font-semibold text-[var(--color-text)]">${t('settings.storage')}</h2>
        <div>
          <label class="label text-xs">${t('settings.storageFolder')}</label>
          <div class="flex items-center gap-2 mt-1">
            <p id="storage-path-display"
               class="flex-1 text-sm text-[var(--color-text)] font-mono bg-[var(--color-border)] px-3 py-2 rounded truncate">
              ${escHtml(settings.storage_path || t('settings.notConfigured'))}
            </p>
            <button id="change-storage-btn" class="btn-secondary text-sm whitespace-nowrap flex-shrink-0">
              ${t('settings.changeFolder')}
            </button>
          </div>
          <div id="change-storage-status" class="hidden mt-2"></div>
        </div>
      </div>

      <!-- Shortcut -->
      <div class="card space-y-4">
        <h2 class="text-sm font-semibold text-[var(--color-text)]">${t('settings.shortcut')}</h2>
        <p class="text-xs text-[var(--color-text-muted)]">${t('settings.shortcutDesc')}</p>
        <div id="shortcut-display" class="flex items-center gap-3 flex-wrap">
          <div class="flex items-center gap-1.5">
            <span class="text-xs text-[var(--color-text-muted)]">${t('settings.shortcutCurrent')}:</span>
            <span id="shortcut-badge">${shortcutBadge(settings.global_shortcut)}</span>
          </div>
          <div class="flex gap-2">
            <button id="btn-record-shortcut" class="btn-secondary text-xs py-1">${t('settings.shortcutRecord')}</button>
            <button id="btn-disable-shortcut" class="btn-ghost text-xs py-1"
                    ${!settings.global_shortcut ? 'disabled' : ''}>${t('settings.shortcutDisable')}</button>
          </div>
        </div>
        <div id="shortcut-recorder" class="hidden space-y-2">
          <div id="shortcut-capture-box"
               tabindex="0"
               class="input text-sm font-mono select-none cursor-pointer flex items-center justify-center"
               style="min-height:2.5rem;text-align:center;color:var(--color-text-muted)">
            ${t('settings.shortcutRecording')}
          </div>
          <div id="shortcut-preview" class="hidden flex items-center gap-2 flex-wrap">
            <span class="text-xs text-[var(--color-text-muted)]">${t('settings.shortcutCurrent')}:</span>
            <span id="shortcut-preview-badge"></span>
          </div>
          <div class="flex gap-2">
            <button id="btn-save-shortcut" class="btn-primary text-xs py-1" disabled>${t('settings.shortcutSave')}</button>
            <button id="btn-cancel-shortcut" class="btn-ghost text-xs py-1">${t('settings.shortcutCancel')}</button>
          </div>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="card space-y-4" style="border:1px solid #fca5a5">
        <h2 class="text-sm font-semibold" style="color:#dc2626">${t('settings.dangerZone')}</h2>
        <p class="text-xs text-[var(--color-text-muted)]">${t('settings.resetDesc')}</p>
        <button id="reset-vault-btn" class="btn-secondary text-sm" style="color:#dc2626;border-color:#fca5a5">
          <i class="fa-solid fa-rotate-left mr-1.5"></i>${t('settings.resetBtn')}
        </button>
      </div>

      <!-- License -->
      <div class="card space-y-4">
        <h2 class="text-sm font-semibold text-[var(--color-text)]">${t('settings.license')}</h2>
        ${licenseStatus.is_pro ? `
          <div class="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <span class="text-2xl" aria-hidden="true">❤️</span>
            <div>
              <p class="font-semibold text-sm text-green-700 dark:text-green-400">${t('settings.proActive')}</p>
              ${licenseStatus.activated_at ? `<span class="text-xs text-[var(--color-text-muted)]">${t('settings.activatedOn')} ${licenseStatus.activated_at.slice(0,10)}</span>` : ''}
            </div>
          </div>
        ` : ''}
        <div class="space-y-3">
          <p class="text-sm text-[var(--color-text-muted)]">
            ${t('settings.activateProDesc')}
          </p>
          <div class="flex gap-2">
            <input type="text" id="license-key" class="input text-sm font-mono"
                   placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" maxlength="29" />
            <button id="activate-license" class="btn-primary whitespace-nowrap">${t('settings.activate')}</button>
          </div>
        </div>
      </div>

    </div>
  `;

  // Theme
  container.querySelector('#theme-select')?.addEventListener('change', async (e) => {
    const theme = e.target.value;
    try {
      await api.updateSetting('theme', theme);
      store.setState({ settings: { ...store.getState().settings, theme } });

      const html = document.documentElement;
      if (theme === 'dark') html.classList.add('dark');
      else if (theme === 'light') html.classList.remove('dark');
      else html.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);

      showToast(t('settings.themeUpdated'), 'success');
    } catch (err) {
      showToast(t('settings.error') + err, 'error');
    }
  });

  // Language
  container.querySelector('#lang-select')?.addEventListener('change', async (e) => {
    const lang = e.target.value;
    try {
      await api.updateSetting('language', lang);
      store.setState({ settings: { ...store.getState().settings, language: lang } });
      initI18n(lang);
      showToast(t('settings.langUpdated'), 'success');
      // Notify app to re-render shell and current page
      store.setState({ lang: getCurrentLang() });
    } catch (err) {
      showToast(t('settings.error') + err, 'error');
    }
  });

  // Change storage folder
  container.querySelector('#change-storage-btn')?.addEventListener('click', async () => {
    const path = await api.openFolderDialog(settings.storage_path || undefined);
    if (!path) return;
    const statusEl = container.querySelector('#change-storage-status');
    const valid = await api.validateStoragePath(path);
    if (!valid) {
      statusEl.innerHTML = `<p class="text-sm text-red-500">${t('setup.invalidPath')}</p>`;
      statusEl.classList.remove('hidden');
      return;
    }
    confirm(t('settings.changeFolderConfirm', { path }), async () => {
      try {
        await api.completeSetup(path);
        container.querySelector('#storage-path-display').textContent = path;
        statusEl.innerHTML = `<p class="text-sm text-green-600">✓ ${path}</p>`;
        statusEl.classList.remove('hidden');
        showToast(t('settings.folderUpdated'), 'success');
      } catch (err) {
        showToast(t('settings.error') + err, 'error');
      }
    }, t('settings.changeFolder'));
  });

  // License activation
  container.querySelector('#activate-license')?.addEventListener('click', async () => {
    const key = container.querySelector('#license-key')?.value.trim();
    if (!key) { showToast(t('settings.enterLicense'), 'warning'); return; }
    try {
      const result = await api.verifyLicense(key);
      if (result.is_pro) {
        showToast(t('settings.licenseActivated'), 'success');
        await render(container);
      }
    } catch (err) {
      const msg = err === 'INVALID_LICENSE' ? t('settings.invalidLicense')
                : err === 'INVALID_FORMAT'  ? t('settings.invalidFormat')
                : t('settings.error') + err;
      showToast(msg, 'error');
    }
  });

  // Reset vault
  container.querySelector('#reset-vault-btn')?.addEventListener('click', () => {
    openModal({
      title: t('settings.resetTitle'),
      body: `
        <div class="space-y-3">
          <div class="flex items-start gap-3 p-3 rounded-lg" style="background:#fef2f2;border:1px solid #fca5a5">
            <i class="fa-solid fa-triangle-exclamation mt-0.5 flex-shrink-0" style="color:#dc2626"></i>
            <div class="text-sm space-y-1.5" style="color:#991b1b">
              <p class="font-semibold">${t('settings.resetWarningTitle')}</p>
              <ul class="list-disc pl-4 space-y-0.5 text-xs">
                <li>${t('settings.resetWarn1')}</li>
                <li>${t('settings.resetWarn2')}</li>
                <li>${t('settings.resetWarn3')}</li>
              </ul>
            </div>
          </div>
          <p class="text-sm text-[var(--color-text-muted)]">${t('settings.resetFilesNote')}</p>
          <div>
            <label class="label text-xs">${t('settings.resetTypeConfirm')}</label>
            <input id="reset-confirm-input" class="input text-sm font-mono" placeholder="RESET" autocomplete="off" />
          </div>
        </div>
      `,
      actions: [
        { label: t('settings.resetCancel'), variant: 'secondary', onClick: closeModal },
        {
          label: t('settings.resetConfirmBtn'),
          variant: 'primary',
          style: 'background:#dc2626;border-color:#dc2626',
          onClick: async () => {
            const val = document.querySelector('#reset-confirm-input')?.value.trim();
            if (val !== 'RESET') {
              document.querySelector('#reset-confirm-input')?.classList.add('border-red-400');
              return;
            }
            try {
              await api.resetVault();
              closeModal();
              window.location.reload();
            } catch (err) {
              showToast(t('settings.error') + err, 'error');
            }
          },
        },
      ],
    });
  });

  // ── Shortcut recorder ─────────────────────────────────────────────────────
  let capturedShortcut = '';

  const btnRecord    = container.querySelector('#btn-record-shortcut');
  const btnDisable   = container.querySelector('#btn-disable-shortcut');
  const displayEl    = container.querySelector('#shortcut-display');
  const recorderEl   = container.querySelector('#shortcut-recorder');
  const captureBox   = container.querySelector('#shortcut-capture-box');
  const previewEl    = container.querySelector('#shortcut-preview');
  const previewBadge = container.querySelector('#shortcut-preview-badge');
  const btnSave      = container.querySelector('#btn-save-shortcut');
  const btnCancel    = container.querySelector('#btn-cancel-shortcut');

  function showRecorder() {
    displayEl.classList.add('hidden');
    recorderEl.classList.remove('hidden');
    capturedShortcut = '';
    captureBox.textContent = t('settings.shortcutRecording');
    captureBox.style.color = 'var(--color-text-muted)';
    previewEl.classList.add('hidden');
    btnSave.disabled = true;
    captureBox.focus();
  }

  function hideRecorder() {
    recorderEl.classList.add('hidden');
    displayEl.classList.remove('hidden');
  }

  btnRecord?.addEventListener('click', showRecorder);
  btnCancel?.addEventListener('click', hideRecorder);

  captureBox?.addEventListener('keydown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const modifierOnly = ['Shift','Alt','Control','Meta','CapsLock','Tab','Escape','Dead'];
    if (modifierOnly.includes(e.key)) return;

    const parts = [];
    if (e.ctrlKey)  parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey)   parts.push('Alt');
    if (e.metaKey)  parts.push('Meta');

    if (parts.length === 0) {
      captureBox.textContent = t('settings.shortcutInvalid');
      captureBox.style.color = 'var(--color-danger, #ef4444)';
      btnSave.disabled = true;
      return;
    }

    let key = e.key;
    if (key === ' ') key = 'Space';
    else if (key.length === 1) key = key.toUpperCase();

    parts.push(key);
    capturedShortcut = parts.join('+');
    captureBox.textContent = capturedShortcut;
    captureBox.style.color = 'var(--color-text)';
    previewBadge.innerHTML = shortcutBadge(capturedShortcut);
    previewEl.classList.remove('hidden');
    btnSave.disabled = false;
  });

  btnDisable?.addEventListener('click', async () => {
    try {
      await api.updateGlobalShortcut('');
      container.querySelector('#shortcut-badge').innerHTML = shortcutBadge('');
      btnDisable.disabled = true;
      showToast(t('settings.shortcutUpdated'), 'success');
    } catch (err) {
      showToast(t('settings.error') + err, 'error');
    }
  });

  btnSave?.addEventListener('click', async () => {
    if (!capturedShortcut) return;
    try {
      await api.updateGlobalShortcut(capturedShortcut);
      container.querySelector('#shortcut-badge').innerHTML = shortcutBadge(capturedShortcut);
      btnDisable.disabled = false;
      hideRecorder();
      showToast(t('settings.shortcutUpdated'), 'success');
    } catch (err) {
      showToast(t('settings.shortcutInvalid') + ': ' + err, 'error');
    }
  });
}

function shortcutBadge(str) {
  if (!str) {
    return `<span class="text-xs italic" style="color:var(--color-text-muted)">${t('settings.shortcutDisabled')}</span>`;
  }
  const sep = `<span style="font-size:.7rem;margin:0 .15rem;color:var(--color-text-muted)">+</span>`;
  return str.split('+').map(key =>
    `<kbd style="display:inline-flex;align-items:center;padding:.1rem .4rem;border-radius:.25rem;
border:1px solid var(--color-border);background:var(--color-surface);
font-size:.7rem;font-family:monospace;color:var(--color-text);
box-shadow:0 1px 0 var(--color-border)">${key}</kbd>`
  ).join(sep);
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
