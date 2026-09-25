// ============================================================
// SANAD+ MiniApp — app_new.js — v18.2.1
// ============================================================
// الإصلاحات في هذه النسخة:
//   - openPurchaseModal محصَّن بـ try/catch
//   - submitDeposit يستخدم /api/deposits/create (صريح)
//   - و-ت1: requestCustomService → openCustomServiceModal + submitCustomService
//   - و-ت2: البحث من الرئيسية يعمل
//   - و-ت3: لا تغيير (CSS)
//   - و-ت4: تعطيل الزر فور الضغط
//   - السعر لا يظهر خارج مودال الشراء
// ============================================================

// ─── State ───
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
let cancelTimers = {};
let publicSettings = { syp_rate: 132, store_name: 'SANAD+', support_url: 'https://t.me/SANADST' };

const BOT_USERNAME = 'Sa3pls1_bot';
let USD_TO_SYP = 132;
let currentCurrency = localStorage.getItem('currency') || 'USD';

// ════════════════════════════════════════════════════════════
// 🛡️ XSS Protection
// ════════════════════════════════════════════════════════════
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

window.escapeHtml = escapeHtml;
window.escapeAttr = escapeAttr;

// ════════════════════════════════════════════════════════════
// VIP Levels
// ════════════════════════════════════════════════════════════
const VIP_LEVELS = {
    1: { name: 'برونزي',   icon: 'military_tech' },
    2: { name: 'فضي',      icon: 'star' },
    3: { name: 'ذهبي',     icon: 'emoji_events' },
    4: { name: 'بلاتيني',  icon: 'diamond' },
    5: { name: 'ماسي',     icon: 'auto_awesome' },
    6: { name: 'أسطوري',   icon: 'local_fire_department' },
    7: { name: 'الأسطورة', icon: 'workspace_premium' },
};

// ════════════════════════════════════════════════════════════
// Image Compression
// ════════════════════════════════════════════════════════════
function compressImageFile(file, maxWidth = 800, quality = 0.6) {
    return new Promise((resolve, reject) => {
        if (!file) { reject(new Error('لا يوجد ملف')); return; }
        if (!file.type.startsWith('image/')) { reject(new Error('الملف ليس صورة')); return; }
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    if (width > maxWidth) {
                        height = Math.round((maxWidth / width) * height);
                        width = maxWidth;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    const sizeKB = Math.round((dataUrl.length * 3 / 4) / 1024);
                    console.log(`📷 Compressed: ${width}x${height} | ~${sizeKB} KB`);
                    resolve(dataUrl);
                } catch (err) { reject(err); }
            };
            img.onerror = () => reject(new Error('فشل قراءة الصورة'));
            img.src = reader.result;
        };
        reader.onerror = () => reject(new Error('فشل قراءة الملف'));
        reader.readAsDataURL(file);
    });
}

// ════════════════════════════════════════════════════════════
// Splash Seen
// ════════════════════════════════════════════════════════════
const SPLASH_SEEN_KEY = 'splash_seen_v11';
function hasSeenSplash() {
    try { return localStorage.getItem(SPLASH_SEEN_KEY) === '1'; } catch (e) { return false; }
}
function markSplashSeen() {
    try { localStorage.setItem(SPLASH_SEEN_KEY, '1'); } catch (e) {}
}

// ════════════════════════════════════════════════════════════
// Recently Viewed
// ════════════════════════════════════════════════════════════
const RECENTLY_VIEWED_KEY = 'recently_viewed';
const RECENTLY_VIEWED_MAX = 6;

function getRecentlyViewed() {
    try { return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]'); } catch (e) { return []; }
}

function addToRecentlyViewed(productId) {
    try {
        let list = getRecentlyViewed();
        list = list.filter(id => id !== productId);
        list.unshift(productId);
        if (list.length > RECENTLY_VIEWED_MAX) list = list.slice(0, RECENTLY_VIEWED_MAX);
        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(list));
    } catch (e) { console.warn('فشل حفظ شوهد حديثاً:', e); }
}

function renderRecentlyViewed() {
    const container = document.getElementById('recentlyViewedContainer');
    const list = document.getElementById('recentlyViewedList');
    if (!container || !list) return;
    const ids = getRecentlyViewed();
    if (!ids.length) { container.style.display = 'none'; return; }
    const products = ids.map(id => productsData.find(p => p.id === id)).filter(Boolean);
    if (!products.length) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    list.innerHTML = products.map(prod => `
        <div class="recently-viewed-item" onclick="openPurchaseModal(${prod.id})">
            <div class="recently-viewed-image" style="background-image:url('${escapeAttr(prod.image || '')}');">
                ${prod.image ? '' : '📦'}
            </div>
            <div class="recently-viewed-name">${escapeHtml(prod.name)}</div>
        </div>
    `).join('');
}

// ════════════════════════════════════════════════════════════
// Price Formatting
// ════════════════════════════════════════════════════════════
function formatPrice(usdAmount) {
    const n = parseFloat(usdAmount) || 0;
    if (currentCurrency === 'SYP') {
        const syp = Math.round(n * getSypRate());
        return `${syp.toLocaleString('ar')} ل.س`;
    }
    return `${n.toFixed(2)}$`;
}

