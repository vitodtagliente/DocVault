import * as api from '../api.js';
import { t } from '../i18n.js';
import { showToast } from './toast.js';
import router from '../router.js';

let _backdrop = null;

/**
 * Show a modal listing files that were deleted from the storage folder outside DocVault.
 * Offers to remove those records from the catalog (soft-delete).
 */
export function showDeletedModal(files) {
  if (_backdrop) return; // already open
  if (!files || files.length === 0) return;

  _backdrop = document.createElement('div');
  _backdrop.style.cssText =
    'position:fixed;inset:0;z-index:201;background:rgba(0,0,0,.45);' +
    'display:flex;align-items:center;justify-content:center;padding:1rem;';

  const modal = document.createElement('div');
  modal.className = 'card';
  modal.style.cssText =
    'width:100%;max-width:600px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;';

  modal.innerHTML = `
    <div style="padding:1.25rem 1.5rem;border-bottom:1px solid var(--color-border);flex-shrink:0">
      <div class="flex items-start gap-3">
        <div style="width:2.25rem;height:2.25rem;border-radius:var(--radius-md);
                    background:#fee2e2;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="fa-solid fa-trash-can" style="color:#dc2626;font-size:.9rem"></i>
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-base font-bold text-[var(--color-text)]">${t('deleted.title')}</h2>
          <p class="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">${t('deleted.desc')}</p>
        </div>
      </div>
    </div>

    <div style="overflow-y:auto;flex:1;padding:.75rem 1.5rem">
      <ul class="space-y-0.5">
        ${files.map(f => `
          <li class="flex items-center gap-2 py-1.5 border-b border-[var(--color-border)] last:border-0">
            <i class="fa-solid fa-file-slash text-xs opacity-40 flex-shrink-0"></i>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-[var(--color-text)] truncate">${esc(f.title)}</p>
              <p class="text-xs text-[var(--color-text-muted)]">${esc(f.category_name)} · ${esc(f.file_extension.replace(/^\./, '').toUpperCase())}</p>
            </div>
          </li>
        `).join('')}
      </ul>
    </div>

    <div style="padding:1rem 1.5rem;border-top:1px solid var(--color-border);
                display:flex;justify-content:flex-end;gap:.5rem;flex-shrink:0">
      <button id="del-dismiss" class="btn-ghost text-sm">${t('deleted.dismiss')}</button>
      <button id="del-confirm" class="btn-secondary text-sm"
              style="background:#dc2626;color:#fff;border-color:#dc2626">
        <i class="fa-solid fa-trash-can mr-1.5"></i>${t('deleted.removeFromCatalog')}
      </button>
    </div>
  `;

  _backdrop.appendChild(modal);
  document.body.appendChild(_backdrop);

  modal.querySelector('#del-dismiss').addEventListener('click', close);

  modal.querySelector('#del-confirm').addEventListener('click', async () => {
    const btn = modal.querySelector('#del-confirm');
    btn.disabled = true;
    btn.style.opacity = '.6';
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1.5"></i>${t('deleted.removing')}`;
    try {
      const ids = files.map(f => f.id);
      const n = await api.deleteDocumentsBatch(ids);
      close();
      showToast(t('deleted.removed').replace('{n}', n), 'success');
      router.reload();
    } catch (err) {
      showToast(String(err), 'error');
      btn.disabled = false;
      btn.style.opacity = '';
      btn.innerHTML = `<i class="fa-solid fa-trash-can mr-1.5"></i>${t('deleted.removeFromCatalog')}`;
    }
  });

  function close() {
    if (_backdrop && _backdrop.parentNode) _backdrop.parentNode.removeChild(_backdrop);
    _backdrop = null;
  }
}

function esc(str) {
  return (str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
