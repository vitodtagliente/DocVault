/**
 * Hash-based SPA router.
 *
 * Routes:
 *   #/              → home
 *   #/add           → add-document
 *   #/edit/:id      → edit-document
 *   #/view/:id      → view-document
 *   #/categories    → categories
 *   #/settings      → settings
 *   #/setup         → setup
 *   #/sync          → sync
 *   #/backup        → backup
 *   #/expiring      → expiring
 */

import store from './store.js';

const routes = [
  { pattern: /^#\/$|^$|^#$/, page: 'home' },
  { pattern: /^#\/add$/, page: 'add-document' },
  { pattern: /^#\/edit\/(.+)$/, page: 'edit-document' },
  { pattern: /^#\/view\/(.+)$/, page: 'view-document' },
  { pattern: /^#\/categories$/, page: 'categories' },
  { pattern: /^#\/settings$/, page: 'settings' },
  { pattern: /^#\/setup$/, page: 'setup' },
  { pattern: /^#\/sync$/, page: 'sync' },
  { pattern: /^#\/backup$/, page: 'backup' },
  { pattern: /^#\/expiring$/, page: 'expiring' },
  { pattern: /^#\/notifications$/, page: 'notifications' },
];

let currentCleanup = null;
let beforeNavigateFn = null;

const router = {
  init() {
    window.addEventListener('hashchange', () => this._handle());
    this._handle();
  },

  navigate(hash) {
    if (beforeNavigateFn && !beforeNavigateFn()) return;
    window.location.hash = hash;
  },

  getParam(name) {
    const hash = window.location.hash;
    for (const route of routes) {
      const match = hash.match(route.pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  },

  onBeforeNavigate(fn) {
    beforeNavigateFn = fn;
  },

  clearBeforeNavigate() {
    beforeNavigateFn = null;
  },

  reload() {
    this._handle();
  },

  async _handle() {
    const hash = window.location.hash || '#/';

    let matched = null;
    let params = [];
    for (const route of routes) {
      const match = hash.match(route.pattern);
      if (match) {
        matched = route;
        params = match.slice(1);
        break;
      }
    }

    if (!matched) {
      this.navigate('#/');
      return;
    }

    // Guard: redirect to setup if storage path is not configured yet
    if (matched.page !== 'setup') {
      const settings = store.getState().settings;
      if (!settings?.setup_complete || !settings?.storage_path) {
        window.location.hash = '#/setup';
        return;
      }
    }

    store.setState({ currentPage: matched.page });

    // Show/hide shell elements — setup page gets a blank canvas
    const isSetup = matched.page === 'setup';
    const sidebar   = document.getElementById('sidebar');
    const header    = document.getElementById('header');
    const bottomNav = document.getElementById('bottom-nav');
    if (sidebar)   sidebar.style.display   = isSetup ? 'none' : '';
    if (header)    header.style.display    = isSetup ? 'none' : '';
    if (bottomNav) bottomNav.style.display = isSetup ? 'none' : '';

    // Cleanup previous page
    if (currentCleanup) {
      try { currentCleanup(); } catch (e) { /* ignore */ }
      currentCleanup = null;
    }

    try {
      const module = await import(`./pages/${matched.page}.js`);
      const content = document.getElementById('app-content');
      if (content) {
        currentCleanup = await module.render(content, ...params) ?? null;
      }
    } catch (err) {
      console.error(`[router] Failed to load page: ${matched.page}`, err);
    }
  },
};

export default router;
