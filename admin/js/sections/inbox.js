import { api } from '../core/api.js';
import { escapeHtml, formatCurrency } from '../core/utils.js';

let currentTab = 'orders';

export async function renderInbox() {
  const container = document.getElementById('dashboard-container');
  container.innerHTML = `
    <div class="sanad-tabs">
      <button id="tab-orders" class="sanad-tab active" onclick="window.switchInboxTab('orders')">الطلبات</button>
      <button id="tab-deposits" class="sanad-tab" onclick="window.switchInboxTab('deposits')">الإيداعات</button>
      <button id="tab-kyc" class="sanad-tab" onclick="window.switchInboxTab('kyc')">التوثيق</button>
    </div>
    <div id="inbox-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
      <div style="text-align: center; color: #91a7c2; grid-column: 1/-1; padding: 30px;">جاري التحميل...</div>
    </div>
  `;
  window.switchInboxTab(currentTab);
}

window.switchInboxTab = async function(tab) {
  currentTab = tab;
  document.querySelectorAll('.sanad-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  
  const list = document.getElementById('inbox-list');
  list.innerHTML = `<div style="text-align: center; color: #91a7c2; grid-column: 1/-1; padding: 30px;">جاري جلب البيانات...</div>`;

  const endpoint = tab === 'orders' ? '/api/admin/orders' : tab === 'deposits' ? '/api/admin/deposits' : '/api/admin/kyc';
  const res = await api.safeFetch(endpoint);

  if (!res.ok) {
    list.innerHTML = `<div style="color: #fb7185; text-align: center; grid-column: 1/-1; padding: 30px;">فشل في الجلب: ${res.error}</div>`;
    return;
  }

  const data = res.data || [];
  if (data.length === 0) {
    list.innerHTML = `<div style="color: #91a7c2; text-align: center; grid-column: 1/-1; padding: 30px;">لا توجد عناصر معلقة حالياً.</div>`;
    return;
  }

  list.innerHTML = data.map(item => createCard(tab, item)).join('');
};

function createCard(type, item) {
  let title = '', subtitle = '', body = '';
  if (type === 'orders') {
    title = `طلب #${escapeHtml(item.order_number)}`;
    subtitle = escapeHtml(item.user_name);
    body = `المنتج: ${escapeHtml(item.product_name)} <br> السعر: <span style="color:#34d399; font-weight:bold;">${formatCurrency(item.total_price)}</span>`;
  } else if (type === 'deposits') {
    title = `إيداع #${escapeHtml(item.transaction_id)}`;
    subtitle = escapeHtml(item.user_name);
    body = `المبلغ: <span style="color:#34d399; font-weight:bold;">${formatCurrency(item.amount)}</span>`;
  } else {
    title = `توثيق #${item.id}`;
    subtitle = escapeHtml(item.user_name);
    body = `الاسم: ${escapeHtml(item.full_name)} <br> الهاتف: ${escapeHtml(item.phone)}`;
  }

  return `
    <div class="sanad-card" style="padding: 16px; display: flex; flex-direction: column;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <h4 style="margin:0; font-size:15px;">${title}</h4>
        <span class="sanad-badge badge-warning">معلق</span>
      </div>
      <p style="color:#91a7c2; font-size:13px; margin:0 0 12px 0;">${subtitle}</p>
      <div style="font-size:13px; color:#dce8f6; margin-bottom: 16px; flex:1;">${body}</div>
      <button onclick="window.openDetails('${type}', ${item.id})" class="sanad-btn sanad-btn-secondary" style="width:100%;">عرض التفاصيل</button>
    </div>
  `;
}

window.openDetails = async function(type, id) {
  const modal = document.getElementById('detail-modal');
  const content = document.getElementById('modal-content');
  modal.style.display = 'flex';
  content.innerHTML = `<div style="text-align:center; padding:20px; color:#91a7c2;">جاري التحميل...</div>`;

  const res = await api.safeFetch(`/api/admin/${type}/${id}/full`);
  if (!res.ok) {
    content.innerHTML = `<div style="color:#fb7185; text-align:center; padding:20px;">${res.error}</div>`;
    return;
  }

  const data = res.data;
  let detailsHtml = '';
  if (data.details) {
    detailsHtml = Object.entries(data.details).map(([k, v]) => {
      const isCopyable = ['وجهة الشحن', 'معرف اللاعب', 'رقم الهاتف', 'الهاتف', 'معرف الحساب'].includes(k);
      const copyBtn = isCopyable ? `<button onclick="navigator.clipboard.writeText('${escapeHtml(v)}'); alert('تم النسخ!')" class="sanad-btn sanad-btn-secondary" style="padding:2px 8px; font-size:10px; margin-right:8px;">نسخ</button>` : '';
      return `<div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.05); padding:10px 0;"><span style="color:#91a7c2;">${k}</span><span style="display:flex; align-items:center;">${escapeHtml(v)} ${copyBtn}</span></div>`;
    }).join('');
  }

  let imageHtml = data.image ? `<img src="${escapeHtml(data.image)}" style="width:100%; max-height:250px; object-fit:contain; border-radius:8px; margin-bottom:16px; background:#000;" />` : '';

  content.innerHTML = `
    <h3 style="margin-top:0; font-size:18px;">${escapeHtml(data.title)}</h3>
    ${imageHtml}
    <div style="margin-bottom:24px;">${detailsHtml}</div>
    <div style="display:flex; gap:10px;">
      <button onclick="window.actionItem('${type}', ${id}, 'approve')" class="sanad-btn sanad-btn-success" style="flex:1; padding:10px;">قبول</button>
      <button onclick="window.actionItem('${type}', ${id}, 'reject')" class="sanad-btn sanad-btn-danger" style="flex:1; padding:10px;">رفض</button>
    </div>
  `;
};

window.actionItem = async function(type, id, action) {
  if (!confirm(`هل أنت متأكد من ${action === 'approve' ? 'قبول' : 'رفض'} هذا العنصر؟`)) return;
  const content = document.getElementById('modal-content');
  content.innerHTML = `<div style="text-align:center; padding:20px; color:#91a7c2;">جاري التنفيذ...</div>`;
  const res = await api.safeFetch(`/api/admin/${type}/${id}/${action}`, { method: 'POST' });
  if (res.ok) {
    window.closeModal();
    window.switchInboxTab(currentTab);
    alert('تمت العملية بنجاح');
  } else {
    content.innerHTML = `<div style="color:#fb7185; text-align:center; padding:20px;">${res.error}</div>`;
  }
};
