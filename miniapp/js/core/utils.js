// دالة آمنة لمنع هجمات XSS
export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// التحقق من الروابط لمنع URL Injection
export function safeUrl(url, allowedHosts = null) {
  if (!url) return null;
  try {
    const u = new URL(url, window.location.origin);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    if (allowedHosts && !allowedHosts.some(h => u.hostname.endsWith(h))) return null;
    return u.toString();
  } catch { return null; }
}

// تنسيق العملة
export function formatCurrency(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('ar-SY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' $';
}

// تنسيق التاريخ (أرقام إنجليزية)
export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' }) + ' ' + 
         d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
