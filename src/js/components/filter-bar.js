import { t } from '../i18n.js';
import { icon } from '../utils/icons.js';

export function filterBarHtml(filters, categories, tags) {
  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(148px, 1fr));gap:.75rem;align-items:end" id="filter-bar">

      <!-- Category -->
      <div class="flex flex-col gap-1">
        <label class="label text-xs">${t('filter.category')}</label>
        <select class="input text-sm py-1.5" id="filter-category">
          <option value="">${t('filter.allCategories')}</option>
          ${(categories || []).map(c => `
            <option value="${c.id}" ${filters.category_id === c.id ? 'selected' : ''}>
              ${escHtml(c.name)}
            </option>
          `).join('')}
        </select>
      </div>

      <!-- Tag -->
      <div class="flex flex-col gap-1">
        <label class="label text-xs">${t('filter.tag')}</label>
        <select class="input text-sm py-1.5" id="filter-tag">
          <option value="">${t('filter.allTags')}</option>
          ${(tags || []).map(tag => `
            <option value="${tag.id}" ${(filters.tag_ids || []).includes(tag.id) ? 'selected' : ''}>
              ${escHtml(tag.name)}
            </option>
          `).join('')}
        </select>
      </div>

      <!-- Year -->
      <div class="flex flex-col gap-1">
        <label class="label text-xs">${t('filter.year')}</label>
        <select class="input text-sm py-1.5" id="filter-year">
          <option value="0">${t('filter.allYears')}</option>
          ${getYearOptions(filters.year_filter)}
        </select>
      </div>

      <!-- Sort -->
      <div class="flex flex-col gap-1">
        <label class="label text-xs">${t('filter.sortBy')}</label>
        <select class="input text-sm py-1.5" id="filter-sort">
          <option value="date_desc"    ${filters.sort_by === 'date_desc'    ? 'selected' : ''}>${t('filter.dateDesc')}</option>
          <option value="date_asc"     ${filters.sort_by === 'date_asc'     ? 'selected' : ''}>${t('filter.dateAsc')}</option>
          <option value="title_asc"    ${filters.sort_by === 'title_asc'    ? 'selected' : ''}>${t('filter.titleAsc')}</option>
          <option value="created_desc" ${filters.sort_by === 'created_desc' ? 'selected' : ''}>${t('filter.recentFirst')}</option>
        </select>
      </div>

      <!-- Toggles + Reset -->
      <div class="flex flex-col gap-1" style="grid-column: span 2">
        <label class="label text-xs opacity-0 select-none">·</label>
        <div class="flex items-center gap-4 h-9 flex-wrap">
          <label class="flex items-center gap-1.5 text-sm text-[var(--color-text)] cursor-pointer select-none">
            <input type="checkbox" id="filter-favorites" class="rounded" ${filters.favorites_only ? 'checked' : ''} />
            ${icon('star', 'w-3.5 h-3.5', '#f59e0b')} ${t('filter.favorites')}
          </label>
          <label class="flex items-center gap-1.5 text-sm text-[var(--color-text)] cursor-pointer select-none">
            <input type="checkbox" id="filter-expiring" class="rounded" ${filters.expiring_only ? 'checked' : ''} />
            ${icon('clock', 'w-3.5 h-3.5', '#f97316')} ${t('filter.expiring')}
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
    category_id:    get('filter-category')?.value || '',
    tag_ids:        get('filter-tag')?.value ? [get('filter-tag').value] : [],
    year_filter:    parseInt(get('filter-year')?.value || '0'),
    sort_by:        get('filter-sort')?.value || 'date_desc',
    favorites_only: get('filter-favorites')?.checked || false,
    expiring_only:  get('filter-expiring')?.checked || false,
  });

  ['filter-category', 'filter-tag', 'filter-year', 'filter-sort'].forEach(id => {
    get(id)?.addEventListener('change', () => onChange(collect()));
  });
  ['filter-favorites', 'filter-expiring'].forEach(id => {
    get(id)?.addEventListener('change', () => onChange(collect()));
  });
  get('filter-reset')?.addEventListener('click', () => {
    if (get('filter-category'))  get('filter-category').value = '';
    if (get('filter-tag'))       get('filter-tag').value = '';
    if (get('filter-year'))      get('filter-year').value = '0';
    if (get('filter-sort'))      get('filter-sort').value = 'date_desc';
    if (get('filter-favorites')) get('filter-favorites').checked = false;
    if (get('filter-expiring'))  get('filter-expiring').checked = false;
    onChange({ category_id: '', tag_ids: [], year_filter: 0, sort_by: 'date_desc', favorites_only: false, expiring_only: false });
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
