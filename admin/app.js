const API_BASE = 'https://sanad-plus-backend.onrender.com';
let currentSessionId = null;
let dashboardChartInstance = null;
let currentInboxTab = 'orders'; // Default to orders
let cachedItems = {};

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('admin_token')) {
        document.getElementById('loginScreen').classList.remove('hidden');
    } else {
        showDashboard();
    }
});

// ================= Login =================
async function handleLogin() { /* (سابقاً) */ }
async function verifyOTP() { /* (سابقاً) */ }
function logout() { localStorage.removeItem('admin_token'); location.reload(); }
function getHeaders() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }; }

// ================= Dashboard =================
function showDashboard() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboardScreen').classList.remove('hidden');
    loadDashboardStats();
    initChart();
    checkInboxBadge();
    lucide.createIcons();
}

function switchSection(sectionId, btn) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    document.getElementById('section-' + sectionId).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active', 'bg-slate-700/50', 'text-white'));
    if (btn) btn.classList.add('active', 'bg-slate-700/50', 'text-white');
    document.getElementById('page-title').innerText = { 'dashboard': 'لوحة التحكم', 'inbox': 'الإرساليات' }[sectionId] || 'لوحة التحكم';
    document.querySelector('aside').classList.remove('open');
    if (sectionId === 'inbox') loadInbox(currentInboxTab);
}
function toggleSidebar() { document.querySelector('aside').classList.toggle('open'); }
async function loadDashboardStats() { /* (سابقاً) */ }
function initChart() { /* (سابقاً) */ }

// ================= Inbox Logic =================
function switchInboxTab(type, btn) {
    currentInboxTab = type;
    document.querySelectorAll('.inbox-tab').forEach(b => { b.classList.remove('active', 'bg-accent', 'text-dark'); b.classList.add('glass', 'text-slate-400'); });
    btn.classList.remove('glass', 'text-slate-400'); btn.classList.add('active', 'bg-accent', 'text-dark');
    loadInbox(type);
}

async function loadInbox(type) {
    const container = document.getElementById('inboxContainer');
    container.innerHTML = '<div class="col-span-full text-center py-10"><i data-lucide="loader" class="animate-spin text-accent mx-auto mb-2"></i><p class="text-slate-400">جاري التحميل...</p></div>';
    lucide.createIcons();

    let endpoint = type === 'deposits' ? '/admin/api/deposits' : type === 'orders' ? '/admin/api/orders' : '/admin/api/kyc';

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, { headers: getHeaders() });
        const data = await res.json();
        cachedItems[type] = data;
        container.innerHTML = '';

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="col-span-full text-center py-10 text-slate-400">لا توجد عناصر في هذا القسم حالياً.</div>';
            return;
        }

        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'inbox-card';
            card.onclick = () => viewDetails(type, item.id);
            
            if (type === 'orders') {
                // ✅ تصميم البطاقة المطلوب (بدون أزرار خارجية)
                card.innerHTML = `
                    <div class="inbox-header">
                        <span class="text-accent font-mono text-sm">${item.order_number}</span>
                        <span class="badge bg-warning/20 text-warning px-2 py-1 rounded">$${parseFloat(item.total_price).toFixed(2)}</span>
                    </div>
                    <div class="inbox-details">
                        <strong>${escapeHtml(item.product_name)}</strong><br>
                        الكمية: ${item.quantity} | المستخدم: ${escapeHtml(item.user_name || 'غير معروف')}
                    </div>
                `;
            } else if (type === 'deposits') {
                card.innerHTML = `
                    <div class="inbox-header"><span class="text-accent font-mono text-sm">${item.transaction_id}</span><span class="badge bg-success/20 text-success px-2 py-1 rounded">$${parseFloat(item.amount).toFixed(2)}</span></div>
                    <div class="inbox-details"><strong>إيداع جديد</strong><br>المستخدم: ${escapeHtml(item.user_name)}</div>
                `;
            } else {
                card.innerHTML = `
                    <div class="inbox-header"><span class="text-accent font-mono text-sm">KYC #${item.id}</span></div>
                    <div class="inbox-details"><strong>${escapeHtml(item.full_name)}</strong><br>الهاتف: ${escapeHtml(item.phone)}</div>
                `;
            }
            container.appendChild(card);
        });
        lucide.createIcons();
    } catch (e) {
        container.innerHTML = '<div class="col-span-full text-center py-10 text-danger">تعذر جلب البيانات.</div>';
    }
}

