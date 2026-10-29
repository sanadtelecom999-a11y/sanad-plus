import { api } from '../core/api.js';
import { escapeHtml } from '../core/utils.js';

export async function renderCharge() {
  const container = document.getElementById('page-charge');
  if (!container) return;

  container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:20px;">جاري تحميل طرق الدفع...</div>`;

  try {
    const methods = await api.get('/api/payment-methods/');
    
    if (!methods || methods.length === 0) {
      container.innerHTML = '<div style="text-align:center; color:var(--danger);">لا توجد طرق دفع متاحة.</div>';
      return;
    }

    // نأخذ أول طريقة دفع (شام كاش)
    const method = methods[0];

    container.innerHTML = `
      <h1 style="font-size:20px; font-weight:800; margin-bottom:20px;">شحن الرصيد</h1>
      <div class="card" style="border-color:var(--primary);">
        <h3 style="margin-top:0; margin-bottom:16px; font-size:16px;">بيانات التحويل (${escapeHtml(method.name)})</h3>
        <div style="background:var(--bg-main); padding:16px; border-radius:12px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-family:monospace; font-size:16px;">${escapeHtml(method.account)}</strong>
          <button onclick="navigator.clipboard.writeText('${escapeHtml(method.account)}'); alert('تم النسخ!');" style="background:rgba(56,189,248,0.1); color:var(--primary); border:none; padding:6px 12px; border-radius:8px; cursor:pointer;">نسخ</button>
        </div>

        <form id="charge-form">
          <div style="margin-bottom:12px;">
            <label style="font-size:13px; color:var(--text-muted); display:block; margin-bottom:8px;">المبلغ ($)</label>
            <input type="number" id="charge-amount" required min="${method.min_amount}" max="${method.max_amount}" style="width:100%; background:var(--bg-main); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px; color:white; outline:none;">
          </div>
          <div style="margin-bottom:12px;">
            <label style="font-size:13px; color:var(--text-muted); display:block; margin-bottom:8px;">رقم عملية التحويل</label>
            <input type="text" id="charge-reference" required style="width:100%; background:var(--bg-main); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px; color:white; outline:none;">
          </div>
          <div style="margin-bottom:20px;">
            <label style="font-size:13px; color:var(--text-muted); display:block; margin-bottom:8px;">صورة الإيصال</label>
            <input type="file" id="charge-receipt" accept="image/*" required style="width:100%; color:var(--text-muted);">
          </div>
          <button type="submit" style="width:100%; background:var(--primary); color:#000; font-weight:bold; padding:14px; border-radius:12px; border:none; cursor:pointer;">تأكيد طلب الشحن</button>
        </form>
      </div>
    `;

    document.getElementById('charge-form').onsubmit = async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button');
      btn.disabled = true; btn.textContent = 'جاري الإرسال...';

      const formData = new FormData();
      formData.append('amount', document.getElementById('charge-amount').value);
      formData.append('reference', document.getElementById('charge-reference').value);
      formData.append('receipt', document.getElementById('charge-receipt').files[0]);

      try {
        await api.postForm('/api/deposits/create', formData);
        alert('تم إرسال طلب الإيداع بنجاح! يرجى الانتظار للمراجعة.');
        window.location.hash = 'deposits';
      } catch (err) {
        alert('خطأ: ' + err.message);
        btn.disabled = false; btn.textContent = 'تأكيد طلب الشحن';
      }
    };

  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger); text-align:center;">${err.message}</div>`;
  }
}
