/* ============================================================
   SANAD PLUS+ — Real Data & iOS Interactions
   ============================================================ */

const tg = window.Telegram?.WebApp;
const API_BASE = 'https://sanad-plus-backend.onrender.com';

let authToken = null;
let userData = null;
let categoriesData = [];
let ordersData = [];
let depositsData = [];

// ════════════════════════════════════════════════════════════
// 1. Init & Auth
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    if (tg) {
        tg.ready();
        tg.expand();
        tg.disableVerticalSwipes();
        tg.setHeaderColor('#000000');
        tg.BackButton.onClick(() => navigate('home'));
        
        // ضبط الوضع الليلي بناءً على تيليجرام
        if (tg.colorScheme === 'light') {
            document.getElementById('darkModeToggle').checked = false;
            toggleDarkMode();
        }
    }

    try {
        await authenticate();
        await loadInitialData();
        showApp();
    } catch (error) {
        console.error("Init Error:", error);
        if (tg) tg.showAlert(`تعذر الاتصال:\n${error.message}`);
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
    
    const fullName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
    document.getElementById('profileName').textContent = fullName || 'مستخدم';
    document.getElementById('profileAvatar').textContent = (userData.first_name || 'S')[0];
    
    const username = userData.username ? `@${userData.username}` : 'لا يوجد معرف';
    document.getElementById('profileUsername').textContent = username;

    const sanadId = `SN-${String(userData.telegram_id).slice(-6)}`;
    document.getElementById('profileSanadId').textContent = sanadId;
    document.getElementById('userSanadId').textContent = sanadId;
    document.getElementById('profileTelegramId').textContent = `Telegram: ${userData.telegram_id}`;
    document.getElementById('referralCodeText').textContent = userData.referral_code || 'SANAD';

    // حالة KYC
    const isVerified = userData.is_verified || userData.kyc_status === 'verified';
    const kycBadge = document.getElementById('kycBadge');
    if (isVerified) {
        kycBadge.textContent = '✅';
        kycBadge.title = 'موثق';
    } else {
        kycBadge.textContent = '⚠️';
        kycBadge.title = 'غير موثق';
    }

    const balance = `$${parseFloat(userData.balance).toFixed(2)}`;
    document.getElementById('mainBalance').textContent = balance;
    document.getElementById('statBalance').textContent = balance;
    document.getElementById('statTotalDeposits').textContent = `$${parseFloat(userData.referral_earnings || 0).toFixed(2)}`; // Note: API returns referral_earnings not total deposits. We might need a backend fix later.

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
// 4. Navigation
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

    if (page === 'orders') loadOrders();
    if (page === 'deposits') loadDeposits();
    if (page === 'support') loadSupportTickets();
}

// ════════════════════════════════════════════════════════════
// 5. Orders Logic & Details
// ════════════════════════════════════════════════════════════
async function loadOrders() {
    const list = document.getElementById('ordersList');
    list.innerHTML = '<div class="empty-state"><p>جاري التحميل...</p></div>';
    
    try {
        const res = await fetch(`${API_BASE}/api/orders/`, { headers: getHeaders() });
        if (!res.ok) throw new Error("فشل الجلب");
        ordersData = await res.json();
        list.innerHTML = '';

        if (ordersData.length === 0) {
            list.innerHTML = '<div class="empty-state"><i data-lucide="package-open" size="48"></i><p>لا توجد طلبات</p></div>';
            lucide.createIcons();
            return;
        }

        ordersData.forEach(o => {
            const card = document.createElement('div');
            card.className = 'list-card';
            card.onclick = () => openOrderDetails(o.id);
            
            card.innerHTML = `
                <div class="list-card-header">
                    <span>${o.order_number}</span>
                    <span class="${o.status === 'completed' ? 'text-success' : o.status === 'pending' ? 'text-warning' : 'text-danger'}">
                        ${o.status === 'completed' ? 'مكتمل' : o.status === 'pending' ? 'معلق' : 'ملغي'}
                    </span>
                </div>
                <div class="list-card-body">
                    <span>${o.product_name}</span>
                    <span>$${parseFloat(o.total_price).toFixed(2)}</span>
                </div>
            `;
            list.appendChild(card);
        });
    } catch (e) {
        list.innerHTML = '<div class="empty-state"><p>تعذر تحميل الطلبات</p></div>';
    }
}

