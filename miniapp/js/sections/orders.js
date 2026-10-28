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

window.openOrderDetails = function(id) {
  const o = allOrders.find(x => x.id == id);
  if(!o) return;

  const modal = document.getElementById('app-modal');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');

  // تنسيق التاريخ بالإنجليزية (أرقام 1,2,3)
  let dateStr = 'غير متوفر';
  if (o.date) {
    const d = new Date(o.date);
    dateStr = d.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' + 
              d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  // ترتيب حالة الطلب
  let statusText = 'قيد التنفيذ';
  let statusColor = 'var(--warning)';
  const s = (o.status || '').toLowerCase();
  if (['completed', 'approved', 'مكتمل'].includes(s)) { statusText = 'مكتمل'; statusColor = 'var(--success)'; }
  if (['rejected', 'cancelled', 'مرفوض'].includes(s)) { statusText = 'مرفوض'; statusColor = 'var(--danger)'; }

  title.textContent = 'إيصال شراء';
  body.innerHTML = `
    <div class="receipt-container">
      <div class="receipt-header">
        <h2>SANAD<span style="color:var(--primary)">+</span></h2>
        <p>إيصال عملية رقمي</p>
      </div>

      <div class="receipt-row">
        <span>رقم الطلب:</span>
        <strong style="font-family: monospace;">${o.order_number}</strong>
      </div>
      <div class="receipt-row">
        <span>التاريخ:</span>
        <strong style="font-family: monospace;">${dateStr}</strong>
      </div>
      <div class="receipt-row">
        <span>الحالة:</span>
        <strong style="color: ${statusColor};">${statusText}</strong>
      </div>

      <div class="receipt-divider"></div>

      <div class="receipt-row">
        <span>المنتج:</span>
        <strong>${o.product_name}</strong>
      </div>
      <div class="receipt-row">
        <span>الكمية:</span>
        <strong style="font-family: monospace;">${o.quantity || 1}</strong>
      </div>
      <div class="receipt-row">
        <span>بيانات الاستلام (ID):</span>
        <strong style="color: var(--primary); font-family: monospace;">${o.delivery_data || 'غير متوفر'}</strong>
      </div>

      <div class="receipt-divider"></div>

      <div class="receipt-total">
        <span>الإجمالي المدفوع:</span>
        <strong>$${Number(o.amount).toFixed(2)}</strong>
      </div>

      <div class="receipt-footer">
        شكراً لثقتك بـ SANAD PLUS⁺<br>
        هذا الإيصال صادر إلكترونياً ولا يحتاج إلى ختم.
      </div>
    </div>
  `;
  
  modal.classList.add('active');
};

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
    <div class="list-item" onclick="window.openOrderDetails(${o.id})">
      <div class="list-item-info"><h4>${o.product_name}</h4><span>طلب #${o.order_number}</span></div>
      <div style="text-align:left;"><div style="font-weight:800; color:var(--primary); margin-bottom:6px;">$${Number(o.amount).toFixed(2)}</div>${getStatusBadge(o.status)}</div>
    </div>
  `).join('');
};
