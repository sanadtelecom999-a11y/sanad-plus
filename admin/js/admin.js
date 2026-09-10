// admin/js/admin.js

let currentSection = 'dashboard';
let usersData = [];
let categoriesData = [];
let productsData = [];
let paymentMethodsData = [];
let ordersData = [];
let depositsData = [];
let kycData = [];
let serviceRequestsData = [];
let activitiesData = [];
let couponsData = [];
let referralsData = [];
let filteredOrders = [];
let _otpSessionId = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!getToken()) {
        showLogin();
    } else {
        initAdminPanel();
    }
});

// ============================================================
// ============ Toast System ============
// ============================================================
function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.warn('Toast container not found:', message);
        return;
    }
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
            // Fallback في حال كان OTP معطّلاً
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

    currentSection = sectionId;

    if (window.innerWidth < 1024) {
        closeSidebar();
    }

    if (sectionId === 'dashboard') renderDashboard();
    if (sectionId === 'users') renderUsers();
    if (sectionId === 'categories') renderCategories();
    if (sectionId === 'products') renderProducts();
    if (sectionId === 'payment-methods') renderPaymentMethods();
    if (sectionId === 'orders') { filteredOrders = [...ordersData]; renderOrders(ordersData); }
    if (sectionId === 'deposits') renderDeposits(depositsData);
    if (sectionId === 'kyc') renderKYC();
    if (sectionId === 'service-requests') renderServiceRequests();
    if (sectionId === 'coupons') renderCoupons();
    if (sectionId === 'referrals') loadReferrals();
    if (sectionId === 'activities') loadActivities();
}

// ============================================================
// ============ Dashboard ============
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
}

function getStatusArabic(status) {
    const map = {
        pending: 'قيد المعالجة',
        review: 'قيد المراجعة',
        processing: 'قيد التنفيذ',
        completed: 'مكتمل',
        failed: 'فشل',
        cancelled: 'ملغي',
        approved: 'مقبول',
        rejected: 'مرفوض'
    };
    return map[status] || status;
}

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
    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><span class="material-icons">people</span>لا يوجد مستخدمون</td></tr>';
        return;
    }
    tbody.innerHTML = users.map(user => `
        <tr>
            <td data-label="Telegram ID"><span class="ltr">${user.telegram_id}</span></td>
            <td data-label="الاسم">${user.username || user.first_name || 'مستخدم'}</td>
            <td data-label="الرصيد">${user.balance.toFixed(2)}$</td>
            <td data-label="الحالة"><span class="status-badge ${user.is_banned ? 'failed' : 'completed'}">${user.is_banned ? 'محظور' : 'نشط'}</span></td>
            <td data-label="VIP">${user.vip_level > 0 ? `<span class="vip-badge">⭐ VIP${user.vip_level}</span>` : '-'}</td>
            <td data-label="إجراءات">
                <button class="btn-outline btn-sm" onclick="adjustBalance(${user.id})">رصيد</button>
                <button class="btn-outline btn-sm" onclick="toggleBan(${user.id})">${user.is_banned ? 'فك الحظر' : 'حظر'}</button>
                <button class="btn-outline btn-sm" onclick="setVIP(${user.id}, ${user.vip_level})">VIP</button>
                <button class="btn-outline btn-sm" onclick="toggleKYC(${user.id}, '${user.kyc_status}')">${user.kyc_status === 'verified' ? 'إلغاء توثيق' : 'توثيق'}</button>
            </td>
        </tr>
    `).join('');
}

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

    if (!rawAmount || rawAmount <= 0) {
        showToast('أدخل مبلغاً صحيحاً', 'warning');
        return;
    }

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

