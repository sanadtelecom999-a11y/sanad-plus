/* ============================================================
   SANAD PLUS+ — Real Data & UI Engine (v2.0)
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
let currentCategoryId = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (tg) {
        tg.ready(); tg.expand(); tg.setHeaderColor('#000000'); tg.disableVerticalSwipes();
        tg.BackButton.onClick(() => {
            if (document.getElementById('page-products').classList.contains('active')) {
                navigate('home');
            } else {
                navigate('home');
            }
        });
        if (tg.colorScheme === 'light') {
            document.getElementById('darkModeToggle').checked = false;
            toggleDarkMode();
        }
    }

    try {
        await authenticate();
        await loadInitialData();
        showApp();
    } catch (error) {
        console.error("Init Error:", error);
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        document.getElementById('headerUserName').textContent = "خطأ";
        if (tg) tg.showAlert(`تعذر الاتصال:\n${error.message}`);
    }
});

async function authenticate() {
    const initData = tg?.initData;
    if (!initData) throw new Error("يرجى فتح التطبيق من داخل تيليجرام");

    const res = await fetch(`${API_BASE}/api/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData })
    });

    if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        throw new Error(err.error || `خطأ في السيرفر: ${res.status}`);
    }

    const data = await res.json();
    authToken = data.access_token;
    userData = data.user;
}

function getHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` };
}

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
    const initial = firstName[0] || 'S';

    document.getElementById('headerUserName').textContent = firstName;
    document.getElementById('profileFullName').textContent = fullName;
    document.getElementById('profileUsername').textContent = userData.username ? `@${userData.username}` : 'لا يوجد معرف';
    
    // الصورة
    if (tgUser?.photo_url) {
        document.getElementById('headerAvatar').innerHTML = `<img src="${tgUser.photo_url}" alt="Avatar">`;
        const profImg = document.getElementById('profileAvatarImg');
        profImg.src = tgUser.photo_url;
        profImg.classList.remove('hidden');
        document.getElementById('profileAvatarFallback').classList.add('hidden');
    } else {
        document.getElementById('headerAvatar').textContent = initial;
        document.getElementById('profileAvatarFallback').textContent = initial;
    }

    // Sanad ID
    const sanadId = `SN-${String(userData.telegram_id).padStart(6, '0')}`;
    document.getElementById('profileSanadId').textContent = sanadId;
    document.getElementById('userSanadId').textContent = sanadId;
    document.getElementById('profileTelegramId').textContent = `Telegram: ${userData.telegram_id}`;
    document.getElementById('referralCodeText').textContent = userData.referral_code || 'SANAD';

    // شارة التوثيق
    const isVerified = userData.is_verified || userData.kyc_status === 'verified';
    const kycBadge = document.getElementById('kycBadgeName');
    if (isVerified) {
        kycBadge.classList.remove('hidden');
        kycBadge.innerHTML = `<svg viewBox="0 0 24 24" fill="#1d9bf0"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.79-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.75 2.73 1.867 3.45-.103.36-.16.74-.16 1.13 0 2.21 1.71 3.998 3.918 3.998.47 0 .92-.084 1.336-.25C9.184 21.585 10.49 22.5 12 22.5s2.816-.917 3.337-2.25c.416.165.866.25 1.336.25 2.21 0 3.918-1.79 3.918-4 0-.39-.057-.77-.16-1.13 1.117-.72 1.867-1.99 1.867-3.45z"></path><path fill="#ffffff" d="M10.515 16.957l-3.32-3.32 1.414-1.414 1.906 1.906 4.95-4.95 1.414 1.414-6.364 6.364z"></path></svg>`;
    } else {
        kycBadge.classList.add('hidden');
    }

    // الأرصدة
    const balance = `$${parseFloat(userData.balance).toFixed(2)}`;
    document.getElementById('mainBalance').textContent = balance;
    document.getElementById('statBalance').textContent = balance;
    
    let totalApproved = 0;
    depositsData.forEach(d => { if(d.status === 'approved') totalApproved += parseFloat(d.amount); });
    document.getElementById('statTotalDeposits').textContent = `$${totalApproved.toFixed(2)}`;

    renderCategories();
    renderPaymentMethods();
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
        
        const img = document.createElement('img');
        img.src = cat.image || 'https://via.placeholder.com/60';
        
        const span = document.createElement('span');
        span.textContent = cat.name;
        
        el.appendChild(img);
        el.appendChild(span);
        grid.appendChild(el);
    });
}

function openCategory(id, name) {
    if (tg) tg.HapticFeedback.impactOccurred('light');
    currentCategoryId = id;
    document.getElementById('productsPageTitle').textContent = name;
    
    const catProducts = productsData.filter(p => p.category_id === id);
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';
    
    if (catProducts.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column: span 2;">لا توجد منتجات في هذا القسم</div>';
    } else {
        catProducts.forEach(prod => {
            const el = document.createElement('div');
            el.className = 'category-item';
            el.onclick = () => openProductDetails(prod);
            
            const img = document.createElement('img');
            img.src = prod.image || 'https://via.placeholder.com/60';
            
            const title = document.createElement('span');
            title.textContent = prod.name;
            
            const price = document.createElement('div');
            price.textContent = `$${parseFloat(prod.base_price).toFixed(2)}`;
            price.style.color = 'var(--primary)';
            price.style.fontSize = '12px';
            price.style.marginTop = '5px';
            
            el.appendChild(img);
            el.appendChild(title);
            el.appendChild(price);
            grid.appendChild(el);
        });
    }
    
    navigate('products');
}

function renderPaymentMethods() {
    const container = document.getElementById('paymentMethodsList');
    container.innerHTML = '';
    if (!paymentMethodsData || paymentMethodsData.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">لا توجد طرق دفع متاحة حالياً</p>';
        return;
    }
    paymentMethodsData.forEach(pm => {
        const el = document.createElement('div');
        el.className = 'payment-method-card';
        
        const icon = document.createElement('div');
        icon.className = 'pm-icon';
        icon.textContent = '💳';
        
        const info = document.createElement('div');
        info.className = 'pm-info';
        
        const name = document.createElement('strong');
        name.textContent = pm.name;
        
        const min = document.createElement('span');
        min.textContent = `الحد الأدنى: $${parseFloat(pm.min_amount).toFixed(2)}`;
        
        info.appendChild(name);
        info.appendChild(min);
        
        const arrow = document.createElement('i');
        arrow.setAttribute('data-lucide', 'chevron-left');
        
        el.appendChild(icon);
        el.appendChild(info);
        el.appendChild(arrow);
        
        el.onclick = () => {
            if (tg) tg.showAlert(`طريقة الدفع: ${pm.name}\nالحد الأدنى: $${pm.min_amount}\nالحد الأقصى: $${pm.max_amount}\nالرسوم: ${pm.fee}%`);
        };
        
        container.appendChild(el);
    });
    lucide.createIcons();
}

// ════════════════════════════════════════════════════════════
// Navigation
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

// ════════════════════════════════════════════════════════════
// Orders & Deposits (Loaders)
// ════════════════════════════════════════════════════════════
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
        timelineHtml = `
            <div class="timeline">
                <div class="timeline-step ${isPending || isProcessing || isCompleted ? 'active' : ''}"><div class="timeline-circle">1</div><div class="timeline-text">معلق</div></div>
                <div class="timeline-step ${isProcessing || isCompleted ? 'active' : ''}"><div class="timeline-circle">2</div><div class="timeline-text">معالجة</div></div>
                <div class="timeline-step ${isCompleted ? 'success' : ''}"><div class="timeline-circle">✓</div><div class="timeline-text">مكتمل</div></div>
            </div>
        `;
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
        <div class="detail-row" style="margin-top: 20px; border-top: 1px solid var(--border); padding-top: 15px;">
            <span class="detail-label">الإجمالي</span><span class="detail-value detail-total">$${parseFloat(order.total_price).toFixed(2)}</span>
        </div>
        ${timelineHtml}
    `;
    lucide.createIcons();
    openSheet('orderDetailsSheet');
}

async function loadDeposits() {
    const list = document.getElementById('depositsList');
    list.innerHTML = '<div class="empty-state"><p>جاري التحميل...</p></div>';
    try {
        const res = await fetch(`${API_BASE}/api/deposits/`, { headers: getHeaders() });
        depositsData = await res.json();
        list.innerHTML = '';
        
        let totalApproved = 0;
        depositsData.forEach(d => { if(d.status === 'approved') totalApproved += parseFloat(d.amount); });
        document.getElementById('statTotalDeposits').textContent = `$${totalApproved.toFixed(2)}`;

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
        <div class="detail-row" style="margin-top: 20px; border-top: 1px solid var(--border); padding-top: 15px;">
            <span class="detail-label">المبلغ</span><span class="detail-value detail-total">$${parseFloat(d.amount).toFixed(2)}</span>
        </div>
    `;
    lucide.createIcons();
    openSheet('depositDetailsSheet');
}

// ════════════════════════════════════════════════════════════
// KYC Form
// ════════════════════════════════════════════════════════════
function openKYCModal() {
    if (tg) tg.HapticFeedback.impactOccurred('light');
    const content = document.getElementById('kycContent');
    
    if (userData.is_verified || userData.kyc_status === 'verified') {
        content.innerHTML = `
            <div class="text-center">
                <div class="icon-wrapper-large" style="background: rgba(16, 185, 129, 0.1); color: var(--success); margin: 0 auto 15px;"><i data-lucide="shield-check" size="32"></i></div>
                <h3>حسابك موثق بالفعل</h3>
                <p class="text-muted" style="margin-bottom: 20px;">مرحباً بك، ${userData.kyc_name || userData.first_name}</p>
                <button class="btn-primary" onclick="closeSheets()">إغلاق</button>
            </div>
        `;
    } else if (userData.kyc_status === 'pending') {
        content.innerHTML = `
            <div class="text-center">
                <div class="icon-wrapper-large" style="background: rgba(245, 158, 11, 0.1); color: var(--warning); margin: 0 auto 15px;"><i data-lucide="clock" size="32"></i></div>
                <h3>طلبك قيد المراجعة</h3>
                <p class="text-muted" style="margin-bottom: 20px;">يرجى الانتظار، سيتم إشعارك عند اعتماد التوثيق.</p>
                <button class="btn-primary" onclick="closeSheets()">إغلاق</button>
            </div>
        `;
    } else {
        content.innerHTML = `
            <h3 class="text-center" style="margin-bottom: 20px;">توثيق الحساب (KYC)</h3>
            <form id="kycForm" onsubmit="submitKYC(event)">
                <div class="form-group"><label>الاسم الكامل</label><input type="text" id="kycName" class="form-input" required></div>
                <div class="form-group"><label>رقم الجوال</label><input type="tel" id="kycPhone" class="form-input" required></div>
                <div class="form-group"><label>المحافظة</label><select id="kycGovernorate" class="form-input" required><option value="دمشق">دمشق</option><option value="ريف دمشق">ريف دمشق</option><option value="حلب">حلب</option><option value="حمص">حمص</option><option value="حماة">حماة</option><option value="اللاذقية">اللاذقية</option><option value="طرطوس">طرطوس</option><option value="أخرى">أخرى</option></select></div>
                <div class="form-group"><label>المنطقة</label><input type="text" id="kycRegion" class="form-input" required></div>
                <div class="form-group">
                    <label>صورة الوجه الأمامي للهوية</label>
                    <input type="file" id="kycIdFront" accept="image/*" class="hidden" onchange="document.getElementById('idFrontLabel').textContent = 'تم اختيار الصورة'">
                    <div class="file-upload-btn" onclick="document.getElementById('kycIdFront').click()"><i data-lucide="upload"></i> <span id="idFrontLabel">اختر صورة</span></div>
                </div>
                <div class="form-group">
                    <label>صورة سيلفي مع الهوية</label>
                    <input type="file" id="kycSelfie" accept="image/*" class="hidden" onchange="document.getElementById('selfieLabel').textContent = 'تم اختيار الصورة'">
                    <div class="file-upload-btn" onclick="document.getElementById('kycSelfie').click()"><i data-lucide="camera"></i> <span id="selfieLabel">اختر صورة</span></div>
                </div>
                <button type="submit" class="btn-primary" id="kycSubmitBtn">إرسال الطلب</button>
            </form>
        `;
    }
    lucide.createIcons();
    openSheet('kycSheet');
}

async function submitKYC(e) {
    e.preventDefault();
    const btn = document.getElementById('kycSubmitBtn');
    const name = document.getElementById('kycName').value;
    const phone = document.getElementById('kycPhone').value;
    const gov = document.getElementById('kycGovernorate').value;
    const region = document.getElementById('kycRegion').value;
    const idFrontFile = document.getElementById('kycIdFront').files[0];
    const selfieFile = document.getElementById('kycSelfie').files[0];

    if (!idFrontFile || !selfieFile) { if (tg) tg.showAlert('يرجى رفع الصور'); return; }

    btn.textContent = 'جاري الإرسال...'; btn.disabled = true;

    try {
        const toBase64 = file => new Promise((resolve, reject) => {
            const reader = new FileReader(); reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result); reader.onerror = error => reject(error);
        });

        const idFrontBase64 = await toBase64(idFrontFile);
        const selfieBase64 = await toBase64(selfieFile);

        const res = await fetch(`${API_BASE}/api/kyc/submit`, {
            method: 'POST', headers: getHeaders(),
            body: JSON.stringify({ full_name: name, phone: phone, address: `${gov} - ${region}`, id_front_image: idFrontBase64, selfie_image: selfieBase64 })
        });

        const data = await res.json();
        if (res.ok) {
            if (tg) tg.HapticFeedback.notificationOccurred('success');
            userData.kyc_status = 'pending';
            showApp(); closeSheets();
            if (tg) tg.showAlert('تم إرسال طلب التوثيق بنجاح.');
        } else { throw new Error(data.error || 'فشل الإرسال'); }
    } catch (err) { if (tg) tg.showAlert(`خطأ:\n${err.message}`); } 
    finally { btn.textContent = 'إرسال الطلب'; btn.disabled = false; }
}

// ════════════════════════════════════════════════════════════
// Support Chat & Modals
// ════════════════════════════════════════════════════════════
async function loadSupportTickets() {
    const container = document.getElementById('chatContainer');
    container.innerHTML = '<p class="text-muted" style="text-align:center;">جاري التحميل...</p>';
    try {
        const res = await fetch(`${API_BASE}/api/support`, { headers: getHeaders() });
        const tickets = await res.json();
        container.innerHTML = '';
        if (tickets.length === 0) {
            container.innerHTML = '<div class="empty-state"><i data-lucide="message-circle" size="48"></i><p>مرحباً بك، كيف يمكننا مساعدتك؟</p></div>';
            lucide.createIcons(); return;
        }
        tickets.reverse().forEach(t => {
            const userBubble = document.createElement('div');
            userBubble.className = 'chat-bubble user';
            userBubble.innerHTML = `<span class="chat-sender">أنت</span><span>${escapeHTML(t.message)}</span><span class="chat-time">${new Date(t.date).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>`;
            container.appendChild(userBubble);
            if (t.reply) {
                const adminBubble = document.createElement('div');
                adminBubble.className = 'chat-bubble admin';
                adminBubble.innerHTML = `<span class="chat-sender">إدارة سند بلس</span><span>${escapeHTML(t.reply)}</span><span class="chat-time">${new Date(t.date).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>`;
                container.appendChild(adminBubble);
            }
        });
        window.scrollTo(0, document.body.scrollHeight);
    } catch (e) { container.innerHTML = '<p class="text-danger text-center">تعذر التحميل</p>'; }
}

async function sendSupportMessage() {
    const input = document.getElementById('supportInput');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    const container = document.getElementById('chatContainer');
    if (container.querySelector('.empty-state')) container.innerHTML = '';
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble user';
    bubble.innerHTML = `<span class="chat-sender">أنت</span><span>${escapeHTML(msg)}</span><span class="chat-time">الآن</span>`;
    container.appendChild(bubble);
    window.scrollTo(0, document.body.scrollHeight);
    try { await fetch(`${API_BASE}/api/support`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ message: msg }) }); } 
    catch (e) { if (tg) tg.showAlert("تعذر إرسال الرسالة"); }
}

function openReferralModal() { openSheet('referralSheet'); }
function openFAQModal() { openSheet('faqSheet'); }
function openSupportModal() { openSheet('supportModalSheet'); }

function openProductDetails(prod) {
    if (tg) tg.HapticFeedback.impactOccurred('light');
    if (tg) tg.showAlert(`المنتج: ${prod.name}\nالسعر: $${parseFloat(prod.base_price).toFixed(2)}\n\n(سيتم بناء نافذة الشراء قريباً)`);
}

// ════════════════════════════════════════════════════════════
// Core Utils
// ════════════════════════════════════════════════════════════
function openSheet(sheetId) {
    if (tg) tg.HapticFeedback.impactOccurred('light');
    document.getElementById('sheetOverlay').classList.add('active');
    document.getElementById(sheetId).classList.add('active');
}
function closeSheets() {
    document.getElementById('sheetOverlay').classList.remove('active');
    document.querySelectorAll('.bottom-sheet').forEach(s => s.classList.remove('active'));
}
function openDepositSheet() { openSheet('depositSheet'); }
function openLightbox(imgSrc) { document.getElementById('lightboxImg').src = imgSrc; document.getElementById('lightbox').classList.remove('hidden'); }
function closeLightbox() { document.getElementById('lightbox').classList.add('hidden'); }

function toggleDarkMode() {
    const isDark = document.getElementById('darkModeToggle').checked;
    if (isDark) { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('theme', 'dark'); if(tg) tg.setHeaderColor('#000000'); } 
    else { document.documentElement.setAttribute('data-theme', 'light'); localStorage.setItem('theme', 'light'); if(tg) tg.setHeaderColor('#F2F2F7'); }
}

function copyText(text, msg) {
    navigator.clipboard.writeText(text).then(() => {
        if (tg) { tg.HapticFeedback.notificationOccurred('success'); tg.showAlert(msg); }
        else { alert(msg); }
    });
}

function handleLogout() {
    if (tg) {
        tg.showConfirm("هل أنت متأكد من تسجيل الخروج؟", (confirmed) => { if (confirmed) { tg.close(); } });
    } else { if(confirm("هل أنت متأكد من تسجيل الخروج؟")) location.reload(); }
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(s) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[s]; });
}
