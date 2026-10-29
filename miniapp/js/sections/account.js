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

    <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <div style="display:flex; gap:10px;">
        <div style="width:40px; height:40px; border-radius:10px; background:rgba(56,189,248,0.1); display:flex; align-items:center; justify-content:center; color:var(--primary);">
          <svg style="width:20px; height:20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
        </div>
      </div>
      <div style="text-align:left;">
        <div style="font-size:11px; color:var(--text-muted);">معرّف سند (Sanad ID)</div>
        <div style="font-size:24px; font-weight:800; letter-spacing:1px;">${state.user?.sanad_id || 'SN-000'}</div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:24px;">
      <div class="card" style="text-align:center; margin-bottom:0;">
        <span style="display:block; font-size:12px; color:var(--text-muted); margin-bottom:8px;">الرصيد</span>
        <strong style="font-size:20px;">${formatCurrency(state.balance)}</strong>
      </div>
      <div class="card" style="text-align:center; margin-bottom:0;">
        <span style="display:block; font-size:12px; color:var(--text-muted); margin-bottom:8px;">إجمالي الإيداعات</span>
        <strong style="font-size:20px;">${formatCurrency(state.user?.total_deposits || 0)}</strong>
      </div>
    </div>

    <div class="grid-2">
      <div class="card" style="text-align:center; padding:16px; cursor:pointer;" data-action="kyc">
        <div style="color:var(--primary); margin-bottom:8px;">🆔</div>
        <span style="font-size:13px; font-weight:700;">توثيق الحساب</span>
      </div>
      <div class="card" style="text-align:center; padding:16px; cursor:pointer;" data-action="support">
        <div style="color:var(--primary); margin-bottom:8px;">🎧</div>
        <span style="font-size:13px; font-weight:700;">الدعم الفني</span>
      </div>
      <div class="card" style="text-align:center; padding:16px; cursor:pointer;" data-action="ledger">
        <div style="color:var(--primary); margin-bottom:8px;">📊</div>
        <span style="font-size:13px; font-weight:700;">السجل المالي</span>
      </div>
      <div class="card" style="text-align:center; padding:16px; opacity:0.5;">
        <div style="color:var(--text-muted); margin-bottom:8px;">❤️</div>
        <span style="font-size:13px; font-weight:700;">المفضلة</span>
      </div>
    </div>
  `;
}
