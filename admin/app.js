const API_BASE = 'https://sanad-plus-backend.onrender.com';
let currentSessionId = null;
let currentInboxTab = 'orders';
let currentSupportTab = 'open';
let currentTicketId = null;
let adminChatPolling = null;
let cachedItems = {};
let allUsersData = [];
let categoriesData = [];
let currentSelectedUser = null;
let editingItemId = null;
let dashboardChartInstance = null;

// ================= التهيئة والدخول =================
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    const token = localStorage.getItem('admin_token');
    if (!token) document.getElementById('loginScreen').style.display = 'flex';
    else verifyTokenAndLogin();
});

async function verifyTokenAndLogin() {
    try {
        const res = await fetch(`${API_BASE}/admin/api/stats`, { headers: getHeaders() });
        if (res.ok) {
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('dashboardScreen').style.display = 'flex';
            showDashboard();
        } else throw new Error('Invalid token');
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
        } else Swal.fire('خطأ', data.error || 'بيانات غير صحيحة', 'error');
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
        const receivedToken = data.token || data.access_token;
        if (res.ok && receivedToken) {
            localStorage.setItem('admin_token', receivedToken);
            Swal.fire('مرحباً', 'تم الدخول بنجاح', 'success');
            setTimeout(() => location.reload(), 1000);
        } else Swal.fire('خطأ', data.error || 'رمز خاطئ', 'error'); 
    } catch (e) { Swal.fire('خطأ', 'تعذر الاتصال', 'error'); } 
    finally { btn.textContent = 'تأكيد الرمز'; btn.disabled = false; }
};

window.logout = function() { localStorage.removeItem('admin_token'); location.reload(); };
window.getHeaders = function() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }; };

// ================= التنقل والواجهة =================
window.showDashboard = function() {
    loadDashboardStats(); initChart();
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.switchSection = function(sectionId, btn) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    document.getElementById('section-' + sectionId).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active', 'bg-slate-700/50', 'text-white'));
    if (btn) btn.classList.add('active', 'bg-slate-700/50', 'text-white');
    
    const titles = { 'dashboard': 'لوحة التحكم', 'inbox': 'الإرساليات', 'support': 'تذاكر الدعم', 'users': 'إدارة المستخدمين', 'archive': 'الأرشيف', 'categories': 'إدارة الأقسام', 'products': 'إدارة المنتجات', 'payments': 'طرق الدفع', 'settings': 'الإعدادات' };
    document.getElementById('page-title').innerText = titles[sectionId];

    if (sectionId === 'inbox') loadInbox(currentInboxTab);
    if (sectionId === 'users') loadUsers();
    if (sectionId === 'products') loadProducts();
    if (sectionId === 'categories') loadCategories();
    if (sectionId === 'payments') loadPayments();
    if (sectionId === 'support') loadSupportTickets();
    if (sectionId === 'archive') loadArchive();
    if (sectionId === 'settings') loadSettings();
};

