import { api } from '../core/api.js';
import { state } from '../core/state.js';
import { escapeHtml, formatCurrency } from '../core/utils.js';
import { navigateTo } from '../core/router.js';

export async function renderHome() {
  const container = document.getElementById('page-home');
  if (!container) return;

  container.innerHTML = `
    <header style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <h1 style="font-size:20px; font-weight:800; margin:0;">SANAD<span style="color:var(--primary)">+</span></h1>
      <button class="support-btn" style="background:var(--bg-card); border:1px solid rgba(255,255,255,0.1); border-radius:50%; width:40px; height:40px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--primary);">
        <svg style="width:20px; height:20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
      </button>
    </header>
    <div class="card" style="background: linear-gradient(145deg, #102033, #0A1B2E); border-color: rgba(0, 149, 232, 0.3);">
      <div class="card-title">الرصيد الإجمالي</div>
      <div class="balance-amount">${formatCurrency(state.balance)}</div>
    </div>
    <h2 style="font-size:16px; margin-bottom:16px;">تصنيفات المتجر</h2>
    <div id="home-categories" class="grid-2">
      <div style="text-align:center; grid-column:1/-1; color:var(--text-muted);">جاري التحميل...</div>
    </div>
  `;

  try {
    const categories = await api.get('/api/categories/');
    const catsContainer = document.getElementById('home-categories');
    
    if (!categories || categories.length === 0) {
      catsContainer.innerHTML = '<div style="text-align:center; grid-column:1/-1; color:var(--text-muted);">لا توجد تصنيفات.</div>';
      return;
    }

    catsContainer.innerHTML = categories.map(cat => `
      <div class="card category-card" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}">
        ${cat.image ? `<img src="${escapeHtml(cat.image)}" class="category-img" />` : '<div class="category-img"></div>'}
        <span style="font-size:13px; font-weight:700;">${escapeHtml(cat.name)}</span>
      </div>
    `).join('');

    // ربط النقر على التصنيف (للانتقال لصفحة المنتجات)
    catsContainer.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        const name = card.getAttribute('data-name');
        // سنقوم بتمرير هذه البيانات لصفحة المنتجات عبر حدث مخصص
        window.dispatchEvent(new CustomEvent('open-category', { detail: { id, name } }));
      });
    });

  } catch (err) {
    document.getElementById('home-categories').innerHTML = `<div style="color:var(--danger); grid-column:1/-1; text-align:center;">${err.message}</div>`;
  }
}
