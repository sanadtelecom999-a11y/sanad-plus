const API_BASE = 'https://sanad-plus-backend.onrender.com';
let currentSessionId = null;
let currentInboxTab = 'orders';
let cachedItems = {};
let allUsersData = [];
let currentSelectedUser = null;
let currentTicketId = null;
let adminChatPolling = null;
let dashboardChartInstance = null;
let analyticsChartInstance = null;

// ================= التهيئة والدخول =================
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
        const res = await fetch(`${API_BASE}/admin/login`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ username: user, password: pass }) 
        });
        const data = await res.json();
        
        if (res.ok && data.require_otp) {
            currentSessionId = data.session_id;
            document.getElementById('loginStep1').classList.add('hidden');
            document.getElementById('loginStep2').classList.remove('hidden');
            Swal.fire('تم', 'تم إرسال رمز التحقق إلى تيليجرام', 'success');
        } else { 
            Swal.fire('خطأ', data.error || 'بيانات غير صحيحة', 'error'); 
        }
    } catch (e) { 
        Swal.fire('خطأ', 'تعذر الاتصال بالسيرفر', 'error'); 
    } finally { 
        btn.textContent = 'تسجيل الدخول'; btn.disabled = false; 
    }
};

window.verifyOTP = async function() {
    const code = document.getElementById('otpCode').value;
    const btn = document.getElementById('otpBtn');
    if (!code) return Swal.fire('تنبيه', 'أدخل رمز التحقق', 'warning');
    
    btn.textContent = 'جاري التحقق...'; btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/admin/verify-otp`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ session_id: currentSessionId, otp_code: code }) 
        });
        const data = await res.json();
        
        const receivedToken = data.token || data.access_token;

        if (res.ok && receivedToken) {
            localStorage.setItem('admin_token', receivedToken);
            Swal.fire('مرحباً بك', 'تم تسجيل الدخول', 'success');
            setTimeout(() => location.reload(), 1000);
        } else { 
            Swal.fire('خطأ', data.error || 'رمز خاطئ', 'error'); 
        } 
    } catch (e) { 
        Swal.fire('خطأ', 'تعذر الاتصال بالسيرفر', 'error'); 
    } finally { 
        btn.textContent = 'تأكيد الرمز'; btn.disabled = false; 
    }
};

window.logout = function() { localStorage.removeItem('admin_token'); location.reload(); };
window.getHeaders = function() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }; };

// ================= لوحة القيادة =================
window.showDashboard = function() {
    loadDashboardStats(); 
    loadAnalytics(); 
    initChart();
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

async function loadDashboardStats() {
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/stats`, { headers: getHeaders() });
        document.getElementById('statOrders').innerText = data.total_orders || 0;
        document.getElementById('statUsers').innerText = data.total_users || 0;
        document.getElementById('statDeposits').innerText = data.total_deposits || 0;
        document.getElementById('statRevenue').innerText = `$${(data.revenue || 0).toFixed(2)}`;
    } catch (e) { console.error("Stats error:", e); }
}

