import { t } from '../i18n.js';

export function filterBarHtml(filters, categories, tags) {
  return `
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end" id="filter-bar">
      <!-- Category -->
      <div class="flex flex-col gap-1">
        <label class="label text-xs">${t('filter.category')}</label>
        <select class="input text-sm py-1.5" id="filter-category">
          <option value="">${t('filter.allCategories')}</option>
          ${categories.map(c => `
            <option value="${c.id}" ${filters.categoryId === c.id ? 'selected' : ''}>
              ${escHtml(c.name)}
            </option>
          `).join('')}
        </select>
      </div>

      <!-- Year -->
      <div class="flex flex-col gap-1">
        <label class="label text-xs">${t('filter.year')}</label>
        <select class="input text-sm py-1.5" id="filter-year">
          <option value="0">${t('filter.allYears')}</option>
          ${getYearOptions(filters.yearFilter)}
        </select>
      </div>

      <!-- Sort -->
      <div class="flex flex-col gap-1">
        <label class="label text-xs">${t('filter.sortBy')}</label>
        <select class="input text-sm py-1.5" id="filter-sort">
          <option value="date_desc"    ${filters.sortBy === 'date_desc'    ? 'selected' : ''}>${t('filter.dateDesc')}</option>
          <option value="date_asc"     ${filters.sortBy === 'date_asc'     ? 'selected' : ''}>${t('filter.dateAsc')}</option>
          <option value="title_asc"    ${filters.sortBy === 'title_asc'    ? 'selected' : ''}>${t('filter.titleAsc')}</option>
          <option value="created_desc" ${filters.sortBy === 'created_desc' ? 'selected' : ''}>${t('filter.recentFirst')}</option>
        </select>
      </div>

      <!-- Toggles + Reset in a flex row on the same baseline -->
      <div class="flex flex-col gap-1 lg:col-span-3">
        <label class="label text-xs opacity-0 select-none">·</label>
        <div class="flex items-center gap-4 h-9">
          <label class="flex items-center gap-1.5 text-sm text-[var(--color-text)] cursor-pointer select-none">
            <input type="checkbox" id="filter-favorites" class="rounded" ${filters.favoritesOnly ? 'checked' : ''} />
            ${t('filter.favorites')}
          </label>
          <label class="flex items-center gap-1.5 text-sm text-[var(--color-text)] cursor-pointer select-none">
            <input type="checkbox" id="filter-expiring" class="rounded" ${filters.expiringOnly ? 'checked' : ''} />
            ${t('filter.expiring')}
          </label>
          <button class="btn-ghost text-sm ml-auto" id="filter-reset">${t('filter.reset')}</button>
        </div>
      </div>
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

  ['filter-category', 'filter-year', 'filter-sort'].forEach(id => {
    get(id)?.addEventListener('change', () => onChange(collect()));
  });
  ['filter-favorites', 'filter-expiring'].forEach(id => {
    get(id)?.addEventListener('change', () => onChange(collect()));
  });
  get('filter-reset')?.addEventListener('click', () => {
    if (get('filter-category'))  get('filter-category').value = '';
    if (get('filter-year'))      get('filter-year').value = '0';
    if (get('filter-sort'))      get('filter-sort').value = 'date_desc';
    if (get('filter-favorites')) get('filter-favorites').checked = false;
    if (get('filter-expiring'))  get('filter-expiring').checked = false;
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
