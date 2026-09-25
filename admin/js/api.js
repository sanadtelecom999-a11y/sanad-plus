/* ============================================================
   🔌 SANAD PLUS⁺ Admin API — v17
   ============================================================
   - apiRequest() موحّد
   - JWT تلقائي
   - Retry + Timeout
   - معالجة 401 → redirect login
   - v16: Archive + Restore endpoints
   - v17: Discounts endpoints (general + per-product)
   ============================================================ */

const API_BASE_URL = 'https://sanad-plus-backend.onrender.com';
const ADMIN_TOKEN_KEY = 'admin_token';
const REQUEST_TIMEOUT = 30000;

/* ============================================================
   🔐 Token Management
   ============================================================ */
function getToken() {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
}

function setToken(token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

function clearToken() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
}

/* Aliases للتوافق مع admin.js القديم */
const getAdminToken = getToken;
const setAdminToken = setToken;
const clearAdminToken = clearToken;

/* ============================================================
   🌐 Core apiRequest
   ============================================================ */
async function apiRequest(path, options = {}) {
    const url = `${API_BASE_URL}${path}`;
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // 401 → session expired
        if (response.status === 401) {
            clearToken();
            if (typeof showLogin === 'function') showLogin();
            throw new Error('انتهت الجلسة، يرجى تسجيل الدخول مجدداً');
        }

        // 403 → forbidden
        if (response.status === 403) {
            throw new Error('غير مصرح لك بهذا الإجراء');
        }

        // 429 → rate limit
        if (response.status === 429) {
            throw new Error('محاولات كثيرة، يرجى المحاولة لاحقاً');
        }

        // 5xx → server error
        if (response.status >= 500) {
            throw new Error('خطأ في الخادم، حاول لاحقاً');
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || `فشل الطلب (${response.status})`);
        }

        return data;
    } catch (err) {
        clearTimeout(timeoutId);

        if (err.name === 'AbortError') {
            throw new Error('انتهت مهلة الطلب');
        }
        throw err;
    }
}

/* ============================================================
   🔐 Auth
   ============================================================ */
async function adminLogin(username, password) {
    return await apiRequest('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
}

async function verifyAdminOTP(sessionId, otpCode) {
    const data = await apiRequest('/admin/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId, otp_code: otpCode }),
    });
    if (data.token) setToken(data.token);
    return data;
}

async function logout() {
    try {
        await apiRequest('/admin/api/logout', { method: 'POST' });
    } catch (_) { /* ignore */ }
    clearToken();
    location.reload();
}

/* ============================================================
   👥 Users
   ============================================================ */
async function fetchAdminUsers() {
    return await apiRequest('/admin/api/users');
}

async function fetchAdminUserDetail(userId) {
    return await apiRequest(`/admin/api/users/${userId}`);
}

async function adjustUserBalance(userId, amount, note = '') {
    return await apiRequest(`/admin/api/users/${userId}/balance`, {
        method: 'POST',
        body: JSON.stringify({ amount, note }),
    });
}

async function toggleUserBan(userId) {
    return await apiRequest(`/admin/api/users/${userId}/ban`, { method: 'POST' });
}

async function setUserVIP(userId, vipLevel) {
    return await apiRequest(`/admin/api/users/${userId}/vip`, {
        method: 'POST',
        body: JSON.stringify({ vip_level: vipLevel }),
    });
}

async function toggleUserKYC(userId, status) {
    return await apiRequest(`/admin/api/users/${userId}/kyc`, {
        method: 'POST',
        body: JSON.stringify({ status }),
    });
}

async function setUserNegativeBalance(userId, allow, maxNegative) {
    return await apiRequest(`/admin/api/users/${userId}/negative-balance`, {
        method: 'POST',
        body: JSON.stringify({ allow, max_negative: maxNegative }),
    });
}

/* ============================================================
   🆕 v17: Discounts
   ============================================================ */
async function fetchUserDiscounts(userId) {
    return await apiRequest(`/admin/api/users/${userId}/discounts`);
}

