// miniapp/js/app_new.js

let currentPage = 'page-home';
let userData = null;
let categoriesData = [];
let productsData = [];
let ordersData = [];
let depositsData = [];
let paymentMethodsData = [];
let kycStatus = 'none';
let notificationsData = [];
let selectedMethodForDeposit = null;
let notificationPollerId = null;
let cancelTimers = {};

// ============ إعدادات العملة ============
const USD_TO_SYP = 132;
let currentCurrency = localStorage.getItem('currency') || 'USD';

function formatPrice(usdAmount) {
    if (currentCurrency === 'SYP') {
        const syp = Math.round(usdAmount * USD_TO_SYP);
        return `${syp.toLocaleString('ar')} ل.س`;
    }
    return `${usdAmount.toFixed(2)}$`;
}

function toggleCurrency() {
    currentCurrency = currentCurrency === 'USD' ? 'SYP' : 'USD';
    localStorage.setItem('currency', currentCurrency);
    updateCurrencyUI();
    updateUserUI();
    renderOrders(ordersData);
    renderDeposits(depositsData);
    renderCategories();
    renderProductsList(productsData);
    renderFavorites();
    renderPaymentMethods();
}

function updateCurrencyUI() {
    const label = document.getElementById('currencyLabel');
    if (label) label.textContent = currentCurrency;
}

// ============ المفضلة ============
function getFavorites() {
    try {
        return JSON.parse(localStorage.getItem('favorites') || '[]');
    } catch (e) {
        return [];
    }
}

function saveFavorites(list) {
    localStorage.setItem('favorites', JSON.stringify(list));
}

function isFavorite(productId) {
    return getFavorites().includes(productId);
}

function toggleFavorite(productId, event) {
    if (event) event.stopPropagation();
    let favorites = getFavorites();
    if (favorites.includes(productId)) {
        favorites = favorites.filter(id => id !== productId);
    } else {
        favorites.push(productId);
    }
    saveFavorites(favorites);
    renderCategories();
    renderProductsList(productsData);
    renderFavorites();
}

function renderFavorites() {
    const list = document.getElementById('favoritesList');
    if (!list) return;
    const favorites = getFavorites();
    if (!favorites.length) {
        list.innerHTML = '<div class="empty-state"><span class="material-icons">favorite_border</span>لا توجد منتجات في المفضلة بعد</div>';
        return;
    }
    const favProducts = productsData.filter(p => favorites.includes(p.id));
    list.innerHTML = favProducts.map(prod => renderProductCard(prod)).join('');
}

// ============ تهيئة التطبيق ============
document.addEventListener('DOMContentLoaded', async () => {
    initSplashScreen();

    const telegramReady = await initTelegram();
    applyTelegramTheme();

    if (!telegramReady || !window.currentUser?.id) {
        console.error('❌ لا يمكن تشغيل التطبيق خارج تيليجرام');
        showTelegramError();
        return;
    }

    console.log('✅ المستخدم الحالي:', window.currentUser.id, window.currentUser.first_name);

    try {
        userData = await authenticateUser(window.Telegram?.WebApp?.initData || '');
        console.log('✅ تم الحصول على بيانات المستخدم:', userData.telegram_id);
    } catch (error) {
        console.error('❌ فشل المصادقة:', error);
        if (error.message === 'TELEGRAM_ID_MISSING') {
            showTelegramError();
        } else {
            showSuccessScreen('خطأ في الاتصال', 'تعذر الاتصال بالخادم، حاول مرة أخرى');
        }
        return;
    }

    updateCurrencyUI();
    updateUserUI();
    await loadInitialData();
    setupNavigation();
    setupFilters();
    setupSearch();
    setupFAQ();

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        const darkToggle = document.getElementById('darkModeToggle');
        if (darkToggle) darkToggle.checked = savedTheme === 'dark';
    }

    const savedPage = localStorage.getItem('lastPage');
    if (savedPage && document.getElementById(savedPage)) {
        navigateTo(savedPage);
    }

    startNotificationPolling();
});

