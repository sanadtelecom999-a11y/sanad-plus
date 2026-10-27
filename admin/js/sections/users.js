import { api } from '../core/api.js';
import { escapeHtml, formatCurrency } from '../core/utils.js';

let allUsers = [];

export async function renderUsers() {
  const container = document.getElementById('dashboard-container');
  
  container.innerHTML = `
    <div class="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
      <h2 class="text-2xl font-bold">إدارة المستخدمين</h2>
      <input type="text" id="user-search" placeholder="بحث بالاسم أو الآيدي..." 
             class="bg-slate-800 border border-white/10 rounded-lg px-4 py-2 w-full md:w-80 text-white focus:outline-none focus:border-primary">
    </div>
    <div class="glass rounded-2xl border border-white/10 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-right">
          <thead class="bg-white/5 border-b border-white/10">
            <tr>
              <th class="p-4 font-bold text-slate-300">المستخدم</th>
              <th class="p-4 font-bold text-slate-300">الآيدي</th>
              <th class="p-4 font-bold text-slate-300">الرصيد</th>
              <th class="p-4 font-bold text-slate-300">الحالة</th>
              <th class="p-4 font-bold text-slate-300 text-left">إجراءات</th>
            </tr>
          </thead>
          <tbody id="users-table-body">
            <tr><td colspan="5" class="text-center p-6 text-slate-400">جاري التحميل...</td></tr>
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
    tbody.innerHTML = `<tr><td colspan="5" class="text-center p-6 text-red-400">فشل الجلب: ${res.error}</td></tr>`;
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
    tbody.innerHTML = `<tr><td colspan="5" class="text-center p-6 text-slate-400">لا يوجد مستخدمون يطابقون البحث.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr class="border-b border-white/5 hover:bg-white/5 transition">
      <td class="p-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
          ${escapeHtml(u.first_name.charAt(0).toUpperCase())}
        </div>
        <span>${escapeHtml(u.first_name)}</span>
      </td>
      <td class="p-4 text-slate-400 font-mono text-sm">${escapeHtml(u.telegram_id)}</td>
      <td class="p-4 font-bold ${u.balance > 0 ? 'text-success' : 'text-slate-400'}">${formatCurrency(u.balance)}</td>
      <td class="p-4">
        ${u.is_banned 
          ? '<span class="bg-danger/20 text-danger px-3 py-1 rounded-full text-xs font-bold">محظور</span>' 
          : '<span class="bg-success/20 text-success px-3 py-1 rounded-full text-xs font-bold">نشط</span>'}
      </td>
      <td class="p-4 text-left">
        <button onclick="window.openUserModal(${u.id})" class="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm transition">إدارة</button>
      </td>
    </tr>
  `).join('');
}

// Modal إدارة المستخدم
window.openUserModal = function(userId) {
  const user = allUsers.find(u => u.id === userId);
  if (!user) return;

  const modal = document.getElementById('detail-modal');
  const content = document.getElementById('modal-content');
  
  modal.style.display = 'flex';
  content.innerHTML = `
    <h3 class="text-xl font-bold mb-4">إدارة المستخدم: ${escapeHtml(user.first_name)}</h3>
    
    <div class="bg-slate-800 p-4 rounded-lg mb-6">
      <div class="flex justify-between mb-2"><span class="text-slate-400">الرصيد الحالي:</span> <span class="font-bold text-success">${formatCurrency(user.balance)}</span></div>
      <div class="flex gap-2 mt-4">
        <input type="number" id="balance-amount" placeholder="المبلغ (مثال: 50 أو -50)" class="flex-1 bg-slate-900 border border-white/10 rounded px-3 py-2 text-white">
        <button onclick="window.updateBalance(${user.id})" class="bg-primary text-slate-900 font-bold px-4 rounded hover:bg-sky-400 transition">تعديل</button>
      </div>
    </div>

    <div class="flex gap-4">
      <button onclick="window.toggleBan(${user.id}, ${user.is_banned})" class="w-full py-3 ${user.is_banned ? 'bg-success' : 'bg-danger'} text-white font-bold rounded-lg hover:opacity-80 transition">
        ${user.is_banned ? 'فك الحظر (تفعيل)' : 'حظر المستخدم'}
      </button>
    </div>
  `;
};

window.updateBalance = async function(userId) {
  const amount = document.getElementById('balance-amount').value;
  if (!amount || isNaN(amount)) return alert('أدخل مبلغاً صحيحاً');

  const res = await api.safeFetch(`/api/admin/users/${userId}/balance`, {
    method: 'POST',
    body: { amount: parseFloat(amount) }
  });

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
  const action = newStatus ? 'حظر' : 'فك حظر';
  
  if (!confirm(`هل أنت متأكد من ${action} هذا المستخدم؟`)) return;

  const res = await api.safeFetch(`/api/admin/users/${userId}/ban`, {
    method: 'POST',
    body: { is_banned: newStatus }
  });

  if (res.ok) {
    window.closeModal();
    loadUsers();
  } else {
    alert('خطأ: ' + res.error);
  }
};
