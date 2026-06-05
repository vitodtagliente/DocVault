/**
 * Backup & Restore page.
 */

import * as api from '../api.js';
import { showToast } from '../components/toast.js';
import { confirm } from '../components/modal.js';

export async function render(container) {
  container.innerHTML = `
    <div class="max-w-2xl mx-auto space-y-6">
      <h1 class="text-xl font-bold text-[var(--color-text)]">Backup & Restore</h1>

      <!-- Backup -->
      <div class="card space-y-4">
        <h2 class="text-sm font-semibold text-[var(--color-text)]">Crea backup</h2>
        <p class="text-sm text-[var(--color-text-muted)]">
          Crea un archivio ZIP con il database e tutti i file. Conservalo in un posto sicuro.
        </p>
        <button id="btn-backup" class="btn-primary">💾 Crea backup ZIP</button>
        <div id="backup-status" class="hidden text-sm"></div>
      </div>

      <!-- Restore -->
      <div class="card space-y-4">
        <h2 class="text-sm font-semibold text-[var(--color-text)]">Ripristina da backup</h2>
        <p class="text-sm text-[var(--color-text-muted)]">
          ⚠️ Questa operazione sovrascrive tutti i dati attuali con il contenuto del backup.
        </p>
        <button id="btn-restore" class="btn-danger">📦 Ripristina da ZIP</button>
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
      btn.textContent = 'Creazione in corso…';
      const result = await api.createBackup(path);
      showToast('Backup creato!', 'success');
      container.querySelector('#backup-status').innerHTML = `
        <p class="text-green-600">✅ Backup salvato in: ${result}</p>
      `;
      container.querySelector('#backup-status').classList.remove('hidden');
    } catch (err) {
      showToast('Errore backup: ' + err, 'error');
    } finally {
      const btn = container.querySelector('#btn-backup');
      if (btn) { btn.disabled = false; btn.textContent = '💾 Crea backup ZIP'; }
    }
  });

  container.querySelector('#btn-restore')?.addEventListener('click', async () => {
    confirm(
      'Sei sicuro? Tutti i dati attuali saranno sovrascritti con il backup selezionato.',
      async () => {
        try {
          const path = await api.openFileDialog([{ name: 'ZIP', extensions: ['zip'] }]);
          if (!path) return;
          await api.restoreBackup(path);
          showToast('Ripristino completato! Riavvia l\'app.', 'success');
        } catch (err) {
          showToast('Errore ripristino: ' + err, 'error');
        }
      },
      'Ripristina backup',
    );
  });
}
