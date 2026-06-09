/**
 * Add Document page.
 */

import * as api from '../api.js';
import store from '../store.js';

import { t } from '../i18n.js';
import { icon } from '../utils/icons.js';
import { showToast } from '../components/toast.js';
import { presetSelectorHtml } from '../components/preset-selector.js';
import { customFieldHtml, collectCustomFields } from '../components/custom-field.js';
import { TagInput } from '../components/tag-input.js';
import router from '../router.js';
import { today } from '../utils/date.js';

export async function render(container) {
  const { categories, tags, settings } = store.getState();

  // Mandatory: documents folder must be configured before adding a document
  if (!settings?.storage_path) {
    await renderFolderSetup(container);
    return;
  }

  container.innerHTML = `
    <div class="max-w-2xl mx-auto">
      <h1 class="text-xl font-bold mb-6 text-[var(--color-text)]">${t('add.title')}</h1>

      <form id="add-form" class="space-y-5">
        <!-- File picker -->
        <div>
          <label class="label">${t('add.fileLabel')} <span class="text-red-500">*</span></label>
          <div id="file-drop-area" class="border-2 border-dashed border-[var(--color-border)] rounded-[var(--radius-lg)]
                                          p-8 text-center cursor-pointer hover:border-[var(--color-primary)] transition">
            <div id="file-placeholder">
              <p style="font-size:2rem;margin-bottom:.5rem;color:var(--color-text-muted)">${icon('folderOpen', 'w-8 h-8')}</p>
              <p class="text-sm text-[var(--color-text-muted)]">${t('add.fileDropHint')}</p>
              <p class="text-xs text-[var(--color-text-muted)] mt-1">${t('add.fileDropSubhint')}</p>
            </div>
            <div id="file-selected" class="hidden text-sm text-[var(--color-text)]">
              <p style="font-size:1.75rem;margin-bottom:.25rem;color:#16a34a">${icon('checkCircle', 'w-7 h-7')}</p>
              <p id="file-name" class="font-medium"></p>
              <p id="file-size" class="text-[var(--color-text-muted)] text-xs mt-0.5"></p>
            </div>
          </div>
          <input type="hidden" id="source-file-path" />
        </div>

        <!-- Category -->
        <div>
          <label class="label" for="preset-category">${t('add.categoryLabel')} <span class="text-red-500">*</span></label>
          ${presetSelectorHtml(categories)}
        </div>

        <!-- Custom fields (loaded dynamically) -->
        <div id="custom-fields-section" class="hidden space-y-3">
          <h3 class="text-sm font-medium text-[var(--color-text)]">${t('add.specificFields')}</h3>
          <div id="custom-fields-container" class="space-y-3"></div>
        </div>

        <!-- Title -->
        <div>
          <label class="label" for="doc-title">${t('add.titleLabel')} <span class="text-red-500">*</span></label>
          <input type="text" id="doc-title" class="input" placeholder="${t('add.titlePlaceholder')}" required />
        </div>

        <!-- Date -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label" for="doc-date">${t('add.documentDate')} <span class="text-red-500">*</span></label>
            <input type="date" id="doc-date" class="input" value="${today()}" required />
          </div>
          <div>
            <label class="label" for="doc-expiry">${t('add.expiryDate')}</label>
            <input type="date" id="doc-expiry" class="input" />
          </div>
        </div>

        <!-- Notes -->
        <div>
          <label class="label" for="doc-notes">${t('add.notes')}</label>
          <textarea id="doc-notes" class="input h-20 resize-none" placeholder="${t('add.notesPlaceholder')}"></textarea>
        </div>

        <!-- Tags -->
        <div>
          <label class="label">Tag</label>
          <div id="tag-input-container"></div>
        </div>

        <!-- OCR -->
        <label class="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" id="run-ocr" class="rounded" />
          <span>${t('add.ocrLabel')}</span>
        </label>

        <!-- Actions -->
        <div class="flex gap-3 pt-2">
          <button type="submit" class="btn-primary flex-1" id="submit-btn">
            ${t('add.save')}
          </button>
          <a href="#/" class="btn-secondary">${t('add.cancel')}</a>
        </div>
      </form>
    </div>
  `;

  const tagInput = new TagInput(
    container.querySelector('#tag-input-container'),
    [],
    tags,
  );

  const dropArea       = container.querySelector('#file-drop-area');
  const filePath       = container.querySelector('#source-file-path');
  const filePlaceholder= container.querySelector('#file-placeholder');
  const fileSelected   = container.querySelector('#file-selected');
  const fileName       = container.querySelector('#file-name');

  dropArea.addEventListener('click', async () => {
    try {
      const path = await api.openFileDialog([
        { name: 'Documents', extensions: ['pdf','jpg','jpeg','png','gif','webp','bmp','tiff','doc','docx','xls','xlsx','txt','csv','md','zip'] },
        { name: 'All files', extensions: ['*'] },
      ]);
      if (!path) return;
      setFile(path);
    } catch (err) {
      console.error(err);
    }
  });

  function setFile(path) {
    filePath.value = path;
    const name = path.split(/[/\\]/).pop();
    fileName.textContent = name;
    const titleInput = container.querySelector('#doc-title');
    if (!titleInput.value) {
      titleInput.value = name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
    }
    filePlaceholder.classList.add('hidden');
    fileSelected.classList.remove('hidden');
  }

  const categorySelect  = container.querySelector('#preset-category');
  const customSection   = container.querySelector('#custom-fields-section');
  const customContainer = container.querySelector('#custom-fields-container');

  categorySelect.addEventListener('change', async () => {
    const catId = categorySelect.value;
    if (!catId) { customSection.classList.add('hidden'); return; }
    try {
      const fields = await api.getPresetFields(catId);
      if (fields.length) {
        customContainer.innerHTML = fields.map(f => customFieldHtml(f, '')).join('');
        customSection.classList.remove('hidden');
      } else {
        customSection.classList.add('hidden');
      }
    } catch (err) {
      console.error(err);
    }
  });

  const form = container.querySelector('#add-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const path = filePath.value;
    if (!path) { showToast(t('add.selectFile'), 'warning'); return; }

    const submitBtn = form.querySelector('#submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = t('add.saving');

    const buildPayload = (titleOverride, force = false) => ({
      title: titleOverride,
      source_file_path: path,
      category_id: form.querySelector('#preset-category').value,
      document_date: form.querySelector('#doc-date').value,
      expiry_date: form.querySelector('#doc-expiry').value || null,
      notes: form.querySelector('#doc-notes').value,
      tags: tagInput.getTags(),
      custom_fields: collectCustomFields(form),
      run_ocr: form.querySelector('#run-ocr').checked,
      force,
    });

    const resetBtn = () => {
      submitBtn.disabled = false;
      submitBtn.textContent = t('add.save');
    };

    const baseTitle = form.querySelector('#doc-title').value.trim();
    try {
      const doc = await api.createDocument(buildPayload(baseTitle, false));
      showToast(t('add.saved'), 'success');
      store.setState({ pendingDocId: doc.id });
      router.navigate('#/');
    } catch (err) {
      if (String(err).startsWith('DUPLICATE:')) {
        // Same file content already catalogued — add with a counter suffix and force=true
        let counter = 2;
        let resolved = false;
        while (counter <= 20 && !resolved) {
          const newTitle = `${baseTitle.replace(/ \(\d+\)$/, '')} (${counter})`;
          try {
            const doc = await api.createDocument(buildPayload(newTitle, true));
            showToast(t('add.savedAs', { title: newTitle }), 'success');
            store.setState({ pendingDocId: doc.id });
            router.navigate('#/');
            resolved = true;
          } catch (err2) {
            if (!String(err2).startsWith('DUPLICATE:')) {
              showToast(t('add.error') + err2, 'error');
              resetBtn();
              return;
            }
            counter++;
          }
        }
        if (!resolved) { showToast(t('add.error') + err, 'error'); resetBtn(); }
      } else {
        showToast(t('add.error') + err, 'error');
        resetBtn();
      }
    }
  });
}

