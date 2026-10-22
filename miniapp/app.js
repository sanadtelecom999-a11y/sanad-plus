const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor("#000000"); }

const API_URL = 'https://sanad-plus-backend.onrender.com';
const tgUser = tg?.initDataUnsafe?.user;
let currentUser = null;
let categoriesData = [];
let currentOrderContext = { product: null, price: 0, qty: 1 };

document.addEventListener('DOMContentLoaded', async () => {
    if (!tgUser) { showToast("يرجى فتح التطبيق من داخل تليجرام"); return; }

    document.getElementById('greetingText').innerText = `مرحباً، ${tgUser.first_name} 👋`;
    document.getElementById('profileName').innerText = tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : '');
    document.getElementById('profileUsername').innerText = tgUser.username ? `@${tgUser.username}` : '';
    document.getElementById('profileTelegramId').innerText = `Telegram: ${tgUser.id}`;
    
    if (tgUser.photo_url) {
        document.getElementById('userAvatar').src = tgUser.photo_url;
        document.getElementById('userAvatar').classList.remove('hidden');
        document.getElementById('defaultAvatarIcon').classList.add('hidden');
    }

    try {
        // طلب البيانات الأساسية
        const res = await fetch(`${API_URL}/api/miniapp/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegram_id: tgUser.id, first_name: tgUser.first_name, username: tgUser.username })
        });
        const data = await res.json();
        if (data.user) {
            currentUser = data.user;
            updateUserUI(data.user);
            renderOrders(data.orders);
            renderDeposits(data.deposits);
        }
        
        // طلب المنتجات مع إعادة المحاولة (لأن Render قد يكون نائماً)
        fetchProducts();
        
    } catch (err) {
        console.error(err);
        showToast("تعذر الاتصال بالسيرفر، يرجى إعادة تحديث الصفحة");
        document.getElementById('homeCategories').innerHTML = `<div class="col-span-full text-center text-slate-400 py-4">تعذر التحميل. <button onclick="fetchProducts()" class="text-accent underline font-bold">إعادة المحاولة</button></div>`;
    }
});

async function fetchProducts() {
    document.getElementById('homeCategories').innerHTML = '<div class="col-span-full text-center text-slate-400 animate-pulse py-4">جاري تحميل الأقسام...</div>';
    try {
        const prodRes = await fetch(`${API_URL}/api/miniapp/products`);
        const prodData = await prodRes.json();
        categoriesData = prodData.categories;
        renderHomeCategories(categoriesData);
    } catch (err) {
        document.getElementById('homeCategories').innerHTML = `<div class="col-span-full text-center text-slate-400 py-4">تعذر تحميل الأقسام. <button onclick="fetchProducts()" class="text-accent underline font-bold">إعادة المحاولة</button></div>`;
    }
}

function updateUserUI(user) {
    document.getElementById('homeBalanceWrapper').innerHTML = `<span class="text-3xl text-slate-500">$</span>${user.balance.toFixed(2)}`;
    document.getElementById('profileBalance').innerText = `$${user.balance.toFixed(2)}`;
    document.getElementById('sanadIdText').innerText = "SN-" + user.id.toString().padStart(6, '0');
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

function openKycModal() {
    if (currentUser && currentUser.kyc_status === 'verified') {
        document.getElementById('kycForm').classList.add('hidden');
        document.getElementById('kycVerifiedView').classList.remove('hidden');
        document.getElementById('kycVerifiedName').innerText = currentUser.kyc_name || currentUser.first_name;
    } else {
        document.getElementById('kycForm').classList.remove('hidden');
        document.getElementById('kycVerifiedView').classList.add('hidden');
    }
    openModal('kycModal');
}

async function submitKYC() {
    const name = document.getElementById('kycName').value;
    const phone = document.getElementById('kycPhone').value;
    const gov = document.getElementById('kycGovernorate').value;
    const region = document.getElementById('kycRegion').value;
    const idFront = document.getElementById('kycIdFront').files[0];
    const selfie = document.getElementById('kycSelfie').files[0];

    if (!name || !phone || !gov || !region || !idFront || !selfie) {
        return showToast("يرجى تعبئة جميع الحقول ورفع الصور");
    }

    Swal.fire({ title: 'جاري رفع الطلب...', allowOutsideClick: false, background: '#1c1c1e', color: '#fff', didOpen: () => Swal.showLoading() });

    const readFile = (file) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });

    const frontBase64 = await readFile(idFront);
    const selfieBase64 = await readFile(selfie);

    try {
        const res = await fetch(`${API_URL}/api/miniapp/kyc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegram_id: tgUser.id, full_name: name, phone: phone,
                governorate: gov, region: region, id_front: frontBase64, selfie: selfieBase64
            })
        });
        const data = await res.json();
        
        if (data.success) {
            Swal.fire({ icon: 'success', title: 'تم الإرسال', text: data.message, background: '#1c1c1e', color: '#fff' });
            closeModal('kycModal');
            currentUser.kyc_status = 'pending';
            updateVerificationBadge('pending');
        } else {
            Swal.fire({ icon: 'error', title: 'خطأ', text: data.error, background: '#1c1c1e', color: '#fff' });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'خطأ', text: 'تعذر الاتصال بالسيرفر', background: '#1c1c1e', color: '#fff' });
    }
}

