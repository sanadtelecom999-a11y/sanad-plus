import { authenticateTelegram } from './core/api.js';
import { loadHomeData } from './sections/home.js';
import { loadChargePage } from './sections/charge.js';
import { loadOrders } from './sections/orders.js';
import { loadDeposits } from './sections/deposits.js';
import { loadAccount } from './sections/account.js';

const tg = window.Telegram?.WebApp;
if (!tg || !tg.initData) {
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('telegram-warning').style.display = 'flex';
}
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor('#050608');
  tg.setBackgroundColor('#050608');
}

window.switchPage = function(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) targetPage.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-target="${pageId}"]`);
  if (activeNav) activeNav.classList.add('active');

  // تحميل البيانات عند تبديل الصفحة
  if (pageId === 'home') loadHomeData();
  else if (pageId === 'charge') loadChargePage();
  else if (pageId === 'orders') loadOrders();
  else if (pageId === 'deposits') loadDeposits();
  else if (pageId === 'account') loadAccount();
};

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const target = item.getAttribute('data-target');
    window.switchPage(target);
  });
});

async function initApp() {
  const loader = document.getElementById('loading-screen');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 300);
  }
  await authenticateTelegram();
  window.switchPage('home');
}

document.addEventListener('DOMContentLoaded', initApp);

window.showModal = function(type, data) {
  const modal = document.getElementById('app-modal');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');

  if (type === 'deposit') {
    title.textContent = `تفاصيل الإيداع #${data.id}`;
    body.innerHTML = `
      <div class="modal-row"><span>المبلغ</span><strong style="color:var(--success);">$${data.amount.toFixed(2)}</strong></div>
      <div class="modal-row"><span>رقم العملية</span><strong>${data.reference || 'غير متوفر'}</strong></div>
      <div class="modal-row"><span>التاريخ</span><strong>${data.date ? new Date(data.date).toLocaleDateString('ar-EG') : 'غير متوفر'}</strong></div>
      <div class="modal-row"><span>الحالة</span><strong class="status-badge ${data.status === 'approved' ? 'status-approved' : data.status === 'rejected' ? 'status-rejected' : 'status-pending'}">${data.status === 'approved' ? 'مكتمل' : data.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}</strong></div>
    `;
  } else {
    title.textContent = `تفاصيل الطلب #${data.order_number}`;
    body.innerHTML = `
      <div class="modal-row"><span>المنتج</span><strong>${data.product_name}</strong></div>
      <div class="modal-row"><span>الإجمالي</span><strong style="color:var(--primary);">$${data.amount.toFixed(2)}</strong></div>
      <div class="modal-row"><span>التاريخ</span><strong>${data.date ? new Date(data.date).toLocaleDateString('ar-EG') : 'غير متوفر'}</strong></div>
      <div class="modal-row"><span>الحالة</span><strong class="status-badge ${data.status === 'completed' ? 'status-approved' : data.status === 'rejected' ? 'status-rejected' : 'status-pending'}">${data.status === 'completed' ? 'مكتمل' : data.status === 'rejected' ? 'مرفوض' : 'قيد التنفيذ'}</strong></div>
    `;
  }
  modal.classList.add('active');
};
