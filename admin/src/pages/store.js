import { apiFetch } from '../api.js';
let currentTab = 'products';

export function renderStore(container) {
  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
      <div class="tabs" style="margin-bottom:0;">
        <button class="btn btn-primary" id="tab-products" onclick="window.switchStoreTab('products')">المنتجات</button>
        <button class="btn btn-secondary" id="tab-categories" onclick="window.switchStoreTab('categories')">الأقسام</button>
        <button class="btn btn-secondary" id="tab-methods" onclick="window.switchStoreTab('methods')">طرق الدفع</button>
      </div>
      <button class="btn btn-primary" onclick="window.openStoreModal()"><i data-lucide="plus"></i> إضافة جديد</button>
    </div>
    <div class="grid-3" id="store-grid"><div class="skeleton sk-line" style="height:100px;"></div></div>`;
  lucide.createIcons();
  window.switchStoreTab('products');
}

window.switchStoreTab = async (tab) => {
  currentTab = tab;
  document.getElementById('tab-products').className = tab === 'products' ? 'btn btn-primary' : 'btn btn-secondary';
  document.getElementById('tab-categories').className = tab === 'categories' ? 'btn btn-primary' : 'btn btn-secondary';
  document.getElementById('tab-methods').className = tab === 'methods' ? 'btn btn-primary' : 'btn btn-secondary';
  
  const grid = document.getElementById('store-grid'); grid.innerHTML = '<div class="skeleton sk-line" style="height:100px;"></div>';
  try {
    const endpoint = tab === 'products' ? '/api/admin/products' : tab === 'categories' ? '/api/admin/categories' : '/api/admin/payment-methods';
    const data = await apiFetch(endpoint); const items = Array.isArray(data) ? data : [];
    grid.innerHTML = '';
    if(items.length === 0) return grid.innerHTML = '<p style="grid-column:1/-1; text-align:center;">لا توجد بيانات</p>';
    
    items.forEach(item => {
      grid.innerHTML += `
        <div class="card-glass" style="display:flex; flex-direction:column; gap:10px;">
          <div style="display:flex; justify-content:space-between;">
            <div style="width:40px; height:40px; background:var(--primary-500); border-radius:10px; display:flex; align-items:center; justify-content:center; color:white;"><i data-lucide="${tab==='products'?'package':tab==='categories'?'folder':'credit-card'}"></i></div>
            <button class="action-icon" onclick="alert('قيد التطوير')"><i data-lucide="edit"></i></button>
          </div>
          <h3 style="font-weight:700;">${item.name}</h3>
          <p style="color:var(--accent); font-weight:700;">${item.price ? item.price + ' ل.س' : item.account || '—'}</p>
        </div>`;
    });
    lucide.createIcons();
  } catch(e){}
};

window.openStoreModal = () => {
  const modals = document.getElementById('modals-container');
  modals.innerHTML = `
    <div class="modal-backdrop active" id="modal-store">
      <div class="modal">
        <h3 style="margin-bottom:20px;">إضافة ${currentTab === 'products' ? 'منتج' : currentTab === 'categories' ? 'قسم' : 'طريقة دفع'}</h3>
        <input type="text" class="input" placeholder="الاسم">
        <input type="text" class="input" placeholder="${currentTab === 'products' ? 'السعر' : currentTab === 'categories' ? 'الوصف' : 'رقم الحساب'}">
        <div style="display:flex; gap:10px; margin-top:15px;">
          <button class="btn btn-primary" onclick="document.getElementById('modal-store').classList.remove('active'); window.showToast('تمت الإضافة (تجريبي)')">حفظ</button>
          <button class="btn btn-secondary" onclick="document.getElementById('modal-store').classList.remove('active')">إلغاء</button>
        </div>
      </div>
    </div>`;
};

