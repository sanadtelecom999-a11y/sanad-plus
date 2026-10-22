// ==========================================
// SANAD PLUS+ Admin Panel v3 (Master Logic)
// ==========================================

const V3State = { deposits: [], orders: [], users: [], kyc: [], products: [], categories: [], payments: [], settings: {}, archive: [], audit: [] };
const API_URL = 'https://sanad-plus-backend.onrender.com';
const getToken = () => localStorage.getItem('admin_token') || localStorage.getItem('token');
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const MOCK_DATA = {
    users: [{ id: 1, first_name: 'أحمد', last_name: 'العلي', telegram_id: 8673286954, balance: 150.50, vip_level: 0, kyc_status: 'pending' }],
    deposits: [{ id: 101, user_id: 1, amount: 50.00, method: 'شام كاش', status: 'pending', created_at: new Date().toISOString(), user: { first_name: 'أحمد' } }],
    orders: [], kyc: [],
    products: [{ id: 1, name: 'ببجي موبايل', price: 10.00, pricing_type: 'dynamic', base_qty: 660, base_price: 10.00, category_id: 1 }],
    categories: [{ id: 1, name: 'شحن ألعاب', icon: 'gamepad-2' }],
    payments: [{ id: 1, name: 'شام كاش', min: 5, max: 500 }],
    settings: { store_name: 'SANAD PLUS+', exchange_rate: 135 },
    archive: [{ id: 501, type: 'order', user: 'أحمد', amount: 10.00, status: 'completed', date: '2026-10-22' }],
    audit: [{ id: 901, user: 'أحمد', action: 'شراء', amount: -10.00, date: '2026-10-22' }]
};

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

async function apiCall(endpoint, method = 'GET', body = null) {
    if (IS_LOCAL) {
        if (endpoint === '/admin/api/users') return { users: MOCK_DATA.users };
        if (endpoint === '/admin/api/deposits') return { deposits: MOCK_DATA.deposits };
        if (endpoint === '/admin/api/products') return { products: MOCK_DATA.products };
        if (endpoint === '/admin/api/categories') return { categories: MOCK_DATA.categories };
        if (endpoint === '/admin/api/payment-methods') return { methods: MOCK_DATA.payments };
        if (endpoint === '/admin/api/archive') return { archive: MOCK_DATA.archive };
        if (endpoint === '/admin/api/audit') return { audit: MOCK_DATA.audit };
        return { success: true };
    }
    const headers = { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);
    try {
        const res = await fetch(`${API_URL}${endpoint}`, config);
        if (res.status === 401) { handleLogout(); return null; }
        return await res.json();
    } catch (error) { return null; }
}

// ================= Image Preview =================
function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.classList.remove('hidden');
        }
        reader.readAsDataURL(input.files[0]);
    } else {
        preview.src = '';
        preview.classList.add('hidden');
    }
}

// ================= Modal Helpers =================
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ================= Products & Pricing =================
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
    if (!imageFile) return Swal.fire({icon: 'warning', title: 'تنبيه', text: 'اختر صورة للمنتج', background: '#1e293b', color: '#fff'});

    Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false, background: '#1e293b', color: '#fff', didOpen: () => Swal.showLoading() });
    
    // هنا في السيرفر الحقيقي: نستخدم FormData لرفع الملف
    // الآن نحن نكتفي بمحاكاة النجاح
    setTimeout(() => {
        Swal.fire({icon: 'success', title: 'تمت الإضافة', text: 'تم إضافة المنتج والصورة بنجاح', timer: 1500, showConfirmButton: false, background: '#1e293b', color: '#fff'}); 
        closeModal('addProductModal'); 
    }, 1000);
}

async function saveCategory() {
    const name = document.getElementById('catName').value;
    const imageFile = document.getElementById('catImageFile').files[0];
    
    if (!name) return Swal.fire({icon: 'warning', title: 'تنبيه', text: 'أدخل اسم القسم', background: '#1e293b', color: '#fff'});
    if (!imageFile) return Swal.fire({icon: 'warning', title: 'تنبيه', text: 'اختر صورة للقسم', background: '#1e293b', color: '#fff'});

    Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false, background: '#1e293b', color: '#fff', didOpen: () => Swal.showLoading() });
    setTimeout(() => {
        Swal.fire({icon: 'success', title: 'تمت الإضافة', timer: 1500, showConfirmButton: false, background: '#1e293b', color: '#fff'}); 
        closeModal('addCategoryModal'); 
    }, 1000);
}

// ================= Navigation =================
function switchSection(sectionId, btnElement) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    const target = document.getElementById('section-' + sectionId);
    if (target) { target.classList.remove('hidden'); target.classList.add('block'); }
    const titles = { 'dashboard': 'لوحة التحكم', 'inbox': 'الإرساليات', 'archive': 'الأرشيف', 'users': 'المستخدمين', 'products': 'المنتجات', 'categories': 'الأقسام', 'payments': 'طرق الدفع', 'audit': 'التدقيق المالي', 'notifications': 'الإشعارات', 'settings': 'الإعدادات' };
    document.getElementById('page-title').innerText = titles[sectionId] || 'لوحة التحكم';
    if (btnElement) {
        document.querySelectorAll('.nav-btn').forEach(btn => { btn.classList.remove('bg-slate-700/50', 'text-white'); btn.classList.add('text-slate-400'); });
        btnElement.classList.remove('text-slate-400'); btnElement.classList.add('bg-slate-700/50', 'text-white');
    }
}

function handleLogout() { localStorage.removeItem('admin_token'); localStorage.removeItem('token'); location.reload(); }
async function handleLogin() { localStorage.setItem('admin_token', 'fake_token_for_testing'); location.reload(); }
window.onload = () => { if (!getToken()) { document.getElementById('loginScreen').style.display = 'flex'; } else { document.getElementById('loginScreen').style.display = 'none'; } };