// ============ شاشة خطأ تيليجرام ============
function showTelegramError() {
    document.body.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:center; min-height:100vh; padding:24px; background:linear-gradient(180deg, #F0F9FF 0%, #FFFFFF 100%);">
            <div style="max-width:400px; text-align:center; background:#FFFFFF; border-radius:20px; padding:32px 24px; box-shadow:0 8px 32px rgba(14,165,233,0.12); border:1px solid #EAF5FC;">
                <div style="width:80px; height:80px; margin:0 auto 20px; background:#FFF8E1; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                    <span class="material-icons" style="font-size:40px; color:#F59E0B;">warning</span>
                </div>
                <h2 style="font-size:1.3rem; font-weight:800; color:#0F172A; margin-bottom:12px;">افتح التطبيق من تيليجرام</h2>
                <p style="font-size:0.95rem; color:#64748B; line-height:1.7; margin-bottom:24px;">
                    هذا التطبيق يعمل فقط من داخل تيليجرام.<br>
                    يرجى فتحه من البوت الرسمي.
                </p>
                <a href="https://t.me/YOUR_BOT_USERNAME" style="display:inline-block; background:#0EA5E9; color:white; padding:12px 28px; border-radius:50px; text-decoration:none; font-weight:700; font-size:0.95rem;">
                    فتح البوت
                </a>
            </div>
        </div>
    `;
}

// ============ تهيئة شاشة البداية ============
function initSplashScreen() {
    const splash = document.getElementById('splashScreen');
    if (!splash) return;

    generateSplashParticles();

    window.splashTimeoutId = setTimeout(() => {
        closeSplash();
    }, 8000);
}

function generateSplashParticles() {
    const container = document.getElementById('splashParticlesStage');
    if (!container) return;
    container.innerHTML = '';

    const PARTICLE_COUNT = 55;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = document.createElement('span');
        p.className = 'splash-particle';

        const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.4;
        const radius = 60 + Math.random() * 60;
        const dx = Math.cos(angle) * radius;
        const dy = Math.sin(angle) * radius;

        const curveX = (Math.random() - 0.5) * 40;
        const curveY = (Math.random() - 0.5) * 40;

        p.style.setProperty('--dx-out', dx + 'px');
        p.style.setProperty('--dy-out', dy + 'px');
        p.style.setProperty('--curve-x', curveX + 'px');
        p.style.setProperty('--curve-y', curveY + 'px');
        p.style.setProperty('--delay', (1.8 + Math.random() * 0.4) + 's');

        const size = 3 + Math.random() * 5;
        p.style.width = size + 'px';
        p.style.height = size + 'px';

        container.appendChild(p);
    }
}

function closeSplash() {
    const splash = document.getElementById('splashScreen');
    if (!splash || splash.classList.contains('hidden')) return;

    splash.classList.add('hidden');

    if (window.splashTimeoutId) {
        clearTimeout(window.splashTimeoutId);
        window.splashTimeoutId = null;
    }

    setTimeout(() => {
        if (splash.parentNode) splash.style.display = 'none';
    }, 900);
}

async function loadInitialData() {
    showSkeletons();
    try {
        categoriesData = await fetchCategories();
        productsData = await fetchProducts();
        paymentMethodsData = await fetchPaymentMethods();

        if (userData?.telegram_id) {
            ordersData = await fetchUserOrders(userData.telegram_id);
            depositsData = await fetchUserDeposits(userData.telegram_id);
            notificationsData = await fetchNotifications(userData.telegram_id);
            const kycInfo = await getMyKYC(userData.telegram_id);
            kycStatus = kycInfo.status || 'none';
            saveLastSeenNotificationId();
        }

        renderCategories();
        renderPaymentMethods();
        renderOrders(ordersData);
        renderDeposits(depositsData);
        renderFavorites();
        updateKYCUI();
        updateNotificationBadge();
    } catch (error) {
        console.error('Error loading data:', error);
        showSuccessScreen('خطأ', 'حدث خطأ أثناء تحميل البيانات');
    }
}

function showSkeletons() {
    const categoriesGrid = document.getElementById('categoriesGrid');
    if (categoriesGrid) {
        categoriesGrid.innerHTML = Array(6).fill('<div class="skeleton-card"></div>').join('');
    }
}

// ============ المراقبة الفورية للإشعارات ============
function startNotificationPolling() {
    if (notificationPollerId) clearInterval(notificationPollerId);
    notificationPollerId = setInterval(checkForNewNotifications, 30000);
}

async function checkForNewNotifications() {
    if (!userData?.telegram_id) return;
    try {
        const notifications = await fetchNotifications(userData.telegram_id);
        const lastSeen = parseInt(localStorage.getItem('lastSeenNotificationId') || '0');
        const newOnes = notifications.filter(n => n.id > lastSeen);

        if (newOnes.length > 0) {
            playNotificationSound();
            flashScreen();
            notificationsData = notifications;
            updateNotificationBadge();
            const maxId = Math.max(...notifications.map(n => n.id));
            localStorage.setItem('lastSeenNotificationId', maxId);
        }
    } catch (error) {
        console.error('Polling error:', error);
    }
}

function saveLastSeenNotificationId() {
    if (!notificationsData.length) return;
    const maxId = Math.max(...notificationsData.map(n => n.id));
    localStorage.setItem('lastSeenNotificationId', maxId);
}

function playNotificationSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.value = 880;
        gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.4);
    } catch (e) {
        console.warn('تعذر تشغيل الصوت:', e);
    }
}

function flashScreen() {
    const overlay = document.getElementById('flashOverlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    void overlay.offsetWidth;
    overlay.classList.add('active');
    setTimeout(() => overlay.classList.remove('active'), 1300);
}

// ============ واجهة المستخدم ============
function updateUserUI() {
    if (!userData) {
        const gm = document.getElementById('greetingMessage');
        const gs = document.getElementById('greetingSub');
        if (gm) gm.textContent = 'الرجاء فتح التطبيق من تيليجرام';
        if (gs) gs.textContent = 'لم يتم التعرف على حسابك';
        return;
    }

    document.getElementById('headerBalance').textContent = formatPrice(userData.balance);
    document.getElementById('chargeBalance').textContent = formatPrice(userData.balance);
    document.getElementById('accountBalance').textContent = formatPrice(userData.balance);

    document.getElementById('accountName').textContent =
        userData.first_name || userData.username || 'مستخدم';
    document.getElementById('accountId').innerHTML = `<span class="ltr">ID: ${userData.telegram_id}</span>`;
    document.getElementById('accountEmail').innerHTML = userData.username ? `<span class="ltr">@${userData.username}</span>` : '';

    if (userData.vip_level > 0) {
        const vipBadge = document.getElementById('vipBadge');
        if (vipBadge) {
            vipBadge.innerHTML = `<span class="material-icons" style="font-size:16px; vertical-align:middle;">star</span> VIP${userData.vip_level}`;
            vipBadge.style.display = 'inline-block';
        }
        const avb = document.getElementById('accountVipBadge');
        if (avb) {
            avb.innerHTML = `<span class="material-icons" style="font-size:16px; vertical-align:middle;">star</span> VIP${userData.vip_level}`;
            avb.style.display = 'inline-block';
        }
    }

    const hour = new Date().getHours();
    let greeting = 'مرحباً';
    if (hour < 12) greeting = 'صباح الخير';
    else if (hour < 18) greeting = 'مساء الخير';
    else greeting = 'مساء النور';

    const gm = document.getElementById('greetingMessage');
    if (gm) gm.textContent = `${greeting}، ${userData.first_name || userData.username || 'مستخدم'}`;
    const gs = document.getElementById('greetingSub');
    if (gs) gs.textContent = `رصيدك: ${formatPrice(userData.balance)}`;

    if (window.currentUser?.photo_url) {
        const ha = document.getElementById('headerAvatar');
        ha.style.backgroundImage = `url(${window.currentUser.photo_url})`;
        ha.textContent = '';
    } else {
        const ha = document.getElementById('headerAvatar');
        if (ha) ha.textContent = (userData.first_name || userData.username || 'م')[0];
    }

    updateKYCBadge();
    updateCurrencyUI();
}

function updateKYCBadge() {
    const badge = document.getElementById('accountKycBadge');
    if (!badge || !userData) return;
    if (userData.kyc_status === 'verified' || userData.is_verified) {
        badge.innerHTML = '<span class="status-badge verified">موثق <span class="material-icons">verified</span></span>';
    } else if (userData.kyc_status === 'pending' || kycStatus === 'pending') {
        badge.innerHTML = '<span class="status-badge pending">قيد المراجعة</span>';
    } else {
        badge.innerHTML = '<span class="status-badge unverified">غير موثق</span>';
    }
}

// ============ بطاقة المنتج — الاسم فقط (بدون سعر أو كمية) ============
function renderProductCard(prod) {
    const fav = isFavorite(prod.id);
    const isNew = prod.created_at && (Date.now() - new Date(prod.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000;
    return `
        <div class="product-card" data-id="${prod.id}" onclick="openPurchaseModal(${prod.id})">
            <button class="favorite-btn ${fav ? 'active' : ''}" onclick="toggleFavorite(${prod.id}, event)" aria-label="المفضلة">
                <span class="material-icons">${fav ? 'favorite' : 'favorite_border'}</span>
            </button>
            <div class="product-image" style="background-image:url('${prod.image || ''}');">
                ${prod.image ? '' : '📦'}
                <div class="product-badges">
                    ${isNew ? '<span class="badge-new">جديد</span>' : ''}
                </div>
            </div>
            <div class="product-name">${prod.name}</div>
        </div>
    `;
}

function renderCategories() {
    const grid = document.getElementById('categoriesGrid');
    const countEl = document.getElementById('categoriesCount');
    if (!grid) return;
    if (!categoriesData.length) {
        grid.innerHTML = '<div class="skeleton-card"></div>'.repeat(6);
        return;
    }
    grid.innerHTML = categoriesData.map(cat => `
        <div class="category-item" data-id="${cat.id}" onclick="showCategoryProducts(${cat.id})">
            <div class="category-icon">
                ${cat.image ? `<img src="${cat.image}" style="width:48px;height:48px;border-radius:12px;object-fit:cover;" />` : '📁'}
            </div>
            <div class="category-name">${cat.name}</div>
        </div>
    `).join('');
    if (countEl) countEl.textContent = categoriesData.length;
}

function showCategoryProducts(categoryId) {
    const category = categoriesData.find(c => c.id === categoryId);
    if (!category) return;
    document.getElementById('productsPageTitle').textContent = category.name;
    const filtered = productsData.filter(p => p.category_id === categoryId);
    renderProductsList(filtered);
    navigateTo('page-products');
}

function renderProductsList(products) {
    const list = document.getElementById('productsList');
    if (!list) return;
    if (!products.length) {
        list.innerHTML = '<div class="empty-state"><span class="material-icons">inbox</span>لا توجد منتجات في هذا القسم</div>';
        return;
    }
    list.innerHTML = products.map(prod => renderProductCard(prod)).join('');
}

function renderPaymentMethods() {
    const container = document.getElementById('paymentMethodsList');
    if (!container) return;
    container.innerHTML = paymentMethodsData.map(m => `
        <div class="payment-method" data-id="${m.id}" onclick="showDepositStep1(${m.id})">
            <div class="payment-method-info">
                ${m.icon && m.icon.length > 100 ? `<img src="${m.icon}" style="width:48px;height:48px;border-radius:12px;object-fit:cover;" alt="${m.name}">` : '<span class="payment-method-icon">💳</span>'}
                <div>
                    <div class="payment-method-name">${m.name}</div>
                    <div class="payment-method-desc">${m.description || ''}</div>
                </div>
            </div>
            <span class="material-icons">chevron_left</span>
        </div>
    `).join('');
}

// ============ رسم حالة الطلب ============
function renderOrderProgress(status) {
    const steps = [
        { key: 'pending', label: 'قيد المعالجة' },
        { key: 'review', label: 'قيد المراجعة' },
        { key: 'processing', label: 'قيد التنفيذ' },
        { key: 'completed', label: 'مكتمل' }
    ];
    const order = ['pending', 'review', 'processing', 'completed'];
    const currentIndex = order.indexOf(status);
    if (currentIndex === -1) return '';

    return `
        <div class="order-progress">
            ${steps.map((s, i) => `
                <div class="progress-step ${i < currentIndex ? 'completed' : ''} ${i === currentIndex ? 'active' : ''}">
                    <div class="step-circle">
                        ${i < currentIndex ? '<span class="material-icons" style="font-size:14px;">check</span>' : (i + 1)}
                    </div>
                    <div>${s.label}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderOrders(orders) {
    const list = document.getElementById('ordersList');
    if (!list) return;
    if (!orders || !orders.length) {
        list.innerHTML = '<div class="empty-state"><span class="material-icons">receipt_long</span>لا توجد طلبات</div>';
        return;
    }
    list.innerHTML = orders.map(order => {
        const canCancel = order.status === 'pending' && isWithinCancelWindow(order.created_at);
        return `
        <div class="order-card" data-status="${order.status}" data-id="${order.id}" onclick="viewOrderDetails(${order.id})">
            <div class="order-header">
                <span class="order-number">${order.order_number}</span>
                <span class="status-badge ${order.status}">${getStatusText(order.status)}</span>
            </div>
            <div class="order-details">
                <div>المنتج: ${order.product_name || order.product_id}</div>
                <div>الكمية: ${order.quantity}</div>
                <div>السعر: ${formatPrice(order.total_price)}</div>
                <div>التاريخ: ${order.created_at ? new Date(order.created_at).toLocaleString('ar') : ''}</div>
            </div>
            ${renderOrderProgress(order.status)}
            ${canCancel ? `
                <div class="cancel-timer" id="timer-${order.id}">
                    <span class="material-icons">timer</span>
                    <span class="timer-text">120</span> ثانية للإلغاء
                </div>
                <div style="margin-top:8px;">
                    <button class="btn-outline" style="width:100%;" onclick="event.stopPropagation(); cancelOrder(${order.id})">إلغاء الطلب</button>
                </div>
            ` : ''}
        </div>
    `}).join('');

    orders.forEach(order => {
        if (order.status === 'pending' && isWithinCancelWindow(order.created_at)) {
            startCancelCountdown(order.id, order.created_at);
        }
    });
}

// ============ Modal تفاصيل الطلب ============
function viewOrderDetails(orderId) {
    const order = ordersData.find(o => o.id === orderId);
    if (!order) return;

    let deliveryInfo = '';
    try {
        const delivery = JSON.parse(order.delivery_data || '{}');
        if (delivery.player_id) deliveryInfo += `<div style="margin-bottom:6px;"><strong>معرف اللاعب:</strong> <span class="ltr">${delivery.player_id}</span></div>`;
        if (delivery.phone) deliveryInfo += `<div style="margin-bottom:6px;"><strong>رقم الهاتف:</strong> <span class="ltr">${delivery.phone}</span></div>`;
        if (delivery.bundle_name) deliveryInfo += `<div style="margin-bottom:6px;"><strong>الباقة:</strong> ${delivery.bundle_name}</div>`;
    } catch (e) {
        if (order.delivery_data) deliveryInfo = `<div>${order.delivery_data}</div>`;
    }

    const actionButtons = order.status === 'completed' ? `
        <div style="margin-top:16px;">
            <button class="btn-primary" style="width:100%;" onclick="closeModal(); orderAgain(${order.product_id})">
                <span class="material-icons">refresh</span> إعادة الطلب
            </button>
        </div>
    ` : '';

    const body = `
        <div style="text-align:right;">
            <h3 style="margin-bottom:16px; text-align:center;">تفاصيل الطلب</h3>
            <div class="order-header" style="margin-bottom:12px;">
                <span class="order-number">${order.order_number}</span>
                <span class="status-badge ${order.status}">${getStatusText(order.status)}</span>
            </div>
            <div class="order-details" style="margin-bottom:14px;">
                <div style="margin-bottom:6px;"><strong>المنتج:</strong> ${order.product_name || order.product_id}</div>
                <div style="margin-bottom:6px;"><strong>الكمية:</strong> ${order.quantity}</div>
                <div style="margin-bottom:6px;"><strong>السعر:</strong> ${formatPrice(order.total_price)}</div>
                ${order.discount_amount ? `<div style="margin-bottom:6px;"><strong>الخصم:</strong> ${formatPrice(order.discount_amount)}</div>` : ''}
                <div style="margin-bottom:6px;"><strong>التاريخ:</strong> ${order.created_at ? new Date(order.created_at).toLocaleString('ar') : ''}</div>
                ${deliveryInfo}
            </div>
            ${renderOrderProgress(order.status)}
            ${actionButtons}
        </div>
    `;
    openModal('تفاصيل الطلب', body);
}

function isWithinCancelWindow(createdAt) {
    if (!createdAt) return false;
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    return (now - created) < 120000;
}

function startCancelCountdown(orderId, createdAt) {
    if (cancelTimers[orderId]) clearInterval(cancelTimers[orderId]);
    const createdTime = new Date(createdAt).getTime();
    cancelTimers[orderId] = setInterval(() => {
        const elapsed = Date.now() - createdTime;
        const remaining = Math.max(0, 120 - Math.floor(elapsed / 1000));
        const timerEl = document.querySelector(`#timer-${orderId} .timer-text`);
        if (timerEl) {
            timerEl.textContent = remaining;
        }
        if (remaining <= 0) {
            clearInterval(cancelTimers[orderId]);
            delete cancelTimers[orderId];
            ordersData = ordersData.map(o => o.id === orderId ? { ...o } : o);
            renderOrders(ordersData);
        }
    }, 1000);
}

async function cancelOrder(orderId) {
    if (!confirm('هل تريد إلغاء الطلب؟ سيتم استرداد المبلغ.')) return;
    try {
        const result = await apiFetch(`${API_BASE_URL}/api/orders/${orderId}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegram_id: userData.telegram_id }),
        });
        if (result && result.error) {
            showSuccessScreen('خطأ', result.error);
        } else {
            showSuccessScreen('تم إلغاء الطلب', 'تم استرداد المبلغ إلى رصيدك');
            ordersData = await fetchUserOrders(userData.telegram_id);
            renderOrders(ordersData);
            userData = await authenticateUser(window.Telegram?.WebApp?.initData || '');
            updateUserUI();
        }
    } catch (error) {
        showSuccessScreen('خطأ', `فشل إلغاء الطلب: ${error.message}`);
    }
}

function orderAgain(productId) {
    openPurchaseModal(productId);
}

function getStatusText(status) {
    switch(status) {
        case 'pending': return 'قيد المعالجة';
        case 'review': return 'قيد المراجعة';
        case 'processing': return 'قيد التنفيذ';
        case 'completed': return 'مكتمل';
        case 'failed': return 'فشل';
        case 'cancelled': return 'ملغي';
        default: return status || 'غير معروف';
    }
}

function renderDeposits(deposits) {
    const list = document.getElementById('depositsList');
    if (!list) return;
    if (!deposits || !deposits.length) {
        list.innerHTML = '<div class="empty-state"><span class="material-icons">account_balance_wallet</span>لا توجد إيداعات</div>';
        return;
    }
    list.innerHTML = deposits.map(d => `
        <div class="order-card">
            <div class="order-header">
                <span>${d.transaction_id}</span>
                <span class="status-badge ${d.status === 'approved' ? 'completed' : d.status}">${d.status === 'approved' ? 'مكتمل' : d.status === 'rejected' ? 'مرفوض' : 'معلق'}</span>
            </div>
            <div class="order-details">
                <div>المبلغ: ${formatPrice(d.amount)}</div>
                <div>الطريقة: ${d.method}</div>
                ${d.admin_note ? `<div>ملاحظة: ${d.admin_note}</div>` : ''}
                <div>التاريخ: ${d.created_at ? new Date(d.created_at).toLocaleString('ar') : ''}</div>
            </div>
        </div>
    `).join('');
}

// ============ KYC ============
function updateKYCUI() {
    const container = document.getElementById('kycDynamicContent');
    if (!container) return;
    const isVerified = (userData && (userData.kyc_status === 'verified' || userData.is_verified)) || kycStatus === 'verified';
    const isPending = (userData && userData.kyc_status === 'pending') || kycStatus === 'pending';
    if (isVerified) {
        container.innerHTML = `
            <div class="kyc-container">
                <h2>توثيق الحساب (KYC)</h2>
                <div class="kyc-icon"><span class="material-icons">verified</span></div>
                <p class="kyc-message">حسابك موثق بالفعل</p>
            </div>`;
    } else if (isPending) {
        container.innerHTML = `
            <div class="kyc-container">
                <h2>توثيق الحساب (KYC)</h2>
                <div class="kyc-icon" style="background:#FFC107;"><span class="material-icons">schedule</span></div>
                <p class="kyc-message">طلب التوثيق قيد التدقيق يرجى انتظار رد الإدارة</p>
            </div>`;
    } else {
        container.innerHTML = `
            <div class="kyc-container">
                <h2>توثيق الحساب</h2>
                <p style="color:var(--text-secondary); margin-bottom:20px;">يرجى تعبئة البيانات التالية لتفعيل جميع ميزات التطبيق</p>
                <div class="kyc-form" style="max-width:400px; margin:0 auto; text-align:right;">
                    <div class="form-group"><label>الاسم الكامل</label><input type="text" id="kycFullName" placeholder="مثال: أحمد محمد" /></div>
                    <div class="form-group"><label>رقم الجوال</label><input type="tel" id="kycPhone" placeholder="مثال: 0959921234" /></div>
                    <div class="form-group"><label>العنوان الحالي</label><input type="text" id="kycAddress" placeholder="المدينة / المنطقة" /></div>
                    <div class="form-group">
                        <label>صورة سيلفي مع الهوية</label>
                        <div class="image-preview" id="kycSelfiePreview" style="height:180px;"><span style="color:var(--text-secondary); font-size:0.9rem;">اضغط لرفع الصورة</span></div>
                        <input type="file" id="kycSelfieImage" accept="image/*" onchange="previewImage(this,'kycSelfiePreview')" style="margin-top:8px;" />
                    </div>
                    <button class="btn-primary" onclick="submitKYCRequest(this)">إرسال طلب التوثيق</button>
                </div>
            </div>
        `;
    }
}

async function submitKYCRequest(btn) {
    const fullName = document.getElementById('kycFullName')?.value;
    const phone = document.getElementById('kycPhone')?.value;
    const address = document.getElementById('kycAddress')?.value;
    const selfieFile = document.getElementById('kycSelfieImage')?.files[0];

    if (!fullName || !phone || !address || !selfieFile) {
        showSuccessScreen('تنبيه', 'يرجى تعبئة جميع الحقول ورفع الصورة');
        return;
    }

    if (!userData || !userData.telegram_id) {
        showSuccessScreen('خطأ', 'بيانات المستخدم غير متوفرة');
        return;
    }

    setButtonLoading(btn, true);

    const compressImage = (file, maxWidth = 600) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    try {
        const selfieBase64 = await compressImage(selfieFile);
        const result = await submitKYC({
            telegram_id: userData.telegram_id,
            full_name: fullName,
            phone: phone,
            address: address,
            selfie_image: selfieBase64,
        });

        if (result && result.error) {
            showSuccessScreen('خطأ', result.error);
        } else {
            showSuccessScreen('تم الإرسال', 'تم إرسال طلب التوثيق بنجاح، انتظر المراجعة');
            kycStatus = 'pending';
            updateKYCUI();
            navigateTo('page-account');
            updateUserUI();
        }
    } catch (error) {
        console.error('KYC submit error:', error);
        showSuccessScreen('خطأ', `فشل إرسال الطلب: ${error.message}`);
    } finally {
        setButtonLoading(btn, false);
    }
}

// ============ حالة تحميل الأزرار ============
function setButtonLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
        btn.disabled = true;
        btn.dataset.originalHtml = btn.innerHTML;
        btn.innerHTML = '<span class="btn-loading"></span> جارٍ التنفيذ...';
    } else {
        btn.disabled = false;
        if (btn.dataset.originalHtml) {
            btn.innerHTML = btn.dataset.originalHtml;
            delete btn.dataset.originalHtml;
        }
    }
}

// ============ شاشة النجاح ============
function showSuccessScreen(title, message) {
    const overlay = document.getElementById('successOverlay');
    const titleEl = document.getElementById('successTitle');
    const msgEl = document.getElementById('successMessage');
    if (!overlay) return;
    titleEl.textContent = title;
    msgEl.textContent = message;
    overlay.classList.add('active');
    setTimeout(() => {
        overlay.classList.remove('active');
    }, 2200);
}

// ============ شراء منتج ============
function openPurchaseModal(productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;

    const unitPrice = product.base_quantity > 0 ? product.base_price / product.base_quantity : product.base_price;

    let modalContent = `
        <div class="purchase-modal">
            <h3 style="text-align:center; margin: 0 0 12px;">${product.name}</h3>
            <div class="purchase-image" style="background-image:url('${product.image || ''}'); background-color:#f0f0f0; background-size:cover; background-position:center; width:48px; height:48px; border-radius:12px; margin: 0 auto 12px;">${product.image ? '' : '📦'}</div>
            <div class="form-group"><label>الكمية المطلوبة</label><input type="number" id="purchaseQuantity" value="${product.base_quantity || 1}" min="1" class="input-field"></div>
            <div style="font-weight:bold; font-size:1.2rem; margin: 16px 0; text-align:center;" id="purchaseTotal">الإجمالي: ${formatPrice(unitPrice * (product.base_quantity || 1))}</div>
            <div class="form-group"><label>كود الخصم (اختياري)</label><input type="text" id="purchaseCoupon" placeholder="أدخل كود الخصم"></div>
            ${product.input_type === 'id' ? `<div class="form-group"><label>معرف اللاعب (ID)</label><input type="text" id="purchasePlayerId" placeholder="أدخل المعرف" class="input-field"></div>` : ''}
            ${product.input_type === 'phone' ? `<div class="form-group"><label>رقم الهاتف</label><input type="tel" id="purchasePhone" placeholder="أدخل رقم الهاتف" class="input-field"></div>` : ''}
            <div style="display:flex; gap:8px; margin-top:16px;">
                <button class="btn-primary" style="flex:1;" onclick="confirmPurchaseDialog(${product.id}, this)">شراء</button>
                <button class="btn-outline" style="flex:1;" onclick="closeModal()">إلغاء</button>
            </div>
        </div>
    `;
    openModal('شراء منتج', modalContent);

    const updateTotal = () => {
        let total = 0;
        const qty = parseFloat(document.getElementById('purchaseQuantity')?.value) || 0;
        total = unitPrice * qty;
        const totalEl = document.getElementById('purchaseTotal');
        if (totalEl) totalEl.textContent = `الإجمالي: ${formatPrice(total)}`;
    };

    document.getElementById('purchaseQuantity')?.addEventListener('input', updateTotal);
    updateTotal();
}

function confirmPurchaseDialog(productId, btn) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;

    if (product.input_type === 'id') {
        const playerId = document.getElementById('purchasePlayerId')?.value;
        if (!playerId || !playerId.trim()) {
            showSuccessScreen('تنبيه', 'يرجى إدخال معرف اللاعب (ID)');
            return;
        }
    } else if (product.input_type === 'phone') {
        const phone = document.getElementById('purchasePhone')?.value;
        if (!phone || !phone.trim()) {
            showSuccessScreen('تنبيه', 'يرجى إدخال رقم الهاتف');
            return;
        }
    }

    const qty = parseInt(document.getElementById('purchaseQuantity')?.value) || 1;
    const total = product.base_quantity > 0
        ? (product.base_price / product.base_quantity) * qty
        : product.base_price * qty;

    const confirmed = confirm(`هل أنت متأكد من شراء ${qty} من ${product.name}؟\nالإجمالي: ${formatPrice(total)}`);
    if (!confirmed) return;

    executeConfirmPurchase(productId, btn);
}

async function executeConfirmPurchase(productId, btn) {
    const product = productsData.find(p => p.id === productId);
    if (!product || !userData) return;

    const orderData = {
        telegram_id: userData.telegram_id,
        product_id: productId,
    };
    orderData.quantity = parseInt(document.getElementById('purchaseQuantity')?.value);

    if (product.input_type === 'id') orderData.player_id = document.getElementById('purchasePlayerId')?.value;
    else if (product.input_type === 'phone') orderData.phone = document.getElementById('purchasePhone')?.value;

    if (btn) setButtonLoading(btn, true);

    try {
        const result = await createOrder(orderData);
        if (result && result.error) {
            showSuccessScreen('خطأ', result.error);
        } else {
            showSuccessScreen('تم الطلب', 'طلبك قيد المعالجة');
            closeModal();
            ordersData = await fetchUserOrders(userData.telegram_id);
            renderOrders(ordersData);
            userData = await authenticateUser(window.Telegram?.WebApp?.initData || '');
            updateUserUI();
        }
    } catch (error) {
        console.error('Order error:', error);
        showSuccessScreen('خطأ', `فشل إرسال الطلب: ${error.message}`);
    } finally {
        if (btn) setButtonLoading(btn, false);
    }
}

// ============ الإيداع ============
function showDepositStep1(methodId) {
    const method = paymentMethodsData.find(m => m.id === methodId);
    if (!method) return;
    selectedMethodForDeposit = method;

    const qrCode = method.qr_image && method.qr_image.length > 100
        ? `<img src="${method.qr_image}" style="width:180px;height:180px;border-radius:16px;object-fit:cover;" />`
        : '<span style="color:var(--text-secondary);">لا يوجد رمز QR بعد</span>';

    const logo = method.icon && method.icon.length > 100
        ? `<img src="${method.icon}" style="width:48px;height:48px;border-radius:12px;object-fit:cover;" />`
        : '💳';

    const body = `
        <div style="text-align:center;">
            <div style="display:flex; align-items:center; justify-content:center; gap:12px; margin-bottom:16px;">${logo}<h3 style="margin:0;">${method.name}</h3></div>
            <p style="color:var(--text-secondary); margin-bottom:16px;">${method.description || ''}</p>
            <div style="background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:16px; margin-bottom:16px; text-align:right;">
                <div style="margin-bottom:12px;"><div style="font-weight:bold; margin-bottom:4px;">اسم الحساب</div><div style="display:flex; align-items:center; justify-content:space-between; gap:8px;"><span id="copyAccountName">${method.account_name || '-'}</span><button class="icon-btn" onclick="copyText('copyAccountName')"><span class="material-icons">content_copy</span></button></div></div>
                <div><div style="font-weight:bold; margin-bottom:4px;">رقم الحساب</div><div style="display:flex; align-items:center; justify-content:space-between; gap:8px;"><span id="copyAccountNumber">${method.account || '-'}</span><button class="icon-btn" onclick="copyText('copyAccountNumber')"><span class="material-icons">content_copy</span></button></div></div>
            </div>
            <div style="margin-bottom:16px;"><div style="font-weight:bold; margin-bottom:8px;">رمز QR للتحويل</div>${qrCode}</div>
            <button class="btn-primary" onclick="showDepositStep2()">التالي</button>
        </div>
    `;
    openModal('طريقة الدفع', body);
}

function showDepositStep2() {
    if (!selectedMethodForDeposit) return;
    const method = selectedMethodForDeposit;
    const body = `
        <div style="text-align:right;">
            <h3>إتمام الإيداع</h3>
            <div class="form-group"><label>المبلغ بالدولار</label><input type="number" id="depositAmount" min="${method.min_amount || 0}" step="0.01" class="input-field"></div>
            <div class="form-group"><label>اسم المرسل</label><input type="text" id="depositSenderName" placeholder="أدخل اسم المرسل" class="input-field"></div>
            <div class="form-group"><label>إثبات التحويل (صورة)</label><div class="image-preview" id="depositProofPreview">📷</div><input type="file" id="depositProofImage" accept="image/*" onchange="previewImage(this, 'depositProofPreview')" class="input-field"></div>
            <button class="btn-primary" onclick="submitDeposit(this)">إرسال</button>
        </div>
    `;
    openModal('إتمام الإيداع', body);
}

function copyText(elementId) {
    const text = document.getElementById(elementId)?.innerText || '';
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => showSuccessScreen('تم النسخ', 'تم نسخ النص بنجاح')).catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try { document.execCommand('copy'); showSuccessScreen('تم النسخ', 'تم نسخ النص بنجاح'); } catch (e) { showSuccessScreen('خطأ', 'تعذر النسخ'); }
    document.body.removeChild(textarea);
}

async function submitDeposit(btn) {
    if (!selectedMethodForDeposit) return;
    const method = selectedMethodForDeposit;
    const amount = parseFloat(document.getElementById('depositAmount')?.value);
    const senderName = document.getElementById('depositSenderName')?.value;
    const proofFile = document.getElementById('depositProofImage')?.files[0];

    if (!amount || amount <= 0) { showSuccessScreen('تنبيه', 'أدخل مبلغ صحيح'); return; }
    if (!senderName || !senderName.trim()) { showSuccessScreen('تنبيه', 'أدخل اسم المرسل'); return; }
    if (!proofFile) { showSuccessScreen('تنبيه', 'ارفع صورة الإثبات'); return; }

    setButtonLoading(btn, true);

    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    try {
        const proofBase64 = await toBase64(proofFile);
        const result = await createDeposit({
            telegram_id: userData.telegram_id,
            amount,
            method: method.id,
            proof_image: proofBase64,
            sender_name: senderName,
        });
        if (result && result.error) {
            showSuccessScreen('خطأ', result.error);
        } else {
            showSuccessScreen('تم الإرسال', 'تم إرسال طلب الإيداع بنجاح');
            closeModal();
            selectedMethodForDeposit = null;
            depositsData = await fetchUserDeposits(userData.telegram_id);
            renderDeposits(depositsData);
        }
    } catch (error) {
        console.error('Deposit error:', error);
        showSuccessScreen('خطأ', `فشل إرسال الإيداع: ${error.message}`);
    } finally {
        setButtonLoading(btn, false);
    }
}

// ============ الخدمة المخصصة ============
function requestCustomService() {
    openModal('طلب خدمة مخصصة', `
        <div class="form-group"><label>اسم الخدمة</label><input type="text" id="serviceName" placeholder="مثال: تصميم شعار"></div>
        <div class="form-group"><label>وصف الخدمة</label><textarea id="serviceDesc" rows="3" placeholder="اكتب تفاصيل الخدمة"></textarea></div>
        <div class="form-group"><label>السعر المتوقع (اختياري)</label><input type="number" id="servicePrice" placeholder="0.00"></div>
        <button class="btn-primary" onclick="submitServiceRequest(this)">إرسال الطلب</button>
        <button class="btn-outline" onclick="closeModal()">إلغاء</button>
    `);
}

async function submitServiceRequest(btn) {
    const service_name = document.getElementById('serviceName').value;
    const description = document.getElementById('serviceDesc').value;
    const estimated_price = parseFloat(document.getElementById('servicePrice').value) || 0;
    if (!service_name) { showSuccessScreen('تنبيه', 'أدخل اسم الخدمة'); return; }

    setButtonLoading(btn, true);
    try {
        const result = await requestCustomService({ telegram_id: userData.telegram_id, service_name, description, estimated_price });
        if (result && result.error) {
            showSuccessScreen('خطأ', result.error);
        } else {
            showSuccessScreen('تم الإرسال', 'تم إرسال طلب الخدمة بنجاح');
            closeModal();
        }
    } catch (error) {
        showSuccessScreen('خطأ', `فشل إرسال الطلب: ${error.message}`);
    } finally {
        setButtonLoading(btn, false);
    }
}

// ============ الإحالات ============
function openReferralModal() {
    if (!userData) return;
    const referralCode = `SANAD${userData.telegram_id}`;
    const referralLink = `https://t.me/YOUR_BOT_USERNAME?start=${referralCode}`;
    openModal('الإحالات', `
        <div style="text-align:center;">
            <div class="kyc-icon" style="background:var(--primary);">
                <span class="material-icons" style="font-size:3rem;">card_giftcard</span>
            </div>
            <h3 style="margin-bottom:12px;">ادعُ أصدقاءك واربح</h3>
            <p style="color:var(--text-secondary); margin-bottom:16px; font-size:0.9rem;">
                عند انضمام صديق برابطك، ستحصل على مكافأة رصيد
            </p>
            <div style="background:var(--primary-light); border-radius:12px; padding:12px; margin-bottom:16px;">
                <div style="font-weight:bold; margin-bottom:6px;">كود الإحالة الخاص بك</div>
                <div style="font-size:1.2rem; font-weight:800; color:var(--primary); letter-spacing:1px;" id="referralCode">${referralCode}</div>
            </div>
            <button class="btn-primary" onclick="copyText('referralCode')">
                <span class="material-icons">content_copy</span> نسخ الكود
            </button>
            <button class="btn-outline" style="margin-top:8px;width:100%;" onclick="shareReferral('${referralLink}')">
                <span class="material-icons">share</span> مشاركة الرابط
            </button>
        </div>
    `);
}

function shareReferral(link) {
    const text = 'انضم إلى سند بلس واحصل على خدمات رقمية بسهولة!';
    if (navigator.share) {
        navigator.share({ title: 'SANAD+', text, url: link });
    } else {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, '_blank');
    }
}

// ============ الأسئلة الشائعة ============
const faqData = [
    { q: 'كيف أشحن رصيدي؟', a: 'اذهب إلى قسم "شحن" في الأسفل، اختر طريقة الدفع، ثم اتبع التعليمات.' },
    { q: 'كم يستغرق تنفيذ الطلب؟', a: 'عادة ما يتم تنفيذ الطلب خلال 5-15 دقيقة، لكن قد يتأخر في بعض الحالات.' },
    { q: 'ما هو KYC ولماذا أحتاجه؟', a: 'KYC هو توثيق الهوية، يمنحك وصولاً لجميع طرق الدفع ويزيد حدود الاستخدام.' },
    { q: 'كيف ألغي طلباً؟', a: 'يمكنك إلغاء الطلب خلال 120 ثانية من إنشائه، عبر زر "إلغاء الطلب" في قسم طلباتي.' },
    { q: 'ماذا يحدث إذا فشل الطلب؟', a: 'في حال فشل الطلب، يتم استرداد المبلغ تلقائياً إلى رصيدك.' },
    { q: 'كيف أتواصل مع الدعم؟', a: 'استخدم زر الدعم العائم أسفل الشاشة للتواصل معنا مباشرة.' }
];

function setupFAQ() {
    const list = document.getElementById('faqList');
    if (!list) return;
    list.innerHTML = faqData.map((item, i) => `
        <div class="faq-item" onclick="toggleFAQ(${i})">
            <div class="faq-question">
                <span>${item.q}</span>
                <span class="material-icons">expand_more</span>
            </div>
            <div class="faq-answer">${item.a}</div>
        </div>
    `).join('');
}

function toggleFAQ(index) {
    const items = document.querySelectorAll('.faq-item');
    if (items[index]) {
        items[index].classList.toggle('open');
    }
}

// ============ الدعم والإشعارات ============
function openSupport() {
    window.open('https://t.me/SANADST', '_blank');
}

function openNotificationsPage() {
    if (!userData) { showSuccessScreen('تنبيه', 'افتح التطبيق من تيليجرام'); return; }
    fetchNotifications(userData.telegram_id).then(notifications => {
        const bodyHTML = `
            <div style="text-align:center;">
                <h3>الإشعارات</h3>
                ${notifications.length ? notifications.map(n => `
                    <div style="text-align:right;background:var(--surface);border-radius:12px;padding:12px;margin-bottom:8px;border:1px solid var(--border);">
                        <div style="font-weight:bold;">${n.title}</div>
                        <div style="color:var(--text-secondary);font-size:0.8rem;">${n.message}</div>
                        <div style="color:var(--text-secondary);font-size:0.7rem;">${n.created_at ? new Date(n.created_at).toLocaleString('ar') : ''}</div>
                    </div>`).join('') : '<p>لا توجد إشعارات</p>'}
                <button class="btn-outline" style="width:100%;" onclick="markAllNotificationsRead()">تعليم الكل كمقروء</button>
            </div>`;
        openModal('الإشعارات', bodyHTML);
    });
}

async function markAllNotificationsRead() {
    if (!userData) return;
    try {
        for (let n of notificationsData) {
            if (!n.is_read) await markNotificationRead(n.id);
        }
        notificationsData = await fetchNotifications(userData.telegram_id);
        updateNotificationBadge();
        closeModal();
        openNotificationsPage();
    } catch (error) {
        console.error('mark all read error:', error);
    }
}

function updateNotificationBadge() {
    const unread = notificationsData.filter(n => !n.is_read).length;
    const badge = document.getElementById('notificationBadge');
    if (unread > 0) { badge.style.display = 'inline'; badge.textContent = unread; }
    else { badge.style.display = 'none'; }
}

// ============ التنقل ============
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const pageId = item.getAttribute('data-page');
            navigateTo(pageId);
        });
    });
    document.getElementById('backButton')?.addEventListener('click', handleBack);
    document.getElementById('closeButton')?.addEventListener('click', handleClose);
}

