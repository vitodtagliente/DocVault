/**
 * Date formatting utilities.
 */

const IT_MONTHS = [
  'gennaio','febbraio','marzo','aprile','maggio','giugno',
  'luglio','agosto','settembre','ottobre','novembre','dicembre',
];

/** Formats YYYY-MM-DD to "15 gennaio 2026" */
export function formatDate(isoDate) {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-').map(Number);
  return `${d} ${IT_MONTHS[m - 1]} ${y}`;
}

/** Formats YYYY-MM-DD to "gen 2026" */
export function formatDateShort(isoDate) {
  if (!isoDate) return '—';
  const [y, m] = isoDate.split('-').map(Number);
  return `${IT_MONTHS[m - 1].slice(0, 3)} ${y}`;
}

/** Returns today as YYYY-MM-DD */
export function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns days until expiry (negative if expired).
 * @param {string} expiryDate YYYY-MM-DD
 */
export function daysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  const diff = new Date(expiryDate) - new Date(today());
  return Math.ceil(diff / 86400000);
}

/** Returns expiry status string */
export function expiryStatus(expiryDate) {
  const days = daysUntilExpiry(expiryDate);
  if (days === null) return null;
  if (days < 0) return 'expired';
  if (days <= 7) return 'critical';
  if (days <= 30) return 'warning';
  return 'ok';
}
