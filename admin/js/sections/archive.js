import { api } from '../core/api.js';
import { escapeHtml } from '../core/utils.js';

let currentTab = 'orders';

export async function renderArchive() {
  const container = document.getElementById('dashboard-container');
  
  container.innerHTML = `
    <div class="mb-6 flex gap-2 border-b border-white/10 pb-4 overflow-x-auto">
      <button onclick="window.switchArchiveTab('orders')" id="tab-arc-orders" class="px-4 py-2 rounded-lg font-bold whitespace-nowrap transition">الطلبات</button>
      <button onclick="window.switchArchiveTab('deposits')" id="tab-arc-deposits" class="px-4 py-2 rounded-lg font-bold whitespace-nowrap transition">الإيداعات</button>
      <button onclick="window.switchArchiveTab('kyc')" id="tab-arc-kyc" class="px-4 py-2 rounded-lg font-bold whitespace-nowrap transition">التوثيق</button>
    </div>
    <div id="archive-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="text-center text-slate-400 mt-10 col-span-full">جاري التحميل...</div>
    </div>
  `;

  window.switchArchiveTab(currentTab);
}

window.switchArchiveTab = async function(tab) {
  currentTab = tab;
  const list = document.getElementById('archive-list');
  
  ['orders', 'deposits', 'kyc'].forEach(t => {
    const btn = document.getElementById(`tab-arc-${t}`);
    if (t === tab) btn.className = 'px-4 py-2 rounded-lg bg-primary text-slate-900 font-bold whitespace-nowrap transition';
    else btn.className = 'px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 whitespace-nowrap transition';
  });

  list.innerHTML = `<div class="text-center text-slate-400 mt-10 col-span-full">جاري تحميل الأرشيف...</div>`;

  const res = await api.safeFetch(`/api/admin/archive/${tab}`);

  if (!res.ok) {
    list.innerHTML = `<div class="text-red-400 mt-10 col-span-full text-center">فشل الجلب: ${res.error}</div>`;
    return;
  }

  const items = res.data || [];
  if (items.length === 0) {
    list.innerHTML = `<div class="text-slate-400 mt-10 col-span-full text-center">لا توجد عناصر مؤرشفة في هذا القسم.</div>`;
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="glass rounded-xl p-5 border border-white/10 flex flex-col justify-between">
      <div>
        <h4 class="font-bold text-lg mb-1">${escapeHtml(item.title)}</h4>
        <p class="text-slate-400 text-sm mb-2">${escapeHtml(item.user_name)}</p>
        <p class="text-sm text-slate-300 mb-4">${escapeHtml(item.details)}</p>
      </div>
      <button onclick="window.restoreItem('${tab}', ${item.id})" class="w-full py-2 bg-success/20 hover:bg-success/30 text-success font-bold rounded-lg text-sm transition">استرجاع</button>
    </div>
  `).join('');
};

window.restoreItem = async function(type, id) {
  if (!confirm('هل أنت متأكد من استرجاع هذا العنصر إلى النظام النشط؟')) return;
  
  const res = await api.safeFetch(`/api/admin/archive/${type}/${id}/restore`, { method: 'POST' });
  if (res.ok) {
    window.switchArchiveTab(type);
  } else {
    alert('خطأ في الاسترجاع: ' + res.error);
  }
};
