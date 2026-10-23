const API_URL = 'https://sanad-plus-backend.onrender.com';
const getToken = () => localStorage.getItem('admin_token') || localStorage.getItem('token');
let currentSessionId = null;
let dashboardChartInstance = null;
let currentInboxTab = 'deposits';
let cachedArchiveData = []; 
let cachedProducts = []; 

// ================= Login & OTP =================
async function handleLogin() {
    const user = document.getElementById('loginUser').value;
    const pass = document.getElementById('loginPass').value;
    if(!user || !pass) return Swal.fire({icon: 'warning', title: 'تنبيه', text: 'أدخل البيانات أولاً', background: '#1e293b', color: '#fff'});
    Swal.fire({ title: 'جاري التحقق...', allowOutsideClick: false, background: '#1e293b', color: '#fff', didOpen: () => Swal.showLoading() });
    try {
        const res = await fetch(`${API_URL}/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password: pass }) });
        const data = await res.json();
        Swal.close();
        if (res.ok && data.require_otp) {
            currentSessionId = data.session_id;
            document.getElementById('loginStep1').classList.add('hidden');
            document.getElementById('loginStep2').classList.remove('hidden');
            Swal.fire({icon: 'info', title: 'تم الإرسال', text: 'تفقد حسابك في تليجرام', background: '#1e293b', color: '#fff'});
        } else { Swal.fire({icon: 'error', title: 'خطأ', text: data.error || 'بيانات غير صحيحة', background: '#1e293b', color: '#fff'}); }
    } catch (error) { Swal.fire({icon: 'error', title: 'خطأ', text: 'تعذر الاتصال', background: '#1e293b', color: '#fff'}); }
}

async function verifyOTP() {
    const code = document.getElementById('otpCode').value;
    if(!code) return Swal.fire({icon: 'warning', title: 'تنبيه', text: 'أدخل رمز التحقق', background: '#1e293b', color: '#fff'});
    Swal.fire({ title: 'جاري التحقق...', allowOutsideClick: false, background: '#1e293b', color: '#fff', didOpen: () => Swal.showLoading() });
    try {
        const res = await fetch(`${API_URL}/admin/verify-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: currentSessionId, otp_code: code }) });
        const data = await res.json();
        if (res.ok && data.token) {
            localStorage.setItem('admin_token', data.token);
            Swal.fire({icon: 'success', title: 'مرحباً بك', timer: 1000, showConfirmButton: false, background: '#1e293b', color: '#fff'}).then(() => location.reload());
        } else { Swal.fire({icon: 'error', title: 'خطأ', text: data.error || 'رمز خاطئ', background: '#1e293b', color: '#fff'}); }
    } catch (error) { Swal.fire({icon: 'error', title: 'خطأ', text: 'تعذر الاتصال', background: '#1e293b', color: '#fff'}); }
}

