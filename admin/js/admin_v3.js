const API_URL = 'https://sanad-plus-backend.onrender.com';
const getToken = () => localStorage.getItem('admin_token') || localStorage.getItem('token');
let currentSessionId = null;
let dashboardChartInstance = null;
let currentInboxTab = 'deposits';
let cachedArchiveData = []; 
let cachedProducts = []; 

// ================= Login & OTP =================
async function handleLogin() { /* ... نفس الكود السابق ... */ }
async function verifyOTP() { /* ... نفس الكود السابق ... */ }

// ================= Helpers =================
function previewImage(input, previewId) { /* ... */ }
async function apiCall(endpoint, method = 'GET', body = null) { /* ... */ }
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ================= Dashboard =================
async function loadDashboardStats() { /* ... */ }
function initChart() { /* ... */ }

// ================= Badges =================
async function loadBadges() {
    const data = await apiCall('/admin/api/inbox/counts');
    if (data) {
        const total = data.deposits + data.orders + data.kyc + data.services;
        const sidebarBadge = document.getElementById('sidebarInboxBadge');
        if (total > 0) { sidebarBadge.innerText = total; sidebarBadge.classList.remove('hidden'); }
        else { sidebarBadge.classList.add('hidden'); }

        const updateTabBadge = (id, count) => {
            const el = document.getElementById(id);
            if (count > 0) { el.innerText = count; el.classList.remove('hidden'); }
            else { el.classList.add('hidden'); }
        };
        updateTabBadge('tabBadgeDeposits', data.deposits);
        updateTabBadge('tabBadgeOrders', data.orders);
        updateTabBadge('tabBadgeKyc', data.kyc);
        updateTabBadge('tabBadgeServices', data.services);
    }
}

