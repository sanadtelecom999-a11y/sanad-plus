// ==========================================
// SANAD PLUS+ MiniApp (Real API Integration)
// ==========================================

const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor("#000000");
}

const API_URL = 'https://sanad-plus-backend.onrender.com';
const tgUser = tg?.initDataUnsafe?.user;
let currentUser = null;
let categoriesData = [];
let currentOrderContext = { product: null, price: 0 };

// 1. تهيئة التطبيق وجلب البيانات
document.addEventListener('DOMContentLoaded', async () => {
    if (!tgUser) {
        showToast("يرجى فتح التطبيق من داخل تليجرام");
        return;
    }

    // إعداد واجهة المستخدم
    document.getElementById('greetingText').innerText = `مرحباً، ${tgUser.first_name} 👋`;
    document.getElementById('profileName').innerText = tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : '');
    document.getElementById('profileUsername').innerText = tgUser.username ? `@${tgUser.username}` : '';
    document.getElementById('profileTelegramId').innerText = `Telegram: ${tgUser.id}`;
    
    if (tgUser.photo_url) {
        const avatarImg = document.getElementById('userAvatar');
        avatarImg.src = tgUser.photo_url;
        avatarImg.classList.remove('hidden');
        document.getElementById('defaultAvatarIcon').classList.add('hidden');
    }

    // جلب البيانات من السيرفر
    try {
        const res = await fetch(`${API_URL}/api/miniapp/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegram_id: tgUser.id,
                first_name: tgUser.first_name,
                username: tgUser.username
            })
        });
        
        const data = await res.json();
        if (data.user) {
            currentUser = data.user;
            updateUserUI(data.user);
        }

        // جلب المنتجات
        const prodRes = await fetch(`${API_URL}/api/miniapp/products`);
        const prodData = await prodRes.json();
        categoriesData = prodData.categories;
        renderHomeCategories(categoriesData);
        
    } catch (err) {
        console.error(err);
        showToast("تعذر الاتصال بالسيرفر");
    }
});

// 2. تحديث واجهة المستخدم بالبيانات الحقيقية
function updateUserUI(user) {
    // الرصيد في الرئيسية
    document.getElementById('homeBalance').innerText = user.balance.toFixed(2);
    
    // الرصيد في الحساب
    document.getElementById('profileBalance').innerText = user.balance.toFixed(2);
    
    // توليد Sanad ID
    const sanadId = "SN-" + user.id.toString().padStart(6, '0');
    document.getElementById('sanadIdText').innerText = sanadId;

    // علامة التوثيق
    updateVerificationBadge(user.kyc_status);
}

function updateVerificationBadge(status) {
    const badgeContainer = document.getElementById('verificationBadge');
    badgeContainer.classList.remove('hidden');
    if (status === 'verified') {
        badgeContainer.innerHTML = `<svg class="w-6 h-6 text-[#1d9bf0]" fill="currentColor" viewBox="0 0 24 24"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.79-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.75 2.73 1.867 3.45-.103.36-.16.74-.16 1.13 0 2.21 1.71 3.998 3.918 3.998.47 0 .92-.084 1.336-.25C9.184 21.585 10.49 22.5 12 22.5s2.816-.917 3.337-2.25c.416.165.866.25 1.336.25 2.21 0 3.918-1.79 3.918-4 0-.39-.057-.77-.16-1.13 1.117-.72 1.867-1.99 1.867-3.45z"></path><path fill="white" d="M10.515 16.957l-3.32-3.32 1.414-1.414 1.906 1.906 4.95-4.95 1.414 1.414-6.364 6.364z"></path></svg>`;
    } else {
        badgeContainer.innerHTML = `<div class="bg-danger/20 rounded-full p-1 flex items-center justify-center"><i data-lucide="alert-circle" class="text-danger" size="18"></i></div>`;
        lucide.createIcons();
    }
}

// 3. عرض التصنيفات الحقيقية
function renderHomeCategories(categories) {
    const grid = document.getElementById('homeCategories');
    grid.innerHTML = categories.map(cat => `
        <div onclick="openCategory(${cat.id})" class="bg-iosCard rounded-3xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bento-card border border-slate-800">
            <img src="${cat.image || 'https://via.placeholder.com/64'}" alt="${cat.name}" class="w-16 h-16 mb-2 object-cover rounded-xl shadow-lg">
            <span class="font-bold text-white text-sm">${cat.name}</span>
        </div>
    `).join('');
}

// 4. فتح قسم معين وعرض منتجاته
function openCategory(categoryId) {
    const category = categoriesData.find(c => c.id === categoryId);
    if(!category) return;

    document.getElementById('categoryTitle').innerText = category.name;
    const grid = document.getElementById('categoryProductsGrid');
    
    if(category.products.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center text-slate-400 py-10">لا توجد منتجات في هذا القسم حالياً</div>';
    } else {
        grid.innerHTML = category.products.map(prod => `
            <div onclick="openProductModal(${prod.id})" class="bg-iosCard rounded-3xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bento-card border border-slate-800">
                <img src="${prod.image || 'https://via.placeholder.com/80'}" class="w-16 h-16 rounded-xl mb-3 object-cover shadow-lg">
                <span class="font-bold text-white text-sm">${prod.name}</span>
                <span class="text-accent text-xs mt-1">$${prod.price.toFixed(2)}</span>
            </div>
        `).join('');
    }
    document.getElementById('categoryView').classList.add('active');
}

function closeCategoryView() { document.getElementById('categoryView').classList.remove('active'); }

// 5. فتح نافذة المنتج (تم تبسيطها هنا للعبة، يمكنك توسيعها للأرصدة لاحقاً)
function openProductModal(productId) {
    let product = null;
    for (let cat of categoriesData) {
        product = cat.products.find(p => p.id === productId);
        if (product) break;
    }
    if (!product) return;

    currentOrderContext.product = product;
    currentOrderContext.price = product.price;
    
    // نفترض أننا نستخدم نافذة اللعبة (gameModal) كواجهة شراء عامة الآن
    document.getElementById('modalGameTitle').innerText = product.name;
    document.getElementById('gameTotal').innerText = `$${product.price.toFixed(2)}`;
    
    openModal('gameModal');
}

// 6. إرسال طلب شراء
async function submitGameOrder() {
    const playerId = document.querySelector('#gameModal input[type="number"]').value;
    if(!playerId) return showToast("يرجى إدخال ID اللاعب");

    Swal.fire({ title: 'جاري الشراء...', allowOutsideClick: false, background: '#1c1c1e', color: '#fff', didOpen: () => Swal.showLoading() });

    try {
        const res = await fetch(`${API_URL}/api/miniapp/order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegram_id: tgUser.id,
                product_id: currentOrderContext.product.id,
                quantity: 1,
                delivery_data: playerId
            })
        });
        const data = await res.json();
        
        if (data.success) {
            Swal.fire({ icon: 'success', title: 'تم الشراء', text: 'تم إرسال طلبك بنجاح!', background: '#1c1c1e', color: '#fff' });
            closeModal('gameModal');
            // تحديث الرصيد
            currentUser.balance = data.new_balance;
            updateUserUI(currentUser);
        } else {
            Swal.fire({ icon: 'error', title: 'خطأ', text: data.error, background: '#1c1c1e', color: '#fff' });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'خطأ', text: 'تعذر الاتصال بالسيرفر', background: '#1c1c1e', color: '#fff' });
    }
}

// 7. دالة الإيداع الحقيقية
async function submitDeposit() {
    const amount = document.getElementById('depositAmount').value;
    const sender = document.getElementById('depositSender').value;
    const file = document.getElementById('depositImage').files[0];
    
    if (!amount || !sender || !file) return showToast("يرجى إكمال جميع البيانات");

    Swal.fire({ title: 'جاري رفع الإيصال...', allowOutsideClick: false, background: '#1c1c1e', color: '#fff', didOpen: () => Swal.showLoading() });

    // تحويل الصورة إلى Base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        const base64Image = reader.result;

        try {
            const res = await fetch(`${API_URL}/api/miniapp/deposit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegram_id: tgUser.id,
                    amount: parseFloat(amount),
                    method: document.getElementById('depositTitle').innerText.replace('إتمام الإيداع - ', ''),
                    sender_name: sender,
                    receipt_image: base64Image
                })
            });
            const data = await res.json();
            
            if (data.success) {
                Swal.fire({ icon: 'success', title: 'تم الإرسال', text: 'تم إرسال طلب الإيداع، وسيتم مراجعته قريباً', background: '#1c1c1e', color: '#fff' });
                closeModal('depositModal');
            } else {
                Swal.fire({ icon: 'error', title: 'خطأ', text: data.error, background: '#1c1c1e', color: '#fff' });
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'فشل الاتصال', background: '#1c1c1e', color: '#fff' });
        }
    };
}

