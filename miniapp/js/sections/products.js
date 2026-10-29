import { api } from '../core/api.js';
import { state } from '../core/state.js';
import { escapeHtml, safeUrl, formatCurrency } from '../core/utils.js';
import { navigateTo } from '../core/router.js';

let currentCategoryId = null;
let currentProducts = [];

export async function renderProducts(categoryId, categoryName) {
  const container = document.getElementById('page-products');
  if (!container) return;
  currentCategoryId = categoryId;

  container.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
      <button id="back-to-home" style="background:none; border:none; color:white; font-size:24px; cursor:pointer;">&rarr;</button>
      <h1 style="font-size:20px; font-weight:800; margin:0;">${escapeHtml(categoryName)}</h1>
    </div>
    <div id="products-list" class="grid-2">
      <div style="text-align:center; grid-column:1/-1; color:var(--text-muted);">جاري التحميل...</div>
    </div>
  `;

  document.getElementById('back-to-home').onclick = () => navigateTo('home');
  navigateTo('products');

  try {
    currentProducts = await api.get(`/api/products/?category_id=${categoryId}`);
    const list = document.getElementById('products-list');

    if (!currentProducts || currentProducts.length === 0) {
      list.innerHTML = '<div style="text-align:center; grid-column:1/-1; color:var(--text-muted);">لا توجد منتجات في هذا القسم.</div>';
      return;
    }

    list.innerHTML = currentProducts.map(p => {
      const imgUrl = safeUrl(p.image, ['cloudinary.com', 'placehold.co']) || 'https://placehold.co/150?text=No+Image';
      return `
        <div class="card product-card" data-id="${p.id}">
          <img src="${imgUrl}" class="product-img" />
          <div class="product-info">
            <div class="product-title">${escapeHtml(p.name)}</div>
            <div class="product-price">${formatCurrency(p.price)}</div>
          </div>
        </div>
      `;
    }).join('');

    // ربط النقر لفتح مودال الشراء
    list.querySelectorAll('.product-card').forEach(card => {
      card.onclick = () => openBuyModal(card.getAttribute('data-id'));
    });

  } catch (err) {
    document.getElementById('products-list').innerHTML = `<div style="color:var(--danger); grid-column:1/-1; text-align:center;">${err.message}</div>`;
  }
}

function openBuyModal(productId) {
  const product = currentProducts.find(p => p.id == productId);
  if (!product) return;

  const modal = document.getElementById('app-modal');
  const content = document.getElementById('modal-content');
  
  modal.classList.add('active');
  content.innerHTML = `
    <h3 style="margin-top:0; text-align:center;">تأكيد الشراء</h3>
    <div style="display:flex; gap:12px; align-items:center; background:var(--bg-main); padding:12px; border-radius:12px; margin-bottom:20px;">
      <img src="${safeUrl(product.image, ['cloudinary.com', 'placehold.co']) || ''}" style="width:50px; height:50px; border-radius:8px; object-fit:cover;" />
      <div>
        <strong style="display:block; font-size:14px;">${escapeHtml(product.name)}</strong>
        <span style="color:var(--primary); font-weight:bold;">${formatCurrency(product.price)}</span>
      </div>
    </div>
    <form id="buy-form">
      <div class="form-group">
        <label class="form-label">بيانات الاستلام (ID / رقم الحساب)</label>
        <input type="text" id="buy-input" class="form-input" required placeholder="أدخل المعرف هنا...">
      </div>
      <button type="submit" class="btn-primary" id="buy-btn">تأكيد الدفع</button>
    </form>
  `;

  document.getElementById('buy-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('buy-btn');
    const inputVal = document.getElementById('buy-input').value;
    
    btn.disabled = true; btn.textContent = 'جاري المعالجة...';

    try {
      const res = await api.post('/api/orders/create', {
        product_id: product.id,
        quantity: 1,
        delivery_data: inputVal
      });
      
      modal.classList.remove('active');
      alert(`تم الشراء بنجاح! رصيدك الجديد: $${res.new_balance}`);
      
      // تحديث الرصيد محلياً
      state.balance = res.new_balance;
      
      navigateTo('orders');
    } catch (err) {
      alert('خطأ: ' + err.message);
      btn.disabled = false; btn.textContent = 'تأكيد الدفع';
    }
  };
}
