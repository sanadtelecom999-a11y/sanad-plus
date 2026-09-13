// admin/js/admin.js

let currentSection = 'dashboard';
let usersData = [];
let categoriesData = [];
let productsData = [];
let filteredProducts = [];
let paymentMethodsData = [];
let ordersData = [];
let depositsData = [];
let kycData = [];
let serviceRequestsData = [];
let activitiesData = [];
let couponsData = [];
let referralsData = [];
let archiveData = { categories: [], products: [] };
let auditLogData = [];
let filteredOrders = [];
let filteredAuditLog = [];
let currentArchiveTab = 'cats';
let currentSettings = {};
let _otpSessionId = null;

// VIP Config — 🆕
const VIP_LEVELS = {
    1: { name: 'مستخدم جديد لسند بلس', icon: 'person', color: '#CD7F32' },
    2: { name: 'مبتدئ سند بلس', icon: 'school', color: '#C0C0C0' },
    3: { name: 'محترف سند بلس', icon: 'workspace_premium', color: '#FFD700' },
    4: { name: 'أسطورة سند بلس', icon: 'military_tech', color: '#E5E4E2' },
    5: { name: 'نجم سند بلس', icon: 'star', color: '#B9F2FF' },
    6: { name: 'شريك سند بلس', icon: 'handshake', color: '#9333EA' },
    7: { name: 'مستوى السند الأسطوري', icon: 'auto_awesome', color: '#DC2626' },
};

// Chart instances
let chartOrdersPieInstance = null;
let chartDepositsLineInstance = null;

// ============================================================
// 🌙 Theme Management
// ============================================================
const THEME_KEY = 'admin_theme';

function loadAdminTheme() {
    try {
        const savedTheme = localStorage.getItem(THEME_KEY);
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            updateThemeIcon('dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            updateThemeIcon('light');
        }
    } catch (e) {
        console.warn('تعذر تحميل الثيم:', e);
    }
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (!icon) return;
    icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
}

function toggleAdminTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    if (newTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem(THEME_KEY, 'dark');
        updateThemeIcon('dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem(THEME_KEY, 'light');
        updateThemeIcon('light');
    }
    if (chartOrdersPieInstance) renderOrdersChart();
    if (chartDepositsLineInstance) renderDepositsChart();
}

loadAdminTheme();

// ============================================================
// 📱 Admin Pull to Refresh
// ============================================================
const AdminPTR = (() => {
    const THRESHOLD = 70;
    const MAX_PULL = 110;
    let startY = 0;
    let currentY = 0;
    let isPulling = false;
    let isRefreshing = false;
    let target = null;
    let indicator = null;
    let iconEl = null;
    let textEl = null;

    function init() {
        target = document.getElementById('adminContent');
        indicator = document.getElementById('adminPTr');
        if (!target || !indicator) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        iconEl = document.getElementById('adminPTrIcon');
        textEl = document.getElementById('adminPTrText');

        target.addEventListener('touchstart', handleTouchStart, { passive: true });
        target.addEventListener('touchmove', handleTouchMove, { passive: false });
        target.addEventListener('touchend', handleTouchEnd, { passive: true });
        target.addEventListener('mousedown', handleMouseDown);
    }

    function handleTouchStart(e) {
        if (isRefreshing) return;
        if (window.scrollY > 0 || target.scrollTop > 0) return;
        startY = e.touches[0].clientY;
        isPulling = true;
    }

    function handleTouchMove(e) {
        if (!isPulling || isRefreshing) return;
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        if (diff > 0 && window.scrollY === 0) {
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
        if (window.scrollY > 0) return;
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
        if (pull >= THRESHOLD) {
            if (iconEl) iconEl.textContent = 'refresh';
            if (textEl) textEl.textContent = 'اترك للتحديث';
            indicator.classList.add('ready');
        } else {
            if (iconEl) iconEl.textContent = 'arrow_downward';
            if (textEl) textEl.textContent = 'اسحب للتحديث';
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
        if (iconEl) iconEl.textContent = 'sync';
        if (textEl) textEl.textContent = 'جارٍ التحديث...';

        if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} }

        try {
            await loadAllData();
            renderCurrentSection();
            if (textEl) textEl.textContent = 'تم التحديث ✓';
            setTimeout(() => { resetIndicator(); isRefreshing = false; }, 500);
        } catch (error) {
            console.error('Refresh error:', error);
            if (textEl) textEl.textContent = 'فشل التحديث';
            setTimeout(() => { resetIndicator(); isRefreshing = false; }, 800);
        }
    }

    function renderCurrentSection() {
        if (currentSection === 'dashboard') renderDashboard();
        if (currentSection === 'users') renderUsers();
        if (currentSection === 'categories') renderCategories();
        if (currentSection === 'products') renderProducts();
        if (currentSection === 'payment-methods') renderPaymentMethods();
        if (currentSection === 'orders') { filteredOrders = [...ordersData]; renderOrders(ordersData); }
        if (currentSection === 'deposits') renderDeposits(depositsData);
        if (currentSection === 'kyc') renderKYC();
        if (currentSection === 'service-requests') renderServiceRequests();
        if (currentSection === 'coupons') renderCoupons();
        if (currentSection === 'archive') renderArchive();
        if (currentSection === 'audit-log') renderAuditLog();
        if (currentSection === 'settings') loadSettings();
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
    loadAdminTheme();
    AdminPTR.init();

    if (!getToken()) {
        showLogin();
    } else {
        initAdminPanel();
    }

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            openGlobalSearch();
        }
        if (e.key === 'Escape') {
            const gsModal = document.getElementById('globalSearchModal');
            if (gsModal && gsModal.classList.contains('active')) {
                closeGlobalSearch();
            }
        }
    });
});

