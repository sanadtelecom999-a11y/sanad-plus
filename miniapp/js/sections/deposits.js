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
  
  if (!tgId) {
    container.innerHTML = `<div class="card" style="color:var(--danger); text-align:center;">يجب فتح التطبيق من تيليجرام.</div>`;
    return;
  }

  container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">جاري التحميل...</div>`;
  
  try {
    const data = await safeFetch(`/api/deposits/`);
    allDeposits = Array.isArray(data) ? data : [];
    window.filterList('deposits', 'all');
  } catch (e) {
    console.error("Deposits Fetch Error:", e);
    container.innerHTML = `<div class="card" style="color:var(--danger); text-align:center;">فشل تحميل الإيداعات.</div>`;
  }
}

window.openDepositDetails = function(id) {
  const d = allDeposits.find(x => x.id == id);
  if(!d) return;

  const modal = document.getElementById('app-modal');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');

  let dateStr = 'غير متوفر';
  if (d.date) {
    try {
      const dt = new Date(d.date);
      dateStr = dt.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch(e) { dateStr = d.date; }
  }

  title.textContent = `تفاصيل الإيداع #${d.id}`;
  body.innerHTML = `
    <div class="modal-row"><span>المبلغ</span><strong style="color:var(--success);">$${Number(d.amount || 0).toFixed(2)}</strong></div>
    <div class="modal-row"><span>رقم العملية</span><strong>${d.reference || 'غير متوفر'}</strong></div>
    <div class="modal-row"><span>التاريخ</span><strong>${dateStr}</strong></div>
    <div class="modal-row"><span>الحالة</span><strong>${getStatusBadge(d.status)}</strong></div>
  `;
  modal.classList.add('active');
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
  
  // تمت إزالة onclick واستبدالها بـ data-id
  container.innerHTML = filtered.map(d => `
    <div class="list-item" data-id="${d.id}">
      <div class="list-item-info"><h4>إيداع #${d.id}</h4><span>${d.reference || 'بدون مرجع'}</span></div>
      <div style="text-align:left;"><div style="font-weight:800; color:var(--success); margin-bottom:6px;">$${Number(d.amount || 0).toFixed(2)}</div>${getStatusBadge(d.status)}</div>
    </div>
  `).join('');

  // تفويض الأحداث
  container.querySelectorAll('.list-item').forEach(el => {
    el.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      if(id) window.openDepositDetails(id);
    });
  });
};
