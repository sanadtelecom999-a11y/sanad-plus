/* ============================================================
   SANAD PLUS+ — Full Logic Engine (Full-Page Deposit & Input Fix)
   ============================================================ */

const tg = window.Telegram?.WebApp;
const API_BASE = 'https://sanad-plus-backend.onrender.com';
const tgUser = tg?.initDataUnsafe?.user;

let authToken = null;
let userData = null;
let categoriesData = [];
let productsData = [];
let paymentMethodsData = [];
let ordersData = [];
let depositsData = [];
let selectedPaymentMethod = null;
let currentProduct = null;
let selectedBundle = null;
let currentQty = 1;

document.addEventListener('DOMContentLoaded', async () => {
    if (tg) {
        tg.ready(); tg.expand(); tg.setHeaderColor('#000000'); tg.disableVerticalSwipes();
        tg.BackButton.onClick(() => {
            if (document.getElementById('page-products').classList.contains('active')) navigate('home');
            else navigate('home');
        });
        if (tg.colorScheme === 'light') { document.getElementById('darkModeToggle').checked = false; toggleDarkMode(); }
    }
    try {
        await authenticate();
        await loadInitialData();
        showApp();
    } catch (error) {
        console.error(error);
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        if (tg) tg.showAlert(`تعذر الاتصال:\n${error.message}`);
    }
});

async function authenticate() {
    const initData = tg?.initData;
    if (!initData) throw new Error("يرجى فتح التطبيق من داخل تيليجرام");
    const res = await fetch(`${API_BASE}/api/auth/telegram`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData })
    });
    if (!res.ok) { const err = await res.json().catch(()=>({})); throw new Error(err.error || `خطأ: ${res.status}`); }
    const data = await res.json();
    authToken = data.access_token; userData = data.user;
}

function getHeaders() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` }; }

async function loadInitialData() {
    const [catRes, prodRes, pmRes, depRes] = await Promise.all([
        fetch(`${API_BASE}/api/categories/`),
        fetch(`${API_BASE}/api/products/`),
        fetch(`${API_BASE}/api/payment-methods/`),
        fetch(`${API_BASE}/api/deposits/`, { headers: getHeaders() })
    ]);
    if (catRes.ok) categoriesData = await catRes.json();
    if (prodRes.ok) productsData = await prodRes.json();
    if (pmRes.ok) paymentMethodsData = await pmRes.json();
    if (depRes.ok) depositsData = await depRes.json();
}

// ════════════════════════════════════════════════════════════
// UI Rendering
// ════════════════════════════════════════════════════════════
function showApp() {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    
    const firstName = userData.first_name || 'مستخدم';
    const lastName = userData.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();

    document.getElementById('headerUserName').textContent = firstName;
    document.getElementById('profileFullName').textContent = fullName;
    document.getElementById('profileUsername').textContent = userData.username ? `@${userData.username}` : 'لا يوجد معرف';
    
    if (tgUser?.photo_url) {
        document.getElementById('headerAvatar').innerHTML = `<img src="${tgUser.photo_url}">`;
        document.getElementById('profileAvatarImg').src = tgUser.photo_url;
        document.getElementById('profileAvatarImg').classList.remove('hidden');
        document.getElementById('profileAvatarFallback').classList.add('hidden');
    } else {
        document.getElementById('headerAvatar').textContent = firstName[0];
        document.getElementById('profileAvatarFallback').textContent = firstName[0];
    }

    const sanadId = `SN-${String(userData.telegram_id).padStart(6, '0')}`;
    document.getElementById('profileSanadId').textContent = sanadId;
    document.getElementById('userSanadId').textContent = sanadId;
    document.getElementById('profileTelegramId').textContent = `Telegram: ${userData.telegram_id}`;

    const isVerified = userData.is_verified || userData.kyc_status === 'verified';
    if (isVerified) {
        document.getElementById('kycBadgeName').classList.remove('hidden');
        document.getElementById('kycBadgeName').innerHTML = `<svg viewBox="0 0 24 24" fill="#1d9bf0"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.79-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.75 2.73 1.867 3.45-.103.36-.16.74-.16 1.13 0 2.21 1.71 3.998 3.918 3.998.47 0 .92-.084 1.336-.25C9.184 21.585 10.49 22.5 12 22.5s2.816-.917 3.337-2.25c.416.165.866.25 1.336.25 2.21 0 3.918-1.79 3.918-4 0-.39-.057-.77-.16-1.13 1.117-.72 1.867-1.99 1.867-3.45z"></path><path fill="#ffffff" d="M10.515 16.957l-3.32-3.32 1.414-1.414 1.906 1.906 4.95-4.95 1.414 1.414-6.364 6.364z"></path></svg>`;
    }

    const balance = `$${parseFloat(userData.balance).toFixed(2)}`;
    document.getElementById('mainBalance').textContent = balance;
    document.getElementById('statBalance').textContent = balance;
    
    let totalApproved = 0;
    depositsData.forEach(d => { if(d.status === 'approved') totalApproved += parseFloat(d.amount); });
    document.getElementById('statTotalDeposits').textContent = `$${totalApproved.toFixed(2)}`;

    renderCategories();
    renderPaymentMethodsPage();
    lucide.createIcons();
}

