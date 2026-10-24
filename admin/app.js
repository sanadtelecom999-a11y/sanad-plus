const API_BASE = 'https://sanad-plus-backend.onrender.com';
let currentSessionId = null, dashboardChartInstance = null, currentInboxTab = 'orders', cachedItems = {}, currentTicketId = null, adminChatPolling = null, currentSelectedUser = null, allUsersData = [];

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('admin_token')) { document.getElementById('loginScreen').classList.remove('hidden'); } else { showDashboard(); }
});

function showToast(message, type = 'error') { /* كود الإشعارات */ }
async function safeFetch(url, options = {}) { /* كود الجلب الآمن */ }
async function handleLogin() { /* ... */ }
async function verifyOTP() { /* ... */ }
function logout() { /* ... */ }
function getHeaders() { /* ... */ }
function showDashboard() { /* ... */ }
function switchSection(sectionId, btn) { /* ... */ }
function toggleSidebar() { /* ... */ }
async function loadDashboardStats() { /* ... */ }
function initChart() { /* ... */ }
function switchInboxTab(type, btn) { /* ... */ }
async function loadInbox(type) { /* ... */ }
function viewDetails(type, id) { /* ... */ }
function copyToClipboard(elementId) { /* ... */ }
async function handleAction(type, id, action, extra) { /* ... */ }
function closeModal() { /* ... */ }
async function checkInboxBadge() { /* ... */ }
async function loadUsers() { /* ... */ }
function renderUsersTable(users) { /* ... */ }
function openUserDrawer(user) { /* ... */ }
function closeUserDrawer() { /* ... */ }
async function adjustBalance(action) { /* ... */ }
async function toggleBan() { /* ... */ }
async function setDiscount() { /* ... */ }
function escapeHtml(text) { /* ... */ }

// ================= Support Chat (Polling Logic) =================
async function loadSupportTickets() {
    const list = document.getElementById('supportTicketsList');
    if (!list) return;
    list.innerHTML = '<div class="text-center py-4 text-slate-400"><i data-lucide="loader" class="animate-spin mx-auto mb-2"></i>جاري التحميل...</div>';
    lucide.createIcons();
    try {
        const data = await safeFetch(`${API_BASE}/admin/api/support/tickets`, { headers: getHeaders() });
        list.innerHTML = '';
        if (data.length === 0) { list.innerHTML = '<div class="text-center py-4 text-slate-400">لا توجد تذاكر مفتوحة.</div>'; return; }
        data.forEach(t => {
            const el = document.createElement('div');
            el.className = 'support-ticket-item'; el.id = `ticket-${t.id}`;
            el.onclick = () => openSupportTicket(t.id, t.user_name, t.user_telegram);
            el.innerHTML = `<div class="flex justify-between items-center mb-1"><strong class="text-white">${escapeHtml(t.user_name)}</strong><span class="text-xs text-slate-500 font-mono">${t.user_telegram}</span></div><div class="text-sm text-slate-400 truncate">${escapeHtml(t.last_message)}</div><div class="text-xs text-accent mt-2">${new Date(t.updated_at).toLocaleDateString('ar-EG')}</div>`;
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
        currentTicketId = null; stopAdminPolling(); loadSupportTickets();
    } catch(e) { showToast(e.message, 'error'); }
}
