import { api } from '../core/api.js';
import { escapeHtml, formatDate } from '../core/utils.js';

let currentTicketId = null;

export async function renderSupport() {
  const container = document.getElementById('dashboard-container');
  container.innerHTML = `
    <div class="chat-container">
      <div class="sanad-card chat-sidebar">
        <div style="padding:16px; border-bottom:1px solid rgba(255,255,255,0.05);"><h3 style="margin:0; font-size:15px;">التذاكر النشطة</h3></div>
        <div id="tickets-list" style="flex:1; overflow-y:auto; padding:8px;"></div>
      </div>
      <div class="sanad-card chat-main">
        <div id="chat-header" style="display:none; padding:16px; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; align-items:center;">
          <h3 id="chat-user-name" style="margin:0; font-size:15px;"></h3>
          <button onclick="window.closeTicket()" class="sanad-btn sanad-btn-danger" style="font-size:11px; padding:4px 8px;">إغلاق</button>
        </div>
        <div id="chat-messages" class="chat-messages">
          <div style="text-align:center; color:#91a7c2; margin-top:50px;">اختر تذكرة من القائمة لعرض المحادثة</div>
        </div>
        <div id="chat-input-area" style="display:none; padding:16px; border-top:1px solid rgba(255,255,255,0.05);">
          <form id="reply-form" style="display:flex; gap:8px;">
            <input type="text" id="reply-text" placeholder="اكتب ردك..." required class="sanad-input" style="flex:1;">
            <button type="submit" class="sanad-btn sanad-btn-primary">إرسال</button>
          </form>
        </div>
      </div>
    </div>
  `;
  await loadTickets();
}

async function loadTickets() {
  const res = await api.safeFetch('/api/admin/support/tickets');
  const list = document.getElementById('tickets-list');
  if (!res.ok || !res.data) { list.innerHTML = `<div style="text-align:center; color:#fb7185; padding:20px;">فشل الجلب</div>`; return; }
  const tickets = res.data;
  if (tickets.length === 0) { list.innerHTML = `<div style="text-align:center; color:#91a7c2; padding:20px;">لا توجد تذاكر</div>`; return; }
  
  list.innerHTML = tickets.map(t => `
    <div onclick="window.openTicket(${t.id}, '${escapeHtml(t.user_name)}')" style="padding:12px; border-radius:8px; cursor:pointer; margin-bottom:4px; border:1px solid ${currentTicketId === t.id ? '#38bdf8' : 'transparent'}; background:${currentTicketId === t.id ? 'rgba(56,189,248,0.1)' : 'transparent'}; transition:0.2s;">
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <strong style="font-size:13px; color:${currentTicketId === t.id ? '#38bdf8' : 'white'};">${escapeHtml(t.user_name)}</strong>
        <span style="font-size:10px; color:${t.status === 'open' ? '#34d399' : '#91a7c2'};">${t.status === 'open' ? 'مفتوحة' : 'مغلقة'}</span>
      </div>
      <div style="font-size:11px; color:#91a7c2;">تذكرة #${t.id}</div>
    </div>
  `).join('');
}

window.openTicket = async function(id, userName) {
  currentTicketId = id;
  await loadTickets();
  
  document.getElementById('chat-header').style.display = 'flex';
  document.getElementById('chat-input-area').style.display = 'block';
  document.getElementById('chat-user-name').textContent = userName;
  
  const messagesArea = document.getElementById('chat-messages');
  messagesArea.innerHTML = `<div style="text-align:center; color:#91a7c2; margin-top:20px;">جاري تحميل الرسائل...</div>`;
  const res = await api.safeFetch(`/api/admin/support/tickets/${id}/messages`);
  
  if (!res.ok || !res.data || res.data.length === 0) {
    messagesArea.innerHTML = `<div style="text-align:center; color:#91a7c2; margin-top:20px;">لا توجد رسائل.</div>`;
    return;
  }

  messagesArea.innerHTML = res.data.map(m => {
    const isAdmin = m.sender_type === 'admin';
    return `
      <div class="chat-bubble ${isAdmin ? 'admin' : 'user'}">
        <p style="margin:0;">${escapeHtml(m.text)}</p>
        <span class="chat-time">${formatDate(m.created_at)}</span>
      </div>
    `;
  }).join('');
  messagesArea.scrollTop = messagesArea.scrollHeight;
  
  document.getElementById('reply-form').onsubmit = async (e) => {
    e.preventDefault();
    const input = document.getElementById('reply-text');
    if (!input.value.trim()) return;
    input.disabled = true;
    const response = await api.safeFetch(`/api/admin/support/tickets/${id}/reply`, { method: 'POST', body: { text: input.value.trim() } });
    input.disabled = false;
    if (response.ok) { input.value = ''; window.openTicket(id, userName); } else { alert('فشل الإرسال'); }
  };
};

window.closeTicket = async function() {
  if (!currentTicketId || !confirm('إغلاق التذكرة؟')) return;
  const res = await api.safeFetch(`/api/admin/support/tickets/${currentTicketId}/close`, { method: 'POST' });
  if (res.ok) {
    currentTicketId = null;
    document.getElementById('chat-header').style.display = 'none';
    document.getElementById('chat-input-area').style.display = 'none';
    document.getElementById('chat-messages').innerHTML = `<div style="text-align:center; color:#91a7c2; margin-top:50px;">اختر تذكرة</div>`;
    loadTickets();
  }
};
