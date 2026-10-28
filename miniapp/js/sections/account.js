import { fetchUserData } from '../core/api.js';

export async function loadAccount() {
  const container = document.getElementById('account-profile');
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  
  container.innerHTML = `<div class="card">جاري التحميل...</div>`;
  
  const userData = await fetchUserData();
  
  container.innerHTML = `
    <div class="card" style="display:flex; align-items:center; gap:16px; margin-bottom:20px;">
      <div style="width:60px; height:60px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:bold;">
        ${tgUser?.first_name?.charAt(0) || 'U'}
      </div>
      <div>
        <h3 style="margin:0 0 4px 0;">${tgUser?.first_name || 'مستخدم'} ${tgUser?.last_name || ''}</h3>
        <span style="color:var(--text-muted); font-size:12px;">ID: ${tgUser?.id || 'غير متاح'}</span>
      </div>
    </div>
    
    <div class="card" style="margin-bottom:20px;">
      <h4 style="margin:0 0 12px 0; color:var(--text-muted); font-size:13px;">معلومات الحساب</h4>
      <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
        <span>الرصيد الحالي</span>
        <strong style="color:var(--success);">${userData ? userData.balance.toFixed(2) : '0.00'} $</strong>
      </div>
      <div style="display:flex; justify-content:space-between; padding:12px 0;">
        <span>حالة التوثيق</span>
        <strong style="color:var(--warning);">غير موثق</strong>
      </div>
    </div>
    
    <button class="sanad-btn" style="width:100%; background:var(--bg-card); color:var(--text-main); padding:14px; border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.1); font-family:inherit;">توثيق الحساب (KYC) - قريباً</button>
  `;
}
