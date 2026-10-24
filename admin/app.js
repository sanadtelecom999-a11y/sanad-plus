const API_BASE = 'https://sanad-plus-backend.onrender.com';
let currentSessionId = null;
let currentInboxTab = 'orders';
let cachedItems = {};

document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    const token = localStorage.getItem('admin_token');
    if (!token) {
        document.getElementById('loginScreen').style.display = 'flex';
    } else {
        verifyTokenAndLogin();
    }
});

async function verifyTokenAndLogin() {
    try {
        const res = await fetch(`${API_BASE}/admin/api/stats`, { headers: getHeaders() });
        if (res.ok) {
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('dashboardScreen').style.display = 'flex';
            showDashboard();
        } else {
            throw new Error('Invalid token');
        }
    } catch (e) {
        localStorage.removeItem('admin_token');
        document.getElementById('loginScreen').style.display = 'flex';
    }
}

window.handleLogin = async function() {
    const user = document.getElementById('loginUser').value;
    const pass = document.getElementById('loginPass').value;
    const btn = document.getElementById('loginBtn');
    if (!user || !pass) return Swal.fire('تنبيه', 'أدخل البيانات أولاً', 'warning');
    btn.textContent = 'جاري التحقق...'; btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password: pass }) });
        const data = await res.json();
        if (res.ok && data.require_otp) {
            currentSessionId = data.session_id;
            document.getElementById('loginStep1').classList.add('hidden');
            document.getElementById('loginStep2').classList.remove('hidden');
            Swal.fire('تم', 'تم إرسال رمز التحقق إلى تيليجرام', 'success');
        } else { Swal.fire('خطأ', data.error || 'بيانات غير صحيحة', 'error'); }
    } catch (e) { Swal.fire('خطأ', 'تعذر الاتصال', 'error'); } 
    finally { btn.textContent = 'تسجيل الدخول'; btn.disabled = false; }
};

window.verifyOTP = async function() {
    const code = document.getElementById('otpCode').value;
    const btn = document.getElementById('otpBtn');
    if (!code) return Swal.fire('تنبيه', 'أدخل رمز التحقق', 'warning');
    btn.textContent = 'جاري التحقق...'; btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/admin/verify-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: currentSessionId, otp_code: code }) });
        const data = await res.json();
        if (res.ok && data.token) {
            localStorage.setItem('admin_token', data.token);
            Swal.fire('مرحباً بك', 'تم تسجيل الدخول', 'success');
            setTimeout(() => location.reload(), 1000);
        } else { Swal.fire('خطأ', data.error || 'رمز خاطئ', 'error'); } 
    } catch (e) { Swal.fire('خطأ', 'تعذر الاتصال', 'error'); } 
    finally { btn.textContent = 'تأكيد الرمز'; btn.disabled = false; }
};

window.logout = function() { localStorage.removeItem('admin_token'); location.reload(); };
window.getHeaders = function() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }; };

window.showDashboard = function() {
    loadDashboardStats(); loadAnalytics(); initChart();
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.switchSection = function(sectionId, btn) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    const target = document.getElementById('section-' + sectionId);
    if (target) target.classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active', 'bg-slate-700/50', 'text-white'));
    if (btn) btn.classList.add('active', 'bg-slate-700/50', 'text-white');
    const titles = { 'dashboard': 'لوحة التحكم', 'inbox': 'الإرساليات' };
    document.getElementById('page-title').innerText = titles[sectionId] || 'لوحة التحكم';
    if (sectionId === 'inbox') loadInbox(currentInboxTab);
};

async function loadDashboardStats() {
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/stats`, { headers: getHeaders() });
        document.getElementById('statOrders').innerText = data.total_orders || 0;
        document.getElementById('statUsers').innerText = data.total_users || 0;
        document.getElementById('statDeposits').innerText = data.total_deposits || 0;
        document.getElementById('statRevenue').innerText = `$${(data.revenue || 0).toFixed(2)}`;
    } catch (e) { console.error(e); }
}

async function loadAnalytics() {
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/analytics`, { headers: getHeaders() });
        const ctx = document.getElementById('analyticsChart');
        if(ctx) { /* Draw if needed */ }
    } catch(e) { console.error(e); }
}

