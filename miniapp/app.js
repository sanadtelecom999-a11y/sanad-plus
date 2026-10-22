// ==========================================
// SANAD PLUS+ MiniApp (Real Data Integration)
// ==========================================

const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor("#000000");
}

const API_URL = 'https://sanad-plus-backend.onrender.com';
const tgUser = tg?.initDataUnsafe?.user;

// دالة جلب بيانات المستخدم من تليجرام (للبدء)
document.addEventListener('DOMContentLoaded', () => {
    if (tgUser) {
        // 1. تحديث الاسم
        const fullName = tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : '');
        document.getElementById('greetingText').innerText = `مرحباً، ${tgUser.first_name} 👋`;
        document.getElementById('profileName').innerText = fullName;
        
        // 2. تحديث اليوزر
        if (tgUser.username) {
            document.getElementById('profileUsername').innerText = `@${tgUser.username}`;
        } else {
            document.getElementById('profileUsername').innerText = "";
        }

        // 3. تحديث الصورة الشخصية
        if (tgUser.photo_url) {
            const avatarImg = document.getElementById('userAvatar');
            const defaultIcon = document.getElementById('defaultAvatarIcon');
            avatarImg.src = tgUser.photo_url;
            avatarImg.classList.remove('hidden');
            defaultIcon.classList.add('hidden');
        }

        // 4. تحديث الآيدي والمعرف
        document.getElementById('profileTelegramId').innerText = `Telegram: ${tgUser.id}`;
        
        // توليد Sanad ID تجريبي بناءً على الآيدي (لاحقاً سيجلب من السيرفر)
        const sanadId = "SN-" + tgUser.id.toString().slice(-6);
        document.getElementById('sanadIdText').innerText = sanadId;
    }
    
    // إضافة علامة التوثيق (Twitter Style)
    // في الواقع، ستجلب هذه الحالة من الـ API (kyc_status)
    // هنا نفترض أنه غير موثق كمثال
    updateVerificationBadge('unverified'); 
});

// دالة إضافة علامة التوثيق
function updateVerificationBadge(status) {
    const badgeContainer = document.getElementById('verificationBadge');
    badgeContainer.classList.remove('hidden');
    
    if (status === 'verified') {
        // علامة صح خضراء (تويتر)
        badgeContainer.innerHTML = `
            <svg class="w-6 h-6 text-[#1d9bf0]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.79-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.75 2.73 1.867 3.45-.103.36-.16.74-.16 1.13 0 2.21 1.71 3.998 3.918 3.998.47 0 .92-.084 1.336-.25C9.184 21.585 10.49 22.5 12 22.5s2.816-.917 3.337-2.25c.416.165.866.25 1.336.25 2.21 0 3.918-1.79 3.918-4 0-.39-.057-.77-.16-1.13 1.117-.72 1.867-1.99 1.867-3.45z"></path>
                <path fill="white" d="M10.515 16.957l-3.32-3.32 1.414-1.414 1.906 1.906 4.95-4.95 1.414 1.414-6.364 6.364z"></path>
            </svg>
        `;
        // إضافة توهج للاسم
        document.getElementById('profileName').classList.add('text-white');
    } else {
        // علامة خطأ حمراء (غير موثق)
        badgeContainer.innerHTML = `
            <div class="bg-danger/20 rounded-full p-1 flex items-center justify-center">
                <i data-lucide="alert-circle" class="text-danger" size="18"></i>
            </div>
        `;
        lucide.createIcons();
    }
}

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
    // سيتم جلب المنتجات الحقيقية من السيرفر هنا لاحقاً
    const grid = document.getElementById('categoryProductsGrid');
    grid.innerHTML = '<div class="col-span-full text-center text-slate-400 p-10">جاري جلب المنتجات من السيرفر...</div>';
    document.getElementById('categoryView').classList.add('active');
}
function closeCategoryView() { document.getElementById('categoryView').classList.remove('active'); }

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

function selectPaymentMethod(methodName) {
    document.getElementById('depositTitle').innerText = `إتمام الإيداع - ${methodName}`;
    // باقي الكود كما هو...
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
    buttons.forEach(btn => { btn.classList.remove('active'); });
    btnElement.classList.add('active');
    // في الواقع، سيتم طلب البيانات من السيرفر بناءً على status هنا
}

function updateGamePrice(price) { document.getElementById('gameTotal').innerText = `$${parseFloat(price).toFixed(2)}`; }

function submitOrder(type) {
    // هذا الجزء سيتم ربطه بالـ API الحقيقي لاحقاً
    Swal.fire({ 
        title: 'جاري المعالجة...', 
        text: `سيتم ربط هذا الإجراء بالسيرفر قريباً جداً`,
        icon: 'info',
        background: '#1c1c1e', 
        color: '#fff' 
    });
}

function handleLogout() {
    if(tg) tg.close();
}
