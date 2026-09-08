// miniapp/js/api.js
// واجهة الاتصال مع الخادم الخلفي SANAD+

// رابط الخادم المحلي (للتطوير)
const API_BASE_URL = 'http://127.0.0.1:5000';

// دالة تسجيل الدخول / إنشاء مستخدم عبر Telegram initData
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
        // في حالة الفشل، نعيد بيانات مستخدم تجريبية (للتطوير فقط)
        return {
            telegram_id: 8673286954,
            username: 'Admin',
            first_name: 'مستخدم',
            balance: 0,
            kyc_status: 'unverified',
            is_verified: false,
            role: 'user',
            is_banned: false,
            vip_level: 0,
        };
    }
}

// جلب التصنيفات
async function fetchCategories() {
    const res = await fetch(`${API_BASE_URL}/api/categories/`);
    return await res.json();
}

// جلب المنتجات (يمكن تمرير category_id للفلترة)
async function fetchProducts(categoryId = null) {
    const url = categoryId
        ? `${API_BASE_URL}/api/products/?category_id=${categoryId}`
        : `${API_BASE_URL}/api/products/`;
    const res = await fetch(url);
    return await res.json();
}

// جلب طرق الدفع
async function fetchPaymentMethods() {
    const res = await fetch(`${API_BASE_URL}/api/payment-methods/`);
    return await res.json();
}

// جلب طلبات المستخدم
async function fetchUserOrders(telegramId) {
    const res = await fetch(`${API_BASE_URL}/api/orders/my?telegram_id=${telegramId}`);
    return await res.json();
}

// جلب إيداعات المستخدم
async function fetchUserDeposits(telegramId) {
    const res = await fetch(`${API_BASE_URL}/api/deposits/my?telegram_id=${telegramId}`);
    return await res.json();
}

// إنشاء طلب شراء
async function createOrder(orderData) {
    const res = await fetch(`${API_BASE_URL}/api/orders/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
    });
    return await res.json();
}

// إنشاء طلب إيداع
async function createDeposit(depositData) {
    const res = await fetch(`${API_BASE_URL}/api/deposits/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(depositData),
    });
    return await res.json();
}

// إرسال طلب توثيق KYC
async function submitKYC(kycData) {
    const res = await fetch(`${API_BASE_URL}/api/kyc/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kycData),
    });
    return await res.json();
}

// جلب حالة KYC للمستخدم
async function getMyKYC(telegramId) {
    const res = await fetch(`${API_BASE_URL}/api/kyc/my?telegram_id=${telegramId}`);
    return await res.json();
}

// جلب إشعارات المستخدم
async function fetchNotifications(telegramId) {
    const res = await fetch(`${API_BASE_URL}/api/user/notifications?telegram_id=${telegramId}`);
    return await res.json();
}

// تحديد إشعار كمقروء
async function markNotificationRead(notificationId) {
    await fetch(`${API_BASE_URL}/api/user/notifications/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notificationId }),
    });
}