// ═══════════════════════════════════════════════════════════
// SANAD PLUS⁺ - Core Application (V5 - Full Screen & Pro)
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

// نظام فتح وإغلاق الشاشات الكاملة
function openFullScreen(id, title, contentHtml) {
    let overlay = document.getElementById(id);
    if (overlay) overlay.remove(); // إزالة أي نسخة قديمة
    
    overlay = document.createElement('div');
    overlay.id = id;
    overlay.className = 'full-overlay';
    overlay.innerHTML = `
        <div class="full-header">
            <button class="close-btn" onclick="document.getElementById('${id}').remove()">×</button>
            <h2 style="margin:0; font-size:18px;">${title}</h2>
            <div style="width:36px;"></div> <!-- للتوازن -->
        </div>
        <div style="padding: 20px; overflow-y: auto; flex: 1;">
            ${contentHtml}
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('open'), 10);
}

// الهيدر الموحد
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
    </header>`;
}

function showPage(route) {
    state.currentPage = route;
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.route === route));
    const app = document.getElementById('app-content');
    if (route === 'home') renderHome(app);
    else if (route === 'account') renderAccount(app);
    else if (route === 'orders') renderOrders(app);
    else if (route === 'charge') renderCharge(app);
}

// ── الصفحات الأساسية ──

async function renderHome(container) {
    container.innerHTML = `
        <section class="page active" style="padding-top: 0;">
            <div class="home-header">
                <div class="home-top-row">
                    <div class="welcome-text">أهلًا، <span>${escapeHtml(state.user?.first_name || 'عميلنا')}</span> 👋</div>
                    <div class="header-actions">
                        <button class="icon-btn-chat" onclick="openChat()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                        </button>
                    </div>
                </div>
                <div class="balance-card-new" data-route="charge">
                    <div>
                        <span class="bal-label">رصيدك الحالي</span>
                        <div class="bal-value">${formatMoney(state.user?.balance)}</div>
                    </div>
                    <button class="small-action">شحن +</button>
                </div>
            </div>
            
            <div class="section-heading" style="padding: 0 20px;"><h2>اكتشف خدماتنا</h2></div>
            <section class="categories" id="home-categories"><div style="text-align:center;padding:20px;color:var(--muted); grid-column:1/-1;">جاري التحميل...</div></section>
        </section>
    `;

    try {
        const cats = await apiFetch('/api/categories/');
        const catContainer = document.getElementById('home-categories');
        if (cats && cats.length > 0) {
            catContainer.innerHTML = cats.map(cat => `
                <button class="category" data-cat-id="${cat.id}" data-cat-name="${escapeHtml(cat.name)}">
                    <span class="category-icon">${cat.image ? `<img src="${escapeHtml(cat.image)}" alt="${escapeHtml(cat.name)}">` : `<svg viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>`}</span>
                    <span><strong>${escapeHtml(cat.name)}</strong><br><small style="color:var(--muted);font-size:11px;">خدمات رقمية</small></span>
                </button>
            `).join('');
        } else {
            catContainer.innerHTML = '<div class="empty" style="grid-column:1/-1;">لا توجد أقسام متاحة.</div>';
        }
    } catch (e) { document.getElementById('home-categories').innerHTML = '<div class="empty" style="grid-column:1/-1;color:red;">تعذر تحميل الأقسام</div>'; }
}

async function renderOrders(container) {
    container.innerHTML = `${getHeaderHTML()}<section class="page active" style="padding-top: 0;"><h1 class="page-title" style="padding:0 20px;">طلباتي</h1><div class="list" id="orders-list" style="padding:0 20px;">جاري التحميل...</div></section>`;
    try {
        const res = await apiFetch('/api/orders/');
        const list = document.getElementById('orders-list');
        if (!res.items || res.items.length === 0) { list.innerHTML = '<div class="empty">لا توجد طلبات.</div>'; return; }
        const getBadge = (s) => { const map = { completed: 'badge-success', pending: 'badge-warning', rejected: 'badge-danger' }; const label = { completed: 'مكتمل', pending: 'معلق', rejected: 'مرفوض' }; return `<span class="badge ${map[s] || ''}">${label[s] || s}</span>`; };
        list.innerHTML = res.items.map(o => `<div class="list-item"><span class="item-main"><span class="item-title">${escapeHtml(o.product_name)}</span><span class="item-desc">${escapeHtml(o.order_number)}</span><span class="item-meta">${getBadge(o.status)} <strong>${formatMoney(o.amount)}</strong></span></span></div>`).join('');
    } catch (e) { document.getElementById('orders-list').innerHTML = `<div class="empty" style="color:red;">${e.message}</div>`; }
}

