/**
 * Application entry point.
 * Initializes i18n, theme, loads settings, renders shell components, starts router.
 */

import router from './router.js';
import store from './store.js';
import * as api from './api.js';
import { initI18n, t } from './i18n.js';
import { appConfig } from './app-config.js';
import { renderSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';
import { renderBottomNav } from './components/bottom-nav.js';
import { openModal, closeModal } from './components/modal.js';

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

    // If setup not complete OR no storage path configured, go to setup wizard
    if (!settings.setup_complete || !settings.storage_path) {
      router.init();
      router.navigate('#/setup');
      return;
    }

    // Check if storage folder still exists
    if (settings.storage_path) {
      checkStorageFolder(settings.storage_path);
    }

    // Load expiry count for notification badge
    api.getStats().then(stats => {
      if (stats) store.setState({ expiringCount: stats.expiring_soon });
    }).catch(() => {});

    // Wire global navigation events (from native menu & tray)
    wireGlobalEvents();

    router.init();
  } catch (err) {
    console.error('[app] Init failed:', err);
    wireGlobalEvents();
    router.init();
    router.navigate('#/setup');
  }
}

function wireGlobalEvents() {
  // Tauri emits 'navigate' from menu actions
  if (window.__TAURI__?.event) {
    window.__TAURI__.event.listen('navigate', (event) => {
      const hash = event.payload;
      if (hash) router.navigate(hash);
    });

    window.__TAURI__.event.listen('focus-search', () => {
      if (window.location.hash !== '#/' && window.location.hash !== '') {
        router.navigate('#/');
      }
      // Give the page a moment to render, then focus the search input
      setTimeout(() => {
        document.querySelector('#search-input')?.focus();
      }, 80);
    });

    window.__TAURI__.event.listen('show-about', () => {
      showAboutModal();
    });
  }

  // Also listen via CustomEvent (dispatched by sidebar About button)
  window.addEventListener('show-about', () => showAboutModal());
}

function showAboutModal() {
  openModal({
    title: appConfig.name,
    size: 'lg',
    body: `
      <div class="space-y-4 text-center">
        <div style="display:flex;justify-content:center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" style="width:3.5rem;height:3.5rem;color:var(--color-primary)">
            <path d="M16 2L3 7.5v9.5c0 7.2 5.7 13.6 13 14.9C23.3 30.6 29 24.2 29 17V7.5L16 2z" fill="currentColor"/>
            <path d="M11 11h7l4 4V23H11V11z" fill="white" fill-opacity="0.95"/>
            <path d="M18 11l4 4h-3a1 1 0 0 1-1-1v-3z" fill="currentColor" fill-opacity="0.22"/>
            <rect x="12.5" y="16.5" width="5.5" height="1.3" rx="0.65" fill="currentColor" fill-opacity="0.32"/>
            <rect x="12.5" y="19.2" width="5.5" height="1.3" rx="0.65" fill="currentColor" fill-opacity="0.32"/>
            <rect x="12.5" y="21.8" width="3.5" height="1.3" rx="0.65" fill="currentColor" fill-opacity="0.32"/>
          </svg>
        </div>
        <div>
          <h2 class="text-lg font-bold text-[var(--color-text)]">${appConfig.name}</h2>
          <p class="text-sm text-[var(--color-text-muted)]">Version ${appConfig.version}</p>
        </div>
        ${appConfig.tagline ? `<p class="text-sm text-[var(--color-text-muted)] italic">${appConfig.tagline}</p>` : ''}
        <div class="text-xs text-[var(--color-text-muted)] pt-2 space-y-1 border-t border-[var(--color-border)]">
          <p>${appConfig.tech ?? 'Tauri · Vanilla JS · SQLite'}</p>
          <p>© ${new Date().getFullYear()} DocVault</p>
        </div>
      </div>
    `,
    actions: [{ label: 'Close', variant: 'secondary', onClick: () => closeModal() }],
  });
}

async function checkStorageFolder(storagePath) {
  try {
    const exists = await api.folderExists(storagePath);
    if (!exists) {
      showMissingFolderModal();
    }
  } catch {
    // Non-fatal — ignore check failure
  }
}

function showMissingFolderModal() {
  openModal({
    title: t('app.missingFolder'),
    body: `<p class="text-sm text-[var(--color-text-muted)]">${t('app.missingFolderMsg')}</p>`,
    actions: [
      {
        label: t('app.reconfigure'),
        variant: 'primary',
        onClick: () => {
          closeModal();
          router.navigate('#/settings');
        },
      },
    ],
  });
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
