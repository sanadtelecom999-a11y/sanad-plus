import { runtime } from '../config/runtime';
import { token } from './token';

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const jwt = token.get();
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

  const response = await fetch(`${runtime.API_BASE}${path}`, { ...options, headers });
  
  if (response.status === 401) {
    token.clear();
    window.dispatchEvent(new Event('admin:unauthorized'));
    throw new Error('انتهت الجلسة');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || 'حدث خطأ في الخادم');
  return data;
}

export const api = {
  login: (username, password) => request('/api/admin/login', { method: 'POST', body: JSON.stringify({ username: username || undefined, password }) }),
  verifyOtp: (session_id, otp_code) => request('/api/admin/verify-otp', { method: 'POST', body: JSON.stringify({ session_id, otp_code }) }),
  stats: () => request('/api/admin/stats'),
  
  // الإرساليات
  ordersList: () => request('/api/admin/orders'),
  depositsList: () => request('/api/admin/deposits'),
  kycList: () => request('/api/admin/kyc'),
  approve: (type, id) => request(`/api/admin/${type}/${id}/approve`, { method: 'POST' }),
  reject: (type, id) => request(`/api/admin/${type}/${id}/reject`, { method: 'POST' }),
  
  // المستخدمين
  usersList: () => request('/api/admin/users'),
  adjustBalance: (userId, amount, idempotency_key) => request(`/api/admin/users/${userId}/balance`, { method: 'POST', body: JSON.stringify({ amount, idempotency_key }) }),
  banUser: (userId, is_banned) => request(`/api/admin/users/${userId}/ban`, { method: 'POST', body: JSON.stringify({ is_banned }) }),

  // الدعم الفني
  ticketsList: () => request('/api/admin/support/tickets'),
  ticketMessages: (id) => request(`/api/admin/support/tickets/${id}/messages`),
  replyTicket: (id, text) => request(`/api/admin/support/tickets/${id}/reply`, { method: 'POST', body: JSON.stringify({ text }) }),
  closeTicket: (id) => request(`/api/admin/support/tickets/${id}/close`, { method: 'POST' }),

  // المتجر
  productsList: () => request('/api/admin/products'),
  categoriesList: () => request('/api/admin/categories'),
  paymentMethodsList: () => request('/api/admin/payment-methods'),

  // الإعدادات
  settings: () => request('/api/admin/settings'),
  auditLogs: () => request('/api/admin/audit-logs'),
};
