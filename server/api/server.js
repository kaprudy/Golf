// Golfscore API – opslag van de app-gegevens per gebruiker.
// Geen externe pakketten: Node's eigen http, crypto en sqlite.
//
//   POST   /api/register   {email, password}  -> {token, user}
//   POST   /api/login      {email, password}  -> {token, user}
//   POST   /api/logout                          (Authorization: Bearer <token>)
//   GET    /api/me                              -> {user}
//   GET    /api/state                           -> {data, updated_at} | null
//   PUT    /api/state      {data}              -> {updated_at}
//   DELETE /api/state                           -> gegevens en account verwijderen
//   GET    /api/health                          -> {ok:true}

import http from 'node:http';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const PORT = Number(process.env.PORT ?? 3000);
const DB_PATH = process.env.DB_PATH ?? '/data/golf.db';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'https://kaprudy.github.io,https://golf.kapital.nl')
  .split(',').map((s) => s.trim()).filter(Boolean);
const MAX_BODY = 2 * 1024 * 1024; // ruim genoeg voor jaren aan rondes
const TOKEN_DAYS = 180;

// ---------- Database ----------

export function openDatabase(path = DB_PATH) {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY,
      email      TEXT NOT NULL UNIQUE,
      pw_hash    TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS golf_state (
      user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      data       TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

// ---------- Wachtwoorden en tokens ----------

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, SCRYPT);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function verifyPassword(password, stored) {
  const [, salt, hash] = stored.split('$');
  const expected = Buffer.from(hash, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(salt, 'base64'), expected.length, SCRYPT);
  return crypto.timingSafeEqual(actual, expected);
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// ---------- Beperking op pogingen (in het geheugen) ----------

const attempts = new Map(); // sleutel -> {count, resetAt}
function tooMany(key, limit = 10, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || a.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  a.count++;
  return a.count > limit;
}

// ---------- HTTP-hulpjes ----------

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new HttpError(413, 'Te veel gegevens')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new HttpError(400, 'Ongeldige JSON')); }
    });
    req.on('error', reject);
  });
}

function send(res, status, body, headers = {}) {
  const payload = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(payload);
}

function corsHeaders(origin) {
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const validEmail = (e) => typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const publicUser = (u) => ({ id: u.id, email: u.email });

// ---------- Server ----------

export function createServer(db) {
  const q = {
    userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
    insertUser: db.prepare('INSERT INTO users (email, pw_hash, created_at) VALUES (?, ?, ?)'),
    insertSession: db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)'),
    session: db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
                         WHERE s.token_hash = ? AND s.expires_at > ?`),
    deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
    pruneSessions: db.prepare('DELETE FROM sessions WHERE expires_at <= ?'),
    getState: db.prepare('SELECT data, updated_at FROM golf_state WHERE user_id = ?'),
    putState: db.prepare(`INSERT INTO golf_state (user_id, data, updated_at) VALUES (?, ?, ?)
                          ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`),
    deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),
  };

  function newSession(user) {
    const token = crypto.randomBytes(32).toString('base64url');
    const expires = new Date(Date.now() + TOKEN_DAYS * 864e5).toISOString();
    q.insertSession.run(sha256(token), user.id, expires);
    return { token, user: publicUser(user) };
  }

  function authUser(req) {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    if (!m) throw new HttpError(401, 'Niet ingelogd');
    const user = q.session.get(sha256(m[1]), new Date().toISOString());
    if (!user) throw new HttpError(401, 'Sessie verlopen, log opnieuw in');
    return { user, tokenHash: sha256(m[1]) };
  }

  async function route(req, res, ip) {
    const url = new URL(req.url, 'http://localhost');
    const key = `${req.method} ${url.pathname}`;

    if (key === 'GET /api/health') return send(res, 200, { ok: true });

    if (key === 'POST /api/register' || key === 'POST /api/login') {
      if (tooMany(`ip:${ip}`, 30)) throw new HttpError(429, 'Te veel pogingen, probeer het later opnieuw');
      const { email: rawEmail, password } = await readJson(req);
      const email = String(rawEmail ?? '').trim().toLowerCase();
      if (!validEmail(email)) throw new HttpError(400, 'Vul een geldig e-mailadres in');
      if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
        throw new HttpError(400, 'Het wachtwoord moet minstens 8 tekens hebben');
      }
      if (key === 'POST /api/register') {
        if (q.userByEmail.get(email)) throw new HttpError(409, 'Er bestaat al een account met dit e-mailadres');
        q.insertUser.run(email, hashPassword(password), new Date().toISOString());
        return send(res, 201, newSession(q.userByEmail.get(email)));
      }
      if (tooMany(`login:${email}`, 10)) throw new HttpError(429, 'Te veel pogingen, probeer het later opnieuw');
      const user = q.userByEmail.get(email);
      // Ook bij een onbekend adres een hash berekenen, zodat de responstijd niets verraadt.
      const ok = user ? verifyPassword(password, user.pw_hash) : (hashPassword(password), false);
      if (!ok) throw new HttpError(401, 'E-mailadres of wachtwoord klopt niet');
      attempts.delete(`login:${email}`);
      q.pruneSessions.run(new Date().toISOString());
      return send(res, 200, newSession(user));
    }

    const { user, tokenHash } = authUser(req);

    if (key === 'GET /api/me') return send(res, 200, { user: publicUser(user) });
    if (key === 'POST /api/logout') {
      q.deleteSession.run(tokenHash);
      return send(res, 204);
    }
    if (key === 'GET /api/state') {
      const row = q.getState.get(user.id);
      return send(res, 200, row ? { data: JSON.parse(row.data), updated_at: row.updated_at } : null);
    }
    if (key === 'PUT /api/state') {
      const { data } = await readJson(req);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Geen geldige gegevens');
      const updatedAt = new Date().toISOString();
      q.putState.run(user.id, JSON.stringify(data), updatedAt);
      return send(res, 200, { updated_at: updatedAt });
    }
    if (key === 'DELETE /api/state') {
      q.deleteUser.run(user.id); // verwijdert ook sessies en gegevens (cascade)
      return send(res, 204);
    }
    throw new HttpError(404, 'Niet gevonden');
  }

  return http.createServer(async (req, res) => {
    const cors = corsHeaders(req.headers.origin);
    for (const [k, v] of Object.entries(cors)) res.setHeader(k, v);
    if (req.method === 'OPTIONS') return send(res, 204);
    const ip = (req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim();
    try {
      await route(req, res, ip);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status === 500) console.error(err);
      send(res, status, { error: status === 500 ? 'Serverfout' : err.message });
    }
  });
}

// Direct gestart (niet geïmporteerd door de tests)
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createServer(openDatabase());
  server.listen(PORT, () => console.log(`Golfscore API luistert op poort ${PORT}`));
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}
