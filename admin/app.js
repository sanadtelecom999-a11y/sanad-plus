// ================= Global Error Catcher =================
window.onerror = function(msg, url, line) {
    alert("حدث خطأ في الكود:\n" + msg + "\nفي السطر: " + line);
    return false;
};

// ================= Configuration & State =================
const API_BASE = 'https://sanad-plus-backend.onrender.com';
let currentSessionId = null;
let dashboardChartInstance = null;
let analyticsChartInstance = null;
let currentInboxTab = 'orders';
let currentSupportTab = 'open';
let currentArchiveTab = 'orders';
let cachedItems = {};
let cachedCategories = [];
let cachedProducts = [];
let cachedPayments = [];
let currentArchiveData = [];
let currentSelectedUser = null;
let currentTicketId = null;
let adminChatPolling = null;
let allUsersData = [];
let selectedOrders = new Set();
let selectedUsers = new Set();

// ================= Initialization & Security =================
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    setupGlobalSearch();
    const token = localStorage.getItem('admin_token');
    if (!token) {
        showLoginScreen();
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
        showLoginScreen();
    }
}

function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboardScreen').style.display = 'none';
}

function showToast(message, type = 'error') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div'); container.id = 'toastContainer';
        container.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); z-index:9999; display:flex; flex-direction:column; gap:10px; width:90%; max-width:350px; pointer-events:none;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)';
    toast.style.cssText = `background: ${bgColor}; backdrop-filter: blur(10px); color: white; padding: 12px 16px; border-radius: 12px; font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);`;
    toast.innerHTML = `<i data-lucide="${type === 'error' ? 'alert-circle' : 'check-circle'}" size="20"></i> <span>${message}</span>`;
    container.appendChild(toast); if (typeof lucide !== 'undefined') lucide.createIcons();
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
}

async function safeFetch(url, options = {}) {
    try {
        const separator = url.includes('?') ? '&' : '?';
        const finalUrl = url + separator + '_t=' + new Date().getTime();
        const res = await fetch(finalUrl, { ...options, cache: 'no-store' });
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) throw new Error("السيرفر غير متاح");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `خطأ: ${res.status}`);
        return data;
    } catch (error) { throw error; }
}

// ================= Theme & Search =================
function loadTheme() {
    const isLight = localStorage.getItem('theme') === 'light';
    if (isLight) {
        document.body.classList.add('light-mode');
        const icon = document.getElementById('themeIcon');
        if(icon) icon.setAttribute('data-lucide', 'sun');
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    const icon = document.getElementById('themeIcon');
    if(icon) {
        icon.setAttribute('data-lucide', isLight ? 'sun' : 'moon');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

function setupGlobalSearch() {
    const input = document.getElementById('globalSearchInput');
    const results = document.getElementById('globalSearchResults');
    if(!input || !results) return;

    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if(query.length < 2) { results.classList.add('hidden'); return; }
        let html = '';
        const matchedUsers = allUsersData.filter(u => (u.first_name || '').toLowerCase().includes(query) || String(u.telegram_id).includes(query)).slice(0, 3);
        if(matchedUsers.length > 0) {
            html += `<div class="search-section-title">مستخدمين</div>`;
            matchedUsers.forEach(u => { html += `<div class="search-item" onclick="goToUserFromSearch(${u.id})"><i data-lucide="user" size="16" class="text-accent"></i> <div><div class="font-bold text-white">${escapeHtml(u.first_name)}</div><div class="text-xs text-slate-400 font-mono">${u.telegram_id}</div></div></div>`; });
        }
        if(cachedItems['orders']) {
            const matchedOrders = cachedItems['orders'].filter(o => o.order_number.toLowerCase().includes(query)).slice(0, 3);
            if(matchedOrders.length > 0) {
                html += `<div class="search-section-title">طلبات</div>`;
                matchedOrders.forEach(o => { html += `<div class="search-item" onclick="goToItemFromSearch('orders', ${o.id})"><i data-lucide="package" size="16" class="text-warning"></i> <div><div class="font-bold text-white">${o.order_number}</div><div class="text-xs text-slate-400">${escapeHtml(o.product_name)}</div></div></div>`; });
            }
        }
        if(html === '') html = '<div class="p-4 text-center text-slate-400">لا توجد نتائج</div>';
        results.innerHTML = html; results.classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });
    document.addEventListener('click', (e) => { if(!input.contains(e.target) && !results.contains(e.target)) results.classList.add('hidden'); });
}

function goToUserFromSearch(id) {
    document.getElementById('globalSearchResults').classList.add('hidden');
    document.getElementById('globalSearchInput').value = '';
    switchSection('users', document.querySelectorAll('.nav-btn')[8]);
    setTimeout(() => { const user = allUsersData.find(u => u.id === id); if(user) openUserDrawer(user); }, 500);
}

function goToItemFromSearch(type, id) {
    document.getElementById('globalSearchResults').classList.add('hidden');
    document.getElementById('globalSearchInput').value = '';
    switchSection('inbox', document.querySelectorAll('.nav-btn')[1]);
    setTimeout(() => { viewDetails(type, id); }, 500);
}

// ================= Auth =================
async function handleLogin() {
    const user = document.getElementById('loginUser').value;
    const pass = document.getElementById('loginPass').value;
    const btn = document.getElementById('loginBtn');
    if (!user || !pass) return showToast('أدخل البيانات أولاً', 'error');
    btn.textContent = 'جاري التحقق...'; btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password: pass }) });
        const data = await res.json();
        if (res.ok && data.require_otp) {
            currentSessionId = data.session_id;
            document.getElementById('loginStep1').classList.add('hidden');
            document.getElementById('loginStep2').classList.remove('hidden');
            showToast('تم إرسال رمز التحقق إلى تيليجرام', 'success');
        } else { showToast(data.error || 'بيانات غير صحيحة', 'error'); }
    } catch (e) { showToast('تعذر الاتصال', 'error'); } 
    finally { btn.textContent = 'تسجيل الدخول'; btn.disabled = false; }
}

async function verifyOTP() {
    const code = document.getElementById('otpCode').value;
    const btn = document.getElementById('otpBtn');
    if (!code) return showToast('أدخل رمز التحقق', 'error');
    btn.textContent = 'جاري التحقق...'; btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/admin/verify-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: currentSessionId, otp_code: code }) });
        const data = await res.json();
        if (res.ok && data.token) {
            localStorage.setItem('admin_token', data.token);
            showToast('مرحباً بك', 'success');
            setTimeout(() => location.reload(), 1000);
        } else { showToast(data.error || 'رمز خاطئ', 'error'); } 
    } catch (e) { showToast('تعذر الاتصال', 'error'); } 
    finally { btn.textContent = 'تأكيد الرمز'; btn.disabled = false; }
}

