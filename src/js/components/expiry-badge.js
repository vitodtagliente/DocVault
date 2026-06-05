import { daysUntilExpiry } from '../utils/date.js';
import { t } from '../i18n.js';

export function expiryBadgeHtml(expiryDate) {
  if (!expiryDate) return '';
  const days = daysUntilExpiry(expiryDate);

  if (days < 0) {
    return `<span class="badge bg-red-100 text-red-700">${t('expiry.expiredDaysAgo', { days: Math.abs(days) })}</span>`;
  }
  if (days === 0) {
    return `<span class="badge bg-red-100 text-red-700">${t('expiry.expiresToday')}</span>`;
  }
  if (days <= 7) {
    return `<span class="badge bg-red-100 text-red-700">${t('expiry.expiresInDaysUrgent', { days })}</span>`;
  }
  if (days <= 30) {
    return `<span class="badge bg-amber-100 text-amber-700">${t('expiry.expiresInDays', { days })}</span>`;
  }
  return `<span class="badge bg-green-100 text-green-700">${t('expiry.expiresOn', { date: expiryDate })}</span>`;
}
