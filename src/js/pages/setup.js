/**
 * Setup wizard — first-run configuration.
 */

import * as api from '../api.js';
import { t } from '../i18n.js';
import { showToast } from '../components/toast.js';
import router from '../router.js';

export async function render(container) {
  container.innerHTML = `
    <div class="min-h-full flex items-center justify-center p-6">
      <div class="w-full max-w-md space-y-6">
        <div class="text-center">
          <div class="text-6xl mb-3">🗄️</div>
          <h1 class="text-2xl font-bold text-[var(--color-text)]">${t('setup.welcome')}</h1>
          <p class="mt-2 text-sm text-[var(--color-text-muted)]">
            ${t('setup.subtitle')}
          </p>
        </div>

        <div class="card space-y-4">
          <div>
            <label class="label">${t('setup.folderLabel')}</label>
            <div class="flex gap-2">
              <input type="text" id="storage-path" class="input flex-1" readonly
                     placeholder="${t('setup.placeholder')}" />
              <button id="browse-btn" class="btn-secondary whitespace-nowrap">
                ${t('setup.browse')}
              </button>
            </div>
            <p class="text-xs text-[var(--color-text-muted)] mt-1">
              ${t('setup.hint')}
            </p>
          </div>

          <div id="path-status" class="hidden"></div>

          <button id="setup-btn" class="btn-primary w-full" disabled>
            ${t('setup.startBtn')}
          </button>
        </div>

        <p class="text-xs text-center text-[var(--color-text-muted)]">
          ${t('setup.footerHint')}
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

      // Validate writability
      const valid = await api.validateStoragePath(path);
      if (!valid) {
        statusEl.innerHTML = `<p class="text-sm text-red-500">❌ ${t('setup.invalidPath')}</p>`;
        statusEl.classList.remove('hidden');
        setupBtn.disabled = true;
        return;
      }

      // Check if this folder already contains a DocVault archive
      const isExistingVault = await api.checkVaultPath(path);
      if (isExistingVault) {
        statusEl.innerHTML = `
          <p class="text-sm text-blue-600">📂 ${t('setup.existingVault')}</p>
        `;
      } else {
        statusEl.innerHTML = `
          <p class="text-sm text-green-600">✅ ${t('setup.validPath')} — ${t('setup.newVault')}</p>
        `;
      }
      statusEl.classList.remove('hidden');
      setupBtn.disabled = false;
    } catch (err) {
      console.error(err);
    }
  });

  setupBtn.addEventListener('click', async () => {
    const path = pathInput.value.trim();
    if (!path) return;

    setupBtn.disabled = true;
    setupBtn.textContent = t('setup.configuring');

    try {
      await api.completeSetup(path);
      showToast(t('setup.success'), 'success');
      router.navigate('#/');
    } catch (err) {
      showToast(t('setup.error') + err, 'error');
      setupBtn.disabled = false;
      setupBtn.textContent = t('setup.startBtn');
    }
  });
}
