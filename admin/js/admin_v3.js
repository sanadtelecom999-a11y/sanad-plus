// ==========================================
// SANAD PLUS+ Admin Panel v3 (Epic Bento UI)
// ==========================================

const V3State = {
    deposits: [],
    orders: []
};

const API_URL = 'https://sanad-plus-backend.onrender.com';
const getToken = () => localStorage.getItem('admin_token') || localStorage.getItem('token');

// دالة الحماية
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);
    try {
        const res = await fetch(`${API_URL}${endpoint}`, config);
        if (res.status === 401) { handleLogout(); return null; }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'API Error');
        return data;
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'خطأ', text: error.message, background: '#1e293b', color: '#fff' });
        return null;
    }
}

// ================= Actions (SweetAlert2) =================
async function approveDeposit(id) {
    const result = await Swal.fire({
        title: 'هل أنت متأكد؟',
        text: "سيتم قبول الإيداع وإضافة الرصيد للمستخدم.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#ef4444',
        confirmButtonText: 'نعم، قبول',
        cancelButtonText: 'إلغاء',
        background: '#1e293b', color: '#fff'
    });

    if (result.isConfirmed) {
        Swal.fire({ title: 'جاري المعالجة...', allowOutsideClick: false, background: '#1e293b', color: '#fff', didOpen: () => Swal.showLoading() });
        const res = await apiCall(`/admin/api/deposits/${id}/approve`, 'POST');
        if (res) {
            V3State.deposits = V3State.deposits.filter(d => d.id !== id);
            renderDeposits();
            Swal.fire({ icon: 'success', title: 'تم القبول', text: 'تم اعتماد الإيداع بنجاح', timer: 2000, showConfirmButton: false, background: '#1e293b', color: '#fff' });
        }
    }
}

async function rejectDeposit(id) {
    const result = await Swal.fire({
        title: 'رفض الإيداع',
        input: 'text',
        inputPlaceholder: 'سبب الرفض (اختياري)',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'رفض',
        cancelButtonText: 'إلغاء',
        background: '#1e293b', color: '#fff'
    });

    if (result.isConfirmed) {
        Swal.fire({ title: 'جاري الرفض...', allowOutsideClick: false, background: '#1e293b', color: '#fff', didOpen: () => Swal.showLoading() });
        const res = await apiCall(`/admin/api/deposits/${id}/reject`, 'POST', { reason: result.value || 'رفض من لوحة التحكم' });
        if (res) {
            V3State.deposits = V3State.deposits.filter(d => d.id !== id);
            renderDeposits();
            Swal.fire({ icon: 'success', title: 'تم الرفض', timer: 2000, showConfirmButton: false, background: '#1e293b', color: '#fff' });
        }
    }
}

