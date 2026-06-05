/**
 * Setup wizard — first-run configuration.
 */

import * as api from '../api.js';
import { showToast } from '../components/toast.js';
import router from '../router.js';

export async function render(container) {
  container.innerHTML = `
    <div class="min-h-full flex items-center justify-center p-6">
      <div class="w-full max-w-md space-y-6">
        <div class="text-center">
          <div class="text-6xl mb-3">🗄️</div>
          <h1 class="text-2xl font-bold text-[var(--color-text)]">Benvenuto in DocVault</h1>
          <p class="mt-2 text-sm text-[var(--color-text-muted)]">
            Scegli la cartella dove salvare i tuoi documenti per iniziare.
          </p>
        </div>

        <div class="card space-y-4">
          <div>
            <label class="label">Cartella di archiviazione</label>
            <div class="flex gap-2">
              <input type="text" id="storage-path" class="input flex-1" readonly
                     placeholder="Nessuna cartella selezionata" />
              <button id="browse-btn" class="btn-secondary whitespace-nowrap">
                📁 Sfoglia
              </button>
            </div>
            <p class="text-xs text-[var(--color-text-muted)] mt-1">
              I tuoi documenti saranno organizzati in questa cartella, leggibile anche senza l'app.
            </p>
          </div>

          <div id="path-status" class="hidden"></div>

          <button id="setup-btn" class="btn-primary w-full" disabled>
            Inizia ad usare DocVault →
          </button>
        </div>

        <p class="text-xs text-center text-[var(--color-text-muted)]">
          Puoi cambiare la cartella in seguito dalle Impostazioni.
        </p>
      </div>
    </div>
  `;

  const pathInput = container.querySelector('#storage-path');
  const browseBtn = container.querySelector('#browse-btn');
  const setupBtn  = container.querySelector('#setup-btn');
  const statusEl  = container.querySelector('#path-status');

  browseBtn.addEventListener('click', async () => {
    try {
      const path = await api.openFolderDialog();
      if (!path) return;
      pathInput.value = path;

      // Validate
      const valid = await api.validateStoragePath(path);
      if (valid) {
        statusEl.innerHTML = `<p class="text-sm text-green-600">✅ Cartella valida e scrivibile</p>`;
        statusEl.classList.remove('hidden');
        setupBtn.disabled = false;
      } else {
        statusEl.innerHTML = `<p class="text-sm text-red-500">❌ Cartella non valida o non scrivibile</p>`;
        statusEl.classList.remove('hidden');
        setupBtn.disabled = true;
      }
    } catch (err) {
      console.error(err);
    }
  });

  setupBtn.addEventListener('click', async () => {
    const path = pathInput.value.trim();
    if (!path) return;

    setupBtn.disabled = true;
    setupBtn.textContent = 'Configurazione in corso…';

    try {
      await api.completeSetup(path);
      showToast('Configurazione completata!', 'success');
      router.navigate('#/');
    } catch (err) {
      showToast('Errore durante la configurazione: ' + err, 'error');
      setupBtn.disabled = false;
      setupBtn.textContent = 'Inizia ad usare DocVault →';
    }
  });
}
