// ==========================================
// SANAD PLUS+ Admin Panel v3 (Fixed Loading)
// ==========================================

const API_URL = 'https://sanad-plus-backend.onrender.com';
const getToken = () => localStorage.getItem('admin_token') || localStorage.getItem('token');

function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) { preview.src = e.target.result; preview.classList.remove('hidden'); }
        reader.readAsDataURL(input.files[0]);
    } else {
        preview.src = ''; preview.classList.add('hidden');
    }
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);
    try {
        const res = await fetch(`${API_URL}${endpoint}`, config);
        if (res.status === 401) { handleLogout(); return null; }
        return await res.json();
    } catch (error) { 
        console.error("API Error:", error);
        return null; 
    }
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ================= Dashboard Stats =================
async function loadDashboardStats() {
    const data = await apiCall('/admin/api/stats');
    if (data) {
        document.getElementById('statOrders').innerText = data.total_orders;
        document.getElementById('statUsers').innerText = data.total_users;
        // يمكن إضافة باقي الإحصائيات هنا
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
    if (baseQty > 0 && basePrice > 0) {
        document.getElementById('previewCalculatedPrice').innerText = `$${((basePrice / baseQty) * 16000).toFixed(2)}`;
    } else {
        document.getElementById('previewCalculatedPrice').innerText = `$0.00`;
    }
}

async function saveProduct() {
    const name = document.getElementById('prodName').value;
    const imageFile = document.getElementById('prodImageFile').files[0];
    if (!name) return Swal.fire({icon: 'warning', title: 'تنبيه', text: 'أدخل اسم المنتج', background: '#1e293b', color: '#fff'});

    Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false, background: '#1e293b', color: '#fff', didOpen: () => Swal.showLoading() });
    
    let imageBase64 = null;
    if (imageFile) {
        imageBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(imageFile);
        });
    }

    const data = {
        name: name,
        category_id: document.getElementById('prodCategory').value,
        input_type: document.getElementById('prodInputType').value,
        pricing_type: document.getElementById('prodPricingType').value,
        image: imageBase64
    };

    // تأكيد إرسال السعر
    if (data.pricing_type === 'fixed') {
        data.price = parseFloat(document.getElementById('prodFixedPrice').value) || 0;
    } else {
        data.base_qty = parseFloat(document.getElementById('prodBaseQty').value) || 0;
        data.price = parseFloat(document.getElementById('prodBasePrice').value) || 0;
    }

    const res = await apiCall('/admin/api/products', 'POST', data);
    if (res && res.success) {
        Swal.fire({icon: 'success', title: 'تمت الإضافة', timer: 1500, showConfirmButton: false, background: '#1e293b', color: '#fff'}); 
        closeModal('addProductModal'); 
        loadProducts(); // تحديث الجدول
    } else {
        Swal.fire({icon: 'error', title: 'خطأ', text: 'فشل الحفظ، تأكد من البيانات', background: '#1e293b', color: '#fff'});
    }
}

async function loadProducts() {
    const data = await apiCall('/admin/api/products');
    if(data && data.products) {
        document.getElementById('productsTableBody').innerHTML = data.products.map(p => `
            <tr class="border-b border-slate-700/50 hover:bg-slate-800/30">
                <td class="font-bold text-white">${p.name}</td>
                <td class="text-primary">${p.pricing_type === 'dynamic' ? 'ديناميكي' : `$${p.price.toFixed(2)}`}</td>
                <td>${p.category_id}</td>
                <td>${p.pricing_type === 'dynamic' ? 'كمية' : 'ثابت'}</td>
                <td><button onclick="deleteProduct(${p.id}, '${p.name}')" class="bg-red-500/20 text-red-400 px-3 py-1 rounded-lg">حذف</button></td>
            </tr>
        `).join('');
    }
}

// ================= Categories =================
async function saveCategory() {
    const name = document.getElementById('catName').value;
    const imageFile = document.getElementById('catImageFile').files[0];
    if (!name) return Swal.fire({icon: 'warning', title: 'تنبيه', text: 'أدخل اسم القسم', background: '#1e293b', color: '#fff'});

    Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false, background: '#1e293b', color: '#fff', didOpen: () => Swal.showLoading() });
    
    let imageBase64 = null;
    if (imageFile) {
        imageBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(imageFile);
        });
    }

    const res = await apiCall('/admin/api/categories', 'POST', { name: name, image: imageBase64 });
    if (res && res.success) {
        Swal.fire({icon: 'success', title: 'تمت الإضافة', timer: 1500, showConfirmButton: false, background: '#1e293b', color: '#fff'}); 
        closeModal('addCategoryModal'); 
        loadCategories(); // تحديث
    }
}

