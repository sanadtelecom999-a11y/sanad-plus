// ═══════════════════════════════════════════════════════════
// SANAD PLUS⁺ - Core Application (V3 - Multi-Currency & Pro)
// ═══════════════════════════════════════════════════════════
const API_BASE = 'https://sanad-plus-backend.onrender.com';
const state = { 
    user: null, 
    categories: [], 
    currentPage: 'home', 
    currency: 'USD', // USD أو SYP
    exchangeRate: 130 
};
const tg = window.Telegram?.WebApp;

const escapeHtml = (str) => String(str || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// دالة تنسيق المبلغ (تدعم تبديل العملة)
function formatMoney(amount) {
    const amt = Number(amount || 0);
    if (state.currency === 'USD') {
        return `$${amt.toFixed(2)}`;
    } else {
        return `${(amt * state.exchangeRate).toFixed(0)} <span class="currency">ل.س</span>`;
    }
}

async function apiFetch(endpoint, options = {}) {
    const headers = { ...options.headers, 'X-Telegram-Init-Data': tg?.initData || '' };
    if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
        if (res.status === 401) { window.location.reload(); throw new Error('جلسة منتهية'); }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
    } catch (err) { throw err; }
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// الهيدر الثابت
function getHeaderHTML() {
    return `
    <header class="top-header">
        <div class="header-logo">SANAD<sup>⁺</sup></div>
        <div class="balance-pill" data-route="charge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
            ${formatMoney(state.user?.balance)}
        </div>
        <button class="icon-btn-chat" onclick="openChat()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        </button>
    </header>
    `;
}

function showPage(route) {
    state.currentPage = route;
    document.querySelectorAll('.nav-item, .nav-charge').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.route === route);
    });
    const app = document.getElementById('app-content');
    if (route === 'home') renderHome(app);
    else if (route === 'account') renderAccount(app);
    else if (route === 'orders') renderOrders(app);
    else if (route === 'deposits') renderDeposits(app);
    else if (route === 'charge') renderCharge(app);
}

// ═══════════════════════════════════════════════════════════
// الصفحات
// ═══════════════════════════════════════════════════════════

async function renderHome(container) {
    container.innerHTML = `
        ${getHeaderHTML()}
        <section class="page active" style="padding-top: 0;">
            <p class="welcome">أهلًا، <span>${escapeHtml(state.user?.first_name || 'عميلنا')}</span></p>
            
            <div class="section-heading"><h2>اكتشف خدماتنا</h2></div>
            <section class="categories" id="home-categories"><div style="text-align:center;padding:20px;color:var(--muted)">جاري التحميل...</div></section>
            
            <div class="section-heading"><h2>آخر العمليات</h2></div>
            <div class="list" id="home-recent"><div class="empty">لا توجد عمليات حديثة</div></div>
        </section>
    `;

    try {
        const cats = await apiFetch('/api/categories/');
        const catContainer = document.getElementById('home-categories');
        if (cats && cats.length > 0) {
            catContainer.innerHTML = cats.map(cat => `
                <button class="category" onclick="openCategory(${cat.id}, '${escapeHtml(cat.name)}')">
                    <span class="category-icon">${cat.image ? `<img src="${escapeHtml(cat.image)}">` : '📦'}</span>
                    <span><strong>${escapeHtml(cat.name)}</strong><small>خدمات رقمية</small></span>
                </button>
            `).join('');
        } else {
            catContainer.innerHTML = '<div class="empty">لا توجد أقسام متاحة.</div>';
        }
    } catch (e) {
        document.getElementById('home-categories').innerHTML = '<div class="empty" style="color:red;">تعذر تحميل الأقسام</div>';
    }
}

