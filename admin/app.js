const API_BASE = 'https://sanad-plus-backend.onrender.com';
let currentSessionId = null;
let dashboardChartInstance = null;
let currentInboxTab = 'deposits';
let cachedItems = {};

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
        const res = await fetch(`${API_BASE}/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password: pass }) });
        const data = await res.json();
        if (res.ok && data.require_otp) {
            currentSessionId = data.session_id;
            document.getElementById('loginStep1').classList.add('hidden');
            document.getElementById('loginStep2').classList.remove('hidden');
            Swal.fire({icon: 'info', title: 'تم الإرسال', text: 'تفقد حسابك في تليجرام', background: '#1e293b', color: '#fff'});
        } else { Swal.fire({icon: 'error', title: 'خطأ', text: data.error || 'بيانات غير صحيحة', background: '#1e293b', color: '#fff'}); }
    } catch (e) { Swal.fire({icon: 'error', title: 'خطأ', text: 'تعذر الاتصال', background: '#1e293b', color: '#fff'}); } 
    finally { btn.textContent = 'تسجيل الدخول'; btn.disabled = false; }
}

async function verifyOTP() {
    const code = document.getElementById('otpCode').value;
    const btn = document.getElementById('otpBtn');
    if (!code) return Swal.fire({icon: 'warning', title: 'تنبيه', text: 'أدخل رمز التحقق', background: '#1e293b', color: '#fff'});
    btn.textContent = 'جاري التحقق...'; btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/admin/verify-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: currentSessionId, otp_code: code }) });
        const data = await res.json();
        if (res.ok && data.token) {
            localStorage.setItem('admin_token', data.token);
            Swal.fire({icon: 'success', title: 'مرحباً بك', timer: 1000, showConfirmButton: false, background: '#1e293b', color: '#fff'}).then(() => location.reload());
        } else { Swal.fire({icon: 'error', title: 'خطأ', text: data.error || 'رمز خاطئ', background: '#1e293b', color: '#fff'}); } 
    } catch (e) { Swal.fire({icon: 'error', title: 'خطأ', text: 'تعذر الاتصال', background: '#1e293b', color: '#fff'}); } 
    finally { btn.textContent = 'تأكيد الرمز'; btn.disabled = false; }
}

function logout() { localStorage.removeItem('admin_token'); location.reload(); }

function getHeaders() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }; }

// ================= Dashboard & Navigation =================
function showDashboard() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboardScreen').classList.remove('hidden');
    loadDashboardStats();
    initChart();
    checkInboxBadge();
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
    document.querySelector('aside').classList.remove('open');

    if (sectionId === 'inbox') loadInbox(currentInboxTab);
}

function toggleSidebar() { document.querySelector('aside').classList.toggle('open'); }

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
        data: { labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'], datasets: [{ label: 'حركة المبيعات ($)', data: [12, 19, 3, 5, 2, 3, 10], borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.1)', fill: true, tension: 0.4 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff' } } }, scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } } } }
    });
}

// ================= Inbox Logic =================
function switchInboxTab(type, btn) {
    currentInboxTab = type;
    document.querySelectorAll('.inbox-tab').forEach(b => {
        b.classList.remove('active', 'bg-accent', 'text-dark', 'border-accent');
        b.classList.add('glass', 'text-slate-400');
    });
    btn.classList.remove('glass', 'text-slate-400');
    btn.classList.add('active', 'bg-accent', 'text-dark', 'border-accent');
    loadInbox(type);
}

async function loadInbox(type) {
    const container = document.getElementById('inboxContainer');
    container.innerHTML = '<div class="col-span-full text-center py-10"><i data-lucide="loader" class="animate-spin text-accent mx-auto mb-2"></i><p class="text-slate-400">جاري التحميل...</p></div>';
    lucide.createIcons();

    let endpoint = type === 'deposits' ? '/admin/api/deposits' : type === 'orders' ? '/admin/api/orders' : '/admin/api/kyc';

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, { headers: getHeaders() });
        const data = await res.json();
        cachedItems[type] = data;
        container.innerHTML = '';

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="col-span-full text-center py-10 text-slate-400">لا توجد عناصر في هذا القسم حالياً.</div>';
            return;
        }

        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'inbox-card';
            
            if (type === 'deposits') {
                card.innerHTML = `
                    <div class="inbox-header"><span class="text-accent">${item.transaction_id}</span><span class="badge bg-success/20 text-success px-2 py-1 rounded">$${parseFloat(item.amount).toFixed(2)}</span></div>
                    <div class="inbox-details">المستخدم: <strong>${escapeHtml(item.user_name || 'غير معروف')}</strong><br>الطريقة: ${escapeHtml(item.method)}</div>
                    <div class="inbox-actions">
                        <button class="btn-action btn-view" onclick="viewDetails('deposits', ${item.id})">عرض الإيصال</button>
                        <button class="btn-action btn-approve" onclick="handleAction('deposits', ${item.id}, 'approve')">قبول</button>
                        <button class="btn-action btn-reject" onclick="handleAction('deposits', ${item.id}, 'reject')">رفض</button>
                    </div>
                `;
            } else if (type === 'orders') {
                card.innerHTML = `
                    <div class="inbox-header"><span class="text-accent">${item.order_number}</span><span class="badge bg-warning/20 text-warning px-2 py-1 rounded">$${parseFloat(item.total_price).toFixed(2)}</span></div>
                    <div class="inbox-details">المنتج: <strong>${escapeHtml(item.product_name)}</strong><br>المستخدم: ${escapeHtml(item.user_name || 'غير معروف')}</div>
                    <div class="inbox-actions">
                        <button class="btn-action btn-view" onclick="viewDetails('orders', ${item.id})">تفاصيل</button>
                        <button class="btn-action btn-approve" onclick="handleAction('orders', ${item.id}, 'status', 'completed')">إكمال</button>
                    </div>
                `;
            } else {
                card.innerHTML = `
                    <div class="inbox-header"><span class="text-accent">طلب توثيق #${item.id}</span><span class="badge bg-primary/20 text-primary px-2 py-1 rounded">KYC</span></div>
                    <div class="inbox-details">الاسم: <strong>${escapeHtml(item.full_name)}</strong><br>الهاتف: ${escapeHtml(item.phone)}</div>
                    <div class="inbox-actions">
                        <button class="btn-action btn-view" onclick="viewDetails('kyc', ${item.id})">عرض الصورة</button>
                        <button class="btn-action btn-approve" onclick="handleAction('kyc', ${item.id}, 'approve')">قبول</button>
                        <button class="btn-action btn-reject" onclick="handleAction('kyc', ${item.id}, 'reject')">رفض</button>
                    </div>
                `;
            }
            container.appendChild(card);
        });
        lucide.createIcons();
    } catch (e) {
        container.innerHTML = '<div class="col-span-full text-center py-10 text-danger">تعذر جلب البيانات. تحقق من اتصالك.</div>';
    }
}

// ================= Actions (Approve/Reject) =================
async function handleAction(type, id, action, extra) {
    const confirm = await Swal.fire({
        title: 'تأكيد الإجراء', text: "هل أنت متأكد من تنفيذ هذا الإجراء؟", icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#10b981', cancelButtonColor: '#ef4444', confirmButtonText: 'نعم، تنفيذ', cancelButtonText: 'إلغاء',
        background: '#1e293b', color: '#fff'
    });
    if (!confirm.isConfirmed) return;

    let endpoint = '';
    let body = {};
    if (type === 'deposits') endpoint = `/admin/api/deposits/${id}/${action}`;
    else if (type === 'orders') { endpoint = `/admin/api/orders/${id}/status`; body = { status: extra }; }
    else if (type === 'kyc') endpoint = `/admin/api/kyc/${id}/${action}`;

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
        if (res.ok) {
            Swal.fire({icon: 'success', title: 'تم بنجاح', timer: 1500, showConfirmButton: false, background: '#1e293b', color: '#fff'});
            loadInbox(type);
            loadDashboardStats();
            checkInboxBadge();
        } else {
            const err = await res.json();
            Swal.fire({icon: 'error', title: 'فشل', text: err.error || 'حدث خطأ', background: '#1e293b', color: '#fff'});
        }
    } catch (e) { Swal.fire({icon: 'error', title: 'خطأ', text: 'تعذر الاتصال', background: '#1e293b', color: '#fff'}); }
}

// ================= Details Modal =================
function viewDetails(type, id) {
    const item = cachedItems[type].find(x => x.id === id);
    if (!item) return;

    const modal = document.getElementById('detailsModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');

    modal.classList.remove('hidden');

    if (type === 'deposits') {
        title.textContent = `إيصال إيداع: ${item.transaction_id}`;
        body.innerHTML = `
            <div class="space-y-2 mb-4">
                <p><strong>المستخدم:</strong> ${escapeHtml(item.user_name)} (${item.user_telegram})</p>
                <p><strong>المبلغ:</strong> $${parseFloat(item.amount).toFixed(2)}</p>
                <p><strong>اسم المرسل:</strong> ${escapeHtml(item.sender_name || 'غير محدد')}</p>
            </div>
            <div class="rounded-xl overflow-hidden border border-slate-600">
                ${item.proof_image ? `<img src="${item.proof_image}" class="w-full h-auto object-contain max-h-64">` : '<p class="text-center p-4">لا توجد صورة</p>'}
            </div>
        `;
        footer.innerHTML = `
            <button onclick="handleAction('deposits', ${item.id}, 'approve')" class="btn-action btn-approve">قبول الإيداع</button>
            <button onclick="handleAction('deposits', ${item.id}, 'reject')" class="btn-action btn-reject">رفض الإيداع</button>
        `;
    } else if (type === 'orders') {
        title.textContent = `طلب: ${item.order_number}`;
        body.innerHTML = `
            <div class="space-y-2">
                <p><strong>المستخدم:</strong> ${escapeHtml(item.user_name)} (${item.user_telegram})</p>
                <p><strong>المنتج:</strong> ${escapeHtml(item.product_name)}</p>
                <p><strong>الكمية:</strong> ${item.quantity}</p>
                <p><strong>الإجمالي:</strong> $${parseFloat(item.total_price).toFixed(2)}</p>
                <p><strong>بيانات الاستلام:</strong> <span class="text-accent font-mono">${item.delivery_data ? JSON.stringify(item.delivery_data) : 'لا يوجد'}</span></p>
                <p><strong>التاريخ:</strong> ${new Date(item.created_at).toLocaleString('ar-EG')}</p>
            </div>
        `;
        footer.innerHTML = `<button onclick="handleAction('orders', ${item.id}, 'status', 'completed')" class="btn-action btn-approve w-full">تعيين كمكتمل</button>`;
    } else {
        title.textContent = `طلب توثيق #${item.id}`;
        body.innerHTML = `
            <div class="space-y-2 mb-4">
                <p><strong>الاسم:</strong> ${escapeHtml(item.full_name)}</p>
                <p><strong>الهاتف:</strong> ${escapeHtml(item.phone)}</p>
                <p><strong>العنوان:</strong> ${escapeHtml(item.address)}</p>
            </div>
            <div class="rounded-xl overflow-hidden border border-slate-600">
                ${item.selfie_image ? `<img src="${item.selfie_image}" class="w-full h-auto object-contain max-h-64">` : '<p class="text-center p-4">لا توجد صورة</p>'}
            </div>
        `;
        footer.innerHTML = `
            <button onclick="handleAction('kyc', ${item.id}, 'approve')" class="btn-action btn-approve">قبول</button>
            <button onclick="handleAction('kyc', ${item.id}, 'reject')" class="btn-action btn-reject">رفض</button>
        `;
    }
}

function closeModal() { document.getElementById('detailsModal').classList.add('hidden'); }

async function checkInboxBadge() {
    try {
        const res = await fetch(`${API_BASE}/admin/api/inbox/counts`, { headers: getHeaders() });
        if (res.ok) {
            const data = await res.json();
            const total = (data.deposits || 0) + (data.orders || 0) + (data.kyc || 0);
            const badge = document.getElementById('sidebarInboxBadge');
            if (total > 0) { badge.textContent = total > 99 ? '99+' : total; badge.classList.remove('hidden'); }
            else { badge.classList.add('hidden'); }
        }
    } catch(e) {}
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/[&<>"']/g, function(m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; });
}
