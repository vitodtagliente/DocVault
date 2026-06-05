import store from '../store.js';

export function renderHeader(el) {
  if (!el) return;

  const render = () => {
    const currentPage = store.getState().currentPage;
    const titles = {
      'home': 'DocVault',
      'add-document': 'Aggiungi documento',
      'edit-document': 'Modifica documento',
      'view-document': 'Dettaglio documento',
      'categories': 'Categorie',
      'settings': 'Impostazioni',
      'setup': 'Configurazione',
      'sync': 'Sync Google Drive',
      'backup': 'Backup & Restore',
      'expiring': 'Documenti in scadenza',
    };
    const title = titles[currentPage] || 'DocVault';
    const canGoBack = currentPage !== 'home' && currentPage !== 'setup';

    el.innerHTML = `
      <div class="flex items-center gap-2">
        ${canGoBack ? `<button id="header-back" class="btn-ghost p-1">← </button>` : `<span class="text-xl">🗄️</span>`}
        <span class="font-semibold text-[var(--color-text)]">${title}</span>
      </div>
      <a href="#/add" class="btn-primary text-sm px-3 py-1.5">+</a>
    `;

    el.querySelector('#header-back')?.addEventListener('click', () => {
      window.history.back();
    });
  };

  render();
  store.subscribe('currentPage', render);
}
