// miniapp/js/app.js

let currentPage = 'page-home';
let userData = null;
let categoriesData = [];
let productsData = [];
let ordersData = [];
let paymentMethodsData = [];
let kycStatus = 'none'; // none, pending, verified, rejected

document.addEventListener('DOMContentLoaded', async () => {
    // تهيئة تيليجرام
    initTelegram();
    applyTelegramTheme();

    // الحصول على بيانات المستخدم الحقيقية من تيليجرام
    if (window.Telegram?.WebApp?.initData) {
        const initData = window.Telegram.WebApp.initData;
        userData = await authenticateUser(initData);
    } else {
        // في حالة عدم وجود Telegram WebApp (تصفح عادي)
        userData = {
            telegram_id: 8673286954,
            username: 'Admin',
            first_name: 'مستخدم',
            balance: 0,
            kyc_status: 'unverified',
            is_verified: false,
            role: 'user',
        };
    }

    // تحديث واجهة المستخدم
    updateUserUI();

    // تحميل البيانات
    await loadInitialData();

    // ربط الأحداث
    setupNavigation();
    setupFilters();
    setupSearch();

    // زر الوضع الليلي (موجود في صفحة الحساب)
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
});

async function loadInitialData() {
    try {
        categoriesData = await fetchCategories();
        productsData = await fetchProducts();
        paymentMethodsData = await fetchPaymentMethods();

        if (userData && userData.telegram_id) {
            ordersData = await fetchUserOrders(userData.telegram_id);
            const kycInfo = await getMyKYC(userData.telegram_id);
            kycStatus = kycInfo.status || 'none';
        }

        renderCategories();
        renderPaymentMethods();
        renderOrders(ordersData);
        renderDeposits([]);
        renderSettings();
        updateKYCUI();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function updateUserUI() {
    if (!userData) return;

    // تحديث الرصيد في الترويسة
    const balanceEl = document.getElementById('headerBalance');
    if (balanceEl) balanceEl.textContent = `${userData.balance.toFixed(2)}$`;

    // تحديث الرصيد في شاشة الشحن
    const chargeBalanceEl = document.getElementById('chargeBalance');
    if (chargeBalanceEl) chargeBalanceEl.textContent = `${userData.balance.toFixed(2)}$`;

    // تحديث صفحة الحساب
    const accountBalanceEl = document.getElementById('accountBalance');
    if (accountBalanceEl) accountBalanceEl.textContent = `${userData.balance.toFixed(2)}$`;

    const accountNameEl = document.querySelector('.account-name');
    if (accountNameEl) accountNameEl.textContent = userData.username || userData.first_name || 'مستخدم';

    const accountEmailEl = document.querySelector('.account-email');
    if (accountEmailEl) accountEmailEl.textContent = userData.username ? `${userData.username}@` : '';

    const accountIdEl = document.querySelector('.account-id');
    if (accountIdEl) accountIdEl.textContent = `ID: ${userData.telegram_id}`;

    // تحديث صورة الملف الشخصي (من تيليجرام إذا توفرت)
    const avatarImg = document.querySelector('.avatar-small');
    if (avatarImg && window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url) {
        avatarImg.style.backgroundImage = `url(${window.Telegram.WebApp.initDataUnsafe.user.photo_url})`;
        avatarImg.style.backgroundSize = 'cover';
        avatarImg.style.backgroundPosition = 'center';
        avatarImg.textContent = '';
    } else if (avatarImg) {
        avatarImg.textContent = (userData.first_name || 'م')[0];
    }

    // تحديث حالة التوثيق
    const kycBadge = document.querySelector('.account-status .status-badge');
    if (kycBadge) {
        if (userData.is_verified || kycStatus === 'verified') {
            kycBadge.className = 'status-badge verified';
            kycBadge.innerHTML = 'موثق <span class="material-icons">verified</span>';
        } else if (kycStatus === 'pending') {
            kycBadge.className = 'status-badge pending';
            kycBadge.textContent = 'قيد المراجعة';
        } else {
            kycBadge.className = 'status-badge unverified';
            kycBadge.textContent = 'غير موثق';
        }
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

function renderPaymentMethods() {
    const container = document.getElementById('paymentMethodsList');
    if (!container) return;
    container.innerHTML = paymentMethodsData.map(m => `
        <div class="payment-method" data-id="${m.id}">
            <div class="payment-method-info">
                <span class="payment-method-icon">${m.icon || '💳'}</span>
                <div>
                    <div class="payment-method-name">${m.name}</div>
                    <div class="payment-method-desc">${m.description || ''}</div>
                </div>
            </div>
            <span class="material-icons">chevron_left</span>
        </div>
    `).join('');

    container.querySelectorAll('.payment-method').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.getAttribute('data-id');
            const method = paymentMethodsData.find(m => m.id == id);
            if (method) showDepositForm(method);
        });
    });
}

