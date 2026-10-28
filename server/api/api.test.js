import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, openDatabase } from './server.js';

let server;
let base;

before(async () => {
  server = createServer(openDatabase(':memory:'));
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const call = async (method, path, { body, token, origin } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
};

test('gezondheid', async () => {
  assert.deepEqual((await call('GET', '/api/health')).body, { ok: true });
});

test('registreren, inloggen, opslaan en ophalen', async () => {
  const reg = await call('POST', '/api/register', { body: { email: 'Rudy@Example.nl', password: 'geheim1234' } });
  assert.equal(reg.status, 201);
  assert.equal(reg.body.user.email, 'rudy@example.nl');
  assert.ok(reg.body.token.length > 30);

  const dup = await call('POST', '/api/register', { body: { email: 'rudy@example.nl', password: 'anders12345' } });
  assert.equal(dup.status, 409);

  const bad = await call('POST', '/api/login', { body: { email: 'rudy@example.nl', password: 'fout' } });
  assert.equal(bad.status, 400); // te kort
  const wrong = await call('POST', '/api/login', { body: { email: 'rudy@example.nl', password: 'foutfoutfout' } });
  assert.equal(wrong.status, 401);

  const login = await call('POST', '/api/login', { body: { email: 'rudy@example.nl', password: 'geheim1234' } });
  assert.equal(login.status, 200);
  const token = login.body.token;

  assert.equal((await call('GET', '/api/state', { token })).body, null);
  const put = await call('PUT', '/api/state', { token, body: { data: { players: [{ name: 'Rudy' }] } } });
  assert.equal(put.status, 200);
  const got = await call('GET', '/api/state', { token });
  assert.deepEqual(got.body.data, { players: [{ name: 'Rudy' }] });
  assert.equal(got.body.updated_at, put.body.updated_at);
});

test('zonder of met verkeerd token geen toegang', async () => {
  assert.equal((await call('GET', '/api/state')).status, 401);
  assert.equal((await call('GET', '/api/state', { token: 'verzonnen' })).status, 401);
});

test('gebruikers zien elkaars gegevens niet', async () => {
  const a = (await call('POST', '/api/register', { body: { email: 'a@example.nl', password: 'wachtwoordA' } })).body.token;
  const b = (await call('POST', '/api/register', { body: { email: 'b@example.nl', password: 'wachtwoordB' } })).body.token;
  await call('PUT', '/api/state', { token: a, body: { data: { van: 'A' } } });
  assert.equal((await call('GET', '/api/state', { token: b })).body, null);
  await call('PUT', '/api/state', { token: b, body: { data: { van: 'B' } } });
  assert.deepEqual((await call('GET', '/api/state', { token: a })).body.data, { van: 'A' });
});

test('uitloggen maakt het token ongeldig', async () => {
  const { token } = (await call('POST', '/api/register', { body: { email: 'c@example.nl', password: 'wachtwoordC' } })).body;
  assert.equal((await call('POST', '/api/logout', { token })).status, 204);
  assert.equal((await call('GET', '/api/me', { token })).status, 401);
});

test('verwijderen haalt account en gegevens weg', async () => {
  const { token } = (await call('POST', '/api/register', { body: { email: 'd@example.nl', password: 'wachtwoordD' } })).body;
  await call('PUT', '/api/state', { token, body: { data: { x: 1 } } });
  assert.equal((await call('DELETE', '/api/state', { token })).status, 204);
  assert.equal((await call('GET', '/api/state', { token })).status, 401);
  assert.equal((await call('POST', '/api/login', { body: { email: 'd@example.nl', password: 'wachtwoordD' } })).status, 401);
});

test('CORS alleen voor de app', async () => {
  const ok = await call('OPTIONS', '/api/state', { origin: 'https://kaprudy.github.io' });
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get('access-control-allow-origin'), 'https://kaprudy.github.io');
  const other = await call('OPTIONS', '/api/state', { origin: 'https://kwaadwillend.example' });
  assert.equal(other.headers.get('access-control-allow-origin'), null);
});

test('ongeldige invoer', async () => {
  assert.equal((await call('POST', '/api/register', { body: { email: 'geen-adres', password: 'wachtwoord1' } })).status, 400);
  const { token } = (await call('POST', '/api/register', { body: { email: 'e@example.nl', password: 'wachtwoordE' } })).body;
  assert.equal((await call('PUT', '/api/state', { token, body: { data: [1, 2] } })).status, 400);
  assert.equal((await call('GET', '/api/onbekend', { token })).status, 404);
});

test('voorbeelden insturen, tellen, leren en verwijderen', async () => {
  const { token } = (await call('POST', '/api/register', { body: { email: 'leer@example.nl', password: 'wachtwoordL' } })).body;
  const sample = (text, final) => ({ v: 1, hole: 4, par: 4, texts: [text], final });
  const samples = [sample('s1 fijf', { s1: 5 }), sample('s1 fijf s2 vier', { s1: 5, s2: 4 }), sample('hal 4 s1 fijf', { s1: 5 }), 'geen object'];
  assert.equal((await call('POST', '/api/samples', { token, body: { samples } })).body.stored, 3);
  assert.equal((await call('GET', '/api/samples/stats', { token })).body.count, 3);
  const vocab = (await call('GET', '/api/vocab')).body; // zonder inloggen
  assert.deepEqual(vocab.numbers, { fijf: 5 });
  assert.equal((await call('POST', '/api/samples', { body: { samples } })).status, 401);
  assert.equal((await call('DELETE', '/api/samples', { token })).status, 204);
  assert.equal((await call('GET', '/api/samples/stats', { token })).body.count, 0);
  assert.deepEqual((await call('GET', '/api/vocab')).body.numbers, {});
});

test('anoniem account per telefoon, later omzetten naar e-mail', async () => {
  const secret = 'x'.repeat(40);
  const first = await call('POST', '/api/device', { body: { secret } });
  assert.equal(first.status, 201);
  assert.deepEqual({ email: first.body.user.email, anonymous: first.body.user.anonymous }, { email: null, anonymous: true });
  const again = await call('POST', '/api/device', { body: { secret } });
  assert.equal(again.status, 200);
  assert.equal(again.body.user.id, first.body.user.id);
  assert.equal((await call('POST', '/api/device', { body: { secret: 'kort' } })).status, 400);

  const token = again.body.token;
  await call('PUT', '/api/state', { token, body: { data: { rondes: 3 } } });
  assert.equal((await call('POST', '/api/account', { token, body: { email: 'rudy@example.nl', password: 'geheim1234' } })).status, 409);
  const up = await call('POST', '/api/account', { token, body: { email: 'Anoniem@Example.nl', password: 'geheim1234' } });
  assert.equal(up.status, 200);
  assert.deepEqual(up.body.user, { id: first.body.user.id, email: 'anoniem@example.nl', anonymous: false, admin: false, perms: [] });
  assert.equal((await call('POST', '/api/account', { token, body: { email: 'z@example.nl', password: 'geheim1234' } })).status, 400);

  // Gegevens blijven, inloggen met e-mail werkt, de apparaatcode geeft geen toegang meer tot dit account.
  const login = await call('POST', '/api/login', { body: { email: 'anoniem@example.nl', password: 'geheim1234' } });
  assert.deepEqual((await call('GET', '/api/state', { token: login.body.token })).body.data, { rondes: 3 });
  const fresh = await call('POST', '/api/device', { body: { secret } });
  assert.equal(fresh.status, 201);
  assert.notEqual(fresh.body.user.id, first.body.user.id);
});

test('bestaande database krijgt de nieuwe kolom', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = `${fs.mkdtempSync(`${os.tmpdir()}/golf-`)}/oud.db`;
  const old = new DatabaseSync(path);
  old.exec("CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, pw_hash TEXT NOT NULL, created_at TEXT NOT NULL)");
  old.exec("INSERT INTO users (email, pw_hash, created_at) VALUES ('oud@example.nl', 'x', 'nu')");
  old.close();
  const migrated = openDatabase(path);
  assert.ok(migrated.prepare('PRAGMA table_info(users)').all().some((c) => c.name === 'device_hash'));
  openDatabase(path).close(); // tweede keer: geen fout
  migrated.close();
  fs.rmSync(path.replace(/\/oud\.db$/, ''), { recursive: true });
});

