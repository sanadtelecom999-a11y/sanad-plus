// ═══════════════════════════════════════════════════════════
// SANAD PLUS⁺ - Core Application (V6 - Premium Clean)
// ═══════════════════════════════════════════════════════════
const API_BASE = 'https://sanad-plus-backend.onrender.com';
const state = { user: null, categories: [], currentPage: 'home', currency: 'USD', exchangeRate: 130, paymentMethods: [] };
const tg = window.Telegram?.WebApp;

const escapeHtml = (str) => String(str || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function formatMoney(amount) {
    const amt = Number(amount || 0);
    return state.currency === 'USD' ? `$${amt.toFixed(2)}` : `${(amt * state.exchangeRate).toFixed(0)} ل.س`;
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
    let t = document.getElementById('toast');
    if(!t) { t = document.createElement('div'); t.id='toast'; document.body.appendChild(t); }
    t.textContent = msg; 
    t.style.cssText = 'position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:var(--blue); color:#000; padding:12px 24px; border-radius:20px; font-weight:bold; z-index:9999; transition:0.3s; opacity:1;';
    setTimeout(() => { t.style.opacity = '0'; }, 2500);
}

function openFullScreen(id, title, contentHtml) {
    let overlay = document.getElementById(id);
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = id;
    overlay.className = 'full-overlay';
    overlay.innerHTML = `
        <div class="full-header">
            <h2 style="margin:0; font-size:18px;">${title}</h2>
            <button class="close-btn" onclick="document.getElementById('${id}').remove()">×</button>
        </div>
        <div style="padding: 20px; overflow-y: auto; flex: 1;">
            ${contentHtml}
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('open'), 10);
}

function showPage(route) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.route === route));
    const app = document.getElementById('app-content');
    if (route === 'home') renderHome(app);
    else if (route === 'account') renderAccount(app);
    else if (route === 'orders') renderOrders(app);
    else if (route === 'charge') renderCharge(app);
}

// ── 1. الصفحة الرئيسية ──
async function renderHome(container) {
    container.innerHTML = `
        <div class="home-header">
            <div class="home-top">
                <div class="greeting">أهلًا، <span>${escapeHtml(state.user?.first_name || 'عميلنا')}</span> 👋</div>
                <button class="header-icon-btn" onclick="openChat()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                </button>
            </div>
            <div class="balance-card">
                <div class="balance-info">
                    <span class="balance-label">رصيدك الحالي</span>
                    <span class="balance-value">${formatMoney(state.user?.balance)}</span>
                </div>
                <button class="charge-btn" onclick="showPage('charge')">
                    شحن <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12h14"/></svg>
                </button>
            </div>
        </div>
        <div class="section-title">اكتشف خدماتنا</div>
        <div class="categories-grid" id="home-categories"><div style="color:var(--muted); grid-column:1/-1; text-align:center;">جاري التحميل...</div></div>
    `;

    try {
        const cats = await apiFetch('/api/categories/');
        const catContainer = document.getElementById('home-categories');
        if (cats && cats.length > 0) {
            catContainer.innerHTML = cats.map(cat => `
                <div class="category-card" onclick="openCategory(${cat.id}, '${escapeHtml(cat.name)}')">
                    <div class="category-icon">${cat.image ? `<img src="${escapeHtml(cat.image)}">` : '📦'}</div>
                    <div class="category-info"><strong>${escapeHtml(cat.name)}</strong><span>خدمات رقمية</span></div>
                </div>
            `).join('');
        } else {
            catContainer.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--muted);">لا توجد أقسام.</div>';
        }
    } catch (e) { document.getElementById('home-categories').innerHTML = '<div style="color:red; grid-column:1/-1; text-align:center;">خطأ في التحميل</div>'; }
}

// ── 2. صفحة حسابي ──
async function renderAccount(container) {
    container.innerHTML = `
        <div class="profile-header">
            <div class="avatar-box">
                ${state.user?.photo_url ? `<img src="${escapeHtml(state.user.photo_url)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">` : ''}
                <svg style="display:${state.user?.photo_url ? 'none' : 'block'};" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>
            </div>
            <div class="profile-info">
                <h2>${escapeHtml(state.user?.first_name || 'مستخدم')}</h2>
                <p>@${escapeHtml(tg?.initDataUnsafe?.user?.username || 'user')}</p>
            </div>
        </div>

        <div class="toggle-card">
            <div class="toggle-info">
                <strong>تبديل العملة</strong>
                <span>1 دولار = ${state.exchangeRate} ل.س</span>
            </div>
            <label class="switch">
                <input type="checkbox" ${state.currency === 'SYP' ? 'checked' : ''} onchange="window.toggleCurrency(this.checked)">
                <span class="slider"></span>
            </label>
        </div>

        <div class="sanad-card">
            <p>معرّف SANAD ID</p>
            <h3>${escapeHtml(state.user?.sanad_id || '---')}</h3>
        </div>

        <div class="services-grid">
            <div class="service-card" onclick="openKYC()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg>
                <span>توثيق الحساب</span>
            </div>
            <div class="service-card" onclick="openLedger()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12a2 2 0 0 1 2 2v17l-4-2-4 2-4-2-4 2V5a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h8M8 16h4"/></svg>
                <span>السجل المالي</span>
            </div>
            <div class="service-card" onclick="openChat()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                <span>الدعم الفني</span>
            </div>
            <div class="service-card" onclick="openInfo('الأمان', 'حسابك محمي بالكامل عبر تيليجرام.')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 20 5v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3Z"/><path d="m9 12 2 2 4-4"/></svg>
                <span>الأمان والخصوصية</span>
            </div>
            <div class="service-card" onclick="openInfo('الإحالة', 'رابط الإحالة: sanad.plus/ref/${escapeHtml(state.user?.sanad_id)}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.4M8.7 13.3l6.6 4.4"/></svg>
                <span>الإحالة</span>
            </div>
            <div class="service-card" onclick="openInfo('المساعدة', 'يرجى التواصل مع الدعم الفني.')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.4 1.6c-1.2 1.1-2 1.4-2 3M12 17h.01"/></svg>
                <span>مركز المساعدة</span>
            </div>
        </div>
    `;
}

// ── 3. شاشات المنتجات ──
window.openCategory = async function(catId, catName) {
    showToast('جاري جلب المنتجات...');
    try {
        const products = await apiFetch(`/api/products/?category_id=${catId}`);
        const html = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                ${products.length ? products.map(p => `
                    <div class="category-card" style="flex-direction:column; padding:15px; text-align:center;" onclick="openProduct(${p.id}, '${escapeHtml(p.name)}', ${p.price}, '${escapeHtml(p.image)}')">
                        <img src="${escapeHtml(p.image || 'https://placehold.co/100')}" style="width:60px; height:60px; border-radius:12px; margin-bottom:10px;">
                        <strong style="font-size:13px; display:block; margin-bottom:5px;">${escapeHtml(p.name)}</strong>
                        <span style="color:var(--blue); font-weight:bold; font-size:14px;">${formatMoney(p.price)}</span>
                    </div>
                `).join('') : '<p style="grid-column:1/-1; text-align:center;">لا توجد منتجات.</p>'}
            </div>
        `;
        openFullScreen('cat-screen', catName, html);
    } catch(e) { showToast('خطأ في الجلب'); }
};

