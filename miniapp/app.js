const tg = window.Telegram?.WebApp;
const API_BASE = 'https://sanad-plus-backend.onrender.com';
const tgUser = tg?.initDataUnsafe?.user;

let authToken = null, userData = null, categoriesData = [], productsData = [], paymentMethodsData = [], ordersData = [], depositsData = [];
let selectedPaymentMethod = null, currentProduct = null, selectedBundle = null, currentQty = 1;
let chatPollingInterval = null;

function showToast(message, type = 'error') { /* كود الإشعارات كما هو سابقاً */ }
async function safeFetch(url, options = {}) { /* كود الجلب الآمن كما هو سابقاً */ }

document.addEventListener('DOMContentLoaded', async () => {
    if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor('#000000'); tg.disableVerticalSwipes(); tg.BackButton.onClick(() => navigate('home')); }
    try { await authenticate(); await loadInitialData(); showApp(); } 
    catch (error) { document.getElementById('loadingScreen').classList.add('hidden'); document.getElementById('app').classList.remove('hidden'); document.getElementById('headerUserName').textContent = "خطأ"; showToast(error.message, 'error'); }
});

async function authenticate() { /* ... */ }
function getHeaders() { /* ... */ }
async function loadInitialData() { /* ... */ }
function showApp() { /* ... */ }
function renderCategories() { /* ... */ }
function openCategory(id, name) { /* ... */ }
function openProductDetails(prod) { /* ... */ }
function selectBundle(id, price) { /* ... */ }
function updateDynamicPrice(input) { /* ... */ }
async function submitOrder(e) { /* ... */ }
function renderPaymentMethodsPage() { /* ... */ }
function openPaymentDetails(pm) { /* ... */ }
async function submitDeposit(e) { /* ... */ }
async function loadOrders() { /* ... */ }
async function loadDeposits() { /* ... */ }
function openOrderDetails(orderId) { /* ... */ }
function openDepositDetails(depositId) { /* ... */ }
function openKYCModal() { /* ... */ }
function openReferralModal() { /* ... */ }
function openFAQModal() { /* ... */ }
function openSupportModal() { /* ... */ }
function openSheet(sheetId) { /* ... */ }
function closeSheets() { /* ... */ }
function openLightbox(imgSrc) { /* ... */ }
function closeLightbox() { /* ... */ }
function toggleDarkMode() { /* ... */ }
function copyText(text, msg) { /* ... */ }
function handleLogout() { /* ... */ }
function escapeHTML(str) { /* ... */ }

function navigate(page) {
    if (tg) tg.HapticFeedback.selectionChanged();
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    if (page === 'products' || page === 'deposit-methods') { document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active')); if (tg) tg.BackButton.show(); } 
    else { document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.page === page)); if (page !== 'home') { if (tg) tg.BackButton.show(); } else { if (tg) tg.BackButton.hide(); } }
    
    if (page === 'orders') loadOrders();
    if (page === 'deposits') loadDeposits();
    if (page === 'support') { loadSupportChat(); startChatPolling(); } 
    else { stopChatPolling(); }
}

function renderChatMessages(messages) {
    const container = document.getElementById('chatContainer');
    if (messages.length === 0) {
        container.innerHTML = `<div class="welcome-support-card"><div class="welcome-icon"><i data-lucide="headset" size="32"></i></div><h3 class="welcome-title">أهلاً بك في دعم SANAD+</h3><p class="welcome-text">تم فتح تذكرة دعم جديدة.<br>سيتم الرد عليك في أقرب وقت ممكن.<br>في هذه الأثناء يرجى كتابة المشكلة بالتفصيل ليتم خدمتك بشكل أسرع.</p></div>`;
        lucide.createIcons(); return;
    }
    container.innerHTML = '';
    messages.forEach(m => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${m.sender_type}`;
        bubble.innerHTML = `<span class="chat-sender">${m.sender_type === 'user' ? 'أنت' : 'إدارة سند بلس'}</span><span>${escapeHTML(m.message)}</span><span class="chat-time">${new Date(m.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>`;
        container.appendChild(bubble);
    });
    window.scrollTo(0, document.body.scrollHeight);
}

async function loadSupportChat() {
    try {
        const data = await safeFetch(`${API_BASE}/api/support`, { headers: getHeaders() });
        renderChatMessages(data.messages);
    } catch (e) { console.error(e); }
}

function startChatPolling() {
    if (chatPollingInterval) clearInterval(chatPollingInterval);
    chatPollingInterval = setInterval(async () => {
        if (document.getElementById('page-support').classList.contains('active')) {
            try {
                const data = await safeFetch(`${API_BASE}/api/support`, { headers: getHeaders() });
                renderChatMessages(data.messages);
            } catch(e) {}
        }
    }, 3000);
}

function stopChatPolling() { if (chatPollingInterval) { clearInterval(chatPollingInterval); chatPollingInterval = null; } }

async function sendSupportMessage() {
    const input = document.getElementById('supportInput');
    const msg = input.value.trim(); if (!msg) return;
    input.value = ''; input.disabled = true;
    try {
        await safeFetch(`${API_BASE}/api/support`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ message: msg }) });
        loadSupportChat(); // إعادة تحميل مباشرة بعد الإرسال
        if (tg) tg.HapticFeedback.notificationOccurred('success');
    } catch (e) { showToast(e.message, 'error'); } 
    finally { input.disabled = false; input.focus(); }
}