// ================= Inbox =================
function switchInboxTab(tab, btn) {
    currentInboxTab = tab;
    document.querySelectorAll('#inboxTabs .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadInbox();
}

async function loadInbox() {
    const container = document.getElementById('inboxContainer');
    if(!container) return;
    container.innerHTML = '<div class="col-span-full text-center text-slate-400 animate-pulse py-4">جاري التحميل...</div>';
    
    let endpoint = '/admin/api/deposits';
    if(currentInboxTab === 'orders') endpoint = '/admin/api/orders';
    if(currentInboxTab === 'kyc') endpoint = '/admin/api/kyc';
    if(currentInboxTab === 'services') endpoint = '/admin/api/services';

    const data = await apiCall(endpoint);
    const items = Array.isArray(data) ? data : [];

    if(items.length === 0) {
        container.innerHTML = '<div class="glass col-span-full p-10 rounded-3xl text-center text-slate-400">لا توجد عناصر في هذا القسم حالياً</div>';
        return;
    }

    container.innerHTML = items.map(item => {
        // بناء البطاقات
        if(currentInboxTab === 'deposits') {
            return `<div onclick="openInboxAction('deposits', ${item.id}, ${item.amount}, '${item.user?.first_name || 'مستخدم'}')" class="glass bento-card rounded-3xl p-5 border-t-4 border-t-accent cursor-pointer hover:bg-slate-800/80 transition"><div class="flex justify-between mb-3"><span class="text-white font-bold">إيداع $${item.amount}</span><span class="text-xs bg-slate-800 px-2 py-1 rounded-lg">${item.user?.first_name || 'مستخدم'}</span></div><div class="flex gap-2"><button class="flex-1 bg-primary py-2 rounded-xl text-sm font-bold text-white">مراجعة</button></div></div>`;
        }
        if(currentInboxTab === 'orders') {
            return `<div onclick="openInboxAction('orders', ${item.id}, ${item.total_price}, '${item.order_number}')" class="glass bento-card rounded-3xl p-5 border-t-4 border-t-primary cursor-pointer hover:bg-slate-800/80 transition"><div class="flex justify-between mb-3"><span class="text-white font-bold">طلب ${item.order_number}</span><span class="text-xs bg-slate-800 px-2 py-1 rounded-lg">$${item.total_price}</span></div><p class="text-sm text-slate-400">${item.product_name}</p></div>`;
        }
        if(currentInboxTab === 'kyc') {
            return `<div onclick="openInboxAction('kyc', ${item.id})" class="glass bento-card rounded-3xl p-5 border-t-4 border-t-warning cursor-pointer hover:bg-slate-800/80 transition"><div class="flex justify-between mb-3"><span class="text-white font-bold">توثيق</span><span class="text-xs bg-slate-800 px-2 py-1 rounded-lg">${item.user_name}</span></div><p class="text-sm text-slate-400">الاسم: ${item.full_name}</p></div>`;
        }
    }).join('');
    lucide.createIcons();
}

function openInboxAction(type, id, amount = 0, title = '') {
    document.getElementById('inboxActionType').value = type;
    document.getElementById('inboxActionId').value = id;
    document.getElementById('inboxActionNote').value = '';

    let detailsHtml = '';
    if(type === 'deposits') {
        document.getElementById('inboxActionTitle').innerText = 'مراجعة الإيداع';
        detailsHtml = `<p><strong>المبلغ:</strong> $${amount}</p><p><strong>المستخدم:</strong> ${title}</p>`;
    } else if(type === 'orders') {
        document.getElementById('inboxActionTitle').innerText = 'مراجعة الطلب';
        detailsHtml = `<p><strong>رقم الطلب:</strong> ${title}</p><p><strong>السعر:</strong> $${amount}</p>`;
    } else {
        document.getElementById('inboxActionTitle').innerText = 'طلب توثيق';
    }
    document.getElementById('inboxActionDetails').innerHTML = detailsHtml;
    openModal('inboxActionModal');
}

async function submitInboxAction(action) {
    const type = document.getElementById('inboxActionType').value;
    const id = document.getElementById('inboxActionId').value;
    const note = document.getElementById('inboxActionNote').value;

    Swal.fire({ title: 'جاري التنفيذ...', allowOutsideClick: false, background: '#1e293b', color: '#fff', didOpen: () => Swal.showLoading() });
    
    let endpoint = `/admin/api/${type}/${id}/${action}`;
    const res = await apiCall(endpoint, 'POST', { note: note });

    if (res && res.success) {
        closeModal('inboxActionModal');
        Swal.fire({icon: 'success', title: 'تم بنجاح', timer: 1000, showConfirmButton: false, background: '#1e293b', color: '#fff'});
        loadInbox();
        loadBadges();
    } else {
        Swal.fire({icon: 'error', title: 'خطأ', text: 'فشل في العملية', background: '#1e293b', color: '#fff'});
    }
}

// ================= Archive =================
async function loadArchive() { /* ... */ }
function renderArchive(data) { /* ... */ }
function filterArchive() { /* ... */ }
function exportArchive() { /* ... */ }

// ================= Payments =================
async function loadPayments() {
    const data = await apiCall('/admin/api/payments');
    const container = document.getElementById('paymentsContainer');
    if(!container) return;
    const items = Array.isArray(data) ? data : [];
    
    if(items.length === 0) { container.innerHTML = '<div class="glass p-10 rounded-3xl text-center text-slate-400">لا توجد طرق دفع مضافة</div>'; return; }

    container.innerHTML = items.map(p => `
        <div class="glass bento-card rounded-3xl p-6 border-r-4 border-r-primary relative">
            <button onclick="deletePayment(${p.id})" class="absolute top-4 left-4 text-red-500 hover:text-red-400"><i data-lucide="trash-2" size="18"></i></button>
            <h3 class="font-bold text-lg mb-2 text-white">${p.name}</h3>
            <p class="text-sm text-slate-400">الحد الأدنى: $${p.min}</p>
            <p class="text-sm text-slate-400">الحد الأقصى: $${p.max}</p>
            <p class="text-sm text-accent mt-2 font-mono">${p.account}</p>
        </div>
    `).join('');
    lucide.createIcons();
}

async function savePayment() { /* ... */ }
async function deletePayment(id) { /* ... */ }

// ================= Products (Add & Edit) =================
function openAddProductModal() {
    document.getElementById('prodModalTitle').innerText = 'إضافة منتج جديد';
    document.getElementById('editProdId').value = '';
    document.getElementById('prodName').value = '';
    document.getElementById('prodImageFile').value = '';
    document.getElementById('prodImagePreview').classList.add('hidden');
    openModal('addProductModal');
}

function openEditProduct(id) {
    const prod = cachedProducts.find(p => p.id === id);
    if(!prod) return;
    
    document.getElementById('prodModalTitle').innerText = 'تعديل المنتج';
    document.getElementById('editProdId').value = id;
    document.getElementById('prodName').value = prod.name;
    document.getElementById('prodCategory').value = prod.category_id;
    
    // إعداد التسعير
    if(prod.product_type === 'quantity') {
        document.getElementById('prodPricingType').value = 'dynamic';
        togglePricingFields();
        document.getElementById('prodBaseQty').value = prod.base_quantity || 1; // قيمة افتراضية
        document.getElementById('prodBasePrice').value = prod.price;
    } else {
        document.getElementById('prodPricingType').value = 'fixed';
        togglePricingFields();
        document.getElementById('prodFixedPrice').value = prod.price;
    }

    // إخفاء معاينة الصورة القديمة، لأن المستخدم يجب أن يرفع صورة جديدة لتغييرها
    document.getElementById('prodImageFile').value = '';
    document.getElementById('prodImagePreview').src = prod.image || '';
    document.getElementById('prodImagePreview').classList.remove('hidden');

    openModal('addProductModal');
}

async function saveProduct() {
    const editId = document.getElementById('editProdId').value;
    const name = document.getElementById('prodName').value;
    const imageFile = document.getElementById('prodImageFile').files[0];
    
    if (!name) return Swal.fire({icon: 'warning', title: 'تنبيه', text: 'أدخل اسم المنتج', background: '#1e293b', color: '#fff'});
    
    Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false, background: '#1e293b', color: '#fff', didOpen: () => Swal.showLoading() });
    
    let imageBase64 = null;
    if (imageFile) { imageBase64 = await new Promise((resolve) => { const reader = new FileReader(); reader.onload = (e) => resolve(e.target.result); reader.readAsDataURL(imageFile); }); }
    
    const data = { name: name, category_id: document.getElementById('prodCategory').value, input_type: 'id', pricing_type: document.getElementById('prodPricingType').value, image: imageBase64 };
    if (data.pricing_type === 'fixed') { data.price = parseFloat(document.getElementById('prodFixedPrice').value) || 0; } 
    else { data.base_qty = parseFloat(document.getElementById('prodBaseQty').value) || 0; data.price = parseFloat(document.getElementById('prodBasePrice').value) || 0; }

    let res;
    if(editId) {
        res = await apiCall(`/admin/api/products/${editId}`, 'PUT', data);
    } else {
        res = await apiCall('/admin/api/products', 'POST', data);
    }

    if (res && res.success) { 
        Swal.fire({icon: 'success', title: 'تم الحفظ', timer: 1500, showConfirmButton: false, background: '#1e293b', color: '#fff'}); 
        closeModal('addProductModal'); loadProducts(); 
    }
}

