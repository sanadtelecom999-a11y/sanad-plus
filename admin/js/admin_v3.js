const API_URL = 'https://sanad-plus-backend.onrender.com';
const getToken = () => localStorage.getItem('admin_token') || localStorage.getItem('token');
let currentSessionId = null;
let dashboardChartInstance = null;
let currentInboxTab = 'deposits';
let inboxInterval = null;

// ================= Login & OTP =================
async function handleLogin() {
    const user = document.getElementById('loginUser').value;
    const pass = document.getElementById('loginPass').value;
    if(!user || !pass) return Swal.fire({icon: 'warning', title: 'تنبيه', text: 'أدخل البيانات أولاً', background: '#1e293b', color: '#fff'});
    Swal.fire({ title: 'جاري التحقق...', allowOutsideClick: false, background: '#1e293b', color: '#fff', didOpen: () => Swal.showLoading() });
    try {
        const res = await fetch(`${API_URL}/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password: pass }) });
        const data = await res.json();
        Swal.close();
        if (res.ok && data.require_otp) {
            currentSessionId = data.session_id;
            document.getElementById('loginStep1').classList.add('hidden');
            document.getElementById('loginStep2').classList.remove('hidden');
            Swal.fire({icon: 'info', title: 'تم الإرسال', text: 'تفقد حسابك في تليجرام', background: '#1e293b', color: '#fff'});
        } else { Swal.fire({icon: 'error', title: 'خطأ', text: data.error || 'بيانات غير صحيحة', background: '#1e293b', color: '#fff'}); }
    } catch (error) { Swal.fire({icon: 'error', title: 'خطأ', text: 'تعذر الاتصال', background: '#1e293b', color: '#fff'}); }
}

async function verifyOTP() {
    const code = document.getElementById('otpCode').value;
    if(!code) return Swal.fire({icon: 'warning', title: 'تنبيه', text: 'أدخل رمز التحقق', background: '#1e293b', color: '#fff'});
    Swal.fire({ title: 'جاري التحقق...', allowOutsideClick: false, background: '#1e293b', color: '#fff', didOpen: () => Swal.showLoading() });
    try {
        const res = await fetch(`${API_URL}/admin/verify-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: currentSessionId, otp_code: code }) });
        const data = await res.json();
        if (res.ok && data.token) {
            localStorage.setItem('admin_token', data.token);
            Swal.fire({icon: 'success', title: 'مرحباً بك', timer: 1000, showConfirmButton: false, background: '#1e293b', color: '#fff'}).then(() => location.reload());
        } else { Swal.fire({icon: 'error', title: 'خطأ', text: data.error || 'رمز خاطئ', background: '#1e293b', color: '#fff'}); }
    } catch (error) { Swal.fire({icon: 'error', title: 'خطأ', text: 'تعذر الاتصال', background: '#1e293b', color: '#fff'}); }
}