function renderCategories() {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '';
    categoriesData.forEach(cat => {
        const el = document.createElement('div');
        el.className = 'category-item';
        el.onclick = () => openCategory(cat.id, cat.name);
        el.innerHTML = `<img src="${cat.image || 'https://via.placeholder.com/60'}"><span>${escapeHTML(cat.name)}</span>`;
        grid.appendChild(el);
    });
}

function renderPaymentMethodsPage() {
    const container = document.getElementById('paymentMethodsList');
    container.innerHTML = '';
    if (!paymentMethodsData || paymentMethodsData.length === 0) {
        container.innerHTML = '<p class="text-muted text-center" style="grid-column:span 2;">لا توجد طرق دفع</p>';
        return;
    }
    paymentMethodsData.forEach(pm => {
        const el = document.createElement('div');
        el.className = 'pm-card';
        el.onclick = () => openPaymentDetails(pm);
        
        const isKyc = pm.requires_kyc;
        const subText = isKyc ? 'تتطلب توثيق الحساب' : 'شحن فوري';
        const subClass = isKyc ? 'kyc' : 'instant';
        const subIcon = isKyc ? 'lock' : 'zap';
        
        el.innerHTML = `
            <div class="pm-card-right">
                <div class="pm-icon-box">💳</div>
                <div class="pm-details">
                    <span class="pm-name">${escapeHTML(pm.name)}</span>
                    <span class="pm-sub ${subClass}"><i data-lucide="${subIcon}" size="12"></i> ${subText}</span>
                </div>
            </div>
            <i data-lucide="chevron-left" class="pm-arrow"></i>
        `;
        container.appendChild(el);
    });
    lucide.createIcons();
}

function openCategory(id, name) {
    if (tg) tg.HapticFeedback.impactOccurred('light');
    document.getElementById('productsPageTitle').textContent = name;
    const catProducts = productsData.filter(p => p.category_id === id);
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';
    
    if (catProducts.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column: span 2;">لا توجد منتجات</div>';
    } else {
        catProducts.forEach(prod => {
            const el = document.createElement('div');
            el.className = 'category-item';
            el.onclick = () => openProductDetails(prod);
            el.innerHTML = `
                <img src="${prod.image || 'https://via.placeholder.com/60'}">
                <span>${escapeHTML(prod.name)}</span>
                <div style="color: var(--primary); font-size: 12px; margin-top: 5px; font-weight:bold;">
                    ${prod.product_type === 'bundle' ? 'باقات متعددة' : `$${parseFloat(prod.base_price).toFixed(2)}`}
                </div>
            `;
            grid.appendChild(el);
        });
    }
    navigate('products');
}

