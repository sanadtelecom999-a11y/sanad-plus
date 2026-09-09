// miniapp/js/telegram.js

const tg = window.Telegram?.WebApp;

function initTelegram() {
    if (tg) {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#00A0E9');
        tg.setBackgroundColor('#F5F7FA');

        // استخراج بيانات المستخدم مباشرة
        const user = tg.initDataUnsafe?.user;
        if (user) {
            window.currentUser = {
                id: user.id,
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                username: user.username || '',
                photo_url: user.photo_url || '',
            };
            console.log('Telegram user data captured:', window.currentUser);
        } else {
            console.warn('No user data in initDataUnsafe');
        }
    } else {
        console.warn('Telegram WebApp not available');
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
