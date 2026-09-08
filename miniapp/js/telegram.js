// js/telegram.js
// التعامل مع Telegram WebApp API

const tg = window.Telegram?.WebApp;

function initTelegram() {
    if (tg) {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#00A0E9');
        tg.setBackgroundColor('#FFFFFF');

        const user = tg.initDataUnsafe?.user;
        if (user) {
            window.currentUser = {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username,
            };
        }
    } else {
        window.currentUser = {
            id: 8673286954,
            first_name: 'Admin',
            last_name: '',
            username: 'admin',
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