/**
 * OCR Setup guide — explains how to install Tesseract on each platform.
 */

import { t } from '../i18n.js';

export async function render(container) {
  container.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-6 pb-8">

      <div>
        <h1 class="text-xl font-bold text-[var(--color-text)]">${t('ocr.title')}</h1>
        <p class="text-sm text-[var(--color-text-muted)] mt-1">${t('ocr.subtitle')}</p>
      </div>

      <!-- How it works -->
      <div class="card space-y-3">
        <p class="text-sm text-[var(--color-text-muted)]">${t('ocr.howItWorksDesc')}</p>
        <div class="flex items-start gap-2.5 p-3 rounded-[var(--radius-md)] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <i class="fa-solid fa-triangle-exclamation text-amber-500 mt-0.5 flex-shrink-0" style="font-size:.875rem"></i>
          <p class="text-sm text-amber-700 dark:text-amber-300">${t('ocr.tip')}</p>
        </div>
      </div>

      <!-- Platform cards -->
      <div class="grid gap-4 md:grid-cols-3">
        ${platformCard(
          'fa-brands fa-windows', '#0078d4',
          'Windows',
          [t('ocr.win.step1'), t('ocr.win.step2'), t('ocr.win.step3'), t('ocr.win.step4'), t('ocr.win.step5')]
        )}
        ${platformCard(
          'fa-brands fa-apple', '#555',
          'macOS',
          [t('ocr.mac.step1'), t('ocr.mac.step2'), t('ocr.mac.step3'), t('ocr.mac.step4')]
        )}
        ${platformCard(
          'fa-brands fa-linux', '#333',
          'Linux',
          [t('ocr.linux.step1'), t('ocr.linux.step2'), t('ocr.linux.step3'), t('ocr.linux.step4')]
        )}
      </div>

      <!-- Tips -->
      <div class="card space-y-3">
        <h2 class="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
          <i class="fa-solid fa-circle-check" style="font-size:.875rem;color:var(--color-primary)"></i>
          ${t('ocr.bestPractices')}
        </h2>
        <ul class="space-y-3">
          ${[t('ocr.bp1'), t('ocr.bp2'), t('ocr.bp3'), t('ocr.bp4')].map(tip => `
            <li class="flex items-start gap-3 text-sm text-[var(--color-text-muted)]" style="line-height:1.55">
              <i class="fa-solid fa-check flex-shrink-0" style="font-size:.875rem;color:#16a34a;margin-top:.2rem"></i>
              <span>${tip}</span>
            </li>
          `).join('')}
        </ul>
      </div>

    </div>
  `;
}

function platformCard(faClass, color, name, steps) {
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
