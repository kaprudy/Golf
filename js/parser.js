// Herkent ingesproken of getypte tekst zoals:
//   "Hole 4, Rudy 5 slagen, Peter 3 slagen"
//   "Rudy vijf en Peter drie op de vierde hole"
//   "Rudy par, Peter bogey"
// Spraakherkenning maakt van "hole" vaak "hol", "hal" of plakt het vast aan het getal
// ("holdrie"); daar houdt de parser rekening mee. Werkt zonder internet; AI (ai.js) is
// een vangnet voor zinnen die hier niet zeker herkend worden.

const NUMBER_WORDS = {
  nul: 0, een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7,
  acht: 8, negen: 9, tien: 10, elf: 11, twaalf: 12, dertien: 13, veertien: 14,
  vijftien: 15, zestien: 16, zeventien: 17, achttien: 18,
  // Zo schrijft spraakherkenning getallen soms op.
  twe: 2, dri: 3, drij: 3, vir: 4, fier: 4, veer: 4, fijf: 5, vijv: 5, fijv: 5, ses: 6, zess: 6,
  zeve: 7, seven: 7, ach: 8, agt: 8, achd: 8, nege: 9, neegen: 9, ellf: 11,
};

const ORDINAL_WORDS = {
  eerste: 1, tweede: 2, derde: 3, vierde: 4, vijfde: 5, zesde: 6, zevende: 7,
  achtste: 8, negende: 9, tiende: 10, elfde: 11, twaalfde: 12, dertiende: 13,
  veertiende: 14, vijftiende: 15, zestiende: 16, zeventiende: 17, achttiende: 18,
};

// Golftermen als verschil ten opzichte van par.
const TERMS = {
  albatros: -3, albatross: -3, eagle: -2, birdie: -1, berdie: -1, burdie: -1, par: 0,
  bogey: 1, bogie: 1, bogy: 1, bogi: 1, boogie: 1,
};
const TERM_PREFIX = { dubbel: 1, dubbele: 1, double: 1, triple: 2, tripel: 2, driedubbele: 2 };

// Zo verstaat spraakherkenning het woord "hole" regelmatig.
const HOLE_WORDS = new Set([
  'hole', 'holes', 'hool', 'hol', 'holl', 'hoel', 'hoal', 'hal', 'hall', 'hold', 'holt',
  'whole', 'hoolt', 'holle',
]);
const HOLE_PREFIXES = [...HOLE_WORDS].sort((a, b) => b.length - a.length);

const FILLER = new Set([
  'heeft', 'had', 'deed', 'doet', 'speelde', 'scoorde', 'met', 'in', 'is', 'was', 'slagen',
  'slag', 'slagjes', 'en', 'de', 'het', 'op', 'voor', 'van', 'nummer', 'score', 'gescoord',
  'gemaakt', 'maakte', 'totaal', 'dan', 'ook', 'nog', 'toen', 'ik', 'wij', 'we', 'zij', 'hij',
  'die', 'daar', 'hier', 'ok', 'oke', 'dus', 'eh', 'uh', 'um', 'zo', 'erin', 'gehaald', 'er',
  'a', 'the', 'and', 'en', 'hole', 'stuks',
]);
const NOT_A_NAME = new Set([...FILLER, ...HOLE_WORDS, ...Object.keys(TERMS),
  ...Object.keys(TERM_PREFIX), ...Object.keys(NUMBER_WORDS), ...Object.keys(ORDINAL_WORDS),
  'one', 'putts', 'putt', 'volgende', 'vorige', 'laatste', 'over', 'onder']);

const isNumberish = (s) => /^\d+e?$/.test(s) || s in NUMBER_WORDS || s in ORDINAL_WORDS;

// "holdrie" -> ["hol", "drie"], "hole4" -> ["hole", "4"]
function splitGlued(tok) {
  if (HOLE_WORDS.has(tok)) return [tok];
  for (const p of HOLE_PREFIXES) {
    if (tok.startsWith(p) && isNumberish(tok.slice(p.length))) return [p, tok.slice(p.length)];
  }
  return [tok];
}

export function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/(\d+)\s*(e|de|ste)\b/g, '$1e') // "4 de" -> "4e"
    .replace(/(\d+)([a-z])/g, '$1 $2') // "5slagen" -> "5 slagen"
    .replace(/([a-z])(\d)/g, '$1 $2') // "rudi5" -> "rudi 5"
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .flatMap(splitGlued);
}

function toNumber(tok) {
  if (tok == null) return null;
  if (/^\d+$/.test(tok)) return Number(tok);
  if (tok in NUMBER_WORDS) return NUMBER_WORDS[tok];
  return null;
}