async function loadProducts() {
    const data = await apiCall('/admin/api/products');
    cachedProducts = Array.isArray(data) ? data : [];
    document.getElementById('productsTableBody').innerHTML = cachedProducts.map(p => `
        <tr class="border-b border-slate-700/50 hover:bg-slate-800/30">
            <td class="font-bold text-white flex items-center gap-2">
                <img src="${p.image || 'https://via.placeholder.com/24'}" class="w-6 h-6 rounded-md object-cover">
                ${p.name}
            </td>
            <td class="text-primary">${p.product_type === 'quantity' ? 'ديناميكي' : `$${p.price}`}</td>
            <td>${p.category_id}</td>
            <td>${p.product_type === 'quantity' ? 'كمية' : 'ثابت'}</td>
            <td>
                <button onclick="openEditProduct(${p.id})" class="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg mr-2 hover:bg-blue-500/40 transition"><i data-lucide="edit-2" size="14" class="inline"></i> تعديل</button>
                <button onclick="deleteProduct(${p.id})" class="bg-red-500/20 text-red-400 px-3 py-1 rounded-lg hover:bg-red-500/40 transition"><i data-lucide="trash-2" size="14" class="inline"></i> حذف</button>
            </td>
        </tr>`).join('');
    lucide.createIcons();
}

async function deleteProduct(id) {
    const result = await Swal.fire({ title: 'تأكيد الحذف', text: 'هل أنت متأكد؟', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'نعم', cancelButtonText: 'إلغاء', background: '#1e293b', color: '#fff' });
    if (result.isConfirmed) { await apiCall(`/admin/api/products/${id}`, 'DELETE'); loadProducts(); }
}