function getSypRate() {
    return parseFloat(publicSettings?.syp_rate) || 132;
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

// ════════════════════════════════════════════════════════════
// Favorites
// ════════════════════════════════════════════════════════════
function getFavorites() {
    try { return JSON.parse(localStorage.getItem('favorites') || '[]'); } catch (e) { return []; }
}
function saveFavorites(list) { localStorage.setItem('favorites', JSON.stringify(list)); }
function isFavorite(productId) { return getFavorites().includes(productId); }

function toggleFavorite(productId, event) {
    if (event) event.stopPropagation();
    let favorites = getFavorites();
    if (favorites.includes(productId)) favorites = favorites.filter(id => id !== productId);
    else favorites.push(productId);
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

// ════════════════════════════════════════════════════════════
// Pull to Refresh
// ════════════════════════════════════════════════════════════
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
            <div class="ptr-icon"><span class="material-icons">arrow_downward</span></div>
            <div class="ptr-text">اسحب للتحديث</div>
        `;
        return el;
    }

    function init() {
        mainContent = document.querySelector('.main-content');
        if (!mainContent) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
            updateIndicator(Math.min(diff * 0.5, MAX_PULL));
        } else if (diff < 0) {
            isPulling = false;
            resetIndicator();
        }
    }

    function handleTouchEnd() {
        if (!isPulling) return;
        const diff = currentY - startY;
        const pull = Math.min(diff * 0.5, MAX_PULL);
        if (pull >= THRESHOLD && !isRefreshing) triggerRefresh();
        else resetIndicator();
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
            if (diff > 0) updateIndicator(Math.min(diff * 0.5, MAX_PULL));
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (!isPulling) return;
            const diff = currentY - startY;
            const pull = Math.min(diff * 0.5, MAX_PULL);
            if (pull >= THRESHOLD && !isRefreshing) triggerRefresh();
            else resetIndicator();
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
        setTimeout(() => { indicator.style.transition = ''; }, 300);
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
        if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} }
        try {
            if (userData?.telegram_id) {
                userData = await authenticateUser(window.Telegram?.WebApp?.initData || '');
            }
            await loadInitialData();
            updateUserUI();
            renderCategories();
            renderOrders(ordersData);
            renderDeposits(depositsData);
            renderFavorites();
            renderRecentlyViewed();
            renderLatestOrders();
            if (text) text.textContent = 'تم التحديث ✓';
            setTimeout(() => { resetIndicator(); isRefreshing = false; }, 500);
        } catch (error) {
            console.error('Refresh error:', error);
            if (text) text.textContent = 'فشل التحديث';
            setTimeout(() => { resetIndicator(); isRefreshing = false; }, 800);
        }
    }

    return { init };
})();

// ════════════════════════════════════════════════════════════
// Swipe Navigation
// ════════════════════════════════════════════════════════════
const SwipeNav = (() => {
    const PAGES = ['page-home', 'page-orders', 'page-charge', 'page-deposits', 'page-account'];
    const SWIPE_THRESHOLD = 60;
    const MAX_VERTICAL = 80;
    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;
    let target = null;

    function init() {
        target = document.querySelector('.main-content');
        if (!target) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        target.addEventListener('touchstart', handleStart, { passive: true });
        target.addEventListener('touchmove', handleMove, { passive: true });
        target.addEventListener('touchend', handleEnd, { passive: true });
    }

    function handleStart(e) {
        if (e.touches.length !== 1) return;
        const el = e.target;
        if (el.closest('input, textarea, select, button, .modal, .new-purchase-modal, .order-timeline, .bundle-option')) {
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
        if (diffY > MAX_VERTICAL && diffY > diffX) isSwiping = false;
    }

    function handleEnd(e) {
        if (!isSwiping) return;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        isSwiping = false;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        if (Math.abs(diffX) < SWIPE_THRESHOLD) return;
        if (Math.abs(diffY) > Math.abs(diffX)) return;
        if (!PAGES.includes(currentPage)) return;
        const currentIdx = PAGES.indexOf(currentPage);
        let newIdx;
        if (diffX > 0) newIdx = currentIdx + 1;
        else newIdx = currentIdx - 1;
        if (newIdx >= 0 && newIdx < PAGES.length) {
            navigateTo(PAGES[newIdx]);
            if (navigator.vibrate) { try { navigator.vibrate(10); } catch (err) {} }
        }
    }

    return { init };
})();

// ════════════════════════════════════════════════════════════
// Splash Screen
// ════════════════════════════════════════════════════════════
const SplashScreen = (() => {
    const T = {
        shieldIn: 0, lightSweep: 700, disintegrate: 1400,
        textReveal: 5000, revealPlus: 6000, revealEn: 6700,
        confirm: 7300, close: 7500
    };
    const QUICK_T = {
        shieldIn: 0, textReveal: 400, revealPlus: 700,
        revealEn: 950, close: 1400
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
            if (this.phase === 'burst' && elapsed > 300) this.phase = 'scatter';
            if (this.phase === 'burst') {
                this.x += this.vx;
                this.y += this.vy;
                this.vx *= 0.93;
                this.vy *= 0.93;
                this.opacity = 1;
            } else if (this.phase === 'scatter') {
                this.x += this.vx * 0.45;
                this.y += this.vy * 0.45;
                this.vx *= 0.985;
                this.vy *= 0.985;
                this.x += Math.sin(elapsed * this.wobbleSpeed + this.wobblePhase) * this.wobbleAmp;
                this.y += Math.cos(elapsed * this.wobbleSpeed * 0.7 + this.wobblePhase) * this.wobbleAmp;
                const fadeStart = 600;
                const fadeEnd = isQuickMode ? 1000 : 4300;
                const p = Math.min(1, Math.max(0, (elapsed - fadeStart) / (fadeEnd - fadeStart)));
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

    function initCanvas() {
        canvas = document.getElementById('splashCanvas');
        if (!canvas) return false;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        return true;
    }

    function spawnParticles() {
        particles = [];
        const count = isQuickMode ? 60 : PARTICLE_COUNT;
        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
            const r = 70 * (0.35 + Math.random() * 0.65);
            const sx = center.x + Math.cos(a) * r;
            const sy = center.y + Math.sin(a) * r * 0.92;
            particles.push(new Particle(sx, sy));
        }
    }

    function animate() {
        if (!running) return;
        const now = performance.now();
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        for (const p of particles) { p.update(now); p.draw(ctx); }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        rafId = requestAnimationFrame(animate);
    }

    function closeSplash() {
        const splash = document.getElementById('splashScreen');
        if (!splash) return;
        running = false;
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        particles = [];
        splash.classList.add('hidden');
        markSplashSeen();
        setTimeout(() => {
            splash.style.display = 'none';
            if (canvas) { canvas.width = 0; canvas.height = 0; canvas = null; ctx = null; }
        }, 550);
    }

    function initSplashScreen() {
        const splash = document.getElementById('splashScreen');
        if (!splash) return;
        isQuickMode = hasSeenSplash();
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            const shieldStage = document.getElementById('splashShieldStage');
            const textStage = document.getElementById('splashTextStage');
            if (shieldStage) shieldStage.style.display = 'none';
            if (textStage) { textStage.classList.add('visible', 'reveal-plus', 'reveal-en'); }
            setTimeout(closeSplash, 1200);
            return;
        }
        if (!initCanvas()) { closeSplash(); return; }
        const shieldStage = document.getElementById('splashShieldStage');
        const textStage = document.getElementById('splashTextStage');
        if (!shieldStage || !textStage) { closeSplash(); return; }
        const timeline = isQuickMode ? QUICK_T : T;
        setTimeout(() => { shieldStage.classList.add('appearing'); splash.classList.add('shield-visible'); }, timeline.shieldIn);
        if (!isQuickMode) {
            setTimeout(() => shieldStage.classList.add('sweeping'), timeline.lightSweep);
            setTimeout(() => {
                shieldStage.classList.remove('pulsing', 'sweeping');
                shieldStage.classList.add('disintegrating');
                spawnParticles();
                shatterTime = performance.now();
                running = true;
                rafId = requestAnimationFrame(animate);
            }, timeline.disintegrate);
        } else {
            setTimeout(() => shieldStage.classList.add('disintegrating'), 300);
        }
        setTimeout(() => textStage.classList.add('visible'), timeline.textReveal);
        setTimeout(() => textStage.classList.add('reveal-plus'), timeline.revealPlus);
        setTimeout(() => textStage.classList.add('reveal-en'), timeline.revealEn);
        if (!isQuickMode) {
            setTimeout(() => { textStage.classList.add('confirming'); shieldStage.style.display = 'none'; }, timeline.confirm);
        }
        setTimeout(closeSplash, timeline.close);
    }

    return { initSplashScreen, closeSplash };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SplashScreen.initSplashScreen());
} else {
    SplashScreen.initSplashScreen();
}

// ════════════════════════════════════════════════════════════
// Update User UI
// ════════════════════════════════════════════════════════════
function updateUserUI() {
    if (!userData) {
        const gm = document.getElementById('greetingMessage');
        const gs = document.getElementById('greetingSub');
        if (gm) gm.textContent = 'الرجاء فتح التطبيق من تيليجرام';
        if (gs) gs.textContent = 'لم يتم التعرف على حسابك';
        return;
    }
    const balanceEl = document.getElementById('headerBalance');
    if (balanceEl) {
        balanceEl.textContent = formatPrice(userData.balance);
        if (parseFloat(userData.balance) < 0) balanceEl.style.color = 'var(--danger)';
        else balanceEl.style.color = '';
    }
    const chargeEl = document.getElementById('chargeBalance');
    if (chargeEl) chargeEl.textContent = formatPrice(userData.balance);
    const accBalEl = document.getElementById('accountBalance');
    if (accBalEl) accBalEl.textContent = formatPrice(userData.balance);
    const accNameEl = document.getElementById('accountName');
    if (accNameEl) accNameEl.textContent = userData.first_name || userData.username || 'مستخدم';
    const accIdEl = document.getElementById('accountId');
    if (accIdEl) accIdEl.textContent = `ID: ${userData.telegram_id}`;
    const accEmailEl = document.getElementById('accountEmail');
    if (accEmailEl) accEmailEl.textContent = userData.username ? `@${userData.username}` : '';

    renderHomeVIPBadge();
    renderAccountVIPBadge();

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
        if (ha) {
            ha.style.backgroundImage = `url(${escapeAttr(window.currentUser.photo_url)})`;
            ha.textContent = '';
        }
    } else {
        const ha = document.getElementById('headerAvatar');
        if (ha) ha.textContent = (userData.first_name || userData.username || 'م')[0];
    }

    const orderCountEl = document.getElementById('orderCount');
    if (orderCountEl) orderCountEl.textContent = ordersData.length;
    const depositCountEl = document.getElementById('depositCount');
    if (depositCountEl) depositCountEl.textContent = depositsData.length;

    const totalSpentEl = document.getElementById('totalSpent');
    if (totalSpentEl) {
        const totalSpent = ordersData
            .filter(o => o.status !== 'cancelled' && o.status !== 'failed')
            .reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0);
        totalSpentEl.textContent = formatPrice(totalSpent);
    }
    updateKYCBadge();
    updateCurrencyUI();
}

// ════════════════════════════════════════════════════════════
// VIP Badges
// ════════════════════════════════════════════════════════════
function renderHomeVIPBadge() {
    let container = document.getElementById('homeVipBadge');
    if (!container) {
        const gs = document.getElementById('greetingSub');
        if (!gs) return;
        container = document.createElement('div');
        container.id = 'homeVipBadge';
        container.style.marginTop = '10px';
        gs.parentNode.insertBefore(container, gs.nextSibling);
    }
    const vipLevel = parseInt(userData?.vip_level) || 0;
    if (vipLevel === 0 || !VIP_LEVELS[vipLevel]) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }
    const config = VIP_LEVELS[vipLevel];
    container.style.display = 'block';
    container.innerHTML = `
        <span class="vip-badge vip-${vipLevel}">
            <span class="material-icons">${config.icon}</span>
            <span>${escapeHtml(config.name)}</span>
        </span>
    `;
}

function renderAccountVIPBadge() {
    const container = document.getElementById('accountVipBadge');
    if (!container) return;
    const vipLevel = parseInt(userData?.vip_level) || 0;
    if (vipLevel === 0 || !VIP_LEVELS[vipLevel]) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }
    const config = VIP_LEVELS[vipLevel];
    container.style.background = 'none';
    container.style.border = 'none';
    container.style.boxShadow = 'none';
    container.style.padding = '0';
    container.style.marginTop = '8px';
    container.style.display = 'inline-flex';
    container.innerHTML = `
        <span class="vip-badge vip-${vipLevel}">
            <span class="material-icons">${config.icon}</span>
            <span>${escapeHtml(config.name)}</span>
        </span>
    `;
}

// ════════════════════════════════════════════════════════════
// KYC Badge
// ════════════════════════════════════════════════════════════
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
        if (userData.kyc_status === 'verified' || userData.is_verified) descEl.textContent = 'حسابك موثق ✓';
        else if (userData.kyc_status === 'pending' || kycStatus === 'pending') descEl.textContent = 'طلب التوثيق قيد المراجعة';
        else descEl.textContent = 'وثق حسابك لاستخدام كل طرق الدفع';
    }
}

function isUserVerified() {
    if (!userData) return false;
    return userData.kyc_status === 'verified' || userData.is_verified === true;
}

// ════════════════════════════════════════════════════════════
// Product Card (بدون سعر — السعر في المودال فقط)
// ════════════════════════════════════════════════════════════
function renderProductCard(prod) {
    const fav = isFavorite(prod.id);
    const isBundle = prod.product_type === 'bundle' && Array.isArray(prod.bundles) && prod.bundles.length > 0;
    const outOfStock = prod.stock === 0;

    return `
        <div class="product-card" data-id="${prod.id}" onclick="${outOfStock ? '' : `openPurchaseModal(${prod.id})`}">
            ${outOfStock ? '<span class="product-badge-out">غير متوفر</span>' : ''}
            <button class="favorite-btn ${fav ? 'active' : ''}" onclick="toggleFavorite(${prod.id}, event)">
                <span class="material-icons">${fav ? 'favorite' : 'favorite_border'}</span>
            </button>
            <div class="product-image" style="background-image:url('${escapeAttr(prod.image || '')}');${outOfStock ? 'opacity:0.5;' : ''}">
                ${prod.image ? '' : '📦'}
                <div class="product-badges">
                    ${isBundle ? `<span class="badge-bundle">${prod.bundles.length} باقات</span>` : ''}
                </div>
            </div>
            <div class="product-name">${escapeHtml(prod.name)}</div>
        </div>
    `;
}

// ════════════════════════════════════════════════════════════
// Categories
// ════════════════════════════════════════════════════════════
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
                ${cat.image ? `<img src="${escapeAttr(cat.image)}" alt="${escapeAttr(cat.name)}" />` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:2rem;background:var(--primary-light);">📁</div>'}
            </div>
            <div class="category-name">${escapeHtml(cat.name)}</div>
        </div>
    `).join('');
    if (countEl) countEl.textContent = categoriesData.length;
}