async function renderAccount(container) {
    container.innerHTML = `
        ${getHeaderHTML()}
        <section class="page active" style="padding-top: 0;">
            <div class="profile-hero" style="margin-top:0; border-radius: 0 0 28px 28px;">
                <div class="profile-head">
                    <div class="profile-copy">
                        <h1 class="profile-name"><span>${escapeHtml(state.user?.first_name || 'مستخدم')}</span></h1>
                        <p class="profile-username">@${escapeHtml(tg?.initDataUnsafe?.user?.username || 'user')}</p>
                    </div>
                    <div class="avatar">
                        <img src="${escapeHtml(state.user?.photo_url || '')}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" style="width:100%;height:100%;object-fit:cover; ${state.user?.photo_url ? '' : 'display:none;'}">
                        <svg style="display:${state.user?.photo_url ? 'none' : 'block'};" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="7.5" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>
                    </div>
                </div>
            </div>

            <div class="currency-toggle-box">
                <div>
                    <strong style="display:block; font-size:15px;">عملة العرض</strong>
                    <span style="font-size:12px; color:var(--muted);">${state.currency === 'USD' ? 'دولار أمريكي (Base)' : 'ليرة سورية'}</span>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="currency-toggle" ${state.currency === 'SYP' ? 'checked' : ''} onchange="toggleCurrency(this.checked)">
                    <span class="slider"></span>
                </label>
            </div>

            <section class="sanad-id">
                <div class="sanad-label"><span>معرّف SANAD ID</span></div>
                <div class="sanad-line"><strong class="sanad-value">${escapeHtml(state.user?.sanad_id || '---')}</strong></div>
            </section>
            
            <section class="stats">
                <article class="stat"><p class="stat-label">الرصيد الحالي</p><div class="stat-value">${formatMoney(state.user?.balance)}</div></article>
                <article class="stat"><p class="stat-label">إجمالي الإيداعات</p><div class="stat-value">${formatMoney(state.user?.total_deposits)}</div></article>
            </section>

            <h2 class="extra-title">الخدمات الإضافية</h2>
            <section class="extra-list">
                <button class="extra-row" onclick="alert('قريباً')"><span>الإحالة</span></button>
                <button class="extra-row" onclick="alert('قريباً')"><span>الإشعارات</span></button>
                <button class="extra-row" onclick="openChat()"><span>الأمان والدعم</span></button>
            </section>
        </section>
    `;
}

window.toggleCurrency = function(isSYP) {
    state.currency = isSYP ? 'SYP' : 'USD';
    showPage('account'); // إعادة رسم الصفحة
    showToast(isSYP ? 'تم التحويل لليرة السورية' : 'تم التحويل للدولار');
};

