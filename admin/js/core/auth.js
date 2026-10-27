import { api } from './api.js';
import { setToken, clearToken, notifyAuthChanged } from './token.js';

export async function login(password) {
  return api.login(password);
}

export async function verifyOtp(sessionId, otpCode) {
  const result = await api.verifyOtp(sessionId, otpCode);
  if (result.ok) {
    const token = result.data && (result.data.token || result.data.access_token);
    if (token) setToken(token);
  }
  return result;
}

export function logout() {
  clearToken();
  notifyAuthChanged('تم تسجيل الخروج');
}
