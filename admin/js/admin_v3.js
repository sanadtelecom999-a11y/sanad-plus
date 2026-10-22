const API_URL = 'https://sanad-plus-backend.onrender.com';
const getToken = () => localStorage.getItem('admin_token') || localStorage.getItem('token');
let currentSessionId = null;
let dashboardChartInstance = null;

// ================= Login & OTP =================
async function handleLogin() {
    const user = document.getElementById('loginUser').value;
    const pass = document.getElementById('loginPass').value;
    if(!user || !pass) return Swal.fire({icon: 'warning', title: 'تنبيه', text: 'أدخل البيانات أولاً', background: '#1e293b', color: '#fff'});

    Swal.fire({ title: 'جاري التحقق...', allowOutsideClick: false, background: '#1e293b', color: '#fff', didOpen: () => Swal.showLoading() });
    try {
        const res = await fetch(`${API_URL}/admin/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();
        Swal.close();
        if (res.ok && data.require_otp) {
            currentSessionId = data.session_id;
            document.getElementById('loginStep1').classList.add('hidden');
            document.getElementById('loginStep2').classList.remove('hidden');
        } else {
            Swal.fire({icon: 'error', title: 'خطأ', text: data.error || 'بيانات غير صحيحة', background: '#1e293b', color: '#fff'});
        }
    } catch (error) { Swal.fire({icon: 'error', title: 'خطأ', text: 'تعذر الاتصال', background: '#1e293b', color: '#fff'}); }
}

async function verifyOTP() {
    const code = document.getElementById('otpCode').value;
    if(!code) return Swal.fire({icon: 'warning', title: 'تنبيه', text: 'أدخل رمز التحقق', background: '#1e293b', color: '#fff'});
    Swal.fire({ title: 'جاري التحقق...', allowOutsideClick: false, background: '#1e293b', color: '#fff', didOpen: () => Swal.showLoading() });
    try {
        const res = await fetch(`${API_URL}/admin/verify-otp`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: currentSessionId, otp_code: code })
        });
        const data = await res.json();
        if (res.ok && data.token) {
            localStorage.setItem('admin_token', data.token);
            Swal.fire({icon: 'success', title: 'مرحباً بك', timer: 1000, showConfirmButton: false, background: '#1e293b', color: '#fff'}).then(() => location.reload());
        } else { Swal.fire({icon: 'error', title: 'خطأ', text: data.error || 'رمز خاطئ', background: '#1e293b', color: '#fff'}); }
    } catch (error) { Swal.fire({icon: 'error', title: 'خطأ', text: 'تعذر الاتصال', background: '#1e293b', color: '#fff'}); }
}

// ================= Helpers =================
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);
    try {
        const res = await fetch(`${API_URL}${endpoint}`, config);
        if (res.status === 401) { handleLogout(); return null; }
        return await res.json();
    } catch (error) { return null; }
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ================= Dashboard Stats & Chart =================
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
    if(dashboardChartInstance) dashboardChartInstance.destroy(); // تدمير الرسم القديم إن وجد
    
    dashboardChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
            datasets: [{
                label: 'حركة المبيعات ($)',
                data: [12, 19, 3, 5, 2, 3, 10], // بيانات تجريبية للشكل، سيتم ربطها لاحقاً
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                fill: true, tension: 0.4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#fff' } } },
            scales: { 
                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }, 
                y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } } 
            }
        }
    });
}

// ================= Navigation =================
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
    if (sectionId === 'users') loadUsers();
    if (sectionId === 'products') loadProducts();
    if (sectionId === 'categories') loadCategories();
}

function handleLogout() { localStorage.removeItem('admin_token'); localStorage.removeItem('token'); location.reload(); }
window.onload = () => { 
    if (!getToken()) { document.getElementById('loginScreen').style.display = 'flex'; } 
    else { 
        document.getElementById('loginScreen').style.display = 'none'; 
        switchSection('dashboard', document.querySelector('.nav-btn')); 
    } 
};
// (ملاحظة: يجب إضافة دوال loadUsers, loadProducts, saveProduct, إلخ من الكود السابق هنا)
