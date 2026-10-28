import { safeFetch } from '../core/api.js';

export async function loadChargePage() {
  const container = document.getElementById('charge-methods');
  const tg = window.Telegram?.WebApp;
  const tgId = tg?.initDataUnsafe?.user?.id;

  container.innerHTML = `<div class="card">جاري تحميل طرق الدفع...</div>`;

  try {
    const methods = await safeFetch('/api/payment-methods/');
    if (methods.length === 0) {
      container.innerHTML = `<div class="card" style="text-align:center;">لا توجد طرق دفع متاحة حالياً.</div>`;
      return;
    }

    const method = methods[0]; // نفترض شام كاش
    container.innerHTML = `
      <div class="card">
        <h3 style="margin-bottom:16px;">${method.name}</h3>
        <div class="form-group">
          <label>المبلغ المطلوب (بالدولار)</label>
          <input type="number" id="charge-amount" class="form-control" placeholder="مثال: 10" min="1" step="0.1">
        </div>
        <div style="background:var(--bg-main); padding:16px; border-radius:var(--radius-sm); margin-bottom:16px;">
          <p style="font-size:12px; color:var(--text-muted); margin-bottom:4px;">رقم الحساب:</p>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-family:monospace; font-size:16px;">${method.account}</strong>
            <button onclick="navigator.clipboard.writeText('${method.account}'); alert('تم النسخ!');" style="background:var(--primary); color:white; border:none; padding:6px 12px; border-radius:6px; font-family:inherit;">نسخ</button>
          </div>
        </div>
        <div class="form-group">
          <label>رقم عملية التحويل</label>
          <input type="text" id="charge-reference" class="form-control" placeholder="أدخل رقم العملية">
        </div>
        <button id="charge-submit" class="sanad-btn" style="width:100%; background:var(--primary); color:white; padding:14px; border-radius:var(--radius-sm); font-weight:bold; border:none; font-family:inherit;">إرسال طلب الإيداع</button>
      </div>
    `;

    document.getElementById('charge-submit').onclick = async () => {
      const amount = parseFloat(document.getElementById('charge-amount').value);
      const reference = document.getElementById('charge-reference').value;

      if (!amount || amount <= 0) return alert('يرجى إدخال مبلغ صحيح');
      if (!reference) return alert('يرجى إدخال رقم العملية');

      const btn = document.getElementById('charge-submit');
      btn.disabled = true;
      btn.textContent = 'جاري الإرسال...';

      const res = await safeFetch('/api/deposits/create', {
        method: 'POST',
        body: JSON.stringify({ telegram_id: tgId, amount: amount, reference: reference })
      });

      if (res && res.success) {
        alert('تم إرسال الطلب بنجاح! يرجى انتظار الموافقة.');
        window.switchPage('deposits');
      } else {
        alert('حدث خطأ: ' + (res?.error || 'يرجى المحاولة لاحقاً'));
        btn.disabled = false;
        btn.textContent = 'إرسال طلب الإيداع';
      }
    };
  } catch (e) {
    container.innerHTML = `<div class="card" style="color:var(--danger); text-align:center;">فشل تحميل طرق الدفع.</div>`;
  }
}