window.openProduct = function(id, name, price, image) {
    let idLabel = "أدخل آيدي الحساب / اللعبة";
    if (name.toLowerCase().includes('pubg') || name.toLowerCase().includes('ببجي')) idLabel = "أدخل آيدي ببجي (Player ID)";
    
    const html = `
        <div style="text-align:center;">
            <img src="${escapeHtml(image || 'https://placehold.co/100')}" style="width:100px; height:100px; border-radius:20px; object-fit:cover; margin-bottom:15px;">
            <h2 style="margin:0 0 10px;">${escapeHtml(name)}</h2>
            <p style="font-size:22px; color:var(--blue); font-weight:bold; margin-bottom:20px;">${formatMoney(price)}</p>
            
            <div class="input-group" style="text-align:right; margin-bottom:20px;">
                <label>${idLabel}</label>
                <input type="text" id="product-id-input" placeholder="مثال: 512345678" style="text-align:center;">
                <small style="color:var(--danger); font-size:10px; margin-top:5px; display:block;">* تأكد من الآيدي، لا يمكن استرجاع المبلغ.</small>
            </div>
            <button class="btn-primary" onclick="buyProduct(${id})">تأكيد الشراء</button>
        </div>
    `;
    openFullScreen('prod-screen', 'تفاصيل المنتج', html);
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

// ── 4. التوثيق (KYC) ──
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
                <form id="kyc-form" class="kyc-form">
                    <div class="input-group"><label>الاسم الكامل</label><input type="text" id="kyc-name" required></div>
                    <div class="input-group"><label>رقم الجوال</label><input type="tel" id="kyc-phone" required></div>
                    <div class="input-group">
                        <label>المحافظة</label>
                        <select id="kyc-gov" required>
                            <option value="">اختر المحافظة</option>
                            ${govs.map(g => `<option value="${g}">${g}</option>`).join('')}
                        </select>
                    </div>
                    <div class="input-group"><label>المنطقة</label><input type="text" id="kyc-region" required></div>
                    
                    <div class="input-group">
                        <label>صورة الوجه الأمامي للهوية</label>
                        <div class="upload-box">
                            <input type="file" id="kyc-id" required accept="image/*" onchange="this.nextElementSibling.nextElementSibling.textContent = this.files[0].name">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                            <span>اضغط لرفع الصورة</span>
                            <small>يرجى رفع صورة واضحة</small>
                        </div>
                    </div>

                    <div class="input-group">
                        <label>صورة سيلفي مع الهوية</label>
                        <div class="upload-box">
                            <input type="file" id="kyc-selfie" required accept="image/*" onchange="this.nextElementSibling.nextElementSibling.textContent = this.files[0].name">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>
                            <span>اضغط لرفع الصورة</span>
                            <small>ارفع صورة سيلفي وأنت تحمل الهوية</small>
                        </div>
                    </div>

                    <button type="submit" class="btn-primary" style="margin-top:10px;">إرسال الطلب</button>
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
                try { await apiFetch('/api/kyc/submit', { method: 'POST', body: fd }); showToast('تم الإرسال!'); document.getElementById('kyc-screen').remove(); } 
                catch(e) { alert('فشل: ' + e.message); btn.disabled = false; btn.textContent = 'إرسال الطلب'; }
            };
        }
    } catch(e) { showToast('تعذر الجلب'); }
};

