const API_BASE = 'https://sanad-plus-backend.onrender.com';
let currentSessionId = null, currentInboxTab = 'orders', currentSupportTab = 'open', currentTicketId = null;
let adminChatPolling = null, ticketAbortController = null, cachedItems = {}, allUsersData = [], categoriesData = [];
let currentSelectedUser = null, editingItemId = null, dashboardChartInstance = null, selectedInboxItems = new Set();

// Init & Auth (Same as before)
document.addEventListener('DOMContentLoaded', () => { if (typeof lucide !== 'undefined') lucide.createIcons(); const t = localStorage.getItem('admin_token'); if (!t) document.getElementById('loginScreen').style.display = 'flex'; else verifyTokenAndLogin(); });
async function verifyTokenAndLogin() { try { const res = await fetch(`${API_BASE}/admin/api/stats`, { headers: getHeaders() }); if (res.ok) { document.getElementById('loginScreen').style.display = 'none'; document.getElementById('dashboardScreen').style.display = 'flex'; showDashboard(); } else throw new Error(); } catch (e) { localStorage.removeItem('admin_token'); document.getElementById('loginScreen').style.display = 'flex'; } }
window.handleLogin = async function() { const u = document.getElementById('loginUser').value, p = document.getElementById('loginPass').value; if(!u||!p) return; const res = await fetch(`${API_BASE}/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) }); const d = await res.json(); if (res.ok && d.require_otp) { currentSessionId = d.session_id; document.getElementById('loginStep1').classList.add('hidden'); document.getElementById('loginStep2').classList.remove('hidden'); } else Swal.fire('خطأ', d.error || 'بيانات غير صحيحة', 'error'); };
window.verifyOTP = async function() { const c = document.getElementById('otpCode').value; const res = await fetch(`${API_BASE}/admin/verify-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: currentSessionId, otp_code: c }) }); const d = await res.json(); const t = d.token || d.access_token; if (res.ok && t) { localStorage.setItem('admin_token', t); location.reload(); } else Swal.fire('خطأ', d.error || 'رمز خاطئ', 'error'); };
window.logout = function() { localStorage.removeItem('admin_token'); location.reload(); };
window.getHeaders = function() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }; };

// Navigation
window.showDashboard = function() { loadDashboardStats(); initChart(); if (typeof lucide !== 'undefined') lucide.createIcons(); };
window.switchSection = function(id, btn) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden')); document.getElementById('section-' + id).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active', 'bg-slate-700/50', 'text-white')); if(btn) btn.classList.add('active', 'bg-slate-700/50', 'text-white');
    const titles = { 'dashboard': 'لوحة التحكم', 'inbox': 'الإرساليات', 'support': 'تذاكر الدعم', 'notifications': 'الإشعارات', 'users': 'المستخدمين', 'archive': 'الأرشيف', 'categories': 'الأقسام', 'products': 'المنتجات', 'payments': 'طرق الدفع', 'settings': 'الإعدادات' };
    document.getElementById('page-title').innerText = titles[id];
    if (id === 'inbox') loadInbox(currentInboxTab); if (id === 'users') loadUsers(); if (id === 'products') loadProducts(); if (id === 'categories') loadCategories(); if (id === 'payments') loadPayments(); if (id === 'support') switchSupportTab(currentSupportTab, document.querySelectorAll('#section-support .tab-btn')[0]); if (id === 'archive') loadArchive(); if (id === 'settings') loadSettings();
};

// Dashboard (Same)
async function loadDashboardStats() { try { const d = await safeFetch(`${API_BASE}/admin/api/stats`, { headers: getHeaders() }); document.getElementById('statOrders').innerText = d.total_orders||0; document.getElementById('statUsers').innerText = d.total_users||0; document.getElementById('statDeposits').innerText = d.total_deposits||0; document.getElementById('statRevenue').innerText = `$${(d.revenue||0).toFixed(2)}`; } catch (e) {} }
function initChart() { const c = document.getElementById('dashboardChart'); if(!c || typeof Chart==='undefined') return; if(dashboardChartInstance) dashboardChartInstance.destroy(); dashboardChartInstance = new Chart(c, { type: 'line', data: { labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'], datasets: [{ label: 'المبيعات', data: [12, 19, 3, 5, 2, 3, 10], borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.1)', fill: true }] }, options: { responsive: true, maintainAspectRatio: false } }); }

