import { safeFetch } from '../core/api.js';

let allOrders = [];

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
    allOrders = await safeFetch(`/api/orders/?telegram_id=${tgId}`) || [];
    window.filterList('orders', 'all');
  } catch (e) {
    container.innerHTML = `<div class="card" style="color:var(--danger); text-align:center;">فشل تحميل الطلبات.</div>`;
  }
}

window.renderOrders = function(filter) {
  const container = document.getElementById('orders-list');
  let filtered = allOrders;
  if (filter !== 'all') {
    filtered = allOrders.filter(o => {
      const s = (o.status || '').toLowerCase();
      if (filter === 'completed' && ['completed', 'approved', 'مكتمل', 'delivered'].includes(s)) return true;
      if (filter === 'rejected' && ['rejected', 'cancelled', 'مرفوض', 'ملغي'].includes(s)) return true;
      if (filter === 'pending' && !['completed', 'approved', 'rejected', 'cancelled', 'مكتمل', 'مرفوض', 'delivered', 'ملغي'].includes(s)) return true;
      return false;
    });
  }
  if (filtered.length === 0) {
    container.innerHTML = `<div class="card" style="text-align:center; color:var(--text-muted);">لا توجد طلبات في هذا القسم.</div>`;
    return;
  }
  container.innerHTML = filtered.map(o => `
    <div class="list-item" onclick='window.showModal("order", ${JSON.stringify(o)})'>
      <div class="list-item-info"><h4>${o.product_name}</h4><span>طلب #${o.order_number}</span></div>
      <div style="text-align:left;"><div style="font-weight:800; color:var(--primary); margin-bottom:6px;">$${Number(o.amount).toFixed(2)}</div>${getStatusBadge(o.status)}</div>
    </div>
  `).join('');
};