async function setVIP(userId, currentLevel) {
    const level = prompt('أدخل مستوى VIP (0 لإلغاء، 1-7):', currentLevel);
    if (level === null) return;
    const parsed = parseInt(level);
    if (isNaN(parsed) || parsed < 0) {
        showToast('مستوى غير صحيح', 'warning');
        return;
    }
    try {
        await setUserVIP(userId, parsed);
        await loadAllData();
        renderUsers();
        showToast('تم تحديث مستوى VIP', 'success');
    } catch (error) {
        showToast(`فشل تعيين VIP: ${error.message}`, 'error');
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
                <button class="btn-danger btn-sm" onclick="deleteCategoryHandler(${cat.id})">حذف</button>
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
                💡 <strong>نصيحة:</strong> ارفع صورة مربعة (1:1)<br>
                سيتم قص الصورة تلقائياً إلى مربع 512×512
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

async function deleteCategoryHandler(categoryId) {
    const confirmed = await showConfirm({
        title: 'حذف القسم',
        message: 'هل أنت متأكد من حذف هذا القسم؟ سيتم حذف جميع المنتجات المرتبطة به.',
        confirmText: 'حذف',
        type: 'danger'
    });
    if (!confirmed) return;
    try {
        await deleteCategory(categoryId);
        await loadAllData();
        renderCategories();
        showToast('تم حذف القسم بنجاح', 'success');
    } catch (error) {
        showToast(`فشل حذف القسم: ${error.message}`, 'error');
    }
}

// ============================================================
// ============ Products ============
// ============================================================
function renderProducts() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    if (!productsData.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><span class="material-icons">inventory_2</span>لا توجد منتجات</td></tr>';
        return;
    }
    tbody.innerHTML = productsData.map(prod => `
        <tr>
            <td data-label="الصورة"><img src="${prod.image || ''}" alt="${prod.name}" onerror="this.style.display='none'"></td>
            <td data-label="الاسم">${prod.name}</td>
            <td data-label="القسم">${categoriesData.find(c => c.id === prod.category_id)?.name || '-'}</td>
            <td data-label="السعر">${prod.base_price}$</td>
            <td data-label="الكمية">${prod.base_quantity}</td>
            <td data-label="النوع"><span class="status-badge ${prod.product_type === 'bundle' ? 'pending' : prod.product_type === 'topup' ? 'verified' : 'completed'}">${prod.product_type === 'bundle' ? 'باقة' : prod.product_type === 'topup' ? 'رصيد' : 'كمية'}</span></td>
            <td data-label="إجراءات">
                <button class="btn-danger btn-sm" onclick="deleteProductHandler(${prod.id})">حذف</button>
            </td>
        </tr>
    `).join('');
}

function openProductModal() {
    const body = `
        <h3 style="margin-bottom:14px;">إضافة منتج</h3>
        <div class="form-group"><label>اسم المنتج</label><input type="text" id="productName"></div>
        <div class="form-group"><label>القسم</label><select id="productCategoryId">${categoriesData.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>النوع</label><select id="productType" onchange="toggleProductTypeFields()"><option value="quantity">كمية</option><option value="bundle">باقة</option><option value="topup">رصيد</option></select></div>
        <div class="form-group"><label>السعر الأساسي (دولار)</label><input type="number" id="productPrice" value="0" step="0.01"></div>
        <div class="form-group" id="quantityField"><label>الكمية الأساسية</label><input type="number" id="productQuantity" value="0"></div>
        <div class="form-group"><label>نوع الحقل المخصص</label><select id="productInputType"><option value="id">معرف اللاعب (ID)</option><option value="phone">رقم الهاتف</option><option value="none">بدون</option></select></div>
        <div class="form-group">
            <label>صورة المنتج</label>
            <div class="image-preview" id="productImagePreview">لا صورة</div>
            <input type="file" id="productImage" accept="image/*" onchange="previewImage(this,'productImagePreview')">
            <small style="color:var(--text-secondary);font-size:0.75rem;display:block;margin-top:6px;line-height:1.5;">
                💡 <strong>نصيحة:</strong> ارفع صورة مربعة (1:1)<br>
                سيتم قص الصورة تلقائياً إلى مربع 512×512
            </small>
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
    if (qf) qf.style.display = type === 'bundle' ? 'none' : 'block';
}

async function saveProduct(btn) {
    const name = document.getElementById('productName').value;
    const categoryId = parseInt(document.getElementById('productCategoryId').value);
    const type = document.getElementById('productType').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const inputType = document.getElementById('productInputType').value;
    let baseQuantity = 0;
    if (type !== 'bundle') baseQuantity = parseInt(document.getElementById('productQuantity').value);
    if (!name || !categoryId) { showToast('أدخل البيانات المطلوبة', 'warning'); return; }
    const imageFile = document.getElementById('productImage').files[0];
    let image = '';
    if (imageFile) image = await fileToSquareBase64(imageFile, 512);

    if (btn) { btn.disabled = true; btn.textContent = 'جارٍ الحفظ...'; }
    try {
        await createProduct({ name, category_id: categoryId, product_type: type, base_price: price, base_quantity: baseQuantity, input_type: inputType, image });
        closeModal();
        await loadAllData();
        renderProducts();
        showToast('تم إضافة المنتج بنجاح', 'success');
    } catch (error) {
        showToast(`فشل إضافة المنتج: ${error.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'حفظ'; }
    }
}

