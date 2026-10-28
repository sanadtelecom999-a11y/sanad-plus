import { fetchUserData, fetchCategories } from '../core/api.js';
import { loadProductsByCategory } from './products.js';

export async function loadHomeData() {
  const balanceEl = document.getElementById('home-balance');
  if (!balanceEl) return;

  balanceEl.textContent = 'جاري التحميل...';
  
  const userData = await fetchUserData();
  if (userData && userData.balance !== undefined) {
    balanceEl.textContent = `$${Number(userData.balance).toFixed(2)}`;
  } else {
    balanceEl.textContent = 'خطأ في الجلب';
    balanceEl.style.color = 'var(--danger)';
  }

  const categoriesContainer = document.getElementById('home-categories');
  if (!categoriesContainer) return;
  
  categoriesContainer.innerHTML = `<div class="card" style="grid-column:1/-1; text-align:center;">جاري تحميل التصنيفات...</div>`;
  const categories = await fetchCategories();

  if (categories && categories.length > 0) {
    categoriesContainer.innerHTML = categories.map(cat => `
      <div class="card" onclick="window.loadProductsByCategory(${cat.id}, '${cat.name}')" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:16px; cursor:pointer;">
        ${cat.image ? `<img src="${cat.image}" style="width:50px; height:50px; border-radius:12px; object-fit:cover; margin-bottom:8px;" />` : '<div style="width:50px; height:50px; border-radius:12px; background:#1C1D21; margin-bottom:8px;"></div>'}
        <span style="font-size:13px; font-weight:700;">${cat.name}</span>
      </div>
    `).join('');
  } else {
    categoriesContainer.innerHTML = `<div class="card" style="grid-column: 1/-1; text-align:center; color:var(--text-muted);">لا توجد تصنيفات حالياً.</div>`;
  }
}

// جعل الدالة عالمية لكي يصل إليها زر التصنيف
window.loadProductsByCategory = loadProductsByCategory;
