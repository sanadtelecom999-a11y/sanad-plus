// ═══════════════════════════════════════════════════════════
// SANAD PLUS⁺ - Core Application (V2 - Bulletproof)
// ═══════════════════════════════════════════════════════════
const API_BASE = 'https://sanad-plus-backend.onrender.com';
const state = { user: null, categories: [], currentPage: 'home' };
const tg = window.Telegram?.WebApp;

// دوال مساعدة
const escapeHtml = (str) => String(str || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatMoney = (amt) => `${Number(amt || 0).toFixed(2)} <span class="currency">ل.س</span>`;

// طلبات الشبكة الآمنة
async function apiFetch(endpoint, options = {}) {
    const initData = tg?.initData || '';
    const headers = { 
        ...options.headers, 
        'X-Telegram-Init-Data': initData 
    };
    if (options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 ثواني مهلة
        const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers, signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (res.status === 401) { window.location.reload(); throw new Error('جلسة منتهية'); }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
    } catch (err) {
        console.error(`API Error (${endpoint}):`, err);
        throw err;
    }
}

// واجهة التنبيهات
function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function showPage(route) {
    state.currentPage = route;
    document.querySelectorAll('.nav-item, .nav-charge').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.route === route);
    });
    const app = document.getElementById('app-content');
    
    if (route === 'home') renderHome(app);
    else if (route === 'orders') renderOrders(app);
    else if (route === 'deposits') renderDeposits(app);
    else if (route === 'account') renderAccount(app);
    else if (route === 'charge') renderCharge(app);
}

// ═══════════════════════════════════════════════════════════
// الصفحات (Rendering)
// ═══════════════════════════════════════════════════════════

async function renderHome(container) {
    container.innerHTML = `
        <section class="page active">
            <header class="page-head">
                <div><div class="brand">SANAD PLUS<sup>⁺</sup></div><div class="tagline">منصتك الرقمية الموثوقة</div></div>
            </header>
            <div class="search-bar-container" style="padding-bottom:15px;">
                <input type="text" class="search-bar" placeholder="ابحث عن خدمة أو منتج..." style="width:100%; padding:12px; border-radius:12px; background:var(--surface); border:1px solid var(--border); color:white;" id="search-input">
            </div>
            <p class="welcome">أهلًا، <span>${escapeHtml(state.user?.first_name || 'عميلنا')}</span></p>
            <section class="balance-card card">
                <div class="balance-top"><span>الرصيد الحالي</span></div>
                <div class="balance-amount">${formatMoney(state.user?.balance)}</div>
                <div class="balance-bottom">
                    <span class="balance-note">رصيدك المتاح</span>
                    <button class="small-action" data-route="charge">شحن +</button>
                </div>
            </section>
            <div class="section-heading"><h2>اكتشف خدماتنا</h2></div>
            <section class="categories" id="home-categories"><div style="text-align:center;padding:20px;color:var(--muted)">جاري التحميل...</div></section>
        </section>
    `;

    try {
        const cats = await apiFetch('/api/categories/');
        const catContainer = document.getElementById('home-categories');
        if (cats && cats.length > 0) {
            catContainer.innerHTML = cats.map(cat => `
                <button class="category" onclick="showToast('قريباً')">
                    <span class="category-icon">${cat.image ? `<img src="${escapeHtml(cat.image)}" style="border-radius:15px;width:100%;height:100%;object-fit:cover;">` : '📦'}</span>
                    <span><strong>${escapeHtml(cat.name)}</strong><small>خدمات رقمية</small></span>
                </button>
            `).join('');
        } else {
            catContainer.innerHTML = '<div class="empty">لا توجد أقسام متاحة حالياً.</div>';
        }
    } catch (e) {
        document.getElementById('home-categories').innerHTML = '<div class="empty" style="color:red;">تعذر تحميل الأقسام</div>';
    }
}

