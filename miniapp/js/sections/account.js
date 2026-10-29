import { escapeHtml } from '../core/utils.js';
import { fetchUserData } from '../core/api.js';

export async function loadAccount() {
  const container = document.getElementById('account-profile');
  if (!container) return;
  
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  container.innerHTML = `<div style="text-align:center; padding:20px;">جاري التحميل...</div>`;
  
  try {
    const userData = await fetchUserData();
    if (!userData) throw new Error("No data");

    const avatarHtml = tgUser?.photo_url 
      ? `<img src="${tgUser.photo_url}" style="width:100%; height:100%; object-fit:cover;" />`
      : `<div style="width:100%; height:100%; background:linear-gradient(135deg,#0095E8,#7FE0FF); display:flex; align-items:center; justify-content:center; font-size:36px; font-weight:900; color:#000;">${tgUser?.first_name?.charAt(0) || 'U'}</div>`;

    const verifiedBadge = userData.is_verified 
      ? `<svg style="width:18px; height:18px; color:var(--primary);" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`
      : '';

    container.innerHTML = `
      <div style="text-align:center; margin-top:20px; margin-bottom:24px;">
        <div style="width:80px; height:80px; border-radius:50%; margin:0 auto 12px; overflow:hidden; border:2px solid var(--primary);">${avatarHtml}</div>
        <div style="font-size:20px; font-weight:800; display:flex; align-items:center; justify-content:center; gap:6px;">
          ${escapeHtml(tgUser?.first_name || 'مستخدم')} ${verifiedBadge}
        </div>
        <div style="color:var(--text-muted); font-size:13px; margin-top:4px;">@${tgUser?.username || 'user'}</div>
      </div>

      <div style="background:var(--bg-card); border:1px solid rgba(255,255,255,0.05); border-radius:16px; padding:16px; display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div style="display:flex; gap:10px;">
          <div style="width:40px; height:40px; border-radius:10px; background:rgba(56,189,248,0.1); display:flex; align-items:center; justify-content:center; color:var(--primary);">
            <svg style="width:20px; height:20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          </div>
          <div style="width:40px; height:40px; border-radius:10px; background:rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:center; color:var(--text-muted); cursor:pointer;" id="copy-id-btn">
            <svg style="width:20px; height:20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
          </div>
        </div>
        <div style="text-align:left;">
          <div style="font-size:11px; color:var(--text-muted);">معرّف سند (Sanad ID)</div>
          <div style="font-size:24px; font-weight:800; letter-spacing:1px;" id="sanad-id">${userData.sanad_id}</div>
          <div style="font-size:10px; color:var(--text-muted);">Telegram: ${userData.telegram_id}</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:24px;">
        <div style="background:var(--bg-card); padding:16px; border-radius:16px; text-align:center; border:1px solid rgba(255,255,255,0.05);">
          <span style="display:block; font-size:12px; color:var(--text-muted); margin-bottom:8px;">الرصيد</span>
          <strong style="font-size:20px;">$${userData.balance.toFixed(2)}</strong>
        </div>
        <div style="background:var(--bg-card); padding:16px; border-radius:16px; text-align:center; border:1px solid rgba(255,255,255,0.05);">
          <span style="display:block; font-size:12px; color:var(--text-muted); margin-bottom:8px;">إجمالي الإيداعات</span>
          <strong style="font-size:20px;">$${userData.total_deposits.toFixed(2)}</strong>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div class="quick-item" data-action="kyc" style="background:var(--bg-card); padding:16px; border-radius:16px; display:flex; flex-direction:column; align-items:center; gap:8px; cursor:pointer; border:1px solid rgba(255,255,255,0.05);">
          <svg style="width:24px; height:24px; color:var(--primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span style="font-size:13px; font-weight:700;">توثيق الحساب</span>
        </div>
        <div class="quick-item" data-action="support" style="background:var(--bg-card); padding:16px; border-radius:16px; display:flex; flex-direction:column; align-items:center; gap:8px; cursor:pointer; border:1px solid rgba(255,255,255,0.05);">
          <svg style="width:24px; height:24px; color:var(--primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
          <span style="font-size:13px; font-weight:700;">الدعم الفني</span>
        </div>
        <div class="quick-item" data-action="ledger" style="background:var(--bg-card); padding:16px; border-radius:16px; display:flex; flex-direction:column; align-items:center; gap:8px; cursor:pointer; border:1px solid rgba(255,255,255,0.05);">
          <svg style="width:24px; height:24px; color:var(--primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          <span style="font-size:13px; font-weight:700;">السجل المالي</span>
        </div>
        <div class="quick-item" style="background:var(--bg-card); padding:16px; border-radius:16px; display:flex; flex-direction:column; align-items:center; gap:8px; opacity:0.5; border:1px solid rgba(255,255,255,0.05);">
          <svg style="width:24px; height:24px; color:var(--text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
          <span style="font-size:13px; font-weight:700;">المفضلة</span>
        </div>
      </div>
    `;

    document.getElementById('copy-id-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(userData.sanad_id).then(() => alert('تم نسخ المعرّف!'));
    });

  } catch(e) {
    container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger);">فشل جلب البيانات (تأكد من فتح التطبيق من تيليجرام)</div>`;
  }
}
