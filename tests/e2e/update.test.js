// Nieuwe versie van de app: de service worker haalt hem op als de app weer in beeld komt, en de app
// herlaadt zichzelf (niet midden in het typen). Echte browser (Chromium via Playwright); de testserver
// levert eerst versie 1 en daarna versie 2 van sw.js.
//   npm run test:e2e
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
let version = 1;

before(async () => {
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html');
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    // Zoals de deploy: elke versie een eigen cachenaam.
    if (rel === '/sw.js') res.end(fs.readFileSync(file, 'utf8').replace(/const CACHE = 'golfscore-[^']*';/, `const CACHE = 'golfscore-test-${version}';`));
    else fs.createReadStream(file).pipe(res);
  });
  // localhost (niet 127.0.0.1): alleen daar registreert de app de service worker zonder https.
  await new Promise((r) => server.listen(0, 'localhost', r));
  base = `http://localhost:${server.address().port}`;
  browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
});
after(async () => {
  await browser?.close();
  server?.closeAllConnections();
  server?.close();
});

async function openApp() {
  version = 1;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route('https://golf.kapital.nl/**', (route) => route.abort());
  await context.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('golfscore-device', JSON.stringify({ off: true })); // geen anoniem account
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Wat de Content-Security-Policy (index.html) tegenhoudt, telt ook als fout.
  page.on('console', (m) => { if (/Content Security Policy|Refused to/.test(m.text())) errors.push(m.text()); });
  await page.goto(`${base}/index.html`);
  // Eerste installatie: de service worker neemt de pagina over zonder te herladen.
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 20000 });
  await page.evaluate(() => { window.zelfdePagina = true; });
  return { page, context, errors };
}

// Nieuwe versie uitrollen en de app laten kijken, zoals bij terugkomen uit de achtergrond.
async function deployAndReturn(page) {
  version = 2;
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
}

test('nieuwe versie: app herlaadt zichzelf en meldt het', { timeout: 60000 }, async () => {
  const { page, context, errors } = await openApp();
  try {
    await deployAndReturn(page);
    await assert.doesNotReject(page.locator('#toast').getByText('Nieuwe versie van de app geladen.').waitFor({ timeout: 20000 }));
    assert.equal(await page.evaluate(() => window.zelfdePagina), undefined, 'de pagina is herladen');
    assert.ok((await page.evaluate(() => caches.keys())).includes('golfscore-test-2'));
    assert.equal((await page.evaluate(() => caches.keys())).includes('golfscore-test-1'), false, 'oude cache opgeruimd');
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test('nieuwe versie: niet herladen zolang je typt', { timeout: 60000 }, async () => {
  const { page, context } = await openApp();
  try {
    await page.evaluate(() => {
      const input = Object.assign(document.createElement('input'), { id: 'typen' });
      document.body.append(input);
      input.focus();
    });
    await deployAndReturn(page);
    await page.waitForFunction(() => caches.keys().then((k) => k.includes('golfscore-test-2')), null, { timeout: 20000 });
    await page.waitForTimeout(1500);
    assert.equal(await page.evaluate(() => window.zelfdePagina), true, 'tijdens het typen niet herladen');
    await page.evaluate(() => document.getElementById('typen').blur());
    await assert.doesNotReject(page.locator('#toast').getByText('Nieuwe versie van de app geladen.').waitFor({ timeout: 20000 }));
  } finally {
    await context.close();
  }
});
