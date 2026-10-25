// ============================================================
// 🛑 SANAD+ MiniApp — Service Worker (v18.3.0) — SELF-DESTRUCT
// ============================================================
// هذا الملف يُلغي نفسه ويحذف كل الكاش.
// السبب: SW كان يخدم نسخاً قديمة من JS/CSS، فيعطل المنتجات.
// الحل: Vercel cache headers كافية — لا حاجة لـ SW.
// ============================================================

self.addEventListener('install', (event) => {
    console.log('[SW] Installing self-destruct version');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating — clearing all caches and unregistering');
    event.waitUntil(
        Promise.all([
            caches.keys().then((keys) => {
                return Promise.all(keys.map((key) => caches.delete(key)));
            }),
            self.registration.unregister(),
        ]).then(() => {
            // أعد تحميل كل التبويبات المفتوحة
            return self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    if ('navigate' in client) {
                        client.navigate(client.url);
                    }
                });
            });
        })
    );
});