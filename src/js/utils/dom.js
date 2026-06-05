/**
 * DOM utility helpers.
 */

/** @param {string} selector @returns {Element|null} */
export const $ = (selector) => document.querySelector(selector);

/** @param {string} selector @returns {Element[]} */
export const $$ = (selector) => [...document.querySelectorAll(selector)];

/**
 * Safely set innerHTML (basic XSS guard — do NOT use for user-supplied HTML).
 * For trusted template HTML only.
 */
export const html = (el, content) => {
  if (el) el.innerHTML = content;
};

export const on = (el, event, fn, options) => el?.addEventListener(event, fn, options);
export const off = (el, event, fn) => el?.removeEventListener(event, fn);

/**
 * Creates a DOM element with optional attributes and text content.
 * @param {string} tag
 * @param {Record<string,string>} [attrs]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
export const create = (tag, attrs = {}, text = '') => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else el.setAttribute(k, v);
  }
  if (text) el.textContent = text;
  return el;
};

export const show = (el) => el?.classList.remove('hidden');
export const hide = (el) => el?.classList.add('hidden');
export const toggle = (el) => el?.classList.toggle('hidden');

/** Delegates event to children matching selector. */
export const delegate = (parent, selector, event, fn) => {
  parent?.addEventListener(event, (e) => {
    const target = e.target.closest(selector);
    if (target && parent.contains(target)) fn(e, target);
  });
};
