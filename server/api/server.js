// Golfscore API – opslag van de app-gegevens per gebruiker.
// Geen externe pakketten: Node's eigen http, crypto en sqlite.
//
//   POST   /api/register   {email, password}  -> {token, user}
//   POST   /api/login      {email, password}  -> {token, user}
//   POST   /api/device     {secret}           -> {token, user}   anoniem account voor deze telefoon
//   POST   /api/account    {email, password}  -> {user}          anoniem account omzetten naar e-mail
//   POST   /api/logout                          (Authorization: Bearer <token>)
//   GET    /api/me                              -> {user}
//   GET    /api/state                           -> {data, updated_at} | null
//   PUT    /api/state      {data}              -> {updated_at}
//   DELETE /api/state                           -> gegevens en account verwijderen
//   POST   /api/samples    {samples:[...]}     -> {stored}   ingesproken tekst (met toestemming)
//   GET    /api/samples/stats                   -> {count}
//   DELETE /api/samples                         -> eigen voorbeelden verwijderen
//   GET    /api/vocab                           -> geleerde woorden (voor iedereen, zonder inloggen)
//   POST   /api/events     {events:[...]}      -> {stored}   gebruik: app geopend, ronde gestart/opgeslagen
//   GET    /api/osm/course?name=…|lat=…&lon=…   -> holes (tee, green, par) uit OpenStreetMap
//   POST   /api/admin/perms {userId, perm, on}   -> rechten toekennen (bijv. 'gps-mark')
//   GET    /api/admin/overview                  -> overzicht voor beheerders (ADMIN_EMAILS)
//   GET    /api/health                          -> {ok:true}

import http from 'node:http';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { learnVocabulary, wordStats } from './learn.js';
import { fetchCourse } from './osm.js';

const PORT = Number(process.env.PORT ?? 3000);
const DB_PATH = process.env.DB_PATH ?? '/data/golf.db';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'https://kaprudy.github.io,https://golf.kapital.nl')
  .split(',').map((s) => s.trim()).filter(Boolean);
