// admin/js/admin.js
// إدارة لوحة التحكم - مرتبطة بالخادم الحقيقي

let currentSection = 'dashboard';
let usersData = [];
let categoriesData = [];
let productsData = [];
let paymentMethodsData = [];
let ordersData = [];
let depositsData = [];
let kycData = [];

document.addEventListener('DOMContentLoaded', () => {
    // التحقق من تسجيل الدخول
    if (!getToken()) {
        showLogin();
    } else {
        initAdminPanel();
    }
});

function showLogin() {
    document.body.innerHTML = `
        <div class="login-container">
            <h2>SANAD+ | لوحة التحكم</h2>
            <div class="login-form">
                <div class="form-group">
                    <label>اسم المستخدم</label>
                    <input type="text" id="loginUsername" value="admin">
                </div>
                <div class="form-group">
                    <label>كلمة المرور</label>
                    <input type="password" id="loginPassword" value="admin123">
                </div>
                <button class="btn-primary" onclick="doLogin()">تسجيل الدخول</button>
            </div>
        </div>
    `;
}

async function doLogin() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    try {
        const result = await adminLogin(username, password);
        if (result.token) {
            setToken(result.token);
            location.reload();
        } else {
            alert(result.error || 'بيانات خاطئة');
        }
    } catch (error) {
        alert('فشل تسجيل الدخول');
    }
}

async function initAdminPanel() {
    await loadAllData();
    setupAdminNavigation();
    switchSection('dashboard');
}

async function loadAllData() {
    try {
        usersData = await fetchAdminUsers();
        categoriesData = await fetchAdminCategories();
        productsData = await fetchAdminProducts();
        paymentMethodsData = await fetchAdminPaymentMethods();
        ordersData = await fetchAdminOrders();
        depositsData = await fetchAdminDeposits();
        kycData = await fetchAdminKYC();
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
    }
}

function setupAdminNavigation() {
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            switchSection(section);
        });
    });
}

function switchSection(sectionId) {
    document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));
    const section = document.getElementById('section-' + sectionId);
    if (section) section.classList.add('active');

    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-section') === sectionId);
    });

    currentSection = sectionId;

    if (sectionId === 'dashboard') renderDashboard();
    if (sectionId === 'users') renderUsers();
    if (sectionId === 'categories') renderCategories();
    if (sectionId === 'products') renderProducts();
    if (sectionId === 'payment-methods') renderPaymentMethods();
    if (sectionId === 'orders') renderOrders(ordersData);
    if (sectionId === 'deposits') renderDeposits(depositsData);
    if (sectionId === 'kyc') renderKYC();
}

function renderDashboard() {
    const totalOrders = ordersData.length;
    const completedOrders = ordersData.filter(o => o.status === 'completed').length;
    const totalRevenue = ordersData.reduce((sum, o) => sum + (o.total_price || 0), 0);
    const pendingDeposits = depositsData.filter(d => d.status === 'pending').length;

    document.querySelector('#section-dashboard .stat-card:nth-child(1) .stat-number').textContent = `${totalRevenue.toFixed(2)}$`;
    document.querySelector('#section-dashboard .stat-card:nth-child(2) .stat-number').textContent = totalOrders;
    document.querySelector('#section-dashboard .stat-card:nth-child(3) .stat-number').textContent = usersData.length;
    document.querySelector('#section-dashboard .stat-card:nth-child(4) .stat-number').textContent = productsData.length;

    document.getElementById('recentActivities').innerHTML = ordersData.slice(0, 5).map(o =>
        `<div>طلب ${o.order_number} - ${o.status}</div>`
    ).join('') || 'لا توجد عمليات بعد';
}

function renderUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = usersData.map(user => `
        <tr>
            <td>${user.telegram_id}</td>
            <td>${user.username || user.first_name}</td>
            <td>${user.balance.toFixed(2)}$</td>
            <td><span class="status-badge ${user.is_banned ? 'failed' : 'completed'}">${user.is_banned ? 'محظور' : 'نشط'}</span></td>
            <td>
                <button class="btn-outline" onclick="adjustBalance(${user.id})">تعديل الرصيد</button>
                <button class="btn-outline" onclick="toggleBan(${user.id})">${user.is_banned ? 'فك الحظر' : 'حظر'}</button>
            </td>
        </tr>
    `).join('');
}

