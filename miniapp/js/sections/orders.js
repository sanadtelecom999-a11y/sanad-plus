import { safeFetch } from '../core/api.js';

function getStatusBadge(status) {
  const s = (status || '').toLowerCase();
  if (['completed', 'approved', 'مكتمل', 'delivered'].includes(s)) return '<span class="status-badge status-approved">مكتمل</span>';
  if (['rejected', 'cancelled', 'مرفوض', 'ملغي'].includes(s)) return '<span class="status-badge status-rejected">مرفوض</span>';
  return '<span class="status-badge status-pending">قيد التنفيذ</span>';
}

export async function loadOrders() {
  const container = document.getElementById('orders-list');
  const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

  container.innerHTML = `<div style="text-align:center; padding:20px;">جاري التحميل...</div>`;

  try {
    const orders = await safeFetch(`/api/orders/?telegram_id=${tgId}`);
    
    if (!orders || orders.length === 0) {
      container.innerHTML = `<div class="card" style="text-align:center; color:var(--text-muted);">لا توجد طلبات سابقة.</div>`;
      return;
    }

    container.innerHTML = orders.map(o => `
      <div class="list-item" onclick='window.showModal("order", ${JSON.stringify(o)})'>
        <div class="list-item-info">
          <h4>${o.product_name}</h4>
          <span>طلب #${o.order_number}</span>
        </div>
        <div style="text-align:left;">
          <div style="font-weight:800; color:var(--primary); margin-bottom:6px;">$${Number(o.amount).toFixed(2)}</div>
          ${getStatusBadge(o.status)}
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = `<div class="card" style="color:var(--danger); text-align:center;">فشل تحميل الطلبات.</div>`;
  }
}
