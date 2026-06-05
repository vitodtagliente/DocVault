/**
 * Home page — dashboard + search.
 */

import * as api from '../api.js';
import store from '../store.js';
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
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">🔍</span>
          <input type="search" id="search-input" class="input pl-9"
                 placeholder="Cerca documenti, tag, note…"
                 value="${escHtml(searchFilters.query || '')}" />
        </div>
        <button id="toggle-filters" class="btn-secondary text-sm">⚙️ Filtri</button>
        <button id="export-btn" class="btn-secondary text-sm">📤 Esporta</button>
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

  // State
  let filters = { ...searchFilters };
  let currentPage = 0;

  const searchInput   = container.querySelector('#search-input');
  const filtersPanel  = container.querySelector('#filters-panel');
  const toggleFilters = container.querySelector('#toggle-filters');
  const statsBar      = container.querySelector('#stats-bar');
  const resultsContainer = container.querySelector('#results-container');
  const paginationContainer = container.querySelector('#pagination-container');

  toggleFilters.addEventListener('click', () => {
    filtersPanel.classList.toggle('hidden');
  });

  // Mount filter bar
  mountFilterBar(container, (newFilters) => {
    filters = { ...filters, ...newFilters };
    currentPage = 0;
    doSearch();
  });

  // Search on input with debounce
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

      // Update store
      store.setState({ searchResults: result });

      renderDocumentGrid(resultsContainer, result.documents);

      // Stats bar
      statsBar.innerHTML = `
        <span>${result.total_count} document${result.total_count === 1 ? 'o' : 'i'}</span>
        ${result.total_count > 0 ? `<span>· Pagina ${currentPage + 1} di ${result.total_pages}</span>` : ''}
      `;

      // Pagination
      paginationContainer.innerHTML = paginationHtml({
        page: currentPage,
        totalPages: result.total_pages,
      });
      mountPagination(paginationContainer, (p) => {
        currentPage = p;
        doSearch();
        container.scrollIntoView({ behavior: 'smooth' });
      });
    } catch (err) {
      resultsContainer.innerHTML = `
        <div class="text-center py-12 text-red-500 text-sm">
          Errore durante la ricerca: ${escHtml(String(err))}
        </div>
      `;
    }
  }, 300);

  searchInput.addEventListener('input', () => {
    currentPage = 0;
    doSearch();
  });

  // Export CSV
  container.querySelector('#export-btn')?.addEventListener('click', async () => {
    try {
      const outputPath = await api.saveFileDialog('documenti_export.csv', [
        { name: 'CSV', extensions: ['csv'] }
      ]);
      if (!outputPath) return;
      await api.exportCsv({ ...filters, query: searchInput.value.trim() }, outputPath);
      showToast('Esportazione completata!', 'success');
    } catch (err) {
      showToast('Errore durante l\'esportazione', 'error');
    }
  });

  // Load stats in background
  api.getStats().then(stats => {
    if (!stats) return;
    statsBar.innerHTML = `
      <span>${stats.total_documents} documenti</span>
      <span>· ${stats.total_categories} categorie</span>
      <span>· ${stats.total_tags} tag</span>
      <span>· ${formatFileSize(stats.total_size_bytes)}</span>
      ${stats.expiring_soon > 0 ? `<span class="text-amber-600">· ⏰ ${stats.expiring_soon} in scadenza</span>` : ''}
    `;
  }).catch(() => {});

  // Initial search
  doSearch();
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
