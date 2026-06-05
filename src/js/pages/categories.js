/**
 * Categories management page.
 */

import * as api from '../api.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal, confirm } from '../components/modal.js';

export async function render(container) {
  await loadAndRender(container);
}

async function loadAndRender(container) {
  container.innerHTML = `
    <div class="flex items-center justify-center py-12"><div class="spinner"></div></div>
  `;

  let categories, allFields;
  try {
    categories = await api.listCategories();
  } catch (err) {
    container.innerHTML = `<p class="text-red-500">${err}</p>`;
    return;
  }

  container.innerHTML = `
    <div class="max-w-3xl mx-auto space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold text-[var(--color-text)]">Categorie</h1>
        <button id="btn-new-cat" class="btn-primary">+ Nuova categoria</button>
      </div>

      <div class="space-y-3" id="cat-list">
        ${categories.map(cat => categoryRow(cat)).join('')}
      </div>
    </div>
  `;

  container.querySelector('#btn-new-cat')?.addEventListener('click', () => {
    openNewCategoryModal(container);
  });

  container.querySelectorAll('[data-delete-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.deleteCat;
      const name = btn.dataset.name;
      confirm(`Eliminare la categoria "${name}"?`, async () => {
        try {
          await api.deleteCategory(id);
          showToast('Categoria eliminata', 'success');
          await loadAndRender(container);
        } catch (err) {
          showToast('Errore: ' + err, 'error');
        }
      });
    });
  });

  container.querySelectorAll('[data-manage-fields]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.manageFields;
      const name = btn.dataset.name;
      openFieldsModal(id, name);
    });
  });
}

function categoryRow(cat) {
  return `
    <div class="card flex items-center gap-3">
      <div class="w-8 h-8 rounded-full flex-shrink-0" style="background:${cat.color}"></div>
      <div class="flex-1 min-w-0">
        <p class="font-medium text-sm text-[var(--color-text)]">${escHtml(cat.name)}</p>
        <p class="text-xs text-[var(--color-text-muted)]">${cat.slug}</p>
      </div>
      <div class="flex gap-2">
        <button class="btn-ghost text-xs px-2 py-1" data-manage-fields="${cat.id}" data-name="${escHtml(cat.name)}">
          Campi
        </button>
        ${!cat.is_system ? `
          <button class="btn-ghost text-xs px-2 py-1 text-red-500"
                  data-delete-cat="${cat.id}" data-name="${escHtml(cat.name)}">
            Elimina
          </button>
        ` : `<span class="text-xs text-[var(--color-text-muted)] px-2">Sistema</span>`}
      </div>
    </div>
  `;
}

function openNewCategoryModal(container) {
  openModal({
    title: 'Nuova categoria',
    body: `
      <div class="space-y-3">
        <div>
          <label class="label text-xs">Nome</label>
          <input type="text" id="new-cat-name" class="input text-sm" placeholder="Es. Tasse" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label text-xs">Icona</label>
            <input type="text" id="new-cat-icon" class="input text-sm" value="folder" placeholder="folder" />
          </div>
          <div>
            <label class="label text-xs">Colore</label>
            <input type="color" id="new-cat-color" class="input h-10" value="#3b82f6" />
          </div>
        </div>
      </div>
    `,
    actions: [
      { label: 'Annulla', variant: 'secondary', onClick: closeModal },
      {
        label: 'Crea', variant: 'primary', onClick: async () => {
          const name = document.querySelector('#new-cat-name')?.value.trim();
          if (!name) { showToast('Inserisci un nome', 'warning'); return; }
          const icon = document.querySelector('#new-cat-icon')?.value || 'folder';
          const color = document.querySelector('#new-cat-color')?.value || '#3b82f6';
          try {
            await api.createCategory({ name, icon, color, fields: [] });
            closeModal();
            showToast('Categoria creata!', 'success');
            await loadAndRender(container);
          } catch (err) {
            showToast('Errore: ' + err, 'error');
          }
        }
      },
    ],
  });
}

async function openFieldsModal(categoryId, categoryName) {
  let fields;
  try {
    fields = await api.getPresetFields(categoryId);
  } catch (err) {
    showToast('Errore caricamento campi', 'error');
    return;
  }

  const renderFieldList = () => fields.map(f => `
    <div class="flex items-center gap-2 text-sm py-1">
      <span class="flex-1">${escHtml(f.field_label)}</span>
      <span class="text-xs text-[var(--color-text-muted)]">${f.field_type}</span>
      ${f.is_required ? '<span class="badge bg-amber-100 text-amber-700 text-xs">Obbligatorio</span>' : ''}
      <button class="btn-ghost text-xs text-red-500 px-1" data-remove-field="${f.id}">×</button>
    </div>
  `).join('') || '<p class="text-xs text-[var(--color-text-muted)] italic">Nessun campo personalizzato</p>';

  openModal({
    title: `Campi — ${categoryName}`,
    body: `
      <div class="space-y-3">
        <div id="field-list">${renderFieldList()}</div>
        <hr class="border-[var(--color-border)]"/>
        <p class="text-xs font-semibold text-[var(--color-text)]">Aggiungi campo</p>
        <div class="grid grid-cols-2 gap-2">
          <input type="text" id="nf-name" class="input text-xs" placeholder="Nome (es. importo)" />
          <input type="text" id="nf-label" class="input text-xs" placeholder="Label (es. Importo €)" />
        </div>
        <div class="flex gap-2">
          <select id="nf-type" class="input text-xs flex-1">
            <option value="text">Testo</option>
            <option value="number">Numero</option>
            <option value="date">Data</option>
            <option value="select">Lista</option>
          </select>
          <label class="flex items-center gap-1 text-xs text-[var(--color-text)]">
            <input type="checkbox" id="nf-required" />Obbligatorio
          </label>
        </div>
        <button id="add-field-btn" class="btn-secondary text-xs w-full">+ Aggiungi campo</button>
      </div>
    `,
    actions: [
      { label: 'Chiudi', variant: 'secondary', onClick: closeModal },
    ],
  });

  // Attach listeners after modal renders
  setTimeout(() => {
    document.querySelectorAll('[data-remove-field]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await api.removePresetField(btn.dataset.removeField);
          fields = await api.getPresetFields(categoryId);
          document.querySelector('#field-list').innerHTML = renderFieldList();
          // Re-attach listeners
          attachRemoveListeners();
          showToast('Campo rimosso', 'success');
        } catch (err) {
          showToast('Errore: ' + err, 'error');
        }
      });
    });

    document.querySelector('#add-field-btn')?.addEventListener('click', async () => {
      const name = document.querySelector('#nf-name')?.value.trim();
      const label = document.querySelector('#nf-label')?.value.trim();
      const type = document.querySelector('#nf-type')?.value || 'text';
      const required = document.querySelector('#nf-required')?.checked || false;
      if (!name || !label) { showToast('Compila nome e label', 'warning'); return; }
      try {
        await api.addPresetField(categoryId, {
          field_name: name, field_label: label, field_type: type,
          field_options: null, is_required: required,
        });
        fields = await api.getPresetFields(categoryId);
        document.querySelector('#field-list').innerHTML = renderFieldList();
        attachRemoveListeners();
        document.querySelector('#nf-name').value = '';
        document.querySelector('#nf-label').value = '';
        showToast('Campo aggiunto!', 'success');
      } catch (err) {
        showToast('Errore: ' + err, 'error');
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
          } catch (err) {
            showToast('Errore: ' + err, 'error');
          }
        });
      });
    }
  }, 50);
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
