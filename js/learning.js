// Leren van ingesproken tekst (alleen als de gebruiker toestemming gaf).
// Per ingesproken zin bewaren we wat er verstaan werd en, na de ronde, welke score er uiteindelijk
// op de kaart stond (dus inclusief je eigen verbeteringen). Namen gaan nooit mee: spelers worden
// s1, s2, ... en andere woorden met een hoofdletter (waarschijnlijk namen) worden x.
import { matchPlayer, isVocabWord } from './parser.js';

const QUEUE_KEY = 'golfscore-samples';
const MAX_QUEUE = 500;

// "Hole 4, Rudy fijf en Peter 3" -> { text: "hole 4 s1 fijf en s2 3", ids: { Rudy: 's1', Peter: 's2' } }
export function anonymize(text, players, aliases = {}) {
  const ids = {};
  const words = String(text).replace(/([^\s\p{L}\p{N}])/gu, ' ').split(/\s+/).filter(Boolean);
  const out = words.map((word) => {
    const lower = word.toLowerCase();
    const player = matchPlayer(lower, players, aliases);
    if (player) return (ids[player] = `s${players.indexOf(player) + 1}`);
    if (/^\p{Lu}/u.test(word) && !isVocabWord(lower)) return 'x';
    return lower;
  });
  return { text: out.join(' '), ids };
}

// Eén ingesproken invoer, nog zonder eindscore.
export function recordEntry({ roundId, hole, par, texts, scores, viaAi, players, aliases }) {
  const anon = texts.slice(0, 5).map((t) => anonymize(t, players, aliases));
  const names = {};
  for (const a of anon) Object.assign(names, a.ids);
  if (players.length === 1) names[players[0]] = 's1'; // alleen: "hole 4, 5 slagen" zonder naam
  const parsed = {};
  for (const s of scores) {
    const id = `s${players.indexOf(s.name) + 1}`;
    if (id !== 's0') { parsed[id] = s.strokes; names[s.name] = id; }
  }
  // names (echte naam -> sX) blijft op de telefoon; alleen nodig om straks de eindscore te vinden.
  return { roundId, hole, par, texts: anon.map((a) => a.text), parsed, ai: Boolean(viaAi), names };
}

// Na de ronde: de score die uiteindelijk op de kaart staat erbij, klaar om te versturen.
export function finalizeEntry(entry, scoreOf) {
  const final = {};
  for (const [name, id] of Object.entries(entry.names)) {
    const v = scoreOf(name, entry.hole);
    if (v != null) final[id] = v;
  }
  return { v: 1, hole: entry.hole, par: entry.par, texts: entry.texts, parsed: entry.parsed, final, ai: entry.ai };
}

// ---------- Wachtrij op de telefoon ----------

export function loadQueue(storage = globalThis.localStorage) {
  try {
    const q = JSON.parse(storage.getItem(QUEUE_KEY));
    return { open: Array.isArray(q?.open) ? q.open : [], ready: Array.isArray(q?.ready) ? q.ready : [] };
  } catch {
    return { open: [], ready: [] };
  }
}

export function saveQueue(queue, storage = globalThis.localStorage) {
  try {
    storage.setItem(QUEUE_KEY, JSON.stringify({ open: queue.open.slice(-MAX_QUEUE), ready: queue.ready.slice(-MAX_QUEUE) }));
  } catch { /* vol of geen opslag: dan leren we deze keer niet */ }
}

// Zet de open invoer van deze ronde klaar met de eindscores. Invoer van oude rondes vervalt.
export function finalizeRound(queue, roundId, scoreOf) {
  const ready = queue.open.filter((e) => e.roundId === roundId).map((e) => finalizeEntry(e, scoreOf))
    .filter((s) => Object.keys(s.final).length);
  return { open: [], ready: [...queue.ready, ...ready] };
}
