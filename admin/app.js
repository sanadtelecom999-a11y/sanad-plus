const API_BASE = 'https://sanad-plus-backend.onrender.com';
let currentSessionId = null;
let dashboardChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('admin_token')) {
        document.getElementById('loginScreen').classList.remove('hidden');
    } else {
        showDashboard();
    }
});

// ================= Login & OTP =================
async function handleLogin() {
    const user = document.getElementById('loginUser').value;
    const pass = document.getElementById('loginPass').value;
    const btn = document.getElementById('loginBtn');
    
    if (!user || !pass) return Swal.fire({icon: 'warning', title: 'تنبيه', text: 'أدخل البيانات أولاً', background: '#1e293b', color: '#fff'});
    
    btn.textContent = 'جاري التحقق...'; btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();
        if (res.ok && data.require_otp) {
            currentSessionId = data.session_id;
            document.getElementById('loginStep1').classList.add('hidden');
            document.getElementById('loginStep2').classList.remove('hidden');
            Swal.fire({icon: 'info', title: 'تم الإرسال', text: 'تفقد حسابك في تليجرام', background: '#1e293b', color: '#fff'});
        } else {
            Swal.fire({icon: 'error', title: 'خطأ', text: data.error || 'بيانات غير صحيحة', background: '#1e293b', color: '#fff'});
        }
    } catch (e) { Swal.fire({icon: 'error', title: 'خطأ', text: 'تعذر الاتصال', background: '#1e293b', color: '#fff'}); } 
    finally { btn.textContent = 'تسجيل الدخول'; btn.disabled = false; }
}

async function verifyOTP() {
    const code = document.getElementById('otpCode').value;
    const btn = document.getElementById('otpBtn');
    if (!code) return Swal.fire({icon: 'warning', title: 'تنبيه', text: 'أدخل رمز التحقق', background: '#1e293b', color: '#fff'});
    
    btn.textContent = 'جاري التحقق...'; btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/admin/verify-otp`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: currentSessionId, otp_code: code })
        });
        const data = await res.json();
        if (res.ok && data.token) {
            localStorage.setItem('admin_token', data.token);
            Swal.fire({icon: 'success', title: 'مرحباً بك', timer: 1000, showConfirmButton: false, background: '#1e293b', color: '#fff'}).then(() => location.reload());
        } else { Swal.fire({icon: 'error', title: 'خطأ', text: data.error || 'رمز خاطئ', background: '#1e293b', color: '#fff'}); } 
    } catch (e) { Swal.fire({icon: 'error', title: 'خطأ', text: 'تعذر الاتصال', background: '#1e293b', color: '#fff'}); } 
    finally { btn.textContent = 'تأكيد الرمز'; btn.disabled = false; }
}

function logout() {
    localStorage.removeItem('admin_token');
    location.reload();
}

function getHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` };
}

// ================= Dashboard & Navigation =================
function showDashboard() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboardScreen').classList.remove('hidden');
    loadDashboardStats();
    initChart();
    lucide.createIcons();
}

function switchSection(sectionId, btn) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    const target = document.getElementById('section-' + sectionId);
    if (target) target.classList.remove('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active', 'bg-slate-700/50', 'text-white'));
    if (btn) btn.classList.add('active', 'bg-slate-700/50', 'text-white');
    
    const titles = { 'dashboard': 'لوحة التحكم', 'inbox': 'الإرساليات', 'users': 'إدارة المستخدمين', 'products': 'المنتجات', 'categories': 'الأقسام', 'audit': 'التدقيق المالي', 'payments': 'طرق الدفع', 'notifications': 'الإشعارات', 'settings': 'الإعدادات', 'archive': 'الأرشيف' };
    document.getElementById('page-title').innerText = titles[sectionId] || 'لوحة التحكم';
    
    // Close mobile sidebar if open
    document.querySelector('aside').classList.remove('open');
}

function toggleSidebar() {
    document.querySelector('aside').classList.toggle('open');
}

// ================= Stats & Chart =================
async function loadDashboardStats() {
    try {
        const res = await fetch(`${API_BASE}/admin/api/stats`, { headers: getHeaders() });
        if (res.ok) {
            const data = await res.json();
            document.getElementById('statOrders').innerText = data.total_orders || 0;
            document.getElementById('statUsers').innerText = data.total_users || 0;
            document.getElementById('statDeposits').innerText = data.total_deposits || 0;
            document.getElementById('statRevenue').innerText = `$${(data.revenue || 0).toFixed(2)}`;
        }
    } catch (e) { console.error(e); }
}

function initChart() {
    const ctx = document.getElementById('dashboardChart');
    if(!ctx) return;
    if(dashboardChartInstance) dashboardChartInstance.destroy(); 
    
    dashboardChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
            datasets: [{
                label: 'حركة المبيعات ($)',
                data: [12, 19, 3, 5, 2, 3, 10], // Dummy data for now
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#38bdf8'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#fff' } } },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}
