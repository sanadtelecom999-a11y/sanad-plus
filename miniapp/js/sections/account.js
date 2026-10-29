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
    ? `<svg style="width:18px; height:18px; color:var(--sp-primary);" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`
    : '';

  container.innerHTML = `
    <header class="sp-account-hero">
      <div class="sp-profile-avatar">${avatarHtml}</div>
      <div class="sp-profile-name">${escapeHtml(tgUser?.first_name || 'مستخدم')} ${verifiedBadge}</div>
      <div class="sp-profile-username">@${escapeHtml(tgUser?.username || 'user')}</div>
      <div class="sp-profile-id">Telegram ID: ${state.user?.telegram_id || '---'}</div>
    </header>

    <section class="sp-sanad-id">
      <div>
        <div class="sp-sanad-id-label">معرّف SANAD ID</div>
        <div class="sp-sanad-id-value">${state.user?.sanad_id || 'SN-000'}</div>
      </div>
      <button class="sp-copy-btn" onclick="navigator.clipboard.writeText('${state.user?.sanad_id || 'SN-000'}'); alert('تم النسخ!');">
        <svg style="width:20px; height:20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
      </button>
    </section>

    <section class="sp-stats">
      <article class="sp-stat-card">
        <div class="sp-stat-label">الرصيد الحالي</div>
        <div class="sp-stat-value">${formatCurrency(state.balance)}</div>
      </article>
      <article class="sp-stat-card">
        <div class="sp-stat-label">إجمالي الإيداعات</div>
        <div class="sp-stat-value">${formatCurrency(state.user?.total_deposits || 0)}</div>
      </article>
    </section>

    <section class="sp-service-list">
      <a class="sp-service-row" data-action="kyc">
        <svg class="sp-service-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <div><span class="sp-service-title">توثيق الحساب</span><span class="sp-service-description">حالة التوثيق وإجراءاته</span></div>
        <span style="color:var(--sp-text-muted); font-size:20px;">‹</span>
      </a>
      <a class="sp-service-row" data-action="ledger">
        <svg class="sp-service-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        <div><span class="sp-service-title">السجل المالي</span><span class="sp-service-description">جميع عملياتك المالية</span></div>
        <span style="color:var(--sp-text-muted); font-size:20px;">‹</span>
      </a>
      <a class="sp-service-row" data-action="support">
        <svg class="sp-service-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
        <div><span class="sp-service-title">الدعم الفني</span><span class="sp-service-description">المساعدة والاستفسارات</span></div>
        <span style="color:var(--sp-text-muted); font-size:20px;">‹</span>
      </a>
      <a class="sp-service-row" data-action="favorites">
        <svg class="sp-service-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
        <div><span class="sp-service-title">المفضلة</span><span class="sp-service-description">خدماتك المحفوظة</span></div>
        <span style="color:var(--sp-text-muted); font-size:20px;">‹</span>
      </a>
    </section>

    <h2 class="sp-extra-title">الخدمات الإضافية</h2>
    <section class="sp-extra-services">
      <a class="sp-service-row" data-action="referral">
        <div class="sp-icon-tile"><svg style="width:24px; height:24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg></div>
        <div><span class="sp-service-title">الإحالة</span><span class="sp-service-description">مشاركة رابط الدعوة</span></div>
        <span style="color:var(--sp-text-muted); font-size:20px;">‹</span>
      </a>
      <a class="sp-service-row" data-action="notifications">
        <div class="sp-icon-tile"><svg style="width:24px; height:24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg></div>
        <div><span class="sp-service-title">الإشعارات</span><span class="sp-service-description">حالات الطلبات والإيداعات وتحديثاتها</span></div>
        <span style="color:var(--sp-text-muted); font-size:20px;">‹</span>
      </a>
      <a class="sp-service-row" data-action="security">
        <div class="sp-icon-tile"><svg style="width:24px; height:24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg></div>
        <div><span class="sp-service-title">الأمان والخصوصية</span><span class="sp-service-description">عرض حالة حماية الحساب ومعلوماته</span></div>
        <span style="color:var(--sp-text-muted); font-size:20px;">‹</span>
      </a>
      <a class="sp-service-row" data-action="help">
        <div class="sp-icon-tile"><svg style="width:24px; height:24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
        <div><span class="sp-service-title">مركز المساعدة</span><span class="sp-service-description">الأسئلة الشائعة وطريقة الشحن والشراء</span></div>
        <span style="color:var(--sp-text-muted); font-size:20px;">‹</span>
      </a>
      <a class="sp-service-row" data-action="settings">
        <div class="sp-icon-tile"><svg style="width:24px; height:24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></div>
        <div><span class="sp-service-title">إعدادات الحساب</span><span class="sp-service-description">تفضيلات الواجهة واللغة إن كانت مدعومة</span></div>
        <span style="color:var(--sp-text-muted); font-size:20px;">‹</span>
      </a>
    </section>
  `;
}
