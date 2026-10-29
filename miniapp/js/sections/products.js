import { safeFetch } from '../core/api.js';

let currentProducts = [];
let selectedProduct = null;

export async function loadProductsByCategory(categoryId, categoryName) {
  const container = document.getElementById('products-container');
  const title = document.getElementById('category-title');
  
  if (!container || !title) return;
  
  title.textContent = categoryName;
  window.switchPage('products');
  
  container.innerHTML = `<div style="text-align:center; padding:20px; grid-column:1/-1; color:var(--text-muted);">جاري التحميل...</div>`;

  try {
    currentProducts = await safeFetch(`/api/products/?category_id=${categoryId}`) || [];
    
    if (currentProducts.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:20px; grid-column:1/-1; color:var(--text-muted);">لا توجد منتجات في هذا القسم.</div>`;
      return;
    }

    container.innerHTML = currentProducts.map(p => `
      <div class="product-card" onclick="window.openBuyModal(${p.id})">
        <img src="${p.image || 'https://via.placeholder.com/150'}" class="product-img" onerror="this.src='https://via.placeholder.com/150'">
        <div class="product-info">
          <div class="product-title">${p.name}</div>
          <div class="product-price">$${p.price.toFixed(2)}</div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = `<div style="color:var(--danger); text-align:center; grid-column:1/-1;">فشل تحميل المنتجات.</div>`;
  }
}

window.openBuyModal = function(productId) {
  selectedProduct = currentProducts.find(p => p.id === productId);
  if (!selectedProduct) return;

  const imgEl = document.getElementById('buy-img');
  const nameEl = document.getElementById('buy-name');
  const priceEl = document.getElementById('buy-price');
  const totalEl = document.getElementById('buy-total');
  const modal = document.getElementById('buy-modal');

  if (imgEl) imgEl.src = selectedProduct.image || 'https://via.placeholder.com/150';
  if (nameEl) nameEl.textContent = selectedProduct.name;
  if (priceEl) priceEl.textContent = `$${selectedProduct.price.toFixed(2)}`;
  if (totalEl) totalEl.textContent = `$${selectedProduct.price.toFixed(2)}`;
  
  const deliveryInput = document.getElementById('buy-delivery-data');
  if (deliveryInput) deliveryInput.value = '';
  
  if (modal) modal.classList.add('active');
};

// ربط النموذج بأمان (بعد تحميل الصفحة)
document.addEventListener('DOMContentLoaded', () => {
  const buyForm = document.getElementById('buy-form');
  if (buyForm) {
    buyForm.onsubmit = async (e) => {
      e.preventDefault();
      if (!selectedProduct) return;

      const btn = document.getElementById('buy-submit');
      const deliveryInput = document.getElementById('buy-delivery-data');
      const deliveryData = deliveryInput ? deliveryInput.value : '';
      const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

      if (btn) {
        btn.disabled = true;
        btn.textContent = 'جاري المعالجة...';
      }

      try {
        const res = await safeFetch('/api/orders/create', {
          method: 'POST',
          body: JSON.stringify({
            product_id: selectedProduct.id,
            quantity: 1,
            delivery_data: deliveryData
          })
        });

        if (res && res.success) {
          document.getElementById('buy-modal').classList.remove('active');
          alert(`تم الشراء بنجاح! رصيدك الجديد: $${res.new_balance.toFixed(2)}`);
          window.switchPage('orders');
        } else {
          alert('خطأ: ' + (res?.error || 'رصيدك غير كافٍ أو حدث خطأ'));
        }
      } catch (err) {
        alert('حدث خطأ في الاتصال.');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'تأكيد الدفع';
        }
      }
    };
  }
});
