import { fetchUserData } from '../core/api.js';

export async function loadAccount() {
  const container = document.getElementById('account-profile');
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  
  container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">جاري التحميل...</div>`;
  
  const userData = await fetchUserData();
  
  if (!userData) {
    container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger);">حدث خطأ في جلب البيانات</div>`;
    return;
  }

  // صورة تيليجرام أو الحرف الأول
  const avatarHtml = tgUser?.photo_url 
    ? `<img src="${tgUser.photo_url}" alt="Avatar" />`
    : `<div style="width:100%; height:100%; background:linear-gradient(135deg,#0095E8,#7FE0FF); display:flex; align-items:center; justify-content:center; font-size:36px; font-weight:900; color:#000;">${tgUser?.first_name?.charAt(0) || 'U'}</div>`;

  // علامة التوثيق
  const verifiedBadge = userData.is_verified 
    ? `<svg style="width:18px; height:18px; color:var(--primary);" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`
    : '';

  // يوزر تيليجرام
  const usernameText = tgUser?.username ? `@${tgUser.username}` : 'مستخدم سند';

  container.innerHTML = `
    <!-- Top Header inside page -->
    <div class="acc-header">
      <div class="bell-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
      </div>
      <div class="logo-text">SANAD<span style="color:var(--primary)">+</span></div>
    </div>

    <!-- Profile Info -->
    <div class="acc-profile">
      <div class="acc-avatar">${avatarHtml}</div>
      <div class="acc-name-row">
        ${tgUser?.first_name || 'مستخدم'} ${verifiedBadge}
      </div>
      <div class="acc-username">${usernameText}</div>
    </div>

    <!-- ID Card -->
    <div class="acc-id-card">
      <div class="acc-id-left">
        <div class="acc-id-icon-btn" title="موثق">
           <svg style="width:22px; height:22px; color:var(--primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
        </div>
        <div class="acc-id-icon-btn" onclick="navigator.clipboard.writeText('${userData.sanad_id}'); alert('تم نسخ المعرف!');" title="نسخ">
          <svg style="width:20px; height:20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
        </div>
      </div>
      <div class="acc-id-right">
        <div class="acc-id-label">معرّف سند (Sanad ID)</div>
        <div class="acc-id-value">${userData.sanad_id}</div>
        <div class="acc-id-sub">Telegram: ${userData.telegram_id}</div>
      </div>
    </div>

    <!-- Stats -->
    <div class="acc-stats-row">
      <div class="acc-stat-box">
        <span>الرصيد</span>
        <strong>$${userData.balance.toFixed(2)}</strong>
      </div>
      <div class="acc-stat-box">
        <span>إجمالي الإيداعات</span>
        <strong>$${userData.total_deposits.toFixed(2)}</strong>
      </div>
    </div>

    <!-- Menu -->
    <div class="acc-menu-list">
      <div class="acc-menu-row" onclick="alert('يرجى مراجعة الإدارة للتوثيق')">
        <div class="acc-menu-title">توثيق الحساب (KYC) <svg style="width:18px; height:18px; color:var(--primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
      </div>
      <div class="acc-menu-row" onclick="alert('قريباً')">
        <div class="acc-menu-title">المفضلة <svg style="width:18px; height:18px; color:var(--danger);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg></div>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
      </div>
    </div>
  `;
}
