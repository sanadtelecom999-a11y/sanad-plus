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
  
  if (!tgId) {
    container.innerHTML = `<div class="card" style="color:var(--danger); text-align:center;">يجب فتح التطبيق من تيليجرام.</div>`;
    return;
  }

  container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">جاري التحميل...</div>`;
  
  try {
    const data = await safeFetch(`/api/orders/?telegram_id=${tgId}`);
    allOrders = Array.isArray(data) ? data : [];
    window.filterList('orders', 'all');
  } catch (e) {
    console.error("Orders Fetch Error:", e);
    container.innerHTML = `<div class="card" style="color:var(--danger); text-align:center;">فشل تحميل الطلبات.</div>`;
  }
}


function formatDeliveryData(data) {
  if (!data) return 'غير متوفر';
  try {
    const parsed = JSON.parse(data);
    if (typeof parsed === 'object') {
      return parsed.player_id || parsed.id || Object.values(parsed).join(' - ');
    }
  } catch (e) {
    // ليس JSON، أعد النص كما هو
  }
  return data;
}

window.openOrderDetails = function(id) {
  const o = allOrders.find(x => x.id == id);
  if(!o) return;

  const modal = document.getElementById('app-modal');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');

  let dateStr = 'غير متوفر';
  if (o.date) {
    try {
      const d = new Date(o.date);
      dateStr = d.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' + 
                d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { dateStr = o.date; }
  }

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
      <div class="receipt-row"><span>رقم الطلب:</span><strong style="font-family: monospace;">${o.order_number || o.id}</strong></div>
      <div class="receipt-row"><span>التاريخ:</span><strong style="font-family: monospace;">${dateStr}</strong></div>
      <div class="receipt-row"><span>الحالة:</span><strong style="color: ${statusColor};">${statusText}</strong></div>
      <div class="receipt-divider"></div>
      <div class="receipt-row"><span>المنتج:</span><strong>${o.product_name || 'غير متوفر'}</strong></div>
      <div class="receipt-row"><span>الكمية:</span><strong style="font-family: monospace;">${o.quantity || 1}</strong></div>
      <div class="receipt-row"><span>بيانات الاستلام:</span><strong style="color: var(--primary); font-family: monospace;">${formatDeliveryData(o.delivery_data)}</strong></div>
      <div class="receipt-divider"></div>
      <div class="receipt-total"><span>الإجمالي المدفوع:</span><strong>$${Number(o.amount || 0).toFixed(2)}</strong></div>
      <div class="receipt-footer">شكراً لثقتك بـ SANAD PLUS⁺<br>هذا الإيصال صادر إلكترونياً.</div>
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
  
  // تمت إزالة onclick واستبدالها بـ data-id
  container.innerHTML = filtered.map(o => `
    <div class="list-item" data-id="${o.id}">
      <div class="list-item-info"><h4>${o.product_name || 'طلب'}</h4><span>طلب #${o.order_number || o.id}</span></div>
      <div style="text-align:left;"><div style="font-weight:800; color:var(--primary); margin-bottom:6px;">$${Number(o.amount || 0).toFixed(2)}</div>${getStatusBadge(o.status)}</div>
    </div>
  `).join('');

  // تفويض الأحداث (Event Delegation)
  container.querySelectorAll('.list-item').forEach(el => {
    el.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      if(id) window.openOrderDetails(id);
    });
  });
};
