import { api } from '../core/api.js';
import { state } from '../core/state.js';
import { escapeHtml, formatCurrency } from '../core/utils.js';
import { getTelegramUser } from '../core/telegram.js';

export async function renderHome() {
  const container = document.getElementById('page-home');
  if (!container) return;

  const userName = getTelegramUser()?.first_name || 'عميلنا العزيز';

  container.innerHTML = `
    <header style="margin-bottom:20px;">
      <h1 style="font-size:24px; font-weight:800; margin:0;">SANAD PLUS⁺</h1>
      <p style="color:var(--sp-text-muted); font-size:13px; margin-top:4px;">منصتك الرقمية الموثوقة</p>
    </header>
    
    <p style="font-size:15px; font-weight:600; margin-bottom:12px;">أهلاً، ${escapeHtml(userName)}</p>
    
    <div class="sp-card" style="background: linear-gradient(145deg, #15263A, #111D31); border-color: rgba(56,189,248,0.3); padding:20px; margin-bottom:24px;">
      <p style="color:var(--sp-text-muted); font-size:13px; margin-bottom:8px;">الرصيد الحالي</p>
      <div style="font-size:32px; font-weight:800;">${formatCurrency(state.balance)}</div>
    </div>
    
    <h2 style="font-size:18px; font-weight:700; margin-bottom:16px;">فئات الخدمات</h2>
    <div id="home-categories" class="grid-cat">
      <div style="text-align:center; grid-column:1/-1; color:var(--sp-text-muted);">جاري التحميل...</div>
    </div>
  `;

  try {
    const categories = await api.get('/api/categories/');
    const catsContainer = document.getElementById('home-categories');
    
    if (!categories || categories.length === 0) {
      catsContainer.innerHTML = '<div style="text-align:center; grid-column:1/-1; color:var(--sp-text-muted);">لا توجد تصنيفات.</div>';
      return;
    }

    catsContainer.innerHTML = categories.map(cat => `
      <div class="cat-card category-item" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}">
        ${cat.image ? `<img src="${escapeHtml(cat.image)}" class="cat-img" />` : '<div class="cat-img"></div>'}
        <span class="cat-title">${escapeHtml(cat.name)}</span>
      </div>
    `).join('');
  } catch (err) {
    document.getElementById('home-categories').innerHTML = `<div style="color:var(--sp-danger); grid-column:1/-1; text-align:center;">${err.message}</div>`;
  }
}
