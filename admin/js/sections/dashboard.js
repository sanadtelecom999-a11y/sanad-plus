import { api } from '../core/api.js';

export async function renderDashboard() {
    const container = document.getElementById('dashboard-container');
    container.innerHTML = `<div class="loading-state"><div class="spinner"></div>جاري تحميل الإحصائيات...</div>`;

    try {
        const res = await api.getStats();
        if (!res.ok) throw new Error(res.error);

        const stats = res.data;
        
        container.innerHTML = `
            <section class="dashboard-page">
                <header class="section-header">
                    <div>
                        <h2 class="section-title">لوحة المعلومات</h2>
                        <p class="section-description">نظرة عامة على أداء المنصة</p>
                    </div>
                </header>

                <div class="stats-grid">
                    <div class="stat-card" onclick="window.location.hash='#users'" style="cursor:pointer;">
                        <span class="stat-label">إجمالي المستخدمين</span>
                        <strong class="stat-value">${Number(stats.total_users || 0).toLocaleString('en-US')}</strong>
                    </div>
                    <div class="stat-card" onclick="window.location.hash='#inbox'" style="cursor:pointer;">
                        <span class="stat-label">إجمالي الطلبات</span>
                        <strong class="stat-value">${Number(stats.total_orders || 0).toLocaleString('en-US')}</strong>
                    </div>
                    <div class="stat-card" onclick="window.location.hash='#inbox'" style="cursor:pointer;">
                        <span class="stat-label">الإيداعات المعتمدة</span>
                        <strong class="stat-value">${Number(stats.total_deposits || 0).toLocaleString('en-US')}</strong>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">إجمالي الإيرادات</span>
                        <strong class="stat-value">$${Number(stats.revenue || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
                    </div>
                </div>

                <div class="content-card" style="margin-top:20px; text-align:center; padding:40px;">
                    <h3 style="color:var(--color-text-secondary);">الرسوم البيانية والتحليلات المتقدمة</h3>
                    <p style="font-size:13px; margin-top:10px;">سيتم إضافة الرسوم البيانية هنا في التحديث القادم بعد تجميع بيانات كافية.</p>
                </div>
            </section>
        `;
    } catch (error) {
        container.innerHTML = `<div class="empty-state"><strong>تعذر تحميل الإحصائيات</strong><span>${error.message}</span></div>`;
    }
}
