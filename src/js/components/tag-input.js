/**
 * Tag input with autocomplete and inline creation.
 *
 * Usage:
 *   import { TagInput } from '../components/tag-input.js';
 *   const tagInput = new TagInput(containerEl, existingTags, allTags);
 *   tagInput.getTags(); // → string[]
 */

export class TagInput {
  constructor(container, initialTags = [], allTags = []) {
    this.container = container;
    this.selected = [...initialTags];
    this.allTags = allTags;
    this._render();
  }

  _render() {
    this.container.innerHTML = `
      <div class="border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-bg)]
                  flex flex-wrap gap-1 p-2 min-h-[40px] cursor-text" id="tag-input-area">
        ${this.selected.map(t => this._chipHtml(t)).join('')}
        <input
          id="tag-text-input"
          type="text"
          placeholder="Aggiungi tag…"
          class="border-none outline-none bg-transparent text-sm flex-1 min-w-[120px] text-[var(--color-text)]
                 placeholder:text-[var(--color-text-muted)]"
          autocomplete="off"
        />
      </div>
      <div id="tag-suggestions" class="hidden absolute z-10 mt-1 w-full bg-[var(--color-bg)] border
           border-[var(--color-border)] rounded-[var(--radius-md)] shadow-lg max-h-40 overflow-y-auto text-sm">
      </div>
    `;
    this.container.style.position = 'relative';

    const input = this.container.querySelector('#tag-text-input');
    const suggestions = this.container.querySelector('#tag-suggestions');

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { suggestions.classList.add('hidden'); return; }

      const matches = this.allTags
        .filter(t => t.name.toLowerCase().includes(q) && !this.selected.includes(t.name))
        .slice(0, 8);

      if (!matches.length && q.length < 2) { suggestions.classList.add('hidden'); return; }

      suggestions.innerHTML = [
        ...matches.map(t => `
          <div class="px-3 py-2 hover:bg-[var(--color-surface)] cursor-pointer" data-name="${t.name}">
            ${t.name}
          </div>
        `),
        q && !matches.find(t => t.name.toLowerCase() === q) ? `
          <div class="px-3 py-2 hover:bg-[var(--color-surface)] cursor-pointer text-[var(--color-primary)]"
               data-name="${q}" data-new="1">
            + Crea "${q}"
          </div>
        ` : '',
      ].join('');
      suggestions.classList.remove('hidden');
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const val = input.value.trim().replace(/,$/, '');
        if (val) this._addTag(val);
        input.value = '';
        suggestions.classList.add('hidden');
      } else if (e.key === 'Backspace' && !input.value && this.selected.length) {
        this._removeTag(this.selected[this.selected.length - 1]);
      }
    });

    suggestions.addEventListener('click', (e) => {
      const item = e.target.closest('[data-name]');
      if (!item) return;
      this._addTag(item.dataset.name);
      input.value = '';
      suggestions.classList.add('hidden');
      input.focus();
    });

    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) suggestions.classList.add('hidden');
    });

    this.container.querySelector('#tag-input-area')?.addEventListener('click', () => input.focus());
  }

  _chipHtml(name) {
    return `
      <span class="flex items-center gap-1 badge bg-[var(--color-primary)] text-white text-xs"
            data-tag="${name}">
        ${escHtml(name)}
        <button type="button" class="hover:opacity-70 leading-none" data-remove-tag="${name}">×</button>
      </span>
    `;
  }

  _addTag(name) {
    if (!name || this.selected.includes(name)) return;
    this.selected.push(name);
    this._rerender();
  }

  _removeTag(name) {
    this.selected = this.selected.filter(t => t !== name);
    this._rerender();
  }

  _rerender() {
    const area = this.container.querySelector('#tag-input-area');
    const input = this.container.querySelector('#tag-text-input');
    if (!area || !input) return;

    // Remove old chips
    area.querySelectorAll('[data-tag]').forEach(c => c.remove());

    // Insert chips before input
    this.selected.forEach(name => {
      const chip = document.createElement('span');
      chip.className = 'flex items-center gap-1 badge bg-[var(--color-primary)] text-white text-xs';
      chip.dataset.tag = name;
      chip.innerHTML = `${escHtml(name)}<button type="button" class="hover:opacity-70 leading-none" data-remove-tag="${name}">×</button>`;
      chip.querySelector('[data-remove-tag]')?.addEventListener('click', () => this._removeTag(name));
      area.insertBefore(chip, input);
    });
  }

  getTags() {
    return [...this.selected];
  }

  mount() {
    // Already mounted in constructor. Call after re-adding to DOM if needed.
    this.container.querySelectorAll('[data-remove-tag]').forEach(btn => {
      btn.addEventListener('click', () => this._removeTag(btn.dataset.removeTag));
    });
  }
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
