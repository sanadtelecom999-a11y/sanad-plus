/* ============================================================
   SANAD PLUS+ — Real Data Engine (Products & Deposits)
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
    lucide.createIcons();
}

function renderCategories() {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '';
    if (!categoriesData || categoriesData.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column: span 2;">لا توجد أقسام</div>';
        return;
    }
    categoriesData.forEach(cat => {
        const el = document.createElement('div');
        el.className = 'category-item';
        el.onclick = () => openCategory(cat.id, cat.name);
        el.innerHTML = `<img src="${cat.image || 'https://via.placeholder.com/60'}"><span>${escapeHTML(cat.name)}</span>`;
        grid.appendChild(el);
    });
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
                <div style="color: var(--primary); font-size: 12px; margin-top: 5px; font-weight:bold;">$${parseFloat(prod.base_price).toFixed(2)}</div>
            `;
            grid.appendChild(el);
        });
    }
    navigate('products');
}

// ════════════════════════════════════════════════════════════
// Product Purchase Flow
// ════════════════════════════════════════════════════════════
function openProductDetails(prod) {
    if (tg) tg.HapticFeedback.impactOccurred('light');
    currentProduct = prod;
    
    // تحديد نوع الإدخال
    let inputHtml = '';
    if (prod.input_type === 'id') {
        inputHtml = `<div class="form-group"><label>ايدي اللاعب (ID)</label><input type="number" id="purchaseInput" class="form-input" placeholder="أدخل الآيدي هنا..." required></div>`;
    } else if (prod.input_type === 'account_id') {
        inputHtml = `<div class="form-group"><label>ايدي الحساب</label><input type="number" id="purchaseInput" class="form-input" placeholder="أدخل الآيدي هنا..." required></div>`;
    } else if (prod.input_type === 'phone') {
        inputHtml = `<div class="form-group"><label>رقم الهاتف</label><input type="tel" id="purchaseInput" class="form-input" placeholder="أدخل رقم الهاتف..." required></div>`;
    } else if (prod.input_type === 'url') {
        inputHtml = `<div class="form-group"><label>الرابط (URL)</label><input type="url" id="purchaseInput" class="form-input" placeholder="https://..." dir="ltr" required></div>`;
    }

    document.getElementById('productPurchaseContent').innerHTML = `
        <div class="text-center" style="margin-bottom: 20px;">
            <img src="${prod.image || 'https://via.placeholder.com/80'}" style="width: 80px; height: 80px; border-radius: 16px; object-fit: cover; margin: 0 auto;">
            <h3 style="margin-top: 10px;">${escapeHTML(prod.name)}</h3>
            <p class="text-primary" style="font-size: 18px; font-weight: bold;">$${parseFloat(prod.base_price).toFixed(2)}</p>
        </div>
        <form onsubmit="submitOrder(event)">
            ${inputHtml}
            <button type="submit" class="btn-primary" id="buyBtn">تأكيد الشراء</button>
        </form>
    `;
    openSheet('productPurchaseSheet');
}

async function submitOrder(e) {
    e.preventDefault();
    const btn = document.getElementById('buyBtn');
    const inputVal = document.getElementById('purchaseInput').value;
    
    if (!inputVal) return;

    btn.textContent = 'جاري التنفيذ...';
    btn.disabled = true;

    try {
        const orderData = {
            product_id: currentProduct.id,
            idempotency_key: `ord-${userData.telegram_id}-${Date.now()}`,
            quantity: 1
        };
        
        // إرفاق البيانات بناءً على النوع
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
            userData.balance -= currentProduct.base_price;
            showApp();
            if (tg) tg.showAlert(`تم الطلب بنجاح!\nرقم الطلب: ${data.order_number}`);
        } else {
            throw new Error(data.error || 'فشل الطلب');
        }
    } catch (err) {
        if (tg) tg.showAlert(`خطأ:\n${err.message}`);
    } finally {
        btn.textContent = 'تأكيد الشراء';
        btn.disabled = false;
    }
}

// ════════════════════════════════════════════════════════════
// Deposit Flow (Step 1 & Step 2)
// ════════════════════════════════════════════════════════════
function openDepositSheet() {
    if (tg) tg.HapticFeedback.impactOccurred('light');
    const container = document.getElementById('paymentMethodsList');
    container.innerHTML = '';
    
    if (!paymentMethodsData || paymentMethodsData.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">لا توجد طرق دفع متاحة حالياً</p>';
    } else {
        paymentMethodsData.forEach(pm => {
            const el = document.createElement('div');
            el.className = 'payment-method-card';
            el.onclick = () => openPaymentDetails(pm);
            el.innerHTML = `
                <div class="pm-icon">💳</div>
                <div class="pm-info">
                    <strong>${escapeHTML(pm.name)}</strong>
                    <span>الحد الأدنى: $${parseFloat(pm.min_amount).toFixed(2)}</span>
                </div>
                <i data-lucide="chevron-left"></i>
            `;
            container.appendChild(el);
        });
    }
    lucide.createIcons();
    openSheet('depositSheet');
}

function openPaymentDetails(pm) {
    if (tg) tg.HapticFeedback.selectionChanged();
    selectedPaymentMethod = pm;
    closeSheets();
    
    setTimeout(() => {
        document.getElementById('paymentDetailsContent').innerHTML = `
            <h3 class="text-center" style="margin-bottom: 20px;">إتمام الإيداع</h3>
            
            <div class="copy-box">
                <span>${escapeHTML(pm.account_name || 'اسم الحساب')}</span>
                <i data-lucide="copy" onclick="copyText('${pm.account_name}', 'تم نسخ اسم الحساب')"></i>
            </div>
            <div class="copy-box">
                <span dir="ltr">${escapeHTML(pm.account || 'رقم الحساب')}</span>
                <i data-lucide="copy" onclick="copyText('${pm.account}', 'تم نسخ رقم الحساب')"></i>
            </div>

            <div class="text-center" style="margin: 20px 0;">
                <span class="text-muted">الحد الأدنى: $${pm.min_amount} | الحد الأقصى: $${pm.max_amount}</span>
            </div>

            <form onsubmit="submitDeposit(event)">
                <div class="form-group"><label>المبلغ المراد إيداعه ($)</label><input type="number" id="depositAmount" class="form-input" min="${pm.min_amount}" max="${pm.max_amount}" step="0.01" required></div>
                <div class="form-group"><label>اسم المرسل</label><input type="text" id="depositSenderName" class="form-input" required></div>
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

    if (!file) {
        if (tg) tg.showAlert('يرجى رفع صورة الإيصال');
        return;
    }

    btn.textContent = 'جاري الإرسال...';
    btn.disabled = true;

    try {
        const toBase64 = file => new Promise((resolve, reject) => {
            const reader = new FileReader(); reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result); reader.onerror = error => reject(error);
        });

        const base64Img = await toBase64(file);

        const res = await fetch(`${API_BASE}/api/deposits/create`, {
            method: 'POST', headers: getHeaders(),
            body: JSON.stringify({
                amount: amount,
                method_id: selectedPaymentMethod.id,
                sender_name: sender,
                proof_image: base64Img,
                idempotency_key: `dep-${userData.telegram_id}-${Date.now()}`
            })
        });

        const data = await res.json();
        if (res.ok) {
            if (tg) tg.HapticFeedback.notificationOccurred('success');
            closeSheets();
            if (tg) tg.showAlert(`تم إرسال طلب الإيداع بنجاح!\nرقم العملية: ${data.transaction_id}`);
        } else {
            throw new Error(data.error || 'فشل الإيداع');
        }
    } catch (err) {
        if (tg) tg.showAlert(`خطأ:\n${err.message}`);
    } finally {
        btn.textContent = 'إرسال الطلب';
        btn.disabled = false;
    }
}

// ════════════════════════════════════════════════════════════
// Other UI Functions (Orders, Deposits, KYC, Support)
// ════════════════════════════════════════════════════════════
function navigate(page) {
    if (tg) tg.HapticFeedback.selectionChanged();
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    
    if (page === 'products') {
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
    list.innerHTML = '<div class="empty-state"><p>جاري التحميل...</p></div>';
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
    list.innerHTML = '<div class="empty-state"><p>جاري التحميل...</p></div>';
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

// Order Details & Deposit Details (Keep from previous)
function openOrderDetails(orderId) {
    const order = ordersData.find(o => o.id === orderId);
    if (!order) return;
    const date = new Date(order.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
    let timelineHtml = '';
    if (order.status === 'failed' || order.status === 'cancelled') {
        timelineHtml = `<div class="timeline"><div class="timeline-step error active"><div class="timeline-circle">✕</div><div class="timeline-text">فشل/ملغي</div></div></div>`;
    } else {
        const isPending = order.status === 'pending';
        const isProcessing = order.status === 'processing' || order.status === 'review';
        const isCompleted = order.status === 'completed';
        timelineHtml = `<div class="timeline"><div class="timeline-step ${isPending || isProcessing || isCompleted ? 'active' : ''}"><div class="timeline-circle">1</div><div class="timeline-text">معلق</div></div><div class="timeline-step ${isProcessing || isCompleted ? 'active' : ''}"><div class="timeline-circle">2</div><div class="timeline-text">معالجة</div></div><div class="timeline-step ${isCompleted ? 'success' : ''}"><div class="timeline-circle">✓</div><div class="timeline-text">مكتمل</div></div></div>`;
    }
    document.getElementById('orderDetailsContent').innerHTML = `
        <h3 class="text-center" style="margin-bottom: 20px;">تفاصيل الطلب</h3>
        <div class="detail-header">
            <div class="detail-title">${order.order_number} <i data-lucide="copy" onclick="copyText('${order.order_number}', 'تم نسخ رقم الطلب')"></i></div>
            <span class="${order.status === 'completed' ? 'text-success' : order.status === 'pending' ? 'text-warning' : 'text-danger'}">${order.status}</span>
        </div>
        <div class="detail-row"><span class="detail-label">المنتج</span><span class="detail-value">${order.product_name}</span></div>
        <div class="detail-row"><span class="detail-label">الكمية</span><span class="detail-value">${order.quantity}</span></div>
        ${order.delivery_data ? `<div class="detail-row"><span class="detail-label">بيانات الاستلام</span><span class="detail-value text-primary" dir="ltr">${typeof order.delivery_data === 'object' ? Object.values(order.delivery_data).join(', ') : order.delivery_data}</span></div>` : ''}
        <div class="detail-row"><span class="detail-label">التاريخ</span><span class="detail-value" style="font-size:12px; color:var(--text-muted);">${date}</span></div>
        <div class="detail-row" style="margin-top: 20px; border-top: 1px solid var(--border); padding-top: 15px;"><span class="detail-label">الإجمالي</span><span class="detail-value detail-total">$${parseFloat(order.total_price).toFixed(2)}</span></div>
        ${timelineHtml}
    `;
    lucide.createIcons(); openSheet('orderDetailsSheet');
}

function openDepositDetails(depositId) {
    const d = depositsData.find(x => x.id === depositId);
    if (!d) return;
    const date = new Date(d.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
    const proofImg = d.proof_image ? `<img src="${d.proof_image}" class="proof-image" onclick="openLightbox('${d.proof_image}')">` : '<p class="text-muted">لا يوجد إيصال</p>';
    document.getElementById('depositDetailsContent').innerHTML = `
        <h3 class="text-center" style="margin-bottom: 20px;">تفاصيل الإيداع</h3>
        <div class="detail-header">
            <div class="detail-title">${d.transaction_id} <i data-lucide="copy" onclick="copyText('${d.transaction_id}', 'تم نسخ رقم العملية')"></i></div>
            <span class="${d.status === 'approved' ? 'text-success' : d.status === 'pending' ? 'text-warning' : 'text-danger'}">${d.status}</span>
        </div>
        <div class="detail-row"><span class="detail-label">الطريقة</span><span class="detail-value">${d.method}</span></div>
        <div class="detail-row"><span class="detail-label">اسم المرسل</span><span class="detail-value">${d.sender_name || 'غير محدد'}</span></div>
        <div class="detail-row"><span class="detail-label">التاريخ</span><span class="detail-value" style="font-size:12px; color:var(--text-muted);">${date}</span></div>
        <div style="margin-top: 15px;"><span class="detail-label" style="display:block; margin-bottom:10px;">إثبات التحويل</span>${proofImg}</div>
        <div class="detail-row" style="margin-top: 20px; border-top: 1px solid var(--border); padding-top: 15px;"><span class="detail-label">المبلغ</span><span class="detail-value detail-total">$${parseFloat(d.amount).toFixed(2)}</span></div>
    `;
    lucide.createIcons(); openSheet('depositDetailsSheet');
}

// Support & Utils (Keep from previous)
function openKYCModal() { openSheet('kycSheet'); /* (مختصر لعدم الإطالة) */ }
function openReferralModal() { openSheet('referralSheet'); }
function openFAQModal() { openSheet('faqSheet'); }
function openSupportModal() { openSheet('supportModalSheet'); }
async function loadSupportTickets() { /* (مختصر لعدم الإطالة) */ }
async function sendSupportMessage() { /* (مختصر لعدم الإطالة) */ }

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
