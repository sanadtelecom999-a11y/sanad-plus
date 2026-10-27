import { api } from '../core/api.js';
import { escapeHtml, formatDate } from '../core/utils.js';

let currentTicketId = null;

export async function renderSupport() {
  const container = document.getElementById('dashboard-container');
  
  container.innerHTML = `
    <div class="flex flex-col md:flex-row gap-4 h-[calc(100vh-180px)]">
      <!-- قائمة التذاكر -->
      <div class="w-full md:w-1/3 glass rounded-2xl border border-white/10 flex flex-col overflow-hidden">
        <div class="p-4 border-b border-white/10 bg-white/5">
          <h3 class="font-bold text-lg">التذاكر النشطة</h3>
        </div>
        <div id="tickets-list" class="flex-1 overflow-y-auto p-2 space-y-2">
          <div class="text-center text-slate-400 p-4">جاري التحميل...</div>
        </div>
      </div>

      <!-- صندوق المحادثة -->
      <div class="w-full md:w-2/3 glass rounded-2xl border border-white/10 flex flex-col overflow-hidden relative">
        <div id="chat-header" class="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center hidden">
          <h3 class="font-bold text-lg" id="chat-user-name">اسم المستخدم</h3>
          <button onclick="window.closeTicket()" class="text-danger hover:text-red-400 text-sm font-bold">إغلاق التذكرة</button>
        </div>
        
        <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
          <div class="text-center text-slate-400 mt-10">اختر تذكرة من القائمة لعرض المحادثة</div>
        </div>

        <div id="chat-input-area" class="p-4 border-t border-white/10 bg-white/5 hidden">
          <form id="reply-form" class="flex gap-2">
            <input type="text" id="reply-text" placeholder="اكتب ردك هنا..." required class="flex-1 bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
            <button type="submit" class="bg-primary text-slate-900 px-6 py-2 rounded-lg font-bold hover:bg-sky-400 transition">إرسال</button>
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
  
  if (!res.ok) {
    list.innerHTML = `<div class="text-red-400 text-center p-4">فشل الجلب</div>`;
    return;
  }

  const tickets = res.data || [];
  if (tickets.length === 0) {
    list.innerHTML = `<div class="text-slate-400 text-center p-4">لا توجد تذاكر حالياً.</div>`;
    return;
  }

  list.innerHTML = tickets.map(t => `
    <div onclick="window.openTicket(${t.id}, '${escapeHtml(t.user_name)}')" 
         class="p-3 rounded-lg cursor-pointer transition border ${currentTicketId === t.id ? 'bg-primary/20 border-primary/50' : 'bg-slate-800/50 border-transparent hover:bg-slate-700/50'}">
      <div class="flex justify-between items-center mb-1">
        <h4 class="font-bold text-white">${escapeHtml(t.user_name)}</h4>
        <span class="text-xs ${t.status === 'open' ? 'text-success' : 'text-slate-400'}">${t.status === 'open' ? 'مفتوحة' : 'مغلقة'}</span>
      </div>
      <p class="text-xs text-slate-400">تذكرة #${t.id}</p>
    </div>
  `).join('');
}

window.openTicket = async function(id, userName) {
  currentTicketId = id;
  await loadTickets(); // لتحديث التحديد
  
  document.getElementById('chat-header').classList.remove('hidden');
  document.getElementById('chat-input-area').classList.remove('hidden');
  document.getElementById('chat-user-name').textContent = userName;
  
  const messagesArea = document.getElementById('chat-messages');
  messagesArea.innerHTML = `<div class="text-center text-slate-400 mt-10">جاري تحميل الرسائل...</div>`;

  const res = await api.safeFetch(`/api/admin/support/tickets/${id}/messages`);
  
  if (!res.ok || !res.data || res.data.length === 0) {
    messagesArea.innerHTML = `<div class="text-center text-slate-400 mt-10">لا توجد رسائل في هذه التذكرة.</div>`;
    return;
  }

  messagesArea.innerHTML = res.data.map(m => {
    const isAdmin = m.sender_type === 'admin';
    return `
      <div class="max-w-[80%] rounded-xl p-3 ${isAdmin ? 'bg-primary text-slate-900 self-end rounded-tr-none' : 'bg-slate-700 text-white self-start rounded-tl-none'}">
        <p class="text-sm">${escapeHtml(m.text)}</p>
        <span class="text-[10px] opacity-70 block mt-1">${formatDate(m.created_at)}</span>
      </div>
    `;
  }).join('');

  messagesArea.scrollTop = messagesArea.scrollHeight;
  
  // ربط نموذج الإرسال
  document.getElementById('reply-form').onsubmit = async (e) => {
    e.preventDefault();
    const input = document.getElementById('reply-text');
    const text = input.value.trim();
    if (!text) return;

    input.disabled = true;
    const response = await api.safeFetch(`/api/admin/support/tickets/${id}/reply`, {
      method: 'POST', body: { text }
    });
    input.disabled = false;

    if (response.ok) {
      input.value = '';
      window.openTicket(id, userName); // إعادة تحميل المحادثة
    } else {
      alert('فشل إرسال الرد');
    }
  };
};

window.closeTicket = async function() {
  if (!currentTicketId) return;
  if (!confirm('هل تريد إغلاق هذه التذكرة؟')) return;

  const res = await api.safeFetch(`/api/admin/support/tickets/${currentTicketId}/close`, { method: 'POST' });
  if (res.ok) {
    currentTicketId = null;
    document.getElementById('chat-header').classList.add('hidden');
    document.getElementById('chat-input-area').classList.add('hidden');
    document.getElementById('chat-messages').innerHTML = `<div class="text-center text-slate-400 mt-10">اختر تذكرة من القائمة لعرض المحادثة</div>`;
    loadTickets();
  }
};