// ════════════════════════════════════════════════════════════
// Advanced Product Purchase Flow
// ════════════════════════════════════════════════════════════
function openProductDetails(prod) {
    if (tg) tg.HapticFeedback.impactOccurred('light');
    currentProduct = prod;
    selectedBundle = prod.bundles && prod.bundles.length > 0 ? prod.bundles[0] : null;
    currentQty = prod.base_quantity > 0 ? prod.base_quantity : 1;
    
    let inputHtml = '';
    const focusScript = `onfocus="setTimeout(() => this.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)"`;
    
    if (prod.input_type === 'id') inputHtml = `<div class="form-group"><label>ايدي اللاعب</label><input type="text" inputmode="numeric" pattern="[0-9]*" id="purchaseInput" class="form-input" placeholder="أدخل الآيدي هنا..." required ${focusScript}></div>`;
    else if (prod.input_type === 'account_id') inputHtml = `<div class="form-group"><label>ايدي الحساب</label><input type="text" inputmode="numeric" pattern="[0-9]*" id="purchaseInput" class="form-input" placeholder="أدخل الآيدي هنا..." required ${focusScript}></div>`;
    else if (prod.input_type === 'phone') inputHtml = `<div class="form-group"><label>رقم الهاتف</label><input type="tel" inputmode="numeric" pattern="[0-9]*" id="purchaseInput" class="form-input" placeholder="أدخل رقم الهاتف..." required ${focusScript}></div>`;
    else if (prod.input_type === 'url') inputHtml = `<div class="form-group"><label>الرابط (URL)</label><input type="url" id="purchaseInput" class="form-input" placeholder="https://..." dir="ltr" required ${focusScript}></div>`;

    let dynamicHtml = '';
    let initialPrice = parseFloat(prod.base_price) || 0;

    if (prod.bundles && prod.bundles.length > 0) {
        initialPrice = parseFloat(selectedBundle.price_usd) || 0;
        let bundlesOptions = prod.bundles.map((b, index) => `
            <label class="bundle-option ${index === 0 ? 'selected' : ''}" onclick="selectBundle('${b.id}', ${parseFloat(b.price_usd)})">
                <input type="radio" name="bundle" ${index === 0 ? 'checked' : ''} style="display:none;">
                <div class="bundle-info">
                    <strong>${escapeHTML(b.name)}</strong>
                    ${b.quantity > 0 ? `<span>${b.quantity} ${escapeHTML(prod.unit_name)}</span>` : ''}
                </div>
                <div class="bundle-price">$${parseFloat(b.price_usd).toFixed(2)}</div>
            </label>
        `).join('');
        dynamicHtml = `<div class="form-group" style="margin-top:15px;"><label>اختر الباقة</label><div style="display:flex; flex-direction:column; gap:10px; margin-top:10px;">${bundlesOptions}</div></div>`;
    } else if (prod.product_type === 'quantity' && prod.base_quantity > 0) {
        // تم استخدام type="text" مع inputmode لحل مشكلة الأرقام العربية
        dynamicHtml = `
            <div class="form-group" style="margin-top:15px;">
                <label>الكمية المطلوبة (${escapeHTML(prod.unit_name || 'قطعة')})</label>
                <input type="text" inputmode="numeric" pattern="[0-9]*" id="purchaseQty" class="form-input" value="${currentQty}" oninput="updateDynamicPrice(this)" ${focusScript}>
            </div>
        `;
    }

    const descHtml = prod.description ? `<p class="text-muted" style="font-size:13px; font-style:italic; margin-bottom:15px; text-align:center;">${escapeHTML(prod.description)}</p>` : '';

    document.getElementById('productPurchaseContent').innerHTML = `
        <div class="product-modal-header">
            <img src="${prod.image || 'https://via.placeholder.com/80'}" class="product-modal-img">
            <h3 class="product-modal-title">${escapeHTML(prod.name)}</h3>
        </div>
        
        ${descHtml}

        <form onsubmit="submitOrder(event)">
            ${inputHtml}
            ${dynamicHtml}
            
            <div class="total-box" style="margin-top:20px;">
                <span>الإجمالي:</span>
                <strong id="totalPriceDisplay">$${initialPrice.toFixed(2)}</strong>
            </div>

            <button type="submit" class="btn-primary" id="buyBtn" style="margin-top:15px;">شراء الآن</button>
        </form>
    `;
    openSheet('productPurchaseSheet');
}

