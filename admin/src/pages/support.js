import { apiFetch } from '../api.js';
let activeTicketId = null;

export async function renderSupport(container) {
  container.innerHTML = `
    <div class="chat-container">
      <div class="tickets-list" id="tickets-list"><div class="skeleton sk-line"></div></div>
      <div class="chat-box" id="chat-box" style="display:none;">
        <div style="padding:15px;border-bottom:1px solid var(--border-soft);background:var(--bg-surface);font-weight:bold;display:flex;justify-content:space-between;align-items:center;" id="chat-header">
          <span>محادثة</span><button class="btn btn-danger btn-sm" onclick="window.closeTicket()">إغلاق</button>
        </div>
        <div class="chat-messages" id="chat-messages"></div>
        <div class="chat-input">
          <input type="text" id="chat-input" class="input" placeholder="اكتب ردك هنا..." style="margin:0;">
          <button class="btn btn-primary" onclick="window.sendReply()"><i data-lucide="send" size="18"></i></button>
        </div>
      </div>
      <div class="chat-box" id="chat-empty" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted);"><p>اختر تذكرة لبدء المحادثة</p></div>
    </div>`;
  window.loadTickets();
}

window.loadTickets = async () => {
  const list = document.getElementById('tickets-list'); 
  if(!list) return;
  list.innerHTML = '<div class="skeleton sk-line"></div>';
  try {
    const data = await apiFetch('/api/admin/support/tickets'); const tickets = Array.isArray(data) ? data : [];
    list.innerHTML = tickets.length ? '' : '<p style="text-align:center;">لا توجد تذاكر</p>';
    tickets.forEach(t => {
      list.innerHTML += `<div class="ticket-item ${activeTicketId===t.id?'active':''}" onclick="window.openTicket(${t.id}, '${t.user_name}')"><div style="display:flex;justify-content:space-between;margin-bottom:5px;"><strong>#${t.id}</strong><span style="font-size:10px;color:var(--success);">مفتوح</span></div><div style="font-size:12px;color:var(--text-muted);">${t.last_message||'لا توجد رسائل'}</div></div>`;
    });
  } catch(e){}
};

window.openTicket = async (id, name) => {
  activeTicketId = id;
  document.getElementById('chat-header').innerHTML = `<span>#${id} - ${name}</span><button class="btn btn-danger btn-sm" onclick="window.closeTicket()">إغلاق</button>`;
  document.getElementById('chat-empty').style.display = 'none'; 
  document.getElementById('chat-box').style.display = 'flex';
  window.loadTickets();
  
  const msgContainer = document.getElementById('chat-messages'); msgContainer.innerHTML = '<div class="skeleton sk-line"></div>';
  try {
    const data = await apiFetch(`/api/admin/support/tickets/${id}/messages`); const msgs = Array.isArray(data) ? data : [];
    msgContainer.innerHTML = '';
    msgs.forEach(m => { msgContainer.innerHTML += `<div class="msg ${m.is_admin?'admin':'user'}">${m.text||m.message}</div>`; });
    msgContainer.scrollTop = msgContainer.scrollHeight;
  } catch(e){}
};

window.sendReply = async () => {
  const text = document.getElementById('chat-input').value.trim(); 
  if (!text || !activeTicketId) return;
  try { 
    await apiFetch(`/api/admin/support/tickets/${activeTicketId}/reply`, { method: 'POST', body: JSON.stringify({ text }) }); 
    document.getElementById('chat-input').value = ''; 
    window.openTicket(activeTicketId, 'مستخدم'); 
  } catch(e){}
};

window.closeTicket = async () => { 
  if(!activeTicketId) return; 
  await apiFetch(`/api/admin/support/tickets/${activeTicketId}/close`, {method:'POST'}); 
  document.getElementById('chat-box').style.display='none'; 
  document.getElementById('chat-empty').style.display='flex'; 
  activeTicketId=null; 
  window.loadTickets(); 
};
