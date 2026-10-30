import { apiFetch } from '../api.js';
let allUsers = [];

export async function renderUsers(container) {
  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
      <div style="position:relative; width: 300px;">
        <i data-lucide="search" style="position:absolute; right:14px; top:14px; color:var(--text-muted);"></i>
        <input type="text" id="user-search" class="input" placeholder="بحث..." style="padding-right:40px;" oninput="window.filterUsers(this.value)">
      </div>
      <button class="btn btn-secondary" onclick="window.exportUsers()"><i data-lucide="download"></i> تصدير Excel</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>المستخدم</th><th>معرف SN</th><th>الرصيد</th><th>الحالة</th><th>إجراءات</th></tr></thead>
        <tbody id="users-table"><tr><td colspan="5"><div class="skeleton sk-line"></div></td></tr></tbody>
      </table>
    </div>`;
  lucide.createIcons();
  
  try {
    const data = await apiFetch('/api/admin/users');
    allUsers = Array.isArray(data) ? data : [];
    drawTable(allUsers);
  } catch(e) {}
}

function drawTable(users) {
  const tbody = document.getElementById('users-table'); tbody.innerHTML = '';
  if(users.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">لا يوجد مستخدمون.</td></tr>'; return; }
  
  users.forEach(u => {
    tbody.innerHTML += `
      <tr>
        <td><div style="display:flex;align-items:center;gap:10px;"><div style="width:36px;height:36px;background:var(--primary-500);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;">${u.first_name[0]}</div><div><div style="font-weight:700;">${u.first_name}</div><div style="font-size:11px;color:var(--text-muted);">@${u.username||'لا يوجد'}</div></div></div></td>
        <td><span class="mono sensitive-data" style="color:var(--accent);">SN-${u.telegram_id}</span></td>
        <td><span class="mono sensitive-data" style="color:var(--success);font-weight:700;">${u.balance} ل.س</span></td>
        <td>${u.is_banned ? '<span style="color:var(--error);">محظور</span>' : '<span style="color:var(--success);">نشط</span>'}</td>
        <td>
          <div style="display:flex;gap:5px;">
            <button class="action-icon" onclick='window.showUserProfile(${JSON.stringify(u)})'><i data-lucide="eye"></i></button>
            <button class="action-icon" onclick="window.openBalanceModal('${u.id}', '${u.first_name}')"><i data-lucide="wallet"></i></button>
            <button class="action-icon danger" onclick="window.openBanModal('${u.id}', '${u.first_name}', ${u.is_banned})"><i data-lucide="${u.is_banned ? 'shield-check' : 'shield-ban'}"></i></button>
          </div>
        </td>
      </tr>`;
  });
  lucide.createIcons();
}

window.filterUsers = (q) => {
  const filtered = allUsers.filter(u => String(u.telegram_id).includes(q) || (u.first_name && u.first_name.toLowerCase().includes(q.toLowerCase())));
  drawTable(filtered);
};

window.exportUsers = () => {
  if(allUsers.length === 0) return window.showToast('لا توجد بيانات', 'error');
  let csv = '\uFEFFالاسم,معرف تيليجرام,الرصيد,الحالة\n';
  allUsers.forEach(u => { csv += `${u.first_name},${u.telegram_id},${u.balance},${u.is_banned ? 'محظور' : 'نشط'}\n`; });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "users.csv"; link.click();
};
