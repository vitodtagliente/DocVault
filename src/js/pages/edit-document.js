/**
 * Edit Document page.
 */

import * as api from '../api.js';
import store from '../store.js';
import { t } from '../i18n.js';
import { showToast } from '../components/toast.js';
import { presetSelectorHtml } from '../components/preset-selector.js';
import { customFieldHtml, collectCustomFields } from '../components/custom-field.js';
import { TagInput } from '../components/tag-input.js';
import router from '../router.js';

export async function render(container, id) {
  container.innerHTML = `
    <div class="flex items-center justify-center py-12">
      <div class="spinner"></div>
    </div>
  `;

  let detail, categories, tags;
  try {
    [detail, categories, tags] = await Promise.all([
      api.getDocument(id),
      api.listCategories(),
      api.listTags(),
    ]);
    store.setState({ selectedDocument: detail });
  } catch (err) {
    container.innerHTML = `<p class="text-red-500 text-sm">${t('edit.error')}${err}</p>`;
    return;
  }

  const doc = detail.document;

  container.innerHTML = `
    <div class="max-w-3xl mx-auto">
      <h1 class="text-xl font-bold mb-6 text-[var(--color-text)]">${t('edit.title')}</h1>

      <form id="edit-form" class="space-y-5">
        <!-- Category -->
        <div>
          <label class="label">${t('add.categoryLabel')} <span class="text-red-500">*</span></label>
          ${presetSelectorHtml(categories, doc.category_id)}
        </div>

        <!-- Custom fields -->
        <div id="custom-fields-section" class="space-y-3">
          <h3 class="text-sm font-medium text-[var(--color-text)]">${t('edit.specificFields')}</h3>
          <div id="custom-fields-container" class="space-y-3">
            ${detail.custom_fields.map(cf => customFieldHtml(
              { id: cf.field_id, field_label: cf.field_label, field_type: cf.field_type,
                field_options: cf.field_options, is_required: false, field_name: cf.field_name },
              cf.value
            )).join('')}
          </div>
        </div>

        <!-- Title -->
        <div>
          <label class="label" for="doc-title">${t('add.titleLabel')} <span class="text-red-500">*</span></label>
          <input type="text" id="doc-title" class="input" value="${escHtml(doc.title)}" required />
        </div>

        <!-- Dates -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label" for="doc-date">${t('add.documentDate')}</label>
            <input type="date" id="doc-date" class="input" value="${doc.document_date}"
                 style="-webkit-appearance:auto;appearance:auto;cursor:pointer;position:relative;z-index:1" />
          </div>
          <div>
            <label class="label" for="doc-expiry">${t('add.expiryDate')}</label>
            <input type="date" id="doc-expiry" class="input" value="${doc.expiry_date || ''}"
                   style="-webkit-appearance:auto;appearance:auto;cursor:pointer;position:relative;z-index:1" />
          </div>
        </div>

        <!-- Notes -->
        <div>
          <label class="label" for="doc-notes">${t('add.notes')}</label>
          <textarea id="doc-notes" class="input h-20 resize-none">${escHtml(doc.notes)}</textarea>
        </div>

        <!-- Tags -->
        <div>
          <label class="label">Tag</label>
          <div id="tag-input-container"></div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 pt-2">
          <button type="submit" class="btn-primary flex-1" id="submit-btn">${t('edit.save')}</button>
          <a href="#/" class="btn-secondary">${t('edit.cancel')}</a>
        </div>
      </form>
    </div>
  `;

  const tagInput = new TagInput(
    container.querySelector('#tag-input-container'),
    detail.tags.map(t => t.name),
    tags,
  );

  const categorySelect  = container.querySelector('#preset-category');
  const customContainer = container.querySelector('#custom-fields-container');

  categorySelect.addEventListener('change', async () => {
    const catId = categorySelect.value;
    if (!catId) return;
    try {
      const fields = await api.getPresetFields(catId);
      customContainer.innerHTML = fields.map(f => customFieldHtml(f, '')).join('');
    } catch (err) {
      console.error(err);
    }
  });

  container.querySelector('#edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('#submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = t('edit.saving');

    try {
      await api.updateDocument({
        id,
        title: form.querySelector('#doc-title').value.trim(),
        category_id: form.querySelector('#preset-category').value,
        document_date: form.querySelector('#doc-date').value,
        expiry_date: form.querySelector('#doc-expiry').value || null,
        notes: form.querySelector('#doc-notes').value,
        tags: tagInput.getTags(),
        custom_fields: collectCustomFields(form),
      });
      showToast(t('edit.saved'), 'success');
      store.setState({ pendingDocId: id });
      router.navigate('#/');
    } catch (err) {
      showToast(t('edit.error') + err, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = t('edit.save');
    }
  });
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
