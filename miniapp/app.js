const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor("#000000"); }
const API_URL = 'https://sanad-plus-backend.onrender.com';
const tgUser = tg?.initDataUnsafe?.user;
let currentUser = null;
let categoriesData = [];
let paymentMethodsData = [];
let currentOrderContext = { product: null, price: 0 };
let currentNotificationId = null;

function formatDate(dateStr) { if (!dateStr) return 'غير محدد'; const d = new Date(dateStr); return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`; }
function cleanDeliveryData(data) { if (!data) return 'غير محدد'; if (typeof data === 'string' && data.startsWith('{')) { try { const p = JSON.parse(data); return p.player_id || p.phone || p.link || p.id || data; } catch (e) { return data; } } return data; }

document.addEventListener('DOMContentLoaded', async () => {
    if (!tgUser) { showToast("يرجى فتح التطبيق من داخل تليجرام"); return; }
    try {
        const res = await fetch(`${API_URL}/api/miniapp/init`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telegram_id: tgUser.id, first_name: tgUser.first_name, username: tgUser.username }) });
        const data = await res.json();
        if (data.banned) { document.getElementById('bannedOverlay').classList.remove('hidden'); document.getElementById('bannedOverlay').classList.add('flex'); return; }
        if (data.maintenance) { document.getElementById('maintenanceOverlay').classList.remove('hidden'); document.getElementById('maintenanceOverlay').classList.add('flex'); return; }
        if (data.notifications && data.notifications.length > 0) { showNotification(data.notifications[0]); }
        if (data.user) {
            currentUser = data.user;
            document.getElementById('greetingText').innerText = `مرحباً، ${tgUser.first_name} 👋`;
            document.getElementById('profileName').innerText = tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : '');
            document.getElementById('profileUsername').innerText = tgUser.username ? `@${tgUser.username}` : '';
            document.getElementById('profileTelegramId').innerText = `Telegram: ${tgUser.id}`;
            if (tgUser.photo_url) { document.getElementById('userAvatar').src = tgUser.photo_url; document.getElementById('userAvatar').classList.remove('hidden'); document.getElementById('defaultAvatarIcon').classList.add('hidden'); }
            updateUserUI(data.user);
        }
        fetchProducts();
        fetchPayments();
    } catch (err) { showToast("تعذر الاتصال بالسيرفر"); }
});

function showNotification(notif) { currentNotificationId = notif.id; document.getElementById('notifTitle').innerText = notif.title || 'إشعار'; document.getElementById('notifMessageText').innerHTML = notif.message; document.getElementById('notificationBanner').classList.remove('hidden'); lucide.createIcons(); }
async function dismissNotification() { document.getElementById('notificationBanner').classList.add('hidden'); if (currentNotificationId) { await fetch(`${API_URL}/api/miniapp/notifications/${currentNotificationId}/read`, { method: 'POST' }); currentNotificationId = null; } }

async function fetchProducts() {
    document.getElementById('homeCategories').innerHTML = '<div class="col-span-full text-center text-slate-400 animate-pulse py-4">جاري تحميل الأقسام...</div>';
    try {
        const prodRes = await fetch(`${API_URL}/api/miniapp/products`);
        const prodData = await prodRes.json();
        categoriesData = prodData.categories;
        renderHomeCategories(categoriesData);
    } catch (err) { document.getElementById('homeCategories').innerHTML = `<div class="col-span-full text-center text-slate-400 py-4">تعذر التحميل. <button onclick="fetchProducts()" class="text-accent underline font-bold">إعادة المحاولة</button></div>`; }
}

async function fetchPayments() {
    try {
        const res = await fetch(`${API_URL}/api/miniapp/payment-methods?telegram_id=${tgUser.id}`);
        paymentMethodsData = await res.json();
    } catch (err) { console.error(err); }
}

function updateUserUI(user) {
    document.getElementById('homeBalanceWrapper').innerHTML = `<span class="text-3xl text-slate-500">$</span>${user.balance.toFixed(2)}`;
    document.getElementById('profileBalance').innerText = `$${user.balance.toFixed(2)}`;
    document.getElementById('sanadIdText').innerText = "SN-" + user.id.toString().padStart(6, '0');
    updateVerificationBadge(user.kyc_status);
}
function updateVerificationBadge(status) {
    const badgeContainer = document.getElementById('verificationBadge');
    badgeContainer.classList.remove('hidden');
    if (status === 'verified') {
        badgeContainer.innerHTML = `<svg class="w-6 h-6 text-[#1d9bf0]" fill="currentColor" viewBox="0 0 24 24"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.79-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.75 2.73 1.867 3.45-.103.36-.16.74-.16 1.13 0 2.21 1.71 3.998 3.918 3.998.47 0 .92-.084 1.336-.25C9.184 21.585 10.49 22.5 12 22.5s2.816-.917 3.337-2.25c.416.165.866.25 1.336.25 2.21 0 3.918-1.79 3.918-4 0-.39-.057-.77-.16-1.13 1.117-.72 1.867-1.99 1.867-3.45z"></path><path fill="white" d="M10.515 16.957l-3.32-3.32 1.414-1.414 1.906 1.906 4.95-4.95 1.414 1.414-6.364 6.364z"></path></svg>`;
    } else { badgeContainer.innerHTML = `<div class="bg-danger/20 rounded-full p-1 flex items-center justify-center"><i data-lucide="alert-circle" class="text-danger" size="18"></i></div>`; lucide.createIcons(); }
}

