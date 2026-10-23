/* ============================================================
   SANAD PLUS+ — Secure Core Engine (DEBUG MODE)
   ============================================================ */

const tg = window.Telegram?.WebApp;
const API_BASE = 'https://sanad-plus-backend.onrender.com';

let authToken = null;
let userData = null;
let categoriesData = [];
let currentPage = 'home';

document.addEventListener('DOMContentLoaded', async () => {
    if (tg) {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#000000');
        if (tg.colorScheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        }
        tg.BackButton.onClick(() => navigate('home'));
    }

    try {
        console.log("Starting authentication...");
        await authenticate();
        console.log("Authentication success. Loading data...");
        await loadInitialData();
        console.log("Data loaded. Showing app.");
        showApp();
    } catch (error) {
        console.error("Init Error:", error);
        // عرض الخطأ على الشاشة بوضوح
        if (tg) tg.showAlert(`خطأ: ${error.message}`);
        document.body.innerHTML = `<div style="text-align:center; padding:50px; color:white; background:black; height:100vh;">
            <h2 style="color:red;">تعذر الاتصال</h2>
            <p>${error.message}</p>
            <button onclick="location.reload()" style="margin-top:20px; padding:10px 20px; background:#0A84FF; color:white; border:none; border-radius:10px;">إعادة المحاولة</button>
        </div>`;
    }
});

async function authenticate() {
    const initData = tg?.initData;
    if (!initData) {
        throw new Error("لم يتم العثور على بيانات تيليجرام (initData). هل فتحت التطبيق من تيليجرام؟");
    }

    const res = await fetch(`${API_BASE}/api/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData })
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`رد السيرفر: ${res.status} - ${errText.substring(0, 100)}`);
    }

    const data = await res.json();
    if (!data.access_token) {
        throw new Error("السيرفر لم يُرجع رمز الدخول (Token).");
    }
    authToken = data.access_token;
    userData = data.user;
}

async function loadInitialData() {
    const catRes = await fetch(`${API_BASE}/api/categories/`);
    if (!catRes.ok) throw new Error("فشل جلب الأقسام");
    categoriesData = await catRes.json();
    
    const prodRes = await fetch(`${API_BASE}/api/products/`);
    if (!prodRes.ok) throw new Error("فشل جلب المنتجات");
    const products = await prodRes.json();
    
    categoriesData.forEach(cat => {
        cat.products = products.filter(p => p.category_id === cat.id);
    });
}

// ... بقية الدوال (showApp, renderCategories, navigate, إلخ) كما هي بدون تغيير ...
function showApp() {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('userName').textContent = userData.first_name || 'المستخدم';
    document.getElementById('userAvatar').textContent = (userData.first_name || 'S')[0];
    document.getElementById('profileName').textContent = userData.first_name;
    document.getElementById('profileId').textContent = `ID: ${userData.telegram_id}`;
    updateBalances(userData.balance);
    renderCategories();
}

function updateBalances(balance) {
    const formatted = `$${parseFloat(balance).toFixed(2)}`;
    document.getElementById('headerBalance').textContent = formatted;
    document.getElementById('mainBalance').textContent = formatted;
    document.getElementById('profileBalance').textContent = formatted;
}

function renderCategories() {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '';
    categoriesData.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.onclick = () => showCategoryProducts(cat);
        const img = document.createElement('img');
        img.className = 'category-image';
        img.src = cat.image || 'https://via.placeholder.com/50';
        const name = document.createElement('div');
        name.className = 'category-name';
        name.textContent = cat.name;
        card.appendChild(img);
        card.appendChild(name);
        grid.appendChild(card);
    });
}

function showCategoryProducts(category) {
    if (tg) tg.HapticFeedback.impactOccurred('light');
    document.getElementById('categoriesGrid').style.display = 'none';
    const title = document.getElementById('productsSectionTitle');
    title.style.display = 'block';
    title.textContent = category.name;
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';

    if (!category.products || category.products.length === 0) {
        grid.textContent = "لا توجد منتجات في هذا القسم.";
        return;
    }

    category.products.forEach(prod => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => openProduct(prod);
        const img = document.createElement('img');
        img.className = 'product-image';
        img.src = prod.image || 'https://via.placeholder.com/60';
        const name = document.createElement('div');
        name.className = 'product-name';
        name.textContent = prod.name;
        const price = document.createElement('div');
        price.className = 'product-price';
        price.textContent = `$${parseFloat(prod.base_price).toFixed(2)}`;
        card.appendChild(img);
        card.appendChild(name);
        card.appendChild(price);
        grid.appendChild(card);
    });
}

function navigate(page) {
    if (tg) tg.HapticFeedback.selectionChanged();
    currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === page);
    });
    if (page !== 'home') {
        if (tg) tg.BackButton.show();
    } else {
        if (tg) tg.BackButton.hide();
        document.getElementById('categoriesGrid').style.display = 'grid';
        document.getElementById('productsSectionTitle').style.display = 'none';
        document.getElementById('productsGrid').innerHTML = '';
    }
}

function openProduct(prod) {
    if (tg) tg.HapticFeedback.impactOccurred('medium');
    tg.showAlert(`اخترت: ${prod.name}\nالسعر: $${prod.base_price}`);
}
