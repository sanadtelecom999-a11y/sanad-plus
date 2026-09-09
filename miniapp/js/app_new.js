// miniapp/js/app_new.js

let currentPage = 'page-home';
let userData = null;
let categoriesData = [];
let productsData = [];
let ordersData = [];
let depositsData = [];
let paymentMethodsData = [];
let kycStatus = 'none';
let notificationsData = [];

document.addEventListener('DOMContentLoaded', async () => {
    initTelegram();
    applyTelegramTheme();

    let telegram_id = window.currentUser?.id || window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    if (telegram_id) {
        userData = await authenticateUser(window.Telegram?.WebApp?.initData || '');
    } else {
        alert('لا يمكن الوصول لبيانات تيليجرام.\nتأكد أنك فتحت التطبيق من زر "افتح المتجر" داخل البوت وليس كرابط خارجي.');
        userData = null;
    }

    updateUserUI();
    await loadInitialData();
    setupNavigation();
    setupFilters();
    setupSearch();

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        const darkToggle = document.getElementById('darkModeToggle');
        if (darkToggle) darkToggle.checked = savedTheme === 'dark';
    }
});

async function loadInitialData() {
    try {
        categoriesData = await fetchCategories();
        productsData = await fetchProducts();
        paymentMethodsData = await fetchPaymentMethods();

        if (userData?.telegram_id) {
            ordersData = await fetchUserOrders(userData.telegram_id);
            depositsData = await fetchUserDeposits(userData.telegram_id);
            notificationsData = await fetchNotifications(userData.telegram_id);
            const kycInfo = await getMyKYC(userData.telegram_id);
            kycStatus = kycInfo.status || 'none';
        }

        renderCategories();
        renderPaymentMethods();
        renderOrders(ordersData);
        renderDeposits(depositsData);
        updateKYCUI();
        updateNotificationBadge();
    } catch (error) {
        console.error('Error loading data:', error);
        alert('حدث خطأ أثناء تحميل البيانات');
    }
}

function updateUserUI() {
    if (!userData) {
        document.getElementById('greetingMessage').textContent = 'الرجاء فتح التطبيق من تيليجرام';
        document.getElementById('greetingSub').textContent = 'لم يتم التعرف على حسابك';
        return;
    }

    document.getElementById('headerBalance').textContent = `${userData.balance.toFixed(2)}$`;
    document.getElementById('chargeBalance').textContent = `${userData.balance.toFixed(2)}$`;
    document.getElementById('accountBalance').textContent = `${userData.balance.toFixed(2)}$`;

    document.getElementById('accountName').textContent = userData.username || userData.first_name || 'مستخدم';
    document.getElementById('accountId').textContent = `ID: ${userData.telegram_id}`;
    document.getElementById('accountEmail').textContent = userData.username ? `@${userData.username}` : '';

    if (userData.vip_level > 0) {
        const vipBadge = document.getElementById('vipBadge');
        vipBadge.innerHTML = `<span class="material-icons" style="font-size:16px; vertical-align:middle;">star</span> VIP${userData.vip_level}`;
        vipBadge.style.display = 'inline-block';
        document.getElementById('accountVipBadge').innerHTML = `<span class="material-icons" style="font-size:16px; vertical-align:middle;">star</span> VIP${userData.vip_level}`;
        document.getElementById('accountVipBadge').style.display = 'inline-block';
    }

    const hour = new Date().getHours();
    let greeting = 'مرحباً';
    if (hour < 12) greeting = 'صباح الخير';
    else if (hour < 18) greeting = 'مساء الخير';
    else greeting = 'مساء النور';

    document.getElementById('greetingMessage').textContent = `${greeting}، ${userData.first_name || 'مستخدم'}`;
    document.getElementById('greetingSub').textContent = `رصيدك: ${userData.balance.toFixed(2)}$`;

    if (window.currentUser?.photo_url) {
        document.getElementById('headerAvatar').style.backgroundImage = `url(${window.currentUser.photo_url})`;
        document.getElementById('headerAvatar').textContent = '';
    } else {
        document.getElementById('headerAvatar').textContent = (userData.first_name || 'م')[0];
    }

    updateKYCBadge();
}