// Beheerders: e-mailadressen (komma-gescheiden) die het overzicht op /admin.html mogen zien.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const MAX_BODY = 2 * 1024 * 1024; // ruim genoeg voor jaren aan rondes
const TOKEN_DAYS = 180;
const MAX_SAMPLES_PER_CALL = 200;
const MAX_SAMPLE_BYTES = 4000;
const EVENT_KINDS = new Set(['open', 'round_start', 'round_saved']);
const MAX_EVENTS_PER_CALL = 100;
const VOCAB_CACHE_MS = 10 * 60 * 1000;

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
    CREATE TABLE IF NOT EXISTS speech_samples (
      id         INTEGER PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      payload    TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS speech_samples_user ON speech_samples(user_id);
    CREATE TABLE IF NOT EXISTS app_events (
      id         INTEGER PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind       TEXT NOT NULL,
      created_at TEXT NOT NULL,
      data       TEXT
    );
    CREATE INDEX IF NOT EXISTS app_events_time ON app_events(created_at);
  `);
  // Anonieme accounts (alleen een geheim van de telefoon, geen e-mail). Kolom later toegevoegd.
  if (!db.prepare('PRAGMA table_info(users)').all().some((c) => c.name === 'device_hash')) {
    db.exec('ALTER TABLE users ADD COLUMN device_hash TEXT');
  }
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS users_device ON users(device_hash)');
  // Extra rechten per account (komma-gescheiden), bijv. 'gps-mark' = tees en greens vastleggen.
  if (!db.prepare('PRAGMA table_info(users)').all().some((c) => c.name === 'perms')) {
    db.exec("ALTER TABLE users ADD COLUMN perms TEXT NOT NULL DEFAULT ''");
  }
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
// Anonieme accounts krijgen intern een e-mailveld zonder @ (kan dus nooit inloggen met een wachtwoord).
const isAnonymous = (u) => !u.email.includes('@');
const publicUser = (u) => ({ id: u.id, email: isAnonymous(u) ? null : u.email, anonymous: isAnonymous(u) });
const PERMS = new Set(['gps-mark']);
const permsOf = (u) => String(u.perms ?? '').split(',').filter((p) => PERMS.has(p));
const validSecret = (s) => typeof s === 'string' && s.length >= 32 && s.length <= 200;

// ---------- Server ----------

export function createServer(db, { adminEmails = ADMIN_EMAILS, osm = fetchCourse } = {}) {
  const osmCache = new Map(); // query -> {at, value}
  const isAdmin = (u) => adminEmails.includes(u.email);
  // Wat de app over de gebruiker weet: beheerders mogen alles.
  const userView = (u) => ({ ...publicUser(u), admin: isAdmin(u), perms: isAdmin(u) ? [...PERMS] : permsOf(u) });
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
    userByDevice: db.prepare('SELECT * FROM users WHERE device_hash = ?'),
    insertDeviceUser: db.prepare('INSERT INTO users (email, pw_hash, created_at, device_hash) VALUES (?, ?, ?, ?)'),
    upgradeUser: db.prepare('UPDATE users SET email = ?, pw_hash = ?, device_hash = NULL WHERE id = ?'),
    userById: db.prepare('SELECT * FROM users WHERE id = ?'),
    insertSample: db.prepare('INSERT INTO speech_samples (user_id, created_at, payload) VALUES (?, ?, ?)'),
    countSamples: db.prepare('SELECT COUNT(*) AS n FROM speech_samples WHERE user_id = ?'),
    deleteSamples: db.prepare('DELETE FROM speech_samples WHERE user_id = ?'),
    insertEvent: db.prepare('INSERT INTO app_events (user_id, kind, created_at, data) VALUES (?, ?, ?, ?)'),
    allSamples: db.prepare('SELECT user_id, payload FROM speech_samples ORDER BY id DESC LIMIT 20000'),
  };

  // Geleerde woorden: uit alle voorbeelden, een tijdje bewaard zodat het niet bij elk verzoek opnieuw hoeft.
  let vocabCache = null;
  function vocabulary() {
    if (vocabCache && Date.now() - vocabCache.at < VOCAB_CACHE_MS) return vocabCache.value;
    const rows = q.allSamples.all().map((r) => {
      try { return { user: r.user_id, sample: JSON.parse(r.payload) }; } catch { return null; }
    }).filter(Boolean);
    const value = { ...learnVocabulary(rows), generatedAt: new Date().toISOString() };
    vocabCache = { at: Date.now(), value };
    return value;
  }

  // Baannamen uit de opgeslagen gegevens (voor leesbare namen in het overzicht).
  let courseNames = {};

  // Tee- en greenpunten die gebruikers vastlegden, per baan en hole samengevoegd (mediaan),
  // met hoeveel mensen het punt vastlegden en hoe ver hun punten uit elkaar liggen.
  function courseGeo() {
    const points = new Map(); // "baan|hole|soort" -> [{lat, lon}]
    const names = {};
    const mappers = new Set(db.prepare('SELECT id, email, perms FROM users').all()
      .filter((u) => isAdmin(u) || permsOf(u).includes('gps-mark')).map((u) => u.id));
    for (const { user_id: uid, data } of db.prepare('SELECT user_id, data FROM golf_state').all()) {
      if (!mappers.has(uid)) continue; // alleen punten van wie ze mag vastleggen
      let state;
      try { state = JSON.parse(data); } catch { continue; }
      for (const c of state.courses ?? []) {
        if (!c?.id) continue;
        names[c.id] ??= c.name;
        for (const [hole, pts] of Object.entries(c.geo ?? {})) {
          for (const kind of ['tee', 'green']) {
            const p = pts?.[kind];
            if (!Number.isFinite(p?.lat) || !Number.isFinite(p?.lon)) continue;
            const k = `${c.id}|${hole}|${kind}`;
            if (!points.has(k)) points.set(k, []);
            points.get(k).push({ lat: p.lat, lon: p.lon });
          }
        }
      }
    }
    courseNames = names;
    const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
    const dist = (a, b) => {
      const rad = (d) => (d * Math.PI) / 180;
      const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
      return 2 * 6371000 * Math.asin(Math.sqrt(h));
    };
    const courses = {};
    for (const [k, list] of points) {
      const [course, hole, kind] = k.split('|');
      const mid = { lat: +median(list.map((p) => p.lat)).toFixed(6), lon: +median(list.map((p) => p.lon)).toFixed(6) };
      const c = (courses[course] ??= { course, name: names[course] ?? course, points: [] });
      c.points.push({ hole: Number(hole), kind, ...mid, n: list.length, spreadM: Math.round(Math.max(...list.map((p) => dist(mid, p)))) });
    }
    return Object.values(courses).map((c) => ({ ...c, points: c.points.sort((a, b) => a.hole - b.hole || a.kind.localeCompare(b.kind)) }));
  }

  // Overzicht voor de beheerder: aantallen en e-mailadressen, nooit de scores of rondes zelf.
  function adminOverview() {
    const now = Date.now();
    const ago = (days) => new Date(now - days * 864e5).toISOString();
    const one = (sql, ...args) => db.prepare(sql).get(...args);
    const anon = "instr(email, '@') = 0";
    const users = {
      total: one('SELECT COUNT(*) n FROM users').n,
      anonymous: one(`SELECT COUNT(*) n FROM users WHERE ${anon}`).n,
      last7: one('SELECT COUNT(*) n FROM users WHERE created_at > ?', ago(7)).n,
      last30: one('SELECT COUNT(*) n FROM users WHERE created_at > ?', ago(30)).n,
    };
    users.email = users.total - users.anonymous;
    const active = {
      d1: one('SELECT COUNT(*) n FROM golf_state WHERE updated_at > ?', ago(1)).n,
      d7: one('SELECT COUNT(*) n FROM golf_state WHERE updated_at > ?', ago(7)).n,
      d30: one('SELECT COUNT(*) n FROM golf_state WHERE updated_at > ?', ago(30)).n,
    };
    const registrations = db.prepare(`SELECT substr(created_at, 1, 10) day,
        SUM(CASE WHEN ${anon} THEN 1 ELSE 0 END) anonymous, SUM(CASE WHEN ${anon} THEN 0 ELSE 1 END) email
        FROM users WHERE created_at > ? GROUP BY day ORDER BY day`).all(ago(30));
    const recentUsers = db.prepare(`SELECT u.id, u.email, u.perms, u.created_at, g.updated_at last_sync, g.data,
        (SELECT COUNT(*) FROM speech_samples s WHERE s.user_id = u.id) samples
        FROM users u LEFT JOIN golf_state g ON g.user_id = u.id ORDER BY u.id DESC LIMIT 100`).all().map((r) => {
      let rounds = null;
      let players = null;
      try { const d = JSON.parse(r.data); rounds = d.history?.length ?? 0; players = d.players?.length ?? 0; } catch { /* nog niets opgeslagen */ }
      return { id: r.id, email: r.email.includes('@') ? r.email : null, createdAt: r.created_at, lastSync: r.last_sync, rounds, players, samples: r.samples,
        admin: isAdmin(r), perms: permsOf(r) };
    });

    const rows = q.allSamples.all().map((r) => {
      try { return { user: r.user_id, sample: JSON.parse(r.payload) }; } catch { return null; }
    }).filter(Boolean);
    // Hoe vaak klopte wat de app verstond meteen met de eindscore op de kaart?
    let judged = 0;
    let right = 0;
    for (const { sample } of rows) {
      const final = sample?.final ?? {};
      if (!Object.keys(final).length) continue;
      judged++;
      if (Object.entries(final).every(([k, v]) => sample.parsed?.[k] === v)) right++;
    }
    const samples = {
      total: rows.length,
      users: one('SELECT COUNT(DISTINCT user_id) n FROM speech_samples').n,
      last7: one('SELECT COUNT(*) n FROM speech_samples WHERE created_at > ?', ago(7)).n,
      firstTimeRight: judged ? right / judged : null,
      perDay: db.prepare(`SELECT substr(created_at, 1, 10) day, COUNT(*) count FROM speech_samples
        WHERE created_at > ? GROUP BY day ORDER BY day`).all(ago(30)),
    };
    const recentSamples = db.prepare('SELECT created_at, payload FROM speech_samples ORDER BY id DESC LIMIT 40').all().map((r) => {
      try { const p = JSON.parse(r.payload); return { createdAt: r.created_at, hole: p.hole, par: p.par, texts: p.texts, parsed: p.parsed, final: p.final, ai: p.ai }; } catch { return null; }
    }).filter(Boolean);
    // Gebruik: sessies (app geopend) en rondes
    const sessions = {
      last7: one("SELECT COUNT(*) n FROM app_events WHERE kind = 'open' AND created_at > ?", ago(7)).n,
      users7: one("SELECT COUNT(DISTINCT user_id) n FROM app_events WHERE kind = 'open' AND created_at > ?", ago(7)).n,
      today: one("SELECT COUNT(*) n FROM app_events WHERE kind = 'open' AND created_at > ?", new Date().toISOString().slice(0, 10)).n,
      usersToday: one("SELECT COUNT(DISTINCT user_id) n FROM app_events WHERE kind = 'open' AND created_at > ?", new Date().toISOString().slice(0, 10)).n,
      perDay: db.prepare(`SELECT substr(created_at, 1, 10) day, COUNT(*) count, COUNT(DISTINCT user_id) users FROM app_events
        WHERE kind = 'open' AND created_at > ? GROUP BY day ORDER BY day`).all(ago(30)),
      gpsUsers: one(`SELECT COUNT(DISTINCT user_id) n FROM app_events WHERE kind = 'open' AND created_at > ?
        AND json_extract(data, '$.gps') = 1`, ago(30)).n,
      users30: one("SELECT COUNT(DISTINCT user_id) n FROM app_events WHERE kind = 'open' AND created_at > ?", ago(30)).n,
      installed: one(`SELECT COUNT(DISTINCT user_id) n FROM app_events WHERE kind = 'open' AND created_at > ?
        AND json_extract(data, '$.standalone') = 1`, ago(30)).n,
    };
    const rounds = db.prepare(`SELECT json_extract(data, '$.course') course, kind, COUNT(*) n, COUNT(DISTINCT user_id) users
        FROM app_events WHERE kind IN ('round_start', 'round_saved') AND created_at > ? GROUP BY course, kind`).all(ago(30));
    const geo = courseGeo(); // vult ook courseNames
    const roundsByCourse = {};
    for (const r of rounds) {
      const c = (roundsByCourse[r.course ?? '?'] ??= { course: r.course ?? '?', started: 0, saved: 0, users: 0 });
      if (r.kind === 'round_start') { c.started = r.n; c.users = Math.max(c.users, r.users); } else c.saved = r.n;
    }
    for (const c of Object.values(roundsByCourse)) c.name = courseNames[c.course] ?? c.course;

    const vocab = vocabulary();
    const learned = new Set([...Object.keys(vocab.numbers), ...vocab.holeWords]);
    const candidates = wordStats(rows).slice(0, 60).map((w) => ({ ...w, learned: learned.has(w.word) }));
    return {
      generatedAt: new Date().toISOString(), users, active, registrations, recentUsers, samples, recentSamples, vocab, candidates,
      sessions, rounds: Object.values(roundsByCourse).sort((a, b) => b.started - a.started), geo,
    };
  }

  function newSession(user) {
    const token = crypto.randomBytes(32).toString('base64url');
    const expires = new Date(Date.now() + TOKEN_DAYS * 864e5).toISOString();
    q.insertSession.run(sha256(token), user.id, expires);
    return { token, user: userView(user) };
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
    if (key === 'GET /api/vocab') return send(res, 200, vocabulary());

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

    if (key === 'POST /api/device') {
      if (tooMany(`device:${ip}`, 60)) throw new HttpError(429, 'Te veel pogingen, probeer het later opnieuw');
      const { secret } = await readJson(req);
      if (!validSecret(secret)) throw new HttpError(400, 'Ongeldige apparaatcode');
      const deviceHash = sha256(secret);
      let user = q.userByDevice.get(deviceHash);
      const created = !user;
      if (created) {
        q.insertDeviceUser.run(`anon-${crypto.randomBytes(12).toString('hex')}`, '!', new Date().toISOString(), deviceHash);
        user = q.userByDevice.get(deviceHash);
      }
      return send(res, created ? 201 : 200, newSession(user));
    }

    const { user, tokenHash } = authUser(req);

    if (key === 'POST /api/account') {
      if (!isAnonymous(user)) throw new HttpError(400, 'Dit account heeft al een e-mailadres');
      const { email: rawEmail, password } = await readJson(req);
      const email = String(rawEmail ?? '').trim().toLowerCase();
      if (!validEmail(email)) throw new HttpError(400, 'Vul een geldig e-mailadres in');
      if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
        throw new HttpError(400, 'Het wachtwoord moet minstens 8 tekens hebben');
      }
      if (q.userByEmail.get(email)) throw new HttpError(409, 'Er bestaat al een account met dit e-mailadres');
      // Vanaf nu alleen nog met e-mail en wachtwoord; de apparaatcode geeft geen toegang meer.
      q.upgradeUser.run(email, hashPassword(password), user.id);
      return send(res, 200, { user: userView(q.userById.get(user.id)) });
    }

    if (key === 'GET /api/me') return send(res, 200, { user: userView(user) });
    if (key === 'POST /api/admin/perms') {
      if (!isAdmin(user)) throw new HttpError(403, 'Alleen voor beheerders');
      const { userId, perm, on } = await readJson(req);
      const target = q.userById.get(Number(userId));
      if (!target) throw new HttpError(404, 'Account niet gevonden');
      if (!PERMS.has(perm)) throw new HttpError(400, 'Onbekend recht');
      const next = new Set(permsOf(target));
      if (on) next.add(perm); else next.delete(perm);
      db.prepare('UPDATE users SET perms = ? WHERE id = ?').run([...next].join(','), target.id);
      return send(res, 200, { user: userView(q.userById.get(target.id)) });
    }
    if (key === 'GET /api/admin/overview') {
      if (!isAdmin(user)) throw new HttpError(403, 'Alleen voor beheerders');
      return send(res, 200, adminOverview());
    }
    if (key === 'POST /api/logout') {
      q.deleteSession.run(tokenHash);
      return send(res, 204);
    }
    if (key === 'GET /api/state') {
      const row = q.getState.get(user.id);
      return send(res, 200, row ? { data: JSON.parse(row.data), updated_at: row.updated_at } : null);
    }
    if (key === 'PUT /api/state') {
      const { data, baseUpdatedAt } = await readJson(req);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Geen geldige gegevens');
      // Optioneel: alleen opslaan als de cloudversie sinds baseUpdatedAt niet door een ander
      // toestel is gewijzigd (anders eerst samenvoegen). Zo kan synchroniseren veilig op de achtergrond.
      if (baseUpdatedAt !== undefined) {
        const current = q.getState.get(user.id)?.updated_at ?? null;
        if (current !== baseUpdatedAt) return send(res, 409, { error: 'Gewijzigd op een ander toestel', updated_at: current });
      }
      const updatedAt = new Date().toISOString();
      q.putState.run(user.id, JSON.stringify(data), updatedAt);
      return send(res, 200, { updated_at: updatedAt });
    }
    if (key === 'POST /api/samples') {
      const { samples } = await readJson(req);
      if (!Array.isArray(samples) || samples.length > MAX_SAMPLES_PER_CALL) throw new HttpError(400, 'Geen geldige voorbeelden');
      const now = new Date().toISOString();
      let stored = 0;
      for (const sample of samples) {
        const json = JSON.stringify(sample);
        if (!sample || typeof sample !== 'object' || json.length > MAX_SAMPLE_BYTES) continue;
        q.insertSample.run(user.id, now, json);
        stored++;
      }
      vocabCache = null;
      return send(res, 200, { stored });
    }
    if (key === 'POST /api/events') {
      const { events } = await readJson(req);
      if (!Array.isArray(events) || events.length > MAX_EVENTS_PER_CALL) throw new HttpError(400, 'Geen geldige gebeurtenissen');
      const now = Date.now();
      let stored = 0;
      for (const e of events) {
        if (!e || !EVENT_KINDS.has(e.kind)) continue;
        // Offline verzameld: de tijd van de telefoon, maar niet in de toekomst en hooguit 30 dagen terug.
        const t = Date.parse(e.at);
        const at = new Date(Number.isFinite(t) && t <= now && t > now - 30 * 864e5 ? t : now).toISOString();
        const data = e.data && typeof e.data === 'object' ? JSON.stringify(e.data) : null;
        if (data && data.length > 500) continue;
        q.insertEvent.run(user.id, e.kind, at, data);
        stored++;
      }
      return send(res, 200, { stored });
    }
    if (key === 'GET /api/osm/course') {
      const name = url.searchParams.get('name')?.trim();
      const lat = Number(url.searchParams.get('lat'));
      const lon = Number(url.searchParams.get('lon'));
      if (!name && !(Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && url.searchParams.has('lat'))) throw new HttpError(400, 'Geef een naam of lat en lon');
      const params = name ? { name } : { lat, lon, radius: Number(url.searchParams.get('radius')) || undefined };
      const cacheKey = JSON.stringify(params);
      const hit = osmCache.get(cacheKey);
      if (hit && Date.now() - hit.at < 24 * 3600e3) return send(res, 200, hit.value);
      if (tooMany(`osm:${user.id}`, 20, 3600e3)) throw new HttpError(429, 'Te veel verzoeken, probeer het later opnieuw');
      let value;
      try {
        value = { ...(await osm(params)), fetchedAt: new Date().toISOString() };
      } catch (err) {
        console.error('OSM', err);
        throw new HttpError(502, err.message.startsWith('OpenStreetMap') ? err.message : 'OpenStreetMap is nu niet bereikbaar, probeer het later opnieuw');
      }
      osmCache.set(cacheKey, { at: Date.now(), value });
      return send(res, 200, value);
    }
    if (key === 'GET /api/samples/stats') return send(res, 200, { count: q.countSamples.get(user.id).n });
    if (key === 'DELETE /api/samples') {
      q.deleteSamples.run(user.id);
      vocabCache = null;
      return send(res, 204);
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
