import { api } from '../core/api.js';

let currentTab = 'products';
let productsData = [];
let categoriesData = [];
let paymentsData = [];

export async function renderStore() {
    const container = document.getElementById('dashboard-container');
    container.innerHTML = `
        <section class="store-page">
            <header class="section-header">
                <h2 class="section-title">إدارة المتجر</h2>
            </header>

            <div class="inbox-tabs">
                <button class="inbox-tab active" data-tab="products">المنتجات</button>
                <button class="inbox-tab" data-tab="categories">التصنيفات</button>
                <button class="inbox-tab" data-tab="payments">طرق الدفع</button>
            </div>

            <div id="store-content">
                <div class="loading-state"><div class="spinner"></div>جاري التحميل...</div>
            </div>
        </section>
    `;

    document.querySelectorAll('.inbox-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.inbox-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentTab = e.target.dataset.tab;
            loadStoreData();
        });
    });

    loadStoreData();
}

async function loadStoreData() {
    const content = document.getElementById('store-content');
    content.innerHTML = `<div class="loading-state"><div class="spinner"></div>جاري التحميل...</div>`;

    try {
        if (currentTab === 'products') {
            const res = await api.safeFetch('/api/admin/products');
            if (!res.ok) throw new Error(res.error);
            productsData = res.data.items || [];
            renderProducts(content);
        } else if (currentTab === 'categories') {
            const res = await api.safeFetch('/api/admin/categories');
            if (!res.ok) throw new Error(res.error);
            categoriesData = res.data || [];
            renderCategories(content);
        } else if (currentTab === 'payments') {
            const res = await api.safeFetch('/api/admin/payment-methods');
            if (!res.ok) throw new Error(res.error);
            paymentsData = res.data || [];
            renderPayments(content);
        }
    } catch (error) {
        content.innerHTML = `<div class="empty-state" style="color:var(--color-danger);"><strong>خطأ</strong><span>${error.message}</span></div>`;
    }
}

function renderProducts(container) {
    if (productsData.length === 0) {
        container.innerHTML = `<div class="empty-state"><strong>لا توجد منتجات</strong></div>`;
        return;
    }
    container.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); gap:15px;">
            ${productsData.map(p => `
                <div class="inbox-item-card">
                    <div class="inbox-item-top">
                        <span class="status-pill success">${p.category_name || 'عام'}</span>
                    </div>
                    <h3>${p.name}</h3>
                    <div class="inbox-amount">$${Number(p.base_price).toFixed(2)}</div>
                    <p>الكمية: ${p.base_quantity} ${p.unit_name}</p>
                    <button class="sanad-btn secondary" disabled style="opacity:0.5; cursor:not-allowed;">تعديل (قريباً)</button>
                </div>
            `).join('')}
        </div>
    `;
}

function renderCategories(container) {
    if (categoriesData.length === 0) {
        container.innerHTML = `<div class="empty-state"><strong>لا توجد تصنيفات</strong></div>`;
        return;
    }
    container.innerHTML = `
        <div class="content-card">
            <div class="table-responsive">
                <table class="admin-table">
                    <thead><tr><th>الاسم</th><th>إجراءات</th></tr></thead>
                    <tbody>
                        ${categoriesData.map(c => `
                            <tr>
                                <td><strong>${c.name}</strong></td>
                                <td><button class="sanad-btn secondary" disabled style="opacity:0.5;">تعديل (قريباً)</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderPayments(container) {
    if (paymentsData.length === 0) {
        container.innerHTML = `<div class="empty-state"><strong>لا توجد طرق دفع</strong></div>`;
        return;
    }
    container.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); gap:15px;">
            ${paymentsData.map(p => `
                <div class="content-card">
                    <h3 style="color:var(--color-primary-light);">${p.name}</h3>
                    <p style="font-family:monospace; direction:ltr; text-align:left;">${p.account}</p>
                    <div class="detail-row"><span>الحد الأدنى</span><strong>$${p.min_amount}</strong></div>
                    <div class="detail-row"><span>الحد الأقصى</span><strong>$${p.max_amount}</strong></div>
                    <button class="sanad-btn secondary" disabled style="opacity:0.5; margin-top:10px;">تعديل (قريباً)</button>
                </div>
            `).join('')}
        </div>
    `;
}
