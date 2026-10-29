const API_BASE = 'https://sanad-plus-backend.onrender.com';
let authToken = null;
let currentState = {
    user: null,
    orders: [],
    deposits: [],
    categories: []
};

// Utils
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function formatMoney(amount) { const n = Number(amount); return Number.isFinite(n) ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n)} <span class="currency">ل.س</span>` : "—"; }
const statusLabels = { completed: "مكتمل", pending: "قيد المراجعة", rejected: "مرفوض", cancelled: "ملغي", approved: "مكتمل" };
const statusClass = { completed: "status-success", pending: "status-pending", rejected: "status-danger", cancelled: "status-danger", approved: "status-success" };
function statusPill(status) { return `<span class="pill ${statusClass[status] || ""}">${escapeHtml(statusLabels[status] || status)}</span>`; }

let toastTimer;
function showToast(message) {
    const node = document.getElementById("toast");
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("show"), 2300);
}

function closeModal() { document.getElementById("modal-backdrop").classList.remove("show"); }
document.getElementById("modal-close").addEventListener("click", closeModal);
document.getElementById("modal-backdrop").addEventListener("click", e => { if (e.target.id === "modal-backdrop") closeModal(); });

function copyText(value) {
    if (!value) return showToast("لا توجد بيانات لنسخها");
    navigator.clipboard.writeText(value).then(() => showToast("تم النسخ")).catch(() => showToast("تعذر النسخ"));
}

// API
async function apiFetch(path, options = {}) {
    const initData = window.Telegram?.WebApp?.initData;
    const headers = { ...options.headers };
    if (initData) headers['X-Telegram-Init-Data'] = initData;
    if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (res.status === 401) throw new Error("انتهت الجلسة");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "خطأ في الاتصال");
    return data;
}

// Navigation
function go(page) {
    const target = document.getElementById("page-" + page);
    if (!target) return showToast("هذه الصفحة غير متاحة");
    document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p === target));
    document.querySelectorAll(".nav-item").forEach(b => {
        const active = b.dataset.go === page;
        b.classList.toggle("active", active);
        if (active) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    
    // Load data on navigation
    if (page === 'orders') loadOrders();
    if (page === 'deposits') loadDeposits();
    if (page === 'history') loadHistory();
    if (page === 'verification') loadKycStatus();
}
document.querySelectorAll("[data-go]").forEach(el => el.addEventListener("click", () => go(el.dataset.go)));

// Loaders
async function loadUserData() {
    try {
        const userData = await apiFetch('/api/miniapp/init', { method: 'POST', body: JSON.stringify({}) });
        currentState.user = userData;
        
        document.querySelectorAll("[data-user-name]").forEach(el => el.textContent = userData.first_name);
        document.getElementById("profile-username").textContent = "@" + (window.Telegram?.WebApp?.initDataUnsafe?.user?.username || "user");
        document.getElementById("profile-telegram-id").textContent = userData.telegram_id;
        document.getElementById("sanad-id").textContent = userData.sanad_id;
        document.getElementById("account-deposits").innerHTML = formatMoney(userData.total_deposits || 0);
        document.getElementById("account-balance").innerHTML = formatMoney(userData.balance);
        document.getElementById("home-balance").innerHTML = formatMoney(userData.balance);
        
        if (userData.is_verified) document.getElementById("verified-badge").style.display = "inline-flex";
        
        // Referral link
        document.getElementById("referral-url").value = `https://t.me/Sa3pls1_bot?start=ref_${userData.sanad_id}`;
    } catch (err) {
        document.getElementById("home-balance").textContent = "خطأ في التحميل";
        console.error(err);
    }
}

