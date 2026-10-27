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
