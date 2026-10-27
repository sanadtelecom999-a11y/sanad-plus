import { api } from '../core/api.js';
import { escapeHtml, formatCurrency, isValidPrice } from '../core/utils.js';

let currentPage = 1;
let allCategories = [];

export async function renderStore() {
  const container = document.getElementById('dashboard-container');
  
  container.innerHTML = `
    <div class="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
      <h2 class="text-2xl font-bold">إدارة المنتجات</h2>
      <button onclick="window.openProductModal()" class="bg-primary text-slate-900 font-bold px-4 py-2 rounded-lg hover:bg-sky-400 transition">+ إضافة منتج</button>
    </div>

    <div class="glass rounded-2xl border border-white/10 overflow-hidden mb-4">
      <div class="overflow-x-auto">
        <table class="w-full text-right">
          <thead class="bg-white/5 border-b border-white/10">
            <tr>
              <th class="p-4 font-bold text-slate-300">الصورة</th>
              <th class="p-4 font-bold text-slate-300">الاسم</th>
              <th class="p-4 font-bold text-slate-300">القسم</th>
              <th class="p-4 font-bold text-slate-300">السعر</th>
              <th class="p-4 font-bold text-slate-300">الكمية</th>
              <th class="p-4 font-bold text-slate-300 text-left">إجراءات</th>
            </tr>
          </thead>
          <tbody id="products-table-body">
            <tr><td colspan="6" class="text-center p-6 text-slate-400">جاري التحميل...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <div id="pagination-controls" class="flex justify-center items-center gap-2"></div>
  `;

  await fetchCategories();
  await loadProducts(currentPage);
}

async function fetchCategories() {
  const res = await api.safeFetch('/api/admin/categories');
  if (res.ok) allCategories = res.data || [];
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
    tbody.innerHTML = `<tr><td colspan="6" class="text-center p-6 text-slate-400">لا توجد منتجات حالياً.</td></tr>`;
    renderPagination(0, 0);
    return;
  }

  tbody.innerHTML = items.map(p => `
    <tr class="border-b border-white/5 hover:bg-white/5 transition">
      <td class="p-4">
        ${p.image 
          ? `<img src="${escapeHtml(p.image)}" class="w-10 h-10 rounded object-cover border border-white/10" alt="img" />` 
          : '<div class="w-10 h-10 rounded bg-slate-700 flex items-center justify-center text-xs text-slate-400">بدون</div>'}
      </td>
      <td class="p-4 font-bold">${escapeHtml(p.name)}</td>
      <td class="p-4 text-slate-400">${escapeHtml(p.category_name)}</td>
      <td class="p-4 text-success font-bold">${formatCurrency(p.base_price)}</td>
      <td class="p-4">${p.base_quantity} ${escapeHtml(p.unit_name)}</td>
      <td class="p-4 text-left">
        <button onclick='window.openProductModal(${JSON.stringify(p)})' class="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm transition">تعديل</button>
      </td>
    </tr>
  `).join('');

  renderPagination(pages, total);
}

function renderPagination(pages, total) {
  const controls = document.getElementById('pagination-controls');
  if (pages <= 1) {
    controls.innerHTML = `<span class="text-slate-400 text-sm">إجمالي المنتجات: ${total}</span>`;
    return;
  }

  let html = `<span class="text-slate-400 text-sm mr-4">إجمالي: ${total}</span>`;
  for (let i = 1; i <= pages; i++) {
    const isActive = i === currentPage;
    html += `<button onclick="window.changePage(${i})" class="px-3 py-1 rounded ${isActive ? 'bg-primary text-slate-900 font-bold' : 'bg-white/10 text-white hover:bg-white/20'} transition">${i}</button>`;
  }
  controls.innerHTML = html;
}

window.changePage = function(page) {
  if (page === currentPage) return;
  loadProducts(page);
};

