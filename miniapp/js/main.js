// استخدام ?v=60 لإجبار المتصفح على تحميل الملفات الجديدة وعدم استخدام الكاش
import { authenticateTelegram } from './core/api.js?v=60';
import { loadHomeData } from './sections/home.js?v=60';
import { loadChargePage } from './sections/charge.js?v=60';
import { loadOrders } from './sections/orders.js?v=60';
import { loadDeposits } from './sections/deposits.js?v=60';
import { loadAccount } from './sections/account.js?v=60';
import './sections/products.js?v=60'; 

const tg = window.Telegram?.WebApp;
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

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const target = item.getAttribute('data-target');
    window.switchPage(target);
  });
};

// دالة المودال العامة (للإيداعات فقط الآن، الطلبات لها إيصال خاص)
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

window.filterList = function(page, filter, btnElement) {
  if (btnElement) {
    const tabs = btnElement.parentElement.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.classList.remove('active'));
    btnElement.classList.add('active');
  }
  if (page === 'deposits' && typeof window.renderDeposits === 'function') {
    window.renderDeposits(filter);
  }
  if (page === 'orders' && typeof window.renderOrders === 'function') {
    window.renderOrders(filter);
  }
};

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
