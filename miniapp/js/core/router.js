import { state } from './state.js';

const routes = {
  home: { title: 'الرئيسية', loadFn: null }, // سيتم ربطها لاحقاً
  products: { title: 'المنتجات', loadFn: null },
  orders: { title: 'طلباتي', loadFn: null },
  deposits: { title: 'الإيداعات', loadFn: null },
  account: { title: 'حسابي', loadFn: null },
  charge: { title: 'شحن الرصيد', loadFn: null },
};

export function registerRoute(pageId, loadFunction) {
  if (routes[pageId]) {
    routes[pageId].loadFn = loadFunction;
  }
}

export function navigateTo(pageId) {
  if (!routes[pageId]) pageId = 'home';
  
  // إخفاء كل الصفحات
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  
  // إظهار الصفحة المطلوبة
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) targetPage.classList.add('active');
  
  // تحديث الشريط السفلي
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-target="${pageId}"]`);
  if (activeNav) activeNav.classList.add('active');
  
  // تحديث الحالة
  state.setPage(pageId);
  
  // استدعاء دالة تحميل البيانات الخاصة بالصفحة
  const route = routes[pageId];
  if (route.loadFn) {
    try {
      route.loadFn();
    } catch (e) {
      console.error(`Error loading page ${pageId}:`, e);
    }
  }
  
  window.location.hash = pageId;
}

export function initRouter() {
  // التعامل مع زر الرجوع في المتصفح
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash) navigateTo(hash);
  });
  
  // الرابط الافتراضي
  const initialHash = window.location.hash.replace('#', '');
  navigateTo(initialHash || 'home');
}
