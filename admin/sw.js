// ============================================================
// 🛑 SANAD+ Admin — Service Worker (v18.3.0) — SELF-DESTRUCT
// ============================================================

self.addEventListener('install', (event) => {
    console.log('[SW] Admin installing self-destruct version');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Admin activating — clearing all caches and unregistering');
    event.waitUntil(
        Promise.all([
            caches.keys().then((keys) => {
                return Promise.all(keys.map((key) => caches.delete(key)));
            }),
            self.registration.unregister(),
        ]).then(() => {
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