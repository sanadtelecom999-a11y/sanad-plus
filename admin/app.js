const API_BASE = 'https://sanad-plus-backend.onrender.com';
let currentSessionId = null;
let dashboardChartInstance = null;
let currentInboxTab = 'orders';
let cachedItems = {};
let currentTicketId = null;
let currentSupportTab = 'open';
let adminChatPolling = null;
let currentSelectedUser = null;
let allUsersData = [];

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('admin_token')) {
        document.getElementById('loginScreen').classList.remove('hidden');
    } else {
        showDashboard();
    }
});

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
    container.appendChild(toast); lucide.createIcons();
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

// ================= Login & Auth =================
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
    
    const titles = { 'dashboard': 'لوحة التحكم', 'inbox': 'الإرساليات', 'support': 'تذاكر الدعم', 'users': 'إدارة المستخدمين' };
    document.getElementById('page-title').innerText = titles[sectionId] || 'لوحة التحكم';
    document.querySelector('aside').classList.remove('open');

    if (sectionId === 'inbox') loadInbox(currentInboxTab);
    if (sectionId === 'support') loadSupportTickets();
    if (sectionId === 'users') loadUsers();
}

function toggleSidebar() { document.querySelector('aside').classList.toggle('open'); }

// ================= Stats & Chart =================
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
    if(!ctx) return;
    
    // حماية: إذا لم يتم تحميل Chart.js، لا تتوقف الصفحة
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js failed to load');
        return;
    }

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
    document.querySelectorAll('#section-inbox .inbox-tab').forEach(b => { b.classList.remove('active', 'bg-accent', 'text-dark'); b.classList.add('glass', 'text-slate-400'); });
    btn.classList.remove('glass', 'text-slate-400'); btn.classList.add('active', 'bg-accent', 'text-dark');
    loadInbox(type);
}