// ── إضافة / تعديل منتج ──
window.openProductModal = function(product = null) {
  const isEdit = product !== null;
  const modal = document.getElementById('detail-modal');
  const content = document.getElementById('modal-content');
  
  modal.style.display = 'flex';
  
  const categoriesOptions = allCategories.map(c => 
    `<option value="${c.id}" ${isEdit && product.category_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
  ).join('');

  content.innerHTML = `
    <h3 class="text-xl font-bold mb-4">${isEdit ? 'تعديل منتج' : 'إضافة منتج جديد'}</h3>
    
    <form id="product-form" class="space-y-4">
      <div>
        <label class="block text-sm mb-1 text-slate-400">اسم المنتج</label>
        <input type="text" id="p-name" required value="${isEdit ? escapeHtml(product.name) : ''}" class="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary outline-none">
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm mb-1 text-slate-400">القسم</label>
          <select id="p-category" required class="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary outline-none">
            <option value="">اختر القسم...</option>
            ${categoriesOptions}
          </select>
        </div>
        <div>
          <label class="block text-sm mb-1 text-slate-400">اسم الوحدة (قطعة/ألف)</label>
          <input type="text" id="p-unit" required value="${isEdit ? escapeHtml(product.unit_name) : 'قطعة'}" class="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary outline-none">
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm mb-1 text-slate-400">السعر ($)</label>
          <input type="number" step="0.01" id="p-price" required value="${isEdit ? product.base_price : ''}" class="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary outline-none">
        </div>
        <div>
          <label class="block text-sm mb-1 text-slate-400">الكمية</label>
          <input type="number" id="p-quantity" required value="${isEdit ? product.base_quantity : '1'}" class="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary outline-none">
        </div>
      </div>

      <div>
        <label class="block text-sm mb-1 text-slate-400">رابط الصورة (URL)</label>
        <input type="url" id="p-image" value="${isEdit ? escapeHtml(product.image || '') : ''}" placeholder="https://..." class="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary outline-none">
      </div>

      <div id="form-error" class="text-danger text-sm hidden"></div>

      <div class="flex gap-4 mt-6">
        <button type="submit" class="flex-1 py-3 bg-primary text-slate-900 font-bold rounded-lg hover:bg-sky-400 transition">
          ${isEdit ? 'حفظ التعديلات' : 'إضافة المنتج'}
        </button>
        ${isEdit ? `<button type="button" onclick="window.deleteProduct(${product.id})" class="px-4 py-3 bg-danger/20 text-danger font-bold rounded-lg hover:bg-danger/30 transition">حذف</button>` : ''}
      </div>
    </form>
  `;

  document.getElementById('product-form').onsubmit = async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('form-error');
    errorEl.classList.add('hidden');

    const priceVal = document.getElementById('p-price').value;
    if (!isValidPrice(priceVal)) {
      errorEl.textContent = 'السعر يجب أن يكون رقماً موجباً';
      errorEl.classList.remove('hidden');
      return;
    }

    const payload = {
      name: document.getElementById('p-name').value,
      category_id: parseInt(document.getElementById('p-category').value),
      base_price: parseFloat(priceVal),
      base_quantity: parseInt(document.getElementById('p-quantity').value),
      image: document.getElementById('p-image').value,
      unit_name: document.getElementById('p-unit').value
    };

    const url = isEdit ? `/api/admin/products/${product.id}` : '/api/admin/products';
    const method = isEdit ? 'PUT' : 'POST';
    
    const res = await api.safeFetch(url, { method, body: payload });
    
    if (res.ok) {
      window.closeModal();
      loadProducts(currentPage);
    } else {
      errorEl.textContent = res.error;
      errorEl.classList.remove('hidden');
    }
  };
};

window.deleteProduct = async function(id) {
  if (!confirm('هل أنت متأكد من حذف هذا المنتج نهائياً؟')) return;
  
  const res = await api.safeFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
  if (res.ok) {
    window.closeModal();
    loadProducts(currentPage);
  } else {
    alert('خطأ في الحذف: ' + res.error);
  }
};
