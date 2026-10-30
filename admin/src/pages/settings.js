import { apiFetch } from '../api.js';

export async function renderSettings(container) {
  container.innerHTML = `<div class="card-glass" style="max-width:600px;"><div class="skeleton sk-line"></div></div>`;
  try {
    const s = await apiFetch('/api/admin/settings');
    container.innerHTML = `
      <div class="card-glass" style="max-width:600px;">
        <h3 style="margin-bottom:20px;">الإعدادات العامة</h3>
        <label class="nav-label">اسم المتجر</label>
        <input type="text" class="input" value="${s.store_name || ''}" disabled>
        <label class="nav-label">سعر الصرف</label>
        <input type="number" class="input" value="${s.exchange_rate || ''}" disabled>
        <label class="nav-label">وضع الصيانة</label>
        <input type="text" class="input" value="${s.maintenance_mode ? 'مفعل' : 'معطل'}" disabled>
        <p style="color:var(--text-muted); font-size:12px; margin-top:10px;">* الحفظ يتطلب تحديث الخادم.</p>
      </div>`;
  } catch(e) {}
}
