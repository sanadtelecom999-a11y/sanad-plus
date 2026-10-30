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
    <div class="table-wrap">
      <table>
        <thead id="store-thead"></thead>
        <tbody id="store-tbody"><tr><td colspan="4"><div class="skeleton sk-line"></div></td></tr></tbody>
      </table>
    </div>`;
  lucide.createIcons();
  window.switchStoreTab('products');
}

window.switchStoreTab = async (tab) => {
  currentTab = tab;
  document.getElementById('tab-products').className = tab === 'products' ? 'btn btn-primary' : 'btn btn-secondary';
  document.getElementById('tab-categories').className = tab === 'categories' ? 'btn btn-primary' : 'btn btn-secondary';
  document.getElementById('tab-methods').className = tab === 'methods' ? 'btn btn-primary' : 'btn btn-secondary';
  
  const thead = document.getElementById('store-thead'), tbody = document.getElementById('store-tbody');
  tbody.innerHTML = `<tr><td colspan="4"><div class="skeleton sk-line"></div></td></tr>`;
  
  try {
    const endpoint = tab === 'products' ? '/api/admin/products' : tab === 'categories' ? '/api/admin/categories' : '/api/admin/payment-methods';
    thead.innerHTML = tab==='products' ? '<tr><th>ID</th><th>الاسم</th><th>السعر</th><th>إجراء</th></tr>' : tab==='categories' ? '<tr><th>ID</th><th>الاسم</th><th>إجراء</th></tr>' : '<tr><th>ID</th><th>الاسم</th><th>الحساب</th><th>إجراء</th></tr>';
    
    const data = await apiFetch(endpoint); 
    const items = Array.isArray(data) ? data : []; 
    tbody.innerHTML = '';
    
    if (items.length === 0) return tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">لا توجد بيانات</td></tr>';
    
    items.forEach(item => {
      tbody.innerHTML += `<tr><td>${item.id}</td><td>${item.name}</td><td>${item.price || item.account || '—'}</td><td><button class="action-icon" onclick="alert('سيتم تفعيل التعديل قريباً')"><i data-lucide="edit"></i></button></td></tr>`;
    });
    lucide.createIcons();
  } catch(e){}
};

window.openStoreModal = () => {
  const modals = document.getElementById('modals-container');
  const isProduct = currentTab === 'products';
  const isCategory = currentTab === 'categories';
  
  modals.innerHTML = `
    <div class="modal-backdrop active" id="modal-store">
      <div class="modal">
        <h3 style="margin-bottom:20px;">إضافة ${isProduct ? 'منتج' : isCategory ? 'قسم' : 'طريقة دفع'}</h3>
        <input type="text" id="st-name" class="input" placeholder="الاسم">
        ${isProduct ? '<input type="number" id="st-price" class="input" placeholder="السعر">' : ''}
        ${!isCategory && !isProduct ? '<input type="text" id="st-account" class="input" placeholder="رقم الحساب">' : ''}
        
        <div style="display:flex; gap:10px; margin-top:15px;">
          <button class="btn btn-primary" onclick="window.saveStoreItem('${currentTab}')">حفظ في الداتابيس</button>
          <button class="btn btn-secondary" onclick="document.getElementById('modal-store').classList.remove('active')">إلغاء</button>
        </div>
      </div>
    </div>`;
};

window.saveStoreItem = async (type) => {
  const name = document.getElementById('st-name').value;
  if(!name) return window.showToast('الاسم مطلوب', 'error');

  let body = { name: name };
  if(type === 'products') body.price = parseFloat(document.getElementById('st-price').value);
  if(type === 'methods') body.account = document.getElementById('st-account').value;

  const endpoint = type === 'products' ? '/api/admin/products' : type === 'categories' ? '/api/admin/categories' : '/api/admin/payment-methods';
  
  try {
    await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) });
    window.showToast('تم الحفظ بنجاح!');
    document.getElementById('modal-store').classList.remove('active');
    window.switchStoreTab(type);
  } catch(e) {}
};