/**
 * Renders a blocking folder-setup prompt inside the container.
 * Called when no documents folder has been configured yet.
 * Once the user saves a valid folder, re-renders the full add-document form.
 */
async function renderFolderSetup(container) {
  container.innerHTML = `
    <div class="min-h-full flex items-center justify-center p-6">
      <div class="w-full max-w-md space-y-6">
        <div class="text-center">
          <div class="text-6xl mb-3">📁</div>
          <h2 class="text-xl font-bold text-[var(--color-text)]">${t('add.setupFolderTitle')}</h2>
          <p class="mt-2 text-sm text-[var(--color-text-muted)]">${t('add.setupFolderMsg')}</p>
        </div>

        <div class="card space-y-4">
          <div>
            <label class="label">${t('setup.folderLabel')}</label>
            <div class="flex gap-2">
              <input type="text" id="setup-folder-path" class="input flex-1" readonly
                     placeholder="${t('setup.placeholder')}" />
              <button id="setup-folder-browse" class="btn-secondary whitespace-nowrap">
                ${t('setup.browse')}
              </button>
            </div>
          </div>

          <div id="setup-folder-status" class="hidden"></div>

          <button id="setup-folder-confirm" class="btn-primary w-full" disabled>
            ${t('add.setupFolderBtn')}
          </button>

          <a href="#/" class="block text-center text-sm text-[var(--color-text-muted)] hover:underline">
            ${t('add.cancel')}
          </a>
        </div>
      </div>
    </div>
  `;

  const pathInput  = container.querySelector('#setup-folder-path');
  const browseBtn  = container.querySelector('#setup-folder-browse');
  const confirmBtn = container.querySelector('#setup-folder-confirm');
  const statusEl   = container.querySelector('#setup-folder-status');

  browseBtn.addEventListener('click', async () => {
    try {
      const path = await api.openFolderDialog();
      if (!path) return;
      pathInput.value = path;

      const valid = await api.validateStoragePath(path);
      if (!valid) {
        statusEl.innerHTML = `<p class="text-sm text-red-500">${t('setup.invalidPath')}</p>`;
        statusEl.classList.remove('hidden');
        confirmBtn.disabled = true;
        return;
      }

      let isExistingVault = false;
      try { isExistingVault = await api.checkVaultPath(path); } catch { /* ignore */ }

      statusEl.innerHTML = isExistingVault
        ? `<p class="text-sm text-[var(--color-primary)]">${t('setup.existingVault')}</p>`
        : `<p class="text-sm text-green-600">${t('setup.validPath')} — ${t('setup.newVault')}</p>`;
      statusEl.classList.remove('hidden');
      confirmBtn.disabled = false;
    } catch (err) {
      statusEl.innerHTML = `<p class="text-sm text-red-500">${err}</p>`;
      statusEl.classList.remove('hidden');
    }
  });

  confirmBtn.addEventListener('click', async () => {
    const path = pathInput.value.trim();
    if (!path) return;
    confirmBtn.disabled = true;
    confirmBtn.textContent = t('setup.configuring');
    try {
      await api.completeSetup(path);
      store.setState({
        settings: { ...store.getState().settings, storage_path: path, setup_complete: true },
      });
      showToast(t('setup.success'), 'success');
      await render(container);
    } catch (err) {
      showToast(t('setup.error') + err, 'error');
      confirmBtn.disabled = false;
      confirmBtn.textContent = t('add.setupFolderBtn');
    }
  });
}
