/**
 * Formatting utilities.
 */

/** Formats bytes to human-readable string (KB, MB, GB). */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Returns a display-friendly MIME type label. */
export function mimeLabel(mime) {
  const map = {
    'application/pdf': 'PDF',
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/gif': 'GIF',
    'image/webp': 'WebP',
    'text/markdown': 'Markdown',
    'text/plain': 'Testo',
    'text/csv': 'CSV',
    'application/msword': 'Word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
    'application/vnd.ms-excel': 'Excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  };
  return map[mime] || mime?.split('/')[1]?.toUpperCase() || 'File';
}

/** Returns an SVG icon name for a MIME type. */
export function mimeIcon(mime) {
  if (!mime) return 'file';
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'file-text';
  if (mime === 'text/markdown' || mime === 'text/plain') return 'file-text';
  if (mime.includes('word')) return 'file-text';
  if (mime.includes('excel') || mime.includes('spreadsheet')) return 'table';
  return 'file';
}