// ================= الإحصائيات =================
async function loadDashboardStats() {
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/stats`, { headers: getHeaders() });
        document.getElementById('statOrders').innerText = data.total_orders || 0;
        document.getElementById('statUsers').innerText = data.total_users || 0;
        document.getElementById('statDeposits').innerText = data.total_deposits || 0;
        document.getElementById('statRevenue').innerText = `$${(data.revenue || 0).toFixed(2)}`;
    } catch (e) { console.error(e); }
}

function initChart() {
    const ctx = document.getElementById('dashboardChart');
    if(!ctx || typeof Chart === 'undefined') return;
    if(dashboardChartInstance) dashboardChartInstance.destroy(); 
    dashboardChartInstance = new Chart(ctx, { type: 'line', data: { labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'], datasets: [{ label: 'حركة المبيعات ($)', data: [12, 19, 3, 5, 2, 3, 10], borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.1)', fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff' } } }, scales: { x: { ticks: { color: '#94a3b8' } }, y: { ticks: { color: '#94a3b8' } } } } });
}

// ================= الإرساليات (Orders, Deposits, KYC) =================
window.switchInboxTab = function(type, btn) {
    currentInboxTab = type;
    document.querySelectorAll('#section-inbox .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadInbox(type);
};

async function loadInbox(type) {
    const container = document.getElementById('inboxContainer');
    container.innerHTML = '<div class="col-span-full text-center py-10 text-slate-400">جاري التحميل...</div>';
    let endpoint = type === 'deposits' ? '/admin/api/deposits' : (type === 'kyc' ? '/admin/api/kyc' : '/admin/api/orders');
    try {
        const data = await safeFetch(`${API_BASE}${endpoint}`, { headers: getHeaders() });
        cachedItems[type] = data; container.innerHTML = '';
        if (!data || data.length === 0) { container.innerHTML = '<div class="col-span-full text-center py-10 text-slate-400">لا توجد عناصر.</div>'; return; }
        
        data.forEach(item => {
            const card = document.createElement('div'); card.className = 'inbox-card';
            if (type === 'orders') {
                card.innerHTML = `<div onclick="viewDetails('orders', ${item.id})"><div class="inbox-header"><span class="text-accent font-mono text-sm">${item.order_number}</span><span class="bg-warning/20 text-warning px-2 py-1 rounded">$${parseFloat(item.total_price).toFixed(2)}</span></div><div class="text-sm"><strong>${escapeHtml(item.product_name)}</strong><br>${escapeHtml(item.user_name)}</div></div>`;
            } else if (type === 'deposits') {
                card.innerHTML = `<div onclick="viewDetails('deposits', ${item.id})"><div class="inbox-header"><span class="text-accent font-mono text-sm">${item.transaction_id}</span><span class="bg-success/20 text-success px-2 py-1 rounded">$${parseFloat(item.amount).toFixed(2)}</span></div><div class="text-sm"><strong>إيداع</strong><br>${escapeHtml(item.user_name)}</div></div>`;
            } else {
                card.innerHTML = `<div onclick="viewDetails('kyc', ${item.id})"><div class="inbox-header"><span class="text-accent font-mono text-sm">KYC #${item.id}</span></div><div class="text-sm"><strong>${escapeHtml(item.full_name)}</strong><br>${escapeHtml(item.phone)}</div></div>`;
            }
            container.appendChild(card);
        });
    } catch (e) { container.innerHTML = `<div class="col-span-full text-center py-10 text-danger">${e.message}</div>`; }
}

