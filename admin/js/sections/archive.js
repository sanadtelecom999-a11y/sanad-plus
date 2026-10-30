export async function renderArchive() {
    const container = document.getElementById('dashboard-container');
    container.innerHTML = `
        <section class="archive-page">
            <header class="section-header">
                <h2 class="section-title">الأرشيف</h2>
            </header>
            <div class="content-card" style="text-align:center; padding:50px;">
                <h3 style="color:var(--color-text-secondary);">ميزة الأرشيف قيد التطوير</h3>
                <p style="font-size:14px; margin-top:10px; color:var(--color-text-muted);">
                    سيتم إضافة مسار خاص بالأرشيف في الخادم (Backend) قريباً لعرض العمليات المكتملة والمرفوضة.
                </p>
            </div>
        </section>
    `;
}
