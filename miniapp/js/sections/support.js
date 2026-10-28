import { safeFetch } from '../core/api.js';

let chatInterval;

export async function openSupport() {
  const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  document.getElementById('support-modal').classList.add('active');
  
  await loadMessages(tgId);
  
  // تحديث تلقائي للرسائل كل 5 ثواني
  clearInterval(chatInterval);
  chatInterval = setInterval(() => loadMessages(tgId), 5000);

  document.getElementById('chat-form').onsubmit = async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;

    input.value = '';
    // إضافة الرسالة فوراً للواجهة (Optimistic UI)
    appendMessage('user', msg);

    await safeFetch('/api/support/send', {
      method: 'POST',
      body: JSON.stringify({ telegram_id: tgId, message: msg })
    });
  };
}

async function loadMessages(tgId) {
  const msgs = await safeFetch(`/api/support/messages?telegram_id=${tgId}`);
  const container = document.getElementById('chat-messages');
  
  if (!msgs || msgs.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:12px; margin-top:20px;">مرحباً! كيف يمكننا مساعدتك؟</div>`;
    return;
  }

  container.innerHTML = msgs.map(m => `
    <div class="chat-bubble ${m.sender}">
      ${m.message}
    </div>
  `).join('');
  
  container.scrollTop = container.scrollHeight;
}

function appendMessage(sender, text) {
  const container = document.getElementById('chat-messages');
  container.innerHTML += `<div class="chat-bubble ${sender}">${text}</div>`;
  container.scrollTop = container.scrollHeight;
}