window.viewDetails = function(type, id) {
    const item = cachedItems[type].find(x => x.id === id); if (!item) return;
    const modal = document.getElementById('detailsModal'), title = document.getElementById('modalTitle'), body = document.getElementById('modalBody'), footer = document.getElementById('modalFooter');
    modal.classList.remove('hidden'); modal.classList.add('flex');
    
    if (type === 'orders') {
        title.textContent = `طلب: ${item.order_number}`;
        body.innerHTML = `<div class="grid grid-cols-2 gap-4"><div><span class="text-slate-500 text-xs block">المستخدم</span> <strong class="text-white">${escapeHtml(item.user_name)}</strong></div><div><span class="text-slate-500 text-xs block">الآيدي</span> <strong class="text-white font-mono">${item.user_telegram}</strong></div><div><span class="text-slate-500 text-xs block">المنتج</span> <strong class="text-white">${escapeHtml(item.product_name)}</strong></div><div><span class="text-slate-500 text-xs block">الكمية</span> <strong class="text-white">${item.quantity}</strong></div></div>`;
        footer.innerHTML = `<div class="flex gap-3 w-full"><button onclick="handleAction('orders', ${item.id}, 'status', 'failed')" class="btn-danger flex-1">رفض</button><button onclick="handleAction('orders', ${item.id}, 'status', 'completed')" class="btn-success flex-1">إكمال</button></div>`;
    } else if (type === 'deposits') {
        title.textContent = `إيداع: ${item.transaction_id}`;
        body.innerHTML = `<p><strong>المستخدم:</strong> ${escapeHtml(item.user_name)}</p><p><strong>المبلغ:</strong> $${parseFloat(item.amount).toFixed(2)}</p>`;
        footer.innerHTML = `<div class="flex gap-3 w-full"><button onclick="handleAction('deposits', ${item.id}, 'reject')" class="btn-danger flex-1">رفض</button><button onclick="handleAction('deposits', ${item.id}, 'approve')" class="btn-success flex-1">قبول</button></div>`;
    } else {
        title.textContent = `توثيق: ${item.full_name}`;
        body.innerHTML = `<p><strong>الهاتف:</strong> ${escapeHtml(item.phone)}</p><p><strong>العنوان:</strong> ${escapeHtml(item.address)}</p><div class="mt-4"><img src="${item.selfie_image}" class="w-full rounded-xl"></div>`;
        footer.innerHTML = `<div class="flex gap-3 w-full"><button onclick="handleAction('kyc', ${item.id}, 'reject')" class="btn-danger flex-1">رفض</button><button onclick="handleAction('kyc', ${item.id}, 'approve')" class="btn-success flex-1">قبول</button></div>`;
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.handleAction = async function(type, id, action, extra) {
    const confirm = await Swal.fire({ title: 'تأكيد', text: "هل أنت متأكد؟", icon: 'warning', showCancelButton: true, confirmButtonColor: '#10b981', confirmButtonText: 'نعم', background: '#1e293b', color: '#fff' });
    if (!confirm.isConfirmed) return;
    
    let endpoint = ''; let body = {};
    if (type === 'deposits') endpoint = `/admin/api/deposits/${id}/${action}`;
    else if (type === 'orders') { endpoint = `/admin/api/orders/${id}/status`; body.status = extra; }
    else if (type === 'kyc') endpoint = `/admin/api/kyc/${id}/${action}`;
    
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
        if (res.ok) {
            Swal.fire({ title: 'تم', icon: 'success', timer: 1500, showConfirmButton: false });
            closeModal(); loadInbox(currentInboxTab);
        } else Swal.fire('خطأ', 'حدث خطأ', 'error');
    } catch (e) { Swal.fire('خطأ', 'خطأ في الاتصال', 'error'); }
};

// ================= المستخدمين =================
async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-slate-400">جاري التحميل...</td></tr>';
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/users`, { headers: getHeaders() });
        allUsersData = data; tbody.innerHTML = '';
        data.forEach(u => {
            tbody.innerHTML += `<tr class="table-row border-b border-slate-700/50">
                <td class="py-3 px-2"><strong class="text-white">${escapeHtml(u.first_name || 'مستخدم')}</strong></td>
                <td class="py-3 px-2 font-mono text-slate-400">${u.telegram_id}</td>
                <td class="py-3 px-2 text-success font-bold">$${parseFloat(u.balance).toFixed(2)}</td>
                <td class="py-3 px-2">${u.is_banned ? '<span class="text-red-400">محظور</span>' : '<span class="text-green-400">نشط</span>'}</td>
                <td class="py-3 px-2 text-center flex justify-center gap-2">
                    <button onclick="openUserDrawer(${u.id})" class="text-accent hover:text-white" title="عرض"><i data-lucide="eye" size="18"></i></button>
                    <button onclick="openUserDrawer(${u.id})" class="bg-slate-700 px-3 py-1 rounded text-xs">إدارة</button>
                </td>
            </tr>`;
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) { tbody.innerHTML = `<tr><td colspan="5" class="text-danger text-center">${e.message}</td></tr>`; }
}

window.openUserDrawer = async function(id) {
    const user = allUsersData.find(u => u.id === id); if(!user) return;
    currentSelectedUser = user;
    
    const content = document.getElementById('userDetailsContent');
    content.innerHTML = '<div class="text-center py-10 text-slate-400">جاري جلب التفاصيل...</div>';
    document.getElementById('userDrawerOverlay').classList.remove('hidden');
    document.getElementById('userDrawer').classList.remove('translate-x-full');

    try {
        // جلب تفاصيل المستخدم الكاملة (إحصائيات، توثيق، الخ)
        const details = await safeFetch(`${API_BASE}/admin/api/users/${id}/details`, { headers: getHeaders() }).catch(() => null);
        
        content.innerHTML = `
            <div class="text-center mb-6">
                <div class="w-20 h-20 rounded-full bg-accent/20 text-accent flex items-center justify-center text-3xl font-bold mx-auto mb-3">${(user.first_name || 'U')[0]}</div>
                <h4 class="text-xl font-bold">${escapeHtml(user.first_name || 'مستخدم')}</h4>
                <p class="text-slate-400 font-mono">${user.telegram_id}</p>
                ${user.kyc_status === 'verified' ? '<span class="inline-block mt-2 bg-success/20 text-success px-3 py-1 rounded-full text-xs">موثق ✓</span>' : '<span class="inline-block mt-2 bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-xs">غير موثق</span>'}
            </div>

            <div class="grid grid-cols-2 gap-3 mb-6">
                <div class="bg-dark p-3 rounded-xl text-center border border-slate-700"><span class="text-xs text-slate-400 block mb-1">الرصيد</span><strong class="text-lg text-success">$${parseFloat(user.balance).toFixed(2)}</strong></div>
                <div class="bg-dark p-3 rounded-xl text-center border border-slate-700"><span class="text-xs text-slate-400 block mb-1">الطلبات</span><strong class="text-lg">${details?.total_orders || 0}</strong></div>
                <div class="bg-dark p-3 rounded-xl text-center border border-slate-700"><span class="text-xs text-slate-400 block mb-1">الإيداعات</span><strong class="text-lg">${details?.total_deposits || 0}</strong></div>
                <div class="bg-dark p-3 rounded-xl text-center border border-slate-700 col-span-2"><span class="text-xs text-slate-400 block mb-1">أكثر منتج تم شراؤه</span><strong class="text-sm text-accent">${details?.favorite_product || 'لا يوجد'}</strong></div>
            </div>

            <div class="space-y-4">
                <div class="bg-dark rounded-xl p-4 border border-slate-700">
                    <label class="text-sm text-slate-400 mb-2 block">تعديل الرصيد (بالدولار)</label>
                    <input type="number" id="balanceAmount" class="input-field mb-3 text-center" placeholder="0.00">
                    <div class="flex gap-2">
                        <button onclick="adjustBalance('add')" class="flex-1 btn-success py-2 text-sm">+ إضافة</button>
                        <button onclick="adjustBalance('subtract')" class="flex-1 btn-danger py-2 text-sm">- خصم</button>
                    </div>
                </div>
                <button onclick="toggleBan()" class="w-full ${user.is_banned ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'} py-3 rounded-xl font-bold">
                    ${user.is_banned ? 'فك الحظر' : 'حظر المستخدم'}
                </button>
            </div>
        `;
    } catch(e) {
        content.innerHTML += `<p class="text-danger text-center mt-4">تعذر جلب بعض التفاصيل الإضافية</p>`;
    }
};

window.closeUserDrawer = function() {
    document.getElementById('userDrawerOverlay').classList.add('hidden');
    document.getElementById('userDrawer').classList.add('translate-x-full');
};

window.adjustBalance = async function(action) {
    if (!currentSelectedUser) return;
    const amount = parseFloat(document.getElementById('balanceAmount').value);
    if (!amount || amount <= 0) return Swal.fire('تنبيه', 'أدخل مبلغاً صحيحاً', 'warning');
    
    // تأكيد ثنائي
    const step1 = await Swal.fire({ title: 'تأكيد', text: `هل تريد ${action === 'add' ? 'إضافة' : 'خصم'} $${amount}؟`, icon: 'warning', showCancelButton: true, confirmButtonText: 'متابعة', background: '#1e293b', color: '#fff' });
    if (!step1.isConfirmed) return;
    
    const step2 = await Swal.fire({ title: 'تأكيد نهائي', text: `أنت على وشك تعديل رصيد المستخدم بمقدار $${amount}. هل أنت متأكد تماماً؟`, icon: 'error', showCancelButton: true, confirmButtonText: 'نعم، متأكد', background: '#1e293b', color: '#fff' });
    if (!step2.isConfirmed) return;

    const finalAmount = action === 'add' ? amount : -amount;
    try {
        await fetch(`${API_BASE}/admin/api/users/${currentSelectedUser.id}/balance`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ amount: finalAmount, note: 'تعديل يدوي من الإدارة' }) });
        Swal.fire('تم', 'تم تعديل الرصيد', 'success');
        closeUserDrawer(); loadUsers();
    } catch (e) { Swal.fire('خطأ', 'فشل التعديل', 'error'); }
};

window.toggleBan = async function() {
    if (!currentSelectedUser) return;
    const isBanned = currentSelectedUser.is_banned;
    const confirm = await Swal.fire({ title: isBanned ? 'فك الحظر' : 'حظر', text: `هل أنت متأكد من ${isBanned ? 'فك حظر' : 'حظر'} هذا المستخدم؟`, icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم', background: '#1e293b', color: '#fff' });
    if (!confirm.isConfirmed) return;

    try {
        await fetch(`${API_BASE}/admin/api/users/${currentSelectedUser.id}/ban`, { method: 'POST', headers: getHeaders() });
        Swal.fire('تم', 'تم تغيير حالة الحظر', 'success');
        closeUserDrawer(); loadUsers();
    } catch (e) { Swal.fire('خطأ', 'فشل الإجراء', 'error'); }
};

// ================= المنتجات والأقسام وطرق الدفع =================
async function loadProducts() {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-slate-400">جاري التحميل...</td></tr>';
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/products`, { headers: getHeaders() });
        tbody.innerHTML = '';
        data.forEach(p => {
            tbody.innerHTML += `<tr class="table-row border-b border-slate-700/50">
                <td class="py-2 px-2"><img src="${p.image || 'https://via.placeholder.com/40'}" class="w-10 h-10 rounded object-cover"></td>
                <td class="py-2 px-2"><strong class="text-white">${escapeHtml(p.name)}</strong></td>
                <td class="py-2 px-2">${p.category_id}</td>
                <td class="py-2 px-2 text-success">$${parseFloat(p.base_price).toFixed(2)}</td>
                <td class="py-2 px-2 flex gap-2">
                    <button onclick="openFormModal('product', ${p.id})" class="text-accent"><i data-lucide="edit" size="18"></i></button>
                    <button onclick="deleteItem('products', ${p.id})" class="text-red-400"><i data-lucide="trash" size="18"></i></button>
                </td>
            </tr>`;
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) { tbody.innerHTML = `<tr><td colspan="5" class="text-danger text-center">${e.message}</td></tr>`; }
}

