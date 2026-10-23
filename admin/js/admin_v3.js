const API_URL = 'https://sanad-plus-backend.onrender.com';
const getToken = () => localStorage.getItem('admin_token') || localStorage.getItem('token');
let currentSessionId = null;
let dashboardChartInstance = null;

// ... (دوال تسجيل الدخول و OTP كما هي، يمكنك إبقاءها أو نسخها من الرد السابق) ...
async function handleLogin() { /* ... */ }
async function verifyOTP() { /* ... */ }

async function apiCall(endpoint, method = 'GET', body = null) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);
    try {
        const res = await fetch(`${API_URL}${endpoint}`, config);
        if (res.status === 401) { localStorage.removeItem('admin_token'); Swal.fire({title: 'انتهت الجلسة', icon: 'warning'}).then(()=>location.reload()); return null; }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (error) { return null; }
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

async function loadDashboardStats() {
    const data = await apiCall('/admin/api/stats');
    if (data) {
        document.getElementById('statOrders').innerText = data.total_orders || 0;
        document.getElementById('statUsers').innerText = data.total_users || 0;
        document.getElementById('statDeposits').innerText = data.total_deposits || 0;
        document.getElementById('statRevenue').innerText = `$${(data.revenue || 0).toFixed(2)}`;
    }
    initChart();
}
function initChart() {
    const ctx = document.getElementById('dashboardChart');
    if(!ctx) return;
    if(dashboardChartInstance) dashboardChartInstance.destroy(); 
    dashboardChartInstance = new Chart(ctx, { type: 'line', data: { labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'], datasets: [{ label: 'حركة المبيعات ($)', data: [12, 19, 3, 5, 2, 3, 10], borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.1)', fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff' } } } } });
}

// دالة سحرية لاستخراج البيانات سواء كانت مصفوفة أو كائن
function getArrayData(data, key) {
    if (Array.isArray(data)) return data;
    if (data && data[key] && Array.isArray(data[key])) return data[key];
    return [];
}

async function loadInbox() {
    const container = document.getElementById('inboxContainer');
    if(!container) return;
    container.innerHTML = '<div class="col-span-full text-center text-slate-400 animate-pulse py-4">جاري تحميل الإرساليات...</div>';
    const data = await apiCall('/admin/api/deposits');
    const deposits = getArrayData(data, 'deposits');
    if(deposits.length === 0) { container.innerHTML = '<div class="glass col-span-full p-10 rounded-3xl text-center text-slate-400">لا توجد إرساليات جديدة</div>'; return; }
    container.innerHTML = deposits.map(item => `
        <div class="glass bento-card rounded-3xl p-5 border-t-4 border-t-accent">
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center gap-2"><i data-lucide="credit-card" size="18" class="text-slate-400"></i><span class="font-bold text-white">إيداع بمبلغ $${item.amount}</span></div>
                <span class="bg-slate-800 text-xs px-2 py-1 rounded-lg text-slate-300">${item.user?.first_name || 'مستخدم'}</span>
            </div>
            <div class="flex gap-2 mt-4">
                <button onclick="handleDepositAction(${item.id}, 'approve')" class="flex-1 bg-primary hover:bg-emerald-600 text-white py-2 rounded-xl text-sm font-bold">قبول</button>
                <button onclick="handleDepositAction(${item.id}, 'reject')" class="flex-1 bg-danger hover:bg-red-600 text-white py-2 rounded-xl text-sm font-bold">رفض</button>
            </div>
        </div>`).join('');
    lucide.createIcons();
}
async function handleDepositAction(id, action) {
    const isApprove = action === 'approve';
    const result = await Swal.fire({ title: isApprove ? 'تأكيد القبول' : 'تأكيد الرفض', icon: 'warning', showCancelButton: true, confirmButtonColor: isApprove ? '#10b981' : '#ef4444', confirmButtonText: 'نعم', cancelButtonText: 'إلغاء', background: '#1e293b', color: '#fff' });
    if (result.isConfirmed) {
        const res = await apiCall(`/admin/api/deposits/${id}/${action}`, 'POST');
        if(res && res.success) { Swal.fire({icon: 'success', title: 'تمت العملية', timer: 1500, showConfirmButton: false, background: '#1e293b', color: '#fff'}); loadInbox(); }
    }
}

async function loadProducts() {
    const data = await apiCall('/admin/api/products');
    const products = getArrayData(data, 'products');
    const tbody = document.getElementById('productsTableBody');
    if(!tbody) return;
    if(products.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-slate-400">لا توجد منتجات</td></tr>'; return; }
    tbody.innerHTML = products.map(p => `
        <tr class="border-b border-slate-700/50 hover:bg-slate-800/30">
            <td class="font-bold text-white">${p.name}</td>
            <td class="text-primary">${p.product_type === 'quantity' ? 'ديناميكي' : `$${p.price}`}</td>
            <td>${p.category_id}</td><td>${p.product_type === 'quantity' ? 'كمية' : 'ثابت'}</td>
            <td><button onclick="deleteProduct(${p.id}, '${p.name}')" class="bg-red-500/20 text-red-400 px-3 py-1 rounded-lg">حذف</button></td>
        </tr>`).join('');
}

async function loadCategories() {
    const data = await apiCall('/admin/api/categories');
    const categories = getArrayData(data, 'categories');
    const container = document.getElementById('categoriesContainer');
    if(!container) return;
    if(categories.length === 0) { container.innerHTML = '<div class="glass col-span-full p-10 rounded-3xl text-center text-slate-400">لا توجد أقسام</div>'; return; }
    container.innerHTML = categories.map(c => `
        <div class="glass bento-card rounded-3xl p-6 flex flex-col items-center justify-center text-center relative">
            <button onclick="deleteCategory(${c.id}, '${c.name}')" class="absolute top-2 right-2 text-red-500"><i data-lucide="x" size="18"></i></button>
            <img src="${c.image || 'https://via.placeholder.com/40'}" class="w-12 h-12 rounded-xl mb-2 object-cover">
            <span class="font-bold text-white">${c.name}</span>
        </div>`).join('');
    lucide.createIcons();
}

async function loadUsers() {
    const data = await apiCall('/admin/api/users');
    const users = getArrayData(data, 'users');
    if (!users) return;
    document.getElementById('usersTableBody').innerHTML = users.map(user => `
        <tr class="hover:bg-slate-800/30 transition">
            <td><div class="font-bold text-white">${user.first_name}</div><div class="text-xs text-slate-400 font-mono">${user.telegram_id}</div></td>
            <td class="font-bold text-primary">$${user.balance.toFixed(2)}</td>
            <td><span class="px-2 py-1 rounded-full text-xs ${user.kyc_status === 'verified' ? 'bg-primary/20 text-primary' : 'bg-amber-500/20 text-amber-400'}">${user.kyc_status}</span></td>
            <td>${user.vip_level > 0 ? `<span class="text-accent">VIP ${user.vip_level}</span>` : '-'}</td>
            <td><button onclick="editUserBalance(${user.id}, ${user.balance}, '${user.first_name}')" class="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-lg text-sm">تعديل الرصيد</button></td>
        </tr>`).join('');
    lucide.createIcons();
}

// ... (باقي الدوال مثل saveCategory و saveProduct و editUserBalance قم بنسخها من الملف القديم، أو تجاهلها الآن للتركيز على العرض) ...

function switchSection(sectionId, btnElement) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    const target = document.getElementById('section-' + sectionId);
    if (target) { target.classList.remove('hidden'); target.classList.add('block'); }
    const titles = { 'dashboard': 'لوحة التحكم', 'inbox': 'الإرساليات', 'users': 'إدارة المستخدمين', 'products': 'المنتجات', 'categories': 'الأقسام', 'settings': 'الإعدادات' };
    document.getElementById('page-title').innerText = titles[sectionId] || 'لوحة التحكم';
    if (btnElement) {
        document.querySelectorAll('.nav-btn').forEach(btn => { btn.classList.remove('bg-slate-700/50', 'text-white'); btn.classList.add('text-slate-400'); });
        btnElement.classList.remove('text-slate-400'); btnElement.classList.add('bg-slate-700/50', 'text-white');
    }
    if (sectionId === 'dashboard') loadDashboardStats();
    if (sectionId === 'inbox') loadInbox();
    if (sectionId === 'users') loadUsers();
    if (sectionId === 'products') loadProducts();
    if (sectionId === 'categories') loadCategories();
}

function handleLogout() { localStorage.removeItem('admin_token'); localStorage.removeItem('token'); location.reload(); }
window.onload = () => { 
    if (!getToken()) { document.getElementById('loginScreen').style.display = 'flex'; } 
    else { document.getElementById('loginScreen').style.display = 'none'; switchSection('dashboard', document.querySelector('.nav-btn')); } 
};