function renderHomeCategories(categories) {
    const grid = document.getElementById('homeCategories');
    if(!categories || categories.length === 0) { grid.innerHTML = '<div class="col-span-full text-center text-slate-400 py-4">لا توجد أقسام حالياً</div>'; return; }
    grid.innerHTML = categories.map(cat => `
        <div onclick="openCategory(${cat.id})" class="bg-iosCard rounded-3xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bento-card border border-slate-800">
            <img src="${cat.image || 'https://via.placeholder.com/64'}" alt="${cat.name}" class="w-16 h-16 mb-2 object-cover rounded-xl shadow-lg">
            <span class="font-bold text-white text-sm">${cat.name}</span>
        </div>`).join('');
}

function openCategory(categoryId) {
    const category = categoriesData.find(c => c.id === categoryId);
    if(!category) return;
    document.getElementById('categoryTitle').innerText = category.name;
    const grid = document.getElementById('categoryProductsGrid');
    if(category.products.length === 0) { grid.innerHTML = '<div class="col-span-full text-center text-slate-400 py-10">لا توجد منتجات</div>'; } 
    else {
        grid.innerHTML = category.products.map(prod => `
            <div onclick="openProductModal(${prod.id})" class="bg-iosCard rounded-3xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bento-card border border-slate-800">
                <img src="${prod.image || 'https://via.placeholder.com/80'}" class="w-16 h-16 rounded-xl mb-3 object-cover shadow-lg">
                <span class="font-bold text-white text-sm">${prod.name}</span>
                <span class="text-accent text-xs mt-1">$${prod.price.toFixed(2)}</span>
            </div>`).join('');
    }
    document.getElementById('categoryView').classList.add('active');
}
function closeCategoryView() { document.getElementById('categoryView').classList.remove('active'); }

function openProductModal(productId) {
    let product = null;
    for (let cat of categoriesData) { product = cat.products.find(p => p.id === productId); if (product) break; }
    if (!product) return;
    currentOrderContext.product = product;
    document.getElementById('modalGameTitle').innerText = product.name;
    if(product.image) document.getElementById('modalGameImg').src = product.image;
    // F-1: عرض الوصف
    const descEl = document.getElementById('gameDescription');
    if(descEl) { if(product.description) { descEl.innerText = product.description; descEl.classList.remove('hidden'); } else { descEl.classList.add('hidden'); } }
    
    document.getElementById('gameInputField').placeholder = product.input_type === 'phone' ? 'رقم الهاتف' : 'ايدي الحساب';
    document.getElementById('gamePackagesList').innerHTML = `<label class="block cursor-pointer"><input type="radio" name="pkg" value="${product.price}" class="package-radio hidden" checked><div class="border border-slate-700 bg-dark rounded-2xl p-4 flex justify-between items-center transition"><span class="font-bold text-white">${product.name}</span><span class="text-accent font-bold">$${product.price.toFixed(2)}</span></div></label>`;
    document.getElementById('gameTotal').innerText = `$${product.price.toFixed(2)}`;
    openModal('gameModal');
}

