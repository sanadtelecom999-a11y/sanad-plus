// miniapp/js/api.js

const API_BASE_URL = 'https://sanad-plus-backend.onrender.com';

// ============================================================
// ⚙️ إعدادات Retry (Cold Start على Render Free)
// ============================================================
const RETRY_CONFIG = {
    maxRetries: 2,
    baseDelay: 3000,
    maxDelay: 15000,
    timeout: 60000,  // 60 ثانية
    retryOnStatus: [0, 408, 429, 500, 502, 503, 504],
};


async function apiFetch(url, options = {}, retries = RETRY_CONFIG.maxRetries) {
    // دمج الإعدادات مع إضافة Authorization إن وجد
    const config = {
        method: options.method || 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
        ...options,
    };

    // Timeout عبر AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RETRY_CONFIG.timeout);
    config.signal = controller.signal;

    try {
        const response = await fetch(url, config);
        clearTimeout(timeoutId);

        // 5xx → أعد المحاولة
        if (RETRY_CONFIG.retryOnStatus.includes(response.status) && retries > 0) {
            const delay = calculateDelay(retries);
            console.warn(`⚠️ Status ${response.status} — Retry in ${delay}ms`);
            showConnectingIndicator(RETRY_CONFIG.maxRetries - retries + 1);
            await sleep(delay);
            return apiFetch(url, options, retries - 1);
        }

        // معالجة الرد
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            let errorMessage = `خطأ ${response.status}`;
            if (typeof data === 'object' && data.error) {
                errorMessage = data.error;
            } else if (typeof data === 'string' && data) {
                errorMessage = data;
            }
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
    const delay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt);
    return Math.min(delay, RETRY_CONFIG.maxDelay);
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// ============================================================
// 📢 مؤشر "جاري الاتصال" أثناء Retry
// ============================================================
function showConnectingIndicator(attempt) {
    let el = document.getElementById('__connecting_msg');
    if (!el) {
        el = document.createElement('div');
        el.id = '__connecting_msg';
        el.style.cssText = `
            position: fixed;
            top: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: #0D47A1;
            color: white;
            padding: 10px 18px;
            border-radius: 12px;
            font-size: 13px;
            z-index: 99999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: 'Tajawal', sans-serif;
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


// ============================================================
// 🚀 Ping لتنبيه Render عند فتح التطبيق
// ============================================================
function pingBackend() {
    fetch(`${API_BASE_URL}/`, { method: 'GET' }).catch(() => {});
}


// ============================================================
// 🔌 API Wrappers
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

    return await apiFetch(`${API_BASE_URL}/api/auth/telegram`, {
        method: 'POST',
        body: JSON.stringify({
            telegram_id,
            first_name,
            last_name,
            username,
            initData: initData || '',
        }),
    });
}

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

async function fetchUserOrders(telegramId) {
    return await apiFetch(`${API_BASE_URL}/api/orders/my?telegram_id=${telegramId}`);
}

async function fetchUserDeposits(telegramId) {
    return await apiFetch(`${API_BASE_URL}/api/deposits/my?telegram_id=${telegramId}`);
}

async function createOrder(orderData) {
    return await apiFetch(`${API_BASE_URL}/api/orders/`, {
        method: 'POST',
        body: JSON.stringify(orderData),
    });
}

async function createDeposit(depositData) {
    return await apiFetch(`${API_BASE_URL}/api/deposits/`, {
        method: 'POST',
        body: JSON.stringify(depositData),
    });
}

async function submitKYC(kycData) {
    return await apiFetch(`${API_BASE_URL}/api/kyc/submit`, {
        method: 'POST',
        body: JSON.stringify(kycData),
    });
}

async function getMyKYC(telegramId) {
    return await apiFetch(`${API_BASE_URL}/api/kyc/my?telegram_id=${telegramId}`);
}

async function fetchNotifications(telegramId) {
    return await apiFetch(`${API_BASE_URL}/api/user/notifications?telegram_id=${telegramId}`);
}

async function markNotificationRead(notificationId) {
    await apiFetch(`${API_BASE_URL}/api/user/notifications/read`, {
        method: 'POST',
        body: JSON.stringify({ id: notificationId }),
    });
}

async function requestCustomService(serviceData) {
    return await apiFetch(`${API_BASE_URL}/api/user/request-service`, {
        method: 'POST',
        body: JSON.stringify(serviceData),
    });
}


// Ping عند التحميل
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        // تأخير بسيط لتنبيه Render دون تأخير المستخدم
        setTimeout(pingBackend, 100);
    });
}