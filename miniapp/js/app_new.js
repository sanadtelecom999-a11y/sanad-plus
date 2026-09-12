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

// ============ إعدادات البوت ============
const BOT_USERNAME = 'Sa3pls1_bot';

// ============ إعدادات العملة ============
const USD_TO_SYP = 132;
let currentCurrency = localStorage.getItem('currency') || 'USD';

// ============ Splash للمستخدمين العائدين ============
const SPLASH_SEEN_KEY = 'splash_seen_v11';
function hasSeenSplash() {
    try {
        return localStorage.getItem(SPLASH_SEEN_KEY) === '1';
    } catch (e) {
        return false;
    }
}
function markSplashSeen() {
    try {
        localStorage.setItem(SPLASH_SEEN_KEY, '1');
    } catch (e) {}
}

// ============ شوهد حديثاً ============
const RECENTLY_VIEWED_KEY = 'recently_viewed';
const RECENTLY_VIEWED_MAX = 6;

function getRecentlyViewed() {
    try {
        return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

function addToRecentlyViewed(productId) {
    try {
        let list = getRecentlyViewed();
        // إزالة المكرر
        list = list.filter(id => id !== productId);
        // إضافة في المقدمة
        list.unshift(productId);
        // حد أقصى
        if (list.length > RECENTLY_VIEWED_MAX) {
            list = list.slice(0, RECENTLY_VIEWED_MAX);
        }
        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(list));
    } catch (e) {
        console.warn('فشل حفظ شوهد حديثاً:', e);
    }
}

function renderRecentlyViewed() {
    const container = document.getElementById('recentlyViewedContainer');
    const list = document.getElementById('recentlyViewedList');
    if (!container || !list) return;

    const ids = getRecentlyViewed();
    if (!ids.length) {
        container.style.display = 'none';
        return;
    }

    // فلترة المنتجات الموجودة فقط
    const products = ids
        .map(id => productsData.find(p => p.id === id))
        .filter(Boolean);

    if (!products.length) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    list.innerHTML = products.map(prod => `
        <div class="recently-viewed-item" onclick="openPurchaseModal(${prod.id})">
            <div class="recently-viewed-image" style="background-image:url('${prod.image || ''}');">
                ${prod.image ? '' : '📦'}
            </div>
            <div class="recently-viewed-name">${prod.name}</div>
        </div>
    `).join('');
}

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
    renderLatestOrders();
    renderDeposits(depositsData);
    renderCategories();
    renderProductsList(productsData);
    renderFavorites();
    renderRecentlyViewed();
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
    renderRecentlyViewed();
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

// ============================================================
// =========== 📱 Pull to Refresh ===========
// ============================================================
const PullToRefresh = (() => {
    const THRESHOLD = 70;
    const MAX_PULL = 110;
    let startY = 0;
    let currentY = 0;
    let isPulling = false;
    let isRefreshing = false;
    let mainContent = null;
    let indicator = null;

    function createIndicator() {
        const el = document.createElement('div');
        el.className = 'ptr-indicator';
        el.innerHTML = `
            <div class="ptr-icon">
                <span class="material-icons">arrow_downward</span>
            </div>
            <div class="ptr-text">اسحب للتحديث</div>
        `;
        return el;
    }

    function init() {
        mainContent = document.querySelector('.main-content');
        if (!mainContent) {
            console.warn('PullToRefresh: main-content not found');
            return;
        }

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        indicator = createIndicator();
        document.body.insertBefore(indicator, mainContent);

        mainContent.addEventListener('touchstart', handleTouchStart, { passive: true });
        mainContent.addEventListener('touchmove', handleTouchMove, { passive: false });
        mainContent.addEventListener('touchend', handleTouchEnd, { passive: true });

        mainContent.addEventListener('mousedown', handleMouseDown);
    }

    function handleTouchStart(e) {
        if (isRefreshing) return;
        if (mainContent.scrollTop > 0) return;
        startY = e.touches[0].clientY;
        isPulling = true;
    }

    function handleTouchMove(e) {
        if (!isPulling || isRefreshing) return;
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;

        if (diff > 0 && mainContent.scrollTop === 0) {
            e.preventDefault();
            const pull = Math.min(diff * 0.5, MAX_PULL);
            updateIndicator(pull);
        } else if (diff < 0) {
            isPulling = false;
            resetIndicator();
        }
    }

    function handleTouchEnd() {
        if (!isPulling) return;
        const diff = currentY - startY;
        const pull = Math.min(diff * 0.5, MAX_PULL);

        if (pull >= THRESHOLD && !isRefreshing) {
            triggerRefresh();
        } else {
            resetIndicator();
        }
        isPulling = false;
    }

    function handleMouseDown(e) {
        if (isRefreshing) return;
        if (mainContent.scrollTop > 0) return;

        startY = e.clientY;
        isPulling = true;

        const onMove = (ev) => {
            if (!isPulling) return;
            currentY = ev.clientY;
            const diff = currentY - startY;
            if (diff > 0) {
                const pull = Math.min(diff * 0.5, MAX_PULL);
                updateIndicator(pull);
            }
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);

            if (!isPulling) return;
            const diff = currentY - startY;
            const pull = Math.min(diff * 0.5, MAX_PULL);

            if (pull >= THRESHOLD && !isRefreshing) {
                triggerRefresh();
            } else {
                resetIndicator();
            }
            isPulling = false;
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    function updateIndicator(pull) {
        if (!indicator) return;
        indicator.style.height = pull + 'px';
        indicator.style.opacity = Math.min(pull / THRESHOLD, 1);

        const icon = indicator.querySelector('.ptr-icon .material-icons');
        const text = indicator.querySelector('.ptr-text');

        if (pull >= THRESHOLD) {
            if (icon) icon.textContent = 'refresh';
            if (text) text.textContent = 'اترك للتحديث';
            indicator.classList.add('ready');
        } else {
            if (icon) icon.textContent = 'arrow_downward';
            if (text) text.textContent = 'اسحب للتحديث';
            indicator.classList.remove('ready');
        }
    }

    function resetIndicator() {
        if (!indicator) return;
        indicator.style.transition = 'height 300ms ease, opacity 300ms ease';
        indicator.style.height = '0px';
        indicator.style.opacity = '0';
        indicator.classList.remove('ready', 'refreshing');
        setTimeout(() => {
            indicator.style.transition = '';
        }, 300);
    }

    async function triggerRefresh() {
        if (isRefreshing || !indicator) return;
        isRefreshing = true;

        indicator.style.transition = 'height 250ms ease';
        indicator.style.height = '60px';
        indicator.style.opacity = '1';
        indicator.classList.add('refreshing');

        const icon = indicator.querySelector('.ptr-icon .material-icons');
        const text = indicator.querySelector('.ptr-text');
        if (icon) icon.textContent = 'sync';
        if (text) text.textContent = 'جارٍ التحديث...';

        if (navigator.vibrate) {
            try { navigator.vibrate(15); } catch (e) {}
        }

        try {
            await refreshAllData();
            if (text) text.textContent = 'تم التحديث ✓';
            setTimeout(() => {
                resetIndicator();
                isRefreshing = false;
            }, 500);
        } catch (error) {
            console.error('Refresh error:', error);
            if (text) text.textContent = 'فشل التحديث';
            setTimeout(() => {
                resetIndicator();
                isRefreshing = false;
            }, 800);
        }
    }

    async function refreshAllData() {
        if (userData?.telegram_id) {
            userData = await authenticateUser(window.Telegram?.WebApp?.initData || '');
        }
        await loadInitialData();
    }

    return { init };
})();

// ============================================================
// =========== 👆 Swipe Navigation ===========
// ============================================================
const SwipeNav = (() => {
    const PAGES = ['page-home', 'page-orders', 'page-charge', 'page-deposits', 'page-account'];
    const SWIPE_THRESHOLD = 60;
    const MAX_VERTICAL = 80;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    let isSwiping = false;
    let target = null;

    function init() {
        target = document.querySelector('.main-content');
        if (!target) {
            console.warn('SwipeNav: main-content not found');
            return;
        }

        // تجاهل prefers-reduced-motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        target.addEventListener('touchstart', handleStart, { passive: true });
        target.addEventListener('touchmove', handleMove, { passive: true });
        target.addEventListener('touchend', handleEnd, { passive: true });
    }

    function handleStart(e) {
        if (e.touches.length !== 1) return;
        // تجاهل السحب من العناصر التفاعلية
        const el = e.target;
        if (el.closest('input, textarea, select, button, .modal, .purchase-modal, .order-timeline')) {
            isSwiping = false;
            return;
        }
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = true;
    }

    function handleMove(e) {
        if (!isSwiping) return;
        const diffX = Math.abs(e.touches[0].clientX - touchStartX);
        const diffY = Math.abs(e.touches[0].clientY - touchStartY);

        // إذا تحرك رأسياً كثيراً → إلغاء (تمرير عمودي)
        if (diffY > MAX_VERTICAL && diffY > diffX) {
            isSwiping = false;
        }
    }

    function handleEnd(e) {
        if (!isSwiping) return;
        touchEndX = e.changedTouches[0].clientX;
        touchEndY = e.changedTouches[0].clientY;
        isSwiping = false;

        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;

        // التحقق من أنها سحبة أفقية
        if (Math.abs(diffX) < SWIPE_THRESHOLD) return;
        if (Math.abs(diffY) > Math.abs(diffX)) return;

        // إذا نحن في صفحة غير مدعومة → لا نتفاعل
        if (!PAGES.includes(currentPage)) return;

        const currentIdx = PAGES.indexOf(currentPage);

        // RTL: السحب لليسار (diffX < 0) = الصفحة السابقة
        // السحب لليمين (diffX > 0) = الصفحة التالية
        let newIdx;
        if (diffX > 0) {
            // سحب يمين → التالي في RTL (الأسفل في القائمة)
            newIdx = currentIdx + 1;
        } else {
            // سحب يسار → السابق في RTL (الأعلى)
            newIdx = currentIdx - 1;
        }

        if (newIdx >= 0 && newIdx < PAGES.length) {
            navigateTo(PAGES[newIdx]);
            // اهتزاز خفيف
            if (navigator.vibrate) {
                try { navigator.vibrate(10); } catch (err) {}
            }
        }
    }

    return { init };
})();

// ============================================================
// =========== Splash Screen — 8s ===========
// ============================================================
const SplashScreen = (() => {
    const T = {
        shieldIn: 0,
        lightSweep: 700,
        disintegrate: 1400,
        textReveal: 5000,
        revealPlus: 6000,
        revealEn: 6700,
        confirm: 7300,
        close: 7500
    };

    // نسخة سريعة للعائدين
    const QUICK_T = {
        shieldIn: 0,
        textReveal: 400,
        revealPlus: 700,
        revealEn: 950,
        close: 1400
    };

    const PARTICLE_COUNT = 180;
    const COLORS = ['#38BDF8', '#0EA5E9', '#7DD3FC', '#0D47A1', '#BAE6FD'];

    let canvas, ctx;
    let particles = [];
    let center = { x: 0, y: 0 };
    let rafId = null;
    let shatterTime = 0;
    let running = false;
    let isQuickMode = false;

    function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }

    class Particle {
        constructor(startX, startY) {
            this.x = startX;
            this.y = startY;
            this.startX = startX;
            this.startY = startY;

            const angle = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * 7;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;

            this.wobbleAmp = 0.3 + Math.random() * 0.6;
            this.wobblePhase = Math.random() * Math.PI * 2;
            this.wobbleSpeed = 0.001 + Math.random() * 0.002;

            this.size = 2 + Math.random() * 4;
            this.color = COLORS[Math.floor(Math.random() * COLORS.length)];

            this.phase = 'burst';
            this.opacity = 1;
        }

        update(now) {
            const elapsed = now - shatterTime;

            if (this.phase === 'burst' && elapsed > 300) {
                this.phase = 'scatter';
            }

            if (this.phase === 'burst') {
                this.x += this.vx;
                this.y += this.vy;
                this.vx *= 0.93;
                this.vy *= 0.93;
                this.opacity = 1;
            }
            else if (this.phase === 'scatter') {
                this.x += this.vx * 0.45;
                this.y += this.vy * 0.45;
                this.vx *= 0.985;
                this.vy *= 0.985;

                this.x += Math.sin(elapsed * this.wobbleSpeed + this.wobblePhase) * this.wobbleAmp;
                this.y += Math.cos(elapsed * this.wobbleSpeed * 0.7 + this.wobblePhase) * this.wobbleAmp;

                const fadeStart = 600;
                const fadeEnd = isQuickMode ? 1000 : 4300;
                const fadeRange = fadeEnd - fadeStart;
                const p = Math.min(1, Math.max(0, (elapsed - fadeStart) / fadeRange));
                this.opacity = 1 - easeOutQuart(p);
            }
        }

        draw(ctx) {
            if (this.opacity <= 0.01) return;
            ctx.globalAlpha = this.opacity;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 5;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function init() {
        canvas = document.getElementById('splashCanvas');
        if (!canvas) return false;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';

        ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        center = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };

        return true;
    }

    function spawnParticles() {
        particles = [];
        const shieldRadius = 70;
        const count = isQuickMode ? 60 : PARTICLE_COUNT;

        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
            const r = shieldRadius * (0.35 + Math.random() * 0.65);
            const sx = center.x + Math.cos(a) * r;
            const sy = center.y + Math.sin(a) * r * 0.92;
            particles.push(new Particle(sx, sy));
        }
    }

    function animate() {
        if (!running) return;
        const now = performance.now();

        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        for (const p of particles) {
            p.update(now);
            p.draw(ctx);
        }

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        rafId = requestAnimationFrame(animate);
    }

    function schedule(ms, fn) { return setTimeout(fn, ms); }

    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function closeSplash() {
        const splash = document.getElementById('splashScreen');
        if (!splash) return;

        running = false;
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        particles = [];

        splash.classList.add('hidden');
        markSplashSeen();

        setTimeout(() => {
            splash.style.display = 'none';
            if (canvas) {
                canvas.width = 0;
                canvas.height = 0;
                canvas = null;
                ctx = null;
            }
        }, 550);
    }

    function initSplashScreen() {
        const splash = document.getElementById('splashScreen');
        if (!splash) return;

        isQuickMode = hasSeenSplash();

        if (prefersReducedMotion()) {
            const shieldStage = document.getElementById('splashShieldStage');
            const textStage = document.getElementById('splashTextStage');
            if (shieldStage) shieldStage.style.display = 'none';
            if (textStage) {
                textStage.classList.add('visible');
                textStage.classList.add('reveal-plus');
                textStage.classList.add('reveal-en');
            }
            schedule(1200, closeSplash);
            return;
        }

        if (!init()) { closeSplash(); return; }

        const shieldStage = document.getElementById('splashShieldStage');
        const textStage = document.getElementById('splashTextStage');

        if (!shieldStage || !textStage) { closeSplash(); return; }

        const timeline = isQuickMode ? QUICK_T : T;

        schedule(timeline.shieldIn, () => {
            shieldStage.classList.add('appearing');
            splash.classList.add('shield-visible');
        });

        if (!isQuickMode) {
            schedule(timeline.lightSweep, () => {
                shieldStage.classList.add('sweeping');
            });

            schedule(timeline.disintegrate, () => {
                shieldStage.classList.remove('pulsing', 'sweeping');
                shieldStage.classList.add('disintegrating');
                spawnParticles();
                shatterTime = performance.now();
                running = true;
                rafId = requestAnimationFrame(animate);
            });
        } else {
            schedule(300, () => {
                shieldStage.classList.add('disintegrating');
            });
        }

        schedule(timeline.textReveal, () => {
            textStage.classList.add('visible');
        });

        schedule(timeline.revealPlus, () => {
            textStage.classList.add('reveal-plus');
        });

        schedule(timeline.revealEn, () => {
            textStage.classList.add('reveal-en');
        });

        if (!isQuickMode) {
            schedule(timeline.confirm, () => {
                textStage.classList.add('confirming');
                shieldStage.style.display = 'none';
            });
        }

        schedule(timeline.close, closeSplash);
    }

    return { initSplashScreen, closeSplash };
})();

// تشغيل Splash فوراً
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SplashScreen.initSplashScreen());
} else {
    SplashScreen.initSplashScreen();
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
    document.getElementById('accountId').textContent = `ID: ${userData.telegram_id}`;
    document.getElementById('accountEmail').textContent = userData.username ? `@${userData.username}` : '';

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

    // عدّاد الطلبات والإيداعات
    const orderCountEl = document.getElementById('orderCount');
    if (orderCountEl) orderCountEl.textContent = ordersData.length;
    const depositCountEl = document.getElementById('depositCount');
    if (depositCountEl) depositCountEl.textContent = depositsData.length;

    // إجمالي الإنفاق
    const totalSpentEl = document.getElementById('totalSpent');
    if (totalSpentEl) {
        const totalSpent = ordersData
            .filter(o => o.status !== 'cancelled' && o.status !== 'failed')
            .reduce((sum, o) => sum + (o.total_price || 0), 0);
        totalSpentEl.textContent = formatPrice(totalSpent);
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

    const descEl = document.getElementById('kycSettingDesc');
    if (descEl && userData) {
        if (userData.kyc_status === 'verified' || userData.is_verified) {
            descEl.textContent = 'حسابك موثق ✓';
        } else if (userData.kyc_status === 'pending' || kycStatus === 'pending') {
            descEl.textContent = 'طلب التوثيق قيد المراجعة';
        } else {
            descEl.textContent = 'وثق حسابك لاستخدام كل طرق الدفع';
        }
    }
}

// ============ بطاقة المنتج ============
function renderProductCard(prod) {
    const fav = isFavorite(prod.id);
    const isNew = prod.created_at && (Date.now() - new Date(prod.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000;
    return `
        <div class="product-card" data-id="${prod.id}" onclick="openPurchaseModal(${prod.id})">
            <button class="favorite-btn ${fav ? 'active' : ''}" onclick="toggleFavorite(${prod.id}, event)">
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

// ============ الأقسام ============
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
                ${cat.image ? `<img src="${cat.image}" alt="${cat.name}" />` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:2rem;background:var(--primary-light);">📁</div>'}
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
    if (!paymentMethodsData.length) {
        container.innerHTML = '<div class="empty-state"><span class="material-icons">payment</span>لا توجد طرق دفع متاحة</div>';
        return;
    }
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

// ============ شريط التقدم الأفقي ============
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

// ============================================================
// ============ 📈 Vertical Timeline للطلب ============
// ============================================================
function getTimelineSteps(status) {
    const allSteps = [
        { key: 'pending', label: 'قيد المعالجة', icon: 'schedule' },
        { key: 'review', label: 'قيد المراجعة', icon: 'visibility' },
        { key: 'processing', label: 'قيد التنفيذ', icon: 'autorenew' },
        { key: 'completed', label: 'مكتمل', icon: 'check_circle' }
    ];
    const order = ['pending', 'review', 'processing', 'completed'];
    const currentIdx = order.indexOf(status);

    if (status === 'failed') {
        return [
            { state: 'done', label: 'تم الطلب', icon: 'receipt' },
            { state: 'failed', label: 'فشل الطلب', icon: 'cancel' }
        ];
    }
    if (status === 'cancelled') {
        return [
            { state: 'done', label: 'تم الطلب', icon: 'receipt' },
            { state: 'cancelled', label: 'تم الإلغاء', icon: 'block' }
        ];
    }

    return allSteps.map((s, i) => ({
        state: i < currentIdx ? 'done' : (i === currentIdx ? 'current' : 'pending'),
        label: s.label,
        icon: s.icon
    }));
}

function buildOrderTimelineHTML(order) {
    const steps = getTimelineSteps(order.status);
    const dateStr = order.created_at ? new Date(order.created_at).toLocaleString('ar') : '';

    return `
        <div class="order-timeline">
            ${steps.map((step, i) => `
                <div class="timeline-step ${step.state}">
                    <div class="timeline-marker">
                        <span class="material-icons">${step.icon}</span>
                    </div>
                    <div class="timeline-content">
                        <div class="timeline-title">${step.label}</div>
                        ${i === 0 ? `<div class="timeline-time">${dateStr}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ============ تفاصيل التسليم ============
function buildDeliveryDetailsHTML(order) {
    if (!order.delivery_data) return '';
    let delivery = null;
    try {
        delivery = JSON.parse(order.delivery_data);
    } catch (e) {
        return `<div class="order-delivery-info"><div>${order.delivery_data}</div></div>`;
    }
    if (!delivery || typeof delivery !== 'object') return '';

    const rows = [];
    if (delivery.player_id) {
        rows.push(`<div class="delivery-row"><span class="delivery-label">معرف اللاعب (ID):</span><span class="delivery-value ltr">${delivery.player_id}</span></div>`);
    }
    if (delivery.account_id) {
        rows.push(`<div class="delivery-row"><span class="delivery-label">ID الحساب:</span><span class="delivery-value ltr">${delivery.account_id}</span></div>`);
    }
    if (delivery.phone) {
        rows.push(`<div class="delivery-row"><span class="delivery-label">رقم الهاتف:</span><span class="delivery-value ltr">${delivery.phone}</span></div>`);
    }
    if (delivery.bundle_name) {
        rows.push(`<div class="delivery-row"><span class="delivery-label">الباقة:</span><span class="delivery-value">${delivery.bundle_name}</span></div>`);
    }
    if (!rows.length) return '';
    return `<div class="order-delivery-info">${rows.join('')}</div>`;
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
        <div class="order-card" data-status="${order.status}" data-id="${order.id}">
            <div class="order-header">
                <span class="order-number">${order.order_number}</span>
                <span class="status-badge ${order.status}">${getStatusText(order.status)}</span>
            </div>
            <div class="order-details">
                <div>المنتج: ${order.product_name || order.product_id}</div>
                <div>الكمية: ${Number(order.quantity).toLocaleString('ar')}</div>
                <div>السعر: ${formatPrice(order.total_price)}</div>
            </div>
            ${buildDeliveryDetailsHTML(order)}
            ${buildOrderTimelineHTML(order)}
            ${canCancel ? `
                <div class="cancel-timer" id="timer-${order.id}">
                    <span class="material-icons">timer</span>
                    <span class="timer-text">120</span> ثانية للإلغاء
                </div>
                <div style="margin-top:8px;">
                    <button class="btn-outline" style="width:100%;" onclick="cancelOrder(${order.id})">إلغاء الطلب</button>
                </div>
            ` : ''}
            ${order.status === 'completed' ? `
                <div style="display:flex;gap:8px;margin-top:12px;">
                    <button class="btn-outline" style="flex:1;" onclick="orderAgain(${order.product_id})">إعادة الطلب</button>
                    <button class="btn-outline" style="flex:1;" onclick="shareProduct(${order.product_id})">مشاركة</button>
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

function renderLatestOrders() {
    const header = document.getElementById('latestOrdersHeader');
    const list = document.getElementById('latestOrdersList');
    if (!header || !list) return;
    if (!ordersData.length) {
        header.style.display = 'none';
        list.innerHTML = '';
        return;
    }
    header.style.display = 'flex';
    list.innerHTML = ordersData.slice(0, 3).map(order => `
        <div class="order-card">
            <div class="order-header">
                <span class="order-number">${order.order_number}</span>
                <span class="status-badge ${order.status}">${getStatusText(order.status)}</span>
            </div>
            <div class="order-details">
                <div>المنتج: ${order.product_name || order.product_id}</div>
                <div>الكمية: ${Number(order.quantity).toLocaleString('ar')}</div>
                <div>السعر: ${formatPrice(order.total_price)}</div>
            </div>
        </div>
    `).join('');
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
            showNotification('فشل الإلغاء', result.error, 'error');
        } else {
            showNotification('تم إلغاء الطلب', 'تم استرداد المبلغ إلى رصيدك', 'success');
            ordersData = await fetchUserOrders(userData.telegram_id);
            renderOrders(ordersData);
            renderLatestOrders();
            userData = await authenticateUser(window.Telegram?.WebApp?.initData || '');
            updateUserUI();
        }
    } catch (error) {
        showNotification('خطأ', `فشل إلغاء الطلب: ${error.message}`, 'error');
    }
}

function orderAgain(productId) {
    openPurchaseModal(productId);
}

function shareProduct(productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;
    const text = `شاهد هذا المنتج: ${product.name} بسعر ${formatPrice(product.base_price)}`;
    if (navigator.share) {
        navigator.share({ title: product.name, text: text });
    } else {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`, '_blank');
    }
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
                <span class="ltr">${d.transaction_id}</span>
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
        showNotification('تنبيه', 'يرجى تعبئة جميع الحقول ورفع الصورة', 'warning');
        return;
    }

    if (!userData || !userData.telegram_id) {
        showNotification('خطأ', 'بيانات المستخدم غير متوفرة', 'error');
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
            showNotification('فشل الإرسال', result.error, 'error');
        } else {
            showNotification('تم الإرسال', 'تم إرسال طلب التوثيق بنجاح، انتظر المراجعة', 'success');
            kycStatus = 'pending';
            updateKYCUI();
            navigateTo('page-account');
            updateUserUI();
        }
    } catch (error) {
        console.error('KYC submit error:', error);
        showNotification('خطأ', `فشل إرسال الطلب: ${error.message}`, 'error');
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

// ============================================================
// ============ شاشة الإشعار ============
// ============================================================
function showNotification(title, message, type = 'success') {
    const overlay = document.getElementById('successOverlay');
    if (!overlay) return;

    const titleEl = document.getElementById('successTitle');
    const msgEl = document.getElementById('successMessage');
    const iconContainer = overlay.querySelector('.success-icon');
    const iconEl = overlay.querySelector('.success-icon .material-icons');

    const icons = {
        success: 'check_circle',
        error: 'cancel',
        warning: 'warning',
        info: 'info'
    };

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (iconEl) iconEl.textContent = icons[type] || 'check_circle';

    if (iconContainer) {
        iconContainer.className = 'success-icon ' + type;
    }
    overlay.setAttribute('data-type', type);

    overlay.classList.add('active');

    const duration = (type === 'error') ? 4000 : 2200;

    setTimeout(() => {
        overlay.classList.remove('active');
        overlay.removeAttribute('data-type');
    }, duration);
}

function showSuccessScreen(title, message) {
    showNotification(title, message, 'success');
}

// ============ شراء منتج ============
function openPurchaseModal(productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;

    // ⭐ إضافة إلى "شوهد حديثاً"
    addToRecentlyViewed(productId);

    const unitPrice = product.base_quantity > 0 ? product.base_price / product.base_quantity : product.base_price;
    const maxQty = product.max_quantity || 0;
    const maxQtyLabel = maxQty > 0 ? `<small style="color:var(--text-secondary);font-size:0.75rem;display:block;margin-top:4px;">الحد الأقصى: ${maxQty.toLocaleString('ar')}</small>` : '';

    let customInputHTML = '';
    if (product.input_type === 'id') {
        customInputHTML = `<div class="form-group"><label>معرف اللاعب (ID)</label><input type="text" id="purchasePlayerId" placeholder="أدخل المعرف" class="input-field"></div>`;
    } else if (product.input_type === 'account_id') {
        customInputHTML = `<div class="form-group"><label>ID الحساب</label><input type="text" id="purchaseAccountId" placeholder="أدخل ID الحساب" class="input-field"></div>`;
    } else if (product.input_type === 'phone') {
        customInputHTML = `<div class="form-group"><label>رقم الهاتف</label><input type="tel" id="purchasePhone" placeholder="أدخل رقم الهاتف" class="input-field"></div>`;
    }

    let modalContent = `
        <div class="purchase-modal">
            <div class="purchase-header">
                ${product.image ? `<div class="purchase-image-lg" style="background-image:url('${product.image}');"></div>` : '<div class="purchase-image-lg placeholder">📦</div>'}
                <h3 class="purchase-title">${product.name}</h3>
                <div class="purchase-price-info">
                    <span>${formatPrice(unitPrice)}</span>
                    ${product.unit_name ? `<small> / ${product.unit_name}</small>` : ''}
                </div>
                ${maxQty > 0 ? `<div class="purchase-max-info">📦 الحد الأقصى: ${maxQty.toLocaleString('ar')}</div>` : ''}
            </div>

            <div class="form-group">
                <label>الكمية المطلوبة</label>
                <div class="quantity-selector">
                    <button type="button" class="qty-btn" onclick="adjustQuantity(-1)">−</button>
                    <input type="number" id="purchaseQuantity" value="${product.base_quantity || 1}" min="1" ${maxQty > 0 ? `max="${maxQty}"` : ''} class="qty-input">
                    <button type="button" class="qty-btn" onclick="adjustQuantity(1)">+</button>
                </div>
                ${maxQtyLabel}
            </div>

            ${customInputHTML}

            <div class="purchase-total-box">
                <span>الإجمالي:</span>
                <strong id="purchaseTotal">${formatPrice(unitPrice * (product.base_quantity || 1))}</strong>
            </div>

            <div style="display:flex; gap:8px; margin-top:16px;">
                <button class="btn-primary" style="flex:1;" onclick="confirmPurchaseDialog(${product.id}, this)">شراء الآن</button>
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
        if (totalEl) totalEl.textContent = formatPrice(total);
    };

    document.getElementById('purchaseQuantity')?.addEventListener('input', updateTotal);
    updateTotal();
}

function adjustQuantity(delta) {
    const input = document.getElementById('purchaseQuantity');
    if (!input) return;
    let current = parseInt(input.value) || 1;
    let newVal = current + delta;
    if (newVal < 1) newVal = 1;
    const max = parseInt(input.getAttribute('max')) || 0;
    if (max > 0 && newVal > max) newVal = max;
    input.value = newVal;
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

function confirmPurchaseDialog(productId, btn) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;

    if (product.input_type === 'id') {
        const playerId = document.getElementById('purchasePlayerId')?.value;
        if (!playerId || !playerId.trim()) {
            showNotification('تنبيه', 'يرجى إدخال معرف اللاعب (ID)', 'warning');
            return;
        }
    } else if (product.input_type === 'account_id') {
        const accountId = document.getElementById('purchaseAccountId')?.value;
        if (!accountId || !accountId.trim()) {
            showNotification('تنبيه', 'يرجى إدخال ID الحساب', 'warning');
            return;
        }
    } else if (product.input_type === 'phone') {
        const phone = document.getElementById('purchasePhone')?.value;
        if (!phone || !phone.trim()) {
            showNotification('تنبيه', 'يرجى إدخال رقم الهاتف', 'warning');
            return;
        }
    }

    const qty = parseInt(document.getElementById('purchaseQuantity')?.value) || 1;

    const maxQty = product.max_quantity || 0;
    if (maxQty > 0 && qty > maxQty) {
        showNotification('خطأ', `الحد الأقصى للكمية هو ${maxQty.toLocaleString('ar')}`, 'error');
        return;
    }

    const total = product.base_quantity > 0
        ? (product.base_price / product.base_quantity) * qty
        : product.base_price * qty;

    const confirmed = confirm(`هل أنت متأكد من شراء ${qty.toLocaleString('ar')} من ${product.name}؟\nالإجمالي: ${formatPrice(total)}`);
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
    else if (product.input_type === 'account_id') orderData.account_id = document.getElementById('purchaseAccountId')?.value;
    else if (product.input_type === 'phone') orderData.phone = document.getElementById('purchasePhone')?.value;

    if (btn) setButtonLoading(btn, true);

    try {
        const result = await createOrder(orderData);
        if (result && result.error) {
            showNotification('فشل إرسال الطلب', result.error, 'error');
        } else {
            showNotification('تم الطلب بنجاح', `طلبك ${result.order_number} قيد المعالجة`, 'success');
            closeModal();
            ordersData = await fetchUserOrders(userData.telegram_id);
            renderOrders(ordersData);
            renderLatestOrders();
            userData = await authenticateUser(window.Telegram?.WebApp?.initData || '');
            updateUserUI();
        }
    } catch (error) {
        console.error('Order error:', error);
        showNotification('فشل إرسال الطلب', error.message || 'حدث خطأ غير متوقع', 'error');
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
        ? `<img src="${method.qr_image}" style="width:220px;height:220px;border-radius:16px;object-fit:contain;background:#fff;padding:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);" />`
        : '<div style="color:var(--text-secondary); padding:20px;">لا يوجد رمز QR بعد</div>';

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
        navigator.clipboard.writeText(text).then(() => showNotification('تم النسخ', 'تم نسخ النص بنجاح', 'success')).catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try { document.execCommand('copy'); showNotification('تم النسخ', 'تم نسخ النص بنجاح', 'success'); } catch (e) { showNotification('خطأ', 'تعذر النسخ', 'error'); }
    document.body.removeChild(textarea);
}

async function submitDeposit(btn) {
    if (!selectedMethodForDeposit) return;
    const method = selectedMethodForDeposit;
    const amount = parseFloat(document.getElementById('depositAmount')?.value);
    const senderName = document.getElementById('depositSenderName')?.value;
    const proofFile = document.getElementById('depositProofImage')?.files[0];

    if (!amount || amount <= 0) { showNotification('تنبيه', 'أدخل مبلغ صحيح', 'warning'); return; }
    if (!senderName || !senderName.trim()) { showNotification('تنبيه', 'أدخل اسم المرسل', 'warning'); return; }
    if (!proofFile) { showNotification('تنبيه', 'ارفع صورة الإثبات', 'warning'); return; }

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
            showNotification('فشل الإيداع', result.error, 'error');
        } else {
            showNotification('تم الإرسال', 'تم إرسال طلب الإيداع بنجاح', 'success');
            closeModal();
            selectedMethodForDeposit = null;
            depositsData = await fetchUserDeposits(userData.telegram_id);
            renderDeposits(depositsData);
            updateUserUI();
        }
    } catch (error) {
        console.error('Deposit error:', error);
        showNotification('خطأ', `فشل إرسال الإيداع: ${error.message}`, 'error');
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
    if (!service_name) { showNotification('تنبيه', 'أدخل اسم الخدمة', 'warning'); return; }

    setButtonLoading(btn, true);
    try {
        const result = await requestCustomService({ telegram_id: userData.telegram_id, service_name, description, estimated_price });
        if (result && result.error) {
            showNotification('خطأ', result.error, 'error');
        } else {
            showNotification('تم الإرسال', 'تم إرسال طلب الخدمة بنجاح', 'success');
            closeModal();
        }
    } catch (error) {
        showNotification('خطأ', `فشل إرسال الطلب: ${error.message}`, 'error');
    } finally {
        setButtonLoading(btn, false);
    }
}

// ============ الإحالات ============
function openReferralModal() {
    if (!userData) return;
    const referralCode = userData.referral_code || `SANAD${userData.telegram_id}`;
    const referralLink = `https://t.me/${BOT_USERNAME}?start=${referralCode}`;
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
    if (!userData) { showNotification('تنبيه', 'افتح التطبيق من تيليجرام', 'warning'); return; }
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

    if (pageId === 'page-home') { renderCategories(); renderLatestOrders(); renderRecentlyViewed(); }
    if (pageId === 'page-orders') renderOrders(ordersData);
    if (pageId === 'page-charge') renderPaymentMethods();
    if (pageId === 'page-deposits') renderDeposits(depositsData);
    if (pageId === 'page-account') updateUserUI();
    if (pageId === 'page-kyc') updateKYCUI();
    if (pageId === 'page-favorites') renderFavorites();
    if (pageId === 'page-faq') setupFAQ();

    // تمرير لأعلى
    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.scrollTop = 0;
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
// ============================================================
// 🚀 Init App — التشغيل الرئيسي
// ============================================================
async function loadInitialData() {
    // تحميل كل البيانات بالتوازي
    const results = await Promise.allSettled([
        fetchCategories(),
        fetchProducts(),
        fetchPaymentMethods(),
        userData?.telegram_id ? fetchUserOrders(userData.telegram_id) : Promise.resolve([]),
        userData?.telegram_id ? fetchUserDeposits(userData.telegram_id) : Promise.resolve([]),
        userData?.telegram_id ? fetchNotifications(userData.telegram_id) : Promise.resolve([]),
        userData?.telegram_id ? getMyKYC(userData.telegram_id) : Promise.resolve({ status: 'none' }),
    ]);

    categoriesData = results[0].status === 'fulfilled' ? results[0].value : [];
    productsData = results[1].status === 'fulfilled' ? results[1].value : [];
    paymentMethodsData = results[2].status === 'fulfilled' ? results[2].value : [];
    ordersData = results[3].status === 'fulfilled' ? results[3].value : [];
    depositsData = results[4].status === 'fulfilled' ? results[4].value : [];
    notificationsData = results[5].status === 'fulfilled' ? results[5].value : [];

    const kycResult = results[6].status === 'fulfilled' ? results[6].value : { status: 'none' };
    kycStatus = kycResult?.status || 'none';

    // طباعة للأخطاء
    results.forEach((r, i) => {
        if (r.status === 'rejected') {
            console.warn(`⚠️ فشل تحميل البيانات ${i}:`, r.reason);
        }
    });
}


async function initApp() {
    console.log('🚀 بدء تشغيل SANAD+ ...');

    try {
        // 1. تهيئة Telegram
        const ok = await initTelegram();
        if (!ok) {
            console.error('❌ فشل تهيئة Telegram');
            const gm = document.getElementById('greetingMessage');
            const gs = document.getElementById('greetingSub');
            if (gm) gm.textContent = 'افتح التطبيق من تيليجرام';
            if (gs) gs.textContent = 'لم يتم التعرف على حسابك';
            return;
        }

        // 2. تطبيق ثيم تيليجرام
        applyTelegramTheme();
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
            const toggle = document.getElementById('darkModeToggle');
            if (toggle) toggle.checked = (savedTheme === 'dark');
        }

        // 3. المصادقة مع Backend
        console.log('🔐 جاري المصادقة...');
        const initData = window.Telegram?.WebApp?.initData || '';
        userData = await authenticateUser(initData);
        console.log('✅ تم تسجيل الدخول:', userData.telegram_id);

        // 4. تحميل البيانات
        console.log('📦 تحميل البيانات...');
        await loadInitialData();
        console.log(`✅ تم تحميل: ${categoriesData.length} قسم، ${productsData.length} منتج`);

        // 5. تحديث الواجهة
        updateUserUI();
        updateNotificationBadge();
        renderCategories();
        renderRecentlyViewed();
        renderLatestOrders();

        // 6. تفعيل الأنظمة
        setupNavigation();
        setupFilters();
        setupSearch();

        // 7. تفعيل Pull to Refresh + Swipe
        try {
            PullToRefresh.init();
            SwipeNav.init();
        } catch (e) {
            console.warn('PTR/Swipe غير متاح:', e);
        }

        console.log('✅ التطبيق جاهز');

    } catch (error) {
        console.error('❌ فشل تشغيل التطبيق:', error);

        // رسالة واضحة للمستخدم
        const gm = document.getElementById('greetingMessage');
        const gs = document.getElementById('greetingSub');
        if (gm) gm.textContent = 'خطأ في الاتصال';
        if (gs) gs.textContent = error.message || 'حاول لاحقاً';
    }
}


// ============================================================
// ▶️ نقطة البداية
// ============================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}