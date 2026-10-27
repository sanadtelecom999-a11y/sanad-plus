import { api } from '../core/api.js';
import { escapeHtml, formatCurrency, isValidPrice } from '../core/utils.js';

let currentTab = 'products';
let currentPage = 1;
let allCategories = [];
let allPayments = [];

export async function renderStore() {
  const container = document.getElementById('dashboard-container');
  
  container.innerHTML = `
    <div class="mb-6 flex gap-4 border-b border-white/10 pb-4">
      <button id="tab-products" onclick="window.switchStoreTab('products')" class="px-4 py-2 rounded-lg font-bold transition">المنتجات</button>
      <button id="tab-categories" onclick="window.switchStoreTab('categories')" class="px-4 py-2 rounded-lg font-bold transition">الأقسام</button>
      <button id="tab-payments" onclick="window.switchStoreTab('payments')" class="px-4 py-2 rounded-lg font-bold transition">طرق الدفع</button>
    </div>
    <div id="store-content"></div>
  `;

  await fetchData();
  window.switchStoreTab(currentTab);
}

async function fetchData() {
  const [catRes, payRes] = await Promise.all([
    api.safeFetch('/api/admin/categories'),
    api.safeFetch('/api/admin/payment-methods')
  ]);
  if (catRes.ok) allCategories = catRes.data || [];
  if (payRes.ok) allPayments = payRes.data || [];
}

window.switchStoreTab = function(tab) {
  currentTab = tab;
  
  ['products', 'categories', 'payments'].forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    if (t === tab) btn.className = 'px-4 py-2 rounded-lg bg-primary text-slate-900 font-bold transition';
    else btn.className = 'px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition';
  });

  const content = document.getElementById('store-content');
  if (tab === 'products') renderProductsView(content);
  else if (tab === 'categories') renderCategoriesView(content);
  else if (tab === 'payments') renderPaymentsView(content);
};

// ═══════════════════════════════════════════════════
// 1. المنتجات
// ═══════════════════════════════════════════════════
async function renderProductsView(container) {
  container.innerHTML = `
    <div class="mb-4 flex justify-between items-center">
      <h2 class="text-xl font-bold">إدارة المنتجات</h2>
      <button onclick="window.openProductModal()" class="bg-primary text-slate-900 font-bold px-4 py-2 rounded-lg hover:bg-sky-400 transition">+ إضافة منتج</button>
    </div>
    <div class="glass rounded-2xl border border-white/10 overflow-hidden mb-4">
      <div class="overflow-x-auto">
        <table class="w-full text-right">
          <thead class="bg-white/5 border-b border-white/10">
            <tr>
              <th class="p-4 text-slate-300">الصورة</th>
              <th class="p-4 text-slate-300">الاسم</th>
              <th class="p-4 text-slate-300">القسم</th>
              <th class="p-4 text-slate-300">السعر</th>
              <th class="p-4 text-slate-300">الكمية</th>
              <th class="p-4 text-slate-300 text-left">إجراءات</th>
            </tr>
          </thead>
          <tbody id="products-table-body"><tr><td colspan="6" class="text-center p-6 text-slate-400">جاري التحميل...</td></tr></tbody>
        </table>
      </div>
    </div>
    <div id="pagination-controls" class="flex justify-center items-center gap-2"></div>
  `;
  await loadProducts(currentPage);
}