async function submitDeposit() {
    const amount = document.getElementById('depositAmount').value;
    const sender = document.getElementById('depositSender').value;
    const file = document.getElementById('depositImage').files[0];
    
    if (!amount || !sender || !file) return showToast("يرجى إكمال جميع البيانات");

    Swal.fire({ title: 'جاري رفع الإيصال...', allowOutsideClick: false, background: '#1c1c1e', color: '#fff', didOpen: () => Swal.showLoading() });

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        try {
            const res = await fetch(`${API_URL}/api/miniapp/deposit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegram_id: tgUser.id, amount: parseFloat(amount),
                    method: document.getElementById('depositTitle').innerText.replace('إتمام الإيداع - ', ''),
                    sender_name: sender, receipt_image: reader.result
                })
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire({ icon: 'success', title: 'تم الإرسال', text: data.message, background: '#1c1c1e', color: '#fff' });
                closeModal('depositModal');
            } else {
                Swal.fire({ icon: 'error', title: 'خطأ', text: data.error, background: '#1c1c1e', color: '#fff' });
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'فشل الاتصال', background: '#1c1c1e', color: '#fff' });
        }
    };
}

async function submitGameOrder() {
    const playerId = document.getElementById('gameInputField').value;
    if(!playerId) return showToast("يرجى إدخال البيانات المطلوبة");
    Swal.fire({ title: 'جاري الشراء...', allowOutsideClick: false, background: '#1c1c1e', color: '#fff', didOpen: () => Swal.showLoading() });
    try {
        const res = await fetch(`${API_URL}/api/miniapp/order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegram_id: tgUser.id, product_id: currentOrderContext.product.id, quantity: 1, delivery_data: playerId })
        });
        const data = await res.json();
        if (data.success) {
            Swal.fire({ icon: 'success', title: 'تم الشراء', text: 'تم إرسال طلبك بنجاح!', background: '#1c1c1e', color: '#fff' });
            closeModal('gameModal');
            currentUser.balance = data.new_balance;
            updateUserUI(currentUser);
        } else {
            Swal.fire({ icon: 'error', title: 'خطأ', text: data.error, background: '#1c1c1e', color: '#fff' });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'خطأ', text: 'تعذر الاتصال بالسيرفر', background: '#1c1c1e', color: '#fff' });
    }
}

function renderHomeCategories(categories) {
    const grid = document.getElementById('homeCategories');
    if(!categories || categories.length === 0) { grid.innerHTML = '<div class="col-span-full text-center text-slate-400 py-4">لا توجد أقسام حالياً</div>'; return; }
    grid.innerHTML = categories.map(cat => `
        <div onclick="openCategory(${cat.id})" class="bg-iosCard rounded-3xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bento-card border border-slate-800">
            <img src="${cat.image || 'https://via.placeholder.com/64'}" alt="${cat.name}" class="w-16 h-16 mb-2 object-cover rounded-xl shadow-lg">
            <span class="font-bold text-white text-sm">${cat.name}</span>
        </div>
    `).join('');
}

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

function openProductModal(productId) {
    let product = null;
    for (let cat of categoriesData) {
        product = cat.products.find(p => p.id === productId);
        if (product) break;
    }
    if (!product) return;
    currentOrderContext.product = product;
    document.getElementById('modalGameTitle').innerText = product.name;
    if(product.image) document.getElementById('modalGameImg').src = product.image;
    document.getElementById('gameInputField').placeholder = product.input_type === 'phone' ? 'رقم الهاتف' : 'ايدي الحساب';
    document.getElementById('gamePackagesList').innerHTML = `
        <label class="block cursor-pointer"><input type="radio" name="pkg" value="${product.price}" class="package-radio hidden" checked onchange="updateGamePrice(this.value)"><div class="border border-slate-700 bg-dark rounded-2xl p-4 flex justify-between items-center transition"><span class="font-bold text-white">${product.name}</span><span class="text-accent font-bold">$${product.price.toFixed(2)}</span></div></label>
    `;
    document.getElementById('gameTotal').innerText = `$${product.price.toFixed(2)}`;
    openModal('gameModal');
}