async function loadCategories() {
    try {
        currentState.categories = await apiFetch('/api/categories/');
        const container = document.getElementById("home-categories");
        if (currentState.categories.length === 0) {
            container.innerHTML = '<div class="empty">لا توجد تصنيفات.</div>';
            return;
        }
        container.innerHTML = currentState.categories.map(cat => `
            <button class="category" data-category="${escapeHtml(cat.id)}" data-name="${escapeHtml(cat.name)}">
                <span class="category-icon">
                    ${cat.image ? `<img src="${escapeHtml(cat.image)}" style="width:100%;height:100%;border-radius:15px;object-fit:cover;">` : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="4"/></svg>'}
                </span>
                <span><strong>${escapeHtml(cat.name)}</strong><small>خدمات رقمية</small></span>
            </button>
        `).join('');
        
        container.querySelectorAll('.category').forEach(btn => {
            btn.onclick = () => {
                showToast("صفحة المنتجات ستتوفر قريباً");
            };
        });
    } catch (err) {
        console.error(err);
    }
}

async function loadOrders() {
    try {
        const res = await apiFetch('/api/orders/');
        currentState.orders = res.items || [];
        renderOrders(currentState.orders);
        renderRecent();
    } catch (err) { console.error(err); }
}

function renderOrders(orders) {
    const list = document.getElementById("orders-list");
    if (!orders || orders.length === 0) {
        list.innerHTML = `<div class="empty"><strong>لا توجد طلبات</strong></div>`;
        return;
    }
    list.innerHTML = orders.map(o => `
        <button class="list-item" data-order-id="${o.id}">
            <span class="category-icon" style="width:44px;height:44px;border-radius:14px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h12a2 2 0 0 1 2 2v16l-4-2-4 2-4-2-4 2V5a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h8"/></svg></span>
            <span class="item-main"><span class="item-title">${escapeHtml(o.product_name)}</span><span class="item-desc">${escapeHtml(o.order_number)} · ${new Date(o.date).toLocaleDateString('ar-EG')}</span><span class="item-meta">${statusPill(o.status)}<strong class="item-amount">${formatMoney(o.amount)}</strong></span></span><span class="chevron">‹</span>
        </button>
    `).join('');
}

async function loadDeposits() {
    try {
        const res = await apiFetch('/api/deposits/');
        currentState.deposits = res.items || [];
        renderDeposits(currentState.deposits);
        renderRecent();
    } catch (err) { console.error(err); }
}

function renderDeposits(deposits) {
    const list = document.getElementById("deposits-list");
    if (!deposits || deposits.length === 0) {
        list.innerHTML = `<div class="empty"><strong>لا توجد إيداعات</strong></div>`;
        return;
    }
    list.innerHTML = deposits.map(d => `
        <button class="list-item" data-deposit-id="${d.id}">
            <span class="category-icon" style="width:44px;height:44px;border-radius:14px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v13m-5-5 5 5 5-5"/><path d="M4 17v3h16v-3"/></svg></span>
            <span class="item-main"><span class="item-title">${escapeHtml(d.reference || 'إيداع')}</span><span class="item-desc">${new Date(d.date).toLocaleDateString('ar-EG')}</span><span class="item-meta">${statusPill(d.status)}<strong class="item-amount">${formatMoney(d.amount)}</strong></span></span><span class="chevron">‹</span>
        </button>
    `).join('');
}

function renderRecent() {
    const recent = [
        ...currentState.orders.slice(0, 2).map(o => ({ kind: 'order', data: o })),
        ...currentState.deposits.slice(0, 1).map(d => ({ kind: 'deposit', data: d }))
    ];
    const container = document.getElementById("home-recent");
    if (recent.length === 0) {
        container.innerHTML = `<div class="empty"><strong>لا توجد عمليات حديثة</strong></div>`;
        return;
    }
    container.innerHTML = recent.map(x => {
        if (x.kind === 'order') {
            return `<button class="list-item" data-order-id="${x.data.id}"><span class="item-main"><span class="item-title">${escapeHtml(x.data.product_name)}</span><span class="item-meta">${statusPill(x.data.status)}<strong class="item-amount">${formatMoney(x.data.amount)}</strong></span></span><span class="chevron">‹</span></button>`;
        } else {
            return `<button class="list-item" data-deposit-id="${x.data.id}"><span class="item-main"><span class="item-title">إيداع ${escapeHtml(x.data.reference || '')}</span><span class="item-meta">${statusPill(x.data.status)}<strong class="item-amount">${formatMoney(x.data.amount)}</strong></span></span><span class="chevron">‹</span></button>`;
        }
    }).join('');
}