async function loadAnalytics() {
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/analytics`, { headers: getHeaders() });
        const ctx = document.getElementById('analyticsChart');
        if(ctx && typeof Chart !== 'undefined') {
            if(analyticsChartInstance) analyticsChartInstance.destroy();
            analyticsChartInstance = new Chart(ctx, { 
                type: 'bar', 
                data: { 
                    labels: ['طلبات مكتملة', 'إيداعات مرفوضة'], 
                    datasets: [{ label: 'العدد', data: [data.completed_orders || 0, data.rejected_deposits || 0], backgroundColor: ['#10b981', '#ef4444'], borderRadius: 8 }] 
                }, 
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#94a3b8' } }, y: { ticks: { color: '#94a3b8' } } } } 
            });
        }
    } catch(e) { console.error("Analytics error:", e); }
}

function initChart() {
    const ctx = document.getElementById('dashboardChart');
    if(!ctx || typeof Chart === 'undefined') return;
    if(dashboardChartInstance) dashboardChartInstance.destroy(); 
    dashboardChartInstance = new Chart(ctx, { 
        type: 'line', 
        data: { labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'], datasets: [{ label: 'حركة المبيعات ($)', data: [12, 19, 3, 5, 2, 3, 10], borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.1)', fill: true, tension: 0.4 }] }, 
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff' } } }, scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } } } } 
    });
}

// ================= التنقل =================
window.switchSection = function(sectionId, btn) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    const target = document.getElementById('section-' + sectionId);
    if (target) target.classList.remove('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active', 'bg-slate-700/50', 'text-white'));
    if (btn) btn.classList.add('active', 'bg-slate-700/50', 'text-white');
    
    const titles = { 'dashboard': 'لوحة التحكم', 'inbox': 'الإرساليات', 'support': 'تذاكر الدعم', 'users': 'إدارة المستخدمين', 'archive': 'الأرشيف', 'categories': 'إدارة الأقسام', 'products': 'إدارة المنتجات', 'payments': 'طرق الدفع', 'settings': 'الإعدادات' };
    document.getElementById('page-title').innerText = titles[sectionId] || 'لوحة التحكم';

    if (sectionId === 'inbox') loadInbox(currentInboxTab);
    if (sectionId === 'users') loadUsers();
    if (sectionId === 'products') loadProducts();
    if (sectionId === 'categories') loadCategories();
    if (sectionId === 'payments') loadPayments();
    if (sectionId === 'support') loadSupportTickets();
    if (sectionId === 'settings') loadSettings();
};

// ================= الإرساليات =================
window.switchInboxTab = function(type, btn) {
    currentInboxTab = type;
    document.querySelectorAll('#section-inbox .inbox-tab').forEach(b => { b.classList.remove('active', 'bg-accent', 'text-dark'); b.classList.add('glass', 'text-slate-400'); });
    btn.classList.remove('glass', 'text-slate-400'); btn.classList.add('active', 'bg-accent', 'text-dark');
    loadInbox(type);
};

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
                card.innerHTML = `<div class="cursor-pointer" onclick="viewDetails('orders', ${item.id})"><div class="inbox-header"><span class="text-accent font-mono text-sm">${item.order_number}</span><span class="bg-warning/20 text-warning px-2 py-1 rounded">$${parseFloat(item.total_price).toFixed(2)}</span></div><div class="text-sm"><strong>${escapeHtml(item.product_name)}</strong><br>الكمية: ${item.quantity} | ${escapeHtml(item.user_name)}</div></div>`;
            } else {
                card.innerHTML = `<div class="cursor-pointer" onclick="viewDetails('deposits', ${item.id})"><div class="inbox-header"><span class="text-accent font-mono text-sm">${item.transaction_id}</span><span class="bg-success/20 text-success px-2 py-1 rounded">$${parseFloat(item.amount).toFixed(2)}</span></div><div class="text-sm"><strong>إيداع</strong><br>${escapeHtml(item.user_name)}</div></div>`;
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
        body.innerHTML = `<div class="grid grid-cols-2 gap-4 mb-4"><div><span class="text-slate-500 text-xs block">المستخدم</span> <strong class="text-white">${escapeHtml(item.user_name)}</strong></div><div><span class="text-slate-500 text-xs block">الآيدي</span> <strong class="text-white font-mono">${item.user_telegram || '-'}</strong></div><div><span class="text-slate-500 text-xs block">المنتج</span> <strong class="text-white">${escapeHtml(item.product_name)}</strong></div><div><span class="text-slate-500 text-xs block">الكمية</span> <strong class="text-white">${item.quantity}</strong></div></div><div><label class="text-sm text-slate-400 mb-2 block">ملاحظة الإدارة</label><textarea id="adminNote" class="admin-note-input"></textarea></div>`;
        footer.innerHTML = `<div class="flex gap-3 w-full"><button onclick="handleAction('orders', ${item.id}, 'status', 'failed')" class="btn-reject flex-1">رفض</button><button onclick="handleAction('orders', ${item.id}, 'status', 'completed')" class="btn-complete flex-1">إكمال</button></div>`;
    } else {
        title.textContent = `إيصال إيداع: ${item.transaction_id}`;
        body.innerHTML = `<div class="space-y-2 mb-4"><p><strong>المستخدم:</strong> ${escapeHtml(item.user_name)}</p><p><strong>المبلغ:</strong> $${parseFloat(item.amount).toFixed(2)}</p></div><div class="mt-4"><label class="text-sm text-slate-400 mb-2 block">ملاحظة الإدارة</label><textarea id="adminNote" class="admin-note-input"></textarea></div>`;
        footer.innerHTML = `<div class="flex gap-3 w-full"><button onclick="handleAction('deposits', ${item.id}, 'reject')" class="btn-reject flex-1">رفض</button><button onclick="handleAction('deposits', ${item.id}, 'approve')" class="btn-complete flex-1">قبول</button></div>`;
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.handleAction = async function(type, id, action, extra) {
    const adminNote = document.getElementById('adminNote')?.value || '';
    const confirm = await Swal.fire({ title: 'تأكيد', text: "هل أنت متأكد؟", icon: 'warning', showCancelButton: true, confirmButtonColor: '#10b981', cancelButtonColor: '#ef4444', confirmButtonText: 'نعم', cancelButtonText: 'إلغاء', background: '#1e293b', color: '#fff' });
    if (!confirm.isConfirmed) return;
    
    let endpoint = '', body = { admin_note: adminNote };
    if (type === 'deposits') endpoint = `/admin/api/deposits/${id}/${action}`;
    else if (type === 'orders') { endpoint = `/admin/api/orders/${id}/status`; body.status = extra; }
    
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
        if (res.ok) {
            Swal.fire('تم', 'تمت العملية بنجاح', 'success');
            closeModal(); loadInbox(currentInboxTab); loadDashboardStats();
        } else { Swal.fire('خطأ', 'حدث خطأ', 'error'); }
    } catch (e) { Swal.fire('خطأ', 'خطأ في الاتصال', 'error'); }
};

window.closeModal = function() {
    const modal = document.getElementById('detailsModal');
    modal.classList.add('hidden'); modal.classList.remove('flex');
};

// ================= المستخدمين =================
async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-slate-400">جاري التحميل...</td></tr>';
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/users`, { headers: getHeaders() });
        allUsersData = data; tbody.innerHTML = '';
        data.forEach(u => {
            tbody.innerHTML += `<tr class="table-row border-b border-slate-700/50"><td class="py-3 px-2"><strong class="text-white">${escapeHtml(u.first_name || 'مستخدم')}</strong></td><td class="py-3 px-2 font-mono text-slate-400">${u.telegram_id}</td><td class="py-3 px-2 text-success font-bold">$${parseFloat(u.balance).toFixed(2)}</td><td class="py-3 px-2">${u.is_banned ? '<span class="text-red-400">محظور</span>' : '<span class="text-green-400">نشط</span>'}</td><td class="py-3 px-2"><button onclick="openUserDrawer(${u.id})" class="bg-slate-700 px-3 py-1 rounded text-xs">إدارة</button></td></tr>`;
        });
    } catch (e) { tbody.innerHTML = `<tr><td colspan="5" class="text-danger text-center">${e.message}</td></tr>`; }
}

