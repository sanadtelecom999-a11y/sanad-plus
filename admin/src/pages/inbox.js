import { apiFetch } from '../api.js';
let currentTab = 'orders';

export async function renderInbox(container, isArchive = false) {
  container.innerHTML = `
    <div class="tabs">
      <button class="btn btn-primary" id="tab-orders" onclick="window.switchInboxTab('orders', ${isArchive})">الطلبات</button>
      <button class="btn btn-secondary" id="tab-deposits" onclick="window.switchInboxTab('deposits', ${isArchive})">الإيداعات</button>
      <button class="btn btn-secondary" id="tab-kyc" onclick="window.switchInboxTab('kyc', ${isArchive})">التوثيق</button>
    </div>
    <div class="grid-3" id="inbox-grid"></div>`;
  window.switchInboxTab('orders', isArchive);
}

window.switchInboxTab = async (tab, isArchive) => {
  currentTab = tab;
  document.getElementById('tab-orders').className = tab === 'orders' ? 'btn btn-primary' : 'btn btn-secondary';
  document.getElementById('tab-deposits').className = tab === 'deposits' ? 'btn btn-primary' : 'btn btn-secondary';
  document.getElementById('tab-kyc').className = tab === 'kyc' ? 'btn btn-primary' : 'btn btn-secondary';
  
  const grid = document.getElementById('inbox-grid');
  grid.innerHTML = `<div class="card-glass"><div class="skeleton sk-line"></div></div>`;

  try {
    const endpoint = isArchive ? `/api/admin/archive/${tab}` : `/api/admin/${tab}`;
    const data = await apiFetch(endpoint).catch(() => []);
    const items = Array.isArray(data) ? data : [];
    grid.innerHTML = '';
    if (items.length === 0) return grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;">لا توجد عناصر</div>`;

    items.forEach(item => {
      if (isArchive) {
         grid.innerHTML += `<div class="card-glass"><div style="display:flex;justify-content:space-between;margin-bottom:10px;"><span class="mono">#${item.id}</span><span style="color:var(--text-muted)">${item.status}</span></div><p>${item.user_name}</p><p class="sensitive-data">${item.total_price || item.amount}</p></div>`;
      } else {
        grid.innerHTML += `
          <div class="card-glass">
            <div style="display:flex;justify-content:space-between;margin-bottom:15px;"><span class="mono" style="color:var(--primary-500);">#${item.id}</span><span style="color:var(--warning);font-size:12px;">معلق</span></div>
            <p>المستخدم: <strong>${item.user_name||item.full_name}</strong></p>
            <p style="margin-bottom:15px;">المبلغ: <span class="mono sensitive-data">${item.total_price||item.amount||'—'}</span></p>
            <div style="display:flex;gap:10px;">
              <button class="btn btn-success btn-sm" style="flex:1;" onclick="window.handleInboxAction('${tab}', ${item.id}, 'approve', ${isArchive})">قبول</button>
              <button class="btn btn-danger btn-sm" style="flex:1;" onclick="window.handleInboxAction('${tab}', ${item.id}, 'reject', ${isArchive})">رفض</button>
            </div>
          </div>`;
      }
    });
  } catch(e) {}
};

window.handleInboxAction = async (type, id, action, isArchive) => {
  if (!confirm('هل أنت متأكد؟')) return;
  try { 
    await apiFetch(`/api/admin/${type}/${id}/${action}`, { method: 'POST' }); 
    window.showToast('تمت العملية'); 
    window.switchInboxTab(currentTab, isArchive); 
  } catch(e){}
};
