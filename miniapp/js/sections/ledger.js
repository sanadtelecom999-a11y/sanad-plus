import { safeFetch } from '../core/api.js';

export async function openLedger() {
  const modal = document.getElementById('app-modal');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

  if (!modal || !title || !body) { console.error('Ledger Modal elements not found'); return; }
  if (!modal || !title || !body) return console.error('Modal missing');
  modal.classList.add('active');
  title.textContent = 'السجل المالي';
  body.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">جاري التحميل...</div>`;

  try {
    const records = await safeFetch(`/api/ledger?telegram_id=${tgId}`);
    
    if (!records || records.length === 0) {
      body.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:30px;">لا توجد حركات مالية سابقة.</div>`;
      return;
    }

    body.innerHTML = `<div style="max-height: 60vh; overflow-y: auto; padding-left: 5px;">` + records.map(r => {
      const isPositive = r.amount > 0;
      const color = isPositive ? 'var(--success)' : 'var(--danger)';
      const sign = isPositive ? '+' : '-';
      
      let dateStr = 'غير متوفر';
      if (r.date) {
        try { 
          const d = new Date(r.date);
          dateStr = d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'}); 
        } catch(e){}
      }

      return `
        <div style="background:var(--bg-main); border:1px solid rgba(255,255,255,0.05); border-radius:12px; padding:14px; margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <strong style="color:white; font-size:13px;">${r.desc || r.type}</strong>
            <strong style="color:${color}; font-family:monospace; font-size:14px;">${sign}$${Math.abs(r.amount).toFixed(2)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted);">
            <span>${dateStr}</span>
            <span dir="ltr">Balance: $${r.after.toFixed(2)}</span>
          </div>
        </div>
      `;
    }).join('') + `</div>`;
  } catch (e) {
    body.innerHTML = `<div style="text-align:center; color:var(--danger); padding:20px;">فشل تحميل السجل.</div>`;
  }
}
