// admin/js/admin.js

let currentSection = 'dashboard';
let usersData = [];
let categoriesData = [];
let productsData = [];
let paymentMethodsData = [];
let ordersData = [];
let depositsData = [];
let kycData = [];
let serviceRequestsData = [];
let activitiesData = [];
let filteredOrders = [];

document.addEventListener('DOMContentLoaded', () => {
    if (!getToken()) {
        showLogin();
    } else {
        initAdminPanel();
    }
});

function showLogin() {
    document.body.innerHTML = `
        <div style="display:flex;justify-content:center;align-items:center;min-height:100vh;background:#EAF5FC;">
            <div style="background:white;padding:30px;border-radius:24px;box-shadow:0 4px 20px rgba(0,0,0,0.1);width:90%;max-width:400px;">
                <h2 style="text-align:center;margin-bottom:20px;color:#0D47A1;">SANAD+ | لوحة التحكم</h2>
                <div style="margin-bottom:15px;">
                    <label style="display:block;margin-bottom:5px;">اسم المستخدم</label>
                    <input type="text" id="loginUsername" value="admin" style="width:100%;padding:10px;border:1px solid #EAF5FC;border-radius:12px;">
                </div>
                <div style="margin-bottom:15px;">
                    <label style="display:block;margin-bottom:5px;">كلمة المرور</label>
                    <input type="password" id="loginPassword" value="admin123" style="width:100%;padding:10px;border:1px solid #EAF5FC;border-radius:12px;">
                </div>
                <button onclick="doLogin()" style="width:100%;padding:12px;background:#00A0E9;color:white;border:none;border-radius:12px;font-size:16px;font-weight:bold;cursor:pointer;">تسجيل الدخول</button>
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
        alert('فشل الاتصال بالخادم');
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
        serviceRequestsData = await fetchServiceRequests();
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
    if (sectionId === 'orders') { filteredOrders = [...ordersData]; renderOrders(ordersData); }
    if (sectionId === 'deposits') renderDeposits(depositsData);
    if (sectionId === 'kyc') renderKYC();
    if (sectionId === 'service-requests') renderServiceRequests();
    if (sectionId === 'activities') loadActivities();
}

function renderDashboard() {
    const totalRevenue = ordersData.reduce((sum, o) => sum + (o.total_price || 0), 0);
    document.getElementById('dashRevenue').textContent = `${totalRevenue.toFixed(2)}$`;
    document.getElementById('dashOrders').textContent = ordersData.length;
    document.getElementById('dashUsers').textContent = usersData.length;
    document.getElementById('dashProducts').textContent = productsData.length;
    document.getElementById('recentActivities').innerHTML = ordersData.slice(0, 5).map(o =>
        `<div>طلب ${o.order_number} - ${o.status}</div>`
    ).join('') || 'لا توجد عمليات';
}

function filterUsers(query) {
    const filtered = usersData.filter(u => (u.username || '').includes(query) || (u.telegram_id + '').includes(query));
    renderUsers(filtered);
}

function renderUsers(users = usersData) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.telegram_id}</td>
            <td>${user.username || user.first_name || 'مستخدم'}</td>
            <td>${user.balance.toFixed(2)}$</td>
            <td><span class="status-badge ${user.is_banned ? 'failed' : 'completed'}">${user.is_banned ? 'محظور' : 'نشط'}</span></td>
            <td>${user.vip_level > 0 ? `<span class="vip-badge">⭐ VIP${user.vip_level}</span>` : '-'}</td>
            <td>
                <button class="btn-outline" onclick="adjustBalance(${user.id})">رصيد</button>
                <button class="btn-outline" onclick="toggleBan(${user.id})">${user.is_banned ? 'فك الحظر' : 'حظر'}</button>
                <button class="btn-outline" onclick="setVIP(${user.id}, ${user.vip_level})">VIP</button>
                <button class="btn-outline" onclick="toggleKYC(${user.id}, '${user.kyc_status}')">${user.kyc_status === 'verified' ? 'إلغاء توثيق' : 'توثيق'}</button>
            </td>
        </tr>
    `).join('');
}

async function toggleKYC(userId, currentStatus) {
    try {
        const newStatus = currentStatus === 'verified' ? 'unverified' : 'verified';
        await toggleUserKYC(userId, newStatus);
        await loadAllData();
        renderUsers();
        alert('تم تحديث حالة التوثيق بنجاح');
    } catch (error) {
        alert(`فشل تحديث التوثيق: ${error.message}`);
    }
}