async function renderOrders(container) {
    container.innerHTML = `<section class="page active"><h1 class="page-title">طلباتي</h1><div class="list" id="orders-list">جاري التحميل...</div></section>`;
    try {
        const res = await apiFetch('/api/orders/');
        const list = document.getElementById('orders-list');
        const items = res.items || [];
        if (items.length === 0) { list.innerHTML = '<div class="empty">لا توجد طلبات.</div>'; return; }
        
        const getBadge = (s) => {
            const map = { completed: 'badge-success', pending: 'badge-warning', rejected: 'badge-danger' };
            const label = { completed: 'مكتمل', pending: 'معلق', rejected: 'مرفوض' };
            return `<span class="badge ${map[s] || ''}">${label[s] || s}</span>`;
        };

        list.innerHTML = items.map(o => `
            <div class="list-item">
                <span class="item-main">
                    <span class="item-title">${escapeHtml(o.product_name)}</span>
                    <span class="item-desc">${escapeHtml(o.order_number)}</span>
                    <span class="item-meta">${getBadge(o.status)} <strong>${formatMoney(o.amount)}</strong></span>
                </span>
            </div>
        `).join('');
    } catch (e) { document.getElementById('orders-list').innerHTML = `<div class="empty" style="color:red;">${e.message}</div>`; }
}

async function renderDeposits(container) {
    container.innerHTML = `<section class="page active"><h1 class="page-title">الإيداعات</h1><div class="list" id="dep-list">جاري التحميل...</div></section>`;
    try {
        const res = await apiFetch('/api/deposits/');
        const list = document.getElementById('dep-list');
        if (!res.items || res.items.length === 0) { list.innerHTML = '<div class="empty">لا توجد إيداعات.</div>'; return; }
        list.innerHTML = res.items.map(d => `
            <div class="list-item">
                <span class="item-main">
                    <span class="item-title">${escapeHtml(d.reference || 'إيداع')}</span>
                    <span class="item-meta"><strong>${formatMoney(d.amount)}</strong></span>
                </span>
            </div>
        `).join('');
    } catch (e) { 
        console.error("Deposits error:", e);
        document.getElementById('dep-list').innerHTML = `
            <div class="empty" style="color:var(--danger);text-align:center;padding:20px;">
                <p>تعذر جلب الإيداعات. قد يكون السيرفر في وضع النوم (Cold Start).</p>
                <button onclick="showPage('deposits')" class="primary-btn" style="margin-top:10px;">إعادة المحاولة 🔄</button>
            </div>`; 
    }
}