// ── 5. باقي الشاشات ──
window.openChat = async function() {
    const html = `
        <div id="chat-msgs" style="height: 55vh; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding-bottom:20px;">جاري التحميل...</div>
        <div style="display:flex; gap:10px;">
            <input type="text" id="chat-input" placeholder="اكتب رسالتك..." style="flex:1; padding:14px; border-radius:12px; border:1px solid var(--border); background:var(--surface); color:white; outline:none;">
            <button class="btn-primary" style="width:80px;" onclick="window.sendChat()">إرسال</button>
        </div>
    `;
    openFullScreen('chat-screen', 'الدعم الفني', html);
    window.loadChatMessages();
};
window.loadChatMessages = async function() {
    try {
        const msgs = await apiFetch('/api/support/messages');
        const box = document.getElementById('chat-msgs');
        if (!msgs || !msgs.length) { box.innerHTML = '<p style="text-align:center; color:var(--muted); margin-top:20px;">مرحباً! كيف يمكننا مساعدتك؟</p>'; return; }
        box.innerHTML = msgs.map(m => `<div style="max-width:80%; padding:12px 16px; border-radius:16px; font-size:14px; ${m.sender === 'user' ? 'background:var(--blue); color:#000; align-self:flex-start;' : 'background:var(--surface); color:var(--text); align-self:flex-end;'}">${escapeHtml(m.message)}</div>`).join('');
        box.scrollTop = box.scrollHeight;
    } catch(e) { document.getElementById('chat-msgs').innerHTML = 'تعذر التحميل'; }
}
window.sendChat = async function() {
    const input = document.getElementById('chat-input'); if (!input.value.trim()) return;
    const text = input.value; input.value = '';
    const box = document.getElementById('chat-msgs');
    box.innerHTML += `<div style="max-width:80%; padding:12px 16px; border-radius:16px; font-size:14px; background:var(--blue); color:#000; align-self:flex-start;">${escapeHtml(text)}</div>`; box.scrollTop = box.scrollHeight;
    try { await apiFetch('/api/support/send', { method: 'POST', body: JSON.stringify({ message: text }) }); } catch(e) { showToast('فشل الإرسال'); }
};

