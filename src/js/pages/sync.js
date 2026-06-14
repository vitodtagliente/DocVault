/**
 * Cloud Sync Guide page.
 * Explains how to sync the DocVault folder with Google Drive, Dropbox, OneDrive, etc.
 */

import { t } from '../i18n.js';
import { icon } from '../utils/icons.js';

export async function render(container) {
  container.innerHTML = `
    <div class="max-w-4xl mx-auto space-y-8 pb-8">
      <div>
        <h1 class="text-xl font-bold text-[var(--color-text)]">${t('cloudSync.title')}</h1>
        <p class="text-sm text-[var(--color-text-muted)] mt-1">${t('cloudSync.subtitle')}</p>
      </div>

      <!-- How it works -->
      <div class="card space-y-3">
        <h2 class="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
          ${icon('info', 'w-4 h-4 text-[var(--color-primary)]')}
          ${t('cloudSync.howItWorks')}
        </h2>
        <p class="text-sm text-[var(--color-text-muted)]">${t('cloudSync.howItWorksDesc')}</p>
        <div class="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <span class="text-blue-500 mt-0.5 flex-shrink-0">${icon('lightbulb', 'w-4 h-4')}</span>
          <p class="text-sm text-blue-700 dark:text-blue-300">${t('cloudSync.tip')}</p>
        </div>
      </div>

      <!-- Google Drive -->
      <div class="card space-y-4">
        <div class="flex items-center gap-3">
          <div style="width:2rem;height:2rem;border-radius:var(--radius-md);background:#4285f4;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg viewBox="0 0 24 24" style="width:1.1rem;height:1.1rem;fill:white"><path d="M4.87 0L9.11 7.5H14.89L10.65 0H4.87ZM0 14.5L2.12 18H9.69L7.57 14.5H0ZM14.31 14.5L16.43 18H21.88L19.76 14.5H14.31ZM9.11 7.5L4.87 15H10.65L14.89 7.5H9.11ZM14.89 7.5L19.13 15H21.88L17.64 7.5H14.89Z"/></svg>
          </div>
          <h2 class="font-semibold text-[var(--color-text)]">Google Drive</h2>
        </div>
        ${stepsList([
          t('cloudSync.gdrive.step1'),
          t('cloudSync.gdrive.step2'),
          t('cloudSync.gdrive.step3'),
          t('cloudSync.gdrive.step4'),
          t('cloudSync.gdrive.step5'),
        ])}
      </div>

      <!-- Dropbox -->
      <div class="card space-y-4">
        <div class="flex items-center gap-3">
          <div style="width:2rem;height:2rem;border-radius:var(--radius-md);background:#0061ff;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg viewBox="0 0 24 24" style="width:1.1rem;height:1.1rem;fill:white"><path d="M6 2L0 6l6 4-6 4 6 4 6-4-6-4 6-4L6 2zm12 0l-6 4 6 4-6 4 6 4 6-4-6-4 6-4-6-4zM6 16l6 4 6-4-6-4-6 4z"/></svg>
          </div>
          <h2 class="font-semibold text-[var(--color-text)]">Dropbox</h2>
        </div>
        ${stepsList([
          t('cloudSync.dropbox.step1'),
          t('cloudSync.dropbox.step2'),
          t('cloudSync.dropbox.step3'),
          t('cloudSync.dropbox.step4'),
        ])}
      </div>

      <!-- OneDrive -->
      <div class="card space-y-4">
        <div class="flex items-center gap-3">
          <div style="width:2rem;height:2rem;border-radius:var(--radius-md);background:#0078d4;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg viewBox="0 0 24 24" style="width:1.1rem;height:1.1rem;fill:white"><path d="M10.2 6.4c.7-2.5 3-4.3 5.6-4.3 2.3 0 4.3 1.3 5.3 3.3C22.8 6 24 7.6 24 9.5c0 2.5-2 4.5-4.5 4.5H5.5C3 14 1 12 1 9.5 1 7.2 2.7 5.3 5 5c.2-2.7 2.4-4.7 5.2-4.7z"/></svg>
          </div>
          <h2 class="font-semibold text-[var(--color-text)]">OneDrive</h2>
        </div>
        ${stepsList([
          t('cloudSync.onedrive.step1'),
          t('cloudSync.onedrive.step2'),
          t('cloudSync.onedrive.step3'),
          t('cloudSync.onedrive.step4'),
        ])}
      </div>

      <!-- Conflict tips -->
      <div class="card space-y-3">
        <h2 class="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
          ${icon('shield', 'w-4 h-4 text-amber-500')}
          ${t('cloudSync.bestPractices')}
        </h2>
        <ul class="space-y-2">
          ${[
            t('cloudSync.bp1'),
            t('cloudSync.bp2'),
            t('cloudSync.bp3'),
            t('cloudSync.bp4'),
          ].map(tip => `
            <li class="flex items-start gap-2 text-sm text-[var(--color-text-muted)]">
              <span class="text-green-500 mt-0.5 flex-shrink-0">${icon('checkCircle', 'w-4 h-4')}</span>
              ${tip}
            </li>
          `).join('')}
        </ul>
      </div>
    </div>
  `;
}

function stepsList(steps) {
  return `
    <ol class="space-y-2">
      ${steps.map((step, i) => `
        <li class="flex items-start gap-3 text-sm text-[var(--color-text-muted)]">
          <span class="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-bold">${i + 1}</span>
          <span class="pt-0.5">${step}</span>
        </li>
      `).join('')}
    </ol>
  `;
}
