/**
 * Categories management page.
 */

import * as api from '../api.js';
import { t } from '../i18n.js';
import { icon } from '../utils/icons.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal, confirm } from '../components/modal.js';

export async function render(container) {
  injectCatStyles();
  await loadAndRender(container);
}

function injectCatStyles() {
  if (document.getElementById('cat-styles')) return;
  const s = document.createElement('style');
  s.id = 'cat-styles';
  s.textContent = `
    .cat-row {
      transition: box-shadow .15s ease, transform .12s ease;
    }
    .cat-row:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,.1);
      transform: translateY(-1px);
    }
    .cat-row:hover .cat-btn {
      opacity: 1;
    }
    .cat-btn {
      opacity: .7;
      transition: opacity .1s, background-color .1s;
    }
    .cat-btn:hover {
      opacity: 1;
      background-color: var(--color-border);
    }
  `;
  document.head.appendChild(s);
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

  // Use event delegation — more robust than per-button listeners
  container.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('[data-delete-cat]');
    if (deleteBtn) {
      const id   = deleteBtn.dataset.deleteCat;
      const name = deleteBtn.dataset.name;
      confirm(t('cat.deleteConfirm', { name }), async () => {
        try {
          await api.deleteCategory(id);
          showToast(t('cat.deleted'), 'success');
          await loadAndRender(container);
        } catch (err) {
          showToast(t('cat.error') + err, 'error');
        }
      });
      return;
    }

    const fieldsBtn = e.target.closest('[data-manage-fields]');
    if (fieldsBtn) {
      openFieldsModal(fieldsBtn.dataset.manageFields, fieldsBtn.dataset.name, container);
    }
  });
}

function categoryRow(cat) {
  return `
    <div class="card cat-row" style="display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem">
      <!-- Color swatch — inline styles only, no Tailwind sizing -->
      <div style="width:1.25rem;height:1.25rem;border-radius:50%;flex-shrink:0;
                  background-color:${cat.color};
                  box-shadow:0 0 0 2px var(--color-bg),0 0 0 3.5px ${cat.color}"></div>

      <div style="flex:1;min-width:0">
        <p style="font-weight:500;font-size:.875rem;color:var(--color-text)">${escHtml(cat.name)}</p>
        <p style="font-size:.75rem;color:var(--color-text-muted)">${cat.slug}</p>
      </div>

      <div style="display:flex;align-items:center;gap:.25rem">
        <button class="cat-btn"
                style="font-size:.75rem;padding:.25rem .5rem;border-radius:var(--radius-md);
                       border:none;background:none;cursor:pointer;
                       color:var(--color-text-muted)"
                data-manage-fields="${cat.id}" data-name="${escHtml(cat.name)}">
          ${t('cat.fields')}
        </button>
        <button class="cat-btn"
                style="font-size:.75rem;padding:.25rem .5rem;border-radius:var(--radius-md);
                       border:none;background:none;cursor:pointer;
                       color:#ef4444"
                data-delete-cat="${cat.id}" data-name="${escHtml(cat.name)}">
          ${t('cat.delete')}
        </button>
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
            <div class="flex items-center gap-2 mt-1">
              <input type="color" id="new-cat-color"
                     style="width:2.25rem;height:2.25rem;padding:2px;border:1px solid var(--color-border);border-radius:var(--radius-md);background:none;cursor:pointer;"
                     value="#3b82f6" />
              <span id="color-hex" class="text-xs font-mono text-[var(--color-text-muted)]">#3b82f6</span>
            </div>
          </div>
        </div>
      </div>
    `,
    actions: [
      { label: t('cat.cancel'), variant: 'secondary', onClick: closeModal },
      {
        label: t('cat.create'), variant: 'primary', onClick: async () => {
          const name  = document.querySelector('#new-cat-name')?.value.trim();
          if (!name) { showToast(t('cat.enterName'), 'warning'); return; }
          const icon_ = document.querySelector('#new-cat-icon')?.value || 'folder';
          const color = document.querySelector('#new-cat-color')?.value || '#3b82f6';
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

  setTimeout(() => {
    const colorInput = document.querySelector('#new-cat-color');
    const hexSpan    = document.querySelector('#color-hex');
    colorInput?.addEventListener('input', () => {
      if (hexSpan) hexSpan.textContent = colorInput.value;
    });
  }, 50);
}

async function openFieldsModal(categoryId, categoryName, container) {
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
