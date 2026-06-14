/**
 * Import from Folder — scan a directory tree, preview candidates, bulk-import.
 */

import * as api from '../api.js';
import { t } from '../i18n.js';
import { showToast } from '../components/toast.js';
import { formatFileSize } from '../utils/format.js';

// ── State ─────────────────────────────────────────────────────────────────────
let candidates = [];   // ImportCandidate[] from Rust
let selected   = new Set(); // Set of candidate.path strings that are selected
let edits      = {};   // {path: {title, category_name, document_date}}

// ── Entry ─────────────────────────────────────────────────────────────────────
export async function render(container) {
  candidates = [];
  selected   = new Set();
  edits      = {};
  showStep1(container);
}

// ── Step 1: Pick folder ───────────────────────────────────────────────────────
function showStep1(container) {
  container.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 class="text-xl font-bold text-[var(--color-text)]">${t('import.title')}</h1>
        <p class="text-sm text-[var(--color-text-muted)] mt-1">${t('import.subtitle')}</p>
      </div>

      <div class="card flex flex-col items-center gap-6 py-12">
        <div style="width:4rem;height:4rem;border-radius:var(--radius-lg);
                    background:var(--color-primary-light, #ede9fe);
                    display:flex;align-items:center;justify-content:center">
          <i class="fa-solid fa-folder-open" style="font-size:1.75rem;color:var(--color-primary)"></i>
        </div>
        <div class="text-center space-y-1 mb-2">
          <p class="font-semibold text-[var(--color-text)]">${t('import.pickFolder')}</p>
          <p class="text-xs text-[var(--color-text-muted)]">PDF, images, Word, Excel, text files — up to 4 subfolder levels</p>
        </div>
        <button id="btn-pick" class="btn-primary flex items-center gap-2">
          <i class="fa-solid fa-folder-open"></i> ${t('import.pickFolder')}
        </button>
        <p id="scan-status" class="text-sm text-[var(--color-text-muted)] hidden">${t('import.scanning')}</p>
      </div>
    </div>
  `;

  container.querySelector('#btn-pick').addEventListener('click', async () => {
    const path = await api.openFolderDialog();
    if (!path) return;
    const statusEl = container.querySelector('#scan-status');
    statusEl.classList.remove('hidden');
    container.querySelector('#btn-pick').disabled = true;
    try {
      candidates = await api.scanImportFolder(path);
      if (candidates.length === 0) {
        showToast(t('import.noFiles'), 'warning');
        statusEl.classList.add('hidden');
        container.querySelector('#btn-pick').disabled = false;
        return;
      }
      selected = new Set(candidates.map(c => c.path));
      edits = {};
      showStep2(container);
    } catch (err) {
      showToast(String(err), 'error');
      statusEl.classList.add('hidden');
      container.querySelector('#btn-pick').disabled = false;
    }
  });
}

// ── Step 2: Preview ───────────────────────────────────────────────────────────
function showStep2(container) {
  const grouped = groupByCategory(candidates);
  const totalSize = candidates.reduce((s, c) => s + c.file_size, 0);

  container.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-xl font-bold text-[var(--color-text)]">${t('import.title')}</h1>
          <p class="text-sm text-[var(--color-text-muted)] mt-0.5">
            <span id="sel-count">${candidates.length}</span> ${t('import.selected')} ·
            ${candidates.length} ${t('import.files')} ${t('import.found')} · ${formatFileSize(totalSize)}
          </p>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button id="btn-select-all" class="btn-ghost text-xs py-1">${t('import.selectAll')}</button>
          <button id="btn-deselect-all" class="btn-ghost text-xs py-1">${t('import.deselectAll')}</button>
          <button id="btn-back" class="btn-secondary text-xs py-1">
            <i class="fa-solid fa-arrow-left mr-1"></i>${t('import.backBtn')}
          </button>
          <button id="btn-import" class="btn-primary text-sm">
            <i class="fa-solid fa-file-import mr-1.5"></i>${t('import.importBtn')}
            (<span id="btn-count">${candidates.length}</span>)
          </button>
        </div>
      </div>

      <div id="candidates-list" class="space-y-4">
        ${Object.entries(grouped).map(([cat, items]) => renderGroup(cat, items)).join('')}
      </div>
    </div>
  `;

  wireStep2(container);
}

function groupByCategory(items) {
  const groups = {};
  for (const item of items) {
    const key = item.category_name || '';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  // Sort: named categories first (alphabetical), then empty
  return Object.fromEntries(
    Object.entries(groups).sort(([a], [b]) => {
      if (!a && b) return 1;
      if (a && !b) return -1;
      return a.localeCompare(b);
    })
  );
}

function renderGroup(categoryName, items) {
  const label = categoryName || t('import.noCategory');
  return `
    <div class="card p-0 overflow-hidden" data-group="${esc(categoryName)}">
      <div class="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]"
           style="background:var(--color-surface-alt, var(--color-surface))">
        <input type="checkbox" class="group-check" data-group="${esc(categoryName)}"
               style="width:1rem;height:1rem;cursor:pointer" checked />
        <i class="fa-solid fa-folder text-[var(--color-primary)] flex-shrink-0" style="font-size:.875rem"></i>
        <span class="font-semibold text-sm text-[var(--color-text)]">${esc(label)}</span>
        <span class="text-xs text-[var(--color-text-muted)]">(${items.length})</span>
      </div>
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr style="border-bottom:1px solid var(--color-border)">
            <th class="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] w-8"></th>
            <th class="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)]">${t('import.title_col')}</th>
            <th class="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] w-24">${t('import.year')}</th>
            <th class="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] w-16">${t('import.type')}</th>
            <th class="px-3 py-2 text-right text-xs font-medium text-[var(--color-text-muted)] w-20">${t('import.size')}</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => renderRow(item)).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderRow(item) {
  const yearDisplay = item.detected_year || '—';
  const dateVal = item.detected_year ? `${item.detected_year}-01-01` : '';
  return `
    <tr data-path="${esc(item.path)}" data-cat="${esc(item.category_name)}"
        class="file-row border-b border-[var(--color-border)] last:border-0"
        style="transition:opacity .15s">
      <td class="px-4 py-2.5 text-center">
        <input type="checkbox" class="file-check" data-path="${esc(item.path)}"
               style="width:1rem;height:1rem;cursor:pointer" checked />
      </td>
      <td class="px-3 py-2.5">
        <input type="text" class="title-edit text-sm bg-transparent border-0 outline-none
                                  focus:ring-1 focus:ring-[var(--color-primary)] rounded px-1 -mx-1 w-full"
               data-path="${esc(item.path)}"
               value="${esc(item.title)}" />
      </td>
      <td class="px-3 py-2.5">
        <input type="text" class="year-edit text-xs bg-transparent border-0 outline-none
                                  focus:ring-1 focus:ring-[var(--color-primary)] rounded px-1 -mx-1 w-20
                                  font-mono text-[var(--color-text-muted)]"
               data-path="${esc(item.path)}"
               value="${yearDisplay === '—' ? '' : yearDisplay}"
               placeholder="YYYY" maxlength="4" />
        <input type="hidden" class="date-val" data-path="${esc(item.path)}" value="${esc(dateVal)}" />
      </td>
      <td class="px-3 py-2.5">
        <span class="text-xs font-mono text-[var(--color-text-muted)] uppercase">${esc(item.extension)}</span>
      </td>
      <td class="px-3 py-2.5 text-right text-xs text-[var(--color-text-muted)]">${formatFileSize(item.file_size)}</td>
    </tr>
  `;
}

function wireStep2(container) {
  // Back
  container.querySelector('#btn-back').addEventListener('click', () => showStep1(container));

  // Select / deselect all
  container.querySelector('#btn-select-all').addEventListener('click', () => {
    candidates.forEach(c => selected.add(c.path));
    container.querySelectorAll('.file-check, .group-check').forEach(cb => cb.checked = true);
    updateSelCount(container);
  });
  container.querySelector('#btn-deselect-all').addEventListener('click', () => {
    selected.clear();
    container.querySelectorAll('.file-check, .group-check').forEach(cb => cb.checked = false);
    updateSelCount(container);
  });

  // Group checkbox (check/uncheck all in group)
  container.querySelectorAll('.group-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const group = cb.dataset.group;
      container.querySelectorAll(`.file-check[data-path]`).forEach(fileCb => {
        const row = fileCb.closest('tr');
        if (row && row.dataset.cat === group) {
          fileCb.checked = cb.checked;
          if (cb.checked) selected.add(fileCb.dataset.path);
          else selected.delete(fileCb.dataset.path);
        }
      });
      updateSelCount(container);
    });
  });

  // Individual file checkbox
  container.querySelectorAll('.file-check').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) selected.add(cb.dataset.path);
      else selected.delete(cb.dataset.path);
      updateGroupCheck(container, cb.closest('tr').dataset.cat);
      updateSelCount(container);
    });
  });

  // Title edits
  container.querySelectorAll('.title-edit').forEach(input => {
    input.addEventListener('input', () => {
      const path = input.dataset.path;
      edits[path] = { ...(edits[path] || {}), title: input.value };
    });
  });

  // Year edits → update hidden date-val
  container.querySelectorAll('.year-edit').forEach(input => {
    input.addEventListener('input', () => {
      const path = input.dataset.path;
      const year = input.value.trim();
      const dateHidden = container.querySelector(`.date-val[data-path="${CSS.escape(path)}"]`);
      const dateVal = (year.length === 4 && /^\d{4}$/.test(year)) ? `${year}-01-01` : '';
      if (dateHidden) dateHidden.value = dateVal;
      edits[path] = { ...(edits[path] || {}), document_date: dateVal };
    });
  });

  // Import button
  container.querySelector('#btn-import').addEventListener('click', () => doImport(container));
}

function updateSelCount(container) {
  const count = selected.size;
  container.querySelector('#sel-count').textContent = count;
  container.querySelector('#btn-count').textContent = count;
}

function updateGroupCheck(container, groupName) {
  const groupCb = container.querySelector(`.group-check[data-group="${CSS.escape(groupName)}"]`);
  if (!groupCb) return;
  const allInGroup = [...container.querySelectorAll('.file-check')]
    .filter(cb => cb.closest('tr')?.dataset.cat === groupName);
  const checkedCount = allInGroup.filter(cb => cb.checked).length;
  groupCb.checked = checkedCount === allInGroup.length;
  groupCb.indeterminate = checkedCount > 0 && checkedCount < allInGroup.length;
}

// ── Step 3: Import ────────────────────────────────────────────────────────────
async function doImport(container) {
  const items = candidates
    .filter(c => selected.has(c.path))
    .map(c => {
      const override = edits[c.path] || {};
      // Get date from hidden input (most up-to-date)
      const dateEl = container.querySelector(`.date-val[data-path="${CSS.escape(c.path)}"]`);
      const docDate = dateEl?.value || (c.detected_year ? `${c.detected_year}-01-01` : '');
      return {
        path: c.path,
        title: (override.title ?? c.title).trim() || c.title,
        category_name: c.category_name,
        document_date: docDate,
      };
    });

  if (items.length === 0) {
    showToast('No files selected', 'warning');
    return;
  }

  // Show progress state
  container.querySelector('#btn-import').disabled = true;
  container.querySelector('#btn-import').innerHTML =
    `<i class="fa-solid fa-spinner fa-spin mr-1.5"></i>${t('import.importing')}`;

  try {
    const result = await api.importDocuments(items);
    showStep3(container, result);
  } catch (err) {
    showToast(String(err), 'error');
    container.querySelector('#btn-import').disabled = false;
    container.querySelector('#btn-import').innerHTML =
      `<i class="fa-solid fa-file-import mr-1.5"></i>${t('import.importBtn')} (${items.length})`;
  }
}

function showStep3(container, result) {
  const allGood = result.failed === 0;
  container.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-6">
      <div class="card flex flex-col items-center gap-6 py-12 text-center">
        <div style="width:4rem;height:4rem;border-radius:var(--radius-lg);
                    background:${allGood ? '#dcfce7' : '#fef9c3'};
                    display:flex;align-items:center;justify-content:center">
          <i class="fa-solid ${allGood ? 'fa-circle-check' : 'fa-triangle-exclamation'}"
             style="font-size:1.75rem;color:${allGood ? '#16a34a' : '#ca8a04'}"></i>
        </div>
        <div class="space-y-1">
          <h2 class="text-lg font-bold text-[var(--color-text)]">${t('import.done')}</h2>
          <p class="text-sm text-[var(--color-text-muted)]">
            <strong>${result.imported}</strong> ${t('import.doneDesc')
              .replace('{skipped}', result.skipped_duplicates)
              .replace('{failed}', result.failed)}
          </p>
        </div>
        ${result.errors.length > 0 ? `
          <div class="w-full text-left card bg-red-50 dark:bg-red-900/20 space-y-1 max-h-40 overflow-y-auto">
            ${result.errors.map(e => `<p class="text-xs text-red-700 dark:text-red-300">${esc(e)}</p>`).join('')}
          </div>
        ` : ''}
        <div class="flex gap-3 flex-wrap justify-center">
          <button id="btn-import-more" class="btn-secondary">
            <i class="fa-solid fa-folder-open mr-1.5"></i>${t('import.backBtn')}
          </button>
          <a href="#/" class="btn-primary">
            <i class="fa-solid fa-house mr-1.5"></i>Go to Home
          </a>
        </div>
      </div>
    </div>
  `;
  container.querySelector('#btn-import-more').addEventListener('click', () => render(container));
}

function esc(str) {
  return (str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