async function loadHistory() {
    // We can reuse the loaded orders/deposits or reload
    document.getElementById("history-deposits").innerHTML = document.getElementById("deposits-list").innerHTML;
    document.getElementById("history-orders").innerHTML = document.getElementById("orders-list").innerHTML;
}

async function loadKycStatus() {
    try {
        const res = await apiFetch('/api/kyc/status');
        const statusEl = document.getElementById("kyc-status");
        const msgEl = document.getElementById("kyc-message");
        if (res.status === 'approved') {
            statusEl.className = 'pill status-success'; statusEl.textContent = 'موثق';
            msgEl.textContent = `الاسم: ${res.full_name}`;
        } else if (res.status === 'pending') {
            statusEl.className = 'pill status-pending'; statusEl.textContent = 'قيد المراجعة';
            msgEl.textContent = 'سيتم مراجعة طلبك قريباً.';
        } else {
            statusEl.className = 'pill'; statusEl.textContent = 'غير موثق';
            msgEl.textContent = 'يرجى إرسال طلب توثيق جديد (الميزة قادمة).';
        }
    } catch (err) { console.error(err); }
}

// Modal Receipts
document.addEventListener("click", e => {
    const orderBtn = e.target.closest("[data-order-id]");
    if (orderBtn) return openOrderReceipt(orderBtn.dataset.orderId);
    
    const depBtn = e.target.closest("[data-deposit-id]");
    if (depBtn) return openDepositReceipt(depBtn.dataset.depositId);
});

function openOrderReceipt(id) {
    const o = currentState.orders.find(x => x.id == id);
    if (!o) return;
    document.getElementById("modal-title").textContent = "تفاصيل الطلب";
    document.getElementById("modal-content").innerHTML = `
        <article class="receipt">
            <div class="receipt-brand"><div class="receipt-logo">SP⁺</div><h2>SANAD PLUS⁺</h2><p>تفاصيل طلب</p></div>
            <div class="receipt-state">${statusPill(o.status)}</div><div class="receipt-amount">${formatMoney(o.amount)}</div><p class="receipt-amount-label">قيمة الطلب</p>
            <div class="receipt-rows">
                <div class="receipt-row"><span>رقم الطلب</span><strong>${escapeHtml(o.order_number)}</strong></div>
                <div class="receipt-row"><span>الخدمة</span><strong>${escapeHtml(o.product_name)}</strong></div>
                <div class="receipt-row"><span>الكمية</span><strong>${o.quantity}</strong></div>
                <div class="receipt-row"><span>التاريخ</span><strong>${new Date(o.date).toLocaleString('ar-EG')}</strong></div>
                <div class="receipt-row"><span>بيانات الاستلام</span><strong>${escapeHtml(o.delivery_data)}</strong></div>
            </div>
            <div class="btn-row"><button class="secondary-btn" onclick="copyText('${escapeHtml(o.order_number)}')">نسخ رقم الطلب</button></div>
        </article>
    `;
    document.getElementById("modal-backdrop").classList.add("show");
}

