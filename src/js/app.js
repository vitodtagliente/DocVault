/**
 * Application entry point.
 * Initializes i18n, theme, loads settings, renders shell components, starts router.
 */

import router from './router.js';
import store from './store.js';
import * as api from './api.js';
import { initI18n } from './i18n.js';
import { renderSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';
import { renderBottomNav } from './components/bottom-nav.js';

async function init() {
  try {
    // Load settings
    const settings = await api.getSettings();
    store.setState({ settings });

    // Initialize i18n — empty/missing language triggers auto-detection
    initI18n(settings.language || '');

    // Apply theme
    applyTheme(settings.theme);

    // Load categories and tags into store
    const [categories, tags] = await Promise.all([
      api.listCategories(),
      api.listTags(),
    ]);
    store.setState({ categories, tags });

    // Render shell
    renderSidebar(document.getElementById('sidebar'));
    renderHeader(document.getElementById('header'));
    renderBottomNav(document.getElementById('bottom-nav'));

    // Subscribe to theme changes
    store.subscribe('settings', (s) => {
      if (s) applyTheme(s.theme);
    });

    // Re-render shell and current page when language changes
    store.subscribe('lang', () => {
      renderSidebar(document.getElementById('sidebar'));
      renderHeader(document.getElementById('header'));
      renderBottomNav(document.getElementById('bottom-nav'));
      router.reload();
    });

    // If setup not complete, go to setup wizard
    if (!settings.setup_complete) {
      router.init();
      router.navigate('#/setup');
      return;
    }

    router.init();
  } catch (err) {
    console.error('[app] Init failed:', err);
    // Still start the router — setup page doesn't need pre-loaded settings
    router.init();
    router.navigate('#/setup');
  }
}

function applyTheme(theme) {
  const html = document.documentElement;
  if (theme === 'dark') {
    html.classList.add('dark');
  } else if (theme === 'light') {
    html.classList.remove('dark');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    html.classList.toggle('dark', prefersDark);
  }
}

init();
