// miniapp/js/telegram.js

const tg = window.Telegram?.WebApp;

function initTelegram() {
    if (tg) {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#00A0E9');
        tg.setBackgroundColor('#F5F7FA');

        // استخراج بيانات المستخدم مباشرة بعد الجاهزية
        const user = tg.initDataUnsafe?.user;
        if (user) {
            window.currentUser = {
                id: user.id,
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                username: user.username || '',
                photo_url: user.photo_url || '',
            };
            console.log('تم التقاط بيانات المستخدم:', window.currentUser);
        } else {
            console.warn('لا توجد بيانات مستخدم في initDataUnsafe');
            // محاولة استخراج من initData يدوياً
            try {
                const initData = tg.initData || '';
                const params = new URLSearchParams(initData);
                const userParam = params.get('user');
                if (userParam) {
                    const userData = JSON.parse(userParam);
                    window.currentUser = {
                        id: userData.id,
                        first_name: userData.first_name || '',
                        last_name: userData.last_name || '',
                        username: userData.username || '',
                        photo_url: userData.photo_url || '',
                    };
                    console.log('تم استخراج بيانات المستخدم من initData:', window.currentUser);
                }
            } catch (e) {
                console.error('فشل استخراج بيانات المستخدم:', e);
            }
        }
    } else {
        console.warn('Telegram WebApp غير متوفر');
        // للتطوير فقط
        window.currentUser = {
            id: 8673286954,
            first_name: 'مستخدم تجريبي',
            last_name: '',
            username: 'tester',
            photo_url: '',
        };
    }
}

function applyTelegramTheme() {
    if (tg) {
        const isDark = tg.colorScheme === 'dark';
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
}

function showBackButton(callback) {
    if (tg && tg.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(callback);
    }
}

function hideBackButton() {
    if (tg && tg.BackButton) {
        tg.BackButton.hide();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initTelegram();
    applyTelegramTheme();
});