function showCategoryProducts(categoryId) {
    const category = categoriesData.find(c => c.id === categoryId);
    if (!category) return;
    const titleEl = document.getElementById('productsPageTitle');
    if (titleEl) titleEl.textContent = category.name;
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

// ════════════════════════════════════════════════════════════
// Payment Methods
// ════════════════════════════════════════════════════════════
function renderPaymentMethods() {
    const container = document.getElementById('paymentMethodsList');
    if (!container) return;
    if (!paymentMethodsData.length) {
        container.innerHTML = '<div class="empty-state"><span class="material-icons">payment</span>لا توجد طرق دفع متاحة</div>';
        return;
    }
    const verified = isUserVerified();
    container.innerHTML = paymentMethodsData.map(m => {
        const locked = m.requires_kyc && !verified;
        const minAmt = parseFloat(m.min_amount || 0);
        const maxAmt = parseFloat(m.max_amount || 500);
        const feeVal = parseFloat(m.fee || 0);
        const feeLabel = feeVal > 0
            ? (m.fee_type === 'fixed' ? `+${feeVal.toFixed(2)}$` : `+${feeVal.toFixed(2)}%`)
            : 'بدون';
        return `
        <div class="payment-method ${locked ? 'locked' : ''}" data-id="${m.id}" onclick="${locked ? `showLockedPaymentMessage()` : `showDepositStep1(${m.id})`}">
            <div class="payment-method-info">
                ${m.icon && m.icon.length > 100 ? `<img src="${escapeAttr(m.icon)}" style="width:48px;height:48px;border-radius:12px;object-fit:cover;${locked ? 'filter:grayscale(0.7);' : ''}" alt="${escapeAttr(m.name)}">` : '<span class="payment-method-icon">💳</span>'}
                <div style="flex:1;min-width:0;">
                    <div class="payment-method-name">${escapeHtml(m.name)}</div>
                    <div class="payment-method-desc">${escapeHtml(m.description || '')}</div>
                    <div class="payment-method-limits">
                        <span class="pm-limit"><span class="material-icons">south</span> ${minAmt.toFixed(2)}$</span>
                        <span class="pm-sep">•</span>
                        <span class="pm-limit"><span class="material-icons">north</span> ${maxAmt.toFixed(2)}$</span>
                        <span class="pm-sep">•</span>
                        <span class="pm-limit fee"><span class="material-icons">percent</span> ${feeLabel}</span>
                    </div>
                    ${locked ? '<div style="font-size:0.7rem;color:var(--warning);font-weight:700;margin-top:4px;">🔒 تتطلب توثيق الحساب</div>' : ''}
                </div>
            </div>
            <span class="material-icons">${locked ? 'lock' : 'chevron_left'}</span>
        </div>
        `;
    }).join('');
}

function showLockedPaymentMessage() {
    showNotification(
        'التوثيق مطلوب',
        'يجب توثيق حسابك أولاً لاستخدام هذه الطريقة. اذهب إلى "حسابي" → "توثيق الحساب"',
        'warning'
    );
}

// ════════════════════════════════════════════════════════════
// Order Timeline Helpers
// ════════════════════════════════════════════════════════════
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
                        <div class="timeline-title">${escapeHtml(step.label)}</div>
                        ${i === 0 ? `<div class="timeline-time">${dateStr}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function buildDeliveryDetailsHTML(order) {
    if (!order.delivery_data) return '';
    let delivery = null;
    try {
        delivery = typeof order.delivery_data === 'string'
            ? JSON.parse(order.delivery_data)
            : order.delivery_data;
    } catch (e) { return ''; }
    if (!delivery || typeof delivery !== 'object') return '';
    const items = [];
    if (delivery.player_id) items.push({ icon: 'person_pin', label: 'ID', value: delivery.player_id });
    if (delivery.account_id) items.push({ icon: 'badge', label: 'ID', value: delivery.account_id });
    if (delivery.phone) items.push({ icon: 'phone', label: 'الهاتف', value: delivery.phone });
    if (delivery.url) items.push({ icon: 'link', label: 'الرابط', value: delivery.url, isUrl: true });
    if (delivery.bundle_name) items.push({ icon: 'inventory_2', label: 'الباقة', value: delivery.bundle_name });
    if (delivery.syp_amount) items.push({ icon: 'payments', label: 'المبلغ (ل.س)', value: Number(delivery.syp_amount).toLocaleString('ar') });
    if (!items.length) return '';
    return items.map(item => {
        if (item.isUrl) {
            const urlStr = String(item.value);
            const escapedUrl = escapeHtml(urlStr);
            const forAttr = escapeAttr(urlStr);
            return `
                <div class="order-detail-line url-line">
                    <span class="material-icons order-detail-icon">${item.icon}</span>
                    <span class="order-detail-label">${escapeHtml(item.label)}:</span>
                    <span class="order-detail-value url-value" data-url="${forAttr}" onclick="copyUrlFromElement(this)" title="اضغط للنسخ" style="cursor:pointer;">
                        ${escapedUrl}
                        <span class="material-icons" style="font-size:14px;vertical-align:middle;margin-inline-start:4px;opacity:.6;">content_copy</span>
                    </span>
                </div>
            `;
        }
        return `
            <div class="order-detail-line">
                <span class="material-icons order-detail-icon">${item.icon}</span>
                <span class="order-detail-label">${escapeHtml(item.label)}:</span>
                <span class="order-detail-value">${escapeHtml(item.value)}</span>
            </div>
        `;
    }).join('');
}
// ════════════════════════════════════════════════════════════
// Orders Rendering
// ════════════════════════════════════════════════════════════
function renderOrders(orders) {
    const list = document.getElementById('ordersList');
    if (!list) return;
    if (!orders || !orders.length) {
        list.innerHTML = '<div class="empty-state"><span class="material-icons">receipt_long</span>لا توجد طلبات</div>';
        return;
    }
    list.innerHTML = orders.map(order => {
        const canCancel = order.status === 'pending' && isWithinCancelWindow(order.created_at);
        const isTopup = order.product_type === 'topup';
        const qty = parseInt(order.quantity) || 0;
        let qtyDisplay;
        if (isTopup) {
            qtyDisplay = `${qty.toLocaleString('ar')} ل.س`;
        } else if (order.product_unit_name && order.product_unit_name !== 'قطعة') {
            qtyDisplay = `${qty.toLocaleString('ar')} ${escapeHtml(order.product_unit_name)}`;
        } else {
            qtyDisplay = `${qty.toLocaleString('ar')} قطعة`;
        }
        return `
        <div class="order-card" data-status="${escapeAttr(order.status)}" data-id="${order.id}">
            <div class="order-header">
                <span class="order-number">${escapeHtml(order.order_number)}</span>
                <span class="status-badge ${escapeAttr(order.status)}">${escapeHtml(getStatusText(order.status))}</span>
            </div>
            <div class="order-details">
                <div>المنتج: ${escapeHtml(order.product_name || order.product_id)}</div>
                <div>الكمية: ${qtyDisplay}</div>
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
                    <button class="btn-outline" style="width:100%;" id="cancel-btn-${order.id}" onclick="cancelOrder(${order.id}, this)">إلغاء الطلب</button>
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
                <span class="order-number">${escapeHtml(order.order_number)}</span>
                <span class="status-badge ${escapeAttr(order.status)}">${escapeHtml(getStatusText(order.status))}</span>
            </div>
            <div class="order-details">
                <div>المنتج: ${escapeHtml(order.product_name || order.product_id)}</div>
                <div>الكمية: ${(parseInt(order.quantity) || 0).toLocaleString('ar')}</div>
                <div>السعر: ${formatPrice(order.total_price)}</div>
            </div>
        </div>
    `).join('');
}

function isWithinCancelWindow(createdAt) {
    if (!createdAt) return false;
    const created = new Date(createdAt).getTime();
    return (Date.now() - created) < 120000;
}

function startCancelCountdown(orderId, createdAt) {
    if (cancelTimers[orderId]) clearInterval(cancelTimers[orderId]);
    const createdTime = new Date(createdAt).getTime();
    cancelTimers[orderId] = setInterval(() => {
        const elapsed = Date.now() - createdTime;
        const remaining = Math.max(0, 120 - Math.floor(elapsed / 1000));
        const timerEl = document.querySelector(`#timer-${orderId} .timer-text`);
        if (timerEl) timerEl.textContent = remaining;
        if (remaining <= 0) {
            clearInterval(cancelTimers[orderId]);
            delete cancelTimers[orderId];
            renderOrders(ordersData);
        }
    }, 1000);
}

async function cancelOrder(orderId, btn) {
    // و-ت4: تعطيل فوري
    if (btn && btn.disabled) return;

    const confirmed = confirm('هل تريد إلغاء الطلب؟ سيتم استرداد المبلغ.');
    if (!confirmed) return;

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'جارٍ الإلغاء...';
    }

    try {
        const result = await apiFetch(`${API_BASE_URL}/api/orders/${orderId}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
        if (result && result.error) {
            showNotification('فشل الإلغاء', result.error, 'error');
            if (btn) { btn.disabled = false; btn.textContent = 'إلغاء الطلب'; }
        } else {
            showNotification('تم إلغاء الطلب', 'تم استرداد المبلغ إلى رصيدك', 'success');
            ordersData = await fetchUserOrders();
            renderOrders(ordersData);
            renderLatestOrders();
            userData = await authenticateUser(window.Telegram?.WebApp?.initData || '');
            updateUserUI();
        }
    } catch (error) {
        showNotification('خطأ', `فشل إلغاء الطلب: ${error.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'إلغاء الطلب'; }
    }
}

