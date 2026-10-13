// LYRA online edition: remove outdated cache-first offline app assets.
// Realtime messaging requires a live network connection.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('lyra-ui-')).map(name => caches.delete(name)));
    await self.clients.claim();
    await self.registration.unregister();
  })());
});