// ================= Helpers =================
function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) { preview.src = e.target.result; preview.classList.remove('hidden'); }
        reader.readAsDataURL(input.files[0]);
    } else { preview.src = ''; preview.classList.add('hidden'); }
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);
    try {
        const res = await fetch(`${API_URL}${endpoint}`, config);
        if (res.status === 401) { localStorage.removeItem('admin_token'); Swal.fire({title: 'انتهت الجلسة', icon: 'warning', background: '#1e293b', color: '#fff'}).then(()=>location.reload()); return null; }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (error) { console.error(`API Error [${endpoint}]:`, error); return null; }
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// دالة سحرية لاستخراج المصفوفة سواء كان الرد مصفوفة أو كائناً
function getArrayData(data, key) {
    if (Array.isArray(data)) return data;
    if (data && data[key] && Array.isArray(data[key])) return data[key];
    return [];
}

// ================= Dashboard =================
async function loadDashboardStats() {
    const data = await apiCall('/admin/api/stats');
    if (data) {
        document.getElementById('statOrders').innerText = data.total_orders || 0;
        document.getElementById('statUsers').innerText = data.total_users || 0;
        document.getElementById('statDeposits').innerText = data.total_deposits || 0;
        document.getElementById('statRevenue').innerText = `$${(data.revenue || 0).toFixed(2)}`;
    }
    initChart();
}
function initChart() {
    const ctx = document.getElementById('dashboardChart');
    if(!ctx) return;
    if(dashboardChartInstance) dashboardChartInstance.destroy(); 
    dashboardChartInstance = new Chart(ctx, { type: 'line', data: { labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'], datasets: [{ label: 'حركة المبيعات ($)', data: [12, 19, 3, 5, 2, 3, 10], borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.1)', fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff' } } } } });
}

// ================= Badges =================
async function loadBadges() {
    const data = await apiCall('/admin/api/inbox/counts');
    if (data) {
        const total = (data.deposits||0) + (data.orders||0) + (data.kyc||0) + (data.services||0);
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
    const items = getArrayData(data, 'items');

    if(items.length === 0) {
        container.innerHTML = '<div class="glass col-span-full p-10 rounded-3xl text-center text-slate-400">لا توجد عناصر في هذا القسم حالياً</div>';
        return;
    }

    container.innerHTML = items.map(item => {
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
async function loadArchive() {
    const tbody = document.getElementById('archiveTableBody');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-slate-400 animate-pulse">جاري التحميل...</td></tr>';
    
    const data = await apiCall('/admin/api/archive');
    cachedArchiveData = getArrayData(data, 'archive');
    renderArchive(cachedArchiveData);
}

function renderArchive(data) {
    const tbody = document.getElementById('archiveTableBody');
    if(data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-slate-400">لا يوجد سجل سابق</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(item => {
        let statusColor = (item.status === 'completed' || item.status === 'approved') ? 'text-primary' : 'text-danger';
        return `
        <tr class="border-b border-slate-700/50 hover:bg-slate-800/30">
            <td class="font-bold text-white">${item.type === 'order' ? 'طلب' : 'إيداع'}</td>
            <td class="text-slate-300">${item.ref}</td>
            <td>${item.user}</td>
            <td class="font-bold">$${item.amount}</td>
            <td class="${statusColor}">${item.status}</td>
            <td class="text-xs text-slate-500">${new Date(item.date).toLocaleString('ar-EG')}</td>
        </tr>`;
    }).join('');
}

function filterArchive() {
    const query = document.getElementById('archiveSearch').value.toLowerCase();
    const filtered = cachedArchiveData.filter(item => 
        (item.ref && item.ref.toLowerCase().includes(query)) || 
        (item.user && item.user.toLowerCase().includes(query))
    );
    renderArchive(filtered);
}

function exportArchive() {
    if(cachedArchiveData.length === 0) return Swal.fire({icon: 'info', title: 'لا يوجد بيانات', background: '#1e293b', color: '#fff'});
    const ws = XLSX.utils.json_to_sheet(cachedArchiveData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Archive");
    XLSX.writeFile(wb, `Sanad_Archive_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ================= Payments =================
async function loadPayments() {
    const data = await apiCall('/admin/api/payments');
    const container = document.getElementById('paymentsContainer');
    if(!container) return;
    const items = getArrayData(data, 'payments');
    
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

async function savePayment() {
    const name = document.getElementById('payName').value;
    const min = document.getElementById('payMin').value;
    const max = document.getElementById('payMax').value;
    const account = document.getElementById('payAccount').value;

    if(!name || !account) return Swal.fire({icon: 'warning', title: 'أكمل البيانات', background: '#1e293b', color: '#fff'});
    const res = await apiCall('/admin/api/payments', 'POST', { name, min_amount: min, max_amount: max, account_number: account });
    if(res && res.success) { closeModal('addPaymentModal'); loadPayments(); Swal.fire({icon: 'success', title: 'تمت الإضافة', timer: 1000, showConfirmButton: false, background: '#1e293b', color: '#fff'}); }
}

async function deletePayment(id) {
    const res = await apiCall(`/admin/api/payments/${id}`, 'DELETE');
    if(res) loadPayments();
}

// ================= Products =================
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
    
    if(prod.product_type === 'quantity') {
        document.getElementById('prodPricingType').value = 'dynamic';
        togglePricingFields();
        document.getElementById('prodBaseQty').value = prod.base_quantity || 1;
        document.getElementById('prodBasePrice').value = prod.price;
    } else {
        document.getElementById('prodPricingType').value = 'fixed';
        togglePricingFields();
        document.getElementById('prodFixedPrice').value = prod.price;
    }

    document.getElementById('prodImageFile').value = '';
    document.getElementById('prodImagePreview').src = prod.image || '';
    document.getElementById('prodImagePreview').classList.remove('hidden');
    openModal('addProductModal');
}

function togglePricingFields() {
    const type = document.getElementById('prodPricingType').value;
    if (type === 'fixed') { document.getElementById('fixedPriceFields').classList.remove('hidden'); document.getElementById('dynamicPriceFields').classList.add('hidden'); } 
    else { document.getElementById('fixedPriceFields').classList.add('hidden'); document.getElementById('dynamicPriceFields').classList.remove('hidden'); }
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

    let res = editId ? await apiCall(`/admin/api/products/${editId}`, 'PUT', data) : await apiCall('/admin/api/products', 'POST', data);

    if (res && res.success) { Swal.fire({icon: 'success', title: 'تم الحفظ', timer: 1500, showConfirmButton: false, background: '#1e293b', color: '#fff'}); closeModal('addProductModal'); loadProducts(); }
}

async function loadProducts() {
    const data = await apiCall('/admin/api/products');
    cachedProducts = getArrayData(data, 'products');
    document.getElementById('productsTableBody').innerHTML = cachedProducts.map(p => `
        <tr class="border-b border-slate-700/50 hover:bg-slate-800/30">
            <td class="font-bold text-white flex items-center gap-2"><img src="${p.image || 'https://via.placeholder.com/24'}" class="w-6 h-6 rounded-md object-cover"> ${p.name}</td>
            <td class="text-primary">${p.product_type === 'quantity' ? 'ديناميكي' : `$${p.price}`}</td>
            <td>${p.category_id}</td><td>${p.product_type === 'quantity' ? 'كمية' : 'ثابت'}</td>
            <td>
                <button onclick="openEditProduct(${p.id})" class="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg mr-2"><i data-lucide="edit-2" size="14" class="inline"></i> تعديل</button>
                <button onclick="deleteProduct(${p.id})" class="bg-red-500/20 text-red-400 px-3 py-1 rounded-lg"><i data-lucide="trash-2" size="14" class="inline"></i> حذف</button>
            </td>
        </tr>`).join('');
    lucide.createIcons();
}

async function deleteProduct(id) {
    const result = await Swal.fire({ title: 'تأكيد الحذف', text: 'هل أنت متأكد؟', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'نعم', cancelButtonText: 'إلغاء', background: '#1e293b', color: '#fff' });
    if (result.isConfirmed) { await apiCall(`/admin/api/products/${id}`, 'DELETE'); loadProducts(); }
}

async function loadCategories() {
    const data = await apiCall('/admin/api/categories');
    const categories = getArrayData(data, 'categories');
    document.getElementById('categoriesContainer').innerHTML = categories.map(c => `
        <div class="glass bento-card rounded-3xl p-6 flex flex-col items-center justify-center text-center relative">
            <button class="absolute top-2 right-2 text-red-500"><i data-lucide="x" size="18"></i></button>
            <img src="${c.image || 'https://via.placeholder.com/40'}" class="w-12 h-12 rounded-xl mb-2 object-cover">
            <span class="font-bold text-white">${c.name}</span>
        </div>`).join('');
    lucide.createIcons();
}

// ================= Users =================
async function loadUsers() {
    const data = await apiCall('/admin/api/users');
    const users = getArrayData(data, 'users');
    
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
    if(res && res.success) { closeModal('editUserModal'); Swal.fire({icon: 'success', title: 'تم التعديل', timer: 1000, showConfirmButton: false, background: '#1e293b', color: '#fff'}); loadUsers(); }
}

// ================= Audit & Settings & Notifications =================
async function loadAudit() {
    const tbody = document.getElementById('auditTableBody');
    if(!tbody) return;
    const data = await apiCall('/admin/api/audit');
    const logs = getArrayData(data, 'audit');
    tbody.innerHTML = logs.map(l => `
        <tr class="border-b border-slate-700/50 hover:bg-slate-800/30">
            <td class="font-bold text-white">${l.action}</td>
            <td class="${l.amount > 0 ? 'text-primary' : 'text-danger'}">${l.amount > 0 ? '+' : ''}$${l.amount}</td>
            <td class="text-slate-400">$${l.before}</td>
            <td class="text-slate-400">$${l.after}</td>
            <td class="text-xs text-slate-500">${new Date(l.date).toLocaleString('ar-EG')}</td>
        </tr>`).join('');
}

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
    const data = { store_name: document.getElementById('setStoreName').value, support_link: document.getElementById('setSupportLink').value, exchange_rate: document.getElementById('setExchangeRate').value, maintenance_mode: document.getElementById('setMaintenance').checked ? '1' : '0' };
    const res = await apiCall('/admin/api/settings', 'POST', data);
    if(res && res.success) { Swal.fire({icon: 'success', title: 'تم الحفظ', timer: 1000, showConfirmButton: false, background: '#1e293b', color: '#fff'}); }
}

document.getElementById('notifTarget')?.addEventListener('change', (e) => {
    if(e.target.value === 'specific') document.getElementById('specificUserDiv').classList.remove('hidden');
    else document.getElementById('specificUserDiv').classList.add('hidden');
});

async function sendNotification() {
    const target = document.getElementById('notifTarget').value;
    const specificId = document.getElementById('notifSpecificId').value;
    const msg = document.getElementById('notifMessage').value;

    if(!msg) return Swal.fire({icon: 'warning', title: 'اكتب رسالة أولاً', background: '#1e293b', color: '#fff'});
    if(target === 'specific' && !specificId) return Swal.fire({icon: 'warning', title: 'أدخل ID المستخدم', background: '#1e293b', color: '#fff'});

    Swal.fire({ title: 'جاري الإرسال...', allowOutsideClick: false, background: '#1e293b', color: '#fff', didOpen: () => Swal.showLoading() });
    const res = await apiCall('/admin/api/notifications', 'POST', { target: target === 'specific' ? specificId : 'all', message: msg });
    if(res && res.success) { Swal.fire({icon: 'success', title: 'تم الإرسال', text: `إلى ${res.count} مستخدم`, background: '#1e293b', color: '#fff'}); document.getElementById('notifMessage').value = ''; }
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
