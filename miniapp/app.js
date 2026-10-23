/* ============================================================
   SANAD PLUS+ — MiniApp Engine (Error Handling & UX Upgrade)
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

// ================= Universal Toast Notification =================
function showToast(message, type = 'error') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); z-index:9999; display:flex; flex-direction:column; gap:10px; width:90%; max-width:350px; pointer-events:none;';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)';
    const icon = type === 'error' ? 'alert-circle' : 'check-circle';
    
    toast.style.cssText = `background: ${bgColor}; backdrop-filter: blur(10px); color: white; padding: 12px 16px; border-radius: 12px; font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); animation: slideDown 0.3s ease;`;
    toast.innerHTML = `<i data-lucide="${icon}" size="20"></i> <span>${message}</span>`;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ================= Safe Fetch (Handles HTML Errors) =================
async function safeFetch(url, options = {}) {
    try {
        const res = await fetch(url, options);
        const contentType = res.headers.get("content-type");
        
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("السيرفر غير متاح حالياً. جاري إعادة التشغيل...");
        }
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || `خطأ في السيرفر: ${res.status}`);
        }
        return data;
    } catch (error) {
        if (error.name === 'TypeError' || error.message.includes('JSON')) {
            throw new Error("تعذر الاتصال بالسيرفر. تحقق من اتصالك بالإنترنت.");
        }
        throw error;
    }
}

// ================= Init & Auth =================
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
        document.getElementById('headerUserName').textContent = "خطأ في الاتصال";
        showToast(error.message, 'error');
    }
});

async function authenticate() {
    const initData = tg?.initData;
    if (!initData) throw new Error("يرجى فتح التطبيق من داخل تيليجرام");
    const data = await safeFetch(`${API_BASE}/api/auth/telegram`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData })
    });
    authToken = data.access_token; userData = data.user;
}

function getHeaders() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` }; }

async function loadInitialData() {
    try {
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
    } catch(e) { console.warn("Initial data partially failed"); }
}

// ================= UI Rendering =================
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

// ================= Categories & Products =================
function renderCategories() { /* (سابقاً) */ }
function openCategory(id, name) { /* (سابقاً) */ }
function renderPaymentMethodsPage() { /* (سابقاً) */ }

// ================= Product Purchase =================
function openProductDetails(prod) { /* (سابقاً) */ }
function selectBundle(id, price) { /* (سابقاً) */ }
function updateDynamicPrice(input) { /* (سابقاً) */ }

async function submitOrder(e) {
    e.preventDefault();
    const btn = document.getElementById('buyBtn');
    const inputVal = document.getElementById('purchaseInput')?.value;
    
    if (currentProduct.input_type !== 'none' && !inputVal) {
        return showToast('يرجى إدخال البيانات المطلوبة', 'error');
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

        const data = await safeFetch(`${API_BASE}/api/orders/create`, {
            method: 'POST', headers: getHeaders(), body: JSON.stringify(orderData)
        });

        if (tg) tg.HapticFeedback.notificationOccurred('success');
        closeSheets();
        userData.balance -= parseFloat(data.total_price);
        showApp();
        showToast(`تم الطلب بنجاح! رقم: ${data.order_number}`, 'success');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.textContent = 'شراء الآن'; btn.disabled = false;
    }
}

// ================= Deposit Flow =================
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
    const amount = parseFloat(document.getElementById('depositAmount').value);
    const sender = document.getElementById('depositSenderName').value;
    const file = document.getElementById('depositReceipt').files[0];
    
    // التحقق المحلي قبل إرسال الطلب
    const maxAmt = parseFloat(selectedPaymentMethod.max_amount);
    const minAmt = parseFloat(selectedPaymentMethod.min_amount);
    
    if (!amount || amount <= 0) return showToast('أدخل مبلغاً صحيحاً', 'error');
    if (amount < minAmt) return showToast(`الحد الأدنى للإيداع هو $${minAmt}`, 'error');
    if (amount > maxAmt) return showToast(`الحد الأقصى للإيداع هو $${maxAmt}`, 'error');
    if (!file) return showToast('يرجى رفع صورة الإيصال', 'error');

    btn.textContent = 'جاري الإرسال...'; btn.disabled = true;
    try {
        const toBase64 = file => new Promise((resolve, reject) => {
            const reader = new FileReader(); reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result); reader.onerror = error => reject(error);
        });
        const base64Img = await toBase64(file);
        
        await safeFetch(`${API_BASE}/api/deposits/create`, {
            method: 'POST', headers: getHeaders(),
            body: JSON.stringify({ amount: amount, method_id: selectedPaymentMethod.id, sender_name: sender, proof_image: base64Img, idempotency_key: `dep-${userData.telegram_id}-${Date.now()}` })
        });
        
        if (tg) tg.HapticFeedback.notificationOccurred('success');
        closeSheets();
        navigate('home');
        showToast('تم إرسال طلب الإيداع بنجاح!', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    } finally { 
        btn.textContent = 'إرسال الطلب'; btn.disabled = false; 
    }
}

// ================= Navigation & Lists (With Retry) =================
function navigate(page) { /* (سابقاً) */ }

async function loadOrders() {
    const list = document.getElementById('ordersList');
    list.innerHTML = '<div class="empty-state"><i data-lucide="loader" class="spin" size="48"></i><p>جاري التحميل...</p></div>';
    lucide.createIcons();
    
    try {
        const data = await safeFetch(`${API_BASE}/api/orders/`, { headers: getHeaders() });
        ordersData = data;
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
                <div class="list-card-header"><span>${o.order_number}</span><span class="${o.status === 'completed' ? 'text-success' : o.status === 'pending' ? 'text-warning' : 'text-danger'}">${o.status}</span></div>
                <div class="list-card-body"><span>${o.product_name}</span><span>$${parseFloat(o.total_price).toFixed(2)}</span></div>
            `;
            list.appendChild(card);
        });
    } catch (e) {
        list.innerHTML = `<div class="empty-state"><i data-lucide="wifi-off" size="48" class="text-danger"></i><p>${e.message}</p><button onclick="loadOrders()" class="btn-primary" style="margin-top:15px; width:auto; padding:10px 20px;">إعادة المحاولة</button></div>`;
        lucide.createIcons();
    }
}

async function loadDeposits() { /* (نفس منطق loadOrders مع تغيير المسار) */ }
function openOrderDetails(orderId) { /* (سابقاً) */ }
function openDepositDetails(depositId) { /* (سابقاً) */ }
function openKYCModal() { /* (سابقاً) */ }
function openReferralModal() { /* (سابقاً) */ }
function openFAQModal() { /* (سابقاً) */ }
function openSupportModal() { /* (سابقاً) */ }
async function loadSupportTickets() { /* (سابقاً) */ }
async function sendSupportMessage() { /* (سابقاً) */ }
function openSheet(sheetId) { /* (سابقاً) */ }
function closeSheets() { /* (سابقاً) */ }
function openLightbox(imgSrc) { /* (سابقاً) */ }
function closeLightbox() { /* (سابقاً) */ }
function toggleDarkMode() { /* (سابقاً) */ }
function copyText(text, msg) { navigator.clipboard.writeText(text); showToast(msg, 'success'); }
function handleLogout() { if (tg) tg.close(); else location.reload(); }
function escapeHTML(str) { if (!str) return ''; return String(str).replace(/[&<>"']/g, function(s) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[s]; }); }
