// ==========================================
// SANAD PLUS+ Admin Panel v3 (State Management)
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

// 2. Core Fetch Wrapper
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

// 3. Data Fetching & Rendering
async function loadDeposits() {
    const data = await apiCall('/admin/api/deposits');
    if (data) {
        AppState.deposits = data.deposits || data; // Handle different response structures
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
        
        // تصميم البطاقة الجديد
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <div>
                    <span class="badge badge-pending">معلق</span>
                    <strong style="margin-right:10px;">${deposit.transaction_id || 'DEP-' + deposit.id}</strong>
                </div>
                <strong style="color:var(--success); font-size:18px;">$${deposit.amount}</strong>
            </div>
            <div style="margin-bottom:15px; color:var(--text-muted); font-size:14px;">
                <i class="fas fa-user"></i> ${deposit.user?.first_name || 'غير معروف'} <br>
                <i class="fas fa-clock"></i> ${new Date(deposit.created_at).toLocaleString('ar-EG')}
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

// 4. Actions (تحديث الحالة وإعادة الرسم)
async function rejectDeposit(id) {
    if (!confirm('هل أنت متأكد من رفض الإيداع؟')) return;
    
    // تغيير شكل البطاقة مؤقتاً لمنع الضغط المزدوج
    const card = document.getElementById(`deposit-${id}`);
    if (card) card.style.opacity = '0.5';

    const res = await apiCall(`/admin/api/deposits/${id}/reject`, 'POST', { reason: 'رفض من لوحة التحكم' });
    
    if (res) {
        // تحديث الحالة (إزالة الإيداع من المصفوفة)
        AppState.deposits = AppState.deposits.filter(d => d.id !== id);
        // إعادة رسم الجدول بالكامل
        renderDeposits();
        if (typeof showToast === 'function') showToast('تم رفض الإيداع بنجاح', 'success');
    } else {
        if (card) card.style.opacity = '1'; // إعادة البطاقة إذا فشل
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

// 5. Init
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Admin Panel v3 Loaded (State Management Active)');
    // يمكن استدعاء الدوال هنا بناءً على الصفحة الحالية
    if (document.getElementById('depositsContainer')) {
        switchSection('dashboard', null); // Start at dashboard
    }
});


// Navigation Logic
function switchSection(sectionId, btnElement) {
    // إخفاء كل الأقسام
    document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
    
    // إظهار القسم المطلوب
    const target = document.getElementById('section-' + sectionId);
    if (target) target.style.display = 'block';

    // تحديث العناوين والأزرار النشطة
    const titles = {
        'dashboard': 'الرئيسية', 'deposits': 'الإيداعات', 'orders': 'الطلبات',
        'kyc': 'التوثيق', 'users': 'المستخدمين', 'products': 'المنتجات', 'settings': 'الإعدادات'
    };
    document.getElementById('page-title').innerText = titles[sectionId] || 'لوحة التحكم';

    if (btnElement) {
        document.querySelectorAll('.sidebar .nav-btn').forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
    }

    // جلب البيانات عند فتح القسم
    if (sectionId === 'deposits') switchSection('dashboard', null); // Start at dashboard
    if (sectionId === 'orders') loadOrders();
}

// Fetch Orders
async function loadOrders() {
    const container = document.getElementById('ordersContainer');
    container.innerHTML = '<p style="text-align:center; color: var(--text-muted);">جاري تحميل الطلبات...</p>';
    const data = await apiCall('/admin/api/orders');
    if (data) {
        AppState.orders = data.orders || data;
        renderOrders();
    }
}

function renderOrders() {
    const container = document.getElementById('ordersContainer');
    container.innerHTML = '';
    if (!AppState.orders || AppState.orders.length === 0) {
        container.innerHTML = '<div class="card" style="text-align:center; color:var(--text-muted);">لا توجد طلبات حالياً</div>';
        return;
    }

    AppState.orders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <strong style="color:var(--primary);">${order.order_number || 'ORD-' + order.id}</strong>
                <strong>$${order.total_price}</strong>
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
        showToast('تم تحديث حالة الطلب بنجاح', 'success');
        loadOrders();
    }
}