function getStatusText(status) {
    switch (status) {
        case 'pending': return 'قيد المعالجة';
        case 'review': return 'قيد المراجعة';
        case 'processing': return 'قيد التنفيذ';
        case 'completed': return 'مكتمل';
        case 'failed': return 'فشل';
        case 'cancelled': return 'ملغي';
        default: return status || 'غير معروف';
    }
}

// ════════════════════════════════════════════════════════════
// Deposits
// ════════════════════════════════════════════════════════════
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
                <span class="ltr">${escapeHtml(d.transaction_id)}</span>
                <span class="status-badge ${escapeAttr(d.status === 'approved' ? 'completed' : d.status)}">${d.status === 'approved' ? 'مكتمل' : d.status === 'rejected' ? 'مرفوض' : 'معلق'}</span>
            </div>
            <div class="order-details">
                <div>المبلغ: ${formatPrice(d.amount)}</div>
                <div>الطريقة: ${escapeHtml(d.method)}</div>
                ${d.admin_note ? `<div>ملاحظة: ${escapeHtml(d.admin_note)}</div>` : ''}
                <div>التاريخ: ${d.created_at ? new Date(d.created_at).toLocaleString('ar') : ''}</div>
            </div>
        </div>
    `).join('');
}

// ════════════════════════════════════════════════════════════
// KYC UI
// ════════════════════════════════════════════════════════════
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
    try {
        const selfieBase64 = await compressImageFile(selfieFile, 700, 0.6);
        const result = await submitKYC({
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

// ════════════════════════════════════════════════════════════
// Button Loading Helper
// ════════════════════════════════════════════════════════════
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

// ════════════════════════════════════════════════════════════
// Notification Overlay
// ════════════════════════════════════════════════════════════
function showNotification(title, message, type = 'success') {
    const overlay = document.getElementById('successOverlay');
    if (!overlay) return;
    const titleEl = document.getElementById('successTitle');
    const msgEl = document.getElementById('successMessage');
    const iconContainer = overlay.querySelector('.success-icon');
    const iconEl = overlay.querySelector('.success-icon .material-icons');
    const icons = { success: 'check_circle', error: 'cancel', warning: 'warning', info: 'info' };

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (iconEl) iconEl.textContent = icons[type] || 'check_circle';
    if (iconContainer) iconContainer.className = 'success-icon ' + type;

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

// ════════════════════════════════════════════════════════════
// 🎯 openPurchaseModal — v18.2.1 (محصَّن بالكامل)
// ════════════════════════════════════════════════════════════
let selectedBundleId = null;

function openPurchaseModal(productId) {
    try {
        // ─── Validation ───
        if (!productsData || !Array.isArray(productsData)) {
            console.error('❌ productsData غير محمّلة');
            showNotification('خطأ', 'البيانات لم تُحمّل بعد، حاول مجدداً', 'error');
            return;
        }

        const product = productsData.find(p => p.id === productId);
        if (!product) {
            console.error('❌ المنتج غير موجود:', productId);
            showNotification('تنبيه', 'المنتج غير متوفر', 'warning');
            return;
        }

        if (product.stock === 0) {
            showNotification('تنبيه', 'المنتج غير متوفر حالياً', 'warning');
            return;
        }

        addToRecentlyViewed(productId);

        const isTopup = product.product_type === 'topup';
        const isBundle = product.product_type === 'bundle' &&
                         Array.isArray(product.bundles) &&
                         product.bundles.length > 0;
        const sypRate = getSypRate();
        const unitName = product.unit_name || 'قطعة';
        const baseQty = parseInt(product.base_quantity) || 1;
        const basePrice = parseFloat(product.base_price) || 0;
        const unitPrice = baseQty > 0 ? basePrice / baseQty : basePrice;

        // ─── Global state ───
        window.__currentPurchaseUnitPrice = unitPrice;
        window.__currentSypRate = sypRate;
        window.__currentIsTopup = isTopup;
        window.__currentIsBundle = isBundle;
        window.__currentProduct = product;
        selectedBundleId = isBundle ? product.bundles[0].id : null;

        // ─── Discount hint (v17.3) ───
        const userGeneralDiscount = parseFloat(userData?.general_discount) || 0;
        const discountHintHTML = userGeneralDiscount > 0 ? `
            <div class="user-discount-hint">
                <span class="material-icons">sell</span>
                <span>سعرك بعد خصم <strong>${userGeneralDiscount}%</strong> (خاص لك)</span>
            </div>
        ` : '';

        // ─── Custom input ───
        let customInputHTML = '';
        if (product.input_type === 'id') {
            customInputHTML = `
                <div class="new-input-group">
                    <span class="material-icons new-input-icon">person_pin</span>
                    <input type="text" id="purchasePlayerId" inputmode="numeric" pattern="[0-9]*"
                           placeholder="ايدي اللاعب (ID)" class="new-input"
                           oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                </div>`;
        } else if (product.input_type === 'account_id') {
            customInputHTML = `
                <div class="new-input-group">
                    <span class="material-icons new-input-icon">badge</span>
                    <input type="text" id="purchaseAccountId" inputmode="numeric" pattern="[0-9]*"
                           placeholder="ايدي الحساب" class="new-input"
                           oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                </div>`;
        } else if (product.input_type === 'phone') {
            customInputHTML = `
                <div class="new-input-group">
                    <span class="material-icons new-input-icon">phone</span>
                    <input type="tel" id="purchasePhone" inputmode="numeric" pattern="[0-9]*"
                           placeholder="رقم الهاتف" class="new-input"
                           oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                </div>`;
        } else if (product.input_type === 'url') {
            customInputHTML = `
                <div class="new-input-group url-input-group">
                    <span class="material-icons new-input-icon">link</span>
                    <input type="url" id="purchaseUrl"
                           placeholder="https://..."
                           class="new-input url-input"
                           inputmode="url"
                           autocomplete="off"
                           spellcheck="false"
                           dir="ltr"
                           style="text-align:left;">
                </div>
                <div class="url-hint">
                    <span class="material-icons" style="font-size:14px;">info</span>
                    أدخل رابطاً كاملاً يبدأ بـ <strong>http://</strong> أو <strong>https://</strong>
                </div>`;
        }

        // ─── Info row ───
        const fav = isFavorite(product.id);
        let infoRowHTML = '';

        if (isBundle) {
            const sortedBundles = [...product.bundles].sort((a, b) => parseFloat(a.price_usd) - parseFloat(b.price_usd));
            const firstBundle = sortedBundles[0];
            infoRowHTML = `
                <div class="bundle-selector">
                    <div class="bundle-selector-label">
                        <span class="material-icons">redeem</span>
                        اختر الباقة
                    </div>
                    <div class="bundle-options-list" id="bundleOptionsList">
                        ${sortedBundles.map((b, i) => `
                            <div class="bundle-option ${i === 0 ? 'selected' : ''}" data-id="${b.id}"
                                 onclick="selectBundle(${b.id})">
                                <div class="bundle-radio">
                                    <div class="bundle-radio-dot"></div>
                                </div>
                                <div class="bundle-info">
                                    <div class="bundle-name">${escapeHtml(b.name)}</div>
                                    ${b.quantity > 0 ? `<div class="bundle-qty">${Number(b.quantity).toLocaleString('ar')} ${escapeHtml(unitName)}</div>` : ''}
                                </div>
                                <div class="bundle-price">${formatPrice(b.price_usd)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="new-info-box primary" style="margin-top:14px;">
                    <div class="new-info-label">الإجمالي</div>
                    <div class="new-info-value" id="newTotalDisplay">${formatPrice(firstBundle.price_usd)}</div>
                </div>
            `;
        } else if (isTopup) {
            const defaultAmount = baseQty;
            const defaultTotal = baseQty / sypRate;
            infoRowHTML = `
                <div class="new-info-row">
                    <div class="new-info-box">
                        <div class="new-info-label">المبلغ (ل.س)</div>
                        <input type="text" id="newSypAmount" inputmode="numeric" pattern="[0-9]*"
                               value="${defaultAmount}" class="new-qty-input"
                               oninput="updateTopupTotal()">
                    </div>
                    <div class="new-info-box primary">
                        <div class="new-info-label">الإجمالي ($)</div>
                        <div class="new-info-value" id="newTotalDisplay">$${defaultTotal.toFixed(2)}</div>
                    </div>
                </div>
                <div class="topup-rate-info">
                    <span class="material-icons">info</span>
                    سعر الصرف: <strong>${sypRate.toLocaleString('ar')} ل.س</strong> = <strong>1.00$</strong>
                </div>
            `;
        } else {
            infoRowHTML = `
                <div class="new-info-row">
                    <div class="new-info-box">
                        <div class="new-info-label">الكمية (${escapeHtml(unitName)})</div>
                        <input type="text" id="newQtyInput" inputmode="numeric" pattern="[0-9]*"
                               value="${baseQty}" class="new-qty-input"
                               oninput="updatePurchaseTotal()">
                    </div>
                    <div class="new-info-box primary">
                        <div class="new-info-label">الاجمالي</div>
                        <div class="new-info-value" id="newTotalDisplay">${formatPrice(basePrice)}</div>
                    </div>
                </div>
            `;
        }

        // ─── Modal HTML ───
        const modalContent = `
            <div class="new-purchase-modal">
                <div class="new-purchase-header">
                    <button class="new-fav-btn ${fav ? 'active' : ''}"
                            onclick="toggleFavorite(${product.id}, event); this.classList.toggle('active');">
                        <span class="material-icons">${fav ? 'favorite' : 'favorite_border'}</span>
                    </button>
                    <div class="new-purchase-title-wrap">
                        ${product.image
                            ? `<img src="${escapeAttr(product.image)}" class="new-purchase-logo" alt="${escapeAttr(product.name)}">`
                            : `<div class="new-purchase-logo placeholder">📦</div>`}
                        <h3 class="new-purchase-title">${escapeHtml(product.name)}</h3>
                    </div>
                </div>
                ${infoRowHTML}
                ${discountHintHTML}
                ${customInputHTML}
                <div class="new-purchase-actions">
                    <button class="new-btn-cancel" onclick="closeModal()">إلغاء</button>
                    <button class="new-btn-buy" onclick="confirmPurchaseDialog(${product.id}, this)">شراء</button>
                </div>
            </div>
        `;

        openModal('', modalContent);
    } catch (err) {
        console.error('❌ openPurchaseModal error:', err);
        showNotification('خطأ', 'فشل فتح نافذة الشراء', 'error');
    }
}

