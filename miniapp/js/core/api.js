const API_BASE = 'https://sanad-plus-backend.onrender.com';
let authToken = null;

const tg = window.Telegram?.WebApp;

// دالة مركزية للاتصال بالسيرفر
export async function safeFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
    ...options.headers
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error || `خطأ ${res.status}`);
    }
    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// 1. تسجيل الدخول عبر تيليجرام
export async function authenticateTelegram() {
  const initData = tg?.initData;
  if (!initData) {
    console.warn("لم يتم فتح التطبيق من داخل تيليجرام. سيتم استخدام وضع التجربة.");
    return false; // سنكتفي بالتجربة في المتصفح إن لم تكن في تيليجرام
  }

  try {
    const data = await safeFetch('/api/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ initData })
    });
    
    if (data.token) {
      authToken = data.token;
      return true;
    }
    return false;
  } catch (error) {
    console.error("فشل تسجيل الدخول:", error);
    return false;
  }
}

// 2. جلب بيانات المستخدم (الرصيد والاسم)
export async function fetchUserData() {
  const tgUser = tg?.initDataUnsafe?.user;
  const telegramId = tgUser?.id || '123456789'; // آيدي تجريبي في حال الفتح من المتصفح

  try {
    const data = await safeFetch('/api/miniapp/init', {
      method: 'POST',
      body: JSON.stringify({ telegram_id: telegramId })
    });
    return data; // يحتوي عادة على balance, first_name, إلخ
  } catch (error) {
    return null;
  }
}

// 3. جلب التصنيفات
export async function fetchCategories() {
  try {
    const data = await safeFetch('/api/categories/');
    return data || [];
  } catch (error) {
    return [];
  }
}
