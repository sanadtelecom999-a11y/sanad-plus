import { api } from '../core/api.js';
import { escapeHtml, formatCurrency } from '../core/utils.js';

let allUsers = [];

export async function renderUsers() {
  const container = document.getElementById('dashboard-container');
  
  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:10px;">
      <h2 style="margin:0; font-size:18px;">إدارة المستخدمين</h2>
      <input type="text" id="user-search" placeholder="بحث بالاسم أو الآيدي..." class="sanad-input" style="max-width:300px;">
    </div>
    <div class="sanad-card" style="overflow:hidden;">
      <div style="overflow-x:auto;">
        <table class="sanad-table">
          <thead>
            <tr>
              <th>المستخدم</th>
              <th>الآيدي</th>
              <th>الرصيد</th>
              <th>الحالة</th>
              <th style="text-align:left;">إجراءات</th>
            </tr>
          </thead>
          <tbody id="users-table-body">
            <tr><td colspan="5" style="text-align:center; padding:30px; color:#91a7c2;">جاري التحميل...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('user-search').addEventListener('input', (e) => {
    filterUsers(e.target.value);
  });

  await loadUsers();
}

async function loadUsers() {
  const res = await api.safeFetch('/api/admin/users');
  const tbody = document.getElementById('users-table-body');

  if (!res.ok) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:#fb7185;">فشل الجلب: ${res.error}</td></tr>`;
    return;
  }

  allUsers = res.data || [];
  renderTable(allUsers);
}

function filterUsers(query) {
  const q = query.toLowerCase();
  const filtered = allUsers.filter(u => 
    u.first_name.toLowerCase().includes(q) || 
    String(u.telegram_id).includes(q) || 
    String(u.id).includes(q)
  );
  renderTable(filtered);
}

function renderTable(users) {
  const tbody = document.getElementById('users-table-body');
  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:#91a7c2;">لا يوجد مستخدمون يطابقون البحث.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr>
      <td style="display:flex; align-items:center; gap:10px;">
        <div style="width:34px; height:34px; border-radius:50%; background:#38bdf822; color:#38bdf8; display:flex; align-items:center; justify-content:center; font-weight:bold;">
          ${escapeHtml(u.first_name.charAt(0).toUpperCase())}
        </div>
        <span>${escapeHtml(u.first_name)}</span>
      </td>
      <td style="color:#91a7c2; font-family:monospace;">${escapeHtml(u.telegram_id)}</td>
      <td style="font-weight:bold; color:${u.balance > 0 ? '#34d399' : '#91a7c2'}">${formatCurrency(u.balance)}</td>
      <td>
        ${u.is_banned 
          ? '<span class="sanad-badge badge-danger">محظور</span>' 
          : '<span class="sanad-badge badge-success">نشط</span>'}
      </td>
      <td style="text-align:left;">
        <button onclick="window.openUserModal(${u.id})" class="sanad-btn sanad-btn-secondary">إدارة</button>
      </td>
    </tr>
  `).join('');
}

window.openUserModal = function(userId) {
  const user = allUsers.find(u => u.id === userId);
  if (!user) return;

  const modal = document.getElementById('detail-modal');
  const content = document.getElementById('modal-content');
  
  modal.style.display = 'flex';
  content.innerHTML = `
    <h3 style="margin-top:0; font-size:18px;">إدارة المستخدم: ${escapeHtml(user.first_name)}</h3>
    
    <div style="background:#0b1b2f; padding:16px; border-radius:12px; margin-bottom:20px; border:1px solid rgba(125,180,225,.1);">
      <div style="display:flex; justify-content:space-between; margin-bottom:12px;"><span style="color:#91a7c2;">الرصيد الحالي:</span> <span style="font-weight:bold; color:#34d399; font-size:16px;">${formatCurrency(user.balance)}</span></div>
      <div style="display:flex; gap:10px;">
        <input type="number" id="balance-amount" placeholder="المبلغ (مثال: 50 أو -50)" class="sanad-input">
        <button onclick="window.updateBalance(${user.id})" class="sanad-btn sanad-btn-primary">تعديل</button>
      </div>
    </div>

    <div style="display:flex; gap:10px;">
      <button onclick="window.toggleBan(${user.id}, ${user.is_banned})" class="sanad-btn ${user.is_banned ? 'sanad-btn-secondary' : 'sanad-btn-danger'}" style="width:100%; padding:12px;">
        ${user.is_banned ? 'فك الحظر (تفعيل)' : 'حظر المستخدم'}
      </button>
    </div>
  `;
};

window.updateBalance = async function(userId) {
  const amount = document.getElementById('balance-amount').value;
  if (!amount || isNaN(amount)) return alert('أدخل مبلغاً صحيحاً');

  const res = await api.safeFetch(`/api/admin/users/${userId}/balance`, { method: 'POST', body: { amount: parseFloat(amount) } });
  if (res.ok) {
    window.closeModal();
    loadUsers();
    alert('تم تعديل الرصيد بنجاح');
  } else {
    alert('خطأ: ' + res.error);
  }
};

window.toggleBan = async function(userId, currentStatus) {
  const newStatus = !currentStatus;
  if (!confirm(`هل أنت متأكد من ${newStatus ? 'حظر' : 'فك حظر'} هذا المستخدم؟`)) return;
  const res = await api.safeFetch(`/api/admin/users/${userId}/ban`, { method: 'POST', body: { is_banned: newStatus } });
  if (res.ok) {
    window.closeModal();
    loadUsers();
  } else {
    alert('خطأ: ' + res.error);
  }
};
