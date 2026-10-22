const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor("#000000"); }

const API_URL = 'https://sanad-plus-backend.onrender.com';
const tgUser = tg?.initDataUnsafe?.user;
let currentUser = null;
let categoriesData = [];
let userOrders = [];
let userDeposits = [];

// دالة تنسيق التاريخ (أرقام إنجليزية)
function formatDate(dateStr) {
    if (!dateStr) return 'غير محدد';
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// دالة تنظيف بيانات الاستلام
function cleanDeliveryData(data) {
    if (!data) return 'غير محدد';
    // إذا كانت البيانات قديمة ومخزنة كـ JSON
    if (typeof data === 'string' && data.startsWith('{')) {
        try {
            const parsed = JSON.parse(data);
            // نبحث عن أي حقل يحتوي على ID أو رقم أو رابط
            return parsed.player_id || parsed.phone || parsed.link || parsed.account_id || parsed.id || data;
        } catch (e) {
            return data;
        }
    }
    return data;
}

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
        const res = await fetch(`${API_URL}/api/miniapp/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegram_id: tgUser.id, first_name: tgUser.first_name, username: tgUser.username })
        });
        const data = await res.json();
        if (data.user) {
            currentUser = data.user;
            userOrders = data.orders || [];
            userDeposits = data.deposits || [];
            updateUserUI(data.user);
            renderOrders('all');
            renderDeposits('all');
        }
        fetchProducts();
    } catch (err) {
        showToast("تعذر الاتصال بالسيرفر، يرجى إعادة تحديث الصفحة");
        document.getElementById('homeCategories').innerHTML = `<div class="col-span-full text-center text-slate-400 py-4">تعذر التحميل. <button onclick="window.location.reload()" class="text-accent underline font-bold">إعادة المحاولة</button></div>`;
    }
});

function copyToClipboard(text, btnElement) {
    navigator.clipboard.writeText(text).then(() => {
        const originalHtml = btnElement.innerHTML;
        btnElement.innerHTML = `<i data-lucide="check" class="text-primary" size="18"></i>`;
        lucide.createIcons();
        setTimeout(() => { btnElement.innerHTML = originalHtml; lucide.createIcons(); }, 2000);
    });
}

// ================= Orders Logic =================
function renderOrders(statusFilter = 'all') {
    const list = document.getElementById('ordersList');
    let filtered = statusFilter === 'all' ? userOrders : userOrders.filter(o => o.status === statusFilter);

    if(filtered.length === 0) {
        list.innerHTML = `<div class="bg-iosCard rounded-3xl p-10 text-center text-slate-400 border border-slate-800"><i data-lucide="package-search" size="48" class="mx-auto mb-3 text-slate-600"></i>لا توجد طلبات تطابق البحث.</div>`;
    } else {
        list.innerHTML = filtered.map(o => {
            let statusColor = o.status === 'completed' ? 'primary' : (o.status === 'failed' || o.status === 'rejected' ? 'danger' : 'warning');
            return `
            <div onclick="openOrderDetails(${o.id})" class="bg-iosCard rounded-2xl p-4 flex justify-between items-center border border-slate-800 bento-card cursor-pointer">
                <div class="flex items-center gap-3">
                    <img src="${o.product_image || 'https://via.placeholder.com/40'}" class="w-10 h-10 rounded-lg object-cover">
                    <div><div class="text-white font-bold text-sm mb-1">${o.product_name}</div><div class="text-xs text-slate-400">${o.order_number}</div></div>
                </div>
                <div class="text-left"><div class="text-white font-bold" dir="ltr">$${o.total_price.toFixed(2)}</div><div class="text-[10px] bg-${statusColor}/20 text-${statusColor} px-2 py-0.5 rounded-full mt-1">${o.status}</div></div>
            </div>`;
        }).join('');
    }
    lucide.createIcons();
}

function filterOrders(btn, status) {
    document.querySelectorAll('#ordersFilters .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderOrders(status);
}

function openOrderDetails(id) {
    const order = userOrders.find(o => o.id === id);
    if(!order) return;

    let statusColor = order.status === 'completed' ? 'primary' : (order.status === 'failed' || order.status === 'rejected' ? 'danger' : 'warning');
    let cleanData = cleanDeliveryData(order.delivery_data);
    let formattedDate = formatDate(order.created_at);
    
    // شريط الحالة (Timeline)
    let timelineHtml = `
        <div class="flex items-center justify-between w-full mt-6 relative px-4">
            <div class="absolute top-3 left-4 w-[calc(100%-2rem)] h-1 bg-slate-800 -z-10 rounded-full"></div>
            <div class="flex flex-col items-center gap-1 z-10">
                <div class="w-6 h-6 rounded-full ${order.status !== 'failed' ? 'bg-primary' : 'bg-slate-700'} flex items-center justify-center border-2 border-dark"><i data-lucide="check" size="12" class="text-dark"></i></div>
                <span class="text-[10px] text-slate-400">معلق</span>
            </div>
            <div class="flex flex-col items-center gap-1 z-10">
                <div class="w-6 h-6 rounded-full ${order.status === 'completed' ? 'bg-primary' : (order.status === 'failed' ? 'bg-danger' : 'bg-slate-700')} flex items-center justify-center border-2 border-dark"><i data-lucide="clock" size="12" class="text-dark"></i></div>
                <span class="text-[10px] text-slate-400">معالجة</span>
            </div>
            <div class="flex flex-col items-center gap-1 z-10">
                <div class="w-6 h-6 rounded-full ${order.status === 'completed' ? 'bg-primary' : 'bg-slate-700'} flex items-center justify-center border-2 border-dark"><i data-lucide="star" size="12" class="text-dark"></i></div>
                <span class="text-[10px] text-slate-400">مكتمل</span>
            </div>
        </div>
    `;

    document.getElementById('orderDetailsBody').innerHTML = `
        <div class="flex justify-between items-center bg-dark p-4 rounded-xl border border-slate-800 mb-4">
            <span class="text-slate-400">رقم الطلب</span>
            <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-white">${order.order_number}</span>
                <button onclick="event.stopPropagation(); copyToClipboard('${order.order_number}', this)" class="text-slate-500 hover:text-white transition"><i data-lucide="copy" size="18"></i></button>
            </div>
        </div>
        <div class="flex items-center gap-3 bg-dark p-4 rounded-xl border border-slate-800 mb-4">
            <img src="${order.product_image || 'https://via.placeholder.com/40'}" class="w-12 h-12 rounded-lg">
            <div><div class="font-bold text-white">${order.product_name}</div><div class="text-xs text-slate-400">الكمية: ${order.quantity}</div></div>
        </div>
        <div class="flex justify-between items-center bg-dark p-4 rounded-xl border border-slate-800 mb-4">
            <span class="text-slate-400">بيانات الاستلام</span>
            <span class="font-mono font-bold text-accent" dir="ltr">${cleanData}</span>
        </div>
        <div class="flex justify-between items-center bg-dark p-4 rounded-xl border border-slate-800 mb-4">
            <span class="text-slate-400">التاريخ</span>
            <span class="text-slate-300" dir="ltr">${formattedDate}</span>
        </div>
        <div class="flex justify-between items-center bg-dark p-4 rounded-xl border border-slate-800 mb-4">
            <span class="text-slate-400">الإجمالي</span>
            <span class="font-bold text-primary text-lg" dir="ltr">$${order.total_price.toFixed(2)}</span>
        </div>
        ${timelineHtml}
    `;
    openModal('orderDetailsModal');
    lucide.createIcons();
}

// ================= Deposits Logic =================
function renderDeposits(statusFilter = 'all') {
    const list = document.getElementById('historyList');
    let filtered = statusFilter === 'all' ? userDeposits : userDeposits.filter(d => d.status === statusFilter);

    if(filtered.length === 0) {
        list.innerHTML = `<div class="bg-iosCard rounded-2xl p-10 text-center text-slate-400 border border-slate-800"><i data-lucide="inbox" size="48" class="mx-auto mb-3 text-slate-600"></i>لا توجد إيداعات تطابق البحث.</div>`;
    } else {
        list.innerHTML = filtered.map(d => {
            let statusColor = d.status === 'approved' ? 'primary' : (d.status === 'rejected' ? 'danger' : 'warning');
            return `
            <div onclick="openDepositDetails(${d.id})" class="bg-iosCard rounded-2xl p-4 flex justify-between items-center border border-slate-800 bento-card cursor-pointer">
                <div><div class="text-white font-bold text-sm mb-1">${d.transaction_id}</div><div class="text-xs text-slate-400">${d.method}</div></div>
                <div class="text-left"><div class="text-white font-bold" dir="ltr">$${d.amount.toFixed(2)}</div><div class="text-[10px] bg-${statusColor}/20 text-${statusColor} px-2 py-0.5 rounded-full mt-1">${d.status}</div></div>
            </div>`;
        }).join('');
    }
    lucide.createIcons();
}

function filterDeposits(btn, status) {
    document.querySelectorAll('#historyFilters .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderDeposits(status);
}

function openDepositDetails(id) {
    const dep = userDeposits.find(d => d.id === id);
    if(!dep) return;

    let statusColor = dep.status === 'approved' ? 'primary' : (dep.status === 'rejected' ? 'danger' : 'warning');
    let formattedDate = formatDate(dep.created_at);
    
    document.getElementById('depositDetailsBody').innerHTML = `
        <div class="flex justify-between items-center bg-dark p-4 rounded-xl border border-slate-800 mb-4">
            <span class="text-slate-400">رقم العملية</span>
            <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-white">${dep.transaction_id}</span>
                <button onclick="event.stopPropagation(); copyToClipboard('${dep.transaction_id}', this)" class="text-slate-500 hover:text-white transition"><i data-lucide="copy" size="18"></i></button>
            </div>
        </div>
        <div class="flex justify-between items-center bg-dark p-4 rounded-xl border border-slate-800 mb-4">
            <span class="text-slate-400">الطريقة</span><span class="font-bold text-white">${dep.method}</span>
        </div>
        <div class="flex justify-between items-center bg-dark p-4 rounded-xl border border-slate-800 mb-4">
            <span class="text-slate-400">اسم المرسل</span><span class="font-bold text-white">${dep.sender_name}</span>
        </div>
        ${dep.proof_image ? `<div class="bg-dark p-4 rounded-xl border border-slate-800 mb-4"><span class="text-slate-400 block mb-2">إثبات التحويل</span><img src="${dep.proof_image}" class="w-full rounded-lg object-contain max-h-48 bg-black cursor-pointer" onclick="window.open('${dep.proof_image}', '_blank')"></div>` : ''}
        <div class="flex justify-between items-center bg-dark p-4 rounded-xl border border-slate-800 mb-4">
            <span class="text-slate-400">التاريخ</span><span class="text-slate-300" dir="ltr">${formattedDate}</span>
        </div>
        <div class="flex justify-between items-center bg-dark p-4 rounded-xl border border-slate-800 mb-4">
            <span class="text-slate-400">المبلغ</span><span class="font-bold text-primary text-lg" dir="ltr">$${dep.amount.toFixed(2)}</span>
        </div>
        <div class="flex justify-between items-center bg-${statusColor}/10 p-4 rounded-xl border border-${statusColor}/30">
            <span class="text-slate-400">الحالة</span><span class="font-bold text-${statusColor} uppercase">${dep.status}</span>
        </div>
    `;
    openModal('depositDetailsModal');
    lucide.createIcons();
}

// الدوال المساعدة الأخرى
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
function openProductModal(productId) {
    let product = null;
    for (let cat of categoriesData) {
        product = cat.products.find(p => p.id === productId);
        if (product) break;
    }
    if (!product) return;
    document.getElementById('modalGameTitle').innerText = product.name;
    if(product.image) document.getElementById('modalGameImg').src = product.image;
    document.getElementById('gameInputField').placeholder = product.input_type === 'phone' ? 'رقم الهاتف' : 'ايدي الحساب';
    document.getElementById('gamePackagesList').innerHTML = `
        <label class="block cursor-pointer"><input type="radio" name="pkg" value="${product.price}" class="package-radio hidden" checked onchange="updateGamePrice(this.value)"><div class="border border-slate-700 bg-dark rounded-2xl p-4 flex justify-between items-center transition"><span class="font-bold text-white">${product.name}</span><span class="text-accent font-bold">$${product.price.toFixed(2)}</span></div></label>
    `;
    document.getElementById('gameTotal').innerText = `$${product.price.toFixed(2)}`;
    openModal('gameModal');
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
function showToast(msg) { Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: msg, showConfirmButton: false, timer: 2500, background: '#1c1c1e', color: '#fff' }); }
function handleLogout() { if(tg) tg.close(); }
function copySanadId() { navigator.clipboard.writeText(document.getElementById('sanadIdText').innerText).then(() => showToast('تم نسخ المعرف')); }
