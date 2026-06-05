import { documentCard } from './document-card.js';
import { delegate } from '../utils/dom.js';
import * as api from '../api.js';
import { showToast } from './toast.js';
import router from '../router.js';

/**
 * Renders document grid into `container`.
 * @param {HTMLElement} container
 * @param {object[]} documents - DocumentListItem[]
 */
export function renderDocumentGrid(container, documents) {
  if (!documents.length) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)]">
        <span class="text-5xl mb-3">📭</span>
        <p class="text-sm">Nessun documento trovato</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" id="doc-grid">
      ${documents.map(documentCard).join('')}
    </div>
  `;

  const grid = container.querySelector('#doc-grid');

  // Delegate click events
  delegate(grid, '[data-action="view"]', 'click', (e, btn) => {
    router.navigate(`#/view/${btn.dataset.id}`);
  });

  delegate(grid, '[data-action="edit"]', 'click', (e, btn) => {
    router.navigate(`#/edit/${btn.dataset.id}`);
  });

  delegate(grid, '[data-action="favorite"]', 'click', async (e, btn) => {
    e.stopPropagation();
    const id = btn.dataset.id;
    const isFav = btn.dataset.favorite === 'true';
    try {
      await api.updateDocument({ id, is_favorite: !isFav });
      btn.dataset.favorite = String(!isFav);
      btn.textContent = !isFav ? '⭐' : '☆';
      // Also update the star in the header badge
      const card = grid.querySelector(`.doc-card[data-id="${id}"]`);
      const favBadge = card?.querySelector('.doc-card-fav');
      if (favBadge) favBadge.style.display = !isFav ? 'inline' : 'none';
    } catch (err) {
      showToast('Errore durante il salvataggio', 'error');
    }
  });

  // Card click → view
  delegate(grid, '.doc-card', 'click', (e, card) => {
    if (e.target.closest('button')) return; // don't navigate on button clicks
    router.navigate(`#/view/${card.dataset.id}`);
  });
}