// ================= Details Modal (النسخة الفاخرة) =================
function viewDetails(type, id) {
    const item = cachedItems[type].find(x => x.id === id);
    if (!item) return;

    const modal = document.getElementById('detailsModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');

    modal.classList.remove('hidden');

    if (type === 'orders') {
        title.textContent = `تفاصيل الطلب: ${item.order_number}`;
        
        // استخراج بيانات التسليم بشكل نظيف
        let deliveryStr = '';
        try {
            const parsed = typeof item.delivery_data === 'string' ? JSON.parse(item.delivery_data) : item.delivery_data;
            deliveryStr = Object.values(parsed).join(', ');
        } catch(e) { deliveryStr = item.delivery_data || ''; }

        body.innerHTML = `
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div><span class="text-slate-500 text-xs block">المستخدم</span> <strong class="text-white">${escapeHtml(item.user_name)}</strong></div>
                <div><span class="text-slate-500 text-xs block">الآيدي</span> <strong class="text-white font-mono">${item.user_telegram || '-'}</strong></div>
                <div><span class="text-slate-500 text-xs block">المنتج</span> <strong class="text-white">${escapeHtml(item.product_name)}</strong></div>
                <div><span class="text-slate-500 text-xs block">الكمية</span> <strong class="text-white">${item.quantity}</strong></div>
                <div><span class="text-slate-500 text-xs block">الإجمالي</span> <strong class="text-success text-lg">$${parseFloat(item.total_price).toFixed(2)}</strong></div>
            </div>

            <div>
                <label class="modal-label">بيانات الاستلام</label>
                <div class="copy-input-group">
                    <input type="text" id="deliveryDataInput" class="copy-input" value="${escapeHtml(deliveryStr)}" readonly>
                    <button onclick="copyToClipboard('deliveryDataInput')" class="copy-btn"><i data-lucide="copy" size="18"></i></button>
                </div>
            </div>

            <div>
                <label class="modal-label">ملاحظة الإدارة (تظهر للمستخدم)</label>
                <textarea id="adminNote" class="admin-note-input" placeholder="اكتب ملاحظتك هنا..."></textarea>
            </div>
        `;
        
        footer.innerHTML = `
            <div class="modal-actions">
                <button onclick="handleAction('orders', ${item.id}, 'status', 'failed')" class="btn-reject">رفض وإرجاع المبلغ</button>
                <button onclick="handleAction('orders', ${item.id}, 'status', 'completed')" class="btn-complete">إكمال الطلب</button>
            </div>
        `;
    } else if (type === 'deposits') {
        // ... (كود الإيداع السابق)
    } else {
        // ... (كود الـ KYC السابق)
    }
    lucide.createIcons();
}

function copyToClipboard(elementId) {
    const input = document.getElementById(elementId);
    input.select();
    document.execCommand('copy');
    Swal.fire({icon: 'success', title: 'تم النسخ', timer: 1000, showConfirmButton: false, background: '#1e293b', color: '#fff'});
}

// ================= Actions =================
async function handleAction(type, id, action, extra) {
    const adminNote = document.getElementById('adminNote')?.value || '';
    
    const confirm = await Swal.fire({
        title: 'تأكيد الإجراء', text: "هل أنت متأكد من تنفيذ هذا الإجراء؟", icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#10b981', cancelButtonColor: '#ef4444', confirmButtonText: 'نعم، تنفيذ', cancelButtonText: 'إلغاء',
        background: '#1e293b', color: '#fff'
    });
    if (!confirm.isConfirmed) return;

    let endpoint = '';
    let body = { admin_note: adminNote };
    
    if (type === 'deposits') endpoint = `/admin/api/deposits/${id}/${action}`;
    else if (type === 'orders') { endpoint = `/admin/api/orders/${id}/status`; body.status = extra; }
    else if (type === 'kyc') endpoint = `/admin/api/kyc/${id}/${action}`;

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
        if (res.ok) {
            closeModal();
            Swal.fire({icon: 'success', title: 'تم بنجاح', timer: 1500, showConfirmButton: false, background: '#1e293b', color: '#fff'});
            loadInbox(type);
            loadDashboardStats();
            checkInboxBadge();
        } else {
            const err = await res.json();
            Swal.fire({icon: 'error', title: 'فشل', text: err.error || 'حدث خطأ', background: '#1e293b', color: '#fff'});
        }
    } catch (e) { Swal.fire({icon: 'error', title: 'خطأ', text: 'تعذر الاتصال', background: '#1e293b', color: '#fff'}); }
}

function closeModal() { document.getElementById('detailsModal').classList.add('hidden'); }
async function checkInboxBadge() { /* (سابقاً) */ }
function escapeHtml(text) { if (!text) return ''; return String(text).replace(/[&<>"']/g, function(m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }

// (بقية دوال الدخول السابقة تحتاج لنسخها هنا: handleLogin, verifyOTP, loadDashboardStats, initChart)
