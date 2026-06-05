/**
 * Preset (category) selector with icon and color badge.
 * @param {object[]} categories
 * @param {string} [selectedId]
 * @returns {string} HTML
 */
export function presetSelectorHtml(categories, selectedId = '') {
  return `
    <select class="input text-sm" id="preset-category" required>
      <option value="">— Seleziona categoria —</option>
      ${categories.map(c => `
        <option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>
          ${escHtml(c.name)}
        </option>
      `).join('')}
    </select>
  `;
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