async function loadProducts(page) {
  currentPage = page;
  const tbody = document.getElementById('products-table-body');
  tbody.innerHTML = `<tr><td colspan="6" class="text-center p-6 text-slate-400">جاري التحميل...</td></tr>`;

  const res = await api.safeFetch(`/api/admin/products?page=${page}&limit=10`);
  if (!res.ok) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center p-6 text-red-400">فشل الجلب: ${res.error}</td></tr>`;
    return;
  }

  const { items, total, pages } = res.data;
  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center p-6 text-slate-400">لا توجد منتجات.</td></tr>`;
    document.getElementById('pagination-controls').innerHTML = '';
    return;
  }

  tbody.innerHTML = items.map(p => `
    <tr class="border-b border-white/5 hover:bg-white/5 transition">
      <td class="p-4">${p.image ? `<img src="${escapeHtml(p.image)}" class="w-10 h-10 rounded object-cover" />` : '<div class="w-10 h-10 rounded bg-slate-700"></div>'}</td>
      <td class="p-4 font-bold">${escapeHtml(p.name)}</td>
      <td class="p-4 text-slate-400">${escapeHtml(p.category_name)}</td>
      <td class="p-4 text-success font-bold">${formatCurrency(p.base_price)}</td>
      <td class="p-4">${p.base_quantity} ${escapeHtml(p.unit_name)}</td>
      <td class="p-4 text-left"><button onclick='window.openProductModal(${JSON.stringify(p)})' class="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm transition">تعديل</button></td>
    </tr>
  `).join('');

  if (pages > 1) {
    let html = `<span class="text-slate-400 text-sm mr-4">إجمالي: ${total}</span>`;
    for (let i = 1; i <= pages; i++) {
      html += `<button onclick="window.changePage(${i})" class="px-3 py-1 rounded ${i === currentPage ? 'bg-primary text-slate-900 font-bold' : 'bg-white/10 text-white hover:bg-white/20'} transition">${i}</button>`;
    }
    document.getElementById('pagination-controls').innerHTML = html;
  } else {
    document.getElementById('pagination-controls').innerHTML = `<span class="text-slate-400 text-sm">إجمالي المنتجات: ${total}</span>`;
  }
}

window.changePage = function(page) {
  if (page === currentPage) return;
  loadProducts(page);
};

