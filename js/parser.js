// Herkent ingesproken of getypte tekst zoals:
//   "Hole 4, Rudy 5 slagen, Peter 3 slagen"
//   "Rudy vijf en Peter drie op de vierde hole"
//   "Rudy par, Peter bogey"
// Werkt zonder internet; AI (ai.js) is alleen een vangnet.

const NUMBER_WORDS = {
  nul: 0, een: 1, eén: 1, één: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7,
  acht: 8, negen: 9, tien: 10, elf: 11, twaalf: 12, dertien: 13, veertien: 14,
  vijftien: 15, zestien: 16, zeventien: 17, achttien: 18,
};

const ORDINAL_WORDS = {
  eerste: 1, tweede: 2, derde: 3, vierde: 4, vijfde: 5, zesde: 6, zevende: 7,
  achtste: 8, negende: 9, tiende: 10, elfde: 11, twaalfde: 12, dertiende: 13,
  veertiende: 14, vijftiende: 15, zestiende: 16, zeventiende: 17, achttiende: 18,
};

// Golftermen als verschil ten opzichte van par.
const TERMS = {
  albatros: -3, albatross: -3, eagle: -2, birdie: -1, berdie: -1, par: 0,
  bogey: 1, bogie: 1, bogy: 1,
};
const TERM_PREFIX = { dubbel: 1, dubbele: 1, double: 1, triple: 2, tripel: 2, driedubbele: 2 };

const HOLE_WORDS = new Set(['hole', 'holes', 'hool', 'hol', 'hoel', 'holl']);
const FILLER = new Set([
  'heeft', 'had', 'deed', 'doet', 'speelde', 'scoorde', 'met', 'in', 'is', 'was', 'slagen',
  'slag', 'slagjes', 'en', 'de', 'het', 'op', 'voor', 'van', 'nummer', 'score', 'gescoord',
  'gemaakt', 'maakte', 'totaal', 'dan', 'ook', 'nog', 'toen', 'ik', 'wij', 'we', 'zij', 'hij',
  'die', 'daar', 'hier', 'ok', 'oke', 'oké', 'dus', 'eh', 'uh', 'um', 'zo', 'erin', 'gehaald',
]);
const NOT_A_NAME = new Set([...FILLER, ...HOLE_WORDS, ...Object.keys(TERMS),
  ...Object.keys(TERM_PREFIX), ...Object.keys(NUMBER_WORDS), ...Object.keys(ORDINAL_WORDS),
  'in', 'one', 'putts', 'putt', 'par3', 'par4', 'par5', 'volgende', 'vorige', 'laatste']);

export function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/(\d+)\s*(e|de|ste)\b/g, '$1e') // "4 de" -> "4e"
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function toNumber(tok) {
  if (/^\d+$/.test(tok)) return Number(tok);
  if (tok in NUMBER_WORDS) return NUMBER_WORDS[tok];
  return null;
}

function toOrdinal(tok) {
  const m = tok.match(/^(\d+)e$/);
  if (m) return Number(m[1]);
  return ORDINAL_WORDS[tok] ?? null;
}

const simplify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

// Kleine Levenshtein-afstand, zodat "ruddy" of "pieter" nog bij "Rudy"/"Peter" past.
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

export function matchPlayer(token, players) {
  const t = simplify(token);
  if (t.length < 2) return null;
  let best = null;
  for (const name of players) {
    const n = simplify(name);
    const first = simplify(name.split(/\s+/)[0]);
    if (t === n || t === first) return name;
    const d = Math.min(distance(t, first), distance(t, n));
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
    if (tok === 'hole' && tokens[j + 1] === 'in' && tokens[j + 2] === 'one') {
      return { value: 1, kind: 'strokes', next: j + 3 };
    }
    if (tok in TERM_PREFIX && tokens[j + 1] && /^bog/.test(tokens[j + 1])) {
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
  for (let i = 0; i < tokens.length; i++) {
    if (HOLE_WORDS.has(tokens[i])) {
      if (tokens[i + 1] === 'in' && tokens[i + 2] === 'one') continue;
      let k = i + 1;
      if (tokens[k] === 'nummer') k++;
      const n = toNumber(tokens[k]) ?? toOrdinal(tokens[k] ?? '');
      if (n != null && n >= 1 && n <= 18) {
        return { hole: n, tokens: [...tokens.slice(0, i), ...tokens.slice(k + 1)] };
      }
      const prev = toOrdinal(tokens[i - 1] ?? '') ?? (tokens[i - 2] === 'de' ? null : null);
      if (prev != null && prev >= 1 && prev <= 18) {
        return { hole: prev, tokens: [...tokens.slice(0, i - 1), ...tokens.slice(i + 1)] };
      }
    }
  }
  return { hole: null, tokens };
}

/**
 * @param {string} text           ingesproken/getypte tekst
 * @param {object} opts
 * @param {string[]} opts.players bekende spelers
 * @param {number} opts.currentHole hole die geldt als er geen hole genoemd wordt
 * @param {(hole:number)=>number} opts.parForHole par van een hole (voor "birdie" e.d.)
 * @returns {{hole:number, holeMentioned:boolean, scores:{name:string, strokes:number, isNew:boolean}[]}}
 */
export function parseEntry(text, { players = [], currentHole = 1, parForHole = () => 4 } = {}) {
  const { hole: mentioned, tokens } = extractHole(normalize(text));
  const hole = mentioned ?? currentHole;
  const par = parForHole(hole);
  const scores = new Map();
  const toStrokes = (s) => (s.kind === 'term' ? par + s.value : s.value);

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const known = matchPlayer(tok, players);
    const candidate = known ?? (!NOT_A_NAME.has(tok) && /^[a-z]{2,}$/.test(tok) ? tok : null);
    if (!candidate) continue;

    // Patroon 1: "naam ... score"
    const s = readScore(tokens, i + 1);
    if (s) {
      const strokes = toStrokes(s);
      if (strokes >= 1 && strokes <= 20) {
        const name = known ?? candidate[0].toUpperCase() + candidate.slice(1);
        scores.set(name, { name, strokes, isNew: !known });
        i = s.next - 1;
        continue;
      }
    }
    // Patroon 2: "5 slagen voor Rudy" (alleen bekende spelers)
    if (known && tokens[i - 1] === 'voor') {
      let k = i - 2;
      while (k >= 0 && (tokens[k] === 'slagen' || tokens[k] === 'slag')) k--;
      const back = k >= 0 ? readScore(tokens, k) : null;
      if (back && !scores.has(known)) {
        const strokes = toStrokes(back);
        if (strokes >= 1 && strokes <= 20) scores.set(known, { name: known, strokes, isNew: false });
      }
    }
  }

  return { hole, holeMentioned: mentioned != null, scores: [...scores.values()] };
}