// ============================================================
// ============ Toast System ============
// ============================================================
function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const icons = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
        info: 'info'
    };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="material-icons">${icons[type] || 'info'}</span>
        <span>${message}</span>
    `;
    toast.onclick = () => removeToast(toast);
    container.appendChild(toast);
    setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 200);
}

// ============================================================
// ============ Confirm System ============
// ============================================================
let _confirmResolver = null;

function showConfirm(options) {
    return new Promise((resolve) => {
        _confirmResolver = resolve;
        const modal = document.getElementById('confirmModal');
        if (!modal) {
            resolve(window.confirm(options.message || 'تأكيد؟'));
            return;
        }
        const title = document.getElementById('confirmTitle');
        const msg = document.getElementById('confirmMessage');
        const icon = document.getElementById('confirmIcon');
        const btn = document.getElementById('confirmBtn');

        title.textContent = options.title || 'تأكيد العملية';
        msg.textContent = options.message || 'هل أنت متأكد؟';
        btn.textContent = options.confirmText || 'تأكيد';

        const isDanger = options.type === 'danger';
        const isSuccess = options.type === 'success';
        icon.classList.toggle('danger', isDanger);
        icon.querySelector('.material-icons').textContent = isDanger ? 'warning' : (isSuccess ? 'check_circle' : 'help_outline');
        btn.className = isDanger ? 'btn-danger' : 'btn-primary';

        modal.classList.add('active');
    });
}

function closeConfirm(result) {
    const modal = document.getElementById('confirmModal');
    if (!modal) return;
    modal.classList.remove('active');
    if (_confirmResolver) {
        _confirmResolver(result);
        _confirmResolver = null;
    }
}

// ============================================================
// ============ Sidebar ============
// ============================================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar) return;
    const isOpen = sidebar.classList.contains('open');
    if (isOpen) {
        closeSidebar();
    } else {
        sidebar.classList.add('open');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

function toggleSpecificUser() {
    const target = document.getElementById('notificationTarget');
    const group = document.getElementById('specificUserGroup');
    if (group && target) {
        group.style.display = target.value === 'specific' ? 'block' : 'none';
    }
}

// ============================================================
// ============ Nav Badges ============
// ============================================================
function updateNavBadges() {
    const pendingOrders = ordersData.filter(o =>
        o.status === 'pending' || o.status === 'review' || o.status === 'processing'
    ).length;
    setBadge('badge-orders', pendingOrders);
    setBadge('badge-mobile-orders', pendingOrders);

    const pendingDeposits = depositsData.filter(d => d.status === 'pending').length;
    setBadge('badge-deposits', pendingDeposits);

    const pendingKYC = kycData.filter(k => k.status === 'pending').length;
    setBadge('badge-kyc', pendingKYC);

    const pendingServices = serviceRequestsData.filter(s => s.status === 'pending').length;
    setBadge('badge-services', pendingServices);

    const archiveCount = (archiveData.categories?.length || 0) + (archiveData.products?.length || 0);
    setBadge('badge-archive', archiveCount);
}

function setBadge(id, count) {
    const el = document.getElementById(id);
    if (!el) return;
    if (count > 0) {
        el.textContent = count > 99 ? '99+' : count;
        el.style.display = 'inline-block';
    } else {
        el.style.display = 'none';
    }
}

// ============================================================
// ============ Global Search ============
// ============================================================
function openGlobalSearch() {
    const modal = document.getElementById('globalSearchModal');
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    const input = document.getElementById('globalSearchInput');
    if (input) {
        input.value = '';
        setTimeout(() => input.focus(), 100);
    }
    const results = document.getElementById('globalSearchResults');
    if (results) {
        results.innerHTML = `
            <div class="global-search-hint">
                <span class="material-icons">search</span>
                <p>ابدأ الكتابة للبحث...</p>
                <small>مثال: رقم طلب، Telegram ID، اسم منتج</small>
            </div>
        `;
    }
}

function closeGlobalSearch() {
    const modal = document.getElementById('globalSearchModal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function performGlobalSearch(query) {
    const resultsContainer = document.getElementById('globalSearchResults');
    if (!resultsContainer) return;
    const q = (query || '').toLowerCase().trim();

    if (!q || q.length < 2) {
        resultsContainer.innerHTML = `
            <div class="global-search-hint">
                <span class="material-icons">search</span>
                <p>ابدأ الكتابة للبحث...</p>
                <small>مثال: رقم طلب، Telegram ID، اسم منتج</small>
            </div>
        `;
        return;
    }

    const usersResults = usersData.filter(u =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.first_name || '').toLowerCase().includes(q) ||
        (u.telegram_id + '').includes(q)
    ).slice(0, 5);

    const ordersResults = ordersData.filter(o =>
        (o.order_number || '').toLowerCase().includes(q) ||
        (o.product_name || '').toLowerCase().includes(q)
    ).slice(0, 5);

    const productsResults = productsData.filter(p =>
        (p.name || '').toLowerCase().includes(q)
    ).slice(0, 5);

    let html = '';
    let totalFound = 0;

    if (usersResults.length) {
        totalFound += usersResults.length;
        html += `
            <div class="search-result-section">
                <div class="search-result-section-title">
                    <span class="material-icons">people</span>
                    المستخدمون (${usersResults.length})
                </div>
                ${usersResults.map(u => `
                    <button class="search-result-item" onclick="goToUserFromSearch(${u.id})">
                        <div class="search-result-icon"><span class="material-icons">person</span></div>
                        <div class="search-result-content">
                            <div class="search-result-title">${u.username || u.first_name || 'مستخدم'}</div>
                            <div class="search-result-subtitle ltr">${u.telegram_id} • ${u.balance.toFixed(2)}$</div>
                        </div>
                        <span class="material-icons search-result-arrow">chevron_left</span>
                    </button>
                `).join('')}
            </div>
        `;
    }

    if (ordersResults.length) {
        totalFound += ordersResults.length;
        html += `
            <div class="search-result-section">
                <div class="search-result-section-title">
                    <span class="material-icons">receipt_long</span>
                    الطلبات (${ordersResults.length})
                </div>
                ${ordersResults.map(o => `
                    <button class="search-result-item" onclick="goToOrderFromSearch(${o.id})">
                        <div class="search-result-icon"><span class="material-icons">receipt</span></div>
                        <div class="search-result-content">
                            <div class="search-result-title ltr">${o.order_number}</div>
                            <div class="search-result-subtitle">${o.product_name || ''} • ${o.status}</div>
                        </div>
                        <span class="material-icons search-result-arrow">chevron_left</span>
                    </button>
                `).join('')}
            </div>
        `;
    }

    if (productsResults.length) {
        totalFound += productsResults.length;
        html += `
            <div class="search-result-section">
                <div class="search-result-section-title">
                    <span class="material-icons">inventory_2</span>
                    المنتجات (${productsResults.length})
                </div>
                ${productsResults.map(p => `
                    <button class="search-result-item" onclick="goToProductFromSearch(${p.id})">
                        <div class="search-result-icon"><span class="material-icons">inventory_2</span></div>
                        <div class="search-result-content">
                            <div class="search-result-title">${p.name}</div>
                            <div class="search-result-subtitle">${p.base_price}$ • ${categoriesData.find(c => c.id === p.category_id)?.name || ''}</div>
                        </div>
                        <span class="material-icons search-result-arrow">chevron_left</span>
                    </button>
                `).join('')}
            </div>
        `;
    }

    if (totalFound === 0) {
        html = `
            <div class="search-no-results">
                <span class="material-icons">search_off</span>
                <p>لا توجد نتائج لـ "<strong>${query}</strong>"</p>
                <small>جرّب كلمة أخرى أو تحقق من الإملاء</small>
            </div>
        `;
    }

    resultsContainer.innerHTML = html;
}

function goToUserFromSearch(userId) {
    closeGlobalSearch();
    switchSection('users');
    const user = usersData.find(u => u.id === userId);
    if (user) {
        const searchInput = document.getElementById('userSearch');
        if (searchInput) {
            searchInput.value = user.telegram_id + '';
            filterUsers(searchInput.value);
        }
    }
}

function goToOrderFromSearch(orderId) {
    closeGlobalSearch();
    switchSection('orders');
    const order = ordersData.find(o => o.id === orderId);
    if (order) {
        const searchInput = document.getElementById('orderSearchQuery');
        if (searchInput) {
            searchInput.value = order.order_number;
            applyOrderFilters();
        }
    }
}

function goToProductFromSearch(productId) {
    closeGlobalSearch();
    switchSection('products');
    showToast('تم فتح قسم المنتجات', 'info');
}
// ============================================================
// ============ Login + OTP ============
// ============================================================
function showLogin() {
    document.body.innerHTML = `
        <div class="login-screen">
            <div class="login-box">
                <h2>SANAD<span style="color:var(--primary)">+</span> | لوحة التحكم</h2>
                <div class="form-group">
                    <label>اسم المستخدم</label>
                    <input type="text" id="loginUsername" value="admin">
                </div>
                <div class="form-group">
                    <label>كلمة المرور</label>
                    <input type="password" id="loginPassword" placeholder="••••••••"
                           onkeypress="if(event.key === 'Enter') doLogin()">
                </div>
                <button class="btn-primary btn-block" onclick="doLogin()">
                    <span class="material-icons">login</span> تسجيل الدخول
                </button>
            </div>
        </div>
    `;
    setTimeout(() => document.getElementById('loginPassword')?.focus(), 200);
}

async function doLogin() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const btn = document.querySelector('.login-box .btn-primary');
    if (btn) { btn.disabled = true; btn.innerHTML = 'جارٍ التحقق...'; }
    try {
        const result = await adminLogin(username, password);
        if (result.require_otp) {
            _otpSessionId = result.session_id;
            showOTPForm();
            showToast('تم إرسال رمز التحقق إلى تيليجرام', 'success', 5000);
        } else if (result.token) {
            setToken(result.token);
            location.reload();
        } else {
            showToast(result.error || 'بيانات خاطئة', 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons">login</span> تسجيل الدخول'; }
        }
    } catch (error) {
        showToast('فشل الاتصال بالخادم', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons">login</span> تسجيل الدخول'; }
    }
}

function showOTPForm() {
    document.body.innerHTML = `
        <div class="login-screen">
            <div class="login-box">
                <div style="text-align:center; margin-bottom:16px;">
                    <span class="material-icons" style="font-size:52px; color:var(--primary);">verified_user</span>
                </div>
                <h2 style="text-align:center; color:var(--text); margin-bottom:8px;">التحقق بخطوتين</h2>
                <p style="text-align:center; color:var(--text-secondary); font-size:0.9rem; margin-bottom:24px; line-height:1.6;">
                    تم إرسال رمز مكوَّن من 6 أرقام<br>إلى حسابك في تيليجرام
                </p>
                <div class="form-group">
                    <label style="text-align:center;">رمز التحقق</label>
                    <input type="text" id="otpCode" placeholder="000000" maxlength="6"
                           inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code"
                           onkeypress="if(event.key === 'Enter') verifyOTP()"
                           style="text-align:center; font-size:28px; letter-spacing:10px; font-weight:800; padding:14px;">
                </div>
                <button class="btn-primary btn-block" onclick="verifyOTP()" style="margin-top:8px;">
                    <span class="material-icons">check_circle</span> تأكيد الدخول
                </button>
                <button class="btn-outline" style="width:100%; margin-top:10px;" onclick="location.reload()">
                    <span class="material-icons">arrow_back</span> رجوع
                </button>
                <p style="text-align:center; color:var(--text-secondary); font-size:0.75rem; margin-top:16px;">
                    ⏱️ الرمز صالح لمدة 5 دقائق
                </p>
            </div>
        </div>
    `;
    setTimeout(() => document.getElementById('otpCode')?.focus(), 200);
}

async function verifyOTP() {
    const codeInput = document.getElementById('otpCode');
    const code = codeInput?.value?.trim();
    const btn = document.querySelector('.login-box .btn-primary');

    if (!code || code.length !== 6) {
        showToast('أدخل رمزاً من 6 أرقام', 'warning');
        return;
    }
    if (!_otpSessionId) {
        showToast('انتهت الجلسة، يرجى تسجيل الدخول مجدداً', 'error');
        setTimeout(() => location.reload(), 1500);
        return;
    }

    if (btn) { btn.disabled = true; btn.innerHTML = 'جارٍ التحقق...'; }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: _otpSessionId, otp_code: code })
        });
        const result = await response.json();

        if (result.token) {
            setToken(result.token);
            location.reload();
        } else {
            showToast(result.error || 'رمز خاطئ', 'error');
            if (codeInput) { codeInput.value = ''; codeInput.focus(); }
            if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons">check_circle</span> تأكيد الدخول'; }
        }
    } catch (error) {
        showToast('فشل الاتصال بالخادم', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons">check_circle</span> تأكيد الدخول'; }
    }
}

// ============================================================
// ============ Init ============
// ============================================================
async function initAdminPanel() {
    await loadAllData();
    setupAdminNavigation();
    switchSection('dashboard');
}

async function loadAllData() {
    try {
        const results = await Promise.allSettled([
            fetchAdminUsers(),
            fetchAdminCategories(),
            fetchAdminProducts(),
            fetchAdminPaymentMethods(),
            fetchAdminOrders(),
            fetchAdminDeposits(),
            fetchAdminKYC(),
            fetchServiceRequests(),
            fetchAdminCoupons(),
            fetchArchive(),
            fetchAdminSettings(),
        ]);
        usersData = results[0].status === 'fulfilled' ? results[0].value : [];
        categoriesData = results[1].status === 'fulfilled' ? results[1].value : [];
        productsData = results[2].status === 'fulfilled' ? results[2].value : [];
        paymentMethodsData = results[3].status === 'fulfilled' ? results[3].value : [];
        ordersData = results[4].status === 'fulfilled' ? results[4].value : [];
        depositsData = results[5].status === 'fulfilled' ? results[5].value : [];
        kycData = results[6].status === 'fulfilled' ? results[6].value : [];
        serviceRequestsData = results[7].status === 'fulfilled' ? results[7].value : [];
        couponsData = results[8].status === 'fulfilled' ? results[8].value : [];
        archiveData = results[9].status === 'fulfilled' ? results[9].value : { categories: [], products: [] };
        currentSettings = results[10].status === 'fulfilled' ? results[10].value : {};

        filteredProducts = [...productsData];

        const catFilter = document.getElementById('productCategoryFilter');
        if (catFilter) {
            catFilter.innerHTML = '<option value="all">جميع الأقسام</option>' +
                categoriesData.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }

        updateNavBadges();
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        showToast('تعذر تحميل بعض البيانات', 'error');
    }
}

function setupAdminNavigation() {
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            switchSection(section);
        });
    });
}

function switchSection(sectionId) {
    document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));
    const section = document.getElementById('section-' + sectionId);
    if (section) section.classList.add('active');

    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-section') === sectionId);
    });

    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-section') === sectionId);
    });

    currentSection = sectionId;

    if (window.innerWidth < 1024) {
        closeSidebar();
    }

    if (sectionId === 'dashboard') renderDashboard();
    if (sectionId === 'users') renderUsers();
    if (sectionId === 'categories') renderCategories();
    if (sectionId === 'products') { filteredProducts = [...productsData]; renderProducts(); }
    if (sectionId === 'payment-methods') renderPaymentMethods();
    if (sectionId === 'orders') { filteredOrders = [...ordersData]; renderOrders(ordersData); }
    if (sectionId === 'deposits') renderDeposits(depositsData);
    if (sectionId === 'kyc') renderKYC();
    if (sectionId === 'service-requests') renderServiceRequests();
    if (sectionId === 'coupons') renderCoupons();
    if (sectionId === 'referrals') loadReferrals();
    if (sectionId === 'archive') renderArchive();
    if (sectionId === 'activities') loadActivities();
    if (sectionId === 'audit-log') loadAuditLog();
    if (sectionId === 'settings') loadSettings();
}

// ============================================================
// ============ Dashboard + Charts ============
// ============================================================
function renderDashboard() {
    const totalRevenue = ordersData.reduce((sum, o) => sum + (o.total_price || 0), 0);
    document.getElementById('dashRevenue').textContent = `${totalRevenue.toFixed(2)}$`;
    document.getElementById('dashOrders').textContent = ordersData.length;
    document.getElementById('dashUsers').textContent = usersData.length;
    document.getElementById('dashProducts').textContent = productsData.length;

    const recent = document.getElementById('recentActivities');
    if (!ordersData.length) {
        recent.innerHTML = '<div class="empty-state"><span class="material-icons">history</span>لا توجد عمليات حديثة</div>';
    } else {
        recent.innerHTML = ordersData.slice(0, 5).map(o => `
            <div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                <span style="font-weight:600;font-size:0.85rem;" class="ltr">${o.order_number}</span>
                <span class="status-badge ${o.status}">${getStatusArabic(o.status)}</span>
            </div>
        `).join('');
    }

    renderOrdersChart();
    renderDepositsChart();
}

function getChartColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        text: isDark ? '#F1F5F9' : '#0F172A',
        textSecondary: isDark ? '#94A3B8' : '#64748B',
        grid: isDark ? '#334155' : '#E2E8F0',
        isDark
    };
}

function renderOrdersChart() {
    const canvas = document.getElementById('chartOrdersPie');
    if (!canvas) return;

    const statusCounts = { pending: 0, review: 0, processing: 0, completed: 0, failed: 0, cancelled: 0 };
    ordersData.forEach(o => { if (statusCounts.hasOwnProperty(o.status)) statusCounts[o.status]++; });

    const labels = [];
    const data = [];
    const colors = [];
    const colorMap = {
        pending: '#F59E0B', review: '#0EA5E9', processing: '#3B82F6',
        completed: '#10B981', failed: '#EF4444', cancelled: '#94A3B8'
    };

    Object.keys(statusCounts).forEach(key => {
        if (statusCounts[key] > 0) {
            labels.push(getStatusArabic(key));
            data.push(statusCounts[key]);
            colors.push(colorMap[key]);
        }
    });

    if (data.length === 0) {
        if (chartOrdersPieInstance) { chartOrdersPieInstance.destroy(); chartOrdersPieInstance = null; }
        const ctx = canvas.getContext('2d');
        const c = getChartColors();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = c.textSecondary;
        ctx.font = '14px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('لا توجد بيانات لعرضها', canvas.width / 2, canvas.height / 2);
        return;
    }

    if (chartOrdersPieInstance) chartOrdersPieInstance.destroy();
    const c = getChartColors();

    chartOrdersPieInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: c.isDark ? '#1E293B' : '#FFFFFF',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: c.text,
                        font: { family: 'Cairo', size: 12, weight: '600' },
                        padding: 12,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 8
                    }
                },
                tooltip: {
                    backgroundColor: c.isDark ? '#1E293B' : '#FFFFFF',
                    titleColor: c.text,
                    bodyColor: c.text,
                    borderColor: c.grid,
                    borderWidth: 1,
                    padding: 10,
                    titleFont: { family: 'Cairo', weight: '700' },
                    bodyFont: { family: 'Cairo' },
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${pct}%)`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

