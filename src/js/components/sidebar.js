import store from '../store.js';
import { t } from '../i18n.js';
import { icon } from '../utils/icons.js';

export function renderSidebar(el) {
  if (!el) return;

  const render = () => {
    const currentPage = store.getState().currentPage;
    const navItems = [
      { hash: '#/',           iconName: 'home',    labelKey: 'nav.home' },
      { hash: '#/expiring',   iconName: 'clock',   labelKey: 'nav.expiring' },
      { hash: '#/categories', iconName: 'folder',  labelKey: 'nav.categories' },
      { hash: '#/backup',     iconName: 'archive', labelKey: 'nav.backup' },
      { hash: '#/settings',   iconName: 'cog',     labelKey: 'nav.settings' },
    ];

    el.innerHTML = `
      <div class="flex items-center gap-2.5 px-4 py-5 border-b border-[var(--color-border)]">
        <span class="w-7 h-7 text-[var(--color-primary)]">${icon('docText', 'w-7 h-7')}</span>
        <span class="font-bold text-lg tracking-tight text-[var(--color-text)]">DocVault</span>
      </div>
      <nav class="flex-1 px-2 py-4 space-y-0.5">
        ${navItems.map(item => `
          <a href="${item.hash}" class="nav-link ${currentPage === pageFromHash(item.hash) ? 'active' : ''}">
            <span class="w-4 h-4 flex-shrink-0 opacity-70">${icon(item.iconName, 'w-4 h-4')}</span>
            <span>${t(item.labelKey)}</span>
          </a>
        `).join('')}
        <hr class="border-[var(--color-border)] my-2"/>
        <a href="#/sync" class="nav-link ${currentPage === 'sync' ? 'active' : ''}">
          <span class="w-4 h-4 flex-shrink-0 opacity-70">${icon('cloud', 'w-4 h-4')}</span>
          <span>${t('nav.sync')}</span>
        </a>
      </nav>
      <div class="px-4 py-3 border-t border-[var(--color-border)]">
        <a href="#/add" class="btn-primary w-full justify-center gap-2">
          <span class="w-4 h-4">${icon('plus', 'w-4 h-4')}</span>
          ${t('nav.addDocument')}
        </a>
      </div>
    `;
  };

  render();
  store.subscribe('currentPage', render);
  store.subscribe('lang', render);
}

function pageFromHash(hash) {
  if (hash === '#/') return 'home';
  return hash.replace('#/', '');
}