function toOrdinal(tok) {
  if (tok == null) return null;
  const m = tok.match(/^(\d+)e$/);
  if (m) return Number(m[1]);
  return ORDINAL_WORDS[tok] ?? null;
}

export const simplify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

// Kleine Levenshtein-afstand, zodat "Rudi" of "Pieter" nog bij "Rudy"/"Peter" past.
function distance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

// Nederlandse klank: "Roedie", "Ruddy" en "Rudi" klinken allemaal als "rudi".
export function phonetic(s) {
  return simplify(s)
    .replace(/ph/g, 'f').replace(/ch/g, 'g').replace(/c(?=[eiy])/g, 's').replace(/[cq]/g, 'k')
    .replace(/x/g, 'ks').replace(/z/g, 's').replace(/v/g, 'f').replace(/w/g, 'v')
    .replace(/ij|y/g, 'i').replace(/ei/g, 'i').replace(/ie/g, 'i').replace(/oe/g, 'u').replace(/ou|au/g, 'au')
    .replace(/(.)h/g, '$1')
    .replace(/(.)\1+/g, '$1')
    .replace(/d$/, 't');
}

/**
 * Zoekt welke speler bedoeld wordt met een (verkeerd verstaan) woord.
 * aliases: { "roede": "Rudy" } — woorden die de gebruiker eerder aan een speler koppelde.
 */
export function matchPlayer(token, players, aliases = {}) {
  const t = simplify(token);
  if (t.length < 2 || HOLE_WORDS.has(t)) return null;
  if (aliases[t] && players.includes(aliases[t])) return aliases[t];
  const exact = players.find((name) => simplify(name) === t || simplify(name.split(/\s+/)[0]) === t);
  if (exact) return exact;
  // Getallen, golftermen en vulwoorden zijn nooit een (verhaspelde) naam.
  if (NOT_A_NAME.has(t)) return null;
  const tp = phonetic(t);
  let best = null;
  for (const name of players) {
    const n = simplify(name);
    const first = simplify(name.split(/\s+/)[0]);
    if (t === n || t === first) return name;
    const fp = phonetic(first);
    if (tp === fp || tp === phonetic(n)) return name;
    const d = Math.min(distance(t, first), distance(t, n), distance(tp, fp) + 0.5);
    const allowed = first.length >= 5 ? 2 : first.length >= 3 ? 1 : 0;
    if (d <= allowed && (!best || d < best.d)) best = { name, d };
  }
  return best?.name ?? null;
}

// Probeer vanaf positie i een score te lezen (getal of golfterm). Geeft {value, kind, next}.
function readScore(tokens, i) {
  let j = i;
  let skipped = 0;
  while (j < tokens.length && skipped <= 3) {
    const tok = tokens[j];
    // "een birdie" -> lidwoord overslaan
    if (tok === 'een' && tokens[j + 1] && (tokens[j + 1] in TERMS || tokens[j + 1] in TERM_PREFIX)) {
      j++; continue;
    }
    if (HOLE_WORDS.has(tok) && tokens[j + 1] === 'in' && tokens[j + 2] === 'one') {
      return { value: 1, kind: 'strokes', next: j + 3 };
    }
    if (tok in TERM_PREFIX && tokens[j + 1] && /^bog|^boog/.test(tokens[j + 1])) {
      return { value: 1 + TERM_PREFIX[tok], kind: 'term', next: j + 2 };
    }
    if (tok in TERMS) return { value: TERMS[tok], kind: 'term', next: j + 1 };
    const n = toNumber(tok);
    if (n != null) {
      // "Rudy 2 over par" / "1 onder par"
      if (tokens[j + 1] === 'over' && tokens[j + 2] === 'par') return { value: n, kind: 'term', next: j + 3 };
      if (tokens[j + 1] === 'onder' && tokens[j + 2] === 'par') return { value: -n, kind: 'term', next: j + 3 };
      return { value: n, kind: 'strokes', next: j + 1 };
    }
    if (!FILLER.has(tok)) return null;
    j++; skipped++;
  }
  return null;
}

// Zoekt het holenummer en haalt die woorden uit de tokens.
function extractHole(tokens) {
  let holeWordWithoutNumber = false;
  for (let i = 0; i < tokens.length; i++) {
    if (!HOLE_WORDS.has(tokens[i])) continue;
    if (tokens[i + 1] === 'in' && tokens[i + 2] === 'one') continue;
    let k = i + 1;
    if (tokens[k] === 'nummer') k++;
    const n = toNumber(tokens[k]) ?? toOrdinal(tokens[k]);
    if (n != null && n >= 1 && n <= 18) {
      return { hole: n, holeWordWithoutNumber: false, tokens: [...tokens.slice(0, i), ...tokens.slice(k + 1)] };
    }
    const prev = toOrdinal(tokens[i - 1]);
    if (prev != null && prev >= 1 && prev <= 18) {
      return { hole: prev, holeWordWithoutNumber: false, tokens: [...tokens.slice(0, i - 1), ...tokens.slice(i + 1)] };
    }
    holeWordWithoutNumber = true;
  }
  return { hole: null, holeWordWithoutNumber, tokens };
}

