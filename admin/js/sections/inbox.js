import { api } from '../core/api.js';

let currentTab = 'orders';
let currentData = [];

export async function renderInbox() {
    const container = document.getElementById('dashboard-container');
    container.innerHTML = `
        <section class="inbox-page">
            <header class="section-header">
                <div>
                    <h2 class="section-title">صندوق الوارد</h2>
                    <p class="section-description">إدارة الطلبات والإيداعات وطلبات توثيق الهوية</p>
                </div>
            </header>

            <div class="inbox-tabs">
                <button class="inbox-tab active" data-tab="orders">الطلبات</button>
                <button class="inbox-tab" data-tab="deposits">الإيداعات</button>
                <button class="inbox-tab" data-tab="kyc">التوثيق</button>
            </div>

            <div id="inbox-list" class="inbox-grid">
                <div class="loading-state"><div class="spinner"></div>جاري التحميل...</div>
            </div>
        </section>
    `;

    document.querySelectorAll('.inbox-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.inbox-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentTab = e.target.dataset.tab;
            loadTabData();
        });
    });

    loadTabData();
}

async function loadTabData() {
    const list = document.getElementById('inbox-list');
    list.innerHTML = `<div class="loading-state"><div class="spinner"></div>جاري التحميل...</div>`;
    
    const endpoint = currentTab === 'orders' ? '/api/admin/orders' : 
                     currentTab === 'deposits' ? '/api/admin/deposits' : '/api/admin/kyc';

    try {
        const res = await api.safeFetch(endpoint);
        if (!res.ok) throw new Error(res.error);
        
        currentData = res.data || [];
        
        if (currentData.length === 0) {
            list.innerHTML = `<div class="empty-state"><strong>لا توجد عناصر</strong><span>لا توجد بيانات في هذا القسم حالياً.</span></div>`;
            return;
        }

        list.innerHTML = currentData.map(item => {
            const title = currentTab === 'orders' ? item.product_name :
                          currentTab === 'deposits' ? item.transaction_id : item.full_name;
            
            const amount = item.total_price !== undefined ? `${item.total_price} $` :
                           item.amount !== undefined ? `${item.amount} $` : '';

            return `
                <article class="inbox-item-card">
                    <div class="inbox-item-top">
                        <span class="status-pill pending">معلق</span>
                        <span>#${item.id}</span>
                    </div>
                    <h3>${title}</h3>
                    <p>${item.user_name || 'مستخدم'}</p>
                    <div class="inbox-amount">${amount}</div>
                    <button class="sanad-btn primary" onclick="window.openInboxItem(${item.id})">مراجعة</button>
                </article>
            `;
        }).join('');
    } catch (error) {
        list.innerHTML = `<div class="empty-state"><strong>خطأ</strong><span>${error.message}</span></div>`;
    }
}

window.openInboxItem = async function(id) {
    const modal = document.getElementById('detail-modal');
    const content = document.getElementById('modal-content');
    document.getElementById('modal-title').textContent = 'تفاصيل العنصر';
    content.innerHTML = `<div class="loading-state"><div class="spinner"></div>جاري جلب التفاصيل...</div>`;
    modal.style.display = 'flex';
    modal.classList.add('show');

    try {
        const res = await api.safeFetch(`/api/admin/${currentTab}/${id}/full`);
        if (!res.ok) throw new Error(res.error);
        
        const data = res.data;
        
        content.innerHTML = `
            <div class="detail-rows">
                ${Object.entries(data.details).map(([key, val]) => `
                    <div class="detail-row"><span>${key}</span><strong>${val}</strong></div>
                `).join('')}
            </div>
            ${data.image ? `<img src="${data.image}" style="width:100%; border-radius:10px; margin-bottom:15px;">` : ''}
            
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="sanad-btn primary" style="flex:1;" onclick="window.actionItem(${id}, 'approve')">قبول</button>
                <button class="sanad-btn secondary" style="flex:1; color:var(--color-danger);" onclick="window.actionItem(${id}, 'reject')">رفض</button>
            </div>
        `;
    } catch (error) {
        content.innerHTML = `<div class="empty-state" style="color:var(--color-danger);">${error.message}</div>`;
    }
};

window.actionItem = async function(id, action) {
    if (!confirm(`هل أنت متأكد من ${action === 'approve' ? 'قبول' : 'رفض'} هذا العنصر؟`)) return;
    
    try {
        const res = await api.safeFetch(`/api/admin/${currentTab}/${id}/${action}`, { method: 'POST' });
        if (!res.ok) throw new Error(res.error);
        
        window.closeModal();
        alert('تمت العملية بنجاح');
        loadTabData();
    } catch (error) {
        alert('خطأ: ' + error.message);
    }
};
