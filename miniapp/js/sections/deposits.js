import { safeFetch } from '../core/api.js';

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
    const deposits = await safeFetch(`/api/deposits/?telegram_id=${tgId}`);
    
    if (!deposits || deposits.length === 0) {
      container.innerHTML = `<div class="card" style="text-align:center; color:var(--text-muted);">لا توجد إيداعات سابقة.</div>`;
      return;
    }

    container.innerHTML = deposits.map(d => `
      <div class="list-item" onclick='window.showModal("deposit", ${JSON.stringify(d)})'>
        <div class="list-item-info">
          <h4>إيداع #${d.id}</h4>
          <span>${d.reference || 'بدون مرجع'}</span>
        </div>
        <div style="text-align:left;">
          <div style="font-weight:800; color:var(--success); margin-bottom:6px;">$${Number(d.amount).toFixed(2)}</div>
          ${getStatusBadge(d.status)}
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = `<div class="card" style="color:var(--danger); text-align:center;">فشل تحميل الإيداعات.</div>`;
  }
}
