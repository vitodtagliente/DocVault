/**
 * Settings page.
 */

import * as api from '../api.js';
import store from '../store.js';
import { showToast } from '../components/toast.js';

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
      <h1 class="text-xl font-bold text-[var(--color-text)]">Impostazioni</h1>

      <!-- Appearance -->
      <div class="card space-y-4">
        <h2 class="text-sm font-semibold text-[var(--color-text)]">Aspetto</h2>
        <div>
          <label class="label text-xs">Tema</label>
          <select id="theme-select" class="input text-sm" style="max-width:200px">
            <option value="system" ${settings.theme === 'system' ? 'selected' : ''}>Sistema (automatico)</option>
            <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Chiaro</option>
            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Scuro</option>
          </select>
        </div>
      </div>

      <!-- Storage -->
      <div class="card space-y-4">
        <h2 class="text-sm font-semibold text-[var(--color-text)]">Archiviazione</h2>
        <div>
          <label class="label text-xs">Cartella documenti</label>
          <p class="text-sm text-[var(--color-text)] font-mono bg-[var(--color-border)] px-3 py-2 rounded">
            ${escHtml(settings.storage_path || 'Non configurata')}
          </p>
        </div>
      </div>

      <!-- License -->
      <div class="card space-y-4">
        <h2 class="text-sm font-semibold text-[var(--color-text)]">Licenza</h2>
        ${licenseStatus.is_pro ? `
          <div class="flex items-center gap-2">
            <span class="badge bg-green-100 text-green-700">✅ Pro attivo</span>
            ${licenseStatus.activated_at ? `<span class="text-xs text-[var(--color-text-muted)]">Attivato il ${licenseStatus.activated_at.slice(0,10)}</span>` : ''}
          </div>
        ` : `
          <div class="space-y-3">
            <p class="text-sm text-[var(--color-text-muted)]">
              Attiva la licenza Pro per sbloccare la sincronizzazione Google Drive.
            </p>
            <div class="flex gap-2">
              <input type="text" id="license-key" class="input text-sm font-mono"
                     placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" maxlength="29" />
              <button id="activate-license" class="btn-primary whitespace-nowrap">Attiva</button>
            </div>
          </div>
        `}
      </div>

      <!-- About -->
      <div class="card">
        <h2 class="text-sm font-semibold text-[var(--color-text)] mb-2">Informazioni</h2>
        <p class="text-xs text-[var(--color-text-muted)]">DocVault v1.0.0 · Tauri 2 + Vanilla JS + SQLite</p>
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

      showToast('Tema aggiornato', 'success');
    } catch (err) {
      showToast('Errore: ' + err, 'error');
    }
  });

  // License activation
  container.querySelector('#activate-license')?.addEventListener('click', async () => {
    const key = container.querySelector('#license-key')?.value.trim();
    if (!key) { showToast('Inserisci il codice licenza', 'warning'); return; }
    try {
      const result = await api.verifyLicense(key);
      if (result.is_pro) {
        showToast('Licenza Pro attivata! 🎉', 'success');
        await render(container);
      }
    } catch (err) {
      const msg = err === 'INVALID_LICENSE' ? 'Codice non valido'
                : err === 'INVALID_FORMAT' ? 'Formato non corretto'
                : 'Errore: ' + err;
      showToast(msg, 'error');
    }
  });
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
