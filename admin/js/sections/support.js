import { api } from '../core/api.js';

let ticketsData = [];
let currentTicketId = null;

export async function renderSupport() {
    const container = document.getElementById('dashboard-container');
    container.innerHTML = `
        <section class="support-page">
            <header class="section-header">
                <h2 class="section-title">تذاكر الدعم</h2>
            </header>
            <div style="display:flex; gap:20px; height:calc(100vh - 250px);">
                <div class="content-card" style="width:300px; overflow-y:auto; padding:10px;">
                    <div id="tickets-list"><div class="loading-state"><div class="spinner"></div>جاري التحميل...</div></div>
                </div>
                <div class="content-card" style="flex:1; display:flex; flex-direction:column;">
                    <div id="chat-header" style="display:none; padding-bottom:10px; border-bottom:1px solid var(--color-border); margin-bottom:10px;">
                        <h3 id="chat-user-name"></h3>
                    </div>
                    <div id="chat-messages" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:10px;">
                        <div class="empty-state">اختر تذكرة لعرض المحادثة</div>
                    </div>
                    <form id="reply-form" style="display:none; gap:10px; margin-top:10px;">
                        <input type="text" id="reply-input" class="sanad-input" placeholder="اكتب ردك..." required>
                        <button type="submit" class="sanad-btn primary">إرسال</button>
                    </form>
                </div>
            </div>
        </section>
    `;

    try {
        const res = await api.safeFetch('/api/admin/support/tickets');
        if (!res.ok) throw new Error(res.error);
        ticketsData = res.data || [];
        
        const list = document.getElementById('tickets-list');
        if (ticketsData.length === 0) {
            list.innerHTML = `<div class="empty-state">لا توجد تذاكر.</div>`;
            return;
        }

        list.innerHTML = ticketsData.map(t => `
            <div class="inbox-item-card" style="cursor:pointer; margin-bottom:8px; padding:12px;" onclick="window.openTicket(${t.id}, '${t.user_name}')">
                <div class="inbox-item-top">
                    <span class="status-pill ${t.status === 'open' ? 'success' : 'danger'}">${t.status === 'open' ? 'مفتوحة' : 'مغلقة'}</span>
                    <small>#${t.id}</small>
                </div>
                <h4 style="margin:5px 0;">${t.user_name}</h4>
            </div>
        `).join('');
    } catch (error) {
        document.getElementById('tickets-list').innerHTML = `<div class="empty-state" style="color:red;">${error.message}</div>`;
    }
}

window.openTicket = async function(id, name) {
    currentTicketId = id;
    document.getElementById('chat-header').style.display = 'block';
    document.getElementById('chat-user-name').textContent = name;
    document.getElementById('reply-form').style.display = 'flex';
    
    const chat = document.getElementById('chat-messages');
    chat.innerHTML = `<div class="loading-state"><div class="spinner"></div>جاري التحميل...</div>`;

    try {
        const res = await api.safeFetch(`/api/admin/support/tickets/${id}/messages`);
        if (!res.ok) throw new Error(res.error);
        const msgs = res.data || [];
        
        if (msgs.length === 0) {
            chat.innerHTML = `<div class="empty-state">لا توجد رسائل.</div>`;
        } else {
            chat.innerHTML = msgs.map(m => `
                <div class="support-message ${m.sender_type === 'admin' ? 'admin' : 'user'}">
                    <strong>${m.sender_type === 'admin' ? 'الإدارة' : 'المستخدم'}</strong>
                    <p>${m.text}</p>
                    <small>${new Date(m.created_at).toLocaleString('ar-EG')}</small>
                </div>
            `).join('');
            chat.scrollTop = chat.scrollHeight;
        }
    } catch (error) {
        chat.innerHTML = `<div class="empty-state" style="color:red;">${error.message}</div>`;
    }

    document.getElementById('reply-form').onsubmit = async (e) => {
        e.preventDefault();
        const input = document.getElementById('reply-input');
        const text = input.value.trim();
        if (!text) return;
        
        try {
            const res = await api.safeFetch(`/api/admin/support/tickets/${id}/reply`, {
                method: 'POST',
                body: { text }
            });
            if (!res.ok) throw new Error(res.error);
            input.value = '';
            window.openTicket(id, name); // Reload
        } catch (error) {
            alert('فشل الإرسال: ' + error.message);
        }
    };
};