function renderOrders(orders) {
    const list = document.getElementById('ordersList');
    if (!list) return;
    if (!orders || orders.length === 0) {
        list.innerHTML = '<div class="empty-state">لا توجد طلبات بعد</div>';
        return;
    }

    list.innerHTML = orders.map(order => `
        <div class="order-card" data-status="${order.status}">
            <div class="order-header">
                <span class="order-number">${order.order_number}</span>
                <span class="status-badge ${order.status}">${order.status === 'completed' ? 'مكتمل' : order.status === 'failed' ? 'فشل' : 'قيد المعالجة'}</span>
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

function renderDeposits(deposits) {
    const list = document.getElementById('depositsList');
    if (!list) return;
    if (!deposits || deposits.length === 0) {
        list.innerHTML = '<div class="empty-state">تعذر تحميل الإيداعات</div>';
        return;
    }
    // يمكن عرض الإيداعات لاحقًا
    list.innerHTML = deposits.map(d => `<div class="order-card">إيداع ${d.amount}$</div>`).join('');
}

function renderSettings() {
    const settingsList = document.getElementById('settingsList');
    if (!settingsList) return;

    const settings = [
        {
            title: 'توثيق الحساب (KYC)',
            desc: kycStatus === 'verified' ? 'حسابك موثق' : kycStatus === 'pending' ? 'طلبك قيد المراجعة' : 'وثق حسابك لاستخدام كل طرق الدفع',
            icon: 'verified_user',
            hasToggle: false,
            action: () => navigateTo('page-kyc'),
        },
        {
            title: 'مفاتيح API',
            desc: 'غير متاح - راجع الإدارة',
            icon: 'api',
            hasToggle: false,
            action: () => openModal('مفاتيح API', '<p>غير متاح حالياً</p>'),
        },
        {
            title: 'الوضع الليلي',
            desc: 'التبديل بين النهاري والليلي',
            icon: 'dark_mode',
            hasToggle: true,
            toggleId: 'darkModeToggle',
        },
        {
            title: 'الدعم الفني',
            desc: 'تواصل معنا على مدار الساعة',
            icon: 'headset_mic',
            hasToggle: false,
            action: () => openModal('الدعم الفني', '<p>تواصل معنا عبر البوت</p>'),
        },
        {
            title: 'الأجهزة المرتبطة',
            desc: 'الغ أي جهاز لا تعرفه',
            icon: 'devices',
            hasToggle: false,
            action: () => openModal('الأجهزة المرتبطة', '<p>لا توجد أجهزة أخرى</p>'),
        },
    ];

    settingsList.innerHTML = settings.map(s => `
        <div class="setting-item" data-action="${s.title}">
            <span class="setting-icon material-icons">${s.icon}</span>
            <div class="setting-info">
                <div class="setting-title">${s.title}</div>
                <div class="setting-desc">${s.desc}</div>
            </div>
            ${s.hasToggle ? `
                <label class="toggle-switch">
                    <input type="checkbox" id="${s.toggleId}" ${document.documentElement.getAttribute('data-theme') === 'dark' ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            ` : '<span class="setting-arrow material-icons">chevron_left</span>'}
        </div>
    `).join('');

    settingsList.querySelectorAll('.setting-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.toggle-switch')) return;
            const title = item.getAttribute('data-action');
            const setting = settings.find(s => s.title === title);
            if (setting && setting.action) setting.action();
        });
    });

    const darkToggle = document.getElementById('darkModeToggle');
    if (darkToggle) {
        darkToggle.addEventListener('change', (e) => {
            const newTheme = e.target.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
}

function updateKYCUI() {
    const kycContainer = document.getElementById('page-kyc');
    if (!kycContainer) return;

    if (kycStatus === 'verified') {
        kycContainer.innerHTML = `
            <div class="kyc-container">
                <h2>توثيق الحساب (KYC)</h2>
                <div class="kyc-icon"><span class="material-icons">verified</span></div>
                <p class="kyc-message">حسابك موثق بالفعل</p>
            </div>
        `;
    } else if (kycStatus === 'pending') {
        kycContainer.innerHTML = `
            <div class="kyc-container">
                <h2>توثيق الحساب (KYC)</h2>
                <div class="kyc-icon" style="background-color:#FFC107;"><span class="material-icons">schedule</span></div>
                <p class="kyc-message">طلب التوثيق قيد التدقيق يرجى انتظار رد الإدارة</p>
            </div>
        `;
    } else {
        kycContainer.innerHTML = `
            <div class="kyc-container">
                <h2>توثيق الحساب (KYC)</h2>
                <div class="kyc-form">
                    <div class="form-group">
                        <label>الاسم الكامل</label>
                        <input type="text" id="kycFullName" placeholder="أدخل اسمك الكامل">
                    </div>
                    <div class="form-group">
                        <label>رقم الجوال</label>
                        <input type="tel" id="kycPhone" placeholder="أدخل رقم الجوال">
                    </div>
                    <div class="form-group">
                        <label>صورة الهوية الأمامية</label>
                        <input type="file" id="kycFrontImage" accept="image/*" onchange="previewImage(this, 'kycFrontPreview')">
                        <div id="kycFrontPreview" class="image-preview" style="margin-top:8px;">لا صورة</div>
                    </div>
                    <div class="form-group">
                        <label>صورة الهوية الخلفية</label>
                        <input type="file" id="kycBackImage" accept="image/*" onchange="previewImage(this, 'kycBackPreview')">
                        <div id="kycBackPreview" class="image-preview" style="margin-top:8px;">لا صورة</div>
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
    const frontImage = document.getElementById('kycFrontImage')?.files[0];
    const backImage = document.getElementById('kycBackImage')?.files[0];

    if (!fullName || !phone || !frontImage || !backImage) {
        alert('يرجى تعبئة جميع الحقول ورفع الصور');
        return;
    }

    // تحويل الصور إلى Base64 (اختياري، يمكن استخدام ImgBB لاحقًا)
    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    try {
        const frontBase64 = await toBase64(frontImage);
        const backBase64 = await toBase64(backImage);

        const result = await submitKYC({
            telegram_id: userData.telegram_id,
            full_name: fullName,
            phone: phone,
            id_front_image: frontBase64,
            id_back_image: backBase64,
        });

        if (result.message) {
            alert(result.message);
            kycStatus = 'pending';
            updateKYCUI();
            navigateTo('page-account');
            updateUserUI();
        } else {
            alert(result.error || 'حدث خطأ');
        }
    } catch (error) {
        console.error('KYC submit error:', error);
        alert('فشل إرسال الطلب');
    }
}

function showCategoryProducts(categoryId) {
    const category = categoriesData.find(c => c.id === categoryId);
    if (!category) return;

    const page = document.getElementById('page-products');
    if (page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        page.classList.add('active');
        currentPage = 'page-products';
        page.querySelector('h2').textContent = category.name;

        const filtered = productsData.filter(p => p.category_id === categoryId);
        renderProductsList(filtered);
    }
}

function renderProductsList(products) {
    const list = document.getElementById('productsList');
    if (!list) return;
    if (!products || products.length === 0) {
        list.innerHTML = '<div class="empty-state">لا توجد منتجات في هذا القسم</div>';
        return;
    }

    list.innerHTML = products.map(prod => `
        <div class="product-card" data-id="${prod.id}" onclick="openPurchaseModal(${prod.id})">
            <div class="product-image" style="background-image: url('${prod.image || ''}'); background-color: #f0f0f0;">
                ${prod.image ? '' : '📦'}
            </div>
            <div class="product-name">${prod.name}</div>
            <div class="product-price">${prod.base_price}$</div>
        </div>
    `).join('');
}

function openPurchaseModal(productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;

    let modalContent = `
        <div style="text-align:center;">
            <div style="width:100%;height:150px;background-color:#f0f0f0;border-radius:12px;margin-bottom:16px;display:flex;align-items:center;justify-content:center;font-size:3rem;">
                ${product.image ? `<img src="${product.image}" style="max-height:100%;max-width:100%;border-radius:12px;" />` : '📦'}
            </div>
            <h3 style="margin-bottom:8px;">${product.name}</h3>
            <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:16px;">عادة ما تتم المراجعة خلال 15-5 دقيقة</p>
    `;

    if (product.product_type === 'bundle') {
        modalContent += `<div style="text-align:right;margin-bottom:12px;"><label>اختر الباقة</label><select id="purchaseBundleId" style="margin-top:4px;">`;
        product.bundles.forEach(b => {
            modalContent += `<option value="${b.id}">${b.name} - ${b.quantity} ${product.unit_name} - ${b.price_usd}$</option>`;
        });
        modalContent += `</select></div>`;
    } else {
        modalContent += `<div style="text-align:right;margin-bottom:12px;"><label>الكمية</label><input type="number" id="purchaseQuantity" value="1" min="1" style="margin-top:4px;"></div>`;
    }

    if (product.input_type === 'id') {
        modalContent += `<div style="text-align:right;margin-bottom:12px;"><label>معرف اللاعب (ID)</label><input type="text" id="purchasePlayerId" placeholder="أدخل المعرف" style="margin-top:4px;"></div>`;
    } else if (product.input_type === 'phone') {
        modalContent += `<div style="text-align:right;margin-bottom:12px;"><label>رقم الهاتف</label><input type="tel" id="purchasePhone" placeholder="أدخل رقم الهاتف" style="margin-top:4px;"></div>`;
    }

    modalContent += `
            <div style="font-weight:bold;font-size:1.2rem;margin-top:8px;" id="purchaseTotal">الإجمالي: 0.00$</div>
            <div style="display:flex;gap:8px;margin-top:16px;">
                <button class="btn-primary" style="flex:1;" onclick="confirmPurchase(${product.id})">شراء</button>
                <button class="btn-outline" style="flex:1;" onclick="closeModal()">إلغاء</button>
            </div>
        </div>
    `;
    openModal('شراء منتج', modalContent);

    // حساب الإجمالي
    const updateTotal = () => {
        let total = 0;
        if (product.product_type === 'bundle') {
            const bundleId = document.getElementById('purchaseBundleId')?.value;
            const bundle = product.bundles.find(b => b.id == bundleId);
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
    if (!product) return;

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
        if (result.error) {
            alert(result.error);
        } else {
            alert(result.message || 'طلبك قيد المعالجة');
            closeModal();
            // تحديث الطلبات
            ordersData = await fetchUserOrders(userData.telegram_id);
            renderOrders(ordersData);
            // تحديث الرصيد
            userData = await authenticateUser(window.Telegram?.WebApp?.initData || '');
            updateUserUI();
        }
    } catch (error) {
        console.error('Order error:', error);
        alert('فشل إرسال الطلب');
    }
}

function showDepositForm(method) {
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
            <input type="file" id="depositProofImage" accept="image/*" onchange="previewImage(this, 'depositProofPreview')">
            <div id="depositProofPreview" class="image-preview" style="margin-top:8px;">لا صورة</div>
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
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
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
        if (result.error) {
            alert(result.error);
        } else {
            alert(result.message || 'تم إرسال طلب الإيداع');
            closeModal();
        }
    } catch (error) {
        console.error('Deposit error:', error);
        alert('فشل إرسال الإيداع');
    }
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

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-page') === pageId);
    });
    currentPage = pageId;

    if (pageId === 'page-home') {
        renderCategories();
    } else if (pageId === 'page-orders') {
        renderOrders(ordersData);
    } else if (pageId === 'page-charge') {
        renderPaymentMethods();
    } else if (pageId === 'page-deposits') {
        // يمكن تحميل الإيداعات
    } else if (pageId === 'page-account') {
        updateUserUI();
        renderSettings();
    } else if (pageId === 'page-kyc') {
        updateKYCUI();
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const pageId = item.getAttribute('data-page');
            navigateTo(pageId);
        });
    });
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
}

