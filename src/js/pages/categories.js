/**
 * Categories management page.
 */

import * as api from '../api.js';
import { t } from '../i18n.js';
import { icon } from '../utils/icons.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal, confirm } from '../components/modal.js';

const COLOR_PALETTE = [
  '#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b',
  '#ef4444','#f97316','#ec4899','#84cc16','#14b8a6',
  '#6366f1','#a855f7','#0ea5e9','#22c55e','#eab308',
];

export async function render(container) {
  injectCatStyles();

  // Event delegation wired ONCE so re-renders don't stack listeners
  container.addEventListener('click', async (e) => {
    if (e.target.closest('#btn-new-cat')) {
      const cats = await api.listCategories().catch(() => []);
      openNewCategoryModal(container, cats);
      return;
    }
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
      openFieldsModal(fieldsBtn.dataset.manageFields, fieldsBtn.dataset.name);
    }
  });

  await loadAndRender(container);
}

function injectCatStyles() {
  if (document.getElementById('cat-styles')) return;
  const s = document.createElement('style');
  s.id = 'cat-styles';
  s.textContent = `
    .cat-row { transition: box-shadow .15s ease, transform .12s ease; }
    .cat-row:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); transform: translateY(-1px); }
    .cat-btn { opacity: .7; transition: opacity .1s, background-color .1s; }
    .cat-btn:hover { opacity: 1; background-color: var(--color-border); }
  `;
  document.head.appendChild(s);
}

