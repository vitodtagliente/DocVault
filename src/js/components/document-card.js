import { formatDate } from '../utils/date.js';
import { formatFileSize } from '../utils/format.js';
import { expiryStatus, daysUntilExpiry } from '../utils/date.js';
import { t } from '../i18n.js';
import { icon } from '../utils/icons.js';

/**
 * Renders a single document as a compact list row.
 * Selected state uses inline styles so it works without recompiling Tailwind.
 */
export function documentRow(doc, selected = false) {
  const expiry  = expiryStatus(doc.expiry_date);
  const tags    = (doc.tags || []).slice(0, 3);
  const ext     = (doc.file_extension || '').replace('.', '').toUpperCase();

  const expiryBadge = expiry && expiry !== 'ok'
    ? `<span class="text-[0.6rem] px-1.5 py-0.5 rounded-full ml-1 ${expiry === 'expired' || expiry === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}">${expiryShort(doc.expiry_date)}</span>`
    : '';

  const selectedStyle = selected
    ? 'background-color:var(--color-surface);border-left-color:var(--color-primary);'
    : 'border-left-color:transparent;';

  return `
    <div class="doc-list-item"
         style="${selectedStyle}"
         data-id="${doc.id}"
         data-selected="${selected}">
      <!-- Category bar -->
      <div style="width:3px;min-height:2rem;border-radius:2px;flex-shrink:0;background:${doc.category_color}"></div>

      <!-- Title + meta -->
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:.875rem;font-weight:500;color:var(--color-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
                title="${escHtml(doc.title)}">${escHtml(doc.title)}</span>
          <span data-fav-star="${doc.id}" style="flex-shrink:0;display:${doc.is_favorite ? 'inline-flex' : 'none'};align-items:center">${icon('star', 'w-3 h-3', '#f59e0b')}</span>
        </div>
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-top:2px">
          <span style="font-size:.7rem;color:var(--color-text-muted)">${formatDate(doc.document_date)}</span>
          <span style="font-size:.65rem;padding:1px 6px;border-radius:4px;color:white;background:${doc.category_color};line-height:1.4">${escHtml(doc.category_name)}</span>
          ${tags.map(tag => `<span style="font-size:.65rem;padding:1px 6px;border-radius:4px;color:white;background:${tag.color};line-height:1.4">${escHtml(tag.name)}</span>`).join('')}
          ${doc.tags && doc.tags.length > 3 ? `<span style="font-size:.65rem;color:var(--color-text-muted)">+${doc.tags.length - 3}</span>` : ''}
        </div>
      </div>

      <!-- Right: ext + expiry + size -->
      <div style="flex-shrink:0;text-align:right;line-height:1.4">
        <div style="font-size:.7rem;font-family:monospace;color:var(--color-text-muted)">${ext}${expiryBadge}</div>
        <div style="font-size:.65rem;color:var(--color-text-muted);margin-top:1px">${formatFileSize(doc.file_size)}</div>
      </div>
    </div>
  `;
}

function expiryShort(expiryDate) {
  const days = daysUntilExpiry(expiryDate);
  if (days === null) return '';
  if (days < 0)  return t('notif.daysAgo', { days: Math.abs(days) });
  if (days === 0) return t('notif.today');
  return t('notif.inDays', { days });
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
