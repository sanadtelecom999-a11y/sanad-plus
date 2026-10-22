const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor("#000000"); }

const API_URL = 'https://sanad-plus-backend.onrender.com';
const tgUser = tg?.initDataUnsafe?.user;
let currentUser = null;
let categoriesData = [];
let userOrders = [];
let userDeposits = [];
let currentOrderContext = { product: null, price: 0 };

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

// وظيفة النسخ الذكية
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
    
    // شريط الحالة (Timeline)
    let timelineHtml = `
        <div class="flex items-center justify-between w-full mt-4 relative">
            <div class="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 -translate-y-1/2 rounded-full"></div>
            <div class="flex flex-col items-center gap-1 z-10">
                <div class="w-6 h-6 rounded-full ${order.status !== 'failed' ? 'bg-primary' : 'bg-slate-700'} flex items-center justify-center"><i data-lucide="check" size="12" class="text-dark"></i></div>
                <span class="text-[10px] text-slate-400">معلق</span>
            </div>
            <div class="flex flex-col items-center gap-1 z-10">
                <div class="w-6 h-6 rounded-full ${order.status === 'completed' ? 'bg-primary' : (order.status === 'failed' ? 'bg-danger' : 'bg-slate-700')} flex items-center justify-center"><i data-lucide="clock" size="12" class="text-dark"></i></div>
                <span class="text-[10px] text-slate-400">معالجة</span>
            </div>
            <div class="flex flex-col items-center gap-1 z-10">
                <div class="w-6 h-6 rounded-full ${order.status === 'completed' ? 'bg-primary' : 'bg-slate-700'} flex items-center justify-center"><i data-lucide="star" size="12" class="text-dark"></i></div>
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
            <span class="font-mono font-bold text-accent" dir="ltr">${order.delivery_data}</span>
        </div>
        <div class="flex justify-between items-center bg-dark p-4 rounded-xl border border-slate-800 mb-4">
            <span class="text-slate-400">التاريخ</span>
            <span class="text-slate-300" dir="ltr">${new Date(order.created_at).toLocaleString('ar-EG')}</span>
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
            <span class="text-slate-400">التاريخ</span><span class="text-slate-300" dir="ltr">${new Date(dep.created_at).toLocaleString('ar-EG')}</span>
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

// (باقي الدوال المساعدة: updateUserUI, updateVerificationBadge, openKycModal, submitKYC, submitDeposit, submitGameOrder, renderHomeCategories, openCategory, openProductModal, switchTab, openModal, closeModal, selectPaymentMethod, previewDepositImage, showToast, openFeatureModal, handleLogout, copySanadId, updateGamePrice)
// قم بنسخها من الملف السابق أو اتركها كما هي إذا لم تمسح الملف بالكامل.
// (لقد قمت بتضمينها في الملف الكامل بالأعلى، يمكنك نسخ الملف بالكامل مرة أخرى)
