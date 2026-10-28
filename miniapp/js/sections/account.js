import { fetchUserData } from '../core/api.js';

export async function loadAccount() {
  const container = document.getElementById('account-profile');
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  
  container.innerHTML = `<div style="text-align:center; padding:20px;">جاري التحميل...</div>`;
  
  const userData = await fetchUserData();
  
  container.innerHTML = `
    <!-- البروفايل -->
    <div style="display:flex; flex-direction:column; align-items:center; margin-bottom:24px;">
      <div style="width:70px; height:70px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:bold; margin-bottom:12px;">
        ${tgUser?.first_name?.charAt(0) || 'U'}
      </div>
      <h2 style="margin:0 0 4px 0; font-size:18px;">${tgUser?.first_name || 'مستخدم'} ${tgUser?.last_name || ''}</h2>
      <span style="color:var(--text-muted); font-size:12px;">ID: ${tgUser?.id || 'غير متاح'}</span>
    </div>

    <!-- الإحصائيات -->
    <div class="stats-grid">
      <div class="stat-card">
        <span>الرصيد الحالي</span>
        <strong style="color:var(--success);">$${userData ? userData.balance.toFixed(2) : '0.00'}</strong>
      </div>
      <div class="stat-card">
        <span>إجمالي الإنفاق</span>
        <strong>$0.00</strong>
      </div>
      <div class="stat-card">
        <span>عدد الطلبات</span>
        <strong>0</strong>
      </div>
      <div class="stat-card">
        <span>عدد الإيداعات</span>
        <strong>0</strong>
      </div>
    </div>

    <!-- القائمة -->
    <div class="menu-list">
      <div class="menu-item" onclick="alert('قريباً')">
        <div class="menu-item-text">
          <h4>توثيق الحساب (KYC)</h4>
          <span>حسابك غير موثق</span>
        </div>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      </div>
      <div class="menu-item" onclick="alert('قريباً')">
        <div class="menu-item-text">
          <h4>المفضلة</h4>
          <span>المنتجات التي أعجبتك</span>
        </div>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
      </div>
      <div class="menu-item" onclick="alert('قريباً')">
        <div class="menu-item-text">
          <h4>الإحالات</h4>
          <span>ادع أصدقاءك واحصل على مكافأة</span>
        </div>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"></path></svg>
      </div>
      <div class="menu-item" onclick="alert('قريباً')">
        <div class="menu-item-text">
          <h4>الأسئلة الشائعة</h4>
          <span>إجابات سريعة لأكثر الأسئلة</span>
        </div>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      </div>
    </div>
  `;
}
