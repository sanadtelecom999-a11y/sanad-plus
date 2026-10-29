import { initTelegram, getInitData } from './core/telegram.js';
import { api } from './core/api.js';
import { state } from './core/state.js';
import { initRouter, navigateTo, registerRoute } from './core/router.js';

import { renderHome } from './sections/home.js';
import { renderAccount } from './sections/account.js';
import { renderOrders } from './sections/orders.js';
import { renderDeposits } from './sections/deposits.js';
import { renderCharge } from './sections/charge.js';
import { renderProducts } from './sections/products.js';
import { openKYC } from './sections/kyc.js';
import { openLedger } from './sections/ledger.js';
import { openSupport, closeSupport } from './sections/support.js';

console.log("Main.js loaded successfully.");

registerRoute('home', renderHome);
registerRoute('account', renderAccount);
registerRoute('orders', renderOrders);
registerRoute('deposits', renderDeposits);
registerRoute('charge', renderCharge);

document.addEventListener('click', (e) => {
  const navItem = e.target.closest('.nav-item');
  if (navItem) {
    e.preventDefault();
    const target = navItem.getAttribute('data-target');
    if (target) navigateTo(target);
    return;
  }
  
  if (e.target.id === 'close-modal' || e.target.id === 'app-modal') {
    document.getElementById('app-modal').classList.remove('active');
  }

  if (e.target.id === 'close-support') {
    closeSupport();
  }

  const actionItem = e.target.closest('[data-action]');
  if (actionItem) {
    const action = actionItem.getAttribute('data-action');
    if (action === 'kyc') openKYC();
    if (action === 'ledger') openLedger();
    if (action === 'support') openSupport();
    return;
  }

  if (e.target.closest('.support-btn')) {
    openSupport();
    return;
  }
});

window.addEventListener('open-category', (e) => {
  renderProducts(e.detail.id, e.detail.name);
});

async function initApp() {
  initTelegram();
  
  // انتظار حتى يجهز initData (حتى 2 ثانية)
  let initData = '';
  for (let i = 0; i < 20; i++) {
    initData = getInitData();
    if (initData) break;
    await new Promise(r => setTimeout(r, 100));
  }

  try {
    const userData = await api.post('/api/miniapp/init', {});
    state.setUser(userData);
    initRouter();
  } catch (err) {
    console.warn("Init failed:", err.message);
    // إظهار شاشة خطأ أنيقة بدلاً من الخطأ الأحمر أو SN-000
    document.getElementById('app').innerHTML = `
      <div style="text-align:center; padding:50px 20px; color:white; height:100vh; display:flex; flex-direction:column; justify-content:center;">
        <h2 style="color:#38bdf8;">مرحباً بك</h2>
        <p style="color:#94a3b8; margin-top:10px;">${err.message}</p>
        <button onclick="window.location.reload()" style="margin-top:20px; padding:12px 24px; border-radius:8px; background:#38bdf8; color:#000; border:none; font-weight:bold; font-family:inherit;">إعادة المحاولة</button>
      </div>
    `;
  } finally {
    const loader = document.getElementById('loading');
    if (loader) loader.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', initApp);
