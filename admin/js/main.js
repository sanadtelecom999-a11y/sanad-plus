import { renderStore } from './sections/store.js';
import { renderUsers } from './sections/users.js';
import { renderInbox } from './sections/inbox.js';
import { renderDashboard } from './sections/dashboard.js';
import { CONFIG } from './config.js';
import { isAuthenticated } from './core/token.js';
import { login, verifyOtp, logout } from './core/auth.js';

const loginState = { sessionId: null };

document.addEventListener('DOMContentLoaded', () => {
  wireLoginForm();
  wireHeader();
  renderAuthState();

  window.addEventListener('auth:changed', (e) => {
    renderAuthState();
    if (e.detail && e.detail.reason) showToast(e.detail.reason, 'info');
  });
});


function handleRoute() {
  if (!isAuthenticated()) return;
  const hash = window.location.hash || '#dashboard';
  if (hash === '#store') {
    renderStore();
  } else if (hash === '#users') {
    renderUsers();
  } else if (hash === '#inbox') {
    renderInbox();
  } else {
    renderDashboard();
  }
}

window.addEventListener('hashchange', handleRoute);

function renderAuthState() {
  const authed = isAuthenticated();
  if (authed) { handleRoute(); }
  document.getElementById('login-screen').style.display = authed ? 'none' : 'flex';
  document.getElementById('app-shell').style.display = authed ? 'flex' : 'none';
  if (!authed) resetLoginForm();
}

function resetLoginForm() {
  loginState.sessionId = null;
  document.getElementById('password-group').style.display = 'block';
  document.getElementById('otp-group').style.display = 'none';
  document.getElementById('login-form').reset();
  document.getElementById('login-error').textContent = '';
  document.getElementById('login-submit').textContent = 'دخول';
}

function wireLoginForm() {
  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'جارٍ...';

    try {
      if (!loginState.sessionId) {
        const password = document.getElementById('password-input').value;
        if (!password) {
          errorEl.textContent = 'كلمة المرور مطلوبة';
          return;
        }
        const res = await login(password);
        if (!res.ok) {
          errorEl.textContent = res.error || 'فشل تسجيل الدخول';
          return;
        }
        loginState.sessionId = res.data.session_id;
        document.getElementById('password-group').style.display = 'none';
        document.getElementById('otp-group').style.display = 'block';
        document.getElementById('otp-input').focus();
      } else {
        const code = document.getElementById('otp-input').value.trim();
        if (!/^\d{4,8}$/.test(code)) {
          errorEl.textContent = 'رمز OTP يجب أن يكون 4-8 أرقام';
          return;
        }
        const res = await verifyOtp(loginState.sessionId, code);
        if (!res.ok) {
          errorEl.textContent = res.error || 'رمز غير صحيح';
          return;
        }
        loginState.sessionId = null;
        resetLoginForm();
        renderAuthState();
        showToast('مرحباً بك 👋', 'success');
        renderDashboard();
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = loginState.sessionId ? 'تحقق' : 'دخول';
    }
  });
}

function wireHeader() {
  const themeBtn = document.getElementById('theme-toggle');
  const logoutBtn = document.getElementById('logout-btn');

  const savedTheme = localStorage.getItem(CONFIG.THEME_KEY) || 'dark';
  document.documentElement.classList.toggle('light', savedTheme === 'light');

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const isLight = document.documentElement.classList.toggle('light');
      localStorage.setItem(CONFIG.THEME_KEY, isLight ? 'light' : 'dark');
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (window.confirm('هل تريد تسجيل الخروج؟')) logout();
    });
  }
}

function showToast(message, type) {
  type = type || 'info';
  const colors = {
    info: 'bg-slate-700',
    success: 'bg-emerald-600',
    error: 'bg-red-600',
  };
  const el = document.createElement('div');
  el.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg text-white shadow-lg z-50 ' + (colors[type] || colors.info);
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
