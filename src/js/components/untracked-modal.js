/**
 * Untracked Files Modal
 * Shows files found in the storage folder that aren't in the database,
 * lets the user assign a category to each, then imports them.
 */

import * as api from '../api.js';
import { t } from '../i18n.js';
import { showToast } from './toast.js';
import { formatFileSize } from '../utils/format.js';
import store from '../store.js';

let _backdrop = null;

export function showUntrackedModal(files, { fromWatcher = false } = {}) {
  if (_backdrop) return; // already open
  if (!files || files.length === 0) return;

  const categories = store.getState().categories || [];

  _backdrop = document.createElement('div');
  _backdrop.style.cssText = `
    position:fixed;inset:0;z-index:200;
    background:rgba(0,0,0,.45);
    display:flex;align-items:center;justify-content:center;
    padding:1rem;
  `;

  const modal = document.createElement('div');
  modal.className = 'card';
  modal.style.cssText = `
    width:100%;max-width:720px;max-height:85vh;
    display:flex;flex-direction:column;gap:0;overflow:hidden;
  `;

  modal.innerHTML = `
    <div style="padding:1.25rem 1.5rem;border-bottom:1px solid var(--color-border);flex-shrink:0">
      <div class="flex items-start gap-3">
        <div style="width:2.25rem;height:2.25rem;border-radius:var(--radius-md);
                    background:#fef9c3;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="fa-solid fa-triangle-exclamation" style="color:#ca8a04;font-size:.9rem"></i>
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-base font-bold text-[var(--color-text)]">${t('untracked.title')}</h2>
          <p class="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
            ${fromWatcher ? t('untracked.watcherDesc') : t('untracked.desc')}
          </p>
        </div>
      </div>
    </div>

    <div style="overflow-y:auto;flex:1;padding:.75rem 1.5rem">
      <table class="w-full text-sm border-collapse" id="untracked-table">
        <thead>
          <tr style="border-bottom:1px solid var(--color-border)">
            <th class="py-2 pr-3 text-left w-6">
              <input type="checkbox" id="ut-select-all" checked style="width:.9rem;height:.9rem;cursor:pointer" />
            </th>
            <th class="py-2 pr-3 text-left text-xs font-medium text-[var(--color-text-muted)]">${t('untracked.file')}</th>
            <th class="py-2 pr-3 text-left text-xs font-medium text-[var(--color-text-muted)] w-44">${t('untracked.category')}</th>
            <th class="py-2 text-left text-xs font-medium text-[var(--color-text-muted)] w-24">${t('untracked.year')}</th>
          </tr>
        </thead>
        <tbody>
          ${files.map((f, i) => renderRow(f, i, categories)).join('')}
        </tbody>
      </table>
    </div>

    <div id="ut-status" class="hidden" style="padding:.5rem 1.5rem;font-size:.8rem;color:var(--color-text-muted)"></div>

    <div style="padding:1rem 1.5rem;border-top:1px solid var(--color-border);
                display:flex;justify-content:flex-end;gap:.5rem;flex-shrink:0">
      <button id="ut-dismiss" class="btn-ghost text-sm">${t('untracked.dismiss')}</button>
      <button id="ut-import" class="btn-primary text-sm">
        <i class="fa-solid fa-file-import mr-1.5"></i>
        ${t('untracked.importSelected')} (<span id="ut-sel-count">${files.length}</span>)
      </button>
    </div>
  `;

  _backdrop.appendChild(modal);
  document.body.appendChild(_backdrop);

  // ── Wiring ──────────────────────────────────────────────────────────────────
  const selected = new Set(files.map(f => f.full_path));

  function updateCount() {
    modal.querySelector('#ut-sel-count').textContent = selected.size;
    modal.querySelector('#ut-import').disabled = selected.size === 0;
  }

  // Select-all
  modal.querySelector('#ut-select-all').addEventListener('change', (e) => {
    modal.querySelectorAll('.ut-row-check').forEach(cb => {
      cb.checked = e.target.checked;
      if (e.target.checked) selected.add(cb.dataset.path);
      else selected.delete(cb.dataset.path);
    });
    updateCount();
  });

  // Individual checkboxes
  modal.querySelectorAll('.ut-row-check').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) selected.add(cb.dataset.path);
      else selected.delete(cb.dataset.path);
      const all = [...modal.querySelectorAll('.ut-row-check')];
      modal.querySelector('#ut-select-all').checked = all.every(c => c.checked);
      updateCount();
    });
  });

  // Dismiss
  modal.querySelector('#ut-dismiss').addEventListener('click', close);

  // Import
  modal.querySelector('#ut-import').addEventListener('click', async () => {
    const rows = [...modal.querySelectorAll('tr[data-path]')]
      .filter(row => selected.has(row.dataset.path));

    const items = rows.map(row => {
      const path = row.dataset.path;
      const file = files.find(f => f.full_path === path);
      const catSel = row.querySelector('.ut-cat-select');
      const yearInput = row.querySelector('.ut-year-input');
      const year = (yearInput?.value || '').trim();
      return {
        full_path: path,
        relative_path: file.relative_path,
        title: file.stem,
        category_id: catSel?.value || '',
        document_date: (year.length === 4 && /^\d{4}$/.test(year)) ? `${year}-01-01` : '',
      };
    }).filter(item => item.category_id); // must have a category

    if (items.length === 0) {
      showToast('Assign a category to at least one file', 'warning');
      return;
    }

    const importBtn = modal.querySelector('#ut-import');
    const statusEl = modal.querySelector('#ut-status');
    importBtn.disabled = true;
    importBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1.5"></i>${t('untracked.importing')}`;
    statusEl.classList.remove('hidden');
    statusEl.textContent = `Processing ${items.length} file(s)…`;

    try {
      const result = await api.importUntrackedFiles(items);
      close();
      showToast(
        t('untracked.done').replace('{n}', result.imported) +
        (result.skipped_duplicates ? ` (${result.skipped_duplicates} duplicates skipped)` : '') +
        (result.failed ? ` · ${result.failed} failed` : ''),
        result.failed > 0 ? 'warning' : 'success'
      );
      // Reload stats
      const stats = await api.getStats().catch(() => null);
      if (stats) store.setState({ expiringCount: stats.expiring_soon });
    } catch (err) {
      showToast(String(err), 'error');
      importBtn.disabled = false;
      importBtn.innerHTML = `<i class="fa-solid fa-file-import mr-1.5"></i>${t('untracked.importSelected')}`;
      statusEl.classList.add('hidden');
    }
  });

  function close() {
    if (_backdrop && _backdrop.parentNode) {
      _backdrop.parentNode.removeChild(_backdrop);
    }
    _backdrop = null;
  }
}