async function adjustBalance(userId) {
    const amount = prompt('أدخل المبلغ (سالب للخصم):');
    if (amount === null) return;
    const note = prompt('أدخل ملاحظة (اختياري):') || '';
    try {
        await adjustUserBalance(userId, parseFloat(amount), note);
        await loadAllData();
        renderUsers();
        alert('تم تعديل الرصيد بنجاح');
    } catch (error) {
        alert(`فشل تعديل الرصيد: ${error.message}`);
    }
}

async function toggleBan(userId) {
    try {
        await toggleUserBan(userId);
        await loadAllData();
        renderUsers();
        alert('تم تحديث حالة الحظر');
    } catch (error) {
        alert(`فشل تغيير حالة الحظر: ${error.message}`);
    }
}

async function setVIP(userId, currentLevel) {
    const level = prompt('أدخل مستوى VIP (0 لإلغاء، 1-3):', currentLevel);
    if (level !== null) {
        try {
            await setUserVIP(userId, parseInt(level));
            await loadAllData();
            renderUsers();
            alert('تم تحديث مستوى VIP');
        } catch (error) {
            alert(`فشل تعيين VIP: ${error.message}`);
        }
    }
}

function renderCategories() {
    const container = document.getElementById('categoriesList');
    container.innerHTML = categoriesData.map(cat => `
        <div class="category-card">
            <div class="card-icon">${cat.image ? `<img src="${cat.image}" style="width:50px;height:50px;border-radius:12px;object-fit:cover;">` : '📁'}</div>
            <div class="card-title">${cat.name}</div>
            <div class="card-actions">
                <button class="btn-danger" onclick="deleteCategoryHandler(${cat.id})">حذف</button>
            </div>
        </div>
    `).join('');
}

function openCategoryModal() {
    const body = `
        <h3>إضافة قسم جديد</h3>
        <div class="form-group"><label>اسم القسم</label><input type="text" id="categoryName"></div>
        <div class="form-group"><label>أيقونة (إيموجي)</label><input type="text" id="categoryIcon" value="📁"></div>
        <div class="form-group">
            <label>صورة القسم</label>
            <div class="image-preview" id="categoryImagePreview">لا صورة</div>
            <input type="file" id="categoryImage" accept="image/*" onchange="previewImage(this,'categoryImagePreview')">
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
    const imageFile = document.getElementById('categoryImage').files[0];
    let image = '';
    if (imageFile) {
        image = await fileToBase64(imageFile, 512);
    }
    try {
        await createCategory({ name, icon, image });
        closeModal();
        await loadAllData();
        renderCategories();
        alert('تم إضافة القسم بنجاح');
    } catch (error) {
        console.error('خطأ إضافة القسم:', error);
        alert(`فشل إضافة القسم: ${error.message}`);
    }
}

async function deleteCategoryHandler(categoryId) {
    if (confirm('حذف القسم؟')) {
        try {
            await deleteCategory(categoryId);
            await loadAllData();
            renderCategories();
            alert('تم حذف القسم');
        } catch (error) {
            console.error('خطأ حذف القسم:', error);
            alert(`فشل حذف القسم: ${error.message}`);
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
            <td><span class="status-badge ${prod.product_type === 'bundle' ? 'pending' : prod.product_type === 'topup' ? 'verified' : 'completed'}">${prod.product_type === 'bundle' ? 'باقة' : prod.product_type === 'topup' ? 'رصيد' : 'كمية'}</span></td>
            <td>
                <button class="btn-danger" onclick="deleteProductHandler(${prod.id})">حذف</button>
            </td>
        </tr>
    `).join('');
}

