// Very small offline-cache service worker so the PWA install criteria are met.
const CACHE = 'lovelink-v1';

self.addEventListener('install', (e) => self.skipWaiting());

self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only cache same-origin static assets (never Firebase/PeerJS API calls).
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/__/')) return;

  e.respondWith(
    caches.open(CACHE).then((cache) =>
      fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            cache.put(req, res.clone());
          }
          return res;
        })
        .catch(() => cache.match(req).then((c) => c || cache.match('/')))
    )
  );
});
