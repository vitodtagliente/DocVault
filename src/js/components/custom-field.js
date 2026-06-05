/**
 * Renders a dynamic custom field input based on field type.
 * @param {object} field - PresetField
 * @param {string} [value] - current value
 * @returns {string} HTML
 */
export function customFieldHtml(field, value = '') {
  const required = field.is_required ? 'required' : '';
  const req = field.is_required ? '<span class="text-red-500">*</span>' : '';
  const base = `class="input text-sm" id="cf-${field.id}" name="cf-${field.id}" data-field-id="${field.id}" ${required}`;

  let input;
  switch (field.field_type) {
    case 'number':
      input = `<input type="number" step="0.01" value="${escHtml(value)}" ${base} />`;
      break;
    case 'date':
      input = `<input type="date" value="${escHtml(value)}" ${base} />`;
      break;
    case 'select':
      const opts = field.field_options || [];
      input = `
        <select ${base}>
          <option value="">— Seleziona —</option>
          ${opts.map(o => `<option value="${escHtml(o)}" ${value === o ? 'selected' : ''}>${escHtml(o)}</option>`).join('')}
        </select>
      `;
      break;
    default:
      input = `<input type="text" value="${escHtml(value)}" ${base} />`;
  }

  return `
    <div class="space-y-1">
      <label class="label" for="cf-${field.id}">
        ${escHtml(field.field_label)} ${req}
      </label>
      ${input}
    </div>
  `;
}

/**
 * Collects all custom field values from a form.
 * @param {HTMLElement} form
 * @returns {{ field_id: string, value: string }[]}
 */
export function collectCustomFields(form) {
  return [...form.querySelectorAll('[data-field-id]')].map(el => ({
    field_id: el.dataset.fieldId,
    value: el.value,
  }));
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