function openDepositReceipt(id) {
    const d = currentState.deposits.find(x => x.id == id);
    if (!d) return;
    document.getElementById("modal-title").textContent = "إيصال الإيداع";
    document.getElementById("modal-content").innerHTML = `
        <article class="receipt">
            <div class="receipt-brand"><div class="receipt-logo">SP⁺</div><h2>SANAD PLUS⁺</h2><p>إيصال إيداع رقمي</p></div>
            <div class="receipt-state">${statusPill(d.status)}</div><div class="receipt-amount">${formatMoney(d.amount)}</div><p class="receipt-amount-label">مبلغ الإيداع</p>
            <div class="receipt-rows">
                <div class="receipt-row"><span>رقم العملية</span><strong>${escapeHtml(d.reference)}</strong></div>
                <div class="receipt-row"><span>التاريخ</span><strong>${new Date(d.date).toLocaleString('ar-EG')}</strong></div>
                ${d.receipt_image ? `<div class="receipt-row"><span>الصورة</span><a href="${d.receipt_image}" target="_blank" style="color:var(--blue)">عرض</a></div>` : ''}
            </div>
            <div class="btn-row"><button class="secondary-btn" onclick="copyText('${escapeHtml(d.reference)}')">نسخ رقم العملية</button></div>
        </article>
    `;
    document.getElementById("modal-backdrop").classList.add("show");
}

// Actions
document.getElementById("toggle-balance").addEventListener("click", () => {
    const node = document.getElementById("home-balance");
    if (node.dataset.hidden === "true") {
        node.innerHTML = formatMoney(currentState.user?.balance || 0); node.dataset.hidden = "false";
    } else {
        node.textContent = "••••••"; node.dataset.hidden = "true";
    }
});
document.getElementById("copy-sanad").addEventListener("click", () => copyText(currentState.user?.sanad_id));
document.getElementById("copy-referral").addEventListener("click", () => copyText(document.getElementById("referral-url").value));
document.getElementById("share-referral").addEventListener("click", () => {
    const url = document.getElementById("referral-url").value;
    if (navigator.share) navigator.share({ title: 'SANAD PLUS+', url }).catch(()=>copyText(url));
    else copyText(url);
});

document.getElementById("submit-deposit").addEventListener("click", async () => {
    const amount = document.getElementById("charge-amount").value;
    const reference = document.getElementById("charge-reference").value;
    const file = document.getElementById("charge-receipt").files[0];
    if (!amount || !reference || !file) return showToast("يرجى تعبئة الحقول واختيار صورة");
    
    const btn = document.getElementById("submit-deposit");
    btn.disabled = true; btn.textContent = "جاري الإرسال...";
    
    const formData = new FormData();
    formData.append('amount', amount);
    formData.append('reference', reference);
    formData.append('receipt', file);
    
    try {
        await apiFetch('/api/deposits/create', { method: 'POST', body: formData });
        showToast("تم إرسال الطلب بنجاح");
        go('deposits');
    } catch (err) {
        showToast(err.message);
    } finally {
        btn.disabled = false; btn.textContent = "إرسال طلب الإيداع";
    }
});

document.getElementById("support-send").addEventListener("click", async () => {
    const msg = document.getElementById("support-message").value;
    if (!msg) return showToast("اكتب رسالتك أولاً");
    
    const btn = document.getElementById("support-send");
    btn.disabled = true; btn.textContent = "جاري الإرسال...";
    
    try {
        await apiFetch('/api/support/send', { method: 'POST', body: JSON.stringify({ message: msg }) });
        showToast("تم إرسال الرسالة");
        document.getElementById("support-message").value = "";
    } catch (err) {
        showToast(err.message);
    } finally {
        btn.disabled = false; btn.textContent = "إرسال";
    }
});

document.getElementById("orders-filter").addEventListener("change", (e) => {
    const filter = e.target.value;
    const filtered = filter === 'all' ? currentState.orders : currentState.orders.filter(o => o.status === filter);
    renderOrders(filtered);
});

// Init
async function init() {
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        window.Telegram.WebApp.setHeaderColor('#080E1B');
    }
    
    // Wait for initData
    let initData = window.Telegram?.WebApp?.initData;
    let retries = 0;
    while (!initData && retries < 20) {
        await new Promise(r => setTimeout(r, 100));
        initData = window.Telegram?.WebApp?.initData;
        retries++;
    }

    await loadUserData();
    await loadCategories();
    await loadOrders();
    await loadDeposits();
    
    // Hide loader if exists (we don't have a dedicated loader in new HTML, but we can add one if needed)
}
document.addEventListener("DOMContentLoaded", init);
