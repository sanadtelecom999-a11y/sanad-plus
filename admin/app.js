const API_BASE = 'https://sanad-plus-backend.onrender.com';
let currentSessionId = null;
let currentInboxTab = 'orders';
let currentSupportTab = 'open';
let currentTicketId = null;
let adminChatPolling = null;
let ticketAbortController = null;
let cachedItems = {};
let allUsersData = [];
let categoriesData = [];
let currentSelectedUser = null;
let editingItemId = null;
let dashboardChartInstance = null;

document.addEventListener('DOMContentLoaded', () => { 
    if (typeof lucide !== 'undefined') lucide.createIcons(); 
    const t = localStorage.getItem('admin_token'); 
    if (!t) document.getElementById('loginScreen').style.display = 'flex'; 
    else verifyTokenAndLogin(); 
});

async function verifyTokenAndLogin() { 
    try { 
        const res = await fetch(`${API_BASE}/api/admin/stats`, { headers: getHeaders() }); 
        if (res.ok) { 
            document.getElementById('loginScreen').style.display = 'none'; 
            document.getElementById('dashboardScreen').style.display = 'flex'; 
            showDashboard(); 
        } else throw new Error(); 
    } catch (e) { 
        localStorage.removeItem('admin_token'); 
        document.getElementById('loginScreen').style.display = 'flex'; 
    } 
}

window.handleLogin = async function() { 
    const u = document.getElementById('loginUser').value, p = document.getElementById('loginPass').value; 
    if(!u||!p) return; 
    try {
        const res = await fetch(`${API_BASE}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) }); 
        const d = await res.json(); 
        if (res.ok && d.require_otp) { 
            currentSessionId = d.session_id; 
            document.getElementById('loginStep1').classList.add('hidden'); 
            document.getElementById('loginStep2').classList.remove('hidden'); 
        } else Swal.fire('خطأ', d.error || 'بيانات غير صحيحة', 'error'); 
    } catch(e) { Swal.fire('خطأ', 'تعذر الاتصال', 'error'); }
};

window.verifyOTP = async function() { 
    const c = document.getElementById('otpCode').value; 
    try {
        const res = await fetch(`${API_BASE}/api/admin/verify-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: currentSessionId, otp_code: c }) }); 
        const d = await res.json(); 
        const t = d.token || d.access_token; 
        if (res.ok && t) { localStorage.setItem('admin_token', t); location.reload(); } 
        else Swal.fire('خطأ', d.error || 'رمز خاطئ', 'error'); 
    } catch(e) { Swal.fire('خطأ', 'تعذر الاتصال', 'error'); }
};

window.logout = function() { localStorage.removeItem('admin_token'); location.reload(); };
window.getHeaders = function() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }; };

window.showDashboard = function() { loadDashboardStats(); initChart(); if (typeof lucide !== 'undefined') lucide.createIcons(); };
window.switchSection = function(id, btn) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden')); 
    document.getElementById('section-' + id).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active', 'bg-slate-700/50', 'text-white')); 
    if(btn) btn.classList.add('active', 'bg-slate-700/50', 'text-white');
    
    const titles = { 'dashboard': 'لوحة التحكم', 'inbox': 'الإرساليات', 'support': 'تذاكر الدعم', 'users': 'المستخدمين', 'archive': 'الأرشيف', 'categories': 'الأقسام', 'products': 'المنتجات', 'payments': 'طرق الدفع', 'settings': 'الإعدادات' };
    document.getElementById('page-title').innerText = titles[id] || 'لوحة التحكم';
    
    if (id === 'inbox') loadInbox(currentInboxTab); 
    if (id === 'users') loadUsers(); 
    if (id === 'products') loadProducts(); 
    if (id === 'categories') loadCategories(); 
    if (id === 'payments') loadPayments(); 
    if (id === 'support') switchSupportTab(currentSupportTab, document.querySelectorAll('#section-support .tab-btn')[0]); 
    if (id === 'archive') loadArchive(); 
    if (id === 'settings') loadSettings();
};

async function loadDashboardStats() { try { const d = await safeFetch(`${API_BASE}/api/admin/stats`, { headers: getHeaders() }); document.getElementById('statOrders').innerText = d.total_orders||0; document.getElementById('statUsers').innerText = d.total_users||0; document.getElementById('statDeposits').innerText = d.total_deposits||0; document.getElementById('statRevenue').innerText = `$${(d.revenue||0).toFixed(2)}`; } catch (e) {} }
function initChart() { const c = document.getElementById('dashboardChart'); if(!c || typeof Chart==='undefined') return; if(dashboardChartInstance) dashboardChartInstance.destroy(); dashboardChartInstance = new Chart(c, { type: 'line', data: { labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'], datasets: [{ label: 'المبيعات', data: [12, 19, 3, 5, 2, 3, 10], borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.1)', fill: true }] }, options: { responsive: true, maintainAspectRatio: false } }); }

