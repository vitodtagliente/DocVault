/**
 * Toast notification system.
 *
 * Usage:
 *   import { showToast } from '../components/toast.js';
 *   showToast('Documento salvato!', 'success');
 *   showToast('Errore!', 'error');
 */

let toastId = 0;

/**
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} [type]
 * @param {number} [duration] ms
 */
export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const id = ++toastId;
  const colors = {
    success: 'bg-green-500',
    error:   'bg-red-500',
    warning: 'bg-amber-500',
    info:    'bg-blue-500',
  };

  const toast = document.createElement('div');
  toast.id = `toast-${id}`;
  toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
    text-white text-sm font-medium min-w-[200px] max-w-[320px]
    ${colors[type] || colors.info}
    transition-all duration-300 opacity-0 translate-y-2`;

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `
    <span>${icons[type] || icons.info}</span>
    <span class="flex-1">${message}</span>
    <button class="ml-2 opacity-70 hover:opacity-100 text-lg leading-none" data-dismiss>×</button>
  `;

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('opacity-0', 'translate-y-2');
  });

  const dismiss = () => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  };

  toast.querySelector('[data-dismiss]')?.addEventListener('click', dismiss);

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }
}