function openProductModal() {
    const body = `
        <h3>إضافة منتج</h3>
        <div class="form-group"><label>اسم المنتج</label><input type="text" id="productName"></div>
        <div class="form-group"><label>القسم</label><select id="productCategoryId">${categoriesData.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>النوع</label><select id="productType" onchange="toggleProductTypeFields()"><option value="quantity">كمية</option><option value="bundle">باقة</option><option value="topup">رصيد</option></select></div>
        <div class="form-group"><label>السعر الأساسي (دولار)</label><input type="number" id="productPrice" value="0" step="0.01"></div>
        <div class="form-group" id="quantityField"><label>الكمية الأساسية</label><input type="number" id="productQuantity" value="0"></div>
        <div class="form-group"><label>نوع الحقل المخصص</label><select id="productInputType"><option value="id">معرف اللاعب (ID)</option><option value="phone">رقم الهاتف</option><option value="none">بدون</option></select></div>
        <div class="form-group">
            <label>صورة المنتج</label>
            <div class="image-preview" id="productImagePreview">لا صورة</div>
            <input type="file" id="productImage" accept="image/*" onchange="previewImage(this,'productImagePreview')">
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
    document.getElementById('quantityField').style.display = type === 'bundle' ? 'none' : 'block';
}

async function saveProduct() {
    const name = document.getElementById('productName').value;
    const categoryId = parseInt(document.getElementById('productCategoryId').value);
    const type = document.getElementById('productType').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const inputType = document.getElementById('productInputType').value;
    let baseQuantity = 0;
    if (type !== 'bundle') baseQuantity = parseInt(document.getElementById('productQuantity').value);
    if (!name || !categoryId) return alert('أدخل البيانات');
    const imageFile = document.getElementById('productImage').files[0];
    let image = '';
    if (imageFile) image = await fileToBase64(imageFile, 512);
    try {
        await createProduct({ name, category_id: categoryId, product_type: type, base_price: price, base_quantity: baseQuantity, input_type: inputType, image });
        closeModal();
        await loadAllData();
        renderProducts();
        alert('تم إضافة المنتج بنجاح');
    } catch (error) {
        console.error('خطأ إضافة المنتج:', error);
        alert(`فشل إضافة المنتج: ${error.message}`);
    }
}

async function deleteProductHandler(productId) {
    if (confirm('حذف المنتج؟')) {
        try {
            await deleteProduct(productId);
            await loadAllData();
            renderProducts();
            alert('تم حذف المنتج');
        } catch (error) {
            console.error('خطأ حذف المنتج:', error);
            alert(`فشل حذف المنتج: ${error.message}`);
        }
    }
}

function renderPaymentMethods() {
    const container = document.getElementById('paymentMethodsList');
    container.innerHTML = paymentMethodsData.map(m => `
        <div class="payment-card">
            <div class="card-icon">${m.icon ? `<img src="${m.icon}" style="width:50px;height:50px;border-radius:12px;object-fit:cover;">` : '💳'}</div>
            <div class="card-title">${m.name}</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);">${m.description || ''}</div>
            <div class="card-actions">
                <button class="btn-danger" onclick="deletePaymentMethodHandler(${m.id})">حذف</button>
            </div>
        </div>
    `).join('');
}

function openPaymentMethodModal() {
    const body = `
        <h3>إضافة طريقة دفع</h3>
        <div class="form-group"><label>اسم طريقة الدفع</label><input type="text" id="paymentName"></div>
        <div class="form-group"><label>اسم الحساب</label><input type="text" id="paymentAccountName"></div>
        <div class="form-group"><label>رقم الحساب</label><input type="text" id="paymentAccount"></div>
        <div class="form-group">
            <label>صورة QR</label>
            <div class="image-preview" id="paymentQRPreview">لا صورة</div>
            <input type="file" id="paymentQR" accept="image/*" onchange="previewImage(this,'paymentQRPreview')">
        </div>
        <div class="form-group">
            <label>صورة طريقة الدفع (لوجو)</label>
            <div class="image-preview" id="paymentLogoPreview">لا صورة</div>
            <input type="file" id="paymentLogo" accept="image/*" onchange="previewImage(this,'paymentLogoPreview')">
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
    const account_name = document.getElementById('paymentAccountName').value;
    const account = document.getElementById('paymentAccount').value;
    if (!name) return alert('أدخل اسم الطريقة');
    const qrFile = document.getElementById('paymentQR').files[0];
    const logoFile = document.getElementById('paymentLogo').files[0];
    let qr_image = '';
    let logo_image = '';
    if (qrFile) qr_image = await fileToBase64(qrFile, 512);
    if (logoFile) logo_image = await fileToBase64(logoFile, 512);
    try {
        await createPaymentMethod({
            name,
            description: '',
            account_name,
            account,
            icon: logo_image,
            qr_image,
            is_active: true
        });
        closeModal();
        await loadAllData();
        renderPaymentMethods();
        alert('تم إضافة طريقة الدفع بنجاح');
    } catch (error) {
        console.error('خطأ إضافة طريقة الدفع:', error);
        alert(`فشل إضافة طريقة الدفع: ${error.message}`);
    }
}

