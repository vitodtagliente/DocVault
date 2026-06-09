/**
 * Google Drive Sync page.
 */

import * as api from '../api.js';
import { t } from '../i18n.js';
import { icon } from '../utils/icons.js';
import { showToast } from '../components/toast.js';

export async function render(container) {
  let status;
  try {
    status = await api.googleAuthStatus();
  } catch {
    status = { is_authenticated: false };
  }

  container.innerHTML = `
    <div class="max-w-2xl mx-auto space-y-6">
      <h1 class="text-xl font-bold text-[var(--color-text)]">${t('sync.title')}</h1>

      ${status.is_authenticated ? `
        <div class="card space-y-4">
          <div class="flex items-center gap-3">
            <span style="width:2.5rem;height:2.5rem;border-radius:var(--radius-lg);display:flex;align-items:center;
                         justify-content:center;background:var(--color-primary);color:white">
              ${icon('cloud', 'w-5 h-5')}
            </span>
            <div>
              <p class="font-semibold text-sm text-[var(--color-text)]">${t('sync.connected')}</p>
              ${status.email ? `<p class="text-xs text-[var(--color-text-muted)]">${escHtml(status.email)}</p>` : ''}
              ${status.last_sync ? `<p class="text-xs text-[var(--color-text-muted)]">${t('sync.lastSync')}${status.last_sync.slice(0,16).replace('T',' ')}</p>` : ''}
            </div>
          </div>
          <div class="flex gap-2">
            <button id="btn-sync"   class="btn-primary"   style="display:flex;align-items:center;gap:.5rem">${icon('sync', 'w-4 h-4')} ${t('sync.syncNow')}</button>
            <button id="btn-logout" class="btn-secondary" style="display:flex;align-items:center;gap:.5rem">${t('sync.disconnect')}</button>
          </div>
          <div id="sync-status" class="hidden text-sm"></div>
        </div>
      ` : `
        <div class="card space-y-4">
          <p class="text-sm text-[var(--color-text-muted)]">${t('sync.connectDesc')}</p>
          <button id="btn-login" class="btn-primary" style="display:flex;align-items:center;gap:.5rem">
            ${icon('link', 'w-4 h-4')} ${t('sync.connect')}
          </button>
          <div id="auth-status" class="hidden"></div>
        </div>
      `}
    </div>
  `;

  container.querySelector('#btn-login')?.addEventListener('click', async () => {
    const btn = container.querySelector('#btn-login');
    const statusEl = container.querySelector('#auth-status');

    btn.disabled = true;
    btn.innerHTML = `<div class="spinner" style="width:.9rem;height:.9rem;flex-shrink:0"></div> ${t('sync.authenticating')}`;
    statusEl.innerHTML = `<p class="text-xs text-[var(--color-text-muted)]">${t('sync.authenticatingHint')}</p>`;
    statusEl.classList.remove('hidden');

    try {
      await api.googleAuthStart();
      showToast(t('sync.authSuccess'), 'success');
      await render(container);
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = `${icon('link', 'w-4 h-4')} ${t('sync.connect')}`;
      statusEl.innerHTML = `<p class="text-sm text-red-500">${escHtml(String(err))}</p>`;
      showToast(t('sync.error') + err, 'error');
    }
  });

  container.querySelector('#btn-logout')?.addEventListener('click', async () => {
    try {
      await api.googleAuthLogout();
      showToast(t('sync.disconnected'), 'info');
      await render(container);
    } catch (err) {
      showToast(t('sync.error') + err, 'error');
    }
  });

  container.querySelector('#btn-sync')?.addEventListener('click', async () => {
    const btn      = container.querySelector('#btn-sync');
    const statusEl = container.querySelector('#sync-status');
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner" style="width:.9rem;height:.9rem;flex-shrink:0"></div> ${t('sync.syncing')}`;
    statusEl.classList.remove('hidden');
    statusEl.textContent = t('sync.inProgress');
    try {
      const report = await api.syncNow();
      const hasErrors = report.errors && report.errors.length > 0;
      statusEl.innerHTML = `
        <p style="color:#16a34a;display:flex;align-items:center;gap:.375rem">${icon('checkCircle', 'w-4 h-4')} ${t('sync.doneMsg')} (${report.duration_ms}ms)</p>
        <p class="text-xs text-[var(--color-text-muted)]">
          ↑ ${report.files_uploaded} files uploaded
        </p>
        ${hasErrors ? `<p class="text-xs text-amber-600 mt-1">${report.errors.length} error(s): ${escHtml(report.errors[0])}${report.errors.length > 1 ? ` (+${report.errors.length - 1} more)` : ''}</p>` : ''}
      `;
      showToast(t('sync.doneMsg'), 'success');
    } catch (err) {
      statusEl.innerHTML = `<p class="text-red-500">${t('sync.error')}${escHtml(String(err))}</p>`;
      showToast(t('sync.syncError') + err, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `${icon('sync', 'w-4 h-4')} ${t('sync.syncNow')}`;
    }
  });
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