/**
 * @param {string} text           ingesproken/getypte tekst
 * @param {object} opts
 * @param {string[]} opts.players bekende spelers
 * @param {Object<string,string>} opts.aliases eerder geleerde woorden -> spelersnaam
 * @param {number} opts.currentHole hole die geldt als er geen hole genoemd wordt
 * @param {(hole:number)=>number} opts.parForHole par van een hole (voor "birdie" e.d.)
 * @returns {{
 *   hole:number, holeMentioned:boolean,
 *   scores:{name:string, strokes:number}[],        // bekende spelers
 *   bareScore:number|null,                         // score zonder naam (meerdere spelers)
 *   unknownNames:{name:string, strokes:number}[],  // onbekende naam + score: eerst bevestigen
 *   leftovers:string[],                            // woorden die niet begrepen zijn
 *   certain:boolean                                // veilig om direct op te slaan
 * }}
 */
export function parseEntry(text, { players = [], aliases = {}, currentHole = 1, parForHole = () => 4 } = {}) {
  const { hole: mentioned, holeWordWithoutNumber, tokens } = extractHole(normalize(text));
  const hole = mentioned ?? currentHole;
  const par = parForHole(hole);
  const scores = new Map();
  const unknown = new Map();
  const used = new Set();
  const toStrokes = (s) => (s.kind === 'term' ? par + s.value : s.value);
  const valid = (n) => n >= 1 && n <= 20;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const known = matchPlayer(tok, players, aliases);
    const candidate = known ?? (!NOT_A_NAME.has(tok) && /^[a-z]{2,}$/.test(tok) ? tok : null);
    if (!candidate) continue;

    // Patroon 1: "naam ... score"
    const s = readScore(tokens, i + 1);
    if (s && valid(toStrokes(s))) {
      if (known) scores.set(known, { name: known, strokes: toStrokes(s) });
      else {
        const name = candidate[0].toUpperCase() + candidate.slice(1);
        unknown.set(name, { name, strokes: toStrokes(s) });
      }
      for (let k = i; k < s.next; k++) used.add(k);
      i = s.next - 1;
      continue;
    }
    // Patroon 2: "5 slagen voor Rudy" (alleen bekende spelers)
    if (known && tokens[i - 1] === 'voor') {
      let k = i - 2;
      while (k >= 0 && (tokens[k] === 'slagen' || tokens[k] === 'slag')) k--;
      const back = k >= 0 ? readScore(tokens, k) : null;
      if (back && !scores.has(known) && valid(toStrokes(back))) {
        scores.set(known, { name: known, strokes: toStrokes(back) });
        for (let m = k; m <= i; m++) used.add(m);
      }
    }
  }

  // Geen naam genoemd ("hol 1, 5 slagen"): losse score. Bij één speler is die van hem/haar.
  let bareScore = null;
  if (!scores.size && !unknown.size) {
    for (let i = 0; i < tokens.length; i++) {
      const s = (toNumber(tokens[i]) != null || tokens[i] in TERMS || tokens[i] in TERM_PREFIX || tokens[i] === 'een')
        ? readScore(tokens, i) : null;
      if (s && valid(toStrokes(s))) {
        bareScore = toStrokes(s);
        for (let k = i; k < s.next; k++) used.add(k);
        break;
      }
    }
    if (bareScore != null && players.length === 1) {
      scores.set(players[0], { name: players[0], strokes: bareScore });
      bareScore = null;
    }
  }

  const leftovers = tokens.filter((t, i) => !used.has(i) && !FILLER.has(t));
  const certain = scores.size > 0 && unknown.size === 0 && leftovers.length === 0 && !holeWordWithoutNumber;

  return {
    hole,
    holeMentioned: mentioned != null,
    scores: [...scores.values()],
    bareScore, // score zonder naam terwijl er meerdere spelers zijn: vragen voor wie
    unknownNames: [...unknown.values()],
    leftovers,
    certain,
  };
}

// Kiest uit meerdere spraakalternatieven de best herkende zin.
export function pickBest(texts, opts) {
  let best = null;
  for (const text of texts) {
    const r = parseEntry(text, opts);
    const score = r.scores.length * 10 + (r.bareScore != null ? 4 : 0) + (r.holeMentioned ? 3 : 0) + (r.certain ? 5 : 0)
      - r.unknownNames.length * 6 - r.leftovers.length * 2;
    if (!best || score > best.score) best = { text, result: r, score };
  }
  return best;
}