function renderRow(file, index, categories) {
  const yearGuess = guessYear(file.relative_path, file.stem);
  const catOptions = categories.map(c =>
    `<option value="${esc(c.id)}" ${c.id === file.suggested_category_id ? 'selected' : ''}>${esc(c.name)}</option>`
  ).join('');

  return `
    <tr data-path="${esc(file.full_path)}"
        style="border-bottom:1px solid var(--color-border)">
      <td class="py-2.5 pr-3">
        <input type="checkbox" class="ut-row-check" data-path="${esc(file.full_path)}"
               checked style="width:.9rem;height:.9rem;cursor:pointer" />
      </td>
      <td class="py-2.5 pr-3 min-w-0">
        <p class="text-sm font-medium text-[var(--color-text)] truncate" title="${esc(file.filename)}">${esc(file.stem)}</p>
        <p class="text-xs text-[var(--color-text-muted)]">${esc(file.extension.toUpperCase())} · ${formatFileSize(file.file_size)}</p>
      </td>
      <td class="py-2.5 pr-3">
        <select class="ut-cat-select input text-xs py-1" style="width:100%">
          <option value="">${t('untracked.noCategory')}</option>
          ${catOptions}
        </select>
      </td>
      <td class="py-2.5">
        <input type="text" class="ut-year-input input text-xs py-1 font-mono"
               value="${esc(yearGuess)}" placeholder="YYYY" maxlength="4"
               style="width:4.5rem" />
      </td>
    </tr>
  `;
}

function guessYear(relativePath, stem) {
  // Look for 4-digit year (1900-2099) in path components or filename
  const parts = relativePath.replace(/\\/g, '/').split('/');
  for (const p of parts) {
    if (/^\d{4}$/.test(p)) {
      const n = parseInt(p, 10);
      if (n >= 1900 && n <= 2099) return p;
    }
  }
  if (/^\d{4}$/.test(stem)) {
    const n = parseInt(stem, 10);
    if (n >= 1900 && n <= 2099) return stem;
  }
  return '';
}

function esc(str) {
  return (str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
