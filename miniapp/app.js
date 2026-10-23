const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor("#000000"); }

const API_URL = 'https://sanad-plus-backend.onrender.com';
const tgUser = tg?.initDataUnsafe?.user;
let currentUser = null;
let categoriesData = [];
let currentOrderContext = { product: null, price: 0 };
let currentNotificationId = null;

function formatDate(dateStr) {
    if (!dateStr) return 'غير محدد';
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function cleanDeliveryData(data) {
    if (!data) return 'غير محدد';
    if (typeof data === 'string' && data.startsWith('{')) {
        try { const p = JSON.parse(data); return p.player_id || p.phone || p.link || p.id || data; } catch (e) { return data; }
    }
    return data;
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!tgUser) { showToast("يرجى فتح التطبيق من داخل تليجرام"); return; }

    try {
        const res = await fetch(`${API_URL}/api/miniapp/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegram_id: tgUser.id, first_name: tgUser.first_name, username: tgUser.username })
        });
        const data = await res.json();
        
        // 1. فحص الحظر
        if (data.banned) {
            document.getElementById('bannedOverlay').classList.remove('hidden');
            document.getElementById('bannedOverlay').classList.add('flex');
            return;
        }
        
        // 2. فحص الصيانة
        if (data.maintenance) {
            document.getElementById('maintenanceOverlay').classList.remove('hidden');
            document.getElementById('maintenanceOverlay').classList.add('flex');
            return;
        }

        // 3. عرض الإشعارات (إن وجدت)
        if (data.notifications && data.notifications.length > 0) {
            showNotification(data.notifications[0]);
        }

        // 4. إعداد واجهة المستخدم
        if (data.user) {
            currentUser = data.user;
            document.getElementById('greetingText').innerText = `مرحباً، ${tgUser.first_name} 👋`;
            document.getElementById('profileName').innerText = tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : '');
            document.getElementById('profileUsername').innerText = tgUser.username ? `@${tgUser.username}` : '';
            document.getElementById('profileTelegramId').innerText = `Telegram: ${tgUser.id}`;
            
            if (tgUser.photo_url) {
                document.getElementById('userAvatar').src = tgUser.photo_url;
                document.getElementById('userAvatar').classList.remove('hidden');
                document.getElementById('defaultAvatarIcon').classList.add('hidden');
            }
            
            updateUserUI(data.user);
        }

        fetchProducts();
    } catch (err) {
        showToast("تعذر الاتصال بالسيرفر، يرجى إعادة تحديث الصفحة");
    }
});

// ================= Notification System =================
function showNotification(notif) {
    currentNotificationId = notif.id;
    document.getElementById('notifTitle').innerText = notif.title || 'إشعار إداري';
    document.getElementById('notifMessageText').innerHTML = notif.message;
    document.getElementById('notificationBanner').classList.remove('hidden');
    lucide.createIcons();
}

async function dismissNotification() {
    document.getElementById('notificationBanner').classList.add('hidden');
    if (currentNotificationId) {
        await fetch(`${API_URL}/api/miniapp/notifications/${currentNotificationId}/read`, { method: 'POST' });
        currentNotificationId = null;
    }
}

// ... (باقي الدوال: updateUserUI, fetchProducts, openCategory, openProductModal, submitGameOrder, renderOrders, renderDeposits, switchTab, openModal, closeModal, showToast, handleLogout, copySanadId, إلخ)
// تأكد من نسخها من الملف السابق أو إبقائها في ملفك الأصلي.