function renderDepositsChart() {
    const canvas = document.getElementById('chartDepositsLine');
    if (!canvas) return;

    const now = new Date();
    const days = [];
    const labels = [];
    const values = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        days.push(date);
    }

    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    days.forEach((day, index) => {
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);
        const dayTotal = depositsData
            .filter(d => d.status === 'approved')
            .filter(d => {
                if (!d.created_at) return false;
                const created = new Date(d.created_at);
                return created >= day && created < nextDay;
            })
            .reduce((sum, d) => sum + (d.amount || 0), 0);

        if (index >= 4) labels.push(dayNames[day.getDay()]);
        else labels.push(`${day.getDate()}/${day.getMonth() + 1}`);
        values.push(dayTotal);
    });

    if (chartDepositsLineInstance) chartDepositsLineInstance.destroy();
    const c = getChartColors();
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, 'rgba(14, 165, 233, 0.3)');
    gradient.addColorStop(1, 'rgba(14, 165, 233, 0.02)');

    chartDepositsLineInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'الإيداعات ($)',
                data: values,
                borderColor: '#0EA5E9',
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#0EA5E9',
                pointBorderColor: c.isDark ? '#1E293B' : '#FFFFFF',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: c.isDark ? '#1E293B' : '#FFFFFF',
                    titleColor: c.text,
                    bodyColor: c.text,
                    borderColor: c.grid,
                    borderWidth: 1,
                    padding: 10,
                    titleFont: { family: 'Cairo', weight: '700' },
                    bodyFont: { family: 'Cairo' },
                    displayColors: false,
                    callbacks: { label: function(context) { return `${context.parsed.y.toFixed(2)}$`; } }
                }
            },
            scales: {
                x: { grid: { color: c.grid, display: false }, ticks: { color: c.textSecondary, font: { family: 'Cairo', size: 11 } } },
                y: {
                    beginAtZero: true, grid: { color: c.grid },
                    ticks: { color: c.textSecondary, font: { family: 'Cairo', size: 11 }, callback: function(value) { return value + '$'; } }
                }
            }
        }
    });
}

function getStatusArabic(status) {
    const map = {
        pending: 'قيد المعالجة', review: 'قيد المراجعة', processing: 'قيد التنفيذ',
        completed: 'مكتمل', failed: 'فشل', cancelled: 'ملغي',
        approved: 'مقبول', rejected: 'مرفوض'
    };
    return map[status] || status;
}

// ============================================================
// ============ Users — مع VIP Dropdown + السالب ============
// ============================================================
function filterUsers(query) {
    const q = (query || '').toLowerCase().trim();
    const filtered = usersData.filter(u =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.first_name || '').toLowerCase().includes(q) ||
        (u.telegram_id + '').includes(q)
    );
    renderUsers(filtered);
}

function renderUsers(users = usersData) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><span class="material-icons">people</span>لا يوجد مستخدمون</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => {
        const balance = user.balance || 0;
        const balanceColor = balance < 0 ? 'var(--error)' : (balance > 0 ? 'var(--success)' : 'var(--text)');
        const negBadge = (balance < 0 && user.allow_negative_balance) ?
            `<span style="font-size:0.7rem;background:var(--error-bg);color:var(--error);padding:2px 6px;border-radius:4px;margin-right:4px;">سالب</span>` : '';

        const vipLevel = user.vip_level || 0;
        const vipConfig = VIP_LEVELS[vipLevel];
        const vipBadge = vipConfig ?
            `<span class="vip-badge" style="background:${vipConfig.color};color:#000;" title="${vipConfig.name}">
                <span class="material-icons" style="font-size:14px;vertical-align:middle;">${vipConfig.icon}</span>
                ${vipLevel}
            </span>` : '<span style="color:var(--text-secondary);">—</span>';

        return `
        <tr>
            <td data-label="Telegram ID"><span class="ltr">${user.telegram_id}</span></td>
            <td data-label="الاسم">${user.username || user.first_name || 'مستخدم'}</td>
            <td data-label="الرصيد">
                <span style="color:${balanceColor};font-weight:800;direction:ltr;">${balance.toFixed(2)}$</span>
                ${negBadge}
            </td>
            <td data-label="الحالة"><span class="status-badge ${user.is_banned ? 'failed' : 'completed'}">${user.is_banned ? 'محظور' : 'نشط'}</span></td>
            <td data-label="VIP">${vipBadge}</td>
            <td data-label="إجراءات">
                <button class="btn-outline btn-sm" onclick="adjustBalance(${user.id})">رصيد</button>
                <button class="btn-outline btn-sm" onclick="openNegativeBalanceModal(${user.id})" title="الرصيد السالب">💳</button>
                <button class="btn-outline btn-sm" onclick="openVIPModal(${user.id})" title="VIP">⭐</button>
                <button class="btn-outline btn-sm" onclick="toggleBan(${user.id})">${user.is_banned ? 'فك الحظر' : 'حظر'}</button>
                <button class="btn-outline btn-sm" onclick="toggleKYC(${user.id}, '${user.kyc_status}')">${user.kyc_status === 'verified' ? 'إلغاء KYC' : 'KYC'}</button>
            </td>
        </tr>
    `}).join('');
}

// ============================================================
// 🆕 Negative Balance Modal
// ============================================================
function openNegativeBalanceModal(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;

    const isAllowed = user.allow_negative_balance !== false;
    const maxNeg = user.max_negative_balance || 0;

    openModal('إعدادات الرصيد السالب', `
        <div style="text-align:right;">
            <div style="background:var(--primary-light);padding:12px;border-radius:12px;margin-bottom:14px;">
                <div style="font-weight:700;">${user.username || user.first_name || 'مستخدم'}</div>
                <div style="color:var(--text-secondary);font-size:0.85rem;">
                    الرصيد الحالي: <strong style="color:${user.balance < 0 ? 'var(--error)' : 'var(--text)'};">
                        ${user.balance.toFixed(2)}$
                    </strong>
                </div>
            </div>

            <div style="background:var(--warning-bg);border:1px solid var(--warning);border-radius:12px;padding:12px;margin-bottom:14px;font-size:0.8rem;line-height:1.6;">
                <strong>💡 كيف تعمل الميزة:</strong><br>
                • تفعيل: يسمح للمستخدم بالشراء حتى لو رصيده صفر<br>
                • الحد الأقصى: كم يمكن أن يصبح سالباً<br>
                • عند الإيداع: يُخصم الدين تلقائياً
            </div>

            <div class="form-group">
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer;background:var(--surface);padding:12px;border-radius:12px;border:1px solid var(--border);">
                    <input type="checkbox" id="negAllow" ${isAllowed ? 'checked' : ''} style="width:20px;height:20px;cursor:pointer;">
                    <span style="font-weight:600;">تفعيل الرصيد السالب لهذا المستخدم</span>
                </label>
            </div>

            <div class="form-group">
                <label>الحد الأقصى للسالب ($)</label>
                <input type="number" id="negMax" value="${maxNeg}" step="1" min="0" max="10000">
                <small style="color:var(--text-secondary);font-size:0.75rem;display:block;margin-top:6px;">
                    مثال: 100 → يمكن للمستخدم أن يصل رصيده إلى -100$
                </small>
            </div>

            <div style="display:flex;gap:8px;margin-top:16px;">
                <button class="btn-primary" style="flex:1;" onclick="saveNegativeBalance(${userId})">حفظ</button>
                <button class="btn-outline" style="flex:1;" onclick="closeModal()">إلغاء</button>
            </div>
        </div>
    `);
}

async function saveNegativeBalance(userId) {
    const allow = document.getElementById('negAllow').checked;
    const maxNeg = parseFloat(document.getElementById('negMax').value) || 0;

    if (allow && maxNeg <= 0) {
        showToast('يجب تحديد حد أقصى أكبر من صفر عند التفعيل', 'warning');
        return;
    }

    try {
        await setUserNegativeBalance(userId, allow, maxNeg);
        await loadAllData();
        renderUsers();
        closeModal();
        showToast('تم تحديث إعدادات الرصيد السالب', 'success');
    } catch (error) {
        showToast(`فشل التحديث: ${error.message}`, 'error');
    }
}

// ============================================================
// 🆕 VIP Modal
// ============================================================
function openVIPModal(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;

    const currentLevel = user.vip_level || 0;

    const options = Object.entries(VIP_LEVELS).map(([lvl, config]) => `
        <label class="vip-option ${parseInt(lvl) === currentLevel ? 'selected' : ''}" data-level="${lvl}">
            <input type="radio" name="vipLevel" value="${lvl}" ${parseInt(lvl) === currentLevel ? 'checked' : ''} 
                   style="width:18px;height:18px;">
            <span class="material-icons" style="color:${config.color};font-size:22px;">${config.icon}</span>
            <div style="flex:1;">
                <div style="font-weight:700;font-size:0.9rem;">${lvl} — ${config.name}</div>
            </div>
            <div style="width:14px;height:14px;border-radius:50%;background:${config.color};"></div>
        </label>
    `).join('');

    openModal('اختيار مستوى VIP', `
        <div style="text-align:right;">
            <div style="background:var(--primary-light);padding:12px;border-radius:12px;margin-bottom:14px;">
                <div style="font-weight:700;">${user.username || user.first_name || 'مستخدم'}</div>
                <div style="color:var(--text-secondary);font-size:0.85rem;">
                    المستوى الحالي: <strong>${currentLevel === 0 ? 'بدون VIP' : VIP_LEVELS[currentLevel]?.name}</strong>
                </div>
            </div>

            <div class="vip-options-list">
                <label class="vip-option ${currentLevel === 0 ? 'selected' : ''}">
                    <input type="radio" name="vipLevel" value="0" ${currentLevel === 0 ? 'checked' : ''} style="width:18px;height:18px;">
                    <span class="material-icons" style="color:var(--text-secondary);font-size:22px;">block</span>
                    <div style="flex:1;">
                        <div style="font-weight:700;font-size:0.9rem;">إلغاء VIP</div>
                    </div>
                </label>
                ${options}
            </div>

            <div style="display:flex;gap:8px;margin-top:16px;">
                <button class="btn-primary" style="flex:1;" onclick="saveVIPSelection(${userId})">حفظ</button>
                <button class="btn-outline" style="flex:1;" onclick="closeModal()">إلغاء</button>
            </div>
        </div>
    `);

    // إضافة حدث للتحديد
    setTimeout(() => {
        document.querySelectorAll('.vip-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.vip-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                const radio = opt.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
            });
        });
    }, 100);
}

async function saveVIPSelection(userId) {
    const selected = document.querySelector('input[name="vipLevel"]:checked');
    if (!selected) {
        showToast('اختر مستوى', 'warning');
        return;
    }

    const level = parseInt(selected.value);

    try {
        await setUserVIP(userId, level);
        await loadAllData();
        renderUsers();
        closeModal();
        showToast(level === 0 ? 'تم إلغاء VIP' : `تم تعيين ${VIP_LEVELS[level].name}`, 'success');
    } catch (error) {
        showToast(`فشل التعيين: ${error.message}`, 'error');
    }
}

// ============================================================
// Users — Actions
// ============================================================
async function toggleKYC(userId, currentStatus) {
    const newStatus = currentStatus === 'verified' ? 'unverified' : 'verified';
    const confirmed = await showConfirm({
        title: newStatus === 'verified' ? 'توثيق المستخدم' : 'إلغاء التوثيق',
        message: newStatus === 'verified' ? 'هل أنت متأكد من توثيق هذا المستخدم؟' : 'هل أنت متأكد من إلغاء توثيق هذا المستخدم؟',
        confirmText: 'تأكيد',
        type: newStatus === 'verified' ? 'success' : 'danger'
    });
    if (!confirmed) return;
    try {
        await toggleUserKYC(userId, newStatus);
        await loadAllData();
        renderUsers();
        showToast('تم تحديث حالة التوثيق بنجاح', 'success');
    } catch (error) {
        showToast(`فشل تحديث التوثيق: ${error.message}`, 'error');
    }
}

async function adjustBalance(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;
    openModal('تعديل الرصيد', `
        <div style="text-align:right;">
            <div style="background:var(--primary-light);padding:12px;border-radius:12px;margin-bottom:14px;">
                <div style="font-weight:700;">${user.username || user.first_name || 'مستخدم'}</div>
                <div style="color:var(--text-secondary);font-size:0.85rem;">الرصيد الحالي: <strong>${user.balance.toFixed(2)}$</strong></div>
            </div>
            <div class="form-group">
                <label>نوع العملية</label>
                <select id="adjustType">
                    <option value="add">إضافة رصيد</option>
                    <option value="subtract">خصم رصيد</option>
                </select>
            </div>
            <div class="form-group">
                <label>المبلغ (بالدولار)</label>
                <input type="number" id="adjustAmount" step="0.01" min="0" placeholder="0.00">
            </div>
            <div class="form-group">
                <label>ملاحظة (اختياري)</label>
                <input type="text" id="adjustNote" placeholder="سبب التعديل">
            </div>
            <div style="display:flex;gap:8px;">
                <button class="btn-primary" style="flex:1;" onclick="confirmAdjustBalance(${userId})">تأكيد</button>
                <button class="btn-outline" style="flex:1;" onclick="closeModal()">إلغاء</button>
            </div>
        </div>
    `);
}

