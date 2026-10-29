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

    container.innerHTML = `
      <div class="acc-profile" style="text-align:center; margin-top:20px;">
        <div class="acc-avatar" style="width:80px; height:80px; border-radius:50%; margin:0 auto 12px; overflow:hidden;">${avatarHtml}</div>
        <div class="acc-name-row" style="font-size:18px; font-weight:800;">${tgUser?.first_name || 'مستخدم'} ${userData.is_verified ? '✅' : ''}</div>
        <div class="acc-username" style="color:var(--text-muted); font-size:12px; margin-bottom:20px;">@${tgUser?.username || 'user'}</div>
      </div>

      <div class="acc-stats-row" style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
        <div class="acc-stat-box" style="background:var(--bg-card); padding:16px; border-radius:12px; text-align:center;">
          <span style="display:block; font-size:12px; color:var(--text-muted); margin-bottom:8px;">الرصيد</span>
          <strong style="font-size:20px;">$${userData.balance.toFixed(2)}</strong>
        </div>
        <div class="acc-stat-box" style="background:var(--bg-card); padding:16px; border-radius:12px; text-align:center;">
          <span style="display:block; font-size:12px; color:var(--text-muted); margin-bottom:8px;">الإيداعات</span>
          <strong style="font-size:20px;">$${userData.total_deposits.toFixed(2)}</strong>
        </div>
      </div>

      <div class="quick-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div class="quick-item" data-action="kyc" style="background:var(--bg-card); padding:16px; border-radius:12px; text-align:center; cursor:pointer;">
          <span style="font-size:14px; font-weight:700;">توثيق الحساب</span>
        </div>
        <div class="quick-item" data-action="support" style="background:var(--bg-card); padding:16px; border-radius:12px; text-align:center; cursor:pointer;">
          <span style="font-size:14px; font-weight:700;">الدعم الفني</span>
        </div>
        <div class="quick-item" data-action="ledger" style="background:var(--bg-card); padding:16px; border-radius:12px; text-align:center; cursor:pointer;">
          <span style="font-size:14px; font-weight:700;">السجل المالي</span>
        </div>
        <div class="quick-item" style="background:var(--bg-card); padding:16px; border-radius:12px; text-align:center; opacity:0.5;">
          <span style="font-size:14px; font-weight:700;">المفضلة</span>
        </div>
      </div>
    `;
  } catch(e) {
    container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger);">فشل جلب البيانات (تأكد من فتح التطبيق من تيليجرام)</div>`;
  }
}
