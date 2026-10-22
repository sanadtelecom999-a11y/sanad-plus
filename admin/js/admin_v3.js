const API_URL = 'https://sanad-plus-backend.onrender.com';
const getToken = () => localStorage.getItem('admin_token') || localStorage.getItem('token');
let currentSessionId = null;
let dashboardChartInstance = null;

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
            Swal.fire({icon: 'info', title: 'تم الإرسال', text: 'تفقد حسابك في تليجرام للحصول على الرمز', background: '#1e293b', color: '#fff'});
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

// ⚠️ دالة الاتصال الصارمة (تظهر أي خطأ)
async function apiCall(endpoint, method = 'GET', body = null) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    try {
        const res = await fetch(`${API_URL}${endpoint}`, config);
        
        if (res.status === 401) {
            Swal.fire('انتهت الجلسة', 'يرجى تسجيل الدخول مجدداً', 'warning').then(() => handleLogout());
            throw new Error("Unauthorized");
        }

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(`HTTP ${res.status}: ${errorData.error || res.statusText}`);
        }

        return await res.json();
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        Swal.fire({
            icon: 'error',
            title: 'فشل الاتصال بالسيرفر',
            text: `المسار: ${endpoint}\nالخطأ: ${error.message}`,
            background: '#1e293b', color: '#fff'
        });
        return null;
    }
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ================= Dashboard Stats =================
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
    dashboardChartInstance = new Chart(ctx, {
        type: 'line', data: { labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'], datasets: [{ label: 'حركة المبيعات ($)', data: [12, 19, 3, 5, 2, 3, 10], borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.1)', fill: true, tension: 0.4 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff' } } }, scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } } } }
    });
}

// ================= Inbox (Deposits) =================
async function loadInbox() {
    const container = document.getElementById('inboxContainer');
    if(!container) return;
    container.innerHTML = '<div class="col-span-full text-center text-slate-400 animate-pulse py-4">جاري تحميل الإرساليات...</div>';
    
    const data = await apiCall('/admin/api/deposits');
    if(data && data.deposits) {
        const badge = document.getElementById('sidebarInboxBadge');
        if(badge) {
            badge.innerText = data.deposits.length;
            badge.style.display = data.deposits.length > 0 ? 'inline-block' : 'none';
        }

        if(data.deposits.length === 0) {
            container.innerHTML = '<div class="glass col-span-full p-10 rounded-3xl text-center text-slate-400">لا توجد إرساليات جديدة</div>';
            return;
        }

        container.innerHTML = data.deposits.map(item => `
            <div class="glass bento-card rounded-3xl p-5 border-t-4 border-t-accent">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-2">
                        <i data-lucide="credit-card" size="18" class="text-slate-400"></i>
                        <span class="font-bold text-white">إيداع بمبلغ $${item.amount}</span>
                    </div>
                    <span class="bg-slate-800 text-xs px-2 py-1 rounded-lg text-slate-300">${item.user?.first_name || 'مستخدم'}</span>
                </div>
                <div class="flex gap-2 mt-4">
                    <button onclick="handleDepositAction(${item.id}, 'approve')" class="flex-1 bg-primary hover:bg-emerald-600 text-white py-2 rounded-xl text-sm font-bold">قبول</button>
                    <button onclick="handleDepositAction(${item.id}, 'reject')" class="flex-1 bg-danger hover:bg-red-600 text-white py-2 rounded-xl text-sm font-bold">رفض</button>
                </div>
            </div>
        `).join('');
        lucide.createIcons();
    } else {
        container.innerHTML = '<div class="glass col-span-full p-10 rounded-3xl text-center text-danger">فشل تحميل الإرساليات. (راجع رسالة الخطأ)</div>';
    }
}

async function handleDepositAction(id, action) {
    const isApprove = action === 'approve';
    const result = await Swal.fire({
        title: isApprove ? 'تأكيد القبول' : 'تأكيد الرفض',
        text: `هل أنت متأكد من ${isApprove ? 'قبول' : 'رفض'} هذا الإيداع؟`,
        icon: isApprove ? 'question' : 'warning',
        showCancelButton: true, confirmButtonColor: isApprove ? '#10b981' : '#ef4444',
        confirmButtonText: 'نعم', cancelButtonText: 'إلغاء', background: '#1e293b', color: '#fff'
    });

    if (result.isConfirmed) {
        Swal.fire({ title: 'جاري المعالجة...', allowOutsideClick: false, background: '#1e293b', color: '#fff', didOpen: () => Swal.showLoading() });
        const res = await apiCall(`/admin/api/deposits/${id}/${action}`, 'POST');
        if(res && res.success) {
            Swal.fire({icon: 'success', title: 'تمت العملية', timer: 1500, showConfirmButton: false, background: '#1e293b', color: '#fff'});
            loadInbox();
        }
    }
}