// Inbox with Bulk Selection
window.switchInboxTab = function(type, btn) { currentInboxTab = type; document.querySelectorAll('#section-inbox .tab-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); selectedInboxItems.clear(); updateBulkUI(); loadInbox(type); };
async function loadInbox(type) {
    const c = document.getElementById('inboxContainer'); c.innerHTML = '<div class="col-span-full text-center py-10 text-slate-400">جاري التحميل...</div>';
    let ep = type === 'deposits' ? '/admin/api/deposits' : (type === 'kyc' ? '/admin/api/kyc' : '/admin/api/orders');
    try {
        const data = await safeFetch(`${API_BASE}${ep}`, { headers: getHeaders() }); cachedItems[type] = data; c.innerHTML = '';
        if(!data || data.length===0) { c.innerHTML = '<div class="col-span-full text-center py-10 text-slate-400">لا توجد عناصر.</div>'; return; }
        data.forEach(item => {
            const div = document.createElement('div'); div.className = 'inbox-card';
            div.innerHTML = `<div class="flex items-center gap-3 mb-2"><input type="checkbox" class="w-5 h-5 accent-accent" onclick="toggleSelect(${item.id}, this.checked)"><div class="cursor-pointer flex-1" onclick="viewDetails('${type}', ${item.id})"><div class="flex justify-between font-bold border-b border-slate-700/50 pb-2 mb-2"><span class="text-accent font-mono">${item.order_number || item.transaction_id || ('KYC#'+item.id)}</span><span class="text-warning">${type==='orders' ? '$'+parseFloat(item.total_price).toFixed(2) : (type==='deposits' ? '$'+parseFloat(item.amount).toFixed(2) : '')}</span></div><div class="text-sm">${escapeHtml(item.product_name || item.user_name || item.full_name)}</div></div></div>`;
            c.appendChild(div);
        });
    } catch (e) { c.innerHTML = `<div class="col-span-full text-center py-10 text-danger">${e.message}</div>`; }
}
window.toggleSelect = function(id, checked) { if(checked) selectedInboxItems.add(id); else selectedInboxItems.delete(id); updateBulkUI(); };
function updateBulkUI() { document.getElementById('bulkActions').classList.toggle('hidden', selectedInboxItems.size === 0); };
window.bulkAction = async function(action) {
    if(selectedInboxItems.size === 0) return;
    const confirm = await Swal.fire({ title: 'تأكيد', text: `هل تريد ${action==='approve'?'قبول':'رفض'} ${selectedInboxItems.size} عنصر؟`, icon: 'warning', showCancelButton: true, background:'#1e293b', color:'#fff' });
    if(!confirm.isConfirmed) return;
    for(let id of selectedInboxItems) {
        let ep = currentInboxTab === 'deposits' ? `/admin/api/deposits/${id}/${action}` : (currentInboxTab === 'kyc' ? `/admin/api/kyc/${id}/${action}` : `/admin/api/orders/${id}/status`);
        let body = currentInboxTab === 'orders' ? { status: action === 'approve' ? 'completed' : 'failed' } : {};
        await fetch(`${API_BASE}${ep}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
    }
    Swal.fire('تم', 'تمت العملية الجماعية', 'success'); selectedInboxItems.clear(); updateBulkUI(); loadInbox(currentInboxTab);
};

// Details Modal
window.viewDetails = function(type, id) {
    const item = cachedItems[type].find(x => x.id === id); if (!item) return;
    document.getElementById('detailsModal').classList.remove('hidden'); document.getElementById('detailsModal').classList.add('flex');
    document.getElementById('modalTitle').textContent = `تفاصيل ${type}`;
    document.getElementById('modalBody').innerHTML = `<pre class="text-xs text-slate-400 whitespace-pre-wrap">${JSON.stringify(item, null, 2)}</pre>`;
    let footer = '';
    if (type === 'orders') footer = `<button onclick="handleAction('orders', ${id}, 'status', 'failed')" class="btn-danger flex-1">رفض</button><button onclick="handleAction('orders', ${id}, 'status', 'completed')" class="btn-success flex-1">إكمال</button>`;
    if (type === 'deposits') footer = `<button onclick="handleAction('deposits', ${id}, 'reject')" class="btn-danger flex-1">رفض</button><button onclick="handleAction('deposits', ${id}, 'approve')" class="btn-success flex-1">قبول</button>`;
    if (type === 'kyc') footer = `<button onclick="handleAction('kyc', ${id}, 'reject')" class="btn-danger flex-1">رفض</button><button onclick="handleAction('kyc', ${id}, 'approve')" class="btn-success flex-1">قبول</button>`;
    document.getElementById('modalFooter').innerHTML = footer;
};
window.handleAction = async function(type, id, action, extra) {
    const c = await Swal.fire({ title: 'تأكيد', icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم', background:'#1e293b', color:'#fff' }); if(!c.isConfirmed) return;
    let ep = type === 'deposits' ? `/admin/api/deposits/${id}/${action}` : (type === 'orders' ? `/admin/api/orders/${id}/status` : `/admin/api/kyc/${id}/${action}`);
    await fetch(`${API_BASE}${ep}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(type==='orders' ? {status: extra} : {}) });
    closeModal(); loadInbox(currentInboxTab);
};
window.closeModal = function() { document.getElementById('detailsModal').classList.add('hidden'); document.getElementById('detailsModal').classList.remove('flex'); };

// Users (With History & Manage)
async function loadUsers() {
    const t = document.getElementById('usersTableBody'); t.innerHTML = '<tr><td colspan="5" class="text-center py-4">جاري التحميل...</td></tr>';
    try {
        allUsersData = await safeFetch(`${API_BASE}/admin/api/users`, { headers: getHeaders() }); t.innerHTML = '';
        allUsersData.forEach(u => {
            t.innerHTML += `<tr class="border-b border-slate-700/50"><td class="py-2 px-2">${escapeHtml(u.first_name||'')}</td><td class="py-2 px-2 font-mono text-slate-400">${u.telegram_id}</td><td class="py-2 px-2 text-success font-bold">$${parseFloat(u.balance).toFixed(2)}</td><td class="py-2 px-2">${u.is_banned?'محظور':'نشط'}</td><td class="py-2 px-2 flex gap-2"><button onclick="openUserView(${u.id})" class="text-accent"><i data-lucide="eye" size="16"></i></button><button onclick="openUserManage(${u.id})" class="bg-slate-700 px-2 py-1 rounded text-xs">إدارة</button></td></tr>`;
        }); if(typeof lucide!=='undefined') lucide.createIcons();
    } catch(e) { t.innerHTML = `<tr><td colspan="5" class="text-danger">${e.message}</td></tr>`; }
}
window.openUserView = async function(id) {
    const u = allUsersData.find(x=>x.id===id); if(!u) return;
    document.getElementById('userDrawerOverlay').classList.remove('hidden'); document.getElementById('userDrawer').classList.remove('translate-x-full');
    document.getElementById('drawerTitle').innerText = 'ملف المستخدم';
    const c = document.getElementById('userDetailsContent'); c.innerHTML = '<div class="text-center py-4 text-slate-400">جاري جلب السجل...</div>';
    const sn = `SN-${String(u.telegram_id).padStart(6,'0')}`;
    try {
        const hist = await safeFetch(`${API_BASE}/admin/api/users/${id}/history`, { headers: getHeaders() }).catch(()=>({orders:[], deposits:[]}));
        c.innerHTML = `
            <div class="text-center mb-4"><div class="w-16 h-16 rounded-full bg-accent/20 text-accent flex items-center justify-center text-2xl mx-auto mb-2">${(u.first_name||'U')[0]}</div><h4 class="font-bold text-lg">${escapeHtml(u.first_name||'')}</h4><p class="text-slate-400 font-mono text-sm">${u.telegram_id}</p><p class="text-accent font-mono font-bold">${sn}</p></div>
            <div class="bg-dark p-3 rounded-xl mb-4 border border-slate-700 text-center"><span class="text-sm text-slate-400">الرصيد</span><h3 class="text-2xl font-bold text-success">$${parseFloat(u.balance).toFixed(2)}</h3></div>
            <h5 class="font-bold mb-2">آخر الطلبات</h5><div class="space-y-2 mb-4">${(hist.orders||[]).map(o=>`<div class="text-xs bg-slate-800 p-2 rounded flex justify-between"><span>${o.product}</span><span class="text-accent">$${o.amount}</span></div>`).join('') || '<p class="text-xs text-slate-500">لا يوجد</p>'}</div>
            <h5 class="font-bold mb-2">آخر الإيداعات</h5><div class="space-y-2">${(hist.deposits||[]).map(d=>`<div class="text-xs bg-slate-800 p-2 rounded flex justify-between"><span>${d.status}</span><span class="text-warning">$${d.amount}</span></div>`).join('') || '<p class="text-xs text-slate-500">لا يوجد</p>'}</div>
        `;
    } catch(e) { c.innerHTML = `<p class="text-danger">فشل جلب السجل</p>`; }
};
window.openUserManage = function(id) {
    const u = allUsersData.find(x=>x.id===id); if(!u) return; currentSelectedUser = u;
    document.getElementById('userDrawerOverlay').classList.remove('hidden'); document.getElementById('userDrawer').classList.remove('translate-x-full');
    document.getElementById('drawerTitle').innerText = 'إدارة المستخدم';
    document.getElementById('userDetailsContent').innerHTML = `
        <div class="space-y-4">
            <div class="bg-dark p-4 rounded-xl border border-slate-700"><label class="text-sm text-slate-400 block mb-2">تعديل الرصيد</label><input type="number" id="balanceAmount" class="input-field mb-2" placeholder="0.00"><div class="flex gap-2"><button onclick="adjustBalance('add')" class="flex-1 btn-success py-2 text-sm">إضافة</button><button onclick="adjustBalance('subtract')" class="flex-1 btn-danger py-2 text-sm">خصم</button></div></div>
            <button onclick="toggleBan()" class="w-full ${u.is_banned?'bg-green-500/20 text-green-400':'bg-red-500/20 text-red-400'} py-3 rounded-xl font-bold">${u.is_banned?'فك الحظر':'حظر'}</button>
        </div>`;
};
window.adjustBalance = async function(action) {
    const a = parseFloat(document.getElementById('balanceAmount').value); if(!a || a<=0) return;
    const c = await Swal.fire({ title: 'تأكيد', text: `هل تريد ${action==='add'?'إضافة':'خصم'} $${a}؟`, showCancelButton: true, icon: 'warning', background:'#1e293b', color:'#fff' }); if(!c.isConfirmed) return;
    await fetch(`${API_BASE}/admin/api/users/${currentSelectedUser.id}/balance`, { method:'POST', headers: getHeaders(), body: JSON.stringify({ amount: action==='add'?a:-a, note: 'Admin' }) });
    closeUserDrawer(); loadUsers();
};
window.toggleBan = async function() {
    const c = await Swal.fire({ title: 'تأكيد', icon: 'warning', showCancelButton: true, background:'#1e293b', color:'#fff' }); if(!c.isConfirmed) return;
    await fetch(`${API_BASE}/admin/api/users/${currentSelectedUser.id}/ban`, { method:'POST', headers: getHeaders() });
    closeUserDrawer(); loadUsers();
};
window.closeUserDrawer = function() { document.getElementById('userDrawerOverlay').classList.add('hidden'); document.getElementById('userDrawer').classList.add('translate-x-full'); };

// Support (Strict Abort & Direct Chat)
window.switchSupportTab = function(status, btn) {
    currentSupportTab = status; document.querySelectorAll('#section-support .tab-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active');
    if(adminChatPolling) clearInterval(adminChatPolling); currentTicketId = null; document.getElementById('supportMessages').innerHTML = '';
    document.getElementById('chatUserName').innerText = 'اختر محادثة'; document.getElementById('supportReplyArea').style.display = 'none'; document.getElementById('closeTicketBtn').classList.add('hidden');
    document.getElementById('supportTicketsList').classList.toggle('hidden', status === 'new');
    document.getElementById('newChatSearch').classList.toggle('hidden', status !== 'new');
    if(status !== 'new') loadSupportTickets(); else document.getElementById('chatSearchResults').innerHTML = '';
};
async function loadSupportTickets() {
    const l = document.getElementById('supportTicketsList'); l.innerHTML = '<div class="text-center py-2 text-slate-400">تحميل...</div>';
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/support/tickets?status=${currentSupportTab}`, { headers: getHeaders() });
        l.innerHTML = data.length ? '' : '<div class="text-center py-2 text-slate-400">فارغ</div>';
        data.forEach(t => l.innerHTML += `<div class="bg-dark p-3 rounded-lg cursor-pointer hover:bg-slate-800 mb-2" onclick="openSupportTicket(${t.id}, '${escapeHtml(t.user_name)}')"><div class="font-bold text-sm">${escapeHtml(t.user_name)}</div><div class="text-xs text-slate-400 truncate">${escapeHtml(t.last_message)}</div></div>`);
    } catch(e) { l.innerHTML = 'خطأ'; }
}
window.searchUsersForChat = function(q) {
    const r = document.getElementById('chatSearchResults'); if(q.length < 2) { r.innerHTML=''; return; }
    const filtered = allUsersData.filter(u => u.first_name?.includes(q) || String(u.telegram_id).includes(q)).slice(0, 5);
    r.innerHTML = filtered.map(u => `<div class="bg-slate-800 p-2 rounded cursor-pointer hover:bg-slate-700 mb-1" onclick="startDirectChat(${u.id}, '${escapeHtml(u.first_name)}')">${escapeHtml(u.first_name)} (${u.telegram_id})</div>`).join('');
};
window.startDirectChat = async function(id, name) {
    currentTicketId = 'new_' + id; document.getElementById('chatUserName').innerText = `محادثة جديدة: ${name}`;
    document.getElementById('supportReplyArea').style.display = 'flex'; document.getElementById('supportMessages').innerHTML = '<div class="text-center text-slate-500 text-sm">اكتب رسالة لبدء المحادثة...</div>';
};
window.openSupportTicket = async function(id, name) {
    if(adminChatPolling) clearInterval(adminChatPolling);
    if(ticketAbortController) ticketAbortController.abort(); ticketAbortController = new AbortController();
    currentTicketId = id; document.getElementById('chatUserName').innerText = name;
    document.getElementById('supportReplyArea').style.display = currentSupportTab === 'open' ? 'flex' : 'none';
    document.getElementById('closeTicketBtn').classList.toggle('hidden', currentSupportTab !== 'open');
    document.getElementById('supportMessages').innerHTML = ''; loadTicketMessages();
    adminChatPolling = setInterval(loadTicketMessages, 3000);
};
async function loadTicketMessages() {
    if (!currentTicketId || String(currentTicketId).startsWith('new_')) return;
    try {
        const res = await fetch(`${API_BASE}/admin/api/support/tickets/${currentTicketId}`, { headers: getHeaders(), signal: ticketAbortController.signal });
        if (!res.ok) return;
        const data = await res.json();
        const c = document.getElementById('supportMessages'); let html = '';
        data.messages.forEach(m => html += `<div class="chat-bubble ${m.sender_type}">${escapeHtml(m.message)}</div>`);
        if(c.innerHTML !== html) { c.innerHTML = html; c.scrollTop = c.scrollHeight; }
    } catch(e) { if(e.name !== 'AbortError') console.error(e); }
}
window.replySupportTicket = async function() {
    const i = document.getElementById('supportReplyInput'); const msg = i.value.trim(); if(!msg || !currentTicketId) return; i.value = '';
    if(String(currentTicketId).startsWith('new_')) {
        const userId = currentTicketId.split('_')[1];
        await fetch(`${API_BASE}/admin/api/support/start-chat`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ user_id: parseInt(userId), message: msg }) });
        Swal.fire('تم', 'تم إرسال الرسالة وفتح المحادثة', 'success'); switchSupportTab('open', document.querySelectorAll('#section-support .tab-btn')[0]);
    } else {
        await fetch(`${API_BASE}/admin/api/support/tickets/${currentTicketId}/reply`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ reply: msg }) }); loadTicketMessages();
    }
};
window.insertQuickReply = function(text) { document.getElementById('supportReplyInput').value = text; };
window.closeSupportTicket = async function() {
    const c = await Swal.fire({ title: 'إغلاق', icon: 'warning', showCancelButton: true, background:'#1e293b', color:'#fff' }); if(!c.isConfirmed) return;
    await fetch(`${API_BASE}/admin/api/support/tickets/${currentTicketId}/close`, { method: 'POST', headers: getHeaders() });
    switchSupportTab('closed', document.querySelectorAll('#section-support .tab-btn')[1]);
};

// Notifications & Settings
window.sendNotification = async function() {
    const t = document.getElementById('notifTarget').value, u = document.getElementById('notifUserId').value, m = document.getElementById('notifMessage').value;
    if(!m) return;
    await fetch(`${API_BASE}/admin/api/notifications`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ target: t === 'specific' ? u : 'all', message: m }) });
    Swal.fire('تم', 'تم الإرسال', 'success');
};
document.getElementById('notifTarget')?.addEventListener('change', (e) => document.getElementById('notifUserId').classList.toggle('hidden', e.target.value !== 'specific'));
async function loadSettings() { try { const d = await safeFetch(`${API_BASE}/admin/api/settings`, { headers: getHeaders() }); document.getElementById('setStoreName').value = d.store_name||''; document.getElementById('setSupportLink').value = d.support_link||''; document.getElementById('setExchangeRate').value = d.exchange_rate||132; } catch(e){} }
window.saveSettings = async function() { await fetch(`${API_BASE}/admin/api/settings`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ store_name: document.getElementById('setStoreName').value, support_link: document.getElementById('setSupportLink').value, exchange_rate: document.getElementById('setExchangeRate').value }) }); Swal.fire('تم', 'حفظ', 'success'); };

// Utils
async function safeFetch(url, opt={}) { const r = await fetch(url + (url.includes('?')?'&':'?') + '_t=' + Date.now(), { ...opt, cache: 'no-store' }); const d = await r.json(); if(!r.ok) throw new Error(d.error || 'Error'); return d; }
function escapeHtml(t) { return !t ? '' : String(t).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