function logout() { localStorage.removeItem('admin_token'); location.reload(); }
function getHeaders() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }; }

function showDashboard() {
    loadDashboardStats(); loadAnalytics(); initChart(); checkInboxBadge();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function switchSection(sectionId, btn) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    const target = document.getElementById('section-' + sectionId);
    if (target) target.classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active', 'bg-slate-700/50', 'text-white'));
    if (btn) btn.classList.add('active', 'bg-slate-700/50', 'text-white');
    const titles = { 'dashboard': 'لوحة التحكم', 'inbox': 'الإرساليات', 'support': 'تذاكر الدعم', 'users': 'إدارة المستخدمين', 'archive': 'الأرشيف الكامل', 'categories': 'إدارة الأقسام', 'products': 'إدارة المنتجات', 'payments': 'طرق الدفع', 'notifications': 'الإشعارات', 'settings': 'الإعدادات', 'audit': 'التدقيق المالي' };
    document.getElementById('page-title').innerText = titles[sectionId] || 'لوحة التحكم';
    document.querySelector('aside').classList.remove('open');
    if (sectionId === 'inbox') loadInbox(currentInboxTab);
    if (sectionId === 'support') loadSupportTickets();
    if (sectionId === 'users') loadUsers();
    if (sectionId === 'archive') loadArchiveData(currentArchiveTab);
    if (sectionId === 'categories') loadCategories();
    if (sectionId === 'products') loadProducts();
    if (sectionId === 'payments') loadPayments();
    if (sectionId === 'settings') loadSettings();
    if (sectionId === 'audit') loadAuditLog();
}

function toggleSidebar() { document.querySelector('aside').classList.toggle('open'); }