function selectBundle(id, price) {
    selectedBundle = currentProduct.bundles.find(b => b.id === parseInt(id) || b.id === id);
    document.querySelectorAll('.bundle-option').forEach(el => el.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    document.getElementById('totalPriceDisplay').textContent = `$${price.toFixed(2)}`;
    if (tg) tg.HapticFeedback.selectionChanged();
}

function updateDynamicPrice(input) {
    // إزالة أي حرف غير الأرقام الإنجليزية
    let rawVal = input.value.replace(/[^0-9]/g, '');
    input.value = rawVal; // إعادة تعيين الحقل لضمان بقاء الأرقام الإنجليزية فقط
    
    let qty = parseInt(rawVal);
    if (isNaN(qty) || qty < 1) qty = 1;
    
    currentQty = qty;
    const unitPrice = parseFloat(currentProduct.base_price) / currentProduct.base_quantity;
    const total = unitPrice * qty;
    document.getElementById('totalPriceDisplay').textContent = `$${total.toFixed(2)}`;
}

async function submitOrder(e) {
    e.preventDefault();
    const btn = document.getElementById('buyBtn');
    const inputVal = document.getElementById('purchaseInput')?.value;
    
    if (currentProduct.input_type !== 'none' && !inputVal) {
        if (tg) tg.showAlert('يرجى إدخال البيانات المطلوبة');
        return;
    }

    btn.textContent = 'جاري التنفيذ...'; btn.disabled = true;

    try {
        const orderData = {
            product_id: currentProduct.id,
            idempotency_key: `ord-${userData.telegram_id}-${Date.now()}`,
            quantity: currentProduct.bundles?.length > 0 ? 1 : currentQty
        };
        
        if (selectedBundle) orderData.bundle_id = selectedBundle.id;

        if (currentProduct.input_type === 'id') orderData.player_id = inputVal;
        else if (currentProduct.input_type === 'account_id') orderData.account_id = inputVal;
        else if (currentProduct.input_type === 'phone') orderData.phone = inputVal;
        else if (currentProduct.input_type === 'url') orderData.url = inputVal;

        const res = await fetch(`${API_BASE}/api/orders/create`, {
            method: 'POST', headers: getHeaders(), body: JSON.stringify(orderData)
        });

        const data = await res.json();
        
        if (res.ok) {
            if (tg) tg.HapticFeedback.notificationOccurred('success');
            closeSheets();
            userData.balance -= parseFloat(data.total_price);
            showApp();
            if (tg) tg.showAlert(`تم الطلب بنجاح!\nرقم الطلب: ${data.order_number}`);
        } else {
            throw new Error(data.error || 'فشل الطلب');
        }
    } catch (err) {
        if (tg) tg.showAlert(`خطأ:\n${err.message}`);
    } finally {
        btn.textContent = 'شراء الآن'; btn.disabled = false;
    }
}

// ════════════════════════════════════════════════════════════
// Deposit Flow & Payment Details
// ════════════════════════════════════════════════════════════
function openPaymentDetails(pm) {
    if (tg) tg.HapticFeedback.selectionChanged();
    selectedPaymentMethod = pm;
    
    setTimeout(() => {
        const focusScript = `onfocus="setTimeout(() => this.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)"`;
        document.getElementById('paymentDetailsContent').innerHTML = `
            <h3 class="text-center" style="margin-bottom: 20px;">إتمام الإيداع</h3>
            <div class="copy-box"><span>${escapeHTML(pm.account_name || 'اسم الحساب')}</span><i data-lucide="copy" onclick="copyText('${pm.account_name}', 'تم نسخ اسم الحساب')"></i></div>
            <div class="copy-box"><span dir="ltr">${escapeHTML(pm.account || 'رقم الحساب')}</span><i data-lucide="copy" onclick="copyText('${pm.account}', 'تم نسخ رقم الحساب')"></i></div>
            <div class="text-center" style="margin: 20px 0;"><span class="text-muted">الحد الأدنى: $${pm.min_amount} | الحد الأقصى: $${pm.max_amount}</span></div>
            <form onsubmit="submitDeposit(event)">
                <div class="form-group"><label>المبلغ المراد إيداعه ($)</label><input type="text" inputmode="decimal" pattern="[0-9.]*" id="depositAmount" class="form-input" required ${focusScript}></div>
                <div class="form-group"><label>اسم المرسل</label><input type="text" id="depositSenderName" class="form-input" required ${focusScript}></div>
                <div class="form-group">
                    <label>إثبات التحويل (صورة)</label>
                    <input type="file" id="depositReceipt" accept="image/*" class="hidden" onchange="document.getElementById('receiptLabel').textContent = 'تم اختيار الصورة'">
                    <div class="file-upload-btn" onclick="document.getElementById('depositReceipt').click()"><i data-lucide="upload"></i> <span id="receiptLabel">اختر صورة الإيصال</span></div>
                </div>
                <button type="submit" class="btn-primary" id="depositBtn">إرسال الطلب</button>
            </form>
        `;
        lucide.createIcons();
        openSheet('paymentDetailsSheet');
    }, 300);
}

async function submitDeposit(e) {
    e.preventDefault();
    const btn = document.getElementById('depositBtn');
    const amount = document.getElementById('depositAmount').value;
    const sender = document.getElementById('depositSenderName').value;
    const file = document.getElementById('depositReceipt').files[0];
    if (!file) { if (tg) tg.showAlert('يرجى رفع صورة الإيصال'); return; }
    btn.textContent = 'جاري الإرسال...'; btn.disabled = true;
    try {
        const toBase64 = file => new Promise((resolve, reject) => {
            const reader = new FileReader(); reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result); reader.onerror = error => reject(error);
        });
        const base64Img = await toBase64(file);
        const res = await fetch(`${API_BASE}/api/deposits/create`, {
            method: 'POST', headers: getHeaders(),
            body: JSON.stringify({ amount: amount, method_id: selectedPaymentMethod.id, sender_name: sender, proof_image: base64Img, idempotency_key: `dep-${userData.telegram_id}-${Date.now()}` })
        });
        const data = await res.json();
        if (res.ok) {
            if (tg) tg.HapticFeedback.notificationOccurred('success');
            closeSheets();
            navigate('home');
            if (tg) tg.showAlert(`تم إرسال طلب الإيداع بنجاح!\nرقم العملية: ${data.transaction_id}`);
        } else { throw new Error(data.error || 'فشل الإيداع'); }
    } catch (err) { if (tg) tg.showAlert(`خطأ:\n${err.message}`); } 
    finally { btn.textContent = 'إرسال الطلب'; btn.disabled = false; }
}

