/**
 * Categories management page.
 */

import * as api from '../api.js';
import { t } from '../i18n.js';
import { icon } from '../utils/icons.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal, confirm } from '../components/modal.js';

export async function render(container) {
  await loadAndRender(container);
}

async function loadAndRender(container) {
  container.innerHTML = `
    <div class="flex items-center justify-center py-12"><div class="spinner"></div></div>
  `;

  let categories;
  try {
    categories = await api.listCategories();
  } catch (err) {
    container.innerHTML = `<p class="text-red-500">${err}</p>`;
    return;
  }

  container.innerHTML = `
    <div class="max-w-3xl mx-auto space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold text-[var(--color-text)]">${t('cat.title')}</h1>
        <button id="btn-new-cat" class="btn-primary">${t('cat.newCategory')}</button>
      </div>

      <div class="space-y-2" id="cat-list">
        ${categories.map(cat => categoryRow(cat)).join('')}
      </div>
    </div>
  `;

  container.querySelector('#btn-new-cat')?.addEventListener('click', () => {
    openNewCategoryModal(container);
  });

  container.querySelectorAll('[data-delete-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id   = btn.dataset.deleteCat;
      const name = btn.dataset.name;
      confirm(t('cat.deleteConfirm', { name }), async () => {
        try {
          await api.deleteCategory(id);
          showToast(t('cat.deleted'), 'success');
          await loadAndRender(container);
        } catch (err) {
          showToast(t('cat.error') + err, 'error');
        }
      });
    });
  });

  container.querySelectorAll('[data-manage-fields]').forEach(btn => {
    btn.addEventListener('click', () => {
      openFieldsModal(btn.dataset.manageFields, btn.dataset.name);
    });
  });
}

function categoryRow(cat) {
  return `
    <div class="card flex items-center gap-3 py-3">
      <div class="w-3 h-3 rounded-full flex-shrink-0" style="background:${cat.color}"></div>
      <div class="flex-1 min-w-0">
        <p class="font-medium text-sm text-[var(--color-text)]">${escHtml(cat.name)}</p>
        <p class="text-xs text-[var(--color-text-muted)]">${cat.slug}</p>
      </div>
      <div class="flex items-center gap-1">
        <button class="btn-ghost text-xs px-2 py-1" data-manage-fields="${cat.id}" data-name="${escHtml(cat.name)}">
          ${t('cat.fields')}
        </button>
        ${!cat.is_system
          ? `<button class="btn-ghost text-xs px-2 py-1 text-red-500"
                     data-delete-cat="${cat.id}" data-name="${escHtml(cat.name)}">
               ${t('cat.delete')}
             </button>`
          : `<span class="text-xs text-[var(--color-text-muted)] px-2">${t('cat.system')}</span>`
        }
      </div>
    </div>
  `;
}

function openNewCategoryModal(container) {
  openModal({
    title: t('cat.newCategoryTitle'),
    body: `
      <div class="space-y-4">
        <div>
          <label class="label text-xs">${t('cat.nameLabel')}</label>
          <input type="text" id="new-cat-name" class="input text-sm"
                 placeholder="${t('cat.namePlaceholder')}" autofocus />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label text-xs">${t('cat.iconLabel')}</label>
            <input type="text" id="new-cat-icon" class="input text-sm" value="folder" />
          </div>
          <div>
            <label class="label text-xs">${t('cat.colorLabel')}</label>
            <input type="color" id="new-cat-color" class="input h-9 p-1 cursor-pointer" value="#3b82f6" />
          </div>
        </div>
      </div>
    `,
    actions: [
      { label: t('cat.cancel'), variant: 'secondary', onClick: closeModal },
      {
        label: t('cat.create'), variant: 'primary', onClick: async () => {
          const name = document.querySelector('#new-cat-name')?.value.trim();
          if (!name) { showToast(t('cat.enterName'), 'warning'); return; }
          const icon_  = document.querySelector('#new-cat-icon')?.value || 'folder';
          const color  = document.querySelector('#new-cat-color')?.value || '#3b82f6';
          try {
            await api.createCategory({ name, icon: icon_, color, fields: [] });
            closeModal();
            showToast(t('cat.created'), 'success');
            await loadAndRender(container);
          } catch (err) {
            showToast(t('cat.error') + err, 'error');
          }
        },
      },
    ],
  });
}

