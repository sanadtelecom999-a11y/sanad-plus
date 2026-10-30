import { apiFetch, TOKEN_KEY } from './api.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderInbox } from './pages/inbox.js';
import { renderUsers } from './pages/users.js';
import { renderSupport } from './pages/support.js';
import { renderStore } from './pages/store.js';
import { renderBroadcast } from './pages/broadcast.js';
import { renderAudit } from './pages/audit.js';
import { renderSettings } from './pages/settings.js';

// --- الإعدادات العامة والثيم ---
window.showToast = (msg, type = 'success') => {
  const t = document.getElementById('toast');
  t.innerText = msg; t.style.background = type === 'error' ? 'var(--error)' : 'var(--success)';
  t.className = 'show'; setTimeout(() => t.className = '', 3000);
};

window.toggleTheme = () => {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  document.getElementById('theme-icon').setAttribute('data-lucide', next === 'dark' ? 'sun' : 'moon');
  lucide.createIcons();
  if(window.switchPage) window.switchPage(document.querySelector('.nav-item.active').dataset.page); // إعادة رسم الصفحة لتحديث الألوان
};

window.togglePrivacy = () => {
  document.body.classList.toggle('privacy-mode');
  const isPrivacy = document.body.classList.contains('privacy-mode');
  document.getElementById('privacy-icon').setAttribute('data-lucide', isPrivacy ? 'eye-off' : 'eye');
  lucide.createIcons();
  showToast(isPrivacy ? 'تم إخفاء البيانات' : 'تم إظهار البيانات');
};

// --- الإشعارات ---
window.toggleNotifications = (e) => {
  e.stopPropagation();
  const dd = document.getElementById('notif-dropdown');
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
};
document.addEventListener('click', () => {
  const dd = document.getElementById('notif-dropdown');
  if(dd) dd.style.display = 'none';
});

// --- التنقل بين الصفحات ---
window.switchPage = (pageId) => {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${pageId}"]`)?.classList.add('active');
  
  const titles = { dashboard: 'لوحة المعلومات', inbox: 'الواردات', archive: 'الأرشيف', users: 'المستخدمون', support: 'الدعم', store: 'المتجر', broadcast: 'الرسائل الجماعية', audit: 'سجل التدقيق', settings: 'الإعدادات' };
  if (titles[pageId]) document.getElementById('page-title').innerText = titles[pageId];

  const container = document.getElementById('page-content');
  
  // التوجيه لملفات الصفحات
  if (pageId === 'dashboard') renderDashboard(container);
  else if (pageId === 'inbox') renderInbox(container, false);
  else if (pageId === 'archive') renderInbox(container, true);
  else if (pageId === 'users') renderUsers(container);
  else if (pageId === 'support') renderSupport(container);
  else if (pageId === 'store') renderStore(container);
  else if (pageId === 'broadcast') renderBroadcast(container);
  else if (pageId === 'audit') renderAudit(container);
  else if (pageId === 'settings') renderSettings(container);
};

// --- المصادقة ---
let tempSession = null;
window.handleLogin = async () => {
  const p = document.getElementById('login-password').value;
  try {
    const res = await apiFetch('/api/admin/login', { method: 'POST', body: JSON.stringify({ username: document.getElementById('login-username').value || undefined, password: p }) });
    if (res.require_otp) {
      tempSession = res.session_id;
      document.getElementById('login-step-1').style.display = 'none';
      document.getElementById('login-step-2').style.display = 'block';
    }
  } catch (e) {}
};

window.handleVerifyOtp = async () => {
  try {
    const res = await apiFetch('/api/admin/verify-otp', { method: 'POST', body: JSON.stringify({ session_id: tempSession, otp_code: document.getElementById('login-otp').value }) });
    sessionStorage.setItem(TOKEN_KEY, res.token || res.access_token);
    checkAuth();
  } catch (e) {}
};

window.logout = () => { sessionStorage.removeItem(TOKEN_KEY); checkAuth(); };

function checkAuth() {
  if (sessionStorage.getItem(TOKEN_KEY)) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
    window.switchPage('dashboard');
  } else {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
  }
}

// --- التشغيل ---
document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('theme') === 'light') document.documentElement.setAttribute('data-theme', 'light');
  checkAuth();
  document.getElementById('page-date').innerText = new Date().toLocaleDateString('ar-SY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  lucide.createIcons();
});
