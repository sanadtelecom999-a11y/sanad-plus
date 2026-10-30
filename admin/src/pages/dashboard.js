import { apiFetch } from '../api.js';
let myChart = null;

export async function renderDashboard(container) {
  container.innerHTML = `
    <div class="grid-3">
      <div class="card-glass"><div class="stat-title"><span>المستخدمون</span><i data-lucide="users" style="color:var(--primary-500)"></i></div><div class="stat-value sensitive-data" id="stat-users">0</div></div>
      <div class="card-glass"><div class="stat-title"><span>الطلبات</span><i data-lucide="shopping-cart" style="color:var(--warning)"></i></div><div class="stat-value sensitive-data" id="stat-orders">0</div></div>
      <div class="card-glass"><div class="stat-title"><span>الإيداعات</span><i data-lucide="credit-card" style="color:var(--success)"></i></div><div class="stat-value sensitive-data" id="stat-deposits">0</div></div>
    </div>
    <div class="grid-2">
      <div class="card-glass"><h3 style="margin-bottom:20px;font-size:16px;">حركة الطلبات (تجريبي)</h3><canvas id="salesChart" height="80"></canvas></div>
      <div class="card-glass"><div style="display:flex;justify-content:space-between;margin-bottom:15px;"><h3 style="font-size:16px;">النشاط الأخير</h3><button class="btn btn-secondary btn-sm" onclick="window.switchPage('audit')">عرض الكل</button></div><div id="recent-activity" style="display:flex;flex-direction:column;gap:12px;"></div></div>
    </div>`;
  lucide.createIcons();

  // جلب الإحصائيات
  try { 
    const s = await apiFetch('/api/admin/stats'); 
    document.getElementById('stat-users').innerText = s.total_users||0; 
    document.getElementById('stat-orders').innerText = s.total_orders||0; 
    document.getElementById('stat-deposits').innerText = s.total_deposits||0; 
  } catch(e){}

  initChart();

  // جلب النشاط
  try {
    const logs = await apiFetch('/api/admin/audit-logs');
    const recent = Array.isArray(logs) ? logs.slice(0, 5) : [];
    const actContainer = document.getElementById('recent-activity');
    actContainer.innerHTML = recent.length ? '' : '<p style="color:var(--text-muted);font-size:13px;">لا يوجد نشاط حديث.</p>';
    recent.forEach(l => {
      actContainer.innerHTML += `<div style="display:flex;gap:10px;border-bottom:1px solid var(--border-soft);padding-bottom:10px;"><div style="width:8px;height:8px;border-radius:50%;background:var(--primary-500);margin-top:6px;"></div><div><div style="font-size:13px;font-weight:600;">${l.action}</div><div style="font-size:11px;color:var(--text-muted);">${new Date(l.created_at).toLocaleTimeString('ar-SY')}</div></div></div>`;
    });
  } catch(e){}
}

function initChart() {
  const ctx = document.getElementById('salesChart');
  if(!ctx) return;
  if(myChart) myChart.destroy();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#A9BED0' : '#64748B';
  const gridColor = isDark ? 'rgba(36, 66, 93, 0.5)' : '#E2E8F0';
  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 150);
  gradient.addColorStop(0, 'rgba(0, 160, 233, 0.5)');
  gradient.addColorStop(1, 'rgba(0, 160, 233, 0)');
  myChart = new Chart(ctx, {
    type: 'line',
    data: { labels: ['السبت','الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'], datasets: [{ label: 'الطلبات', data: [12,19,15,25,22,30,28], borderColor: '#00A0E9', backgroundColor: gradient, borderWidth: 3, pointBackgroundColor: '#00A0E9', pointBorderColor: isDark ? '#0A1B2E' : '#FFF', pointBorderWidth: 2, pointRadius: 4, fill: true, tension: 0.4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: textColor, font: { family: 'Cairo' } }, grid: { display: false } }, y: { ticks: { color: textColor, font: { family: 'Cairo' } }, grid: { color: gridColor, drawBorder: false } } } }
  });
}
