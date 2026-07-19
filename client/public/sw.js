// Be With Me — Service Worker (push notifications + PWA installability)
//
// SAFETY CONTRACT — read before touching:
//   1. NO fetch handler, ever. The browser's default behavior IS pure
//      network passthrough. This app is live video + real-time commerce;
//      a stale cache on an API or media response is catastrophic, so this
//      SW intentionally never intercepts requests and never opens a cache.
//   2. Versioned + kill-switch. Bump SW_VERSION to force an update roll.
//      To remotely disable the SW on every client, deploy any file at
//      client/public/sw-disable (a 200 on /sw-disable = unregister self).
//      While the file is absent, /sw-disable 404s and the SW stays active.
//      _app.tsx performs the same check page-side as a belt-and-braces.
const SW_VERSION = 'v2-passthrough-2026-07-19';

self.addEventListener('install', () => {
  // Activate updated SW versions immediately — safe because we never cache.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();

      // Kill-switch: if /sw-disable exists (HTTP 200), unregister ourselves.
      try {
        const res = await fetch('/sw-disable', { cache: 'no-store' });
        if (res.ok) {
          await self.registration.unregister();
          return;
        }
      } catch {
        // Network failure — stay registered; push must keep working offline.
      }

      // Hygiene: delete any Cache Storage entries a past (or future, rolled
      // back) SW version may have created. This SW never caches, so anything
      // found here is stale by definition.
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch {}
    })()
  );
});

// ─── Push notifications (unchanged behavior) ───

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || '',
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
      data: { url: data.url || '/' },
      actions: [{ action: 'open', title: 'Open' }],
    };

    event.waitUntil(self.registration.showNotification(data.title || 'Be With Me', options));
  } catch {
    // Fallback for plain text
    event.waitUntil(
      self.registration.showNotification('Be With Me', { body: event.data.text() })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if available
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      return clients.openWindow(url);
    })
  );
});