// ================= Stats & Charts =================
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
        const topProdList = document.getElementById('topProductsList');
        topProdList.innerHTML = data.top_products.length ? data.top_products.map(p => `<div class="flex justify-between border-b border-slate-700/50 pb-2"><span class="text-white font-bold">${escapeHtml(p.name)}</span><span class="text-accent font-bold">${p.count} طلب</span></div>`).join('') : '<div class="text-slate-400">لا توجد بيانات</div>';
        const topUserList = document.getElementById('topUsersList');
        topUserList.innerHTML = data.top_users.length ? data.top_users.map(u => `<div class="flex justify-between border-b border-slate-700/50 pb-2"><span class="text-white font-bold">${escapeHtml(u.name)}</span><span class="text-success font-bold">$${u.total.toFixed(2)}</span></div>`).join('') : '<div class="text-slate-400">لا توجد بيانات</div>';
        const ctx = document.getElementById('analyticsChart');
        if(!ctx) return;
        if(analyticsChartInstance) analyticsChartInstance.destroy();
        analyticsChartInstance = new Chart(ctx, { type: 'bar', data: { labels: ['طلبات مكتملة', 'إيداعات مرفوضة'], datasets: [{ label: 'العدد', data: [data.top_products.reduce((a,b)=>a+b.count,0), data.rejected_deposits], backgroundColor: ['#10b981', '#ef4444'], borderRadius: 8 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#94a3b8' } }, y: { ticks: { color: '#94a3b8' } } } } });
    } catch(e) { console.error(e); }
}

function initChart() {
    const ctx = document.getElementById('dashboardChart');
    if(!ctx || typeof Chart === 'undefined') return;
    if(dashboardChartInstance) dashboardChartInstance.destroy(); 
    dashboardChartInstance = new Chart(ctx, { type: 'line', data: { labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'], datasets: [{ label: 'حركة المبيعات ($)', data: [12, 19, 3, 5, 2, 3, 10], borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.1)', fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff' } } }, scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } } } } });
}

// ================= Bulk Actions =================
function toggleOrderSelection(id, isChecked) {
    if(isChecked) selectedOrders.add(id); else selectedOrders.delete(id);
    updateBulkBar();
}

function toggleUserSelection(id, isChecked) {
    if(isChecked) selectedUsers.add(id); else selectedUsers.delete(id);
    updateBulkBar();
}

function updateBulkBar() {
    const bar = document.getElementById('bulkActionBar');
    const count = document.getElementById('bulkCount');
    const btn = document.getElementById('bulkActionBtn');
    const total = selectedOrders.size + selectedUsers.size;

    if(total > 0) {
        bar.classList.remove('hidden');
        bar.classList.add('flex');
        count.innerText = total;
        
        if(selectedOrders.size > 0 && selectedUsers.size === 0) {
            btn.innerText = 'إكمال الطلبات المحددة';
            btn.onclick = bulkCompleteOrders;
        } else if (selectedUsers.size > 0 && selectedOrders.size === 0) {
            btn.innerText = 'حظر المستخدمين المحددين';
            btn.onclick = bulkBanUsers;
        } else {
            btn.innerText = 'تنفيذ';
            btn.onclick = () => showToast('لا يمكن دمج الإجراءات', 'error');
        }
    } else {
        bar.classList.add('hidden');
        bar.classList.remove('flex');
    }
}

function clearBulkSelection() {
    selectedOrders.clear();
    selectedUsers.clear();
    document.querySelectorAll('.bulk-checkbox').forEach(cb => cb.checked = false);
    updateBulkBar();
}

async function bulkCompleteOrders() {
    const confirm = await Swal.fire({ title: 'تحديث جماعي', text: `سيتم إكمال ${selectedOrders.size} طلب. هل أنت متأكد؟`, icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم', background: '#1e293b', color: '#fff' });
    if(!confirm.isConfirmed) return;
    let success = 0;
    for (let id of selectedOrders) {
        try { await fetch(`${API_BASE}/admin/api/orders/${id}/status`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ status: 'completed' }) }); success++; } catch(e) {}
    }
    showToast(`تم إكمال ${success} طلب بنجاح`, 'success');
    clearBulkSelection(); loadInbox('orders');
}

async function bulkBanUsers() {
    const confirm = await Swal.fire({ title: 'حظر جماعي', text: `سيتم حظر ${selectedUsers.size} مستخدم. هل أنت متأكد؟`, icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم', background: '#1e293b', color: '#fff' });
    if(!confirm.isConfirmed) return;
    let success = 0;
    for (let id of selectedUsers) {
        try { await fetch(`${API_BASE}/admin/api/users/${id}/ban`, { method: 'POST', headers: getHeaders() }); success++; } catch(e) {}
    }
    showToast(`تم حظر ${success} مستخدم بنجاح`, 'success');
    clearBulkSelection(); loadUsers();
}

// ================= Inbox =================
function switchInboxTab(type, btn) {
    currentInboxTab = type;
    document.querySelectorAll('#section-inbox .inbox-tab').forEach(b => { b.classList.remove('active', 'bg-accent', 'text-dark'); b.classList.add('glass', 'text-slate-400'); });
    btn.classList.remove('glass', 'text-slate-400'); btn.classList.add('active', 'bg-accent', 'text-dark');
    clearBulkSelection();
    loadInbox(type);
}

async function loadInbox(type) {
    const container = document.getElementById('inboxContainer');
    container.innerHTML = '<div class="col-span-full text-center py-10"><i data-lucide="loader" class="animate-spin text-accent mx-auto mb-2"></i><p class="text-slate-400">جاري التحميل...</p></div>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
    let endpoint = type === 'deposits' ? '/admin/api/deposits' : type === 'orders' ? '/admin/api/orders' : '/admin/api/kyc';
    try {
        const data = await safeFetch(`${API_BASE}${endpoint}`, { headers: getHeaders() });
        cachedItems[type] = data;
        container.innerHTML = '';
        if (!data || data.length === 0) { container.innerHTML = '<div class="col-span-full text-center py-10 text-slate-400">لا توجد عناصر حالياً.</div>'; return; }
        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'inbox-card';
            if (type === 'orders') {
                card.innerHTML = `<div class="flex items-center gap-2 mb-2"><input type="checkbox" class="bulk-checkbox w-5 h-5 accent-accent" onclick="event.stopPropagation(); toggleOrderSelection(${item.id}, this.checked)"><div class="flex-1 cursor-pointer" onclick="viewDetails('orders', ${item.id})"><div class="inbox-header"><span class="text-accent font-mono text-sm">${item.order_number}</span><span class="badge bg-warning/20 text-warning px-2 py-1 rounded">$${parseFloat(item.total_price).toFixed(2)}</span></div><div class="inbox-details"><strong>${escapeHtml(item.product_name)}</strong><br>الكمية: ${item.quantity} | ${escapeHtml(item.user_name)} <span class="text-xs text-slate-500 font-mono">(#${item.user_telegram})</span></div></div></div>`;
            } else if (type === 'deposits') {
                card.innerHTML = `<div class="cursor-pointer" onclick="viewDetails('deposits', ${item.id})"><div class="inbox-header"><span class="text-accent font-mono text-sm">${item.transaction_id}</span><span class="badge bg-success/20 text-success px-2 py-1 rounded">$${parseFloat(item.amount).toFixed(2)}</span></div><div class="inbox-details"><strong>إيداع</strong><br>${escapeHtml(item.user_name)}</div></div>`;
            } else {
                card.innerHTML = `<div class="cursor-pointer" onclick="viewDetails('kyc', ${item.id})"><div class="inbox-header"><span class="text-accent font-mono text-sm">KYC #${item.id}</span></div><div class="inbox-details"><strong>${escapeHtml(item.full_name)}</strong><br>${escapeHtml(item.phone)}</div></div>`;
            }
            container.appendChild(card);
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) { container.innerHTML = `<div class="col-span-full text-center py-10 text-danger">${e.message}</div>`; }
}

function viewDetails(type, id) {
    const item = cachedItems[type].find(x => x.id === id);
    if (!item) return;
    const modal = document.getElementById('detailsModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');
    modal.classList.remove('hidden');

    if (type === 'orders') {
        title.textContent = `تفاصيل الطلب: ${item.order_number}`;
        let deliveryStr = '';
        try { const parsed = typeof item.delivery_data === 'string' ? JSON.parse(item.delivery_data) : item.delivery_data; deliveryStr = Object.values(parsed).join(', '); } catch(e) { deliveryStr = item.delivery_data || ''; }
        body.innerHTML = `<div class="grid grid-cols-2 gap-4 mb-4"><div><span class="text-slate-500 text-xs block">المستخدم</span> <strong class="text-white">${escapeHtml(item.user_name)}</strong></div><div><span class="text-slate-500 text-xs block">الآيدي</span> <strong class="text-white font-mono">${item.user_telegram || '-'}</strong></div><div><span class="text-slate-500 text-xs block">المنتج</span> <strong class="text-white">${escapeHtml(item.product_name)}</strong></div><div><span class="text-slate-500 text-xs block">الكمية</span> <strong class="text-white">${item.quantity}</strong></div><div><span class="text-slate-500 text-xs block">الإجمالي</span> <strong class="text-success text-lg">$${parseFloat(item.total_price).toFixed(2)}</strong></div></div><div><label class="modal-label">بيانات الاستلام</label><div class="copy-input-group"><input type="text" id="deliveryDataInput" class="copy-input" value="${escapeHtml(deliveryStr)}" readonly><button onclick="copyToClipboard('deliveryDataInput')" class="copy-btn"><i data-lucide="copy" size="18"></i></button></div></div><div><label class="modal-label">ملاحظة الإدارة</label><textarea id="adminNote" class="admin-note-input" placeholder="اكتب ملاحظتك هنا..."></textarea></div>`;
        footer.innerHTML = `<div class="modal-actions"><button onclick="handleAction('orders', ${item.id}, 'status', 'failed')" class="btn-reject">رفض</button><button onclick="handleAction('orders', ${item.id}, 'status', 'completed')" class="btn-complete">إكمال</button></div>`;
    } else if (type === 'deposits') {
        title.textContent = `إيصال إيداع: ${item.transaction_id}`;
        body.innerHTML = `<div class="space-y-2 mb-4"><p><strong>المستخدم:</strong> ${escapeHtml(item.user_name)} (${item.user_telegram})</p><p><strong>المبلغ:</strong> $${parseFloat(item.amount).toFixed(2)}</p><p><strong>اسم المرسل:</strong> ${escapeHtml(item.sender_name || 'غير محدد')}</p></div><div class="rounded-xl overflow-hidden border border-slate-600">${item.proof_image ? `<img src="${item.proof_image}" class="w-full h-auto object-contain max-h-64">` : '<p class="text-center p-4">لا توجد صورة</p>'}</div><div class="mt-4"><label class="modal-label">ملاحظة الإدارة</label><textarea id="adminNote" class="admin-note-input" placeholder="اكتب ملاحظتك هنا..."></textarea></div>`;
        footer.innerHTML = `<button onclick="handleAction('deposits', ${item.id}, 'approve')" class="btn-action btn-approve">قبول</button><button onclick="handleAction('deposits', ${item.id}, 'reject')" class="btn-action btn-reject-action">رفض</button>`;
    } else {
        title.textContent = `طلب توثيق #${item.id}`;
        body.innerHTML = `<div class="space-y-2 mb-4"><p><strong>الاسم:</strong> ${escapeHtml(item.full_name)}</p><p><strong>الهاتف:</strong> ${escapeHtml(item.phone)}</p><p><strong>العنوان:</strong> ${escapeHtml(item.address)}</p></div><div class="rounded-xl overflow-hidden border border-slate-600">${item.selfie_image ? `<img src="${item.selfie_image}" class="w-full h-auto object-contain max-h-64">` : '<p class="text-center p-4">لا توجد صورة</p>'}</div>`;
        footer.innerHTML = `<button onclick="handleAction('kyc', ${item.id}, 'approve')" class="btn-action btn-approve">قبول</button><button onclick="handleAction('kyc', ${item.id}, 'reject')" class="btn-action btn-reject-action">رفض</button>`;
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function copyToClipboard(elementId) {
    const input = document.getElementById(elementId); input.select(); document.execCommand('copy');
    showToast('تم النسخ بنجاح', 'success');
}

async function handleAction(type, id, action, extra) {
    const adminNote = document.getElementById('adminNote')?.value || '';
    const confirm = await Swal.fire({ title: 'تأكيد', text: "هل أنت متأكد؟", icon: 'warning', showCancelButton: true, confirmButtonColor: '#10b981', cancelButtonColor: '#ef4444', confirmButtonText: 'نعم', cancelButtonText: 'إلغاء', background: '#1e293b', color: '#fff' });
    if (!confirm.isConfirmed) return;
    let endpoint = ''; let body = { admin_note: adminNote };
    if (type === 'deposits') endpoint = `/admin/api/deposits/${id}/${action}`;
    else if (type === 'orders') { endpoint = `/admin/api/orders/${id}/status`; body.status = extra; }
    else if (type === 'kyc') endpoint = `/admin/api/kyc/${id}/${action}`;
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) throw new Error("السيرفر غير متاح.");
        const data = await res.json();
        if (res.ok) {
            closeModal(); showToast('تمت العملية بنجاح', 'success');
            loadDashboardStats(); loadInbox(type); checkInboxBadge();
        } else { showToast(data.error || 'حدث خطأ', 'error'); }
    } catch (e) { showToast(e.message, 'error'); }
}

function closeModal() { document.getElementById('detailsModal').classList.add('hidden'); }
async function checkInboxBadge() {
    try {
        const res = await fetch(`${API_BASE}/admin/api/inbox/counts`, { headers: getHeaders() });
        if (res.ok) {
            const data = await res.json(); const total = (data.deposits || 0) + (data.orders || 0) + (data.kyc || 0);
            const badge = document.getElementById('sidebarInboxBadge');
            if (total > 0) { badge.textContent = total > 99 ? '99+' : total; badge.classList.remove('hidden'); } else { badge.classList.add('hidden'); }
        }
    } catch(e) {}
}

// ================= Support =================
function switchSupportTab(status, btn) {
    currentSupportTab = status;
    document.querySelectorAll('#section-support .inbox-tab').forEach(b => { b.classList.remove('active', 'bg-accent', 'text-dark'); b.classList.add('glass', 'text-slate-400'); });
    btn.classList.remove('glass', 'text-slate-400'); btn.classList.add('active', 'bg-accent', 'text-dark');
    document.getElementById('supportChatPlaceholder').classList.remove('hidden');
    document.getElementById('supportChatContent').classList.add('hidden');
    document.getElementById('supportChatContent').classList.remove('flex');
    currentTicketId = null; stopAdminPolling();
    loadSupportTickets();
}

async function loadSupportTickets() {
    const list = document.getElementById('supportTicketsList');
    if (!list) return;
    list.innerHTML = '<div class="text-center py-4 text-slate-400"><i data-lucide="loader" class="animate-spin mx-auto mb-2"></i>جاري التحميل...</div>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/support/tickets?status=${currentSupportTab}`, { headers: getHeaders() });
        list.innerHTML = '';
        if (data.length === 0) { list.innerHTML = '<div class="text-center py-4 text-slate-400">لا توجد تذاكر.</div>'; return; }
        data.forEach(t => {
            const el = document.createElement('div');
            el.className = 'support-ticket-item'; el.id = `ticket-${t.id}`;
            el.onclick = () => openSupportTicket(t.id, t.user_name, t.user_telegram);
            el.innerHTML = `<div class="flex justify-between items-center mb-1"><strong class="text-white">${escapeHtml(t.user_name)}</strong><span class="text-xs text-slate-500 font-mono">${t.user_telegram}</span></div><div class="text-sm text-slate-400 truncate">${escapeHtml(t.last_message)}</div><div class="flex justify-between items-center mt-2"><div class="text-xs text-accent">${new Date(t.updated_at).toLocaleDateString('ar-EG')}</div>${t.status === 'closed' ? '<span class="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">مغلقة</span>' : ''}</div>`;
            list.appendChild(el);
        });
    } catch(e) { list.innerHTML = `<div class="text-danger text-sm p-3">${e.message}</div>`; }
}

function openSupportTicket(id, name, telegram) {
    currentTicketId = id;
    document.querySelectorAll('.support-ticket-item').forEach(el => el.classList.remove('active'));
    const el = document.getElementById(`ticket-${id}`); if (el) el.classList.add('active');
    document.getElementById('supportChatPlaceholder').classList.add('hidden');
    const chat = document.getElementById('supportChatContent'); chat.classList.remove('hidden'); chat.classList.add('flex');
    document.getElementById('chatUserName').textContent = `${name} (#${telegram})`;
    const closeBtn = document.getElementById('closeTicketBtn');
    const input = document.getElementById('supportReplyInput');
    if (currentSupportTab === 'closed') {
        if (closeBtn) closeBtn.style.display = 'none';
        if (input) { input.disabled = true; input.placeholder = "التذكرة مغلقة"; }
    } else {
        if (closeBtn) closeBtn.style.display = 'block';
        if (input) { input.disabled = false; input.placeholder = "اكتب ردك هنا..."; }
    }
    loadTicketMessages(); startAdminPolling();
}

async function loadTicketMessages() {
    if (!currentTicketId) return;
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/support/tickets/${currentTicketId}`, { headers: getHeaders() });
        const container = document.getElementById('supportMessages');
        container.innerHTML = '';
        data.messages.forEach(m => {
            const bubble = document.createElement('div');
            bubble.className = `chat-bubble ${m.sender_type}`;
            bubble.innerHTML = `<span class="chat-sender">${m.sender_type === 'user' ? 'المستخدم' : (m.sender_type === 'admin' ? 'أنت' : 'النظام')}</span><span>${escapeHtml(m.message)}</span><span class="chat-time">${new Date(m.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>`;
            container.appendChild(bubble);
        });
        container.scrollTop = container.scrollHeight;
    } catch(e) { console.error("Polling Error:", e); }
}

function startAdminPolling() {
    if (adminChatPolling) clearInterval(adminChatPolling);
    adminChatPolling = setInterval(() => { if (currentTicketId) loadTicketMessages(); }, 3000);
}

function stopAdminPolling() { if (adminChatPolling) { clearInterval(adminChatPolling); adminChatPolling = null; } }

async function replySupportTicket() {
    if (!currentTicketId) return;
    const input = document.getElementById('supportReplyInput'); const reply = input.value.trim();
    if (!reply) return;
    input.value = ''; input.disabled = true;
    try {
        await safeFetch(`${API_BASE}/admin/api/support/tickets/${currentTicketId}/reply`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ reply }) });
        showToast('تم إرسال الرد', 'success'); loadTicketMessages();
    } catch(e) { showToast(e.message, 'error'); } 
    finally { input.disabled = false; input.focus(); }
}

async function closeSupportTicket() {
    if (!currentTicketId) return;
    const confirm = await Swal.fire({ title: 'إغلاق التذكرة', text: "سيتم أرشفتها.", icon: 'warning', showCancelButton: true, confirmButtonText: 'إغلاق', background: '#1e293b', color: '#fff' });
    if (!confirm.isConfirmed) return;
    try {
        await safeFetch(`${API_BASE}/admin/api/support/tickets/${currentTicketId}/close`, { method: 'POST', headers: getHeaders() });
        showToast('تم إغلاق التذكرة وأرشفتها', 'success');
        document.getElementById('supportChatContent').classList.add('hidden');
        document.getElementById('supportChatContent').classList.remove('flex');
        document.getElementById('supportChatPlaceholder').classList.remove('hidden');
        currentTicketId = null; stopAdminPolling(); 
        switchSupportTab('closed', document.querySelectorAll('#section-support .inbox-tab')[1]);
    } catch(e) { showToast(e.message, 'error'); }
}

// ================= Users =================
async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-slate-400"><i data-lucide="loader" class="animate-spin mx-auto mb-2"></i>جاري التحميل...</td></tr>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/users`, { headers: getHeaders() });
        allUsersData = data; renderUsersTable(data);
    } catch (e) { tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">${e.message}</td></tr>`; }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody'); tbody.innerHTML = '';
    if (users.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-slate-400">لا يوجد مستخدمون.</td></tr>'; return; }
    users.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="py-3 px-4"><input type="checkbox" class="bulk-checkbox w-5 h-5 accent-accent" onclick="toggleUserSelection(${u.id}, this.checked)"></td><td class="py-3 px-4"><div class="user-row"><div class="user-avatar-small">${(u.first_name || 'U')[0]}</div><span class="font-bold text-white">${escapeHtml(u.first_name || 'مستخدم')}</span></div></td><td class="py-3 px-4 font-mono text-sm text-slate-400">${u.telegram_id}</td><td class="py-3 px-4 font-bold ${u.balance < 0 ? 'text-danger' : 'text-success'}">$${parseFloat(u.balance).toFixed(2)}</td><td class="py-3 px-4">${u.is_banned ? '<span class="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-bold">محظور</span>' : '<span class="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold">نشط</span>'}</td><td class="py-3 px-4"><button onclick="openUserDrawer(${u.id})" class="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs transition">إدارة</button></td>`;
        tbody.appendChild(tr);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

document.getElementById('userSearchInput')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allUsersData.filter(u => (u.first_name || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q) || String(u.telegram_id).includes(q));
    renderUsersTable(filtered);
});

function openUserDrawer(id) {
    const user = allUsersData.find(u => u.id === id);
    if(!user) return;
    currentSelectedUser = user;
    document.getElementById('drawerAvatar').textContent = (user.first_name || 'U')[0];
    document.getElementById('drawerName').textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'مستخدم';
    document.getElementById('drawerId').textContent = user.telegram_id;
    document.getElementById('drawerBalance').textContent = `$${parseFloat(user.balance).toFixed(2)}`;
    document.getElementById('drawerOrders').textContent = user.orders_count || 0;
    document.getElementById('userBanToggle').checked = user.is_banned;
    document.getElementById('discountPercent').value = user.general_discount || 0;
    document.getElementById('balanceAmount').value = '';
    document.getElementById('userDrawerOverlay').classList.remove('hidden');
    document.getElementById('userDrawer').classList.remove('translate-x-full');
}

function closeUserDrawer() {
    document.getElementById('userDrawerOverlay').classList.add('hidden');
    document.getElementById('userDrawer').classList.add('translate-x-full');
    currentSelectedUser = null;
}

function quickBalance(amount) {
    document.getElementById('balanceAmount').value = Math.abs(amount);
    if(amount > 0) adjustBalance('add');
    else adjustBalance('subtract');
}

async function adjustBalance(action) {
    if (!currentSelectedUser) return;
    const amount = parseFloat(document.getElementById('balanceAmount').value);
    if (!amount || amount <= 0) return showToast('أدخل مبلغاً صحيحاً', 'error');
    const finalAmount = action === 'add' ? amount : -amount;
    const actionText = action === 'add' ? 'إضافة' : 'خصم';
    const confirm = await Swal.fire({ title: 'تأكيد', text: `هل تريد ${actionText} $${amount}؟`, icon: 'warning', showCancelButton: true, confirmButtonColor: action === 'add' ? '#10b981' : '#ef4444', confirmButtonText: 'نعم', cancelButtonText: 'إلغاء', background: '#1e293b', color: '#fff' });
    if (!confirm.isConfirmed) return;
    try {
        await safeFetch(`${API_BASE}/admin/api/users/${currentSelectedUser.id}/balance`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ amount: finalAmount, note: `${actionText} يدوي` }) });
        showToast(`تم ${actionText} الرصيد بنجاح`, 'success');
        currentSelectedUser.balance = parseFloat(currentSelectedUser.balance) + finalAmount;
        document.getElementById('drawerBalance').textContent = `$${currentSelectedUser.balance.toFixed(2)}`;
        document.getElementById('balanceAmount').value = '';
        loadUsers();
    } catch(e) { showToast(e.message, 'error'); }
}

async function toggleBan() {
    if (!currentSelectedUser) return;
    const isBanned = document.getElementById('userBanToggle').checked;
    try {
        await safeFetch(`${API_BASE}/admin/api/users/${currentSelectedUser.id}/ban`, { method: 'POST', headers: getHeaders() });
        currentSelectedUser.is_banned = isBanned;
        showToast(isBanned ? 'تم حظر المستخدم' : 'تم فك الحظر', 'success');
        loadUsers();
    } catch(e) { showToast(e.message, 'error'); }
}

async function setDiscount() {
    if (!currentSelectedUser) return;
    const percent = parseFloat(document.getElementById('discountPercent').value) || 0;
    if (percent < 0 || percent > 100) return showToast('النسبة يجب أن تكون بين 0 و 100', 'error');
    try {
        await safeFetch(`${API_BASE}/admin/api/users/${currentSelectedUser.id}/discounts/general`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ percent }) });
        currentSelectedUser.general_discount = percent;
        showToast('تم حفظ نسبة الخصم', 'success');
        loadUsers();
    } catch(e) { showToast(e.message, 'error'); }
}

// ================= Categories =================
async function loadCategories() {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '<div class="col-span-full text-center py-4 text-slate-400"><i data-lucide="loader" class="animate-spin mx-auto mb-2"></i>جاري التحميل...</div>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/categories`, { headers: getHeaders() });
        cachedCategories = data;
        grid.innerHTML = '';
        if(data.length === 0) { grid.innerHTML = '<div class="col-span-full text-center py-10 text-slate-400">لا توجد أقسام.</div>'; return; }
        
        data.forEach(c => {
            grid.innerHTML += `
                <div class="cat-card">
                    <img src="${c.image || 'https://via.placeholder.com/60'}" class="w-16 h-16 rounded-xl mx-auto mb-3 object-cover">
                    <h4 class="font-bold text-white mb-2">${escapeHtml(c.name)}</h4>
                    <button onclick="deleteCategory(${c.id})" class="text-danger text-xs bg-red-500/10 px-3 py-1 rounded hover:bg-red-500/20">حذف</button>
                </div>
            `;
        });
    } catch(e) { grid.innerHTML = `<div class="text-danger">${e.message}</div>`; }
}

function openCategoryModal() {
    document.getElementById('formTitle').innerText = 'إضافة قسم جديد';
    document.getElementById('formBody').innerHTML = `
        <div><label class="text-sm text-slate-400 block mb-2">اسم القسم</label><input type="text" id="catName" class="input-field"></div>
        <div><label class="text-sm text-slate-400 block mb-2">صورة القسم</label><input type="file" id="catImage" class="input-field bg-slate-800" accept="image/*"></div>
    `;
    document.getElementById('formSaveBtn').onclick = saveCategory;
    document.getElementById('formModal').classList.remove('hidden');
}

async function saveCategory() {
    const name = document.getElementById('catName').value;
    const fileInput = document.getElementById('catImage');
    if(!name) return showToast('أدخل اسم القسم', 'error');
    
    let imageBase64 = null;
    if (fileInput.files.length > 0) {
        imageBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(fileInput.files[0]);
        });
    }

    try {
        await safeFetch(`${API_BASE}/admin/api/categories`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ name, image: imageBase64 }) });
        showToast('تم إضافة القسم', 'success'); closeFormModal(); loadCategories();
    } catch(e) { showToast(e.message, 'error'); }
}

async function deleteCategory(id) {
    const confirm = await Swal.fire({ title: 'حذف القسم', text: "سيتم حذف القسم ومنتجاته", icon: 'warning', showCancelButton: true, confirmButtonText: 'حذف', background: '#1e293b', color: '#fff' });
    if(!confirm.isConfirmed) return;
    try {
        await safeFetch(`${API_BASE}/admin/api/categories/${id}`, { method: 'DELETE', headers: getHeaders() });
        showToast('تم الحذف', 'success'); loadCategories();
    } catch(e) { showToast(e.message, 'error'); }
}

// ================= Products =================
async function loadProducts() {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-slate-400"><i data-lucide="loader" class="animate-spin mx-auto mb-2"></i>جاري التحميل...</td></tr>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
    try {
        if(cachedCategories.length === 0) cachedCategories = await safeFetch(`${API_BASE}/admin/api/categories`, { headers: getHeaders() });
        const data = await safeFetch(`${API_BASE}/admin/api/products`, { headers: getHeaders() });
        cachedProducts = data;
        tbody.innerHTML = '';
        if(data.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="text-center py-10 text-slate-400">لا توجد منتجات.</td></tr>'; return; }
        
        data.forEach(p => {
            const cat = cachedCategories.find(c => c.id === p.category_id);
            tbody.innerHTML += `
                <tr>
                    <td class="py-3 px-4 flex items-center gap-3">
                        <img src="${p.image || 'https://via.placeholder.com/40'}" class="w-10 h-10 rounded-lg object-cover">
                        <div>
                            <span class="font-bold text-white block">${escapeHtml(p.name)}</span>
                            <span class="text-xs text-slate-500">${p.product_type === 'bundle' ? 'باقات' : (p.product_type === 'dynamic' ? 'سعر متغير' : 'سعر ثابت')}</span>
                        </div>
                    </td>
                    <td class="py-3 px-4">${cat ? escapeHtml(cat.name) : 'غير معروف'}</td>
                    <td class="py-3 px-4 font-bold text-success">$${parseFloat(p.base_price).toFixed(2)}</td>
                    <td class="py-3 px-4">
                        <button onclick="deleteProduct(${p.id})" class="text-danger bg-red-500/10 px-3 py-1 rounded hover:bg-red-500/20">حذف</button>
                    </td>
                </tr>
            `;
        });
    } catch(e) { tbody.innerHTML = `<tr><td colspan="4" class="text-danger">${e.message}</td></tr>`; }
}

function openProductModal() {
    if(cachedCategories.length === 0) return showToast('أضف قسماً أولاً', 'error');
    document.getElementById('formTitle').innerText = 'إضافة منتج جديد';
    let catOptions = cachedCategories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    
    document.getElementById('formBody').innerHTML = `
        <div><label class="text-sm text-slate-400 block mb-2">اسم المنتج</label><input type="text" id="prodName" class="input-field"></div>
        <div><label class="text-sm text-slate-400 block mb-2">القسم</label><select id="prodCat" class="input-field">${catOptions}</select></div>
        <div><label class="text-sm text-slate-400 block mb-2">الوصف</label><textarea id="prodDesc" class="input-field"></textarea></div>
        <div><label class="text-sm text-slate-400 block mb-2">المدخلات المطلوبة</label>
            <select id="prodInputType" class="input-field">
                <option value="id">ID اللاعب</option>
                <option value="account_id">ID الحساب</option>
                <option value="phone">رقم الهاتف</option>
                <option value="url">رابط (URL)</option>
            </select>
        </div>
        <div><label class="text-sm text-slate-400 block mb-2">نوع التسعير</label>
            <select id="prodPricingType" class="input-field">
                <option value="fixed">سعر ثابت</option>
                <option value="dynamic">متغير حسب الكمية</option>
            </select>
        </div>
        <div id="fixedPriceFields">
            <label class="text-sm text-slate-400 block mb-2">السعر الثابت ($)</label>
            <input type="number" id="prodPrice" class="input-field" value="0">
        </div>
        <div id="dynamicPriceFields" class="hidden bg-slate-800/50 p-3 rounded-lg">
            <label class="text-sm text-slate-400 block mb-2">الكمية الأساسية</label>
            <input type="number" id="prodBaseQty" class="input-field mb-2" value="1">
            <label class="text-sm text-slate-400 block mb-2">سعر الكمية الأساسية ($)</label>
            <input type="number" id="prodBasePrice" class="input-field" value="1">
        </div>
        <div><label class="text-sm text-slate-400 block mb-2">صورة المنتج</label><input type="file" id="prodImage" class="input-field bg-slate-800" accept="image/*"></div>
    `;
    
    document.getElementById('prodPricingType').addEventListener('change', (e) => {
        if(e.target.value === 'fixed') {
            document.getElementById('fixedPriceFields').classList.remove('hidden');
            document.getElementById('dynamicPriceFields').classList.add('hidden');
        } else {
            document.getElementById('fixedPriceFields').classList.add('hidden');
            document.getElementById('dynamicPriceFields').classList.remove('hidden');
        }
    });

    document.getElementById('formSaveBtn').onclick = saveProduct;
    document.getElementById('formModal').classList.remove('hidden');
}

async function saveProduct() {
    const name = document.getElementById('prodName').value;
    const category_id = document.getElementById('prodCat').value;
    const description = document.getElementById('prodDesc').value;
    const input_type = document.getElementById('prodInputType').value;
    const pricing_type = document.getElementById('prodPricingType').value;
    const fileInput = document.getElementById('prodImage');
    
    if(!name) return showToast('أدخل اسم المنتج', 'error');
    
    let base_price = 0;
    let base_quantity = 0;

    if (pricing_type === 'fixed') {
        base_price = parseFloat(document.getElementById('prodPrice').value) || 0;
    } else {
        base_quantity = parseInt(document.getElementById('prodBaseQty').value) || 1;
        base_price = parseFloat(document.getElementById('prodBasePrice').value) || 0;
    }
    
    let imageBase64 = null;
    if (fileInput.files.length > 0) {
        imageBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(fileInput.files[0]);
        });
    }

    try {
        await safeFetch(`${API_BASE}/admin/api/products`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ name, category_id, description, input_type, base_price, base_quantity, product_type: pricing_type, image: imageBase64 }) });
        showToast('تم إضافة المنتج', 'success'); closeFormModal(); loadProducts();
    } catch(e) { showToast(e.message, 'error'); }
}

