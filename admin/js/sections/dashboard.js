import { api } from '../core/api.js';
import { formatCurrency } from '../core/utils.js';

export async function renderDashboard() {
  const container = document.getElementById('dashboard-container');
  
  const res = await api.getStats();
  
  if (!res.ok) {
    container.innerHTML = `<div class="text-red-400 text-center mt-10">فشل في جلب الإحصائيات: ${res.error}</div>`;
    return;
  }

  const data = res.data;
  console.log('Dashboard Data:', data);

  // بناء الواجهة
  container.innerHTML = `
    <!-- بطاقات الإحصائيات -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      ${createStatCard('إجمالي الطلبات', data.total_orders, 'primary', '📦')}
      ${createStatCard('إجمالي الإيرادات', formatCurrency(data.revenue), 'success', '💰')}
      ${createStatCard('الإيداعات المعتمدة', data.total_deposits, 'primary', '✅')}
      ${createStatCard('إجمالي المستخدمين', data.total_users, 'danger', '👥')}
    </div>

    <!-- الرسوم البيانية -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="glass rounded-2xl p-6 border border-white/10 lg:col-span-1">
        <h3 class="text-lg font-bold mb-4">حالات الطلبات</h3>
        <div class="relative h-64">
          <canvas id="ordersChart"></canvas>
        </div>
      </div>
      
      <div class="glass rounded-2xl p-6 border border-white/10 lg:col-span-2">
        <h3 class="text-lg font-bold mb-4">الإيرادات (آخر 7 أيام)</h3>
        <div class="relative h-64">
          <canvas id="revenueChart"></canvas>
        </div>
      </div>
    </div>
  `;

  // رسم المخططات
  drawOrdersChart(data.orders_chart || [0,0,0]);
  drawRevenueChart(data.revenue_chart || [0,0,0,0,0,0,0]);
}

function createStatCard(title, value, color, icon) {
  const colorMap = {
    primary: 'text-primary',
    success: 'text-success',
    danger: 'text-danger',
  };
  return `
    <div class="glass rounded-2xl p-6 border border-white/10 flex items-center justify-between">
      <div>
        <p class="text-slate-400 text-sm mb-1">${title}</p>
        <h3 class="text-3xl font-bold ${colorMap[color]}">${value}</h3>
      </div>
      <div class="text-4xl opacity-50">${icon}</div>
    </div>
  `;
}

function drawOrdersChart(data) {
  const ctx = document.getElementById('ordersChart').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['مكتمل', 'معلق', 'مرفوض'],
      datasets: [{
        data: data,
        backgroundColor: ['#10b981', '#38bdf8', '#ef4444'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Cairo' } } }
      }
    }
  });
}

function drawRevenueChart(data) {
  const ctx = document.getElementById('revenueChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
      datasets: [{
        label: 'الإيرادات',
        data: data,
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#38bdf8'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { 
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#94a3b8', font: { family: 'Cairo' } }
        },
        x: { 
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { family: 'Cairo' } }
        }
      }
    }
  });
}
