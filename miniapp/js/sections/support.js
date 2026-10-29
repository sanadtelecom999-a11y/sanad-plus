import { safeFetch } from '../core/api.js';

let chatInterval = null;

export async function openSupport() {
  const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  const screen = document.getElementById('support-screen');
  if (!screen) return;
  
  screen.classList.add('active');
  await loadMessages(tgId);
  
  if (chatInterval) clearInterval(chatInterval);
  chatInterval = setInterval(() => {
    if (screen.classList.contains('active')) loadMessages(tgId);
  }, 5000);

  // إصلاح: استخدام addEventListener بدلاً من onsubmit
  const form = document.getElementById('chat-form');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault(); // منع إعادة التحميل
      const input = document.getElementById('chat-input');
      const msg = input.value.trim();
      if (!msg) return;

      input.value = '';
      appendMessage('user', msg);

      try {
        await safeFetch('/api/support/send', {
          method: 'POST',
          body: JSON.stringify({ telegram_id: tgId, message: msg })
        });
      } catch (error) {
        console.error('Failed to send message:', error);
        alert('فشل إرسال الرسالة. يرجى المحاولة مرة أخرى.');
      }
    };
  }
}

window.closeSupport = function() {
  const screen = document.getElementById('support-screen');
  if (screen) screen.classList.remove('active');
  if (chatInterval) {
    clearInterval(chatInterval);
    chatInterval = null;
  }
};

async function loadMessages(tgId) {
  try {
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
  } catch (e) {
    console.error("Error loading messages:", e);
  }
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
