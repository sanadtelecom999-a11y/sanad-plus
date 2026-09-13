// miniapp/js/api.js

const API_BASE_URL = 'https://sanad-plus-backend.onrender.com';

// ============================================================
// 🔑 JWT Storage
// ============================================================
const TOKEN_KEY = 'user_token';

function getAuthToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
}

function setAuthToken(token) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch (e) {}
}

function clearAuthToken() {
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
}

// ============================================================
// ⚙️ Retry Config
// ============================================================
const RETRY_CONFIG = {
    maxRetries: 2,
    baseDelay: 3000,
    maxDelay: 15000,
    timeout: 60000,
    retryOnStatus: [0, 408, 429, 500, 502, 503, 504],
};

// ============================================================
// 🚀 apiFetch — مع JWT + Retry
// ============================================================
async function apiFetch(url, options = {}, retries = RETRY_CONFIG.maxRetries) {
    const token = getAuthToken();

    const config = {
        method: options.method || 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
        ...options,
    };

    // إضافة التوكن إن وُجد
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RETRY_CONFIG.timeout);
    config.signal = controller.signal;

    try {
        const response = await fetch(url, config);
        clearTimeout(timeoutId);

        // 401 → التوكن منتهي أو غير صالح
        if (response.status === 401) {
            clearAuthToken();
            const initData = window.Telegram?.WebApp?.initData || '';
            if (initData && !options.__retried_auth) {
                console.warn('⚠️ Token منتهي — إعادة المصادقة');
                try {
                    const authRes = await fetch(`${API_BASE_URL}/api/auth/telegram`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ initData }),
                    });
                    if (authRes.ok) {
                        const authData = await authRes.json();
                        if (authData.access_token) {
                            setAuthToken(authData.access_token);
                            return apiFetch(url, { ...options, __retried_auth: true }, retries);
                        }
                    }
                } catch (e) {
                    console.error('فشل إعادة المصادقة:', e);
                }
            }
        }

        // Retry على 5xx
        if (RETRY_CONFIG.retryOnStatus.includes(response.status) && retries > 0) {
            const delay = calculateDelay(retries);
            console.warn(`⚠️ Status ${response.status} — Retry in ${delay}ms`);
            showConnectingIndicator(RETRY_CONFIG.maxRetries - retries + 1);
            await sleep(delay);
            return apiFetch(url, options, retries - 1);
        }

        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            let errorMessage = `خطأ ${response.status}`;
            if (typeof data === 'object' && data.error) errorMessage = data.error;
            else if (typeof data === 'string' && data) errorMessage = data;
            throw new Error(errorMessage);
        }

        hideConnectingIndicator();
        return data;

    } catch (error) {
        clearTimeout(timeoutId);

        const isRetryable = (
            error.name === 'AbortError' ||
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError')
        );

        if (isRetryable && retries > 0) {
            const delay = calculateDelay(retries);
            console.warn(`⚠️ Network error — Retry in ${delay}ms`);
            showConnectingIndicator(RETRY_CONFIG.maxRetries - retries + 1);
            await sleep(delay);
            return apiFetch(url, options, retries - 1);
        }

        hideConnectingIndicator();
        throw error;
    }
}

