import { state } from './state.js';

const routes = {
  home: null, products: null, orders: null, deposits: null, account: null, charge: null, referral: null
};

export function registerRoute(pageId, loadFunction) {
  if (routes[pageId] !== undefined) routes[pageId] = loadFunction;
}

export function navigateTo(pageId) {
  if (routes[pageId] === undefined) pageId = 'home';
  
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) targetPage.classList.add('active');
  
  document.querySelectorAll('.sp-nav-item, .sp-nav-charge').forEach(n => n.removeAttribute('aria-current'));
  const activeNav = document.querySelector(`.sp-nav-item[data-target="${pageId}"], .sp-nav-charge[data-target="${pageId}"]`);
  if (activeNav) activeNav.setAttribute('aria-current', 'page');
  
  state.setPage(pageId);
  
  if (routes[pageId]) {
    try { routes[pageId](); } catch (e) { console.error(`Error loading page ${pageId}:`, e); }
  }
  
  window.location.hash = pageId;
}

export function initRouter() {
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash) navigateTo(hash);
  });
  navigateTo(window.location.hash.replace('#', '') || 'home');
}
