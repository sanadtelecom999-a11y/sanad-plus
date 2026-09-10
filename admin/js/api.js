// admin/js/api.js

const API_BASE_URL = 'https://sanad-plus-backend.onrender.com';

function getToken() {
    return localStorage.getItem('admin_token');
}

function setToken(token) {
    localStorage.setItem('admin_token', token);
}

function clearToken() {
    localStorage.removeItem('admin_token');
}

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
    if (response.status === 401) {
        clearToken();
        if (typeof showLogin === 'function') {
            showLogin();
        }
        throw new Error('انتهت الجلسة، يرجى تسجيل الدخول مجدداً');
    }
    if (!response.ok) {
        let errorMessage = `خطأ ${response.status}`;
        try {
            const errorData = await response.json();
            if (errorData.error) errorMessage = errorData.error;
        } catch (e) {}
        throw new Error(errorMessage);
    }
    return await response.json();
}

async function adminLogin(username, password) {
    const res = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    return await res.json();
}

async function fetchAdminUsers() {
    return await apiRequest('/admin/api/users');
}

async function adjustUserBalance(userId, amount, note) {
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

async function fetchAdminCategories() {
    return await apiRequest('/admin/api/categories');
}

async function createCategory(categoryData) {
    return await apiRequest('/admin/api/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData),
    });
}

async function deleteCategory(categoryId) {
    return await apiRequest(`/admin/api/categories/${categoryId}`, { method: 'DELETE' });
}

async function fetchAdminProducts() {
    return await apiRequest('/admin/api/products');
}

async function createProduct(productData) {
    return await apiRequest('/admin/api/products', {
        method: 'POST',
        body: JSON.stringify(productData),
    });
}

async function updateProduct(productId, productData) {
    return await apiRequest(`/admin/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(productData),
    });
}

async function deleteProduct(productId) {
    return await apiRequest(`/admin/api/products/${productId}`, { method: 'DELETE' });
}

async function fetchProductBundles(productId) {
    return await apiRequest(`/admin/api/products/${productId}/bundles`);
}

async function createProductBundle(productId, bundleData) {
    return await apiRequest(`/admin/api/products/${productId}/bundles`, {
        method: 'POST',
        body: JSON.stringify(bundleData),
    });
}

async function fetchAdminPaymentMethods() {
    return await apiRequest('/admin/api/payment-methods');
}

async function createPaymentMethod(methodData) {
    return await apiRequest('/admin/api/payment-methods', {
        method: 'POST',
        body: JSON.stringify(methodData),
    });
}

async function deletePaymentMethod(methodId) {
    return await apiRequest(`/admin/api/payment-methods/${methodId}`, { method: 'DELETE' });
}

async function fetchAdminOrders() {
    return await apiRequest('/admin/api/orders');
}

async function fetchAdminOrderDetail(orderId) {
    return await apiRequest(`/admin/api/orders/${orderId}`);
}

async function updateOrderStatus(orderId, status) {
    return await apiRequest(`/admin/api/orders/${orderId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
    });
}

async function fetchAdminDeposits() {
    return await apiRequest('/admin/api/deposits');
}

async function approveDeposit(depositId) {
    return await apiRequest(`/admin/api/deposits/${depositId}/approve`, { method: 'POST' });
}

async function rejectDeposit(depositId) {
    return await apiRequest(`/admin/api/deposits/${depositId}/reject`, { method: 'POST' });
}

async function fetchAdminKYC() {
    return await apiRequest('/admin/api/kyc');
}

async function approveKYCRequest(kycId) {
    return await apiRequest(`/admin/api/kyc/${kycId}/approve`, { method: 'POST' });
}

async function rejectKYCRequest(kycId) {
    return await apiRequest(`/admin/api/kyc/${kycId}/reject`, { method: 'POST' });
}

async function sendNotification(notificationData) {
    return await apiRequest('/admin/api/notifications', {
        method: 'POST',
        body: JSON.stringify(notificationData),
    });
}

async function fetchServiceRequests() {
    return await apiRequest('/admin/api/service-requests');
}

async function updateServiceRequest(requestId, status, response) {
    return await apiRequest(`/admin/api/service-requests/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify({ status, admin_response: response }),
    });
}

// ============ سجل النشاطات ============
async function fetchActivities() {
    return await apiRequest('/admin/api/activities');
}

function logout() {
    clearToken();
    location.reload();
}
