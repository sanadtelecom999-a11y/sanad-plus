// Service Worker — Admin Panel v14
const CACHE_NAME = 'sanad-admin-v14';
const ASSETS = [
    '/',
    '/index.html',
    '/css/admin.css?v=14',
    '/js/api.js?v=14',
    '/js/admin.js?v=14',
    '/manifest.json',
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(() => {}))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // لا تتدخل في API calls
    if (url.pathname.startsWith('/admin/api') ||
        url.pathname.startsWith('/api') ||
        url.hostname.includes('onrender.com')) {
        return;
    }

    // Network-first للملفات الثابتة
    event.respondWith(
        fetch(request)
            .then((response) => {
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                return response;
            })
            .catch(() => caches.match(request))
    );
});