window.openProductModal = function(product = null) {
  const isEdit = product !== null;
  const modal = document.getElementById('detail-modal');
  const content = document.getElementById('modal-content');
  modal.style.display = 'flex';
  
  const categoriesOptions = allCategories.map(c => 
    `<option value="${c.id}" ${isEdit && product.category_name === c.name ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
  ).join('');

  content.innerHTML = `
    <h3 class="text-xl font-bold mb-4">${isEdit ? 'تعديل منتج' : 'إضافة منتج جديد'}</h3>
    <form id="product-form" class="space-y-4">
      <div><label class="block text-sm mb-1 text-slate-400">اسم المنتج</label><input type="text" id="p-name" required value="${isEdit ? escapeHtml(product.name) : ''}" class="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm mb-1 text-slate-400">القسم</label><select id="p-category" required class="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"><option value="">اختر القسم...</option>${categoriesOptions}</select></div>
        <div><label class="block text-sm mb-1 text-slate-400">الوحدة</label><input type="text" id="p-unit" required value="${isEdit ? escapeHtml(product.unit_name) : 'قطعة'}" class="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm mb-1 text-slate-400">السعر ($)</label><input type="number" step="0.01" id="p-price" required value="${isEdit ? product.base_price : ''}" class="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"></div>
        <div><label class="block text-sm mb-1 text-slate-400">الكمية</label><input type="number" id="p-quantity" required value="${isEdit ? product.base_quantity : '1'}" class="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"></div>
      </div>
      <div><label class="block text-sm mb-1 text-slate-400">رابط الصورة (URL)</label><input type="url" id="p-image" value="${isEdit ? escapeHtml(product.image || '') : ''}" class="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"></div>
      <div id="form-error" class="text-danger text-sm hidden"></div>
      <div class="flex gap-4 mt-6">
        <button type="submit" class="flex-1 py-3 bg-primary text-slate-900 font-bold rounded-lg hover:bg-sky-400 transition">${isEdit ? 'حفظ' : 'إضافة'}</button>
        ${isEdit ? `<button type="button" onclick="window.deleteProduct(${product.id})" class="px-4 py-3 bg-danger/20 text-danger font-bold rounded-lg hover:bg-danger/30 transition">حذف</button>` : ''}
      </div>
    </form>
  `;

  document.getElementById('product-form').onsubmit = async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('form-error');
    errorEl.classList.add('hidden');

    const payload = {
      name: document.getElementById('p-name').value,
      category_id: parseInt(document.getElementById('p-category').value),
      base_price: parseFloat(document.getElementById('p-price').value),
      base_quantity: parseInt(document.getElementById('p-quantity').value),
      image: document.getElementById('p-image').value,
      unit_name: document.getElementById('p-unit').value
    };

    const url = isEdit ? `/api/admin/products/${product.id}` : '/api/admin/products';
    const method = isEdit ? 'PUT' : 'POST';
    const res = await api.safeFetch(url, { method, body: payload });
    
    if (res.ok) { window.closeModal(); loadProducts(currentPage); await fetchData(); }
    else { errorEl.textContent = res.error; errorEl.classList.remove('hidden'); }
  };
};

window.deleteProduct = async function(id) {
  if (!confirm('تأكيد الحذف؟')) return;
  const res = await api.safeFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
  if (res.ok) { window.closeModal(); loadProducts(currentPage); }
};

// ═══════════════════════════════════════════════════
// 2. الأقسام (Categories)
// ═══════════════════════════════════════════════════
function renderCategoriesView(container) {
  container.innerHTML = `
    <div class="mb-4 flex justify-between items-center">
      <h2 class="text-xl font-bold">إدارة الأقسام</h2>
      <button onclick="window.openCategoryModal()" class="bg-primary text-slate-900 font-bold px-4 py-2 rounded-lg hover:bg-sky-400 transition">+ إضافة قسم</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="categories-grid">
      ${allCategories.map(c => `
        <div class="glass rounded-xl p-4 border border-white/10 flex flex-col items-center text-center">
          ${c.image ? `<img src="${escapeHtml(c.image)}" class="w-16 h-16 rounded-full object-cover mb-3" />` : '<div class="w-16 h-16 rounded-full bg-slate-700 mb-3"></div>'}
          <h3 class="font-bold text-lg mb-2">${escapeHtml(c.name)}</h3>
          <button onclick='window.openCategoryModal(${JSON.stringify(c)})' class="mt-auto w-full py-2 bg-white/10 hover:bg-white/20 rounded text-sm transition">تعديل</button>
        </div>
      `).join('') || '<div class="col-span-full text-center text-slate-400 py-10">لا توجد أقسام.</div>'}
    </div>
  `;
}

window.openCategoryModal = function(category = null) {
  const isEdit = category !== null;
  const modal = document.getElementById('detail-modal');
  const content = document.getElementById('modal-content');
  modal.style.display = 'flex';

  content.innerHTML = `
    <h3 class="text-xl font-bold mb-4">${isEdit ? 'تعديل قسم' : 'إضافة قسم جديد'}</h3>
    <form id="category-form" class="space-y-4">
      <div><label class="block text-sm mb-1 text-slate-400">اسم القسم</label><input type="text" id="c-name" required value="${isEdit ? escapeHtml(category.name) : ''}" class="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"></div>
      <div><label class="block text-sm mb-1 text-slate-400">رابط الصورة (URL)</label><input type="url" id="c-image" value="${isEdit ? escapeHtml(category.image || '') : ''}" class="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"></div>
      <div id="form-error" class="text-danger text-sm hidden"></div>
      <div class="flex gap-4 mt-6">
        <button type="submit" class="flex-1 py-3 bg-primary text-slate-900 font-bold rounded-lg hover:bg-sky-400 transition">${isEdit ? 'حفظ' : 'إضافة'}</button>
        ${isEdit ? `<button type="button" onclick="window.deleteCategory(${category.id})" class="px-4 py-3 bg-danger/20 text-danger font-bold rounded-lg">حذف</button>` : ''}
      </div>
    </form>
  `;

  document.getElementById('category-form').onsubmit = async (e) => {
    e.preventDefault();
    const payload = { name: document.getElementById('c-name').value, image: document.getElementById('c-image').value };
    const url = isEdit ? `/api/admin/categories/${category.id}` : '/api/admin/categories';
    const method = isEdit ? 'PUT' : 'POST';
    const res = await api.safeFetch(url, { method, body: payload });
    
    if (res.ok) { window.closeModal(); await fetchData(); window.switchStoreTab('categories'); }
    else { alert(res.error); }
  };
};

window.deleteCategory = async function(id) {
  if (!confirm('تأكيد الحذف؟ سيتم حذف القسم نهائياً.')) return;
  const res = await api.safeFetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
  if (res.ok) { window.closeModal(); await fetchData(); window.switchStoreTab('categories'); }
};

// ═══════════════════════════════════════════════════
// 3. طرق الدفع (Payment Methods)
// ═══════════════════════════════════════════════════
function renderPaymentsView(container) {
  container.innerHTML = `
    <div class="mb-4 flex justify-between items-center">
      <h2 class="text-xl font-bold">طرق الدفع</h2>
      <button onclick="window.openPaymentModal()" class="bg-primary text-slate-900 font-bold px-4 py-2 rounded-lg hover:bg-sky-400 transition">+ إضافة طريقة</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="payments-grid">
      ${allPayments.map(p => `
        <div class="glass rounded-xl p-5 border border-white/10">
          <h3 class="font-bold text-lg mb-2 text-primary">${escapeHtml(p.name)}</h3>
          <p class="text-slate-300 font-mono mb-4">${escapeHtml(p.account)}</p>
          <div class="flex justify-between text-sm text-slate-400 mb-4 border-t border-white/10 pt-3">
            <span>الحد الأدنى: <b class="text-white">${formatCurrency(p.min_amount)}</b></span>
            <span>الحد الأقصى: <b class="text-white">${formatCurrency(p.max_amount)}</b></span>
          </div>
          <button onclick='window.openPaymentModal(${JSON.stringify(p)})' class="w-full py-2 bg-white/10 hover:bg-white/20 rounded text-sm transition">تعديل</button>
        </div>
      `).join('') || '<div class="col-span-full text-center text-slate-400 py-10">لا توجد طرق دفع.</div>'}
    </div>
  `;
}

window.openPaymentModal = function(pm = null) {
  const isEdit = pm !== null;
  const modal = document.getElementById('detail-modal');
  const content = document.getElementById('modal-content');
  modal.style.display = 'flex';

  content.innerHTML = `
    <h3 class="text-xl font-bold mb-4">${isEdit ? 'تعديل طريقة دفع' : 'إضافة طريقة دفع'}</h3>
    <form id="payment-form" class="space-y-4">
      <div><label class="block text-sm mb-1 text-slate-400">اسم الطريقة</label><input type="text" id="pm-name" required value="${isEdit ? escapeHtml(pm.name) : ''}" class="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"></div>
      <div><label class="block text-sm mb-1 text-slate-400">رقم الحساب / المحفظة</label><input type="text" id="pm-account" required value="${isEdit ? escapeHtml(pm.account) : ''}" class="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="block text-sm mb-1 text-slate-400">الحد الأدنى ($)</label><input type="number" step="0.01" id="pm-min" required value="${isEdit ? pm.min_amount : '0'}" class="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"></div>
        <div><label class="block text-sm mb-1 text-slate-400">الحد الأقصى ($)</label><input type="number" step="0.01" id="pm-max" required value="${isEdit ? pm.max_amount : '0'}" class="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"></div>
      </div>
      <div class="flex gap-4 mt-6">
        <button type="submit" class="flex-1 py-3 bg-primary text-slate-900 font-bold rounded-lg hover:bg-sky-400 transition">${isEdit ? 'حفظ' : 'إضافة'}</button>
        ${isEdit ? `<button type="button" onclick="window.deletePayment(${pm.id})" class="px-4 py-3 bg-danger/20 text-danger font-bold rounded-lg">حذف</button>` : ''}
      </div>
    </form>
  `;

  document.getElementById('payment-form').onsubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('pm-name').value,
      account: document.getElementById('pm-account').value,
      min_amount: parseFloat(document.getElementById('pm-min').value),
      max_amount: parseFloat(document.getElementById('pm-max').value)
    };
    const url = isEdit ? `/api/admin/payment-methods/${pm.id}` : '/api/admin/payment-methods';
    const method = isEdit ? 'PUT' : 'POST';
    const res = await api.safeFetch(url, { method, body: payload });
    
    if (res.ok) { window.closeModal(); await fetchData(); window.switchStoreTab('payments'); }
    else { alert(res.error); }
  };
};

window.deletePayment = async function(id) {
  if (!confirm('تأكيد الحذف؟')) return;
  const res = await api.safeFetch(`/api/admin/payment-methods/${id}`, { method: 'DELETE' });
  if (res.ok) { window.closeModal(); await fetchData(); window.switchStoreTab('payments'); }
};