function setupFilters() {
    const orderFilters = document.getElementById('orderFilters');
    if (orderFilters) {
        orderFilters.querySelectorAll('.pill').forEach(pill => {
            pill.addEventListener('click', () => {
                orderFilters.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                const filter = pill.getAttribute('data-filter');
                const filtered = filter === 'all' ? ordersData : ordersData.filter(o => o.status === filter);
                renderOrders(filtered);
            });
        });
    }
    const depositFilters = document.getElementById('depositFilters');
    if (depositFilters) {
        depositFilters.querySelectorAll('.pill').forEach(pill => {
            pill.addEventListener('click', () => {
                depositFilters.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                const filter = pill.getAttribute('data-filter');
                const filtered = filter === 'all' ? depositsData : depositsData.filter(d => d.status === filter);
                renderDeposits(filtered);
            });
        });
    }
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase();
            const filtered = productsData.filter(p => p.name.toLowerCase().includes(query));
            if (currentPage === 'page-products') renderProductsList(filtered);
        });
    }
}

function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.getAttribute('data-page') === pageId));
    currentPage = pageId;
    localStorage.setItem('lastPage', pageId);

    if (pageId === 'page-home') renderCategories();
    if (pageId === 'page-orders') renderOrders(ordersData);
    if (pageId === 'page-charge') renderPaymentMethods();
    if (pageId === 'page-deposits') renderDeposits(depositsData);
    if (pageId === 'page-account') updateUserUI();
    if (pageId === 'page-kyc') updateKYCUI();
    if (pageId === 'page-favorites') renderFavorites();
    if (pageId === 'page-faq') setupFAQ();
}

// ============ أدوات عامة ============
function previewImage(input, previewId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => document.getElementById(previewId).innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
        reader.readAsDataURL(input.files[0]);
    }
}

function openModal(title, bodyHTML) {
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

function handleBack() {
    if (currentPage !== 'page-home') navigateTo('page-home');
    else window.history.back();
}

function handleClose() {
    if (window.Telegram?.WebApp?.close) window.Telegram.WebApp.close();
    else window.close();
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function goToAccount() { navigateTo('page-account'); }
function showNotifications() { openNotificationsPage(); }