async function renderAccount(container) {
    container.innerHTML = `
        <section class="page active">
            <div class="profile-hero">
                <div class="profile-head">
                    <div class="profile-copy">
                        <h1 class="profile-name">
                            <span>${escapeHtml(state.user?.first_name || 'مستخدم')}</span>
                            ${state.user?.is_verified ? '<span class="verify-mark" title="موثق"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 20 5v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3Z"/><path d="m8.5 12 2.3 2.3 4.7-5"/></svg></span>' : ''}
                        </h1>
                        <p class="profile-username">@${escapeHtml(tg?.initDataUnsafe?.user?.username || 'user')}</p>
                        <p class="telegram-id">Telegram ID: <bdi>${escapeHtml(state.user?.telegram_id || '---')}</bdi></p>
                    </div>
                    <div class="avatar" style="overflow:hidden;">
                        <img src="${escapeHtml(state.user?.photo_url || '')}" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" 
                             style="width:100%;height:100%;object-fit:cover; ${state.user?.photo_url ? '' : 'display:none;'}">
                        <svg style="display:${state.user?.photo_url ? 'none' : 'block'}; width:100%; height:100%; padding:15px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="7.5" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>
                    </div>
                </div>
            </div>

            <section class="sanad-id">
                <div class="sanad-label">
                    <span>معرّف SANAD ID</span>
                    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="1.8"><path d="M12 2 20 5v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3Z"/><path d="m8.5 12 2.3 2.3 4.7-5"/></svg>
                </div>
                <div class="sanad-line">
                    <strong class="sanad-value">${escapeHtml(state.user?.sanad_id || '---')}</strong>
                    <button class="copy-icon" onclick="navigator.clipboard.writeText('${escapeHtml(state.user?.sanad_id || '')}'); alert('تم النسخ!');">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>
                    </button>
                </div>
            </section>

            <section class="stats">
                <article class="stat">
                    <p class="stat-label">إجمالي الإيداعات</p>
                    <div class="stat-value">${formatMoney(state.user?.total_deposits || 0)}</div>
                </article>
                <article class="stat">
                    <p class="stat-label">الرصيد الحالي</p>
                    <div class="stat-value">${formatMoney(state.user?.balance || 0)}</div>
                </article>
            </section>

            <section class="service-list">
                <button class="service-row" onclick="alert('قريباً')">
                    <span class="service-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg></span>
                    <span><span class="service-title">توثيق الحساب</span><span class="service-desc">حالة التوثيق وإجراءاته</span></span>
                    <span class="chevron">‹</span>
                </button>
                <button class="service-row" onclick="alert('قريباً')">
                    <span class="service-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12a2 2 0 0 1 2 2v17l-4-2-4 2-4-2-4 2V5a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h8M8 16h4"/></svg></span>
                    <span><span class="service-title">السجل المالي</span><span class="service-desc">جميع عملياتك المالية</span></span>
                    <span class="chevron">‹</span>
                </button>
                <button class="service-row" onclick="alert('قريباً')">
                    <span class="service-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 13v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="12" width="4" height="7" rx="2"/><rect x="17" y="12" width="4" height="7" rx="2"/><path d="M17 19c0 2-2 3-5 3"/></svg></span>
                    <span><span class="service-title">الدعم الفني</span><span class="service-desc">المساعدة والاستفسارات</span></span>
                    <span class="chevron">‹</span>
                </button>
            </section>

            <h2 class="extra-title">الخدمات الإضافية</h2>
            <section class="extra-list">
                <button class="extra-row" onclick="alert('قريباً')">
                    <span class="icon-tile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.4M8.7 13.3l6.6 4.4"/></svg></span>
                    <span><span class="service-title">الإحالة</span><span class="service-desc">رابط دعوة شخصي</span></span>
                    <span class="chevron">‹</span>
                </button>
                <button class="extra-row" onclick="alert('قريباً')">
                    <span class="icon-tile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></span>
                    <span><span class="service-title">الإشعارات</span><span class="service-desc">حالات الطلبات والإيداعات</span></span>
                    <span class="chevron">‹</span>
                </button>
                <button class="extra-row" onclick="alert('قريباً')">
                    <span class="icon-tile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 2 20 5v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3Z"/><path d="m9 12 2 2 4-4"/></svg></span>
                    <span><span class="service-title">الأمان والخصوصية</span><span class="service-desc">حالة حماية الحساب</span></span>
                    <span class="chevron">‹</span>
                </button>
                <button class="extra-row" onclick="alert('قريباً')">
                    <span class="icon-tile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.4 1.6c-1.2 1.1-2 1.4-2 3M12 17h.01"/></svg></span>
                    <span><span class="service-title">مركز المساعدة</span><span class="service-desc">الأسئلة الشائعة</span></span>
                    <span class="chevron">‹</span>
                </button>
            </section>
        </section>
    `;
}

