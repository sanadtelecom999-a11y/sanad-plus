import { safeFetch } from '../core/api.js';

export async function loadDeposits() {
  const container = document.getElementById('deposits-list');
  const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

  container.innerHTML = `<div class="card">جاري التحميل...</div>`;

  try {
    const deposits = await safeFetch(`/api/deposits/?telegram_id=${tgId}`);
    
    if (deposits.length === 0) {
      container.innerHTML = `<div class="card" style="text-align:center; color:var(--text-muted);">لا توجد إيداعات سابقة.</div>`;
      return;
    }

    container.innerHTML = deposits.map(d => `
      <div class="list-item">
        <div class="list-item-info">
          <h4>إيداع #${d.id}</h4>
          <span>${d.reference || 'بدون مرجع'}</span>
        </div>
        <div style="text-align:left;">
          <div style="font-weight:bold; color:var(--success);">${d.amount.toFixed(2)} $</div>
          <span class="status-badge ${d.status === 'approved' ? 'status-approved' : d.status === 'rejected' ? 'status-rejected' : 'status-pending'}">
            ${d.status === 'approved' ? 'مكتمل' : d.status === 'rejected' ? 'مرفوض' : 'معلق'}
          </span>
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = `<div class="card" style="color:var(--danger); text-align:center;">فشل تحميل الإيداعات.</div>`;
  }
}
