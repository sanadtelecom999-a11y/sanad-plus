// التعامل فقط مع Telegram WebApp
export const tg = window.Telegram?.WebApp;

export function initTelegram() {
  if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#050608');
    tg.setBackgroundColor('#050608');
  }
}

export function getInitData() {
  return tg?.initData || '';
}

export function getTelegramUser() {
  return tg?.initDataUnsafe?.user || null;
}