function setupSearch() {
    // بحث بسيط في المنتجات
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase();
            const filtered = productsData.filter(p => p.name.toLowerCase().includes(query));
            if (currentPage === 'page-home') {
                renderCategories();
            } else if (currentPage === 'page-products') {
                renderProductsList(filtered);
            }
        });
    }
}

function handleBack() {
    if (currentPage === 'page-products' || currentPage === 'page-kyc') {
        navigateTo('page-home');
    } else {
        if (window.history.length > 1) window.history.back();
        else navigateTo('page-home');
    }
}

function handleClose() {
    if (window.Telegram?.WebApp?.close) window.Telegram.WebApp.close();
    else window.close();
}

function openModal(title, bodyHTML) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = bodyHTML;
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

function showNotifications() {
    if (userData) {
        fetchNotifications(userData.telegram_id).then(notifications => {
            const bodyHTML = `
                <div style="text-align:center;">
                    <h3 style="margin-bottom:16px;">الإشعارات</h3>
                    ${notifications.length ? notifications.map(n => `
                        <div style="text-align:right;margin-bottom:12px;background:var(--surface);border-radius:12px;padding:12px;border:1px solid var(--border);">
                            <div style="font-weight:bold;">${n.title}</div>
                            <div style="color:var(--text-secondary);font-size:0.8rem;">${n.message}</div>
                            <div style="color:var(--text-secondary);font-size:0.7rem;">${n.created_at ? new Date(n.created_at).toLocaleString('ar') : ''}</div>
                        </div>
                    `).join('') : '<p>لا توجد إشعارات</p>'}
                    <button class="btn-outline" style="width:100%;" onclick="closeModal()">تعليم الكل كمقروء</button>
                </div>
            `;
            openModal('الإشعارات', bodyHTML);
        });
    }
}