function updateKYCBadge() {
    const badge = document.getElementById('accountKycBadge');
    if (!badge || !userData) return;
    if (userData.kyc_status === 'verified' || userData.is_verified) {
        badge.innerHTML = '<span class="status-badge verified">موثق <span class="material-icons">verified</span></span>';
    } else if (userData.kyc_status === 'pending' || kycStatus === 'pending') {
        badge.innerHTML = '<span class="status-badge pending">قيد المراجعة</span>';
    } else {
        badge.innerHTML = '<span class="status-badge unverified">غير موثق</span>';
    }
}

function renderCategories() {
    const grid = document.getElementById('categoriesGrid');
    const countEl = document.getElementById('categoriesCount');
    if (!grid) return;
    grid.innerHTML = categoriesData.map(cat => `
        <div class="category-item" data-id="${cat.id}" onclick="showCategoryProducts(${cat.id})">
            <div class="category-icon">${cat.image || '📁'}</div>
            <div class="category-name">${cat.name}</div>
        </div>
    `).join('');
    if (countEl) countEl.textContent = categoriesData.length;
}

function showCategoryProducts(categoryId) {
    const category = categoriesData.find(c => c.id === categoryId);
    if (!category) return;
    document.getElementById('productsPageTitle').textContent = category.name;
    const filtered = productsData.filter(p => p.category_id === categoryId);
    renderProductsList(filtered);
    navigateTo('page-products');
}

function renderProductsList(products) {
    const list = document.getElementById('productsList');
    if (!list) return;
    if (!products.length) {
        list.innerHTML = '<div class="empty-state">لا توجد منتجات في هذا القسم</div>';
        return;
    }
    list.innerHTML = products.map(prod => `
        <div class="product-card" data-id="${prod.id}" onclick="openPurchaseModal(${prod.id})">
            <div class="product-image" style="background-image:url('${prod.image || ''}'); background-color:#f0f0f0;">${prod.image ? '' : '📦'}</div>
            <div class="product-name">${prod.name}</div>
            <div class="product-price">${prod.base_price}$</div>
            <span class="product-type-badge">${prod.product_type === 'bundle' ? 'باقة' : prod.product_type === 'topup' ? 'رصيد' : 'كمية'}</span>
        </div>
    `).join('');
}

function renderPaymentMethods() {
    const container = document.getElementById('paymentMethodsList');
    if (!container) return;
    container.innerHTML = paymentMethodsData.map(m => `
        <div class="payment-method" data-id="${m.id}" onclick="showDepositForm(${m.id})">
            <div class="payment-method-info">
                ${m.icon ? `<img src="${m.icon}" style="width:48px;height:48px;border-radius:12px;object-fit:cover;" alt="${m.name}">` : '<span class="payment-method-icon">💳</span>'}
                <div>
                    <div class="payment-method-name">${m.name}</div>
                    <div class="payment-method-desc">${m.description || ''}</div>
                </div>
            </div>
            <span class="material-icons">chevron_left</span>
        </div>
    `).join('');
}

function renderOrders(orders) {
    const list = document.getElementById('ordersList');
    if (!list) return;
    if (!orders || !orders.length) {
        list.innerHTML = '<div class="empty-state">لا توجد طلبات</div>';
        return;
    }
    list.innerHTML = orders.map(order => `
        <div class="order-card" data-status="${order.status}">
            <div class="order-header">
                <span class="order-number">${order.order_number}</span>
                <span class="status-badge ${order.status}">${getStatusText(order.status)}</span>
            </div>
            <div class="order-details">
                <div>المنتج: ${order.product_id}</div>
                <div>الكمية: ${order.quantity}</div>
                <div>السعر: ${order.total_price}$</div>
                <div>التاريخ: ${order.created_at ? new Date(order.created_at).toLocaleString('ar') : ''}</div>
            </div>
        </div>
    `).join('');
}

function getStatusText(status) {
    switch(status) {
        case 'pending': return 'قيد المعالجة';
        case 'review': return 'قيد المراجعة';
        case 'processing': return 'قيد التنفيذ';
        case 'completed': return 'مكتمل';
        case 'failed': return 'فشل';
        default: return status || 'غير معروف';
    }
}

