import { api } from '../core/api.js';
import { formatDate } from '../core/utils.js';

let chatInterval = null;

export async function openSupport() {
  const screen = document.getElementById('support-screen');
  if (!screen) return;
  screen.classList.add('active');
  
  await loadMessages();
  
  if (chatInterval) clearInterval(chatInterval);
  chatInterval = setInterval(() => {
    if (screen.classList.contains('active')) loadMessages();
  }, 5000);

  document.getElementById('chat-form').onsubmit = async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;

    input.value = '';
    appendMessage('user', msg);

    try {
      await api.post('/api/support/send', { message: msg });
    } catch (err) {
      console.error('Failed to send', err);
      alert('فشل إرسال الرسالة');
    }
  };
}

export function closeSupport() {
  const screen = document.getElementById('support-screen');
  if (screen) screen.classList.remove('active');
  if (chatInterval) {
    clearInterval(chatInterval);
    chatInterval = null;
  }
}

async function loadMessages() {
  const container = document.getElementById('chat-messages');
  try {
    const msgs = await api.get('/api/support/messages');
    if (!msgs || msgs.length === 0) {
      container.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:12px; margin-top:20px;">مرحباً! كيف يمكننا مساعدتك؟</div>';
      return;
    }

    container.innerHTML = '';
    msgs.forEach(m => appendMessage(m.sender, m.message));
    container.scrollTop = container.scrollHeight;
  } catch (e) {
    console.error(e);
  }
}

function appendMessage(sender, text) {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `chat-bubble ${sender}`;
  div.textContent = text; // آمن ضد XSS
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}
