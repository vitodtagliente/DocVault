/**
 * Returns a debounced version of fn that delays execution by `wait` ms.
 * @param {Function} fn
 * @param {number} wait
 */
export function debounce(fn, wait = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