window.openLedger = async function() {
    try {
        const records = await apiFetch('/api/ledger');
        const html = `
            <div style="display:flex; flex-direction:column; gap:10px;">
                ${records.length ? records.map(r => `
                    <div style="background:var(--surface); padding:15px; border-radius:12px; border:1px solid var(--border); display:flex; justify-content:space-between;">
                        <div><strong style="display:block; font-size:14px;">${escapeHtml(r.desc || r.type)}</strong><span style="font-size:11px; color:var(--muted);">${new Date(r.date).toLocaleString('ar-EG')}</span></div>
                        <strong style="color:${r.amount > 0 ? 'var(--success)' : 'var(--danger)'}; font-size:15px;">${r.amount > 0 ? '+' : ''}${r.amount.toFixed(2)}</strong>
                    </div>
                `).join('') : '<div style="text-align:center; padding:20px;">لا توجد حركات.</div>'}
            </div>
        `;
        openFullScreen('ledger-screen', 'السجل المالي', html);
    } catch(e) { showToast('تعذر الجلب'); }
};

window.openInfo = function(title, text) {
    openFullScreen('info-screen', title, `<div style="padding:20px; text-align:center; font-size:16px; line-height:1.6;">${text}</div>`);
};

window.toggleCurrency = function(isSYP) {
    state.currency = isSYP ? 'SYP' : 'USD';
    showPage('account'); 
    showToast(isSYP ? 'تم التحويل لليرة' : 'تم التحويل للدولار');
};

async function renderOrders(container) {
    container.innerHTML = `<div class="section-title" style="padding-top:25px;">طلباتي</div><div class="list" id="orders-list" style="padding:0 20px;">جاري التحميل...</div>`;
    try {
        const res = await apiFetch('/api/orders/');
        const list = document.getElementById('orders-list');
        if (!res.items || res.items.length === 0) { list.innerHTML = '<div style="text-align:center; color:var(--muted);">لا توجد طلبات.</div>'; return; }
        list.innerHTML = res.items.map(o => `<div style="background:var(--surface); border:1px solid var(--border); padding:15px; border-radius:16px; margin-bottom:10px;"><strong style="display:block;">${escapeHtml(o.product_name)}</strong><span style="font-size:12px; color:var(--muted);">${escapeHtml(o.order_number)}</span><div style="display:flex; justify-content:space-between; margin-top:10px;"><span style="font-weight:bold; color:var(--blue);">${formatMoney(o.amount)}</span><span style="font-size:12px;">${o.status === 'completed' ? '✅ مكتمل' : (o.status === 'pending' ? '⏳ معلق' : '❌ مرفوض')}</span></div></div>`).join('');
    } catch (e) { document.getElementById('orders-list').innerHTML = `<div style="color:red;">${e.message}</div>`; }
}