async function deletePaymentMethodHandler(methodId) {
    if (confirm('حذف طريقة الدفع؟')) {
        try {
            await deletePaymentMethod(methodId);
            await loadAllData();
            renderPaymentMethods();
            alert('تم حذف طريقة الدفع');
        } catch (error) {
            console.error('خطأ حذف طريقة الدفع:', error);
            alert(`فشل حذف طريقة الدفع: ${error.message}`);
        }
    }
}

function renderOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>${order.order_number}</td>
            <td>${order.product_name || order.product_id}</td>
            <td>${order.quantity}</td>
            <td>${order.total_price}$</td>
            <td>
                <select onchange="changeOrderStatus(${order.id}, this.value)">
                    <option value="pending" ${order.status==='pending'?'selected':''}>قيد المعالجة</option>
                    <option value="review" ${order.status==='review'?'selected':''}>قيد المراجعة</option>
                    <option value="processing" ${order.status==='processing'?'selected':''}>قيد التنفيذ</option>
                    <option value="completed" ${order.status==='completed'?'selected':''}>مكتمل</option>
                    <option value="failed" ${order.status==='failed'?'selected':''}>فشل</option>
                    <option value="cancelled" ${order.status==='cancelled'?'selected':''}>ملغي</option>
                </select>
            </td>
            <td><button class="btn-outline" onclick="viewOrderDetails(${order.id})">عرض</button></td>
        </tr>
    `).join('');
}

async function changeOrderStatus(orderId, status) {
    try {
        await updateOrderStatus(orderId, status);
        await loadAllData();
        filteredOrders = [...ordersData];
        renderOrders(ordersData);
        alert('تم تحديث حالة الطلب');
    } catch (error) {
        alert(`فشل تغيير حالة الطلب: ${error.message}`);
    }
}

function viewOrderDetails(orderId) {
    const order = ordersData.find(o => o.id === orderId);
    if (!order) return;
    let deliveryInfo = '';
    try {
        const delivery = JSON.parse(order.delivery_data || '{}');
        if (delivery.player_id) deliveryInfo += `<div><strong>معرف اللاعب (ID):</strong> ${delivery.player_id}</div>`;
        if (delivery.phone) deliveryInfo += `<div><strong>رقم الهاتف:</strong> ${delivery.phone}</div>`;
        if (delivery.bundle_name) deliveryInfo += `<div><strong>الباقة:</strong> ${delivery.bundle_name}</div>`;
    } catch (e) {
        deliveryInfo = `<div>${order.delivery_data || '-'}</div>`;
    }
    const body = `
        <div style="text-align:right;">
            <h3>تفاصيل الطلب</h3>
            <p><strong>رقم الطلب:</strong> ${order.order_number}</p>
            <p><strong>المنتج:</strong> ${order.product_name || order.product_id}</p>
            <p><strong>الكمية:</strong> ${order.quantity}</p>
            <p><strong>السعر الإجمالي:</strong> ${order.total_price}$</p>
            <p><strong>الحالة:</strong> ${order.status}</p>
            ${deliveryInfo}
            <p><strong>التاريخ:</strong> ${order.created_at ? new Date(order.created_at).toLocaleString('ar') : ''}</p>
        </div>
    `;
    openModal('تفاصيل الطلب', body);
}

function renderDeposits(deposits) {
    const tbody = document.getElementById('depositsTableBody');
    if (!deposits.length) {
        tbody.innerHTML = '<tr><td colspan="6">لا توجد إيداعات</td></tr>';
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
                ${d.admin_note ? `<div><small>${d.admin_note}</small></div>` : '-'}
                ${d.status === 'pending' ? `
                    <button class="btn-outline" onclick="approveDepositHandler(${d.id})">قبول</button>
                    <button class="btn-outline" onclick="rejectDepositHandler(${d.id})">رفض</button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

async function approveDepositHandler(depositId) {
    try {
        await approveDeposit(depositId);
        await loadAllData();
        renderDeposits(depositsData);
        alert('تم قبول الإيداع');
    } catch (error) {
        alert(`فشل قبول الإيداع: ${error.message}`);
    }
}