window.switchInboxTab = function(type, btn) { currentInboxTab = type; document.querySelectorAll('#section-inbox .tab-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); loadInbox(type); };
async function loadInbox(type) {
    const c = document.getElementById('inboxContainer'); c.innerHTML = '<div class="col-span-full text-center py-10 text-slate-400">جاري التحميل...</div>';
    let ep = type === 'deposits' ? '/api/admin/deposits' : (type === 'kyc' ? '/api/admin/kyc' : '/api/admin/orders');
    try {
        const data = await safeFetch(`${API_BASE}${ep}`, { headers: getHeaders() }); cachedItems[type] = data; c.innerHTML = '';
        if(!data || data.length===0) { c.innerHTML = '<div class="col-span-full text-center py-10 text-slate-400">لا توجد عناصر.</div>'; return; }
        data.forEach(item => {
            const div = document.createElement('div'); div.className = 'inbox-card';
            div.innerHTML = `<div class="cursor-pointer flex-1" onclick="viewDetails('${type}', ${item.id})"><div class="flex justify-between font-bold border-b border-slate-700/50 pb-2 mb-2"><span class="text-accent font-mono">${item.order_number || item.transaction_id || ('KYC#'+item.id)}</span><span class="text-warning">${type==='orders' ? '$'+parseFloat(item.total_price).toFixed(2) : (type==='deposits' ? '$'+parseFloat(item.amount).toFixed(2) : '')}</span></div><div class="text-sm">${escapeHtml(item.product_name || item.user_name || item.full_name)}</div></div>`;
            c.appendChild(div);
        });
    } catch (e) { c.innerHTML = `<div class="col-span-full text-center py-10 text-danger">${e.message}</div>`; }
}
;;
window.handleAction = async function(type, id, action, extra) {
    const c = await Swal.fire({ title: 'تأكيد', icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم', background:'#1e293b', color:'#fff' }); if(!c.isConfirmed) return;
    let ep = type === 'deposits' ? `/api/admin/deposits/${id}/${action}` : (type === 'orders' ? `/api/admin/orders/${id}/status` : `/api/admin/kyc/${id}/${action}`);
    await fetch(`${API_BASE}${ep}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(type==='orders' ? {status: extra} : {}) });
    closeModal(); loadInbox(currentInboxTab);
};
window.closeModal = function() { document.getElementById('detailsModal').classList.add('hidden'); document.getElementById('detailsModal').classList.remove('flex'); };

async function loadUsers() {
    const t = document.getElementById('usersTableBody'); t.innerHTML = '<tr><td colspan="5" class="text-center py-4">جاري التحميل...</td></tr>';
    try {
        allUsersData = await safeFetch(`${API_BASE}/api/admin/users`, { headers: getHeaders() }); t.innerHTML = '';
        allUsersData.forEach(u => {
            const banIcon = u.is_banned ? `<span class="text-red-500 ml-2" title="محظور"><i data-lucide="ban" size="16"></i></span>` : '';
            t.innerHTML += `<tr class="border-b border-slate-700/50"><td class="py-2 px-2"><strong>${escapeHtml(u.first_name||'')}</strong> ${banIcon}</td><td class="py-2 px-2 font-mono text-slate-400">${u.telegram_id}</td><td class="py-2 px-2 text-success font-bold">$${parseFloat(u.balance).toFixed(2)}</td><td class="py-2 px-2">${u.is_banned?'<span class="text-red-400">محظور</span>':'<span class="text-green-400">نشط</span>'}</td><td class="py-2 px-2 flex gap-2"><button onclick="openUserView(${u.id})" class="text-accent"><i data-lucide="eye" size="16"></i></button><button onclick="openUserManage(${u.id})" class="bg-slate-700 px-2 py-1 rounded text-xs">إدارة</button></td></tr>`;
        }); if(typeof lucide!=='undefined') lucide.createIcons();
    } catch(e) { t.innerHTML = `<tr><td colspan="5" class="text-danger">${e.message}</td></tr>`; }
}
window.openUserView = async function(id) {
    const u = allUsersData.find(x=>x.id===id); if(!u) return;
    document.getElementById('userDrawerOverlay').classList.remove('hidden'); document.getElementById('userDrawer').classList.remove('translate-x-full');
    document.getElementById('drawerTitle').innerText = 'ملف المستخدم';
    const c = document.getElementById('userDetailsContent'); c.innerHTML = '<div class="text-center py-4 text-slate-400">جاري السجل...</div>';
    const sn = `SN-${String(u.telegram_id).padStart(6,'0')}`;
    try {
        const hist = await safeFetch(`${API_BASE}/api/admin/users/${id}/history`, { headers: getHeaders() }).catch(()=>({orders:[], deposits:[]}));
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
    await fetch(`${API_BASE}/api/admin/users/${currentSelectedUser.id}/balance`, { method:'POST', headers: getHeaders(), body: JSON.stringify({ amount: action==='add'?a:-a, note: 'Admin' }) });
    closeUserDrawer(); loadUsers();
};
window.toggleBan = async function() {
    const c = await Swal.fire({ title: 'تأكيد', icon: 'warning', showCancelButton: true, background:'#1e293b', color:'#fff' }); if(!c.isConfirmed) return;
    const targetState = !currentSelectedUser.is_banned;
    await fetch(`${API_BASE}/api/admin/users/${currentSelectedUser.id}/ban`, { method:'POST', headers: getHeaders(), body: JSON.stringify({ is_banned: targetState }) });
    closeUserDrawer(); loadUsers();
};
window.closeUserDrawer = function() { document.getElementById('userDrawerOverlay').classList.add('hidden'); document.getElementById('userDrawer').classList.add('translate-x-full'); };

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
        const data = await safeFetch(`${API_BASE}/api/admin/support/tickets?status=${currentSupportTab}`, { headers: getHeaders() });
        l.innerHTML = data.length ? '' : '<div class="text-center py-2 text-slate-400">فارغ</div>';
        data.forEach(t => l.innerHTML += `<div class="bg-dark p-3 rounded-lg cursor-pointer hover:bg-slate-800 mb-2" onclick="openSupportTicket(${t.id}, '${escapeHtml(t.user_name)}')"><div class="font-bold text-sm">${escapeHtml(t.user_name)}</div><div class="text-xs text-slate-400 truncate">${escapeHtml(t.last_message)}</div></div>`);
    } catch(e) { l.innerHTML = '<div class="text-danger">تعذر الجلب</div>'; }
}
window.searchUsersForChat = function(q) {
    const r = document.getElementById('chatSearchResults'); if(q.length < 2) { r.innerHTML=''; return; }
    const query = q.toUpperCase();
    const filtered = allUsersData.filter(u => {
        const sn = `SN-${String(u.telegram_id).padStart(6,'0')}`;
        return (u.first_name||'').includes(q) || String(u.telegram_id).includes(q) || (u.username||'').includes(q) || sn.includes(query);
    }).slice(0, 5);
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
        const res = await fetch(`${API_BASE}/api/admin/support/tickets/${currentTicketId}`, { headers: getHeaders(), signal: ticketAbortController.signal });
        if (!res.ok) return;
        const data = await res.json();
        const c = document.getElementById('supportMessages'); let html = '';
        data.messages.forEach(m => html += `<div class="chat-bubble ${m.sender_type}">${escapeHtml(m.message)}</div>`);
        if(c.innerHTML !== html) { c.innerHTML = html; c.scrollTop = c.scrollHeight; }
    } catch(e) { if(e.name !== 'AbortError') console.error(e); }
}
window.replySupportTicket = async function() {
    const i = document.getElementById('supportReplyInput'); const msg = i.value.trim(); if(!msg || !currentTicketId) return; i.value = '';
    try {
        if(String(currentTicketId).startsWith('new_')) {
            const userId = currentTicketId.split('_')[1];
            const res = await fetch(`${API_BASE}/api/admin/support/start-chat`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ user_id: parseInt(userId), message: msg }) });
            if(!res.ok) throw new Error();
            Swal.fire('تم', 'تم فتح المحادثة', 'success'); switchSupportTab('open', document.querySelectorAll('#section-support .tab-btn')[0]);
        } else {
            await fetch(`${API_BASE}/api/admin/support/tickets/${currentTicketId}/reply`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ reply: msg }) }); loadTicketMessages();
        }
    } catch(e) { Swal.fire('خطأ', 'فشل الإرسال، تأكد من السيرفر', 'error'); }
};
window.insertQuickReply = function(text) { document.getElementById('supportReplyInput').value = text; };
window.closeSupportTicket = async function() {
    const c = await Swal.fire({ title: 'إغلاق', icon: 'warning', showCancelButton: true, background:'#1e293b', color:'#fff' }); if(!c.isConfirmed) return;
    await fetch(`${API_BASE}/api/admin/support/tickets/${currentTicketId}/close`, { method: 'POST', headers: getHeaders() });
    switchSupportTab('closed', document.querySelectorAll('#section-support .tab-btn')[1]);
};

async function loadProducts() { 
    const t = document.getElementById('productsTableBody'); 
    try { 
        const d = await safeFetch(`${API_BASE}/api/admin/products`, { headers: getHeaders() }); 
        t.innerHTML = d.map(p=>`<tr class="border-b border-slate-700/50"><td class="py-2"><img src="${p.image||''}" class="w-10 h-10 rounded object-cover"></td><td class="py-2">${p.name}</td><td class="py-2">${p.category_id}</td><td class="py-2">$${p.base_price}</td><td class="py-2"><button onclick="deleteItem('products', ${p.id})" class="text-red-400"><i data-lucide="trash" size="16"></i></button></td></tr>`).join(''); 
    } catch(e) { t.innerHTML = '<tr><td colspan="5" class="text-danger">خطأ في الجلب</td></tr>'; } 
}
async function loadCategories() { 
    const g = document.getElementById('categoriesGrid'); 
    try { 
        categoriesData = await safeFetch(`${API_BASE}/api/admin/categories`, { headers: getHeaders() }); 
        g.innerHTML = categoriesData.map(c=>`<div class="glass p-4 rounded-xl text-center relative"><button onclick="deleteItem('categories', ${c.id})" class="absolute top-2 left-2 text-red-400"><i data-lucide="trash" size="16"></i></button><img src="${c.image||''}" class="w-16 h-16 rounded mx-auto mb-2 object-cover"><h4>${c.name}</h4></div>`).join(''); 
    } catch(e) { g.innerHTML = '<div class="text-danger">خطأ في الجلب</div>'; } 
}
async function loadPayments() { 
    const g = document.getElementById('paymentsGrid'); 
    try { 
        const d = await safeFetch(`${API_BASE}/api/admin/payment-methods`, { headers: getHeaders() }); 
        g.innerHTML = d.map(p=>`<div class="glass p-4 rounded-xl relative"><button onclick="deleteItem('payments', ${p.id})" class="absolute top-2 left-2 text-red-400"><i data-lucide="trash" size="16"></i></button><h4 class="font-bold mb-2">${p.name}</h4><p class="text-sm text-slate-400 mb-1">الحساب: ${p.account}</p></div>`).join(''); 
    } catch(e) { g.innerHTML = '<div class="text-danger">خطأ في الجلب</div>'; } 
}

window.openFormModal = async function(type, id = null) {
    editingItemId = id;
    document.getElementById('formModal').classList.remove('hidden'); document.getElementById('formModal').classList.add('flex');
    const title = document.getElementById('formTitle'), body = document.getElementById('formBody'), saveBtn = document.getElementById('formSaveBtn');
    
    if (type === 'category') {
        title.innerText = id ? 'تعديل قسم' : 'إضافة قسم';
        body.innerHTML = `<div><label class="block mb-2 text-slate-400">اسم القسم</label><input type="text" id="catName" class="input-field mb-4"></div><div><label class="block mb-2 text-slate-400">صورة القسم</label><input type="file" id="catImageFile" accept="image/*" class="input-field mb-4 bg-slate-800"></div>`;
        saveBtn.onclick = () => saveItem('categories');
    } else if (type === 'product') {
        if (categoriesData.length === 0) await loadCategories();
        title.innerText = id ? 'تعديل منتج' : 'إضافة منتج';
        let catOptions = categoriesData.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        body.innerHTML = `<div><label class="block mb-2 text-slate-400">اسم المنتج</label><input type="text" id="prodName" class="input-field mb-4"></div><div><label class="block mb-2 text-slate-400">القسم</label><select id="prodCat" class="input-field mb-4">${catOptions}</select></div><div><label class="block mb-2 text-slate-400">السعر ($)</label><input type="number" id="prodPrice" class="input-field mb-4"></div><div><label class="block mb-2 text-slate-400">صورة المنتج</label><input type="file" id="prodImageFile" accept="image/*" class="input-field bg-slate-800"></div>`;
        saveBtn.onclick = () => saveItem('products');
    } else if (type === 'payment') {
        title.innerText = id ? 'تعديل طريقة دفع' : 'إضافة طريقة دفع';
        body.innerHTML = `<div><label class="block mb-2 text-slate-400">اسم الطريقة</label><input type="text" id="payName" class="input-field mb-4"></div><div><label class="block mb-2 text-slate-400">رقم الحساب</label><input type="text" id="payAccount" class="input-field mb-4"></div><div class="grid grid-cols-2 gap-2"><div><label class="block mb-2 text-slate-400">الحد الأدنى</label><input type="number" id="payMin" class="input-field mb-4" value="0"></div><div><label class="block mb-2 text-slate-400">الحد الأقصى</label><input type="number" id="payMax" class="input-field mb-4" value="0"></div></div>`;
        saveBtn.onclick = () => saveItem('payments');
    }
};
window.closeFormModal = function() { document.getElementById('formModal').classList.add('hidden'); document.getElementById('formModal').classList.remove('flex'); };

window.saveItem = async function(type) {
    const btn = document.getElementById('formSaveBtn'); btn.textContent = 'جاري الحفظ...'; btn.disabled = true;
    let url = `${API_BASE}/api/admin/${type}`, method = editingItemId ? 'PUT' : 'POST';
    if(editingItemId) url += `/${editingItemId}`;
    let body = {};
    try {
        if (type === 'categories') {
            body.name = document.getElementById('catName').value;
            const file = document.getElementById('catImageFile').files[0];
            if(file) body.image = await fileToBase64(file);
        } else if (type === 'products') {
            body.name = document.getElementById('prodName').value;
            body.category_id = parseInt(document.getElementById('prodCat').value);
            body.base_price = parseFloat(document.getElementById('prodPrice').value);
            const file = document.getElementById('prodImageFile').files[0];
            if(file) body.image = await fileToBase64(file);
        } else if (type === 'payments') {
            body.name = document.getElementById('payName').value;
            body.account = document.getElementById('payAccount').value;
            body.min_amount = parseFloat(document.getElementById('payMin').value);
            body.max_amount = parseFloat(document.getElementById('payMax').value);
        }
        const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(body) });
        if(res.ok) {
            Swal.fire({ title: 'تم', icon: 'success', timer: 1500, showConfirmButton: false });
            closeFormModal();
            if(type === 'categories') loadCategories();
            if(type === 'products') loadProducts();
            if(type === 'payments') loadPayments();
        } else throw new Error();
    } catch(e) { Swal.fire('خطأ', 'حدث خطأ أثناء الحفظ', 'error'); }
    finally { btn.textContent = 'حفظ'; btn.disabled = false; }
};

window.deleteItem = async function(type, id) {
    const confirm = await Swal.fire({ title: 'حذف', text: "هل أنت متأكد؟", icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم', background: '#1e293b', color: '#fff' });
    if (!confirm.isConfirmed) return;
    try {
        await fetch(`${API_BASE}/api/admin/${type}/${id}`, { method: 'DELETE', headers: getHeaders() });
        Swal.fire({ title: 'تم', icon: 'success', timer: 1000, showConfirmButton: false });
        if(type === 'categories') loadCategories();
        if(type === 'products') loadProducts();
        if(type === 'payments') loadPayments();
    } catch(e) { Swal.fire('خطأ', 'فشل الحذف', 'error'); }
};

async function loadSettings() { try { const d = await safeFetch(`${API_BASE}/api/admin/settings`, { headers: getHeaders() }); document.getElementById('setStoreName').value = d.store_name||''; document.getElementById('setSupportLink').value = d.support_link||''; document.getElementById('setExchangeRate').value = d.exchange_rate||132; document.getElementById('setMaintenance').checked = d.maintenance_mode === '1'; } catch(e){} }
window.saveSettings = async function() { await fetch(`${API_BASE}/api/admin/settings`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ store_name: document.getElementById('setStoreName').value, support_link: document.getElementById('setSupportLink').value, exchange_rate: document.getElementById('setExchangeRate').value, maintenance_mode: document.getElementById('setMaintenance').checked ? '1' : '0' }) }); Swal.fire('تم', 'حفظ الإعدادات', 'success'); };

async function loadArchive() {
    const c = document.getElementById('archiveContainer');
    c.innerHTML = '<div class="text-center text-slate-400">جاري الجلب...</div>';
    try {
        const d = await safeFetch(`${API_BASE}/api/admin/archive`, { headers: getHeaders() });
        
        let cats = d.categories || d.archived_categories || [];
        let prods = d.products || d.archived_products || [];
        if (Array.isArray(d)) {
            cats = d.filter(x => x.type === 'category' || x.parent_id === null);
            prods = d.filter(x => x.type === 'product' || x.category_id !== undefined);
        }

        if (cats.length === 0 && prods.length === 0) {
            c.innerHTML = `<div class="glass p-6 rounded-3xl text-center text-slate-400">تم جلب البيانات لكن الهيكل غير معروف.<br><pre class="text-left text-xs mt-4" dir="ltr">${JSON.stringify(d, null, 2)}</pre></div>`; 
            return;
        }
        
        let html = '';
        if (cats.length > 0) html += `<div class="glass p-6 rounded-3xl"><h4 class="text-accent mb-4 font-bold">أقسام مؤرشفة</h4><div class="grid grid-cols-2 md:grid-cols-4 gap-4">` + cats.map(x => `<div class="bg-dark p-4 rounded-xl text-center border border-slate-700"><h5 class="mb-2">${x.name}</h5><button onclick="restoreItem('categories', ${x.id})" class="bg-success text-white px-2 py-1 rounded text-xs">استرجاع</button></div>`).join('') + `</div></div>`;
        if (prods.length > 0) html += `<div class="glass p-6 rounded-3xl mt-4"><h4 class="text-accent mb-4 font-bold">منتجات مؤرشفة</h4><div class="grid grid-cols-2 md:grid-cols-4 gap-4">` + prods.map(x => `<div class="bg-dark p-4 rounded-xl text-center border border-slate-700"><img src="${x.image||''}" class="w-12 h-12 rounded mx-auto mb-2"><h5 class="mb-2">${x.name}</h5><button onclick="restoreItem('products', ${x.id})" class="bg-success text-white px-2 py-1 rounded text-xs">استرجاع</button></div>`).join('') + `</div></div>`;
        c.innerHTML = html;
    } catch(e) { c.innerHTML = `<div class="text-danger text-center">تعذر جلب الأرشيف.</div>`; }
}
window.restoreItem = async function(type, id) {
    await fetch(`${API_BASE}/api/admin/${type}/${id}/restore`, { method: 'POST', headers: getHeaders() });
    Swal.fire('تم', 'تم الاسترجاع', 'success'); loadArchive();
}

function fileToBase64(file) { return new Promise((resolve) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result); }); }


// ================= 📊 تصدير Excel =================
function exportToExcel(filename, data) {
    if (typeof XLSX === 'undefined') return showToast('مكتبة Excel لم تُحمل', 'error');
    if (!data || !data.length) return showToast('لا توجد بيانات للتصدير', 'warning');
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast('تم تصدير الملف بنجاح', 'success');
}

window.exportUsersExcel = () => exportToExcel('users', allUsersData);

// ================= 📑 الترقيم (Pagination) =================
let currentProductPage = 1;
async function loadProductsPage(page = 1) {
    currentProductPage = page;
    const res = await fetch(`${API_BASE}/api/admin/products?page=${page}&limit=10`, { headers: getHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = data.items.map(p => `
        <tr>
            <td><img src="${p.image || ''}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;"></td>
            <td>${p.name}</td>
            <td>${p.category_name}</td>
            <td>$${p.base_price}</td>
            <td>${p.base_quantity} ${p.unit_name}</td>
            <td><button class="bg-red-500 text-white px-2 py-1 rounded" onclick="deleteProduct(${p.id})">حذف</button></td>
        </tr>
    `).join('');

    let paginationHtml = `<div style="display:flex; justify-content:center; gap:10px; margin-top:15px;">`;
    if (data.current_page > 1) paginationHtml += `<button class="btn-outline" onclick="loadProductsPage(${data.current_page - 1})">السابق</button>`;
    paginationHtml += `<span style="display:flex;align-items:center;">صفحة ${data.current_page} من ${data.pages}</span>`;
    if (data.current_page < data.pages) paginationHtml += `<button class="btn-outline" onclick="loadProductsPage(${data.current_page + 1})">التالي</button>`;
    paginationHtml += `</div>`;
    
    const oldPag = document.getElementById('productPagination');
    if (oldPag) oldPag.remove();
    const div = document.createElement('div');
    div.id = 'productPagination';
    div.innerHTML = paginationHtml;
    tbody.parentElement.parentElement.appendChild(div);
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(startRealtimeNotifications, 5000);
});


// ================= ⚡ دوال الواجهة الجديدة والمضمونة =================

async function safeFetch(url, options = {}) {
    try {
        const res = await fetch(url, { ...options, headers: { ...getHeaders(), ...options.headers } });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
    } catch (e) {
        console.error("Fetch Error:", url, e);
        throw e;
    }
}

window.viewDetails = async function(type, id) {
    const modal = document.getElementById('detailsModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');
    
    if(!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    title.textContent = 'جاري التحميل...';
    body.innerHTML = '<div class="text-center py-4"><i data-lucide="loader" class="animate-spin inline-block"></i></div>';
    if(typeof lucide !== 'undefined') lucide.createIcons();
    footer.innerHTML = '';

    try {
        let item;
        if (type === 'orders') {
            item = await safeFetch(`${API_BASE}/api/admin/orders/${id}/full`);
            title.textContent = `تفاصيل الطلب: ${item.order_number}`;
            body.innerHTML = `
                <div class="space-y-4 text-sm text-slate-300">
                    <div class="bg-slate-800 p-3 rounded-lg"><strong>المستخدم:</strong> ${item.user.first_name} (${item.user.telegram_id})</div>
                    <div class="bg-slate-800 p-3 rounded-lg"><strong>المنتج:</strong> ${item.product.name} (الكمية: ${item.quantity})</div>
                    <div class="bg-slate-800 p-3 rounded-lg"><strong>السعر:</strong> $${item.total_price}</div>
                    <div class="bg-slate-800 p-3 rounded-lg"><strong>الحالة:</strong> ${item.status_arabic}</div>
                    <div class="bg-slate-800 p-3 rounded-lg"><strong>بيانات التسليم:</strong> ${item.delivery_data}</div>
                </div>
            `;
            footer.innerHTML = `<div class="flex gap-2 w-full"><button onclick="handleAction('orders', ${id}, 'status', 'failed')" class="btn-danger flex-1">رفض</button><button onclick="handleAction('orders', ${id}, 'status', 'completed')" class="btn-success flex-1">إكمال</button></div>`;
        } 
        else if (type === 'deposits') {
            item = (cachedItems[type] || []).find(x => x.id === id);
            title.textContent = `تفاصيل الإيداع`;
            body.innerHTML = `
                <div class="space-y-4 text-sm text-slate-300">
                    <div class="bg-slate-800 p-3 rounded-lg"><strong>المستخدم:</strong> ${item.user_name} (${item.user_telegram})</div>
                    <div class="bg-slate-800 p-3 rounded-lg"><strong>المبلغ:</strong> $${item.amount}</div>
                    <div class="bg-slate-800 p-3 rounded-lg"><strong>رقم العملية:</strong> ${item.transaction_id}</div>
                </div>
            `;
            footer.innerHTML = `<div class="flex gap-2 w-full"><button onclick="handleAction('deposits', ${id}, 'reject')" class="btn-danger flex-1">رفض</button><button onclick="handleAction('deposits', ${id}, 'approve')" class="btn-success flex-1">قبول</button></div>`;
        }
    } catch (e) {
        title.textContent = 'خطأ';
        body.innerHTML = `<div class="text-red-400 text-center">${e.message}</div>`;
    }
    if(typeof lucide !== 'undefined') lucide.createIcons();
};

window.loadSupportTickets = async function() {
    const list = document.getElementById('supportTicketsList');
    if(!list) return;
    list.innerHTML = '<div class="text-center py-4">جاري التحميل...</div>';
    try {
        const data = await safeFetch(`${API_BASE}/api/admin/support/tickets`);
        if(!data || data.length === 0) { list.innerHTML = '<div class="text-center text-slate-400">لا توجد تذاكر.</div>'; return; }
        list.innerHTML = data.map(t => `
            <div class="inbox-card mb-2" onclick="openSupportTicket(${t.id}, '${t.user_name}', '${t.user_telegram}')">
                <div class="flex justify-between font-bold text-white mb-1"><span>${t.user_name}</span><span class="text-xs text-slate-400">${t.user_telegram}</span></div>
                <div class="text-sm text-slate-400 truncate">${t.last_message}</div>
            </div>
        `).join('');
    } catch(e) { list.innerHTML = `<div class="text-red-400">${e.message}</div>`; }
};

window.loadArchiveData = async function() {
    const list = document.getElementById('archiveList');
    if(!list) return;
    list.innerHTML = '<div class="text-center py-4">جاري التحميل...</div>';
    try {
        const data = await safeFetch(`${API_BASE}/api/admin/archive`);
        let html = '';
        if(data.categories?.length) {
            html += `<h4 class="font-bold text-white mt-4 mb-2">الأقسام المؤرشفة</h4>` + data.categories.map(c => `<div class="inbox-card mb-2">${c.name}</div>`).join('');
        }
        if(data.products?.length) {
            html += `<h4 class="font-bold text-white mt-4 mb-2">المنتجات المؤرشفة</h4>` + data.products.map(p => `<div class="inbox-card mb-2">${p.name} (${p.category_name})</div>`).join('');
        }
        if(!html) html = '<div class="text-center text-slate-400">الأرشيف فارغ.</div>';
        list.innerHTML = html;
    } catch(e) { list.innerHTML = `<div class="text-red-400">${e.message}</div>`; }
};



// =================================================================
// 🚀 MASTER FIX: دوال الواجهة النظيفة (تتغلب على أي أكواد قديمة)
// =================================================================

// 1. إحياء دالة الحماية escapeHtml
function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
}

// 2. إصلاح دالة جلب وعرض المستخدمين
window.loadUsers = async function() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-slate-400">جاري التحميل...</td></tr>';
    
    try {
        const data = await safeFetch(`${API_BASE}/api/admin/users`, { headers: getHeaders() });
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-slate-400">لا يوجد مستخدمون.</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(u => `
            <tr>
                <td class="py-3 px-4 font-mono text-sm">${escapeHtml(u.telegram_id)}</td>
                <td class="py-3 px-4 font-bold text-white">${escapeHtml(u.first_name || 'مستخدم')}</td>
                <td class="py-3 px-4 font-bold ${u.balance < 0 ? 'text-danger' : 'text-success'}">$${parseFloat(u.balance || 0).toFixed(2)}</td>
                <td class="py-3 px-4">${u.is_banned ? '<span class="badge bg-red-500/20 text-red-400 px-2 py-1 rounded">محظور</span>' : '<span class="badge bg-green-500/20 text-green-400 px-2 py-1 rounded">نشط</span>'}</td>
                <td class="py-3 px-4">
                    <button class="btn-outline btn-sm" onclick="alert('سيتم تفعيل التعديل قريباً')">إدارة</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">${escapeHtml(e.message)}</td></tr>`;
    }
};

// 3. إصلاح دالة جلب وعرض المنتجات
window.loadProducts = async function() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-slate-400">جاري التحميل...</td></tr>';
    
    try {
        const res = await safeFetch(`${API_BASE}/api/admin/products?limit=50`, { headers: getHeaders() });
        const data = res.items || []; // السيرفر يرسل البيانات داخل items بسبب الترقيم
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-slate-400">لا توجد منتجات.</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(p => `
            <tr>
                <td class="py-3 px-4"><img src="${p.image || 'https://via.placeholder.com/40'}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;"></td>
                <td class="py-3 px-4 font-bold text-white">${escapeHtml(p.name)}</td>
                <td class="py-3 px-4">${escapeHtml(p.category_name || 'غير محدد')}</td>
                <td class="py-3 px-4 font-bold text-success">$${parseFloat(p.base_price || 0).toFixed(2)}</td>
                <td class="py-3 px-4">${p.base_quantity} ${escapeHtml(p.unit_name || 'قطعة')}</td>
                <td class="py-3 px-4">
                    <button class="btn-danger btn-sm" onclick="alert('سيتم تفعيل الحذف قريباً')">حذف</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">${escapeHtml(e.message)}</td></tr>`;
    }
};

// 4. إصلاح دالة جلب وعرض طرق الدفع
window.loadPaymentMethods = async function() {
    const container = document.getElementById('paymentMethodsList');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-4 text-slate-400 col-span-full">جاري التحميل...</div>';
    
    try {
        const data = await safeFetch(`${API_BASE}/api/admin/payment-methods`, { headers: getHeaders() });
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="text-center py-4 text-slate-400 col-span-full">لا توجد طرق دفع.</div>';
            return;
        }
        container.innerHTML = data.map(pm => `
            <div class="glass rounded-2xl p-4 flex flex-col gap-2 border border-slate-700">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xl">💳</div>
                    <h4 class="font-bold text-white">${escapeHtml(pm.name)}</h4>
                </div>
                <div class="text-sm text-slate-400 mt-2">الحساب: <span class="font-mono text-white">${escapeHtml(pm.account || '-')}</span></div>
                <div class="text-xs text-slate-500">الحد الأدنى: $${pm.min_amount} | الأقصى: $${pm.max_amount}</div>
                <button class="btn-outline btn-sm mt-2" onclick="alert('سيتم تفعيل التعديل قريباً')">تعديل</button>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = `<div class="text-center text-danger py-4 col-span-full">${escapeHtml(e.message)}</div>`;
    }
};

// 5. إصلاح دالة عرض الأرشيف (تحويل JSON إلى قائمة)
window.loadArchiveData = async function() {
    const list = document.getElementById('archiveList');
    if (!list) return;
    list.innerHTML = '<div class="text-center py-4 text-slate-400">جاري التحميل...</div>';
    
    try {
        const data = await safeFetch(`${API_BASE}/api/admin/archive`, { headers: getHeaders() });
        let html = '';
        
        if (data.categories && data.categories.length > 0) {
            html += `<h4 class="font-bold text-accent mt-4 mb-2 col-span-full">الأقسام المؤرشفة</h4>`;
            html += data.categories.map(c => `
                <div class="glass rounded-xl p-3 flex justify-between items-center mb-2">
                    <span class="font-bold text-white">${escapeHtml(c.name)}</span>
                    <button class="btn-success btn-sm" onclick="alert('سيتم تفعيل الاسترجاع قريباً')">استرجاع</button>
                </div>
            `).join('');
        }
        
        if (data.products && data.products.length > 0) {
            html += `<h4 class="font-bold text-accent mt-6 mb-2 col-span-full">المنتجات المؤرشفة</h4>`;
            html += data.products.map(p => `
                <div class="glass rounded-xl p-3 flex justify-between items-center mb-2">
                    <div>
                        <div class="font-bold text-white">${escapeHtml(p.name)}</div>
                        <div class="text-xs text-slate-400">${escapeHtml(p.category_name)}</div>
                    </div>
                    <button class="btn-success btn-sm" onclick="alert('سيتم تفعيل الاسترجاع قريباً')">استرجاع</button>
                </div>
            `).join('');
        }
        
        if (html === '') {
            html = '<div class="text-center py-10 text-slate-400 col-span-full">الأرشيف فارغ حالياً.</div>';
        }
        
        list.innerHTML = html;
    } catch (e) {
        list.innerHTML = `<div class="text-center text-danger py-4 col-span-full">${escapeHtml(e.message)}</div>`;
    }
};
