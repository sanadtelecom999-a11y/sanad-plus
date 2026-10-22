// ==========================================
// SANAD PLUS+ Admin Panel v3 (State Management)
// SRE Fixed Version - XSS Protection & Recursion Fix
// ==========================================

// 1. Centralized State
const AppState = {
    deposits: [],
    orders: [],
    users: [],
    kyc: [],
    isLoading: false
};

const API_URL = 'https://sanad-plus-backend.onrender.com';
const getToken = () => localStorage.getItem('admin_token') || localStorage.getItem('token');

// 2. Security Helper (SRE FIX: XSS Protection)
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// 3. Core Fetch Wrapper
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
    };
    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    try {
        const res = await fetch(`${API_URL}${endpoint}`, config);
        if (res.status === 401) {
            alert('انتهت الجلسة، يرجى تسجيل الدخول مجدداً');
            window.location.href = '/login.html';
            return null;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'API Error');
        return data;
    } catch (error) {
        console.error(`[API Error] ${endpoint}:`, error);
        if (typeof showToast === 'function') showToast(error.message, 'error');
        return null;
    }
}

// 4. Data Fetching & Rendering (Deposits)
async function loadDeposits() {
    const container = document.getElementById('depositsContainer');
    if(container) container.innerHTML = '<p style="text-align:center;">جاري تحميل الإيداعات...</p>';
    
    const data = await apiCall('/admin/api/deposits');
    if (data) {
        AppState.deposits = data.deposits || data; 
        renderDeposits();
    }
}

