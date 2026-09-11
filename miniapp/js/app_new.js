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
    renderLatestOrders();
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

// ============================================================
// =========== Splash Screen — 8s / 11 مرحلة ===========
// ============================================================
const SplashScreen = (() => {
    // Timeline (ms) — مأخوذة من المرجع
    const T = {
        shieldIn: 0,            // 0.0s ظهور الدرع
        lightSweep: 700,        // 0.7s شعاع الضوء
        disintegrate: 1400,     // 1.4s التفكك → جسيمات
        curveMotion: 2300,      // 2.3s الحركة المنحنية (دوران)
        converge: 3000,         // 3.0s بدء التجمع
        formText: 3800,         // 3.8s تشكيل النص
        revealPlus: 4600,       // 4.6s ظهور ⁺
        revealEn: 5300,         // 5.3s SANAD PLUS⁺
        stabilize: 6000,        // 6.0s تثبيت
        confirm: 6800,          // 6.8s توهج التأكيد
        close: 7500             // 7.5s تلاشي
    };

    // عدد الجسيمات — يجب أن يكون كافياً لتشكيل الحروف العربية
    const PARTICLE_COUNT = 280;
    const COLORS = ['#38BDF8', '#0EA5E9', '#7DD3FC', '#0D47A1'];

    let canvas, ctx;
    let particles = [];
    let center = { x: 0, y: 0 };
    let textPoints = [];
    let rafId = null;
    let curveStartTime = 0;
    let convergeStartTime = 0;
    let running = false;

    // ===================== Easing =====================
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    function easeOutBack(t) {
        const c1 = 1.70158, c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    function easeInOutQuart(t) {
        return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    }

    // ===================== Text Sampling =====================
    // عينة كثيفة جداً من حروف "سند بلس" لتشكيل واضح
    function sampleTextPositions(text, fontSize, count) {
        const off = document.createElement('canvas');
        const w = window.innerWidth;
        const h = window.innerHeight;
        off.width = w;
        off.height = h;
        const octx = off.getContext('2d');

        octx.fillStyle = '#000';
        octx.font = `800 ${fontSize}px Cairo, Tajawal, sans-serif`;
        octx.textAlign = 'center';
        octx.textBaseline = 'middle';
        octx.fillText(text, w / 2, h / 2);

        const data = octx.getImageData(0, 0, w, h).data;
        const points = [];
        const step = Math.max(2, Math.floor(fontSize / 16));

        for (let y = 0; y < h; y += step) {
            for (let x = 0; x < w; x += step) {
                const idx = (y * w + x) * 4;
                if (data[idx + 3] > 128) {
                    points.push({ x, y });
                }
            }
        }

        // Fisher-Yates shuffle
        for (let i = points.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [points[i], points[j]] = [points[j], points[i]];
        }

        // Return `count` points; if fewer, cycle with jitter
        const result = [];
        for (let i = 0; i < count; i++) {
            const p = points[i % points.length] || { x: w / 2, y: h / 2 };
            result.push({
                x: p.x + (Math.random() - 0.5) * 1.5,
                y: p.y + (Math.random() - 0.5) * 1.5
            });
        }
        return result;
    }

    // ===================== Particle =====================
    class Particle {
        constructor(startX, startY, targetX, targetY, index) {
            this.startX = startX;
            this.startY = startY;
            this.x = startX;
            this.y = startY;
            this.targetX = targetX;
            this.targetY = targetY;

            // Burst velocity
            const angle = Math.random() * Math.PI * 2;
            const speed = 2.5 + Math.random() * 4.0;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;

            // Curved / orbit motion — كل جسيم له قوس خاص
            this.orbitAngle0 = Math.atan2(startY - center.y, startX - center.x);
            this.orbitRadius = 60 + Math.random() * 120;
            this.orbitSpeed = 0.18 + Math.random() * 0.16;
            this.orbitDirection = Math.random() < 0.5 ? 1 : -1;
            this.wobble = 0.6 + Math.random() * 1.4;
            this.wobblePhase = Math.random() * Math.PI * 2;

            // Appearance
            this.size = 2.5 + Math.random() * 5.5;
            this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
            this.opacity = 1;
            this.rotation = Math.random() * Math.PI * 2;

            // State
            this.phase = 'idle';    // idle → burst → curve → converge → rest
            this.curveProgress = 0;
            this.convergeProgress = 0;
            this.spiralAngle = Math.random() * Math.PI * 2;
        }

        update(now) {
            const tCurve = curveStartTime ? (now - curveStartTime) : 0;
            const tConv = convergeStartTime ? (now - convergeStartTime) : 0;

            // --- Transitions ---
            if (this.phase === 'idle') {
                this.phase = 'burst';
            }
            if (this.phase === 'burst' && tCurve > 0) {
                this.phase = 'curve';
                this.curveProgress = 0;
            }
            if (this.phase === 'curve' && tConv > 0) {
                this.phase = 'converge';
                this.convergeProgress = 0;
                this.convergeFromX = this.x;
                this.convergeFromY = this.y;
            }

            // --- Burst: انفجار أولي ---
            if (this.phase === 'burst') {
                this.x += this.vx;
                this.y += this.vy;
                this.vx *= 0.93;
                this.vy *= 0.93;
                this.opacity = Math.min(1, this.opacity + 0.08);
            }

            // --- Curve: مسارات منحنية / دوران ---
            else if (this.phase === 'curve') {
                const duration = (T.converge - T.curveMotion);
                this.curveProgress = Math.min(1, tCurve / duration);
                const t = easeInOutCubic(this.curveProgress);

                // زاوية الدوران
                const angle = this.orbitAngle0 + this.orbitDirection * this.curveProgress * Math.PI * 2.2 * this.orbitSpeed * 4;
                // نصف القطر يتغير بنبض
                const radius = this.orbitRadius * (0.7 + 0.3 * Math.cos(this.curveProgress * Math.PI * 2 + this.wobblePhase));

                // موقع أفقي مضطرب قليلاً
                const wave = Math.sin(this.curveProgress * Math.PI * 3 + this.wobblePhase) * this.wobble * 12;

                this.x = center.x + Math.cos(angle) * (radius + wave);
                this.y = center.y + Math.sin(angle) * (radius + wave) * 0.92;

                this.rotation += 0.15;
                this.opacity = 0.9;
            }

            // --- Converge: تجميع نحو هدف داخل الحرف ---
            else if (this.phase === 'converge') {
                const duration = (T.revealPlus - T.converge + 200);
                this.convergeProgress = Math.min(1, tConv / duration);
                const t = easeOutCubic(this.convergeProgress);

                // حلزوني بسيط للوصول
                const spiralFactor = 1 - t;
                this.spiralAngle += 0.08;
                const spiralR = spiralFactor * 14 * this.orbitDirection;
                const spiralX = Math.cos(this.spiralAngle) * spiralR;
                const spiralY = Math.sin(this.spiralAngle) * spiralR;

                this.x = this.convergeFromX + (this.targetX - this.convergeFromX) * t + spiralX * spiralFactor;
                this.y = this.convergeFromY + (this.targetY - this.convergeFromY) * t + spiralY * spiralFactor;

                this.opacity = 0.75 + t * 0.25;

                if (this.convergeProgress >= 1) {
                    this.phase = 'rest';
                    this.x = this.targetX;
                    this.y = this.targetY;
                    this.opacity = 0.95;
                }
            }
        }

        draw(ctx) {
            const restScale = this.phase === 'rest' ? 0.85 : 1;
            const s = this.size * restScale;

            ctx.globalAlpha = this.opacity;

            if (this.phase === 'rest') {
                // نقاط حروف أنيقة (بدون توهج قوي)
                ctx.shadowBlur = 2;
                ctx.shadowColor = this.color;
            } else {
                // توهج خفيف أثناء الحركة
                ctx.shadowBlur = 6;
                ctx.shadowColor = this.color;
            }

            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, s / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ===================== Init =====================
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

        // حجم الخط للنص العربي (بدون ⁺)
        const fontSize = Math.min(58, Math.max(36, window.innerWidth * 0.145));
        textPoints = sampleTextPositions('سند بلس', fontSize, PARTICLE_COUNT);

        return true;
    }

    // ===================== Generate Particles =====================
    function generateSplashParticles() {
        particles = [];
        const shieldRadius = 75;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            // توزيع الجسيمات حول حدود الدرع بشكل طبيعي
            const a = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.6;
            const r = shieldRadius * (0.4 + Math.random() * 0.7);
            const sx = center.x + Math.cos(a) * r;
            const sy = center.y + Math.sin(a) * r * 0.92;

            const target = textPoints[i] || { x: center.x, y: center.y };

            particles.push(new Particle(sx, sy, target.x, target.y, i));
        }
    }

    // ===================== RAF Loop =====================
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

    // ===================== Helpers =====================
    function schedule(ms, fn) { return setTimeout(fn, ms); }

    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // ===================== Close =====================
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

    // ===================== Main =====================
    function initSplashScreen() {
        const splash = document.getElementById('splashScreen');
        if (!splash) return;

        // --- Reduced motion ---
        if (prefersReducedMotion()) {
            const shieldStage = document.getElementById('splashShieldStage');
            const textStage = document.getElementById('splashTextStage');
            if (shieldStage) shieldStage.style.display = 'none';
            if (textStage) {
                textStage.classList.add('visible');
                textStage.classList.add('reveal-plus');
                textStage.classList.add('reveal-en');
            }
            schedule(1500, closeSplash);
            return;
        }

        if (!init()) { closeSplash(); return; }

        const shieldStage = document.getElementById('splashShieldStage');
        const textStage = document.getElementById('splashTextStage');

        if (!shieldStage || !textStage) { closeSplash(); return; }

        // ============================================================
        // T = 0.0s : ظهور الدرع
        // ============================================================
        schedule(T.shieldIn, () => {
            shieldStage.classList.add('appearing');
            splash.classList.add('shield-visible');
        });

        // ============================================================
        // T = 0.7s : شعاع الضوء
        // ============================================================
        schedule(T.lightSweep, () => {
            shieldStage.classList.add('sweeping');
        });

        // ============================================================
        // T = 1.4s : التفكك → توليد الجسيمات
        // ============================================================
        schedule(T.disintegrate, () => {
            shieldStage.classList.remove('pulsing', 'sweeping');
            shieldStage.classList.add('disintegrating');
            generateSplashParticles();
        });

        // ============================================================
        // T = 2.3s : الحركة المنحنية / الدوران
        // ============================================================
        schedule(T.curveMotion, () => {
            curveStartTime = performance.now();
            running = true;
            rafId = requestAnimationFrame(animate);
        });

        // ============================================================
        // T = 3.0s : بدء التجمع
        // ============================================================
        schedule(T.converge, () => {
            convergeStartTime = performance.now();
        });

        // ============================================================
        // T = 3.8s : تشكيل النص (الجسيمات هي النص)
        // ============================================================
        schedule(T.formText, () => {
            // لا نفعل شيئاً — الجسيمات هي التي تشكل النص
            // حاوية النص تبقى مخفية حتى اكتمال التشكيل
        });

        // ============================================================
        // T = 4.6s : كشف النص العربي (بعد أن تشكلت الحروف بالجسيمات)
        // ============================================================
        schedule(T.revealPlus, () => {
            textStage.classList.add('visible');
            // ننتظر قليلاً ثم نضيف التوهج للعلامة ⁺
            setTimeout(() => {
                textStage.classList.add('reveal-plus');
            }, 80);
        });

        // ============================================================
        // T = 5.3s : SANAD PLUS⁺
        // ============================================================
        schedule(T.revealEn, () => {
            textStage.classList.add('reveal-en');
        });

        // ============================================================
        // T = 6.0s : تثبيت
        // ============================================================
        schedule(T.stabilize, () => {
            shieldStage.style.display = 'none';
        });

        // ============================================================
        // T = 6.8s : توهج تأكيد ناعم
        // ============================================================
        schedule(T.confirm, () => {
            textStage.classList.add('confirming');
        });

        // ============================================================
        // T = 7.5s : إغلاق
        // ============================================================
        schedule(T.close, closeSplash);
    }

    return { initSplashScreen, generateSplashParticles, closeSplash };
})();

// تشغيل Splash فوراً
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SplashScreen.initSplashScreen());
} else {
    SplashScreen.initSplashScreen();
}

