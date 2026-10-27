import { api } from '../core/api.js';
import { escapeHtml, formatCurrency } from '../core/utils.js';

let currentTab = 'products';
let currentPage = 1;
let allCategories = [];
let allPayments = [];

export async function renderStore() {
  const container = document.getElementById('dashboard-container');
  container.innerHTML = `
    <div class="sanad-tabs">
      <button id="tab-products" class="sanad-tab active" onclick="window.switchStoreTab('products')">المنتجات</button>
      <button id="tab-categories" class="sanad-tab" onclick="window.switchStoreTab('categories')">الأقسام</button>
      <button id="tab-payments" class="sanad-tab" onclick="window.switchStoreTab('payments')">طرق الدفع</button>
    </div>
    <div id="store-content"></div>
  `;
  await fetchData();
  window.switchStoreTab(currentTab);
}

async function fetchData() {
  const [catRes, payRes] = await Promise.all([api.safeFetch('/api/admin/categories'), api.safeFetch('/api/admin/payment-methods')]);
  if (catRes.ok) allCategories = catRes.data || [];
  if (payRes.ok) allPayments = payRes.data || [];
}

window.switchStoreTab = function(tab) {
  currentTab = tab;
  document.querySelectorAll('.sanad-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  const content = document.getElementById('store-content');
  if (tab === 'products') renderProductsView(content);
  else if (tab === 'categories') renderCategoriesView(content);
  else if (tab === 'payments') renderPaymentsView(content);
};

async function renderProductsView(container) {
  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <h2 style="margin:0; font-size:18px;">إدارة المنتجات</h2>
      <button onclick="window.openProductModal()" class="sanad-btn sanad-btn-primary">+ إضافة منتج</button>
    </div>
    <div class="sanad-card" style="overflow:hidden;">
      <div style="overflow-x:auto;">
        <table class="sanad-table">
          <thead><tr><th>الصورة</th><th>الاسم</th><th>القسم</th><th>السعر</th><th>الكمية</th><th style="text-align:left;">إجراءات</th></tr></thead>
          <tbody id="products-table-body"><tr><td colspan="6" style="text-align:center; padding:30px; color:#91a7c2;">جاري التحميل...</td></tr></tbody>
        </table>
      </div>
    </div>
    <div id="pagination-controls" style="display:flex; justify-content:center; align-items:center; gap:8px; margin-top:16px;"></div>
  `;
  await loadProducts(currentPage);
}

async function loadProducts(page) {
  currentPage = page;
  const tbody = document.getElementById('products-table-body');
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#91a7c2;">جاري التحميل...</td></tr>`;
  const res = await api.safeFetch(`/api/admin/products?page=${page}&limit=10`);
  if (!res.ok) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#fb7185;">فشل الجلب: ${res.error}</td></tr>`; return; }
  const { items, total, pages } = res.data;
  if (!items || items.length === 0) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#91a7c2;">لا توجد منتجات.</td></tr>`; return; }
  
  tbody.innerHTML = items.map(p => `
    <tr>
      <td>${p.image ? `<img src="${escapeHtml(p.image)}" class="sanad-img-thumb" />` : '<div class="sanad-img-thumb" style="background:#17304b; display:flex; align-items:center; justify-content:center; font-size:10px;">لا يوجد</div>'}</td>
      <td style="font-weight:bold;">${escapeHtml(p.name)}</td>
      <td style="color:#91a7c2;">${escapeHtml(p.category_name)}</td>
      <td style="color:#34d399; font-weight:bold;">${formatCurrency(p.base_price)}</td>
      <td>${p.base_quantity} ${escapeHtml(p.unit_name)}</td>
      <td style="text-align:left;"><button onclick='window.openProductModal(${JSON.stringify(p)})' class="sanad-btn sanad-btn-secondary" style="font-size:11px; padding:4px 8px;">تعديل</button></td>
    </tr>
  `).join('');

  if (pages > 1) {
    let html = '';
    for (let i = 1; i <= pages; i++) { html += `<button onclick="window.changePage(${i})" class="sanad-btn ${i === currentPage ? 'sanad-btn-primary' : 'sanad-btn-secondary'}" style="padding:4px 10px;">${i}</button>`; }
    document.getElementById('pagination-controls').innerHTML = html;
  } else { document.getElementById('pagination-controls').innerHTML = `<span style="color:#91a7c2; font-size:12px;">إجمالي المنتجات: ${total}</span>`; }
}

window.changePage = function(page) { if (page !== currentPage) loadProducts(page); };

window.openProductModal = function(product = null) {
  const isEdit = product !== null;
  const modal = document.getElementById('detail-modal');
  const content = document.getElementById('modal-content');
  modal.style.display = 'flex';
  const categoriesOptions = allCategories.map(c => `<option value="${c.id}" ${isEdit && product.category_name === c.name ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');

  content.innerHTML = `
    <h3 style="margin-top:0; font-size:18px;">${isEdit ? 'تعديل منتج' : 'إضافة منتج جديد'}</h3>
    <form id="product-form" style="display:flex; flex-direction:column; gap:12px; margin-top:16px;">
      <div><label style="font-size:12px; color:#91a7c2; margin-bottom:4px; display:block;">اسم المنتج</label><input type="text" id="p-name" required value="${isEdit ? escapeHtml(product.name) : ''}" class="sanad-input"></div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div><label style="font-size:12px; color:#91a7c2; margin-bottom:4px; display:block;">القسم</label><select id="p-category" required class="sanad-input"><option value="">اختر...</option>${categoriesOptions}</select></div>
        <div><label style="font-size:12px; color:#91a7c2; margin-bottom:4px; display:block;">الوحدة</label><input type="text" id="p-unit" required value="${isEdit ? escapeHtml(product.unit_name) : 'قطعة'}" class="sanad-input"></div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div><label style="font-size:12px; color:#91a7c2; margin-bottom:4px; display:block;">السعر ($)</label><input type="number" step="0.01" id="p-price" required value="${isEdit ? product.base_price : ''}" class="sanad-input"></div>
        <div><label style="font-size:12px; color:#91a7c2; margin-bottom:4px; display:block;">الكمية</label><input type="number" id="p-quantity" required value="${isEdit ? product.base_quantity : '1'}" class="sanad-input"></div>
      </div>
      <div><label style="font-size:12px; color:#91a7c2; margin-bottom:4px; display:block;">رابط الصورة (URL)</label><input type="url" id="p-image" value="${isEdit ? escapeHtml(product.image || '') : ''}" class="sanad-input" placeholder="https://..."></div>
      <div id="form-error" style="color:#fb7185; font-size:12px; display:none;"></div>
      <div style="display:flex; gap:10px; margin-top:12px;">
        <button type="submit" class="sanad-btn sanad-btn-primary" style="flex:1; padding:10px;">${isEdit ? 'حفظ' : 'إضافة'}</button>
        ${isEdit ? `<button type="button" onclick="window.deleteProduct(${product.id})" class="sanad-btn sanad-btn-danger" style="padding:10px;">حذف</button>` : ''}
      </div>
    </form>
  `;

  document.getElementById('product-form').onsubmit = async (e) => {
    e.preventDefault();
    const payload = { name: document.getElementById('p-name').value, category_id: parseInt(document.getElementById('p-category').value), base_price: parseFloat(document.getElementById('p-price').value), base_quantity: parseInt(document.getElementById('p-quantity').value), image: document.getElementById('p-image').value, unit_name: document.getElementById('p-unit').value };
    const res = await api.safeFetch(isEdit ? `/api/admin/products/${product.id}` : '/api/admin/products', { method: isEdit ? 'PUT' : 'POST', body: payload });
    if (res.ok) { window.closeModal(); loadProducts(currentPage); await fetchData(); }
    else { document.getElementById('form-error').textContent = res.error; document.getElementById('form-error').style.display = 'block'; }
  };
};

window.deleteProduct = async function(id) {
  if (!confirm('تأكيد الحذف؟')) return;
  const res = await api.safeFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
  if (res.ok) { window.closeModal(); loadProducts(currentPage); }
};

function renderCategoriesView(container) {
  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <h2 style="margin:0; font-size:18px;">الأقسام</h2>
      <button onclick="window.openCategoryModal()" class="sanad-btn sanad-btn-primary">+ إضافة قسم</button>
    </div>
    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:16px;">
      ${allCategories.map(c => `
        <div class="sanad-card" style="padding:16px; text-align:center; display:flex; flex-direction:column; align-items:center;">
          ${c.image ? `<img src="${escapeHtml(c.image)}" class="sanad-img-thumb" style="width:60px; height:60px; margin-bottom:12px;" />` : '<div class="sanad-img-thumb" style="width:60px; height:60px; margin-bottom:12px; background:#17304b;"></div>'}
          <h3 style="margin:0 0 12px 0; font-size:15px;">${escapeHtml(c.name)}</h3>
          <button onclick='window.openCategoryModal(${JSON.stringify(c)})' class="sanad-btn sanad-btn-secondary" style="width:100%; margin-top:auto;">تعديل</button>
        </div>
      `).join('') || '<div style="color:#91a7c2; grid-column:1/-1; text-align:center; padding:30px;">لا توجد أقسام.</div>'}
    </div>
  `;
}

window.openCategoryModal = function(category = null) {
  const isEdit = category !== null;
  document.getElementById('detail-modal').style.display = 'flex';
  document.getElementById('modal-content').innerHTML = `
    <h3 style="margin-top:0; font-size:18px;">${isEdit ? 'تعديل قسم' : 'إضافة قسم'}</h3>
    <form id="category-form" style="display:flex; flex-direction:column; gap:12px; margin-top:16px;">
      <div><label style="font-size:12px; color:#91a7c2; margin-bottom:4px; display:block;">اسم القسم</label><input type="text" id="c-name" required value="${isEdit ? escapeHtml(category.name) : ''}" class="sanad-input"></div>
      <div><label style="font-size:12px; color:#91a7c2; margin-bottom:4px; display:block;">رابط الصورة</label><input type="url" id="c-image" value="${isEdit ? escapeHtml(category.image || '') : ''}" class="sanad-input"></div>
      <div style="display:flex; gap:10px; margin-top:12px;">
        <button type="submit" class="sanad-btn sanad-btn-primary" style="flex:1; padding:10px;">${isEdit ? 'حفظ' : 'إضافة'}</button>
        ${isEdit ? `<button type="button" onclick="window.deleteCategory(${category.id})" class="sanad-btn sanad-btn-danger" style="padding:10px;">حذف</button>` : ''}
      </div>
    </form>
  `;
  document.getElementById('category-form').onsubmit = async (e) => {
    e.preventDefault();
    const res = await api.safeFetch(isEdit ? `/api/admin/categories/${category.id}` : '/api/admin/categories', { method: isEdit ? 'PUT' : 'POST', body: { name: document.getElementById('c-name').value, image: document.getElementById('c-image').value } });
    if (res.ok) { window.closeModal(); await fetchData(); window.switchStoreTab('categories'); }
    else { alert(res.error); }
  };
};
window.deleteCategory = async function(id) { if (!confirm('تأكيد الحذف؟')) return; const res = await api.safeFetch(`/api/admin/categories/${id}`, { method: 'DELETE' }); if (res.ok) { window.closeModal(); await fetchData(); window.switchStoreTab('categories'); } };

function renderPaymentsView(container) {
  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <h2 style="margin:0; font-size:18px;">طرق الدفع</h2>
      <button onclick="window.openPaymentModal()" class="sanad-btn sanad-btn-primary">+ إضافة طريقة</button>
    </div>
    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); gap:16px;">
      ${allPayments.map(p => `
        <div class="sanad-card" style="padding:16px;">
          <h3 style="margin:0 0 8px 0; font-size:16px; color:#38bdf8;">${escapeHtml(p.name)}</h3>
          <p style="color:#91a7c2; font-family:monospace; margin:0 0 16px 0;">${escapeHtml(p.account)}</p>
          <div style="display:flex; justify-content:space-between; font-size:12px; color:#91a7c2; border-top:1px solid rgba(255,255,255,0.05); padding-top:12px; margin-bottom:16px;">
            <span>الحد الأدنى: <b style="color:white;">${formatCurrency(p.min_amount)}</b></span>
            <span>الحد الأقصى: <b style="color:white;">${formatCurrency(p.max_amount)}</b></span>
          </div>
          <button onclick='window.openPaymentModal(${JSON.stringify(p)})' class="sanad-btn sanad-btn-secondary" style="width:100%;">تعديل</button>
        </div>
      `).join('') || '<div style="color:#91a7c2; grid-column:1/-1; text-align:center; padding:30px;">لا توجد طرق دفع.</div>'}
    </div>
  `;
}

window.openPaymentModal = function(pm = null) {
  const isEdit = pm !== null;
  document.getElementById('detail-modal').style.display = 'flex';
  document.getElementById('modal-content').innerHTML = `
    <h3 style="margin-top:0; font-size:18px;">${isEdit ? 'تعديل طريقة دفع' : 'إضافة طريقة دفع'}</h3>
    <form id="payment-form" style="display:flex; flex-direction:column; gap:12px; margin-top:16px;">
      <div><label style="font-size:12px; color:#91a7c2; margin-bottom:4px; display:block;">اسم الطريقة</label><input type="text" id="pm-name" required value="${isEdit ? escapeHtml(pm.name) : ''}" class="sanad-input"></div>
      <div><label style="font-size:12px; color:#91a7c2; margin-bottom:4px; display:block;">رقم الحساب</label><input type="text" id="pm-account" required value="${isEdit ? escapeHtml(pm.account) : ''}" class="sanad-input"></div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div><label style="font-size:12px; color:#91a7c2; margin-bottom:4px; display:block;">الحد الأدنى</label><input type="number" step="0.01" id="pm-min" required value="${isEdit ? pm.min_amount : '0'}" class="sanad-input"></div>
        <div><label style="font-size:12px; color:#91a7c2; margin-bottom:4px; display:block;">الحد الأقصى</label><input type="number" step="0.01" id="pm-max" required value="${isEdit ? pm.max_amount : '0'}" class="sanad-input"></div>
      </div>
      <div style="display:flex; gap:10px; margin-top:12px;">
        <button type="submit" class="sanad-btn sanad-btn-primary" style="flex:1; padding:10px;">${isEdit ? 'حفظ' : 'إضافة'}</button>
        ${isEdit ? `<button type="button" onclick="window.deletePayment(${pm.id})" class="sanad-btn sanad-btn-danger" style="padding:10px;">حذف</button>` : ''}
      </div>
    </form>
  `;
  document.getElementById('payment-form').onsubmit = async (e) => {
    e.preventDefault();
    const payload = { name: document.getElementById('pm-name').value, account: document.getElementById('pm-account').value, min_amount: parseFloat(document.getElementById('pm-min').value), max_amount: parseFloat(document.getElementById('pm-max').value) };
    const res = await api.safeFetch(isEdit ? `/api/admin/payment-methods/${pm.id}` : '/api/admin/payment-methods', { method: isEdit ? 'PUT' : 'POST', body: payload });
    if (res.ok) { window.closeModal(); await fetchData(); window.switchStoreTab('payments'); }
    else { alert(res.error); }
  };
};
window.deletePayment = async function(id) { if (!confirm('تأكيد الحذف؟')) return; const res = await api.safeFetch(`/api/admin/payment-methods/${id}`, { method: 'DELETE' }); if (res.ok) { window.closeModal(); await fetchData(); window.switchStoreTab('payments'); } };
