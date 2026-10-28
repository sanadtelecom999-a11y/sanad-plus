import { authenticateTelegram } from './core/api.js';
import { loadHomeData } from './sections/home.js';
import { loadChargePage } from './sections/charge.js';
import { loadOrders } from './sections/orders.js';
import { loadDeposits } from './sections/deposits.js';
import { loadAccount } from './sections/account.js';

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
