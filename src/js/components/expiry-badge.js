import { daysUntilExpiry } from '../utils/date.js';

/**
 * Returns HTML badge for expiry date.
 * @param {string|null} expiryDate YYYY-MM-DD
 */
export function expiryBadgeHtml(expiryDate) {
  if (!expiryDate) return '';
  const days = daysUntilExpiry(expiryDate);

  if (days < 0) {
    return `<span class="badge bg-red-100 text-red-700">Scaduto ${Math.abs(days)} gg fa</span>`;
  }
  if (days === 0) {
    return `<span class="badge bg-red-100 text-red-700">Scade oggi!</span>`;
  }
  if (days <= 7) {
    return `<span class="badge bg-red-100 text-red-700">⚠️ Scade in ${days} gg</span>`;
  }
  if (days <= 30) {
    return `<span class="badge bg-amber-100 text-amber-700">Scade in ${days} gg</span>`;
  }
  return `<span class="badge bg-green-100 text-green-700">Scade il ${expiryDate}</span>`;
}
