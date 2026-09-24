// ============================================================
// miniapp/js/api.js — v18.3.0
// ============================================================
// 🆕 v18.3.0:
//   - retry فقط لـ [0, 503] (ليس 500)
//   - لا يُعرض "محاولة 1/2" للمستخدم — console فقط
//   - timeout أقصر (30s بدل 60s)
//   - رسائل خطأ عربية واضحة
// ============================================================

const API_BASE_URL = 'https://sanad-plus-backend.onrender.com';

const API_CONFIG = {
    maxRetries: 1,
    baseDelay: 1500,
    maxDelay: 4000,
    timeout: 30000,
    retryOnStatus: [0, 503],   // فقط اتصال/خدمة معطلة — NOT 500
};

let _authToken = null;

// ════════════════════════════════════════════════════════════
// Token Management
// ════════════════════════════════════════════════════════════
function getAuthToken() { return _authToken; }
function setAuthToken(t) { _authToken = t; }
function clearAuthToken() { _authToken = null; }

// ════════════════════════════════════════════════════════════
// apiFetch — v18.3.0
// ════════════════════════════════════════════════════════════
async function apiFetch(url, options = {}, _isRetry = false) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (_authToken && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${_authToken}`;
    }

    let response;
    try {
        response = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal,
        });
    } catch (err) {
        clearTimeout(timeoutId);
        // network error
        if (!_isRetry && !options.__noRetry) {
            await _sleep(API_CONFIG.baseDelay);
            return apiFetch(url, options, true);
        }
        throw new Error('تعذر الاتصال بالسيرفر');
    } finally {
        clearTimeout(timeoutId);
    }

    // 401 → re-auth مرة واحدة
    if (response.status === 401 && !options.__noReauth) {
        try {
            const initData = window.Telegram?.WebApp?.initData || '';
            if (initData) {
                await authenticateUser(initData);
                const opts = { ...options, __noReauth: true };
                return apiFetch(url, opts, true);
            }
        } catch (e) {
            // فشل re-auth — أكمل للـ error
        }
    }

    // retry للأخطاء المؤقتة فقط (0, 503)
    if (API_CONFIG.retryOnStatus.includes(response.status) && !_isRetry && !options.__noRetry) {
        console.warn(`[apiFetch] retry ${response.status} for ${url}`);
        await _sleep(API_CONFIG.baseDelay);
        return apiFetch(url, options, true);
    }

    // 204 / empty
    if (response.status === 204) return {};

    // Parse JSON
    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        try {
            data = await response.json();
        } catch (e) {
            data = {};
        }
    } else {
        // HTML error page (405, 500, ...)
        const text = await response.text();
        console.error(`[apiFetch] non-JSON response (${response.status}) from ${url}:`, text.substring(0, 300));
        data = { error: `خطأ في السيرفر (${response.status})` };
    }

    // Error status → throw مع البيانات
    if (!response.ok) {
        const err = new Error(data.error || `خطأ ${response.status}`);
        err.status = response.status;
        err.code = data.code;
        err.data = data;
        throw err;
    }

    return data;
}

function _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ════════════════════════════════════════════════════════════
// Authentication
// ════════════════════════════════════════════════════════════
async function authenticateUser(initData) {
    const data = await apiFetch(`${API_BASE_URL}/api/auth/telegram`, {
        method: 'POST',
        body: JSON.stringify({ initData }),
        __noRetry: true,
        __noReauth: true,
    });
    if (data.access_token) {
        setAuthToken(data.access_token);
    }
    return data.user || data;
}

// ════════════════════════════════════════════════════════════
// Public endpoints
// ════════════════════════════════════════════════════════════
async function fetchPublicSettings() {
    return apiFetch(`${API_BASE_URL}/api/settings/public`, { __noRetry: true });
}

async function fetchCategories() {
    return apiFetch(`${API_BASE_URL}/api/categories/`);
}

async function fetchProducts() {
    return apiFetch(`${API_BASE_URL}/api/products/`);
}

async function fetchPaymentMethods() {
    return apiFetch(`${API_BASE_URL}/api/payment_methods/`);
}

// ════════════════════════════════════════════════════════════
// User endpoints
// ════════════════════════════════════════════════════════════
async function fetchUserOrders() {
    return apiFetch(`${API_BASE_URL}/api/orders/`);
}

async function fetchUserDeposits() {
    return apiFetch(`${API_BASE_URL}/api/deposits/`);
}

async function createOrder(orderData) {
    return apiFetch(`${API_BASE_URL}/api/orders/create`, {
        method: 'POST',
        body: JSON.stringify(orderData),
        __noRetry: true,   // لا نكرر الطلبات — idempotency يحمي من التكرار
    });
}

async function createDeposit(depositData) {
    return apiFetch(`${API_BASE_URL}/api/deposits/create`, {
        method: 'POST',
        body: JSON.stringify(depositData),
        __noRetry: true,
    });
}

async function submitKYC(kycData) {
    return apiFetch(`${API_BASE_URL}/api/kyc/submit`, {
        method: 'POST',
        body: JSON.stringify(kycData),
        __noRetry: true,
    });
}

async function getMyKYC() {
    return apiFetch(`${API_BASE_URL}/api/kyc/my`);
}

async function fetchNotifications() {
    return apiFetch(`${API_BASE_URL}/api/user/notifications`);
}

async function markNotificationRead(id) {
    return apiFetch(`${API_BASE_URL}/api/user/notifications/read`, {
        method: 'POST',
        body: JSON.stringify({ id }),
        __noRetry: true,
    });
}

async function requestCustomService(data) {
    return apiFetch(`${API_BASE_URL}/api/user/request-service`, {
        method: 'POST',
        body: JSON.stringify(data),
        __noRetry: true,
    });
}

async function applyReferralCode(code) {
    return apiFetch(`${API_BASE_URL}/api/referrals/apply`, {
        method: 'POST',
        body: JSON.stringify({ code }),
        __noRetry: true,
    });
}

// ════════════════════════════════════════════════════════════
// Exports
// ════════════════════════════════════════════════════════════
window.API_BASE_URL = API_BASE_URL;
window.apiFetch = apiFetch;
window.getAuthToken = getAuthToken;
window.setAuthToken = setAuthToken;
window.clearAuthToken = clearAuthToken;
window.authenticateUser = authenticateUser;
window.fetchPublicSettings = fetchPublicSettings;
window.fetchCategories = fetchCategories;
window.fetchProducts = fetchProducts;
window.fetchPaymentMethods = fetchPaymentMethods;
window.fetchUserOrders = fetchUserOrders;
window.fetchUserDeposits = fetchUserDeposits;
window.createOrder = createOrder;
window.createDeposit = createDeposit;
window.submitKYC = submitKYC;
window.getMyKYC = getMyKYC;
window.fetchNotifications = fetchNotifications;
window.markNotificationRead = markNotificationRead;
window.requestCustomService = requestCustomService;
window.applyReferralCode = applyReferralCode;