import { api } from '../core/api.js';
import { formatCurrency } from '../core/utils.js';

export async function renderDashboard() {
  const container = document.getElementById('dashboard-container');
  container.innerHTML = `<div style="text-align:center; padding:50px; color:#91a7c2;">جاري تحميل الإحصائيات...</div>`;

  const res = await api.getStats();
  if (!res.ok) {
    container.innerHTML = `<div style="color:#fb7185; text-align:center; margin-top:50px;">فشل في جلب الإحصائيات: ${res.error}</div>`;
    return;
  }

  const data = res.data;

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
      ${createStatCard('إجمالي الطلبات', data.total_orders, '#38bdf8')}
      ${createStatCard('إجمالي الإيرادات', formatCurrency(data.revenue), '#34d399')}
      ${createStatCard('الإيداعات المعتمدة', data.total_deposits, '#38bdf8')}
      ${createStatCard('إجمالي المستخدمين', data.total_users, '#a78bfa')}
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
      <div class="sanad-card" style="padding: 20px;">
        <h3 style="margin-top:0; font-size:15px; color:#f3f8ff;">حالات الطلبات</h3>
        <div style="height: 250px; position: relative;"><canvas id="ordersChart"></canvas></div>
      </div>
      <div class="sanad-card" style="padding: 20px;">
        <h3 style="margin-top:0; font-size:15px; color:#f3f8ff;">الإيرادات (آخر 7 أيام)</h3>
        <div style="height: 250px; position: relative;"><canvas id="revenueChart"></canvas></div>
      </div>
    </div>
  `;

  drawOrdersChart(data.orders_chart || [0,0,0]);
  drawRevenueChart(data.revenue_chart || [0,0,0,0,0,0,0]);
}

function createStatCard(title, value, color) {
  return `
    <div class="sanad-card" style="padding: 20px;">
      <p style="color:#91a7c2; font-size:13px; margin:0 0 8px 0;">${title}</p>
      <div class="sanad-stat-value" style="color:${color}">${value}</div>
    </div>
  `;
}

function drawOrdersChart(data) {
  const ctx = document.getElementById('ordersChart').getContext('2d');
  new Chart(ctx, { type: 'doughnut', data: { labels: ['مكتمل', 'معلق', 'مرفوض'], datasets: [{ data: data, backgroundColor: ['#34d399', '#38bdf8', '#fb7185'], borderWidth: 0, hoverOffset: 4 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#91a7c2', font: { family: 'Cairo' } } } } } });
}
function drawRevenueChart(data) {
  const ctx = document.getElementById('revenueChart').getContext('2d');
  new Chart(ctx, { type: 'line', data: { labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'], datasets: [{ label: 'الإيرادات', data: data, borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.15)', borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: '#38bdf8' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#91a7c2', font: { family: 'Cairo' } } }, x: { grid: { display: false }, ticks: { color: '#91a7c2', font: { family: 'Cairo' } } } } } });
}