// ================= Helpers =================
function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) { preview.src = e.target.result; preview.classList.remove('hidden'); }
        reader.readAsDataURL(input.files[0]);
    } else { preview.src = ''; preview.classList.add('hidden'); }
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);
    try {
        const res = await fetch(`${API_URL}${endpoint}`, config);
        if (res.status === 401) { localStorage.removeItem('admin_token'); Swal.fire({title: 'انتهت الجلسة', icon: 'warning', background: '#1e293b', color: '#fff'}).then(()=>location.reload()); return null; }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (error) { console.error(`API Error [${endpoint}]:`, error); return null; }
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ================= Dashboard =================
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

// ================= Inbox (Tabs + Auto Refresh) =================
function switchInboxTab(tab, btn) {
    currentInboxTab = tab;
    document.querySelectorAll('#inboxTabs .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadInbox();
}

async function loadInbox() {
    const container = document.getElementById('inboxContainer');
    if(!container) return;
    container.innerHTML = '<div class="col-span-full text-center text-slate-400 animate-pulse py-4">جاري التحميل...</div>';
    
    let endpoint = '/admin/api/deposits';
    if(currentInboxTab === 'orders') endpoint = '/admin/api/orders';
    if(currentInboxTab === 'kyc') endpoint = '/admin/api/kyc';
    if(currentInboxTab === 'services') endpoint = '/admin/api/services';

    const data = await apiCall(endpoint);
    const items = Array.isArray(data) ? data : [];

    if(items.length === 0) {
        container.innerHTML = '<div class="glass col-span-full p-10 rounded-3xl text-center text-slate-400">لا توجد عناصر في هذا القسم حالياً</div>';
        return;
    }

    container.innerHTML = items.map(item => {
        if(currentInboxTab === 'deposits') {
            return `<div class="glass bento-card rounded-3xl p-5 border-t-4 border-t-accent"><div class="flex justify-between mb-3"><span class="text-white font-bold">إيداع $${item.amount}</span><span class="text-xs bg-slate-800 px-2 py-1 rounded-lg">${item.user?.first_name || 'مستخدم'}</span></div><div class="flex gap-2"><button class="flex-1 bg-primary py-2 rounded-xl text-sm font-bold text-white">قبول</button><button class="flex-1 bg-danger py-2 rounded-xl text-sm font-bold text-white">رفض</button></div></div>`;
        }
        if(currentInboxTab === 'orders') {
            return `<div class="glass bento-card rounded-3xl p-5 border-t-4 border-t-primary"><div class="flex justify-between mb-3"><span class="text-white font-bold">طلب ${item.order_number}</span><span class="text-xs bg-slate-800 px-2 py-1 rounded-lg">$${item.total_price}</span></div><p class="text-sm text-slate-400">${item.product_name}</p></div>`;
        }
        if(currentInboxTab === 'kyc') {
            return `<div class="glass bento-card rounded-3xl p-5 border-t-4 border-t-warning"><div class="flex justify-between mb-3"><span class="text-white font-bold">توثيق حساب</span><span class="text-xs bg-slate-800 px-2 py-1 rounded-lg">${item.user_name}</span></div><p class="text-sm text-slate-400">الاسم: ${item.full_name}</p></div>`;
        }
    }).join('');
    lucide.createIcons();
}

// Auto-refresh every 30 seconds if on inbox tab
setInterval(() => {
    const inboxSection = document.getElementById('section-inbox');
    if(inboxSection && !inboxSection.classList.contains('hidden')) {
        loadInbox();
    }
}, 30000);

// ================= Audit =================
async function loadAudit() {
    const tbody = document.getElementById('auditTableBody');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-slate-400 animate-pulse">جاري تحميل السجل...</td></tr>';
    
    const data = await apiCall('/admin/api/audit');
    const logs = Array.isArray(data) ? data : [];
    
    if(logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-slate-400">لا توجد عمليات مسجلة حالياً</td></tr>';
        return;
    }

    tbody.innerHTML = logs.map(l => `
        <tr class="border-b border-slate-700/50 hover:bg-slate-800/30">
            <td class="font-bold text-white">${l.action}</td>
            <td class="${l.amount > 0 ? 'text-primary' : 'text-danger'}">${l.amount > 0 ? '+' : ''}$${l.amount}</td>
            <td class="text-slate-400">$${l.before}</td>
            <td class="text-slate-400">$${l.after}</td>
            <td class="text-xs text-slate-500">${new Date(l.date).toLocaleString('ar-EG')}</td>
        </tr>
    `).join('');
}

// ================= Other Sections =================
async function loadProducts() {
    const data = await apiCall('/admin/api/products');
    const products = Array.isArray(data) ? data : [];
    document.getElementById('productsTableBody').innerHTML = products.map(p => `
        <tr class="border-b border-slate-700/50 hover:bg-slate-800/30">
            <td class="font-bold text-white">${p.name}</td>
            <td class="text-primary">${p.product_type === 'quantity' ? 'ديناميكي' : `$${p.price}`}</td>
            <td>${p.category_id}</td><td>${p.product_type === 'quantity' ? 'كمية' : 'ثابت'}</td>
            <td><button class="bg-red-500/20 text-red-400 px-3 py-1 rounded-lg">حذف</button></td>
        </tr>`).join('');
}

async function loadCategories() {
    const data = await apiCall('/admin/api/categories');
    const categories = Array.isArray(data) ? data : [];
    document.getElementById('categoriesContainer').innerHTML = categories.map(c => `
        <div class="glass bento-card rounded-3xl p-6 flex flex-col items-center justify-center text-center relative">
            <button class="absolute top-2 right-2 text-red-500"><i data-lucide="x" size="18"></i></button>
            <img src="${c.image || 'https://via.placeholder.com/40'}" class="w-12 h-12 rounded-xl mb-2 object-cover">
            <span class="font-bold text-white">${c.name}</span>
        </div>`).join('');
    lucide.createIcons();
}

async function loadUsers() {
    const data = await apiCall('/admin/api/users');
    const users = Array.isArray(data) ? data : [];
    document.getElementById('usersTableBody').innerHTML = users.map(user => `
        <tr class="hover:bg-slate-800/30 transition">
            <td><div class="font-bold text-white">${user.first_name}</div><div class="text-xs text-slate-400 font-mono">${user.telegram_id}</div></td>
            <td class="font-bold text-primary">$${user.balance.toFixed(2)}</td>
            <td><span class="px-2 py-1 rounded-full text-xs ${user.kyc_status === 'verified' ? 'bg-primary/20 text-primary' : 'bg-amber-500/20 text-amber-400'}">${user.kyc_status}</span></td>
            <td>${user.vip_level > 0 ? `<span class="text-accent">VIP ${user.vip_level}</span>` : '-'}</td>
            <td><button class="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-lg text-sm">تعديل</button></td>
        </tr>`).join('');
    lucide.createIcons();
}

// ================= Navigation =================
function switchSection(sectionId, btnElement) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    const target = document.getElementById('section-' + sectionId);
    if (target) { target.classList.remove('hidden'); target.classList.add('block'); }
    
    const titles = { 'dashboard': 'لوحة التحكم', 'inbox': 'الإرساليات', 'users': 'إدارة المستخدمين', 'products': 'المنتجات', 'categories': 'الأقسام', 'audit': 'التدقيق المالي', 'payments': 'طرق الدفع', 'notifications': 'الإشعارات', 'settings': 'الإعدادات' };
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
    if (sectionId === 'audit') loadAudit();
}

function handleLogout() { localStorage.removeItem('admin_token'); localStorage.removeItem('token'); location.reload(); }
window.onload = () => { 
    if (!getToken()) { document.getElementById('loginScreen').style.display = 'flex'; } 
    else { document.getElementById('loginScreen').style.display = 'none'; switchSection('dashboard', document.querySelector('.nav-btn')); } 
};