async function confirmAdjustBalance(userId) {
    const type = document.getElementById('adjustType').value;
    const rawAmount = parseFloat(document.getElementById('adjustAmount').value);
    const note = document.getElementById('adjustNote').value || '';

    if (!rawAmount || rawAmount <= 0) { showToast('أدخل مبلغاً صحيحاً', 'warning'); return; }

    const amount = type === 'add' ? rawAmount : -rawAmount;

    const confirmed = await showConfirm({
        title: 'تأكيد تعديل الرصيد',
        message: `سيتم ${type === 'add' ? 'إضافة' : 'خصم'} ${rawAmount}$ ${type === 'add' ? 'إلى' : 'من'} رصيد المستخدم.`,
        confirmText: 'تأكيد العملية',
        type: type === 'add' ? 'success' : 'danger'
    });
    if (!confirmed) return;

    try {
        await adjustUserBalance(userId, amount, note);
        await loadAllData();
        renderUsers();
        closeModal();
        showToast('تم تعديل الرصيد بنجاح', 'success');
    } catch (error) {
        showToast(`فشل تعديل الرصيد: ${error.message}`, 'error');
    }
}

async function toggleBan(userId) {
    const user = usersData.find(u => u.id === userId);
    const isBanned = user?.is_banned;
    const confirmed = await showConfirm({
        title: isBanned ? 'فك الحظر' : 'حظر المستخدم',
        message: isBanned ? 'هل أنت متأكد من فك حظر هذا المستخدم؟' : 'هل أنت متأكد من حظر هذا المستخدم؟',
        confirmText: isBanned ? 'فك الحظر' : 'حظر',
        type: isBanned ? 'success' : 'danger'
    });
    if (!confirmed) return;
    try {
        await toggleUserBan(userId);
        await loadAllData();
        renderUsers();
        showToast('تم تحديث حالة الحظر', 'success');
    } catch (error) {
        showToast(`فشل تغيير حالة الحظر: ${error.message}`, 'error');
    }
}

// ============================================================
// ============ Categories ============
// ============================================================
function renderCategories() {
    const container = document.getElementById('categoriesList');
    if (!container) return;
    if (!categoriesData.length) {
        container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><span class="material-icons">category</span>لا توجد أقسام</div>';
        return;
    }
    container.innerHTML = categoriesData.map(cat => `
        <div class="category-card">
            <div class="card-icon">${cat.image ? `<img src="${cat.image}" alt="${cat.name}">` : '📁'}</div>
            <div class="card-title">${cat.name}</div>
            <div class="card-actions">
                <button class="btn-danger btn-sm" onclick="archiveCategoryHandler(${cat.id})">حذف</button>
            </div>
        </div>
    `).join('');
}

function openCategoryModal() {
    const body = `
        <h3 style="margin-bottom:14px;">إضافة قسم جديد</h3>
        <div class="form-group"><label>اسم القسم</label><input type="text" id="categoryName"></div>
        <div class="form-group"><label>أيقونة (إيموجي) - اختياري</label><input type="text" id="categoryIcon" value="📁"></div>
        <div class="form-group">
            <label>صورة القسم</label>
            <div class="image-preview" id="categoryImagePreview">لا صورة</div>
            <input type="file" id="categoryImage" accept="image/*" onchange="previewImage(this,'categoryImagePreview')">
            <small style="color:var(--text-secondary);font-size:0.75rem;display:block;margin-top:6px;line-height:1.5;">
                💡 <strong>نصيحة:</strong> ارفع صورة مربعة (1:1)
            </small>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="btn-primary" onclick="saveCategory(this)">حفظ</button>
            <button class="btn-outline" onclick="closeModal()">إلغاء</button>
        </div>
    `;
    openModal('إضافة قسم', body);
}

