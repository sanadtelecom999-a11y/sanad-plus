// Initialize Telegram WebApp
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor("#000000");
}

// ==========================================
// SANAD PLUS+ MiniApp (Full Logic V6 - Multi-Currency)
// ==========================================

const CATEGORIES_DATA = {
    games: { title: 'الألعاب', items: [{ id: 'pubg', name: 'PUBG Mobile', img: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/44/PlayerUnknown%27s_Battlegrounds_Mobile_Logo.png/220px-PlayerUnknown%27s_Battlegrounds_Mobile_Logo.png' }, { id: 'freefire', name: 'Free Fire', img: 'https://play-lh.googleusercontent.com/4N3Xk2H1qU7q6vXq3Oq3Oq3Oq3Oq3Oq3Oq3Oq3Oq3Oq3Oq3Oq3Oq3Oq3Oq3' }] },
    apps: { title: 'التطبيقات', items: [{ id: 'xena', name: 'Xena Live', img: 'https://play-lh.googleusercontent.com/1Q4Xk2H1qU7q6vXq3Oq3Oq3Oq3Oq3Oq3Oq3Oq3Oq3Oq3Oq3Oq3Oq3Oq3Oq3' }] },
    balances: { title: 'الأرصدة', items: [{ id: 'syriatel', name: 'سيرياتيل', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Syriatel_Logo.png/200px-Syriatel_Logo.png' }] }
};

let currentDepositCurrency = 'USD'; // USD أو SYP

document.addEventListener('DOMContentLoaded', () => {
    const hour = new Date().getHours();
    let greeting = (hour >= 5 && hour < 12) ? "صباح الخير" : "مساء الخير";
    document.getElementById('greetingText').innerText = `${greeting}، سند 👋`;

    const sanadId = "SN-" + Math.floor(100000 + Math.random() * 900000);
    document.getElementById('sanadIdText').innerText = sanadId;
});

function switchTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(tab => { tab.classList.add('hidden'); tab.classList.remove('block'); });
    const target = document.getElementById('tab-' + tabId);
    if (target) { target.classList.remove('hidden'); target.classList.add('block'); }
    
    if (btnElement) {
        document.querySelectorAll('.nav-btn').forEach(btn => { btn.classList.remove('text-accent'); btn.classList.add('text-slate-500'); });
        btnElement.classList.remove('text-slate-500'); btnElement.classList.add('text-accent');
    }
}

function openCategory(categoryId) {
    const category = CATEGORIES_DATA[categoryId];
    if(!category) return;
    document.getElementById('categoryTitle').innerText = category.title;
    const grid = document.getElementById('categoryProductsGrid');
    grid.innerHTML = category.items.map(item => `
        <div onclick="handleProductClick('${categoryId}', '${item.name}')" class="bg-iosCard rounded-3xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bento-card border border-slate-800">
            <img src="${item.img}" onerror="this.src='https://via.placeholder.com/80'" class="w-16 h-16 rounded-xl mb-3 object-cover shadow-lg">
            <span class="font-bold text-white text-sm">${item.name}</span>
        </div>
    `).join('');
    document.getElementById('categoryView').classList.add('active');
}

function closeCategoryView() { document.getElementById('categoryView').classList.remove('active'); }

function handleProductClick(categoryId, productName) {
    if (categoryId === 'games') { document.getElementById('modalGameTitle').innerText = productName; openModal('gameModal'); } 
    else if (categoryId === 'apps') { openFeatureModal(productName + ' (تطبيق)'); } 
    else if (categoryId === 'balances') { openFeatureModal(productName + ' (رصيد)'); }
}

function openFeatureModal(featureName) { document.getElementById('featureTitle').innerText = featureName; openModal('featureModal'); }

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

// ================= Currency Logic =================
function selectPaymentMethod(methodName) {
    document.getElementById('depositTitle').innerText = `إتمام الإيداع - ${methodName}`;
    
    let min = 0, max = 500;
    let label = "المبلغ بالدولار";
    let placeholder = "0.00 - 500.00";

    if(methodName === 'شام كاش') {
        currentDepositCurrency = 'USD';
        min = 0; max = 500;
        label = "المبلغ بالدولار ($)";
        placeholder = "0.00 - 500.00";
        document.getElementById('sypPreview').classList.add('hidden');
    } 
    else if(methodName === 'MTN كاش') {
        currentDepositCurrency = 'SYP';
        min = 1000; max = 100000; // ليرة سورية
        label = "المبلغ بالليرة السورية (ل.س)";
        placeholder = "1000 - 100000";
        document.getElementById('sypPreview').classList.remove('hidden');
        document.getElementById('usdEquivalent').innerText = "$0.00";
    }

    document.getElementById('depositMinLimit').innerText = currentDepositCurrency === 'USD' ? `$${min.toFixed(2)}` : `${min} ل.س`;
    document.getElementById('depositMaxLimit').innerText = currentDepositCurrency === 'USD' ? `$${max.toFixed(2)}` : `${max} ل.س`;
    
    document.getElementById('depositAmountLabel').innerText = label;
    document.getElementById('depositAmount').placeholder = placeholder;
    document.getElementById('depositAmount').value = ''; // تصفير الحقل

    closeModal('paymentMethodsModal');
    setTimeout(() => { openModal('depositModal'); }, 300);
}

// حساب التحويل عند الكتابة (لـ MTN فقط)
document.getElementById('depositAmount')?.addEventListener('input', function(e) {
    if(currentDepositCurrency === 'SYP') {
        const syp = parseFloat(e.target.value) || 0;
        const rate = 135; // سعر الصرف
        document.getElementById('usdEquivalent').innerText = `$${(syp / rate).toFixed(2)}`;
    }
});

// ================= Other Functions =================
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
    navigator.clipboard.writeText(idText).then(() => { showToast('تم نسخ المعرف: ' + idText); });
}

function showToast(message) {
    Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: message, showConfirmButton: false, timer: 2500, background: '#1c1c1e', color: '#fff' });
}

function handleSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const items = document.querySelectorAll('.category-item');
    items.forEach(item => {
        const name = item.getAttribute('data-name');
        if(name.includes(query)) { item.style.display = 'flex'; } else { item.style.display = 'none'; }
    });
}

function filterHistory(btnElement, status) {
    const buttons = document.querySelectorAll('#historyFilters .filter-btn');
    buttons.forEach(btn => { btn.classList.remove('active'); btn.style.backgroundColor = ''; btn.style.color = ''; });
    btnElement.classList.add('active');

    const items = document.querySelectorAll('.history-item');
    items.forEach(item => {
        if (status === 'all' || item.dataset.status === status) { item.style.display = 'flex'; } else { item.style.display = 'none'; }
    });
}

function updateGamePrice(price) { document.getElementById('gameTotal').innerText = `$${parseFloat(price).toFixed(2)}`; }

function submitOrder(type) {
    if (type === 'إيداع') {
        const amount = document.getElementById('depositAmount').value;
        const sender = document.getElementById('depositSender').value;
        const image = document.getElementById('depositImage').files.length;
        
        if (!amount || !sender || image === 0) {
            return Swal.fire({icon: 'warning', title: 'تنبيه', text: 'يرجى إكمال جميع الحقول ورفع صورة الإيصال', background: '#1c1c1e', color: '#fff'});
        }

        // التحقق من الحدود
        const numAmount = parseFloat(amount);
        if (currentDepositCurrency === 'SYP') {
            if (numAmount < 1000 || numAmount > 100000) {
                return Swal.fire({icon: 'error', title: 'خطأ', text: 'المبلغ خارج الحدود المسموحة (1000 - 100000 ل.س)', background: '#1c1c1e', color: '#fff'});
            }
        } else {
            if (numAmount < 0 || numAmount > 500) {
                return Swal.fire({icon: 'error', title: 'خطأ', text: 'المبلغ خارج الحدود المسموحة (0 - 500$)', background: '#1c1c1e', color: '#fff'});
            }
        }
    }

    Swal.fire({ title: 'جاري المعالجة...', allowOutsideClick: false, background: '#1c1c1e', color: '#fff', didOpen: () => Swal.showLoading() });
    setTimeout(() => {
        Swal.fire({ icon: 'success', title: 'تم بنجاح', text: `تم إرسال طلب ${type} بنجاح (محاكاة)`, background: '#1c1c1e', color: '#fff' });
        
        if(type === 'إيداع') {
            document.getElementById('depositAmount').value = '';
            document.getElementById('depositSender').value = '';
            document.getElementById('depositImagePreview').classList.add('hidden');
        }

        document.querySelectorAll('.fixed.inset-0:not(.hidden)').forEach(m => {
            const content = m.querySelector('div[id$="Content"]');
            if(content) content.classList.add('translate-y-full');
            setTimeout(() => m.classList.add('hidden'), 300);
        });
    }, 1500);
}

function handleLogout() {
    Swal.fire({ title: 'تسجيل الخروج', text: "هل أنت متأكد؟", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#2c2c2e', confirmButtonText: 'نعم، خروج', cancelButtonText: 'إلغاء', background: '#1c1c1e', color: '#fff' })
    .then((result) => {
        if (result.isConfirmed) { Swal.fire({ title: 'تم الخروج', timer: 1000, showConfirmButton: false, background: '#1c1c1e', color: '#fff' }); }
    });
}

// ================= KYC Submit =================
function submitKYC() {
    const name = document.getElementById('kycName').value;
    const phone = document.getElementById('kycPhone').value;
    const gov = document.getElementById('kycGovernorate').value;
    const region = document.getElementById('kycRegion').value;
    const front = document.getElementById('kycIdFront').files.length;
    const selfie = document.getElementById('kycSelfie').files.length;

    if (!name || !phone || !gov || !region || front === 0 || selfie === 0) {
        return Swal.fire({icon: 'warning', title: 'بيانات ناقصة', text: 'يرجى تعبئة جميع الحقول ورفع الصور المطلوبة', background: '#1c1c1e', color: '#fff'});
    }

    Swal.fire({ title: 'جاري رفع الطلب...', allowOutsideClick: false, background: '#1c1c1e', color: '#fff', didOpen: () => Swal.showLoading() });
    setTimeout(() => {
        closeModal('kycModal');
        Swal.fire({ icon: 'success', title: 'تم الإرسال', text: 'تم إرسال طلب التوثيق بنجاح، سيتم مراجعته خلال 24 ساعة.', background: '#1c1c1e', color: '#fff' });
        
        // تصفير الحقول
        document.getElementById('kycName').value = '';
        document.getElementById('kycPhone').value = '';
        document.getElementById('kycRegion').value = '';
        document.getElementById('kycIdFront').value = '';
        document.getElementById('kycSelfie').value = '';
    }, 2000);
}
