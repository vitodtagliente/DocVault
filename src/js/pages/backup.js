/**
 * Backup & Restore page.
 */

import * as api from '../api.js';
import { t } from '../i18n.js';
import { showToast } from '../components/toast.js';
import { confirm } from '../components/modal.js';

export async function render(container) {
  container.innerHTML = `
    <div class="max-w-2xl mx-auto space-y-6">
      <h1 class="text-xl font-bold text-[var(--color-text)]">${t('backup.title')}</h1>

      <!-- Backup -->
      <div class="card space-y-4">
        <h2 class="text-sm font-semibold text-[var(--color-text)]">${t('backup.createTitle')}</h2>
        <p class="text-sm text-[var(--color-text-muted)]">${t('backup.createDesc')}</p>
        <button id="btn-backup" class="btn-primary">${t('backup.createBtn')}</button>
        <div id="backup-status" class="hidden text-sm"></div>
      </div>

      <!-- Restore -->
      <div class="card space-y-4">
        <h2 class="text-sm font-semibold text-[var(--color-text)]">${t('backup.restoreTitle')}</h2>
        <p class="text-sm text-[var(--color-text-muted)]">${t('backup.restoreWarning')}</p>
        <button id="btn-restore" class="btn-danger">${t('backup.restoreBtn')}</button>
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
      btn.textContent = t('backup.creating');
      const result = await api.createBackup(path);
      showToast(t('backup.created'), 'success');
      container.querySelector('#backup-status').innerHTML = `
        <p class="text-green-600">✅ ${t('backup.savedAt')}${result}</p>
      `;
      container.querySelector('#backup-status').classList.remove('hidden');
    } catch (err) {
      showToast(t('backup.error') + err, 'error');
    } finally {
      const btn = container.querySelector('#btn-backup');
      if (btn) { btn.disabled = false; btn.textContent = t('backup.createBtn'); }
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
