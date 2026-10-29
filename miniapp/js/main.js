import { authenticateTelegram } from './core/api.js';
import { loadHomeData } from './sections/home.js';
import { loadChargePage } from './sections/charge.js';
import { loadOrders } from './sections/orders.js';
import { loadDeposits } from './sections/deposits.js';
import { loadAccount } from './sections/account.js';
import './sections/products.js'; 
import { openKYC } from './sections/kyc.js';
import { openSupport } from './sections/support.js';
import { openLedger } from './sections/ledger.js';

console.log("Main.js loaded successfully.");
const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor('#050608'); tg.setBackgroundColor('#050608'); }

window.openKYC = openKYC;
window.openSupport = openSupport;
window.openLedger = openLedger;

window.switchPage = function(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) targetPage.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-target="${pageId}"]`);
  if (activeNav) activeNav.classList.add('active');

  try {
    if (pageId === 'home') loadHomeData();
    else if (pageId === 'charge') loadChargePage();
    else if (pageId === 'orders') loadOrders();
    else if (pageId === 'deposits') loadDeposits();
    else if (pageId === 'account') loadAccount();
  } catch (e) {
    console.error("Error loading page data:", e);
  }
};

document.addEventListener('click', function(e) {
  const backBtn = e.target.closest('.nav-back-btn');
  if (backBtn) { window.switchPage('home'); return; }

  const navItem = e.target.closest('.nav-item');
  if (navItem) { e.preventDefault(); const target = navItem.getAttribute('data-target'); if (target) window.switchPage(target); return; }

  const catItem = e.target.closest('.category-item');
  if (catItem) { const id = catItem.getAttribute('data-id'); const name = catItem.getAttribute('data-name'); if (id && typeof window.loadProductsByCategory === 'function') window.loadProductsByCategory(id, name); return; }

  const actionItem = e.target.closest('[data-action]');
  if (actionItem) { const action = actionItem.getAttribute('data-action'); if (action === 'kyc') window.openKYC(); if (action === 'support') window.openSupport(); if (action === 'ledger') window.openLedger(); return; }

  const listItem = e.target.closest('.list-item');
  if (listItem) { const id = listItem.getAttribute('data-id'); const parentPage = listItem.closest('.page'); if (parentPage) { if (parentPage.id === 'page-orders' && typeof window.openOrderDetails === 'function') window.openOrderDetails(id); if (parentPage.id === 'page-deposits' && typeof window.openDepositDetails === 'function') window.openDepositDetails(id); } return; }

  const productItem = e.target.closest('.product-card');
  if (productItem) { const id = productItem.getAttribute('data-id'); if (id && typeof window.openBuyModal === 'function') window.openBuyModal(id); return; }

  const tabBtn = e.target.closest('.tab-btn');
  if (tabBtn && tabBtn.hasAttribute('data-filter')) { const page = tabBtn.getAttribute('data-page'); const filter = tabBtn.getAttribute('data-filter'); window.filterList(page, filter, tabBtn); return; }
});

async function initApp() {
  try { await authenticateTelegram(); } catch (error) { console.error("Auth Error:", error); } 
  finally {
    const loader = document.getElementById('loading-screen');
    if (loader) { loader.style.opacity = '0'; setTimeout(() => loader.remove(), 300); }
    window.switchPage('home');
  }
}
document.addEventListener('DOMContentLoaded', initApp);