// شاشة عرض المنتجات
window.openCategory = async function(catId, catName) {
    showToast('جاري جلب المنتجات...');
    try {
        const products = await apiFetch(`/api/products/?category_id=${catId}`);
        const overlay = document.createElement('div');
        overlay.className = 'bottom-sheet-overlay open';
        overlay.id = 'products-sheet';
        overlay.innerHTML = `
            <div class="bottom-sheet" style="height: 70vh; overflow-y: auto;">
                <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                    <h2 style="margin:0;">${catName}</h2>
                    <button onclick="document.getElementById('products-sheet').remove()" style="background:none; border:none; color:white; font-size:24px;">×</button>
                </div>
                <div class="product-grid">
                    ${products.length ? products.map(p => `
                        <div class="product-card" onclick="openProduct(${p.id}, '${escapeHtml(p.name)}', ${p.price}, '${escapeHtml(p.image)}')">
                            <img src="${escapeHtml(p.image || 'https://placehold.co/100')}">
                            <strong style="display:block; font-size:13px; margin-bottom:5px;">${escapeHtml(p.name)}</strong>
                            <span style="color:var(--blue); font-weight:bold;">${formatMoney(p.price)}</span>
                        </div>
                    `).join('') : '<p>لا توجد منتجات في هذا القسم.</p>'}
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    } catch(e) { showToast('خطأ في جلب المنتجات'); }
};

// شاشة تفاصيل المنتج
window.openProduct = function(id, name, price, image) {
    const overlay = document.createElement('div');
    overlay.className = 'bottom-sheet-overlay open';
    overlay.innerHTML = `
        <div class="bottom-sheet">
            <div style="text-align:center;">
                <img src="${escapeHtml(image || 'https://placehold.co/100')}" style="width:100px; height:100px; border-radius:20px; object-fit:cover; margin-bottom:15px;">
                <h2 style="margin:0 0 10px;">${escapeHtml(name)}</h2>
                <p style="font-size:24px; color:var(--blue); font-weight:bold; margin-bottom:20px;">${formatMoney(price)}</p>
                <button class="primary-btn full" onclick="buyProduct(${id})">شراء الآن</button>
                <button class="secondary-btn full" style="margin-top:10px;" onclick="this.closest('.bottom-sheet-overlay').remove()">إلغاء</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
};

window.buyProduct = async function(id) {
    try {
        await apiFetch('/api/orders/create', { method: 'POST', body: JSON.stringify({ product_id: id, quantity: 1 }) });
        showToast('تم إنشاء الطلب بنجاح!');
        document.querySelectorAll('.bottom-sheet-overlay').forEach(e => e.remove());
        state.user = await apiFetch('/api/miniapp/init', { method: 'POST', body: JSON.stringify({}) });
        showPage('orders');
    } catch(e) { showToast(e.message); }
};

// الدردشة (Support)
window.openChat = async function() {
    const overlay = document.createElement('div');
    overlay.className = 'chat-overlay';
    overlay.id = 'chat-overlay';
    overlay.innerHTML = `
        <div class="chat-header">
            <button onclick="document.getElementById('chat-overlay').remove()" style="background:none;border:none;color:white;font-size:20px;">→</button>
            <h2 style="margin:0; font-size:16px;">الدعم الفني</h2>
        </div>
        <div class="chat-messages" id="chat-msgs">جاري التحميل...</div>
        <div class="chat-input-area">
            <input type="text" id="chat-input" placeholder="اكتب رسالتك...">
            <button class="primary-btn" onclick="sendChat()">إرسال</button>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('open'), 10);
    loadChatMessages();
};

async function loadChatMessages() {
    try {
        const msgs = await apiFetch('/api/support/messages');
        const box = document.getElementById('chat-msgs');
        if (!msgs.length) { box.innerHTML = '<p style="text-align:center; color:var(--muted);">مرحباً! كيف يمكننا مساعدتك؟</p>'; return; }
        box.innerHTML = msgs.map(m => `<div class="chat-bubble ${m.sender === 'user' ? 'user' : 'admin'}">${escapeHtml(m.message)}</div>`).join('');
        box.scrollTop = box.scrollHeight;
    } catch(e) { document.getElementById('chat-msgs').innerHTML = 'تعذر التحميل'; }
}

window.sendChat = async function() {
    const input = document.getElementById('chat-input');
    if (!input.value.trim()) return;
    const text = input.value;
    input.value = '';
    
    const box = document.getElementById('chat-msgs');
    box.innerHTML += `<div class="chat-bubble user">${escapeHtml(text)}</div>`;
    box.scrollTop = box.scrollHeight;

    try { await apiFetch('/api/support/send', { method: 'POST', body: JSON.stringify({ message: text }) }); } 
    catch(e) { showToast('فشل الإرسال'); }
};

// صفحات أخرى
async function renderOrders(container) {
    container.innerHTML = `${getHeaderHTML()}<section class="page active" style="padding-top:0;"><h1 class="page-title">طلباتي</h1><div class="list" id="orders-list">جاري التحميل...</div></section>`;
    // ... منطق جلب الطلبات
}

async function renderDeposits(container) {
    container.innerHTML = `${getHeaderHTML()}<section class="page active" style="padding-top:0;"><h1 class="page-title">الإيداعات</h1><div class="list" id="dep-list">جاري التحميل...</div></section>`;
    // ... منطق جلب الإيداعات
}

function renderCharge(container) {
    container.innerHTML = `${getHeaderHTML()}<section class="page active" style="padding-top:0;"><h1 class="page-title">شحن الرصيد</h1><div class="panel"><p>يرجى تحويل المبلغ إلى محفظة Sham Cash وإرفاق الإيصال.</p></div></section>`;
}

// التهيئة
async function initApp() {
    if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor('#080E1B'); }

    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-route]');
        if (btn) { e.preventDefault(); showPage(btn.dataset.route); }
        if (e.target.id === 'modal-close') document.getElementById('modal-backdrop').classList.remove('show');
    });

    try {
        if (!tg?.initData) throw new Error("يرجى فتح التطبيق من تيليجرام.");
        state.user = await apiFetch('/api/miniapp/init', { method: 'POST', body: JSON.stringify({}) });
        if(state.user.exchange_rate) state.exchangeRate = state.user.exchange_rate;
        
        const loader = document.getElementById('app-loading');
        if(loader) loader.remove();
        showPage('home');
    } catch (err) {
        document.getElementById('app-loading').innerHTML = `<div style="text-align:center;color:red;padding:20px;"><h2>حدث خطأ</h2><p>${escapeHtml(err.message)}</p></div>`;
    }
}

document.addEventListener('DOMContentLoaded', initApp);