async function loadAndRender(container) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;padding:3rem 0">
      <div class="spinner"></div>
    </div>
  `;

  let categories;
  try {
    categories = await api.listCategories();
  } catch (err) {
    container.innerHTML = `<p style="color:#ef4444">${err}</p>`;
    return;
  }

  container.innerHTML = `
    <div class="max-w-4xl mx-auto space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold text-[var(--color-text)]">${t('cat.title')}</h1>
        <button id="btn-new-cat" class="btn-primary">
          ${icon('plus', 'w-4 h-4')} ${t('cat.newCategory')}
        </button>
      </div>
      <div class="space-y-2" id="cat-list">
        ${categories.map(cat => categoryRow(cat)).join('')}
      </div>
    </div>
  `;
}

function categoryRow(cat) {
  return `
    <div class="card cat-row" style="display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem">
      <div style="width:1.5rem;height:1.5rem;border-radius:50%;flex-shrink:0;
                  background-color:${cat.color};
                  box-shadow:0 0 0 2px var(--color-bg),0 0 0 3.5px ${cat.color}"></div>
      <div style="flex:1;min-width:0">
        <p style="font-weight:500;font-size:.9rem;color:var(--color-text)">${escHtml(cat.name)}</p>
        <p style="font-size:.75rem;color:var(--color-text-muted);margin-top:1px">${cat.slug}</p>
      </div>
      <div style="display:flex;align-items:center;gap:.25rem">
        <button class="cat-btn"
                style="font-size:.75rem;padding:.3rem .6rem;border-radius:var(--radius-md);
                       border:none;background:none;cursor:pointer;color:var(--color-text-muted);
                       display:flex;align-items:center;gap:.3rem"
                data-manage-fields="${cat.id}" data-name="${escHtml(cat.name)}">
          ${icon('cog', 'w-3.5 h-3.5')} ${t('cat.fields')}
        </button>
        <button class="cat-btn"
                style="font-size:.75rem;padding:.3rem .6rem;border-radius:var(--radius-md);
                       border:none;background:none;cursor:pointer;color:#ef4444;
                       display:flex;align-items:center;gap:.3rem"
                data-delete-cat="${cat.id}" data-name="${escHtml(cat.name)}">
          ${icon('trash', 'w-3.5 h-3.5')} ${t('cat.delete')}
        </button>
      </div>
    </div>
  `;
}

function pickUnusedColor(categories) {
  const used = (categories || []).map(c => c.color?.toLowerCase());
  const unused = COLOR_PALETTE.filter(c => !used.includes(c.toLowerCase()));
  const source = unused.length ? unused : COLOR_PALETTE;
  return source[Math.floor(Math.random() * source.length)];
}

function openNewCategoryModal(container, categories) {
  const defaultColor = pickUnusedColor(categories);

  openModal({
    title: t('cat.newCategoryTitle'),
    size: 'lg',
    body: `
      <div class="space-y-4">
        <div>
          <label class="label text-xs">${t('cat.nameLabel')}</label>
          <input type="text" id="new-cat-name" class="input"
                 placeholder="${t('cat.namePlaceholder')}" autofocus />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label text-xs">${t('cat.iconLabel')}</label>
            <input type="text" id="new-cat-icon" class="input" value="folder" />
          </div>
          <div>
            <label class="label text-xs">${t('cat.colorLabel')}</label>
            <div style="display:flex;align-items:center;gap:.75rem;margin-top:.375rem">
              <input type="color" id="new-cat-color"
                     style="width:2.75rem;height:2.75rem;padding:2px;border:1px solid var(--color-border);
                            border-radius:var(--radius-md);background:none;cursor:pointer;"
                     value="${defaultColor}" />
              <span id="color-hex" style="font-size:.8125rem;font-family:monospace;color:var(--color-text-muted)">${defaultColor}</span>
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
          const color = document.querySelector('#new-cat-color')?.value || defaultColor;
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
      return `<p style="font-size:.8125rem;color:var(--color-text-muted);font-style:italic;padding:.5rem 0">${t('cat.noFields')}</p>`;
    }
    return fields.map(f => `
      <div style="display:flex;align-items:center;gap:.75rem;padding:.625rem 0;
                  border-bottom:1px solid var(--color-border)">
        <div style="flex:1;min-width:0">
          <p style="font-size:.875rem;font-weight:500;color:var(--color-text)">${escHtml(f.field_label)}</p>
          <p style="font-size:.75rem;color:var(--color-text-muted);margin-top:1px">
            ${f.field_name} · ${f.field_type}${f.is_required ? ' · <strong>required</strong>' : ''}
          </p>
        </div>
        <button style="display:flex;align-items:center;gap:.25rem;padding:.3rem .5rem;border-radius:var(--radius-md);
                       border:none;background:none;cursor:pointer;color:#ef4444;font-size:.75rem"
                data-remove-field="${f.id}">
          ${icon('trash', 'w-3.5 h-3.5')} ${t('cat.delete')}
        </button>
      </div>
    `).join('');
  };

  openModal({
    title: t('cat.fieldsTitle', { name: categoryName }),
    size: 'xl',
    body: `
      <div style="display:flex;flex-direction:column;gap:1.25rem">
        <!-- Existing fields -->
        <div>
          <p style="font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;
                    color:var(--color-text-muted);margin-bottom:.5rem">${t('cat.fields')}</p>
          <div id="field-list">${renderFieldList()}</div>
        </div>

        <!-- Add new field -->
        <div style="border:1px solid var(--color-border);border-radius:var(--radius-lg);
                    padding:1.25rem;background:var(--color-surface)">
          <p style="font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;
                    color:var(--color-text-muted);margin-bottom:.75rem">${t('cat.addFieldHeader')}</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:.75rem">
            <div>
              <label class="label text-xs">${t('cat.nameLabel')}</label>
              <input type="text" id="nf-name" class="input" placeholder="importo" />
            </div>
            <div>
              <label class="label text-xs">${t('cat.fieldLabel')}</label>
              <input type="text" id="nf-label" class="input" placeholder="Importo €" />
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:.75rem">
            <div>
              <label class="label text-xs">${t('cat.fieldTypeLabel')}</label>
              <select id="nf-type" class="input">
                <option value="text">${t('cat.fieldTypeText')}</option>
                <option value="number">${t('cat.fieldTypeNumber')}</option>
                <option value="date">${t('cat.fieldTypeDate')}</option>
                <option value="select">${t('cat.fieldTypeSelect')}</option>
              </select>
            </div>
            <div style="display:flex;align-items:flex-end;padding-bottom:.25rem">
              <label style="display:flex;align-items:center;gap:.5rem;font-size:.875rem;
                            color:var(--color-text);cursor:pointer;user-select:none">
                <input type="checkbox" id="nf-required" />
                ${t('cat.required')}
              </label>
            </div>
          </div>
          <button id="add-field-btn" class="btn-primary" style="width:100%">
            ${icon('plus', 'w-4 h-4')} ${t('cat.addFieldBtn')}
          </button>
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
        // Remove previous listener by replacing the node clone trick
        const fresh = btn.cloneNode(true);
        btn.parentNode.replaceChild(fresh, btn);
        fresh.addEventListener('click', async () => {
          try {
            await api.removePresetField(fresh.dataset.removeField);
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
