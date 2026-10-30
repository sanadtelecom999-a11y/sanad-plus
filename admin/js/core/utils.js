export function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(value);
    return div.innerHTML;
}

export function formatCurrency(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('ar-SY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n) + ' $';
}

export function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('ar-SY', {
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
    }).format(d);
}

export function safeUrl(url, allowedHosts = null) {
    if (!url) return null;
    try {
        const u = new URL(url, window.location.origin);
        if (!["http:", "https:"].includes(u.protocol)) return null;
        if (allowedHosts && !allowedHosts.some(h => u.hostname.endsWith(h))) return null;
        return u.toString();
    } catch { return null; }
}
