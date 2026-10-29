import { api } from '../core/api.js';
import { escapeHtml, formatDate } from '../core/utils.js';

export async function openLedger() {
  const modal = document.getElementById('app-modal');
  const content = document.getElementById('modal-content');
  modal.classList.add('active');
  content.innerHTML = '<div style="text-align:center; padding:20px;">جاري تحميل السجل...</div>';

  try {
    const records = await api.get('/api/ledger');
    
    if (!records || records.length === 0) {
      content.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:20px;">لا توجد حركات مالية.</div>';
      return;
    }

    content.innerHTML = `
      <h3 style="margin-top:0; text-align:center; margin-bottom:20px;">السجل المالي</h3>
      <div style="max-height:60vh; overflow-y:auto;">
        ${records.map(r => {
          const isPositive = r.amount > 0;
          const color = isPositive ? 'var(--success)' : 'var(--danger)';
          const sign = isPositive ? '+' : '';
          return `
            <div class="ledger-item">
              <div class="ledger-info">
                <h4>${escapeHtml(r.desc || r.type)}</h4>
                <span>${formatDate(r.date)}</span>
              </div>
              <div class="ledger-amount" style="color:${color};">
                ${sign}$${Math.abs(r.amount).toFixed(2)}
                <div style="font-size:10px; color:var(--text-muted); font-weight:normal; margin-top:4px;">الرصيد: $${r.after.toFixed(2)}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div style="color:var(--danger); text-align:center;">${err.message}</div>`;
  }
}
