// miniapp/js/api.js

const API_BASE_URL = 'https://sanad-plus-backend.onrender.com';

async function apiFetch(url, options = {}) {
    try {
        const response = await fetch(url, options);
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
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function authenticateUser(initData) {
    try {
        let telegram_id = null;
        let first_name = '';
        let last_name = '';
        let username = '';

        // محاولة استخراج البيانات من Telegram WebApp مباشرة
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            const u = window.Telegram.WebApp.initDataUnsafe.user;
            telegram_id = u.id;
            first_name = u.first_name || '';
            last_name = u.last_name || '';
            username = u.username || '';
        } else if (window.currentUser) {
            telegram_id = window.currentUser.id;
            first_name = window.currentUser.first_name;
            last_name = window.currentUser.last_name;
            username = window.currentUser.username;
        }

        if (!telegram_id) {
            console.warn('لم يتم العثور على Telegram ID، استخدام الحساب التجريبي');
            telegram_id = 8673286954;
            first_name = 'مستخدم تجريبي';
            username = 'tester';
        }

        const data = await apiFetch(`${API_BASE_URL}/api/auth/telegram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegram_id,
                first_name,
                last_name,
                username,
                initData: initData || '',
            }),
        });
        return data;
    } catch (error) {
        console.error('Auth error:', error);
        return {
            telegram_id: window.currentUser?.id || 8673286954,
            username: window.currentUser?.username || 'tester',
            first_name: window.currentUser?.first_name || 'مستخدم تجريبي',
            balance: 0,
            kyc_status: 'unverified',
            is_verified: false,
            role: 'user',
            vip_level: 0,
        };
    }
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
    });
}

async function createDeposit(depositData) {
    return await apiFetch(`${API_BASE_URL}/api/deposits/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(depositData),
    });
}

async function submitKYC(kycData) {
    return await apiFetch(`${API_BASE_URL}/api/kyc/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notificationId }),
    });
}

async function requestCustomService(serviceData) {
    return await apiFetch(`${API_BASE_URL}/api/user/request-service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceData),
    });
}