function renderDeposits(deposits) {
    const list = document.getElementById('depositsList');
    if (!list) return;
    if (!deposits || !deposits.length) {
        list.innerHTML = '<div class="empty-state">لا توجد إيداعات</div>';
        return;
    }
    list.innerHTML = deposits.map(d => `
        <div class="order-card">
            <div class="order-header">
                <span>${d.transaction_id}</span>
                <span class="status-badge ${d.status === 'approved' ? 'completed' : d.status}">${d.status === 'approved' ? 'مكتمل' : d.status === 'rejected' ? 'مرفوض' : 'معلق'}</span>
            </div>
            <div class="order-details">
                <div>المبلغ: ${d.amount}$</div>
                <div>الطريقة: ${d.method}</div>
                ${d.admin_note ? `<div>ملاحظة: ${d.admin_note}</div>` : ''}
                <div>التاريخ: ${d.created_at ? new Date(d.created_at).toLocaleString('ar') : ''}</div>
            </div>
        </div>
    `).join('');
}

function updateKYCUI() {
    const container = document.getElementById('kycDynamicContent');
    if (!container) return;
    const isVerified = (userData && (userData.kyc_status === 'verified' || userData.is_verified)) || kycStatus === 'verified';
    const isPending = (userData && userData.kyc_status === 'pending') || kycStatus === 'pending';
    if (isVerified) {
        container.innerHTML = `
            <div class="kyc-container">
                <h2>توثيق الحساب (KYC)</h2>
                <div class="kyc-icon"><span class="material-icons">verified</span></div>
                <p class="kyc-message">حسابك موثق بالفعل</p>
            </div>`;
    } else if (isPending) {
        container.innerHTML = `
            <div class="kyc-container">
                <h2>توثيق الحساب (KYC)</h2>
                <div class="kyc-icon" style="background:#FFC107;"><span class="material-icons">schedule</span></div>
                <p class="kyc-message">طلب التوثيق قيد التدقيق يرجى انتظار رد الإدارة</p>
            </div>`;
    } else {
        container.innerHTML = `
            <div class="kyc-container">
                <h2>توثيق الحساب</h2>
                <p style="color:var(--text-secondary); margin-bottom:20px;">يرجى تعبئة البيانات التالية لتفعيل جميع ميزات التطبيق</p>
                <div class="kyc-form" style="max-width:400px; margin:0 auto; text-align:right;">
                    <div class="form-group">
                        <label>الاسم الكامل</label>
                        <input type="text" id="kycFullName" placeholder="مثال: أحمد محمد" />
                    </div>
                    <div class="form-group">
                        <label>رقم الجوال</label>
                        <input type="tel" id="kycPhone" placeholder="مثال: 0959921234" />
                    </div>
                    <div class="form-group">
                        <label>العنوان الحالي</label>
                        <input type="text" id="kycAddress" placeholder="المدينة / المنطقة" />
                    </div>
                    <div class="form-group">
                        <label>صورة سيلفي مع الهوية</label>
                        <div class="image-preview" id="kycSelfiePreview" style="height:180px;">
                            <span style="color:var(--text-secondary); font-size:0.9rem;">اضغط لرفع الصورة</span>
                        </div>
                        <input type="file" id="kycSelfieImage" accept="image/*" onchange="previewImage(this,'kycSelfiePreview')" style="margin-top:8px;" />
                    </div>
                    <button class="btn-primary" onclick="submitKYCRequest()">إرسال طلب التوثيق</button>
                </div>
            </div>
        `;
    }
}

