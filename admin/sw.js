// ============================================================
// 🎛️ SANAD+ Admin — Service Worker (v18.2.3)
// ============================================================

const CACHE_VERSION = 'sanad-admin-v18.2.3-2026-09-25';

const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/css/admin.css',
    '/js/api.js',
    '/js/admin.js',
    '/js/admin-v16.js',
    '/js/admin-v17.js',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

const API_PATTERN = /\/admin\/api\/|\/api\//;
const STATIC_EXT = /\.(css|js|woff2?|ttf|eot|otf)(\?.*)?$/i;
const IMAGE_EXT = /\.(png|jpg|jpeg|webp|gif|svg|ico)(\?.*)?$/i;
const FONT_DOMAINS = /fonts\.(googleapis|gstatic)\.com/;
const TELEGRAM_SDK = /telegram\.org/;


self.addEventListener('install', (event) => {
    console.log('[SW] Admin installing', CACHE_VERSION);
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
            .catch((err) => console.warn('[SW] Pre-cache failed:', err))
    );
});


self.addEventListener('activate', (event) => {
    console.log('[SW] Admin activating', CACHE_VERSION);
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key.startsWith('sanad-admin-') && key !== CACHE_VERSION)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});


self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;
    if (!url.protocol.startsWith('http')) return;
    if (TELEGRAM_SDK.test(url.href)) return;
    if (API_PATTERN.test(url.pathname)) return;

    if (request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(networkFirst(request));
        return;
    }

    if (STATIC_EXT.test(url.pathname) || FONT_DOMAINS.test(url.hostname)) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }

    if (IMAGE_EXT.test(url.pathname)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    event.respondWith(networkFirst(request));
});


async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response && response.status === 200) {
            const cache = await caches.open(CACHE_VERSION);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;
        const fallback = await caches.match('/index.html');
        if (fallback) return fallback;
        throw err;
    }
}

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
        .catch(() => cached);

    return cached || fetchPromise;
}

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
        return new Response('', { status: 404 });
    }
}

self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
    if (event.data?.type === 'CLEAR_CACHE') caches.delete(CACHE_VERSION);
});