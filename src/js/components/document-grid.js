import { documentRow } from './document-card.js';
import { delegate } from '../utils/dom.js';
import { t } from '../i18n.js';
import router from '../router.js';

/**
 * Renders a scrollable list of document rows.
 * @param {HTMLElement} container
 * @param {Array} documents
 * @param {string|null} selectedId   — currently highlighted row
 * @param {Function|null} onSelect   — called with id (string) on select, null on deselect
 */
export function renderDocumentList(container, documents, selectedId = null, onSelect = null) {
  if (!documents.length) {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 1rem;color:var(--color-text-muted)">
        <span style="font-size:3rem;margin-bottom:.75rem">📭</span>
        <p style="font-size:.875rem">${t('home.noDocuments')}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div id="doc-list">${documents.map(doc => documentRow(doc, doc.id === selectedId)).join('')}</div>`;

  const list = container.querySelector('#doc-list');

  delegate(list, '.doc-list-item', 'click', (e, row) => {
    const id           = row.dataset.id;
    const alreadySel   = row.dataset.selected === 'true';

    // Deselect all rows
    list.querySelectorAll('.doc-list-item').forEach(r => {
      r.dataset.selected = 'false';
      r.style.backgroundColor = '';
      r.style.borderLeftColor = 'transparent';
    });

    if (alreadySel) {
      // Click on already-selected row → deselect
      onSelect ? onSelect(null) : router.navigate(`#/view/${id}`);
    } else {
      // Select this row
      row.dataset.selected = 'true';
      row.style.backgroundColor = 'var(--color-surface)';
      row.style.borderLeftColor  = 'var(--color-primary)';
      onSelect ? onSelect(id) : router.navigate(`#/view/${id}`);
    }
  });
}

// Backward-compatibility alias
export function renderDocumentGrid(container, documents) {
  renderDocumentList(container, documents);
}