async function renderCharge(container) {
    container.innerHTML = `
        ${getHeaderHTML()}
        <section class="page active" style="padding-top: 0;">
            <h1 class="page-title" style="padding:0 20px;">شحن الرصيد</h1>
            <p class="page-subtitle" style="padding:0 20px;">اختر طريقة الدفع المناسبة.</p>
            
            <div class="payment-scroll" id="payment-methods-list" style="padding:0 20px;">
                <div style="color:var(--muted);">جاري تحميل طرق الدفع...</div>
            </div>

            <div id="payment-form-container" style="display:none; padding: 0 20px;">
                <div style="background:var(--surface); border:1px solid var(--border); border-radius:20px; padding:20px;">
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
                        <label class="input-label">المبلغ المحول</label>
                        <input type="number" id="charge-amount" class="field" required>
                        <label class="input-label">رقم عملية التحويل</label>
                        <input type="text" id="charge-reference" class="field" required>
                        <label class="input-label">صورة الإيصال</label>
                        <input type="file" id="charge-receipt" class="field" accept="image/*" required>
                        <button type="submit" class="primary-btn full" style="margin-top:16px;">تأكيد الشحن</button>
                    </form>
                </div>
            </div>
        </section>
    `;

    try {
        state.paymentMethods = await apiFetch('/api/payment-methods/');
        const list = document.getElementById('payment-methods-list');
        if (!state.paymentMethods || state.paymentMethods.length === 0) {
            list.innerHTML = '<div class="empty">لا توجد طرق دفع متاحة.</div>'; return;
        }

        list.innerHTML = state.paymentMethods.map(pm => `
            <div class="payment-card" data-pm-name="${escapeHtml(pm.name)}" data-pm-account="${escapeHtml(pm.account)}">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(pm.name)}&background=random&color=fff&size=100">
                <span>${escapeHtml(pm.name)}</span>
            </div>
        `).join('');

        list.querySelectorAll('.payment-card').forEach(card => {
            card.onclick = () => {
                list.querySelectorAll('.payment-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                document.getElementById('selected-pm-name').textContent = card.dataset.pmName;
                document.getElementById('selected-pm-account').textContent = card.dataset.pmAccount;
                document.getElementById('payment-form-container').style.display = 'block';
            };
        });

        document.getElementById('charge-form').onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = 'جاري الإرسال...';
            const fd = new FormData();
            fd.append('amount', document.getElementById('charge-amount').value);
            fd.append('reference', document.getElementById('charge-reference').value);
            fd.append('receipt', document.getElementById('charge-receipt').files[0]);
            try {
                await apiFetch('/api/deposits/create', { method: 'POST', body: fd });
                showToast('تم إرسال الطلب!'); showPage('home');
            } catch (err) { showToast('خطأ: ' + err.message); btn.disabled = false; btn.textContent = 'تأكيد الشحن'; }
        };
    } catch(e) { document.getElementById('payment-methods-list').innerHTML = 'تعذر جلب طرق الدفع'; }
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
                <button class="service-row" onclick="openKYC()"><span class="service-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg></span><span><span class="service-title">توثيق الحساب</span></span></button>
                <button class="service-row" onclick="openLedger()"><span class="service-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12a2 2 0 0 1 2 2v17l-4-2-4 2-4-2-4 2V5a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h8M8 16h4"/></svg></span><span><span class="service-title">السجل المالي</span></span></button>
                <button class="service-row" onclick="openChat()"><span class="service-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 13v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="12" width="4" height="7" rx="2"/><rect x="17" y="12" width="4" height="7" rx="2"/><path d="M17 19c0 2-2 3-5 3"/></svg></span><span><span class="service-title">الدعم الفني</span></span></button>
            </section>

            <h2 class="extra-title">الخدمات الإضافية</h2>
            <section class="extra-list">
                <button class="extra-row" onclick="openInfo('الإحالة', 'رابط الإحالة الخاص بك: sanad.plus/ref/${escapeHtml(state.user?.sanad_id)}')"><span class="icon-tile">🔗</span><span><span class="service-title">الإحالة</span></span></button>
                <button class="extra-row" onclick="openInfo('الإشعارات', 'لا توجد إشعارات جديدة حالياً.')"><span class="icon-tile">🔔</span><span><span class="service-title">الإشعارات</span></span></button>
                <button class="extra-row" onclick="openInfo('الأمان والخصوصية', 'حسابك محمي بتشفير تيليجرام. لا تشارك معرف SANAD ID الخاص بك مع أي شخص.')"><span class="icon-tile">🛡️</span><span><span class="service-title">الأمان والخصوصية</span></span></button>
                <button class="extra-row" onclick="openInfo('مركز المساعدة', 'للاستفسارات، يرجى استخدام زر الدعم الفني.')"><span class="icon-tile">❓</span><span><span class="service-title">مركز المساعدة</span></span></button>
            </section>
        </section>
    `;
}

// ── الشاشات الكاملة (Full Screens) ──

window.openCategory = async function(catId, catName) {
    showToast('جاري جلب المنتجات...');
    try {
        const products = await apiFetch(`/api/products/?category_id=${catId}`);
        const html = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                ${products.length ? products.map(p => `
                    <div class="product-card" onclick="openProduct(${p.id}, '${escapeHtml(p.name)}', ${p.price}, '${escapeHtml(p.image)}')">
                        <img src="${escapeHtml(p.image || 'https://placehold.co/100')}" style="width:60px; height:60px; border-radius:12px; margin-bottom:10px;">
                        <strong style="display:block; font-size:13px; margin-bottom:5px;">${escapeHtml(p.name)}</strong>
                        <span style="color:var(--blue); font-weight:bold;">${formatMoney(p.price)}</span>
                    </div>
                `).join('') : '<p>لا توجد منتجات.</p>'}
            </div>
        `;
        openFullScreen('category-screen', catName, html);
    } catch(e) { showToast('خطأ في جلب المنتجات'); }
};

