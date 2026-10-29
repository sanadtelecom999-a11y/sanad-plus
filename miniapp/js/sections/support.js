import { safeFetch } from '../core/api.js';

let chatInterval = null;

export async function openSupport() {
  const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  const modal = document.getElementById('support-modal');
  if (!modal) return console.error('Support modal not found');
  
  modal.classList.add('active');
  const messagesArea = document.getElementById('chat-messages');
  if (messagesArea) messagesArea.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:20px;">جاري التحميل...</div>';
  
  await loadMessages(tgId);
  
  if (chatInterval) clearInterval(chatInterval);
  chatInterval = setInterval(() => {
    if (document.getElementById('support-modal').classList.contains('active')) {
      loadMessages(tgId);
    }
  }, 5000);

  document.getElementById('chat-form').onsubmit = async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;

    input.value = '';
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
  if (!container) return;
  
  if (!msgs || msgs.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:12px; margin-top:20px;">مرحباً! كيف يمكننا مساعدتك؟</div>`;
    return;
  }

  container.innerHTML = '';
  msgs.forEach(m => appendMessage(m.sender, m.message));
  container.scrollTop = container.scrollHeight;
}

function appendMessage(sender, text) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `chat-bubble ${sender}`;
  div.textContent = text; 
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}
