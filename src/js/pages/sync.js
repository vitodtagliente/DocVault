/**
 * Google Drive Sync page.
 */

import * as api from '../api.js';
import { showToast } from '../components/toast.js';

export async function render(container) {
  let status;
  try {
    status = await api.googleAuthStatus();
  } catch {
    status = { is_authenticated: false };
  }

  let licenseStatus;
  try {
    licenseStatus = await api.getLicenseStatus();
  } catch {
    licenseStatus = { is_pro: false };
  }

  container.innerHTML = `
    <div class="max-w-2xl mx-auto space-y-6">
      <h1 class="text-xl font-bold text-[var(--color-text)]">Sync Google Drive</h1>

      ${!licenseStatus.is_pro ? `
        <div class="card border-amber-300 space-y-3">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🔒</span>
            <div>
              <p class="font-semibold text-sm text-[var(--color-text)]">Funzionalità Pro</p>
              <p class="text-xs text-[var(--color-text-muted)]">
                La sincronizzazione con Google Drive richiede una licenza Pro.
              </p>
            </div>
          </div>
          <a href="#/settings" class="btn-primary text-sm inline-flex">Attiva licenza Pro</a>
        </div>
      ` : status.is_authenticated ? `
        <div class="card space-y-4">
          <div class="flex items-center gap-3">
            <span class="text-3xl">☁️</span>
            <div>
              <p class="font-semibold text-sm text-[var(--color-text)]">Connesso a Google Drive</p>
              ${status.email ? `<p class="text-xs text-[var(--color-text-muted)]">${escHtml(status.email)}</p>` : ''}
              ${status.last_sync ? `<p class="text-xs text-[var(--color-text-muted)]">Ultima sync: ${status.last_sync.slice(0,16).replace('T',' ')}</p>` : ''}
            </div>
          </div>
          <div class="flex gap-2">
            <button id="btn-sync" class="btn-primary">🔄 Sincronizza ora</button>
            <button id="btn-logout" class="btn-secondary">Disconnetti</button>
          </div>
          <div id="sync-status" class="hidden text-sm"></div>
        </div>
      ` : `
        <div class="card space-y-4">
          <p class="text-sm text-[var(--color-text-muted)]">
            Connetti il tuo account Google per sincronizzare documenti tra dispositivi.
          </p>
          <button id="btn-login" class="btn-primary">🔗 Connetti Google Drive</button>
        </div>
      `}
    </div>
  `;

  container.querySelector('#btn-login')?.addEventListener('click', async () => {
    try {
      await api.googleAuthStart();
    } catch (err) {
      showToast('Errore: ' + err, 'error');
    }
  });

  container.querySelector('#btn-logout')?.addEventListener('click', async () => {
    try {
      await api.googleAuthLogout();
      showToast('Disconnesso da Google Drive', 'info');
      await render(container);
    } catch (err) {
      showToast('Errore: ' + err, 'error');
    }
  });

  container.querySelector('#btn-sync')?.addEventListener('click', async () => {
    const btn = container.querySelector('#btn-sync');
    const statusEl = container.querySelector('#sync-status');
    btn.disabled = true;
    btn.textContent = '🔄 Sincronizzazione…';
    statusEl.classList.remove('hidden');
    statusEl.textContent = 'In corso…';
    try {
      const report = await api.syncNow();
      statusEl.innerHTML = `
        <p class="text-green-600">✅ Completata in ${report.duration_ms}ms</p>
        <p class="text-xs text-[var(--color-text-muted)]">
          ↓ ${report.events_downloaded} eventi, ${report.files_downloaded} file
          · ↑ ${report.events_uploaded} eventi, ${report.files_uploaded} file
          · ${report.conflicts_resolved} conflitti risolti
        </p>
      `;
      showToast('Sync completata!', 'success');
    } catch (err) {
      statusEl.innerHTML = `<p class="text-red-500">Errore: ${escHtml(String(err))}</p>`;
      showToast('Errore sync: ' + err, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '🔄 Sincronizza ora';
    }
  });
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