function openOrderDetails(orderId) {
    const order = ordersData.find(o => o.id === orderId);
    if (!order) return;

    let timelineHtml = '';
    if (order.status === 'failed' || order.status === 'cancelled') {
        timelineHtml = `
            <div class="timeline">
                <div class="timeline-step error active">
                    <div class="timeline-circle">✕</div>
                    <div class="timeline-text">فشل/ملغي</div>
                </div>
            </div>
        `;
    } else {
        const isPending = order.status === 'pending';
        const isProcessing = order.status === 'processing' || order.status === 'review';
        const isCompleted = order.status === 'completed';

        timelineHtml = `
            <div class="timeline">
                <div class="timeline-step ${isPending || isProcessing || isCompleted ? 'active' : ''}">
                    <div class="timeline-circle">1</div>
                    <div class="timeline-text">معلق</div>
                </div>
                <div class="timeline-step ${isProcessing || isCompleted ? 'active' : ''}">
                    <div class="timeline-circle">2</div>
                    <div class="timeline-text">معالجة</div>
                </div>
                <div class="timeline-step ${isCompleted ? 'success' : ''}">
                    <div class="timeline-circle">✓</div>
                    <div class="timeline-text">مكتمل</div>
                </div>
            </div>
        `;
    }

    const date = new Date(order.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });

    document.getElementById('orderDetailsContent').innerHTML = `
        <h3 class="text-center" style="margin-bottom: 20px;">تفاصيل الطلب</h3>
        <div class="detail-header">
            <div class="detail-title">${order.order_number} <i data-lucide="copy" onclick="copyText('${order.order_number}')"></i></div>
            <span class="${order.status === 'completed' ? 'text-success' : order.status === 'pending' ? 'text-warning' : 'text-danger'}">${order.status}</span>
        </div>
        
        <div class="detail-row">
            <span class="detail-label">المنتج</span>
            <span class="detail-value">${order.product_name}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">الكمية</span>
            <span class="detail-value">${order.quantity}</span>
        </div>
        
        ${order.delivery_data ? `
        <div class="detail-row">
            <span class="detail-label">بيانات الاستلام</span>
            <span class="detail-value text-primary" dir="ltr">${typeof order.delivery_data === 'object' ? Object.values(order.delivery_data).join(', ') : order.delivery_data}</span>
        </div>
        ` : ''}

        <div class="detail-row">
            <span class="detail-label">التاريخ</span>
            <span class="detail-value" style="font-size:12px; color:var(--text-muted);">${date}</span>
        </div>
        
        <div class="detail-row" style="margin-top: 20px; border-top: 1px solid var(--border); padding-top: 15px;">
            <span class="detail-label">الإجمالي</span>
            <span class="detail-value detail-total">$${parseFloat(order.total_price).toFixed(2)}</span>
        </div>

        ${timelineHtml}
    `;
    lucide.createIcons();
    openSheet('orderDetailsSheet');
}

// ════════════════════════════════════════════════════════════
// 6. Deposits Logic & Details
// ════════════════════════════════════════════════════════════
async function loadDeposits() {
    const list = document.getElementById('depositsList');
    list.innerHTML = '<div class="empty-state"><p>جاري التحميل...</p></div>';
    
    try {
        const res = await fetch(`${API_BASE}/api/deposits/`, { headers: getHeaders() });
        if (!res.ok) throw new Error("فشل الجلب");
        depositsData = await res.json();
        list.innerHTML = '';

        if (depositsData.length === 0) {
            list.innerHTML = '<div class="empty-state"><i data-lucide="wallet" size="48"></i><p>لا توجد إيداعات</p></div>';
            lucide.createIcons();
            return;
        }

        depositsData.forEach(d => {
            const card = document.createElement('div');
            card.className = 'list-card';
            card.onclick = () => openDepositDetails(d.id);
            
            card.innerHTML = `
                <div class="list-card-header">
                    <span>${d.transaction_id}</span>
                    <span class="${d.status === 'approved' ? 'text-success' : d.status === 'pending' ? 'text-warning' : 'text-danger'}">
                        ${d.status === 'approved' ? 'مقبول' : d.status === 'pending' ? 'معلق' : 'مرفوض'}
                    </span>
                </div>
                <div class="list-card-body">
                    <span>${d.method}</span>
                    <span>$${parseFloat(d.amount).toFixed(2)}</span>
                </div>
            `;
            list.appendChild(card);
        });
    } catch (e) {
        list.innerHTML = '<div class="empty-state"><p>تعذر تحميل الإيداعات</p></div>';
    }
}