window.openUserDrawer = function(id) {
    const user = allUsersData.find(u => u.id === id); if(!user) return;
    currentSelectedUser = user;
    document.getElementById('drawerAvatar').textContent = (user.first_name || 'U')[0];
    document.getElementById('drawerName').textContent = user.first_name || 'مستخدم';
    document.getElementById('drawerId').textContent = user.telegram_id;
    document.getElementById('drawerBalance').textContent = `$${parseFloat(user.balance).toFixed(2)}`;
    document.getElementById('banBtn').textContent = user.is_banned ? 'فك الحظر' : 'حظر المستخدم';
    document.getElementById('userDrawerOverlay').classList.remove('hidden');
    document.getElementById('userDrawer').classList.remove('translate-x-full');
};

window.closeUserDrawer = function() {
    document.getElementById('userDrawerOverlay').classList.add('hidden');
    document.getElementById('userDrawer').classList.add('translate-x-full');
};

window.adjustBalance = async function(action) {
    if (!currentSelectedUser) return;
    const amount = parseFloat(document.getElementById('balanceAmount').value);
    if (!amount || amount <= 0) return Swal.fire('تنبيه', 'أدخل مبلغاً صحيحاً', 'warning');
    const finalAmount = action === 'add' ? amount : -amount;
    
    try {
        await fetch(`${API_BASE}/admin/api/users/${currentSelectedUser.id}/balance`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ amount: finalAmount, note: 'تعديل يدوي' }) });
        Swal.fire('تم', 'تم تعديل الرصيد', 'success');
        closeUserDrawer(); loadUsers();
    } catch (e) { Swal.fire('خطأ', 'فشل التعديل', 'error'); }
};

