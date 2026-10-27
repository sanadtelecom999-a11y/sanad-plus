import { api } from '../core/api.js';

export async function renderSettings() {
  const container = document.getElementById('dashboard-container');
  
  container.innerHTML = `
    <div class="max-w-2xl mx-auto">
      <h2 class="text-2xl font-bold mb-6">إعدادات المتجر</h2>
      
      <div class="glass rounded-2xl p-6 border border-white/10">
        <form id="settings-form" class="space-y-6">
          
          <div>
            <label class="block text-sm mb-2 text-slate-300">اسم المتجر</label>
            <input type="text" id="set-store-name" class="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary" placeholder="مثال: SANAD+ Store">
          </div>

          <div>
            <label class="block text-sm mb-2 text-slate-300">سعر صرف الليرة السورية (للدولار)</label>
            <input type="number" id="set-exchange-rate" class="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary" placeholder="مثال: 15000">
          </div>

          <div class="flex items-center justify-between bg-slate-800/50 p-4 rounded-lg border border-white/5">
            <div>
              <h4 class="font-bold text-white">وضع الصيانة (Maintenance Mode)</h4>
              <p class="text-sm text-slate-400">عند تفعيله، سيتم إغلاق واجهة المستخدم (البوت/الميني آب) مؤقتاً.</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="set-maintenance" class="sr-only peer">
              <div class="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-danger"></div>
            </label>
          </div>

          <div id="settings-msg" class="text-sm hidden"></div>

          <button type="submit" id="settings-save-btn" class="w-full py-3 bg-primary text-slate-900 font-bold rounded-lg hover:bg-sky-400 transition">
            حفظ الإعدادات
          </button>
        </form>
      </div>
    </div>
  `;

  await loadSettings();

  document.getElementById('settings-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('settings-save-btn');
    const msg = document.getElementById('settings-msg');
    const storeName = document.getElementById('set-store-name').value;
    const exchangeRate = document.getElementById('set-exchange-rate').value;
    const maintenance = document.getElementById('set-maintenance').checked;

    if (!storeName || !exchangeRate || isNaN(exchangeRate)) {
      msg.textContent = 'يرجى إدخال بيانات صحيحة.';
      msg.className = 'text-sm text-danger block';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';
    msg.className = 'hidden';

    const res = await api.safeFetch('/api/admin/settings', {
      method: 'PUT',
      body: {
        store_name: storeName,
        exchange_rate: parseFloat(exchangeRate),
        maintenance_mode: maintenance
      }
    });

    btn.disabled = false;
    btn.textContent = 'حفظ الإعدادات';

    if (res.ok) {
      msg.textContent = '✅ تم حفظ الإعدادات بنجاح.';
      msg.className = 'text-sm text-success block';
      setTimeout(() => { msg.className = 'hidden'; }, 3000);
    } else {
      msg.textContent = '❌ فشل الحفظ: ' + res.error;
      msg.className = 'text-sm text-danger block';
    }
  };
}

async function loadSettings() {
  const res = await api.safeFetch('/api/admin/settings');
  if (res.ok && res.data) {
    document.getElementById('set-store-name').value = res.data.store_name || '';
    document.getElementById('set-exchange-rate').value = res.data.exchange_rate || '';
    document.getElementById('set-maintenance').checked = res.data.maintenance_mode === true;
  }
}