async function loadCategories() {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '<div class="col-span-full text-center py-4 text-slate-400">جاري التحميل...</div>';
    try {
        categoriesData = await safeFetch(`${API_BASE}/admin/api/categories`, { headers: getHeaders() });
        grid.innerHTML = '';
        categoriesData.forEach(c => {
            grid.innerHTML += `<div class="glass p-4 rounded-2xl text-center relative">
                <button onclick="deleteItem('categories', ${c.id})" class="absolute top-2 left-2 text-red-400"><i data-lucide="trash" size="16"></i></button>
                <img src="${c.image || 'https://via.placeholder.com/60'}" class="w-16 h-16 rounded-xl mx-auto mb-3 object-cover">
                <h4 class="font-bold text-white">${escapeHtml(c.name)}</h4>
            </div>`;
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) { grid.innerHTML = `<div class="text-danger">${e.message}</div>`; }
}

async function loadPayments() {
    const grid = document.getElementById('paymentsGrid');
    grid.innerHTML = '<div class="col-span-full text-center py-4 text-slate-400">جاري التحميل...</div>';
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/payment-methods`, { headers: getHeaders() });
        grid.innerHTML = '';
        data.forEach(p => {
            grid.innerHTML += `<div class="glass p-4 rounded-2xl relative">
                <button onclick="deleteItem('payments', ${p.id})" class="absolute top-2 left-2 text-red-400"><i data-lucide="trash" size="16"></i></button>
                <h4 class="font-bold text-white text-lg mb-3">${escapeHtml(p.name)}</h4>
                <p class="text-sm text-slate-400 mb-1">الحساب: <span class="text-white font-mono">${escapeHtml(p.account)}</span></p>
                <p class="text-sm text-slate-400 mb-1">الحد الأدنى: $${p.min_amount}</p>
                <button onclick="openFormModal('payment', ${p.id})" class="mt-3 w-full bg-slate-700 text-white rounded-lg py-1 text-sm">تعديل</button>
            </div>`;
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) { grid.innerHTML = `<div class="text-danger">${e.message}</div>`; }
}

// ================= النوافذ المنبثقة للإضافة والتعديل =================
window.openFormModal = async function(type, id = null) {
    editingItemId = id;
    const title = document.getElementById('formTitle');
    const body = document.getElementById('formBody');
    const saveBtn = document.getElementById('formSaveBtn');
    document.getElementById('formModal').classList.remove('hidden');
    document.getElementById('formModal').classList.add('flex');

    if (type === 'category') {
        title.innerText = id ? 'تعديل قسم' : 'إضافة قسم';
        body.innerHTML = `<div><label class="block mb-2 text-slate-400">اسم القسم</label><input type="text" id="catName" class="input-field mb-4"></div><div><label class="block mb-2 text-slate-400">رابط الصورة</label><input type="text" id="catImage" class="input-field" placeholder="URL"></div>`;
        saveBtn.onclick = () => saveItem('categories');
    } else if (type === 'product') {
        if (categoriesData.length === 0) await loadCategories(); // جلب الأقسام إذا لم تكن موجودة
        title.innerText = id ? 'تعديل منتج' : 'إضافة منتج';
        let catOptions = categoriesData.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        body.innerHTML = `
            <div><label class="block mb-2 text-slate-400">اسم المنتج</label><input type="text" id="prodName" class="input-field mb-4"></div>
            <div><label class="block mb-2 text-slate-400">القسم</label><select id="prodCat" class="input-field mb-4">${catOptions}</select></div>
            <div><label class="block mb-2 text-slate-400">السعر ($)</label><input type="number" id="prodPrice" class="input-field mb-4"></div>
            <div><label class="block mb-2 text-slate-400">رابط الصورة</label><input type="text" id="prodImage" class="input-field" placeholder="URL"></div>
        `;
        saveBtn.onclick = () => saveItem('products');
    } else if (type === 'payment') {
        title.innerText = id ? 'تعديل طريقة دفع' : 'إضافة طريقة دفع';
        body.innerHTML = `
            <div><label class="block mb-2 text-slate-400">اسم الطريقة</label><input type="text" id="payName" class="input-field mb-4"></div>
            <div><label class="block mb-2 text-slate-400">رقم الحساب</label><input type="text" id="payAccount" class="input-field mb-4"></div>
            <div class="grid grid-cols-2 gap-2">
                <div><label class="block mb-2 text-slate-400">الحد الأدنى</label><input type="number" id="payMin" class="input-field mb-4" value="0"></div>
                <div><label class="block mb-2 text-slate-400">الحد الأقصى</label><input type="number" id="payMax" class="input-field mb-4" value="0"></div>
            </div>
        `;
        saveBtn.onclick = () => saveItem('payments');
    }
};

window.closeFormModal = function() {
    document.getElementById('formModal').classList.add('hidden');
    document.getElementById('formModal').classList.remove('flex');
};

window.saveItem = async function(type) {
    const btn = document.getElementById('formSaveBtn');
    btn.textContent = 'جاري الحفظ...'; btn.disabled = true;
    let url = `${API_BASE}/admin/api/${type}`;
    let method = editingItemId ? 'PUT' : 'POST';
    if(editingItemId) url += `/${editingItemId}`;
    
    let body = {};
    if (type === 'categories') body = { name: document.getElementById('catName').value, image: document.getElementById('catImage').value };
    else if (type === 'products') body = { name: document.getElementById('prodName').value, category_id: document.getElementById('prodCat').value, base_price: document.getElementById('prodPrice').value, image: document.getElementById('prodImage').value };
    else if (type === 'payments') body = { name: document.getElementById('payName').value, account: document.getElementById('payAccount').value, min_amount: document.getElementById('payMin').value, max_amount: document.getElementById('payMax').value };

    try {
        const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(body) });
        if(res.ok) {
            Swal.fire({ title: 'تم', icon: 'success', timer: 1500, showConfirmButton: false });
            closeFormModal();
            if(type === 'categories') loadCategories();
            if(type === 'products') loadProducts();
            if(type === 'payments') loadPayments();
        } else Swal.fire('خطأ', 'حدث خطأ أثناء الحفظ', 'error');
    } catch(e) { Swal.fire('خطأ', 'تعذر الاتصال', 'error'); }
    finally { btn.textContent = 'حفظ'; btn.disabled = false; }
};

window.deleteItem = async function(type, id) {
    const confirm = await Swal.fire({ title: 'حذف', text: "هل أنت متأكد من الحذف/الأرشفة؟", icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم', background: '#1e293b', color: '#fff' });
    if (!confirm.isConfirmed) return;
    try {
        await fetch(`${API_BASE}/admin/api/${type}/${id}`, { method: 'DELETE', headers: getHeaders() });
        Swal.fire({ title: 'تم', icon: 'success', timer: 1000, showConfirmButton: false });
        if(type === 'categories') loadCategories();
        if(type === 'products') loadProducts();
        if(type === 'payments') loadPayments();
    } catch(e) { Swal.fire('خطأ', 'فشل الحذف', 'error'); }
};

// ================= الدعم الفني =================
window.switchSupportTab = function(status, btn) {
    currentSupportTab = status;
    document.querySelectorAll('#section-support .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('chatUserName').textContent = 'اختر تذكرة';
    document.getElementById('supportMessages').innerHTML = '';
    document.getElementById('supportReplyArea').style.display = 'none';
    document.getElementById('closeTicketBtn').classList.add('hidden');
    loadSupportTickets();
};

async function loadSupportTickets() {
    const list = document.getElementById('supportTicketsList');
    list.innerHTML = '<div class="text-center py-4 text-slate-400">جاري التحميل...</div>';
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/support/tickets?status=${currentSupportTab}`, { headers: getHeaders() });
        list.innerHTML = '';
        if (data.length === 0) { list.innerHTML = '<div class="text-center text-slate-400">لا توجد تذاكر.</div>'; return; }
        data.forEach(t => {
            list.innerHTML += `<div class="bg-dark p-4 rounded-xl cursor-pointer hover:bg-slate-800 transition mb-2" onclick="openSupportTicket(${t.id}, '${escapeHtml(t.user_name)}')"><div class="flex justify-between font-bold text-white mb-1"><span>${escapeHtml(t.user_name)}</span></div><div class="text-sm text-slate-400 truncate">${escapeHtml(t.last_message)}</div></div>`;
        });
    } catch (e) { list.innerHTML = `<div class="text-danger">${e.message}</div>`; }
}