async function adjustBalance(userId) {
    const amount = prompt('أدخل المبلغ (يمكن أن يكون سالبًا):');
    if (amount !== null) {
        try {
            await adjustUserBalance(userId, parseFloat(amount));
            alert('تم تحديث الرصيد');
            await loadAllData();
            renderUsers();
        } catch (error) {
            alert('فشل تعديل الرصيد');
        }
    }
}

async function toggleBan(userId) {
    try {
        await toggleUserBan(userId);
        await loadAllData();
        renderUsers();
    } catch (error) {
        alert('فشل تغيير حالة الحظر');
    }
}

function renderCategories() {
    const container = document.getElementById('categoriesList');
    container.innerHTML = categoriesData.map(cat => `
        <div class="category-card">
            <div class="card-icon">${cat.image || '📁'}</div>
            <div class="card-title">${cat.name}</div>
            <div class="card-actions">
                <button class="btn-outline" onclick="deleteCategory(${cat.id})">حذف</button>
            </div>
        </div>
    `).join('');
}

function openCategoryModal(categoryId = null) {
    const body = `
        <h3>إضافة قسم جديد</h3>
        <div class="form-group">
            <label>اسم القسم</label>
            <input type="text" id="categoryName">
        </div>
        <div class="form-group">
            <label>أيقونة (إيموجي)</label>
            <input type="text" id="categoryIcon" value="📁">
        </div>
        <div class="form-group">
            <label>صورة القسم</label>
            <div class="image-upload">
                <div class="image-preview" id="categoryImagePreview">لا صورة</div>
                <input type="file" id="categoryImage" accept="image/*" onchange="previewImage(this, 'categoryImagePreview')">
            </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="btn-primary" onclick="saveCategory()">حفظ</button>
            <button class="btn-outline" onclick="closeModal()">إلغاء</button>
        </div>
    `;
    openModal('إضافة قسم', body);
}

async function saveCategory() {
    const name = document.getElementById('categoryName').value;
    const icon = document.getElementById('categoryIcon').value;
    if (!name) return alert('أدخل اسم القسم');
    try {
        await createCategory({ name, icon, image: '' });
        closeModal();
        await loadAllData();
        renderCategories();
    } catch (error) {
        alert('فشل إضافة القسم');
    }
}

async function deleteCategory(categoryId) {
    if (confirm('حذف هذا القسم؟')) {
        try {
            await deleteCategory(categoryId);
            await loadAllData();
            renderCategories();
        } catch (error) {
            alert('فشل حذف القسم');
        }
    }
}

function renderProducts() {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = productsData.map(prod => `
        <tr>
            <td><img src="${prod.image || ''}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;"></td>
            <td>${prod.name}</td>
            <td>${categoriesData.find(c => c.id === prod.category_id)?.name || '-'}</td>
            <td>${prod.base_price}$</td>
            <td>${prod.base_quantity}</td>
            <td>
                <span class="status-badge ${prod.product_type === 'bundle' ? 'pending' : prod.product_type === 'topup' ? 'verified' : 'completed'}">
                    ${prod.product_type === 'bundle' ? 'باقة' : prod.product_type === 'topup' ? 'رصيد' : 'كمية'}
                </span>
            </td>
            <td>
                <button class="btn-outline" onclick="deleteProduct(${prod.id})">حذف</button>
            </td>
        </tr>
    `).join('');
}

function openProductModal() {
    const body = `
        <h3>إضافة منتج جديد</h3>
        <div class="form-group">
            <label>اسم المنتج</label>
            <input type="text" id="productName">
        </div>
        <div class="form-group">
            <label>القسم</label>
            <select id="productCategoryId">
                ${categoriesData.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>نوع المنتج</label>
            <select id="productType" onchange="toggleProductTypeFields()">
                <option value="quantity">كمية</option>
                <option value="bundle">باقة</option>
                <option value="topup">رصيد</option>
            </select>
        </div>
        <div class="form-group">
            <label>السعر الأساسي (دولار)</label>
            <input type="number" id="productPrice" step="0.01" value="0">
        </div>
        <div class="form-group" id="quantityField">
            <label>الكمية الأساسية</label>
            <input type="number" id="productQuantity" value="0">
        </div>
        <div class="form-group">
            <label>نوع الحقل المخصص</label>
            <select id="productInputType">
                <option value="id">معرف اللاعب (ID)</option>
                <option value="phone">رقم الهاتف</option>
                <option value="none">بدون</option>
            </select>
        </div>
        <div class="form-group">
            <label>صورة المنتج</label>
            <div class="image-upload">
                <div class="image-preview" id="productImagePreview">لا صورة</div>
                <input type="file" id="productImage" accept="image/*" onchange="previewImage(this, 'productImagePreview')">
            </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="btn-primary" onclick="saveProduct()">حفظ</button>
            <button class="btn-outline" onclick="closeModal()">إلغاء</button>
        </div>
    `;
    openModal('إضافة منتج', body);
}