window.openProduct = function(id, name, price, image) {
    let idLabel = "أدخل آيدي الحساب / اللعبة";
    if (name.toLowerCase().includes('pubg') || name.toLowerCase().includes('ببجي')) idLabel = "أدخل آيدي ببجي (Player ID)";
    
    const html = `
        <div style="text-align:center;">
            <img src="${escapeHtml(image || 'https://placehold.co/100')}" style="width:120px; height:120px; border-radius:24px; object-fit:cover; margin-bottom:20px;">
            <h2 style="margin:0 0 10px;">${escapeHtml(name)}</h2>
            <p style="font-size:24px; color:var(--blue); font-weight:bold; margin-bottom:30px;">${formatMoney(price)}</p>
            
            <div style="text-align:right; margin-bottom:20px;">
                <label style="font-size:13px; color:var(--muted); margin-bottom:8px; display:block;">${idLabel}</label>
                <input type="text" id="product-id-input" placeholder="مثال: 512345678" style="width:100%; background:var(--surface); border:1px solid var(--border); padding:14px; border-radius:12px; color:white; outline:none; font-family:inherit; font-size:16px; text-align:center;">
                <span style="font-size:11px; color:var(--danger); margin-top:5px; display:block;">* تأكد من الآيدي، لا يمكن استرجاع المبلغ بعد الشحن.</span>
            </div>

            <button class="primary-btn full" onclick="buyProduct(${id})">تأكيد الشراء</button>
        </div>
    `;
    openFullScreen('product-screen', 'تفاصيل المنتج', html);
};

window.buyProduct = async function(id) {
    const idInput = document.getElementById('product-id-input');
    const customerNote = idInput ? idInput.value.trim() : '';
    if (idInput && !customerNote) return showToast('يرجى إدخال الآيدي أولاً!');

    try {
        await apiFetch('/api/orders/create', { method: 'POST', body: JSON.stringify({ product_id: id, quantity: 1, customer_note: customerNote }) });
        showToast('تم إنشاء الطلب بنجاح!');
        document.querySelectorAll('.full-overlay').forEach(e => e.remove());
        state.user = await apiFetch('/api/miniapp/init', { method: 'POST', body: JSON.stringify({}) });
        showPage('orders');
    } catch(e) { showToast(e.message); }
};

window.openChat = async function() {
    const html = `
        <div class="chat-messages" id="chat-msgs" style="height: 60vh; overflow-y:auto; display:flex; flex-direction:column; gap:10px;">جاري التحميل...</div>
        <div class="chat-input-area" style="margin-top:20px; display:flex; gap:10px;">
            <input type="text" id="chat-input" placeholder="اكتب رسالتك..." style="flex:1; padding:12px; border-radius:12px; border:1px solid var(--border); background:var(--surface); color:white;">
            <button class="primary-btn" onclick="sendChat()">إرسال</button>
        </div>
    `;
    openFullScreen('chat-screen', 'الدعم الفني', html);
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
        const html = `
            <div class="list">
                ${records.length ? records.map(r => `
                    <div class="list-item">
                        <span class="item-main"><span class="item-title">${escapeHtml(r.desc || r.type)}</span><span class="item-desc">${new Date(r.date).toLocaleString('ar-EG')}</span></span>
                        <div style="text-align:left;"><strong style="color:${r.amount > 0 ? 'var(--success)' : 'var(--danger)'}; font-family:monospace; font-size:15px;">${r.amount > 0 ? '+' : ''}${r.amount.toFixed(2)}</strong></div>
                    </div>
                `).join('') : '<div class="empty">لا توجد حركات مالية.</div>'}
            </div>
        `;
        openFullScreen('ledger-screen', 'السجل المالي', html);
    } catch(e) { showToast('تعذر جلب السجل'); }
};

