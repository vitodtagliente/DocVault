/**
 * Settings page.
 */

import * as api from '../api.js';
import store from '../store.js';
import { t, initI18n, getCurrentLang } from '../i18n.js';
import { appConfig } from '../app-config.js';
import { showToast } from '../components/toast.js';
import { confirm } from '../components/modal.js';

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
    <div class="max-w-2xl mx-auto space-y-6">
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

      <!-- License -->
      <div class="card space-y-4">
        <h2 class="text-sm font-semibold text-[var(--color-text)]">${t('settings.license')}</h2>
        ${licenseStatus.is_pro ? `
          <div class="flex items-center gap-2">
            <span class="badge bg-green-100 text-green-700">${t('settings.proActive')}</span>
            ${licenseStatus.activated_at ? `<span class="text-xs text-[var(--color-text-muted)]">${t('settings.activatedOn')} ${licenseStatus.activated_at.slice(0,10)}</span>` : ''}
          </div>
        ` : `
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
        `}
      </div>

      <!-- About -->
      <div class="card">
        <h2 class="text-sm font-semibold text-[var(--color-text)] mb-2">${t('settings.about')}</h2>
        <p class="text-xs text-[var(--color-text-muted)]">${appConfig.name} v${appConfig.version} · ${appConfig.tech}</p>
        ${appConfig.tagline ? `<p class="text-xs text-[var(--color-text-muted)] mt-0.5 italic">${escHtml(appConfig.tagline)}</p>` : ''}
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
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
