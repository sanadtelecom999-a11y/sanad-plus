export function formatMoney(amount, currency = 'ل.س') {
  if (amount == null) return `0.00 ${currency}`;
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return `0 ${currency}`;
  return `${n.toLocaleString('ar-SY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('ar-SY', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}

export function statusMeta(status) {
  const s = String(status || '').toLowerCase();
  const map = {
    pending: { label: 'قيد الانتظار', className: 'bg-warning/20 text-warning' },
    'معلق': { label: 'قيد الانتظار', className: 'bg-warning/20 text-warning' },
    approved: { label: 'مقبول', className: 'bg-success/20 text-success' },
    completed: { label: 'مكتمل', className: 'bg-success/20 text-success' },
    rejected: { label: 'مرفوض', className: 'bg-danger/20 text-danger' }
  };
  return map[s] || { label: s || '—', className: 'bg-muted/20 text-muted' };
}

export function generateIdempotencyKey() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