// ================= Utility Functions =================
function switchTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(tab => { tab.classList.add('hidden'); tab.classList.remove('block'); });
    const target = document.getElementById('tab-' + tabId);
    if (target) { target.classList.remove('hidden'); target.classList.add('block'); }
    
    if (btnElement) {
        document.querySelectorAll('.nav-btn').forEach(btn => { btn.classList.remove('text-accent'); btn.classList.add('text-slate-500'); });
        btnElement.classList.remove('text-slate-500'); btnElement.classList.add('text-accent');
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    const content = document.getElementById(modalId + 'Content');
    if(!modal || !content) return;
    modal.classList.remove('hidden');
    setTimeout(() => { content.classList.remove('translate-y-full'); }, 50);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const content = document.getElementById(modalId + 'Content');
    if(!modal || !content) return;
    content.classList.add('translate-y-full');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
}

function selectPaymentMethod(methodName) {
    document.getElementById('depositTitle').innerText = `إتمام الإيداع - ${methodName}`;
    let min = 0, max = 500;
    if(methodName === 'MTN كاش') { min = 1000; max = 100000; }
    document.getElementById('depositMinLimit').innerText = methodName === 'MTN كاش' ? `${min} ل.س` : `$${min.toFixed(2)}`;
    document.getElementById('depositMaxLimit').innerText = methodName === 'MTN كاش' ? `${max} ل.س` : `$${max.toFixed(2)}`;
    closeModal('paymentMethodsModal');
    setTimeout(() => { openModal('depositModal'); }, 300);
}

function previewDepositImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('depositImagePreview');
            preview.src = e.target.result;
            preview.classList.remove('hidden');
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function copySanadId() {
    const idText = document.getElementById('sanadIdText').innerText;
    navigator.clipboard.writeText(idText).then(() => { showToast('تم نسخ المعرف'); });
}

function showToast(message) {
    Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: message, showConfirmButton: false, timer: 2500, background: '#1c1c1e', color: '#fff' });
}

function openFeatureModal(featureName) { document.getElementById('featureTitle').innerText = featureName; openModal('featureModal'); }
function handleSearch() { /* يمكن إضافة بحث حقيقي لاحقاً */ }
function filterHistory(btnElement, status) { /* يمكن إضافة فلترة حقيقية لاحقاً */ }
function handleLogout() { if(tg) tg.close(); }
