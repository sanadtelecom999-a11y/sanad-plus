export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