async function rejectDepositHandler(depositId) {
    try {
        await rejectDeposit(depositId);
        await loadAllData();
        renderDeposits(depositsData);
        alert('تم رفض الإيداع');
    } catch (error) {
        alert(`فشل رفض الإيداع: ${error.message}`);
    }
}

function renderKYC() {
    const tbody = document.getElementById('kycTableBody');
    if (!kycData.length) {
        tbody.innerHTML = '<tr><td colspan="7">لا توجد طلبات توثيق</td></tr>';
        return;
    }
    tbody.innerHTML = kycData.map(k => `
        <tr>
            <td>${k.user_id}</td>
            <td>${k.full_name}</td>
            <td>${k.phone}</td>
            <td>${k.address || '-'}</td>
            <td>
                ${k.selfie_image ? `<a href="${k.selfie_image}" target="_blank">عرض الصورة</a>` : '-'}
            </td>
            <td><span class="status-badge ${k.status === 'approved' ? 'completed' : k.status === 'rejected' ? 'failed' : 'pending'}">${k.status}</span></td>
            <td>
                ${k.status === 'pending' ? `
                    <button class="btn-outline" onclick="window.approveKYCRequest(${k.id})">قبول</button>
                    <button class="btn-outline" onclick="window.rejectKYCRequest(${k.id})">رفض</button>
                ` : '-'}
            </td>
        </tr>
    `).join('');
}

function renderServiceRequests() {
    const tbody = document.getElementById('serviceRequestsTableBody');
    if (!serviceRequestsData.length) {
        tbody.innerHTML = '<tr><td colspan="6">لا توجد طلبات خدمة</td></tr>';
        return;
    }
    tbody.innerHTML = serviceRequestsData.map(r => `
        <tr>
            <td>${r.user_id}</td>
            <td>${r.service_name}</td>
            <td>${r.description || '-'}</td>
            <td>${r.estimated_price ? r.estimated_price + '$' : '-'}</td>
            <td><span class="status-badge ${r.status === 'pending' ? 'pending' : r.status === 'completed' ? 'completed' : 'failed'}">${r.status}</span></td>
            <td>
                <button class="btn-outline" onclick="viewServiceRequest(${r.id})">عرض</button>
            </td>
        </tr>
    `).join('');
}

function viewServiceRequest(reqId) {
    const req = serviceRequestsData.find(r => r.id === reqId);
    if (!req) return;
    const body = `
        <div style="text-align:right;">
            <h3>تفاصيل طلب الخدمة</h3>
            <p><strong>اسم الخدمة:</strong> ${req.service_name}</p>
            <p><strong>الوصف:</strong> ${req.description || '-'}</p>
            <p><strong>السعر المتوقع:</strong> ${req.estimated_price ? req.estimated_price + '$' : '-'}</p>
            <p><strong>الحالة:</strong> ${req.status}</p>
            <p><strong>التاريخ:</strong> ${req.created_at ? new Date(req.created_at).toLocaleString('ar') : ''}</p>
        </div>
    `;
    openModal('تفاصيل طلب الخدمة', body);
}

// ============ سجل النشاطات ============
async function loadActivities() {
    const tbody = document.getElementById('activitiesTableBody');
    try {
        activitiesData = await fetchActivities();
        if (!activitiesData.length) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">لا توجد نشاطات</td></tr>';
            return;
        }
        tbody.innerHTML = activitiesData.map(a => `
            <tr>
                <td>${a.id}</td>
                <td>${a.action}</td>
                <td>${a.created_at ? new Date(a.created_at).toLocaleString('ar') : ''}</td>
            </tr>
        `).join('');
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#F44336;">فشل تحميل النشاطات: ${error.message}</td></tr>`;
    }
}

