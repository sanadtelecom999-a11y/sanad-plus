// ============================================================
// 🛡️ SANAD+ MiniApp — Service Worker (v18.1)
// ============================================================
// استراتيجيات التخزين:
//   /api/*       → network-only (لا تخزين أبداً)
//   HTML         → network-first (لتحديثات فورية)
//   CSS/JS/fonts → stale-while-revalidate
//   images       → cache-first
//   Telegram SDK → network-only
// ============================================================

const CACHE_VERSION = 'sanad-miniapp-v18.1-1';

// Pre-cache (يُحمّل عند التثبيت)
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/telegram.js',
    '/js/api.js',
    '/js/app_new.js',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

// أنماط المسارات
const API_PATTERN = /\/api\//;
const STATIC_EXT = /\.(css|js|woff2?|ttf|eot|otf)(\?.*)?$/i;
const IMAGE_EXT = /\.(png|jpg|jpeg|webp|gif|svg|ico)(\?.*)?$/i;
const FONT_DOMAINS = /fonts\.(googleapis|gstatic)\.com/;
const TELEGRAM_SDK = /telegram\.org/;


// ============================================================
// 🚀 Install
// ============================================================
self.addEventListener('install', (event) => {
    console.log('[SW] Installing', CACHE_VERSION);

    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => {
                console.log('[SW] Pre-caching static assets');
                return cache.addAll(PRECACHE_URLS);
            })
            .then(() => self.skipWaiting())
            .catch((err) => {
                console.warn('[SW] Pre-cache failed:', err);
            })
    );
});


// ============================================================
// 🔄 Activate — cleanup old caches
// ============================================================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating', CACHE_VERSION);

    event.waitUntil(
        caches.keys()
            .then((keys) => {
                return Promise.all(
                    keys
                        .filter((key) => key.startsWith('sanad-miniapp-') && key !== CACHE_VERSION)
                        .map((key) => {
                            console.log('[SW] Deleting old cache:', key);
                            return caches.delete(key);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});


// ============================================================
// 🎯 Fetch Handler
// ============================================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // تجاهل non-GET
    if (request.method !== 'GET') return;

    // تجاهل chrome-extension وغيرها
    if (!url.protocol.startsWith('http')) return;

    // 1️⃣ Telegram SDK → network-only
    if (TELEGRAM_SDK.test(url.href)) {
        return; // default browser behavior
    }

    // 2️⃣ API calls → network-only (لا تخزين أبداً)
    if (API_PATTERN.test(url.pathname)) {
        return;
    }

    // 3️⃣ HTML → network-first
    if (request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // 4️⃣ Static (CSS/JS) + Fonts → stale-while-revalidate
    if (STATIC_EXT.test(url.pathname) || FONT_DOMAINS.test(url.hostname)) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }

    // 5️⃣ Images → cache-first
    if (IMAGE_EXT.test(url.pathname)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // 6️⃣ الباقي → network-first
    event.respondWith(networkFirst(request));
});


// ============================================================
// 📥 استراتيجيات
// ============================================================

/**
 * Network-first: جرّب الشبكة، ثم fallback للـ cache
 * يُستخدم للـ HTML (لتحديثات سريعة)
 */
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        // خزّن الرد إن كان ناجحاً
        if (response && response.status === 200) {
            const cache = await caches.open(CACHE_VERSION);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Fallback: index.html
        const fallback = await caches.match('/index.html');
        if (fallback) return fallback;
        throw err;
    }
}

/**
 * Stale-While-Revalidate: أرجع المخزّن فوراً + حدّث في الخلفية
 * يُستخدم للـ CSS/JS/fonts
 */
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(request);

    const fetchPromise = fetch(request)
        .then((response) => {
            if (response && response.status === 200) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch((err) => {
            console.warn('[SW] SWR fetch failed:', err);
            return cached;
        });

    return cached || fetchPromise;
}

/**
 * Cache-first: أرجع المخزّن، أو اجلب من الشبكة
 * يُستخدم للصور
 */
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response && response.status === 200) {
            const cache = await caches.open(CACHE_VERSION);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        // Fallback صورة placeholder
        return new Response('', { status: 404 });
    }
}


// ============================================================
// 📨 Message handler (للتحكم من JS)
// ============================================================
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data?.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_VERSION).then(() => {
            console.log('[SW] Cache cleared');
        });
    }
});