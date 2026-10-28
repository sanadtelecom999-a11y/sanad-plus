import { fetchUserData, safeFetch } from '../core/api.js';

export async function loadAccount() {
  const container = document.getElementById('account-profile');
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  
  container.innerHTML = `<div style="text-align:center; padding:20px;">جاري التحميل...</div>`;
  
  const userData = await fetchUserData();
  
  // جلب الإحصائيات الحقيقية
  let ordersCount = 0, depositsCount = 0;
  try {
    const orders = await safeFetch(`/api/orders/?telegram_id=${tgUser?.id}`);
    const deposits = await safeFetch(`/api/deposits/?telegram_id=${tgUser?.id}`);
    if(orders) ordersCount = orders.length;
    if(deposits) depositsCount = deposits.length;
  } catch(e) {}

  container.innerHTML = `
    <div class="account-page">
      <div class="account-hero">
        <div class="account-hero-top">
          <div class="account-avatar">${tgUser?.first_name?.charAt(0) || 'U'}</div>
          <div class="account-identity">
            <div class="account-name">${tgUser?.first_name || 'مستخدم'} ${tgUser?.last_name || ''}</div>
            <div class="account-id">ID: ${tgUser?.id || 'غير متاح'}</div>
          </div>
        </div>
        
        <div class="account-balance-card">
          <div class="account-balance-label">الرصيد المتاح</div>
          <div class="account-balance-value" style="color: var(--success);">$${userData ? userData.balance.toFixed(2) : '0.00'}</div>
        </div>

        <div class="account-quick-actions">
          <button class="account-quick-action" onclick="window.switchPage('orders')">
            <svg style="width:20px; height:20px; color:var(--primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            <span style="font-size:11px;">طلباتي</span>
          </button>
          <button class="account-quick-action" onclick="window.switchPage('deposits')">
            <svg style="width:20px; height:20px; color:var(--primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            <span style="font-size:11px;">إيداعاتي</span>
          </button>
          <button class="account-quick-action" onclick="window.switchPage('charge')">
            <svg style="width:20px; height:20px; color:var(--primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            <span style="font-size:11px;">شحن الرصيد</span>
          </button>
        </div>
      </div>

      <h3 style="font-size:15px; margin-top:8px;">ملخص نشاطك</h3>
      <div class="account-stats">
        <div class="account-stat" style="text-align:center;">
          <div style="color:var(--text-muted); font-size:12px; margin-bottom:8px;">إجمالي الطلبات</div>
          <strong style="font-size:20px;">${ordersCount}</strong>
        </div>
        <div class="account-stat" style="text-align:center;">
          <div style="color:var(--text-muted); font-size:12px; margin-bottom:8px;">عدد الإيداعات</div>
          <strong style="font-size:20px;">${depositsCount}</strong>
        </div>
        <div class="account-stat" style="text-align:center;">
          <div style="color:var(--text-muted); font-size:12px; margin-bottom:8px;">توثيق الحساب</div>
          <strong style="font-size:14px; color:var(--warning);">غير موثق</strong>
        </div>
        <div class="account-stat" style="text-align:center;">
          <div style="color:var(--text-muted); font-size:12px; margin-bottom:8px;">المفضلة</div>
          <strong style="font-size:20px;">0</strong>
        </div>
      </div>

      <h3 style="font-size:15px; margin-top:8px;">إدارة الحساب</h3>
      <div class="account-menu">
        <button class="account-menu-item" onclick="alert('يرجى مراجعة الإدارة للتوثيق')">
          <div class="account-menu-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
          <div class="account-menu-copy"><strong>توثيق الحساب</strong><small>إرسال بيانات التوثيق ومتابعة الحالة</small></div>
        </button>
        <button class="account-menu-item" onclick="alert('المفضلة فارغة')">
          <div class="account-menu-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg></div>
          <div class="account-menu-copy"><strong>المفضلة</strong><small>المنتجات التي حفظتها</small></div>
        </button>
        <button class="account-menu-item" onclick="alert('قريباً')">
          <div class="account-menu-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
          <div class="account-menu-copy"><strong>العملة المفضلة</strong><small>الدولار الأمريكي أو الليرة السورية</small></div>
        </button>
        <button class="account-menu-item" onclick="alert('قريباً')">
          <div class="account-menu-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg></div>
          <div class="account-menu-copy"><strong>الإحالات</strong><small>رابط الدعوة ومتابعة الإحالات</small></div>
        </button>
      </div>

      <h3 style="font-size:15px; margin-top:8px;">المساعدة والدعم</h3>
      <div class="account-menu">
        <button class="account-menu-item" onclick="alert('لا توجد أسئلة حالياً')">
          <div class="account-menu-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
          <div class="account-menu-copy"><strong>الأسئلة الشائعة</strong><small>إجابات سريعة</small></div>
        </button>
        <button class="account-menu-item" onclick="window.open('https://t.me/YourSupportUsername', '_blank')">
          <div class="account-menu-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg></div>
          <div class="account-menu-copy"><strong>تواصل مع الدعم</strong><small>فتح محادثة مع فريق الدعم</small></div>
        </button>
        <button class="account-menu-item" onclick="alert('لا توجد إشعارات')">
          <div class="account-menu-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg></div>
          <div class="account-menu-copy"><strong>الإشعارات</strong><small>لا توجد إشعارات جديدة</small></div>
        </button>
      </div>
    </div>
  `;
}
