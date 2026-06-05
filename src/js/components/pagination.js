/**
 * Pagination component.
 * @param {object} opts
 * @param {number} opts.page - current page (0-indexed)
 * @param {number} opts.totalPages
 * @param {Function} opts.onPage - called with new page number
 * @returns {string} HTML
 */
export function paginationHtml({ page, totalPages, onPage }) {
  if (totalPages <= 1) return '';

  const pages = getPagesArray(page, totalPages);

  return `
    <div class="flex items-center justify-center gap-1 mt-6" id="pagination">
      <button class="btn-secondary px-3 py-1.5 text-sm" data-page="${page - 1}" ${page === 0 ? 'disabled' : ''}>←</button>
      ${pages.map(p => p === '…'
        ? `<span class="px-2 text-[var(--color-text-muted)]">…</span>`
        : `<button class="btn-${p === page ? 'primary' : 'secondary'} w-8 h-8 text-sm" data-page="${p}">${p + 1}</button>`
      ).join('')}
      <button class="btn-secondary px-3 py-1.5 text-sm" data-page="${page + 1}" ${page >= totalPages - 1 ? 'disabled' : ''}>→</button>
    </div>
  `;
}

/**
 * Mounts pagination click handlers.
 * @param {HTMLElement} container - element containing #pagination
 * @param {Function} onPage
 */
export function mountPagination(container, onPage) {
  container.querySelector('#pagination')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    const page = parseInt(btn.dataset.page);
    if (!isNaN(page)) onPage(page);
  });
}

function getPagesArray(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages = [];
  if (current <= 3) {
    pages.push(0, 1, 2, 3, 4, '…', total - 1);
  } else if (current >= total - 4) {
    pages.push(0, '…', total - 5, total - 4, total - 3, total - 2, total - 1);
  } else {
    pages.push(0, '…', current - 1, current, current + 1, '…', total - 1);
  }
  return pages;
}