function toggleProductTypeFields() {
    const type = document.getElementById('productType').value;
    const quantityField = document.getElementById('quantityField');
    if (type === 'bundle') {
        quantityField.style.display = 'none';
    } else {
        quantityField.style.display = 'block';
    }
}

async function saveProduct() {
    const name = document.getElementById('productName').value;
    const categoryId = parseInt(document.getElementById('productCategoryId').value);
    const type = document.getElementById('productType').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const inputType = document.getElementById('productInputType').value;
    let baseQuantity = 0;
    if (type !== 'bundle') {
        baseQuantity = parseInt(document.getElementById('productQuantity').value);
    }

    if (!name || !categoryId) return alert('أدخل اسم المنتج والقسم');

    try {
        await createProduct({
            name,
            category_id: categoryId,
            product_type: type,
            base_price: price,
            base_quantity: baseQuantity,
            input_type: inputType,
            image: '',
        });
        closeModal();
        await loadAllData();
        renderProducts();
    } catch (error) {
        alert('فشل إضافة المنتج');
    }
}

async function deleteProduct(productId) {
    if (confirm('حذف هذا المنتج؟')) {
        try {
            await deleteProduct(productId);
            await loadAllData();
            renderProducts();
        } catch (error) {
            alert('فشل حذف المنتج');
        }
    }
}

function renderPaymentMethods() {
    const container = document.getElementById('paymentMethodsList');
    container.innerHTML = paymentMethodsData.map(m => `
        <div class="payment-card">
            <div class="card-icon">${m.icon || '💳'}</div>
            <div class="card-title">${m.name}</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);">${m.description || ''}</div>
            <div class="card-actions">
                <button class="btn-outline" onclick="deletePaymentMethod(${m.id})">حذف</button>
            </div>
        </div>
    `).join('');
}

function openPaymentMethodModal() {
    const body = `
        <h3>إضافة طريقة دفع</h3>
        <div class="form-group">
            <label>اسم الطريقة</label>
            <input type="text" id="paymentName">
        </div>
        <div class="form-group">
            <label>الوصف</label>
            <input type="text" id="paymentDesc" value="شحن فوري">
        </div>
        <div class="form-group">
            <label>رقم الحساب</label>
            <input type="text" id="paymentAccount">
        </div>
        <div class="form-group">
            <label>أيقونة (إيموجي)</label>
            <input type="text" id="paymentIcon" value="💳">
        </div>
        <div class="form-group">
            <label>تفعيل</label>
            <label class="toggle-switch">
                <input type="checkbox" id="paymentActive" checked>
                <span class="toggle-slider"></span>
            </label>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="btn-primary" onclick="savePaymentMethod()">حفظ</button>
            <button class="btn-outline" onclick="closeModal()">إلغاء</button>
        </div>
    `;
    openModal('إضافة طريقة دفع', body);
}

async function savePaymentMethod() {
    const name = document.getElementById('paymentName').value;
    const desc = document.getElementById('paymentDesc').value;
    const account = document.getElementById('paymentAccount').value;
    const icon = document.getElementById('paymentIcon').value;
    const is_active = document.getElementById('paymentActive').checked;
    if (!name) return alert('أدخل اسم الطريقة');
    try {
        await createPaymentMethod({ name, description: desc, account, icon, is_active });
        closeModal();
        await loadAllData();
        renderPaymentMethods();
    } catch (error) {
        alert('فشل إضافة طريقة الدفع');
    }
}

async function deletePaymentMethod(methodId) {
    if (confirm('حذف طريقة الدفع؟')) {
        // لا يوجد مسار حذف في الخادم حالياً، يمكن إضافته لاحقاً
        alert('غير متاح حالياً');
    }
}

function renderOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>${order.order_number}</td>
            <td>${order.product_id}</td>
            <td>${order.quantity}</td>
            <td>${order.total_price}$</td>
            <td>
                <select onchange="changeOrderStatus(${order.id}, this.value)">
                    <option value="pending" ${order.status==='pending'?'selected':''}>قيد المعالجة</option>
                    <option value="review" ${order.status==='review'?'selected':''}>قيد المراجعة</option>
                    <option value="processing" ${order.status==='processing'?'selected':''}>قيد التنفيذ</option>
                    <option value="completed" ${order.status==='completed'?'selected':''}>مكتمل</option>
                    <option value="failed" ${order.status==='failed'?'selected':''}>فشل</option>
                </select>
            </td>
            <td>
                <button class="btn-outline" onclick="viewOrderDetails(${order.id})">عرض</button>
            </td>
        </tr>
    `).join('');
}

async function changeOrderStatus(orderId, status) {
    try {
        await updateOrderStatus(orderId, status);
        await loadAllData();
        renderOrders(ordersData);
    } catch (error) {
        alert('فشل تغيير الحالة');
    }
}

function viewOrderDetails(orderId) {
    const order = ordersData.find(o => o.id === orderId);
    if (order) {
        openModal('تفاصيل الطلب', `<pre>${JSON.stringify(order, null, 2)}</pre>`);
    }
}

function renderDeposits(deposits) {
    const tbody = document.getElementById('depositsTableBody');
    if (!deposits.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا توجد إيداعات</td></tr>';
        return;
    }
    tbody.innerHTML = deposits.map(d => `
        <tr>
            <td>${d.transaction_id}</td>
            <td>${d.user_id}</td>
            <td>${d.amount}$</td>
            <td>${d.method}</td>
            <td><span class="status-badge ${d.status === 'approved' ? 'completed' : d.status === 'rejected' ? 'failed' : 'pending'}">${d.status}</span></td>
            <td>
                ${d.status === 'pending' ? `
                    <button class="btn-outline" onclick="approveDeposit(${d.id})">قبول</button>
                    <button class="btn-outline" onclick="rejectDeposit(${d.id})">رفض</button>
                ` : '-'}
            </td>
        </tr>
    `).join('');
}

async function approveDeposit(depositId) {
    try {
        await approveDeposit(depositId);
        await loadAllData();
        renderDeposits(depositsData);
    } catch (error) {
        alert('فشل قبول الإيداع');
    }
}

async function rejectDeposit(depositId) {
    try {
        await rejectDeposit(depositId);
        await loadAllData();
        renderDeposits(depositsData);
    } catch (error) {
        alert('فشل رفض الإيداع');
    }
}

function renderKYC() {
    const tbody = document.getElementById('kycTableBody');
    if (!kycData.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">لا توجد طلبات توثيق</td></tr>';
        return;
    }
    tbody.innerHTML = kycData.map(k => `
        <tr>
            <td>${k.user_id}</td>
            <td>${k.full_name}</td>
            <td>${k.phone}</td>
            <td><span class="status-badge ${k.status === 'approved' ? 'completed' : k.status === 'rejected' ? 'failed' : 'pending'}">${k.status}</span></td>
            <td>
                ${k.status === 'pending' ? `
                    <button class="btn-outline" onclick="approveKYC(${k.id})">قبول</button>
                    <button class="btn-outline" onclick="rejectKYC(${k.id})">رفض</button>
                ` : '-'}
            </td>
        </tr>
    `).join('');
}

async function approveKYC(kycId) {
    try {
        await approveKYC(kycId);
        await loadAllData();
        renderKYC();
    } catch (error) {
        alert('فشل قبول التوثيق');
    }
}

async function rejectKYC(kycId) {
    try {
        await rejectKYC(kycId);
        await loadAllData();
        renderKYC();
    } catch (error) {
        alert('فشل رفض التوثيق');
    }
}

function sendAdminNotification() {
    const message = document.getElementById('notificationMessage').value;
    if (!message) return alert('أدخل نص الإشعار');
    const target = document.getElementById('notificationTarget').value;
    const type = document.getElementById('notificationType').value;
    const data = {
        target,
        title: 'إشعار من الإدارة',
        message,
        type,
    };
    if (target === 'specific') {
        data.user_id = document.getElementById('notificationUserId').value;
    }
    sendNotification(data).then(() => {
        alert('تم إرسال الإشعار');
    }).catch(() => alert('فشل إرسال الإشعار'));
}

// ========== دوال عامة ==========
function openModal(title, bodyHTML) {
    const modal = document.getElementById('modal');
    document.getElementById('modalBody').innerHTML = bodyHTML;
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

function previewImage(input, previewId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById(previewId).innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}