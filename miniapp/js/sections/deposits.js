import { safeFetch } from '../core/api.js';

let depositsState = {
    page: 1,
    hasNext: true,
    isLoading: false,
    items: [],
};

function getStatusBadge(status) {
  const s = (status || '').toLowerCase();
  if (['approved', 'completed', 'مكتمل', 'مقبول'].includes(s)) return '<span class="status-badge status-approved">مكتمل</span>';
  if (['rejected', 'مرفوض', 'ملغي'].includes(s)) return '<span class="status-badge status-rejected">مرفوض</span>';
  return '<span class="status-badge status-pending">قيد المراجعة</span>';
}

export async function loadDeposits() {
  const container = document.getElementById('deposits-list');
  if (!container) return;
  container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">جاري التحميل...</div>`;
  
  depositsState = { page: 1, hasNext: true, isLoading: false, items: [] };
  await fetchMoreDeposits(true);
}

async function fetchMoreDeposits(reset = false) {
  if (depositsState.isLoading || !depositsState.hasNext) return;
  
  depositsState.isLoading = true;
  const btn = document.getElementById('load-more-deposits');
  if (btn) btn.textContent = 'جاري التحميل...';

  try {
    const res = await safeFetch(`/api/deposits/?page=${depositsState.page}`);
    const fresh = res.items || [];
    
    depositsState.items = reset ? fresh : [...depositsState.items, ...fresh];
    depositsState.hasNext = !!res.has_next;
    depositsState.page += 1;

    renderDepositsList(depositsState.items);
    
    if (btn) {
      btn.style.display = depositsState.hasNext ? 'block' : 'none';
      btn.textContent = 'تحميل المزيد ↓';
    }
  } catch (e) {
    console.error("Deposits Fetch Error:", e);
  } finally {
    depositsState.isLoading = false;
  }
}

window.renderDeposits = function(filter) {
  let filtered = depositsState.items;
  if (filter !== 'all') {
    filtered = depositsState.items.filter(d => {
      const s = (d.status || '').toLowerCase();
      if (filter === 'completed' && ['approved', 'completed', 'مكتمل', 'مقبول'].includes(s)) return true;
      if (filter === 'rejected' && ['rejected', 'مرفوض', 'ملغي'].includes(s)) return true;
      if (filter === 'pending' && !['approved', 'completed', 'rejected', 'مرفوض', 'مكتمل', 'مقبول'].includes(s)) return true;
      return false;
    });
  }
  renderDepositsList(filtered);
};

function renderDepositsList(items) {
  const container = document.getElementById('deposits-list');
  if (items.length === 0) {
    container.innerHTML = `<div class="card" style="text-align:center; color:var(--text-muted);">لا توجد إيداعات.</div>`;
    return;
  }
  container.innerHTML = items.map(d => `
    <div class="list-item" data-id="${d.id}">
      <div class="list-item-info"><h4>إيداع #${d.id}</h4><span>${d.reference || 'بدون مرجع'}</span></div>
      <div style="text-align:left;"><div style="font-weight:800; color:var(--success); margin-bottom:6px;">$${Number(d.amount).toFixed(2)}</div>${getStatusBadge(d.status)}</div>
    </div>
  `).join('');
}

window.openDepositDetails = function(id) {
  const d = depositsState.items.find(x => x.id == id);
  if(d) window.showModal('deposit', d);
};

document.addEventListener('click', (e) => {
  if (e.target.id === 'load-more-deposits') {
    fetchMoreDeposits(false);
  }
});
