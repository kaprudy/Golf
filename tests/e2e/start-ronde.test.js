// Doorloopt het starten van een ronde in een echte browser (Chromium via Playwright):
// baan kiezen → 9 holes → Voorste negen → Wie spelen er? → Start ronde.
// De server (golf.kapital.nl) wordt nagebootst; geen netwerk nodig behalve localhost.
//   npm run test:e2e            (eenmalig: npx playwright install chromium)
//   PW_CHANNEL=chrome npm run test:e2e   (met de geïnstalleerde Chrome)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png' };

let server;
let base;
let browser;

before(async () => {
  // Kleine statische server voor de app (zoals GitHub Pages).
  server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
});
after(async () => {
  await browser?.close();
  server?.closeAllConnections();
  server?.close();
});

// Nagebootste API: ingelogd, en in de cloud staat een nieuwere versie van de gegevens.
async function fakeApi(context, remoteData) {
  const remote = { data: remoteData, updated_at: new Date().toISOString() };
  await context.route('https://golf.kapital.nl/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    const method = route.request().method();
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (pathname === '/api/me') return json({ user: { id: 1, email: 'test@example.nl', anonymous: false, admin: false, perms: [] } });
    if (pathname === '/api/state' && method === 'GET') return json(remote);
    if (pathname === '/api/state' && method === 'PUT') return json({ updated_at: new Date().toISOString() });
    if (pathname === '/api/vocab') return json({ numbers: {}, holeWords: [], samples: 0 });
    return json({ stored: 0, ok: true });
  });
}

async function openApp({ local, remote }) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const errors = [];
  if (remote) await fakeApi(context, remote);
  else await context.route('https://golf.kapital.nl/**', (route) => route.abort());
  await context.addInitScript(([state, loggedIn]) => {
    if (sessionStorage.getItem('seeded')) return; // alleen bij de eerste keer laden
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    if (state) localStorage.setItem('golfscore-v1', JSON.stringify(state));
    if (loggedIn) localStorage.setItem('golfscore-cloud', JSON.stringify({ token: 't', user: { id: 1, email: 'test@example.nl' } }));
    else localStorage.setItem('golfscore-device', JSON.stringify({ off: true }));
  }, [local, Boolean(remote)]);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/index.html`);
  return { page, context, errors };
}

const twoDaysAgo = new Date(Date.now() - 2 * 864e5).toISOString();
// Gegevens zoals een oudere versie van de app ze bewaarde: zonder playerPool.
const oldState = (extra = {}) => ({
  players: [{ name: 'Rudy', index: 18.4, tee: 'geel' }, { name: 'Peter', index: null, tee: 'geel' }],
  courses: [],
  history: [],
  round: { id: 1, date: twoDaysAgo, startedAt: twoDaysAgo, courseId: 'hooge-graven', holesChoice: 'front', currentHole: 1, scores: {}, log: [] },
  homeCourseId: 'hooge-graven',
  ...extra,
});

async function startFrontNine(page) {
  const sheet = page.locator('#after-round-body');
  await sheet.getByRole('button', { name: /Hooge Graven \(18 holes\)/ }).click();
  await sheet.getByRole('button', { name: /9 holes/ }).click();
  await sheet.getByRole('button', { name: /Voorste negen/ }).click();
  await assert.doesNotReject(sheet.getByText('Wie spelen er?').waitFor({ timeout: 5000 }), 'na "Voorste negen" komt de stap "Wie spelen er?"');
  await sheet.getByRole('button', { name: 'Start ronde' }).click();
  await page.locator('#after-round').waitFor({ state: 'hidden', timeout: 5000 });
}

test('voorste negen starten zonder account', { timeout: 60000 }, async () => {
  const { page, context, errors } = await openApp({ local: oldState({ playerPool: [] }) });
  try {
    await startFrontNine(page);
    await assert.doesNotReject(page.locator('#course-sub').getByText('holes 1–9').waitFor({ timeout: 5000 }));
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test('voorste negen starten na synchroniseren met oudere cloudgegevens (zonder playerPool)', { timeout: 60000 }, async () => {
  const { page, context, errors } = await openApp({
    local: oldState({ playerPool: [], sync: { localChangedAt: null, syncedAt: '2000-01-01T00:00:00.000Z' } }),
    remote: oldState(),
  });
  try {
    // Wachten tot de cloudversie binnen is (de app zegt "Gesynchroniseerd").
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('golfscore-v1') ?? '{}').sync?.syncedAt > '2001', null, { timeout: 10000 });
    await startFrontNine(page);
    await assert.doesNotReject(page.locator('#course-sub').getByText('holes 1–9').waitFor({ timeout: 5000 }));
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});
