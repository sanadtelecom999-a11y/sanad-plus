import { api } from '../core/api.js';
import { escapeHtml, formatCurrency } from '../core/utils.js';

let currentPage = 1;

export async function renderStore() {
  const container = document.getElementById('dashboard-container');
  
  container.innerHTML = `
    <div class="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
      <h2 class="text-2xl font-bold">إدارة المنتجات</h2>
      <button onclick="alert('سنقوم ببناء نافذة الإضافة في الخطوة القادمة!')" class="bg-primary text-slate-900 font-bold px-4 py-2 rounded-lg hover:bg-sky-400 transition">+ إضافة منتج</button>
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
    
    <!-- شريط الترقيم -->
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
        <button onclick="alert('سنقوم ببناء التعديل في الخطوة القادمة!')" class="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm transition">تعديل</button>
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
    html += `
      <button onclick="window.changePage(${i})" 
              class="px-3 py-1 rounded ${isActive ? 'bg-primary text-slate-900 font-bold' : 'bg-white/10 text-white hover:bg-white/20'} transition">
        ${i}
      </button>
    `;
  }
  
  controls.innerHTML = html;
}

window.changePage = function(page) {
  if (page === currentPage) return;
  loadProducts(page);
};