async function deleteProduct(id) {
    const confirm = await Swal.fire({ title: 'حذف المنتج', text: "هل أنت متأكد؟", icon: 'warning', showCancelButton: true, confirmButtonText: 'حذف', background: '#1e293b', color: '#fff' });
    if(!confirm.isConfirmed) return;
    try {
        await safeFetch(`${API_BASE}/admin/api/products/${id}`, { method: 'DELETE', headers: getHeaders() });
        showToast('تم الحذف', 'success'); loadProducts();
    } catch(e) { showToast(e.message, 'error'); }
}

// ================= Payments =================
async function loadPayments() {
    const grid = document.getElementById('paymentsGrid');
    grid.innerHTML = '<div class="col-span-full text-center py-4 text-slate-400"><i data-lucide="loader" class="animate-spin mx-auto mb-2"></i>جاري التحميل...</div>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/payment-methods`, { headers: getHeaders() });
        cachedPayments = data;
        grid.innerHTML = '';
        if(data.length === 0) { grid.innerHTML = '<div class="col-span-full text-center py-10 text-slate-400">لا توجد طرق دفع.</div>'; return; }
        
        data.forEach(p => {
            grid.innerHTML += `
                <div class="payment-card">
                    <div class="flex justify-between items-start mb-3">
                        <h4 class="font-bold text-white text-lg">${escapeHtml(p.name)}</h4>
                        <button onclick="deletePayment(${p.id})" class="text-danger hover:bg-red-500/20 p-1 rounded"><i data-lucide="trash-2" size="18"></i></button>
                    </div>
                    <p class="text-sm text-slate-400 mb-1">رقم الحساب: <span class="text-white font-mono">${escapeHtml(p.account)}</span></p>
                    <p class="text-sm text-slate-400 mb-1">الحد الأدنى: <span class="text-white font-mono">$${parseFloat(p.min_amount).toFixed(2)}</span></p>
                    <p class="text-sm text-slate-400 mb-1">الحد الأقصى: <span class="text-white font-mono">$${parseFloat(p.max_amount).toFixed(2)}</span></p>
                    <p class="text-sm text-slate-400 mb-1">العمولة: <span class="text-warning font-mono">${parseFloat(p.fee).toFixed(2)}%</span></p>
                    ${p.requires_kyc ? '<span class="inline-block mt-2 bg-warning/20 text-warning text-xs px-2 py-1 rounded">تتطلب توثيق</span>' : '<span class="inline-block mt-2 bg-success/20 text-success text-xs px-2 py-1 rounded">متاحة للجميع</span>'}
                </div>
            `;
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch(e) { grid.innerHTML = `<div class="text-danger">${e.message}</div>`; }
}

function openPaymentModal() {
    document.getElementById('formTitle').innerText = 'إضافة طريقة دفع';
    document.getElementById('formBody').innerHTML = `
        <div><label class="text-sm text-slate-400 block mb-2">اسم البنك/المحفظة</label><input type="text" id="payName" class="input-field" placeholder="مثال: شام كاش"></div>
        <div><label class="text-sm text-slate-400 block mb-2">رقم الحساب</label><input type="text" id="payAccount" class="input-field"></div>
        <div class="grid grid-cols-2 gap-3">
            <div><label class="text-sm text-slate-400 block mb-2">الحد الأدنى ($)</label><input type="number" id="payMin" class="input-field" value="0"></div>
            <div><label class="text-sm text-slate-400 block mb-2">الحد الأقصى ($)</label><input type="number" id="payMax" class="input-field" value="0"></div>
        </div>
        <div><label class="text-sm text-slate-400 block mb-2">العمولة (%)</label><input type="number" id="payFee" class="input-field" value="0"></div>
        <div class="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg">
            <input type="checkbox" id="payRequireKyc" class="w-5 h-5 accent-accent">
            <label for="payRequireKyc" class="text-white font-bold cursor-pointer">تتطلب توثيق هوية (KYC)</label>
        </div>
    `;
    document.getElementById('formSaveBtn').onclick = savePayment;
    document.getElementById('formModal').classList.remove('hidden');
}

async function savePayment() {
    const name = document.getElementById('payName').value;
    const account = document.getElementById('payAccount').value;
    const min_amount = parseFloat(document.getElementById('payMin').value) || 0;
    const max_amount = parseFloat(document.getElementById('payMax').value) || 0;
    const fee = parseFloat(document.getElementById('payFee').value) || 0;
    const requires_kyc = document.getElementById('payRequireKyc').checked;

    if(!name || !account) return showToast('أكمل البيانات المطلوبة', 'error');

    try {
        await safeFetch(`${API_BASE}/admin/api/payment-methods`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ name, account, min_amount, max_amount, fee, requires_kyc }) });
        showToast('تم إضافة طريقة الدفع', 'success'); closeFormModal(); loadPayments();
    } catch(e) { showToast(e.message, 'error'); }
}