// ================= Users =================
async function loadUsers() {
    const data = await apiCall('/admin/api/users');
    const users = Array.isArray(data) ? data : [];
    
    document.getElementById('usersTableBody').innerHTML = users.map(user => `
        <tr class="hover:bg-slate-800/30 transition">
            <td><div class="font-bold text-white">${user.first_name}</div><div class="text-xs text-slate-400 font-mono">${user.telegram_id}</div></td>
            <td class="font-bold text-primary">$${user.balance.toFixed(2)}</td>
            <td>
                <span class="px-2 py-1 rounded-full text-xs ${user.kyc_status === 'verified' ? 'bg-primary/20 text-primary' : 'bg-amber-500/20 text-amber-400'}">${user.kyc_status}</span>
                ${user.is_banned ? '<span class="px-2 py-1 rounded-full text-xs bg-danger/20 text-danger ml-1">محظور</span>' : ''}
            </td>
            <td>${user.vip_level > 0 ? `<span class="text-accent">VIP ${user.vip_level}</span>` : '-'}</td>
            <td class="flex gap-2">
                <button onclick="openUserDetails(${user.id})" class="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded-lg text-sm" title="عرض الملف"><i data-lucide="eye" size="16"></i></button>
                <button onclick="openEditUser(${user.id}, ${user.balance}, ${user.is_banned}, ${user.discount})" class="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded-lg text-sm" title="تعديل"><i data-lucide="edit" size="16"></i></button>
            </td>
        </tr>`).join('');
    lucide.createIcons();
}

async function openUserDetails(id) {
    Swal.fire({ title: 'جاري التحميل...', allowOutsideClick: false, background: '#1e293b', color: '#fff', didOpen: () => Swal.showLoading() });
    const data = await apiCall(`/admin/api/users/${id}/stats`);
    if(!data) return;
    
    document.getElementById('userDetailsBody').innerHTML = `
        <div class="flex justify-between border-b border-slate-700 pb-2"><span class="text-slate-400">Telegram ID:</span> <span class="font-mono text-white">${data.telegram_id}</span></div>
        <div class="flex justify-between border-b border-slate-700 pb-2"><span class="text-slate-400">Sanad ID:</span> <span class="font-mono text-white">${data.sanad_id}</span></div>
        <div class="flex justify-between border-b border-slate-700 pb-2"><span class="text-slate-400">اسم KYC:</span> <span class="text-white">${data.kyc_name || 'غير موثق'}</span></div>
        <div class="flex justify-between border-b border-slate-700 pb-2"><span class="text-slate-400">حالة KYC:</span> <span class="${data.kyc_status === 'verified' ? 'text-primary' : 'text-warning'}">${data.kyc_status}</span></div>
        <div class="flex justify-between border-b border-slate-700 pb-2"><span class="text-slate-400">عدد الطلبات:</span> <span class="text-white">${data.total_orders}</span></div>
        <div class="flex justify-between border-b border-slate-700 pb-2"><span class="text-slate-400">عدد الإيداعات:</span> <span class="text-white">${data.total_deposits}</span></div>
        <div class="flex justify-between border-b border-slate-700 pb-2"><span class="text-slate-400">إجمالي الصرف:</span> <span class="text-primary font-bold">$${data.total_spent.toFixed(2)}</span></div>
        <div class="flex justify-between border-b border-slate-700 pb-2"><span class="text-slate-400">الخصم:</span> <span class="text-accent">${data.discount}%</span></div>
        <div class="flex justify-between pb-2"><span class="text-slate-400">الحالة:</span> <span class="${data.is_banned ? 'text-danger font-bold' : 'text-primary'}">${data.is_banned ? 'محظور' : 'نشط'}</span></div>
    `;
    Swal.close();
    openModal('userDetailsModal');
}

function openEditUser(id, balance, banned, discount) {
    document.getElementById('editUserId').value = id;
    document.getElementById('editUserBalance').value = balance;
    document.getElementById('editUserDiscount').value = discount;
    document.getElementById('editUserBanned').checked = banned;
    openModal('editUserModal');
}

async function saveUserEdit() {
    const id = document.getElementById('editUserId').value;
    const balance = parseFloat(document.getElementById('editUserBalance').value) || 0;
    const discount = parseFloat(document.getElementById('editUserDiscount').value) || 0;
    const banned = document.getElementById('editUserBanned').checked;

    Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false, background: '#1e293b', color: '#fff', didOpen: () => Swal.showLoading() });
    const res = await apiCall(`/admin/api/users/${id}/edit`, 'POST', { balance, discount, is_banned: banned });
    
    if(res && res.success) {
        closeModal('editUserModal');
        Swal.fire({icon: 'success', title: 'تم التعديل', timer: 1000, showConfirmButton: false, background: '#1e293b', color: '#fff'});
        loadUsers();
    }
}

