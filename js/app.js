import { pickBest, matchPlayer, simplify } from './parser.js';
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
  // Banen in de buurt (ratings volgens 1golf.eu; par per hole nog invullen).
  standardCourse('zwolle', 'Golfclub Zwolle', 72, [
    ['zwolle-geel', 'Geel (heren)', 'h', 71.4, 131],
    ['zwolle-rood', 'Rood (dames)', 'd', 72.8, 129],
  ]),
  standardCourse('de-koepel', 'Golfclub De Koepel (Wierden)', 70, [
    ['koepel-geel', 'Geel (heren)', 'h', 69.5, 126],
    ['koepel-rood', 'Rood (dames)', 'd', 70.3, 122],
  ]),
  standardCourse('de-hoek', 'Sallandsche Golfclub De Hoek (Diepenveen)', 72, [
    ['hoek-wit', 'Wit (heren)', 'h', 72.4, 131],
    ['hoek-geel', 'Geel (heren)', 'h', 71.5, 128],
    ['hoek-blauw', 'Blauw (heren)', 'h', 68.5, 118],
    ['hoek-rood', 'Rood (heren)', 'h', 67.4, 115],
    ['hoek-geel-d', 'Geel (dames)', 'd', 77.4, 140],
  ]),
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
  return { id: Date.now(), date: new Date().toISOString(), courseId, holesChoice, currentHole: holesChoice === 'back' ? 10 : 1, scores: {}, log: [] };
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
    round: newRound('front', 'hooge-graven'),
    history: [],
    apiKey: '',
  };
}

let state = load();
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

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
  return Array.from({ length: 9 }, (_, i) => i + 1);
}

const parOf = (hole) => course().pars[hole - 1];
const scoreOf = (name, hole) => state.round.scores[name]?.[hole] ?? null;

function setScore(name, hole, strokes) {
  state.round.scores[name] ??= {};
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
  if (nothing) {
    showFeedback(`<div class="feedback error">Niet begrepen: “${esc(text)}”.<br>Probeer: “Hole 3, Rudy 5, Peter 4”${state.players.length === 1 ? ' of “Hole 3, 5 slagen”' : ''}.${aiNote}</div>`);
    return;
  }
  if (!roundHoles().includes(result.hole)) {
    showFeedback(`<div class="feedback error">Hole ${result.hole} hoort niet bij deze ronde (“${esc(text)}”). Pas de holes aan bij Instellingen.</div>`);
    return;
  }

  // Bekende spelers direct opslaan.
  const previous = result.scores.map((s) => ({ name: s.name, value: scoreOf(s.name, result.hole) }));
  for (const s of result.scores) setScore(s.name, result.hole, s.strokes);
  state.round.log.unshift({ time: new Date().toISOString(), hole: result.hole, text, viaAi, scores: result.scores.map(({ name, strokes }) => ({ name, strokes })) });
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

const holeComplete = (hole) => state.players.length > 0 && state.players.every((p) => scoreOf(p.name, hole) != null);

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
  $('#course-label').textContent = course().holeCount === 9 ? course().name : `${course().name} · ${holes.length === 9 ? (holes[0] === 1 ? 'holes 1–9' : 'holes 10–18') : '18 holes'}`;
  $('#hole-number').textContent = h;
  $('#hole-number-2').textContent = h;
  const tee = teeFor(state.players[0] ?? { tee: 'geel' });
  const len = tee.lengths?.[h - 1];
  $('#hole-meta').textContent = `Par ${parOf(h)} · SI ${course().si[h - 1]}${len ? ` · ${len} m (${tee.name.split(' ')[0].toLowerCase()})` : ''}`;
  $('#map-btn').hidden = !mapForHole(h);
  const next = inputHole();
  $('#next-hint').innerHTML = next !== h
    ? `Hole ${h} is compleet. Zonder holenummer gaat je volgende invoer naar <b>hole ${next}</b>.`
    : '';
  renderQuickEntry();
  renderLog();
  renderScorecard();
  renderAnalysis();
  renderSettings();
}

function renderQuickEntry() {
  const h = state.round.currentHole;
  $('#quick-entry').innerHTML = state.players.map((p, i) => {
    const s = scoreOf(p.name, h);
    const diff = s == null ? '' : `<span class="diff d${Math.max(-2, Math.min(3, s - parOf(h)))}">${signed(s - parOf(h))}</span>`;
    return `<div class="qe-row">
      <span class="qe-name">${esc(p.name)}${s == null ? '' : `<br>${termTag(s, parOf(h))}`}</span>
      <button data-action="minus" data-i="${i}" aria-label="Min">−</button>
      <span class="qe-score">${s ?? '·'}</span>
      <button data-action="plus" data-i="${i}" aria-label="Plus">+</button>
      ${diff}
    </div>`;
  }).join('') || '<p class="muted">Voeg spelers toe bij Instellingen, of noem gewoon een naam.</p>';
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
    `<div class="feedback info">⚠️ Vul de <b>${nineHoleCourse ? 'stroke index' : 'par en stroke index'} per hole</b> in zoals op de scorekaart van de club${nineHoleCourse ? '' : ' (nu staat alles op par 4)'}. <button class="link" data-action="confirm-course">Klopt, verberg</button></div>`);
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

function saveRound() {
  const results = computeResults();
  if (!results.length) { toast('Nog geen scores om op te slaan.'); return; }
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
  save();
  render();
  toast('Ronde opgeslagen. Start een nieuwe ronde via Instellingen.');
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
  const holes = roundHoles();
  const idx = holes.indexOf(state.round.currentHole);
  switch (btn.dataset.action) {
    case 'mic': toggleMic(); break;
    case 'prev-hole': state.round.currentHole = holes[(idx - 1 + holes.length) % holes.length]; save(); render(); break;
    case 'next-hole': state.round.currentHole = holes[(idx + 1) % holes.length]; save(); render(); break;
    case 'plus':
    case 'minus': {
      const p = state.players[Number(btn.dataset.i)];
      const h = state.round.currentHole;
      const cur = scoreOf(p.name, h);
      const next = cur == null ? parOf(h) : cur + (btn.dataset.action === 'plus' ? 1 : -1);
      setScore(p.name, h, next < 1 ? null : Math.min(20, next));
      save(); render();
      break;
    }
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
        state.round = newRound($('#round-holes').value, $('#round-course').value);
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

render();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
