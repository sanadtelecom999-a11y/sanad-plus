// ============================================================
// admin/js/admin.js — v14 (Part 1/3)
// ============================================================

// ============================================================
// ============ Global State ============
// ============================================================
let currentSection = 'dashboard';
let usersData = [];
let categoriesData = [];
let productsData = [];
let filteredProducts = [];
let paymentMethodsData = [];
let ordersData = [];
let filteredOrders = [];
let depositsData = [];
let filteredDeposits = [];
let kycData = [];
let filteredKYC = [];
let serviceRequestsData = [];
let activitiesData = [];
let couponsData = [];
let referralsData = [];
let archiveData = { categories: [], products: [] };
let auditLogData = [];
let filteredAuditLog = [];
let currentArchiveTab = 'cats';
let currentSettings = {};
let _otpSessionId = null;
let selectedOrders = new Set();

// 🆕 Dashboard time filter
let dashTimeFilter = 'today';

// 🆕 Filter tabs
let ordersTabFilter = 'all';
let depositsTabFilter = 'all';
let kycTabFilter = 'all';

// Bundle management
let editingBundles = [];
let editingProductId = null;

// VIP Config
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

// ============================================================
// 🚀 Event Listeners Init
// ============================================================
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
            const kycModal = document.getElementById('modal');
            if (kycModal && kycModal.classList.contains('active')) {
                closeModal();
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

// 🆕 Double Confirm (للمبالغ الكبيرة)
async function showDoubleConfirm(options) {
    const first = await showConfirm(options);
    if (!first) return false;

    const second = await showConfirm({
        title: '⚠️ تأكيد مزدوج',
        message: `هل أنت متأكد تماماً؟\n\n${options.message}`,
        confirmText: 'نعم، متأكد',
        type: 'danger'
    });
    return second;
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
    setBadge('badge-mobile-deposits', pendingDeposits);

    const pendingKYC = kycData.filter(k => k.status === 'pending').length;
    setBadge('badge-kyc', pendingKYC);

    const pendingServices = serviceRequestsData.filter(s => s.status === 'pending').length;
    setBadge('badge-services', pendingServices);

    const archiveCount = (archiveData.categories?.length || 0) + (archiveData.products?.length || 0);
    setBadge('badge-archive', archiveCount);

    // 🆕 تحديث Tab Badges
    updateTabBadges();
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

// 🆕 تحديث Tab Counts
function updateTabBadges() {
    // Orders
    const el1 = document.getElementById('ordersTabAll');
    if (el1) el1.textContent = ordersData.length;
    const el2 = document.getElementById('ordersTabPending');
    if (el2) el2.textContent = ordersData.filter(o => o.status === 'pending').length;
    const el3 = document.getElementById('ordersTabProcessing');
    if (el3) el3.textContent = ordersData.filter(o => o.status === 'processing' || o.status === 'review').length;
    const el4 = document.getElementById('ordersTabCompleted');
    if (el4) el4.textContent = ordersData.filter(o => o.status === 'completed').length;

    // Deposits
    const d1 = document.getElementById('depositsTabAll');
    if (d1) d1.textContent = depositsData.length;
    const d2 = document.getElementById('depositsTabPending');
    if (d2) d2.textContent = depositsData.filter(d => d.status === 'pending').length;
    const d3 = document.getElementById('depositsTabApproved');
    if (d3) d3.textContent = depositsData.filter(d => d.status === 'approved').length;
    const d4 = document.getElementById('depositsTabRejected');
    if (d4) d4.textContent = depositsData.filter(d => d.status === 'rejected').length;

    // KYC
    const k1 = document.getElementById('kycTabAll');
    if (k1) k1.textContent = kycData.length;
    const k2 = document.getElementById('kycTabPending');
    if (k2) k2.textContent = kycData.filter(k => k.status === 'pending').length;
    const k3 = document.getElementById('kycTabApproved');
    if (k3) k3.textContent = kycData.filter(k => k.status === 'approved').length;
    const k4 = document.getElementById('kycTabRejected');
    if (k4) k4.textContent = kycData.filter(k => k.status === 'rejected').length;
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
        filteredOrders = [...ordersData];
        filteredDeposits = [...depositsData];
        filteredKYC = [...kycData];

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
// ============ 🆕 Dashboard Smart ============
// ============================================================
function setDashTimeFilter(filter, btn) {
    dashTimeFilter = filter;
    document.querySelectorAll('.time-chip').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderDashboard();
}

function getTimeFilterRange() {
    const now = new Date();
    let startDate = null;
    let label = 'اليوم';

    if (dashTimeFilter === 'today') {
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        label = 'اليوم';
    } else if (dashTimeFilter === 'week') {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        label = '7 أيام';
    } else if (dashTimeFilter === 'month') {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        label = '30 يوم';
    } else {
        label = 'الكل';
    }

    return { startDate, label };
}

function isInRange(dateStr, startDate) {
    if (!dateStr) return false;
    if (!startDate) return true; // "الكل"
    const d = new Date(dateStr);
    return d >= startDate;
}

function renderDashboard() {
    const { startDate, label } = getTimeFilterRange();

    // فلترة حسب الفترة
    const filteredOrders = ordersData.filter(o => isInRange(o.created_at, startDate));
    const filteredDeposits = depositsData.filter(d => 
        d.status === 'approved' && isInRange(d.created_at, startDate)
    );
    const filteredUsers = usersData.filter(u => isInRange(u.created_at, startDate));

    // حساب الإيرادات من الطلبات
    const revenue = filteredOrders
        .filter(o => o.status !== 'failed' && o.status !== 'cancelled')
        .reduce((sum, o) => sum + (o.total_price || 0), 0);

    const depositsTotal = filteredDeposits.reduce((sum, d) => sum + (d.amount || 0), 0);

    document.getElementById('dashRevenue').textContent = `${revenue.toFixed(2)}$`;
    document.getElementById('dashOrders').textContent = filteredOrders.length;
    document.getElementById('dashUsers').textContent = filteredUsers.length;
    document.getElementById('dashDeposits').textContent = `${depositsTotal.toFixed(2)}$`;

    document.getElementById('dashRevenueLabel').textContent = `إيرادات ${label}`;
    document.getElementById('dashOrdersLabel').textContent = `طلبات ${label}`;
    document.getElementById('dashUsersLabel').textContent = `مستخدمون جدد ${label}`;
    document.getElementById('dashDepositsLabel').textContent = `إيداعات ${label}`;

    // آخر العمليات
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

    renderAttentionCard();
    renderOrdersChart();
    renderDepositsChart();
}

// 🆕 Attention Card
function renderAttentionCard() {
    const container = document.getElementById('attentionCard');
    const list = document.getElementById('attentionList');
    if (!container || !list) return;

    const pendingOrders = ordersData.filter(o => o.status === 'pending').length;
    const pendingDeposits = depositsData.filter(d => d.status === 'pending').length;
    const pendingKYC = kycData.filter(k => k.status === 'pending').length;
    const pendingServices = serviceRequestsData.filter(s => s.status === 'pending').length;

    const total = pendingOrders + pendingDeposits + pendingKYC + pendingServices;

    if (total === 0) {
        container.classList.add('empty');
        list.innerHTML = `
            <div class="attention-empty">
                <span class="material-icons">check_circle</span>
                كل شيء تحت السيطرة
            </div>
        `;
        return;
    }

    container.classList.remove('empty');
    let html = '';

    if (pendingOrders > 0) {
        html += `
            <button class="attention-item" onclick="switchSection('orders')">
                <div class="attention-item-icon"><span class="material-icons">receipt_long</span></div>
                <div class="attention-item-content">
                    <div class="attention-item-title">${pendingOrders} طلب بحاجة لمعالجة</div>
                    <div class="attention-item-subtitle">اضغط للمراجعة</div>
                </div>
                <span class="material-icons attention-item-arrow">chevron_left</span>
            </button>
        `;
    }

    if (pendingDeposits > 0) {
        html += `
            <button class="attention-item" onclick="switchSection('deposits')">
                <div class="attention-item-icon"><span class="material-icons">account_balance_wallet</span></div>
                <div class="attention-item-content">
                    <div class="attention-item-title">${pendingDeposits} إيداع بانتظار المراجعة</div>
                    <div class="attention-item-subtitle">اضغط للمراجعة</div>
                </div>
                <span class="material-icons attention-item-arrow">chevron_left</span>
            </button>
        `;
    }

    if (pendingKYC > 0) {
        html += `
            <button class="attention-item" onclick="switchSection('kyc')">
                <div class="attention-item-icon"><span class="material-icons">verified_user</span></div>
                <div class="attention-item-content">
                    <div class="attention-item-title">${pendingKYC} طلب توثيق معلق</div>
                    <div class="attention-item-subtitle">اضغط للمراجعة</div>
                </div>
                <span class="material-icons attention-item-arrow">chevron_left</span>
            </button>
        `;
    }

    if (pendingServices > 0) {
        html += `
            <button class="attention-item" onclick="switchSection('service-requests')">
                <div class="attention-item-icon"><span class="material-icons">build</span></div>
                <div class="attention-item-content">
                    <div class="attention-item-title">${pendingServices} طلب خدمة معلق</div>
                    <div class="attention-item-subtitle">اضغط للمراجعة</div>
                </div>
                <span class="material-icons attention-item-arrow">chevron_left</span>
            </button>
        `;
    }

    list.innerHTML = html;
}

// ============================================================
// ============ Charts ============
// ============================================================
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
// admin/js/admin.js — v14 (Part 2/3)
// ============================================================

// ============================================================
// ============ Users ============
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
            <td data-label="Telegram ID">
                <span class="ltr" style="cursor:pointer;" onclick="copyToClipboard('${user.telegram_id}')" title="اضغط للنسخ">
                    ${user.telegram_id}
                </span>
            </td>
            <td data-label="الاسم">${user.username || user.first_name || 'مستخدم'}</td>
            <td data-label="الرصيد">
                <span style="color:${balanceColor};font-weight:800;direction:ltr;">${balance.toFixed(2)}$</span>
                ${negBadge}
            </td>
            <td data-label="الحالة"><span class="status-badge ${user.is_banned ? 'failed' : 'completed'}">${user.is_banned ? 'محظور' : 'نشط'}</span></td>
            <td data-label="VIP">${vipBadge}</td>
            <td data-label="إجراءات">
                <button class="btn-outline btn-sm" onclick="openUserDetailModal(${user.id})" title="تفاصيل المستخدم">
                    <span class="material-icons" style="font-size:14px;vertical-align:middle;">visibility</span>
                </button>
                <button class="btn-outline btn-sm" onclick="adjustBalance(${user.id})">رصيد</button>
                <button class="btn-outline btn-sm" onclick="openNegativeBalanceModal(${user.id})" title="الرصيد السالب">💳</button>
                <button class="btn-outline btn-sm" onclick="openVIPModal(${user.id})" title="VIP">⭐</button>
                <button class="btn-outline btn-sm" onclick="toggleBan(${user.id})">${user.is_banned ? 'فك الحظر' : 'حظر'}</button>
            </td>
        </tr>
    `}).join('');
}

// ============================================================
// User Detail Modal
// ============================================================
async function openUserDetailModal(userId) {
    try {
        const user = await fetchAdminUserDetail(userId);
        const balanceColor = user.balance < 0 ? 'var(--error)' : (user.balance > 0 ? 'var(--success)' : 'var(--text)');
        const kycBadge = user.kyc_status === 'verified' ?
            '<span class="status-badge completed">موثق ✓</span>' :
            (user.kyc_status === 'pending' ? '<span class="status-badge pending">قيد المراجعة</span>' :
                '<span class="status-badge unverified">غير موثق</span>');

        const body = `
            <div style="text-align:right;">
                <h3 style="margin-bottom:16px;">تفاصيل المستخدم</h3>

                <div style="background:var(--primary-light);padding:16px;border-radius:12px;margin-bottom:16px;">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                        <div style="width:56px;height:56px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:800;">
                            ${(user.first_name || user.username || 'م')[0]}
                        </div>
                        <div style="flex:1;">
                            <div style="font-weight:800;font-size:1.1rem;">${user.first_name || 'مستخدم'} ${user.last_name || ''}</div>
                            ${user.username ? `<div style="color:var(--text-secondary);font-size:0.85rem;">@${user.username}</div>` : ''}
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.85rem;">
                        <div>
                            <span style="color:var(--text-secondary);">Telegram ID:</span>
                            <div style="font-weight:700;cursor:pointer;" class="ltr" onclick="copyToClipboard('${user.telegram_id}')">
                                ${user.telegram_id} <span class="material-icons" style="font-size:12px;vertical-align:middle;color:var(--primary);">content_copy</span>
                            </div>
                        </div>
                        <div>
                            <span style="color:var(--text-secondary);">الدور:</span>
                            <div style="font-weight:700;">${user.role === 'admin' ? 'أدمن' : 'مستخدم'}</div>
                        </div>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                    <div style="background:var(--background);padding:12px;border-radius:12px;text-align:center;">
                        <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:4px;">الرصيد</div>
                        <div style="font-size:1.4rem;font-weight:800;color:${balanceColor};" class="ltr">${user.balance.toFixed(2)}$</div>
                    </div>
                    <div style="background:var(--background);padding:12px;border-radius:12px;text-align:center;">
                        <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:4px;">الحالة</div>
                        <div style="margin-top:4px;">${user.is_banned ? '<span class="status-badge failed">محظور</span>' : '<span class="status-badge completed">نشط</span>'}</div>
                    </div>
                    <div style="background:var(--background);padding:12px;border-radius:12px;text-align:center;">
                        <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:4px;">الطلبات</div>
                        <div style="font-size:1.4rem;font-weight:800;">${user.orders_count || 0}</div>
                    </div>
                    <div style="background:var(--background);padding:12px;border-radius:12px;text-align:center;">
                        <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:4px;">الإيداعات</div>
                        <div style="font-size:1.4rem;font-weight:800;">${user.deposits_count || 0}</div>
                    </div>
                </div>

                <div style="background:var(--background);padding:12px;border-radius:12px;margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                        <span style="color:var(--text-secondary);font-size:0.85rem;">KYC:</span>
                        ${kycBadge}
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                        <span style="color:var(--text-secondary);font-size:0.85rem;">VIP Level:</span>
                        <span style="font-weight:700;">${user.vip_level > 0 ? 'VIP' + user.vip_level : 'بدون'}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                        <span style="color:var(--text-secondary);font-size:0.85rem;">كود الإحالة:</span>
                        <span style="font-weight:700;cursor:pointer;" class="ltr" onclick="copyToClipboard('${user.referral_code || ''}')">
                            ${user.referral_code || '-'}
                        </span>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                        <span style="color:var(--text-secondary);font-size:0.85rem;">عدد الإحالات:</span>
                        <span style="font-weight:700;">${user.referral_count || 0}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;">
                        <span style="color:var(--text-secondary);font-size:0.85rem;">أرباح الإحالات:</span>
                        <span style="font-weight:700;" class="ltr">${(user.referral_earnings || 0).toFixed(2)}$</span>
                    </div>
                </div>

                <div style="background:var(--background);padding:12px;border-radius:12px;margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                        <span style="color:var(--text-secondary);font-size:0.85rem;">الرصيد السالب:</span>
                        <span style="font-weight:700;">${user.allow_negative_balance ? 'مفعّل' : 'معطّل'}</span>
                    </div>
                    ${user.allow_negative_balance ? `
                        <div style="display:flex;justify-content:space-between;">
                            <span style="color:var(--text-secondary);font-size:0.85rem;">الحد الأقصى:</span>
                            <span style="font-weight:700;color:var(--warning);" class="ltr">${(user.max_negative_balance || 0).toFixed(2)}$</span>
                        </div>
                    ` : ''}
                </div>

                <div style="font-size:0.75rem;color:var(--text-secondary);text-align:center;margin-bottom:16px;">
                    انضم: ${user.created_at ? new Date(user.created_at).toLocaleString('ar') : '-'}
                </div>

                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn-primary" style="flex:1;" onclick="closeModal(); adjustBalance(${user.id})">
                        <span class="material-icons" style="font-size:16px;">edit</span> تعديل الرصيد
                    </button>
                    <button class="btn-outline" style="flex:1;" onclick="closeModal()">إغلاق</button>
                </div>
            </div>
        `;
        openModal('', body);
    } catch (error) {
        showToast(`فشل تحميل التفاصيل: ${error.message}`, 'error');
    }
}

// ============================================================
// Negative Balance Modal
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
                <input type="number" id="negMax" value="${maxNeg}" step="1" min="0" max="1000000">
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
// VIP Modal
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
                <small style="color:var(--text-secondary);font-size:0.75rem;display:block;margin-top:6px;">
                    ⚠️ للأدمن صلاحية مطلقة — أي مبلغ مسموح
                </small>
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
    const actionText = type === 'add' ? 'إضافة' : 'خصم';

    // تأكيد مزدوج للمبالغ الكبيرة
    let confirmed;
    if (rawAmount >= 500) {
        confirmed = await showDoubleConfirm({
            title: '⚠️ مبلغ كبير',
            message: `سيتم ${actionText} ${rawAmount}$ ${type === 'add' ? 'إلى' : 'من'} رصيد المستخدم.`,
            confirmText: 'تأكيد',
            type: type === 'add' ? 'success' : 'danger'
        });
    } else {
        confirmed = await showConfirm({
            title: 'تأكيد تعديل الرصيد',
            message: `سيتم ${actionText} ${rawAmount}$ ${type === 'add' ? 'إلى' : 'من'} رصيد المستخدم.`,
            confirmText: 'تأكيد العملية',
            type: type === 'add' ? 'success' : 'danger'
        });
    }
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
// ============ Products ============
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
        let qtyDisplay = `${prod.base_quantity} ${prod.unit_name || 'قطعة'}`;
        let bundlesInfo = '';

        if (prod.product_type === 'topup') {
            priceDisplay = `<span style="color:var(--warning);font-weight:800;">${prod.base_price} ل.س</span>`;
            qtyDisplay = '-';
        }

        if (prod.product_type === 'bundle' && prod.bundles && prod.bundles.length > 0) {
            bundlesInfo = `<span style="font-size:0.7rem;background:var(--primary-light);color:var(--primary);padding:2px 8px;border-radius:50px;font-weight:700;">🎁 ${prod.bundles.length} باقات</span>`;
            priceDisplay = '-';
            qtyDisplay = '-';
        }

        return `
        <tr>
            <td data-label="الصورة"><img src="${prod.image || ''}" alt="${prod.name}" onerror="this.style.display='none'"></td>
            <td data-label="الاسم">${prod.name} ${bundlesInfo}</td>
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

// ============================================================
// Bundle Editor
// ============================================================
function renderBundleEditor(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!editingBundles.length) {
        container.innerHTML = `
            <div style="text-align:center;padding:20px;background:var(--background);border:1px dashed var(--border);border-radius:12px;color:var(--text-secondary);font-size:0.85rem;">
                لا توجد باقات. اضغط "إضافة باقة" للبدء.
            </div>
        `;
        return;
    }

    container.innerHTML = editingBundles.map((b, idx) => `
        <div class="bundle-row ${b._deleted ? 'deleted' : ''}" data-idx="${idx}">
            <div class="bundle-number">${idx + 1}</div>
            <input type="text" class="bundle-input bundle-name" value="${b.name || ''}"
                   placeholder="اسم الباقة" oninput="updateBundle(${idx}, 'name', this.value)">
            <input type="number" class="bundle-input bundle-qty" value="${b.quantity || 0}"
                   placeholder="الكمية" min="0" oninput="updateBundle(${idx}, 'quantity', this.value)">
            <input type="number" class="bundle-input bundle-price" value="${b.price_usd || 0}"
                   placeholder="السعر" step="0.01" min="0" oninput="updateBundle(${idx}, 'price_usd', this.value)">
            <button type="button" class="bundle-delete-btn" onclick="removeBundle(${idx})">
                <span class="material-icons">delete</span>
            </button>
        </div>
    `).join('');
}

function updateBundle(idx, field, value) {
    if (!editingBundles[idx]) return;
    if (field === 'quantity') {
        editingBundles[idx].quantity = parseInt(value) || 0;
    } else if (field === 'price_usd') {
        editingBundles[idx].price_usd = parseFloat(value) || 0;
    } else {
        editingBundles[idx].name = value;
    }
}

function addBundleRow(containerId) {
    editingBundles.push({
        name: '',
        quantity: 0,
        price_usd: 0,
        _new: true,
    });
    renderBundleEditor(containerId);
}

function removeBundle(idx) {
    if (!editingBundles[idx]) return;

    const b = editingBundles[idx];

    if (b._new) {
        editingBundles.splice(idx, 1);
    } else {
        editingBundles[idx]._deleted = true;
    }

    renderBundleEditor('bundlesEditor');
    renderBundleEditor('editBundlesEditor');
}

// ============================================================
// Add Product Modal
// ============================================================
function openProductModal() {
    editingBundles = [];
    editingProductId = null;

    const body = `
        <h3 style="margin-bottom:14px;">إضافة منتج</h3>
        <div class="form-group"><label>اسم المنتج</label><input type="text" id="productName"></div>
        <div class="form-group"><label>القسم</label><select id="productCategoryId">${categoriesData.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
        <div class="form-group">
            <label>النوع</label>
            <select id="productType" onchange="toggleProductTypeFields()">
                <option value="quantity">كمية</option>
                <option value="bundle">باقة (PUBG / Free Fire / إلخ)</option>
                <option value="topup">رصيد سوري (ل.س)</option>
            </select>
        </div>
        <div class="form-group" id="unitNameField" style="display:none;">
            <label>وحدة القياس</label>
            <input type="text" id="productUnitName" value="قطعة" placeholder="مثال: UC، جوهرة، Diamond، قطعة">
            <small style="color:var(--text-secondary);font-size:0.75rem;display:block;margin-top:6px;line-height:1.5;">
                💡 يظهر بجانب الكمية — مثال: <strong>325 UC</strong>
            </small>
        </div>
        <div class="form-group">
            <label id="priceLabel">السعر الأساسي (دولار)</label>
            <input type="number" id="productPrice" value="0" step="0.01">
            <small id="priceHelp" style="color:var(--text-secondary);font-size:0.75rem;display:none;margin-top:6px;">
                💡 لمنتج الرصيد السوري: السعر يُحسب من سعر الصرف
            </small>
        </div>
        <div class="form-group" id="quantityField"><label>الكمية الأساسية</label><input type="number" id="productQuantity" value="0"></div>
        <div class="form-group" id="bundlesField" style="display:none;">
            <label style="display:flex;justify-content:space-between;align-items:center;">
                <span>🎁 الباقات</span>
                <button type="button" class="btn-outline btn-sm" onclick="addBundleRow('bundlesEditor')" style="font-size:0.75rem;">
                    <span class="material-icons" style="font-size:14px;vertical-align:middle;">add</span> إضافة باقة
                </button>
            </label>
            <div id="bundlesEditor" class="bundles-editor" style="margin-top:10px;"></div>
        </div>
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
    const bf = document.getElementById('bundlesField');
    const unf = document.getElementById('unitNameField');
    const priceLabel = document.getElementById('priceLabel');
    const priceHelp = document.getElementById('priceHelp');
    const maxQtyLabel = document.getElementById('maxQtyLabel');

    if (qf) qf.style.display = (type === 'bundle') ? 'none' : 'block';
    if (bf) bf.style.display = (type === 'bundle') ? 'block' : 'none';
    if (unf) unf.style.display = (type === 'quantity' || type === 'bundle') ? 'block' : 'none';

    if (type === 'topup') {
        if (priceLabel) priceLabel.textContent = 'سعر الليرة الواحدة بالدولار (تلقائي)';
        if (priceHelp) priceHelp.style.display = 'block';
        if (maxQtyLabel) maxQtyLabel.textContent = 'الحد الأقصى للمبلغ بالليرة السورية';
    } else if (type === 'bundle') {
        if (priceLabel) priceLabel.textContent = 'السعر الأساسي (سيُتجاهل — يعتمد على الباقات)';
        if (priceHelp) { priceHelp.style.display = 'block'; priceHelp.textContent = '💡 للباقات: السعر يُحدد لكل باقة على حدة'; }
        if (maxQtyLabel) maxQtyLabel.textContent = 'الحد الأقصى (اختياري)';
        renderBundleEditor('bundlesEditor');
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

    let bundlesToSave = [];
    if (type === 'bundle') {
        bundlesToSave = editingBundles.filter(b => !b._deleted && b.name && b.price_usd > 0);
        if (!bundlesToSave.length) {
            showToast('أضف باقة واحدة على الأقل', 'warning');
            return;
        }
    }

    const imageFile = document.getElementById('productImage').files[0];
    let image = '';
    if (imageFile) image = await fileToSquareBase64(imageFile, 512);

    const unitName = (document.getElementById('productUnitName')?.value || 'قطعة').trim() || 'قطعة';

    if (btn) { btn.disabled = true; btn.textContent = 'جارٍ الحفظ...'; }
    try {
        await createProduct({
            name,
            category_id: categoryId,
            product_type: type,
            base_price: price || 0,
            base_quantity: baseQuantity,
            unit_name: unitName,
            input_type: inputType,
            max_quantity: maxQuantity,
            image,
            bundles: bundlesToSave.map(b => ({
                name: b.name,
                quantity: b.quantity,
                price_usd: b.price_usd,
            })),
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
// Edit Product Modal
// ============================================================
function openEditProductModal(productId) {
    const prod = productsData.find(p => p.id === productId);
    if (!prod) { showToast('المنتج غير موجود', 'error'); return; }

    editingProductId = productId;
    editingBundles = (prod.bundles || []).map(b => ({
        id: b.id,
        name: b.name,
        quantity: b.quantity,
        price_usd: b.price_usd,
        _new: false,
        _deleted: false,
    }));

    const isTopup = prod.product_type === 'topup';
    const isBundle = prod.product_type === 'bundle';

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
            <select id="editProductType" onchange="toggleEditProductTypeFields()">
                <option value="quantity" ${prod.product_type === 'quantity' ? 'selected' : ''}>كمية</option>
                <option value="bundle" ${prod.product_type === 'bundle' ? 'selected' : ''}>باقة</option>
                <option value="topup" ${prod.product_type === 'topup' ? 'selected' : ''}>رصيد سوري</option>
            </select>
        </div>

        <div class="form-group" id="editUnitNameField" style="${isTopup ? 'display:none;' : 'display:block;'}">
            <label>وحدة القياس</label>
            <input type="text" id="editProductUnitName" value="${prod.unit_name || 'قطعة'}" placeholder="مثال: UC، جوهرة، Diamond، قطعة">
            <small style="color:var(--text-secondary);font-size:0.75rem;display:block;margin-top:6px;line-height:1.5;">
                💡 يظهر بجانب الكمية — مثال: <strong>325 UC</strong>
            </small>
        </div>

        <div id="editBundlesField" class="form-group" style="${isBundle ? 'display:block;' : 'display:none;'}">
            <label style="display:flex;justify-content:space-between;align-items:center;">
                <span>🎁 الباقات</span>
                <button type="button" class="btn-outline btn-sm" onclick="addBundleRow('editBundlesEditor')" style="font-size:0.75rem;">
                    <span class="material-icons" style="font-size:14px;vertical-align:middle;">add</span> إضافة باقة
                </button>
            </label>
            <div id="editBundlesEditor" class="bundles-editor" style="margin-top:10px;"></div>
        </div>

        <div id="editNonBundleFields" style="${isBundle ? 'display:none;' : 'display:block;'}">
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
        </div>

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

    setTimeout(() => {
        if (isBundle) renderBundleEditor('editBundlesEditor');
    }, 100);
}

function toggleEditProductTypeFields() {
    const type = document.getElementById('editProductType').value;
    const bf = document.getElementById('editBundlesField');
    const nbf = document.getElementById('editNonBundleFields');
    const unf = document.getElementById('editUnitNameField');

    if (type === 'bundle') {
        if (bf) bf.style.display = 'block';
        if (nbf) nbf.style.display = 'none';
        if (unf) unf.style.display = 'block';
        renderBundleEditor('editBundlesEditor');
    } else {
        if (bf) bf.style.display = 'none';
        if (nbf) nbf.style.display = 'block';
        if (unf) unf.style.display = (type === 'quantity') ? 'block' : 'none';
    }
}

async function saveEditedProduct(productId, btn) {
    const name = document.getElementById('editProductName').value;
    const description = document.getElementById('editProductDescription').value;
    const categoryId = parseInt(document.getElementById('editProductCategoryId').value);
    const productType = document.getElementById('editProductType').value;
    const inputType = document.getElementById('editProductInputType').value;
    const maxQuantity = parseInt(document.getElementById('editProductMaxQuantity').value) || 0;
    const stock = parseInt(document.getElementById('editProductStock').value) || 0;

    let price = 0;
    let quantity = 0;

    if (productType !== 'bundle') {
        price = parseFloat(document.getElementById('editProductPrice')?.value) || 0;
        quantity = parseInt(document.getElementById('editProductQuantity')?.value) || 0;
    }

    if (!name || !name.trim()) { showToast('أدخل اسم المنتج', 'warning'); return; }

    let bundlesToSave = [];
    if (productType === 'bundle') {
        bundlesToSave = editingBundles.filter(b => !b._deleted && b.name && b.price_usd > 0);
        if (!bundlesToSave.length) {
            showToast('يجب أن يحتوي منتج الباقات على باقة واحدة على الأقل', 'warning');
            return;
        }
    }

    const unitName = (document.getElementById('editProductUnitName')?.value || 'قطعة').trim() || 'قطعة';

    const data = {
        name: name.trim(),
        description: description,
        category_id: categoryId,
        base_price: price,
        base_quantity: quantity,
        unit_name: unitName,
        max_quantity: maxQuantity,
        stock: stock,
        input_type: inputType,
        product_type: productType,
        bundles: bundlesToSave.map(b => ({
            name: b.name,
            quantity: b.quantity,
            price_usd: b.price_usd,
        })),
    };

    const imageFile = document.getElementById('editProductImage')?.files[0];
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
// ============ Archive ============
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
            <td data-label="الكمية">${prod.base_quantity} ${prod.unit_name || 'قطعة'}</td>
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
// ============ KYC — 🆕 FIXED v14 ============
// ============================================================
function setKYCTab(filter, btn) {
    kycTabFilter = filter;
    document.querySelectorAll('#kycTabs .filter-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderKYC();
}

function renderKYC() {
    const tbody = document.getElementById('kycTableBody');
    if (!tbody) return;

    // فلترة حسب Tab
    let filtered = [...kycData];
    if (kycTabFilter === 'pending') filtered = kycData.filter(k => k.status === 'pending');
    else if (kycTabFilter === 'approved') filtered = kycData.filter(k => k.status === 'approved');
    else if (kycTabFilter === 'rejected') filtered = kycData.filter(k => k.status === 'rejected');

    filteredKYC = filtered;

    if (!filtered.length) {
        const emptyMsg = kycTabFilter === 'all' ? 'لا توجد طلبات توثيق' : 'لا توجد طلبات في هذه الحالة';
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><span class="material-icons">verified_user</span>${emptyMsg}</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(k => `
        <tr>
            <td data-label="معرف المستخدم">${k.user_id}</td>
            <td data-label="الاسم">${k.full_name}</td>
            <td data-label="الهاتف"><span class="ltr">${k.phone}</span></td>
            <td data-label="العنوان">${k.address || '-'}</td>
            <td data-label="الصورة">${k.selfie_image ? `<button class="btn-outline btn-sm" onclick="viewKYCImage(${k.id})">عرض</button>` : '-'}</td>
            <td data-label="الحالة"><span class="status-badge ${k.status === 'approved' ? 'completed' : k.status === 'rejected' ? 'failed' : 'pending'}">${k.status === 'approved' ? 'مقبول' : k.status === 'rejected' ? 'مرفوض' : 'معلق'}</span></td>
            <td data-label="إجراءات">
                ${k.status === 'pending' ? `
                    <button class="btn-success btn-sm" onclick="window.handleApproveKYC(${k.id})">قبول</button>
                    <button class="btn-danger btn-sm" onclick="window.handleRejectKYC(${k.id})">رفض</button>
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
            <div style="background:var(--background);border-radius:12px;padding:8px;max-height:60vh;overflow:auto;" onclick="openImageLightbox('${kyc.selfie_image}')">
                <img src="${kyc.selfie_image}" style="width:100%;height:auto;border-radius:8px;display:block;cursor:zoom-in;" alt="KYC Selfie">
            </div>
            ${kyc.status === 'pending' ? `
                <div style="display:flex;gap:8px;margin-top:16px;">
                    <button class="btn-primary" style="flex:1;" onclick="closeModal(); window.handleApproveKYC(${kyc.id})">قبول التوثيق</button>
                    <button class="btn-danger" style="flex:1;" onclick="closeModal(); window.handleRejectKYC(${kyc.id})">رفض</button>
                </div>
            ` : ''}
            <button class="btn-outline" style="width:100%;margin-top:12px;" onclick="closeModal()">إغلاق</button>
        </div>
    `;
    openModal('طلب التوثيق', body);
}

// 🆕 FIXED: handleApproveKYC (بدل approveKYCRequest)
window.handleApproveKYC = async function(kycId) {
    const confirmed = await showConfirm({
        title: 'قبول التوثيق',
        message: 'هل أنت متأكد من قبول طلب التوثيق؟',
        confirmText: 'قبول',
        type: 'success'
    });
    if (!confirmed) return;
    try {
        await approveKYCRequest(kycId);  // يستدعي api.js
        await loadAllData();
        renderKYC();
        showToast('تم قبول التوثيق بنجاح', 'success');
    } catch (error) {
        showToast(`فشل القبول: ${error.message}`, 'error');
    }
};

// 🆕 FIXED: handleRejectKYC (بدل rejectKYCRequest)
window.handleRejectKYC = async function(kycId) {
    const confirmed = await showConfirm({
        title: 'رفض التوثيق',
        message: 'هل أنت متأكد من رفض طلب التوثيق؟',
        confirmText: 'رفض',
        type: 'danger'
    });
    if (!confirmed) return;
    try {
        await rejectKYCRequest(kycId);  // يستدعي api.js
        await loadAllData();
        renderKYC();
        showToast('تم رفض التوثيق', 'warning');
    } catch (error) {
        showToast(`فشل الرفض: ${error.message}`, 'error');
    }
};
// ============================================================
// admin/js/admin.js — v14 (Part 3/3 — Final)
// ============================================================

// ============================================================
// ============ Orders — 🆕 with Tabs ============
// ============================================================
function setOrdersTab(filter, btn) {
    ordersTabFilter = filter;
    document.querySelectorAll('#ordersTabs .filter-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    applyOrderFilters();
}

function applyOrderFilters() {
    const searchQuery = (document.getElementById('orderSearchQuery')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('orderStatusFilter')?.value || 'all';
    const sortFilter = document.getElementById('orderSortFilter')?.value || 'newest';

    let filtered = [...ordersData];

    // 🆕 Tab filter
    if (ordersTabFilter === 'pending') filtered = filtered.filter(o => o.status === 'pending');
    else if (ordersTabFilter === 'processing') filtered = filtered.filter(o => o.status === 'processing' || o.status === 'review');
    else if (ordersTabFilter === 'completed') filtered = filtered.filter(o => o.status === 'completed');

    // Status filter
    if (statusFilter !== 'all') filtered = filtered.filter(o => o.status === statusFilter);

    // Search
    if (searchQuery) {
        filtered = filtered.filter(o =>
            (o.order_number || '').toLowerCase().includes(searchQuery) ||
            (o.user_telegram + '').includes(searchQuery) ||
            (o.product_name || '').toLowerCase().includes(searchQuery) ||
            (o.user_name || '').toLowerCase().includes(searchQuery)
        );
    }

    // Sort
    if (sortFilter === 'newest') filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    else if (sortFilter === 'oldest') filtered.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    else if (sortFilter === 'price_high') filtered.sort((a, b) => (b.total_price || 0) - (a.total_price || 0));
    else if (sortFilter === 'price_low') filtered.sort((a, b) => (a.total_price || 0) - (b.total_price || 0));

    filteredOrders = filtered;
    renderOrders(filtered);
}

function resetOrderFilters() {
    const ids = ['orderSearchQuery'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const statusSelect = document.getElementById('orderStatusFilter');
    const sortSelect = document.getElementById('orderSortFilter');
    if (statusSelect) statusSelect.value = 'all';
    if (sortSelect) sortSelect.value = 'newest';

    // إعادة Tab للكل
    ordersTabFilter = 'all';
    document.querySelectorAll('#ordersTabs .filter-tab').forEach((b, i) => {
        b.classList.toggle('active', i === 0);
    });

    filteredOrders = [...ordersData];
    renderOrders(ordersData);
}

function renderOrders(orders) {
    const container = document.getElementById('ordersList');
    if (!container) return;

    if (!orders || !orders.length) {
        container.innerHTML = `
            <div class="empty-state" style="padding:60px 20px;">
                <span class="material-icons" style="font-size:3rem;color:var(--muted);display:block;margin-bottom:12px;">receipt_long</span>
                <div style="font-size:1rem;font-weight:600;">لا توجد طلبات</div>
            </div>
        `;
        updateSelectedOrdersBar();
        return;
    }

    container.innerHTML = `
        <div class="orders-cards-grid">
            ${orders.map(order => renderOrderCard(order)).join('')}
        </div>
    `;
    updateSelectedOrdersBar();
}

function renderOrderCard(order) {
    const statusColors = {
        pending: 'pending', review: 'review', processing: 'processing',
        completed: 'completed', failed: 'failed', cancelled: 'cancelled'
    };

    let qtyDisplay;
    if (order.product_type === 'topup') {
        qtyDisplay = `${order.quantity.toLocaleString('ar')} ل.س`;
    } else if (order.product_unit_name && order.product_unit_name !== 'قطعة') {
        qtyDisplay = `${order.quantity.toLocaleString('ar')} ${order.product_unit_name}`;
    } else {
        qtyDisplay = `${order.quantity.toLocaleString('ar')} قطعة`;
    }

    const isChecked = selectedOrders.has(order.id) ? 'checked' : '';

    return `
        <div class="order-item-card" data-status="${order.status}">
            <div class="order-card-header">
                <label class="order-checkbox-wrap" onclick="event.stopPropagation();">
                    <input type="checkbox" class="order-checkbox" ${isChecked}
                           onchange="toggleOrderSelection(${order.id}, this.checked)">
                </label>
                <div class="order-header-info">
                    <div class="order-number-tag ltr" onclick="copyToClipboard('${order.order_number}')">${order.order_number}</div>
                    <span class="status-badge ${statusColors[order.status]}">${getStatusArabic(order.status)}</span>
                </div>
                <div class="order-price-tag">
                    <div class="price-value ltr">${order.total_price.toFixed(2)}$</div>
                </div>
            </div>

            <div class="order-card-body">
                <div class="order-body-row">
                    <span class="material-icons" style="font-size:16px;color:var(--primary);">person</span>
                    <span class="order-user-name">${order.user_name || 'مستخدم'}</span>
                    <span class="ltr order-user-id" onclick="copyToClipboard('${order.user_telegram || order.user_id}')">#${order.user_telegram || order.user_id}</span>
                </div>
                <div class="order-body-row">
                    <span class="material-icons" style="font-size:16px;color:var(--primary);">inventory_2</span>
                    <span class="order-product-name">${order.product_name || '-'}</span>
                    <span class="order-qty">${qtyDisplay}</span>
                </div>
            </div>

            <div class="order-card-footer">
                <div class="order-date">
                    <span class="material-icons" style="font-size:14px;">schedule</span>
                    ${order.created_at ? new Date(order.created_at).toLocaleString('ar', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                </div>
                <div class="order-actions">
                    <button class="btn-outline btn-sm" onclick="viewOrderDetails(${order.id})">
                        <span class="material-icons" style="font-size:14px;">visibility</span> تفاصيل
                    </button>
                    ${['pending', 'review', 'processing'].includes(order.status) ? `
                        <select class="order-status-quick-select" onchange="quickChangeOrderStatus(${order.id}, this.value)">
                            <option value="">تغيير...</option>
                            ${order.status === 'pending' ? '<option value="review">مراجعة</option><option value="cancelled">إلغاء</option>' : ''}
                            ${order.status === 'review' ? '<option value="processing">تنفيذ</option><option value="failed">فشل</option>' : ''}
                            ${order.status === 'processing' ? '<option value="completed">إكمال</option><option value="failed">فشل</option>' : ''}
                        </select>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

async function quickChangeOrderStatus(orderId, newStatus) {
    if (!newStatus) return;

    const confirmed = await showConfirm({
        title: 'تغيير الحالة',
        message: `هل تريد تغيير حالة الطلب إلى "${getStatusArabic(newStatus)}"؟`,
        confirmText: 'تأكيد',
        type: 'warning'
    });

    if (!confirmed) {
        renderOrders(filteredOrders.length ? filteredOrders : ordersData);
        return;
    }

    try {
        await updateOrderStatus(orderId, newStatus);
        await loadAllData();
        filteredOrders = [...ordersData];
        renderOrders(ordersData);
        showToast('تم تحديث الحالة', 'success');
    } catch (error) {
        showToast(`فشل: ${error.message}`, 'error');
        renderOrders(filteredOrders.length ? filteredOrders : ordersData);
    }
}

// ============================================================
// Order Selection (Bulk Actions)
// ============================================================
function toggleOrderSelection(orderId, isChecked) {
    if (isChecked) selectedOrders.add(orderId);
    else selectedOrders.delete(orderId);
    updateSelectedOrdersBar();
}

function updateSelectedOrdersBar() {
    const bar = document.getElementById('bulkOrdersBar');
    if (!bar) return;
    const count = selectedOrders.size;

    if (count === 0) {
        bar.classList.remove('active');
        return;
    }

    bar.classList.add('active');
    const countEl = bar.querySelector('.bulk-count');
    if (countEl) countEl.textContent = count;
}

function clearSelectedOrders() {
    selectedOrders.clear();
    document.querySelectorAll('.order-checkbox').forEach(cb => cb.checked = false);
    updateSelectedOrdersBar();
}

async function bulkChangeStatus(newStatus) {
    if (selectedOrders.size === 0) {
        showToast('لم يتم تحديد أي طلب', 'warning');
        return;
    }

    const confirmed = await showConfirm({
        title: 'تحديث جماعي',
        message: `سيتم تحديث ${selectedOrders.size} طلب إلى حالة "${getStatusArabic(newStatus)}". هل أنت متأكد؟`,
        confirmText: 'تحديث الكل',
        type: 'warning'
    });

    if (!confirmed) return;

    try {
        const result = await bulkUpdateOrderStatus(Array.from(selectedOrders), newStatus);
        showToast(`تم تحديث ${result.success_count} طلب بنجاح${result.failed_count > 0 ? ` (فشل ${result.failed_count})` : ''}`, 'success');
        clearSelectedOrders();
        await loadAllData();
        renderOrders(ordersData);
    } catch (error) {
        showToast(`فشل التحديث الجماعي: ${error.message}`, 'error');
    }
}

// ============================================================
// Order Detail Modal
// ============================================================
async function viewOrderDetails(orderId) {
    try {
        showToast('جارٍ تحميل التفاصيل...', 'info', 1500);
        const order = await fetchAdminOrderFull(orderId);

        const statusColors = {
            pending: 'pending', review: 'review', processing: 'processing',
            completed: 'completed', failed: 'failed', cancelled: 'cancelled'
        };

        let deliveryHtml = '';
        if (order.delivery_data && Object.keys(order.delivery_data).length > 0) {
            const items = [];
            if (order.delivery_data.player_id) items.push({ icon: 'person_pin', label: 'ID اللاعب', value: order.delivery_data.player_id });
            if (order.delivery_data.account_id) items.push({ icon: 'badge', label: 'ID الحساب', value: order.delivery_data.account_id });
            if (order.delivery_data.phone) items.push({ icon: 'phone', label: 'رقم الهاتف', value: order.delivery_data.phone });
            if (order.delivery_data.bundle_name) items.push({ icon: 'redeem', label: 'الباقة', value: order.delivery_data.bundle_name });
            if (order.delivery_data.syp_amount) items.push({ icon: 'payments', label: 'المبلغ بالليرة', value: `${order.delivery_data.syp_amount.toLocaleString('ar')} ل.س` });
            if (order.delivery_data.syp_rate) items.push({ icon: 'trending_up', label: 'سعر الصرف', value: `${order.delivery_data.syp_rate} ل.س/$` });

            if (items.length) {
                deliveryHtml = `
                    <div class="order-detail-section">
                        <div class="section-title-mini">
                            <span class="material-icons" style="font-size:16px;">info</span>
                            بيانات التسليم
                        </div>
                        ${items.map(item => `
                            <div class="detail-row">
                                <span class="detail-label">
                                    <span class="material-icons" style="font-size:14px;color:var(--primary);">${item.icon}</span>
                                    ${item.label}
                                </span>
                                <span class="detail-value ltr" onclick="copyToClipboard('${item.value}')" style="cursor:pointer;">${item.value}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        }

        const body = `
            <div class="order-detail-modal">
                <div class="order-detail-header">
                    <div>
                        <div class="order-detail-number ltr" onclick="copyToClipboard('${order.order_number}')" style="cursor:pointer;">${order.order_number}</div>
                        <div class="order-detail-date">${order.created_at ? new Date(order.created_at).toLocaleString('ar') : ''}</div>
                    </div>
                    <span class="status-badge ${statusColors[order.status]}">${order.status_arabic}</span>
                </div>

                <div class="order-detail-section highlight">
                    <div class="section-title-mini">
                        <span class="material-icons" style="font-size:16px;">person</span>
                        العميل
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">الاسم</span>
                        <span class="detail-value">${order.user?.first_name || 'مستخدم'} ${order.user?.last_name || ''}</span>
                    </div>
                    ${order.user?.username ? `
                    <div class="detail-row">
                        <span class="detail-label">Username</span>
                        <span class="detail-value ltr">@${order.user.username}</span>
                    </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="detail-label">Telegram ID</span>
                        <span class="detail-value ltr" onclick="copyToClipboard('${order.user?.telegram_id}')" style="cursor:pointer;">${order.user?.telegram_id || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">رصيد العميل</span>
                        <span class="detail-value ltr" style="color:${order.user?.balance < 0 ? 'var(--error)' : 'var(--success)'};font-weight:800;">
                            ${(order.user?.balance || 0).toFixed(2)}$
                        </span>
                    </div>
                    <button class="btn-outline btn-sm" style="width:100%;margin-top:8px;" onclick="closeModal(); goToUserFromSearch(${order.user?.id})">
                        <span class="material-icons" style="font-size:14px;">visibility</span>
                        عرض ملف العميل
                    </button>
                </div>

                <div class="order-detail-section">
                    <div class="section-title-mini">
                        <span class="material-icons" style="font-size:16px;">inventory_2</span>
                        المنتج
                    </div>
                    <div class="product-detail-row">
                        ${order.product?.image ? `<img src="${order.product.image}" class="product-thumb" alt="">` : '<div class="product-thumb placeholder">📦</div>'}
                        <div style="flex:1;">
                            <div style="font-weight:700;">${order.product?.name || '-'}</div>
                            <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px;">
                                ${order.product?.product_type === 'topup' ? 'رصيد سوري' : order.product?.product_type === 'bundle' ? 'باقة' : 'منتج كمية'}
                            </div>
                        </div>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">الكمية</span>
                        <span class="detail-value">${order.quantity.toLocaleString('ar')} ${order.product?.unit_name || 'قطعة'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">سعر الوحدة</span>
                        <span class="detail-value ltr">${order.unit_price.toFixed(4)}$</span>
                    </div>
                    ${order.discount_amount > 0 ? `
                    <div class="detail-row">
                        <span class="detail-label">الخصم</span>
                        <span class="detail-value ltr" style="color:var(--success);">-${order.discount_amount.toFixed(2)}$</span>
                    </div>
                    ` : ''}
                    ${order.coupon_code ? `
                    <div class="detail-row">
                        <span class="detail-label">كود الخصم</span>
                        <span class="detail-value ltr">${order.coupon_code}</span>
                    </div>
                    ` : ''}
                    <div class="detail-row total-row">
                        <span class="detail-label" style="font-weight:800;">الإجمالي</span>
                        <span class="detail-value ltr" style="font-weight:900;color:var(--primary);font-size:1.1rem;">
                            ${order.total_price.toFixed(2)}$
                        </span>
                    </div>
                </div>

                ${deliveryHtml}

                <div class="order-detail-actions">
                    ${['pending', 'review', 'processing'].includes(order.status) ? `
                        <div style="grid-column: 1 / -1; margin-bottom: 8px;">
                            <label style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px;">تغيير الحالة</label>
                        </div>
                        ${order.status === 'pending' ? `
                            <button class="btn-primary" onclick="closeModal(); quickChangeOrderStatus(${order.id}, 'review')">قيد المراجعة</button>
                            <button class="btn-outline" onclick="closeModal(); quickChangeOrderStatus(${order.id}, 'cancelled')">إلغاء</button>
                        ` : ''}
                        ${order.status === 'review' ? `
                            <button class="btn-primary" onclick="closeModal(); quickChangeOrderStatus(${order.id}, 'processing')">بدء التنفيذ</button>
                            <button class="btn-danger" onclick="closeModal(); quickChangeOrderStatus(${order.id}, 'failed')">فشل</button>
                        ` : ''}
                        ${order.status === 'processing' ? `
                            <button class="btn-success" onclick="closeModal(); quickChangeOrderStatus(${order.id}, 'completed')">إكمال</button>
                            <button class="btn-danger" onclick="closeModal(); quickChangeOrderStatus(${order.id}, 'failed')">فشل</button>
                        ` : ''}
                    ` : `
                        <div style="grid-column:1/-1;text-align:center;padding:12px;background:var(--background);border-radius:10px;font-size:0.85rem;color:var(--text-secondary);">
                            حالة الطلب نهائية — لا يمكن التغيير
                        </div>
                    `}
                </div>
            </div>
        `;
        openModal('', body);
    } catch (error) {
        showToast(`فشل تحميل التفاصيل: ${error.message}`, 'error');
    }
}

// ============================================================
// ============ Deposits — 🆕 with Tabs ============
// ============================================================
function setDepositsTab(filter, btn) {
    depositsTabFilter = filter;
    document.querySelectorAll('#depositsTabs .filter-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderDeposits(depositsData);
}

function renderDeposits(deposits) {
    const tbody = document.getElementById('depositsTableBody');
    if (!tbody) return;

    // 🆕 فلترة حسب Tab
    let filtered = [...deposits];
    if (depositsTabFilter === 'pending') filtered = deposits.filter(d => d.status === 'pending');
    else if (depositsTabFilter === 'approved') filtered = deposits.filter(d => d.status === 'approved');
    else if (depositsTabFilter === 'rejected') filtered = deposits.filter(d => d.status === 'rejected');

    filteredDeposits = filtered;

    if (!filtered.length) {
        const emptyMsg = depositsTabFilter === 'all' ? 'لا توجد إيداعات' : 'لا توجد إيداعات في هذه الحالة';
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><span class="material-icons">account_balance_wallet</span>${emptyMsg}</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(d => `
        <tr>
            <td data-label="رقم العملية">
                <span class="ltr" onclick="copyToClipboard('${d.transaction_id}')" style="cursor:pointer;">
                    ${d.transaction_id}
                </span>
            </td>
            <td data-label="المستخدم">
                ${d.user_name || 'مستخدم'}
                <div style="font-size:0.7rem;color:var(--text-secondary);cursor:pointer;" class="ltr" onclick="copyToClipboard('${d.user_telegram || d.user_id}')">
                    #${d.user_telegram || d.user_id}
                </div>
            </td>
            <td data-label="المبلغ"><strong class="ltr">${d.amount.toFixed(2)}$</strong></td>
            <td data-label="الطريقة">${d.method || '-'}</td>
            <td data-label="الحالة"><span class="status-badge ${d.status === 'approved' ? 'completed' : d.status === 'rejected' ? 'failed' : 'pending'}">${d.status === 'approved' ? 'مقبول' : d.status === 'rejected' ? 'مرفوض' : 'معلق'}</span></td>
            <td data-label="إجراءات">
                <button class="btn-outline btn-sm" onclick="viewDepositDetails(${d.id})">
                    <span class="material-icons" style="font-size:14px;">visibility</span> تفاصيل
                </button>
                ${d.status === 'pending' ? `
                    <button class="btn-success btn-sm" onclick="approveDepositHandler(${d.id})">قبول</button>
                    <button class="btn-danger btn-sm" onclick="rejectDepositHandler(${d.id})">رفض</button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

async function viewDepositDetails(depositId) {
    try {
        showToast('جارٍ تحميل التفاصيل...', 'info', 1500);
        const d = await fetchAdminDepositDetail(depositId);

        const statusMap = {
            pending: { text: 'معلّق', class: 'pending' },
            approved: { text: 'مقبول', class: 'completed' },
            rejected: { text: 'مرفوض', class: 'failed' }
        };
        const st = statusMap[d.status] || { text: d.status, class: 'pending' };

        const body = `
            <div class="order-detail-modal">
                <div class="order-detail-header">
                    <div>
                        <div class="order-detail-number ltr" onclick="copyToClipboard('${d.transaction_id}')" style="cursor:pointer;">${d.transaction_id}</div>
                        <div class="order-detail-date">${d.created_at ? new Date(d.created_at).toLocaleString('ar') : ''}</div>
                    </div>
                    <span class="status-badge ${st.class}">${st.text}</span>
                </div>

                <div class="order-detail-section highlight">
                    <div class="section-title-mini">
                        <span class="material-icons" style="font-size:16px;">person</span>
                        العميل
                    </div>
                    ${d.user ? `
                        <div class="detail-row">
                            <span class="detail-label">الاسم</span>
                            <span class="detail-value">${d.user.first_name || 'مستخدم'} ${d.user.last_name || ''}</span>
                        </div>
                        ${d.user.username ? `
                        <div class="detail-row">
                            <span class="detail-label">Username</span>
                            <span class="detail-value ltr">@${d.user.username}</span>
                        </div>
                        ` : ''}
                        <div class="detail-row">
                            <span class="detail-label">Telegram ID</span>
                            <span class="detail-value ltr" onclick="copyToClipboard('${d.user.telegram_id}')" style="cursor:pointer;">${d.user.telegram_id}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">رصيد العميل</span>
                            <span class="detail-value ltr" style="color:${d.user.balance < 0 ? 'var(--error)' : 'var(--success)'};font-weight:800;">
                                ${(d.user.balance || 0).toFixed(2)}$
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">KYC</span>
                            <span class="detail-value">
                                <span class="status-badge ${d.user.kyc_status === 'verified' ? 'completed' : 'unverified'}">
                                    ${d.user.kyc_status === 'verified' ? 'موثق' : 'غير موثق'}
                                </span>
                            </span>
                        </div>
                        <button class="btn-outline btn-sm" style="width:100%;margin-top:8px;" onclick="closeModal(); goToUserFromSearch(${d.user.id})">
                            <span class="material-icons" style="font-size:14px;">visibility</span>
                            عرض ملف العميل
                        </button>
                    ` : '<div style="text-align:center;color:var(--text-secondary);">المستخدم غير موجود</div>'}
                </div>

                <div class="order-detail-section">
                    <div class="section-title-mini">
                        <span class="material-icons" style="font-size:16px;">payment</span>
                        تفاصيل الإيداع
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">المبلغ</span>
                        <span class="detail-value ltr" style="font-weight:900;color:var(--success);font-size:1.2rem;">
                            ${d.amount.toFixed(2)}$ ${d.currency || ''}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">طريقة الدفع</span>
                        <span class="detail-value">${d.method_name || d.method || '-'}</span>
                    </div>
                    ${d.sender_name ? `
                    <div class="detail-row">
                        <span class="detail-label">اسم المرسل</span>
                        <span class="detail-value">${d.sender_name}</span>
                    </div>
                    ` : ''}
                    ${d.account_number ? `
                    <div class="detail-row">
                        <span class="detail-label">رقم الحساب</span>
                        <span class="detail-value ltr" onclick="copyToClipboard('${d.account_number}')" style="cursor:pointer;">${d.account_number}</span>
                    </div>
                    ` : ''}
                    ${d.txid ? `
                    <div class="detail-row">
                        <span class="detail-label">رقم العملية</span>
                        <span class="detail-value ltr" style="font-weight:700;cursor:pointer;" onclick="copyToClipboard('${d.txid}')">${d.txid} 📋</span>
                    </div>
                    ` : ''}
                    ${d.admin_note ? `
                    <div class="detail-row">
                        <span class="detail-label">ملاحظة الإدارة</span>
                        <span class="detail-value" style="color:var(--warning);">${d.admin_note}</span>
                    </div>
                    ` : ''}
                </div>

                ${d.proof_image ? `
                <div class="order-detail-section">
                    <div class="section-title-mini">
                        <span class="material-icons" style="font-size:16px;">image</span>
                        صورة الإيصال
                    </div>
                    <div class="proof-image-wrap" onclick="openImageLightbox('${d.proof_image}')">
                        <img src="${d.proof_image}" alt="إيصال" class="proof-image-thumb">
                        <div class="proof-image-overlay">
                            <span class="material-icons">zoom_in</span>
                            <div>اضغط للتكبير</div>
                        </div>
                    </div>
                </div>
                ` : `
                <div class="order-detail-section">
                    <div style="text-align:center;color:var(--text-secondary);padding:20px;">
                        <span class="material-icons" style="font-size:2rem;display:block;margin-bottom:8px;">image_not_supported</span>
                        لا يوجد صورة مرفقة
                    </div>
                </div>
                `}

                ${d.status === 'pending' ? `
                    <div class="order-detail-actions">
                        <button class="btn-success" onclick="closeModal(); approveDepositHandler(${d.id})">
                            <span class="material-icons" style="font-size:16px;">check_circle</span>
                            قبول الإيداع
                        </button>
                        <button class="btn-danger" onclick="closeModal(); rejectDepositHandler(${d.id})">
                            <span class="material-icons" style="font-size:16px;">cancel</span>
                            رفض الإيداع
                        </button>
                    </div>
                ` : `
                    <div class="order-detail-section" style="text-align:center;background:var(--background);">
                        <div style="font-size:0.85rem;color:var(--text-secondary);">
                            تم ${d.status === 'approved' ? 'قبول' : 'رفض'} هذا الإيداع
                            ${d.reviewed_at ? ` بتاريخ ${new Date(d.reviewed_at).toLocaleString('ar')}` : ''}
                        </div>
                    </div>
                `}
            </div>
        `;
        openModal('', body);
    } catch (error) {
        showToast(`فشل تحميل التفاصيل: ${error.message}`, 'error');
    }
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
            showToast(`تم اعتماد الإيداع (سداد دين: $${result.paid_debt.toFixed(2)})`, 'success');
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
                <td data-label="الكود"><strong class="ltr" onclick="copyToClipboard('${c.code}')" style="cursor:pointer;">${c.code}</strong></td>
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
// 🆕 Image Lightbox
// ============================================================
function openImageLightbox(imageUrl) {
    const lightbox = document.getElementById('imageLightbox');
    if (!lightbox) {
        const lb = document.createElement('div');
        lb.id = 'imageLightbox';
        lb.className = 'image-lightbox';
        lb.onclick = function(e) {
            if (e.target === lb || e.target.classList.contains('close-lightbox')) {
                closeImageLightbox();
            }
        };
        lb.innerHTML = `
            <button class="close-lightbox" onclick="closeImageLightbox()">×</button>
            <img src="" alt="Zoomed" class="lightbox-image">
        `;
        document.body.appendChild(lb);
    }
    const lb = document.getElementById('imageLightbox');
    lb.querySelector('.lightbox-image').src = imageUrl;
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeImageLightbox() {
    const lb = document.getElementById('imageLightbox');
    if (lb) {
        lb.classList.remove('active');
        document.body.style.overflow = '';
    }
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

// 🆕 Copy to clipboard
function copyToClipboard(text) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => showToast('تم النسخ ✓', 'success', 1500))
            .catch(() => {
                const ta = document.createElement('textarea');
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                try { document.execCommand('copy'); showToast('تم النسخ ✓', 'success', 1500); }
                catch (e) { showToast('تعذر النسخ', 'error'); }
                document.body.removeChild(ta);
            });
    } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showToast('تم النسخ ✓', 'success', 1500); }
        catch (e) { showToast('تعذر النسخ', 'error'); }
        document.body.removeChild(ta);
    }
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
    const rows = [['رقم الطلب', 'معرف المستخدم', 'المنتج', 'الكمية', 'الوحدة', 'سعر الوحدة', 'الإجمالي', 'الخصم', 'الكوبون', 'الحالة', 'التاريخ']];
    dataToExport.forEach(o => {
        rows.push([o.order_number, o.user_telegram || o.user_id, o.product_name || o.product_id, o.quantity,
            o.product_unit_name || 'قطعة',
            o.unit_price || 0, o.total_price, o.discount_amount || 0, o.coupon_code || '-',
            getStatusArabic(o.status), o.created_at ? new Date(o.created_at).toLocaleString('ar') : '']);
    });
    exportToExcel('orders', 'الطلبات', rows);
}

function exportDepositsExcel() {
    if (!depositsData.length) { showToast('لا توجد إيداعات للتصدير', 'warning'); return; }
    const rows = [['رقم العملية', 'معرف المستخدم', 'الاسم', 'المبلغ', 'العملة', 'الطريقة', 'الحالة', 'ملاحظة', 'التاريخ']];
    depositsData.forEach(d => {
        rows.push([d.transaction_id, d.user_telegram || d.user_id, d.user_name || '', d.amount, 'USD', d.method,
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
// ============ End of admin.js v14 ============
// ============================================================