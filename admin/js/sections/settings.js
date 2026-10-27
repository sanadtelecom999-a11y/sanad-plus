import { api } from '../core/api.js';

export async function renderSettings() {
  const container = document.getElementById('dashboard-container');
  container.innerHTML = `
    <div style="max-width:600px; margin:0 auto;">
      <h2 style="font-size:18px; margin-bottom:20px;">إعدادات المتجر</h2>
      <div class="sanad-card" style="padding:24px;">
        <form id="settings-form" style="display:flex; flex-direction:column; gap:20px;">
          <div>
            <label style="display:block; font-size:13px; color:#91a7c2; margin-bottom:8px;">اسم المتجر</label>
            <input type="text" id="set-store-name" class="sanad-input" placeholder="SANAD+ Store">
          </div>
          <div>
            <label style="display:block; font-size:13px; color:#91a7c2; margin-bottom:8px;">سعر صرف الليرة السورية</label>
            <input type="number" id="set-exchange-rate" class="sanad-input" placeholder="15000">
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; background:#0b1b2f; padding:16px; border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
            <div>
              <h4 style="margin:0 0 4px 0; font-size:14px;">وضع الصيانة</h4>
              <p style="margin:0; font-size:12px; color:#91a7c2;">إغلاق واجهة المستخدم مؤقتاً.</p>
            </div>
            <input type="checkbox" id="set-maintenance" style="width:20px; height:20px; accent-color:#38bdf8;">
          </div>
          <div id="settings-msg" style="font-size:13px; display:none;"></div>
          <button type="submit" id="settings-save-btn" class="sanad-btn sanad-btn-primary" style="padding:12px;">حفظ الإعدادات</button>
        </form>
      </div>
    </div>
  `;

  await loadSettings();

  document.getElementById('settings-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('settings-save-btn');
    const msg = document.getElementById('settings-msg');
    btn.disabled = true; btn.textContent = 'جاري الحفظ...'; msg.style.display = 'none';

    const res = await api.safeFetch('/api/admin/settings', { method: 'PUT', body: { store_name: document.getElementById('set-store-name').value, exchange_rate: parseFloat(document.getElementById('set-exchange-rate').value), maintenance_mode: document.getElementById('set-maintenance').checked } });
    btn.disabled = false; btn.textContent = 'حفظ الإعدادات';

    if (res.ok) { msg.textContent = 'تم الحفظ بنجاح.'; msg.style.color = '#34d399'; msg.style.display = 'block'; setTimeout(() => msg.style.display = 'none', 3000); }
    else { msg.textContent = 'فشل: ' + res.error; msg.style.color = '#fb7185'; msg.style.display = 'block'; }
  };
}

async function loadSettings() {
  const res = await api.safeFetch('/api/admin/settings');
  if (res.ok && res.data) {
    document.getElementById('set-store-name').value = res.data.store_name || '';
    document.getElementById('set-exchange-rate').value = res.data.exchange_rate || '';
    document.getElementById('set-maintenance').checked = res.data.maintenance_mode === true;
  }
}
