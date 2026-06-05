/**
 * Expiring documents page.
 */

import * as api from '../api.js';
import { t } from '../i18n.js';
import { renderDocumentGrid } from '../components/document-grid.js';

export async function render(container) {
  container.innerHTML = `
    <div class="max-w-4xl mx-auto space-y-4">
      <h1 class="text-xl font-bold text-[var(--color-text)]">${t('expiring.title')}</h1>
      <div id="expiring-container">
        <div class="flex items-center justify-center py-12"><div class="spinner"></div></div>
      </div>
    </div>
  `;

  try {
    const result = await api.searchDocuments({
      expiring_only: true,
      sort_by: 'date_asc',
      page: 0,
      page_size: 100,
    });
    const c = container.querySelector('#expiring-container');
    if (!result.documents.length) {
      c.innerHTML = `
        <div class="text-center py-12 text-[var(--color-text-muted)]">
          <span class="text-5xl block mb-3">✅</span>
          <p class="text-sm">${t('expiring.none')}</p>
        </div>
      `;
    } else {
      renderDocumentGrid(c, result.documents);
    }
  } catch (err) {
    container.querySelector('#expiring-container').innerHTML =
      `<p class="text-red-500 text-sm">${t('expiring.error')}${err}</p>`;
  }
}