// ════════════════════════════════════════════════════════════
// Bundle Selection
// ════════════════════════════════════════════════════════════
function selectBundle(bundleId) {
    const product = window.__currentProduct;
    if (!product || !product.bundles) return;
    const bundle = product.bundles.find(b => b.id === bundleId);
    if (!bundle) return;
    selectedBundleId = bundleId;
    document.querySelectorAll('.bundle-option').forEach(el => {
        el.classList.toggle('selected', parseInt(el.getAttribute('data-id')) === bundleId);
    });
    const display = document.getElementById('newTotalDisplay');
    if (display) display.textContent = formatPrice(bundle.price_usd);
}

// ════════════════════════════════════════════════════════════
// Total Updates
// ════════════════════════════════════════════════════════════
function updatePurchaseTotal() {
    const input = document.getElementById('newQtyInput');
    if (!input) return;
    const cleaned = input.value.replace(/[^0-9]/g, '');
    if (cleaned !== input.value) input.value = cleaned;
    const qty = parseInt(input.value) || 0;
    const unitPrice = window.__currentPurchaseUnitPrice || 0;
    const total = qty * unitPrice;
    const display = document.getElementById('newTotalDisplay');
    if (display) display.textContent = formatPrice(total);
}

function updateTopupTotal() {
    const input = document.getElementById('newSypAmount');
    if (!input) return;
    const cleaned = input.value.replace(/[^0-9]/g, '');
    if (cleaned !== input.value) input.value = cleaned;
    const sypAmount = parseInt(input.value) || 0;
    const sypRate = window.__currentSypRate || 132;
    const totalUsd = sypAmount / sypRate;
    const display = document.getElementById('newTotalDisplay');
    if (display) display.textContent = `$${totalUsd.toFixed(2)}`;
}

// ════════════════════════════════════════════════════════════
// Purchase Confirmation
// ════════════════════════════════════════════════════════════
function confirmPurchaseDialog(productId, btn) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;
    const isTopup = product.product_type === 'topup';
    const isBundle = product.product_type === 'bundle';

    if (isBundle) {
        if (!selectedBundleId) { showNotification('تنبيه', 'يرجى اختيار باقة', 'warning'); return; }
        if (!validateCustomInput(product)) return;
        executeConfirmPurchase(productId, btn);
        return;
    }

    if (isTopup) {
        const amountInput = document.getElementById('newSypAmount');
        const sypAmount = parseInt(amountInput?.value);
        if (!sypAmount || sypAmount < 1) {
            showNotification('تنبيه', 'يرجى إدخال مبلغ صحيح بالليرة السورية', 'warning');
            return;
        }
        const maxQty = parseInt(product.max_quantity) || 0;
        if (maxQty > 0 && sypAmount > maxQty) {
            showNotification('تنبيه', `الحد الأقصى هو ${maxQty.toLocaleString('ar')} ل.س`, 'warning');
            return;
        }
        if (!validateCustomInput(product)) return;
        executeConfirmPurchase(productId, btn);
        return;
    }

    const qtyInput = document.getElementById('newQtyInput');
    const qty = parseInt(qtyInput?.value);
    if (!qty || qty < 1) {
        showNotification('تنبيه', 'يرجى إدخال كمية صحيحة (1 على الأقل)', 'warning');
        return;
    }
    const maxQty = parseInt(product.max_quantity) || 0;
    if (maxQty > 0 && qty > maxQty) {
        showNotification('تنبيه', `الحد الأقصى للكمية هو ${maxQty.toLocaleString('ar')}`, 'warning');
        return;
    }
    if (!validateCustomInput(product)) return;
    executeConfirmPurchase(productId, btn);
}

function validateCustomInput(product) {
    const inputType = product.input_type;
    if (inputType === 'id') {
        const val = document.getElementById('purchasePlayerId')?.value;
        if (!val || !val.trim() || !/^[0-9]+$/.test(val)) {
            showNotification('تنبيه', 'يرجى إدخال أرقام فقط في حقل الايدي', 'warning');
            return false;
        }
    } else if (inputType === 'account_id') {
        const val = document.getElementById('purchaseAccountId')?.value;
        if (!val || !val.trim() || !/^[0-9]+$/.test(val)) {
            showNotification('تنبيه', 'يرجى إدخال أرقام فقط في حقل الايدي', 'warning');
            return false;
        }
    } else if (inputType === 'phone') {
        const val = document.getElementById('purchasePhone')?.value;
        if (!val || !val.trim() || !/^[0-9]+$/.test(val)) {
            showNotification('تنبيه', 'يرجى إدخال أرقام فقط في رقم الهاتف', 'warning');
            return false;
        }
    } else if (inputType === 'url') {
        const val = document.getElementById('purchaseUrl')?.value?.trim();
        if (!val) {
            showNotification('تنبيه', 'يرجى إدخال الرابط', 'warning');
            return false;
        }
        if (!/^https?:\/\//i.test(val)) {
            showNotification('تنبيه', 'الرابط يجب أن يبدأ بـ http:// أو https://', 'warning');
            return false;
        }
        if (val.length > 1000) {
            showNotification('تنبيه', 'الرابط طويل جداً', 'warning');
            return false;
        }
    }
    return true;
}