function renderDeposits() {
    const container = document.getElementById('depositsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    if (!AppState.deposits || AppState.deposits.length === 0) {
        container.innerHTML = '<div class="card" style="text-align:center; color:var(--text-muted);"><i class="fas fa-check-circle fa-3x" style="color:var(--success); margin-bottom:10px;"></i><br>لا توجد إيداعات معلقة</div>';
        return;
    }

    AppState.deposits.forEach(deposit => {
        const card = document.createElement('div');
        card.className = 'card';
        card.id = `deposit-${deposit.id}`;
        
        // SRE FIX: تطبيق escapeHtml على كل البيانات القادمة من المستخدم
        const safeTxId = escapeHtml(deposit.transaction_id || 'DEP-' + deposit.id);
        const safeAmount = escapeHtml(deposit.amount);
        const safeUserName = escapeHtml(deposit.user?.first_name || 'غير معروف');
        const safeDate = escapeHtml(new Date(deposit.created_at).toLocaleString('ar-EG'));

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <div>
                    <span class="badge badge-pending">معلق</span>
                    <strong style="margin-right:10px;">${safeTxId}</strong>
                </div>
                <strong style="color:var(--success); font-size:18px;">$${safeAmount}</strong>
            </div>
            <div style="margin-bottom:15px; color:var(--text-muted); font-size:14px;">
                <i class="fas fa-user"></i> ${safeUserName} <br>
                <i class="fas fa-clock"></i> ${safeDate}
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn btn-success" style="flex:1;" onclick="approveDeposit(${deposit.id})">
                    <i class="fas fa-check"></i> قبول
                </button>
                <button class="btn btn-danger" style="flex:1;" onclick="rejectDeposit(${deposit.id})">
                    <i class="fas fa-times"></i> رفض
                </button>
                <button class="btn btn-outline" style="flex:0.5;" onclick="viewDeposit(${deposit.id})">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// 5. Actions
async function rejectDeposit(id) {
    if (!confirm('هل أنت متأكد من رفض الإيداع؟')) return;
    const card = document.getElementById(`deposit-${id}`);
    if (card) card.style.opacity = '0.5';

    const res = await apiCall(`/admin/api/deposits/${id}/reject`, 'POST', { reason: 'رفض من لوحة التحكم' });
    
    if (res) {
        AppState.deposits = AppState.deposits.filter(d => d.id !== id);
        renderDeposits();
        if (typeof showToast === 'function') showToast('تم رفض الإيداع بنجاح', 'success');
    } else {
        if (card) card.style.opacity = '1';
    }
}

async function approveDeposit(id) {
    if (!confirm('هل أنت متأكد من قبول الإيداع؟')) return;
    const card = document.getElementById(`deposit-${id}`);
    if (card) card.style.opacity = '0.5';

    const res = await apiCall(`/admin/api/deposits/${id}/approve`, 'POST');
    
    if (res) {
        AppState.deposits = AppState.deposits.filter(d => d.id !== id);
        renderDeposits();
        if (typeof showToast === 'function') showToast('تم قبول الإيداع بنجاح', 'success');
    } else {
        if (card) card.style.opacity = '1';
    }
}

// SRE FIX: دالة مؤقتة لمنع انهيار الواجهة (سيتم بناؤها في Sprint v3.1)
function viewDeposit(id) {
    alert('عرض تفاصيل الإيداع رقم ' + id + ' قيد التطوير.');
}

// 6. Fetch Orders
async function loadOrders() {
    const container = document.getElementById('ordersContainer');
    if(container) container.innerHTML = '<p style="text-align:center; color: var(--text-muted);">جاري تحميل الطلبات...</p>';
    
    const data = await apiCall('/admin/api/orders');
    if (data) {
        AppState.orders = data.orders || data;
        renderOrders();
    }
}

function renderOrders() {
    const container = document.getElementById('ordersContainer');
    if(!container) return;
    
    container.innerHTML = '';
    if (!AppState.orders || AppState.orders.length === 0) {
        container.innerHTML = '<div class="card" style="text-align:center; color:var(--text-muted);">لا توجد طلبات حالياً</div>';
        return;
    }

    AppState.orders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'card';
        
        // SRE FIX: تطبيق escapeHtml
        const safeOrderNum = escapeHtml(order.order_number || 'ORD-' + order.id);
        const safeTotal = escapeHtml(order.total_price);

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <strong style="color:var(--primary);">${safeOrderNum}</strong>
                <strong>$${safeTotal}</strong>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn btn-success" style="flex:1;" onclick="updateOrderStatus(${order.id}, 'completed')"><i class="fas fa-check"></i> إكمال</button>
                <button class="btn btn-danger" style="flex:1;" onclick="updateOrderStatus(${order.id}, 'failed')"><i class="fas fa-times"></i> رفض</button>
            </div>
        `;
        container.appendChild(card);
    });
}

async function updateOrderStatus(id, status) {
    if (!confirm('هل أنت متأكد؟')) return;
    const res = await apiCall(`/admin/api/orders/${id}/status`, 'POST', { status });
    if (res) {
        if (typeof showToast === 'function') showToast('تم تحديث حالة الطلب بنجاح', 'success');
        loadOrders();
    }
}

// 7. Navigation Logic
function switchSection(sectionId, btnElement) {
    document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
    
    const target = document.getElementById('section-' + sectionId);
    if (target) target.style.display = 'block';

    const titles = {
        'dashboard': 'الرئيسية', 'deposits': 'الإيداعات', 'orders': 'الطلبات',
        'kyc': 'التوثيق', 'users': 'المستخدمين', 'products': 'المنتجات', 'settings': 'الإعدادات'
    };
    
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.innerText = titles[sectionId] || 'لوحة التحكم';

    if (btnElement) {
        document.querySelectorAll('.sidebar .nav-btn').forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
    }

    // SRE FIX: تصحيح الاستدعاء الذاتي (Recursion)
    if (sectionId === 'deposits') loadDeposits();
    if (sectionId === 'orders') loadOrders();
    // سيتم إضافة loadUsers, loadKYC, إلخ في Sprint v3.1
}

// 8. Init
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Admin Panel v3 Loaded (SRE Fixed)');
    if (document.getElementById('depositsContainer')) {
        switchSection('dashboard', null); 
    }
});