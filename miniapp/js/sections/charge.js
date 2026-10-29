import { safeFetch } from '../core/api.js';

const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

export async function loadChargePage() {
  const container = document.getElementById('charge-methods');
  container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">جاري تحميل طرق الدفع...</div>`;

  try {
    const methods = await safeFetch('/api/payment-methods/');
    
    if (!methods || methods.length === 0) {
      container.innerHTML = `<div class="card" style="text-align:center; color:var(--danger);">لا توجد طرق دفع متاحة حالياً. يرجى التواصل مع الدعم.</div>`;
      return;
    }

    // الخطوة 1: عرض قائمة طرق الدفع
    container.innerHTML = `<h3 style="margin-bottom:16px; font-size:16px;">اختر طريقة الدفع</h3>` + 
      methods.map(m => `
        <div class="method-card" onclick='window.showPaymentDetails(${JSON.stringify(m)})'>
          <div>
            <h4>${m.name}</h4>
            <span>الحد الأدنى: $${m.min_amount.toFixed(2)}</span>
          </div>
          <svg style="width:20px; height:20px; color:var(--text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
        </div>
      `).join('');
      
  } catch (e) {
    container.innerHTML = `<div class="card" style="color:var(--danger); text-align:center;">فشل تحميل طرق الدفع.</div>`;
  }
}

// الخطوة 2: عرض تفاصيل طريقة الدفع المختارة
window.showPaymentDetails = function(method) {
  const container = document.getElementById('charge-methods');
  
  container.innerHTML = `
    <div style="margin-bottom:20px;">
      <button onclick="window.loadChargePage()" style="background:none; border:none; color:var(--text-muted); display:flex; align-items:center; gap:8px; cursor:pointer; font-family:inherit;">
        <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        العودة لطرق الدفع
      </button>
    </div>

    <div class="card" style="margin-bottom:20px; border-color:var(--primary);">
      <h3 style="margin-top:0; margin-bottom:16px; font-size:16px;">بيانات التحويل (${method.name})</h3>
      
      <div style="background:var(--bg-main); padding:16px; border-radius:12px; margin-bottom:16px;">
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">رقم الحساب / المحفظة:</p>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-family:monospace; font-size:18px; letter-spacing:1px;">${method.account}</strong>
          <button class="copy-btn" onclick="navigator.clipboard.writeText('${method.account}'); alert('تم النسخ!');">نسخ</button>
        </div>
      </div>

      <p style="font-size:13px; color:var(--text-muted); line-height:1.6;">
        يرجى تحويل المبلغ المطلوب إلى الحساب أعلاه، ثم إدخال رقم عملية التحويل ورفع صورة الإيصال لإتمام الشحن.
      </p>
    </div>

    <form id="deposit-form" class="card" style="border:none; padding:0;">
      <div class="form-group">
        <label>المبلغ المحول ($)</label>
        <input type="number" id="dep-amount" class="form-control" required min="${method.min_amount}" max="${method.max_amount}" step="0.01" placeholder="مثال: 10">
      </div>
      
      <div class="form-group">
        <label>رقم عملية التحويل</label>
        <input type="text" id="dep-ref" class="form-control" required placeholder="أدخل رقم المرجع من التطبيق">
      </div>

      <div class="form-group">
        <label>صورة الإيصال</label>
        <div class="upload-area">
          <input type="file" id="dep-receipt" accept="image/*" required onchange="previewReceipt(this)">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          <p>اضغط لاختيار صورة الإيصال</p>
          <img id="preview-img" />
        </div>
      </div>

      <button type="submit" id="dep-submit" class="sanad-btn" style="width:100%; background:var(--primary); color:white; padding:14px; border-radius:12px; font-weight:bold; border:none; font-family:inherit; margin-top:10px;">تأكيد طلب الشحن</button>
    </form>
  `;

  // معاينة الصورة
  window.previewReceipt = function(input) {
    const file = input.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = document.getElementById('preview-img');
        img.src = e.target.result;
        img.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  };

  // إرسال النموذج
  document.getElementById('deposit-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('dep-submit');
    const amount = parseFloat(document.getElementById('dep-amount').value);
    const reference = document.getElementById('dep-ref').value;
    const receiptFile = document.getElementById('dep-receipt').files[0];

    if (!amount || !reference || !receiptFile) {
      return alert('يرجى تعبئة جميع الحقول المطلوبة');
    }
    if (amount < method.min_amount || amount > method.max_amount) {
      return alert(`المبلغ يجب أن يكون بين $${method.min_amount} و $${method.max_amount}`);
    }

    btn.disabled = true;
    btn.textContent = 'جاري الإرسال...';

    const formData = new FormData();
    formData.append('amount', amount);
    formData.append('reference', reference);
    formData.append('receipt', receiptFile);

    try {
      const res = await fetch('https://sanad-plus-backend.onrender.com/api/deposits/create', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (res.ok) {
        alert('تم إرسال طلب الشحن بنجاح! يرجى انتظار الموافقة.');
        window.switchPage('deposits');
      } else {
        alert('خطأ: ' + (data.error || 'حدث خطأ'));
        btn.disabled = false;
        btn.textContent = 'تأكيد طلب الشحن';
      }
    } catch (err) {
      alert('فشل الاتصال بالسيرفر');
      btn.disabled = false;
      btn.textContent = 'تأكيد طلب الشحن';
    }
  };
};
