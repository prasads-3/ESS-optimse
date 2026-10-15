// Kill-switch service worker. See public/sw.js for full explanation.
// Some clients registered a stale worker at /service-worker.js; this replaces
// it, purges caches, unregisters itself, and reloads open tabs onto the live,
// worker-free site.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch (e) { /* ignore */ }

    try {
      await self.registration.unregister();
    } catch (e) { /* ignore */ }

    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      try {
        client.navigate(client.url);
      } catch (e) { /* ignore */ }
    }
  })());
});