// ============ تهيئة التطبيق ============
document.addEventListener('DOMContentLoaded', async () => {
    initTelegram();
    applyTelegramTheme();

    let telegram_id = window.currentUser?.id || window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    if (telegram_id) {
        userData = await authenticateUser(window.Telegram?.WebApp?.initData || '');
    } else {
        showSuccessScreen('خطأ', 'لا يمكن الوصول لبيانات تيليجرام. افتح التطبيق من البوت.');
        userData = null;
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

    startNotificationPolling();
});

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
        renderLatestOrders();
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

// ============ البطاقات ============
function renderProductCard(prod) {
    const fav = isFavorite(prod.id);
    const isNew = prod.created_at && (Date.now() - new Date(prod.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000;
    return `
        <div class="product-card" data-id="${prod.id}" onclick="openPurchaseModal(${prod.id})">
            <button class="favorite-btn ${fav ? 'active' : ''}" onclick="toggleFavorite(${prod.id}, event)">
                <span class="material-icons">${fav ? 'favorite' : 'favorite_border'}</span>
            </button>
            <div class="product-image" style="background-image:url('${prod.image || ''}'); background-color:#f0f0f0;">
                ${prod.image ? '' : '📦'}
                <div class="product-badges">
                    ${isNew ? '<span class="badge-new">جديد</span>' : ''}
                </div>
            </div>
            <div class="product-name">${prod.name}</div>
            <div class="product-price">${formatPrice(prod.base_price)}</div>
            <span class="product-type-badge">${prod.product_type === 'bundle' ? 'باقة' : prod.product_type === 'topup' ? 'رصيد' : 'كمية'}</span>
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
        <div class="order-card" data-status="${order.status}" data-id="${order.id}">
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
                <div>الكمية: ${order.quantity}</div>
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
            showSuccessScreen('خطأ', result.error);
        } else {
            showSuccessScreen('تم إلغاء الطلب', 'تم استرداد المبلغ إلى رصيدك');
            ordersData = await fetchUserOrders(userData.telegram_id);
            renderOrders(ordersData);
            renderLatestOrders();
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
            renderLatestOrders();
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
    const referralCode = userData.referral_code || `SANAD${userData.telegram_id}`;
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

    if (pageId === 'page-home') { renderCategories(); renderLatestOrders(); }
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