import { api } from '../core/api.js';
import { escapeHtml } from '../core/utils.js';

export async function openKYC() {
  const modal = document.getElementById('app-modal');
  const content = document.getElementById('modal-content');
  modal.classList.add('active');
  content.innerHTML = '<div style="text-align:center; padding:20px;">جاري التحقق من حالة التوثيق...</div>';

  try {
    const status = await api.get('/api/kyc/status');
    
    if (status.status === 'approved') {
      content.innerHTML = `
        <div style="text-align:center; padding:20px;">
          <div style="font-size:40px; margin-bottom:10px;">✅</div>
          <h3 style="color:var(--success);">حسابك موثق بالفعل</h3>
          <p style="color:var(--text-muted);">الاسم: ${escapeHtml(status.full_name)}</p>
        </div>
      `;
      return;
    }

    if (status.status === 'pending') {
      content.innerHTML = `
        <div style="text-align:center; padding:20px;">
          <div style="font-size:40px; margin-bottom:10px;">⏳</div>
          <h3 style="color:var(--warning);">طلبك قيد المراجعة</h3>
          <p style="color:var(--text-muted);">يرجى الانتظار، سيتم مراجعة طلبك قريباً.</p>
        </div>
      `;
      return;
    }

    // نموذج التوثيق
    content.innerHTML = `
      <h3 style="margin-top:0; text-align:center;">توثيق الحساب</h3>
      <form id="kyc-form">
        <div class="form-group">
          <label class="form-label">الاسم الكامل (كما في الهوية)</label>
          <input type="text" id="kyc-name" class="form-input" required>
        </div>
        <div class="form-group">
          <label class="form-label">رقم الجوال</label>
          <input type="tel" id="kyc-phone" class="form-input" required>
        </div>
        <div class="form-group">
          <label class="form-label">العنوان / المحافظة</label>
          <input type="text" id="kyc-address" class="form-input" required>
        </div>
        <div class="form-group">
          <label class="form-label">صورة الهوية</label>
          <input type="file" id="kyc-id" class="form-input" accept="image/*" required>
        </div>
        <div class="form-group">
          <label class="form-label">صورة سيلفي مع الهوية</label>
          <input type="file" id="kyc-selfie" class="form-input" accept="image/*" required>
        </div>
        <button type="submit" class="btn-primary" id="kyc-btn">إرسال الطلب</button>
      </form>
    `;

    document.getElementById('kyc-form').onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('kyc-btn');
      btn.disabled = true; btn.textContent = 'جاري الإرسال...';

      const formData = new FormData();
      formData.append('full_name', document.getElementById('kyc-name').value);
      formData.append('phone', document.getElementById('kyc-phone').value);
      formData.append('address', document.getElementById('kyc-address').value);
      formData.append('id_front', document.getElementById('kyc-id').files[0]);
      formData.append('selfie', document.getElementById('kyc-selfie').files[0]);

      try {
        await api.postForm('/api/kyc/submit', formData);
        modal.classList.remove('active');
        alert('تم إرسال طلب التوثيق بنجاح! يرجى الانتظار للمراجعة.');
      } catch (err) {
        alert('خطأ: ' + err.message);
        btn.disabled = false; btn.textContent = 'إرسال الطلب';
      }
    };

  } catch (err) {
    content.innerHTML = `<div style="color:var(--danger); text-align:center;">${err.message}</div>`;
  }
}
