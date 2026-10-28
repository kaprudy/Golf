// Offline-ondersteuning: de app werkt op de baan ook zonder (goed) bereik.
// - App-bestanden komen direct uit de cache; op de achtergrond wordt de nieuwste versie opgehaald.
// - Synchroniseren op de achtergrond (Background Sync): zie js/bgsync.js.
const CACHE = 'golfscore-v31';
const FILES = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/parser.js', 'js/handicap.js', 'js/sync.js', 'js/gps.js', 'js/learning.js', 'js/courses.js', 'js/bgsync.js', 'js/buggy.js', 'js/buggy-protocol.js', 'js/config.js', 'js/cloud.js', 'js/ai.js', 'js/vendor/anthropic-sdk.js', 'manifest.webmanifest', 'icon.svg',
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

// Eerst de cache (direct, ook bij traag bereik), ondertussen de nieuwste versie ophalen voor de
// volgende keer. Nieuwe versies van de app krijgen een nieuwe CACHE-naam en worden bij de
// installatie van de service worker in één keer opgehaald.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const navigation = e.request.mode === 'navigate';
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(e.request, { ignoreSearch: navigation });
    const network = fetch(e.request)
      .then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; })
      .catch(() => null);
    if (cached) { e.waitUntil(network); return cached; }
    const fresh = await network;
    if (fresh) return fresh;
    return (navigation && await cache.match('index.html')) || Response.error();
  })());
});

// ---------- Synchroniseren op de achtergrond ----------

function idb(mode, fn) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('golfscore-bg', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const t = db.transaction('kv', mode);
      const r = fn(t.objectStore('kv'));
      t.oncomplete = () => { db.close(); resolve(r?.result); };
      t.onerror = () => { db.close(); reject(t.error); };
    };
  });
}

async function pushPending() {
  const p = await idb('readonly', (s) => s.get('pending'));
  if (!p) return;
  const res = await fetch(`${p.url}/api/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.token}` },
    body: JSON.stringify({ data: p.data, baseUpdatedAt: p.baseUpdatedAt }),
  }); // geen verbinding: fout, en de browser probeert het later opnieuw
  if (res.ok) {
    const { updated_at: updatedAt } = await res.json();
    await idb('readwrite', (s) => { s.put({ updatedAt, localChangedAt: p.localChangedAt }, 'result'); return s.delete('pending'); });
    for (const c of await self.clients.matchAll()) c.postMessage({ type: 'golf-synced' });
  } else if (res.status === 409 || res.status === 401 || res.status === 400) {
    // Tussendoor gewijzigd op een ander toestel (of niet meer ingelogd): de app voegt samen bij openen.
    await idb('readwrite', (s) => s.delete('pending'));
  } else {
    throw new Error(`Server ${res.status}`); // later opnieuw
  }
}

self.addEventListener('sync', (e) => {
  if (e.tag === 'golf-sync') e.waitUntil(pushPending());
});