// ================= Rendering (Bento Cards) =================
function renderDeposits() {
    const container = document.getElementById('depositsContainer');
    const totalSpan = document.getElementById('totalPendingDeposits');
    if (!container) return;
    
    container.innerHTML = '';
    if (totalSpan) totalSpan.innerText = V3State.deposits.length;

    if (V3State.deposits.length === 0) {
        container.innerHTML = '<div class="glass col-span-full p-10 rounded-3xl text-center text-slate-400"><i data-lucide="check-circle" class="mx-auto mb-4 text-primary" size="48"></i><h3 class="text-xl">لا توجد إيداعات معلقة</h3></div>';
        lucide.createIcons();
        return;
    }

    V3State.deposits.forEach(dep => {
        const safeTx = escapeHtml(dep.transaction_id || 'DEP-' + dep.id);
        const safeAmount = escapeHtml(dep.amount);
        const safeUser = escapeHtml(dep.user?.first_name || 'غير معروف');
        
        const card = document.createElement('div');
        card.className = 'glass bento-card rounded-3xl p-6 flex flex-col relative overflow-hidden border-t-4 border-t-accent';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <span class="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded-full">معلق</span>
                    <div class="font-mono text-slate-400 mt-2 text-sm">${safeTx}</div>
                </div>
                <div class="text-2xl font-bold text-white">$${safeAmount}</div>
            </div>
            <div class="flex items-center gap-2 text-slate-300 mb-6">
                <i data-lucide="user" size="16" class="text-accent"></i> ${safeUser}
            </div>
            <div class="flex gap-2 mt-auto">
                <button onclick="approveDeposit(${dep.id})" class="flex-1 bg-primary hover:bg-emerald-600 text-white py-2 rounded-xl transition flex items-center justify-center gap-2 font-bold"><i data-lucide="check" size="18"></i> قبول</button>
                <button onclick="rejectDeposit(${dep.id})" class="flex-1 bg-danger hover:bg-red-600 text-white py-2 rounded-xl transition flex items-center justify-center gap-2 font-bold"><i data-lucide="x" size="18"></i> رفض</button>
            </div>
        `;
        container.appendChild(card);
    });
    lucide.createIcons(); // تحديث الأيقونات
}

async function loadDeposits() {
    document.getElementById('depositsContainer').innerHTML = '<div class="col-span-full text-center text-accent animate-pulse py-10">جاري تحميل الإيداعات...</div>';
    const data = await apiCall('/admin/api/deposits');
    if (data) {
        V3State.deposits = data.deposits || data;
        renderDeposits();
    }
}

async function loadOrders() {
    document.getElementById('ordersContainer').innerHTML = '<div class="col-span-full text-center text-accent animate-pulse py-10">جاري تحميل الطلبات...</div>';
    const data = await apiCall('/admin/api/orders');
    const container = document.getElementById('ordersContainer');
    const totalSpan = document.getElementById('totalPendingOrders');
    
    if (data) {
        V3State.orders = data.orders || data;
        if (totalSpan) totalSpan.innerText = V3State.orders.length;
        
        container.innerHTML = '';
        if(V3State.orders.length === 0) {
            container.innerHTML = '<div class="glass col-span-full p-10 rounded-3xl text-center text-slate-400">لا توجد طلبات</div>';
            return;
        }
        V3State.orders.forEach(order => {
            const card = document.createElement('div');
            card.className = 'glass bento-card rounded-3xl p-6 border-t-4 border-t-accent';
            card.innerHTML = `
                <div class="flex justify-between items-center mb-4">
                    <span class="font-bold text-accent">${escapeHtml(order.order_number || order.id)}</span>
                    <span class="text-xl font-bold text-white">$${escapeHtml(order.total_price)}</span>
                </div>
                <button onclick="updateOrderStatus(${order.id}, 'completed')" class="w-full bg-primary py-2 rounded-xl text-white font-bold hover:bg-emerald-600 transition">إكمال الطلب</button>
            `;
            container.appendChild(card);
        });
    }
}

// ================= Navigation & Init =================
function switchSection(sectionId, btnElement) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    
    const target = document.getElementById('section-' + sectionId);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('block');
    }

    const titles = { 'dashboard': 'الرئيسية', 'deposits': 'الإيداعات', 'orders': 'الطلبات' };
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.innerText = titles[sectionId] || 'لوحة التحكم';

    if (btnElement) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('bg-slate-700/50', 'text-white'));
        btnElement.classList.add('bg-slate-700/50', 'text-white');
    }

    if (sectionId === 'deposits') loadDeposits();
    if (sectionId === 'orders') loadOrders();
}

async function loadAllData() {
    await loadDeposits();
    await loadOrders();
    // Hide login, show app
    document.getElementById('loginScreen').style.display = 'none';
    switchSection('dashboard', document.querySelector('.nav-btn'));
}

function handleLogout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('token');
    location.reload();
}

window.onload = () => {
    if (!getToken()) {
        document.getElementById('loginScreen').style.display = 'flex';
    } else {
        loadAllData();
    }
};