test('beheeroverzicht alleen voor beheerders', async () => {
  const adminServer = createServer(openDatabase(':memory:'), { adminEmails: ['baas@example.nl'] });
  await new Promise((r) => adminServer.listen(0, r));
  const url = `http://127.0.0.1:${adminServer.address().port}`;
  const post = async (path, body, token) => (await fetch(url + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
  })).json();
  const get = (path, token) => fetch(url + path, { headers: { Authorization: `Bearer ${token}` } });
  try {
    const baas = (await post('/api/register', { email: 'baas@example.nl', password: 'wachtwoordB' })).token;
    const dev = (await post('/api/device', { secret: 'y'.repeat(40) })).token;
    await post('/api/samples', { samples: [{ v: 1, hole: 1, par: 4, texts: ['s1 fijf'], parsed: {}, final: { s1: 5 } }] }, dev);
    assert.equal((await get('/api/admin/overview', dev)).status, 403);
    const res = await get('/api/admin/overview', baas);
    assert.equal(res.status, 200);
    const o = await res.json();
    assert.deepEqual([o.users.total, o.users.anonymous, o.users.email], [2, 1, 1]);
    assert.equal(o.samples.total, 1);
    assert.equal(o.samples.firstTimeRight, 0);
    assert.deepEqual(o.candidates.map((c) => [c.word, c.value, c.learned]), [['fijf', 5, false]]);
    assert.equal(o.recentUsers.find((u) => u.email == null).samples, 1);
    assert.equal(JSON.stringify(o).includes('pw_hash'), false);

    // Sessies, rondes en GPS-punten
    const ev = await post('/api/events', { events: [
      { kind: 'open', at: new Date().toISOString(), data: { gps: true, standalone: true } },
      { kind: 'open', at: '2099-01-01T00:00:00Z', data: { gps: false } },
      { kind: 'round_start', data: { course: 'par3', holes: 'front' } },
      { kind: 'onbekend' },
    ] }, dev);
    assert.equal(ev.stored, 3);
    await fetch(`${url}/api/state`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dev}` },
      body: JSON.stringify({ data: { courses: [{ id: 'par3', name: 'Par 3', geo: { 1: { tee: { lat: 52.5, lon: 6.4 }, green: { lat: 52.501, lon: 6.4 } } } }] } }) });
    await fetch(`${url}/api/state`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${baas}` },
      body: JSON.stringify({ data: { courses: [{ id: 'par3', geo: { 1: { tee: { lat: 52.5002, lon: 6.4 } } } }] } }) });
    const o2 = await (await get('/api/admin/overview', baas)).json();
    assert.deepEqual([o2.sessions.last7, o2.sessions.users7, o2.sessions.gpsUsers, o2.sessions.installed], [2, 1, 1, 1]);
    // Alleen punten van wie ze mag vastleggen tellen mee: eerst alleen de beheerder
    assert.equal(o2.geo[0].points.find((p) => p.kind === 'tee').n, 1);
    // Recht toekennen (alleen door een beheerder)
    const devId = o2.recentUsers.find((u) => u.email == null).id;
    assert.equal((await fetch(`${url}/api/admin/perms`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dev}` }, body: JSON.stringify({ userId: devId, perm: 'gps-mark', on: true }) })).status, 403);
    const granted = await post('/api/admin/perms', { userId: devId, perm: 'gps-mark', on: true }, baas);
    assert.deepEqual(granted.user.perms, ['gps-mark']);
    assert.deepEqual((await (await get('/api/me', dev)).json()).user.perms, ['gps-mark']);
    assert.deepEqual((await (await get('/api/me', baas)).json()).user, { id: 1, email: 'baas@example.nl', anonymous: false, admin: true, perms: ['gps-mark'] });
    const o3 = await (await get('/api/admin/overview', baas)).json();
    assert.deepEqual(o3.rounds, [{ course: 'par3', started: 1, saved: 0, users: 1, name: 'Par 3' }]);
    const tee = o3.geo[0].points.find((p) => p.kind === 'tee');
    assert.equal(tee.n, 2);
    assert.ok(tee.spreadM >= 10 && tee.spreadM <= 12, String(tee.spreadM));
    assert.deepEqual(o3.recentUsers.find((u) => u.id === devId).perms, ['gps-mark']);
  } finally {
    adminServer.close();
  }
});

test('OpenStreetMap-baan ophalen (met cache, alleen ingelogd)', async () => {
  let calls = 0;
  const osmServer = createServer(openDatabase(':memory:'), { osm: async (p) => { calls++; return { source: 'test', holes: [], query: p }; } });
  await new Promise((r) => osmServer.listen(0, r));
  const url = `http://127.0.0.1:${osmServer.address().port}`;
  try {
    const token = (await (await fetch(`${url}/api/device`, { method: 'POST', body: JSON.stringify({ secret: 'o'.repeat(40) }) })).json()).token;
    const get = (q, t = token) => fetch(`${url}/api/osm/course${q}`, { headers: t ? { Authorization: `Bearer ${t}` } : {} });
    assert.equal((await get('?name=Hooge', null)).status, 401);
    assert.equal((await get('')).status, 400);
    assert.deepEqual((await (await get('?name=Hooge%20Graven')).json()).query, { name: 'Hooge Graven' });
    await get('?name=Hooge%20Graven');
    assert.equal(calls, 1);
  } finally {
    osmServer.close();
  }
});

test('opslaan alleen als de cloudversie niet tussendoor gewijzigd is', async () => {
  const { token } = (await call('POST', '/api/register', { body: { email: 'twee@example.nl', password: 'wachtwoordT' } })).body;
  const first = await call('PUT', '/api/state', { token, body: { data: { v: 1 }, baseUpdatedAt: null } });
  assert.equal(first.status, 200);
  assert.equal((await call('PUT', '/api/state', { token, body: { data: { v: 2 }, baseUpdatedAt: null } })).status, 409);
  const stale = await call('PUT', '/api/state', { token, body: { data: { v: 2 }, baseUpdatedAt: '2000-01-01T00:00:00.000Z' } });
  assert.deepEqual([stale.status, stale.body.updated_at], [409, first.body.updated_at]);
  assert.equal((await call('PUT', '/api/state', { token, body: { data: { v: 3 }, baseUpdatedAt: first.body.updated_at } })).status, 200);
  assert.deepEqual((await call('GET', '/api/state', { token })).body.data, { v: 3 });
});
