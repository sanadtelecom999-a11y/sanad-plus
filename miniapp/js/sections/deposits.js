import { safeFetch } from '../core/api.js';

let allDeposits = [];

function getStatusBadge(status) {
  const s = (status || '').toLowerCase();
  if (['approved', 'completed', 'مكتمل', 'مقبول'].includes(s)) return '<span class="status-badge status-approved">مكتمل</span>';
  if (['rejected', 'مرفوض', 'ملغي'].includes(s)) return '<span class="status-badge status-rejected">مرفوض</span>';
  return '<span class="status-badge status-pending">قيد المراجعة</span>';
}

export async function loadDeposits() {
  const container = document.getElementById('deposits-list');
  const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  container.innerHTML = `<div style="text-align:center; padding:20px;">جاري التحميل...</div>`;
  try {
    allDeposits = await safeFetch(`/api/deposits/?telegram_id=${tgId}`) || [];
    window.filterList('deposits', 'all');
  } catch (e) {
    container.innerHTML = `<div class="card" style="color:var(--danger); text-align:center;">فشل تحميل الإيداعات.</div>`;
  }
}

window.openDepositDetails = function(id) {
  const d = allDeposits.find(x => x.id == id);
  if(d) window.showModal('deposit', d);
};

window.renderDeposits = function(filter) {
  const container = document.getElementById('deposits-list');
  let filtered = allDeposits;
  if (filter !== 'all') {
    filtered = allDeposits.filter(d => {
      const s = (d.status || '').toLowerCase();
      if (filter === 'completed' && ['approved', 'completed', 'مكتمل', 'مقبول'].includes(s)) return true;
      if (filter === 'rejected' && ['rejected', 'مرفوض', 'ملغي'].includes(s)) return true;
      if (filter === 'pending' && !['approved', 'completed', 'rejected', 'مرفوض', 'مكتمل', 'مقبول'].includes(s)) return true;
      return false;
    });
  }
  if (filtered.length === 0) {
    container.innerHTML = `<div class="card" style="text-align:center; color:var(--text-muted);">لا توجد إيداعات في هذا القسم.</div>`;
    return;
  }
  container.innerHTML = filtered.map(d => `
    <div class="list-item" onclick="window.openDepositDetails(${d.id})">
      <div class="list-item-info"><h4>إيداع #${d.id}</h4><span>${d.reference || 'بدون مرجع'}</span></div>
      <div style="text-align:left;"><div style="font-weight:800; color:var(--success); margin-bottom:6px;">$${Number(d.amount).toFixed(2)}</div>${getStatusBadge(d.status)}</div>
    </div>
  `).join('');
};
