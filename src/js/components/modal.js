/**
 * Generic modal component.
 */

import { t } from '../i18n.js';

let activeModal = null;

export function openModal({ title, body, actions = [], onClose, size = 'lg' } = {}) {
  closeModal();

  const container = document.getElementById('modal-container');
  if (!container) return;

  const maxW = size === 'xl' ? 'max-w-2xl' : size === 'lg' ? 'max-w-lg' : 'max-w-md';

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="absolute inset-0 bg-black/50" id="modal-backdrop"></div>
    <div class="relative bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-lg)]
                shadow-xl w-full ${maxW} max-h-[90vh] flex flex-col" role="dialog" aria-modal="true">
      <div class="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
        <h2 class="text-base font-semibold text-[var(--color-text)]">${title || ''}</h2>
        <button id="modal-close" class="btn-ghost p-1 text-lg" aria-label="${t('modal.close')}">${t('modal.close')}</button>
      </div>
      <div class="flex-1 overflow-y-auto px-5 py-4 text-sm text-[var(--color-text)]">
        ${body || ''}
      </div>
      ${actions.length ? `
        <div class="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--color-border)]">
          ${actions.map((a, i) => `
            <button class="btn-${a.variant || 'secondary'}" data-action-idx="${i}">
              ${a.label}
            </button>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;

  container.appendChild(modal);
  activeModal = modal;

  modal.querySelector('#modal-close')?.addEventListener('click', () => {
    if (onClose) onClose();
    closeModal();
  });
  modal.querySelector('#modal-backdrop')?.addEventListener('click', () => {
    if (onClose) onClose();
    closeModal();
  });
  modal.querySelectorAll('[data-action-idx]').forEach((btn) => {
    const idx = parseInt(btn.dataset.actionIdx);
    btn.addEventListener('click', () => actions[idx]?.onClick?.());
  });

  requestAnimationFrame(() => modal.querySelector('button')?.focus());
}

export function closeModal() {
  activeModal?.remove();
  activeModal = null;
}

export function confirm(message, onConfirm, title) {
  openModal({
    title: title || t('modal.confirm'),
    body: `<p>${message}</p>`,
    actions: [
      { label: t('modal.cancel'),  variant: 'secondary', onClick: closeModal },
      { label: t('modal.confirm'), variant: 'primary',   onClick: () => { closeModal(); onConfirm(); } },
    ],
  });
}