function openDepositDetails(depositId) {
    const d = depositsData.find(x => x.id === depositId);
    if (!d) return;

    const date = new Date(d.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
    const proofImg = d.proof_image ? `<img src="${d.proof_image}" class="proof-image" onclick="openLightbox('${d.proof_image}')">` : '<p class="text-muted">لا يوجد إيصال</p>';

    document.getElementById('depositDetailsContent').innerHTML = `
        <h3 class="text-center" style="margin-bottom: 20px;">تفاصيل الإيداع</h3>
        <div class="detail-header">
            <div class="detail-title">${d.transaction_id} <i data-lucide="copy" onclick="copyText('${d.transaction_id}')"></i></div>
            <span class="${d.status === 'approved' ? 'text-success' : d.status === 'pending' ? 'text-warning' : 'text-danger'}">${d.status}</span>
        </div>

        <div class="detail-row">
            <span class="detail-label">الطريقة</span>
            <span class="detail-value">${d.method}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">اسم المرسل</span>
            <span class="detail-value">${d.sender_name || 'غير محدد'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">التاريخ</span>
            <span class="detail-value" style="font-size:12px; color:var(--text-muted);">${date}</span>
        </div>

        <div style="margin-top: 15px;">
            <span class="detail-label" style="display:block; margin-bottom:10px;">إثبات التحويل</span>
            ${proofImg}
        </div>

        <div class="detail-row" style="margin-top: 20px; border-top: 1px solid var(--border); padding-top: 15px;">
            <span class="detail-label">المبلغ</span>
            <span class="detail-value detail-total">$${parseFloat(d.amount).toFixed(2)}</span>
        </div>
    `;
    lucide.createIcons();
    openSheet('depositDetailsSheet');
}

// ════════════════════════════════════════════════════════════
// 7. Support Chat
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

        tickets.reverse().forEach(t => {
            const userBubble = document.createElement('div');
            userBubble.className = 'chat-bubble user';
            userBubble.innerHTML = `
                <span class="chat-sender">أنت</span>
                <span>${escapeHTML(t.message)}</span>
                <span class="chat-time">${new Date(t.date).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>
            `;
            container.appendChild(userBubble);

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
        if (tg) tg.HapticFeedback.notificationOccurred('success');
    } catch (e) {
        if (tg) tg.showAlert("تعذر إرسال الرسالة، تحقق من اتصالك.");
    } finally {
        btn.disabled = false;
    }
}

// ════════════════════════════════════════════════════════════
// 8. Modals & Sheets
// ════════════════════════════════════════════════════════════
function openSheet(sheetId) {
    document.getElementById('sheetOverlay').classList.add('active');
    document.getElementById(sheetId).classList.add('active');
}

function closeSheets() {
    document.getElementById('sheetOverlay').classList.remove('active');
    document.querySelectorAll('.bottom-sheet').forEach(s => s.classList.remove('active'));
}

function openDepositSheet() {
    if (tg) tg.HapticFeedback.impactOccurred('light');
    openSheet('depositSheet');
}

function openReferralModal() {
    if (tg) tg.HapticFeedback.impactOccurred('light');
    openSheet('referralSheet');
}

function openFAQModal() {
    if (tg) tg.HapticFeedback.impactOccurred('light');
    openSheet('faqSheet');
}

function openLightbox(imgSrc) {
    document.getElementById('lightboxImg').src = imgSrc;
    document.getElementById('lightbox').classList.remove('hidden');
}

function closeLightbox() {
    document.getElementById('lightbox').classList.add('hidden');
}

// ════════════════════════════════════════════════════════════
// 9. Utils & Settings
// ════════════════════════════════════════════════════════════
function toggleDarkMode() {
    const isDark = document.getElementById('darkModeToggle').checked;
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        if(tg) tg.setHeaderColor('#000000');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        if(tg) tg.setHeaderColor('#F2F2F7');
    }
}

function copySanadId() {
    const id = document.getElementById('profileSanadId').textContent;
    copyText(id);
}

function copyText(text) {
    navigator.clipboard.writeText(text);
    if (tg) tg.HapticFeedback.notificationOccurred('success');
    else alert('تم النسخ');
}

function shareReferral() {
    const code = document.getElementById('referralCodeText').textContent;
    const text = `انضم إلى سند بلس واحصل على خدمات رقمية بسهولة! استخدم كود الإحالة: ${code}`;
    if (tg) {
        tg.showAlert(text); // Fallback if clipboard fails
    } else {
        alert(text);
    }
}

function handleLogout() {
    if (tg) tg.close();
    authToken = null;
    location.reload();
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(s) {
        return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[s];
    });
}
