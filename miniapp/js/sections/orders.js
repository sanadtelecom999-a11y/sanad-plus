import { safeFetch } from '../core/api.js';

export async function loadOrders() {
  const container = document.getElementById('orders-list');
  const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

  container.innerHTML = `<div class="card">جاري التحميل...</div>`;

  try {
    const orders = await safeFetch(`/api/orders/?telegram_id=${tgId}`);
    
    if (orders.length === 0) {
      container.innerHTML = `<div class="card" style="text-align:center; color:var(--text-muted);">لا توجد طلبات سابقة.</div>`;
      return;
    }

    container.innerHTML = orders.map(o => `
      <div class="list-item">
        <div class="list-item-info">
          <h4>${o.product_name}</h4>
          <span>طلب #${o.order_number}</span>
        </div>
        <div style="text-align:left;">
          <div style="font-weight:bold; color:var(--primary);">${o.amount.toFixed(2)} $</div>
          <span class="status-badge ${o.status === 'completed' ? 'status-approved' : o.status === 'rejected' ? 'status-rejected' : 'status-pending'}">
            ${o.status === 'completed' ? 'مكتمل' : o.status === 'rejected' ? 'مرفوض' : 'قيد المعالجة'}
          </span>
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = `<div class="card" style="color:var(--danger); text-align:center;">فشل تحميل الطلبات.</div>`;
  }
}