async function deletePayment(id) {
    const confirm = await Swal.fire({ title: 'حذف طريقة الدفع', text: "هل أنت متأكد؟", icon: 'warning', showCancelButton: true, confirmButtonText: 'حذف', background: '#1e293b', color: '#fff' });
    if(!confirm.isConfirmed) return;
    try {
        await safeFetch(`${API_BASE}/admin/api/payment-methods/${id}`, { method: 'DELETE', headers: getHeaders() });
        showToast('تم الحذف', 'success'); loadPayments();
    } catch(e) { showToast(e.message, 'error'); }
}

// ================= Notifications & Settings =================
document.getElementById('notifTarget')?.addEventListener('change', (e) => {
    if(e.target.value === 'specific') document.getElementById('specificUserDiv').classList.remove('hidden');
    else document.getElementById('specificUserDiv').classList.add('hidden');
});

function previewNotification() {
    const message = document.getElementById('notifMessage').value;
    if(!message) return showToast('اكتب رسالة أولاً', 'error');
    Swal.fire({
        title: 'معاينة الإشعار',
        html: `<div style="background:#1e293b; padding:15px; border-radius:10px; text-align:right;"><strong style="color:#38bdf8; display:block; margin-bottom:5px;">إشعار إداري</strong><p style="color:white; margin:0;">${escapeHtml(message)}</p></div>`,
        background: '#0f172a', color: '#fff', confirmButtonColor: '#38bdf8'
    });
}

