/* ============================================================
   SANAD PLUS+ — Real Data Engine (No Mockups)
   ============================================================ */

const tg = window.Telegram?.WebApp;
const API_BASE = 'https://sanad-plus-backend.onrender.com';

let authToken = null;
let userData = null;
let categoriesData = [];
let productsData = [];

// ════════════════════════════════════════════════════════════
// 1. Init & Auth
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    if (tg) {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#000000');
        tg.BackButton.onClick(() => navigate('home'));
    }

    try {
        await authenticate();
        await loadInitialData();
        showApp();
    } catch (error) {
        console.error("Init Error:", error);
        if (tg) tg.showAlert(`تعذر الاتصال:\n${error.message}`);
        // إذا فشل الاتصال، نعرض الواجهة فارغة بدلاً من التعليق
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        document.getElementById('userName').textContent = "خطأ في الاتصال";
    }
});

async function authenticate() {
    const initData = tg?.initData;
    if (!initData) throw new Error("يرجى فتح التطبيق من داخل تيليجرام");

    const res = await fetch(`${API_BASE}/api/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData })
    });

    if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        throw new Error(err.error || `خطأ في السيرفر: ${res.status}`);
    }

    const data = await res.json();
    authToken = data.access_token;
    userData = data.user;
}

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
    };
}

// ════════════════════════════════════════════════════════════
// 2. Data Fetching
// ════════════════════════════════════════════════════════════
async function loadInitialData() {
    const [catRes, prodRes] = await Promise.all([
        fetch(`${API_BASE}/api/categories/`),
        fetch(`${API_BASE}/api/products/`)
    ]);

    if (catRes.ok) categoriesData = await catRes.json();
    if (prodRes.ok) productsData = await prodRes.json();
}

// ════════════════════════════════════════════════════════════
// 3. UI Rendering
// ════════════════════════════════════════════════════════════
function showApp() {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    
    // تعبئة بيانات المستخدم
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

function renderCategories() {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '';

    if (!categoriesData || categoriesData.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column: span 2;">لا توجد أقسام حالياً</div>';
        return;
    }

    categoriesData.forEach(cat => {
        const el = document.createElement('div');
        el.className = 'category-item';
        el.onclick = () => alert(`عرض منتجات: ${cat.name}`);
        
        const img = document.createElement('img');
        img.src = cat.image || 'https://via.placeholder.com/60';
        
        const span = document.createElement('span');
        span.textContent = cat.name;
        
        el.appendChild(img);
        el.appendChild(span);
        grid.appendChild(el);
    });
}

// ════════════════════════════════════════════════════════════
// 4. Navigation & Pages Loading
// ════════════════════════════════════════════════════════════
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

    // جلب البيانات عند فتح الصفحة
    if (page === 'orders') loadOrders();
    if (page === 'deposits') loadDeposits();
    if (page === 'support') loadSupportTickets();
}

// ════════════════════════════════════════════════════════════
// 5. Orders & Deposits Logic
// ════════════════════════════════════════════════════════════
async function loadOrders() {
    const list = document.getElementById('ordersList');
    list.innerHTML = '<div class="empty-state"><p>جاري التحميل...</p></div>';
    
    try {
        const res = await fetch(`${API_BASE}/api/orders/`, { headers: getHeaders() });
        if (!res.ok) throw new Error("فشل الجلب");
        const orders = await res.json();
        
        document.getElementById('statOrdersCount').textContent = orders.length;
        list.innerHTML = '';

        if (orders.length === 0) {
            list.innerHTML = '<div class="empty-state"><i data-lucide="package-open" size="48"></i><p>لا توجد طلبات</p></div>';
            lucide.createIcons();
            return;
        }

        orders.forEach(o => {
            const card = document.createElement('div');
            card.className = 'list-card';
            
            const header = document.createElement('div');
            header.className = 'list-card-header';
            
            const id = document.createElement('span');
            id.textContent = o.order_number;
            
            const status = document.createElement('span');
            status.textContent = o.status === 'completed' ? 'مكتمل' : o.status === 'pending' ? 'معلق' : 'ملغي';
            status.className = o.status === 'completed' ? 'text-success' : o.status === 'pending' ? 'text-warning' : 'text-danger';
            
            header.appendChild(id);
            header.appendChild(status);
            
            const body = document.createElement('div');
            body.className = 'list-card-body';
            body.innerHTML = `<span>${o.product_name}</span><span>$${parseFloat(o.total_price).toFixed(2)}</span>`;
            
            card.appendChild(header);
            card.appendChild(body);
            list.appendChild(card);
        });
    } catch (e) {
        list.innerHTML = '<div class="empty-state"><p>تعذر تحميل الطلبات</p></div>';
    }
}

async function loadDeposits() {
    const list = document.getElementById('depositsList');
    list.innerHTML = '<div class="empty-state"><p>جاري التحميل...</p></div>';
    
    try {
        const res = await fetch(`${API_BASE}/api/deposits/`, { headers: getHeaders() });
        if (!res.ok) throw new Error("فشل الجلب");
        const deposits = await res.json();
        
        document.getElementById('statDepositsCount').textContent = deposits.length;
        list.innerHTML = '';

        if (deposits.length === 0) {
            list.innerHTML = '<div class="empty-state"><i data-lucide="wallet" size="48"></i><p>لا توجد إيداعات</p></div>';
            lucide.createIcons();
            return;
        }

        deposits.forEach(d => {
            const card = document.createElement('div');
            card.className = 'list-card';
            
            const header = document.createElement('div');
            header.className = 'list-card-header';
            
            const id = document.createElement('span');
            id.textContent = d.transaction_id;
            
            const status = document.createElement('span');
            status.textContent = d.status === 'approved' ? 'مقبول' : d.status === 'pending' ? 'معلق' : 'مرفوض';
            status.className = d.status === 'approved' ? 'text-success' : d.status === 'pending' ? 'text-warning' : 'text-danger';
            
            header.appendChild(id);
            header.appendChild(status);
            
            const body = document.createElement('div');
            body.className = 'list-card-body';
            body.innerHTML = `<span>${d.method}</span><span>$${parseFloat(d.amount).toFixed(2)}</span>`;
            
            card.appendChild(header);
            card.appendChild(body);
            list.appendChild(card);
        });
    } catch (e) {
        list.innerHTML = '<div class="empty-state"><p>تعذر تحميل الإيداعات</p></div>';
    }
}

// ════════════════════════════════════════════════════════════
// 6. Support Chat Logic
// ════════════════════════════════════════════════════════════
async function loadSupportTickets() {
    const container = document.getElementById('chatContainer');
    container.innerHTML = '<p class="text-muted" style="text-align:center;">جاري التحميل...</p>';
    
    try {
        const res = await fetch(`${API_BASE}/api/support`, { headers: getHeaders() });
        if (!res.ok) throw new Error("فشل الجلب");
        const tickets = await res.json();
        
        container.innerHTML = '';
        
        if (tickets.length === 0) {
            container.innerHTML = '<div class="empty-state"><i data-lucide="message-circle" size="48"></i><p>مرحباً بك، كيف يمكننا مساعدتك؟</p></div>';
            lucide.createIcons();
            return;
        }

        // ترتيب الرسائل من الأقدم للأحدث
        tickets.reverse().forEach(t => {
            // 1. رسالة المستخدم
            const userBubble = document.createElement('div');
            userBubble.className = 'chat-bubble user';
            userBubble.innerHTML = `
                <span class="chat-sender">أنت</span>
                <span>${escapeHTML(t.message)}</span>
                <span class="chat-time">${new Date(t.date).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>
            `;
            container.appendChild(userBubble);

            // 2. رد الإدارة (إذا وجد)
            if (t.reply) {
                const adminBubble = document.createElement('div');
                adminBubble.className = 'chat-bubble admin';
                adminBubble.innerHTML = `
                    <span class="chat-sender">إدارة سند بلس</span>
                    <span>${escapeHTML(t.reply)}</span>
                    <span class="chat-time">${new Date(t.date).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>
                `;
                container.appendChild(adminBubble);
            }
        });
        
        // التمرير للأسفل
        window.scrollTo(0, document.body.scrollHeight);

    } catch (e) {
        container.innerHTML = '<p class="text-danger" style="text-align:center;">تعذر تحميل المحادثات</p>';
    }
}

async function sendSupportMessage() {
    const input = document.getElementById('supportInput');
    const btn = document.getElementById('sendBtn');
    const msg = input.value.trim();
    
    if (!msg) return;
    
    input.value = '';
    btn.disabled = true;
    if (tg) tg.HapticFeedback.impactOccurred('light');

    // إضافة الرسالة فوراً (Optimistic UI)
    const container = document.getElementById('chatContainer');
    if (container.querySelector('.empty-state')) container.innerHTML = '';
    
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user';
    userBubble.innerHTML = `
        <span class="chat-sender">أنت</span>
        <span>${escapeHTML(msg)}</span>
        <span class="chat-time">الآن</span>
    `;
    container.appendChild(userBubble);
    window.scrollTo(0, document.body.scrollHeight);

    try {
        const res = await fetch(`${API_BASE}/api/support`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ message: msg })
        });

        if (!res.ok) throw new Error("فشل الإرسال");
        
        // نجاح
        if (tg) tg.HapticFeedback.notificationOccurred('success');
        
    } catch (e) {
        if (tg) tg.showAlert("تعذر إرسال الرسالة، تحقق من اتصالك.");
    } finally {
        btn.disabled = false;
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(s) {
        return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[s];
    });
}

// ════════════════════════════════════════════════════════════
// 7. Utils & Bottom Sheet
// ════════════════════════════════════════════════════════════
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