async function executeConfirmPurchase(productId, btn) {
    const product = productsData.find(p => p.id === productId);
    if (!product || !userData) return;

    const isTopup = product.product_type === 'topup';
    const isBundle = product.product_type === 'bundle';

    const idempotencyKey = `ord-${userData.telegram_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const orderData = { product_id: productId, idempotency_key: idempotencyKey };

    if (isBundle) orderData.bundle_id = selectedBundleId;
    else if (isTopup) orderData.quantity = parseInt(document.getElementById('newSypAmount')?.value);
    else orderData.quantity = parseInt(document.getElementById('newQtyInput')?.value);

    if (product.input_type === 'id') orderData.player_id = document.getElementById('purchasePlayerId')?.value;
    else if (product.input_type === 'account_id') orderData.account_id = document.getElementById('purchaseAccountId')?.value;
    else if (product.input_type === 'phone') orderData.phone = document.getElementById('purchasePhone')?.value;
    else if (product.input_type === 'url') orderData.url = document.getElementById('purchaseUrl')?.value?.trim();

    // و-ت4: تعطيل فوري
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'جارٍ التنفيذ...';
    }

    try {
        const result = await createOrder(orderData);
        if (result && result.error) {
            if (result.code === 'NEGATIVE_LIMIT_EXCEEDED') {
                showNotification('الرصيد السالب ممتلئ', `${result.error}\n\n💡 قم بالإيداع لسداد دينك.`, 'warning');
            } else if (result.code === 'INSUFFICIENT_BALANCE' || result.code === 'NEGATIVE_NOT_ALLOWED') {
                showNotification('رصيد غير كافٍ', `${result.error}\n\n💡 قم بالإيداع أولاً.`, 'warning');
            } else if (result.code === 'STOCK_INSUFFICIENT') {
                showNotification('الكمية غير متوفرة', result.error, 'warning');
            } else {
                showNotification('فشل إرسال الطلب', result.error, 'error');
            }
            if (btn) { btn.disabled = false; btn.textContent = 'شراء'; }
        } else {
            let msg = `طلبك ${result.order_number} قيد المعالجة`;
            if (isTopup && result.syp_amount) {
                msg = `${result.syp_amount.toLocaleString('ar')} ل.س — طلبك ${result.order_number} قيد المعالجة`;
            } else if (isBundle) {
                const b = product.bundles.find(x => x.id === selectedBundleId);
                if (b) msg = `${b.name} — طلبك ${result.order_number} قيد المعالجة`;
            }
            showNotification('تم الطلب بنجاح', msg, 'success');
            closeModal();
            ordersData = await fetchUserOrders();
            renderOrders(ordersData);
            renderLatestOrders();
            userData = await authenticateUser(window.Telegram?.WebApp?.initData || '');
            updateUserUI();
        }
    } catch (error) {
        console.error('Order error:', error);
        showNotification('فشل إرسال الطلب', error.message || 'حدث خطأ غير متوقع', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'شراء'; }
    }
}

// ════════════════════════════════════════════════════════════
// Deposit Flow
// ════════════════════════════════════════════════════════════
function showDepositStep1(methodId) {
    const method = paymentMethodsData.find(m => m.id === methodId);
    if (!method) return;

    if (!isUserVerified()) {
        showNotification('التوثيق مطلوب', 'يجب توثيق حسابك أولاً قبل الإيداع. اذهب إلى "حسابي" → "توثيق الحساب"', 'warning');
        return;
    }

    selectedMethodForDeposit = method;

    const qrCode = method.qr_image && method.qr_image.length > 100
        ? `<img src="${escapeAttr(method.qr_image)}" style="width:220px;height:220px;border-radius:16px;object-fit:contain;background:#fff;padding:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);" />`
        : '<div style="color:var(--text-secondary); padding:20px;">لا يوجد رمز QR بعد</div>';

    const logo = method.icon && method.icon.length > 100
        ? `<img src="${escapeAttr(method.icon)}" style="width:48px;height:48px;border-radius:12px;object-fit:cover;" />`
        : '💳';

    const minAmt = parseFloat(method.min_amount || 0);
    const maxAmt = parseFloat(method.max_amount || 500);
    const feeVal = parseFloat(method.fee || 0);
    const feeLabel = feeVal > 0
        ? (method.fee_type === 'fixed' ? `${feeVal.toFixed(2)}$` : `${feeVal.toFixed(2)}%`)
        : 'بدون';

    const body = `
        <div style="text-align:center;">
            <div style="display:flex; align-items:center; justify-content:center; gap:12px; margin-bottom:16px;">${logo}<h3 style="margin:0;">${escapeHtml(method.name)}</h3></div>
            <p style="color:var(--text-secondary); margin-bottom:16px;">${escapeHtml(method.description || '')}</p>

            <div class="deposit-info-card" style="margin-bottom:16px;">
                <div class="deposit-info-row">
                    <span class="deposit-info-label"><span class="material-icons">south</span> الحد الأدنى</span>
                    <span class="deposit-info-value">${minAmt.toFixed(2)}$</span>
                </div>
                <div class="deposit-info-row">
                    <span class="deposit-info-label"><span class="material-icons">north</span> الحد الأقصى</span>
                    <span class="deposit-info-value">${maxAmt.toFixed(2)}$</span>
                </div>
                <div class="deposit-info-row">
                    <span class="deposit-info-label"><span class="material-icons">percent</span> الرسوم</span>
                    <span class="deposit-info-value">${feeLabel}</span>
                </div>
            </div>

            <div style="background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:16px; margin-bottom:16px; text-align:right;">
                <div style="margin-bottom:12px;">
                    <div style="font-weight:bold; margin-bottom:4px;">اسم الحساب</div>
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                        <span id="copyAccountName">${escapeHtml(method.account_name || '-')}</span>
                        <button class="icon-btn" onclick="copyText('copyAccountName', 'اسم الحساب')"><span class="material-icons">content_copy</span></button>
                    </div>
                </div>
                <div>
                    <div style="font-weight:bold; margin-bottom:4px;">رقم الحساب</div>
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                        <span id="copyAccountNumber">${escapeHtml(method.account || '-')}</span>
                        <button class="icon-btn" onclick="copyText('copyAccountNumber', 'رقم الحساب')"><span class="material-icons">content_copy</span></button>
                    </div>
                </div>
            </div>
            <div style="margin-bottom:16px;">
                <div style="font-weight:bold; margin-bottom:8px;">رمز QR للتحويل</div>
                ${qrCode}
            </div>
            <button class="btn-primary" onclick="showDepositStep2()">التالي</button>
        </div>
    `;
    openModal('طريقة الدفع', body);
}

function updateDepositFeePreview() {
    const amountInput = document.getElementById('depositAmount');
    const preview = document.getElementById('depositFeePreview');
    if (!amountInput || !preview || !selectedMethodForDeposit) return;

    const amount = parseFloat(amountInput.value) || 0;
    const feeVal = parseFloat(selectedMethodForDeposit.fee || 0);
    const feeType = selectedMethodForDeposit.fee_type || 'percentage';

    let feeAmount = 0;
    if (feeVal > 0 && amount > 0) {
        if (feeType === 'percentage') {
            feeAmount = amount * feeVal / 100;
        } else {
            feeAmount = Math.min(feeVal, amount);
        }
    }
    const netAmount = amount - feeAmount;

    if (amount > 0) {
        preview.style.display = 'block';
        document.getElementById('previewAmount').textContent = amount.toFixed(2) + '$';
        document.getElementById('previewFee').textContent = '-' + feeAmount.toFixed(2) + '$';
        document.getElementById('previewNet').textContent = netAmount.toFixed(2) + '$';
    } else {
        preview.style.display = 'none';
    }
}
window.updateDepositFeePreview = updateDepositFeePreview;

function showDepositStep2() {
    if (!selectedMethodForDeposit) return;
    const method = selectedMethodForDeposit;

    if (!isUserVerified()) {
        showNotification('التوثيق مطلوب', 'يجب توثيق حسابك أولاً', 'warning');
        return;
    }

    const minAmt = parseFloat(method.min_amount || 0);
    const maxAmt = parseFloat(method.max_amount || 500);
    const feeVal = parseFloat(method.fee || 0);
    const feeType = method.fee_type || 'percentage';

    const body = `
        <div style="text-align:right;">
            <h3>إتمام الإيداع</h3>

            <div class="deposit-info-card" style="margin-bottom:14px;">
                <div class="deposit-info-row">
                    <span class="deposit-info-label"><span class="material-icons">south</span> الحد الأدنى</span>
                    <span class="deposit-info-value">${minAmt.toFixed(2)}$</span>
                </div>
                <div class="deposit-info-row">
                    <span class="deposit-info-label"><span class="material-icons">north</span> الحد الأقصى</span>
                    <span class="deposit-info-value">${maxAmt.toFixed(2)}$</span>
                </div>
                ${feeVal > 0 ? `
                <div class="deposit-info-row">
                    <span class="deposit-info-label"><span class="material-icons">percent</span> الرسوم</span>
                    <span class="deposit-info-value" style="color:var(--warning);">${feeType === 'fixed' ? feeVal.toFixed(2) + '$' : feeVal.toFixed(2) + '%'}</span>
                </div>
                ` : ''}
            </div>

            <div class="form-group">
                <label>المبلغ بالدولار</label>
                <input type="number" id="depositAmount" min="${minAmt}" max="${maxAmt}" step="0.01" class="input-field"
                       oninput="updateDepositFeePreview()" placeholder="${minAmt.toFixed(2)} - ${maxAmt.toFixed(2)}">
            </div>

            <div class="deposit-fee-preview" id="depositFeePreview" style="display:none;">
                <div class="deposit-fee-row">
                    <span>المبلغ المُرسل:</span>
                    <strong id="previewAmount">0.00$</strong>
                </div>
                <div class="deposit-fee-row fee">
                    <span>الرسوم:</span>
                    <strong id="previewFee">-0.00$</strong>
                </div>
                <div class="deposit-fee-row total">
                    <span>الصافي إلى رصيدك:</span>
                    <strong id="previewNet">0.00$</strong>
                </div>
            </div>
            <div class="form-group">
                <label>اسم المرسل</label>
                <input type="text" id="depositSenderName" placeholder="أدخل اسم المرسل" class="input-field">
            </div>
            <div class="form-group">
                <label>إثبات التحويل (صورة)</label>
                <div class="image-preview" id="depositProofPreview">📷</div>
                <input type="file" id="depositProofImage" accept="image/*" onchange="previewImage(this, 'depositProofPreview')" class="input-field">
                <small style="color:var(--text-secondary); font-size:0.75rem; display:block; margin-top:6px;">
                    💡 الحد الأقصى: 2 MB — الصورة ستُضغط تلقائياً
                </small>
            </div>
            <button class="btn-primary" onclick="submitDeposit(this)">إرسال</button>
        </div>
    `;
    openModal('إتمام الإيداع', body);
}

// ════════════════════════════════════════════════════════════
// Copy Helpers
// ════════════════════════════════════════════════════════════
function copyText(elementId, label = 'النص') {
    const text = document.getElementById(elementId)?.innerText || '';
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => showNotification('تم النسخ', `تم نسخ ${label}`, 'success'))
            .catch(() => fallbackCopy(text, label));
    } else {
        fallbackCopy(text, label);
    }
}

function copyUrlFromElement(el) {
    const url = el.getAttribute('data-url') || '';
    if (!url) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url)
            .then(() => showNotification('تم النسخ', 'تم نسخ الرابط', 'success'))
            .catch(() => fallbackCopy(url, 'الرابط'));
    } else {
        fallbackCopy(url, 'الرابط');
    }
}
window.copyUrlFromElement = copyUrlFromElement;

function fallbackCopy(text, label) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showNotification('تم النسخ', `تم نسخ ${label}`, 'success');
    } catch (e) {
        showNotification('خطأ', 'تعذر النسخ', 'error');
    }
    document.body.removeChild(textarea);
}

// ════════════════════════════════════════════════════════════
// 💰 submitDeposit — v18.2.1 (يستخدم /api/deposits/create صريح)
// ════════════════════════════════════════════════════════════
async function submitDeposit(btn) {
    if (!selectedMethodForDeposit) return;

    if (!isUserVerified()) {
        showNotification('التوثيق مطلوب', 'يجب توثيق حسابك أولاً قبل الإيداع', 'warning');
        return;
    }

    const method = selectedMethodForDeposit;
    const amount = parseFloat(document.getElementById('depositAmount')?.value);
    const senderName = document.getElementById('depositSenderName')?.value?.trim();
    const proofFile = document.getElementById('depositProofImage')?.files[0];

    if (!amount || amount <= 0) { showNotification('تنبيه', 'أدخل مبلغ صحيح', 'warning'); return; }

    // 🆕 v18.3.6: min/max validation client-side
    const minAmt = parseFloat(method.min_amount || 0);
    const maxAmt = parseFloat(method.max_amount || 500);
    if (amount < minAmt) {
        showNotification('تنبيه', `الحد الأدنى للإيداع هو ${minAmt.toFixed(2)}$`, 'warning');
        return;
    }
    if (amount > maxAmt) {
        showNotification('تنبيه', `الحد الأقصى للإيداع هو ${maxAmt.toFixed(2)}$`, 'warning');
        return;
    }

    if (!senderName) { showNotification('تنبيه', 'أدخل اسم المرسل', 'warning'); return; }
    if (!proofFile) { showNotification('تنبيه', 'ارفع صورة الإثبات', 'warning'); return; }

    if (proofFile.size > 20 * 1024 * 1024) {
        showNotification('تنبيه', 'الصورة كبيرة جداً (الحد 20 MB قبل الضغط)', 'warning');
        return;
    }

    // و-ت4: تعطيل فوري
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'جارٍ الإرسال...';
    }

    try {
        const proofBase64 = await compressImageFile(proofFile, 800, 0.6);
        console.log(`📤 Sending deposit: ~${Math.round(proofBase64.length / 1024)} KB`);

        const idempotencyKey = `dep-${userData.telegram_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const result = await createDeposit({
            amount: amount,
            method_id: method.id,
            proof_image: proofBase64,
            sender_name: senderName,
            idempotency_key: idempotencyKey,
        });

        if (result && result.error) {
            if (result.code === 'KYC_REQUIRED') {
                showNotification('التوثيق مطلوب', 'يجب توثيق حسابك أولاً', 'warning');
            } else if (result.code === 'IMAGE_INVALID') {
                showNotification('الصورة غير صحيحة', result.error, 'error');
            } else if (result.code === 'DAILY_CAP_REACHED') {
                showNotification('بلغت السقف اليومي', result.error, 'warning');
            } else if (result.code === 'TOO_MANY_PENDING') {
                showNotification('لديك إيداعات معلّقة', result.error, 'warning');
            } else {
                showNotification('فشل الإيداع', result.error, 'error');
            }
            if (btn) { btn.disabled = false; btn.textContent = 'إرسال'; }
        } else {
            const feeMsg = result.fee && result.fee > 0
                ? ` — الرسوم: ${parseFloat(result.fee).toFixed(2)}$`
                : '';
            showNotification('تم الإرسال', `تم إرسال طلب الإيداع بنجاح${feeMsg}`, 'success');
            closeModal();
            selectedMethodForDeposit = null;
            depositsData = await fetchUserDeposits();
            renderDeposits(depositsData);
            updateUserUI();
        }
    } catch (error) {
        console.error('Deposit error:', error);
        showNotification('خطأ', `فشل إرسال الإيداع: ${error.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'إرسال'; }
    }
}

// ════════════════════════════════════════════════════════════
// Custom Service (و-ت1: أسماء صحيحة)
// ════════════════════════════════════════════════════════════
function openCustomServiceModal() {
    openModal('طلب خدمة مخصصة', `
        <div class="form-group"><label>اسم الخدمة</label><input type="text" id="serviceName" placeholder="مثال: تصميم شعار"></div>
        <div class="form-group"><label>وصف الخدمة</label><textarea id="serviceDesc" rows="3" placeholder="اكتب تفاصيل الخدمة"></textarea></div>
        <div class="form-group"><label>السعر المتوقع (اختياري)</label><input type="number" id="servicePrice" placeholder="0.00"></div>
        <button class="btn-primary" onclick="submitCustomService(this)">إرسال الطلب</button>
        <button class="btn-outline" onclick="closeModal()">إلغاء</button>
    `);
}

async function submitCustomService(btn) {
    const service_name = document.getElementById('serviceName')?.value?.trim();
    const description = document.getElementById('serviceDesc')?.value || '';
    const estimated_price = parseFloat(document.getElementById('servicePrice')?.value) || 0;

    if (!service_name) { showNotification('تنبيه', 'أدخل اسم الخدمة', 'warning'); return; }

    if (btn) { btn.disabled = true; btn.textContent = 'جارٍ الإرسال...'; }

    try {
        const result = await requestCustomService({ service_name, description, estimated_price });
        if (result && result.error) {
            showNotification('خطأ', result.error, 'error');
            if (btn) { btn.disabled = false; btn.textContent = 'إرسال الطلب'; }
        } else {
            showNotification('تم الإرسال', 'تم إرسال طلب الخدمة بنجاح', 'success');
            closeModal();
        }
    } catch (error) {
        showNotification('خطأ', `فشل إرسال الطلب: ${error.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'إرسال الطلب'; }
    }
}
// ════════════════════════════════════════════════════════════
// Referral Modal
// ════════════════════════════════════════════════════════════
function openReferralModal() {
    if (!userData) return;
    const referralCode = userData.referral_code || `SANAD${userData.telegram_id}`;
    const referralLink = `https://t.me/${BOT_USERNAME}?start=${referralCode}`;

    const hasOrders = ordersData && ordersData.length > 0;
    const alreadyReferred = userData.referred_by || userData.referred_by_id;

    const applySectionHTML = (!hasOrders && !alreadyReferred) ? `
        <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:14px; margin-top:16px;">
            <div style="font-weight:700; margin-bottom:8px; color:var(--primary); display:flex; align-items:center; gap:6px; justify-content:center;">
                <span class="material-icons" style="font-size:18px;">redeem</span>
                لديك كود من صديق؟
            </div>
            <div style="display:flex; gap:8px;">
                <input type="text" id="applyReferralInput"
                       placeholder="ABCD1234"
                       maxlength="20"
                       style="flex:1; padding:10px 12px; border:1px solid var(--border); border-radius:8px; font-family:inherit; text-transform:uppercase; text-align:center; letter-spacing:2px; font-weight:700; font-size:0.95rem; background:var(--background); color:var(--text);"
                       oninput="this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '')">
                <button class="btn-primary" onclick="submitReferralCode(this)" style="padding:10px 16px; white-space:nowrap;">
                    تطبيق
                </button>
            </div>
            <small style="color:var(--text-secondary); font-size:0.7rem; display:block; margin-top:8px; line-height:1.5; text-align:center;">
                💡 يمكن تطبيقه فقط <strong>قبل أول عملية شراء</strong>
            </small>
        </div>
    ` : (alreadyReferred ? `
        <div style="background:var(--success-bg); border:1px solid var(--success); border-radius:12px; padding:12px; margin-top:16px; font-size:0.85rem; text-align:center; color:var(--success); font-weight:700;">
            ✅ تم تطبيق كود إحالة مسبقاً
        </div>
    ` : '');

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
                <div style="font-size:1.2rem; font-weight:800; color:var(--primary); letter-spacing:1px;" id="referralCode">${escapeHtml(referralCode)}</div>
            </div>
            <button class="btn-primary" onclick="copyText('referralCode', 'كود الإحالة')">
                <span class="material-icons">content_copy</span> نسخ الكود
            </button>
            <button class="btn-outline" style="margin-top:8px;width:100%;" data-referral-link="${escapeAttr(referralLink)}" onclick="shareReferral(this.getAttribute('data-referral-link'))">
                <span class="material-icons">share</span> مشاركة الرابط
            </button>
            ${applySectionHTML}
        </div>
    `);
}

async function submitReferralCode(btn) {
    const input = document.getElementById('applyReferralInput');
    const code = (input?.value || '').trim().toUpperCase();

    if (!code || code.length < 4) {
        showNotification('تنبيه', 'أدخل كوداً صحيحاً (4 أحرف على الأقل)', 'warning');
        return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'جارٍ التطبيق...'; }

    try {
        const result = await applyReferralCode(code);

        if (result && result.error) {
            showNotification('فشل التطبيق', result.error, 'error');
            if (btn) { btn.disabled = false; btn.textContent = 'تطبيق'; }
        } else {
            showNotification('تم بنجاح 🎉', result.message || 'تم تطبيق كود الإحالة، ستحصل مكافأة صديقك عند أول شراء', 'success');
            userData = await authenticateUser(window.Telegram?.WebApp?.initData || '');
            updateUserUI();
            closeModal();
        }
    } catch (error) {
        console.error('Referral apply error:', error);
        showNotification('خطأ', `فشل التطبيق: ${error.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'تطبيق'; }
    }
}

