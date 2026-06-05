import store from '../store.js';
import { t } from '../i18n.js';
import { icon } from '../utils/icons.js';

export function renderHeader(el) {
  if (!el) return;

  const render = () => {
    const currentPage = store.getState().currentPage;
    const pageKey = {
      'home':          'page.home',
      'add-document':  'page.addDocument',
      'edit-document': 'page.editDocument',
      'view-document': 'page.viewDocument',
      'categories':    'page.categories',
      'settings':      'page.settings',
      'setup':         'page.setup',
      'sync':          'page.sync',
      'backup':        'page.backup',
      'expiring':      'page.expiring',
    };
    const title = t(pageKey[currentPage] || 'page.home');
    const canGoBack = currentPage !== 'home' && currentPage !== 'setup';

    el.innerHTML = `
      <div class="flex items-center gap-2">
        ${canGoBack
          ? `<button id="header-back" class="btn-ghost p-1.5 -ml-1">${icon('arrowLeft', 'w-4 h-4')}</button>`
          : `<span class="w-5 h-5 text-[var(--color-primary)] mr-1">${icon('docText', 'w-5 h-5')}</span>`
        }
        <span class="font-semibold text-[var(--color-text)]">${title}</span>
      </div>
      <a href="#/add" class="btn-primary text-sm px-3 py-1.5 gap-1.5">
        ${icon('plus', 'w-4 h-4')}
      </a>
    `;

    el.querySelector('#header-back')?.addEventListener('click', () => {
      window.history.back();
    });
  };

  render();
  store.subscribe('currentPage', render);
  store.subscribe('lang', render);
}
