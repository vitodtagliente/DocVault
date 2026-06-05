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

    store.setState({ currentPage: matched.page });

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
