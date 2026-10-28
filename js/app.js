import { pickBest, matchPlayer, simplify, setLearnedVocab } from './parser.js';
import { recordEntry, loadQueue, saveQueue, finalizeRound } from './learning.js';
import { DEFAULT_COURSES, BASE_GEO, standardCourse } from './courses.js';
import { queuePush, bgGet, bgDelete } from './bgsync.js';
import { decideSync, mergeStates, toCloud, fromCloud } from './sync.js';
import { API_URL } from './config.js';
import { createBuggy, buggySupported } from './buggy.js';
import { teeAt, toGreen, geoProgress, distanceM } from './gps.js';
import { analysePlayer, handicapIndexFromDifferentials, scoreName } from './handicap.js';

// ---------- Opslag ----------

const STORAGE_KEY = 'golfscore-v1';


// Punten van een baan: OpenStreetMap als basis, eigen punten eroverheen.
function geoOf(c = course()) {
  const base = BASE_GEO[c.id] ?? {};
  const out = {};
  for (const h of new Set([...Object.keys(base), ...Object.keys(c.geo ?? {})])) out[h] = { ...base[h], ...c.geo?.[h] };
  return out;
}

// Plattegronden van de club (scorekaarten), per groep holes.
const COURSE_MAPS = {
  'hooge-graven': [
    { holes: [1, 2, 3, 4, 5, 6, 7, 8, 9], src: 'img/hooge-graven-1-9.webp', title: 'Holes 1 t/m 9' },
    { holes: [10, 11, 12, 13, 14, 15, 16, 17, 18], src: 'img/hooge-graven-10-18.webp', title: 'Holes 10 t/m 18' },
  ],
  par3: [
    { holes: Array.from({ length: 18 }, (_, i) => i + 1), src: 'img/hooge-graven-par3.webp', title: 'Par 3-baan' },
  ],
};

// Uitsnede van één hole (en de pinposities) uit de kaarten. De par 3-baan speel je twee
// keer rond: holes 10-18 zijn dezelfde holes als 1-9.
function holeImages(hole) {
  if (course().id === 'hooge-graven') return { hole: `img/holes/hg-${hole}.webp`, pin: `img/holes/hg-pin-${hole}.webp` };
  if (course().id === 'par3') return { hole: `img/holes/par3-${((hole - 1) % 9) + 1}.webp`, pin: null };
  return null;
}

// Per toestel onthouden of de hole-afbeelding verborgen is.
function holeViewHidden() {
  try { return localStorage.getItem('golfscore-hide-hole') === '1'; } catch { return false; }
}

const mapForHole = (hole) => COURSE_MAPS[course().id]?.find((m) => m.holes.includes(hole)) ?? null;


function newRound(holesChoice = 'front', courseId = state?.homeCourseId ?? 'hooge-graven') {
  const now = new Date().toISOString();
  return { id: Date.now(), date: now, startedAt: now, courseId, holesChoice, currentHole: ['back', 'all10'].includes(holesChoice) ? 10 : 1, scores: {}, log: [] };
}

// Oudere opslag had één baan (state.course); zet die om naar de lijst met banen.
function migrate(saved) {
  if (saved.course && !saved.courses) {
    const old = { ...saved.course, id: 'hooge-graven', holeCount: 18 };
    if (old.name === 'Hooge Graven, Ommen') old.name = DEFAULT_COURSES[0].name;
    old.tees = old.tees.map((t) => ({ ...t, gender: t.gender ?? (['rood', 'blauw'].includes(t.id) ? 'd' : 'h') }));
    saved.courses = [old, ...structuredClone(DEFAULT_COURSES).slice(1)];
    delete saved.course;
  }
  for (const def of DEFAULT_COURSES) {
    const existing = saved.courses.find((c) => c.id === def.id);
    if (!existing) saved.courses.push(structuredClone(def));
    else if ((existing.dataVersion ?? 1) < (def.dataVersion ?? 1)) {
      // Nieuwe officiële baangegevens: overnemen (ingevulde 9-holes ratings blijven staan).
      const tees = def.tees.map((t) => {
        const old = existing.tees.find((x) => x.id === t.id);
        return { ...structuredClone(t), rating9: t.rating9 ?? old?.rating9 ?? null, slope9: t.slope9 ?? old?.slope9 ?? null };
      });
      Object.assign(existing, structuredClone(def), { tees });
    } else existing.parTotal ??= def.parTotal;
  }
  saved.round.courseId ??= 'hooge-graven';
  saved.homeCourseId ??= 'hooge-graven';
  return saved;
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) return migrate(saved);
  } catch { /* lege of kapotte opslag: opnieuw beginnen */ }
  return {
    players: [], // wie er meespelen kies je bij het starten van een ronde
    playerPool: [],
    courses: structuredClone(DEFAULT_COURSES),
    homeCourseId: 'hooge-graven',
    round: { ...newRound('front', 'hooge-graven'), startedAt: null }, // eerst baan kiezen
    history: [],
    apiKey: '',
    sync: { localChangedAt: null, syncedAt: null },
  };
}

let state = load();
state.sync ??= { localChangedAt: null, syncedAt: null };
state.learning ??= { consent: null };
// Spelers van eerdere rondes die nu niet meespelen (met hun handicap, tee en bijnamen).
state.playerPool = (state.playerPool ?? []).filter((p) => !state.players.some((x) => x.name === p.name));

// Lokaal opslaan; een wijziging door de gebruiker wordt daarna ook naar de cloud gestuurd.
function save({ fromCloud: fromRemote = false } = {}) {
  if (!fromRemote) state.sync.localChangedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (!fromRemote) scheduleSync();
}

// ---------- Bediening (knoppen in de app en het buggy-scherm) ----------

function moveHole(delta) {
  gps.editing = false;
  const holes = roundHoles();
  const idx = holes.indexOf(state.round.currentHole);
  state.round.currentHole = holes[(idx + delta + holes.length) % holes.length];
  save();
  render();
}

// Eén slag erbij of eraf op de huidige hole. Bedoeld om tijdens het lopen per slag te tellen:
// een lege score begint bij 1.
function adjustScore(playerIndex, delta) {
  const p = state.players[playerIndex];
  if (!p) return;
  const h = state.round.currentHole;
  const cur = scoreOf(p.name, h);
  const next = cur == null ? (delta > 0 ? 1 : 0) : cur + delta;
  setScore(p.name, h, next < 1 ? null : Math.min(20, next));
  setLive(p.name, h, next >= 1);
  save();
  render();
}

// ---------- GPS ----------
// De locatie blijft op de telefoon. Alleen de tees en greens die je zelf vastlegt worden bij de
// baan bewaard (en gaan mee naar de server).

const gps = { watchId: null, pos: null, error: null, lastTee: null, suggest: null, editing: false };

function gpsPref(key, fallback) {
  try { const v = localStorage.getItem(key); return v == null ? fallback : v === '1'; } catch { return fallback; }
}
function setGpsPref(key, on) {
  try { localStorage.setItem(key, on ? '1' : '0'); } catch { /* alleen voor deze sessie */ }
}
const gpsOn = () => gpsPref('golfscore-gps', false);
const gpsAuto = () => gpsPref('golfscore-gps-auto', true);
const gpsSupported = () => 'geolocation' in navigator;

function startGps() {
  if (!gpsSupported() || gps.watchId != null) return;
  gps.error = null;
  gps.watchId = navigator.geolocation.watchPosition(onPosition, onGpsError, {
    enableHighAccuracy: true, maximumAge: 5000, timeout: 30000,
  });
}

function stopGps() {
  if (gps.watchId != null) navigator.geolocation.clearWatch(gps.watchId);
  Object.assign(gps, { watchId: null, pos: null, error: null, lastTee: null, suggest: null });
}

function onPosition(p) {
  gps.pos = { lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy };
  gps.error = null;
  // Alleen reageren als je een (andere) tee op loopt, niet zolang je er blijft staan.
  let tee = teeAt(gps.pos, geoOf(), roundHoles());
  // Twee keer rond over dezelfde holes (par 3-baan): in de tweede ronde holes 10–18 kiezen.
  const geo = geoOf();
  const same = (a, b) => a && b && a.lat === b.lat && a.lon === b.lon;
  if (tee && tee <= 9 && state.round.currentHole > 9 && roundHoles().includes(tee + 9) && same(geo[tee]?.tee, geo[tee + 9]?.tee)) tee += 9;
  if (tee !== gps.lastTee) {
    gps.lastTee = tee;
    gps.suggest = null;
    if (tee && tee !== state.round.currentHole) {
      const counting = state.round.live?.hole === state.round.currentHole && state.round.live.names.length > 0;
      if (gpsAuto() && !counting) {
        state.round.currentHole = tee;
        save();
        render();
        toast(`Je staat op de tee van hole ${tee}`);
        return;
      }
      gps.suggest = tee; // bezig met tellen: niet zomaar wisselen, wel voorstellen
    }
  }
  renderGps();
}

function onGpsError(err) {
  gps.error = err.code === 1
    ? 'Geen toegang tot je locatie. Sta dit toe in de instellingen van je browser.'
    : 'Locatie is nu niet beschikbaar.';
  renderGps();
}

function renderGps() {
  const el = $('#gps-line');
  if (!el) return;
  el.hidden = !gpsOn();
  if (!gpsOn()) return;
  const h = state.round.currentHole;
  const points = geoOf()[h] ?? {};
  if (gps.suggest === h) gps.suggest = null;
  if (gps.error) { el.innerHTML = `<p class="gps-msg">${esc(gps.error)}</p>`; return; }
  if (!gps.pos) { el.innerHTML = '<p class="gps-msg">GPS zoekt je positie…</p>'; return; }
  const dist = toGreen(gps.pos, geoOf(), h);
  el.innerHTML = `
    ${dist != null
      ? `<p class="gps-dist"><span class="gps-num">${dist}</span> m <span class="muted">tot de green</span></p>`
      : `<p class="gps-msg">${canMark() ? 'Leg de green van deze hole vast om de afstand te zien.' : 'Voor deze hole is de afstand tot de green nog niet bekend.'}</p>`}
    <p class="muted small gps-acc">GPS ±${Math.round(gps.pos.accuracy)} m</p>
    ${gps.suggest ? `<button class="link" data-action="gps-go" data-hole="${gps.suggest}">Je staat op de tee van hole ${gps.suggest}: ga naar hole ${gps.suggest}</button>` : ''}
    ${!canMark() ? ''
      : points.tee && points.green && !gps.editing
      ? '<button class="link small" data-action="gps-edit">Tee of green opnieuw vastleggen</button>'
      : `<div class="gps-actions">
      <button class="chip-btn" data-action="gps-mark" data-point="tee">${points.tee ? 'Tee opnieuw vastleggen' : 'Ik sta op de tee'}</button>
      <button class="chip-btn" data-action="gps-mark" data-point="green">${points.green ? 'Green opnieuw vastleggen' : 'Ik sta op de green'}</button>
    </div>`}`;
}

// Tees en greens vastleggen mag alleen wie dat recht heeft (beheerder, of toegewezen in het
// beheeroverzicht). De afstanden zelf zijn voor iedereen.
const canMark = () => Boolean(cloud.user?.perms?.includes('gps-mark'));

function markPoint(point) {
  if (!canMark()) return;
  const h = state.round.currentHole;
  const name = point === 'tee' ? 'de tee' : 'het midden van de green';
  if (!gps.pos) { toast('Nog geen GPS-positie. Wacht even.'); return; }
  const existing = course().geo?.[h]?.[point];
  if (existing && !confirm(`De ${point} van hole ${h} is al vastgelegd. Vervangen door je huidige positie?`)) return;
  if (gps.pos.accuracy > 25 && !confirm(`De GPS is nu maar ±${Math.round(gps.pos.accuracy)} m nauwkeurig. Toch vastleggen?`)) return;
  const c = course();
  c.geo ??= {};
  c.geo[h] = { ...c.geo[h], [point]: { lat: +gps.pos.lat.toFixed(6), lon: +gps.pos.lon.toFixed(6) } };
  save();
  renderGps();
  renderGpsSettings();
  toast(`Positie van ${name} van hole ${h} vastgelegd.`);
}

