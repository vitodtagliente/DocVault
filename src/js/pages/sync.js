/**
 * Cloud Sync Guide — explains how to use Google Drive, Dropbox, or OneDrive
 * to keep the DocVault storage folder synced across machines.
 */

import { t } from '../i18n.js';

export async function render(container) {
  container.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-6 pb-8">

      <div>
        <h1 class="text-xl font-bold text-[var(--color-text)]">${t('cloudSync.title')}</h1>
        <p class="text-sm text-[var(--color-text-muted)] mt-1">${t('cloudSync.subtitle')}</p>
      </div>

      <!-- How it works -->
      <div class="card space-y-3">
        <p class="text-sm text-[var(--color-text-muted)]">${t('cloudSync.howItWorksDesc')}</p>
        <div class="flex items-start gap-2.5 p-3 rounded-[var(--radius-md)] bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <i class="fa-solid fa-circle-info text-blue-500 mt-0.5 flex-shrink-0" style="font-size:0.875rem"></i>
          <p class="text-sm text-blue-700 dark:text-blue-300">${t('cloudSync.tip')}</p>
        </div>
      </div>

      <!-- Provider cards -->
      <div class="grid gap-4 md:grid-cols-3">
        ${providerCard(
          'fa-brands fa-google', '#4285f4',
          'Google Drive',
          [
            t('cloudSync.gdrive.step1'),
            t('cloudSync.gdrive.step2'),
            t('cloudSync.gdrive.step3'),
            t('cloudSync.gdrive.step4'),
            t('cloudSync.gdrive.step5'),
          ]
        )}
        ${providerCard(
          'fa-brands fa-dropbox', '#0061ff',
          'Dropbox',
          [
            t('cloudSync.dropbox.step1'),
            t('cloudSync.dropbox.step2'),
            t('cloudSync.dropbox.step3'),
            t('cloudSync.dropbox.step4'),
          ]
        )}
        ${providerCard(
          'fa-brands fa-microsoft', '#0078d4',
          'OneDrive',
          [
            t('cloudSync.onedrive.step1'),
            t('cloudSync.onedrive.step2'),
            t('cloudSync.onedrive.step3'),
            t('cloudSync.onedrive.step4'),
          ]
        )}
      </div>

      <!-- Best practices -->
      <div class="card space-y-3">
        <h2 class="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
          <i class="fa-solid fa-shield-halved" style="font-size:0.875rem;color:var(--color-primary)"></i>
          ${t('cloudSync.bestPractices')}
        </h2>
        <ul class="space-y-3">
          ${[t('cloudSync.bp1'), t('cloudSync.bp2'), t('cloudSync.bp3'), t('cloudSync.bp4')].map(tip => `
            <li class="flex items-start gap-3 text-sm text-[var(--color-text-muted)]" style="line-height:1.55">
              <i class="fa-solid fa-circle-check flex-shrink-0" style="font-size:0.875rem;color:#16a34a;margin-top:.2rem"></i>
              <span>${tip}</span>
            </li>
          `).join('')}
        </ul>
      </div>

    </div>
  `;
}

function providerCard(faClass, color, name, steps) {
  return `
    <div class="card flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <span style="width:2.25rem;height:2.25rem;border-radius:var(--radius-md);
                     background:${color};display:flex;align-items:center;
                     justify-content:center;flex-shrink:0">
          <i class="${faClass}" style="font-size:1.1rem;color:white"></i>
        </span>
        <span class="font-semibold text-[var(--color-text)]">${name}</span>
      </div>
      <ol class="space-y-4 flex-1">
        ${steps.map((step, i) => `
          <li class="flex items-start gap-3 text-sm text-[var(--color-text-muted)]" style="line-height:1.55">
            <span style="flex-shrink:0;width:1.375rem;height:1.375rem;border-radius:50%;
                         background:var(--color-primary);color:white;margin-top:.1rem;
                         display:flex;align-items:center;justify-content:center;
                         font-size:.65rem;font-weight:700;line-height:1">${i + 1}</span>
            <span>${step}</span>
          </li>
        `).join('')}
      </ol>
    </div>
  `;
}