// ================= Products =================
function togglePricingFields() {
    const type = document.getElementById('prodPricingType').value;
    if (type === 'fixed') {
        document.getElementById('fixedPriceFields').classList.remove('hidden');
        document.getElementById('dynamicPriceFields').classList.add('hidden');
        document.getElementById('dynamicPreview').classList.add('hidden');
    } else {
        document.getElementById('fixedPriceFields').classList.add('hidden');
        document.getElementById('dynamicPriceFields').classList.remove('hidden');
        document.getElementById('dynamicPreview').classList.remove('hidden');
        calculateDynamicPrice();
    }
}

function calculateDynamicPrice() {
    const baseQty = parseFloat(document.getElementById('prodBaseQty').value) || 0;
    const basePrice = parseFloat(document.getElementById('prodBasePrice').value) || 0;
    if (baseQty > 0 && basePrice > 0) { document.getElementById('previewCalculatedPrice').innerText = `$${((basePrice / baseQty) * 16000).toFixed(2)}`; } else { document.getElementById('previewCalculatedPrice').innerText = `$0.00`; }
}

async function saveProduct() {
    const name = document.getElementById('prodName').value;
    const imageFile = document.getElementById('prodImageFile').files[0];
    if (!name) return Swal.fire({icon: 'warning', title: 'تنبيه', text: 'أدخل اسم المنتج', background: '#1e293b', color: '#fff'});
    Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false, background: '#1e293b', color: '#fff', didOpen: () => Swal.showLoading() });
    let imageBase64 = null;
    if (imageFile) { imageBase64 = await new Promise((resolve) => { const reader = new FileReader(); reader.onload = (e) => resolve(e.target.result); reader.readAsDataURL(imageFile); }); }
    const data = { name: name, category_id: document.getElementById('prodCategory').value, input_type: document.getElementById('prodInputType').value, pricing_type: document.getElementById('prodPricingType').value, image: imageBase64 };
    if (data.pricing_type === 'fixed') { data.price = parseFloat(document.getElementById('prodFixedPrice').value) || 0; } 
    else { data.base_qty = parseFloat(document.getElementById('prodBaseQty').value) || 0; data.price = parseFloat(document.getElementById('prodBasePrice').value) || 0; }
    const res = await apiCall('/admin/api/products', 'POST', data);
    if (res && res.success) { Swal.fire({icon: 'success', title: 'تمت الإضافة', timer: 1500, showConfirmButton: false, background: '#1e293b', color: '#fff'}); closeModal('addProductModal'); loadProducts(); } 
}

async function loadProducts() {
    const data = await apiCall('/admin/api/products');
    if(data && data.products) {
        document.getElementById('productsTableBody').innerHTML = data.products.map(p => `
            <tr class="border-b border-slate-700/50 hover:bg-slate-800/30">
                <td class="font-bold text-white">${p.name}</td>
                <td class="text-primary">${p.pricing_type === 'dynamic' ? 'ديناميكي' : `$${p.price.toFixed(2)}`}</td>
                <td>${p.category_id}</td><td>${p.pricing_type === 'dynamic' ? 'كمية' : 'ثابت'}</td>
                <td><button onclick="deleteProduct(${p.id}, '${p.name}')" class="bg-red-500/20 text-red-400 px-3 py-1 rounded-lg">حذف</button></td>
            </tr>`).join('');
    }
}

async function deleteProduct(id, name) {
    const result = await Swal.fire({ title: 'تأكيد الحذف', text: `حذف "${name}"؟`, icon: 'error', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#475569', confirmButtonText: 'نعم', cancelButtonText: 'إلغاء', background: '#1e293b', color: '#fff' });
    if (result.isConfirmed) { await apiCall(`/admin/api/products/${id}`, 'DELETE'); loadProducts(); }
}

// ================= Categories =================
async function saveCategory() {
    const name = document.getElementById('catName').value;
    const imageFile = document.getElementById('catImageFile').files[0];
    if (!name) return Swal.fire({icon: 'warning', title: 'تنبيه', text: 'أدخل اسم القسم', background: '#1e293b', color: '#fff'});
    Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false, background: '#1e293b', color: '#fff', didOpen: () => Swal.showLoading() });
    let imageBase64 = null;
    if (imageFile) { imageBase64 = await new Promise((resolve) => { const reader = new FileReader(); reader.onload = (e) => resolve(e.target.result); reader.readAsDataURL(imageFile); }); }
    const res = await apiCall('/admin/api/categories', 'POST', { name: name, image: imageBase64 });
    if (res && res.success) { Swal.fire({icon: 'success', title: 'تمت الإضافة', timer: 1500, showConfirmButton: false, background: '#1e293b', color: '#fff'}); closeModal('addCategoryModal'); loadCategories(); }
}