function renderCharge(container) {
    container.innerHTML = `
        <section class="page active">
            <header class="page-head"><div><div class="brand">SANAD PLUS<sup>⁺</sup></div><div class="tagline">شحن الرصيد</div></div></header>
            <h1 class="page-title">شحن الرصيد</h1>
            <p class="page-subtitle">حول المبلغ إلى وسيلة الدفع الموضحة.</p>
            
            <div class="panel">
                <div class="sanad-label" style="margin-bottom:12px;"><span>بيانات التحويل</span></div>
                <div style="background:var(--bg); border:1px solid var(--border); border-radius:14px; padding:16px; margin-bottom:16px;">
                    <p style="margin:0 0 8px; font-size:13px; color:var(--muted);">المحفظة</p>
                    <strong style="display:block; font-size:16px; margin-bottom:12px;">Sham Cash</strong>
                    <p style="margin:0 0 8px; font-size:13px; color:var(--muted);">رقم المحفظة</p>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong style="font-family:monospace; font-size:16px;">09XXXXXXXX</strong>
                        <button onclick="navigator.clipboard.writeText('09XXXXXXXX'); alert('تم النسخ')" class="small-action" style="border:0;padding:6px 10px;">نسخ الرقم</button>
                    </div>
                </div>

                <h2 class="panel-title">تفاصيل العملية</h2>
                <form id="charge-form">
                    <label class="input-label">المبلغ المحول (ل.س)</label>
                    <input type="number" id="charge-amount" class="field" placeholder="مثال: 50000" required>
                    
                    <label class="input-label">رقم عملية التحويل</label>
                    <input type="text" id="charge-reference" class="field" placeholder="أدخل رقم العملية" required>
                    
                    <label class="input-label">صورة إيصال التحويل</label>
                    <input type="file" id="charge-receipt" class="field" accept="image/*" required>
                    
                    <button type="submit" id="submit-charge-btn" class="primary-btn full" style="margin-top:16px;">تأكيد طلب الشحن ←</button>
                </form>
            </div>
        </section>
    `;

    document.getElementById('charge-form').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submit-charge-btn');
        const amount = document.getElementById('charge-amount').value;
        const ref = document.getElementById('charge-reference').value;
        const file = document.getElementById('charge-receipt').files[0];

        if (!amount || !ref || !file) return alert('يرجى تعبئة جميع الحقول');

        btn.disabled = true;
        btn.textContent = 'جاري الإرسال...';

        const formData = new FormData();
        formData.append('amount', amount);
        formData.append('reference', ref);
        formData.append('receipt', file);

        try {
            await apiFetch('/api/deposits/create', { method: 'POST', body: formData });
            alert('تم إرسال الطلب بنجاح! يرجى الانتظار للمراجعة.');
            showPage('deposits');
        } catch (err) {
            alert('خطأ: ' + err.message);
            btn.disabled = false;
            btn.textContent = 'تأكيد طلب الشحن ←';
        }
    };
}

// ═══════════════════════════════════════════════════════════
// التهيئة الأساسية (Init) - آمنة ضد التجمد
// ═══════════════════════════════════════════════════════════
async function initApp() {
    if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor('#080E1B'); }

    // مستمع الأزرار (Event Delegation) لضمان عملها دائماً
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-route]');
        if (btn) { e.preventDefault(); showPage(btn.dataset.route); }
        if (e.target.id === 'modal-close') document.getElementById('modal-backdrop').classList.remove('show');
    });

    try {
        const initData = tg?.initData;
        if (!initData) throw new Error("يرجى فتح التطبيق من داخل تيليجرام.");
        
        // جلب بيانات المستخدم
        state.user = await apiFetch('/api/miniapp/init', { method: 'POST', body: JSON.stringify({}) });
        
        // إخفاء شاشة التحميل وعرض الرئيسية
        document.getElementById('app-loading').remove();
        showPage('home');
    } catch (err) {
        console.error(err);
        document.getElementById('app-loading').innerHTML = `<div style="text-align:center;color:red;padding:20px;">
            <h2>حدث خطأ</h2><p>${escapeHtml(err.message)}</p>
            <button onclick="window.location.reload()" style="margin-top:10px;padding:10px;background:#38BDF8;color:black;border:none;border-radius:8px;">إعادة المحاولة</button>
        </div>`;
    }
}

document.addEventListener('DOMContentLoaded', initApp);
