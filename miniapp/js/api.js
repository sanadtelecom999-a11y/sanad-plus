const API_BASE_URL = 'https://sanad-plus-backend.onrender.com';

async function authenticateUser(initData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/telegram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData }),
        });
        if (!response.ok) throw new Error('Auth failed');
        return await response.json();
    } catch (error) {
        console.error('Auth error:', error);
        return {
            telegram_id: 8673286954,
            username: 'Admin',
            first_name: 'مستخدم',
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
    const url = categoryId ? `${API_BASE_URL}/api/products/?category_id=${categoryId}` : `${API_BASE_URL}/api/products/`;
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