function initChart() {
    const ctx = document.getElementById('dashboardChart');
    if(!ctx || typeof Chart === 'undefined') return;
    new Chart(ctx, { type: 'line', data: { labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'], datasets: [{ label: 'حركة المبيعات ($)', data: [12, 19, 3, 5, 2, 3, 10], borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.1)', fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff' } } }, scales: { x: { ticks: { color: '#94a3b8' } }, y: { ticks: { color: '#94a3b8' } } } } });
}

window.switchInboxTab = function(type, btn) {
    currentInboxTab = type;
    document.querySelectorAll('#section-inbox .inbox-tab').forEach(b => { b.classList.remove('active', 'bg-accent', 'text-dark'); b.classList.add('glass', 'text-slate-400'); });
    btn.classList.remove('glass', 'text-slate-400'); btn.classList.add('active', 'bg-accent', 'text-dark');
    loadInbox(type);
}

async function loadInbox(type) {
    const container = document.getElementById('inboxContainer');
    container.innerHTML = '<div class="col-span-full text-center py-10"><i data-lucide="loader" class="animate-spin text-accent mx-auto mb-2"></i><p class="text-slate-400">جاري التحميل...</p></div>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
    let endpoint = type === 'deposits' ? '/admin/api/deposits' : '/admin/api/orders';
    try {
        const data = await safeFetch(`${API_BASE}${endpoint}`, { headers: getHeaders() });
        cachedItems[type] = data; container.innerHTML = '';
        if (!data || data.length === 0) { container.innerHTML = '<div class="col-span-full text-center py-10 text-slate-400">لا توجد عناصر حالياً.</div>'; return; }
        data.forEach(item => {
            const card = document.createElement('div'); card.className = 'inbox-card';
            if (type === 'orders') {
                card.innerHTML = `<div class="flex items-center gap-2 mb-2"><div class="flex-1 cursor-pointer" onclick="viewDetails('orders', ${item.id})"><div class="inbox-header"><span class="text-accent font-mono text-sm">${item.order_number}</span><span class="badge bg-warning/20 text-warning px-2 py-1 rounded">$${parseFloat(item.total_price).toFixed(2)}</span></div><div class="inbox-details"><strong>${escapeHtml(item.product_name)}</strong><br>الكمية: ${item.quantity} | ${escapeHtml(item.user_name)} <span class="text-xs text-slate-500 font-mono">(#${item.user_telegram})</span></div></div></div>`;
            } else {
                card.innerHTML = `<div class="cursor-pointer" onclick="viewDetails('deposits', ${item.id})"><div class="inbox-header"><span class="text-accent font-mono text-sm">${item.transaction_id}</span><span class="badge bg-success/20 text-success px-2 py-1 rounded">$${parseFloat(item.amount).toFixed(2)}</span></div><div class="inbox-details"><strong>إيداع</strong><br>${escapeHtml(item.user_name)}</div></div>`;
            }
            container.appendChild(card);
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) { container.innerHTML = `<div class="col-span-full text-center py-10 text-danger">${e.message}</div>`; }
}

window.viewDetails = function(type, id) {
    const item = cachedItems[type].find(x => x.id === id); if (!item) return;
    const modal = document.getElementById('detailsModal'), title = document.getElementById('modalTitle'), body = document.getElementById('modalBody'), footer = document.getElementById('modalFooter');
    modal.classList.remove('hidden'); modal.classList.add('flex');
    
    if (type === 'orders') {
        title.textContent = `تفاصيل الطلب: ${item.order_number}`;
        let deliveryStr = ''; try { const parsed = typeof item.delivery_data === 'string' ? JSON.parse(item.delivery_data) : item.delivery_data; deliveryStr = Object.values(parsed).join(', '); } catch(e) { deliveryStr = item.delivery_data || ''; }
        body.innerHTML = `<div class="grid grid-cols-2 gap-4 mb-4"><div><span class="text-slate-500 text-xs block">المستخدم</span> <strong class="text-white">${escapeHtml(item.user_name)}</strong></div><div><span class="text-slate-500 text-xs block">الآيدي</span> <strong class="text-white font-mono">${item.user_telegram || '-'}</strong></div><div><span class="text-slate-500 text-xs block">المنتج</span> <strong class="text-white">${escapeHtml(item.product_name)}</strong></div><div><span class="text-slate-500 text-xs block">الكمية</span> <strong class="text-white">${item.quantity}</strong></div><div><span class="text-slate-500 text-xs block">الإجمالي</span> <strong class="text-success text-lg">$${parseFloat(item.total_price).toFixed(2)}</strong></div></div><div><label class="text-sm text-slate-400 mb-2 block">بيانات الاستلام</label><input type="text" id="deliveryDataInput" class="input-field" value="${escapeHtml(deliveryStr)}" readonly></div><div><label class="text-sm text-slate-400 mb-2 block mt-4">ملاحظة الإدارة</label><textarea id="adminNote" class="admin-note-input" placeholder="اكتب ملاحظتك هنا..."></textarea></div>`;
        footer.innerHTML = `<div class="flex gap-3 w-full"><button onclick="handleAction('orders', ${item.id}, 'status', 'failed')" class="btn-reject">رفض</button><button onclick="handleAction('orders', ${item.id}, 'status', 'completed')" class="btn-complete">إكمال</button></div>`;
    } else if (type === 'deposits') {
        title.textContent = `إيصال إيداع: ${item.transaction_id}`;
        body.innerHTML = `<div class="space-y-2 mb-4"><p><strong>المستخدم:</strong> ${escapeHtml(item.user_name)} (${item.user_telegram})</p><p><strong>المبلغ:</strong> $${parseFloat(item.amount).toFixed(2)}</p><p><strong>اسم المرسل:</strong> ${escapeHtml(item.sender_name || 'غير محدد')}</p></div><div class="rounded-xl overflow-hidden border border-slate-600">${item.proof_image ? `<img src="${item.proof_image}" class="w-full h-auto object-contain max-h-64">` : '<p class="text-center p-4">لا توجد صورة</p>'}</div><div class="mt-4"><label class="text-sm text-slate-400 mb-2 block">ملاحظة الإدارة</label><textarea id="adminNote" class="admin-note-input" placeholder="اكتب ملاحظتك هنا..."></textarea></div>`;
        footer.innerHTML = `<div class="flex gap-3 w-full"><button onclick="handleAction('deposits', ${item.id}, 'reject')" class="btn-reject">رفض</button><button onclick="handleAction('deposits', ${item.id}, 'approve')" class="btn-complete">قبول</button></div>`;
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.handleAction = async function(type, id, action, extra) {
    const adminNote = document.getElementById('adminNote')?.value || '';
    const confirm = await Swal.fire({ title: 'تأكيد', text: "هل أنت متأكد؟", icon: 'warning', showCancelButton: true, confirmButtonColor: '#10b981', cancelButtonColor: '#ef4444', confirmButtonText: 'نعم', cancelButtonText: 'إلغاء', background: '#1e293b', color: '#fff' });
    if (!confirm.isConfirmed) return;
    
    let endpoint = '', body = { admin_note: adminNote };
    if (type === 'deposits') endpoint = `/admin/api/deposits/${id}/${action}`;
    else if (type === 'orders') { endpoint = `/admin/api/orders/${id}/status`; body.status = extra; }
    
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
        const data = await res.json();
        if (res.ok) {
            Swal.fire('تم', 'تمت العملية بنجاح', 'success');
            closeModal(); loadInbox(currentInboxTab); loadDashboardStats();
        } else { Swal.fire('خطأ', data.error || 'حدث خطأ', 'error'); }
    } catch (e) { Swal.fire('خطأ', 'خطأ في الاتصال', 'error'); }
}

window.closeModal = function() {
    const modal = document.getElementById('detailsModal');
    modal.classList.add('hidden'); modal.classList.remove('flex');
}

async function safeFetch(url, options = {}) {
    try {
        const res = await fetch(url + (url.includes('?') ? '&' : '?') + '_t=' + new Date().getTime(), { ...options, cache: 'no-store' });
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) throw new Error("السيرفر غير متاح");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `خطأ: ${res.status}`);
        return data;
    } catch (error) { throw error; }
}

function escapeHtml(text) { if (!text) return ''; return String(text).replace(/[&<>"']/g, function(m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
