import store from '../store.js';
import { t } from '../i18n.js';
import { icon } from '../utils/icons.js';

export function renderBottomNav(el) {
  if (!el) return;

  const render = () => {
    const currentPage = store.getState().currentPage;
    const navItems = [
      { hash: '#/',         iconName: 'home',    labelKey: 'nav.home' },
      { hash: '#/add',      iconName: 'plus',    labelKey: 'nav.add' },
      { hash: '#/expiring', iconName: 'clock',   labelKey: 'nav.expiring' },
      { hash: '#/settings', iconName: 'cog',     labelKey: 'nav.settings' },
    ];

    el.innerHTML = `
      <div class="flex items-center justify-around h-14">
        ${navItems.map(item => {
          const page = item.hash === '#/' ? 'home' : item.hash.replace('#/', '');
          const isActive = currentPage === page;
          return `
            <a href="${item.hash}" class="flex flex-col items-center gap-0.5 text-xs px-3 py-2
              ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}">
              <span class="w-5 h-5">${icon(item.iconName, 'w-5 h-5')}</span>
              <span>${t(item.labelKey)}</span>
            </a>
          `;
        }).join('')}
      </div>
    `;
  };

  render();
  store.subscribe('currentPage', render);
  store.subscribe('lang', render);
}
