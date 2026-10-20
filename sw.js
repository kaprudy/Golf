// Offline-ondersteuning: de app werkt op de baan ook zonder bereik (behalve de AI).
const CACHE = 'golfscore-v4';
const FILES = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/parser.js', 'js/handicap.js', 'js/ai.js', 'js/vendor/anthropic-sdk.js', 'manifest.webmanifest', 'icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Eerst netwerk (zodat updates direct binnenkomen), bij geen bereik de cache.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request)),
  );
});
