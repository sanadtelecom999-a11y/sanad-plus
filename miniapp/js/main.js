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
import { renderReferral } from './sections/referral.js';

console.log("Main.js loaded successfully.");

registerRoute('home', renderHome);
registerRoute('account', renderAccount);
registerRoute('orders', renderOrders);
registerRoute('deposits', renderDeposits);
registerRoute('charge', renderCharge);
registerRoute('referral', renderReferral);

document.addEventListener('click', (e) => {
  // Bottom Nav
  const navItem = e.target.closest('[data-target]');
  if (navItem) {
    e.preventDefault();
    const target = navItem.getAttribute('data-target');
    if (target) navigateTo(target);
    return;
  }
  
  // Close Modals
  if (e.target.id === 'close-modal' || e.target.id === 'app-modal') {
    document.getElementById('app-modal').classList.remove('active');
  }
  if (e.target.id === 'close-support') {
    closeSupport();
  }

  // Account Actions
  const actionItem = e.target.closest('[data-action]');
  if (actionItem) {
    const action = actionItem.getAttribute('data-action');
    if (action === 'kyc') openKYC();
    if (action === 'ledger') openLedger();
    if (action === 'support') openSupport();
    if (action === 'referral') navigateTo('referral');
    if (action === 'favorites') alert('المفضلة ستتوفر قريباً');
    if (action === 'notifications') alert('الإشعارات ستتوفر قريباً');
    if (action === 'security') alert('الأمان والخصوصية ستتوفر قريباً');
    if (action === 'help') alert('مركز المساعدة سيتوفر قريباً');
    if (action === 'settings') alert('إعدادات الحساب ستتوفر قريباً');
    return;
  }

  // Category Click
  const catItem = e.target.closest('.category-item');
  if (catItem) {
    const id = catItem.getAttribute('data-id');
    const name = catItem.getAttribute('data-name');
    if (id) renderProducts(id, name);
    return;
  }
});

async function initApp() {
  initTelegram();
  
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
    document.getElementById('page-home').innerHTML = `
      <div style="text-align:center; padding:50px 20px; color:white; height:100vh; display:flex; flex-direction:column; justify-content:center;">
        <h2 style="color:#38bdf8;">مرحباً بك</h2>
        <p style="color:#94a3b8; margin-top:10px;">تعذر الاتصال. يرجى إعادة فتح التطبيق من تيليجرام.</p>
        <button onclick="window.location.reload()" style="margin-top:20px; padding:12px 24px; border-radius:8px; background:#38bdf8; color:#000; border:none; font-weight:bold;">إعادة المحاولة</button>
      </div>
    `;
  } finally {
    const loader = document.getElementById('loading');
    if (loader) loader.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', initApp);
