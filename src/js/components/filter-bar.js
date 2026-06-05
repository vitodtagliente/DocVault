import store from '../store.js';

/**
 * Renders the filter bar HTML.
 * @param {object} filters - current SearchFilters
 * @param {object[]} categories
 * @param {object[]} tags
 */
export function filterBarHtml(filters, categories, tags) {
  return `
    <div class="flex flex-wrap gap-2 items-end" id="filter-bar">
      <!-- Category filter -->
      <div>
        <label class="label text-xs">Categoria</label>
        <select class="input text-sm py-1.5 pr-8" id="filter-category" style="min-width:140px">
          <option value="">Tutte</option>
          ${categories.map(c => `
            <option value="${c.id}" ${filters.categoryId === c.id ? 'selected' : ''}>
              ${escHtml(c.name)}
            </option>
          `).join('')}
        </select>
      </div>

      <!-- Year filter -->
      <div>
        <label class="label text-xs">Anno</label>
        <select class="input text-sm py-1.5" id="filter-year" style="min-width:90px">
          <option value="0">Tutti</option>
          ${getYearOptions(filters.yearFilter)}
        </select>
      </div>

      <!-- Sort -->
      <div>
        <label class="label text-xs">Ordina per</label>
        <select class="input text-sm py-1.5" id="filter-sort" style="min-width:140px">
          <option value="date_desc" ${filters.sortBy === 'date_desc' ? 'selected' : ''}>Data ↓</option>
          <option value="date_asc" ${filters.sortBy === 'date_asc' ? 'selected' : ''}>Data ↑</option>
          <option value="title_asc" ${filters.sortBy === 'title_asc' ? 'selected' : ''}>Titolo A-Z</option>
          <option value="created_desc" ${filters.sortBy === 'created_desc' ? 'selected' : ''}>Più recenti</option>
        </select>
      </div>

      <!-- Favorites toggle -->
      <label class="flex items-center gap-1.5 text-sm text-[var(--color-text)] cursor-pointer select-none mt-4">
        <input type="checkbox" id="filter-favorites" class="rounded" ${filters.favoritesOnly ? 'checked' : ''} />
        ⭐ Preferiti
      </label>

      <!-- Expiring toggle -->
      <label class="flex items-center gap-1.5 text-sm text-[var(--color-text)] cursor-pointer select-none mt-4">
        <input type="checkbox" id="filter-expiring" class="rounded" ${filters.expiringOnly ? 'checked' : ''} />
        ⏰ In scadenza
      </label>

      <!-- Reset -->
      <button class="btn-ghost text-sm mt-4" id="filter-reset">Azzera filtri</button>
    </div>
  `;
}

export function mountFilterBar(container, onChange) {
  const get = (id) => container.querySelector(`#${id}`);

  const collect = () => ({
    categoryId:    get('filter-category')?.value || '',
    yearFilter:    parseInt(get('filter-year')?.value || '0'),
    sortBy:        get('filter-sort')?.value || 'date_desc',
    favoritesOnly: get('filter-favorites')?.checked || false,
    expiringOnly:  get('filter-expiring')?.checked || false,
  });

  ['filter-category','filter-year','filter-sort'].forEach(id => {
    get(id)?.addEventListener('change', () => onChange(collect()));
  });
  ['filter-favorites','filter-expiring'].forEach(id => {
    get(id)?.addEventListener('change', () => onChange(collect()));
  });
  get('filter-reset')?.addEventListener('click', () => {
    if (get('filter-category')) get('filter-category').value = '';
    if (get('filter-year')) get('filter-year').value = '0';
    if (get('filter-sort')) get('filter-sort').value = 'date_desc';
    if (get('filter-favorites')) get('filter-favorites').checked = false;
    if (get('filter-expiring')) get('filter-expiring').checked = false;
    onChange({ categoryId: '', yearFilter: 0, sortBy: 'date_desc', favoritesOnly: false, expiringOnly: false });
  });
}

function getYearOptions(selected) {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 10 }, (_, i) => currentYear - i).map(y => `
    <option value="${y}" ${selected === y ? 'selected' : ''}>${y}</option>
  `).join('');
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
