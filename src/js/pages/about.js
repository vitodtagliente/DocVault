/**
 * About page.
 */

import { appConfig } from '../app-config.js';
import { t } from '../i18n.js';

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" style="width:100%;height:100%">
  <path d="M16 2L3 7.5v9.5c0 7.2 5.7 13.6 13 14.9C23.3 30.6 29 24.2 29 17V7.5L16 2z" fill="currentColor"/>
  <path d="M11 11h7l4 4V23H11V11z" fill="white" fill-opacity="0.95"/>
  <path d="M18 11l4 4h-3a1 1 0 0 1-1-1v-3z" fill="currentColor" fill-opacity="0.22"/>
  <rect x="12.5" y="16.5" width="5.5" height="1.3" rx="0.65" fill="currentColor" fill-opacity="0.32"/>
  <rect x="12.5" y="19.2" width="5.5" height="1.3" rx="0.65" fill="currentColor" fill-opacity="0.32"/>
  <rect x="12.5" y="21.8" width="3.5" height="1.3" rx="0.65" fill="currentColor" fill-opacity="0.32"/>
</svg>`;

function openUrl(url) {
  if (window.__TAURI__?.opener) {
    window.__TAURI__.opener.openUrl(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export async function render(container) {
  container.innerHTML = `
    <div class="max-w-sm mx-auto flex flex-col items-center pt-12 pb-16">

      <!-- Logo + name -->
      <div class="flex flex-col items-center gap-4">
        <div style="width:4.5rem;height:4.5rem;color:var(--color-primary)">${LOGO_SVG}</div>
        <div class="text-center">
          <h1 class="text-2xl font-bold text-[var(--color-text)]">${appConfig.name}</h1>
          <p class="text-sm mt-1" style="color:var(--color-text-muted)">${appConfig.tagline ?? ''}</p>
        </div>
      </div>

      <!-- Info card — full-bleed dividers, explicit margin top/bottom -->
      <div class="w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)]"
           style="background:var(--color-surface);margin-top:2.5rem;margin-bottom:2rem">
        <div class="flex items-center justify-between px-5 py-5">
          <span class="text-sm" style="color:var(--color-text-muted)">${t('about.version')}</span>
          <span class="text-sm font-semibold" style="color:var(--color-text)">${appConfig.version}</span>
        </div>
        <div class="flex items-center justify-between px-5 py-5 border-t border-[var(--color-border)]">
          <span class="text-sm" style="color:var(--color-text-muted)">${t('about.platform')}</span>
          <span class="text-sm" style="color:var(--color-text)">Windows · macOS · Linux</span>
        </div>
        <div class="flex items-center justify-between px-5 py-5 border-t border-[var(--color-border)]">
          <span class="text-sm" style="color:var(--color-text-muted)">GitHub</span>
          <button id="github-link"
                  class="text-sm font-medium flex items-center gap-1.5"
                  style="color:var(--color-primary)">
            <i class="fa-brands fa-github"></i>
            github.com/vitodtagliente/docvault
          </button>
        </div>
      </div>

      <p class="text-xs" style="color:var(--color-text-muted)">
        © ${new Date().getFullYear()} DocVault. All rights reserved.
      </p>
    </div>
  `;

  container.querySelector('#github-link').addEventListener('click', () => {
    openUrl('https://github.com/vitodtagliente/docvault');
  });
}
