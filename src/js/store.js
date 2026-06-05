/**
 * Simple pub/sub state store.
 *
 * Usage:
 *   import store from './store.js';
 *   store.setState({ isLoading: true });
 *   store.subscribe('isLoading', (val) => console.log(val));
 *   const state = store.getState();
 */

const initialState = {
  /** @type {import('./api.js').AppSettings|null} */
  settings: null,
  /** @type {import('./api.js').Document[]} */
  documents: [],
  /** @type {import('./api.js').Category[]} */
  categories: [],
  /** @type {import('./api.js').Tag[]} */
  tags: [],
  searchQuery: '',
  searchFilters: {
    query: '',
    categoryId: '',
    tagIds: [],
    dateFrom: '',
    dateTo: '',
    yearFilter: 0,
    monthFilter: 0,
    favoritesOnly: false,
    expiringOnly: false,
    sortBy: 'date_desc',
    page: 0,
    pageSize: 24,
  },
  /** @type {import('./api.js').SearchResult|null} */
  searchResults: null,
  currentPage: '/',
  /** @type {import('./api.js').DocumentDetail|null} */
  selectedDocument: null,
  isLoading: false,
  isSyncing: false,
  /** @type {Array<{id:string,type:string,message:string}>} */
  toasts: [],
};

let state = { ...initialState };
const listeners = {};

const store = {
  getState() {
    return state;
  },

  setState(partial) {
    const prev = state;
    state = { ...state, ...partial };
    // Notify listeners for changed keys
    for (const key of Object.keys(partial)) {
      if (listeners[key] && state[key] !== prev[key]) {
        for (const fn of listeners[key]) {
          try { fn(state[key], prev[key]); } catch (e) { console.error(e); }
        }
      }
    }
    // Also notify wildcard listeners
    if (listeners['*']) {
      for (const fn of listeners['*']) {
        try { fn(state, prev); } catch (e) { console.error(e); }
      }
    }
  },

  subscribe(key, fn) {
    if (!listeners[key]) listeners[key] = new Set();
    listeners[key].add(fn);
    return () => listeners[key].delete(fn);
  },

  unsubscribe(key, fn) {
    listeners[key]?.delete(fn);
  },
};

export default store;