function calculateDelay(retriesLeft) {
    const attempt = RETRY_CONFIG.maxRetries - retriesLeft;
    return Math.min(RETRY_CONFIG.baseDelay * Math.pow(2, attempt), RETRY_CONFIG.maxDelay);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function showConnectingIndicator(attempt) {
    let el = document.getElementById('__connecting_msg');
    if (!el) {
        el = document.createElement('div');
        el.id = '__connecting_msg';
        el.style.cssText = `
            position: fixed; top: 70px; left: 50%; transform: translateX(-50%);
            background: #0D47A1; color: white; padding: 10px 18px;
            border-radius: 12px; font-size: 13px; z-index: 99999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2); display: flex;
            align-items: center; gap: 8px; font-family: 'Tajawal', sans-serif;
        `;
        document.body.appendChild(el);
    }
    el.innerHTML = `
        <span style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:__spin 0.8s linear infinite;"></span>
        جاري الاتصال... (محاولة ${attempt})
    `;
    if (!document.getElementById('__spin_style')) {
        const style = document.createElement('style');
        style.id = '__spin_style';
        style.textContent = '@keyframes __spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(style);
    }
}

function hideConnectingIndicator() {
    const el = document.getElementById('__connecting_msg');
    if (el) el.remove();
}

function pingBackend() {
    fetch(`${API_BASE_URL}/api/categories/`, { method: 'GET' }).catch(() => {});
}

// ============================================================
// 🔐 authenticateUser — يحفظ التوكن
// ============================================================
async function authenticateUser(initData) {
    let telegram_id = null;
    let first_name = '';
    let last_name = '';
    let username = '';

    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
        const u = window.Telegram.WebApp.initDataUnsafe.user;
        telegram_id = u.id;
        first_name = u.first_name || '';
        last_name = u.last_name || '';
        username = u.username || '';
    } else if (window.currentUser && window.currentUser.id) {
        telegram_id = window.currentUser.id;
        first_name = window.currentUser.first_name || '';
        last_name = window.currentUser.last_name || '';
        username = window.currentUser.username || '';
    }

    if (!telegram_id) {
        throw new Error('TELEGRAM_ID_MISSING');
    }

    if (!initData) {
        throw new Error('INITDATA_MISSING');
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            telegram_id,
            first_name,
            last_name,
            username,
            initData,
        }),
    });

    if (!response.ok) {
        let errorMsg = 'فشل المصادقة';
        try {
            const err = await response.json();
            if (err.error) errorMsg = err.error;
        } catch (e) {}
        throw new Error(errorMsg);
    }

    const data = await response.json();

    if (data.access_token) {
        setAuthToken(data.access_token);
        console.log('✅ تم حفظ JWT');
    }

    return data.user || data;
}

// ============================================================
// 🆕 Public Settings (بدون مصادقة)
// ============================================================
async function fetchPublicSettings() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/settings/public`);
        if (!response.ok) return {};
        return await response.json();
    } catch (e) {
        console.warn('فشل تحميل الإعدادات العامة:', e);
        return {};
    }
}

// ============================================================
// 🔌 API Wrappers — كلها محمية بـ JWT
// ============================================================
async function fetchCategories() {
    return await apiFetch(`${API_BASE_URL}/api/categories/`);
}

async function fetchProducts(categoryId = null) {
    const url = categoryId
        ? `${API_BASE_URL}/api/products/?category_id=${categoryId}`
        : `${API_BASE_URL}/api/products/`;
    return await apiFetch(url);
}

async function fetchPaymentMethods() {
    return await apiFetch(`${API_BASE_URL}/api/payment-methods/`);
}

async function fetchUserOrders() {
    // ✅ بدون telegram_id — JWT يعرف من أنت
    return await apiFetch(`${API_BASE_URL}/api/orders/my`);
}

async function fetchUserDeposits() {
    return await apiFetch(`${API_BASE_URL}/api/deposits/my`);
}

async function createOrder(orderData) {
    // احذف telegram_id — غير مطلوب
    const { telegram_id, ...cleanData } = orderData;
    return await apiFetch(`${API_BASE_URL}/api/orders/`, {
        method: 'POST',
        body: JSON.stringify(cleanData),
    });
}

async function createDeposit(depositData) {
    const { telegram_id, ...cleanData } = depositData;
    return await apiFetch(`${API_BASE_URL}/api/deposits/`, {
        method: 'POST',
        body: JSON.stringify(cleanData),
    });
}

async function submitKYC(kycData) {
    const { telegram_id, ...cleanData } = kycData;
    return await apiFetch(`${API_BASE_URL}/api/kyc/submit`, {
        method: 'POST',
        body: JSON.stringify(cleanData),
    });
}

async function getMyKYC() {
    return await apiFetch(`${API_BASE_URL}/api/kyc/my`);
}

async function fetchNotifications() {
    return await apiFetch(`${API_BASE_URL}/api/user/notifications`);
}

async function markNotificationRead(notificationId) {
    await apiFetch(`${API_BASE_URL}/api/user/notifications/read`, {
        method: 'POST',
        body: JSON.stringify({ id: notificationId }),
    });
}

async function requestCustomService(serviceData) {
    const { telegram_id, ...cleanData } = serviceData;
    return await apiFetch(`${API_BASE_URL}/api/user/request-service`, {
        method: 'POST',
        body: JSON.stringify(cleanData),
    });
}

// Ping عند التحميل
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setTimeout(pingBackend, 100);
    });
}