async function submitKYCRequest() {
    const fullName = document.getElementById('kycFullName')?.value;
    const phone = document.getElementById('kycPhone')?.value;
    const address = document.getElementById('kycAddress')?.value;
    const selfieFile = document.getElementById('kycSelfieImage')?.files[0];

    if (!fullName || !phone || !address || !selfieFile) {
        alert('يرجى تعبئة جميع الحقول ورفع الصورة');
        return;
    }

    if (!userData || !userData.telegram_id) {
        alert('بيانات المستخدم غير متوفرة، افتح التطبيق من تيليجرام');
        return;
    }

    const compressImage = (file, maxWidth = 600) => new Promise((resolve, reject) => {
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
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    try {
        const selfieBase64 = await compressImage(selfieFile);

        const result = await submitKYC({
            telegram_id: userData.telegram_id,
            full_name: fullName,
            phone: phone,
            address: address,
            selfie_image: selfieBase64,
        });

        if (result && result.error) {
            alert(result.error);
        } else {
            alert('تم إرسال طلب التوثيق بنجاح');
            kycStatus = 'pending';
            updateKYCUI();
            navigateTo('page-account');
            updateUserUI();
        }
    } catch (error) {
        console.error('KYC submit error:', error);
        alert(`فشل إرسال الطلب: ${error.message}`);
    }
}

function openPurchaseModal(productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;

    let modalContent = `
        <div class="purchase-modal">
            <div class="purchase-image" style="background-image:url('${product.image || ''}'); background-color:#f0f0f0; background-size:contain; background-repeat:no-repeat; background-position:center; height:150px; border-radius:12px; margin-bottom:12px;">
                ${product.image ? '' : '📦'}
            </div>
            <h3 style="margin: 12px 0; text-align:center;">${product.name}</h3>
            <p style="text-align:center; color:var(--text-secondary); font-size:0.9rem;">عادة ما تتم المراجعة خلال 15-5 دقيقة</p>
            <div class="form-group">
                <label>${product.product_type === 'bundle' ? 'اختر الباقة' : 'الكمية'}</label>
                ${product.product_type === 'bundle' ? `
                    <select id="purchaseBundleId" class="input-field">
                        ${product.bundles.map(b => `<option value="${b.id}">${b.name} - ${b.quantity} ${product.unit_name} - ${b.price_usd}$</option>`).join('')}
                    </select>
                ` : `
                    <input type="number" id="purchaseQuantity" value="1" min="1" class="input-field">
                `}
            </div>
            ${product.input_type === 'id' ? `
                <div class="form-group">
                    <label>معرف اللاعب (ID)</label>
                    <input type="text" id="purchasePlayerId" placeholder="أدخل المعرف" class="input-field">
                </div>
            ` : ''}
            ${product.input_type === 'phone' ? `
                <div class="form-group">
                    <label>رقم الهاتف</label>
                    <input type="tel" id="purchasePhone" placeholder="أدخل رقم الهاتف" class="input-field">
                </div>
            ` : ''}
            <div style="font-weight:bold; font-size:1.2rem; margin: 16px 0; text-align:center;" id="purchaseTotal">الإجمالي: 0.00$</div>
            <div style="display:flex; gap:8px;">
                <button class="btn-primary" style="flex:1;" onclick="confirmPurchase(${product.id})">شراء</button>
                <button class="btn-outline" style="flex:1;" onclick="closeModal()">إلغاء</button>
            </div>
        </div>
    `;
    openModal('شراء منتج', modalContent);

    const updateTotal = () => {
        let total = 0;
        if (product.product_type === 'bundle') {
            const bundleId = document.getElementById('purchaseBundleId')?.value;
            const bundle = product.bundles?.find(b => b.id == bundleId);
            if (bundle) total = bundle.price_usd;
        } else {
            const qty = parseFloat(document.getElementById('purchaseQuantity')?.value) || 0;
            total = product.base_price * qty;
        }
        const totalEl = document.getElementById('purchaseTotal');
        if (totalEl) totalEl.textContent = `الإجمالي: ${total.toFixed(2)}$`;
    };

    if (product.product_type === 'bundle') {
        document.getElementById('purchaseBundleId')?.addEventListener('change', updateTotal);
    } else {
        document.getElementById('purchaseQuantity')?.addEventListener('input', updateTotal);
    }
    updateTotal();
}

async function confirmPurchase(productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product || !userData) {
        alert('افتح التطبيق من تيليجرام');
        return;
    }

    const orderData = {
        telegram_id: userData.telegram_id,
        product_id: productId,
    };

    if (product.product_type === 'bundle') {
        orderData.bundle_id = parseInt(document.getElementById('purchaseBundleId')?.value);
    } else {
        orderData.quantity = parseInt(document.getElementById('purchaseQuantity')?.value);
    }

    if (product.input_type === 'id') {
        orderData.player_id = document.getElementById('purchasePlayerId')?.value;
    } else if (product.input_type === 'phone') {
        orderData.phone = document.getElementById('purchasePhone')?.value;
    }

    try {
        const result = await createOrder(orderData);
        if (result && result.error) {
            alert(result.error);
        } else {
            alert('طلبك قيد المعالجة');
            closeModal();
            ordersData = await fetchUserOrders(userData.telegram_id);
            renderOrders(ordersData);
            userData = await authenticateUser(window.Telegram?.WebApp?.initData || '');
            updateUserUI();
        }
    } catch (error) {
        console.error('Order error:', error);
        alert(`فشل إرسال الطلب: ${error.message}`);
    }
}

function showDepositForm(methodId) {
    const method = paymentMethodsData.find(m => m.id === methodId);
    if (!method) return;
    openModal('إيداع', `
        <div class="form-group">
            <label>المبلغ (دولار)</label>
            <input type="number" id="depositAmount" min="${method.min_amount || 0}" step="0.01">
        </div>
        <div class="form-group">
            <label>رقم الحساب / المحفظة</label>
            <input type="text" id="depositAccountNumber" placeholder="أدخل رقم الحساب">
        </div>
        <div class="form-group">
            <label>اسم المرسل</label>
            <input type="text" id="depositSenderName" placeholder="اسم المرسل">
        </div>
        <div class="form-group">
            <label>إثبات التحويل (صورة)</label>
            <div class="image-preview" id="depositProofPreview">📷</div>
            <input type="file" id="depositProofImage" accept="image/*" onchange="previewImage(this, 'depositProofPreview')">
        </div>
        <button class="btn-primary" onclick="submitDeposit('${method.id}')">إرسال</button>
    `);
}

async function submitDeposit(methodId) {
    const amount = parseFloat(document.getElementById('depositAmount')?.value);
    const accountNumber = document.getElementById('depositAccountNumber')?.value;
    const senderName = document.getElementById('depositSenderName')?.value;
    const proofFile = document.getElementById('depositProofImage')?.files[0];

    if (!amount || amount <= 0) {
        alert('أدخل مبلغ صحيح');
        return;
    }
    if (!proofFile) {
        alert('ارفع صورة الإثبات');
        return;
    }

    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    try {
        const proofBase64 = await toBase64(proofFile);
        const result = await createDeposit({
            telegram_id: userData.telegram_id,
            amount,
            method: methodId,
            proof_image: proofBase64,
            account_number: accountNumber,
            sender_name: senderName,
        });
        if (result && result.error) {
            alert(result.error);
        } else {
            alert('تم إرسال طلب الإيداع');
            closeModal();
            depositsData = await fetchUserDeposits(userData.telegram_id);
            renderDeposits(depositsData);
        }
    } catch (error) {
        console.error('Deposit error:', error);
        alert(`فشل إرسال الإيداع: ${error.message}`);
    }
}

function requestCustomService() {
    openModal('طلب خدمة مخصصة', `
        <div class="form-group">
            <label>اسم الخدمة</label>
            <input type="text" id="serviceName" placeholder="مثال: تصميم شعار">
        </div>
        <div class="form-group">
            <label>وصف الخدمة</label>
            <textarea id="serviceDesc" rows="3" placeholder="اكتب تفاصيل الخدمة"></textarea>
        </div>
        <div class="form-group">
            <label>السعر المتوقع (اختياري)</label>
            <input type="number" id="servicePrice" placeholder="0.00">
        </div>
        <button class="btn-primary" onclick="submitServiceRequest()">إرسال الطلب</button>
        <button class="btn-outline" onclick="closeModal()">إلغاء</button>
    `);
}

async function submitServiceRequest() {
    const service_name = document.getElementById('serviceName').value;
    const description = document.getElementById('serviceDesc').value;
    const estimated_price = parseFloat(document.getElementById('servicePrice').value) || 0;
    if (!service_name) return alert('أدخل اسم الخدمة');
    try {
        const result = await requestCustomService({ telegram_id: userData.telegram_id, service_name, description, estimated_price });
        if (result && result.error) {
            alert(result.error);
        } else {
            alert('تم إرسال الطلب');
            closeModal();
        }
    } catch (error) {
        alert(`فشل إرسال الطلب: ${error.message}`);
    }
}

function openSupport() {
    window.open('https://t.me/SANADST', '_blank');
}

function openNotificationsPage() {
    if (!userData) {
        alert('افتح التطبيق من تيليجرام');
        return;
    }
    fetchNotifications(userData.telegram_id).then(notifications => {
        const bodyHTML = `
            <div style="text-align:center;">
                <h3>الإشعارات</h3>
                ${notifications.length ? notifications.map(n => `
                    <div style="text-align:right;background:var(--surface);border-radius:12px;padding:12px;margin-bottom:8px;border:1px solid var(--border);">
                        <div style="font-weight:bold;">${n.title}</div>
                        <div style="color:var(--text-secondary);font-size:0.8rem;">${n.message}</div>
                        <div style="color:var(--text-secondary);font-size:0.7rem;">${n.created_at ? new Date(n.created_at).toLocaleString('ar') : ''}</div>
                    </div>`).join('') : '<p>لا توجد إشعارات</p>'}
            </div>`;
        openModal('الإشعارات', bodyHTML);
    });
}

function updateNotificationBadge() {
    const unread = notificationsData.filter(n => !n.is_read).length;
    const badge = document.getElementById('notificationBadge');
    if (unread > 0) {
        badge.style.display = 'inline';
        badge.textContent = unread;
    } else {
        badge.style.display = 'none';
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const pageId = item.getAttribute('data-page');
            navigateTo(pageId);
        });
    });
    document.getElementById('backButton')?.addEventListener('click', handleBack);
    document.getElementById('closeButton')?.addEventListener('click', handleClose);
}

