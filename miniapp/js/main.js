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

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor('#050608');
  tg.setBackgroundColor('#050608');
}

// تعريف الدوال عالمياً
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
    console.error("Page Load Error:", e);
  }
};

// دالة المودال العامة
window.showModal = function(type, data) {
  const modal = document.getElementById('app-modal');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  if (!modal) return;

  if (type === 'deposit') {
    title.textContent = `تفاصيل الإيداع #${data.id}`;
    body.innerHTML = `
      <div class="modal-row"><span>المبلغ</span><strong style="color:var(--success);">$${Number(data.amount).toFixed(2)}</strong></div>
      <div class="modal-row"><span>رقم العملية</span><strong>${data.reference || 'غير متوفر'}</strong></div>
      <div class="modal-row"><span>التاريخ</span><strong>${data.date ? new Date(data.date).toLocaleDateString('en-GB') : 'غير متوفر'}</strong></div>
      <div class="modal-row"><span>الحالة</span><strong class="status-badge ${data.status === 'approved' ? 'status-approved' : data.status === 'rejected' ? 'status-rejected' : 'status-pending'}">${data.status === 'approved' ? 'مكتمل' : data.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}</strong></div>
    `;
  }
  modal.classList.add('active');
};

// دالة الفلترة
window.filterList = function(page, filter, btnElement) {
  if (btnElement) {
    const tabs = btnElement.parentElement.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.classList.remove('active'));
    btnElement.classList.add('active');
  }
  if (page === 'deposits' && typeof window.renderDeposits === 'function') window.renderDeposits(filter);
  if (page === 'orders' && typeof window.renderOrders === 'function') window.renderOrders(filter);
};

// ★★★ السحر كله هنا: مستمع النقر الشامل ★★★
document.addEventListener('click', function(e) {
  // 1. أزرار القائمة السفلية
  const navItem = e.target.closest('.nav-item');
  if (navItem) {
    e.preventDefault();
    const target = navItem.getAttribute('data-target');
    if (target) window.switchPage(target);
    return;
  }

  // 2. بطاقات التصنيفات في الرئيسية
  const catItem = e.target.closest('.category-item');
  if (catItem) {
    const id = catItem.getAttribute('data-id');
    const name = catItem.getAttribute('data-name');
    if (id && typeof window.loadProductsByCategory === 'function') {
      window.loadProductsByCategory(id, name);
    }
    return;
  }

  // 3. أزرار حسابي (توثيق، دعم، سجل مالي)
  const actionItem = e.target.closest('[data-action]');
  if (actionItem) {
    const action = actionItem.getAttribute('data-action');
    if (action === 'kyc') window.openKYC();
    if (action === 'support') window.openSupport();
    if (action === 'ledger') window.openLedger();
    return;
  }

  // 4. عناصر قائمة الطلبات والإيداعات
  const listItem = e.target.closest('.list-item');
  if (listItem) {
    const id = listItem.getAttribute('data-id');
    const parentPage = listItem.closest('.page');
    if (parentPage) {
      if (parentPage.id === 'page-orders' && typeof window.openOrderDetails === 'function') window.openOrderDetails(id);
      if (parentPage.id === 'page-deposits' && typeof window.openDepositDetails === 'function') window.openDepositDetails(id);
    }
    return;
  }

  // 5. أزرار المنتجات
  const productItem = e.target.closest('.product-card');
  if (productItem) {
    const id = productItem.getAttribute('data-id');
    if (id && typeof window.openBuyModal === 'function') window.openBuyModal(id);
    return;
  }

  // 6. أزرار التبويبات (فلترة)
  const tabBtn = e.target.closest('.tab-btn');
  if (tabBtn && tabBtn.hasAttribute('data-filter')) {
    const page = tabBtn.getAttribute('data-page');
    const filter = tabBtn.getAttribute('data-filter');
    window.filterList(page, filter, tabBtn);
    return;
  }
});

async function initApp() {
  try {
    await authenticateTelegram();
  } catch (error) {
    console.error("Auth Error:", error);
  } finally {
    const loader = document.getElementById('loading-screen');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 300);
    }
    window.switchPage('home');
  }
}

document.addEventListener('DOMContentLoaded', initApp);