function shareReferral(link) {
    const text = 'انضم إلى سند بلس واحصل على خدمات رقمية بسهولة!';
    if (navigator.share) {
        navigator.share({ title: 'SANAD+', text, url: link });
    } else {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, '_blank');
    }
}

// ════════════════════════════════════════════════════════════
// FAQ
// ════════════════════════════════════════════════════════════
const faqData = [
    { q: 'كيف أشحن رصيدي؟', a: 'يجب توثيق حسابك أولاً (KYC)، ثم اذهب إلى قسم "شحن" واختر طريقة الدفع.' },
    { q: 'كم يستغرق تنفيذ الطلب؟', a: 'عادة ما يتم تنفيذ الطلب خلال 5-15 دقيقة، لكن قد يتأخر في بعض الحالات.' },
    { q: 'ما هو KYC ولماذا أحتاجه؟', a: 'KYC هو توثيق الهوية، يمنحك وصولاً لجميع طرق الدفع والإيداع.' },
    { q: 'كيف ألغي طلباً؟', a: 'يمكنك إلغاء الطلب خلال 120 ثانية من إنشائه، عبر زر "إلغاء الطلب" في قسم طلباتي.' },
    { q: 'ماذا يحدث إذا فشل الطلب؟', a: 'في حال فشل الطلب، يتم استرداد المبلغ تلقائياً إلى رصيدك.' },
    { q: 'ما هو الرصيد السوري؟', a: 'رصيد للاتصالات (MTN، Syriatel) يُشترى بالليرة السورية. أدخل المبلغ بالليرة وسيتم تحويله تلقائياً للدولار.' },
    { q: 'ما هي الباقات؟', a: 'بعض المنتجات مثل PUBG UC توفر باقات متعددة (60 UC، 325 UC، 660 UC...). اختر الباقة المناسبة داخل المنتج.' },
    { q: 'كيف أشتري متابعين؟', a: 'عند شراء خدمات سوشيال ميديا (متابعين/لايكات)، سيُطلب منك إدخال رابط الحساب أو المنشور.' },
    { q: 'كيف أتواصل مع الدعم؟', a: 'استخدم زر الدعم العائم أسفل الشاشة للتواصل معنا مباشرة.' }
];

function setupFAQ() {
    const list = document.getElementById('faqList');
    if (!list) return;
    list.innerHTML = faqData.map((item, i) => `
        <div class="faq-item" onclick="toggleFAQ(${i})">
            <div class="faq-question">
                <span>${escapeHtml(item.q)}</span>
                <span class="material-icons">expand_more</span>
            </div>
            <div class="faq-answer">${escapeHtml(item.a)}</div>
        </div>
    `).join('');
}

function toggleFAQ(index) {
    const items = document.querySelectorAll('.faq-item');
    if (items[index]) items[index].classList.toggle('open');
}

// ════════════════════════════════════════════════════════════
// Support & Notifications
// ════════════════════════════════════════════════════════════
function openSupport() {
    window.open(publicSettings?.support_url || 'https://t.me/SANADST', '_blank');
}