// ════════════════════════════════════════════════════════════
// Other Core Utils & Modals
// ════════════════════════════════════════════════════════════
function navigate(page) {
    if (tg) tg.HapticFeedback.selectionChanged();
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    
    if (page === 'products' || page === 'deposit-methods') {
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        if (tg) tg.BackButton.show();
    } else {
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.page === page));
        if (page !== 'home') { if (tg) tg.BackButton.show(); } else { if (tg) tg.BackButton.hide(); }
    }
    
    if (page === 'orders') loadOrders();
    if (page === 'deposits') loadDeposits();
    if (page === 'support') loadSupportTickets();
}

async function loadOrders() {
    const list = document.getElementById('ordersList');
    list.innerHTML = '<div class="empty-state"><i data-lucide="loader" class="spin" size="48"></i><p>جاري التحميل...</p></div>';
    lucide.createIcons();
    try {
        const res = await fetch(`${API_BASE}/api/orders/`, { headers: getHeaders() });
        ordersData = await res.json();
        list.innerHTML = '';
        if (ordersData.length === 0) {
            list.innerHTML = '<div class="empty-state"><i data-lucide="package-open" size="48"></i><p>لا توجد طلبات</p></div>';
            lucide.createIcons(); return;
        }
        ordersData.forEach(o => {
            const card = document.createElement('div');
            card.className = 'list-card';
            card.onclick = () => openOrderDetails(o.id);
            card.innerHTML = `
                <div class="list-card-header">
                    <span>${o.order_number}</span>
                    <span class="${o.status === 'completed' ? 'text-success' : o.status === 'pending' ? 'text-warning' : 'text-danger'}">${o.status}</span>
                </div>
                <div class="list-card-body"><span>${o.product_name}</span><span>$${parseFloat(o.total_price).toFixed(2)}</span></div>
            `;
            list.appendChild(card);
        });
    } catch (e) { list.innerHTML = '<p class="text-danger text-center">تعذر التحميل</p>'; }
}

