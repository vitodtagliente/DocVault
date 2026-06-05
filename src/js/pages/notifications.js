/**
 * Notifications page — expiring and expired documents.
 */

import * as api from '../api.js';
import { t } from '../i18n.js';
import { icon } from '../utils/icons.js';
import { formatDate } from '../utils/date.js';
import { daysUntilExpiry } from '../utils/date.js';
import store from '../store.js';
import router from '../router.js';

export async function render(container) {
  injectNotifStyles();

  container.innerHTML = `
    <div class="space-y-6">
      <h1 class="text-xl font-bold text-[var(--color-text)]">${t('notif.title')}</h1>
      <div class="flex items-center justify-center py-12"><div class="spinner"></div></div>
    </div>
  `;

  let result;
  try {
    result = await api.searchDocuments({
      sort_by: 'date_asc',
      page: 0,
      page_size: 200,
    });
  } catch (err) {
    container.innerHTML = `<p class="text-red-500 text-sm p-4">${err}</p>`;
    return;
  }

  const expired = [];
  const expiringSoon = [];

  for (const doc of result.documents) {
    if (!doc.expiry_date) continue;
    const days = daysUntilExpiry(doc.expiry_date);
    if (days === null) continue;
    if (days < 0)       expired.push({ doc, days });
    else if (days <= 30) expiringSoon.push({ doc, days });
  }

  const hasAny = expired.length > 0 || expiringSoon.length > 0;

  container.innerHTML = `
    <div class="space-y-6">
      <h1 class="text-xl font-bold text-[var(--color-text)]">${t('notif.title')}</h1>

      ${!hasAny ? `
        <div class="card" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;gap:1rem">
          <span style="color:#16a34a">${icon('checkCircle', 'w-10 h-10')}</span>
          <p class="text-sm text-[var(--color-text-muted)] text-center">${t('notif.none')}</p>
        </div>
      ` : ''}

      ${expired.length ? `
        <div class="space-y-2">
          <h2 style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#ef4444;
                     display:flex;align-items:center;gap:.5rem">
            <span style="width:.5rem;height:.5rem;border-radius:50%;background:#ef4444;flex-shrink:0;display:inline-block"></span>
            ${t('notif.expired')} (${expired.length})
          </h2>
          <div class="space-y-2">
            ${expired.map(({ doc, days }) => notifRow(doc, 'expired', days)).join('')}
          </div>
        </div>
      ` : ''}

      ${expiringSoon.length ? `
        <div class="space-y-2">
          <h2 style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#f59e0b;
                     display:flex;align-items:center;gap:.5rem">
            <span style="width:.5rem;height:.5rem;border-radius:50%;background:#f59e0b;flex-shrink:0;display:inline-block"></span>
            ${t('notif.expiringSoon')} (${expiringSoon.length})
          </h2>
          <div class="space-y-2">
            ${expiringSoon.map(({ doc, days }) => notifRow(doc, 'warning', days)).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-notif-open]');
    if (!btn) return;
    const docId = btn.dataset.notifOpen;
    store.setState({ pendingDocId: docId });
    router.navigate('#/');
  });
}

function notifRow(doc, severity, days) {
  const borderColor = severity === 'expired' ? '#f87171' : '#fbbf24';
  const bgColor     = severity === 'expired' ? 'rgba(239,68,68,.05)' : 'rgba(245,158,11,.05)';
  const badgeBg     = severity === 'expired' ? '#fee2e2' : '#fef3c7';
  const badgeFg     = severity === 'expired' ? '#b91c1c' : '#92400e';

  let dayLabel;
  if (days < 0)        dayLabel = t('notif.daysAgo', { days: Math.abs(days) });
  else if (days === 0) dayLabel = t('notif.today');
  else                 dayLabel = t('notif.inDays', { days });

  return `
    <div class="card notif-row"
         style="border-left:4px solid ${borderColor};background:${bgColor};
                display:flex;align-items:center;gap:.875rem;padding:.75rem 1rem">
      <div style="width:.75rem;height:.75rem;border-radius:50%;flex-shrink:0;background:${doc.category_color}"></div>
      <div style="flex:1;min-width:0">
        <p style="font-size:.875rem;font-weight:500;color:var(--color-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${escHtml(doc.title)}
        </p>
        <p style="font-size:.75rem;color:var(--color-text-muted);margin-top:2px">
          ${escHtml(doc.category_name)} &middot; ${formatDate(doc.document_date)} &middot;
          ${t('notif.expiresLabel')} ${formatDate(doc.expiry_date)}
        </p>
      </div>
      <div style="display:flex;align-items:center;gap:.625rem;flex-shrink:0">
        <span style="font-size:.7rem;padding:2px 8px;border-radius:999px;font-weight:600;
                     background:${badgeBg};color:${badgeFg}">${dayLabel}</span>
        <button class="btn-ghost" style="font-size:.75rem;padding:.3rem .625rem;display:flex;align-items:center;gap:.3rem"
                data-notif-open="${doc.id}">
          ${icon('eye', 'w-3.5 h-3.5')} ${t('notif.openDoc')}
        </button>
      </div>
    </div>
  `;
}

function injectNotifStyles() {
  if (document.getElementById('notif-styles')) return;
  const s = document.createElement('style');
  s.id = 'notif-styles';
  s.textContent = `
    .notif-row {
      transition: box-shadow .15s ease, transform .1s ease;
      cursor: default;
    }
    .notif-row:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,.08);
      transform: translateY(-1px);
    }
  `;
  document.head.appendChild(s);
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
