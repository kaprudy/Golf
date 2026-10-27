import { pickBest, matchPlayer, simplify, setLearnedVocab } from './parser.js';
import { recordEntry, loadQueue, saveQueue, finalizeRound } from './learning.js';
import { decideSync, mergeStates, toCloud, fromCloud } from './sync.js';
import { API_URL } from './config.js';
import { createBuggy, buggySupported } from './buggy.js';
import { teeAt, toGreen, geoProgress } from './gps.js';
import { analysePlayer, handicapIndexFromDifferentials, scoreName } from './handicap.js';

// ---------- Opslag ----------

const STORAGE_KEY = 'golfscore-v1';

// Banen van Hooge Graven (Ommen). Ratings volgens openbare baangegevens; controleer ze
// op de scorekaart van de club. Stroke index (en bij de grote baan de par) per hole vul je zelf in.
// Bij een 9-holes baan zijn rating en slope de 9-holes waarden.
// Hooge Graven: par, stroke index en lengtes van de officiële scorekaarten van de club.
// Course rating en slope volgens 1golf.eu (staan niet op de scorekaart); de lengtes per tee
// komen daarmee overeen. Verhoog dataVersion als deze gegevens wijzigen: opgeslagen
// banen worden dan bijgewerkt.
const DEFAULT_COURSES = [
  {
    id: 'hooge-graven',
    dataVersion: 2,
    name: 'Hooge Graven (18 holes)',
    holeCount: 18,
    parTotal: 72,
    pars: [4, 3, 4, 4, 4, 5, 3, 5, 3, 5, 3, 4, 4, 4, 5, 4, 4, 4],
    si: [6, 14, 18, 4, 8, 2, 16, 12, 10, 9, 17, 15, 3, 1, 13, 11, 5, 7],
    confirmed: true,
    tees: [
      { id: 'wit', name: 'Wit (heren)', gender: 'h', rating: 72.9, slope: 132, rating9: null, slope9: null,
        lengths: [401, 168, 301, 364, 364, 503, 167, 453, 182, 499, 172, 303, 368, 380, 458, 340, 394, 377] },
      { id: 'geel', name: 'Geel (heren)', gender: 'h', rating: 71.7, slope: 129, rating9: null, slope9: null,
        lengths: [387, 158, 295, 349, 349, 488, 159, 443, 172, 490, 157, 288, 358, 372, 435, 330, 381, 363] },
      { id: 'blauw', name: 'Blauw (dames)', gender: 'd', rating: 74.5, slope: 127, rating9: null, slope9: null,
        lengths: [331, 147, 284, 340, 337, 478, 145, 386, 153, 407, 147, 277, 314, 353, 382, 282, 340, 304] },
      { id: 'rood', name: 'Rood (dames)', gender: 'd', rating: 72.4, slope: 124, rating9: null, slope9: null,
        lengths: [331, 137, 251, 296, 294, 410, 126, 382, 153, 404, 133, 257, 310, 325, 377, 282, 340, 304] },
    ],
  },
  {
    // 9 holes; voor 18 holes speel je ze twee keer (holes 10-18 = tweede ronde, met eigen S.I.).
    id: 'par3',
    dataVersion: 2,
    name: 'Hooge Graven Par 3',
    holeCount: 18,
    countsForIndex: false, // te kort voor een WHS-qualifying ronde
    parTotal: 54,
    pars: Array(18).fill(3),
    si: [9, 3, 7, 11, 15, 5, 13, 1, 17, 10, 4, 8, 12, 16, 6, 14, 2, 18],
    confirmed: true,
    tees: [
      { id: 'par3-heren', name: 'Heren', gender: 'h', rating: 48.8, slope: 68, rating9: 24.4, slope9: 68,
        lengths: [89, 111, 86, 73, 87, 128, 78, 100, 93, 89, 111, 86, 73, 87, 128, 78, 100, 93] },
      { id: 'par3-dames', name: 'Dames', gender: 'd', rating: 50.4, slope: 70, rating9: 25.2, slope9: 70,
        lengths: [89, 111, 86, 73, 87, 128, 78, 100, 93, 89, 111, 86, 73, 87, 128, 78, 100, 93] },
    ],
  },
  // Banen in de regio (par, stroke index en ratings uit openbare bronnen; nog controleren met de
  // scorekaart van de club, daarom confirmed: false). Tees zonder bekende rating: ratingUnknown.
  {
    id: 'zwolle', dataVersion: 2, name: 'Golfclub Zwolle', holeCount: 18, parTotal: 72, pars: [4, 5, 3, 5, 4, 4, 4, 3, 4, 4, 3, 4, 4, 4, 5, 3, 4, 5], si: [11, 1, 15, 5, 3, 13, 9, 17, 7, 2, 16, 6, 10, 14, 12, 18, 8, 4], confirmed: false, fromSources: true, location: {lat: 52.537, lon: 6.15}, website: 'https://www.golfclubzwolle.nl/',
    tees: [
      {id: 'zwolle-geel', name: 'Geel (heren)', gender: 'h', rating: 71.4, slope: 131, rating9: null, slope9: null},
      {id: 'zwolle-rood', name: 'Rood (dames)', gender: 'd', rating: 72.8, slope: 129, rating9: null, slope9: null},
    ],
  },
  {
    id: 'de-koepel', dataVersion: 2, name: 'Golfclub De Koepel (Wierden)', holeCount: 18, parTotal: 70, pars: [4, 5, 3, 4, 5, 3, 4, 4, 3, 5, 3, 4, 4, 4, 4, 4, 4, 3], si: [8, 6, 18, 4, 2, 16, 12, 10, 14, 5, 17, 1, 9, 3, 15, 7, 11, 13], confirmed: false, fromSources: true, location: {lat: 52.369, lon: 6.583}, website: 'https://www.golfclubdekoepel.nl/',
    tees: [
      {id: 'koepel-geel', name: 'Geel (heren)', gender: 'h', rating: 70.0, slope: 129, rating9: null, slope9: null, lengths: [303, 465, 134, 339, 459, 166, 320, 342, 168, 433, 149, 399, 347, 379, 282, 391, 340, 160]},
      {id: 'koepel-geel-d', name: 'Geel (dames)', gender: 'd', rating: 75.7, slope: 137, rating9: null, slope9: null, lengths: [303, 465, 134, 339, 459, 166, 320, 342, 168, 433, 149, 399, 347, 379, 282, 391, 340, 160]},
      {id: 'koepel-rood-h', name: 'Rood (heren)', gender: 'h', rating: 66.2, slope: 112, rating9: null, slope9: null},
      {id: 'koepel-rood', name: 'Rood (dames)', gender: 'd', rating: 70.8, slope: 128, rating9: null, slope9: null},
      {id: 'koepel-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 64.2, slope: 102, rating9: null, slope9: null},
    ],
  },
  {
    id: 'de-hoek', dataVersion: 2, name: 'Sallandsche Golfclub De Hoek (Diepenveen)', holeCount: 18, parTotal: 72, pars: [4, 4, 4, 5, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 3], si: [7, 5, 17, 3, 13, 11, 9, 1, 15, 4, 16, 12, 10, 18, 2, 14, 6, 8], confirmed: false, fromSources: true, location: {lat: 52.297, lon: 6.163}, website: 'https://sallandsche.nl/',
    tees: [
      {id: 'hoek-wit', name: 'Wit (heren)', gender: 'h', rating: 72.4, slope: 131, rating9: null, slope9: null, lengths: [361, 421, 270, 502, 150, 364, 441, 343, 130, 396, 454, 339, 347, 177, 380, 460, 324, 196]},
      {id: 'hoek-geel', name: 'Geel (heren)', gender: 'h', rating: 71.5, slope: 128, rating9: null, slope9: null, lengths: [341, 395, 265, 490, 145, 342, 441, 338, 130, 379, 454, 331, 327, 162, 375, 460, 319, 192]},
      {id: 'hoek-blauw', name: 'Blauw (heren)', gender: 'h', rating: 68.5, slope: 118, rating9: null, slope9: null},
      {id: 'hoek-rood', name: 'Rood (heren)', gender: 'h', rating: 67.4, slope: 115, rating9: null, slope9: null},
      {id: 'hoek-geel-d', name: 'Geel (dames)', gender: 'd', rating: 77.4, slope: 140, rating9: null, slope9: null, lengths: [341, 395, 265, 490, 145, 342, 441, 338, 130, 379, 454, 331, 327, 162, 375, 460, 319, 192]},
    ],
  },
  {
    id: 'martensplek', dataVersion: 2, name: 'Golfclub Martensplek (Tiendeveen)', holeCount: 18, parTotal: 72, pars: [5, 4, 4, 4, 4, 3, 4, 3, 5, 5, 3, 4, 4, 4, 4, 4, 5, 3], si: [14, 8, 6, 4, 10, 18, 2, 16, 12, 1, 17, 7, 3, 11, 15, 5, 9, 13], confirmed: false, fromSources: true, location: {lat: 52.725, lon: 6.535}, website: null,
    tees: [
      {id: 'martensplek-wit', name: 'Wit (heren)', gender: 'h', rating: 72, slope: 113, rating9: null, slope9: null, ratingUnknown: true},
      {id: 'martensplek-rood', name: 'Rood (dames)', gender: 'd', rating: 72, slope: 113, rating9: null, slope9: null, ratingUnknown: true},
    ],
  },
  {
    id: 'gelpenberg', dataVersion: 2, name: 'Drentse Golfclub De Gelpenberg (Aalden)', holeCount: 18, parTotal: 72, pars: [5, 3, 4, 5, 4, 4, 4, 3, 4, 4, 4, 3, 5, 4, 4, 5, 3, 4], si: [6, 8, 14, 12, 4, 18, 2, 16, 10, 13, 1, 17, 9, 3, 7, 11, 15, 5], confirmed: false, fromSources: true, location: {lat: 52.785, lon: 6.736}, website: 'https://www.dgcdegelpenberg.nl/',
    tees: [
      {id: 'gelpenberg-geel', name: 'Geel (heren)', gender: 'h', rating: 71.6, slope: 128, rating9: null, slope9: null},
      {id: 'gelpenberg-rood', name: 'Rood (dames)', gender: 'd', rating: 72.5, slope: 124, rating9: null, slope9: null},
    ],
  },
  {
    id: 'twentsche', dataVersion: 2, name: 'Twentsche Golfclub (Ambt Delden)', holeCount: 18, parTotal: 72, pars: [4, 4, 3, 4, 5, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 4, 5], si: [5, 17, 13, 3, 11, 15, 7, 9, 1, 6, 14, 10, 4, 2, 16, 8, 18, 12], confirmed: false, fromSources: true, location: {lat: 52.272, lon: 6.712}, website: 'https://twentschegolfclub.nl/',
    tees: [
      {id: 'twentsche-blauw', name: 'Blauw (heren)', gender: 'h', rating: 72, slope: 113, rating9: null, slope9: null, lengths: [322, 244, 125, 310, 430, 134, 438, 316, 344, 354, 143, 395, 327, 339, 119, 299, 244, 386], ratingUnknown: true},
      {id: 'twentsche-geel', name: 'Geel (heren)', gender: 'h', rating: 72, slope: 113, rating9: null, slope9: null, ratingUnknown: true},
      {id: 'twentsche-rood', name: 'Rood (dames)', gender: 'd', rating: 72, slope: 113, rating9: null, slope9: null, ratingUnknown: true},
    ],
  },
];

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

// 18-holes baan waarvan we alleen de totale par en de tee-ratings kennen.
function standardCourse(id, name, parTotal, tees, holeCount = 18) {
  return {
    id,
    name,
    holeCount,
    parTotal,
    pars: Array(holeCount).fill(4),
    si: Array.from({ length: holeCount }, (_, i) => i + 1),
    confirmed: false,
    tees: tees.map(([teeId, teeName, gender, rating, slope]) => ({ id: teeId, name: teeName, gender, rating, slope, rating9: null, slope9: null })),
  };
}

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
    players: [{ name: 'Rudy', index: null, tee: 'geel' }, { name: 'Peter', index: null, tee: 'geel' }],
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
  const tee = teeAt(gps.pos, course().geo, roundHoles());
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
  const points = course().geo?.[h] ?? {};
  if (gps.suggest === h) gps.suggest = null;
  if (gps.error) { el.innerHTML = `<p class="gps-msg">${esc(gps.error)}</p>`; return; }
  if (!gps.pos) { el.innerHTML = '<p class="gps-msg">GPS zoekt je positie…</p>'; return; }
  const dist = toGreen(gps.pos, course().geo, h);
  el.innerHTML = `
    ${dist != null
      ? `<p class="gps-dist"><span class="gps-num">${dist}</span> m <span class="muted">tot de green</span></p>`
      : '<p class="gps-msg">Leg de green van deze hole vast om de afstand te zien.</p>'}
    <p class="muted small gps-acc">GPS ±${Math.round(gps.pos.accuracy)} m</p>
    ${gps.suggest ? `<button class="link" data-action="gps-go" data-hole="${gps.suggest}">Je staat op de tee van hole ${gps.suggest}: ga naar hole ${gps.suggest}</button>` : ''}
    ${points.tee && points.green && !gps.editing
      ? '<button class="link small" data-action="gps-edit">Tee of green opnieuw vastleggen</button>'
      : `<div class="gps-actions">
      <button class="chip-btn" data-action="gps-mark" data-point="tee">${points.tee ? 'Tee opnieuw vastleggen' : 'Ik sta op de tee'}</button>
      <button class="chip-btn" data-action="gps-mark" data-point="green">${points.green ? 'Green opnieuw vastleggen' : 'Ik sta op de green'}</button>
    </div>`}`;
}

