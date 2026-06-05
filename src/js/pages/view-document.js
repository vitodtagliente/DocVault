/**
 * view-document.js — deprecated standalone page.
 * Redirects to home with the document pre-selected in the inspector panel.
 */

import store from '../store.js';
import router from '../router.js';

export async function render(_container, id) {
  store.setState({ pendingDocId: id });
  router.navigate('#/');
}
