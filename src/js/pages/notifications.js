/**
 * Notifications page — expiring and expired documents.
 */

import * as api from '../api.js';
import { t } from '../i18n.js';
import { icon } from '../utils/icons.js';
import { formatDate } from '../utils/date.js';
import { daysUntilExpiry } from '../utils/date.js';
import router from '../router.js';

export async function render(container) {
  container.innerHTML = `
    <div class="max-w-2xl mx-auto space-y-6">
      <h1 class="text-xl font-bold text-[var(--color-text)]">${t('notif.title')}</h1>
      <div class="flex items-center justify-center py-12"><div class="spinner"></div></div>
    </div>
  `;

  let result;
  try {
    result = await api.searchDocuments({
      expiring_only: false,
      sort_by: 'date_asc',
      page: 0,
      page_size: 100,
    });
  } catch (err) {
    container.innerHTML = `<p class="text-red-500 text-sm p-4">${err}</p>`;
    return;
  }

  // Partition into expired and expiring-soon
  const now = new Date();
  const expired = [];
  const expiringSoon = [];

  for (const doc of result.documents) {
    if (!doc.expiry_date) continue;
    const days = daysUntilExpiry(doc.expiry_date);
    if (days === null) continue;
    if (days < 0) {
      expired.push({ doc, days });
    } else if (days <= 30) {
      expiringSoon.push({ doc, days });
    }
  }

  const hasAny = expired.length > 0 || expiringSoon.length > 0;

  container.innerHTML = `
    <div class="max-w-2xl mx-auto space-y-6">
      <h1 class="text-xl font-bold text-[var(--color-text)]">${t('notif.title')}</h1>

      ${!hasAny ? `
        <div class="card flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)] space-y-3">
          <span style="font-size:2.5rem;color:#16a34a">${icon('checkCircle', 'w-10 h-10')}</span>
          <p class="text-sm text-center">${t('notif.none')}</p>
        </div>
      ` : ''}

      ${expired.length ? `
        <div class="space-y-2">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-red-500 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
            ${t('notif.expired')} (${expired.length})
          </h2>
          <div class="space-y-2">
            ${expired.map(({ doc, days }) => notifRow(doc, 'expired', days)).join('')}
          </div>
        </div>
      ` : ''}

      ${expiringSoon.length ? `
        <div class="space-y-2">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
            ${t('notif.expiringSoon')} (${expiringSoon.length})
          </h2>
          <div class="space-y-2">
            ${expiringSoon.map(({ doc, days }) => notifRow(doc, 'warning', days)).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Wire up clicks
  container.querySelectorAll('[data-notif-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      router.navigate(`#/view/${btn.dataset.notifOpen}`);
    });
  });
}

function notifRow(doc, severity, days) {
  const borderColor = severity === 'expired' ? 'border-l-red-400' : 'border-l-amber-400';
  const bgColor     = severity === 'expired' ? 'bg-red-50 dark:bg-red-900/10' : 'bg-amber-50 dark:bg-amber-900/10';
  const badgeClass  = severity === 'expired' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';

  let dayLabel;
  if (days < 0)   dayLabel = t('notif.daysAgo', { days: Math.abs(days) });
  else if (days === 0) dayLabel = t('notif.today');
  else             dayLabel = t('notif.inDays', { days });

  return `
    <div class="card border-l-4 ${borderColor} ${bgColor} flex items-center gap-3 py-3 hover:shadow-md transition-shadow">
      <div class="w-3 h-3 rounded-full flex-shrink-0" style="background:${doc.category_color}"></div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-[var(--color-text)] truncate">${escHtml(doc.title)}</p>
        <p class="text-xs text-[var(--color-text-muted)]">
          ${escHtml(doc.category_name)} · ${formatDate(doc.document_date)} · expires ${formatDate(doc.expiry_date)}
        </p>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <span class="text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}">${dayLabel}</span>
        <button class="btn-ghost text-xs px-2 py-1 transition-colors" data-notif-open="${doc.id}">
          ${t('notif.openDoc')}
        </button>
      </div>
    </div>
  `;
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
