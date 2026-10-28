import { fetchUserData, fetchCategories } from '../core/api.js';

export async function loadHomeData() {
  // 1. جلب الرصيد
  const balanceEl = document.getElementById('home-balance');
  const userData = await fetchUserData();

  if (userData && userData.balance !== undefined) {
    // تنسيق الرصيد
    balanceEl.textContent = `$${Number(userData.balance).toFixed(2)}`;
  } else {
    balanceEl.textContent = 'خطأ في الجلب';
    balanceEl.style.color = 'var(--danger)';
  }

  // 2. جلب التصنيفات
  const categoriesContainer = document.getElementById('home-categories');
  const categories = await fetchCategories();

  if (categories.length > 0) {
    categoriesContainer.innerHTML = categories.map(cat => `
      <div class="card" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:16px; cursor:pointer;">
        ${cat.image ? `<img src="${cat.image}" style="width:50px; height:50px; border-radius:12px; object-fit:cover; margin-bottom:8px;" />` : '<div style="width:50px; height:50px; border-radius:12px; background:#1C1D21; margin-bottom:8px;"></div>'}
        <span style="font-size:13px; font-weight:700;">${cat.name}</span>
      </div>
    `).join('');
  } else {
    categoriesContainer.innerHTML = `<div class="card" style="grid-column: span 2; text-align:center; color:var(--text-muted);">لا توجد تصنيفات حالياً.</div>`;
  }
}
