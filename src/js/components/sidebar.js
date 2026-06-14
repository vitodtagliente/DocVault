import store from '../store.js';
import { t } from '../i18n.js';
import { icon } from '../utils/icons.js';
import { appConfig } from '../app-config.js';

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" style="width:100%;height:100%">
  <path d="M16 2L3 7.5v9.5c0 7.2 5.7 13.6 13 14.9C23.3 30.6 29 24.2 29 17V7.5L16 2z" fill="currentColor"/>
  <path d="M11 11h7l4 4V23H11V11z" fill="white" fill-opacity="0.95"/>
  <path d="M18 11l4 4h-3a1 1 0 0 1-1-1v-3z" fill="currentColor" fill-opacity="0.22"/>
  <rect x="12.5" y="16.5" width="5.5" height="1.3" rx="0.65" fill="currentColor" fill-opacity="0.32"/>
  <rect x="12.5" y="19.2" width="5.5" height="1.3" rx="0.65" fill="currentColor" fill-opacity="0.32"/>
  <rect x="12.5" y="21.8" width="3.5" height="1.3" rx="0.65" fill="currentColor" fill-opacity="0.32"/>
</svg>`;

export function renderSidebar(el) {
  if (!el) return;

  const render = () => {
    const { currentPage, expiringCount } = store.getState();
    const navItems = [
      { hash: '#/',              iconName: 'home',    labelKey: 'nav.home' },
      { hash: '#/categories',   iconName: 'folder',  labelKey: 'nav.categories' },
      { hash: '#/backup',       iconName: 'archive', labelKey: 'nav.backup' },
      { hash: '#/settings',     iconName: 'cog',     labelKey: 'nav.settings' },
    ];

    const notifBadge = expiringCount > 0
      ? `<span class="ml-auto text-[0.6rem] bg-amber-500 text-white rounded-full px-1.5 py-0.5 font-bold leading-none">${expiringCount}</span>`
      : '';

    el.innerHTML = `
      <div class="flex items-center gap-2.5 px-4 py-5 border-b border-[var(--color-border)]">
        <span style="width:1.75rem;height:1.75rem;flex-shrink:0;color:var(--color-primary);display:block">${LOGO_SVG}</span>
        <span class="font-bold text-lg tracking-tight text-[var(--color-text)]"> ${appConfig.name}</span>
      </div>
      <nav class="flex-1 px-2 py-4 space-y-0.5">
        ${navItems.map(item => `
          <a href="${item.hash}"
             class="nav-link ${currentPage === pageFromHash(item.hash) ? 'active' : ''} transition-colors">
            <span class="w-4 h-4 flex-shrink-0 opacity-70">${icon(item.iconName, 'w-4 h-4')}</span>
            <span>${t(item.labelKey)}</span>
          </a>
        `).join('')}

        <!-- Notifications -->
        <a href="#/notifications"
           class="nav-link ${currentPage === 'notifications' ? 'active' : ''} transition-colors">
          <span class="w-4 h-4 flex-shrink-0 opacity-70">${icon('bell', 'w-4 h-4')}</span>
          <span>${t('nav.notifications')}</span>
          ${notifBadge}
        </a>

        <hr class="border-[var(--color-border)] my-2"/>
        <a href="#/import" class="nav-link ${currentPage === 'import' ? 'active' : ''} transition-colors">
          <i class="fa-solid fa-file-import w-4 flex-shrink-0 opacity-70" style="font-size:.875rem"></i>
          <span>${t('nav.import')}</span>
        </a>
        <a href="#/sync" class="nav-link ${currentPage === 'sync' ? 'active' : ''} transition-colors">
          <span class="w-4 h-4 flex-shrink-0 opacity-70">${icon('cloud', 'w-4 h-4')}</span>
          <span>${t('nav.sync')}</span>
        </a>
        <a href="#/about" class="nav-link ${currentPage === 'about' ? 'active' : ''} transition-colors">
          <span class="w-4 h-4 flex-shrink-0 opacity-70">${icon('info', 'w-4 h-4')}</span>
          <span>${t('nav.about')}</span>
        </a>
      </nav>
      <div class="px-4 py-3 border-t border-[var(--color-border)]">
        <a href="#/add" class="btn-primary w-full justify-center gap-2 transition-all hover:shadow-md">
          <span class="w-4 h-4">${icon('plus', 'w-4 h-4')}</span>
          ${t('nav.addDocument')}
        </a>
      </div>
    `;
  };

  render();
  store.subscribe('currentPage', render);
  store.subscribe('lang', render);
  store.subscribe('expiringCount', render);
}

function pageFromHash(hash) {
  if (hash === '#/') return 'home';
  return hash.replace('#/', '');
}
