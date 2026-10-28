// Website golf.kapital.nl (server/site) in een echte browser, met de Content-Security-Policy uit de
// echte nginx-config en de echte API (geheugendatabase). Controleert dat de CSP niets van de site zelf
// tegenhoudt en dat de beheerpagina werkt: inloggen, overzicht, kaart met Leaflet (SRI) van cdnjs.
//   npm run test:e2e   (Node 22: de API gebruikt node:sqlite)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SITE = path.join(ROOT, 'server/site');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain' };

// De CSP-regels uit de nginx-config van de server: eerst die voor de hele site, dan die van admin.html.
const conf = fs.readFileSync(path.join(ROOT, 'server/nginx-npm/default.conf'), 'utf8');
const csp = [...conf.matchAll(/add_header Content-Security-Policy "([^"]+)"/g)].map((m) => m[1]);
const [CSP_PUBLIC, CSP_ADMIN] = csp;

let api;
let web;
let base;
let browser;

before(async () => {
  const { createServer, openDatabase } = await import('../../server/api/server.js');
  api = createServer(openDatabase(':memory:'), { adminIds: [1], osm: async () => ({ holes: [] }) });
  await new Promise((r) => api.listen(0, '127.0.0.1', r));
  const apiPort = api.address().port;

  // Zoals nginx: /api/ naar de API, /data/courses.js uit de app, de rest uit server/site, met de CSP.
  web = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) {
      const up = http.request({ host: '127.0.0.1', port: apiPort, path: req.url, method: req.method, headers: req.headers }, (r) => {
        res.writeHead(r.statusCode, r.headers);
        r.pipe(res);
      });
      req.pipe(up);
      return;
    }
    const file = url.pathname === '/data/courses.js' ? path.join(ROOT, 'js/courses.js')
      : path.join(SITE, decodeURIComponent(url.pathname).replace(/\/$/, '/index.html'));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
      'Content-Security-Policy': url.pathname === '/admin.html' ? CSP_ADMIN : CSP_PUBLIC,
    });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => web.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${web.address().port}`;
  browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
});
after(async () => {
  await browser?.close();
  for (const s of [web, api]) { s?.closeAllConnections(); s?.close(); }
});

async function open(pathname) {
  const context = await browser.newContext();
  await context.route('https://tile.openstreetmap.org/**', (route) => route.abort()); // kaarttegels niet nodig
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (/Content Security Policy|Refused to|integrity/i.test(m.text())) errors.push(m.text()); });
  await page.goto(base + pathname, { waitUntil: 'load' });
  return { page, context, errors };
}

test('de nginx-config heeft een CSP voor de site en een strengere voor admin.html, plus HSTS', () => {
  assert.equal(csp.length, 2);
  assert.match(CSP_PUBLIC, /default-src 'self'/);
  assert.doesNotMatch(CSP_ADMIN.match(/script-src[^;]*/)[0], /'unsafe-inline'/); // beheerpagina: geen inline scripts
  assert.match(conf, /Strict-Transport-Security/);
});

for (const page of ['/', '/banen.html', '/provincie/overijssel.html', '/handicap-berekenen.html']) {
  test(`openbare pagina ${page}: geen CSP-meldingen of fouten`, { timeout: 60000 }, async () => {
    const { page: p, context, errors } = await open(page);
    try {
      await p.waitForTimeout(500); // scripts na het laden (banenlijst, status van de server)
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });
}

test('beheerpagina: inloggen, overzicht en kaart met Leaflet onder de strenge CSP', { timeout: 60000 }, async () => {
  // Beheerder (account 1) met een GPS-punt, zodat de kaart (Leaflet van cdnjs, met SRI) laadt.
  const post = (p, body, token) => fetch(`${base}${p}`, { method: p === '/api/state' ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  const { token } = await (await post('/api/register', { email: 'baas@example.nl', password: 'wachtwoordB' })).json();
  await post('/api/state', { data: { courses: [{ id: 'par3', name: 'Par 3', geo: { 1: { tee: { lat: 52.5, lon: 6.4 }, green: { lat: 52.501, lon: 6.4 } } } }] } }, token);

  const { page, context, errors } = await open('/admin.html');
  try {
    await page.fill('#email', 'baas@example.nl');
    await page.fill('#password', 'wachtwoordB');
    await page.click('#login-form button[type=submit]');
    await assert.doesNotReject(page.locator('#dash').getByText('Accounts').first().waitFor({ timeout: 10000 }));
    await assert.doesNotReject(page.waitForFunction(() => window.L && document.querySelector('#geo-map.leaflet-container'), null, { timeout: 20000 }), 'Leaflet geladen (SRI klopt)');
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});
