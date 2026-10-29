import { safeFetch } from '../core/api.js';

let ordersState = {
    page: 1,
    hasNext: true,
    isLoading: false,
    items: [],
};

function getStatusBadge(status) {
  const s = (status || '').toLowerCase();
  if (['completed', 'approved', 'مكتمل', 'delivered'].includes(s)) return '<span class="status-badge status-approved">مكتمل</span>';
  if (['rejected', 'cancelled', 'مرفوض', 'ملغي'].includes(s)) return '<span class="status-badge status-rejected">مرفوض</span>';
  return '<span class="status-badge status-pending">قيد التنفيذ</span>';
}

export async function loadOrders() {
  const container = document.getElementById('orders-list');
  if (!container) return;
  container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">جاري التحميل...</div>`;
  
  ordersState = { page: 1, hasNext: true, isLoading: false, items: [] };
  await fetchMoreOrders(true);
}

async function fetchMoreOrders(reset = false) {
  if (ordersState.isLoading || !ordersState.hasNext) return;
  
  ordersState.isLoading = true;
  const btn = document.getElementById('load-more-orders');
  if (btn) btn.textContent = 'جاري التحميل...';

  try {
    const res = await safeFetch(`/api/orders/?page=${ordersState.page}`);
    const fresh = res.items || [];
    
    ordersState.items = reset ? fresh : [...ordersState.items, ...fresh];
    ordersState.hasNext = !!res.has_next;
    ordersState.page += 1;

    renderOrdersList(ordersState.items);
    
    if (btn) {
      btn.style.display = ordersState.hasNext ? 'block' : 'none';
      btn.textContent = 'تحميل المزيد ↓';
    }
  } catch (e) {
    console.error("Orders Fetch Error:", e);
  } finally {
    ordersState.isLoading = false;
  }
}

window.renderOrders = function(filter) {
  const container = document.getElementById('orders-list');
  let filtered = ordersState.items;
  
  if (filter !== 'all') {
    filtered = ordersState.items.filter(o => {
      const s = (o.status || '').toLowerCase();
      if (filter === 'completed' && ['completed', 'approved', 'مكتمل', 'delivered'].includes(s)) return true;
      if (filter === 'rejected' && ['rejected', 'cancelled', 'مرفوض', 'ملغي'].includes(s)) return true;
      if (filter === 'pending' && !['completed', 'approved', 'rejected', 'cancelled', 'مكتمل', 'مرفوض', 'delivered', 'ملغي'].includes(s)) return true;
      return false;
    });
  }
  renderOrdersList(filtered);
};

function renderOrdersList(items) {
  const container = document.getElementById('orders-list');
  if (items.length === 0) {
    container.innerHTML = `<div class="card" style="text-align:center; color:var(--text-muted);">لا توجد طلبات.</div>`;
    return;
  }
  container.innerHTML = items.map(o => `
    <div class="list-item" data-id="${o.id}">
      <div class="list-item-info"><h4>${o.product_name}</h4><span>طلب #${o.order_number}</span></div>
      <div style="text-align:left;"><div style="font-weight:800; color:var(--primary); margin-bottom:6px;">$${Number(o.amount).toFixed(2)}</div>${getStatusBadge(o.status)}</div>
    </div>
  `).join('');
}

window.openOrderDetails = function(id) {
  const o = ordersState.items.find(x => x.id == id);
  if(o) window.showModal('order', o);
};

document.addEventListener('click', (e) => {
  if (e.target.id === 'load-more-orders') {
    fetchMoreOrders(false);
  }
});
