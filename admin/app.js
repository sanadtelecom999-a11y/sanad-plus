const API_BASE = 'https://sanad-plus-backend.onrender.com';
let currentSessionId = null;
let dashboardChartInstance = null;
let currentInboxTab = 'orders';
let cachedItems = {};

// (أضف دالة showToast و safeFetch هنا أيضاً)
function showToast(message, type = 'error') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div'); container.id = 'toastContainer';
        container.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); z-index:9999; display:flex; flex-direction:column; gap:10px; width:90%; max-width:350px; pointer-events:none;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)';
    toast.style.cssText = `background: ${bgColor}; backdrop-filter: blur(10px); color: white; padding: 12px 16px; border-radius: 12px; font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);`;
    toast.innerHTML = `<i data-lucide="${type === 'error' ? 'alert-circle' : 'check-circle'}" size="20"></i> <span>${message}</span>`;
    container.appendChild(toast); lucide.createIcons();
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
}

async function safeFetch(url, options = {}) {
    try {
        const res = await fetch(url, options);
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("السيرفر غير متاح حالياً. جاري إعادة التشغيل...");
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `خطأ في السيرفر: ${res.status}`);
        return data;
    } catch (error) {
        if (error.name === 'TypeError' || error.message.includes('JSON')) {
            throw new Error("تعذر الاتصال بالسيرفر. تحقق من اتصالك.");
        }
        throw error;
    }
}

// تحديث دالة جلب الإرساليات
async function loadInbox(type) {
    const container = document.getElementById('inboxContainer');
    container.innerHTML = '<div class="col-span-full text-center py-10"><i data-lucide="loader" class="animate-spin text-accent mx-auto mb-2"></i><p class="text-slate-400">جاري التحميل...</p></div>';
    lucide.createIcons();
    let endpoint = type === 'deposits' ? '/admin/api/deposits' : type === 'orders' ? '/admin/api/orders' : '/admin/api/kyc';

    try {
        const data = await safeFetch(`${API_BASE}${endpoint}`, { headers: getHeaders() });
        cachedItems[type] = data;
        container.innerHTML = '';
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="col-span-full text-center py-10 text-slate-400">لا توجد عناصر في هذا القسم حالياً.</div>';
            return;
        }
        // (باقي كود بناء البطاقات كما هو)
        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'inbox-card';
            card.onclick = () => viewDetails(type, item.id);
            // (أكواد البطاقات...)
            container.appendChild(card);
        });
        lucide.createIcons();
    } catch (e) {
        container.innerHTML = `<div class="col-span-full text-center py-10 text-danger flex flex-col items-center justify-center">
            <i data-lucide="wifi-off" size="48" class="mb-4"></i>
            <p class="font-bold mb-2">${e.message}</p>
            <button onclick="loadInbox('${type}')" class="btn-primary" style="width:auto; padding:10px 20px;">إعادة المحاولة</button>
        </div>`;
        lucide.createIcons();
    }
}
// (باقي الدوال السابقة...)