async function loadInbox(type) {
    const container = document.getElementById('inboxContainer');
    container.innerHTML = '<div class="col-span-full text-center py-10"><i data-lucide="loader" class="animate-spin text-accent mx-auto mb-2"></i><p class="text-slate-400">جاري التحميل...</p></div>';
    lucide.createIcons();
    let endpoint = type === 'deposits' ? '/admin/api/deposits' : type === 'orders' ? '/admin/api/orders' : '/admin/api/kyc';

    try {
        const data = await safeFetch(`${API_BASE}${endpoint}`, { headers: getHeaders() });
        cachedItems[type] = data;
        container.innerHTML = '';
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="col-span-full text-center py-10 text-slate-400">لا توجد عناصر في هذا القسم حالياً.</div>';
            return;
        }
        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'inbox-card';
            card.id = `inbox-card-${item.id}`;
            card.onclick = () => viewDetails(type, item.id);
            
            if (type === 'orders') {
                card.innerHTML = `<div class="inbox-header"><span class="text-accent font-mono text-sm">${item.order_number}</span><span class="badge bg-warning/20 text-warning px-2 py-1 rounded">$${parseFloat(item.total_price).toFixed(2)}</span></div><div class="inbox-details"><strong>${escapeHtml(item.product_name)}</strong><br>الكمية: ${item.quantity} | المستخدم: ${escapeHtml(item.user_name)} <span class="text-xs text-slate-500 font-mono">(#${item.user_telegram})</span></div>`;
            } else if (type === 'deposits') {
                card.innerHTML = `<div class="inbox-header"><span class="text-accent font-mono text-sm">${item.transaction_id}</span><span class="badge bg-success/20 text-success px-2 py-1 rounded">$${parseFloat(item.amount).toFixed(2)}</span></div><div class="inbox-details"><strong>إيداع جديد</strong><br>المستخدم: ${escapeHtml(item.user_name)}</div>`;
            } else {
                card.innerHTML = `<div class="inbox-header"><span class="text-accent font-mono text-sm">KYC #${item.id}</span></div><div class="inbox-details"><strong>${escapeHtml(item.full_name)}</strong><br>الهاتف: ${escapeHtml(item.phone)}</div>`;
            }
            container.appendChild(card);
        });
        lucide.createIcons();
    } catch (e) {
        container.innerHTML = `<div class="col-span-full text-center py-10 text-danger flex flex-col items-center justify-center"><i data-lucide="wifi-off" size="48" class="mb-4"></i><p class="font-bold mb-2">${e.message}</p><button onclick="loadInbox('${type}')" class="btn-primary" style="width:auto; padding:10px 20px;">إعادة المحاولة</button></div>`;
        lucide.createIcons();
    }
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

        body.innerHTML = `
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div><span class="text-slate-500 text-xs block">المستخدم</span> <strong class="text-white">${escapeHtml(item.user_name)}</strong></div>
                <div><span class="text-slate-500 text-xs block">الآيدي</span> <strong class="text-white font-mono">${item.user_telegram || '-'}</strong></div>
                <div><span class="text-slate-500 text-xs block">المنتج</span> <strong class="text-white">${escapeHtml(item.product_name)}</strong></div>
                <div><span class="text-slate-500 text-xs block">الكمية</span> <strong class="text-white">${item.quantity}</strong></div>
                <div><span class="text-slate-500 text-xs block">الإجمالي</span> <strong class="text-success text-lg">$${parseFloat(item.total_price).toFixed(2)}</strong></div>
            </div>
            <div><label class="modal-label">بيانات الاستلام</label><div class="copy-input-group"><input type="text" id="deliveryDataInput" class="copy-input" value="${escapeHtml(deliveryStr)}" readonly><button onclick="copyToClipboard('deliveryDataInput')" class="copy-btn"><i data-lucide="copy" size="18"></i></button></div></div>
            <div><label class="modal-label">ملاحظة الإدارة (تظهر للمستخدم)</label><textarea id="adminNote" class="admin-note-input" placeholder="اكتب ملاحظتك هنا..."></textarea></div>
        `;
        footer.innerHTML = `<div class="modal-actions"><button onclick="handleAction('orders', ${item.id}, 'status', 'failed')" class="btn-reject">رفض وإرجاع المبلغ</button><button onclick="handleAction('orders', ${item.id}, 'status', 'completed')" class="btn-complete">إكمال الطلب</button></div>`;
    } else if (type === 'deposits') {
        title.textContent = `إيصال إيداع: ${item.transaction_id}`;
        body.innerHTML = `
            <div class="space-y-2 mb-4"><p><strong>المستخدم:</strong> ${escapeHtml(item.user_name)} (${item.user_telegram})</p><p><strong>المبلغ:</strong> $${parseFloat(item.amount).toFixed(2)}</p><p><strong>اسم المرسل:</strong> ${escapeHtml(item.sender_name || 'غير محدد')}</p></div>
            <div class="rounded-xl overflow-hidden border border-slate-600">${item.proof_image ? `<img src="${item.proof_image}" class="w-full h-auto object-contain max-h-64">` : '<p class="text-center p-4">لا توجد صورة</p>'}</div>
            <div class="mt-4"><label class="modal-label">ملاحظة الإدارة (تظهر للمستخدم)</label><textarea id="adminNote" class="admin-note-input" placeholder="اكتب ملاحظتك هنا..."></textarea></div>
        `;
        footer.innerHTML = `<button onclick="handleAction('deposits', ${item.id}, 'approve')" class="btn-action btn-approve">قبول الإيداع</button><button onclick="handleAction('deposits', ${item.id}, 'reject')" class="btn-action btn-reject">رفض الإيداع</button>`;
    } else {
        title.textContent = `طلب توثيق #${item.id}`;
        body.innerHTML = `
            <div class="space-y-2 mb-4"><p><strong>الاسم:</strong> ${escapeHtml(item.full_name)}</p><p><strong>الهاتف:</strong> ${escapeHtml(item.phone)}</p><p><strong>العنوان:</strong> ${escapeHtml(item.address)}</p></div>
            <div class="rounded-xl overflow-hidden border border-slate-600">${item.selfie_image ? `<img src="${item.selfie_image}" class="w-full h-auto object-contain max-h-64">` : '<p class="text-center p-4">لا توجد صورة</p>'}</div>
        `;
        footer.innerHTML = `<button onclick="handleAction('kyc', ${item.id}, 'approve')" class="btn-action btn-approve">قبول</button><button onclick="handleAction('kyc', ${item.id}, 'reject')" class="btn-action btn-reject">رفض</button>`;
    }
    lucide.createIcons();
}

function copyToClipboard(elementId) {
    const input = document.getElementById(elementId); input.select(); document.execCommand('copy');
    showToast('تم النسخ بنجاح', 'success');
}

