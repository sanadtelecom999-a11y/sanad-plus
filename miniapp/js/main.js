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
        const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
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
    } catch (e) { document.getElementById('dep-list').innerHTML = `<div class="empty" style="color:red;">${e.message}</div>`; }
}

async function renderAccount(container) {
    container.innerHTML = `
        <section class="page active">
            <div class="profile-hero">
                <div class="profile-head">
                    <div class="profile-copy">
                        <h1 class="profile-name">${escapeHtml(state.user?.first_name || 'مستخدم')}</h1>
                        <p class="profile-username">@${escapeHtml(tg?.initDataUnsafe?.user?.username || 'user')}</p>
                    </div>
                    <div class="avatar">
                        ${state.user?.photo_url ? `<img src="${escapeHtml(state.user.photo_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:21px;">` : '👤'}
                    </div>
                </div>
            </div>
            <div class="sanad-id">
                <div class="sanad-label"><span>معرّف SANAD ID</span></div>
                <div class="sanad-line"><strong class="sanad-value">${escapeHtml(state.user?.sanad_id || '---')}</strong></div>
            </div>
            <section class="stats">
                <article class="stat"><p class="stat-label">الرصيد الحالي</p><div class="stat-value">${formatMoney(state.user?.balance)}</div></article>
                <article class="stat"><p class="stat-label">إجمالي الإيداعات</p><div class="stat-value">${formatMoney(state.user?.total_deposits)}</div></article>
            </section>
        </section>
    `;
}

function renderCharge(container) {
    container.innerHTML = `<section class="page active"><h1 class="page-title">شحن الرصيد</h1><div class="panel"><p>يرجى تحويل المبلغ إلى محفظة Sham Cash وإرفاق الإيصال.</p></div></section>`;
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
