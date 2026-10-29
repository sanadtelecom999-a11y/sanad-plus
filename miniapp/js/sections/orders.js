import { api } from '../core/api.js';
import { escapeHtml, formatCurrency, formatDate } from '../core/utils.js';

export async function renderOrders() {
  const container = document.getElementById('page-orders');
  if (!container) return;

  container.innerHTML = `
    <h1 style="font-size:20px; font-weight:800; margin-bottom:20px;">طلباتي</h1>
    <div id="orders-list">
      <div style="text-align:center; color:var(--text-muted);">جاري التحميل...</div>
    </div>
  `;

  try {
    const res = await api.get('/api/orders/');
    const items = res.items || [];
    const list = document.getElementById('orders-list');

    if (items.length === 0) {
      list.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:20px;">لا توجد طلبات.</div>';
      return;
    }

    list.innerHTML = items.map(o => `
      <div class="list-item" data-id="${o.id}" data-type="order">
        <div class="list-item-info">
          <h4>${escapeHtml(o.product_name)}</h4>
          <span>طلب #${escapeHtml(o.order_number)}</span>
        </div>
        <div class="list-item-amount">
          <strong style="color:var(--primary);">${formatCurrency(o.amount)}</strong>
          <span class="badge ${o.status === 'completed' ? 'badge-success' : o.status === 'rejected' ? 'badge-danger' : 'badge-pending'}">
            ${o.status === 'completed' ? 'مكتمل' : o.status === 'rejected' ? 'مرفوض' : 'قيد التنفيذ'}
          </span>
        </div>
      </div>
    `).join('');

  } catch (err) {
    document.getElementById('orders-list').innerHTML = `<div style="color:var(--danger); text-align:center;">${err.message}</div>`;
  }
}