async function handleAction(type, id, action, extra) {
    const adminNote = document.getElementById('adminNote')?.value || '';
    const confirm = await Swal.fire({ title: 'تأكيد الإجراء', text: "هل أنت متأكد؟", icon: 'warning', showCancelButton: true, confirmButtonColor: '#10b981', cancelButtonColor: '#ef4444', confirmButtonText: 'نعم', cancelButtonText: 'إلغاء', background: '#1e293b', color: '#fff' });
    if (!confirm.isConfirmed) return;

    const card = document.getElementById(`inbox-card-${id}`);
    if (card) { card.style.opacity = '0.5'; card.style.pointerEvents = 'none'; }

    let endpoint = ''; let body = { admin_note: adminNote };
    if (type === 'deposits') endpoint = `/admin/api/deposits/${id}/${action}`;
    else if (type === 'orders') { endpoint = `/admin/api/orders/${id}/status`; body.status = extra; }
    else if (type === 'kyc') endpoint = `/admin/api/kyc/${id}/${action}`;

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) throw new Error("السيرفر غير متاح حالياً.");
        const data = await res.json();
        if (res.ok) {
            closeModal(); showToast('تمت العملية بنجاح', 'success'); if (card) card.remove();
            loadDashboardStats(); checkInboxBadge();
        } else {
            showToast(data.error || 'حدث خطأ', 'error'); if (card) { card.style.opacity = '1'; card.style.pointerEvents = 'auto'; }
        }
    } catch (e) { showToast(e.message, 'error'); if (card) { card.style.opacity = '1'; card.style.pointerEvents = 'auto'; } }
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

// ================= Support Chat Logic =================
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
    lucide.createIcons();
    
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/support/tickets?status=${currentSupportTab}`, { headers: getHeaders() });
        list.innerHTML = '';
        if (data.length === 0) { list.innerHTML = '<div class="text-center py-4 text-slate-400">لا توجد تذاكر في هذا القسم.</div>'; return; }
        
        data.forEach(t => {
            const el = document.createElement('div');
            el.className = 'support-ticket-item'; el.id = `ticket-${t.id}`;
            el.onclick = () => openSupportTicket(t.id, t.user_name, t.user_telegram);
            el.innerHTML = `
                <div class="flex justify-between items-center mb-1"><strong class="text-white">${escapeHtml(t.user_name)}</strong><span class="text-xs text-slate-500 font-mono">${t.user_telegram}</span></div>
                <div class="text-sm text-slate-400 truncate">${escapeHtml(t.last_message)}</div>
                <div class="flex justify-between items-center mt-2">
                    <div class="text-xs text-accent">${new Date(t.updated_at).toLocaleDateString('ar-EG')}</div>
                    ${t.status === 'closed' ? '<span class="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">مغلقة</span>' : ''}
                </div>
            `;
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
    const confirm = await Swal.fire({ title: 'إغلاق التذكرة', text: "سيتم أرشفتها ولن تظهر في القائمة.", icon: 'warning', showCancelButton: true, confirmButtonText: 'إغلاق', background: '#1e293b', color: '#fff' });
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

// ================= Users Logic =================
async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-slate-400"><i data-lucide="loader" class="animate-spin mx-auto mb-2"></i>جاري التحميل...</td></tr>';
    lucide.createIcons();
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/users`, { headers: getHeaders() });
        allUsersData = data; renderUsersTable(data);
    } catch (e) { tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">${e.message}</td></tr>`; }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody'); tbody.innerHTML = '';
    if (users.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-slate-400">لا يوجد مستخدمون.</td></tr>'; return; }
    users.forEach(u => {
        const tr = document.createElement('tr'); tr.onclick = () => openUserDrawer(u);
        tr.innerHTML = `
            <td class="py-3 px-4"><div class="user-row"><div class="user-avatar-small">${(u.first_name || 'U')[0]}</div><span class="font-bold text-white">${escapeHtml(u.first_name || 'مستخدم')}</span></div></td>
            <td class="py-3 px-4 font-mono text-sm text-slate-400">${u.telegram_id}</td>
            <td class="py-3 px-4 font-bold ${u.balance < 0 ? 'text-danger' : 'text-success'}">$${parseFloat(u.balance).toFixed(2)}</td>
            <td class="py-3 px-4">${u.is_banned ? '<span class="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-bold">محظور</span>' : '<span class="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold">نشط</span>'}</td>
            <td class="py-3 px-4"><button class="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs transition">إدارة</button></td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

document.getElementById('userSearchInput')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allUsersData.filter(u => (u.first_name || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q) || String(u.telegram_id).includes(q));
    renderUsersTable(filtered);
});

function openUserDrawer(user) {
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

function escapeHtml(text) { if (!text) return ''; return String(text).replace(/[&<>"']/g, function(m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
