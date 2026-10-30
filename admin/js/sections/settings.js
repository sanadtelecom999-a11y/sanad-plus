import { api } from '../core/api.js';

export async function renderSettings() {
    const container = document.getElementById('dashboard-container');
    container.innerHTML = `<div class="loading-state"><div class="spinner"></div>جاري تحميل الإعدادات...</div>`;

    try {
        const res = await api.safeFetch('/api/admin/settings');
        if (!res.ok) throw new Error(res.error);
        const settings = res.data;

        container.innerHTML = `
            <section class="settings-page">
                <header class="section-header">
                    <h2 class="section-title">الإعدادات العامة</h2>
                </header>
                <form id="settings-form" class="admin-form" style="max-width:600px;">
                    <div class="content-card">
                        <label>اسم المتجر</label>
                        <input type="text" id="set-name" class="sanad-input" value="${settings.store_name || ''}" required>

                        <label style="margin-top:15px; display:block;">سعر الصرف (1 دولار = ؟ ل.س)</label>
                        <input type="number" id="set-rate" class="sanad-input" value="${settings.exchange_rate || 130}" required>

                        <div class="detail-row settings-toggle-row" style="margin-top:15px;">
                            <div>
                                <strong>وضع الصيانة</strong>
                                <p class="section-description">إغلاق المتجر للمستخدمين مؤقتاً.</p>
                            </div>
                            <label class="settings-switch">
                                <input type="checkbox" id="set-maintenance" ${settings.maintenance_mode ? 'checked' : ''}>
                                <span class="settings-switch-slider"></span>
                            </label>
                        </div>
                    </div>
                    <button type="submit" class="sanad-btn primary" style="margin-top:15px;">حفظ الإعدادات</button>
                </form>
            </section>
        `;

        document.getElementById('settings-form').onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            btn.disabled = true; btn.textContent = 'جاري الحفظ...';

            try {
                const payload = {
                    store_name: document.getElementById('set-name').value,
                    exchange_rate: parseFloat(document.getElementById('set-rate').value),
                    maintenance_mode: document.getElementById('set-maintenance').checked
                };
                
                const updateRes = await api.safeFetch('/api/admin/settings', {
                    method: 'PUT',
                    body: payload
                });
                
                if (!updateRes.ok) throw new Error(updateRes.error);
                alert('تم حفظ الإعدادات بنجاح');
            } catch (error) {
                alert('فشل الحفظ: ' + error.message);
            } finally {
                btn.disabled = false; btn.textContent = 'حفظ الإعدادات';
            }
        };
    } catch (error) {
        container.innerHTML = `<div class="empty-state" style="color:red;"><strong>فشل تحميل الإعدادات</strong><span>${error.message}</span></div>`;
    }
}