async function renderCharge(container) {
    container.innerHTML = `
        <div class="section-title" style="padding-top:25px;">شحن الرصيد</div>
        <div style="padding:0 20px;"><p style="color:var(--muted); font-size:13px; margin-bottom:20px;">اختر طريقة الدفع المناسبة.</p></div>
        <div class="payment-scroll" id="payment-methods-list" style="padding:0 20px; display:flex; gap:15px; overflow-x:auto;">
            <div style="color:var(--muted);">جاري تحميل طرق الدفع...</div>
        </div>
        <div id="payment-form-container" style="display:none; padding: 0 20px; margin-top:20px;">
            <div style="background:var(--surface); border:1px solid var(--border); border-radius:20px; padding:20px;">
                <div style="background:var(--bg); border:1px solid var(--border); border-radius:14px; padding:16px; margin-bottom:16px;">
                    <p style="margin:0 0 8px; font-size:12px; color:var(--muted);">حول المبلغ إلى:</p>
                    <strong style="display:block; font-size:16px; margin-bottom:8px;" id="selected-pm-name">-</strong>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong style="font-family:monospace; font-size:16px; direction:ltr;" id="selected-pm-account">-</strong>
                        <button onclick="navigator.clipboard.writeText(document.getElementById('selected-pm-account').textContent); showToast('تم النسخ!');" style="background:none; border:none; color:var(--blue); font-weight:bold;">نسخ</button>
                    </div>
                </div>
                <form id="charge-form">
                    <div class="input-group"><label>المبلغ المحول</label><input type="number" id="charge-amount" required></div>
                    <div class="input-group"><label>رقم عملية التحويل</label><input type="text" id="charge-reference" required></div>
                    <div class="input-group"><label>صورة الإيصال</label><input type="file" id="charge-receipt" accept="image/*" required style="background:var(--surface); padding:10px;"></div>
                    <button type="submit" class="btn-primary" style="margin-top:10px;">تأكيد الشحن</button>
                </form>
            </div>
        </div>
    `;
    try {
        state.paymentMethods = await apiFetch('/api/payment-methods/');
        const list = document.getElementById('payment-methods-list');
        if (!state.paymentMethods || state.paymentMethods.length === 0) { list.innerHTML = '<div style="color:var(--muted);">لا توجد طرق دفع.</div>'; return; }
        list.innerHTML = state.paymentMethods.map(pm => `
            <div style="min-width:100px; background:var(--surface); border:2px solid var(--border); border-radius:16px; padding:15px; display:flex; flex-direction:column; align-items:center; cursor:pointer;" onclick="
                document.querySelectorAll('#payment-methods-list > div').forEach(c => c.style.borderColor='var(--border)');
                this.style.borderColor='var(--blue)';
                document.getElementById('selected-pm-name').textContent = '${escapeHtml(pm.name)}';
                document.getElementById('selected-pm-account').textContent = '${escapeHtml(pm.account)}';
                document.getElementById('payment-form-container').style.display = 'block';
            ">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(pm.name)}&background=random&color=fff&size=100" style="width:40px; height:40px; border-radius:50%; margin-bottom:10px;">
                <span style="font-size:12px; font-weight:bold;">${escapeHtml(pm.name)}</span>
            </div>
        `).join('');
        document.getElementById('charge-form').onsubmit = async (e) => {
            e.preventDefault(); const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = 'جاري الإرسال...';
            const fd = new FormData(); fd.append('amount', document.getElementById('charge-amount').value); fd.append('reference', document.getElementById('charge-reference').value); fd.append('receipt', document.getElementById('charge-receipt').files[0]);
            try { await apiFetch('/api/deposits/create', { method: 'POST', body: fd }); showToast('تم إرسال الطلب!'); showPage('home'); } catch (err) { showToast('خطأ: ' + err.message); btn.disabled = false; btn.textContent = 'تأكيد الشحن'; }
        };
    } catch(e) { document.getElementById('payment-methods-list').innerHTML = 'تعذر الجلب'; }
}

// ── التهيئة ──
async function initApp() {
    if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor('#080E1B'); }

    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-route]');
        if (btn) { e.preventDefault(); showPage(btn.dataset.route); }
    });

    try {
        if (!tg?.initData) throw new Error("يرجى فتح التطبيق من تيليجرام.");
        state.user = await apiFetch('/api/miniapp/init', { method: 'POST', body: JSON.stringify({}) });
        if(state.user.exchange_rate) state.exchangeRate = state.user.exchange_rate;
        
        const loader = document.getElementById('app-loading'); if(loader) loader.remove();
        showPage('home');
    } catch (err) {
        document.getElementById('app-loading').innerHTML = `<div style="text-align:center;color:red;padding:20px;"><h2>حدث خطأ</h2><p>${escapeHtml(err.message)}</p></div>`;
    }
}

document.addEventListener('DOMContentLoaded', initApp);
