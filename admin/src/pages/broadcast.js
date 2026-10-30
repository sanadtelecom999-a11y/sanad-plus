import { apiFetch } from '../api.js';

export function renderBroadcast(container) {
  container.innerHTML = `
    <div class="card-glass" style="max-width:800px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
        <div style="width:40px;height:40px;background:var(--primary-500);border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;"><i data-lucide="send"></i></div>
        <div><h3 style="font-size:18px;">إرسال رسالة جماعية</h3><p style="font-size:12px;color:var(--text-muted);">سيتم إرسال هذه الرسالة لجميع مستخدمي البوت.</p></div>
      </div>
      <label class="nav-label">نص الرسالة</label>
      <textarea id="broadcast-message" class="input" placeholder="اكتب إعلانك هنا..."></textarea>
      <div style="display:flex;gap:10px;margin-top:15px;">
        <button class="btn btn-primary" onclick="window.sendBroadcast()"><i data-lucide="send"></i> إرسال للجميع</button>
        <button class="btn btn-secondary" onclick="document.getElementById('broadcast-message').value=''">مسح</button>
      </div>
    </div>`;
  lucide.createIcons();
}

window.sendBroadcast = async () => {
  const msg = document.getElementById('broadcast-message').value.trim();
  if (!msg) return window.showToast('يجب كتابة نص الرسالة', 'error');
  if (!confirm('هل أنت متأكد من إرسال هذه الرسالة لجميع المستخدمين؟')) return;
  
  const btn = event.target.closest('button');
  const originalText = btn.innerHTML;
  btn.innerHTML = 'جاري الإرسال...'; btn.disabled = true;
  
  try {
    await apiFetch('/api/admin/broadcast', { method: 'POST', body: JSON.stringify({ message: msg }) });
    window.showToast('تم بدء إرسال الحملة بنجاح!');
    document.getElementById('broadcast-message').value = '';
  } catch(e) {} finally {
    btn.innerHTML = originalText; btn.disabled = false;
  }
};