async function submitGameOrder() {
    const playerId = document.getElementById('gameInputField').value;
    if(!playerId) return showToast("يرجى إدخال البيانات المطلوبة");
    Swal.fire({ title: 'جاري الشراء...', allowOutsideClick: false, background: '#1c1c1e', color: '#fff', didOpen: () => Swal.showLoading() });
    try {
        const res = await fetch(`${API_URL}/api/miniapp/order`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telegram_id: tgUser.id, product_id: currentOrderContext.product.id, quantity: 1, delivery_data: playerId }) });
        const data = await res.json();
        if (data.success) { Swal.fire({ icon: 'success', title: 'تم الشراء', text: 'تم إرسال طلبك!', background: '#1c1c1e', color: '#fff' }); closeModal('gameModal'); currentUser.balance = data.new_balance; updateUserUI(currentUser); } 
        else { Swal.fire({ icon: 'error', title: 'خطأ', text: data.error, background: '#1c1c1e', color: '#fff' }); }
    } catch (err) { Swal.fire({ icon: 'error', title: 'خطأ', text: 'تعذر الاتصال', background: '#1c1c1e', color: '#fff' }); }
}

// F-2: الدفع والعمولة والـ KYC
function selectPaymentMethod(methodName) {
    const method = paymentMethodsData.find(m => m.name === methodName);
    if(!method) return;

    if(method.locked) {
        closeModal('paymentMethodsModal');
        return Swal.fire({
            icon: 'warning', title: 'التوثيق مطلوب', text: 'يجب توثيق حسابك أولاً لتتمكن من الإيداع.',
            showCancelButton: true, confirmButtonText: 'الذهاب للتوثيق', cancelButtonText: 'إلغاء', background: '#1c1c1e', color: '#fff'
        }).then((result) => { if(result.isConfirmed) { switchTab('profile', document.querySelectorAll('.nav-btn')[4]); openKycModal(); } });
    }

    document.getElementById('depositTitle').innerText = `إتمام الإيداع - ${methodName}`;
    document.getElementById('depositMinLimit').innerText = `$${method.min}`;
    document.getElementById('depositMaxLimit').innerText = `$${method.max}`;
    document.getElementById('depositAccountNumber').innerText = method.account_number;

    closeModal('paymentMethodsModal');
    setTimeout(() => { openModal('depositModal'); }, 300);
}

// Helper to preview image
function previewDepositImage(input) { if (input.files && input.files[0]) { const reader = new FileReader(); reader.onload = function(e) { document.getElementById('depositImagePreview').src = e.target.result; document.getElementById('depositImagePreview').classList.remove('hidden'); }; reader.readAsDataURL(input.files[0]); } }

// Auto-refresh every 30 seconds if on inbox tab
setInterval(() => { const inboxSection = document.getElementById('section-inbox'); if(inboxSection && !inboxSection.classList.contains('hidden')) { loadInbox(); } }, 30000);

function switchTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(tab => { tab.classList.add('hidden'); tab.classList.remove('block'); });
    document.getElementById('tab-' + tabId)?.classList.replace('hidden', 'block');
    if (btnElement) { document.querySelectorAll('.nav-btn').forEach(btn => { btn.classList.remove('text-accent'); btn.classList.add('text-slate-500'); }); btnElement.classList.remove('text-slate-500'); btnElement.classList.add('text-accent'); }
}
function openModal(id) { const m = document.getElementById(id); const c = document.getElementById(id+'Content'); if(m&&c){m.classList.remove('hidden'); setTimeout(()=>c.classList.remove('translate-y-full'),50);} }
function closeModal(id) { const m = document.getElementById(id); const c = document.getElementById(id+'Content'); if(m&&c){c.classList.add('translate-y-full'); setTimeout(()=>m.classList.add('hidden'),300);} }
function showToast(msg) { Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: msg, showConfirmButton: false, timer: 2500, background: '#1c1c1e', color: '#fff' }); }
function handleLogout() { if(tg) tg.close(); }
function copySanadId() { navigator.clipboard.writeText(document.getElementById('sanadIdText').innerText).then(() => showToast('تم نسخ المعرف')); }
