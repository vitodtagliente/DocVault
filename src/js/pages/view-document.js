/**
 * View Document page — detail + integrated viewer.
 */

import * as api from '../api.js';
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
    container.innerHTML = `<p class="text-red-500 text-sm">Documento non trovato</p>`;
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
          <button id="btn-reveal" class="btn-secondary text-sm">📂 Mostra in Explorer</button>
          <button id="btn-open" class="btn-secondary text-sm">↗️ Apri con…</button>
          <a href="#/edit/${id}" class="btn-secondary text-sm">✏️ Modifica</a>
          <button id="btn-delete" class="btn-danger text-sm">🗑️ Elimina</button>
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
          <!-- Custom fields -->
          ${detail.custom_fields.filter(cf => cf.value).length ? `
            <div class="card space-y-2">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Dettagli</h3>
              ${detail.custom_fields.filter(cf => cf.value).map(cf => `
                <div>
                  <p class="text-xs text-[var(--color-text-muted)]">${escHtml(cf.field_label)}</p>
                  <p class="text-sm font-medium text-[var(--color-text)]">${escHtml(cf.value)}</p>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <!-- Tags -->
          ${detail.tags.length ? `
            <div class="card">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Tag</h3>
              <div class="flex flex-wrap gap-1">
                ${detail.tags.map(t => `
                  <span class="tag-chip" style="background:${t.color}">${escHtml(t.name)}</span>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Notes -->
          ${doc.notes ? `
            <div class="card">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Note</h3>
              <p class="text-sm text-[var(--color-text)] whitespace-pre-wrap">${escHtml(doc.notes)}</p>
            </div>
          ` : ''}

          <!-- OCR -->
          <div class="card">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Testo OCR</h3>
              <button id="btn-ocr" class="btn-ghost text-xs px-2 py-1">🔍 Esegui OCR</button>
            </div>
            <div id="ocr-text" class="text-xs text-[var(--color-text-muted)] max-h-40 overflow-y-auto">
              ${doc.ocr_text
                ? `<p class="whitespace-pre-wrap">${escHtml(doc.ocr_text)}</p>`
                : '<p class="italic">Nessun testo estratto</p>'}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load viewer
  loadViewer(container.querySelector('#viewer-container'), doc, id);

  // Action buttons
  container.querySelector('#btn-reveal')?.addEventListener('click', async () => {
    try { await api.revealInFileManager(id); }
    catch (err) { showToast('Errore: ' + err, 'error'); }
  });

  container.querySelector('#btn-open')?.addEventListener('click', async () => {
    try { await api.openWithSystem(id); }
    catch (err) { showToast('Errore: ' + err, 'error'); }
  });

  container.querySelector('#btn-delete')?.addEventListener('click', () => {
    confirm(`Eliminare "${doc.title}"? Il file fisico non verrà rimosso.`,
      async () => {
        try {
          await api.deleteDocument(id);
          showToast('Documento eliminato', 'success');
          router.navigate('#/');
        } catch (err) {
          showToast('Errore: ' + err, 'error');
        }
      },
      'Elimina documento',
    );
  });

  container.querySelector('#btn-ocr')?.addEventListener('click', async () => {
    const ocrBtn = container.querySelector('#btn-ocr');
    const ocrText = container.querySelector('#ocr-text');
    ocrBtn.disabled = true;
    ocrBtn.textContent = 'In corso…';
    try {
      const text = await api.runOcr(id, ['ita', 'eng']);
      ocrText.innerHTML = `<p class="whitespace-pre-wrap">${escHtml(text)}</p>`;
      showToast('OCR completato!', 'success');
    } catch (err) {
      showToast('OCR fallito: ' + err, 'error');
    } finally {
      ocrBtn.disabled = false;
      ocrBtn.textContent = '🔍 Esegui OCR';
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
      const url = URL.createObjectURL(blob);
      renderImageViewer(viewerEl, url);
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
          <p class="text-sm">Anteprima non disponibile per questo tipo di file.</p>
          <p class="text-xs mt-1">${doc.file_extension.toUpperCase().replace('.','')}</p>
        </div>
      `;
    }
  } catch (err) {
    viewerEl.innerHTML = `
      <div class="flex items-center justify-center h-full p-8 text-red-500 text-sm">
        Errore caricamento: ${escHtml(String(err))}
      </div>
    `;
  }
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
