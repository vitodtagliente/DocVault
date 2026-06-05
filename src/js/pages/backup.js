/**
 * Backup & Restore page.
 */

import * as api from '../api.js';
import { t } from '../i18n.js';
import { icon } from '../utils/icons.js';
import { showToast } from '../components/toast.js';
import { confirm } from '../components/modal.js';

export async function render(container) {
  container.innerHTML = `
    <div class="max-w-2xl mx-auto space-y-6">
      <h1 class="text-xl font-bold text-[var(--color-text)]">${t('backup.title')}</h1>

      <!-- Backup -->
      <div class="card space-y-4">
        <div class="flex items-center gap-3">
          <span style="width:2.5rem;height:2.5rem;border-radius:var(--radius-lg);display:flex;align-items:center;
                       justify-content:center;background:var(--color-primary);color:white;font-size:1.25rem">
            ${icon('backup', 'w-5 h-5')}
          </span>
          <div>
            <h2 class="text-sm font-semibold text-[var(--color-text)]">${t('backup.createTitle')}</h2>
            <p class="text-xs text-[var(--color-text-muted)]">${t('backup.createDesc')}</p>
          </div>
        </div>
        <button id="btn-backup" class="btn-primary" style="display:flex;align-items:center;gap:.5rem">
          ${icon('download', 'w-4 h-4')} ${t('backup.createBtn')}
        </button>
        <div id="backup-status" class="hidden text-sm"></div>
      </div>

      <!-- Restore -->
      <div class="card space-y-4">
        <div class="flex items-center gap-3">
          <span style="width:2.5rem;height:2.5rem;border-radius:var(--radius-lg);display:flex;align-items:center;
                       justify-content:center;background:#ef4444;color:white;font-size:1.25rem">
            ${icon('upload', 'w-5 h-5')}
          </span>
          <div>
            <h2 class="text-sm font-semibold text-[var(--color-text)]">${t('backup.restoreTitle')}</h2>
            <p class="text-xs text-[var(--color-text-muted)]" style="display:flex;align-items:center;gap:.375rem">
              ${icon('warning', 'w-3.5 h-3.5', '#f59e0b')} ${t('backup.restoreWarning')}
            </p>
          </div>
        </div>
        <button id="btn-restore" class="btn-danger" style="display:flex;align-items:center;gap:.5rem">
          ${icon('upload', 'w-4 h-4')} ${t('backup.restoreBtn')}
        </button>
      </div>
    </div>
  `;

  container.querySelector('#btn-backup')?.addEventListener('click', async () => {
    try {
      const path = await api.saveFileDialog(`docvault_backup_${new Date().toISOString().slice(0,10)}.zip`, [
        { name: 'ZIP', extensions: ['zip'] }
      ]);
      if (!path) return;
      const btn = container.querySelector('#btn-backup');
      btn.disabled = true;
      btn.innerHTML = `<div class="spinner" style="width:1rem;height:1rem"></div> ${t('backup.creating')}`;
      const result = await api.createBackup(path);
      showToast(t('backup.created'), 'success');
      container.querySelector('#backup-status').innerHTML = `
        <div style="display:flex;align-items:center;gap:.5rem;color:#16a34a">
          ${icon('checkCircle', 'w-4 h-4')} ${t('backup.savedAt')}${result}
        </div>
      `;
      container.querySelector('#backup-status').classList.remove('hidden');
    } catch (err) {
      showToast(t('backup.error') + err, 'error');
    } finally {
      const btn = container.querySelector('#btn-backup');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `${icon('download', 'w-4 h-4')} ${t('backup.createBtn')}`;
      }
    }
  });

  container.querySelector('#btn-restore')?.addEventListener('click', async () => {
    confirm(
      t('backup.restoreConfirm'),
      async () => {
        try {
          const path = await api.openFileDialog([{ name: 'ZIP', extensions: ['zip'] }]);
          if (!path) return;
          await api.restoreBackup(path);
          showToast(t('backup.restored'), 'success');
        } catch (err) {
          showToast(t('backup.restoreError') + err, 'error');
        }
      },
      t('backup.restoreModalTitle'),
    );
  });
}