window.openKYC = async function() {
    showToast('جاري التحقق...');
    try {
        const res = await apiFetch('/api/kyc/status');
        let content = '';
        if (res.status === 'approved') content = `<div style="text-align:center; padding:20px;"><h3 style="color:var(--success);">حسابك موثق بالفعل ✅</h3></div>`;
        else if (res.status === 'pending') content = `<div style="text-align:center; padding:20px;"><h3 style="color:var(--warning);">طلبك قيد المراجعة ⏳</h3></div>`;
        else {
            const govs = ['دمشق','ريف دمشق','حلب','حمص','حماة','اللاذقية','طرطوس','إدلب','دير الزور','الرقة','الحسكة','درعا','السويداء','القنيطرة'];
            content = `
                <form id="kyc-form" style="display:flex; flex-direction:column; gap:15px;">
                    <div><label class="input-label">الاسم الكامل</label><input type="text" id="kyc-name" required class="field"></div>
                    <div><label class="input-label">رقم الجوال</label><input type="tel" id="kyc-phone" required class="field"></div>
                    <div><label class="input-label">المحافظة</label>
                        <select id="kyc-gov" required class="field">
                            <option value="">اختر المحافظة</option>
                            ${govs.map(g => `<option value="${g}">${g}</option>`).join('')}
                        </select>
                    </div>
                    <div><label class="input-label">المنطقة</label><input type="text" id="kyc-region" required class="field"></div>
                    
                    <div>
                        <label class="input-label">صورة الوجه الأمامي للهوية</label>
                        <div class="kyc-upload-box">
                            <input type="file" id="kyc-id" required accept="image/*" onchange="this.nextElementSibling.textContent = this.files[0].name">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                            <span>اضغط لرفع الصورة</span>
                            <small>يرجى رفع صورة واضحة للهوية</small>
                        </div>
                    </div>

                    <div>
                        <label class="input-label">صورة سيلفي مع الهوية</label>
                        <div class="kyc-upload-box">
                            <input type="file" id="kyc-selfie" required accept="image/*" onchange="this.nextElementSibling.textContent = this.files[0].name">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>
                            <span>اضغط لرفع الصورة</span>
                            <small>ارفع صورة سيلفي وأنت تحمل الهوية</small>
                        </div>
                    </div>

                    <button type="submit" class="primary-btn full" style="margin-top:10px;">إرسال الطلب</button>
                </form>`;
        }
        openFullScreen('kyc-screen', 'توثيق الحساب', content);
        
        if (res.status !== 'approved' && res.status !== 'pending') {
            document.getElementById('kyc-form').onsubmit = async (e) => {
                e.preventDefault(); const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = 'جاري الإرسال...';
                const fd = new FormData(); 
                fd.append('full_name', document.getElementById('kyc-name').value); 
                fd.append('phone', document.getElementById('kyc-phone').value); 
                fd.append('governorate', document.getElementById('kyc-gov').value); 
                fd.append('region', document.getElementById('kyc-region').value); 
                fd.append('id_front', document.getElementById('kyc-id').files[0]); 
                fd.append('selfie', document.getElementById('kyc-selfie').files[0]);
                try { await apiFetch('/api/kyc/submit', { method: 'POST', body: fd }); showToast('تم إرسال الطلب!'); document.getElementById('kyc-screen').remove(); } 
                catch(e) { alert('فشل: ' + e.message); btn.disabled = false; btn.textContent = 'إرسال الطلب'; }
            };
        }
    } catch(e) { showToast('تعذر جلب حالة التوثيق'); }
};

window.openInfo = function(title, text) {
    const html = `<div style="padding:20px; text-align:center;"><p style="font-size:16px; line-height:1.6;">${text}</p></div>`;
    openFullScreen('info-screen', title, html);
};

window.copyPaymentAccount = function() {
    const acc = document.getElementById('selected-pm-account').textContent;
    if(acc && acc !== '-') { navigator.clipboard.writeText(acc); showToast('تم نسخ الرقم!'); }
};

// ── التهيئة ──
async function initApp() {
    if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor('#080E1B'); }

    document.body.addEventListener('click', (e) => {
        const routeBtn = e.target.closest('[data-route]');
        if (routeBtn) { e.preventDefault(); showPage(routeBtn.dataset.route); return; }
        
        const catBtn = e.target.closest('.category');
        if (catBtn) { window.openCategory(catBtn.dataset.catId, catBtn.dataset.catName); return; }
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
