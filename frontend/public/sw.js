// Kill-switch service worker.
//
// This app does NOT ship a PWA / service worker. However some browsers still
// have a stale service worker registered from an earlier build (or a previous
// app served on this same host:port). That stale worker intercepts navigations
// and serves outdated cached bundles, which shows up as a blank page,
// "Class extends value undefined", or a chrome-error://chromewebdata/ navigation
// failure ("Unsafe attempt to load URL ... from frame with URL chrome-error://").
//
// Serving this file at /sw.js (and /service-worker.js) makes the browser replace
// the stale worker with this one, which then wipes all caches, unregisters
// itself, and reloads any open tabs onto the live, worker-free site.
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
