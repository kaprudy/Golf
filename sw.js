// Offline-ondersteuning: de app werkt op de baan ook zonder bereik (behalve de AI).
const CACHE = 'golfscore-v14';
const FILES = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/parser.js', 'js/handicap.js', 'js/sync.js', 'js/buggy.js', 'js/buggy-protocol.js', 'js/config.js', 'js/cloud.js', 'js/vendor/supabase.js', 'js/ai.js', 'js/vendor/anthropic-sdk.js', 'manifest.webmanifest', 'icon.svg',
  'img/hooge-graven-1-9.webp', 'img/hooge-graven-10-18.webp', 'img/hooge-graven-par3.webp',
  ...Array.from({ length: 18 }, (_, i) => [`img/holes/hg-${i + 1}.webp`, `img/holes/hg-pin-${i + 1}.webp`]).flat(),
  ...Array.from({ length: 9 }, (_, i) => `img/holes/par3-${i + 1}.webp`)];

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
