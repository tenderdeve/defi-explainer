// Kill-switch service worker.
// A leftover Workbox service worker from a previous app on this origin was
// intercepting requests and serving stale assets. The browser periodically
// re-fetches this script to check for updates; serving this self-unregistering
// worker makes it tear itself down, drop all caches, and reload open tabs.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {}
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});
