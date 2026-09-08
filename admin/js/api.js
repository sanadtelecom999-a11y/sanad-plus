// admin/js/api.js
// واجهة الاتصال مع الخادم الخلفي للوحة التحكم

const API_BASE_URL = 'http://127.0.0.1:5000'; // رابط الخادم المحلي

// دالة مساعدة لجلب التوكن المخزن
function getToken() {
    return localStorage.getItem('admin_token');
}

// دالة مساعدة لحفظ التوكن
function setToken(token) {
    localStorage.setItem('admin_token', token);
}

// دالة مساعدة لحذف التوكن
function clearToken() {
    localStorage.removeItem('admin_token');
}

// دالة مساعدة لإجراء طلبات مع التوكن
async function apiRequest(url, options = {}) {
    const token = getToken();
    if (!token) {
        throw new Error('لا يوجد توكن، يرجى تسجيل الدخول');
    }
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
    };
    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
    });
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
}

// تسجيل الدخول
async function adminLogin(username, password) {
    const res = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    return await res.json();
}

// جلب إحصائيات لوحة التحكم (يمكن استخدامها لاحقًا)
async function fetchAdminStats() {
    return await apiRequest('/admin/api/stats');
}

// جلب المستخدمين
async function fetchAdminUsers() {
    return await apiRequest('/admin/api/users');
}

// تعديل رصيد مستخدم
async function adjustUserBalance(userId, amount) {
    return await apiRequest(`/admin/api/users/${userId}/balance`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
    });
}

// حظر/فك حظر مستخدم
async function toggleUserBan(userId) {
    return await apiRequest(`/admin/api/users/${userId}/ban`, {
        method: 'POST',
    });
}

// جلب الأقسام
async function fetchAdminCategories() {
    return await apiRequest('/admin/api/categories');
}

// إضافة قسم
async function createCategory(categoryData) {
    return await apiRequest('/admin/api/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData),
    });
}

// حذف قسم
async function deleteCategory(categoryId) {
    return await apiRequest(`/admin/api/categories/${categoryId}`, {
        method: 'DELETE',
    });
}

// جلب المنتجات
async function fetchAdminProducts() {
    return await apiRequest('/admin/api/products');
}

// إضافة منتج
async function createProduct(productData) {
    return await apiRequest('/admin/api/products', {
        method: 'POST',
        body: JSON.stringify(productData),
    });
}

// تعديل منتج
async function updateProduct(productId, productData) {
    return await apiRequest(`/admin/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(productData),
    });
}

// حذف منتج
async function deleteProduct(productId) {
    return await apiRequest(`/admin/api/products/${productId}`, {
        method: 'DELETE',
    });
}

// جلب باقات منتج
async function fetchProductBundles(productId) {
    return await apiRequest(`/admin/api/products/${productId}/bundles`);
}

// إضافة باقة لمنتج
async function createProductBundle(productId, bundleData) {
    return await apiRequest(`/admin/api/products/${productId}/bundles`, {
        method: 'POST',
        body: JSON.stringify(bundleData),
    });
}

// جلب طرق الدفع
async function fetchAdminPaymentMethods() {
    return await apiRequest('/admin/api/payment-methods');
}

// إضافة طريقة دفع
async function createPaymentMethod(methodData) {
    return await apiRequest('/admin/api/payment-methods', {
        method: 'POST',
        body: JSON.stringify(methodData),
    });
}

// جلب الطلبات
async function fetchAdminOrders() {
    return await apiRequest('/admin/api/orders');
}

// تغيير حالة طلب
async function updateOrderStatus(orderId, status) {
    return await apiRequest(`/admin/api/orders/${orderId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
    });
}

// جلب الإيداعات
async function fetchAdminDeposits() {
    return await apiRequest('/admin/api/deposits');
}

// قبول إيداع
async function approveDeposit(depositId) {
    return await apiRequest(`/admin/api/deposits/${depositId}/approve`, {
        method: 'POST',
    });
}

// رفض إيداع
async function rejectDeposit(depositId) {
    return await apiRequest(`/admin/api/deposits/${depositId}/reject`, {
        method: 'POST',
    });
}

// جلب طلبات التوثيق KYC
async function fetchAdminKYC() {
    return await apiRequest('/admin/api/kyc');
}

// قبول توثيق
async function approveKYC(kycId) {
    return await apiRequest(`/admin/api/kyc/${kycId}/approve`, {
        method: 'POST',
    });
}

// رفض توثيق
async function rejectKYC(kycId) {
    return await apiRequest(`/admin/api/kyc/${kycId}/reject`, {
        method: 'POST',
    });
}

// إرسال إشعار
async function sendNotification(notificationData) {
    return await apiRequest('/admin/api/notifications', {
        method: 'POST',
        body: JSON.stringify(notificationData),
    });
}