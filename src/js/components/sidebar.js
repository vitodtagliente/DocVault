import store from '../store.js';
import router from '../router.js';

const navItems = [
  { hash: '#/', icon: '🏠', label: 'Home' },
  { hash: '#/expiring', icon: '⏰', label: 'Scadenze' },
  { hash: '#/categories', icon: '📁', label: 'Categorie' },
  { hash: '#/backup', icon: '💾', label: 'Backup' },
  { hash: '#/settings', icon: '⚙️', label: 'Impostazioni' },
];

export function renderSidebar(el) {
  if (!el) return;

  const render = () => {
    const currentPage = store.getState().currentPage;
    el.innerHTML = `
      <div class="flex items-center gap-2 px-4 py-5 border-b border-[var(--color-border)]">
        <span class="text-2xl">🗄️</span>
        <span class="font-bold text-lg text-[var(--color-text)]">DocVault</span>
      </div>
      <nav class="flex-1 px-2 py-4 space-y-1">
        ${navItems.map(item => `
          <a href="${item.hash}" class="nav-link ${currentPage === pageFromHash(item.hash) ? 'active' : ''}">
            <span class="text-lg">${item.icon}</span>
            <span>${item.label}</span>
          </a>
        `).join('')}
        <hr class="border-[var(--color-border)] my-2"/>
        <a href="#/sync" class="nav-link ${currentPage === 'sync' ? 'active' : ''}">
          <span class="text-lg">☁️</span>
          <span>Sync Drive</span>
        </a>
      </nav>
      <div class="px-4 py-3 border-t border-[var(--color-border)]">
        <a href="#/add" class="btn-primary w-full justify-center">
          + Aggiungi documento
        </a>
      </div>
    `;
  };

  render();
  store.subscribe('currentPage', render);
}

function pageFromHash(hash) {
  if (hash === '#/') return 'home';
  return hash.replace('#/', '');
}
