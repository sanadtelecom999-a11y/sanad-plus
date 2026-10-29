// ═══════════════════════════════════════════════════════════
// SANAD PLUS⁺ - Core Application (V4 - Ultimate)
// ═══════════════════════════════════════════════════════════
const API_BASE = 'https://sanad-plus-backend.onrender.com';
const state = { user: null, categories: [], currentPage: 'home', currency: 'USD', exchangeRate: 130, paymentMethods: [] };
const tg = window.Telegram?.WebApp;

const escapeHtml = (str) => String(str || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function formatMoney(amount) {
    const amt = Number(amount || 0);
    return state.currency === 'USD' ? `$${amt.toFixed(2)}` : `${(amt * state.exchangeRate).toFixed(0)} <span class="currency">ل.س</span>`;
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
    if (!t) return; t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function getHeaderHTML() {
    return `
    <header class="top-header">
        <div class="header-logo">SANAD<sup>⁺</sup></div>
        <div class="balance-pill" data-route="charge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
            ${formatMoney(state.user?.balance)}
        </div>
        <button class="icon-btn-chat" onclick="window.openChat()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        </button>
    </header>`;
}

function showPage(route) {
    state.currentPage = route;
    document.querySelectorAll('.nav-item, .nav-charge').forEach(btn => btn.classList.toggle('active', btn.dataset.route === route));
    const app = document.getElementById('app-content');
    if (route === 'home') renderHome(app);
    else if (route === 'account') renderAccount(app);
    else if (route === 'orders') renderOrders(app);
    else if (route === 'deposits') renderDeposits(app);
    else if (route === 'charge') renderCharge(app);
}

// ── الصفحات ──

async function renderHome(container) {
    container.innerHTML = `
        <section class="page active" style="padding-top: 0;">
            <!-- الهيدر الجديد للرئيسية -->
            <div class="home-header">
                <div class="welcome-text">أهلًا، <span>${escapeHtml(state.user?.first_name || 'عميلنا')}</span> 👋</div>
                <div class="mini-balance-card" data-route="charge">
                    <span class="mini-balance-label">الرصيد الحالي</span>
                    <span class="mini-balance-value">${formatMoney(state.user?.balance)}</span>
                </div>
            </div>
            
            <div class="search-bar-container" style="padding:0 20px 15px;">
                <div style="background:var(--surface); padding:12px; border-radius:12px; border:1px solid var(--border); color:var(--muted); font-size:13px; display:flex; align-items:center; gap:10px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    ابحث عن خدمة...
                </div>
            </div>

            <div class="section-heading" style="padding:0 20px;"><h2>اكتشف خدماتنا</h2></div>
            <section class="categories" id="home-categories" style="padding:0 20px;"><div style="text-align:center;padding:20px;color:var(--muted)">جاري التحميل...</div></section>
        </section>
    `;

    try {
        const cats = await apiFetch('/api/categories/');
        const catContainer = document.getElementById('home-categories');
        if (cats && cats.length > 0) {
            catContainer.innerHTML = cats.map(cat => `
                <button class="category" data-cat-id="${cat.id}" data-cat-name="${escapeHtml(cat.name)}">
                    <span class="category-icon">${cat.image ? `<img src="${escapeHtml(cat.image)}" alt="${escapeHtml(cat.name)}">` : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:30px; color:var(--blue);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`}</span>
                    <span><strong>${escapeHtml(cat.name)}</strong><small>خدمات رقمية</small></span>
                </button>
            `).join('');
        } else {
            catContainer.innerHTML = '<div class="empty">لا توجد أقسام متاحة.</div>';
        }
    } catch (e) { document.getElementById('home-categories').innerHTML = '<div class="empty" style="color:red;">تعذر تحميل الأقسام</div>'; }
}

// شاشة المنتجات (شاشة كاملة)
window.openCategory = async function(catId, catName) {
    showToast('جاري جلب المنتجات...');
    try {
        const products = await apiFetch(`/api/products/?category_id=${catId}`);
        const overlay = document.createElement('div');
        overlay.className = 'full-overlay open';
        overlay.id = 'category-overlay';
        overlay.innerHTML = `
            <div class="full-header">
                <h2 style="margin:0;">${catName}</h2>
                <button class="close-btn" onclick="document.getElementById('category-overlay').remove()">×</button>
            </div>
            <div style="padding: 20px; overflow-y:auto; flex:1;">
                <div class="product-grid">
                    ${products.length ? products.map(p => `
                        <div class="product-card" data-p-id="${p.id}" data-p-name="${escapeHtml(p.name)}" data-p-price="${p.price}" data-p-image="${escapeHtml(p.image)}">
                            <img src="${escapeHtml(p.image || 'https://placehold.co/100')}">
                            <strong style="display:block; font-size:13px; margin-bottom:5px;">${escapeHtml(p.name)}</strong>
                            <span style="color:var(--blue); font-weight:bold;">${formatMoney(p.price)}</span>
                        </div>
                    `).join('') : '<p>لا توجد منتجات.</p>'}
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    } catch(e) { showToast('خطأ في جلب المنتجات'); }
};

// شاشة تفاصيل المنتج (تتطلب آيدي)
window.openProduct = function(id, name, price, image) {
    const overlay = document.createElement('div');
    overlay.className = 'full-overlay open';
    overlay.id = 'product-overlay';
    
    // تحديد النص الإرشادي لحقل الآيدي
    let idLabel = "أدخل آيدي الحساب / اللعبة";
    let idPlaceholder = "مثال: 512345678";
    if (name.toLowerCase().includes('pubg') || name.toLowerCase().includes('ببجي')) idLabel = "أدخل آيدي ببجي (Player ID)";
    else if (name.toLowerCase().includes('free fire')) idLabel = "أدخل آيدي فري فاير";
    else if (name.toLowerCase().includes('whatsapp') || name.toLowerCase().includes('تلجرام')) idLabel = "أدخل رقم الهاتف";

    overlay.innerHTML = `
        <div class="full-header">
            <h2 style="margin:0;">تفاصيل المنتج</h2>
            <button class="close-btn" onclick="document.getElementById('product-overlay').remove()">×</button>
        </div>
        <div style="padding: 20px; text-align:center; overflow-y:auto; flex:1;">
            <img src="${escapeHtml(image || 'https://placehold.co/100')}" style="width:120px; height:120px; border-radius:24px; object-fit:cover; margin-bottom:20px;">
            <h2 style="margin:0 0 10px;">${escapeHtml(name)}</h2>
            <p style="font-size:24px; color:var(--blue); font-weight:bold; margin-bottom:30px;">${formatMoney(price)}</p>
            
            <div style="text-align:right; margin-bottom:20px;">
                <label style="font-size:13px; color:var(--muted); margin-bottom:8px; display:block;">${idLabel}</label>
                <input type="text" id="product-id-input" placeholder="${idPlaceholder}" style="width:100%; background:var(--surface); border:1px solid var(--border); padding:14px; border-radius:12px; color:white; outline:none; font-family:inherit; font-size:16px; text-align:center;">
                <span style="font-size:11px; color:var(--danger); margin-top:5px; display:block;">* تأكد من الآيدي، لا يمكن استرجاع المبلغ بعد الشحن.</span>
            </div>

            <button class="primary-btn full" onclick="buyProduct(${id})">تأكيد الشراء</button>
            <button class="secondary-btn full" style="margin-top:10px;" onclick="document.getElementById('product-overlay').remove()">إلغاء</button>
        </div>
    `;
    document.body.appendChild(overlay);
};

window.buyProduct = async function(id) {
    const idInput = document.getElementById('product-id-input');
    const customerNote = idInput ? idInput.value.trim() : '';
    
    if (idInput && !customerNote) {
        return showToast('يرجى إدخال الآيدي أولاً!');
    }

    try {
        await apiFetch('/api/orders/create', { method: 'POST', body: JSON.stringify({ product_id: id, quantity: 1, customer_note: customerNote }) });
        showToast('تم إنشاء الطلب بنجاح!');
        document.querySelectorAll('.full-overlay').forEach(e => e.remove());
        state.user = await apiFetch('/api/miniapp/init', { method: 'POST', body: JSON.stringify({}) });
        showPage('orders');
    } catch(e) { showToast(e.message); }
};

// شحن الرصيد وطرق الدفع
async function renderCharge(container) {
    container.innerHTML = `
        ${getHeaderHTML()}
        <section class="page active" style="padding-top: 0;">
            <div class="full-header" style="background:none; border:none;">
                <h1 class="page-title" style="margin:0;">شحن الرصيد</h1>
            </div>
            <div style="padding: 0 20px;">
                <p class="page-subtitle">اختر طريقة الدفع المناسبة لك.</p>
                
                <div class="payment-scroll" id="payment-methods-list">
                    <div style="color:var(--muted);">جاري تحميل طرق الدفع...</div>
                </div>

                <div id="payment-form-container" style="display:none; background:var(--surface); padding:20px; border-radius:20px; border:1px solid var(--border);">
                    <h3 class="panel-title" style="margin-top:0;">تفاصيل التحويل</h3>
                    <div style="background:var(--bg); border:1px solid var(--border); border-radius:14px; padding:16px; margin-bottom:16px;">
                        <p style="margin:0 0 8px; font-size:12px; color:var(--muted);">حول المبلغ إلى:</p>
                        <strong style="display:block; font-size:16px; margin-bottom:8px;" id="selected-pm-name">-</strong>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <strong style="font-family:monospace; font-size:16px; direction:ltr;" id="selected-pm-account">-</strong>
                            <button onclick="copyPaymentAccount()" class="small-action" style="border:0;padding:6px 10px;">نسخ</button>
                        </div>
                    </div>

                    <form id="charge-form">
                        <label class="input-label">المبلغ المحول (ل.س أو $)</label>
                        <input type="number" id="charge-amount" class="field" placeholder="مثال: 50" required>
                        
                        <label class="input-label">رقم عملية التحويل</label>
                        <input type="text" id="charge-reference" class="field" placeholder="أدخل رقم العملية" required>
                        
                        <label class="input-label">صورة إيصال التحويل</label>
                        <input type="file" id="charge-receipt" class="field" accept="image/*" required>
                        
                        <button type="submit" id="submit-charge-btn" class="primary-btn full" style="margin-top:16px;">تأكيد طلب الشحن ←</button>
                    </form>
                </div>
            </div>
        </section>
    `;

    try {
        state.paymentMethods = await apiFetch('/api/payment-methods/');
        const list = document.getElementById('payment-methods-list');
        if (!state.paymentMethods || state.paymentMethods.length === 0) {
            list.innerHTML = '<div class="empty">لا توجد طرق دفع متاحة حالياً.</div>';
            return;
        }

        list.innerHTML = state.paymentMethods.map(pm => `
            <div class="payment-card" data-pm-id="${pm.id}" data-pm-name="${escapeHtml(pm.name)}" data-pm-account="${escapeHtml(pm.account)}">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(pm.name)}&background=random&color=fff&size=100" alt="${escapeHtml(pm.name)}">
                <span>${escapeHtml(pm.name)}</span>
            </div>
        `).join('');

        // إضافة حدث النقر لاختيار طريقة الدفع
        list.querySelectorAll('.payment-card').forEach(card => {
            card.onclick = () => {
                list.querySelectorAll('.payment-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                document.getElementById('selected-pm-name').textContent = card.dataset.pmName;
                document.getElementById('selected-pm-account').textContent = card.dataset.pmAccount;
                document.getElementById('payment-form-container').style.display = 'block';
            };
        });

        // تفعيل النموذج
        document.getElementById('charge-form').onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submit-charge-btn');
            btn.disabled = true; btn.textContent = 'جاري الإرسال...';

            const fd = new FormData();
            fd.append('amount', document.getElementById('charge-amount').value);
            fd.append('reference', document.getElementById('charge-reference').value);
            fd.append('receipt', document.getElementById('charge-receipt').files[0]);

            try {
                await apiFetch('/api/deposits/create', { method: 'POST', body: fd });
                showToast('تم إرسال الطلب بنجاح!');
                showPage('deposits');
            } catch (err) {
                showToast('خطأ: ' + err.message);
                btn.disabled = false; btn.textContent = 'تأكيد طلب الشحن ←';
            }
        };

    } catch(e) { document.getElementById('payment-methods-list').innerHTML = 'تعذر جلب طرق الدفع'; }
}

window.copyPaymentAccount = function() {
    const acc = document.getElementById('selected-pm-account').textContent;
    if(acc && acc !== '-') { navigator.clipboard.writeText(acc); showToast('تم نسخ الرقم!'); }
};

// باقي الصفحات (حسابي، طلباتي، إيداعاتي)
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
                    <div class="avatar" style="background:#0f172a; border:1px solid var(--border);">
                        ${state.user?.photo_url ? `<img src="${escapeHtml(state.user.photo_url)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">` : ''}
                        <svg style="display:${state.user?.photo_url ? 'none' : 'block'}; width:50%; height:50%; color:var(--blue); opacity:0.7;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="7.5" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>
                    </div>
                </div>
            </div>

            <div class="currency-toggle-box" style="margin-top:20px;">
                <div>
                    <strong style="display:block; font-size:15px;">تبديل العملة</strong>
                    <span style="font-size:12px; color:var(--muted);">1 دولار = ${state.exchangeRate} ل.س</span>
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

            <h2 class="extra-title">الخدمات الأساسية</h2>
            <section class="service-list">
                <button class="service-row" data-action="kyc"><span class="service-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg></span><span><span class="service-title">توثيق الحساب</span><span class="service-desc">${state.user?.is_verified ? 'حسابك موثق' : 'رفع الهوية'}</span></span></button>
                <button class="service-row" data-action="ledger"><span class="service-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12a2 2 0 0 1 2 2v17l-4-2-4 2-4-2-4 2V5a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h8M8 16h4"/></svg></span><span><span class="service-title">السجل المالي</span></span></button>
                <button class="service-row" onclick="window.openChat()"><span class="service-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 13v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="12" width="4" height="7" rx="2"/><rect x="17" y="12" width="4" height="7" rx="2"/><path d="M17 19c0 2-2 3-5 3"/></svg></span><span><span class="service-title">الدعم الفني</span></span></button>
            </section>
        </section>
    `;
}

async function renderOrders(container) {
    container.innerHTML = `${getHeaderHTML()}<section class="page active" style="padding-top: 0;"><h1 class="page-title">طلباتي</h1><div class="list" id="orders-list">جاري التحميل...</div></section>`;
    try {
        const res = await apiFetch('/api/orders/');
        const list = document.getElementById('orders-list');
        if (!res.items || res.items.length === 0) { list.innerHTML = '<div class="empty">لا توجد طلبات.</div>'; return; }
        const getBadge = (s) => { const map = { completed: 'badge-success', pending: 'badge-warning', rejected: 'badge-danger' }; const label = { completed: 'مكتمل', pending: 'معلق', rejected: 'مرفوض' }; return `<span class="badge ${map[s] || ''}">${label[s] || s}</span>`; };
        list.innerHTML = res.items.map(o => `<div class="list-item"><span class="item-main"><span class="item-title">${escapeHtml(o.product_name)}</span><span class="item-desc">${escapeHtml(o.order_number)}</span><span class="item-meta">${getBadge(o.status)} <strong>${formatMoney(o.amount)}</strong></span></span></div>`).join('');
    } catch (e) { document.getElementById('orders-list').innerHTML = `<div class="empty" style="color:red;">${e.message}</div>`; }
}

async function renderDeposits(container) {
    container.innerHTML = `${getHeaderHTML()}<section class="page active" style="padding-top: 0;"><h1 class="page-title">الإيداعات</h1><div class="list" id="dep-list">جاري التحميل...</div></section>`;
    try {
        const res = await apiFetch('/api/deposits/');
        const list = document.getElementById('dep-list');
        if (!res.items || res.items.length === 0) { list.innerHTML = '<div class="empty">لا توجد إيداعات.</div>'; return; }
        list.innerHTML = res.items.map(d => `<div class="list-item"><span class="item-main"><span class="item-title">${escapeHtml(d.reference || 'إيداع')}</span><span class="item-meta"><strong>${formatMoney(d.amount)}</strong></span></span></div>`).join('');
    } catch (e) { document.getElementById('dep-list').innerHTML = `<div class="empty" style="color:var(--danger);text-align:center;"><p>تعذر جلب الإيداعات.</p><button onclick="showPage('deposits')" class="primary-btn" style="margin-top:10px;">إعادة المحاولة 🔄</button></div>`; }
}

// ── الدوال المساعدة (Chat, KYC, Ledger, Currency) ──
window.toggleCurrency = function(isSYP) { state.currency = isSYP ? 'SYP' : 'USD'; showPage('account'); showToast(isSYP ? 'تم التحويل لليرة' : 'تم التحويل للدولار'); };

window.openChat = async function() {
    const overlay = document.createElement('div');
    overlay.className = 'chat-overlay open'; overlay.id = 'chat-overlay';
    overlay.innerHTML = `
        <div class="chat-header">
            <button onclick="document.getElementById('chat-overlay').remove()" style="background:none;border:none;color:white;font-size:24px;">×</button>
            <h2 style="margin:0; font-size:16px;">الدعم الفني</h2>
        </div>
        <div class="chat-messages" id="chat-msgs">جاري التحميل...</div>
        <div class="chat-input-area">
            <input type="text" id="chat-input" placeholder="اكتب رسالتك...">
            <button class="primary-btn" onclick="window.sendChat()">إرسال</button>
        </div>
    `;
    document.body.appendChild(overlay);
    loadChatMessages();
};

async function loadChatMessages() {
    try {
        const msgs = await apiFetch('/api/support/messages');
        const box = document.getElementById('chat-msgs');
        if (!msgs || !msgs.length) { box.innerHTML = '<p style="text-align:center; color:var(--muted);">مرحباً! كيف يمكننا مساعدتك؟</p>'; return; }
        box.innerHTML = msgs.map(m => `<div class="chat-bubble ${m.sender === 'user' ? 'user' : 'admin'}">${escapeHtml(m.message)}</div>`).join('');
        box.scrollTop = box.scrollHeight;
    } catch(e) { document.getElementById('chat-msgs').innerHTML = 'تعذر التحميل'; }
}
window.sendChat = async function() {
    const input = document.getElementById('chat-input'); if (!input.value.trim()) return;
    const text = input.value; input.value = '';
    const box = document.getElementById('chat-msgs');
    box.innerHTML += `<div class="chat-bubble user">${escapeHtml(text)}</div>`; box.scrollTop = box.scrollHeight;
    try { await apiFetch('/api/support/send', { method: 'POST', body: JSON.stringify({ message: text }) }); } catch(e) { showToast('فشل الإرسال'); }
};

window.openLedger = async function() {
    showToast('جاري تحميل السجل...');
    try {
        const records = await apiFetch('/api/ledger');
        const overlay = document.createElement('div'); overlay.className = 'bottom-sheet-overlay open';
        overlay.innerHTML = `<div class="bottom-sheet" style="height: 70vh; overflow-y: auto;">
            <div style="display:flex; justify-content:space-between; margin-bottom:20px;"><h2 style="margin:0;">السجل المالي</h2><button onclick="this.closest('.bottom-sheet-overlay').remove()" style="background:none; border:none; color:white; font-size:24px;">×</button></div>
            <div class="list">${records.length ? records.map(r => `<div class="list-item"><span class="item-main"><span class="item-title">${escapeHtml(r.desc || r.type)}</span><span class="item-desc">${new Date(r.date).toLocaleString('ar-EG')}</span></span><div style="text-align:left;"><strong style="color:${r.amount > 0 ? 'var(--success)' : 'var(--danger)'}; font-family:monospace; font-size:15px;">${r.amount > 0 ? '+' : ''}${r.amount.toFixed(2)}</strong></div></div>`).join('') : '<div class="empty">لا توجد حركات مالية.</div>'}</div>
        </div>`;
        document.body.appendChild(overlay);
    } catch(e) { showToast('تعذر جلب السجل'); }
};

window.openKYC = async function() {
    showToast('جاري التحقق...');
    try {
        const res = await apiFetch('/api/kyc/status');
        const overlay = document.createElement('div'); overlay.className = 'bottom-sheet-overlay open';
        let content = '';
        if (res.status === 'approved') content = `<div style="text-align:center; padding:20px;"><h3 style="color:var(--success);">حسابك موثق بالفعل ✅</h3></div>`;
        else if (res.status === 'pending') content = `<div style="text-align:center; padding:20px;"><h3 style="color:var(--warning);">طلبك قيد المراجعة ⏳</h3></div>`;
        else content = `<form id="kyc-form" style="display:flex; flex-direction:column; gap:12px;">
                    <p style="font-size:12px; color:var(--muted);">يرجى إدخال بياناتك الحقيقية.</p>
                    <div><label style="font-size:12px; color:var(--muted);">الاسم الكامل</label><input type="text" id="kyc-name" required style="width:100%; background:var(--bg); border:1px solid var(--border); padding:10px; border-radius:8px; color:white;"></div>
                    <div><label style="font-size:12px; color:var(--muted);">رقم الهاتف</label><input type="tel" id="kyc-phone" required style="width:100%; background:var(--bg); border:1px solid var(--border); padding:10px; border-radius:8px; color:white;"></div>
                    <div><label style="font-size:12px; color:var(--muted);">العنوان</label><input type="text" id="kyc-address" required style="width:100%; background:var(--bg); border:1px solid var(--border); padding:10px; border-radius:8px; color:white;"></div>
                    <div><label style="font-size:12px; color:var(--muted);">صورة الهوية</label><input type="file" id="kyc-id" required accept="image/*" style="width:100%; color:white;"></div>
                    <div><label style="font-size:12px; color:var(--muted);">صورة سيلفي</label><input type="file" id="kyc-selfie" required accept="image/*" style="width:100%; color:white;"></div>
                    <button type="submit" class="primary-btn full" style="margin-top:10px;">إرسال الطلب</button></form>`;
        
        overlay.innerHTML = `<div class="bottom-sheet" style="height: 70vh; overflow-y: auto;">
            <div style="display:flex; justify-content:space-between; margin-bottom:20px;"><h2 style="margin:0;">توثيق الحساب</h2><button onclick="this.closest('.bottom-sheet-overlay').remove()" style="background:none; border:none; color:white; font-size:24px;">×</button></div>
            ${content}
        </div>`;
        document.body.appendChild(overlay);
        if (res.status !== 'approved' && res.status !== 'pending') {
            document.getElementById('kyc-form').onsubmit = async (e) => {
                e.preventDefault(); const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = 'جاري الإرسال...';
                const fd = new FormData(); fd.append('full_name', document.getElementById('kyc-name').value); fd.append('phone', document.getElementById('kyc-phone').value); fd.append('address', document.getElementById('kyc-address').value); fd.append('id_front', document.getElementById('kyc-id').files[0]); fd.append('selfie', document.getElementById('kyc-selfie').files[0]);
                try { await apiFetch('/api/kyc/submit', { method: 'POST', body: fd }); showToast('تم إرسال الطلب!'); overlay.remove(); } 
                catch(e) { alert('فشل: ' + e.message); btn.disabled = false; btn.textContent = 'إرسال الطلب'; }
            };
        }
    } catch(e) { showToast('تعذر جلب حالة التوثيق'); }
};

// ── التهيئة ──
async function initApp() {
    if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor('#080E1B'); }

    document.body.addEventListener('click', (e) => {
        const routeBtn = e.target.closest('[data-route]');
        if (routeBtn) { e.preventDefault(); showPage(routeBtn.dataset.route); return; }
        
        const actionBtn = e.target.closest('[data-action]');
        if (actionBtn) { const action = actionBtn.dataset.action; if (action === 'ledger') window.openLedger(); if (action === 'kyc') window.openKYC(); return; }
        
        const catBtn = e.target.closest('.category');
        if (catBtn) { window.openCategory(catBtn.dataset.catId, catBtn.dataset.catName); return; }
        
        const prodBtn = e.target.closest('.product-card');
        if (prodBtn) { window.openProduct(prodBtn.dataset.pId, prodBtn.dataset.pName, prodBtn.dataset.pPrice, prodBtn.dataset.pImage); return; }
    });

    try {
        if (!tg?.initData) throw new Error("يرجى فتح التطبيق من تيليجرام.");
        state.user = await apiFetch('/api/miniapp/init', { method: 'POST', body: JSON.stringify({}) });
        if(state.user.exchange_rate) state.exchangeRate = state.user.exchange_rate;
        
        const loader = document.getElementById('app-loading'); if(loader) loader.remove();
        showPage('home');
    } catch (err) {
        document.getElementById('app-loading').innerHTML = `<div style="text-align:center;color:red;padding:20px;"><h2>حدث خطأ</h2><p>${escapeHtml(err.message)}</p><button onclick="window.location.reload()" style="margin-top:10px;padding:10px;background:#38BDF8;color:black;border:none;border-radius:8px;">إعادة المحاولة</button></div>`;
    }
}

document.addEventListener('DOMContentLoaded', initApp);
