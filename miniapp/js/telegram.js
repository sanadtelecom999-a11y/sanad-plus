// miniapp/js/telegram.js

const tg = window.Telegram?.WebApp;

/**
 * تهيئة Telegram WebApp مع انتظار تحميل البيانات
 * @returns {Promise<boolean>} true إذا نجح تحميل بيانات المستخدم
 */
function initTelegram() {
    return new Promise((resolve) => {
        if (!tg) {
            console.error('❌ Telegram WebApp API غير متاح — التطبيق لم يُفتح من داخل تيليجرام');
            resolve(false);
            return;
        }

        try {
            tg.ready();
            tg.expand();
            try { tg.setHeaderColor('#00A0E9'); } catch (e) {}
            try { tg.setBackgroundColor('#F5F7FA'); } catch (e) {}
        } catch (e) {
            console.warn('⚠️ خطأ في تهيئة tg:', e);
        }

        // انتظار قصير حتى تكتمل بيانات initDataUnsafe
        let attempts = 0;
        const maxAttempts = 10; // 10 × 100ms = 1 ثانية

        const checkUser = () => {
            const user = tg.initDataUnsafe?.user;

            if (user && user.id) {
                window.currentUser = {
                    id: user.id,
                    first_name: user.first_name || '',
                    last_name: user.last_name || '',
                    username: user.username || '',
                    photo_url: user.photo_url || '',
                    language_code: user.language_code || 'ar',
                    is_premium: user.is_premium || false,
                };
                console.log('✅ تم التعرف على المستخدم من تيليجرام:', window.currentUser.id);
                resolve(true);
                return;
            }

            attempts++;
            if (attempts >= maxAttempts) {
                console.error('❌ لم يتم الحصول على بيانات المستخدم من تيليجرام بعد ' + (maxAttempts * 100) + 'ms');
                resolve(false);
                return;
            }

            setTimeout(checkUser, 100);
        };

        checkUser();
    });
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