/**
 * Category selector with optional grouping for subcategories.
 * Parents appear first; their children are indented below with ↳ prefix.
 */
export function presetSelectorHtml(categories, selectedId = '') {
  const ordered = buildCategoryOrder(categories);
  return `
    <select class="input text-sm" id="preset-category" required>
      <option value="">— ${escHtml('Select category')} —</option>
      ${ordered.map(({ cat, isChild }) => `
        <option value="${cat.id}" ${cat.id === selectedId ? 'selected' : ''}>
          ${isChild ? '  ↳ ' : ''}${escHtml(cat.name)}
        </option>
      `).join('')}
    </select>
  `;
}

/**
 * Build a flat ordered list: parents first (sorted), then their children
 * immediately below each parent (also sorted). Standalone categories (no parent,
 * no children) are interleaved among parents by sort_order.
 */
export function buildCategoryOrder(categories) {
  if (!categories || categories.length === 0) return [];

  const parents = categories.filter(c => !c.parent_id);
  const childrenByParent = {};
  for (const c of categories) {
    if (c.parent_id) {
      if (!childrenByParent[c.parent_id]) childrenByParent[c.parent_id] = [];
      childrenByParent[c.parent_id].push(c);
    }
  }

  const result = [];
  for (const parent of parents) {
    result.push({ cat: parent, isChild: false });
    const children = childrenByParent[parent.id] || [];
    for (const child of children) {
      result.push({ cat: child, isChild: true });
    }
  }
  return result;
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
