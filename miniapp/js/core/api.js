import { getInitData } from './telegram.js';

const API_BASE = 'https://sanad-plus-backend.onrender.com';

async function request(path, options = {}) {
  const initData = getInitData();
  const headers = { ...options.headers };
  
  if (initData) {
    headers['X-Telegram-Init-Data'] = initData;
  }

  // لا نضع Content-Type إذا كنا نرفع ملف (FormData)
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    
    if (res.status === 401) {
      console.warn('Unauthorized (401) - Reloading for fresh initData');
      if (!sessionStorage.getItem('retried_auth')) {
        sessionStorage.setItem('retried_auth', '1');
        window.location.reload();
      }
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `خطأ ${res.status}`);
    return data;
  } catch (err) {
    console.error(`API Error (${path}):`, err);
    throw err;
  }
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  postForm: (path, formData) => request(path, { method: 'POST', body: formData }),
};