window.openSupportTicket = async function(id, name) {
    currentTicketId = id;
    document.getElementById('chatUserName').textContent = name;
    document.getElementById('supportReplyArea').style.display = currentSupportTab === 'open' ? 'flex' : 'none';
    document.getElementById('closeTicketBtn').classList.toggle('hidden', currentSupportTab !== 'open');
    
    loadTicketMessages(); 
    if(adminChatPolling) clearInterval(adminChatPolling);
    adminChatPolling = setInterval(loadTicketMessages, 3000);
};

async function loadTicketMessages() {
    if (!currentTicketId) return;
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/support/tickets/${currentTicketId}`, { headers: getHeaders() });
        const container = document.getElementById('supportMessages'); container.innerHTML = '';
        data.messages.forEach(m => {
            const align = m.sender_type === 'admin' ? 'items-end' : 'items-start';
            const bg = m.sender_type === 'admin' ? 'bg-accent text-dark' : (m.sender_type === 'system' ? 'bg-warning text-dark text-center w-full' : 'bg-slate-700 text-white');
            container.innerHTML += `<div class="flex flex-col ${align}"><div class="${bg} p-3 rounded-2xl max-w-[80%] text-sm">${escapeHtml(m.message)}</div></div>`;
        });
        container.scrollTop = container.scrollHeight;
    } catch (e) { console.error(e); }
}

window.replySupportTicket = async function() {
    const input = document.getElementById('supportReplyInput'); const msg = input.value.trim();
    if (!msg || !currentTicketId) return;
    input.value = '';
    try {
        await fetch(`${API_BASE}/admin/api/support/tickets/${currentTicketId}/reply`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ reply: msg }) });
        loadTicketMessages();
    } catch (e) { console.error(e); }
};

window.closeSupportTicket = async function() {
    if(!currentTicketId) return;
    const confirm = await Swal.fire({ title: 'إغلاق التذكرة', text: "سيتم أرشفتها وإرسال رسالة للمستخدم.", icon: 'warning', showCancelButton: true, confirmButtonText: 'إغلاق', background: '#1e293b', color: '#fff' });
    if(!confirm.isConfirmed) return;
    try {
        await fetch(`${API_BASE}/admin/api/support/tickets/${currentTicketId}/close`, { method: 'POST', headers: getHeaders() });
        Swal.fire({ title: 'تم', text: 'تم إغلاق التذكرة وأرشفتها', icon: 'success', timer: 1500 });
        switchSupportTab('closed', document.querySelectorAll('#section-support .tab-btn')[1]);
    } catch(e) { Swal.fire('خطأ', 'فشل الإغلاق', 'error'); }
};

// ================= الأرشيف والإعدادات =================
async function loadArchive() {
    const container = document.getElementById('archiveContainer');
    container.innerHTML = '<div class="text-center py-4 text-slate-400">جاري جلب الأرشيف...</div>';
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/archive`, { headers: getHeaders() });
        container.innerHTML = '';
        if((!data.categories || data.categories.length === 0) && (!data.products || data.products.length === 0)) {
            container.innerHTML = '<div class="text-center text-slate-400 py-10">الأرشيف فارغ.</div>'; return;
        }
        
        let html = '';
        if(data.categories && data.categories.length > 0) {
            html += `<div class="glass p-6 rounded-3xl"><h4 class="text-lg font-bold mb-4 text-accent">أقسام مؤرشفة</h4><div class="grid grid-cols-2 md:grid-cols-4 gap-4">`;
            data.categories.forEach(c => {
                html += `<div class="bg-dark p-4 rounded-xl text-center border border-slate-700"><h5 class="font-bold text-white mb-2">${escapeHtml(c.name)}</h5><button onclick="restoreItem('categories', ${c.id})" class="bg-success text-white px-3 py-1 rounded text-sm">استرجاع</button></div>`;
            });
            html += `</div></div>`;
        }
        
        if(data.products && data.products.length > 0) {
            html += `<div class="glass p-6 rounded-3xl mt-6"><h4 class="text-lg font-bold mb-4 text-accent">منتجات مؤرشفة</h4><div class="grid grid-cols-2 md:grid-cols-4 gap-4">`;
            data.products.forEach(p => {
                html += `<div class="bg-dark p-4 rounded-xl text-center border border-slate-700"><img src="${p.image || ''}" class="w-12 h-12 rounded mx-auto mb-2 object-cover"><h5 class="font-bold text-white mb-2">${escapeHtml(p.name)}</h5><button onclick="restoreItem('products', ${p.id})" class="bg-success text-white px-3 py-1 rounded text-sm">استرجاع</button></div>`;
            });
            html += `</div></div>`;
        }
        container.innerHTML = html;
    } catch(e) { container.innerHTML = `<div class="text-danger text-center">${e.message}</div>`; }
}

