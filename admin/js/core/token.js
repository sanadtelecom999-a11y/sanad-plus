import { CONFIG } from '../config.js';

export function getToken() {
  return localStorage.getItem(CONFIG.TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(CONFIG.TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(CONFIG.TOKEN_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}

export function notifyAuthChanged(reason) {
  window.dispatchEvent(new CustomEvent('auth:changed', { detail: { reason } }));
}

export function handleUnauthorized(message = 'انتهت الجلسة، يرجى تسجيل الدخول') {
  clearToken();
  window.dispatchEvent(new CustomEvent('auth:changed', { detail: { reason: message } }));
}