async function loadCategories() {
    const data = await apiCall('/admin/api/categories');
    if(data && data.categories) {
        document.getElementById('categoriesContainer').innerHTML = data.categories.map(c => `
            <div class="glass bento-card rounded-3xl p-6 flex flex-col items-center justify-center text-center relative">
                <button onclick="deleteCategory(${c.id}, '${c.name}')" class="absolute top-2 right-2 text-red-500"><i data-lucide="x" size="18"></i></button>
                <img src="${c.image || 'https://via.placeholder.com/40'}" class="w-12 h-12 rounded-xl mb-2 object-cover">
                <span class="font-bold text-white">${c.name}</span>
            </div>`).join('');
        lucide.createIcons();
    }
}

async function deleteCategory(id, name) {
    const result = await Swal.fire({ title: 'تأكيد الحذف', text: `حذف القسم "${name}"؟`, icon: 'error', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'نعم', cancelButtonText: 'إلغاء', background: '#1e293b', color: '#fff' });
    if (result.isConfirmed) { await apiCall(`/admin/api/categories/${id}`, 'DELETE'); loadCategories(); }
}

// ================= Users =================
async function loadUsers() {
    const data = await apiCall('/admin/api/users');
    if (data && data.users) {
        document.getElementById('usersTableBody').innerHTML = data.users.map(user => `
            <tr class="hover:bg-slate-800/30 transition">
                <td><div class="font-bold text-white">${user.first_name}</div><div class="text-xs text-slate-400 font-mono">${user.telegram_id}</div></td>
                <td class="font-bold text-primary">$${user.balance.toFixed(2)}</td>
                <td><span class="px-2 py-1 rounded-full text-xs ${user.kyc_status === 'verified' ? 'bg-primary/20 text-primary' : 'bg-amber-500/20 text-amber-400'}">${user.kyc_status}</span></td>
                <td>${user.vip_level > 0 ? `<span class="text-accent">VIP ${user.vip_level}</span>` : '-'}</td>
                <td><button onclick="editUserBalance(${user.id}, ${user.balance}, '${user.first_name}')" class="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-lg text-sm">تعديل الرصيد</button></td>
            </tr>`).join('');
        lucide.createIcons();
    }
}

async function editUserBalance(id, currentBalance, name) {
    const { value: formValues } = await Swal.fire({
        title: `تعديل رصيد: ${name}`,
        html: `<div class="flex gap-2 justify-center mb-4"><button id="btn-add" class="swal2-confirm swal2-styled px-6 py-2" style="background-color: #10b981; margin: 0;">+ إضافة</button><button id="btn-deduct" class="swal2-cancel swal2-styled px-6 py-2" style="background-color: #ef4444; margin: 0;">- خصم</button></div><input id="swal-input-amount" class="swal2-input" type="number" placeholder="المبلغ ($)" step="0.01"><input type="hidden" id="swal-action" value="add">`,
        focusConfirm: false, showCancelButton: true, confirmButtonText: 'حفظ', cancelButtonText: 'إلغاء', background: '#1e293b', color: '#fff',
        didOpen: () => {
            const btnAdd = document.getElementById('btn-add'); const btnDeduct = document.getElementById('btn-deduct'); const actionInput = document.getElementById('swal-action');
            btnAdd.addEventListener('click', () => { actionInput.value = 'add'; btnAdd.style.opacity = '1'; btnDeduct.style.opacity = '0.5'; });
            btnDeduct.addEventListener('click', () => { actionInput.value = 'deduct'; btnDeduct.style.opacity = '1'; btnAdd.style.opacity = '0.5'; });
        },
        preConfirm: () => { const amount = document.getElementById('swal-input-amount').value; const action = document.getElementById('swal-action').value; if (!amount || amount <= 0) Swal.showValidationMessage('أدخل مبلغاً صحيحاً'); return { amount: parseFloat(amount), action }; }
    });
    if (formValues) {
        const newBalance = formValues.action === 'add' ? currentBalance + formValues.amount : currentBalance - formValues.amount;
        const res = await apiCall(`/admin/api/users/${id}/balance`, 'POST', { balance: newBalance });
        if (res && res.success) { Swal.fire({ icon: 'success', title: 'تم التعديل', timer: 1500, showConfirmButton: false, background: '#1e293b', color: '#fff' }); loadUsers(); } 
    }
}

// ================= Navigation =================
function switchSection(sectionId, btnElement) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    const target = document.getElementById('section-' + sectionId);
    if (target) { target.classList.remove('hidden'); target.classList.add('block'); }
    
    const titles = { 'dashboard': 'لوحة التحكم', 'inbox': 'الإرساليات', 'users': 'إدارة المستخدمين', 'products': 'المنتجات', 'categories': 'الأقسام', 'settings': 'الإعدادات' };
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
}

function handleLogout() { localStorage.removeItem('admin_token'); localStorage.removeItem('token'); location.reload(); }
window.onload = () => { 
    if (!getToken()) { document.getElementById('loginScreen').style.display = 'flex'; } 
    else { document.getElementById('loginScreen').style.display = 'none'; switchSection('dashboard', document.querySelector('.nav-btn')); } 
};
