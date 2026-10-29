import { CONFIG } from '../config.js';
import { getToken } from './token.js';

function buildAuthHeaders() {
  const headers = {};
  const initData = window.Telegram?.WebApp?.initData;
  if (initData) {
    headers['X-Telegram-Init-Data'] = initData;
  }
  return headers;
}

async function safeFetch(path, { method = 'GET', body, requiresAuth = false } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  const headers = {
    'Content-Type': 'application/json',
    ...buildAuthHeaders(),
  };

  if (requiresAuth) {
    const token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;
  }

  try {
    const res = await fetch(CONFIG.API_BASE_URL + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (res.status === 401) {
      console.warn('Unauthorized - 401. Reloading for fresh initData...');
      if (!sessionStorage.getItem('retried_auth')) {
        sessionStorage.setItem('retried_auth', '1');
        window.location.reload();
      } else {
        sessionStorage.removeItem('retried_auth');
      }
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function safeFetchFormData(path, formData) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);
  const headers = buildAuthHeaders();

  try {
    const res = await fetch(CONFIG.API_BASE_URL + path, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  safeFetch,
  safeFetchFormData,
  authenticateTelegram: () => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return Promise.resolve(false);
    return safeFetch('/api/auth/telegram', { method: 'POST', body: { initData } });
  },
  fetchUserData: () => safeFetch('/api/miniapp/init', { method: 'POST', body: {} }),
  fetchCategories: () => safeFetch('/api/categories/'),
  fetchProducts: (categoryId) => safeFetch(`/api/products/?category_id=${categoryId}`),
  fetchOrders: () => safeFetch('/api/orders/'),
  createOrder: (payload) => safeFetch('/api/orders/create', { method: 'POST', body: payload }),
  fetchDeposits: () => safeFetch('/api/deposits/'),
  createDeposit: (formData) => safeFetchFormData('/api/deposits/create', formData),
  fetchSupportMessages: () => safeFetch('/api/support/messages'),
  sendSupportMessage: (message) => safeFetch('/api/support/send', { method: 'POST', body: { message } }),
  fetchKycStatus: () => safeFetch('/api/kyc/status'),
  submitKyc: (formData) => safeFetchFormData('/api/kyc/submit', formData),
  fetchLedger: () => safeFetch('/api/ledger'),
};

export const authenticateTelegram = api.authenticateTelegram;
export const fetchUserData = api.fetchUserData;
export const fetchCategories = api.fetchCategories;
