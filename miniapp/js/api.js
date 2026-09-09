// miniapp/js/api.js

const API_BASE_URL = 'https://sanad-plus-backend.onrender.com';

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

        const response = await fetch(`${API_BASE_URL}/api/auth/telegram`, {
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

        if (!response.ok) {
            return {
                telegram_id,
                first_name,
                last_name,
                username,
                balance: 0,
                kyc_status: 'unverified',
                is_verified: false,
                role: 'user',
                vip_level: 0,
            };
        }
        return await response.json();
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
    const res = await fetch(`${API_BASE_URL}/api/categories/`);
    return await res.json();
}

async function fetchProducts(categoryId = null) {
    const url = categoryId
        ? `${API_BASE_URL}/api/products/?category_id=${categoryId}`
        : `${API_BASE_URL}/api/products/`;
    const res = await fetch(url);
    return await res.json();
}

async function fetchPaymentMethods() {
    const res = await fetch(`${API_BASE_URL}/api/payment-methods/`);
    return await res.json();
}

async function fetchUserOrders(telegramId) {
    const res = await fetch(`${API_BASE_URL}/api/orders/my?telegram_id=${telegramId}`);
    return await res.json();
}

async function fetchUserDeposits(telegramId) {
    const res = await fetch(`${API_BASE_URL}/api/deposits/my?telegram_id=${telegramId}`);
    return await res.json();
}

async function createOrder(orderData) {
    const res = await fetch(`${API_BASE_URL}/api/orders/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
    });
    return await res.json();
}

async function createDeposit(depositData) {
    const res = await fetch(`${API_BASE_URL}/api/deposits/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(depositData),
    });
    return await res.json();
}

async function submitKYC(kycData) {
    const res = await fetch(`${API_BASE_URL}/api/kyc/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kycData),
    });
    return await res.json();
}

async function getMyKYC(telegramId) {
    const res = await fetch(`${API_BASE_URL}/api/kyc/my?telegram_id=${telegramId}`);
    return await res.json();
}

async function fetchNotifications(telegramId) {
    const res = await fetch(`${API_BASE_URL}/api/user/notifications?telegram_id=${telegramId}`);
    return await res.json();
}

async function markNotificationRead(notificationId) {
    await fetch(`${API_BASE_URL}/api/user/notifications/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notificationId }),
    });
}

async function requestCustomService(serviceData) {
    const res = await fetch(`${API_BASE_URL}/api/user/request-service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceData),
    });
    return await res.json();
}
