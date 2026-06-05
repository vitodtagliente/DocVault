/**
 * Home page — dashboard + search.
 */

import * as api from '../api.js';
import store from '../store.js';
import { t } from '../i18n.js';
import { icon } from '../utils/icons.js';
import { debounce } from '../utils/debounce.js';
import { formatFileSize } from '../utils/format.js';
import { renderDocumentGrid } from '../components/document-grid.js';
import { filterBarHtml, mountFilterBar } from '../components/filter-bar.js';
import { paginationHtml, mountPagination } from '../components/pagination.js';
import { showToast } from '../components/toast.js';

export async function render(container) {
  const { categories, tags, searchFilters } = store.getState();

  container.innerHTML = `
    <div class="space-y-4">
      <!-- Search bar -->
      <div class="flex gap-2">
        <div class="relative flex-1">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]">${icon('search', 'w-4 h-4')}</span>
          <input type="search" id="search-input" class="input pl-9"
                 placeholder="${t('home.search')}"
                 value="${escHtml(searchFilters.query || '')}" />
        </div>
        <button id="toggle-filters" class="btn-secondary text-sm gap-1.5">
          ${icon('filter', 'w-4 h-4')} ${t('filter.filters') || 'Filters'}
        </button>
        <button id="export-btn" class="btn-secondary text-sm gap-1.5">
          ${icon('upload', 'w-4 h-4')} ${t('home.exportShort') || 'Export'}
        </button>
      </div>

      <!-- Filters (collapsible) -->
      <div id="filters-panel" class="hidden">
        ${filterBarHtml(searchFilters, categories, tags)}
      </div>

      <!-- Stats bar -->
      <div id="stats-bar" class="flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]"></div>

      <!-- Results -->
      <div id="results-container">
        <div class="flex items-center justify-center py-12">
          <div class="spinner"></div>
        </div>
      </div>

      <!-- Pagination -->
      <div id="pagination-container"></div>
    </div>
  `;

  let filters = { ...searchFilters };
  let currentPage = 0;

  const searchInput        = container.querySelector('#search-input');
  const filtersPanel       = container.querySelector('#filters-panel');
  const toggleFilters      = container.querySelector('#toggle-filters');
  const statsBar           = container.querySelector('#stats-bar');
  const resultsContainer   = container.querySelector('#results-container');
  const paginationContainer= container.querySelector('#pagination-container');

  toggleFilters.addEventListener('click', () => {
    filtersPanel.classList.toggle('hidden');
  });

  mountFilterBar(container, (newFilters) => {
    filters = { ...filters, ...newFilters };
    currentPage = 0;
    doSearch();
  });

  const doSearch = debounce(async () => {
    resultsContainer.innerHTML = `
      <div class="flex items-center justify-center py-12">
        <div class="spinner"></div>
      </div>
    `;

    try {
      const result = await api.searchDocuments({
        ...filters,
        query: searchInput.value.trim(),
        page: currentPage,
        page_size: filters.pageSize || 24,
      });

      store.setState({ searchResults: result });
      renderDocumentGrid(resultsContainer, result.documents);

      statsBar.innerHTML = `
        <span>${result.total_count} ${result.total_count === 1 ? t('home.document') : t('home.documents')}</span>
        ${result.total_count > 0 ? `<span>· ${t('home.page')} ${currentPage + 1} ${t('home.of')} ${result.total_pages}</span>` : ''}
      `;

      paginationContainer.innerHTML = paginationHtml({ page: currentPage, totalPages: result.total_pages });
      mountPagination(paginationContainer, (p) => {
        currentPage = p;
        doSearch();
        container.scrollIntoView({ behavior: 'smooth' });
      });
    } catch (err) {
      resultsContainer.innerHTML = `
        <div class="text-center py-12 text-red-500 text-sm">
          ${t('home.searchError')} ${escHtml(String(err))}
        </div>
      `;
    }
  }, 300);

  searchInput.addEventListener('input', () => {
    currentPage = 0;
    doSearch();
  });

  container.querySelector('#export-btn')?.addEventListener('click', async () => {
    try {
      const outputPath = await api.saveFileDialog('documenti_export.csv', [
        { name: 'CSV', extensions: ['csv'] }
      ]);
      if (!outputPath) return;
      await api.exportCsv({ ...filters, query: searchInput.value.trim() }, outputPath);
      showToast(t('home.exportSuccess'), 'success');
    } catch (err) {
      showToast(t('home.exportError'), 'error');
    }
  });

  api.getStats().then(stats => {
    if (!stats) return;
    statsBar.innerHTML = `
      <span>${stats.total_documents} ${t('home.documents')}</span>
      <span>· ${stats.total_categories} ${t('home.categories')}</span>
      <span>· ${stats.total_tags} ${t('home.tags')}</span>
      <span>· ${formatFileSize(stats.total_size_bytes)}</span>
      ${stats.expiring_soon > 0 ? `<span class="text-amber-600">· ⏰ ${stats.expiring_soon} ${t('home.expiringSoon')}</span>` : ''}
    `;
  }).catch(() => {});

  doSearch();
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
