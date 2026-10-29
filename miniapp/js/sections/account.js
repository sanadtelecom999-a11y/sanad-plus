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

  const avatarHtml = tgUser?.photo_url 
    ? `<img src="${tgUser.photo_url}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
       <div style="display:none; width:100%; height:100%; background:linear-gradient(135deg,#0095E8,#7FE0FF); align-items:center; justify-content:center; font-size:36px; font-weight:900; color:#000;">${tgUser?.first_name?.charAt(0) || 'U'}</div>`
    : `<div style="width:100%; height:100%; background:linear-gradient(135deg,#0095E8,#7FE0FF); display:flex; align-items:center; justify-content:center; font-size:36px; font-weight:900; color:#000;">${tgUser?.first_name?.charAt(0) || 'U'}</div>`;

  const isVerified = userData.is_verified || false;
  const verifiedBadge = isVerified 
    ? `<svg class="verified-badge" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`
    : '';

  const usernameText = tgUser?.username ? `@${tgUser.username}` : 'مستخدم سند';

  container.innerHTML = `
    <div style="display:flex; justify-content:center; padding:10px 0 20px 0;">
      <div style="font-size:20px; font-weight:800; color:white;">SANAD<span style="color:var(--primary)">+</span></div>
    </div>

    <div class="acc-profile">
      <div class="acc-avatar">${avatarHtml}</div>
      <div class="acc-name-row">${tgUser?.first_name || 'مستخدم'} ${verifiedBadge}</div>
      <div class="acc-username">${usernameText}</div>
    </div>

    <div class="acc-id-card">
      <div class="acc-id-left">
        <div class="acc-id-icon-btn"><svg style="width:22px; height:22px; color:var(--primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg></div>
        <div class="acc-id-icon-btn" id="copy-id-btn"><svg style="width:20px; height:20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></div>
      </div>
      <div class="acc-id-right">
        <div class="acc-id-label">معرّف سند (Sanad ID)</div>
        <div class="acc-id-value">${userData.sanad_id}</div>
        <div class="acc-id-sub">Telegram: ${userData.telegram_id}</div>
      </div>
    </div>

    <div class="acc-stats-row">
      <div class="acc-stat-box"><span>الرصيد</span><strong>$${userData.balance.toFixed(2)}</strong></div>
      <div class="acc-stat-box"><span>إجمالي الإيداعات</span><strong>$${userData.total_deposits.toFixed(2)}</strong></div>
    </div>

    <div class="quick-grid">
      <div class="quick-item" onclick="window.openKYC()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>توثيق الحساب</span></div>
      <div class="quick-item" onclick="window.openSupport()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg><span>الدعم الفني</span></div>
      <div class="quick-item" onclick="window.openFAQ()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>الأسئلة الشائعة</span></div>
      <div class="quick-item" onclick="window.openLedger()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><span>السجل المالي</span></div>
    </div>
  `;

  document.getElementById('copy-id-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(userData.sanad_id).then(() => alert('تم النسخ!'));
  });
}

window.openFAQ = async function() {
  const modal = document.getElementById('app-modal');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  
  modal.classList.add('active');
  title.textContent = 'الأسئلة الشائعة';
  body.innerHTML = `<div style="text-align:center; padding:20px;">جاري التحميل...</div>`;

  try {
    const res = await fetch('https://sanad-plus-backend.onrender.com/api/faq');
    const faqs = await res.json();
    body.innerHTML = faqs.map(f => `
      <div class="faq-item" style="border-bottom:1px solid rgba(255,255,255,0.05); padding:12px 0;">
        <div class="faq-q" style="font-weight:bold; margin-bottom:8px; color:var(--primary);">${f.q}</div>
        <div class="faq-a" style="color:var(--text-muted); font-size:13px;">${f.a}</div>
      </div>
    `).join('');
  } catch(e) {
    body.innerHTML = `<div style="text-align:center; color:var(--danger);">فشل تحميل الأسئلة.</div>`;
  }
};
