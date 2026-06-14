/**
 * Application entry point.
 * Initializes i18n, theme, loads settings, renders shell components, starts router.
 */

import router from './router.js';
import store from './store.js';
import * as api from './api.js';
import { initI18n, t } from './i18n.js';
import { renderSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';
import { renderBottomNav } from './components/bottom-nav.js';
import { openModal, closeModal } from './components/modal.js';
import { showUntrackedModal } from './components/untracked-modal.js';
import { showDeletedModal } from './components/deleted-modal.js';
import { appConfig } from './app-config.js';

let _footerSuffix = '';

function renderFooter() {
  const text = document.getElementById('version-text');
  if (text) text.textContent = `v${appConfig.version}${_footerSuffix}`;
}

async function init() {
  renderFooter();

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

    // Load expiry count + license status for footer
    api.getStats().then(stats => {
      if (stats) store.setState({ expiringCount: stats.expiring_soon });
    }).catch(() => {});

    _footerSuffix = settings.license_status === 'pro' ? ' · Licensed ❤' : ' · Free';
    renderFooter();

    // Wire global navigation events (from native menu, tray, drag-drop)
    wireGlobalEvents();

    router.init();

    // Check for files added or removed from storage outside the app
    checkUntrackedFiles(false);
    checkMissingFiles();
  } catch (err) {
    console.error('[app] Init failed:', err);
    wireGlobalEvents();
    router.init();
    router.navigate('#/setup');
  }
}

function wireGlobalEvents() {
  if (!window.__TAURI__?.event) return;

  // Native menu / tray navigation
  window.__TAURI__.event.listen('navigate', (event) => {
    const hash = event.payload;
    if (hash) router.navigate(hash);
  });

  window.__TAURI__.event.listen('focus-search', () => {
    if (window.location.hash !== '#/' && window.location.hash !== '') {
      router.navigate('#/');
    }
    setTimeout(() => {
      document.querySelector('#search-input')?.focus();
    }, 80);
  });

  window.__TAURI__.event.listen('show-about', () => {
    router.navigate('#/about');
  });

  // File system watcher: debounced batch notification from Rust
  window.__TAURI__.event.listen('storage-changed', () => {
    checkUntrackedFiles(true);
    checkMissingFiles();
  });

  // ── Global drag-drop handling ────────────────────────────────────────────────
  let _dragOverlay = null;

  function showDragOverlay() {
    if (_dragOverlay || window.location.hash === '#/add') return;
    _dragOverlay = document.createElement('div');
    Object.assign(_dragOverlay.style, {
      position: 'fixed', inset: '0', zIndex: '500', pointerEvents: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(37,99,235,.08)',
      border: '2.5px dashed var(--color-primary)',
    });
    _dragOverlay.innerHTML = `
      <div style="text-align:center;color:var(--color-primary)">
        <i class="fa-solid fa-file-arrow-up" style="font-size:2.75rem;display:block;margin-bottom:.6rem"></i>
        <p style="font-size:.95rem;font-weight:600">Drop to add document</p>
      </div>`;
    document.body.appendChild(_dragOverlay);
  }

  function hideDragOverlay() {
    if (_dragOverlay) { _dragOverlay.remove(); _dragOverlay = null; }
  }

  window.__TAURI__.event.listen('tauri://drag-enter', showDragOverlay);
  window.__TAURI__.event.listen('tauri://drag-leave', hideDragOverlay);

  window.__TAURI__.event.listen('tauri://drag-drop', (event) => {
    hideDragOverlay();
    const paths = event.payload?.paths;
    if (!paths || paths.length === 0) return;
    const path = paths[0];

    if (window.location.hash === '#/add') {
      // Page is already open — dispatch directly to it
      window.dispatchEvent(new CustomEvent('docvault:file-drop', { detail: { path } }));
    } else {
      // Navigate to add page; the page will pick up the path from the store
      store.setState({ pendingDropPath: path });
      router.navigate('#/add');
    }
  });
}

// ── Footer helpers ─────────────────────────────────────────────────────────────

function setFooterScanning(active) {
  const text = document.getElementById('version-text');
  if (!text) return;
  text.textContent = active
    ? `v${appConfig.version} ⟳${_footerSuffix}`
    : `v${appConfig.version}${_footerSuffix}`;
}

// ── Untracked files ────────────────────────────────────────────────────────────

async function checkUntrackedFiles(fromWatcher) {
  setFooterScanning(true);
  try {
    const files = await api.checkUntrackedFiles();
    if (files && files.length > 0) {
      showUntrackedModal(files, { fromWatcher });
    }
  } catch {
    // Non-fatal — storage path may not be set yet
  } finally {
    setFooterScanning(false);
  }
}

async function checkMissingFiles() {
  try {
    const missing = await api.checkMissingFiles();
    if (missing && missing.length > 0) {
      showDeletedModal(missing);
    }
  } catch {
    // Non-fatal
  }
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