async function saveCategory(btn) {
    const name = document.getElementById('categoryName').value;
    const icon = document.getElementById('categoryIcon').value;
    if (!name) { showToast('أدخل اسم القسم', 'warning'); return; }
    const imageFile = document.getElementById('categoryImage').files[0];
    let image = '';
    if (imageFile) image = await fileToSquareBase64(imageFile, 512);

    if (btn) { btn.disabled = true; btn.textContent = 'جارٍ الحفظ...'; }
    try {
        await createCategory({ name, icon, image });
        closeModal();
        await loadAllData();
        renderCategories();
        showToast('تم إضافة القسم بنجاح', 'success');
    } catch (error) {
        showToast(`فشل إضافة القسم: ${error.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'حفظ'; }
    }
}

async function archiveCategoryHandler(categoryId) {
    const confirmed = await showConfirm({
        title: 'أرشفة القسم',
        message: 'سيتم نقل القسم وجميع منتجاته إلى الأرشيف. يمكن استرجاعه لاحقاً.',
        confirmText: 'أرشفة',
        type: 'danger'
    });
    if (!confirmed) return;
    try {
        const result = await deleteCategory(categoryId);
        await loadAllData();
        renderCategories();
        showToast(result.message || 'تم أرشفة القسم بنجاح', 'success');
    } catch (error) {
        showToast(`فشل أرشفة القسم: ${error.message}`, 'error');
    }
}

// ============================================================
// ============ Products + Search Filter ============
// ============================================================
function filterProducts() {
    const searchQuery = (document.getElementById('productSearch')?.value || '').toLowerCase().trim();
    const categoryFilter = document.getElementById('productCategoryFilter')?.value || 'all';
    const typeFilter = document.getElementById('productTypeFilter')?.value || 'all';

    let filtered = [...productsData];

    if (searchQuery) {
        filtered = filtered.filter(p =>
            (p.name || '').toLowerCase().includes(searchQuery) ||
            (p.description || '').toLowerCase().includes(searchQuery)
        );
    }

    if (categoryFilter !== 'all') {
        const catId = parseInt(categoryFilter);
        filtered = filtered.filter(p => p.category_id === catId);
    }

    if (typeFilter !== 'all') {
        filtered = filtered.filter(p => p.product_type === typeFilter);
    }

    filteredProducts = filtered;
    renderProducts();
}

function resetProductFilters() {
    const searchEl = document.getElementById('productSearch');
    const catEl = document.getElementById('productCategoryFilter');
    const typeEl = document.getElementById('productTypeFilter');
    if (searchEl) searchEl.value = '';
    if (catEl) catEl.value = 'all';
    if (typeEl) typeEl.value = 'all';
    filteredProducts = [...productsData];
    renderProducts();
}

function renderProducts() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    const products = filteredProducts.length ? filteredProducts : productsData;

    if (!products.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><span class="material-icons">inventory_2</span>لا توجد منتجات مطابقة</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(prod => {
        let priceDisplay = `${prod.base_price}$`;
        let qtyDisplay = prod.base_quantity;

        if (prod.product_type === 'topup') {
            priceDisplay = `<span style="color:var(--warning);font-weight:800;">${prod.base_price} ل.س</span>`;
            qtyDisplay = '-';
        }

        return `
        <tr>
            <td data-label="الصورة"><img src="${prod.image || ''}" alt="${prod.name}" onerror="this.style.display='none'"></td>
            <td data-label="الاسم">${prod.name}</td>
            <td data-label="القسم">${categoriesData.find(c => c.id === prod.category_id)?.name || '-'}</td>
            <td data-label="السعر">${priceDisplay}</td>
            <td data-label="الكمية">${qtyDisplay}</td>
            <td data-label="الحد الأقصى">${prod.max_quantity > 0 ? prod.max_quantity.toLocaleString('ar') : 'بلا حد'}</td>
            <td data-label="النوع"><span class="status-badge ${prod.product_type === 'bundle' ? 'pending' : prod.product_type === 'topup' ? 'verified' : 'completed'}">${prod.product_type === 'bundle' ? 'باقة' : prod.product_type === 'topup' ? 'رصيد سوري' : 'كمية'}</span></td>
            <td data-label="إجراءات">
                <button class="btn-outline btn-sm" onclick="openEditProductModal(${prod.id})">تعديل</button>
                <button class="btn-danger btn-sm" onclick="archiveProductHandler(${prod.id})">حذف</button>
            </td>
        </tr>
    `}).join('');
}

function openProductModal() {
    const body = `
        <h3 style="margin-bottom:14px;">إضافة منتج</h3>
        <div class="form-group"><label>اسم المنتج</label><input type="text" id="productName"></div>
        <div class="form-group"><label>القسم</label><select id="productCategoryId">${categoriesData.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
        <div class="form-group">
            <label>النوع</label>
            <select id="productType" onchange="toggleProductTypeFields()">
                <option value="quantity">كمية</option>
                <option value="bundle">باقة</option>
                <option value="topup">رصيد سوري (ل.س)</option>
            </select>
        </div>
        <div class="form-group">
            <label id="priceLabel">السعر الأساسي (دولار)</label>
            <input type="number" id="productPrice" value="0" step="0.01">
            <small id="priceHelp" style="color:var(--text-secondary);font-size:0.75rem;display:none;margin-top:6px;">
                💡 لمنتج الرصيد السوري: أدخل السعر هنا لكنه سيُتجاهل — السعر يُحسب من سعر الصرف
            </small>
        </div>
        <div class="form-group" id="quantityField"><label>الكمية الأساسية</label><input type="number" id="productQuantity" value="0"></div>
        <div class="form-group">
            <label id="maxQtyLabel">الحد الأقصى للكمية للطلب الواحد</label>
            <input type="number" id="productMaxQuantity" value="0" min="0" placeholder="0">
            <small style="color:var(--text-secondary);font-size:0.75rem;display:block;margin-top:6px;line-height:1.5;">
                💡 0 = بلا حد أقصى
            </small>
        </div>
        <div class="form-group">
            <label>نوع الحقل المخصص</label>
            <select id="productInputType">
                <option value="id">معرف اللاعب (ID)</option>
                <option value="account_id">ID الحساب</option>
                <option value="phone">رقم الهاتف</option>
                <option value="none">بدون</option>
            </select>
        </div>
        <div class="form-group">
            <label>صورة المنتج</label>
            <div class="image-preview" id="productImagePreview">لا صورة</div>
            <input type="file" id="productImage" accept="image/*" onchange="previewImage(this,'productImagePreview')">
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="btn-primary" onclick="saveProduct(this)">حفظ</button>
            <button class="btn-outline" onclick="closeModal()">إلغاء</button>
        </div>
    `;
    openModal('إضافة منتج', body);
}

function toggleProductTypeFields() {
    const type = document.getElementById('productType').value;
    const qf = document.getElementById('quantityField');
    const priceLabel = document.getElementById('priceLabel');
    const priceHelp = document.getElementById('priceHelp');
    const maxQtyLabel = document.getElementById('maxQtyLabel');

    if (qf) qf.style.display = type === 'bundle' ? 'none' : 'block';

    if (type === 'topup') {
        if (priceLabel) priceLabel.textContent = 'سعر الليرة الواحدة بالدولار (تلقائي)';
        if (priceHelp) priceHelp.style.display = 'block';
        if (maxQtyLabel) maxQtyLabel.textContent = 'الحد الأقصى للمبلغ بالليرة السورية';
    } else {
        if (priceLabel) priceLabel.textContent = 'السعر الأساسي (دولار)';
        if (priceHelp) priceHelp.style.display = 'none';
        if (maxQtyLabel) maxQtyLabel.textContent = 'الحد الأقصى للكمية للطلب الواحد';
    }
}

async function saveProduct(btn) {
    const name = document.getElementById('productName').value;
    const categoryId = parseInt(document.getElementById('productCategoryId').value);
    const type = document.getElementById('productType').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const inputType = document.getElementById('productInputType').value;
    const maxQuantity = parseInt(document.getElementById('productMaxQuantity').value) || 0;
    let baseQuantity = 0;
    if (type !== 'bundle') baseQuantity = parseInt(document.getElementById('productQuantity').value);
    if (!name || !categoryId) { showToast('أدخل البيانات المطلوبة', 'warning'); return; }
    const imageFile = document.getElementById('productImage').files[0];
    let image = '';
    if (imageFile) image = await fileToSquareBase64(imageFile, 512);

    if (btn) { btn.disabled = true; btn.textContent = 'جارٍ الحفظ...'; }
    try {
        await createProduct({
            name, category_id: categoryId, product_type: type,
            base_price: price, base_quantity: baseQuantity,
            input_type: inputType, max_quantity: maxQuantity, image
        });
        closeModal();
        await loadAllData();
        filterProducts();
        showToast('تم إضافة المنتج بنجاح', 'success');
    } catch (error) {
        showToast(`فشل إضافة المنتج: ${error.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'حفظ'; }
    }
}

// ============================================================
// ============ Edit Product Modal ============
// ============================================================
function openEditProductModal(productId) {
    const prod = productsData.find(p => p.id === productId);
    if (!prod) { showToast('المنتج غير موجود', 'error'); return; }

    const isTopup = prod.product_type === 'topup';

    const body = `
        <h3 style="margin-bottom:14px;">تعديل المنتج</h3>
        <div style="background:var(--primary-light);padding:10px 14px;border-radius:12px;margin-bottom:14px;text-align:center;">
            <div style="font-weight:700;font-size:1.1rem;">${prod.name}</div>
            <div style="color:var(--text-secondary);font-size:0.8rem;">ID: ${prod.id}</div>
        </div>

        <div class="form-group">
            <label>اسم المنتج</label>
            <input type="text" id="editProductName" value="${prod.name || ''}">
        </div>

        <div class="form-group">
            <label>الوصف</label>
            <textarea id="editProductDescription" rows="2">${prod.description || ''}</textarea>
        </div>

        <div class="form-group">
            <label>القسم</label>
            <select id="editProductCategoryId">
                ${categoriesData.map(c => `<option value="${c.id}" ${c.id === prod.category_id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
        </div>

        <div class="form-group">
            <label>نوع المنتج</label>
            <select id="editProductType">
                <option value="quantity" ${prod.product_type === 'quantity' ? 'selected' : ''}>كمية</option>
                <option value="bundle" ${prod.product_type === 'bundle' ? 'selected' : ''}>باقة</option>
                <option value="topup" ${prod.product_type === 'topup' ? 'selected' : ''}>رصيد سوري</option>
            </select>
        </div>

        ${!isTopup ? `
        <div class="edit-modal-grid">
            <div class="form-group">
                <label>السعر الأساسي ($)</label>
                <input type="number" id="editProductPrice" value="${prod.base_price || 0}" step="0.01" min="0">
            </div>
            <div class="form-group">
                <label>الكمية الأساسية</label>
                <input type="number" id="editProductQuantity" value="${prod.base_quantity || 0}" min="0">
            </div>
        </div>
        ` : `
        <div class="form-group">
            <label>السعر بالليرة السورية</label>
            <input type="number" id="editProductPrice" value="${prod.base_price || 0}" step="1" min="0">
            <small style="color:var(--warning);font-size:0.75rem;display:block;margin-top:4px;">💡 السعر يُدخل بالليرة السورية</small>
        </div>
        <input type="hidden" id="editProductQuantity" value="0">
        `}

        <div class="edit-modal-grid">
            <div class="form-group">
                <label>${isTopup ? 'الحد الأقصى (ل.س)' : 'الحد الأقصى للطلب'}</label>
                <input type="number" id="editProductMaxQuantity" value="${prod.max_quantity || 0}" min="0">
                <small style="color:var(--text-secondary);font-size:0.7rem;display:block;margin-top:4px;">0 = بلا حد</small>
            </div>
            <div class="form-group">
                <label>المخزون</label>
                <input type="number" id="editProductStock" value="${prod.stock || 0}" min="0">
            </div>
        </div>

        <div class="form-group">
            <label>نوع الحقل المخصص</label>
            <select id="editProductInputType">
                <option value="id" ${prod.input_type === 'id' ? 'selected' : ''}>معرف اللاعب (ID)</option>
                <option value="account_id" ${prod.input_type === 'account_id' ? 'selected' : ''}>ID الحساب</option>
                <option value="phone" ${prod.input_type === 'phone' ? 'selected' : ''}>رقم الهاتف</option>
                <option value="none" ${prod.input_type === 'none' ? 'selected' : ''}>بدون</option>
            </select>
        </div>

        <div class="form-group">
            <label>تغيير الصورة (اختياري)</label>
            <div class="image-preview" id="editProductImagePreview">
                ${prod.image ? `<img src="${prod.image}" alt="${prod.name}">` : 'لا صورة'}
            </div>
            <input type="file" id="editProductImage" accept="image/*" onchange="previewImage(this,'editProductImagePreview')">
        </div>

        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
            <button class="btn-primary" onclick="saveEditedProduct(${productId}, this)">حفظ التعديلات</button>
            <button class="btn-outline" onclick="closeModal()">إلغاء</button>
        </div>
    `;
    openModal('تعديل المنتج', body);
}

async function saveEditedProduct(productId, btn) {
    const name = document.getElementById('editProductName').value;
    const description = document.getElementById('editProductDescription').value;
    const categoryId = parseInt(document.getElementById('editProductCategoryId').value);
    const price = parseFloat(document.getElementById('editProductPrice').value);
    const quantity = parseInt(document.getElementById('editProductQuantity').value) || 0;
    const maxQuantity = parseInt(document.getElementById('editProductMaxQuantity').value) || 0;
    const stock = parseInt(document.getElementById('editProductStock').value) || 0;
    const inputType = document.getElementById('editProductInputType').value;
    const productType = document.getElementById('editProductType').value;

    if (!name || !name.trim()) { showToast('أدخل اسم المنتج', 'warning'); return; }
    if (isNaN(price) || price < 0) { showToast('أدخل سعراً صحيحاً', 'warning'); return; }

    const data = {
        name: name.trim(),
        description: description,
        category_id: categoryId,
        base_price: price,
        base_quantity: quantity,
        max_quantity: maxQuantity,
        stock: stock,
        input_type: inputType,
        product_type: productType,
    };

    const imageFile = document.getElementById('editProductImage').files[0];
    if (imageFile) {
        data.image = await fileToSquareBase64(imageFile, 512);
    }

    if (btn) { btn.disabled = true; btn.textContent = 'جارٍ الحفظ...'; }
    try {
        await updateProduct(productId, data);
        closeModal();
        await loadAllData();
        filterProducts();
        showToast('تم تعديل المنتج بنجاح', 'success');
    } catch (error) {
        showToast(`فشل تعديل المنتج: ${error.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'حفظ التعديلات'; }
    }
}

async function archiveProductHandler(productId) {
    const confirmed = await showConfirm({
        title: 'أرشفة المنتج',
        message: 'سيتم نقل المنتج إلى الأرشيف. يمكن استرجاعه لاحقاً.',
        confirmText: 'أرشفة',
        type: 'danger'
    });
    if (!confirmed) return;
    try {
        const result = await deleteProduct(productId);
        await loadAllData();
        filterProducts();
        showToast(result.message || 'تم أرشفة المنتج', 'success');
    } catch (error) {
        showToast(`فشل أرشفة المنتج: ${error.message}`, 'error');
    }
}
// ============================================================
// ============ Archive Section ============
// ============================================================
function renderArchive() {
    const catsCount = archiveData.categories?.length || 0;
    const prodsCount = archiveData.products?.length || 0;

    const catsCountEl = document.getElementById('archiveCatsCount');
    const prodsCountEl = document.getElementById('archiveProdsCount');
    if (catsCountEl) catsCountEl.textContent = catsCount;
    if (prodsCountEl) prodsCountEl.textContent = prodsCount;

    renderArchiveCats();
    renderArchiveProds();
}

function switchArchiveTab(tab) {
    currentArchiveTab = tab;
    document.querySelectorAll('.archive-tab').forEach(t => {
        t.classList.toggle('active', t.getAttribute('data-tab') === tab);
    });
    const catsContainer = document.getElementById('archiveCatsContainer');
    const prodsContainer = document.getElementById('archiveProdsContainer');
    if (catsContainer) catsContainer.style.display = tab === 'cats' ? 'block' : 'none';
    if (prodsContainer) prodsContainer.style.display = tab === 'prods' ? 'block' : 'none';
}

function renderArchiveCats() {
    const container = document.getElementById('archiveCatsList');
    if (!container) return;
    const cats = archiveData.categories || [];
    if (!cats.length) {
        container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><span class="material-icons">inventory</span>لا توجد أقسام مؤرشفة</div>';
        return;
    }
    container.innerHTML = cats.map(cat => `
        <div class="category-card" style="opacity:0.85;">
            <div class="card-icon">${cat.image ? `<img src="${cat.image}" alt="${cat.name}">` : '📁'}</div>
            <div class="card-title">${cat.name}</div>
            <div style="font-size:0.7rem;color:var(--error);font-weight:700;margin-top:2px;">مؤرشف</div>
            <div class="card-actions">
                <button class="btn-success btn-sm" onclick="restoreCategoryHandler(${cat.id})">استرجاع</button>
            </div>
        </div>
    `).join('');
}

function renderArchiveProds() {
    const tbody = document.getElementById('archiveProdsList');
    if (!tbody) return;
    const prods = archiveData.products || [];
    if (!prods.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><span class="material-icons">inventory_2</span>لا توجد منتجات مؤرشفة</td></tr>';
        return;
    }
    tbody.innerHTML = prods.map(prod => `
        <tr style="opacity:0.85;">
            <td data-label="الصورة"><img src="${prod.image || ''}" alt="${prod.name}" onerror="this.style.display='none'" style="max-width:60px;max-height:60px;border-radius:8px;object-fit:cover;"></td>
            <td data-label="الاسم">${prod.name}</td>
            <td data-label="القسم">${prod.category_name || '-'}</td>
            <td data-label="السعر">${prod.base_price}${prod.product_type === 'topup' ? ' ل.س' : '$'}</td>
            <td data-label="الكمية">${prod.base_quantity}</td>
            <td data-label="إجراءات">
                <button class="btn-success btn-sm" onclick="restoreProductHandler(${prod.id})">استرجاع</button>
            </td>
        </tr>
    `).join('');
}

async function restoreCategoryHandler(catId) {
    const confirmed = await showConfirm({
        title: 'استرجاع القسم',
        message: 'سيتم استرجاع القسم وجميع منتجاته إلى القائمة الرئيسية.',
        confirmText: 'استرجاع',
        type: 'success'
    });
    if (!confirmed) return;
    try {
        const result = await restoreCategory(catId);
        await loadAllData();
        renderArchive();
        showToast(result.message || 'تم استرجاع القسم', 'success');
    } catch (error) {
        showToast(`فشل الاسترجاع: ${error.message}`, 'error');
    }
}

async function restoreProductHandler(prodId) {
    const confirmed = await showConfirm({
        title: 'استرجاع المنتج',
        message: 'سيتم استرجاع المنتج إلى قائمة المنتجات الرئيسية.',
        confirmText: 'استرجاع',
        type: 'success'
    });
    if (!confirmed) return;
    try {
        const result = await restoreProduct(prodId);
        await loadAllData();
        renderArchive();
        showToast(result.message || 'تم استرجاع المنتج', 'success');
    } catch (error) {
        showToast(`فشل الاسترجاع: ${error.message}`, 'error');
    }
}

async function loadArchive() {
    try {
        archiveData = await fetchArchive();
        renderArchive();
        updateNavBadges();
    } catch (error) {
        showToast(`فشل تحميل الأرشيف: ${error.message}`, 'error');
    }
}

// ============================================================
// ============ Payment Methods ============
// ============================================================
function renderPaymentMethods() {
    const container = document.getElementById('paymentMethodsList');
    if (!container) return;
    if (!paymentMethodsData.length) {
        container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><span class="material-icons">payment</span>لا توجد طرق دفع</div>';
        return;
    }
    container.innerHTML = paymentMethodsData.map(m => `
        <div class="payment-card">
            <div class="card-icon">${m.icon && m.icon.length > 100 ? `<img src="${m.icon}" alt="${m.name}">` : '💳'}</div>
            <div class="card-title">${m.name}</div>
            <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:4px;">${m.description || ''}</div>
            ${m.requires_kyc ? '<div style="font-size:0.7rem;color:var(--warning);font-weight:700;margin-top:4px;">🔒 تتطلب توثيق</div>' : ''}
            <div class="card-actions">
                <button class="btn-danger btn-sm" onclick="deletePaymentMethodHandler(${m.id})">حذف</button>
            </div>
        </div>
    `).join('');
}

function openPaymentMethodModal() {
    const body = `
        <h3 style="margin-bottom:14px;">إضافة طريقة دفع</h3>
        <div class="form-group"><label>اسم طريقة الدفع</label><input type="text" id="paymentName"></div>
        <div class="form-group"><label>اسم الحساب</label><input type="text" id="paymentAccountName"></div>
        <div class="form-group"><label>رقم الحساب</label><input type="text" id="paymentAccount"></div>

        <div class="form-group">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;background:var(--primary-light);padding:12px;border-radius:12px;">
                <input type="checkbox" id="paymentRequiresKyc" style="width:20px;height:20px;cursor:pointer;">
                <span style="font-weight:600;">🔒 تتطلب هذه الطريقة توثيق الحساب</span>
            </label>
            <small style="color:var(--text-secondary);font-size:0.75rem;display:block;margin-top:6px;line-height:1.5;">
                💡 المستخدمون غير الموثقين لن يستطيعوا استخدامها
            </small>
        </div>

        <div class="form-group">
            <label>صورة QR</label>
            <div class="image-preview" id="paymentQRPreview">لا صورة</div>
            <input type="file" id="paymentQR" accept="image/*" onchange="previewImage(this,'paymentQRPreview')">
        </div>
        <div class="form-group">
            <label>لوجو الطريقة</label>
            <div class="image-preview" id="paymentLogoPreview">لا صورة</div>
            <input type="file" id="paymentLogo" accept="image/*" onchange="previewImage(this,'paymentLogoPreview')">
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="btn-primary" onclick="savePaymentMethod(this)">حفظ</button>
            <button class="btn-outline" onclick="closeModal()">إلغاء</button>
        </div>
    `;
    openModal('إضافة طريقة دفع', body);
}

async function savePaymentMethod(btn) {
    const name = document.getElementById('paymentName').value;
    const account_name = document.getElementById('paymentAccountName').value;
    const account = document.getElementById('paymentAccount').value;
    const requires_kyc = document.getElementById('paymentRequiresKyc').checked;
    if (!name) { showToast('أدخل اسم الطريقة', 'warning'); return; }
    const qrFile = document.getElementById('paymentQR').files[0];
    const logoFile = document.getElementById('paymentLogo').files[0];
    let qr_image = '';
    let logo_image = '';
    if (qrFile) qr_image = await fileToBase64(qrFile, 512);
    if (logoFile) logo_image = await fileToSquareBase64(logoFile, 512);

    if (btn) { btn.disabled = true; btn.textContent = 'جارٍ الحفظ...'; }
    try {
        await createPaymentMethod({
            name, description: '', account_name, account,
            icon: logo_image, qr_image, requires_kyc, is_active: true
        });
        closeModal();
        await loadAllData();
        renderPaymentMethods();
        showToast('تم إضافة طريقة الدفع بنجاح', 'success');
    } catch (error) {
        showToast(`فشل إضافة طريقة الدفع: ${error.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'حفظ'; }
    }
}

async function deletePaymentMethodHandler(methodId) {
    const confirmed = await showConfirm({
        title: 'حذف طريقة الدفع',
        message: 'هل أنت متأكد من حذف طريقة الدفع؟',
        confirmText: 'حذف',
        type: 'danger'
    });
    if (!confirmed) return;
    try {
        await deletePaymentMethod(methodId);
        await loadAllData();
        renderPaymentMethods();
        showToast('تم حذف طريقة الدفع', 'success');
    } catch (error) {
        showToast(`فشل حذف طريقة الدفع: ${error.message}`, 'error');
    }
}

// ============================================================
// ============ Orders ============
// ============================================================
function renderOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    if (!orders || !orders.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><span class="material-icons">receipt_long</span>لا توجد طلبات</td></tr>';
        return;
    }
    tbody.innerHTML = orders.map(order => {
        let qtyDisplay = order.quantity.toLocaleString('ar');
        if (order.product_type === 'topup') {
            qtyDisplay = `${order.quantity.toLocaleString('ar')} ل.س`;
        }
        return `
        <tr>
            <td data-label="رقم الطلب"><span class="ltr">${order.order_number}</span></td>
            <td data-label="المنتج">${order.product_name || order.product_id}</td>
            <td data-label="الكمية">${qtyDisplay}</td>
            <td data-label="السعر">${order.total_price}$</td>
            <td data-label="الحالة">
                <select onchange="changeOrderStatus(${order.id}, this.value)">
                    <option value="pending" ${order.status==='pending'?'selected':''}>قيد المعالجة</option>
                    <option value="review" ${order.status==='review'?'selected':''}>قيد المراجعة</option>
                    <option value="processing" ${order.status==='processing'?'selected':''}>قيد التنفيذ</option>
                    <option value="completed" ${order.status==='completed'?'selected':''}>مكتمل</option>
                    <option value="failed" ${order.status==='failed'?'selected':''}>فشل</option>
                    <option value="cancelled" ${order.status==='cancelled'?'selected':''}>ملغي</option>
                </select>
            </td>
            <td data-label="إجراءات"><button class="btn-outline btn-sm" onclick="viewOrderDetails(${order.id})">عرض</button></td>
        </tr>
    `}).join('');
}

async function changeOrderStatus(orderId, status) {
    const confirmed = await showConfirm({
        title: 'تغيير حالة الطلب',
        message: `هل أنت متأكد من تغيير حالة الطلب إلى "${getStatusArabic(status)}"؟`,
        confirmText: 'تأكيد',
        type: 'warning'
    });
    if (!confirmed) { renderOrders(filteredOrders.length ? filteredOrders : ordersData); return; }
    try {
        await updateOrderStatus(orderId, status);
        await loadAllData();
        filteredOrders = [...ordersData];
        renderOrders(ordersData);
        showToast('تم تحديث حالة الطلب', 'success');
    } catch (error) {
        showToast(`فشل تغيير حالة الطلب: ${error.message}`, 'error');
        renderOrders(filteredOrders.length ? filteredOrders : ordersData);
    }
}

function viewOrderDetails(orderId) {
    const order = ordersData.find(o => o.id === orderId);
    if (!order) return;
    let deliveryInfo = '';
    try {
        const delivery = JSON.parse(order.delivery_data || '{}');
        if (delivery.player_id) deliveryInfo += `<div style="margin-bottom:6px;"><strong>معرف اللاعب:</strong> <span class="ltr">${delivery.player_id}</span></div>`;
        if (delivery.account_id) deliveryInfo += `<div style="margin-bottom:6px;"><strong>ID الحساب:</strong> <span class="ltr">${delivery.account_id}</span></div>`;
        if (delivery.phone) deliveryInfo += `<div style="margin-bottom:6px;"><strong>رقم الهاتف:</strong> <span class="ltr">${delivery.phone}</span></div>`;
        if (delivery.bundle_name) deliveryInfo += `<div style="margin-bottom:6px;"><strong>الباقة:</strong> ${delivery.bundle_name}</div>`;
        if (delivery.syp_amount) deliveryInfo += `<div style="margin-bottom:6px;"><strong>المبلغ بالليرة السورية:</strong> ${delivery.syp_amount.toLocaleString('ar')} ل.س</div>`;
        if (delivery.syp_rate) deliveryInfo += `<div style="margin-bottom:6px;"><strong>سعر الصرف:</strong> ${delivery.syp_rate} ل.س / $</div>`;
    } catch (e) {
        deliveryInfo = `<div>${order.delivery_data || '-'}</div>`;
    }
    const body = `
        <div style="text-align:right;">
            <h3>تفاصيل الطلب</h3>
            <p><strong>رقم الطلب:</strong> <span class="ltr">${order.order_number}</span></p>
            <p><strong>المنتج:</strong> ${order.product_name || order.product_id}</p>
            <p><strong>الكمية:</strong> ${order.quantity.toLocaleString('ar')}</p>
            <p><strong>السعر الإجمالي:</strong> ${order.total_price}$</p>
            ${order.discount_amount ? `<p><strong>الخصم:</strong> ${order.discount_amount}$ (${order.coupon_code || ''})</p>` : ''}
            <p><strong>الحالة:</strong> ${getStatusArabic(order.status)}</p>
            ${deliveryInfo}
            <p><strong>التاريخ:</strong> ${order.created_at ? new Date(order.created_at).toLocaleString('ar') : ''}</p>
        </div>
    `;
    openModal('تفاصيل الطلب', body);
}

// ============================================================
// ============ Deposits ============
// ============================================================
function renderDeposits(deposits) {
    const tbody = document.getElementById('depositsTableBody');
    if (!tbody) return;
    if (!deposits.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><span class="material-icons">account_balance_wallet</span>لا توجد إيداعات</td></tr>';
        return;
    }
    tbody.innerHTML = deposits.map(d => `
        <tr>
            <td data-label="رقم العملية"><span class="ltr">${d.transaction_id}</span></td>
            <td data-label="المستخدم">${d.user_id}</td>
            <td data-label="المبلغ">${d.amount}$</td>
            <td data-label="الطريقة">${d.method}</td>
            <td data-label="الحالة"><span class="status-badge ${d.status === 'approved' ? 'completed' : d.status === 'rejected' ? 'failed' : 'pending'}">${d.status === 'approved' ? 'مقبول' : d.status === 'rejected' ? 'مرفوض' : 'معلق'}</span></td>
            <td data-label="إجراءات">
                ${d.status === 'pending' ? `
                    <button class="btn-success btn-sm" onclick="approveDepositHandler(${d.id})">قبول</button>
                    <button class="btn-danger btn-sm" onclick="rejectDepositHandler(${d.id})">رفض</button>
                ` : (d.admin_note ? `<small>${d.admin_note}</small>` : '-')}
            </td>
        </tr>
    `).join('');
}

async function approveDepositHandler(depositId) {
    const confirmed = await showConfirm({
        title: 'اعتماد الإيداع',
        message: 'هل أنت متأكد من اعتماد هذا الإيداع؟ سيتم إضافة المبلغ إلى رصيد المستخدم.',
        confirmText: 'اعتماد',
        type: 'success'
    });
    if (!confirmed) return;
    try {
        const result = await approveDeposit(depositId);
        await loadAllData();
        renderDeposits(depositsData);
        if (result.paid_debt > 0) {
            showToast(`تم اعتماد الإيداع (سداد دين: $${result.paid_debt})`, 'success');
        } else {
            showToast('تم اعتماد الإيداع بنجاح', 'success');
        }
    } catch (error) {
        showToast(`فشل اعتماد الإيداع: ${error.message}`, 'error');
    }
}

async function rejectDepositHandler(depositId) {
    const confirmed = await showConfirm({
        title: 'رفض الإيداع',
        message: 'هل أنت متأكد من رفض هذا الإيداع؟',
        confirmText: 'رفض',
        type: 'danger'
    });
    if (!confirmed) return;
    try {
        await rejectDeposit(depositId);
        await loadAllData();
        renderDeposits(depositsData);
        showToast('تم رفض الإيداع', 'warning');
    } catch (error) {
        showToast(`فشل رفض الإيداع: ${error.message}`, 'error');
    }
}

// ============================================================
// ============ KYC ============
// ============================================================
function renderKYC() {
    const tbody = document.getElementById('kycTableBody');
    if (!tbody) return;
    if (!kycData.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><span class="material-icons">verified_user</span>لا توجد طلبات توثيق</td></tr>';
        return;
    }
    tbody.innerHTML = kycData.map(k => `
        <tr>
            <td data-label="المستخدم">${k.user_id}</td>
            <td data-label="الاسم">${k.full_name}</td>
            <td data-label="الهاتف"><span class="ltr">${k.phone}</span></td>
            <td data-label="العنوان">${k.address || '-'}</td>
            <td data-label="الصورة">${k.selfie_image ? `<button class="btn-outline btn-sm" onclick="viewKYCImage(${k.id})">عرض</button>` : '-'}</td>
            <td data-label="الحالة"><span class="status-badge ${k.status === 'approved' ? 'completed' : k.status === 'rejected' ? 'failed' : 'pending'}">${k.status === 'approved' ? 'مقبول' : k.status === 'rejected' ? 'مرفوض' : 'معلق'}</span></td>
            <td data-label="إجراءات">
                ${k.status === 'pending' ? `
                    <button class="btn-success btn-sm" onclick="window.approveKYCRequest(${k.id})">قبول</button>
                    <button class="btn-danger btn-sm" onclick="window.rejectKYCRequest(${k.id})">رفض</button>
                ` : '-'}
            </td>
        </tr>
    `).join('');
}

function viewKYCImage(kycId) {
    const kyc = kycData.find(k => k.id === kycId);
    if (!kyc) return;
    const body = `
        <div style="text-align:center;">
            <h3 style="margin-bottom:16px;">تفاصيل طلب التوثيق</h3>
            <div style="text-align:right;background:var(--primary-light);padding:14px;border-radius:12px;margin-bottom:16px;">
                <div style="margin-bottom:8px;"><strong>الاسم:</strong> ${kyc.full_name}</div>
                <div style="margin-bottom:8px;"><strong>الهاتف:</strong> <span class="ltr">${kyc.phone}</span></div>
                <div style="margin-bottom:8px;"><strong>العنوان:</strong> ${kyc.address || '-'}</div>
                <div><strong>الحالة:</strong> <span class="status-badge ${kyc.status === 'approved' ? 'completed' : kyc.status === 'rejected' ? 'failed' : 'pending'}">${kyc.status === 'approved' ? 'مقبول' : kyc.status === 'rejected' ? 'مرفوض' : 'معلق'}</span></div>
            </div>
            <div style="margin-bottom:8px;text-align:right;font-weight:700;">صورة السيلفي:</div>
            <div style="background:var(--background);border-radius:12px;padding:8px;max-height:60vh;overflow:auto;">
                <img src="${kyc.selfie_image}" style="width:100%;height:auto;border-radius:8px;display:block;" alt="KYC Selfie">
            </div>
            ${kyc.status === 'pending' ? `
                <div style="display:flex;gap:8px;margin-top:16px;">
                    <button class="btn-primary" style="flex:1;" onclick="closeModal(); window.approveKYCRequest(${kyc.id})">قبول التوثيق</button>
                    <button class="btn-danger" style="flex:1;" onclick="closeModal(); window.rejectKYCRequest(${kyc.id})">رفض</button>
                </div>
            ` : ''}
            <button class="btn-outline" style="width:100%;margin-top:12px;" onclick="closeModal()">إغلاق</button>
        </div>
    `;
    openModal('طلب التوثيق', body);
}

window.approveKYCRequest = async function(kycId) {
    const confirmed = await showConfirm({
        title: 'قبول التوثيق',
        message: 'هل أنت متأكد من قبول طلب التوثيق؟',
        confirmText: 'قبول',
        type: 'success'
    });
    if (!confirmed) return;
    try {
        await approveKYCRequest(kycId);
        await loadAllData();
        renderKYC();
        showToast('تم قبول التوثيق بنجاح', 'success');
    } catch (error) {
        showToast(`فشل القبول: ${error.message}`, 'error');
    }
};

window.rejectKYCRequest = async function(kycId) {
    const confirmed = await showConfirm({
        title: 'رفض التوثيق',
        message: 'هل أنت متأكد من رفض طلب التوثيق؟',
        confirmText: 'رفض',
        type: 'danger'
    });
    if (!confirmed) return;
    try {
        await rejectKYCRequest(kycId);
        await loadAllData();
        renderKYC();
        showToast('تم رفض التوثيق', 'warning');
    } catch (error) {
        showToast(`فشل الرفض: ${error.message}`, 'error');
    }
};

// ============================================================
// ============ Service Requests ============
// ============================================================
function renderServiceRequests() {
    const tbody = document.getElementById('serviceRequestsTableBody');
    if (!tbody) return;
    if (!serviceRequestsData.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><span class="material-icons">build</span>لا توجد طلبات خدمة</td></tr>';
        return;
    }
    tbody.innerHTML = serviceRequestsData.map(r => `
        <tr>
            <td data-label="المستخدم">${r.user_id}</td>
            <td data-label="الخدمة">${r.service_name}</td>
            <td data-label="الوصف">${r.description || '-'}</td>
            <td data-label="السعر">${r.estimated_price ? r.estimated_price + '$' : '-'}</td>
            <td data-label="الحالة"><span class="status-badge ${r.status === 'pending' ? 'pending' : r.status === 'completed' ? 'completed' : 'failed'}">${r.status === 'pending' ? 'معلق' : r.status === 'completed' ? 'مكتمل' : 'فشل'}</span></td>
            <td data-label="إجراءات"><button class="btn-outline btn-sm" onclick="viewServiceRequest(${r.id})">عرض</button></td>
        </tr>
    `).join('');
}

function viewServiceRequest(reqId) {
    const req = serviceRequestsData.find(r => r.id === reqId);
    if (!req) return;
    const body = `
        <div style="text-align:right;">
            <h3>تفاصيل طلب الخدمة</h3>
            <p><strong>اسم الخدمة:</strong> ${req.service_name}</p>
            <p><strong>الوصف:</strong> ${req.description || '-'}</p>
            <p><strong>السعر المتوقع:</strong> ${req.estimated_price ? req.estimated_price + '$' : '-'}</p>
            <p><strong>الحالة:</strong> ${req.status}</p>
            <p><strong>التاريخ:</strong> ${req.created_at ? new Date(req.created_at).toLocaleString('ar') : ''}</p>
        </div>
    `;
    openModal('تفاصيل طلب الخدمة', body);
}

// ============================================================
// ============ Coupons ============
// ============================================================
function renderCoupons() {
    const tbody = document.getElementById('couponsTableBody');
    if (!tbody) return;
    if (!couponsData.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><span class="material-icons">local_offer</span>لا توجد كودات خصم</td></tr>';
        return;
    }
    tbody.innerHTML = couponsData.map(c => {
        const typeLabel = c.discount_type === 'percentage' ? `${c.discount_value}%` : `${c.discount_value}$`;
        const expiry = c.expires_at ? new Date(c.expires_at).toLocaleDateString('ar') : 'بلا نهاية';
        return `
            <tr>
                <td data-label="الكود"><strong class="ltr">${c.code}</strong></td>
                <td data-label="النوع">${c.discount_type === 'percentage' ? 'نسبة' : 'مبلغ'}</td>
                <td data-label="القيمة">${typeLabel}</td>
                <td data-label="الحد الأدنى">${c.min_amount || 0}$</td>
                <td data-label="الاستخدامات">${c.used_count || 0} / ${c.max_uses || '∞'}</td>
                <td data-label="الصلاحية">${expiry}</td>
                <td data-label="الحالة"><span class="status-badge ${c.is_active ? 'completed' : 'failed'}">${c.is_active ? 'مفعّل' : 'معطّل'}</span></td>
                <td data-label="إجراءات">
                    <button class="btn-outline btn-sm" onclick="toggleCoupon(${c.id}, ${c.is_active})">${c.is_active ? 'تعطيل' : 'تفعيل'}</button>
                    <button class="btn-danger btn-sm" onclick="deleteCouponHandler(${c.id})">حذف</button>
                </td>
            </tr>
        `;
    }).join('');
}

function openCouponModal() {
    const body = `
        <h3 style="margin-bottom:14px;">إضافة كود خصم</h3>
        <div class="form-group"><label>الكود</label><input type="text" id="couponCode" placeholder="مثال: WELCOME10"></div>
        <div class="form-group"><label>الوصف (اختياري)</label><input type="text" id="couponDescription" placeholder="مثال: خصم ترحيبي"></div>
        <div class="form-group">
            <label>نوع الخصم</label>
            <select id="couponType">
                <option value="percentage">نسبة مئوية (%)</option>
                <option value="fixed">مبلغ ثابت ($)</option>
            </select>
        </div>
        <div class="form-group"><label>قيمة الخصم</label><input type="number" id="couponValue" value="10" step="0.01"></div>
        <div class="form-group"><label>الحد الأدنى للطلب ($)</label><input type="number" id="couponMinAmount" value="0" step="0.01"></div>
        <div class="form-group"><label>أقصى مبلغ خصم ($) - 0 = بلا حد</label><input type="number" id="couponMaxDiscount" value="0" step="0.01"></div>
        <div class="form-group"><label>عدد الاستخدامات - 0 = بلا حد</label><input type="number" id="couponMaxUses" value="0"></div>
        <div class="form-group"><label>تاريخ الانتهاء (اختياري)</label><input type="date" id="couponExpiry"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="btn-primary" onclick="saveCoupon(this)">حفظ</button>
            <button class="btn-outline" onclick="closeModal()">إلغاء</button>
        </div>
    `;
    openModal('إضافة كود خصم', body);
}

async function saveCoupon(btn) {
    const code = document.getElementById('couponCode').value.trim().toUpperCase();
    const description = document.getElementById('couponDescription').value;
    const discount_type = document.getElementById('couponType').value;
    const discount_value = parseFloat(document.getElementById('couponValue').value);
    const min_amount = parseFloat(document.getElementById('couponMinAmount').value) || 0;
    const max_discount = parseFloat(document.getElementById('couponMaxDiscount').value) || 0;
    const max_uses = parseInt(document.getElementById('couponMaxUses').value) || 0;
    const expiryDate = document.getElementById('couponExpiry').value;

    if (!code) { showToast('أدخل الكود', 'warning'); return; }
    if (!discount_value || discount_value <= 0) { showToast('أدخل قيمة خصم صحيحة', 'warning'); return; }

    const couponData = {
        code, description, discount_type, discount_value,
        min_amount, max_discount, max_uses, is_active: true,
    };
    if (expiryDate) couponData.expires_at = new Date(expiryDate).toISOString();

    if (btn) { btn.disabled = true; btn.textContent = 'جارٍ الحفظ...'; }
    try {
        await createCoupon(couponData);
        closeModal();
        await loadAllData();
        renderCoupons();
        showToast('تم إضافة كود الخصم بنجاح', 'success');
    } catch (error) {
        showToast(`فشل إضافة الكود: ${error.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'حفظ'; }
    }
}

async function toggleCoupon(couponId, currentStatus) {
    try {
        await updateCoupon(couponId, { is_active: !currentStatus });
        await loadAllData();
        renderCoupons();
        showToast(!currentStatus ? 'تم تفعيل الكود' : 'تم تعطيل الكود', 'success');
    } catch (error) {
        showToast(`فشل تغيير حالة الكود: ${error.message}`, 'error');
    }
}

async function deleteCouponHandler(couponId) {
    const confirmed = await showConfirm({
        title: 'حذف كود الخصم',
        message: 'هل أنت متأكد من حذف هذا الكود؟',
        confirmText: 'حذف',
        type: 'danger'
    });
    if (!confirmed) return;
    try {
        await deleteCoupon(couponId);
        await loadAllData();
        renderCoupons();
        showToast('تم حذف الكود', 'success');
    } catch (error) {
        showToast(`فشل حذف الكود: ${error.message}`, 'error');
    }
}

// ============================================================
// ============ Referrals ============
// ============================================================
async function loadReferrals() {
    const tbody = document.getElementById('referralsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">جار التحميل...</td></tr>';
    try {
        referralsData = await fetchAdminReferrals();
        if (!referralsData.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><span class="material-icons">card_giftcard</span>لا توجد إحالات</td></tr>';
            return;
        }
        tbody.innerHTML = referralsData.map(r => `
            <tr>
                <td data-label="#">${r.id}</td>
                <td data-label="المُحيل"><span class="ltr">${r.referrer_telegram || r.referrer_id}</span></td>
                <td data-label="المُحال"><span class="ltr">${r.referred_telegram || r.referred_user_id}</span></td>
                <td data-label="المكافأة">${r.reward_amount}$</td>
                <td data-label="الحالة"><span class="status-badge ${r.status === 'completed' ? 'completed' : 'pending'}">${r.status === 'completed' ? 'مكتملة' : 'قيد الانتظار'}</span></td>
                <td data-label="التاريخ">${r.created_at ? new Date(r.created_at).toLocaleString('ar') : ''}</td>
            </tr>
        `).join('');
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">فشل التحميل: ${error.message}</td></tr>`;
    }
}

// ============================================================
// ============ Activities ============
// ============================================================
async function loadActivities() {
    const tbody = document.getElementById('activitiesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state">جار التحميل...</td></tr>';
    try {
        activitiesData = await fetchActivities();
        if (!activitiesData.length) {
            tbody.innerHTML = '<tr><td colspan="3" class="empty-state"><span class="material-icons">history</span>لا توجد نشاطات</td></tr>';
            return;
        }
        tbody.innerHTML = activitiesData.map(a => `
            <tr>
                <td data-label="#">${a.id}</td>
                <td data-label="النشاط">${a.action}</td>
                <td data-label="التاريخ">${a.created_at ? new Date(a.created_at).toLocaleString('ar') : ''}</td>
            </tr>
        `).join('');
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="3" class="empty-state">فشل تحميل النشاطات: ${error.message}</td></tr>`;
    }
}

// ============================================================
// ============ Audit Log ============
// ============================================================
async function loadAuditLog() {
    const tbody = document.getElementById('auditLogTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">جار التحميل...</td></tr>';
    try {
        auditLogData = await fetchAuditLog({ limit: 200 });
        filteredAuditLog = [...auditLogData];
        renderAuditLog();
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-state">فشل تحميل السجل: ${error.message}</td></tr>`;
    }
}

function filterAuditLog() {
    const userQuery = (document.getElementById('auditUserSearch')?.value || '').trim();
    const actionFilter = document.getElementById('auditActionFilter')?.value || '';

    let filtered = [...auditLogData];
    if (userQuery) {
        filtered = filtered.filter(l => (l.user_id + '').includes(userQuery));
    }
    if (actionFilter) {
        filtered = filtered.filter(l => l.action === actionFilter);
    }
    filteredAuditLog = filtered;
    renderAuditLog();
}

function getActionArabic(action) {
    const map = {
        order_created: '🛒 شراء طلب',
        order_refund: '💸 استرداد طلب',
        order_cancelled: '❌ إلغاء طلب',
        deposit_approved: '✅ قبول إيداع',
        deposit_rejected: '🚫 رفض إيداع',
        admin_adjustment: '⚙️ تعديل رصيد',
        referral_reward: '🎁 مكافأة إحالة',
    };
    return map[action] || action;
}

function renderAuditLog() {
    const tbody = document.getElementById('auditLogTableBody');
    if (!tbody) return;
    if (!filteredAuditLog.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><span class="material-icons">fact_check</span>لا توجد سجلات</td></tr>';
        return;
    }
    tbody.innerHTML = filteredAuditLog.map(l => {
        const amountColor = l.amount > 0 ? 'var(--success)' : 'var(--error)';
        const amountSign = l.amount > 0 ? '+' : '';
        return `
            <tr>
                <td data-label="#">${l.id}</td>
                <td data-label="المستخدم"><span class="ltr">${l.user_id}</span></td>
                <td data-label="العملية">${getActionArabic(l.action)}</td>
                <td data-label="المبلغ" style="color:${amountColor};font-weight:800;direction:ltr;">${amountSign}${l.amount.toFixed(2)}$</td>
                <td data-label="الرصيد قبل" style="direction:ltr;">${l.balance_before.toFixed(2)}$</td>
                <td data-label="الرصيد بعد" style="direction:ltr;">${l.balance_after.toFixed(2)}$</td>
                <td data-label="IP"><span class="ltr" style="font-size:0.7rem;">${l.ip_address || '-'}</span></td>
                <td data-label="التاريخ" style="font-size:0.75rem;">${l.created_at ? new Date(l.created_at).toLocaleString('ar') : ''}</td>
            </tr>
        `;
    }).join('');
}

// ============================================================
// ============ Order Filters ============
// ============================================================
function applyOrderFilters() {
    const searchQuery = (document.getElementById('orderSearchQuery')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('orderStatusFilter')?.value || 'all';
    const fromDate = document.getElementById('orderFromDate')?.value;
    const toDate = document.getElementById('orderToDate')?.value;
    const sortFilter = document.getElementById('orderSortFilter')?.value || 'newest';

    let filtered = [...ordersData];

    if (searchQuery) {
        filtered = filtered.filter(o =>
            (o.order_number || '').toLowerCase().includes(searchQuery) ||
            (o.user_id + '').includes(searchQuery)
        );
    }
    if (statusFilter !== 'all') filtered = filtered.filter(o => o.status === statusFilter);
    if (fromDate) {
        const fromTime = new Date(fromDate).getTime();
        filtered = filtered.filter(o => o.created_at && new Date(o.created_at).getTime() >= fromTime);
    }
    if (toDate) {
        const toTime = new Date(toDate).getTime() + (24 * 60 * 60 * 1000);
        filtered = filtered.filter(o => o.created_at && new Date(o.created_at).getTime() <= toTime);
    }
    if (sortFilter === 'newest') filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    else if (sortFilter === 'oldest') filtered.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    else if (sortFilter === 'price_high') filtered.sort((a, b) => (b.total_price || 0) - (a.total_price || 0));
    else if (sortFilter === 'price_low') filtered.sort((a, b) => (a.total_price || 0) - (b.total_price || 0));

    filteredOrders = filtered;
    renderOrders(filtered);
}

function resetOrderFilters() {
    const ids = ['orderSearchQuery', 'orderFromDate', 'orderToDate'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const statusSelect = document.getElementById('orderStatusFilter');
    const sortSelect = document.getElementById('orderSortFilter');
    if (statusSelect) statusSelect.value = 'all';
    if (sortSelect) sortSelect.value = 'newest';
    filteredOrders = [...ordersData];
    renderOrders(ordersData);
}

// ============================================================
// ============ Excel Export ============
// ============================================================
function exportToExcel(filename, sheetName, rows) {
    try {
        if (typeof XLSX === 'undefined') {
            showToast('مكتبة Excel لم تُحمّل بعد', 'error');
            return;
        }
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const colWidths = [];
        const maxCols = Math.max(...rows.map(r => r.length));
        for (let i = 0; i < maxCols; i++) {
            let maxLen = 10;
            rows.forEach(row => {
                const cell = row[i] ? String(row[i]) : '';
                if (cell.length > maxLen) maxLen = Math.min(cell.length, 50);
            });
            colWidths.push({ wch: maxLen + 2 });
        }
        ws['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        const timestamp = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
        showToast('تم تصدير الملف بنجاح', 'success');
    } catch (error) {
        console.error('Excel export error:', error);
        showToast(`فشل التصدير: ${error.message}`, 'error');
    }
}

function exportUsersExcel() {
    if (!usersData.length) { showToast('لا يوجد مستخدمون للتصدير', 'warning'); return; }
    const rows = [['Telegram ID', 'الاسم', 'Username', 'الرصيد', 'الحالة', 'VIP', 'KYC', 'تاريخ التسجيل']];
    usersData.forEach(u => {
        rows.push([u.telegram_id, u.first_name || '', u.username || '', u.balance.toFixed(2),
            u.is_banned ? 'محظور' : 'نشط', u.vip_level > 0 ? 'VIP' + u.vip_level : '-',
            u.kyc_status, u.created_at ? new Date(u.created_at).toLocaleString('ar') : '']);
    });
    exportToExcel('users', 'المستخدمون', rows);
}

function exportOrdersExcel() {
    const dataToExport = filteredOrders.length ? filteredOrders : ordersData;
    if (!dataToExport.length) { showToast('لا توجد طلبات للتصدير', 'warning'); return; }
    const rows = [['رقم الطلب', 'معرف المستخدم', 'المنتج', 'الكمية', 'سعر الوحدة', 'الإجمالي', 'الخصم', 'الكوبون', 'الحالة', 'التاريخ']];
    dataToExport.forEach(o => {
        rows.push([o.order_number, o.user_id, o.product_name || o.product_id, o.quantity,
            o.unit_price || 0, o.total_price, o.discount_amount || 0, o.coupon_code || '-',
            getStatusArabic(o.status), o.created_at ? new Date(o.created_at).toLocaleString('ar') : '']);
    });
    exportToExcel('orders', 'الطلبات', rows);
}

function exportDepositsExcel() {
    if (!depositsData.length) { showToast('لا توجد إيداعات للتصدير', 'warning'); return; }
    const rows = [['رقم العملية', 'معرف المستخدم', 'المبلغ', 'العملة', 'الطريقة', 'الحالة', 'ملاحظة', 'التاريخ']];
    depositsData.forEach(d => {
        rows.push([d.transaction_id, d.user_id, d.amount, d.currency || 'USD', d.method,
            d.status === 'approved' ? 'مقبول' : d.status === 'rejected' ? 'مرفوض' : 'معلق',
            d.admin_note || '-', d.created_at ? new Date(d.created_at).toLocaleString('ar') : '']);
    });
    exportToExcel('deposits', 'الإيداعات', rows);
}

function exportReferralsExcel() {
    if (!referralsData || !referralsData.length) { showToast('لا توجد إحالات للتصدير', 'warning'); return; }
    const rows = [['#', 'المُحيل (Telegram)', 'المُحال (Telegram)', 'المكافأة', 'الحالة', 'التاريخ', 'تاريخ الإكمال']];
    referralsData.forEach(r => {
        rows.push([r.id, r.referrer_telegram || r.referrer_id, r.referred_telegram || r.referred_user_id,
            r.reward_amount, r.status === 'completed' ? 'مكتملة' : 'قيد الانتظار',
            r.created_at ? new Date(r.created_at).toLocaleString('ar') : '',
            r.completed_at ? new Date(r.completed_at).toLocaleString('ar') : '-']);
    });
    exportToExcel('referrals', 'الإحالات', rows);
}

// ============================================================
// ============ Notifications ============
// ============================================================
function sendAdminNotification() {
    const message = document.getElementById('notificationMessage').value;
    if (!message) { showToast('أدخل نص الإشعار', 'warning'); return; }
    const target = document.getElementById('notificationTarget').value;
    const type = document.getElementById('notificationType').value;
    const data = { target, title: 'إشعار من الإدارة', message, type };
    if (target === 'specific') {
        const uid = document.getElementById('notificationUserId').value;
        if (!uid) { showToast('أدخل معرف المستخدم', 'warning'); return; }
        data.user_id = uid;
    }
    sendNotification(data)
        .then(() => {
            showToast('تم إرسال الإشعار بنجاح', 'success');
            document.getElementById('notificationMessage').value = '';
        })
        .catch(error => showToast(`فشل الإرسال: ${error.message}`, 'error'));
}

// ============================================================
// ============ Settings ============
// ============================================================
function loadSettings() {
    if (!currentSettings) return;
    const storeNameEl = document.getElementById('storeName');
    const supportUrlEl = document.getElementById('supportUrl');
    const sypRateEl = document.getElementById('sypRate');

    if (storeNameEl) storeNameEl.value = currentSettings.store_name || 'SANAD+';
    if (supportUrlEl) supportUrlEl.value = currentSettings.support_url || 'https://t.me/SANADST';
    if (sypRateEl) sypRateEl.value = currentSettings.syp_rate || '132';

    updateSypPreview();

    if (sypRateEl && !sypRateEl.dataset.listenerAttached) {
        sypRateEl.addEventListener('input', updateSypPreview);
        sypRateEl.dataset.listenerAttached = '1';
    }
}

function updateSypPreview() {
    const rateEl = document.getElementById('sypRate');
    if (!rateEl) return;
    const rate = parseFloat(rateEl.value) || 132;

    const p1000 = document.getElementById('sypPreview1000');
    const p5000 = document.getElementById('sypPreview5000');
    const p10000 = document.getElementById('sypPreview10000');

    if (p1000) p1000.textContent = `${(1000 / rate).toFixed(2)}$`;
    if (p5000) p5000.textContent = `${(5000 / rate).toFixed(2)}$`;
    if (p10000) p10000.textContent = `${(10000 / rate).toFixed(2)}$`;
}

async function saveSettings() {
    const storeName = document.getElementById('storeName')?.value || 'SANAD+';
    const supportUrl = document.getElementById('supportUrl')?.value || '';
    const sypRate = parseFloat(document.getElementById('sypRate')?.value) || 132;

    if (sypRate <= 0) { showToast('سعر الصرف غير صحيح', 'warning'); return; }

    try {
        await saveAdminSettings({
            store_name: storeName,
            support_url: supportUrl,
            syp_rate: sypRate.toString(),
        });
        currentSettings.store_name = storeName;
        currentSettings.support_url = supportUrl;
        currentSettings.syp_rate = sypRate.toString();
        showToast('تم حفظ الإعدادات بنجاح', 'success');
    } catch (error) {
        showToast(`فشل الحفظ: ${error.message}`, 'error');
    }
}

// ============================================================
// ============ Modal ============
// ============================================================
function openModal(title, bodyHTML) {
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    document.body.style.overflow = '';
}

// ============================================================
// ============ Helpers ============
// ============================================================
function previewImage(input, previewId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            const el = document.getElementById(previewId);
            if (el) el.innerHTML = `<img src="${e.target.result}" alt="preview">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function fileToBase64(file, maxWidth = 512) {
    return new Promise((resolve, reject) => {
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
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function fileToSquareBase64(file, size = 512) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const minSide = Math.min(img.width, img.height);
                const sx = (img.width - minSide) / 2;
                const sy = (img.height - minSide) / 2;
                canvas.width = size;
                canvas.height = size;
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, size, size);
                ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}