async function sendNotification() {
    const target = document.getElementById('notifTarget').value;
    const specificId = document.getElementById('notifSpecificId').value;
    const message = document.getElementById('notifMessage').value;
    if(!message) return showToast('اكتب رسالة أولاً', 'error');
    if(target === 'specific' && !specificId) return showToast('أدخل آيدي المستخدم', 'error');
    
    try {
        await safeFetch(`${API_BASE}/admin/api/notifications`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ target: target === 'specific' ? specificId : 'all', message, title: 'إشعار إداري' }) });
        showToast('تم إرسال الإشعار بنجاح', 'success');
        document.getElementById('notifMessage').value = '';
    } catch(e) { showToast(e.message, 'error'); }
}

async function loadSettings() {
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/settings`, { headers: getHeaders() });
        document.getElementById('setStoreName').value = data.store_name || 'SANAD+';
        document.getElementById('setSupportLink').value = data.support_link || '';
        document.getElementById('setExchangeRate').value = data.exchange_rate || 132;
        document.getElementById('setMaintenance').checked = data.maintenance_mode === '1';
    } catch(e) { showToast(e.message, 'error'); }
}

async function saveSettings() {
    const data = {
        store_name: document.getElementById('setStoreName').value,
        support_link: document.getElementById('setSupportLink').value,
        exchange_rate: document.getElementById('setExchangeRate').value,
        maintenance_mode: document.getElementById('setMaintenance').checked ? '1' : '0'
    };
    try {
        await safeFetch(`${API_BASE}/admin/api/settings`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
        showToast('تم حفظ الإعدادات', 'success');
    } catch(e) { showToast(e.message, 'error'); }
}

// ================= Audit & Export =================
async function loadAuditLog() {
    const tbody = document.getElementById('auditTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-slate-400"><i data-lucide="loader" class="animate-spin mx-auto mb-2"></i>جاري التحميل...</td></tr>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/audit`, { headers: getHeaders() });
        tbody.innerHTML = '';
        if(data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-slate-400">لا توجد حركات.</td></tr>'; return; }
        
        data.forEach(l => {
            tbody.innerHTML += `
                <tr>
                    <td class="py-3 px-4">${escapeHtml(l.action)}</td>
                    <td class="py-3 px-4 font-bold ${l.amount > 0 ? 'text-success' : 'text-danger'}">${l.amount > 0 ? '+' : ''}$${Math.abs(l.amount).toFixed(2)}</td>
                    <td class="py-3 px-4">$${parseFloat(l.before).toFixed(2)}</td>
                    <td class="py-3 px-4">$${parseFloat(l.after).toFixed(2)}</td>
                    <td class="py-3 px-4 text-sm text-slate-400">${new Date(l.date).toLocaleString('ar-EG')}</td>
                </tr>
            `;
        });
    } catch(e) { tbody.innerHTML = `<tr><td colspan="5" class="text-danger">${e.message}</td></tr>`; }
}

function exportData(type) {
    if(type === 'users' && allUsersData.length > 0) {
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += "الاسم,الآيدي,الرصيد,الحالة\n";
        allUsersData.forEach(u => { 
            csvContent += `"${u.first_name}","${u.telegram_id}","${u.balance}","${u.is_banned ? 'محظور' : 'نشط'}"\n`; 
        });
        const link = document.createElement("a"); 
        link.setAttribute("href", encodeURI(csvContent)); 
        link.setAttribute("download", "users.csv"); 
        document.body.appendChild(link); 
        link.click(); 
        document.body.removeChild(link);
    }
}

function closeFormModal() { document.getElementById('formModal').classList.add('hidden'); }

// ================= Helpers =================
function escapeHtml(text) { if (!text) return ''; return String(text).replace(/[&<>"']/g, function(m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
if (typeof lucide !== 'undefined') lucide.createIcons();
