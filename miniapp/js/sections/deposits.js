import { api } from '../core/api.js';
import { escapeHtml, formatCurrency } from '../core/utils.js';

export async function renderDeposits() {
  const container = document.getElementById('page-deposits');
  if (!container) return;

  container.innerHTML = `
    <h1 style="font-size:20px; font-weight:800; margin-bottom:20px;">الإيداعات</h1>
    <div id="deposits-list">
      <div style="text-align:center; color:var(--text-muted);">جاري التحميل...</div>
    </div>
  `;

  try {
    const res = await api.get('/api/deposits/');
    const items = res.items || [];
    const list = document.getElementById('deposits-list');

    if (items.length === 0) {
      list.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:20px;">لا توجد إيداعات.</div>';
      return;
    }

    list.innerHTML = items.map(d => `
      <div class="list-item" data-id="${d.id}" data-type="deposit">
        <div class="list-item-info">
          <h4>إيداع #${d.id}</h4>
          <span>${escapeHtml(d.reference || 'بدون مرجع')}</span>
        </div>
        <div class="list-item-amount">
          <strong style="color:var(--success);">${formatCurrency(d.amount)}</strong>
          <span class="badge ${d.status === 'approved' ? 'badge-success' : d.status === 'rejected' ? 'badge-danger' : 'badge-pending'}">
            ${d.status === 'approved' ? 'مكتمل' : d.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
          </span>
        </div>
      </div>
    `).join('');

  } catch (err) {
    document.getElementById('deposits-list').innerHTML = `<div style="color:var(--danger); text-align:center;">${err.message}</div>`;
  }
}
