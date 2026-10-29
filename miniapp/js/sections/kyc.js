import { safeFetch } from '../core/api.js';

const syrianGovernorates = ["دمشق", "ريف دمشق", "حلب", "حمص", "حماة", "اللاذقية", "طرطوس", "إدلب", "درعا", "السويداء", "القنيطرة", "دير الزور", "الرقة", "الحسكة"];

export async function openKYC() {
  const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  const modal = document.getElementById('kyc-modal');
  const body = document.getElementById('kyc-body');
  
  if (!modal) { console.error('KYC Modal not found'); return; }
  modal.classList.add('active');
  body.innerHTML = `<div style="text-align:center; padding:20px;">جاري التحقق من الحالة...</div>`;

  const status = await safeFetch(`/api/kyc/status`);
  
  if (status && status.status === 'approved') {
    body.innerHTML = `
      <div style="text-align:center; padding:20px 0;">
        <svg style="width:60px; height:60px; color:var(--success); margin:0 auto 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <h3 style="color:var(--success); font-size:20px; margin-bottom:8px;">حسابك موثق بالفعل</h3>
        <p style="color:var(--text-muted); font-size:14px;">الاسم الموثق: <strong>${status.full_name}</strong></p>
      </div>
    `;
    return;
  }

  if (status && status.status === 'pending') {
    body.innerHTML = `
      <div style="text-align:center; padding:20px 0;">
        <svg style="width:60px; height:60px; color:var(--warning); margin:0 auto 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <h3 style="color:var(--warning); font-size:20px; margin-bottom:8px;">طلبك قيد المراجعة</h3>
        <p style="color:var(--text-muted); font-size:14px;">يرجى الانتظار، سيتم مراجعة طلبك قريباً.</p>
      </div>
    `;
    return;
  }

  // نموذج KYC
  body.innerHTML = `
    <form id="kyc-form" style="padding-bottom:20px;">
      <div class="form-group">
        <label>الاسم الكامل (كما في الهوية)</label>
        <input type="text" name="full_name" class="form-control" required>
      </div>
      <div class="form-group">
        <label>رقم الجوال</label>
        <input type="tel" name="phone" class="form-control" required placeholder="09XXXXXXXX">
      </div>
      <div class="form-group">
        <label>المحافظة</label>
        <select name="governorate" id="kyc-gov" class="form-control" required>
          <option value="">اختر المحافظة...</option>
          ${syrianGovernorates.map(g => `<option value="${g}">${g}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" id="region-group" style="display:none;">
        <label>المنطقة / الحي</label>
        <input type="text" name="region" class="form-control" required>
      </div>
      
      <div class="form-group">
        <label>صورة الهوية (أمامية)</label>
        <div class="file-upload">
          <input type="file" name="id_front" id="id_front" accept="image/*" required>
          <label for="id_front">اضغط لرفع الصورة</label>
          <div id="preview-front" style="margin-top:10px; font-size:12px; color:var(--success);"></div>
        </div>
      </div>

      <div class="form-group">
        <label>صورة سيلفي مع الهوية</label>
        <div class="file-upload">
          <input type="file" name="selfie" id="selfie" accept="image/*" required>
          <label for="selfie">اضغط لرفع الصورة</label>
          <div id="preview-selfie" style="margin-top:10px; font-size:12px; color:var(--success);"></div>
        </div>
      </div>

      <button type="submit" class="sanad-btn" style="width:100%; background:var(--primary); color:white; padding:14px; border-radius:12px; font-weight:bold; border:none; font-family:inherit; margin-top:10px;">إرسال طلب التوثيق</button>
    </form>
  `;

  // إظهار المنطقة عند اختيار المحافظة
  document.getElementById('kyc-gov').addEventListener('change', (e) => {
    document.getElementById('region-group').style.display = e.target.value ? 'block' : 'none';
  });

  // معاينة الصور
  document.getElementById('id_front').addEventListener('change', (e) => {
    if(e.target.files[0]) document.getElementById('preview-front').textContent = 'تم اختيار الصورة ✓';
  });
  document.getElementById('selfie').addEventListener('change', (e) => {
    if(e.target.files[0]) document.getElementById('preview-selfie').textContent = 'تم اختيار الصورة ✓';
  });

  // إرسال النموذج
  document.getElementById('kyc-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'جاري الإرسال...';

    const formData = new FormData(e.target);
    try {
      const res = await fetch('https://sanad-plus-backend.onrender.com/api/kyc/submit', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (res.ok) {
        modal.classList.remove('active');
        alert('تم إرسال طلب التوثيق بنجاح! يرجى الانتظار للمراجعة.');
      } else {
        alert('خطأ: ' + (data.error || 'حدث خطأ'));
        btn.disabled = false;
        btn.textContent = 'إرسال طلب التوثيق';
      }
    } catch (err) {
      alert('خطأ في الاتصال بالسيرفر');
      btn.disabled = false;
      btn.textContent = 'إرسال طلب التوثيق';
    }
  };
}