function markPoint(point) {
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
  const p = geoProgress(course().geo, roundHoles());
  el.innerHTML = `
    <label class="check"><input type="checkbox" id="gps-on" ${gpsOn() ? 'checked' : ''}> GPS gebruiken tijdens de ronde</label>
    <label class="check"><input type="checkbox" id="gps-auto" ${gpsAuto() ? 'checked' : ''} ${gpsOn() ? '' : 'disabled'}> Automatisch naar de hole van de tee waar je staat</label>
    <p class="small">Vastgelegd voor ${esc(course().name)}: <b>${p.tees}</b> van ${p.total} tees, <b>${p.greens}</b> van ${p.total} greens.</p>
    <p class="small muted">Leg tijdens een ronde per hole één keer de tee en het midden van de green vast (knoppen bij het holenummer). Daarna ziet de app de afstand tot de green en op welke tee je staat. Je locatie blijft op je telefoon; alleen deze punten worden bij de baan bewaard. GPS werkt alleen met de app open en kost wat extra batterij.</p>
    ${p.tees + p.greens ? '<button class="link small danger" data-action="gps-clear">GPS-punten van deze baan wissen</button>' : ''}`;
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
const cloud = { api: null, user: null, status: '', error: null, busy: false, again: false, timer: null };

async function cloudApi() {
  if (!cloudConfigured) return null;
  cloud.api ??= await import('./cloud.js');
  return cloud.api;
}

function scheduleSync(delay = 4000) {
  if (!cloud.user) return;
  clearTimeout(cloud.timer);
  cloud.timer = setTimeout(syncNow, delay);
}

async function syncNow() {
  const api = await cloudApi();
  if (!api || !cloud.user || !navigator.onLine) return;
  if (cloud.busy) { cloud.again = true; return; }
  cloud.busy = true;
  try {
    const remote = await api.fetchState(cloud.user.id);
    const action = decideSync({ ...state.sync, remoteUpdatedAt: remote?.updated_at ?? null });
    if (action === 'pull') {
      state = migrate(fromCloud(remote.data, state));
      state.sync.syncedAt = remote.updated_at;
    } else if (action === 'push' || action === 'merge') {
      if (action === 'merge') state = mergeStates(state, migrate(fromCloud(remote.data, state)));
      state.sync.syncedAt = await api.pushState(cloud.user.id, toCloud(state));
      state.sync.localChangedAt = state.sync.syncedAt;
    }
    uploadSamples();
    flushEvents();
    cloud.status = `Gesynchroniseerd om ${new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
    save({ fromCloud: true });
  } catch (err) {
    const e = api.describeCloudError(err);
    cloud.status = `${e.title}: synchroniseren lukte niet, de app probeert het later opnieuw.`;
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
  window.addEventListener('online', () => syncNow());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(); });
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

function startButtons(c) {
  // De par 3-baan heeft 9 holes; 18 holes is twee keer rond.
  const options = c.holeCount === 9 ? [['front', 'Hole 1', '9 holes']]
    : c.id === 'par3' ? [['front', '9 holes', 'één keer rond'], ['all', '18 holes', 'twee keer rond']]
    : START_OPTIONS_18;
  return `<div class="start-grid">${options.map(([choice, first, len]) => `<button data-action="start-round" data-course="${esc(c.id)}" data-holes="${choice}">
    <b>${first}</b><span>${len}</span></button>`).join('')}</div>`;
}

function showCoursePicker() {
  const home = state.courses.find((c) => c.id === state.homeCourseId) ?? state.courses[0];
  // Thuisclub bovenaan: de thuisbaan en de banen die erbij horen (zoals de par 3-baan).
  const club = state.courses.filter((c) => c === home || (home.id === 'hooge-graven' && c.id === 'par3'));
  const others = state.courses.filter((c) => !club.includes(c));
  showSheet(`<h2>Waar speel je vandaag?</h2>
    ${club.map((c) => `<h3 class="start-course">${c === home ? '★ ' : ''}${esc(c.name)}</h3>${startButtons(c)}`).join('')}
    ${others.length ? `<details class="start-others"><summary>Andere baan</summary>
      ${others.map((c) => `<h3 class="start-course">${esc(c.name)}</h3>${startButtons(c)}`).join('')}</details>` : ''}`, 'Baan kiezen');
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
  return c.tees.find((t) => t.gender === main?.gender) ?? c.tees[0];
}

function courseForPlayer(player) {
  const holes = roundHoles();
  const c = course();
  const tee = teeFor(player, c);
  // Op een 18-holes baan zijn de 9-holes waarden standaard de helft van de rating.
  const half = holes.length === 9 && c.holeCount === 18;
  return {
    name: c.name,
    holes: holes.length,
    pars: holes.map(parOf),
    strokeIndexes: holes.map((h) => c.si[h - 1]),
    rating: half ? (tee.rating9 ?? round1(tee.rating / 2)) : tee.rating,
    slope: half ? (tee.slope9 ?? tee.slope) : tee.slope,
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
    case 'start-round': startRound(btn.dataset.course, btn.dataset.holes); break;
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
  cloudAction(form.dataset.form, e.submitter);
});

render();
startPrompt();
initCloud();
if (gpsOn()) startGps();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
