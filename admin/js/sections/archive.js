import { api } from '../core/api.js';
import { escapeHtml } from '../core/utils.js';

let currentTab = 'orders';

export async function renderArchive() {
  const container = document.getElementById('dashboard-container');
  container.innerHTML = `
    <div class="sanad-tabs">
      <button id="tab-arc-orders" class="sanad-tab active" onclick="window.switchArchiveTab('orders')">الطلبات</button>
      <button id="tab-arc-deposits" class="sanad-tab" onclick="window.switchArchiveTab('deposits')">الإيداعات</button>
      <button id="tab-arc-kyc" class="sanad-tab" onclick="window.switchArchiveTab('kyc')">التوثيق</button>
    </div>
    <div id="archive-list" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); gap:16px;"></div>
  `;
  window.switchArchiveTab(currentTab);
}

window.switchArchiveTab = async function(tab) {
  currentTab = tab;
  document.querySelectorAll('.sanad-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-arc-${tab}`).classList.add('active');
  
  const list = document.getElementById('archive-list');
  list.innerHTML = `<div style="text-align:center; color:#91a7c2; grid-column:1/-1; padding:30px;">جاري التحميل...</div>`;
  
  const res = await api.safeFetch(`/api/admin/archive/${tab}`);
  if (!res.ok) { list.innerHTML = `<div style="color:#fb7185; text-align:center; grid-column:1/-1; padding:30px;">فشل الجلب</div>`; return; }
  const items = res.data || [];
  if (items.length === 0) { list.innerHTML = `<div style="color:#91a7c2; text-align:center; grid-column:1/-1; padding:30px;">لا توجد عناصر مؤرشفة.</div>`; return; }

  list.innerHTML = items.map(item => `
    <div class="sanad-card" style="padding:16px; display:flex; flex-direction:column;">
      <h4 style="margin:0 0 8px 0; font-size:15px;">${escapeHtml(item.title)}</h4>
      <p style="color:#91a7c2; font-size:13px; margin:0 0 12px 0;">${escapeHtml(item.user_name)}</p>
      <p style="font-size:12px; color:#dce8f6; margin:0 0 16px 0; flex:1;">${escapeHtml(item.details)}</p>
      <button onclick="window.restoreItem('${tab}', ${item.id})" class="sanad-btn sanad-btn-success" style="width:100%;">استرجاع</button>
    </div>
  `).join('');
};

window.restoreItem = async function(type, id) {
  if (!confirm('استرجاع هذا العنصر؟')) return;
  const res = await api.safeFetch(`/api/admin/archive/${type}/${id}/restore`, { method: 'POST' });
  if (res.ok) { window.switchArchiveTab(type); } else { alert('خطأ: ' + res.error); }
};