function renderGpsSettings() {
  const el = $('#gps-settings');
  if (!el) return;
  if (!gpsSupported()) {
    el.innerHTML = '<p class="small muted">Deze browser kan je locatie niet gebruiken.</p>';
    return;
  }
  const p = geoProgress(geoOf(), roundHoles());
  const own = geoProgress(course().geo, roundHoles());
  const fromOsm = Boolean(BASE_GEO[course().id]);
  el.innerHTML = `
    <label class="check"><input type="checkbox" id="gps-on" ${gpsOn() ? 'checked' : ''}> GPS gebruiken tijdens de ronde</label>
    <label class="check"><input type="checkbox" id="gps-auto" ${gpsAuto() ? 'checked' : ''} ${gpsOn() ? '' : 'disabled'}> Automatisch naar de hole van de tee waar je staat</label>
    <p class="small">Bekend voor ${esc(course().name)}: <b>${p.tees}</b> van ${p.total} tees, <b>${p.greens}</b> van ${p.total} greens${fromOsm ? ` (uit OpenStreetMap © OpenStreetMap-bijdragers, aangevuld met ${own.tees + own.greens} eigen punten)` : ''}.</p>
    <p class="small muted">${canMark()
      ? 'Je mag tees en greens vastleggen: doe dat tijdens een ronde per hole één keer (knoppen bij het holenummer). Daarna zien alle spelers de afstand tot de green en op welke tee ze staan.'
      : 'De app toont de afstand tot de green en springt naar de juiste hole als je op de tee staat, op de holes waarvan de tees en greens bekend zijn.'}
    Je locatie blijft op je telefoon. GPS werkt alleen met de app open en kost wat extra batterij.</p>
    ${canMark() && own.tees + own.greens ? `<button class="link small danger" data-action="gps-clear">Eigen GPS-punten van deze baan wissen</button>` : ''}`;
}

// ---------- Buggy-scherm (Bluetooth) ----------

let buggyStatus = { text: 'Niet verbonden', connected: false, name: null };
const buggy = createBuggy({
  onStatus: (s) => { buggyStatus = s; render(); },
  onCommand: (cmd) => {
    if (cmd.type === 'hole') moveHole(cmd.delta);
    else if (cmd.type === 'score') adjustScore(cmd.player, cmd.delta);
    else render(); // 'hello': stand opnieuw sturen
  },
});

async function connectBuggy() {
  try {
    await buggy.connect();
  } catch (err) {
    // Annuleren in de keuzelijst is geen fout.
    buggyStatus = { ...buggyStatus, text: err?.name === 'NotFoundError' ? 'Geen scherm gekozen.' : `Verbinden mislukt: ${err?.message ?? err}` };
    render();
  }
}

// Getikte scores zijn "bezig" zolang je op die hole bent: de speler kan nog slagen maken.
// Naar een andere hole gaan of de score inspreken rondt ze af.
function setLive(name, hole, on) {
  let live = state.round.live;
  if (!live || live.hole !== hole) live = state.round.live = { hole, names: [] };
  live.names = live.names.filter((n) => n !== name);
  if (on) live.names.push(name);
}
const isLive = (name, hole) => state.round.live?.hole === hole && state.round.live.names.includes(name);

// Bruto en stand t.o.v. par over de gespeelde holes van deze ronde (zonder een hole die nog bezig is).
function playerTotals(p) {
  const played = roundHoles().filter((x) => scoreOf(p.name, x) != null && !isLive(p.name, x));
  const gross = played.reduce((sum, x) => sum + scoreOf(p.name, x), 0);
  return { played: played.length, gross, toPar: gross - played.reduce((sum, x) => sum + parOf(x), 0) };
}

// Kleur van het tee-bolletje bij de lengte.
const TEE_COLORS = { wit: '#FFFFFF', geel: '#E8C33A', blauw: '#3B6FB6', rood: '#C8402E', oranje: '#E8862A' };

// Wat het buggy-scherm laat zien: de huidige hole en de stand per speler.
function buggySummary() {
  const h = state.round.currentHole;
  const tee = teeFor(state.players[0] ?? { tee: 'geel' });
  return {
    course: course().name,
    hole: h,
    par: parOf(h),
    si: course().si[h - 1],
    length: tee.lengths?.[h - 1] ?? 0,
    players: state.players.map((p) => {
      const { gross, toPar } = playerTotals(p);
      return { name: p.name, strokes: scoreOf(p.name, h), gross, toPar };
    }),
  };
}

// Het buggy-scherm is nog niet klaar voor iedereen: alleen zichtbaar met ?buggy=1 (onthouden
// op dit toestel; ?buggy=0 zet het weer uit).
const BUGGY_FLAG = 'golfscore-buggy';
try {
  const q = new URLSearchParams(location.search).get('buggy');
  if (q === '1') localStorage.setItem(BUGGY_FLAG, '1');
  if (q === '0') localStorage.removeItem(BUGGY_FLAG);
} catch { /* geen opslag */ }
const buggyEnabled = () => { try { return localStorage.getItem(BUGGY_FLAG) === '1'; } catch { return false; } };

