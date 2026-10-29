import { api } from '../core/api.js';
import { escapeHtml, formatCurrency, formatDate } from '../core/utils.js';

export async function renderOrders() {
  const container = document.getElementById('page-orders');
  if (!container) return;

  container.innerHTML = `
    <h1 style="font-size:20px; font-weight:800; margin-bottom:20px;">طلباتي</h1>
    <div id="orders-list"><div style="text-align:center; color:var(--sp-text-muted);">جاري التحميل...</div></div>
  `;

  try {
    const res = await api.get('/api/orders/');
    const items = res.items || [];
    const list = document.getElementById('orders-list');

    if (items.length === 0) {
      list.innerHTML = '<div style="text-align:center; color:var(--sp-text-muted); padding:20px;">لا توجد طلبات.</div>';
      return;
    }

    list.innerHTML = items.map(o => `
      <div class="sp-service-row" data-id="${o.id}" data-type="order" style="min-height:auto; padding:16px;">
        <div style="text-align:right;">
          <span class="sp-service-title">${escapeHtml(o.product_name)}</span>
          <span class="sp-service-description">طلب #${escapeHtml(o.order_number)}</span>
        </div>
        <div style="text-align:left;">
          <div style="font-weight:800; color:var(--sp-primary); margin-bottom:4px;">${formatCurrency(o.amount)}</div>
          <span style="font-size:11px; color:${o.status==='completed' ? 'var(--sp-success)' : o.status==='rejected' ? 'var(--sp-danger)' : 'var(--sp-warning)'};">
            ${o.status === 'completed' ? 'مكتمل' : o.status === 'rejected' ? 'مرفوض' : 'قيد التنفيذ'}
          </span>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.sp-service-row').forEach(row => {
      row.addEventListener('click', () => openOrderReceipt(row.getAttribute('data-id')));
    });

  } catch (err) {
    document.getElementById('orders-list').innerHTML = `<div style="color:var(--sp-danger); text-align:center;">${err.message}</div>`;
  }
}

async function openOrderReceipt(orderId) {
  const modal = document.getElementById('app-modal');
  const content = document.getElementById('modal-content');
  modal.classList.add('active');
  content.innerHTML = '<div style="text-align:center; padding:20px;">جاري التحميل...</div>';

  try {
    // للتبسيط، سنستخدم البيانات من القائمة أو نطلب التفاصيل
    // (نفترض هنا أننا سنطلب التفاصيل الكاملة)
    const res = await api.get('/api/orders/'); // في الواقع نحتاج endpoint للطلب الواحد، لكننا سنستخدم البيانات المتاحة
    const order = res.items.find(o => o.id == orderId);
    
    if (!order) throw new Error("الطلب غير موجود");

    content.innerHTML = `
      <div class="sp-receipt">
        <div class="sp-receipt-header">
          <h2 style="margin:0; font-size:20px;">SANAD<span style="color:var(--sp-primary)">+</span></h2>
          <p style="color:var(--sp-text-muted); font-size:12px;">إيصال طلب رقمي</p>
        </div>
        
        <div class="sp-receipt-amount">${formatCurrency(order.amount)}</div>
        
        <div class="sp-receipt-row"><span>رقم الطلب</span><strong>${escapeHtml(order.order_number)}</strong></div>
        <div class="sp-receipt-row"><span>المنتج</span><strong>${escapeHtml(order.product_name)}</strong></div>
        <div class="sp-receipt-row"><span>الكمية</span><strong>${order.quantity}</strong></div>
        <div class="sp-receipt-row"><span>التاريخ</span><strong>${formatDate(order.date)}</strong></div>
        <div class="sp-receipt-row"><span>الحالة</span><strong style="color:${order.status==='completed' ? 'var(--sp-success)' : order.status==='rejected' ? 'var(--sp-danger)' : 'var(--sp-warning)'};">${order.status === 'completed' ? 'مكتمل' : order.status === 'rejected' ? 'مرفوض' : 'قيد التنفيذ'}</strong></div>
        <div class="sp-receipt-row"><span>بيانات الاستلام</span><strong>${escapeHtml(order.delivery_data || '—')}</strong></div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div style="color:var(--sp-danger); text-align:center;">${err.message}</div>`;
  }
}
