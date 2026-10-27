import { CONFIG } from '../config.js';
import { getToken, handleUnauthorized } from './token.js';

async function safeFetch(path, { method = 'GET', body, requiresAuth = true } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  const headers = { 'Content-Type': 'application/json' };

  if (requiresAuth) {
    const token = getToken();
    if (!token) {
      handleUnauthorized();
      return { ok: false, error: 'NO_TOKEN', status: 401 };
    }
    headers.Authorization = 'Bearer ' + token;
  }

  try {
    const res = await fetch(CONFIG.API_BASE_URL + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (res.status === 401) {
      handleUnauthorized();
      return { ok: false, error: 'UNAUTHORIZED', status: 401 };
    }
    if (res.status === 403) {
      return { ok: false, error: 'لا تملك صلاحية لتنفيذ هذا الإجراء', status: 403 };
    }
    if (res.status >= 500) {
      return { ok: false, error: 'خطأ في السيرفر، يرجى المحاولة لاحقاً', status: res.status };
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: (data && (data.error || data.message)) || ('خطأ (' + res.status + ')'),
      };
    }
    return { ok: true, data };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { ok: false, error: 'انتهت مهلة الطلب' };
    }
    return { ok: false, error: 'فشل الاتصال بالسيرفر' };
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  login: (password) =>
    safeFetch('/api/admin/login', { method: 'POST', body: { password }, requiresAuth: false }),
  verifyOtp: (session_id, otp_code) =>
    safeFetch('/api/admin/verify-otp', {
      method: 'POST',
      body: { session_id, otp_code },
      requiresAuth: false,
    }),
  getStats: () => safeFetch('/api/admin/stats'),
};
