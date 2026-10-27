
// =================================================================
// 🚀 MASTER FIX: Overrides all old broken functions
// =================================================================
console.log("✅ SANAD Master Fix Loaded");

window.escapeHtml = function(text) {
    if (!text) return '';
    return String(text).replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
};

window.loadArchiveData = async function() {
    const list = document.getElementById('archiveList');
    if (!list) return;
    list.innerHTML = '<div class="text-center py-4 text-slate-400">جاري التحميل...</div>';
    
    try {
        const data = await window.safeFetch(`${window.API_BASE}/api/admin/archive`, { headers: window.getHeaders() });
        let html = '';
        
        if (data.categories && data.categories.length > 0) {
            html += `<h4 class="font-bold text-accent mt-4 mb-2 col-span-full">الأقسام المؤرشفة</h4>`;
            html += data.categories.map(c => `
                <div class="glass rounded-xl p-3 flex justify-between items-center mb-2">
                    <span class="font-bold text-white">${window.escapeHtml(c.name)}</span>
                    <button class="btn-success btn-sm" onclick="alert('سيتم تفعيل الاسترجاع قريباً')">استرجاع</button>
                </div>
            `).join('');
        }
        
        if (data.products && data.products.length > 0) {
            html += `<h4 class="font-bold text-accent mt-6 mb-2 col-span-full">المنتجات المؤرشفة</h4>`;
            html += data.products.map(p => `
                <div class="glass rounded-xl p-3 flex justify-between items-center mb-2">
                    <div>
                        <div class="font-bold text-white">${window.escapeHtml(p.name)}</div>
                        <div class="text-xs text-slate-400">${window.escapeHtml(p.category_name)}</div>
                    </div>
                    <button class="btn-success btn-sm" onclick="alert('سيتم تفعيل الاسترجاع قريباً')">استرجاع</button>
                </div>
            `).join('');
        }
        
        if (html === '') {
            html = '<div class="text-center py-10 text-slate-400 col-span-full">الأرشيف فارغ حالياً.</div>';
        }
        list.innerHTML = html;
    } catch (e) {
        list.innerHTML = `<div class="text-center text-danger py-4 col-span-full">${e.message}</div>`;
    }
};

window.loadPaymentMethods = async function() {
    const container = document.getElementById('paymentMethodsList');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-4 text-slate-400 col-span-full">جاري التحميل...</div>';
    
    try {
        const data = await window.safeFetch(`${window.API_BASE}/api/admin/payment-methods`, { headers: window.getHeaders() });
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="text-center py-4 text-slate-400 col-span-full">لا توجد طرق دفع.</div>';
            return;
        }
        container.innerHTML = data.map(pm => `
            <div class="glass rounded-2xl p-4 flex flex-col gap-2 border border-slate-700">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xl">💳</div>
                    <h4 class="font-bold text-white">${window.escapeHtml(pm.name)}</h4>
                </div>
                <div class="text-sm text-slate-400 mt-2">الحساب: <span class="font-mono text-white">${window.escapeHtml(pm.account || '-')}</span></div>
                <div class="text-xs text-slate-500">الحد الأدنى: $${pm.min_amount} | الأقصى: $${pm.max_amount}</div>
                <button class="btn-outline btn-sm mt-2" onclick="alert('سيتم تفعيل التعديل قريباً')">تعديل</button>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = `<div class="text-center text-danger py-4 col-span-full">${e.message}</div>`;
    }
};