async function openFieldsModal(categoryId, categoryName) {
  let fields;
  try {
    fields = await api.getPresetFields(categoryId);
  } catch {
    showToast(t('cat.loadError'), 'error');
    return;
  }

  const renderFieldList = () => {
    if (!fields.length) {
      return `<p class="text-xs text-[var(--color-text-muted)] italic py-2">${t('cat.noFields')}</p>`;
    }
    return fields.map(f => `
      <div class="flex items-center gap-2 py-2 border-b border-[var(--color-border)] last:border-0">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-[var(--color-text)]">${escHtml(f.field_label)}</p>
          <p class="text-xs text-[var(--color-text-muted)]">${f.field_name} · ${f.field_type}${f.is_required ? ' · required' : ''}</p>
        </div>
        <button class="btn-ghost text-xs px-2 py-1 text-red-500 flex-shrink-0" data-remove-field="${f.id}">
          ${icon('trash', 'w-3.5 h-3.5')}
        </button>
      </div>
    `).join('');
  };

  openModal({
    title: t('cat.fieldsTitle', { name: categoryName }),
    body: `
      <div class="space-y-4">
        <!-- Existing fields -->
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
            ${t('cat.fields')}
          </p>
          <div id="field-list">${renderFieldList()}</div>
        </div>

        <!-- Add new field -->
        <div class="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 space-y-3 bg-[var(--color-surface)]">
          <p class="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            ${t('cat.addFieldHeader')}
          </p>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label text-xs">${t('cat.nameLabel')}</label>
              <input type="text" id="nf-name"  class="input text-sm" placeholder="importo" />
            </div>
            <div>
              <label class="label text-xs">${t('cat.fieldLabel')}</label>
              <input type="text" id="nf-label" class="input text-sm" placeholder="Importo €" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label text-xs">${t('cat.fieldTypeLabel')}</label>
              <select id="nf-type" class="input text-sm">
                <option value="text">${t('cat.fieldTypeText')}</option>
                <option value="number">${t('cat.fieldTypeNumber')}</option>
                <option value="date">${t('cat.fieldTypeDate')}</option>
                <option value="select">${t('cat.fieldTypeSelect')}</option>
              </select>
            </div>
            <div class="flex items-end pb-1">
              <label class="flex items-center gap-2 text-sm text-[var(--color-text)] cursor-pointer select-none">
                <input type="checkbox" id="nf-required" class="rounded" />
                ${t('cat.required')}
              </label>
            </div>
          </div>
          <button id="add-field-btn" class="btn-primary w-full text-sm">${t('cat.addFieldBtn')}</button>
        </div>
      </div>
    `,
    actions: [
      { label: t('cat.close'), variant: 'secondary', onClick: closeModal },
    ],
  });

  setTimeout(() => {
    attachRemoveListeners();

    document.querySelector('#add-field-btn')?.addEventListener('click', async () => {
      const name     = document.querySelector('#nf-name')?.value.trim();
      const label    = document.querySelector('#nf-label')?.value.trim();
      const type     = document.querySelector('#nf-type')?.value || 'text';
      const required = document.querySelector('#nf-required')?.checked || false;
      if (!name || !label) { showToast(t('cat.fillNameLabel'), 'warning'); return; }
      try {
        await api.addPresetField(categoryId, {
          field_name: name, field_label: label, field_type: type,
          field_options: null, is_required: required,
        });
        fields = await api.getPresetFields(categoryId);
        document.querySelector('#field-list').innerHTML = renderFieldList();
        attachRemoveListeners();
        document.querySelector('#nf-name').value  = '';
        document.querySelector('#nf-label').value = '';
        document.querySelector('#nf-required').checked = false;
        showToast(t('cat.fieldAdded'), 'success');
      } catch (err) {
        showToast(t('cat.error') + err, 'error');
      }
    });

    function attachRemoveListeners() {
      document.querySelectorAll('[data-remove-field]').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await api.removePresetField(btn.dataset.removeField);
            fields = await api.getPresetFields(categoryId);
            document.querySelector('#field-list').innerHTML = renderFieldList();
            attachRemoveListeners();
            showToast(t('cat.fieldRemoved'), 'success');
          } catch (err) {
            showToast(t('cat.error') + err, 'error');
          }
        });
      });
    }
  }, 50);
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
