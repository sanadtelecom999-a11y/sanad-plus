// ==========================================
// SANAD PLUS+ Admin Panel v3 (Real Auth)
// ==========================================

const API_URL = 'https://sanad-plus-backend.onrender.com';
const getToken = () => localStorage.getItem('admin_token');
let currentSessionId = null;

// ================= Login & OTP =================
async function handleLogin() {
    const user = document.getElementById('loginUser').value;
    const pass = document.getElementById('loginPass').value;
    if(!user || !pass) return Swal.fire({icon: 'warning', title: 'تنبيه', text: 'أدخل البيانات أولاً', background: '#1e293b', color: '#fff'});

    Swal.fire({ title: 'جاري التحقق...', allowOutsideClick: false, background: '#1e293b', color: '#fff', didOpen: () => Swal.showLoading() });
    
    try {
        const res = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();
        
        Swal.close();
        if (res.ok && data.require_otp) {
            currentSessionId = data.session_id;
            document.getElementById('loginStep1').classList.add('hidden');
            document.getElementById('loginStep2').classList.remove('hidden');
            Swal.fire({icon: 'info', title: 'تم الإرسال', text: 'تفقد حسابك في تليجرام للحصول على الرمز', background: '#1e293b', color: '#fff'});
        } else {
            Swal.fire({icon: 'error', title: 'خطأ', text: data.error || 'بيانات غير صحيحة', background: '#1e293b', color: '#fff'});
        }
    } catch (error) {
        Swal.fire({icon: 'error', title: 'خطأ في الاتصال', text: 'تعذر الاتصال بالسيرفر، حاول لاحقاً', background: '#1e293b', color: '#fff'});
    }
}

async function verifyOTP() {
    const code = document.getElementById('otpCode').value;
    if(!code) return Swal.fire({icon: 'warning', title: 'تنبيه', text: 'أدخل رمز التحقق', background: '#1e293b', color: '#fff'});

    Swal.fire({ title: 'جاري التحقق...', allowOutsideClick: false, background: '#1e293b', color: '#fff', didOpen: () => Swal.showLoading() });
    
    try {
        const res = await fetch(`${API_URL}/admin/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: currentSessionId, otp_code: code })
        });
        const data = await res.json();
        
        if (res.ok && data.token) {
            localStorage.setItem('admin_token', data.token);
            Swal.fire({icon: 'success', title: 'مرحباً بك', timer: 1000, showConfirmButton: false, background: '#1e293b', color: '#fff'})
                .then(() => location.reload());
        } else {
            Swal.fire({icon: 'error', title: 'خطأ', text: data.error || 'رمز خاطئ', background: '#1e293b', color: '#fff'});
        }
    } catch (error) {
        Swal.fire({icon: 'error', title: 'خطأ في الاتصال', text: 'تعذر الاتصال بالسيرفر', background: '#1e293b', color: '#fff'});
    }
}

// ================= Logic (API Calls) =================
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
        console.error(error);
        return null;
    }
}

async function loadUsers() {
    const data = await apiCall('/admin/api/users');
    if (data) document.getElementById('usersTableBody').innerHTML = data.users.map(user => `
        <tr class="hover:bg-slate-800/30 transition border-b border-slate-700/50">
            <td><div class="font-bold text-white">${user.first_name}</div><div class="text-xs text-slate-400">${user.telegram_id}</div></td>
            <td class="font-bold text-primary">$${user.balance}</td>
            <td><button onclick="editUserBalance(${user.id}, ${user.balance}, '${user.first_name}')" class="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-lg text-sm">تعديل الرصيد</button></td>
        </tr>
    `).join('');
}

function switchSection(sectionId, btnElement) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    const target = document.getElementById('section-' + sectionId);
    if (target) { target.classList.remove('hidden'); target.classList.add('block'); }

    const titles = { 'dashboard': 'لوحة التحكم', 'inbox': 'الإرساليات', 'users': 'المستخدمين', 'products': 'المنتجات' };
    document.getElementById('page-title').innerText = titles[sectionId] || 'لوحة التحكم';

    if (btnElement) {
        document.querySelectorAll('.nav-btn').forEach(btn => { btn.classList.remove('bg-slate-700/50', 'text-white'); btn.classList.add('text-slate-400'); });
        btnElement.classList.remove('text-slate-400'); btnElement.classList.add('bg-slate-700/50', 'text-white');
    }
    if (sectionId === 'users') loadUsers();
}

function handleLogout() { localStorage.removeItem('admin_token'); location.reload(); }

window.onload = () => { 
    if (!getToken()) { 
        document.getElementById('loginScreen').style.display = 'flex'; 
    } else { 
        document.getElementById('loginScreen').style.display = 'none'; 
    } 
};