// ================= المنتجات والأقسام والدفع =================
async function loadProducts() {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-slate-400">جاري التحميل...</td></tr>';
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/products`, { headers: getHeaders() });
        tbody.innerHTML = '';
        data.forEach(p => {
            tbody.innerHTML += `<tr class="table-row border-b border-slate-700/50"><td class="py-3 px-2"><strong class="text-white">${escapeHtml(p.name)}</strong></td><td class="py-3 px-2">${p.category_id}</td><td class="py-3 px-2 text-success">$${parseFloat(p.base_price).toFixed(2)}</td><td class="py-3 px-2"><button class="text-red-400">حذف</button></td></tr>`;
        });
    } catch (e) { tbody.innerHTML = `<tr><td colspan="4" class="text-danger text-center">${e.message}</td></tr>`; }
}

async function loadCategories() {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '<div class="col-span-full text-center py-4 text-slate-400">جاري التحميل...</div>';
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/categories`, { headers: getHeaders() });
        grid.innerHTML = '';
        data.forEach(c => {
            grid.innerHTML += `<div class="glass p-4 rounded-2xl text-center"><img src="${c.image || 'https://via.placeholder.com/60'}" class="w-16 h-16 rounded-xl mx-auto mb-3 object-cover"><h4 class="font-bold text-white mb-2">${escapeHtml(c.name)}</h4><button class="text-red-400 text-xs">حذف</button></div>`;
        });
    } catch (e) { grid.innerHTML = `<div class="text-danger">${e.message}</div>`; }
}

async function loadPayments() {
    const grid = document.getElementById('paymentsGrid');
    grid.innerHTML = '<div class="col-span-full text-center py-4 text-slate-400">جاري التحميل...</div>';
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/payment-methods`, { headers: getHeaders() });
        grid.innerHTML = '';
        data.forEach(p => {
            grid.innerHTML += `<div class="glass p-4 rounded-2xl"><h4 class="font-bold text-white text-lg mb-3">${escapeHtml(p.name)}</h4><p class="text-sm text-slate-400 mb-1">الحساب: <span class="text-white font-mono">${escapeHtml(p.account)}</span></p><p class="text-sm text-slate-400 mb-1">الحد الأدنى: $${p.min_amount}</p></div>`;
        });
    } catch (e) { grid.innerHTML = `<div class="text-danger">${e.message}</div>`; }
}

// ================= الدعم والإعدادات =================
async function loadSupportTickets() {
    const list = document.getElementById('supportTicketsList');
    list.innerHTML = '<div class="text-center py-4 text-slate-400">جاري التحميل...</div>';
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/support/tickets?status=open`, { headers: getHeaders() });
        list.innerHTML = '';
        if (data.length === 0) { list.innerHTML = '<div class="text-center text-slate-400">لا توجد تذاكر مفتوحة.</div>'; return; }
        data.forEach(t => {
            list.innerHTML += `<div class="bg-dark p-4 rounded-xl cursor-pointer hover:bg-slate-800 transition mb-2" onclick="openSupportTicket(${t.id}, '${escapeHtml(t.user_name)}')"><div class="flex justify-between font-bold text-white mb-1"><span>${escapeHtml(t.user_name)}</span></div><div class="text-sm text-slate-400 truncate">${escapeHtml(t.last_message)}</div></div>`;
        });
    } catch (e) { list.innerHTML = `<div class="text-danger">${e.message}</div>`; }
}

window.openSupportTicket = async function(id, name) {
    currentTicketId = id;
    document.getElementById('chatUserName').textContent = name;
    document.getElementById('supportReplyArea').style.display = 'flex';
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
            const bg = m.sender_type === 'admin' ? 'bg-accent text-dark' : 'bg-slate-700 text-white';
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

async function loadSettings() {
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/settings`, { headers: getHeaders() });
        document.getElementById('setStoreName').value = data.store_name || 'SANAD+';
        document.getElementById('setSupportLink').value = data.support_link || '';
    } catch (e) { console.error(e); }
}

window.saveSettings = async function() {
    const name = document.getElementById('setStoreName').value;
    const link = document.getElementById('setSupportLink').value;
    try {
        await fetch(`${API_BASE}/admin/api/settings`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ store_name: name, support_link: link }) });
        Swal.fire('تم', 'تم حفظ الإعدادات', 'success');
    } catch (e) { Swal.fire('خطأ', 'فشل الحفظ', 'error'); }
};

// ================= دوال مساعدة =================
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
