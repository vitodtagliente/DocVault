/**
 * View Document page — detail + integrated viewer.
 */

import * as api from '../api.js';
import { t } from '../i18n.js';
import { icon } from '../utils/icons.js';
import { showToast } from '../components/toast.js';
import { confirm } from '../components/modal.js';
import { expiryBadgeHtml } from '../components/expiry-badge.js';
import { formatDate } from '../utils/date.js';
import { formatFileSize } from '../utils/format.js';
import router from '../router.js';

export async function render(container, id) {
  container.innerHTML = `
    <div class="flex items-center justify-center py-12">
      <div class="spinner"></div>
    </div>
  `;

  let detail;
  try {
    detail = await api.getDocument(id);
  } catch (err) {
    container.innerHTML = `<p class="text-red-500 text-sm">${t('view.notFound')}</p>`;
    return;
  }

  const doc = detail.document;
  const cat = detail.category;

  container.innerHTML = `
    <div class="max-w-4xl mx-auto space-y-4">
      <!-- Header -->
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <span class="badge text-white" style="background:${cat.color}">${escHtml(cat.name)}</span>
            ${doc.is_favorite ? '<span>⭐</span>' : ''}
            ${expiryBadgeHtml(doc.expiry_date)}
          </div>
          <h1 class="text-xl font-bold text-[var(--color-text)]">${escHtml(doc.title)}</h1>
          <p class="text-sm text-[var(--color-text-muted)] mt-1">
            ${formatDate(doc.document_date)}
            · ${formatFileSize(doc.file_size)}
            · ${doc.file_extension.toUpperCase().replace('.', '')}
          </p>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button id="btn-reveal" class="btn-secondary text-sm gap-1.5 flex items-center">${icon('folderOpen','w-4 h-4')} ${t('view.showInExplorer')}</button>
          <button id="btn-open"   class="btn-secondary text-sm gap-1.5 flex items-center">${icon('externalLink','w-4 h-4')} ${t('view.openWith')}</button>
          <a href="#/edit/${id}"  class="btn-secondary text-sm gap-1.5 flex items-center">${icon('pencil','w-4 h-4')} ${t('view.edit')}</a>
          <button id="btn-delete" class="btn-danger text-sm gap-1.5 flex items-center">${icon('trash','w-4 h-4')} ${t('view.delete')}</button>
        </div>
      </div>

      <!-- Two-column layout: viewer + metadata -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <!-- Viewer (3/5) -->
        <div class="lg:col-span-3">
          <div class="card min-h-[300px] lg:min-h-[500px] p-0 overflow-hidden" id="viewer-container">
            <div class="flex items-center justify-center h-full text-[var(--color-text-muted)] p-8">
              <div class="spinner"></div>
            </div>
          </div>
        </div>

        <!-- Metadata (2/5) -->
        <div class="lg:col-span-2 space-y-4">
          ${detail.custom_fields.filter(cf => cf.value).length ? `
            <div class="card space-y-2">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">${t('view.details')}</h3>
              ${detail.custom_fields.filter(cf => cf.value).map(cf => `
                <div>
                  <p class="text-xs text-[var(--color-text-muted)]">${escHtml(cf.field_label)}</p>
                  <p class="text-sm font-medium text-[var(--color-text)]">${escHtml(cf.value)}</p>
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${detail.tags.length ? `
            <div class="card">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">${t('view.tags')}</h3>
              <div class="flex flex-wrap gap-1">
                ${detail.tags.map(tag => `
                  <span class="tag-chip" style="background:${tag.color}">${escHtml(tag.name)}</span>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${doc.notes ? `
            <div class="card">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">${t('view.notes')}</h3>
              <p class="text-sm text-[var(--color-text)] whitespace-pre-wrap">${escHtml(doc.notes)}</p>
            </div>
          ` : ''}

          <div class="card">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">${t('view.ocrText')}</h3>
              <button id="btn-ocr" class="btn-ghost text-xs px-2 py-1">${t('view.runOcr')}</button>
            </div>
            <div id="ocr-text" class="text-xs text-[var(--color-text-muted)] max-h-40 overflow-y-auto">
              ${doc.ocr_text
                ? `<p class="whitespace-pre-wrap">${escHtml(doc.ocr_text)}</p>`
                : `<p class="italic">${t('view.noOcrText')}</p>`}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  loadViewer(container.querySelector('#viewer-container'), doc, id);

  container.querySelector('#btn-reveal')?.addEventListener('click', async () => {
    try { await api.revealInFileManager(id); }
    catch (err) { showToast(t('view.error') + err, 'error'); }
  });

  container.querySelector('#btn-open')?.addEventListener('click', async () => {
    try { await api.openWithSystem(id); }
    catch (err) { showToast(t('view.error') + err, 'error'); }
  });

  container.querySelector('#btn-delete')?.addEventListener('click', () => {
    confirm(
      t('view.deleteConfirm', { title: doc.title }),
      async () => {
        try {
          await api.deleteDocument(id);
          showToast(t('view.deleted'), 'success');
          router.navigate('#/');
        } catch (err) {
          showToast(t('view.error') + err, 'error');
        }
      },
      t('view.deleteTitle'),
    );
  });

  container.querySelector('#btn-ocr')?.addEventListener('click', async () => {
    const ocrBtn  = container.querySelector('#btn-ocr');
    const ocrText = container.querySelector('#ocr-text');
    ocrBtn.disabled = true;
    ocrBtn.textContent = t('view.ocrRunning');
    try {
      const text = await api.runOcr(id, ['ita', 'eng']);
      ocrText.innerHTML = `<p class="whitespace-pre-wrap">${escHtml(text)}</p>`;
      showToast(t('view.ocrDone'), 'success');
    } catch (err) {
      showToast(t('view.ocrFailed') + err, 'error');
    } finally {
      ocrBtn.disabled = false;
      ocrBtn.textContent = t('view.runOcr');
    }
  });
}

async function loadViewer(viewerEl, doc, id) {
  const mime = doc.mime_type;
  try {
    if (mime.startsWith('image/')) {
      const { renderImageViewer } = await import('../viewers/image-viewer.js');
      const bytes = await api.readFileBytes(id);
      const blob = new Blob([new Uint8Array(bytes)], { type: mime });
      renderImageViewer(viewerEl, URL.createObjectURL(blob));
    } else if (mime === 'application/pdf') {
      const { renderPdfViewer } = await import('../viewers/pdf-viewer.js');
      const bytes = await api.readFileBytes(id);
      renderPdfViewer(viewerEl, new Uint8Array(bytes));
    } else if (mime === 'text/markdown' || mime === 'text/plain' || mime === 'text/csv') {
      const { renderMdViewer } = await import('../viewers/md-viewer.js');
      const text = await api.readFileText(id);
      renderMdViewer(viewerEl, text, mime !== 'text/markdown');
    } else {
      viewerEl.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full p-8 text-[var(--color-text-muted)]">
          <div class="text-6xl mb-4">📎</div>
          <p class="text-sm">${t('view.noPreview')}</p>
          <p class="text-xs mt-1">${doc.file_extension.toUpperCase().replace('.','')}</p>
        </div>
      `;
    }
  } catch (err) {
    viewerEl.innerHTML = `
      <div class="flex items-center justify-center h-full p-8 text-red-500 text-sm">
        ${t('view.loadError')}${escHtml(String(err))}
      </div>
    `;
  }
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