async function loadCategories() {
    const data = await apiCall('/admin/api/categories');
    if(data && data.categories) {
        document.getElementById('categoriesContainer').innerHTML = data.categories.map(c => `
            <div class="glass bento-card rounded-3xl p-6 flex flex-col items-center justify-center text-center relative">
                <button onclick="deleteCategory(${c.id}, '${c.name}')" class="absolute top-2 right-2 text-red-500 hover:text-red-400"><i data-lucide="x" size="18"></i></button>
                <img src="${c.image || 'https://via.placeholder.com/40'}" class="w-12 h-12 rounded-xl mb-2">
                <span class="font-bold text-white">${c.name}</span>
            </div>
        `).join('');
        lucide.createIcons();
    }
}

// ================= Users & Balance =================
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
            </tr>
        `).join('');
        lucide.createIcons();
    }
}

async function editUserBalance(id, currentBalance, name) {
    const { value: formValues } = await Swal.fire({
        title: `تعديل رصيد: ${name}`,
        html: `
            <div class="flex gap-2 justify-center mb-4">
                <button id="btn-add" class="swal2-confirm swal2-styled px-6 py-2" style="background-color: #10b981; margin: 0;">+ إضافة</button>
                <button id="btn-deduct" class="swal2-cancel swal2-styled px-6 py-2" style="background-color: #ef4444; margin: 0;">- خصم</button>
            </div>
            <input id="swal-input-amount" class="swal2-input" type="number" placeholder="المبلغ ($)" step="0.01">
            <input type="hidden" id="swal-action" value="add">
        `,
        focusConfirm: false, showCancelButton: true, confirmButtonText: 'حفظ التعديل', cancelButtonText: 'إلغاء', background: '#1e293b', color: '#fff',
        didOpen: () => {
            const btnAdd = document.getElementById('btn-add'); const btnDeduct = document.getElementById('btn-deduct'); const actionInput = document.getElementById('swal-action');
            btnAdd.addEventListener('click', () => { actionInput.value = 'add'; btnAdd.style.opacity = '1'; btnDeduct.style.opacity = '0.5'; });
            btnDeduct.addEventListener('click', () => { actionInput.value = 'deduct'; btnDeduct.style.opacity = '1'; btnAdd.style.opacity = '0.5'; });
        },
        preConfirm: () => {
            const amount = document.getElementById('swal-input-amount').value; const action = document.getElementById('swal-action').value;
            if (!amount || amount <= 0) Swal.showValidationMessage('أدخل مبلغاً صحيحاً');
            return { amount: parseFloat(amount), action };
        }
    });

    if (formValues) {
        const newBalance = formValues.action === 'add' ? currentBalance + formValues.amount : currentBalance - formValues.amount;
        const res = await apiCall(`/admin/api/users/${id}/balance`, 'POST', { balance: newBalance });
        if (res && res.success) { 
            Swal.fire({ icon: 'success', title: 'تم التعديل', timer: 1500, showConfirmButton: false, background: '#1e293b', color: '#fff' }); 
            loadUsers(); 
        } else {
            Swal.fire({ icon: 'error', title: 'خطأ', text: res?.error || 'فشل التعديل', background: '#1e293b', color: '#fff' });
        }
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

    // تحميل البيانات عند الانتقال
    if (sectionId === 'dashboard') loadDashboardStats();
    if (sectionId === 'users') loadUsers();
    if (sectionId === 'products') loadProducts();
    if (sectionId === 'categories') loadCategories();
}

// دالة تحميل كل شيء عند بدء التشغيل
async function loadAllData() {
    loadDashboardStats();
}

function handleLogout() { localStorage.removeItem('admin_token'); localStorage.removeItem('token'); location.reload(); }
window.onload = () => { 
    if (!getToken()) { document.getElementById('loginScreen').style.display = 'flex'; } 
    else { 
        document.getElementById('loginScreen').style.display = 'none'; 
        switchSection('dashboard', document.querySelector('.nav-btn')); 
    } 
};