function setupFilters() {
    const orderFilters = document.getElementById('orderFilters');
    if (orderFilters) {
        orderFilters.querySelectorAll('.pill').forEach(pill => {
            pill.addEventListener('click', () => {
                orderFilters.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                const filter = pill.getAttribute('data-filter');
                const filtered = filter === 'all' ? ordersData : ordersData.filter(o => o.status === filter);
                renderOrders(filtered);
            });
        });
    }

    const depositFilters = document.getElementById('depositFilters');
    if (depositFilters) {
        depositFilters.querySelectorAll('.pill').forEach(pill => {
            pill.addEventListener('click', () => {
                depositFilters.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                const filter = pill.getAttribute('data-filter');
                const filtered = filter === 'all' ? depositsData : depositsData.filter(d => d.status === filter);
                renderDeposits(filtered);
            });
        });
    }
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase();
            const filtered = productsData.filter(p => p.name.toLowerCase().includes(query));
            if (currentPage === 'page-products') {
                renderProductsList(filtered);
            }
        });
    }
}

function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.getAttribute('data-page') === pageId));
    currentPage = pageId;
    if (pageId === 'page-home') renderCategories();
    if (pageId === 'page-orders') renderOrders(ordersData);
    if (pageId === 'page-charge') renderPaymentMethods();
    if (pageId === 'page-deposits') renderDeposits(depositsData);
    if (pageId === 'page-account') updateUserUI();
    if (pageId === 'page-kyc') updateKYCUI();
}

function previewImage(input, previewId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => document.getElementById(previewId).innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
        reader.readAsDataURL(input.files[0]);
    }
}

function openModal(title, bodyHTML) {
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

function handleBack() {
    if (currentPage !== 'page-home') navigateTo('page-home');
    else window.history.back();
}

function handleClose() {
    if (window.Telegram?.WebApp?.close) window.Telegram.WebApp.close();
    else window.close();
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function goToAccount() { navigateTo('page-account'); }
function showNotifications() { openNotificationsPage(); }
