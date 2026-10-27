import { api } from '../core/api.js';
import { escapeHtml, formatCurrency } from '../core/utils.js';

let currentTab = 'orders';

export async function renderInbox() {
  const container = document.getElementById('dashboard-container');
  
  container.innerHTML = `
    <div class="mb-6 flex gap-2 border-b border-white/10 pb-4">
      <button id="tab-orders" class="px-4 py-2 rounded-lg bg-primary text-slate-900 font-bold">الطلبات</button>
      <button id="tab-deposits" class="px-4 py-2 rounded-lg bg-slate-700 text-white">الإيداعات</button>
      <button id="tab-kyc" class="px-4 py-2 rounded-lg bg-slate-700 text-white">التوثيق</button>
    </div>
    <div id="inbox-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="text-center text-slate-400 mt-10 col-span-full">جاري التحميل...</div>
    </div>
  `;

  document.getElementById('tab-orders').onclick = () => switchTab('orders');
  document.getElementById('tab-deposits').onclick = () => switchTab('deposits');
  document.getElementById('tab-kyc').onclick = () => switchTab('kyc');

  switchTab(currentTab);
}

async function switchTab(tab) {
  currentTab = tab;
  updateTabStyles();
  const list = document.getElementById('inbox-list');
  list.innerHTML = `<div class="text-center text-slate-400 mt-10 col-span-full">جاري جلب البيانات...</div>`;

  const endpoint = tab === 'orders' ? '/api/admin/orders' : tab === 'deposits' ? '/api/admin/deposits' : '/api/admin/kyc';
  const res = await api.safeFetch(endpoint);

  if (!res.ok) {
    list.innerHTML = `<div class="text-red-400 mt-10 col-span-full text-center">فشل في الجلب: ${res.error}</div>`;
    return;
  }

  const data = res.data || [];
  if (data.length === 0) {
    list.innerHTML = `<div class="text-slate-400 mt-10 col-span-full text-center">لا توجد عناصر معلقة حالياً.</div>`;
    return;
  }

  list.innerHTML = data.map(item => createCard(tab, item)).join('');
}

function updateTabStyles() {
  ['orders', 'deposits', 'kyc'].forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    if (t === currentTab) {
      btn.className = 'px-4 py-2 rounded-lg bg-primary text-slate-900 font-bold';
    } else {
      btn.className = 'px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600';
    }
  });
}

function createCard(type, item) {
  let title = '', subtitle = '', body = '';
  
  if (type === 'orders') {
    title = `طلب #${escapeHtml(item.order_number)}`;
    subtitle = escapeHtml(item.user_name);
    body = `المنتج: ${escapeHtml(item.product_name)} <br> السعر: <span class="text-success font-bold">${formatCurrency(item.total_price)}</span>`;
  } else if (type === 'deposits') {
    title = `إيداع #${escapeHtml(item.transaction_id)}`;
    subtitle = escapeHtml(item.user_name);
    body = `المبلغ: <span class="text-success font-bold">${formatCurrency(item.amount)}</span>`;
  } else {
    title = `توثيق #${item.id}`;
    subtitle = escapeHtml(item.user_name);
    body = `الاسم: ${escapeHtml(item.full_name)} <br> الهاتف: ${escapeHtml(item.phone)}`;
  }

  return `
    <div class="glass rounded-xl p-5 border border-white/10 flex flex-col justify-between">
      <div>
        <div class="flex justify-between items-start mb-2">
          <h4 class="font-bold text-lg">${title}</h4>
          <span class="bg-primary/20 text-primary text-xs px-2 py-1 rounded">معلق</span>
        </div>
        <p class="text-slate-400 text-sm mb-3">${subtitle}</p>
        <div class="text-sm text-slate-300 mb-4">${body}</div>
      </div>
      <button onclick="window.openDetails('${type}', ${item.id})" class="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition">عرض التفاصيل</button>
    </div>
  `;
}

// دالة عرض التفاصيل (Modal)
window.openDetails = async function(type, id) {
  const modal = document.getElementById('detail-modal');
  const content = document.getElementById('modal-content');
  
  modal.style.display = 'flex';
  content.innerHTML = `<div class="text-center py-10"><div class="spinner mb-2"></div> جاري التحميل...</div>`;

  const res = await api.safeFetch(`/api/admin/${type}/${id}/full`);
  
  if (!res.ok) {
    content.innerHTML = `<div class="text-red-400 text-center py-10">${res.error}</div>`;
    return;
  }

  const data = res.data;
  let detailsHtml = '';
  if (data.details) {
    detailsHtml = Object.entries(data.details).map(([k, v]) => `<div class="flex justify-between border-b border-white/5 py-2"><span class="text-slate-400">${k}</span><span>${escapeHtml(v)}</span></div>`).join('');
  }

  let imageHtml = '';
  if (data.image) {
    imageHtml = `<img src="${escapeHtml(data.image)}" class="w-full max-h-64 object-contain rounded-lg my-4 bg-black/50" alt="مرفق" />`;
  }

  content.innerHTML = `
    <h3 class="text-xl font-bold mb-4">${escapeHtml(data.title)}</h3>
    ${imageHtml}
    <div class="mb-6">${detailsHtml}</div>
    <div class="flex gap-4">
      <button onclick="window.actionItem('${type}', ${id}, 'approve')" class="flex-1 py-3 bg-success text-white font-bold rounded-lg hover:bg-green-600 transition">قبول</button>
      <button onclick="window.actionItem('${type}', ${id}, 'reject')" class="flex-1 py-3 bg-danger text-white font-bold rounded-lg hover:bg-red-600 transition">رفض</button>
    </div>
  `;
};

window.actionItem = async function(type, id, action) {
  if (!confirm(`هل أنت متأكد من ${action === 'approve' ? 'قبول' : 'رفض'} هذا العنصر؟`)) return;
  
  const content = document.getElementById('modal-content');
  content.innerHTML = `<div class="text-center py-10"><div class="spinner mb-2"></div> جاري التنفيذ...</div>`;

  const res = await api.safeFetch(`/api/admin/${type}/${id}/${action}`, { method: 'POST' });
  
  if (res.ok) {
    window.closeModal();
    switchTab(currentTab); // إعادة تحميل القائمة
    alert('تمت العملية بنجاح');
  } else {
    content.innerHTML = `<div class="text-red-400 text-center py-10">${res.error}</div>`;
  }
};

window.closeModal = function() {
  document.getElementById('detail-modal').style.display = 'none';
};