async function openNotificationsPage() {
    if (!userData) {
        showNotification('تنبيه', 'افتح التطبيق من تيليجرام', 'warning');
        return;
    }
    notificationsData = await fetchNotifications();

    const bodyHTML = `
        <div style="text-align:center;">
            <h3>الإشعارات</h3>
            ${notificationsData.length ? notificationsData.map(n => `
                <div style="text-align:right;background:var(--surface);border-radius:12px;padding:12px;margin-bottom:8px;border:1px solid var(--border);${!n.is_read ? 'border-right:3px solid var(--primary);' : ''}">
                    <div style="font-weight:bold;">${escapeHtml(n.title)}</div>
                    <div style="color:var(--text-secondary);font-size:0.8rem;">${escapeHtml(n.message)}</div>
                    <div style="color:var(--text-secondary);font-size:0.7rem;">${n.created_at ? new Date(n.created_at).toLocaleString('ar') : ''}</div>
                </div>
            `).join('') : '<p>لا توجد إشعارات</p>'}
        </div>`;
    openModal('الإشعارات', bodyHTML);

    const unreadIds = notificationsData.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length) {
        for (const id of unreadIds) {
            try { await markNotificationRead(id); } catch (e) {}
        }
        notificationsData = notificationsData.map(n => ({ ...n, is_read: true }));
        updateNotificationBadge();
    }
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;

    if (!notificationsData || !notificationsData.length) {
        badge.style.display = 'none';
        return;
    }

    const unread = notificationsData.filter(n => !n.is_read).length;
    if (unread > 0) {
        badge.style.display = 'inline';
        badge.textContent = unread > 99 ? '99+' : unread;
    } else {
        badge.style.display = 'none';
    }
}

// ════════════════════════════════════════════════════════════
// Navigation Setup
// ════════════════════════════════════════════════════════════
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const pageId = item.getAttribute('data-page');
            navigateTo(pageId);
        });
    });
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

// ════════════════════════════════════════════════════════════
// Search — و-ت2: يعمل من الرئيسية
// ════════════════════════════════════════════════════════════
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();

        // إذا كنا في صفحة المنتجات
        if (currentPage === 'page-products') {
            const filtered = productsData.filter(p => (p.name || '').toLowerCase().includes(query));
            renderProductsList(filtered);
        }
    });

    // و-ت2: عند Enter — ابحث من الرئيسية
    searchInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const query = searchInput.value.toLowerCase().trim();
        if (!query) return;

        const results = productsData.filter(p => (p.name || '').toLowerCase().includes(query));
        showSearchResults(query, results);
    });
}

function showSearchResults(query, results) {
    const titleEl = document.getElementById('productsPageTitle');
    if (titleEl) titleEl.textContent = `نتائج البحث: "${query}"`;

    if (!results.length) {
        const list = document.getElementById('productsList');
        if (list) {
            list.innerHTML = `<div class="empty-state"><span class="material-icons">search_off</span>لا توجد نتائج لـ "${escapeHtml(query)}"</div>`;
        }
    } else {
        renderProductsList(results);
    }
    navigateTo('page-products');
}

// ════════════════════════════════════════════════════════════
// Navigate To
// ════════════════════════════════════════════════════════════
function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item =>
        item.classList.toggle('active', item.getAttribute('data-page') === pageId)
    );

    currentPage = pageId;

    if (pageId === 'page-home') {
        renderCategories();
        renderLatestOrders();
        renderRecentlyViewed();
        renderHomeVIPBadge();
    }
    if (pageId === 'page-orders') renderOrders(ordersData);
    if (pageId === 'page-charge') renderPaymentMethods();
    if (pageId === 'page-deposits') renderDeposits(depositsData);
    if (pageId === 'page-account') updateUserUI();
    if (pageId === 'page-kyc') updateKYCUI();
    if (pageId === 'page-favorites') renderFavorites();
    if (pageId === 'page-faq') setupFAQ();

    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.scrollTop = 0;
}

// ════════════════════════════════════════════════════════════
// Image Preview
// ════════════════════════════════════════════════════════════
function previewImage(input, previewId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            const el = document.getElementById(previewId);
            if (el) el.innerHTML = `<img src="${escapeAttr(e.target.result)}" style="width:100%;height:100%;object-fit:cover;">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// ════════════════════════════════════════════════════════════
// Modal
// ════════════════════════════════════════════════════════════
function openModal(title, bodyHTML) {
    const modalBody = document.getElementById('modalBody');
    if (!modalBody) return;
    modalBody.innerHTML = bodyHTML;
    const modal = document.getElementById('modal');
    if (modal) modal.style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) modal.style.display = 'none';
    selectedBundleId = null;
}

// ════════════════════════════════════════════════════════════
// Back & Close
// ════════════════════════════════════════════════════════════
function handleBack() {
    if (currentPage !== 'page-home') navigateTo('page-home');
    else window.history.back();
}

function handleClose() {
    if (window.Telegram?.WebApp?.close) window.Telegram.WebApp.close();
    else window.close();
}

// ════════════════════════════════════════════════════════════
// Theme
// ════════════════════════════════════════════════════════════
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function goToAccount() { navigateTo('page-account'); }
function showNotifications() { openNotificationsPage(); }

// ════════════════════════════════════════════════════════════
// Load Initial Data
// ════════════════════════════════════════════════════════════
async function loadInitialData() {
    const results = await Promise.allSettled([
        fetchPublicSettings(),
        fetchCategories(),
        fetchProducts(),
        fetchPaymentMethods(),
        userData?.telegram_id ? fetchUserOrders() : Promise.resolve([]),
        userData?.telegram_id ? fetchUserDeposits() : Promise.resolve([]),
        userData?.telegram_id ? fetchNotifications() : Promise.resolve([]),
        userData?.telegram_id ? getMyKYC() : Promise.resolve({ status: 'none' }),
    ]);

    if (results[0].status === 'fulfilled' && results[0].value) {
        publicSettings = { ...publicSettings, ...results[0].value };
        USD_TO_SYP = parseFloat(publicSettings.syp_rate) || 132;
    }
    categoriesData = results[1].status === 'fulfilled' ? results[1].value : [];
    productsData = results[2].status === 'fulfilled' ? results[2].value : [];
    paymentMethodsData = results[3].status === 'fulfilled' ? results[3].value : [];
    ordersData = results[4].status === 'fulfilled' ? results[4].value : [];
    depositsData = results[5].status === 'fulfilled' ? results[5].value : [];
    notificationsData = results[6].status === 'fulfilled' ? results[6].value : [];
    const kycResult = results[7].status === 'fulfilled' ? results[7].value : { status: 'none' };
    kycStatus = kycResult?.status || 'none';

    results.forEach((r, i) => {
        if (r.status === 'rejected') console.warn(`⚠️ فشل تحميل البيانات ${i}:`, r.reason);
    });
}

// ════════════════════════════════════════════════════════════
// Init App
// ════════════════════════════════════════════════════════════
async function initApp() {
    console.log('🚀 بدء تشغيل SANAD+ v18.2.1 ...');
    try {
        const ok = await initTelegram();
        if (!ok) {
            console.error('❌ فشل تهيئة Telegram');
            const gm = document.getElementById('greetingMessage');
            const gs = document.getElementById('greetingSub');
            if (gm) gm.textContent = 'افتح التطبيق من تيليجرام';
            if (gs) gs.textContent = 'لم يتم التعرف على حسابك';
            return;
        }

        applyTelegramTheme();

        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
            const toggle = document.getElementById('darkModeToggle');
            if (toggle) toggle.checked = (savedTheme === 'dark');
        }

        console.log('🔐 جاري المصادقة...');
        const initData = window.Telegram?.WebApp?.initData || '';
        userData = await authenticateUser(initData);
        console.log('✅ تم تسجيل الدخول:', userData.telegram_id);

        console.log('📦 تحميل البيانات...');
        await loadInitialData();
        console.log(`✅ تم تحميل: ${categoriesData.length} قسم، ${productsData.length} منتج`);

        updateUserUI();
        updateNotificationBadge();
        renderCategories();
        renderRecentlyViewed();
        renderLatestOrders();
        renderHomeVIPBadge();
        renderAccountVIPBadge();

        setupNavigation();
        setupFilters();
        setupSearch();

        try {
            PullToRefresh.init();
            SwipeNav.init();
        } catch (e) {
            console.warn('PTR/Swipe غير متاح:', e);
        }

        console.log('✅ التطبيق جاهز (v18.2.1)');
    } catch (error) {
        console.error('❌ فشل تشغيل التطبيق:', error);
        const gm = document.getElementById('greetingMessage');
        const gs = document.getElementById('greetingSub');
        if (gm) gm.textContent = 'خطأ في الاتصال';
        if (gs) gs.textContent = error.message || 'حاول لاحقاً';
    }
}

// ════════════════════════════════════════════════════════════
// Window Exports
// ════════════════════════════════════════════════════════════
window.openPurchaseModal = openPurchaseModal;
window.selectBundle = selectBundle;
window.updatePurchaseTotal = updatePurchaseTotal;
window.updateTopupTotal = updateTopupTotal;
window.confirmPurchaseDialog = confirmPurchaseDialog;
window.executeConfirmPurchase = executeConfirmPurchase;
window.cancelOrder = cancelOrder;
window.showDepositStep1 = showDepositStep1;
window.showDepositStep2 = showDepositStep2;
window.submitDeposit = submitDeposit;
window.openCustomServiceModal = openCustomServiceModal;
window.submitCustomService = submitCustomService;
window.openReferralModal = openReferralModal;
window.submitReferralCode = submitReferralCode;
window.shareReferral = shareReferral;
window.toggleFAQ = toggleFAQ;
window.openSupport = openSupport;
window.openNotificationsPage = openNotificationsPage;
window.navigateTo = navigateTo;
window.previewImage = previewImage;
window.openModal = openModal;
window.closeModal = closeModal;
window.handleBack = handleBack;
window.handleClose = handleClose;
window.toggleTheme = toggleTheme;
window.goToAccount = goToAccount;
window.showNotifications = showNotifications;
window.copyText = copyText;
window.toggleFavorite = toggleFavorite;
window.filterUsers = null; // (Admin فقط)

// ════════════════════════════════════════════════════════════
// Boot
// ════════════════════════════════════════════════════════════
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}