async function deleteProductHandler(productId) {
    const confirmed = await showConfirm({
        title: 'حذف المنتج',
        message: 'هل أنت متأكد من حذف هذا المنتج؟',
        confirmText: 'حذف',
        type: 'danger'
    });
    if (!confirmed) return;
    try {
        await deleteProduct(productId);
        await loadAllData();
        renderProducts();
        showToast('تم حذف المنتج بنجاح', 'success');
    } catch (error) {
        showToast(`فشل حذف المنتج: ${error.message}`, 'error');
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
            <label>صورة QR</label>
            <div class="image-preview" id="paymentQRPreview">لا صورة</div>
            <input type="file" id="paymentQR" accept="image/*" onchange="previewImage(this,'paymentQRPreview')">
        </div>
        <div class="form-group">
            <label>لوجو الطريقة</label>
            <div class="image-preview" id="paymentLogoPreview">لا صورة</div>
            <input type="file" id="paymentLogo" accept="image/*" onchange="previewImage(this,'paymentLogoPreview')">
            <small style="color:var(--text-secondary);font-size:0.75rem;display:block;margin-top:6px;line-height:1.5;">
                💡 <strong>نصيحة:</strong> ارفع صورة مربعة (1:1)
            </small>
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
            name,
            description: '',
            account_name,
            account,
            icon: logo_image,
            qr_image,
            is_active: true
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
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td data-label="رقم الطلب"><span class="ltr">${order.order_number}</span></td>
            <td data-label="المنتج">${order.product_name || order.product_id}</td>
            <td data-label="الكمية">${order.quantity}</td>
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
    `).join('');
}

async function changeOrderStatus(orderId, status) {
    const confirmed = await showConfirm({
        title: 'تغيير حالة الطلب',
        message: `هل أنت متأكد من تغيير حالة الطلب إلى "${getStatusArabic(status)}"؟`,
        confirmText: 'تأكيد',
        type: 'warning'
    });
    if (!confirmed) {
        renderOrders(filteredOrders.length ? filteredOrders : ordersData);
        return;
    }
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
        if (delivery.phone) deliveryInfo += `<div style="margin-bottom:6px;"><strong>رقم الهاتف:</strong> <span class="ltr">${delivery.phone}</span></div>`;
        if (delivery.bundle_name) deliveryInfo += `<div style="margin-bottom:6px;"><strong>الباقة:</strong> ${delivery.bundle_name}</div>`;
    } catch (e) {
        deliveryInfo = `<div>${order.delivery_data || '-'}</div>`;
    }
    const body = `
        <div style="text-align:right;">
            <h3>تفاصيل الطلب</h3>
            <p><strong>رقم الطلب:</strong> <span class="ltr">${order.order_number}</span></p>
            <p><strong>المنتج:</strong> ${order.product_name || order.product_id}</p>
            <p><strong>الكمية:</strong> ${order.quantity}</p>
            <p><strong>السعر الإجمالي:</strong> ${order.total_price}$</p>
            ${order.discount_amount ? `<p><strong>الخصم:</strong> ${order.discount_amount}$ (${order.coupon_code || ''})</p>` : ''}
            <p><strong>الحالة:</strong> ${order.status}</p>
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
        await approveDeposit(depositId);
        await loadAllData();
        renderDeposits(depositsData);
        showToast('تم اعتماد الإيداع بنجاح', 'success');
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
            <td data-label="الصورة">${k.selfie_image ? `<a href="${k.selfie_image}" target="_blank" class="btn-outline btn-sm">عرض</a>` : '-'}</td>
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
        code,
        description,
        discount_type,
        discount_value,
        min_amount,
        max_discount,
        max_uses,
        is_active: true,
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

function exportReferralsCSV() {
    const rows = [['#', 'المُحيل', 'المُحال', 'المكافأة', 'الحالة', 'التاريخ']];
    referralsData.forEach(r => {
        rows.push([
            r.id,
            r.referrer_telegram || r.referrer_id,
            r.referred_telegram || r.referred_user_id,
            r.reward_amount + '$',
            r.status,
            r.created_at ? new Date(r.created_at).toLocaleString('ar') : ''
        ]);
    });
    downloadCSV('referrals.csv', rows);
    showToast('تم تصدير الملف', 'success');
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

    if (statusFilter !== 'all') {
        filtered = filtered.filter(o => o.status === statusFilter);
    }

    if (fromDate) {
        const fromTime = new Date(fromDate).getTime();
        filtered = filtered.filter(o => o.created_at && new Date(o.created_at).getTime() >= fromTime);
    }

    if (toDate) {
        const toTime = new Date(toDate).getTime() + (24 * 60 * 60 * 1000);
        filtered = filtered.filter(o => o.created_at && new Date(o.created_at).getTime() <= toTime);
    }

    if (sortFilter === 'newest') {
        filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (sortFilter === 'oldest') {
        filtered.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    } else if (sortFilter === 'price_high') {
        filtered.sort((a, b) => (b.total_price || 0) - (a.total_price || 0));
    } else if (sortFilter === 'price_low') {
        filtered.sort((a, b) => (a.total_price || 0) - (b.total_price || 0));
    }

    filteredOrders = filtered;
    renderOrders(filtered);
}

function resetOrderFilters() {
    const searchInput = document.getElementById('orderSearchQuery');
    const statusSelect = document.getElementById('orderStatusFilter');
    const fromInput = document.getElementById('orderFromDate');
    const toInput = document.getElementById('orderToDate');
    const sortSelect = document.getElementById('orderSortFilter');

    if (searchInput) searchInput.value = '';
    if (statusSelect) statusSelect.value = 'all';
    if (fromInput) fromInput.value = '';
    if (toInput) toInput.value = '';
    if (sortSelect) sortSelect.value = 'newest';

    filteredOrders = [...ordersData];
    renderOrders(ordersData);
}

// ============================================================
// ============ CSV Export ============
// ============================================================
function downloadCSV(filename, rows) {
    const csvContent = rows.map(row =>
        row.map(cell => {
            const str = String(cell ?? '').replace(/"/g, '""');
            return `"${str}"`;
        }).join(',')
    ).join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function exportUsersCSV() {
    const rows = [['Telegram ID', 'الاسم', 'الرصيد', 'الحالة', 'VIP', 'KYC']];
    usersData.forEach(u => {
        rows.push([
            u.telegram_id,
            u.username || u.first_name || 'مستخدم',
            u.balance.toFixed(2) + '$',
            u.is_banned ? 'محظور' : 'نشط',
            u.vip_level > 0 ? 'VIP' + u.vip_level : '-',
            u.kyc_status
        ]);
    });
    downloadCSV('users.csv', rows);
    showToast('تم تصدير المستخدمين', 'success');
}

function exportOrdersCSV() {
    const rows = [['رقم الطلب', 'المنتج', 'الكمية', 'السعر الإجمالي', 'الخصم', 'الحالة', 'التاريخ']];
    const dataToExport = filteredOrders.length ? filteredOrders : ordersData;
    dataToExport.forEach(o => {
        rows.push([
            o.order_number,
            o.product_name || o.product_id,
            o.quantity,
            o.total_price + '$',
            (o.discount_amount || 0) + '$',
            o.status,
            o.created_at ? new Date(o.created_at).toLocaleString('ar') : ''
        ]);
    });
    downloadCSV('orders.csv', rows);
    showToast('تم تصدير الطلبات', 'success');
}

function exportDepositsCSV() {
    const rows = [['رقم العملية', 'المستخدم', 'المبلغ', 'الطريقة', 'الحالة', 'التاريخ']];
    depositsData.forEach(d => {
        rows.push([
            d.transaction_id,
            d.user_id,
            d.amount + '$',
            d.method,
            d.status,
            d.created_at ? new Date(d.created_at).toLocaleString('ar') : ''
        ]);
    });
    downloadCSV('deposits.csv', rows);
    showToast('تم تصدير الإيداعات', 'success');
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
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                resolve(dataUrl);
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

                ctx.drawImage(
                    img,
                    sx, sy, minSide, minSide,
                    0, 0, size, size
                );

                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function saveSettings() {
    showToast('تم حفظ الإعدادات', 'success');
}