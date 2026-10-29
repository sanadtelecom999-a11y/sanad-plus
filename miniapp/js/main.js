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
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor('#050608');
  tg.setBackgroundColor('#050608');
}

window.openKYC = openKYC;
window.openSupport = openSupport;
window.openLedger = openLedger;

window.switchPage = function(pageId) {
  console.log("Switching to page:", pageId);
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) {
    targetPage.classList.add('active');
  } else {
    console.error("Page not found:", pageId);
  }

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

window.showModal = function(type, data) {
  const modal = document.getElementById('app-modal');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  if (!modal) return console.error("app-modal not found");

  if (type === 'deposit') {
    title.textContent = `تفاصيل الإيداع #${data.id}`;
    let imgHtml = data.receipt_image ? `<div style="text-align:center; margin-top:15px;"><p style="font-size:12px; color:var(--text-muted); margin-bottom:5px;">صورة الإيصال:</p><img src="${data.receipt_image}" style="width:100%; max-height:200px; object-fit:contain; border-radius:8px; background:#000;"></div>` : '';
    
    body.innerHTML = `
      <div class="modal-row"><span>المبلغ</span><strong style="color:var(--success);">$${Number(data.amount).toFixed(2)}</strong></div>
      <div class="modal-row"><span>رقم العملية</span><strong>${data.reference || 'غير متوفر'}</strong></div>
      <div class="modal-row"><span>التاريخ</span><strong>${data.date ? new Date(data.date).toLocaleDateString('en-GB') : 'غير متوفر'}</strong></div>
      <div class="modal-row"><span>الحالة</span><strong class="status-badge ${data.status === 'approved' ? 'status-approved' : data.status === 'rejected' ? 'status-rejected' : 'status-pending'}">${data.status === 'approved' ? 'مكتمل' : data.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}</strong></div>
      ${imgHtml}
    `;
  }
  modal.classList.add('active');
};

window.filterList = function(page, filter, btnElement) {
  if (btnElement) {
    const tabs = btnElement.parentElement.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.classList.remove('active'));
    btnElement.classList.add('active');
  }
  if (page === 'deposits' && typeof window.renderDeposits === 'function') window.renderDeposits(filter);
  if (page === 'orders' && typeof window.renderOrders === 'function') window.renderOrders(filter);
};

// ★★★ مستمع النقر الشامل (يُربط فوراً) ★★★
document.addEventListener('click', function(e) {
  
  // زر الدعم في الهيدر
  const headerSupportBtn = e.target.closest('#header-support-btn');
  if (headerSupportBtn) {
    if (typeof window.openSupport === 'function') window.openSupport();
    return;
  }

  // زر الرجوع
  const backBtn = e.target.closest('.nav-back-btn');
  if (backBtn) {
    window.switchPage('home');
    return;
  }

  // التنقل السفلي
  const navItem = e.target.closest('.nav-item');
  if (navItem) {
    e.preventDefault();
    const target = navItem.getAttribute('data-target');
    if (target) window.switchPage(target);
    return;
  }

  // تصنيفات الرئيسية
  const catItem = e.target.closest('.category-item');
  if (catItem) {
    const id = catItem.getAttribute('data-id');
    const name = catItem.getAttribute('data-name');
    if (id && typeof window.loadProductsByCategory === 'function') {
      window.loadProductsByCategory(id, name);
    }
    return;
  }

  // أزرار حسابي
  const actionItem = e.target.closest('[data-action]');
  if (actionItem) {
    const action = actionItem.getAttribute('data-action');
    if (action === 'kyc' && typeof window.openKYC === 'function') window.openKYC();
    if (action === 'support' && typeof window.openSupport === 'function') window.openSupport();
    if (action === 'ledger' && typeof window.openLedger === 'function') window.openLedger();
    return;
  }

  // الطلبات والإيداعات
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

  // المنتجات
  const productItem = e.target.closest('.product-card');
  if (productItem) {
    const id = productItem.getAttribute('data-id');
    if (id && typeof window.openBuyModal === 'function') window.openBuyModal(id);
    return;
  }

  // تبويبات الفلترة
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

// ضمان التشغيل حتى لو تأخر تحميل الصفحة
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
