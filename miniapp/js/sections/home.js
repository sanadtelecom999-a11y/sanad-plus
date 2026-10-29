import { fetchUserData, fetchCategories } from '../core/api.js';
import { loadProductsByCategory } from './products.js';

export async function loadHomeData() {
  const balanceEl = document.getElementById('home-balance');
  const categoriesContainer = document.getElementById('home-categories');
  if (!balanceEl || !categoriesContainer) return;

  balanceEl.textContent = 'جاري التحميل...';
  
  try {
    const userData = await fetchUserData();
    balanceEl.textContent = userData && userData.balance !== undefined ? `$${Number(userData.balance).toFixed(2)}` : '$0.00';
  } catch(e) { balanceEl.textContent = '$0.00'; }

  categoriesContainer.innerHTML = `<div class="card" style="grid-column:1/-1; text-align:center;">جاري التحميل...</div>`;
  
  try {
    const categories = await fetchCategories();
    if (categories && categories.length > 0) {
      categoriesContainer.innerHTML = categories.map(cat => `
        <div class="card category-item" data-id="${cat.id}" data-name="${cat.name}" style="display:flex; flex-direction:column; align-items:center; padding:16px; cursor:pointer;">
          ${cat.image ? `<img src="${cat.image}" style="width:50px; height:50px; border-radius:12px; object-fit:cover; margin-bottom:8px;" />` : '<div style="width:50px; height:50px; border-radius:12px; background:#1C1D21; margin-bottom:8px;"></div>'}
          <span style="font-size:13px; font-weight:700;">${cat.name}</span>
        </div>
      `).join('');
    } else {
      categoriesContainer.innerHTML = `<div class="card" style="grid-column:1/-1; text-align:center;">لا توجد تصنيفات.</div>`;
    }
  } catch(e) {
    categoriesContainer.innerHTML = `<div class="card" style="grid-column:1/-1; text-align:center;">فشل التحميل.</div>`;
  }
}
window.loadProductsByCategory = loadProductsByCategory;
