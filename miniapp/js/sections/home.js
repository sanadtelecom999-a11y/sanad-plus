import { api } from '../core/api.js';
import { state } from '../core/state.js';
import { escapeHtml, formatCurrency } from '../core/utils.js';
import { getTelegramUser } from '../core/telegram.js';

export async function renderHome() {
  const container = document.getElementById('page-home');
  if (!container) return;

  const tgUser = getTelegramUser();
  const userName = tgUser?.first_name || 'عميلنا العزيز';
  const avatarHtml = tgUser?.photo_url 
    ? `<img src="${tgUser.photo_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />` 
    : `<span style="color:#fff; font-weight:bold; font-size:16px;">${tgUser?.first_name?.charAt(0) || 'U'}</span>`;

  container.innerHTML = `
    <!-- الهيدر العلوي -->
    <header style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
      <div>
        <h1 style="font-size:22px; font-weight:800; margin:0; color:#fff;">SANAD PLUS⁺</h1>
        <p style="color:var(--sp-text-muted); font-size:12px; margin-top:2px;">منصتك الرقمية الموثوقة</p>
      </div>
      <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
        <button style="background:var(--sp-surface); border:1px solid var(--sp-border); border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; color:var(--sp-text-muted);">
          <svg style="width:20px; height:20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
        </button>
        <div style="width:36px; height:36px; border-radius:50%; background:var(--sp-surface); border:1px solid var(--sp-border); display:flex; align-items:center; justify-content:center;">
          ${avatarHtml}
        </div>
      </div>
    </header>

    <!-- الترحيب -->
    <div style="margin-bottom:20px; text-align:right;">
      <p style="color:var(--sp-text-muted); font-size:13px; margin:0;">أهلاً بعودتك 👋</p>
      <h2 style="font-size:24px; font-weight:800; margin:0; color:#fff;">مرحباً، ${escapeHtml(userName)}</h2>
    </div>

    <!-- بطاقة الرصيد الجديدة -->
    <div style="background: linear-gradient(135deg, #0d3b66 0%, #1e5a8a 50%, #0d3b66 100%); border-radius: 24px; padding: 24px; position: relative; margin-bottom: 24px; border: 1px solid rgba(56, 189, 248, 0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
      <!-- زر إخفاء الرصيد -->
      <button style="position:absolute; top:20px; left:20px; background:rgba(255,255,255,0.1); border:none; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.7); cursor:pointer;">
        <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
      </button>

      <p style="color:rgba(255,255,255,0.8); font-size:14px; margin:0 0 10px 0;">الرصيد الإجمالي</p>
      
      <div style="display:flex; align-items:baseline; justify-content:flex-end; gap:8px; margin-bottom:24px;">
        <span style="font-size:36px; font-weight:900; color:#fff; letter-spacing:1px;">${Number(state.balance).toLocaleString('en-US')}</span>
        <span style="color:rgba(255,255,255,0.8); font-size:16px; font-weight:600;">ل.س</span>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center;">
        <button onclick="window.location.hash='charge'" style="background:#38bdf8; color:#0f172a; border:none; padding:10px 20px; border-radius:12px; font-weight:800; font-size:14px; cursor:pointer;">
          + شحن الرصيد
        </button>
        <span style="color:rgba(255,255,255,0.6); font-size:12px;">رصيدك متاح للاستخدام</span>
      </div>
    </div>

    <!-- قسم التصنيفات -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <h2 style="font-size:18px; font-weight:700; margin:0;">اكتشف المتجر</h2>
      <span style="color:var(--sp-primary); font-size:13px; cursor:pointer;">كل التصنيفات ←</span>
    </div>
    
    <div id="home-categories" class="grid-cat">
      <div style="text-align:center; grid-column:1/-1; color:var(--sp-text-muted);">جاري التحميل...</div>
    </div>
  `;

  // ربط زر شحن الرصيد في البطاقة
  const chargeBtn = container.querySelector('button[onclick*="charge"]');
  if (chargeBtn) {
    chargeBtn.onclick = (e) => {
      e.preventDefault();
      import('../core/router.js').then(m => m.navigateTo('charge'));
    };
  }

  try {
    const categories = await api.get('/api/categories/');
    const catsContainer = document.getElementById('home-categories');
    
    if (!categories || categories.length === 0) {
      catsContainer.innerHTML = '<div style="text-align:center; grid-column:1/-1; color:var(--sp-text-muted);">لا توجد تصنيفات.</div>';
      return;
    }

    // تصميم بطاقات التصنيفات الجديد (كما في الصورة)
    catsContainer.innerHTML = categories.map(cat => `
      <div class="cat-card category-item" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}" style="background: var(--sp-surface); border-radius: 20px; padding: 20px; text-align: right; border: 1px solid var(--sp-border);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
          <div style="background:rgba(56,189,248,0.1); width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center;">
            ${cat.image ? `<img src="${escapeHtml(cat.image)}" style="width:100%; height:100%; border-radius:12px; object-fit:cover;" />` : '<svg style="width:20px; height:20px; color:var(--sp-primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>'}
          </div>
        </div>
        <h3 style="font-size:16px; font-weight:800; margin:0 0 4px 0;">${escapeHtml(cat.name)}</h3>
        <p style="color:var(--sp-text-muted); font-size:12px; margin:0;">خدمات رقمية مميزة</p>
      </div>
    `).join('');
  } catch (err) {
    document.getElementById('home-categories').innerHTML = `<div style="color:var(--sp-danger); grid-column:1/-1; text-align:center;">${err.message}</div>`;
  }
}