window.restoreItem = async function(type, id) {
    try {
        await fetch(`${API_BASE}/admin/api/${type}/${id}/restore`, { method: 'POST', headers: getHeaders() });
        Swal.fire({ title: 'تم', text: 'تم الاسترجاع بنجاح', icon: 'success', timer: 1500 });
        loadArchive();
    } catch(e) { Swal.fire('خطأ', 'فشل الاسترجاع', 'error'); }
};

async function loadSettings() {
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/settings`, { headers: getHeaders() });
        document.getElementById('setStoreName').value = data.store_name || 'SANAD+';
        document.getElementById('setSupportLink').value = data.support_link || '';
        document.getElementById('setExchangeRate').value = data.exchange_rate || 132;
    } catch (e) { console.error(e); }
}

window.saveSettings = async function() {
    const name = document.getElementById('setStoreName').value;
    const link = document.getElementById('setSupportLink').value;
    const rate = document.getElementById('setExchangeRate').value;
    try {
        await fetch(`${API_BASE}/admin/api/settings`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ store_name: name, support_link: link, exchange_rate: rate }) });
        Swal.fire('تم', 'تم حفظ الإعدادات', 'success');
    } catch (e) { Swal.fire('خطأ', 'فشل الحفظ', 'error'); }
};

// ================= دوال مساعدة =================
window.closeModal = function() { document.getElementById('detailsModal').classList.add('hidden'); document.getElementById('detailsModal').classList.remove('flex'); };

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
