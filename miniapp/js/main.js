import { initTelegram, getTelegramUser } from './core/telegram.js';
import { api } from './core/api.js';
import { state } from './core/state.js';
import { initRouter, navigateTo, registerRoute } from './core/router.js';

// استيراد دوال الصفحات
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

// تسجيل الصفحات في الموجه
registerRoute('home', renderHome);
registerRoute('account', renderAccount);
registerRoute('orders', renderOrders);
registerRoute('deposits', renderDeposits);
registerRoute('charge', renderCharge);

// مستمع النقر الشامل (Event Delegation)
document.addEventListener('click', (e) => {
  // التنقل السفلي
  const navItem = e.target.closest('.nav-item');
  if (navItem) {
    e.preventDefault();
    const target = navItem.getAttribute('data-target');
    if (target) navigateTo(target);
    return;
  }
  
  // إغلاق المودال
  if (e.target.id === 'close-modal' || e.target.id === 'app-modal') {
    document.getElementById('app-modal').classList.remove('active');
  }

  // إغلاق شاشة الدعم
  if (e.target.id === 'close-support') {
    closeSupport();
  }

  // أزرار حسابي (KYC, Ledger, Support)
  const actionItem = e.target.closest('[data-action]');
  if (actionItem) {
    const action = actionItem.getAttribute('data-action');
    if (action === 'kyc') openKYC();
    if (action === 'ledger') openLedger();
    if (action === 'support') openSupport();
    return;
  }

  // زر الدعم في الرئيسية (إذا وجد)
  if (e.target.closest('.support-btn')) {
    openSupport();
    return;
  }
});

// الاستماع لحدث فتح التصنيف من الرئيسية
window.addEventListener('open-category', (e) => {
  renderProducts(e.detail.id, e.detail.name);
});

async function initApp() {
  initTelegram();
  
  try {
    const userData = await api.post('/api/miniapp/init', {});
    state.setUser(userData);
    initRouter();
  } catch (err) {
    document.getElementById('page-home').innerHTML = `
      <div style="text-align:center; padding:40px 20px; color:var(--danger);">
        <h1>خطأ</h1>
        <p>فشل الاتصال: ${err.message}</p>
      </div>
    `;
  } finally {
    const loader = document.getElementById('loading');
    if (loader) loader.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', initApp);