function renderBuggy() {
  const el = $('#buggy');
  if (!el) return;
  $('#buggy-section').hidden = !buggyEnabled();
  if (!buggyEnabled()) { $('#buggy-badge').hidden = true; return; }
  $('#buggy-badge').hidden = !buggyStatus.connected;
  if (!buggySupported()) {
    el.innerHTML = '<p class="small muted">Deze browser kan geen Bluetooth gebruiken. Gebruik Chrome op Android (of op een computer). Safari op de iPhone ondersteunt dit niet.</p>';
    return;
  }
  el.innerHTML = `<p class="small">${buggyStatus.connected ? `Verbonden met <b>${esc(buggyStatus.name ?? 'buggy-scherm')}</b>.` : esc(buggyStatus.text)}</p>
    <div class="button-row">${buggyStatus.connected
      ? '<button data-action="buggy-disconnect">Verbreken</button>'
      : '<button data-action="buggy-connect" class="primary">Verbinden met buggy-scherm</button>'}</div>
    <p class="small muted">Houd de app open tijdens de ronde. Valt de verbinding weg, dan probeert de app het zelf opnieuw.</p>`;
  if (buggy.connected) buggy.send(buggySummary());
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') buggy.resume(); });

// ---------- Cloud (eigen server, zie server/) ----------

const cloudConfigured = Boolean(API_URL);
const cloud = { api: null, user: null, status: '', error: null, busy: false, again: false, timer: null, retryMs: 0, pending: false };
const RETRY_MIN_MS = 15000;
const RETRY_MAX_MS = 5 * 60 * 1000;

async function cloudApi() {
  if (!cloudConfigured) return null;
  cloud.api ??= await import('./cloud.js');
  return cloud.api;
}

function scheduleSync(delay = 4000) {
  if (!cloud.user) return;
  clearTimeout(cloud.timer);
  cloud.timer = setTimeout(syncNow, delay);
  queueBackground();
}

// Laatste versie klaarzetten voor de service worker: die verstuurt hem zodra er bereik is,
// ook als de app intussen dicht is (Android). Alleen als er niets tussendoor gewijzigd is
// in de cloud; anders voegt de app het bij de volgende keer openen samen.
async function queueBackground() {
  const api = await cloudApi();
  const token = api?.sessionToken();
  if (!token || !state.sync.localChangedAt) return;
  queuePush({ url: API_URL, token, data: toCloud(state), baseUpdatedAt: state.sync.syncedAt ?? null, localChangedAt: state.sync.localChangedAt });
}

// Wat de service worker op de achtergrond verstuurde, verwerken.
async function applyBackgroundResult() {
  try {
    const r = await bgGet('result');
    if (!r) return;
    await bgDelete('result');
    if (r.localChangedAt === state.sync.localChangedAt) {
      state.sync.syncedAt = r.updatedAt;
      state.sync.localChangedAt = r.updatedAt;
      save({ fromCloud: true });
    }
  } catch { /* geen IndexedDB */ }
}

async function syncNow() {
  const api = await cloudApi();
  if (!api || !cloud.user) return;
  if (!navigator.onLine) { cloud.pending = true; return; } // de 'online'-gebeurtenis start hem weer
  if (cloud.busy) { cloud.again = true; return; }
  cloud.busy = true;
  try {
    await applyBackgroundResult();
    const remote = await api.fetchState(cloud.user.id);
    const action = decideSync({ ...state.sync, remoteUpdatedAt: remote?.updated_at ?? null });
    if (action === 'pull') {
      state = migrate(fromCloud(remote.data, state));
      state.sync.syncedAt = remote.updated_at;
    } else if (action === 'push' || action === 'merge') {
      if (action === 'merge') state = mergeStates(state, migrate(fromCloud(remote.data, state)));
      state.sync.syncedAt = await api.pushState(cloud.user.id, toCloud(state), remote?.updated_at ?? null);
      state.sync.localChangedAt = state.sync.syncedAt;
    }
    uploadSamples();
    flushEvents();
    cloud.status = `Gesynchroniseerd om ${new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
    cloud.retryMs = 0;
    cloud.pending = false;
    save({ fromCloud: true });
    bgDelete('pending').catch(() => {});
  } catch (err) {
    if (err.status === 409) {
      cloud.again = true; // tussendoor gewijzigd op een ander toestel: meteen opnieuw, dan wordt er samengevoegd
    } else {
      // Slecht of geen bereik: alles staat veilig op de telefoon. Later opnieuw, steeds wat langer wachten.
      const e = api.describeCloudError(err);
      cloud.pending = true;
      cloud.retryMs = Math.min(RETRY_MAX_MS, cloud.retryMs ? cloud.retryMs * 2 : RETRY_MIN_MS);
      clearTimeout(cloud.timer);
      cloud.timer = setTimeout(syncNow, cloud.retryMs);
      cloud.status = `${e.title}. Alles staat op je telefoon; de app synchroniseert vanzelf zodra er bereik is.`;
    }
  } finally {
    cloud.busy = false;
    render();
    if (cloud.again) { cloud.again = false; syncNow(); }
  }
}

async function initCloud() {
  const api = await cloudApi();
  if (!api) return;
  api.onAuthChange((user) => {
    const changed = user?.id !== cloud.user?.id;
    cloud.user = user;
    if (changed) { render(); if (user) syncNow(); }
  });
  cloud.user = await api.currentUser();
  // Geen account? Dan een anoniem account voor deze telefoon, zodat alles toch bewaard wordt.
  // E-mail en wachtwoord zijn optioneel; daar vragen we pas om na een ronde (zie afterRound).
  if (!cloud.user && api.autoDeviceAllowed() && navigator.onLine) {
    try { cloud.user = await api.deviceLogin(); state.sync.syncedAt = null; } catch { /* later opnieuw */ }
  }
  render();
  if (cloud.user) syncNow();
  refreshVocab(api);
  window.addEventListener('online', () => { cloud.retryMs = 0; syncNow(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncNow();
    else if (cloud.pending || (state.sync.localChangedAt && state.sync.localChangedAt !== state.sync.syncedAt)) queueBackground();
  });
  navigator.serviceWorker?.addEventListener('message', (e) => { if (e.data?.type === 'golf-synced') applyBackgroundResult(); });
}

// Geleerde woorden van de server (voor iedereen hetzelfde), ook offline bruikbaar via de cache.
const VOCAB_KEY = 'golfscore-vocab';
try { setLearnedVocab(JSON.parse(localStorage.getItem(VOCAB_KEY))); } catch { /* nog niets geleerd */ }

async function refreshVocab(api) {
  try {
    const vocab = await api.fetchVocab();
    setLearnedVocab(vocab);
    localStorage.setItem(VOCAB_KEY, JSON.stringify({ numbers: vocab.numbers, holeWords: vocab.holeWords }));
  } catch { /* offline: de vorige lijst blijft gelden */ }
}

// Grote, duidelijke foutmelding (blijft staan tot een volgende poging lukt).
function cloudErrorBox() {
  if (!cloud.error) return '';
  return `<div class="alert" role="alert" tabindex="-1" id="cloud-alert">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 7v6M12 17h.01"></path></svg>
    <div><strong>${esc(cloud.error.title)}</strong><p>${esc(cloud.error.detail)}</p>
    <button class="link" data-action="cloud-test">Verbinding testen</button></div>
  </div>`;
}

function renderCloud() {
  const el = $('#cloud');
  if (!el) return;
  $('#cloud-section').hidden = !cloudConfigured;
  if (!cloudConfigured) return;
  if (cloud.user?.anonymous) {
    el.innerHTML = `<p class="small">Je gegevens worden bewaard op de server, gekoppeld aan <b>deze telefoon</b> (zonder account).<br>
      <span class="muted">${esc(cloud.status || 'Een account met e-mail is niet nodig, maar wel handig: dan raak je niets kwijt als je een andere telefoon neemt.')}</span></p>
      ${cloudErrorBox()}
      ${authForm('Account maken', 'Bestaand account')}
      <p class="small muted">Inloggen met een bestaand account voegt de gegevens van deze telefoon daaraan toe.</p>`;
  } else if (cloud.user) {
    el.innerHTML = `<p class="small">Ingelogd als <b>${esc(cloud.user.email ?? '')}</b>.<br>
      <span class="muted">${esc(cloud.status || 'Je gegevens worden automatisch bewaard op de server.')}</span></p>
      <div class="button-row">
        <button data-action="cloud-sync">Nu synchroniseren</button>
        <button data-action="cloud-logout">Uitloggen</button>
      </div>
      <button class="link small danger" data-action="cloud-delete">Mijn account en gegevens op de server verwijderen</button>`;
  } else {
    el.innerHTML = `<p class="small muted">Log in om je spelers, banen en rondes op de server te bewaren. Op een nieuwe telefoon log je in en staat alles er weer.</p>
      ${cloudErrorBox()}
      ${authForm('Account aanmaken', 'Inloggen', true)}
      <button class="link small" data-action="cloud-device">Of: zonder account bewaren, gekoppeld aan deze telefoon</button>
      ${cloud.status ? `<p class="small muted">${esc(cloud.status)}</p>` : ''}`;
  }
}

function authForm(registerLabel, loginLabel, loginFirst = false) {
  const reg = `<button type="submit" ${loginFirst ? '' : 'class="primary"'} data-mode="register">${registerLabel}</button>`;
  const log = `<button type="submit" ${loginFirst ? 'class="primary"' : ''} data-mode="login">${loginLabel}</button>`;
  return `<form class="cloud-form" data-form="cloud-auth">
    <label>E-mailadres <input id="cloud-email" type="email" autocomplete="email" placeholder="jouw@email.nl" required></label>
    <label>Wachtwoord <input id="cloud-password" type="password" autocomplete="${loginFirst ? 'current-password' : 'new-password'}" minlength="8" placeholder="minstens 8 tekens" required></label>
    <div class="button-row">${loginFirst ? log + reg : reg + log}</div>
  </form>`;
}

async function cloudAction(action, submitter) {
  const api = await cloudApi();
  if (!api) return;
  cloud.error = null;
  try {
    if (action === 'cloud-test') {
      const t = await api.testConnection();
      if (t.ok) {
        cloud.status = 'De server is bereikbaar. Probeer opnieuw in te loggen of een account aan te maken.';
      } else {
        cloud.error = api.describeCloudError(t.error);
      }
    } else if (action === 'cloud-auth') {
      const email = $('#cloud-email').value.trim();
      const password = $('#cloud-password').value;
      const register = submitter?.dataset.mode === 'register';
      if (register && cloud.user?.anonymous) {
        // Zelfde account, nu met e-mail: alles blijft staan.
        cloud.user = await api.upgradeAccount(email, password);
        cloud.status = 'Account gemaakt. Je gegevens staan veilig onder je e-mailadres.';
        setMeta({ registered: true });
      } else {
        cloud.user = register ? await api.register(email, password) : await api.login(email, password);
        cloud.status = 'Ingelogd. Gegevens worden samengevoegd…';
        state.sync.syncedAt = null; // eerste keer: lokaal en server samenvoegen
        syncNow();
      }
      closeAfterRound();
    } else if (action === 'cloud-device') {
      cloud.user = await api.deviceLogin();
      cloud.status = 'Je gegevens worden nu bewaard, gekoppeld aan deze telefoon.';
      state.sync.syncedAt = null;
      syncNow();
    } else if (action === 'cloud-sync') {
      syncNow();
    } else if (action === 'cloud-logout') {
      await api.signOut();
      cloud.user = null;
      cloud.status = 'Uitgelogd. Je gegevens blijven op deze telefoon staan.';
      state.sync.syncedAt = null;
      save({ fromCloud: true });
    } else if (action === 'cloud-delete') {
      if (!confirm('Je account en gegevens op de server verwijderen? Op deze telefoon blijven ze staan.')) return;
      await api.deleteState();
      cloud.user = null;
      cloud.status = 'Je account en gegevens op de server zijn verwijderd.';
      state.sync.syncedAt = null;
      save({ fromCloud: true });
    }
  } catch (err) {
    cloud.error = api.describeCloudError(err);
    cloud.status = '';
  }
  render();
  if (cloud.error) {
    const alert = $('#cloud-alert');
    alert?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    alert?.focus({ preventScroll: true });
    navigator.vibrate?.([30, 60, 30]);
  }
}

// ---------- Hoe vaak is de app geopend (voor de vraag om een account te maken) ----------

const META_KEY = 'golfscore-meta';
const REGISTER_AFTER_OPENS = 5; // pas vragen als de app een paar keer gebruikt is
const ASK_AGAIN_OPENS = 10; // na "Later" pas weer na zoveel keer openen

function getMeta() {
  try { return JSON.parse(localStorage.getItem(META_KEY)) ?? {}; } catch { return {}; }
}
function setMeta(patch) {
  const meta = { ...getMeta(), ...patch };
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* geen opslag */ }
  return meta;
}
setMeta({ opens: (getMeta().opens ?? 0) + 1 });

// ---------- Gebruik bijhouden (voor het beheeroverzicht; geen locatie, geen scores) ----------

const EVENTS_KEY = 'golfscore-events';
const SESSION_GAP_MS = 30 * 60 * 1000; // na een half uur weg telt terugkomen als nieuwe sessie

function logEvent(kind, data) {
  try {
    const q = JSON.parse(localStorage.getItem(EVENTS_KEY)) ?? [];
    q.push({ kind, at: new Date().toISOString(), data });
    localStorage.setItem(EVENTS_KEY, JSON.stringify(q.slice(-300)));
  } catch { /* geen opslag: dan tellen we deze niet */ }
  flushEvents();
}

async function flushEvents() {
  if (!cloud.user || flushEvents.busy) return;
  let batch;
  try { batch = (JSON.parse(localStorage.getItem(EVENTS_KEY)) ?? []).slice(0, 100); } catch { return; }
  if (!batch.length) return;
  const api = await cloudApi();
  if (!api) return;
  flushEvents.busy = true;
  try {
    await api.sendEvents(batch);
    const rest = (JSON.parse(localStorage.getItem(EVENTS_KEY)) ?? []).slice(batch.length);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(rest));
  } catch { /* later opnieuw */ } finally {
    flushEvents.busy = false;
  }
}

function logSession() {
  const last = Date.parse(getMeta().lastSessionAt) || 0;
  if (Date.now() - last < SESSION_GAP_MS) return;
  setMeta({ lastSessionAt: new Date().toISOString() });
  logEvent('open', { gps: gpsOn(), standalone: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true });
}
setMeta({ lastSessionAt: null });
logSession();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') logSession(); });

// ---------- Leren van ingesproken tekst (zie learning.js) ----------

const learningOn = () => state.learning?.consent === true;

function recordSample(hole, texts, scores, viaAi) {
  if (!learningOn()) return;
  const q = loadQueue();
  q.open.push(recordEntry({
    roundId: state.round.id, hole, par: parOf(hole), texts, scores, viaAi,
    players: state.players.map((p) => p.name), aliases: aliasMap(),
  }));
  saveQueue(q);
}

// Toestemming gegeven: ook wat al eerder in deze ronde is ingesproken telt mee.
function enableLearning() {
  state.learning = { consent: true, decidedAt: new Date().toISOString() };
  saveQueue({ open: [], ready: loadQueue().ready });
  for (const l of state.round.log.slice().reverse()) recordSample(l.hole, [l.text], l.scores, l.viaAi);
  save();
}

function disableLearning() {
  state.learning = { consent: false, decidedAt: new Date().toISOString() };
  saveQueue({ open: [], ready: [] });
  save();
}

// Na de ronde: eindscores (met je verbeteringen) erbij en versturen.
function finishRoundSamples() {
  if (!learningOn()) return;
  saveQueue(finalizeRound(loadQueue(), state.round.id, scoreOf));
  uploadSamples();
}

async function uploadSamples() {
  if (!learningOn() || !cloud.user) return;
  const api = await cloudApi();
  const batch = loadQueue().ready.slice(0, 200);
  if (!api || !batch.length) return;
  try {
    await api.sendSamples(batch);
    const q = loadQueue();
    saveQueue({ open: q.open, ready: q.ready.slice(batch.length) });
    setMeta({ samplesSent: (getMeta().samplesSent ?? 0) + batch.length });
    renderLearning();
  } catch { /* later opnieuw, bij de volgende synchronisatie */ }
}

function renderLearning() {
  const el = $('#learn-settings');
  if (!el) return;
  const on = learningOn();
  const q = loadQueue();
  let learned = 0;
  try { const v = JSON.parse(localStorage.getItem(VOCAB_KEY)); learned = Object.keys(v?.numbers ?? {}).length + (v?.holeWords?.length ?? 0); } catch { /* niets */ }
  el.innerHTML = `<label class="check"><input type="checkbox" id="learn-on" ${on ? 'checked' : ''}> Ingesproken tekst delen om de herkenning te verbeteren</label>
    <p class="small muted">Gedeeld wordt alleen wat de telefoon verstond en welke score er na de ronde op de kaart stond (dus ook je verbeteringen).
    Spelersnamen worden s1, s2, …; andere woorden met een hoofdletter worden x. Geen geluid, geen locatie. Versturen gebeurt pas na de ronde.</p>
    <p class="small">${on ? `Klaar om te versturen: <b>${q.ready.length + q.open.length}</b> · verstuurd: <b>${getMeta().samplesSent ?? 0}</b> · ` : ''}Woorden geleerd van alle spelers: <b>${learned}</b></p>
    ${cloud.user ? '<button class="link small danger" data-action="learn-delete">Mijn gedeelde spraak van de server verwijderen</button>' : ''}`;
}

// ---------- Na de ronde: het moment om iets te vragen (niet ervoor of tijdens) ----------

function afterRound() {
  const meta = getMeta();
  let html = null;
  if (state.learning?.consent == null && state.round.log.length) {
    html = `<h2>Mag de app leren van wat je insprak?</h2>
      <p>Spraakherkenning maakt van “vijf” soms “fijf” en van “hole” soms “hal”. Als je de ingesproken tekst deelt,
      leert de app zulke woorden herkennen, voor jou en voor andere golfers.</p>
      <p class="small muted">Namen worden vervangen door s1, s2, …. Geen geluid, geen locatie. Je kunt dit altijd uitzetten en je gedeelde tekst verwijderen bij Instellingen.</p>
      <div class="button-row"><button class="primary" data-action="learn-yes">Ja, help mee</button><button data-action="learn-no">Nee, liever niet</button></div>`;
  } else if (cloudConfigured && !(cloud.user && !cloud.user.anonymous) && !meta.never && !meta.registered
    && (meta.opens ?? 0) >= REGISTER_AFTER_OPENS && (meta.askedAt == null || meta.opens - meta.askedAt >= ASK_AGAIN_OPENS)) {
    setMeta({ askedAt: meta.opens });
    html = `<h2>Bewaar je rondes met een account</h2>
      <p>Je hebt al ${state.history.length} ${state.history.length === 1 ? 'ronde' : 'rondes'} opgeslagen.
      ${cloud.user ? 'Ze staan op de server, maar alleen gekoppeld aan deze telefoon.' : 'Ze staan nu alleen op deze telefoon.'}
      Met een e-mailadres en wachtwoord zie je alles terug op een nieuwe telefoon, en blijft je handicap bewaard.</p>
      <div class="button-row"><button class="primary" data-action="register-now">Account maken</button><button data-action="close-after-round">Later</button></div>
      <button class="link small" data-action="register-never">Niet meer vragen</button>`;
  }
  if (!html) return;
  showSheet(html, 'Na de ronde');
}

function afterRoundThanks() {
  $('#after-round-body').innerHTML = `<h2>Dankjewel!</h2>
    <p>De tekst van deze ronde wordt gedeeld${cloud.user ? '' : ' zodra je verbinding hebt met de server'}. Uitzetten kan altijd bij Instellingen → Spraakherkenning verbeteren.</p>
    <div class="button-row"><button class="primary" data-action="close-after-round">Sluiten</button></div>`;
  render();
}

async function deleteSharedSpeech() {
  if (!confirm('Alle ingesproken tekst die je deelde van de server verwijderen?')) return;
  const api = await cloudApi();
  try {
    await api.deleteSamples();
    setMeta({ samplesSent: 0 });
    toast('Je gedeelde spraak is verwijderd van de server.');
  } catch (err) {
    const e = api.describeCloudError(err);
    toast(`${esc(e.title)}: ${esc(e.detail)}`, 6000);
  }
  render();
}

// ---------- Bij openen: baan en starthole kiezen, of verder met de vorige ronde ----------

const STALE_MS = 3 * 3600e3; // zo lang niets ingevuld: dan is de vorige ronde waarschijnlijk klaar
const START_OPTIONS_18 = [
  ['all', 'Hole 1', '18 holes'], ['all10', 'Hole 10', '18 holes'],
  ['front', 'Hole 1', '9 holes'], ['back', 'Hole 10', '9 holes'],
];

const roundHasScores = (r = state.round) => Object.values(r.scores).some((sc) => Object.keys(sc).length);
function lastActivity(r = state.round) {
  const times = [r.date, r.startedAt, r.lastActivity, ...r.log.map((l) => l.time)].map((t) => Date.parse(t) || 0);
  return Math.max(...times);
}

function showSheet(html, label) {
  $('#after-round-body').innerHTML = html;
  $('#after-round .sheet').setAttribute('aria-label', label);
  $('#after-round').hidden = false;
}

function startPrompt() {
  const stale = Date.now() - lastActivity() > STALE_MS;
  if (roundHasScores()) {
    if (stale) showResumeQuestion();
  } else if (stale || !state.round.startedAt) {
    showCoursePicker();
  }
}

// De par 3-baan heeft 9 holes; 18 holes is twee keer rond.
const startOptions = (c) => (c.holeCount === 9 ? [['front', 'Hole 1', '9 holes']]
  : c.id === 'par3' ? [['front', '9 holes', 'één keer rond'], ['all', '18 holes', 'twee keer rond']]
  : START_OPTIONS_18);

function startButtons(c) {
  const options = startOptions(c);
  return `<div class="start-grid">${options.map(([choice, first, len]) => `<button data-action="start-round" data-course="${esc(c.id)}" data-holes="${choice}">
    <b>${first}</b><span>${len}</span></button>`).join('')}</div>`;
}

// Waar ligt een baan? Uit de baangegevens, anders het midden van de bekende tees en greens.
function locOf(c) {
  const loc = c.location ?? DEFAULT_COURSES.find((d) => d.id === c.id)?.location;
  if (loc) return loc;
  const pts = Object.values(geoOf(c)).flatMap((h) => [h.tee, h.green]).filter(Boolean);
  return pts.length ? { lat: pts.reduce((a, p) => a + p.lat, 0) / pts.length, lon: pts.reduce((a, p) => a + p.lon, 0) / pts.length } : null;
}

const NEAR_KM = 2.5; // binnen deze afstand "ben je bij" een baan
let pickerPos = null;

// Locatie voor de baankeuze: alleen vanzelf als de locatie al is toegestaan (of GPS aan staat),
// anders pas na een tik op "Zoek baan met GPS".
async function locateForPicker(ask = false) {
  if (!('geolocation' in navigator)) return;
  if (gps.pos) pickerPos = gps.pos;
  if (!pickerPos && !ask && !gpsOn()) {
    try {
      const perm = await navigator.permissions?.query({ name: 'geolocation' });
      if (perm?.state !== 'granted') return;
    } catch { return; }
  }
  if (!pickerPos) {
    pickerPos = await new Promise((resolve) => navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    ));
    if (!pickerPos && ask) toast('Je locatie is niet beschikbaar. Kies de baan zelf.');
  }
  // Nog steeds de baankeuze in beeld? Dan opnieuw tonen met de suggestie bovenaan.
  if (pickerPos && !$('#after-round').hidden && $('#after-round-body [data-action=pick-course]')) showCoursePicker();
}

function showCoursePicker() {
  const home = state.courses.find((c) => c.id === state.homeCourseId) ?? state.courses[0];
  const km = (c, from) => { const l = locOf(c); return l && from ? distanceM(from, l) / 1000 : Infinity; };
  // Op de baan? Die (en de banen van dezelfde club ernaast) als suggestie bovenaan.
  const near = pickerPos ? state.courses.filter((c) => km(c, pickerPos) <= NEAR_KM).sort((a, b) => km(a, pickerPos) - km(b, pickerPos)) : [];
  const atClub = near.length ? near.filter((c) => km(c, locOf(near[0])) <= 1.5)
    .sort((a, b) => (b === home) - (a === home) || (a.holeCount === 18 && a.parTotal >= 60 ? -1 : 0) - (b.holeCount === 18 && b.parTotal >= 60 ? -1 : 0)) : [];
  // Thuisclub: de thuisbaan en de banen die erbij horen (zoals de par 3-baan).
  const club = state.courses.filter((c) => !atClub.includes(c) && (c === home || (home.id === 'hooge-graven' && c.id === 'par3')));
  // Andere banen: dichtstbijzijnde eerst (vanaf waar je bent, anders vanaf de thuisbaan).
  const from = pickerPos ?? locOf(home);
  const others = state.courses.filter((c) => !club.includes(c) && !atClub.includes(c)).sort((a, b) => km(a, from) - km(b, from));
  // Stap 1: alleen de banen. De starthole kies je daarna (stap 2, showStartOptions).
  const holesText = (c) => (/holes/.test(c.name) ? '' : c.id === 'par3' ? '9 holes' : `${c.holeCount} holes`);
  const heading = (c, dist) => `<button class="course-row" data-action="pick-course" data-course="${esc(c.id)}">
    <span class="course-row-name">${c === home ? '★ ' : ''}${esc(c.name)}</span>
    <span class="course-row-meta">${[holesText(c), dist].filter(Boolean).join(' · ')}</span></button>`;
  const kmText = (c) => (Number.isFinite(km(c, from)) ? `${Math.round(km(c, from))} km` : '');
  const locate = !pickerPos && 'geolocation' in navigator
    ? '<button class="link small" data-action="picker-locate">📍 Zoek baan met GPS</button>' : '';
  showSheet(`<h2>Waar speel je vandaag?</h2>
    ${atClub.length ? `<div class="start-here"><p class="small"><b>📍 Je bent bij ${esc(atClub[0].name.replace(/\s*\(.*\)$/, ''))}</b></p>
      ${atClub.map((c) => heading(c)).join('')}</div>` : locate}
    <div class="course-list">${club.map((c) => heading(c, atClub.length ? kmText(c) : '')).join('')}</div>
    ${others.length ? `<details class="start-others"><summary>Andere banen (${others.length})</summary>
      <div class="course-list">${others.map((c) => heading(c, kmText(c))).join('')}</div></details>` : ''}`, 'Baan kiezen');
  if (!pickerPos) locateForPicker();
}

// Stap 3: wie spelen er mee? Spelers van eerdere rondes staan klaar om aan te vinken.
let pendingStart = null;

function applyPlayerPicks() {
  for (const box of document.querySelectorAll('#after-round-body [data-pick-player]')) {
    const name = box.dataset.pickPlayer;
    const inRound = state.players.find((p) => p.name === name);
    const inPool = state.playerPool.find((p) => p.name === name);
    if (box.checked && inPool) {
      state.playerPool = state.playerPool.filter((p) => p !== inPool);
      state.players.push(inPool);
    } else if (!box.checked && inRound) {
      state.players = state.players.filter((p) => p !== inRound);
      state.playerPool.push(inRound);
    }
  }
}

function showPlayersStep(courseId, holesChoice) {
  pendingStart = { courseId, holesChoice };
  const known = [...state.players.map((p) => ({ p, on: true })), ...state.playerPool.map((p) => ({ p, on: false }))];
  showSheet(`<button class="link small" data-action="players-back">‹ Terug</button>
    <h2>Wie spelen er?</h2>
    ${known.length ? `<div class="player-pick">${known.map(({ p, on }) => `<label class="player-chip">
      <input type="checkbox" data-pick-player="${esc(p.name)}" ${on ? 'checked' : ''}>
      <span>${esc(p.name)}${p.index != null ? ` <span class="muted small">hcp ${fmt(p.index)}</span>` : ''}</span></label>`).join('')}</div>`
    : '<p class="small muted">Vul je eigen naam in, en die van wie er meespelen. Speel je alleen, dan is je eigen naam genoeg.</p>'}
    <form data-form="add-player" class="add-player-row">
      <input id="new-player-name" type="text" placeholder="${known.length ? 'Naam' : 'Je naam'}" autocomplete="off" aria-label="Naam" required>
      <input id="new-player-hcp" type="number" inputmode="decimal" step="0.1" min="-10" max="54" placeholder="hcp" aria-label="Handicap index (optioneel)">
      <button type="submit">Toevoegen</button>
    </form>
    <button class="primary start-btn" data-action="players-start">Start ronde</button>`, 'Spelers kiezen');
  if (!known.length) setTimeout(() => $('#new-player-name')?.focus(), 50);
}

function addPlayerFromPicker() {
  applyPlayerPicks();
  const name = $('#new-player-name').value.trim();
  const hcp = $('#new-player-hcp').value;
  if (!name) return;
  const lower = name.toLowerCase();
  const pooled = state.playerPool.find((p) => p.name.toLowerCase() === lower);
  if (pooled) {
    state.playerPool = state.playerPool.filter((p) => p !== pooled);
    state.players.push(pooled);
  } else if (!state.players.some((p) => p.name.toLowerCase() === lower)) {
    state.players.push({ name, index: hcp === '' ? null : Math.max(-10, Math.min(54, Number(hcp))), tee: 'geel' });
  }
  save();
  showPlayersStep(pendingStart.courseId, pendingStart.holesChoice);
  setTimeout(() => $('#new-player-name')?.focus(), 50);
}

function startWithPlayers() {
  applyPlayerPicks();
  const typed = $('#new-player-name')?.value.trim();
  if (typed) { addPlayerFromPicker(); applyPlayerPicks(); }
  if (!state.players.length) { toast('Voeg minstens één speler toe.'); $('#new-player-name')?.focus(); return; }
  startRound(pendingStart.courseId, pendingStart.holesChoice);
}

// Stap 2: waar begin je op deze baan? Bij maar één mogelijkheid meteen door naar de spelers.
function showStartOptions(courseId) {
  const c = state.courses.find((x) => x.id === courseId);
  if (!c) return;
  const options = startOptions(c);
  if (options.length === 1) { showPlayersStep(c.id, options[0][0]); return; }
  showSheet(`<button class="link small" data-action="picker-back">‹ Andere baan</button>
    <h2>${esc(c.name)}</h2>
    <p class="small muted">Waar begin je?</p>
    ${startButtons(c)}`, 'Starthole kiezen');
}

function showResumeQuestion() {
  const played = new Set(Object.values(state.round.scores).flatMap((sc) => Object.keys(sc))).size;
  const when = new Date(lastActivity()).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  showSheet(`<h2>Nieuwe ronde starten?</h2>
    <p>Je vorige ronde op <b>${esc(course().name)}</b> was ${esc(when)} (${played} ${played === 1 ? 'hole' : 'holes'} ingevuld).
    Die wordt bewaard bij je rondes.</p>
    <div class="button-row"><button class="primary" data-action="resume-new">Nieuwe ronde</button><button data-action="resume-continue">Verder met vorige</button></div>`, 'Nieuwe ronde');
}

function startRound(courseId, holesChoice) {
  if (roundHasScores()) archiveRound();
  state.round = newRound(holesChoice, courseId);
  logEvent('round_start', { course: courseId, holes: holesChoice });
  lastUndo = null;
  pending = null;
  showFeedback('');
  $('#ai-result').innerHTML = '';
  closeAfterRound();
  save(); render(); switchTab('ronde');
  const holes = roundHoles();
  toast(`${esc(course().name)}: start op hole ${holes[0]}, ${holes.length} holes. Succes!`);
}

function closeAfterRound() {
  const el = $('#after-round');
  if (el) el.hidden = true;
}

// ---------- Hulpfuncties ----------

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const round1 = (n) => Math.round(n * 10) / 10;
const fmt = (n) => (n == null ? '–' : String(n).replace('.', ','));
const fmt1 = (n) => (n == null ? '–' : n.toFixed(1).replace('.', ','));
const signed = (n) => (n > 0 ? `+${n}` : n === 0 ? 'E' : String(n));
// "5 (bogey)" met de kleur van de score
const termTag = (strokes, par) => `<span class="term d${Math.max(-2, Math.min(3, strokes - par))}">${scoreName(strokes, par)}</span>`;

const course = () => state.courses.find((c) => c.id === state.round.courseId) ?? state.courses[0];

function roundHoles(choice = state.round.holesChoice) {
  if (course().holeCount === 9) return Array.from({ length: 9 }, (_, i) => i + 1);
  if (choice === 'back') return Array.from({ length: 9 }, (_, i) => i + 10);
  if (choice === 'all') return Array.from({ length: 18 }, (_, i) => i + 1);
  if (choice === 'all10') return Array.from({ length: 18 }, (_, i) => ((i + 9) % 18) + 1); // 10–18, dan 1–9
  return Array.from({ length: 9 }, (_, i) => i + 1);
}

const parOf = (hole) => course().pars[hole - 1];
const scoreOf = (name, hole) => state.round.scores[name]?.[hole] ?? null;

function setScore(name, hole, strokes) {
  state.round.scores[name] ??= {};
  state.round.lastActivity = new Date().toISOString();
  if (strokes == null) delete state.round.scores[name][hole];
  else state.round.scores[name][hole] = strokes;
}

// Tee van een speler op deze baan. Spelers kiezen een tee op de grote baan; op een andere
// baan nemen we de tee voor hetzelfde geslacht (of een eerder gekozen tee voor die baan).
function teeFor(player, c = course()) {
  const own = c.tees.find((t) => t.id === player.tees?.[c.id] || t.id === player.tee);
  if (own) return own;
  const main = state.courses[0].tees.find((t) => t.id === player.tee);
  // Zelfde kleur en geslacht als op de thuisbaan, anders hetzelfde geslacht.
  const colour = (t) => t?.name.split(' ')[0].toLowerCase();
  return c.tees.find((t) => t.gender === main?.gender && colour(t) === colour(main))
    ?? c.tees.find((t) => t.gender === main?.gender) ?? c.tees[0];
}

function courseForPlayer(player) {
  const holes = roundHoles();
  const c = course();
  const tee = teeFor(player, c);
  // Op een 18-holes baan zijn de 9-holes waarden standaard de helft van de rating.
  const half = holes.length === 9 && c.holeCount === 18;
  const back = holes[0] >= 10; // officiële ratings verschillen per negen (rating9 = holes 1–9)
  return {
    name: c.name,
    holes: holes.length,
    pars: holes.map(parOf),
    strokeIndexes: holes.map((h) => c.si[h - 1]),
    rating: half ? ((back ? tee.rating9Back : null) ?? tee.rating9 ?? round1(tee.rating / 2)) : tee.rating,
    slope: half ? ((back ? tee.slope9Back : null) ?? tee.slope9 ?? tee.slope) : tee.slope,
    teeName: tee.name,
  };
}

function toast(html, ms = 3500) {
  const el = $('#toast');
  el.innerHTML = html;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, ms);
}

// ---------- Invoer verwerken ----------

let lastUndo = null;
// Vragen die nog beantwoord moeten worden: score zonder naam of onbekende naam.
let pending = null;

// Woorden die de gebruiker eerder aan een speler koppelde, bijv. { roede: 'Rudy' }.
function aliasMap() {
  return Object.fromEntries(state.players.flatMap((p) => (p.aliases ?? []).map((a) => [a, p.name])));
}

function parseOpts() {
  return { players: state.players.map((p) => p.name), aliases: aliasMap(), currentHole: inputHole(), parForHole: parOf };
}

// texts: één of meer varianten van wat er gezegd is (spraakherkenning geeft alternatieven).
async function handleInput(texts) {
  texts = texts.map((t) => t.trim()).filter(Boolean);
  if (!texts.length) return;
  const names = state.players.map((p) => p.name);
  const best = pickBest(texts, parseOpts());
  const text = best.text;
  let result = best.result;
  let viaAi = false;
  let aiNote = '';

  // Niet zeker? Laat de AI meekijken (als die is ingesteld).
  if (!result.certain && state.apiKey) {
    showFeedback('<div class="feedback info">🤖 AI kijkt mee…</div>');
    try {
      const { aiParseEntry, describeError } = await import('./ai.js');
      try {
        const ai = await aiParseEntry(state.apiKey, texts, {
          players: names, aliases: aliasMap(), currentHole: inputHole(), pars: course().pars,
        });
        const scores = [];
        const unknownNames = [];
        let bareScore = null;
        for (const s of ai.scores) {
          const known = s.name ? matchPlayer(s.name, names, aliasMap()) : null;
          if (known) scores.push({ name: known, strokes: s.strokes });
          else if (s.name) unknownNames.push({ name: s.name, strokes: s.strokes });
          else if (names.length === 1) scores.push({ name: names[0], strokes: s.strokes });
          else bareScore = s.strokes;
        }
        if (scores.length || unknownNames.length || bareScore != null) {
          result = { hole: ai.hole ?? state.round.currentHole, scores, unknownNames, bareScore, leftovers: [], certain: !unknownNames.length && bareScore == null };
          viaAi = true;
        }
      } catch (err) {
        aiNote = `<br><small>AI: ${esc(describeError(err))}</small>`;
      }
    } catch {
      aiNote = '<br><small>AI niet bereikbaar (geen internet?).</small>';
    }
  }

  const nothing = !result.scores.length && !result.unknownNames.length && result.bareScore == null;
  const alternatives = [text, ...texts.filter((t) => t !== text)];
  if (nothing) {
    recordSample(inputHole(), alternatives, [], viaAi);
    showFeedback(`<div class="feedback error">Niet begrepen: “${esc(text)}”.<br>Probeer: “Hole 3, Rudy 5, Peter 4”${state.players.length === 1 ? ' of “Hole 3, 5 slagen”' : ''}.${aiNote}</div>`);
    return;
  }
  if (!roundHoles().includes(result.hole)) {
    showFeedback(`<div class="feedback error">Hole ${result.hole} hoort niet bij deze ronde (“${esc(text)}”). Pas de holes aan bij Instellingen.</div>`);
    return;
  }

  // Bekende spelers direct opslaan.
  const previous = result.scores.map((s) => ({ name: s.name, value: scoreOf(s.name, result.hole) }));
  for (const s of result.scores) {
    setScore(s.name, result.hole, s.strokes);
    setLive(s.name, result.hole, false); // ingesproken = definitief
  }
  state.round.log.unshift({ time: new Date().toISOString(), hole: result.hole, text, viaAi, scores: result.scores.map(({ name, strokes }) => ({ name, strokes })) });
  recordSample(result.hole, alternatives, result.scores, viaAi);
  lastUndo = { hole: result.hole, previous, added: [], logId: state.round.log[0].time, prevHole: state.round.currentHole };
  state.round.currentHole = result.hole;

  // Twijfelgevallen vragen we na.
  pending = { hole: result.hole, text, items: [] };
  if (result.bareScore != null) pending.items.push({ name: null, strokes: result.bareScore });
  for (const u of result.unknownNames) pending.items.push({ name: u.name, strokes: u.strokes });
  if (!pending.items.length) pending = null;

  save();
  render();

  const summary = result.scores.map((s) => `<b>${esc(s.name)}</b> ${s.strokes} ${termTag(s.strokes, parOf(result.hole))}`).join('<br>');
  const doubt = !result.certain && !pending && result.leftovers?.length
    ? `<br><small>⚠️ Niet alles begrepen in “${esc(text)}”. Klopt dit?</small>` : '';
  showFeedback(`${summary ? `<div class="feedback ok">✅ <b>Hole ${result.hole}</b> (par ${parOf(result.hole)})<br>${summary}${viaAi ? ' <span class="badge">AI</span>' : ''}${doubt}${aiNote}
    <button class="link" data-action="undo">Ongedaan maken</button></div>` : ''}<div id="pending"></div>`);
  renderPending();
}

function renderPending() {
  const el = $('#pending');
  if (!el) return;
  if (!pending) { el.innerHTML = ''; return; }
  el.innerHTML = pending.items.map((item, k) => `<div class="feedback info">
    ${item.name
      ? `❓ “${esc(item.name)}” is geen speler. Score <b>${item.strokes}</b> op hole ${pending.hole} is voor:`
      : `❓ Voor wie is <b>${item.strokes}</b> op hole ${pending.hole}?`}
    <div class="choice-row">
      ${state.players.map((p) => `<button data-action="assign" data-k="${k}" data-player="${esc(p.name)}">${esc(p.name)}</button>`).join('')}
      ${item.name ? `<button data-action="assign" data-k="${k}" data-new="1">+ ${esc(item.name)} toevoegen</button>` : ''}
      <button data-action="assign" data-k="${k}" data-skip="1">Negeren</button>
    </div>
  </div>`).join('');
}

function assignPending(btn) {
  const k = Number(btn.dataset.k);
  const item = pending?.items[k];
  if (!item) return;
  let name = btn.dataset.player ?? null;
  if (btn.dataset.new) {
    name = item.name;
    if (!state.players.some((p) => p.name === name)) state.players.push({ name, index: null, tee: 'geel' });
  }
  // Leren: dit woord betekent voortaan deze speler.
  let learned = '';
  if (btn.dataset.player && item.name) {
    const player = state.players.find((p) => p.name === name);
    const alias = simplify(item.name);
    if (player && alias && alias !== simplify(name)) {
      player.aliases = [...new Set([...(player.aliases ?? []), alias])];
      learned = `<br><small>Onthouden: “${esc(item.name)}” = ${esc(name)}</small>`;
    }
  }
  if (name) {
    setScore(name, pending.hole, item.strokes);
    state.round.log[0]?.scores.push({ name, strokes: item.strokes });
  }
  pending.items.splice(k, 1);
  const hole = pending.hole;
  if (!pending.items.length) pending = null;
  lastUndo = null; // na een keuze geldt "ongedaan maken" niet meer voor de hele invoer
  save();
  render();
  showFeedback(name ? `<div class="feedback ok">✅ Hole ${hole}: <b>${esc(name)}</b> ${item.strokes} ${termTag(item.strokes, parOf(hole))}${learned}</div><div id="pending"></div>` : '<div id="pending"></div>');
  renderPending();
}

const holeComplete = (hole) => state.players.length > 0
  && state.players.every((p) => scoreOf(p.name, hole) != null && !isLive(p.name, hole));

// Eerstvolgende hole na `from` waar nog scores ontbreken (of null als alles gespeeld is).
function nextOpenHole(from) {
  const holes = roundHoles();
  const start = holes.indexOf(from);
  for (let k = 1; k <= holes.length; k++) {
    const h = holes[(start + k) % holes.length];
    if (!holeComplete(h)) return h;
  }
  return null;
}

// Het scherm blijft op de hole die je het laatst noemde. Een invoer zonder holenummer
// gaat naar die hole, of naar de volgende open hole als die al compleet is.
function inputHole() {
  const h = state.round.currentHole;
  return holeComplete(h) ? (nextOpenHole(h) ?? h) : h;
}

function undo() {
  if (!lastUndo) return;
  for (const p of lastUndo.previous) setScore(p.name, lastUndo.hole, p.value);
  state.players = state.players.filter((p) => !lastUndo.added.includes(p.name));
  state.round.log = state.round.log.filter((l) => l.time !== lastUndo.logId);
  state.round.currentHole = lastUndo.prevHole;
  lastUndo = null;
  pending = null;
  save();
  render();
  showFeedback('<div class="feedback info">Ongedaan gemaakt.</div>');
}

function showFeedback(html) { $('#feedback').innerHTML = html; }

// ---------- Spraak ----------

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const MAX_ALTERNATIVES = 5;
let recognition = null;

// Spraak zonder internet: nieuwere Chrome-versies kunnen Nederlands op het toestel herkennen
// (taalpakket eenmalig downloaden). Standaard gaat spraak via internet; valt het bereik weg,
// dan schakelt de app over als het taalpakket er is.
const LOCAL_SPEECH = { langs: ['nl-NL'], processLocally: true };
const localSpeechSupported = () => Boolean(SpeechRecognition && typeof SpeechRecognition.available === 'function');
let speechLocal = false;
try { speechLocal = localStorage.getItem('golfscore-speech-local') === '1'; } catch { /* geen opslag */ }

async function localSpeechStatus() {
  if (!localSpeechSupported()) return 'unsupported';
  try { return await SpeechRecognition.available(LOCAL_SPEECH); } catch { return 'unsupported'; }
}

async function installLocalSpeech() {
  try {
    toast('Nederlands taalpakket wordt gedownload…', 6000);
    const ok = await SpeechRecognition.install(LOCAL_SPEECH);
    if (ok) {
      speechLocal = true;
      try { localStorage.setItem('golfscore-speech-local', '1'); } catch { /* geen opslag */ }
      toast('Klaar: inspreken werkt nu ook zonder internet.');
    } else toast('Downloaden lukte niet. Probeer het met wifi of goed bereik.');
  } catch {
    toast('Downloaden lukte niet. Probeer het met wifi of goed bereik.');
  }
  renderSpeechOffline();
}

async function renderSpeechOffline() {
  const el = $('#speech-offline');
  if (!el) return;
  const status = await localSpeechStatus();
  el.innerHTML = status === 'available'
    ? `<p class="small">✓ Inspreken werkt ook zonder internet (Nederlands op dit toestel).</p>
       <label class="check"><input type="checkbox" id="speech-local" ${speechLocal ? 'checked' : ''}> Altijd op het toestel herkennen (ook met bereik)</label>`
    : status === 'downloadable' || status === 'downloading'
      ? `<p class="small">Op de baan is het bereik vaak slecht. Download het Nederlandse taalpakket (eenmalig, met wifi), dan werkt inspreken ook zonder internet.</p>
         <button data-action="speech-install">Spraak zonder internet downloaden</button>`
      : '<p class="small muted">Inspreken gebruikt internet. Zonder bereik kun je per slag tikken of de score typen; alles blijft bewaard.</p>';
}

function toggleMic() {
  if (!SpeechRecognition) {
    showFeedback('<div class="feedback error">Spraakherkenning werkt niet in deze browser. Gebruik Chrome (Android) of Safari (iPhone), of typ de scores.</div>');
    $('#text-input').focus();
    return;
  }
  if (recognition) { recognition.stop(); return; }

  recognition = new SpeechRecognition();
  recognition.lang = 'nl-NL';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = MAX_ALTERNATIVES;
  const local = (speechLocal || !navigator.onLine) && 'processLocally' in recognition;
  if (local) recognition.processLocally = true;
  let finals = []; // per stuk tekst: lijst met alternatieven

  const live = $('#live');
  recognition.onstart = () => {
    $('#mic').classList.add('listening');
    $('#mic-label').textContent = 'Luistert… (tik om te stoppen)';
    live.hidden = false;
    live.textContent = '…';
  };
  recognition.onresult = (e) => {
    finals = [];
    let interim = '';
    for (let i = 0; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) finals.push(Array.from(res, (alt) => alt.transcript));
      else interim += res[0].transcript;
    }
    live.textContent = finals.map((f) => f[0]).join(' ') + interim;
  };
  recognition.onerror = (e) => {
    if (e.error === 'not-allowed') showFeedback('<div class="feedback error">Geen toegang tot de microfoon. Sta dit toe in je browser.</div>');
    else if (e.error === 'network' || (local && e.error === 'language-not-supported')) {
      // Geen (goed) bereik: op het toestel herkennen als dat kan, anders tikken of typen.
      localSpeechStatus().then((status) => {
        if (status === 'available' && !local) {
          speechLocal = true;
          showFeedback('<div class="feedback info">📶 Geen goed bereik: de app herkent spraak nu op je telefoon. Tik nog een keer op de microfoon.</div>');
        } else {
          showFeedback(`<div class="feedback error">📶 Geen internet voor spraakherkenning. Tik per slag op de speler of typ de score; alles blijft bewaard.${status === 'downloadable' ? '<br><button class="link" data-action="speech-install">Spraak zonder internet downloaden (eenmalig, met wifi)</button>' : ''}</div>`);
        }
      });
    }
    else if (e.error !== 'no-speech' && e.error !== 'aborted') showFeedback(`<div class="feedback error">Spraakfout: ${esc(e.error)}</div>`);
  };
  recognition.onend = () => {
    $('#mic').classList.remove('listening');
    $('#mic-label').textContent = 'Druk en spreek in';
    live.hidden = true;
    recognition = null;
    if (!finals.length) return;
    // Variant k = alternatief k van elk stuk tekst (of de beste als er minder zijn).
    const texts = [];
    for (let k = 0; k < MAX_ALTERNATIVES; k++) {
      if (!finals.some((f) => f[k])) break;
      texts.push(finals.map((f) => f[k] ?? f[0]).join(' '));
    }
    handleInput(texts);
  };
  recognition.start();
}

// ---------- Weergave ----------

function render() {
  const holes = roundHoles();
  if (!holes.includes(state.round.currentHole)) state.round.currentHole = holes[0];
  const h = state.round.currentHole;
  // Weg van de hole waarop geteld werd: die scores zijn nu definitief.
  if (state.round.live && state.round.live.hole !== h) state.round.live = null;
  $('#course-label').textContent = course().name;
  $('#course-sub').textContent = holes.length === 9 ? (holes[0] === 1 ? 'holes 1–9' : 'holes 10–18') : '18 holes';
  $('#hole-number').textContent = h;
  $('#hole-number-2').textContent = h;
  const tee = teeFor(state.players[0] ?? { tee: 'geel' });
  const len = tee.lengths?.[h - 1];
  const chip = (label, value) => `<span class="chip"><span class="muted">${esc(label)}</span> <strong>${esc(value)}</strong></span>`;
  const teeColor = TEE_COLORS[tee.name.split(' ')[0].toLowerCase()];
  $('#hole-meta').innerHTML = chip('Par', parOf(h)) + chip('SI', course().si[h - 1])
    + (len ? `<span class="chip" title="${esc(tee.name)}">${teeColor ? `<span class="tee-dot" style="background:${teeColor}" aria-hidden="true"></span>` : `<span class="muted">${esc(tee.name)}</span> `}<strong>${len} m</strong></span>` : '');
  $('#map-btn').hidden = !mapForHole(h);
  const imgs = holeImages(h);
  const hidden = holeViewHidden();
  $('#hole-view').hidden = !imgs || hidden;
  $('#hole-view-show').hidden = !imgs || !hidden;
  if (imgs && !hidden) {
    $('#hole-img').src = imgs.hole;
    $('#pin-img').hidden = !imgs.pin;
    if (imgs.pin) $('#pin-img').src = imgs.pin;
    $('#pin-label').textContent = imgs.pin ? 'Pinposities A · B · C' : `Hole ${h}`;
    $('#pin-sub').textContent = imgs.pin ? `Green van hole ${h}` : `Par ${parOf(h)}${len ? ` · ${len} m` : ''}`;
  }
  const next = inputHole();
  $('#next-hint').innerHTML = next !== h
    ? `Hole ${h} is compleet. Zonder holenummer gaat je volgende invoer naar <b>hole ${next}</b>.`
    : '';
  renderQuickEntry();
  renderLog();
  renderScorecard();
  renderAnalysis();
  renderSettings();
  renderCloud();
  renderLearning();
  renderBuggy();
  renderGps();
  renderGpsSettings();
}

function renderQuickEntry() {
  const h = state.round.currentHole;
  const rows = state.players.map((p, i) => {
    const s = scoreOf(p.name, h);
    const { played, toPar } = playerTotals(p);
    return `<div class="qe-row">
      <button class="qe-info qe-tap" data-action="plus" data-i="${i}" aria-label="${esc(p.name)}: slag erbij">
        <span class="qe-name">${esc(p.name)}</span>
        <span class="qe-sub">${s == null ? '<span class="muted">Tik per slag</span>' : isLive(p.name, h) ? '<span class="term live">Bezig</span>' : termTag(s, parOf(h))}
          ${played ? `<span class="muted">Totaal <strong>${signed(toPar)}</strong></span>` : ''}</span>
      </button>
      <button class="round-btn" data-action="minus" data-i="${i}" aria-label="${esc(p.name)}: één slag minder">−</button>
      <span class="qe-score" aria-label="${s ?? 0} slagen">${s ?? '·'}</span>
      <button class="round-btn plus" data-action="plus" data-i="${i}" aria-label="${esc(p.name)}: één slag meer">+</button>
    </div>`;
  }).join('');
  $('#quick-entry').innerHTML = rows || '<p class="muted">Voeg spelers toe bij Instellingen, of noem gewoon een naam.</p>';
  $('#quick-entry').classList.toggle('empty', !rows);
}

function renderLog() {
  $('#log').innerHTML = state.round.log.slice(0, 20).map((l) => `<li>
    <span class="muted small">${new Date(l.time).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} · hole ${l.hole}${l.viaAi ? ' · AI' : ''}</span><br>
    “${esc(l.text)}” → ${l.scores.map((s) => `${esc(s.name)} ${s.strokes} ${termTag(s.strokes, parOf(l.hole))}`).join(', ')}
  </li>`).join('') || '<li class="muted">Nog niets ingesproken.</li>';
}

function renderScorecard() {
  const holes = roundHoles();
  const head = `<tr><th>Hole</th><th>Par</th>${state.players.map((p) => `<th>${esc(p.name)}</th>`).join('')}</tr>`;
  const rows = holes.map((h) => `<tr class="${h === state.round.currentHole ? 'current' : ''}">
    <td>${h}</td><td>${parOf(h)}</td>
    ${state.players.map((p) => {
      const s = scoreOf(p.name, h);
      const cls = s == null ? '' : `d${Math.max(-2, Math.min(3, s - parOf(h)))}`;
      return `<td><input class="cell ${cls}" type="number" inputmode="numeric" min="1" max="20" value="${s ?? ''}" data-name="${esc(p.name)}" data-hole="${h}"></td>`;
    }).join('')}
  </tr>`).join('');
  const parTotal = holes.reduce((s, h) => s + parOf(h), 0);
  const totals = `<tr class="total"><td>Totaal</td><td>${parTotal}</td>${state.players.map((p) => {
    const played = holes.filter((h) => scoreOf(p.name, h) != null);
    const gross = played.reduce((s, h) => s + scoreOf(p.name, h), 0);
    const toPar = gross - played.reduce((s, h) => s + parOf(h), 0);
    return `<td>${played.length ? `${gross}<br><small>${signed(toPar)}</small>` : '–'}</td>`;
  }).join('')}</tr>`;
  $('#scorecard').innerHTML = head + rows + totals;
}

function computeResults() {
  return state.players.map((p) => {
    const playerCourse = courseForPlayer(p);
    const holes = roundHoles();
    const scores = holes.map((h) => scoreOf(p.name, h));
    const res = analysePlayer(playerCourse, p, scores);
    const counts = course().countsForIndex !== false;
    const previous = state.history
      .filter((r) => state.courses.find((c) => c.id === (r.courseId ?? 'hooge-graven'))?.countsForIndex !== false)
      .flatMap((r) => r.results.filter((x) => x.name === p.name).map((x) => x.differential18));
    const allDiffs = counts ? [...previous, res.differential18] : previous;
    return {
      ...res,
      scores,
      holeNumbers: holes,
      teeName: playerCourse.teeName,
      rating: playerCourse.rating,
      slope: playerCourse.slope,
      roundsCounted: allDiffs.length,
      countsForIndex: counts,
      newIndex: handicapIndexFromDifferentials(allDiffs),
    };
  }).filter((r) => r.holesPlayed > 0);
}

function renderAnalysis() {
  const results = computeResults();
  if (!results.length) {
    $('#analysis').innerHTML = '<p class="muted">Nog geen scores. Speel eerst een paar holes 🙂</p>';
    return;
  }
  const holesTotal = roundHoles().length;
  const best = [...results].sort((a, b) => (a.stableford != null && b.stableford != null ? b.stableford - a.stableford : a.toPar - b.toPar))[0];
  $('#analysis').innerHTML = `<p class="muted small">Berekend volgens het World Handicap System. Ontbrekende holes tellen als netto par.</p>` +
    results.map((r) => {
      const t = r.tally;
      const bestHole = r.holeNumbers.map((h, i) => ({ h, d: r.scores[i] == null ? null : r.scores[i] - parOf(h) }))
        .filter((x) => x.d != null).sort((a, b) => a.d - b.d);
      return `<div class="result ${r === best && results.length > 1 ? 'winner' : ''}">
        <h3>${esc(r.name)} ${r === best && results.length > 1 ? '🏆' : ''}</h3>
        <div class="stats">
          <div><span>Bruto</span><b>${r.gross}</b><small>${signed(r.toPar)} (${r.holesPlayed}/${holesTotal} holes)</small></div>
          <div><span>Stableford</span><b>${r.stableford ?? '–'}</b><small>${r.courseHandicap != null ? `CH ${r.courseHandicap}` : 'geen HCP'}</small></div>
          <div><span>Differential</span><b>${fmt1(r.differential18)}</b><small>${holesTotal === 9 ? `9 holes: ${fmt1(r.differential)}` : '18 holes'}</small></div>
          ${r.countsForIndex
            ? `<div><span>Handicap</span><b>${r.newIndex != null ? fmt1(r.newIndex) : `≈ ${fmt1(Math.min(54, r.differential18))}`}</b><small>${r.newIndex != null ? `index uit ${Math.min(20, r.roundsCounted)} rondes` : `indicatie · nog ${3 - r.roundsCounted} ronde(s) voor index`}</small></div>`
            : `<div><span>Handicap</span><b>${r.newIndex != null ? fmt1(r.newIndex) : '–'}</b><small>par 3-ronde telt niet mee voor de index</small></div>`}
        </div>
        <p class="small">
          ${t.eagleOfBeter ? `🦅 ${t.eagleOfBeter} eagle · ` : ''}🐦 ${t.birdie} birdie · ✅ ${t.par} par · ${t.bogey} bogey · ${t.doubleBogey} dubbel · ${t.slechter} slechter
          ${bestHole.length ? `<br>Beste hole: ${bestHole[0].h} (${scoreName(bestHole[0].d + parOf(bestHole[0].h), parOf(bestHole[0].h))}) · lastigste: ${bestHole.at(-1).h} (${scoreName(bestHole.at(-1).d + parOf(bestHole.at(-1).h), parOf(bestHole.at(-1).h))})` : ''}
        </p>
        <details class="small"><summary>Hoe is dit berekend?</summary>
          <p>Tee ${esc(r.teeName)}: course rating ${fmt(r.rating)}, slope ${r.slope}.
          ${r.index != null ? `Handicap index ${fmt(r.index)} → course handicap ${r.courseHandicap} (${r.strokesReceived} slagen).` : 'Geen handicap ingevuld: maximaal par + 5 per hole.'}
          Aangepaste bruto score (${r.index != null ? 'max. netto double bogey' : 'max. par + 5'} per hole): ${r.adjustedGross}.
          Score differential = 113 / ${r.slope} × (${r.adjustedGross} − ${fmt(r.rating)}) = <b>${fmt1(r.differential)}</b>.
          ${holesTotal === 9 ? `Omgerekend naar 18 holes: ${fmt1(r.differential18)} (${esc(r.differential18Note)}).` : ''}</p>
        </details>
      </div>`;
    }).join('');
}

function renderHistory() {
  $('#history').innerHTML = state.history.slice().reverse().map((r) => `<div class="hist">
    <b>${new Date(r.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}</b> · ${esc(r.label)}<br>
    ${r.results.map((x) => `${esc(x.name)}: ${x.gross} (${signed(x.toPar)}), diff. ${fmt1(x.differential18)}`).join('<br>')}
  </div>`).join('') || '<p class="muted">Nog geen opgeslagen rondes.</p>';
}

function renderSettings() {
  const home = state.courses.find((c) => c.id === state.homeCourseId) ?? state.courses[0];
  const ordered = [home, ...state.courses.filter((c) => c !== home)];
  $('#round-course').innerHTML = ordered.map((c) => `<option value="${esc(c.id)}">${c === home ? '★ ' : ''}${esc(c.name)}</option>`).join('');
  $('#home-course').innerHTML = `Thuisbaan: <b>★ ${esc(home.name)}</b> (staat bij elke nieuwe ronde vooraf gekozen)`;
  $('#make-home-btn').hidden = course() === home;
  $('#remove-course-btn').hidden = !course().custom;
  $('#round-course').value = course().id;
  $('#round-holes').value = state.round.holesChoice;
  $('#round-holes-label').hidden = course().holeCount === 9;
  const tees = course().tees;
  const nineHoleCourse = course().holeCount === 9;
  $('#rating-help').hidden = nineHoleCourse;
  $('#players').innerHTML = state.players.map((p, i) => `<div class="player-row">
    <input type="text" value="${esc(p.name)}" data-player="${i}" data-field="name" aria-label="Naam">
    <input type="number" step="0.1" min="-10" max="54" value="${p.index ?? ''}" placeholder="HCP" data-player="${i}" data-field="index" aria-label="Handicap index">
    <select data-player="${i}" data-field="tee" aria-label="Tee">${tees.map((t) => `<option value="${t.id}" ${t.id === teeFor(p).id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
    <button data-action="remove-player" data-i="${i}" aria-label="Verwijderen">✕</button>
    ${p.aliases?.length ? `<div class="aliases small muted">Herkent ook: ${p.aliases.map(esc).join(', ')}
      <button class="link inline" data-action="clear-aliases" data-i="${i}">wissen</button></div>` : ''}
  </div>`).join('');

  $('#course-name').value = course().name;
  $('#tees').innerHTML = nineHoleCourse
    ? `<table class="scorecard tees"><tr><th>Tee</th><th>Course rating (9)</th><th>Slope (9)</th></tr>${tees.map((t, i) => `<tr>
      <td>${esc(t.name)}</td>
      <td><input type="number" step="0.1" value="${t.rating}" data-tee="${i}" data-field="rating"></td>
      <td><input type="number" value="${t.slope}" data-tee="${i}" data-field="slope"></td>
    </tr>`).join('')}</table>`
    : `<table class="scorecard tees"><tr><th>Tee</th><th>CR 18</th><th>Slope 18</th><th>CR 9</th><th>Slope 9</th></tr>${tees.map((t, i) => `<tr>
    <td>${esc(t.name)}</td>
    <td><input type="number" step="0.1" value="${t.rating}" data-tee="${i}" data-field="rating"></td>
    <td><input type="number" value="${t.slope}" data-tee="${i}" data-field="slope"></td>
    <td><input type="number" step="0.1" value="${t.rating9 ?? ''}" placeholder="${fmt(round1(t.rating / 2))}" data-tee="${i}" data-field="rating9"></td>
    <td><input type="number" value="${t.slope9 ?? ''}" placeholder="${t.slope}" data-tee="${i}" data-field="slope9"></td>
  </tr>`).join('')}</table>`;

  const parSum = course().pars.reduce((a, b) => a + b, 0);
  const warnings = [];
  if (course().siUnknown) warnings.push('De <b>stroke index</b> per hole staat niet op de scorekaart van de club; de app telt de holes op volgorde. Pas ze aan als je ze weet.');
  if (course().tees.some((t) => t.ratingUnknown)) warnings.push('Vul <b>course rating en slope</b> per tee in van de scorekaart (nu staan er neutrale waarden).');
  if (course().parTotal && parSum !== course().parTotal) warnings.push(`De totale par moet <b>${course().parTotal}</b> zijn, nu is het ${parSum}. Pas de par per hole aan.`);
  $('#course-warning').innerHTML = (warnings.length ? `<div class="feedback error">⚠️ ${warnings.join('<br>⚠️ ')}</div>` : '') + (course().confirmed ? '' :
    (course().fromSources
      ? `<div class="feedback info">⚠️ Par, stroke index en ratings van deze baan komen uit openbare bronnen. Vergelijk ze met de scorekaart van de club${course().website ? ` (<a href="${esc(course().website)}" target="_blank" rel="noopener">website</a>)` : ''}. <button class="link" data-action="confirm-course">Klopt, verberg</button></div>`
      : `<div class="feedback info">⚠️ Vul de <b>${nineHoleCourse ? 'stroke index' : 'par en stroke index'} per hole</b> in zoals op de scorekaart van de club${nineHoleCourse ? '' : ' (nu staat alles op par 4)'}. <button class="link" data-action="confirm-course">Klopt, verberg</button></div>`));
  $('#course-table').innerHTML = `<tr><th>Hole</th>${course().pars.map((_, i) => `<th>${i + 1}</th>`).join('')}<th>Tot.</th></tr>
    <tr><td>Par</td>${course().pars.map((p, i) => `<td><input class="cell" type="number" inputmode="numeric" min="3" max="6" value="${p}" data-course="pars" data-h="${i}"></td>`).join('')}<td>${course().pars.reduce((a, b) => a + b, 0)}</td></tr>
    <tr><td>SI</td>${course().si.map((s, i) => `<td><input class="cell" type="number" inputmode="numeric" min="1" max="18" value="${s}" data-course="si" data-h="${i}"></td>`).join('')}<td></td></tr>`;
  if (document.activeElement?.id !== 'api-key') $('#api-key').value = state.apiKey;
  $('#ai-btn').disabled = !state.apiKey;
  $('#ai-btn').title = state.apiKey ? '' : 'Vul eerst een API-sleutel in bij Instellingen';
  renderHistory();
}

// ---------- AI-analyse en opslaan ----------

async function runAiAnalysis() {
  const results = computeResults();
  if (!results.length) { toast('Nog geen scores om te analyseren.'); return; }
  const out = $('#ai-result');
  out.innerHTML = '<div class="feedback info">🤖 Claude analyseert de ronde…</div>';
  let ai;
  try {
    ai = await import('./ai.js');
  } catch {
    out.innerHTML = '<div class="feedback error">AI niet bereikbaar (geen internet?).</div>';
    return;
  }
  try {
    const roundCourse = courseForPlayer(state.players[0] ?? { tee: 'geel' });
    const transcripts = state.round.log.slice().reverse().map((l) => `hole ${l.hole}: ${l.text}`);
    const a = await ai.aiAnalyseRound(state.apiKey, { course: roundCourse, results, transcripts });
    out.innerHTML = `<div class="ai-box">
      <p>${esc(a.samenvatting)}</p>
      ${a.spelers.map((s) => `<h3>${esc(s.naam)}</h3><p>${esc(s.analyse)}</p><p>💡 <i>${esc(s.tip)}</i></p>`).join('')}
      ${a.controle.length ? `<h3>Controle</h3><ul>${a.controle.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : '<p class="muted small">✔️ Ingesproken teksten en scorekaart komen overeen.</p>'}
    </div>`;
  } catch (err) {
    out.innerHTML = `<div class="feedback error">${esc(ai.describeError(err))}</div>`;
  }
}

// Ronde bij de opgeslagen rondes zetten (zonder vragen). Geeft false als er niets te bewaren is.
function archiveRound() {
  const results = computeResults();
  if (!results.length) return false;
  const holes = roundHoles();
  const entry = {
    id: state.round.id,
    date: state.round.date,
    courseId: course().id,
    label: course().holeCount === 9 ? course().name : `${course().name}, ${holes.length === 9 ? `holes ${holes[0]}–${holes.at(-1)}` : '18 holes'}`,
    results: results.map((r) => ({ name: r.name, gross: r.gross, toPar: r.toPar, differential: r.differential, differential18: r.differential18, scores: r.scores })),
  };
  state.history = state.history.filter((r) => r.id !== entry.id);
  state.history.push(entry);
  logEvent('round_saved', { course: entry.courseId, holes: holes.length, players: results.length });
  finishRoundSamples();
  return true;
}

function saveRound() {
  if (!archiveRound()) { toast('Nog geen scores om op te slaan.'); return; }
  save();
  render();
  toast('Ronde opgeslagen. Start een nieuwe ronde via Instellingen.');
  afterRound();
}

// ---------- Gebeurtenissen ----------

function switchTab(name) {
  if (name === 'instellingen') renderSpeechOffline();
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.id === `tab-${name}`));
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  window.scrollTo(0, 0);
}

document.addEventListener('click', (e) => {
  const tabBtn = e.target.closest('[data-tab]');
  if (tabBtn) { switchTab(tabBtn.dataset.tab); return; }
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  switch (btn.dataset.action) {
    case 'mic': toggleMic(); break;
    case 'prev-hole': moveHole(-1); break;
    case 'next-hole': moveHole(1); break;
    case 'plus':
    case 'minus':
      adjustScore(Number(btn.dataset.i), btn.dataset.action === 'plus' ? 1 : -1);
      navigator.vibrate?.(btn.dataset.action === 'plus' ? 25 : [15, 40, 15]); // voelbaar zonder te kijken
      break;
    case 'buggy-connect': connectBuggy(); break;
    case 'gps-mark': gps.editing = false; markPoint(btn.dataset.point); break;
    case 'gps-edit': gps.editing = true; renderGps(); break;
    case 'gps-go':
      state.round.currentHole = Number(btn.dataset.hole);
      gps.suggest = null;
      save(); render();
      break;
    case 'gps-clear':
      if (confirm(`Alle vastgelegde tees en greens van ${course().name} wissen?`)) {
        delete course().geo;
        save(); render();
      }
      break;
    case 'buggy-disconnect': buggy.disconnect(); break;
    case 'undo': undo(); break;
    case 'show-map': {
      const m = mapForHole(state.round.currentHole);
      if (!m) break;
      $('#map-title').textContent = `${course().name} · ${m.title}`;
      $('#map-img').src = m.src;
      $('#map-overlay').hidden = false;
      break;
    }
    case 'close-map': $('#map-overlay').hidden = true; break;
    case 'toggle-hole-view':
      try { localStorage.setItem('golfscore-hide-hole', holeViewHidden() ? '0' : '1'); } catch { /* geen opslag: blijft zichtbaar */ }
      render();
      break;
    case 'assign': assignPending(btn); break;
    case 'clear-aliases': state.players[Number(btn.dataset.i)].aliases = []; save(); render(); break;
    case 'remove-player': {
      const p = state.players[Number(btn.dataset.i)];
      if (confirm(`${p.name} verwijderen?`)) {
        state.players.splice(Number(btn.dataset.i), 1);
        delete state.round.scores[p.name];
        save(); render();
      }
      break;
    }
    case 'new-round':
      if (confirm('Nieuwe ronde starten? Scores die je niet hebt opgeslagen gaan verloren.')) {
        finishRoundSamples();
        state.round = newRound($('#round-holes').value, $('#round-course').value);
        logEvent('round_start', { course: state.round.courseId, holes: state.round.holesChoice });
        lastUndo = null;
        pending = null;
        showFeedback('');
        $('#ai-result').innerHTML = '';
        save(); render(); switchTab('ronde');
      }
      break;
    case 'confirm-course': course().confirmed = true; save(); render(); break;
    case 'make-home':
      state.homeCourseId = course().id;
      save(); render();
      toast(`${esc(course().name)} is nu je thuisbaan.`);
      break;
    case 'remove-course': {
      const c = course();
      if (!c.custom || !confirm(`${c.name} verwijderen?`)) break;
      state.courses = state.courses.filter((x) => x !== c);
      if (state.homeCourseId === c.id) state.homeCourseId = state.courses[0].id;
      state.round = newRound('front', state.homeCourseId);
      save(); render();
      break;
    }
    case 'ai-analyse': runAiAnalysis(); break;
    case 'save-round': saveRound(); break;
    case 'export': {
      const blob = new Blob([JSON.stringify({ ...state, apiKey: undefined }, null, 2)], { type: 'application/json' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `golfscore-${new Date().toISOString().slice(0, 10)}.json` });
      a.click();
      URL.revokeObjectURL(a.href);
      break;
    }
    case 'learn-yes': enableLearning(); finishRoundSamples(); afterRoundThanks(); break;
    case 'learn-no': disableLearning(); closeAfterRound(); render(); break;
    case 'learn-delete': deleteSharedSpeech(); break;
    case 'close-after-round': closeAfterRound(); break;
    case 'speech-install': installLocalSpeech(); break;
    case 'picker-locate': locateForPicker(true); break;
    case 'start-round': showPlayersStep(btn.dataset.course, btn.dataset.holes); break;
    case 'players-start': startWithPlayers(); break;
    case 'players-back': {
      applyPlayerPicks();
      const c = state.courses.find((x) => x.id === pendingStart?.courseId);
      if (c && startOptions(c).length > 1) showStartOptions(c.id); else showCoursePicker();
      break;
    }
    case 'pick-course': showStartOptions(btn.dataset.course); break;
    case 'picker-back': showCoursePicker(); break;
    case 'resume-new': showCoursePicker(); break;
    case 'resume-continue': state.round.lastActivity = new Date().toISOString(); save(); closeAfterRound(); break;
    case 'register-never': setMeta({ never: true }); closeAfterRound(); break;
    case 'register-now':
      closeAfterRound();
      switchTab('instellingen');
      $('#cloud-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => $('#cloud-email')?.focus(), 400);
      break;
    case 'cloud-device':
    case 'cloud-sync':
    case 'cloud-logout':
    case 'cloud-delete':
    case 'cloud-test':
      cloudAction(btn.dataset.action);
      break;
    case 'reset':
      if (confirm('Echt alles wissen? Spelers, baan, rondes en historie worden verwijderd.')) {
        localStorage.removeItem(STORAGE_KEY);
        state = load();
        render();
      }
      break;
  }
});

$('#text-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#text-input');
  handleInput([input.value]);
  input.value = '';
});

$('#course-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#new-course-name').value.trim();
  if (!name) return;
  const holeCount = Number($('#new-course-holes').value);
  const parTotal = Number($('#new-course-par').value) || (holeCount === 9 ? 36 : 72);
  const c = standardCourse(`eigen-${Date.now()}`, name, parTotal, [
    // Neutrale startwaarden (rating = par, slope 113) tot de echte waarden zijn ingevuld.
    ['geel', 'Geel (heren)', 'h', parTotal, 113],
    ['rood', 'Rood (dames)', 'd', parTotal, 113],
  ], holeCount);
  c.custom = true;
  c.tees.forEach((t) => { t.ratingUnknown = true; });
  state.courses.push(c);
  const empty = Object.values(state.round.scores).every((sc) => !Object.keys(sc).length);
  if (empty) state.round = newRound('front', c.id);
  $('#course-form').reset();
  $('#course-form').closest('details').open = false;
  save(); render();
  toast(empty ? `${esc(name)} toegevoegd en gekozen.` : `${esc(name)} toegevoegd. Start een nieuwe ronde om er te spelen.`);
});

$('#player-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#player-name').value.trim();
  if (name && !state.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    state.players.push({ name, index: null, tee: 'geel' });
    save(); render();
  }
  $('#player-name').value = '';
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.matches('#scorecard input')) {
    const v = t.value === '' ? null : Math.max(1, Math.min(20, Math.round(Number(t.value))));
    setScore(t.dataset.name, Number(t.dataset.hole), v);
  } else if (t.dataset.player != null) {
    const p = state.players[Number(t.dataset.player)];
    if (t.dataset.field === 'name') {
      const name = t.value.trim();
      if (name && !state.players.some((x) => x !== p && x.name === name)) {
        if (state.round.scores[p.name]) {
          state.round.scores[name] = state.round.scores[p.name];
          delete state.round.scores[p.name];
        }
        p.name = name;
      }
    } else if (t.dataset.field === 'index') {
      p.index = t.value === '' ? null : Math.min(54, Number(t.value));
    } else if (course().id === state.courses[0].id) {
      p.tee = t.value;
    } else {
      p.tees = { ...p.tees, [course().id]: t.value };
    }
  } else if (t.dataset.tee != null) {
    const tee = course().tees[Number(t.dataset.tee)];
    delete tee.ratingUnknown;
    const optional = t.dataset.field.endsWith('9');
    tee[t.dataset.field] = t.value === '' && optional ? null : Number(t.value);
  } else if (t.dataset.course) {
    course()[t.dataset.course][Number(t.dataset.h)] = Number(t.value);
  } else if (t.id === 'course-name') {
    course().name = t.value.trim() || DEFAULT_COURSES.find((c) => c.id === course().id)?.name || 'Baan';
  } else if (t.id === 'gps-on') {
    setGpsPref('golfscore-gps', t.checked);
    if (t.checked) startGps(); else stopGps();
    render();
    return;
  } else if (t.id === 'speech-local') {
    speechLocal = t.checked;
    try { localStorage.setItem('golfscore-speech-local', t.checked ? '1' : '0'); } catch { /* geen opslag */ }
    return;
  } else if (t.id === 'learn-on') {
    if (t.checked) { enableLearning(); uploadSamples(); } else disableLearning();
    render();
    return;
  } else if (t.id === 'gps-auto') {
    setGpsPref('golfscore-gps-auto', t.checked);
    render();
    return;
  } else if (t.id === 'api-key') {
    state.apiKey = t.value.trim();
  } else if (t.id === 'round-course') {
    const empty = Object.values(state.round.scores).every((s) => !Object.keys(s).length);
    if (empty) state.round = newRound(state.round.holesChoice, t.value);
    else toast('Er zijn al scores. Kies “Nieuwe ronde starten” om op een andere baan te spelen.');
  } else if (t.id === 'round-holes') {
    // Pas de holes direct aan als er nog niets gespeeld is.
    const empty = Object.values(state.round.scores).every((s) => !Object.keys(s).length);
    if (empty) state.round = newRound(t.value, state.round.courseId);
    else toast('Er zijn al scores. Kies “Nieuwe ronde starten” om andere holes te spelen.');
  } else {
    return;
  }
  save();
  render();
});

document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault();
  if (form.dataset.form === 'add-player') { addPlayerFromPicker(); return; }
  cloudAction(form.dataset.form, e.submitter);
});

render();
startPrompt();
initCloud();
if (gpsOn()) startGps();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