async function loadDeposits() {
    const list = document.getElementById('depositsList');
    list.innerHTML = '<div class="empty-state"><i data-lucide="loader" class="spin" size="48"></i><p>جاري التحميل...</p></div>';
    lucide.createIcons();
    try {
        const res = await fetch(`${API_BASE}/api/deposits/`, { headers: getHeaders() });
        depositsData = await res.json();
        list.innerHTML = '';
        if (depositsData.length === 0) {
            list.innerHTML = '<div class="empty-state"><i data-lucide="wallet" size="48"></i><p>لا توجد إيداعات</p></div>';
            lucide.createIcons(); return;
        }
        depositsData.forEach(d => {
            const card = document.createElement('div');
            card.className = 'list-card';
            card.onclick = () => openDepositDetails(d.id);
            card.innerHTML = `
                <div class="list-card-header">
                    <span>${d.transaction_id}</span>
                    <span class="${d.status === 'approved' ? 'text-success' : d.status === 'pending' ? 'text-warning' : 'text-danger'}">${d.status}</span>
                </div>
                <div class="list-card-body"><span>${d.method}</span><span>$${parseFloat(d.amount).toFixed(2)}</span></div>
            `;
            list.appendChild(card);
        });
    } catch (e) { list.innerHTML = '<p class="text-danger text-center">تعذر التحميل</p>'; }
}

function openOrderDetails(orderId) { /* (سابقاً) */ }
function openDepositDetails(depositId) { /* (سابقاً) */ }
function openKYCModal() { openSheet('kycSheet'); /* (سابقاً) */ }
function openReferralModal() { openSheet('referralSheet'); }
function openFAQModal() { openSheet('faqSheet'); }
function openSupportModal() { openSheet('supportModalSheet'); }
async function loadSupportTickets() { /* (سابقاً) */ }
async function sendSupportMessage() { /* (سابقاً) */ }

function openSheet(sheetId) {
    if (tg) tg.HapticFeedback.impactOccurred('light');
    document.getElementById('sheetOverlay').classList.add('active');
    document.getElementById(sheetId).classList.add('active');
}
function closeSheets() {
    document.getElementById('sheetOverlay').classList.remove('active');
    document.querySelectorAll('.bottom-sheet').forEach(s => s.classList.remove('active'));
}
function openLightbox(imgSrc) { document.getElementById('lightboxImg').src = imgSrc; document.getElementById('lightbox').classList.remove('hidden'); }
function closeLightbox() { document.getElementById('lightbox').classList.add('hidden'); }
function toggleDarkMode() { /* ... */ }
function copyText(text, msg) {
    navigator.clipboard.writeText(text).then(() => {
        if (tg) { tg.HapticFeedback.notificationOccurred('success'); tg.showAlert(msg); }
        else { alert(msg); }
    });
}
function handleLogout() { if (tg) tg.close(); else location.reload(); }
function escapeHTML(str) { return String(str).replace(/[&<>"']/g, function(s) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[s]; }); }
