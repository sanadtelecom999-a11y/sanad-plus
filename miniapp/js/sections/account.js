import { getTelegramUser } from '../core/telegram.js';
import { state } from '../core/state.js';
import { escapeHtml, formatCurrency } from '../core/utils.js';

export function renderAccount() {
  const container = document.getElementById('page-account');
  if (!container) return;

  const tgUser = getTelegramUser();
  const avatarHtml = tgUser?.photo_url 
    ? `<img src="${tgUser.photo_url}" />` 
    : tgUser?.first_name?.charAt(0) || 'U';

  const verifiedBadge = state.user?.is_verified 
    ? `<svg style="width:18px; height:18px; color:var(--primary);" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`
    : '';

  container.innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar">${avatarHtml}</div>
      <div class="profile-name">${escapeHtml(tgUser?.first_name || 'مستخدم')} ${verifiedBadge}</div>
      <div class="profile-username">@${escapeHtml(tgUser?.username || 'user')}</div>
    </div>

    <div class="acc-id-card">
      <div class="acc-id-left">
        <div class="acc-id-icon-btn"><svg style="width:22px; height:22px; color:var(--primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg></div>
        <div class="acc-id-icon-btn" onclick="navigator.clipboard.writeText('${state.user?.sanad_id || 'SN-000'}'); alert('تم النسخ!');"><svg style="width:20px; height:20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></div>
      </div>
      <div class="acc-id-right">
        <div class="acc-id-label">معرّف سند (Sanad ID)</div>
        <div class="acc-id-value">${state.user?.sanad_id || 'SN-000'}</div>
        <div class="acc-id-sub">Telegram: ${state.user?.telegram_id || 'غير متوفر'}</div>
      </div>
    </div>

    <div class="acc-stats-row">
      <div class="acc-stat-box"><span>الرصيد</span><strong>${formatCurrency(state.balance)}</strong></div>
      <div class="acc-stat-box"><span>إجمالي الإيداعات</span><strong>${formatCurrency(state.user?.total_deposits || 0)}</strong></div>
    </div>

    <div class="quick-grid">
      <div class="quick-item" data-action="kyc"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>توثيق الحساب</span></div>
      <div class="quick-item" data-action="support"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg><span>الدعم الفني</span></div>
      <div class="quick-item" data-action="ledger"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><span>السجل المالي</span></div>
      <div class="quick-item" style="opacity:0.5;"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg><span>المفضلة</span></div>
    </div>
  `;
}