// ================= Notifications =================
// ... (نفس كود الإشعارات السابق) ...
document.getElementById('notifTarget')?.addEventListener('change', (e) => {
    const div = document.getElementById('specificUserDiv');
    if(e.target.value === 'specific') div.classList.remove('hidden');
    else div.classList.add('hidden');
});

function previewNotification() {
    const msg = document.getElementById('notifMessage').value;
    if(!msg) return Swal.fire({icon: 'warning', title: 'اكتب رسالة أولاً', background: '#1e293b', color: '#fff'});
    Swal.fire({ title: 'معاينة الإشعار', html: `<div style="background-color: #182533; color: white; padding: 15px; border-radius: 10px; text-align: right; font-family: sans-serif; border-left: 4px solid #38bdf8;">${msg}</div>`, background: '#1e293b', confirmButtonColor: '#38bdf8' });
}

async function sendNotification() { /* ... نفس الكود ... */ }

// ================= Settings =================
async function loadSettings() {
    const data = await apiCall('/admin/api/settings');
    if(data) {
        document.getElementById('setStoreName').value = data.store_name || 'SANAD PLUS+';
        document.getElementById('setSupportLink').value = data.support_link || '';
        document.getElementById('setExchangeRate').value = data.exchange_rate || 135;
        document.getElementById('setMaintenance').checked = data.maintenance_mode === '1';
    }
}

async function saveSettings() {
    const data = {
        store_name: document.getElementById('setStoreName').value,
        support_link: document.getElementById('setSupportLink').value,
        exchange_rate: document.getElementById('setExchangeRate').value,
        maintenance_mode: document.getElementById('setMaintenance').checked ? '1' : '0'
    };
    const res = await apiCall('/admin/api/settings', 'POST', data);
    if(res && res.success) { Swal.fire({icon: 'success', title: 'تم الحفظ', timer: 1000, showConfirmButton: false, background: '#1e293b', color: '#fff'}); }
}

// ================= Navigation =================
function switchSection(sectionId, btnElement) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    const target = document.getElementById('section-' + sectionId);
    if (target) { target.classList.remove('hidden'); target.classList.add('block'); }
    
    const titles = { 'dashboard': 'لوحة التحكم', 'inbox': 'الإرساليات', 'users': 'إدارة المستخدمين', 'products': 'المنتجات', 'categories': 'الأقسام', 'audit': 'التدقيق المالي', 'payments': 'طرق الدفع', 'notifications': 'الإشعارات', 'settings': 'الإعدادات', 'archive': 'الأرشيف' };
    document.getElementById('page-title').innerText = titles[sectionId] || 'لوحة التحكم';
    
    if (btnElement) {
        document.querySelectorAll('.nav-btn').forEach(btn => { btn.classList.remove('bg-slate-700/50', 'text-white'); btn.classList.add('text-slate-400'); });
        btnElement.classList.remove('text-slate-400'); btnElement.classList.add('bg-slate-700/50', 'text-white');
    }

    if (sectionId === 'dashboard') loadDashboardStats();
    if (sectionId === 'inbox') loadInbox();
    if (sectionId === 'users') loadUsers();
    if (sectionId === 'products') loadProducts();
    if (sectionId === 'categories') loadCategories();
    if (sectionId === 'audit') loadAudit();
    if (sectionId === 'archive') loadArchive();
    if (sectionId === 'payments') loadPayments();
    if (sectionId === 'settings') loadSettings();
}

function handleLogout() { localStorage.removeItem('admin_token'); localStorage.removeItem('token'); location.reload(); }
window.onload = () => { 
    if (!getToken()) { document.getElementById('loginScreen').style.display = 'flex'; } 
    else { 
        document.getElementById('loginScreen').style.display = 'none'; 
        switchSection('dashboard', document.querySelector('.nav-btn')); 
        loadBadges(); 
        setInterval(loadBadges, 30000); 
    } 
};

// Stubs for missing functions to prevent crashes
async function loadCategories() { /* ... */ }
async function saveCategory() { /* ... */ }
async function deleteCategory(id) { /* ... */ }
async function loadAudit() { /* ... */ }
async function loadArchive() { /* ... */ }
function filterArchive() { /* ... */ }
function exportArchive() { /* ... */ }
function togglePricingFields() { /* ... */ }
function calculateDynamicPrice() { /* ... */ }
