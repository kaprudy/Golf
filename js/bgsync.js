// Synchroniseren op de achtergrond: de laatste versie van de gegevens staat klaar in IndexedDB,
// zodat de service worker (sw.js) hem kan versturen zodra er weer bereik is, ook als de app
// al dicht is (Background Sync, Chrome op Android). Op de iPhone probeert de app het zelf
// opnieuw zolang hij open is.
const DB = 'golfscore-bg';
const STORE = 'kv';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); resolve(result?.result); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
}

export const bgGet = (key) => tx('readonly', (s) => s.get(key));
export const bgSet = (key, value) => tx('readwrite', (s) => s.put(value, key));
export const bgDelete = (key) => tx('readwrite', (s) => s.delete(key));

// pending: { url, token, data, baseUpdatedAt, localChangedAt }
export async function queuePush(pending) {
  try {
    await bgSet('pending', pending);
    const reg = await navigator.serviceWorker?.ready;
    await reg?.sync?.register('golf-sync');
    return Boolean(reg?.sync);
  } catch {
    return false; // geen IndexedDB of Background Sync: de app probeert het zelf opnieuw
  }
}