// ============ الفلاتر المتقدمة ============
function applyOrderFilters() {
    const searchQuery = (document.getElementById('orderSearchQuery')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('orderStatusFilter')?.value || 'all';
    const fromDate = document.getElementById('orderFromDate')?.value;
    const toDate = document.getElementById('orderToDate')?.value;
    const sortFilter = document.getElementById('orderSortFilter')?.value || 'newest';

    let filtered = [...ordersData];

    if (searchQuery) {
        filtered = filtered.filter(o =>
            (o.order_number || '').toLowerCase().includes(searchQuery) ||
            (o.user_id + '').includes(searchQuery)
        );
    }

    if (statusFilter !== 'all') {
        filtered = filtered.filter(o => o.status === statusFilter);
    }

    if (fromDate) {
        const fromTime = new Date(fromDate).getTime();
        filtered = filtered.filter(o => o.created_at && new Date(o.created_at).getTime() >= fromTime);
    }

    if (toDate) {
        const toTime = new Date(toDate).getTime() + (24 * 60 * 60 * 1000);
        filtered = filtered.filter(o => o.created_at && new Date(o.created_at).getTime() <= toTime);
    }

    if (sortFilter === 'newest') {
        filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (sortFilter === 'oldest') {
        filtered.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    } else if (sortFilter === 'price_high') {
        filtered.sort((a, b) => (b.total_price || 0) - (a.total_price || 0));
    } else if (sortFilter === 'price_low') {
        filtered.sort((a, b) => (a.total_price || 0) - (b.total_price || 0));
    }

    filteredOrders = filtered;
    renderOrders(filtered);
}

function resetOrderFilters() {
    const searchInput = document.getElementById('orderSearchQuery');
    const statusSelect = document.getElementById('orderStatusFilter');
    const fromInput = document.getElementById('orderFromDate');
    const toInput = document.getElementById('orderToDate');
    const sortSelect = document.getElementById('orderSortFilter');

    if (searchInput) searchInput.value = '';
    if (statusSelect) statusSelect.value = 'all';
    if (fromInput) fromInput.value = '';
    if (toInput) toInput.value = '';
    if (sortSelect) sortSelect.value = 'newest';

    filteredOrders = [...ordersData];
    renderOrders(ordersData);
}

// ============ تصدير CSV ============
function downloadCSV(filename, rows) {
    const csvContent = rows.map(row =>
        row.map(cell => {
            const str = String(cell ?? '').replace(/"/g, '""');
            return `"${str}"`;
        }).join(',')
    ).join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function exportUsersCSV() {
    const rows = [['Telegram ID', 'الاسم', 'الرصيد', 'الحالة', 'VIP', 'KYC']];
    usersData.forEach(u => {
        rows.push([
            u.telegram_id,
            u.username || u.first_name || 'مستخدم',
            u.balance.toFixed(2) + '$',
            u.is_banned ? 'محظور' : 'نشط',
            u.vip_level > 0 ? 'VIP' + u.vip_level : '-',
            u.kyc_status
        ]);
    });
    downloadCSV('users.csv', rows);
}

function exportOrdersCSV() {
    const rows = [['رقم الطلب', 'المنتج', 'الكمية', 'السعر الإجمالي', 'الحالة', 'التاريخ']];
    const dataToExport = filteredOrders.length ? filteredOrders : ordersData;
    dataToExport.forEach(o => {
        rows.push([
            o.order_number,
            o.product_name || o.product_id,
            o.quantity,
            o.total_price + '$',
            o.status,
            o.created_at ? new Date(o.created_at).toLocaleString('ar') : ''
        ]);
    });
    downloadCSV('orders.csv', rows);
}

function exportDepositsCSV() {
    const rows = [['رقم العملية', 'المستخدم', 'المبلغ', 'الطريقة', 'الحالة', 'التاريخ']];
    depositsData.forEach(d => {
        rows.push([
            d.transaction_id,
            d.user_id,
            d.amount + '$',
            d.method,
            d.status,
            d.created_at ? new Date(d.created_at).toLocaleString('ar') : ''
        ]);
    });
    downloadCSV('deposits.csv', rows);
}

// ============ أدوات عامة ============
function sendAdminNotification() {
    const message = document.getElementById('notificationMessage').value;
    if (!message) return alert('أدخل نص الإشعار');
    const target = document.getElementById('notificationTarget').value;
    const type = document.getElementById('notificationType').value;
    const data = { target, title: 'إشعار من الإدارة', message, type };
    if (target === 'specific') data.user_id = document.getElementById('notificationUserId').value;
    sendNotification(data).then(() => alert('تم الإرسال')).catch(error => alert(`فشل الإرسال: ${error.message}`));
}

function openModal(title, bodyHTML) {
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

function previewImage(input, previewId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => document.getElementById(previewId).innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
        reader.readAsDataURL(input.files[0]);
    }
}

function fileToBase64(file, maxWidth = 512) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function saveSettings() {
    alert('تم حفظ الإعدادات');
}
