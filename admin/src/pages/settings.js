import { apiFetch } from '../api.js';

export async function renderSettings(container) {
  container.innerHTML = `<div class="card-glass" style="max-width:600px;"><div class="skeleton sk-line"></div></div>`;
  try {
    const s = await apiFetch('/api/admin/settings');
    container.innerHTML = `
      <div class="card-glass" style="max-width:600px;">
        <h3 style="margin-bottom:20px;">الإعدادات العامة</h3>
        
        <label class="nav-label">اسم المتجر</label>
        <input type="text" id="set-name" class="input" value="${s.store_name || 'SANAD PLUS'}">
        
        <label class="nav-label">سعر الصرف</label>
        <input type="number" id="set-rate" class="input" value="${s.exchange_rate || '1'}">
        
        <label class="nav-label">وضع الصيانة</label>
        <select id="set-maintenance" class="input">
          <option value="false" ${!s.maintenance_mode ? 'selected' : ''}>معطل (المتجر يعمل)</option>
          <option value="true" ${s.maintenance_mode ? 'selected' : ''}>مفعل (إغلاق المتجر)</option>
        </select>

        <button class="btn btn-primary" onclick="window.saveSettings()" style="width:100%; margin-top:15px;">
          <i data-lucide="save"></i> حفظ الإعدادات
        </button>
      </div>`;
    lucide.createIcons();
  } catch(e) { container.innerHTML = '<p>حدث خطأ في جلب الإعدادات.</p>'; }
}

window.saveSettings = async () => {
  const name = document.getElementById('set-name').value;
  const rate = parseFloat(document.getElementById('set-rate').value);
  const maintenance = document.getElementById('set-maintenance').value === 'true';

  try {
    await apiFetch('/api/admin/settings', { 
      method: 'PUT', 
      body: JSON.stringify({ store_name: name, exchange_rate: rate, maintenance_mode: maintenance }) 
    });
    window.showToast('تم حفظ الإعدادات بنجاح!');
  } catch(e) {}
};
