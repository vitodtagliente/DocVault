import store from '../store.js';

const navItems = [
  { hash: '#/', icon: '🏠', label: 'Home' },
  { hash: '#/add', icon: '➕', label: 'Aggiungi' },
  { hash: '#/expiring', icon: '⏰', label: 'Scadenze' },
  { hash: '#/settings', icon: '⚙️', label: 'Impostazioni' },
];

export function renderBottomNav(el) {
  if (!el) return;

  const render = () => {
    const currentPage = store.getState().currentPage;
    el.innerHTML = `
      <div class="flex items-center justify-around h-14">
        ${navItems.map(item => {
          const page = item.hash === '#/' ? 'home' : item.hash.replace('#/', '');
          const isActive = currentPage === page;
          return `
            <a href="${item.hash}" class="flex flex-col items-center gap-0.5 text-xs px-3 py-2
              ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}">
              <span class="text-xl">${item.icon}</span>
              <span>${item.label}</span>
            </a>
          `;
        }).join('')}
      </div>
    `;
  };

  render();
  store.subscribe('currentPage', render);
}
