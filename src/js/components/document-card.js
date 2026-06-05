import { formatDate } from '../utils/date.js';
import { formatFileSize } from '../utils/format.js';
import { expiryStatus, daysUntilExpiry } from '../utils/date.js';
import { t } from '../i18n.js';
import { icon } from '../utils/icons.js';

export function documentCard(doc) {
  const expiry = expiryStatus(doc.expiry_date);
  const expiryClass = {
    expired:  'bg-red-100 text-red-700',
    critical: 'bg-red-100 text-red-700',
    warning:  'bg-amber-100 text-amber-700',
    ok:       'bg-green-100 text-green-700',
  }[expiry] || '';

  const fileIcon = getFileIcon(doc.file_extension, doc.mime_type);
  const tags = (doc.tags || []).slice(0, 3);

  return `
    <div class="doc-card" data-id="${doc.id}">
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0 w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center
                    text-2xl bg-[var(--color-border)]">
          ${fileIcon}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1 mb-1">
            <span class="badge text-white text-xs px-1.5 py-0.5 rounded"
                  style="background:${doc.category_color}">
              ${doc.category_name}
            </span>
            ${doc.is_favorite ? `<span title="${t('card.favorite')}">⭐</span>` : ''}
          </div>
          <h3 class="text-sm font-medium text-[var(--color-text)] truncate" title="${escHtml(doc.title)}">
            ${escHtml(doc.title)}
          </h3>
          <p class="text-xs text-[var(--color-text-muted)] mt-0.5">
            ${formatDate(doc.document_date)} · ${formatFileSize(doc.file_size)}
          </p>
        </div>
      </div>

      ${expiry && expiry !== 'ok' ? `
        <div class="text-xs px-2 py-0.5 rounded-full inline-block ${expiryClass}">
          ${expiryLabel(doc.expiry_date)}
        </div>
      ` : ''}

      ${tags.length ? `
        <div class="flex flex-wrap gap-1 mt-1">
          ${tags.map(tag => `
            <span class="tag-chip" style="background:${tag.color}">${escHtml(tag.name)}</span>
          `).join('')}
          ${doc.tags.length > 3 ? `<span class="badge bg-[var(--color-border)] text-[var(--color-text-muted)]">+${doc.tags.length - 3}</span>` : ''}
        </div>
      ` : ''}

      <div class="flex items-center gap-1 mt-2 pt-2 border-t border-[var(--color-border)]">
        <button class="btn-ghost text-xs px-2 py-1 gap-1 flex items-center" data-action="view" data-id="${doc.id}">
          ${icon('eye', 'w-3.5 h-3.5')} ${t('card.open')}
        </button>
        <button class="btn-ghost text-xs px-2 py-1 gap-1 flex items-center" data-action="edit" data-id="${doc.id}">
          ${icon('pencil', 'w-3.5 h-3.5')} ${t('card.edit')}
        </button>
        <button class="btn-ghost text-xs px-2 py-1 ml-auto text-[var(--color-text-muted)]"
                data-action="favorite" data-id="${doc.id}" data-favorite="${doc.is_favorite}"
                title="${t('card.favorite')}">
          ${doc.is_favorite ? '★' : '☆'}
        </button>
      </div>
    </div>
  `;
}

function getFileIcon(ext, mime) {
  if (mime?.startsWith('image/')) return '🖼️';
  if (mime === 'application/pdf' || ext === '.pdf') return '📄';
  if (ext === '.md' || ext === '.markdown') return '📝';
  if (mime?.includes('word') || ext === '.doc' || ext === '.docx') return '📄';
  if (mime?.includes('excel') || ext === '.xls' || ext === '.xlsx') return '📊';
  if (ext === '.txt' || ext === '.csv') return '📋';
  if (ext === '.zip' || ext === '.rar') return '🗜️';
  return '📎';
}

function expiryLabel(expiryDate) {
  const days = daysUntilExpiry(expiryDate);
  if (days === null) return '';
  if (days < 0)  return t('card.expiredDaysAgo', { days: Math.abs(days) });
  if (days === 0) return t('card.expiresToday');
  return t('card.expiresInDays', { days });
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
