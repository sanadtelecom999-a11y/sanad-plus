import { api } from '../core/api.js';

let usersData = [];

export async function renderUsers() {
    const container = document.getElementById('dashboard-container');
    container.innerHTML = `
        <section class="users-page">
            <header class="section-header">
                <h2 class="section-title">إدارة المستخدمين</h2>
            </header>
            <div class="content-card">
                <div class="table-responsive">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>المستخدم</th>
                                <th>Telegram ID</th>
                                <th>الرصيد</th>
                                <th>الحالة</th>
                                <th>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="users-tbody">
                            <tr><td colspan="5" class="loading-state"><div class="spinner"></div>جاري التحميل...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    `;

    try {
        const res = await api.safeFetch('/api/admin/users');
        if (!res.ok) throw new Error(res.error);
        
        usersData = res.data || [];
        const tbody = document.getElementById('users-tbody');
        
        if (usersData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">لا يوجد مستخدمون.</td></tr>`;
            return;
        }

        tbody.innerHTML = usersData.map(user => `
            <tr>
                <td><strong>${user.first_name}</strong></td>
                <td dir="ltr">${user.telegram_id}</td>
                <td style="color:var(--color-success); font-weight:700;">$${Number(user.balance).toFixed(2)}</td>
                <td>
                    <span class="status-pill ${user.is_banned ? 'danger' : 'success'}">
                        ${user.is_banned ? 'محظور' : 'نشط'}
                    </span>
                </td>
                <td>
                    <button class="sanad-btn secondary" onclick="window.openUserEdit(${user.id})">تعديل الرصيد</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        document.getElementById('users-tbody').innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">${error.message}</td></tr>`;
    }
}

window.openUserEdit = function(id) {
    const user = usersData.find(u => u.id === id);
    if (!user) return;

    const modal = document.getElementById('detail-modal');
    const content = document.getElementById('modal-content');
    document.getElementById('modal-title').textContent = `تعديل رصيد: ${user.first_name}`;
    modal.style.display = 'flex';
    modal.classList.add('show');

    content.innerHTML = `
        <form id="edit-balance-form" class="admin-form">
            <div class="detail-row">
                <span>الرصيد الحالي</span>
                <strong>$${Number(user.balance).toFixed(2)}</strong>
            </div>
            
            <label>المبلغ (استخدم - للخصم و + للإضافة)</label>
            <input type="number" step="0.01" id="edit-amount" class="sanad-input" placeholder="مثال: 50 أو -20" required>

            <label>السبب / الملاحظة</label>
            <input type="text" id="edit-reason" class="sanad-input" placeholder="سبب التعديل الإداري" required>
            
            <button type="submit" class="sanad-btn primary" style="margin-top:15px;">تأكيد التعديل</button>
        </form>
    `;

    document.getElementById('edit-balance-form').onsubmit = async (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('edit-amount').value);
        
        // توليد مفتاح فريد لمنع التكرار
        const idempotencyKey = crypto.randomUUID(); 

        try {
            const res = await api.safeFetch(`/api/admin/users/${id}/balance`, {
                method: 'POST',
                body: {
                    amount: amount,
                    idempotency_key: idempotencyKey
                }
            });
            if (!res.ok) throw new Error(res.error);
            
            alert('تم تعديل الرصيد بنجاح');
            window.closeModal();
            renderUsers();
        } catch (error) {
            alert('فشل التعديل: ' + error.message);
        }
    };
};
