/**
 * Home — document list (left) + preview sidebar (right).
 *
 * Layout:
 *  Desktop (lg+): side-by-side flex row, both panels fill viewport height,
 *                 each scrolls independently. Right panel always visible.
 *  Mobile:        stacked column. Right panel hidden until a doc is selected,
 *                 then appears below the list with a Close button.
 *
 * Negates app-content's p-4/lg:p-6 padding via -m-4/-m-6 so the layout
 * reaches the shell edges cleanly.
 */

import * as api from '../api.js';
import store from '../store.js';
import { t } from '../i18n.js';
import { icon } from '../utils/icons.js';
import { debounce } from '../utils/debounce.js';
import { formatFileSize } from '../utils/format.js';
import { formatDate } from '../utils/date.js';
import { renderDocumentList } from '../components/document-grid.js';
import { filterBarHtml, mountFilterBar } from '../components/filter-bar.js';
import { paginationHtml, mountPagination } from '../components/pagination.js';
import { showToast } from '../components/toast.js';
import { confirm } from '../components/modal.js';

export async function render(container) {
  const { categories, tags, searchFilters } = store.getState();

  // Inject doc-list-item base styles once (hover etc. can't rely on compiled Tailwind)
  injectListStyles();

  container.innerHTML = `
    <div id="home-root"
         style="display:flex;flex-direction:column;overflow:hidden;height:100%">

      <!-- ── Left panel ───────────────────────────────────────────── -->
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden;min-height:0;
                  border-right:1px solid var(--color-border)">

        <!-- Search bar -->
        <div style="padding:.75rem 1rem;border-bottom:1px solid var(--color-border);flex-shrink:0">
          <div style="display:flex;gap:.5rem">
            <div style="position:relative;flex:1">
              <span style="position:absolute;left:.75rem;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--color-text-muted)">
                ${icon('search', 'w-4 h-4')}
              </span>
              <input type="search" id="search-input"
                     style="width:100%;padding:.5rem .75rem .5rem 2.25rem;border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-bg);color:var(--color-text);font-size:.875rem;outline:none"
                     placeholder="${t('home.search')}"
                     value="${escHtml(searchFilters?.query || '')}" />
            </div>
            <button id="toggle-filters" class="btn-secondary"
                    style="display:flex;align-items:center;gap:.375rem;padding:.5rem .75rem;font-size:.8125rem;flex-shrink:0;white-space:nowrap">
              ${icon('filter', 'w-4 h-4')} ${t('filter.filters')}
            </button>
            <button id="export-btn" class="btn-secondary"
                    style="display:flex;align-items:center;gap:.375rem;padding:.5rem .75rem;font-size:.8125rem;flex-shrink:0;white-space:nowrap">
              ${icon('upload', 'w-4 h-4')} ${t('home.exportShort')}
            </button>
          </div>

          <!-- Filter panel -->
          <div id="filters-panel" style="display:none;margin-top:.5rem;
               padding:.75rem;border-radius:var(--radius-lg);border:1px solid var(--color-border);
               background:var(--color-surface);box-shadow:0 1px 4px rgba(0,0,0,.06)">
            ${filterBarHtml(searchFilters || {}, categories, tags)}
          </div>
        </div>

        <!-- Stats bar -->
        <div id="stats-bar"
             style="padding:.375rem 1rem;border-bottom:1px solid var(--color-border);
                    font-size:.75rem;color:var(--color-text-muted);
                    display:flex;flex-wrap:wrap;gap:.75rem;align-items:center;
                    flex-shrink:0;min-height:2rem">
        </div>

        <!-- Document list (scrollable) -->
        <div id="results-container" style="flex:1;overflow-y:auto;min-height:0">
          <div style="display:flex;justify-content:center;padding:3rem 0">
            <div class="spinner"></div>
          </div>
        </div>

        <!-- Pagination -->
        <div id="pagination-container"
             style="padding:.5rem 1rem;border-top:1px solid var(--color-border);
                    flex-shrink:0;min-height:2.5rem;display:flex;align-items:center">
        </div>
      </div>

      <!-- ── Right panel (preview sidebar) ────────────────────────── -->
      <div id="preview-panel"
           style="display:none;flex-direction:column;overflow:hidden;
                  width:100%;flex-shrink:0;
                  border-top:1px solid var(--color-border)">
        <div id="preview-content" style="flex:1;overflow-y:auto;display:flex;flex-direction:column">
          ${emptyPreviewHtml()}
        </div>
      </div>
    </div>
  `;

  /* ── State ──────────────────────────────────────────────────────── */
  let filters       = { ...(searchFilters || {}) };
  let currentPage   = 0;
  let selectedDocId = null;

  const searchInput         = container.querySelector('#search-input');
  const filtersPanel        = container.querySelector('#filters-panel');
  const toggleFiltersBtn    = container.querySelector('#toggle-filters');
  const statsBar            = container.querySelector('#stats-bar');
  const resultsContainer    = container.querySelector('#results-container');
  const paginationContainer = container.querySelector('#pagination-container');
  const previewPanel        = container.querySelector('#preview-panel');
  const previewContent      = container.querySelector('#preview-content');
  const homeRoot            = container.querySelector('#home-root');

  /* ── Helpers ────────────────────────────────────────────────────── */
  const isDesktop = () => window.innerWidth >= 1024;

  function applyDesktopLayout() {
    if (isDesktop()) {
      homeRoot.style.flexDirection = 'row';
      homeRoot.style.height        = '100%';
      homeRoot.style.overflow      = 'hidden';
      homeRoot.style.margin        = '-1.5rem'; // negate lg:p-6 from app-content
      Object.assign(previewPanel.style, {
        display:       'flex',
        flexDirection: 'column',
        width:         '380px',
        flexShrink:    '0',
        overflow:      'hidden',
        borderTop:     'none',
        borderLeft:    '1px solid var(--color-border)',
      });
    } else {
      homeRoot.style.flexDirection = 'column';
      homeRoot.style.height        = 'auto';
      homeRoot.style.overflow      = 'visible';
      homeRoot.style.margin        = '-1rem'; // negate p-4 from app-content
      Object.assign(previewPanel.style, {
        width:      '100%',
        borderLeft: 'none',
        borderTop:  '1px solid var(--color-border)',
      });
      // On mobile, only show the preview panel when a doc is selected
      if (!selectedDocId) previewPanel.style.display = 'none';
    }
  }

  function openPreviewPanel() {
    if (isDesktop()) {
      previewPanel.style.display = 'flex';
    } else {
      // Mobile: appear below the list
      Object.assign(previewPanel.style, {
        display:    'flex',
        width:      '100%',
        borderTop:  '1px solid var(--color-border)',
        borderLeft: 'none',
        maxHeight:  '70vh',
        overflowY:  'auto',
      });
      setTimeout(() => previewPanel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }

  function closePreviewPanel() {
    selectedDocId = null;
    // Deselect all rows
    resultsContainer.querySelectorAll('.doc-list-item').forEach(r => {
      r.dataset.selected = 'false';
      r.style.backgroundColor = '';
      r.style.borderLeftColor = 'transparent';
    });
    if (isDesktop()) {
      previewContent.innerHTML = emptyPreviewHtml();
    } else {
      previewPanel.style.display = 'none';
    }
  }

  /* ── Filters toggle ─────────────────────────────────────────────── */
  toggleFiltersBtn.addEventListener('click', () => {
    const open = filtersPanel.style.display === 'none';
    filtersPanel.style.display = open ? 'block' : 'none';
    toggleFiltersBtn.classList.toggle('btn-primary', open);
    toggleFiltersBtn.classList.toggle('btn-secondary', !open);
  });

  mountFilterBar(container, (newFilters) => {
    filters = { ...filters, ...newFilters };
    currentPage = 0;
    doSearch();
  });

  /* ── Export ─────────────────────────────────────────────────────── */
  container.querySelector('#export-btn')?.addEventListener('click', async () => {
    try {
      const outputPath = await api.saveFileDialog('documenti_export.csv', [{ name: 'CSV', extensions: ['csv'] }]);
      if (!outputPath) return;
      await api.exportCsv({ ...filters, query: searchInput.value.trim() }, outputPath);
      showToast(t('home.exportSuccess'), 'success');
    } catch {
      showToast(t('home.exportError'), 'error');
    }
  });

  /* ── Search ─────────────────────────────────────────────────────── */
  const doSearch = debounce(async () => {
    resultsContainer.innerHTML = `<div style="display:flex;justify-content:center;padding:3rem 0"><div class="spinner"></div></div>`;

    try {
      const result = await api.searchDocuments({
        ...filters,
        query: searchInput.value.trim(),
        page: currentPage,
        page_size: 40,
      });

      store.setState({ searchResults: result });

      renderDocumentList(resultsContainer, result.documents, selectedDocId, (id) => {
        if (id === null) {
          closePreviewPanel();
        } else {
          selectedDocId = id;
          openPreviewPanel();
          loadPreview(id);
        }
      });

      statsBar.innerHTML = `
        <span>${result.total_count} ${result.total_count === 1 ? t('home.document') : t('home.documents')}</span>
        ${result.total_count > 0 ? `<span>· ${t('home.page')} ${currentPage + 1} ${t('home.of')} ${result.total_pages}</span>` : ''}
      `;

      paginationContainer.innerHTML = paginationHtml({ page: currentPage, totalPages: result.total_pages });
      mountPagination(paginationContainer, (p) => {
        currentPage = p;
        doSearch();
        resultsContainer.scrollTop = 0;
      });
    } catch (err) {
      resultsContainer.innerHTML = `
        <div style="text-align:center;padding:3rem 1rem;color:#ef4444;font-size:.875rem">
          ${t('home.searchError')} ${escHtml(String(err))}
        </div>
      `;
    }
  }, 300);

  searchInput.addEventListener('input', () => { currentPage = 0; doSearch(); });

  /* ── Stats ──────────────────────────────────────────────────────── */
  api.getStats().then(stats => {
    if (!stats) return;
    if (!searchInput.value) {
      statsBar.innerHTML = `
        <span>${stats.total_documents} ${t('home.documents')}</span>
        <span>· ${stats.total_categories} ${t('home.categories')}</span>
        <span>· ${stats.total_tags} ${t('home.tags')}</span>
        <span>· ${formatFileSize(stats.total_size_bytes)}</span>
        ${stats.expiring_soon > 0 ? `<span style="color:#d97706">· ⏰ ${stats.expiring_soon} ${t('home.expiringSoon')}</span>` : ''}
      `;
    }
    store.setState({ expiringCount: stats.expiring_soon });
  }).catch(() => {});

  /* ── Initial layout + resize ────────────────────────────────────── */
  applyDesktopLayout();

  const onResize = debounce(() => {
    applyDesktopLayout();
    if (!isDesktop() && previewPanel.style.display !== 'none' && selectedDocId) {
      // Keep open on mobile but reset sizing
      Object.assign(previewPanel.style, { width: '100%', borderLeft: 'none', borderTop: '1px solid var(--color-border)' });
    }
  }, 150);
  window.addEventListener('resize', onResize);

  doSearch();

  /* ── Preview panel ──────────────────────────────────────────────── */

  async function loadPreview(id) {
    previewContent.innerHTML = `<div style="display:flex;justify-content:center;padding:3rem 0"><div class="spinner"></div></div>`;
    try {
      const detail = await api.getDocument(id);
      renderPreview(detail, id);
    } catch (err) {
      previewContent.innerHTML = `<div style="padding:2rem;color:#ef4444;font-size:.875rem">${escHtml(String(err))}</div>`;
    }
  }

  function renderPreview(detail, id) {
    const doc          = detail.document;
    const cat          = detail.category;
    const tags         = detail.tags || [];
    const customFields = (detail.custom_fields || []).filter(cf => cf.value);

    previewContent.innerHTML = `
      <!-- Header -->
      <div style="padding:.75rem 1rem;border-bottom:1px solid var(--color-border);
                  flex-shrink:0;display:flex;align-items:flex-start;gap:.5rem">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:.375rem;flex-wrap:wrap;margin-bottom:2px">
            <span style="font-size:.65rem;padding:2px 6px;border-radius:4px;color:white;background:${cat.color}">${escHtml(cat.name)}</span>
            ${doc.is_favorite ? '<span style="color:#f59e0b;font-size:.75rem">★</span>' : ''}
          </div>
          <h2 style="font-size:.875rem;font-weight:600;color:var(--color-text);line-height:1.3;
                     display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">
            ${escHtml(doc.title)}
          </h2>
          <p style="font-size:.7rem;color:var(--color-text-muted);margin-top:2px">
            ${formatDate(doc.document_date)} · ${formatFileSize(doc.file_size)} · ${(doc.file_extension || '').replace('.','').toUpperCase()}
          </p>
        </div>
        <div style="display:flex;gap:2px;flex-shrink:0">
          <button id="pv-fav"
                  style="padding:6px;border-radius:var(--radius-md);display:flex;align-items:center;
                         font-size:1rem;line-height:1;
                         color:${doc.is_favorite ? '#f59e0b' : 'var(--color-text-muted)'};"
                  title="Favourite">
            ${doc.is_favorite ? '★' : '☆'}
          </button>
          <a href="#/edit/${id}" class="btn-ghost"
             style="padding:6px;border-radius:var(--radius-md);display:flex;align-items:center"
             title="${t('view.edit')}">
            ${icon('pencil', 'w-3.5 h-3.5')}
          </a>
          <button id="pv-delete" class="btn-ghost"
                  style="padding:6px;border-radius:var(--radius-md);display:flex;align-items:center;color:#ef4444"
                  data-id="${id}" data-title="${escHtml(doc.title)}"
                  title="${t('view.delete')}">
            ${icon('trash', 'w-3.5 h-3.5')}
          </button>
          <button id="pv-close" class="btn-ghost"
                  style="padding:6px;border-radius:var(--radius-md);display:flex;align-items:center;color:var(--color-text-muted)"
                  title="Close">
            ${icon('xMark', 'w-3.5 h-3.5')}
          </button>
        </div>
      </div>

      <!-- File viewer -->
      <div id="pv-viewer"
           style="height:260px;flex-shrink:0;overflow:hidden;background:var(--color-bg);
                  display:flex;align-items:center;justify-content:center">
        <div class="spinner"></div>
      </div>

      <!-- Action buttons -->
      <div style="padding:.375rem .75rem;border-top:1px solid var(--color-border);
                  border-bottom:1px solid var(--color-border);
                  display:flex;gap:.5rem;flex-shrink:0">
        <button id="pv-reveal" class="btn-ghost"
                style="flex:1;display:flex;align-items:center;justify-content:center;gap:.375rem;
                       padding:.375rem;font-size:.75rem">
          ${icon('folderOpen', 'w-3.5 h-3.5')} ${t('view.showInExplorer')}
        </button>
        <button id="pv-open" class="btn-ghost"
                style="flex:1;display:flex;align-items:center;justify-content:center;gap:.375rem;
                       padding:.375rem;font-size:.75rem">
          ${icon('externalLink', 'w-3.5 h-3.5')} ${t('view.openWith')}
        </button>
      </div>

      <!-- Metadata -->
      <div style="flex:1;overflow-y:auto">
        ${tags.length ? `
          <div style="padding:.625rem 1rem;border-bottom:1px solid var(--color-border);display:flex;flex-wrap:wrap;gap:.25rem">
            ${tags.map(tag => `<span style="font-size:.65rem;padding:2px 6px;border-radius:4px;color:white;background:${tag.color}">${escHtml(tag.name)}</span>`).join('')}
          </div>
        ` : ''}
        ${customFields.length ? `
          <div style="padding:.625rem 1rem;border-bottom:1px solid var(--color-border)">
            ${customFields.map(cf => `
              <div style="margin-bottom:.375rem">
                <p style="font-size:.6rem;text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted)">${escHtml(cf.field_label)}</p>
                <p style="font-size:.8125rem;font-weight:500;color:var(--color-text)">${escHtml(cf.value)}</p>
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${doc.notes ? `
          <div style="padding:.625rem 1rem">
            <p style="font-size:.6rem;text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted);margin-bottom:.25rem">Notes</p>
            <p style="font-size:.8125rem;color:var(--color-text);white-space:pre-wrap">${escHtml(doc.notes)}</p>
          </div>
        ` : ''}
      </div>
    `;

    previewContent.querySelector('#pv-close')?.addEventListener('click', closePreviewPanel);

    let isFavorite = doc.is_favorite;
    previewContent.querySelector('#pv-fav')?.addEventListener('click', async () => {
      try {
        isFavorite = !isFavorite;
        await api.updateDocument({ id, is_favorite: isFavorite });
        const btn = previewContent.querySelector('#pv-fav');
        if (btn) {
          btn.textContent = isFavorite ? '★' : '☆';
          btn.style.color = isFavorite ? '#f59e0b' : 'var(--color-text-muted)';
        }
        const starEl = resultsContainer.querySelector(`[data-fav-star="${id}"]`);
        if (starEl) starEl.style.display = isFavorite ? 'inline' : 'none';
      } catch (err) {
        isFavorite = !isFavorite; // rollback
        showToast(String(err), 'error');
      }
    });

    previewContent.querySelector('#pv-reveal')?.addEventListener('click', async () => {
      try { await api.revealInFileManager(id); }
      catch (err) { showToast(String(err), 'error'); }
    });

    previewContent.querySelector('#pv-open')?.addEventListener('click', async () => {
      try { await api.openWithSystem(id); }
      catch (err) { showToast(String(err), 'error'); }
    });

    previewContent.querySelector('#pv-delete')?.addEventListener('click', () => {
      confirm(
        t('view.deleteConfirm', { title: doc.title }),
        async () => {
          try {
            await api.deleteDocument(id);
            showToast(t('view.deleted'), 'success');
            closePreviewPanel();
            doSearch();
          } catch (err) {
            showToast(t('view.error') + err, 'error');
          }
        },
        t('view.deleteTitle'),
      );
    });

    loadViewer(previewContent.querySelector('#pv-viewer'), doc, id);
  }

  async function loadViewer(viewerEl, doc, id) {
    if (!viewerEl) return;
    const mime = doc.mime_type;
    try {
      if (mime?.startsWith('image/')) {
        const { renderImageViewer } = await import('../viewers/image-viewer.js');
        const bytes = await api.readFileBytes(id);
        renderImageViewer(viewerEl, URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: mime })));
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
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--color-text-muted);padding:1.5rem">
            <span style="font-size:2.5rem;margin-bottom:.5rem">📎</span>
            <p style="font-size:.75rem">${t('view.noPreview')}</p>
          </div>
        `;
      }
    } catch {
      viewerEl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--color-text-muted);font-size:.75rem">
          ${t('view.noPreview')}
        </div>
      `;
    }
  }

  // Cleanup resize listener when page is torn down
  return () => window.removeEventListener('resize', onResize);
}

function emptyPreviewHtml() {
  return `
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
                padding:2rem;color:var(--color-text-muted);gap:.75rem;text-align:center">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor"
           style="width:3rem;height:3rem;opacity:.2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
      <p style="font-size:.875rem">${t('home.selectDoc')}</p>
    </div>
  `;
}

function injectListStyles() {
  if (document.getElementById('doc-list-styles')) return;
  const s = document.createElement('style');
  s.id = 'doc-list-styles';
  s.textContent = `
    .doc-list-item {
      display: flex;
      align-items: center;
      gap: .75rem;
      padding: .625rem 1rem;
      border-bottom: 1px solid var(--color-border);
      border-left: 3px solid transparent;
      cursor: pointer;
      transition: background-color .12s ease;
    }
    .doc-list-item:hover:not([data-selected="true"]) {
      background-color: var(--color-surface);
    }
  `;
  document.head.appendChild(s);
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