function renderOrders(orders) {
    const list = document.getElementById('ordersList');
    if(!orders || orders.length === 0) {
        list.innerHTML = `<div class="bg-iosCard rounded-3xl p-10 text-center text-slate-400 border border-slate-800"><i data-lucide="package-search" size="48" class="mx-auto mb-3 text-slate-600"></i>لا توجد لديك طلبات سابقة.</div>`;
    } else {
        list.innerHTML = orders.map(o => `
            <div class="bg-iosCard rounded-2xl p-4 flex justify-between items-center border border-slate-800">
                <div><div class="text-white font-bold text-sm mb-1">${o.order_number}</div><div class="text-xs text-slate-400">${o.product_name}</div></div>
                <div class="text-left"><div class="text-white font-bold" dir="ltr">$${o.total_price}</div><div class="text-[10px] px-2 py-0.5 rounded-full mt-1 ${o.status==='completed'?'bg-primary/20 text-primary':(o.status==='failed'?'bg-danger/20 text-danger':'bg-warning/20 text-warning')}">${o.status}</div></div>
            </div>
        `).join('');
    }
    lucide.createIcons();
}

function renderDeposits(deposits) {
    const list = document.getElementById('historyList');
    if(!deposits || deposits.length === 0) {
        list.innerHTML = `<div class="bg-iosCard rounded-2xl p-10 text-center text-slate-400 border border-slate-800"><i data-lucide="inbox" size="48" class="mx-auto mb-3 text-slate-600"></i>لا توجد إيداعات حالياً.</div>`;
    } else {
        list.innerHTML = deposits.map(d => `
            <div class="bg-iosCard rounded-2xl p-4 flex justify-between items-center border border-slate-800">
                <div><div class="text-white font-bold text-sm mb-1">${d.transaction_id}</div><div class="text-xs text-slate-400">${d.method}</div></div>
                <div class="text-left"><div class="text-white font-bold" dir="ltr">$${d.amount}</div><div class="text-[10px] px-2 py-0.5 rounded-full mt-1 ${d.status==='approved'?'bg-primary/20 text-primary':(d.status==='rejected'?'bg-danger/20 text-danger':'bg-warning/20 text-warning')}">${d.status}</div></div>
            </div>
        `).join('');
    }
    lucide.createIcons();
}

function switchTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(tab => { tab.classList.add('hidden'); tab.classList.remove('block'); });
    document.getElementById('tab-' + tabId)?.classList.replace('hidden', 'block');
    if (btnElement) {
        document.querySelectorAll('.nav-btn').forEach(btn => { btn.classList.remove('text-accent'); btn.classList.add('text-slate-500'); });
        btnElement.classList.remove('text-slate-500'); btnElement.classList.add('text-accent');
    }
}
function openModal(id) { const m = document.getElementById(id); const c = document.getElementById(id+'Content'); if(m&&c){m.classList.remove('hidden'); setTimeout(()=>c.classList.remove('translate-y-full'),50);} }
function closeModal(id) { const m = document.getElementById(id); const c = document.getElementById(id+'Content'); if(m&&c){c.classList.add('translate-y-full'); setTimeout(()=>m.classList.add('hidden'),300);} }
function selectPaymentMethod(name) { document.getElementById('depositTitle').innerText = `إتمام الإيداع - ${name}`; closeModal('paymentMethodsModal'); setTimeout(()=>openModal('depositModal'),300); }
function previewDepositImage(input) { if(input.files&&input.files[0]){const r=new FileReader();r.onload=e=>{const p=document.getElementById('depositImagePreview');p.src=e.target.result;p.classList.remove('hidden');};r.readAsDataURL(input.files[0]);} }
function showToast(msg) { Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: msg, showConfirmButton: false, timer: 2500, background: '#1c1c1e', color: '#fff' }); }
function openFeatureModal(featureName) { document.getElementById('featureTitle').innerText = featureName; openModal('featureModal'); }
function handleLogout() { if(tg) tg.close(); }
function copySanadId() { navigator.clipboard.writeText(document.getElementById('sanadIdText').innerText).then(() => showToast('تم نسخ المعرف')); }
function updateGamePrice(price) { document.getElementById('gameTotal').innerText = `$${parseFloat(price).toFixed(2)}`; }
