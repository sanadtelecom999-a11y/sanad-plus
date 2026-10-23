const tg = window.Telegram?.WebApp;
const API_BASE = 'https://sanad-plus-backend.onrender.com';
let authToken = null;
let userData = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (tg) {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#000000');
        tg.BackButton.onClick(() => navigate('home'));
    }

    try {
        // محاولة الاتصال بالسيرفر (مع وقت مستقطع لتجنب التعليق)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 ثواني كحد أقصى

        const initData = tg?.initData;
        if (!initData) {
            // للتجربة فقط إذا لم يفتح من تيليجرام
            console.warn("No initData found. Using mock data for preview.");
            userData = { first_name: "مستخدم تجريبي", telegram_id: 123456789, balance: 150.50 };
            showApp();
            return;
        }

        const res = await fetch(`${API_BASE}/api/auth/telegram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error("فشل الاتصال");
        
        const data = await res.json();
        authToken = data.access_token;
        userData = data.user;
        
        showApp();
    } catch (error) {
        console.error(error);
        // إذا كان السيرفر لا يستجيب (لأنه يعيد التشغيل)، نعرض الواجهة ببيانات تجريبية لكي ترى التصميم
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        
        // إظهار البيانات التجريبية
        userData = { first_name: "المطور", telegram_id: 1000001, balance: 0.00 };
        showApp();

        if (tg) {
            tg.showAlert("تنبيه: تعذر الاتصال بالسيرفر حالياً. يتم عرض واجهة المعاينة.");
        }
    }
});

function showApp() {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    
    // تعبئة البيانات
    document.getElementById('userName').textContent = userData.first_name || 'مستخدم';
    document.getElementById('userAvatar').textContent = (userData.first_name || 'S')[0];
    document.getElementById('profileName').textContent = userData.first_name || 'مستخدم';
    document.getElementById('profileAvatar').textContent = (userData.first_name || 'S')[0];
    
    const sanadId = `SN-${String(userData.telegram_id).slice(-6)}`;
    document.getElementById('profileSanadId').textContent = sanadId;
    document.getElementById('userSanadId').textContent = sanadId;

    const balance = `$${parseFloat(userData.balance).toFixed(2)}`;
    document.getElementById('mainBalance').textContent = balance;

    renderCategories();
}

// بيانات تجريبية للأقسام (لتعمل الواجهة حتى بدون سيرفر)
function renderCategories() {
    const grid = document.getElementById('categoriesGrid');
    const mockCategories = [
        { name: 'ببجي موبايل', img: 'https://cdn-icons-png.flaticon.com/512/588/588257.png' },
        { name: 'فري فاير', img: 'https://cdn-icons-png.flaticon.com/512/588/588283.png' },
        { name: 'تطبيقات', img: 'https://cdn-icons-png.flaticon.com/512/2889/2889322.png' },
        { name: 'رصيد سوري', img: 'https://cdn-icons-png.flaticon.com/512/2489/2489756.png' }
    ];

    grid.innerHTML = '';
    mockCategories.forEach(cat => {
        const el = document.createElement('div');
        el.className = 'category-item';
        
        const img = document.createElement('img');
        img.src = cat.img;
        
        const span = document.createElement('span');
        span.textContent = cat.name; // آمن ضد XSS
        
        el.appendChild(img);
        el.appendChild(span);
        grid.appendChild(el);
    });
}

function navigate(page) {
    if (tg) tg.HapticFeedback.selectionChanged();
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });

    if (page !== 'home') {
        if (tg) tg.BackButton.show();
    } else {
        if (tg) tg.BackButton.hide();
    }
}

function openDepositSheet() {
    if (tg) tg.HapticFeedback.impactOccurred('light');
    document.getElementById('sheetOverlay').classList.add('active');
    document.getElementById('depositSheet').classList.add('active');
}

function closeDepositSheet() {
    document.getElementById('sheetOverlay').classList.remove('active');
    document.getElementById('depositSheet').classList.remove('active');
}

function copySanadId() {
    const id = document.getElementById('profileSanadId').textContent;
    navigator.clipboard.writeText(id);
    if (tg) tg.HapticFeedback.notificationOccurred('success');
}
