const API_BASE = 'https://sanad-plus-backend.onrender.com';
export const TOKEN_KEY = 'sanad_admin_token';

export async function apiFetch(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (sessionStorage.getItem(TOKEN_KEY)) headers['Authorization'] = `Bearer ${sessionStorage.getItem(TOKEN_KEY)}`;
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    if (res.status === 401) { sessionStorage.removeItem(TOKEN_KEY); window.location.reload(); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطأ في الخادم');
    return data;
  } catch (err) { window.showToast(err.message, 'error'); throw err; }
}
