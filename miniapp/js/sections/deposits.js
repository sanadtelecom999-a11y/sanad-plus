import { api } from '../core/api.js';
import { escapeHtml, formatCurrency, formatDate } from '../core/utils.js';

export async function renderDeposits() {
  const container = document.getElementById('page-deposits');
  if (!container) return;

  container.innerHTML = `
    <h1 style="font-size:20px; font-weight:800; margin-bottom:20px;">الإيداعات</h1>
    <div id="deposits-list"><div style="text-align:center; color:var(--sp-text-muted);">جاري التحميل...</div></div>
  `;

  try {
    const res = await api.get('/api/deposits/');
    const items = res.items || [];
    const list = document.getElementById('deposits-list');

    if (items.length === 0) {
      list.innerHTML = '<div style="text-align:center; color:var(--sp-text-muted); padding:20px;">لا توجد إيداعات.</div>';
      return;
    }

    list.innerHTML = items.map(d => `
      <div class="sp-service-row" data-id="${d.id}" data-type="deposit" style="min-height:auto; padding:16px;">
        <div style="text-align:right;">
          <span class="sp-service-title">إيداع #${d.id}</span>
          <span class="sp-service-description">${escapeHtml(d.reference || 'بدون مرجع')}</span>
        </div>
        <div style="text-align:left;">
          <div style="font-weight:800; color:var(--sp-success); margin-bottom:4px;">${formatCurrency(d.amount)}</div>
          <span style="font-size:11px; color:${d.status==='approved' ? 'var(--sp-success)' : d.status==='rejected' ? 'var(--sp-danger)' : 'var(--sp-warning)'};">
            ${d.status === 'approved' ? 'مكتمل' : d.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
          </span>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.sp-service-row').forEach(row => {
      row.addEventListener('click', () => openDepositReceipt(row.getAttribute('data-id')));
    });

  } catch (err) {
    document.getElementById('deposits-list').innerHTML = `<div style="color:var(--sp-danger); text-align:center;">${err.message}</div>`;
  }
}

async function openDepositReceipt(depositId) {
  const modal = document.getElementById('app-modal');
  const content = document.getElementById('modal-content');
  modal.classList.add('active');
  content.innerHTML = '<div style="text-align:center; padding:20px;">جاري التحميل...</div>';

  try {
    const res = await api.get('/api/deposits/');
    const dep = res.items.find(d => d.id == depositId);
    
    if (!dep) throw new Error("الإيداع غير موجود");

    content.innerHTML = `
      <div class="sp-receipt">
        <div class="sp-receipt-header">
          <h2 style="margin:0; font-size:20px;">SANAD<span style="color:var(--sp-primary)">+</span></h2>
          <p style="color:var(--sp-text-muted); font-size:12px;">إيصال إيداع رقمي</p>
        </div>
        
        <div class="sp-receipt-amount">${formatCurrency(dep.amount)}</div>
        
        <div class="sp-receipt-row"><span>رقم الإيداع</span><strong>#${dep.id}</strong></div>
        <div class="sp-receipt-row"><span>رقم المرجع</span><strong>${escapeHtml(dep.reference || '—')}</strong></div>
        <div class="sp-receipt-row"><span>التاريخ</span><strong>${formatDate(dep.date)}</strong></div>
        <div class="sp-receipt-row"><span>الحالة</span><strong style="color:${dep.status==='approved' ? 'var(--sp-success)' : dep.status==='rejected' ? 'var(--sp-danger)' : 'var(--sp-warning)'};">${dep.status === 'approved' ? 'مكتمل' : dep.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}</strong></div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div style="color:var(--sp-danger); text-align:center;">${err.message}</div>`;
  }
}
