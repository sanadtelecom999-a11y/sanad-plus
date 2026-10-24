const API_BASE = 'https://sanad-plus-backend.onrender.com';
let currentSessionId = null;
let dashboardChartInstance = null;
let currentInboxTab = 'orders';
let cachedItems = {};
let currentTicketId = null;
let adminChatPolling = null;

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
        const res = await fetch(url, options);
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) throw new Error("السيرفر غير متاح");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `خطأ: ${res.status}`);
        return data;
    } catch (error) { throw error; }
}

async function handleLogin() { /* ... */ }
async function verifyOTP() { /* ... */ }
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
async function loadDashboardStats() { /* ... */ }
function initChart() { /* ... */ }

// ================= Inbox Logic =================
function switchInboxTab(type, btn) { /* ... */ }
async function loadInbox(type) { /* ... */ }
function viewDetails(type, id) { /* ... */ }
function copyToClipboard(elementId) { /* ... */ }
async function handleAction(type, id, action, extra) { /* ... */ }
function closeModal() { document.getElementById('detailsModal').classList.add('hidden'); }
async function checkInboxBadge() { /* ... */ }

// ================= Support Tickets Logic =================
async function loadSupportTickets() {
    const list = document.getElementById('supportTicketsList');
    if (!list) return;
    list.innerHTML = '<div class="text-center py-4 text-slate-400"><i data-lucide="loader" class="animate-spin mx-auto mb-2"></i>جاري التحميل...</div>';
    lucide.createIcons();
    
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/support/tickets`, { headers: getHeaders() });
        list.innerHTML = '';
        if (data.length === 0) {
            list.innerHTML = '<div class="text-center py-4 text-slate-400">لا توجد تذاكر مفتوحة.</div>';
            return;
        }
        data.forEach(t => {
            const el = document.createElement('div');
            el.className = 'support-ticket-item';
            el.id = `ticket-${t.id}`;
            el.onclick = () => openSupportTicket(t.id, t.user_name, t.user_telegram);
            el.innerHTML = `
                <div class="flex justify-between items-center mb-1">
                    <strong class="text-white">${escapeHtml(t.user_name)}</strong>
                    <span class="text-xs text-slate-500 font-mono">${t.user_telegram}</span>
                </div>
                <div class="text-sm text-slate-400 truncate">${escapeHtml(t.last_message)}</div>
                <div class="text-xs text-accent mt-2">${new Date(t.updated_at).toLocaleDateString('ar-EG')}</div>
            `;
            list.appendChild(el);
        });
    } catch(e) { list.innerHTML = `<div class="text-danger text-sm p-3">${e.message}</div>`; }
}

function openSupportTicket(id, name, telegram) {
    currentTicketId = id;
    document.querySelectorAll('.support-ticket-item').forEach(el => el.classList.remove('active'));
    const el = document.getElementById(`ticket-${id}`);
    if (el) el.classList.add('active');
    
    document.getElementById('supportChatPlaceholder').classList.add('hidden');
    const chat = document.getElementById('supportChatContent');
    chat.classList.remove('hidden');
    chat.classList.add('flex');
    
    document.getElementById('chatUserName').textContent = `${name} (#${telegram})`;
    
    loadTicketMessages();
    startAdminPolling();
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
            bubble.innerHTML = `<span class="chat-sender">${m.sender_type === 'user' ? 'المستخدم' : 'أنت'}</span><span>${escapeHtml(m.message)}</span><span class="chat-time">${new Date(m.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>`;
            container.appendChild(bubble);
        });
        container.scrollTop = container.scrollHeight;
    } catch(e) { showToast(e.message, 'error'); }
}

function startAdminPolling() {
    if (adminChatPolling) clearInterval(adminChatPolling);
    adminChatPolling = setInterval(() => { if (currentTicketId) loadTicketMessages(); }, 3000);
}

function stopAdminPolling() {
    if (adminChatPolling) { clearInterval(adminChatPolling); adminChatPolling = null; }
}

async function replySupportTicket() {
    if (!currentTicketId) return;
    const input = document.getElementById('supportReplyInput');
    const reply = input.value.trim();
    if (!reply) return;
    
    input.value = '';
    input.disabled = true;
    try {
        await safeFetch(`${API_BASE}/admin/api/support/tickets/${currentTicketId}/reply`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ reply }) });
        showToast('تم إرسال الرد', 'success');
        loadTicketMessages();
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
        currentTicketId = null;
        stopAdminPolling();
        loadSupportTickets();
    } catch(e) { showToast(e.message, 'error'); }
}

// ================= Users Logic =================
let currentSelectedUser = null;
let allUsersData = [];
async function loadUsers() { /* ... */ }
function renderUsersTable(users) { /* ... */ }
function openUserDrawer(user) { /* ... */ }
function closeUserDrawer() { /* ... */ }
async function adjustBalance(action) { /* ... */ }
async function toggleBan() { /* ... */ }
async function setDiscount() { /* ... */ }

function escapeHtml(text) { if (!text) return ''; return String(text).replace(/[&<>"']/g, function(m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