async function setGeneralDiscount(userId, percent) {
    return await apiRequest(`/admin/api/users/${userId}/discounts/general`, {
        method: 'POST',
        body: JSON.stringify({ percent }),
    });
}

async function setProductDiscount(userId, productId, percent) {
    return await apiRequest(`/admin/api/users/${userId}/discounts/product`, {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, percent }),
    });
}

async function deleteProductDiscount(userId, discountId) {
    return await apiRequest(`/admin/api/users/${userId}/discounts/${discountId}`, {
        method: 'DELETE',
    });
}

/* ============================================================
   📁 Categories
   ============================================================ */
async function fetchAdminCategories() {
    return await apiRequest('/admin/api/categories');
}

async function createCategory(payload) {
    return await apiRequest('/admin/api/categories', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

async function deleteCategory(catId) {
    return await apiRequest(`/admin/api/categories/${catId}`, { method: 'DELETE' });
}

async function restoreCategory(catId) {
    return await apiRequest(`/admin/api/categories/${catId}/restore`, { method: 'POST' });
}

/* ============================================================
   📦 Products
   ============================================================ */
async function fetchAdminProducts() {
    return await apiRequest('/admin/api/products');
}

async function fetchProductDetail(productId) {
    return await apiRequest(`/admin/api/products/${productId}`);
}

async function createProduct(payload) {
    return await apiRequest('/admin/api/products', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

async function updateProduct(productId, payload) {
    return await apiRequest(`/admin/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

async function deleteProduct(productId) {
    return await apiRequest(`/admin/api/products/${productId}`, { method: 'DELETE' });
}

async function restoreProduct(productId) {
    return await apiRequest(`/admin/api/products/${productId}/restore`, { method: 'POST' });
}

/* ============================================================
   🎁 Bundles
   ============================================================ */
async function fetchProductBundles(productId) {
    return await apiRequest(`/admin/api/products/${productId}/bundles`);
}

async function createProductBundle(productId, payload) {
    return await apiRequest(`/admin/api/products/${productId}/bundles`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

async function updateProductBundle(productId, bundleId, payload) {
    return await apiRequest(`/admin/api/products/${productId}/bundles/${bundleId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

async function deleteProductBundle(productId, bundleId) {
    return await apiRequest(`/admin/api/products/${productId}/bundles/${bundleId}`, {
        method: 'DELETE',
    });
}

/* ============================================================
   📥 Archive (Categories + Products القديم)
   ============================================================ */
async function fetchArchive() {
    return await apiRequest('/admin/api/archive');
}

/* ============================================================
   💳 Payment Methods
   ============================================================ */
async function fetchAdminPaymentMethods() {
    return await apiRequest('/admin/api/payment-methods');
}

async function createPaymentMethod(payload) {
    return await apiRequest('/admin/api/payment-methods', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

async function updatePaymentMethod(methodId, payload) {
    return await apiRequest(`/admin/api/payment-methods/${methodId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

async function deletePaymentMethod(methodId) {
    return await apiRequest(`/admin/api/payment-methods/${methodId}`, {
        method: 'DELETE',
    });
}

/* ============================================================
   📋 Orders
   ============================================================ */
async function fetchAdminOrders() {
    return await apiRequest('/admin/api/orders');
}

async function fetchAdminOrderDetail(orderId) {
    return await apiRequest(`/admin/api/orders/${orderId}`);
}

async function fetchAdminOrderFull(orderId) {
    return await apiRequest(`/admin/api/orders/${orderId}/full`);
}

async function updateOrderStatus(orderId, status) {
    return await apiRequest(`/admin/api/orders/${orderId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
    });
}

async function bulkUpdateOrderStatus(orderIds, status) {
    return await apiRequest('/admin/api/orders/bulk-status', {
        method: 'POST',
        body: JSON.stringify({ order_ids: orderIds, status }),
    });
}

/* ============================================================
   💰 Deposits
   ============================================================ */
async function fetchAdminDeposits() {
    return await apiRequest('/admin/api/deposits');
}

async function fetchAdminDepositDetail(depositId) {
    return await apiRequest(`/admin/api/deposits/${depositId}`);
}

async function approveDeposit(depositId) {
    return await apiRequest(`/admin/api/deposits/${depositId}/approve`, {
        method: 'POST',
    });
}

async function rejectDeposit(depositId, reason = '') {
    return await apiRequest(`/admin/api/deposits/${depositId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    });
}

/* ============================================================
   🪪 KYC
   ============================================================ */
async function fetchAdminKYC() {
    return await apiRequest('/admin/api/kyc');
}

async function approveKYCRequest(kycId) {
    return await apiRequest(`/admin/api/kyc/${kycId}/approve`, { method: 'POST' });
}

async function rejectKYCRequest(kycId, reason = '') {
    return await apiRequest(`/admin/api/kyc/${kycId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    });
}

/* ============================================================
   🛠️ Service Requests
   ============================================================ */
async function fetchServiceRequests() {
    return await apiRequest('/admin/api/service-requests');
}

async function updateServiceRequest(reqId, payload) {
    return await apiRequest(`/admin/api/service-requests/${reqId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

/* ============================================================
   🎟️ Coupons
   ============================================================ */
async function fetchAdminCoupons() {
    return await apiRequest('/admin/api/coupons');
}

async function createCoupon(payload) {
    return await apiRequest('/admin/api/coupons', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

async function updateCoupon(couponId, payload) {
    return await apiRequest(`/admin/api/coupons/${couponId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

async function deleteCoupon(couponId) {
    return await apiRequest(`/admin/api/coupons/${couponId}`, { method: 'DELETE' });
}

/* ============================================================
   🎁 Referrals
   ============================================================ */
async function fetchAdminReferrals() {
    return await apiRequest('/admin/api/referrals');
}

/* ============================================================
   📜 Activities + Audit
   ============================================================ */
async function fetchActivities() {
    return await apiRequest('/admin/api/activities');
}

async function fetchAuditLog(filters = {}) {
    const params = new URLSearchParams();
    if (filters.user_id) params.append('user_id', filters.user_id);
    if (filters.action) params.append('action', filters.action);
    if (filters.limit) params.append('limit', filters.limit);
    const qs = params.toString();
    return await apiRequest(`/admin/api/audit-log${qs ? '?' + qs : ''}`);
}

/* ============================================================
   🔔 Notifications
   ============================================================ */
async function sendNotification(payload) {
    return await apiRequest('/admin/api/notifications', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

/* ============================================================
   ⚙️ Settings
   ============================================================ */
async function fetchAdminSettings() {
    return await apiRequest('/admin/api/settings');
}

async function saveAdminSettings(payload) {
    return await apiRequest('/admin/api/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

/* ============================================================
   🆕 v16: ARCHIVE — جلب العناصر المؤرشفة
   ============================================================ */
async function fetchArchivedOrders() {
    return await apiRequest('/admin/api/archive/orders');
}

async function fetchArchivedDeposits() {
    return await apiRequest('/admin/api/archive/deposits');
}

async function fetchArchivedKYC() {
    return await apiRequest('/admin/api/archive/kyc');
}

async function fetchArchivedServices() {
    return await apiRequest('/admin/api/archive/services');
}

async function fetchArchiveCounts() {
    return await apiRequest('/admin/api/archive/counts');
}

/* ============================================================
   🆕 v16: RESTORE — إرجاع العنصر للقائمة الرئيسية
   ============================================================ */
async function restoreOrder(orderId) {
    return await apiRequest(`/admin/api/orders/${orderId}/restore`, { method: 'POST' });
}

async function restoreDeposit(depositId) {
    return await apiRequest(`/admin/api/deposits/${depositId}/restore`, { method: 'POST' });
}

async function restoreKYC(kycId) {
    return await apiRequest(`/admin/api/kyc/${kycId}/restore`, { method: 'POST' });
}

async function restoreService(reqId) {
    return await apiRequest(`/admin/api/services/${reqId}/restore`, { method: 'POST' });
}

/* ============================================================
   📤 Global expose (للاستخدام من admin.js و admin-v16.js)
   ============================================================ */
window.apiRequest = apiRequest;

// Auth
window.adminLogin = adminLogin;
window.verifyAdminOTP = verifyAdminOTP;
window.logout = logout;
window.getToken = getToken;
window.setToken = setToken;
window.clearToken = clearToken;
window.getAdminToken = getToken;
window.setAdminToken = setToken;
window.clearAdminToken = clearToken;

// Users
window.fetchAdminUsers = fetchAdminUsers;
window.fetchAdminUserDetail = fetchAdminUserDetail;
window.adjustUserBalance = adjustUserBalance;
window.toggleUserBan = toggleUserBan;
window.setUserVIP = setUserVIP;
window.toggleUserKYC = toggleUserKYC;
window.setUserNegativeBalance = setUserNegativeBalance;

// v17 Discounts
window.fetchUserDiscounts = fetchUserDiscounts;
window.setGeneralDiscount = setGeneralDiscount;
window.setProductDiscount = setProductDiscount;
window.deleteProductDiscount = deleteProductDiscount;

// Categories
window.fetchAdminCategories = fetchAdminCategories;
window.createCategory = createCategory;
window.deleteCategory = deleteCategory;
window.restoreCategory = restoreCategory;

// Products
window.fetchAdminProducts = fetchAdminProducts;
window.fetchProductDetail = fetchProductDetail;
window.createProduct = createProduct;
window.updateProduct = updateProduct;
window.deleteProduct = deleteProduct;
window.restoreProduct = restoreProduct;

// Bundles
window.fetchProductBundles = fetchProductBundles;
window.createProductBundle = createProductBundle;
window.updateProductBundle = updateProductBundle;
window.deleteProductBundle = deleteProductBundle;

// Old archive (categories/products)
window.fetchArchive = fetchArchive;

// Payment Methods
window.fetchAdminPaymentMethods = fetchAdminPaymentMethods;
window.createPaymentMethod = createPaymentMethod;
window.updatePaymentMethod = updatePaymentMethod;
window.deletePaymentMethod = deletePaymentMethod;

// Orders
window.fetchAdminOrders = fetchAdminOrders;
window.fetchAdminOrderDetail = fetchAdminOrderDetail;
window.fetchAdminOrderFull = fetchAdminOrderFull;
window.updateOrderStatus = updateOrderStatus;
window.bulkUpdateOrderStatus = bulkUpdateOrderStatus;

// Deposits
window.fetchAdminDeposits = fetchAdminDeposits;
window.fetchAdminDepositDetail = fetchAdminDepositDetail;
window.approveDeposit = approveDeposit;
window.rejectDeposit = rejectDeposit;

// KYC
window.fetchAdminKYC = fetchAdminKYC;
window.approveKYCRequest = approveKYCRequest;
window.rejectKYCRequest = rejectKYCRequest;

// Service Requests
window.fetchServiceRequests = fetchServiceRequests;
window.updateServiceRequest = updateServiceRequest;

// Coupons
window.fetchAdminCoupons = fetchAdminCoupons;
window.createCoupon = createCoupon;
window.updateCoupon = updateCoupon;
window.deleteCoupon = deleteCoupon;

// Referrals
window.fetchAdminReferrals = fetchAdminReferrals;

// Activities + Audit
window.fetchActivities = fetchActivities;
window.fetchAuditLog = fetchAuditLog;

// Notifications + Settings
window.sendNotification = sendNotification;
window.fetchAdminSettings = fetchAdminSettings;
window.saveAdminSettings = saveAdminSettings;

// v16: Archive
window.fetchArchivedOrders = fetchArchivedOrders;
window.fetchArchivedDeposits = fetchArchivedDeposits;
window.fetchArchivedKYC = fetchArchivedKYC;
window.fetchArchivedServices = fetchArchivedServices;
window.fetchArchiveCounts = fetchArchiveCounts;

// v16: Restore
window.restoreOrder = restoreOrder;
window.restoreDeposit = restoreDeposit;
window.restoreKYC = restoreKYC;
window.restoreService = restoreService;