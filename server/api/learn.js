// Leren van ingesproken tekst: zoekt in de voorbeelden (met toestemming gedeeld) naar woorden die
// de spraakherkenning steeds verkeerd opschrijft, en maakt daar een woordenlijst van die de app
// gebruikt. Puur, zodat het los te testen is.
//
// Een voorbeeld (namen zijn al vervangen door s1, s2, ...):
//   { hole: 4, par: 4, texts: ["hal 4 s1 fijf s2 ses"], final: { s1: 5, s2: 6 } }

const NUMBER_WORDS = {
  nul: 0, een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9, tien: 10,
  elf: 11, twaalf: 12, dertien: 13, veertien: 14, vijftien: 15, zestien: 16, zeventien: 17, achttien: 18,
};
const KNOWN = new Set([
  ...Object.keys(NUMBER_WORDS),
  'hole', 'holes', 'slag', 'slagen', 'en', 'de', 'het', 'op', 'voor', 'van', 'heeft', 'had', 'met', 'in', 'is', 'was',
  'par', 'birdie', 'bogey', 'eagle', 'dubbel', 'double', 'triple', 'nummer', 'ik', 'we', 'wij', 'die', 'dan', 'ook',
]);
const FILLER = new Set(['slag', 'slagen', 'heeft', 'had', 'met', 'en', 'de', 'het', 'is', 'was', 'nog', 'dan']);

const isPlayer = (t) => /^s\d+$/.test(t);
const isNumber = (t) => /^\d+$/.test(t) || t in NUMBER_WORDS;
const numberValue = (t) => (/^\d+$/.test(t) ? Number(t) : NUMBER_WORDS[t]);
const usable = (t) => t.length >= 2 && t.length <= 20 && /^[a-z]+$/.test(t) && !KNOWN.has(t);

export function tokenize(text) {
  return String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/(\d+)([a-z])/g, '$1 $2').replace(/([a-z]{2,})(\d)/g, '$1 $2')
    .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

// Telt per onbekend woord hoe vaak het voorkwam, bij hoeveel gebruikers en met welke betekenis.
// Gebruikt door learnVocabulary en door het beheeroverzicht (kandidaten die nog niet genoeg tellen).
export function wordStats(rows) {
  const numbers = new Map(); // woord -> {count, users: Set, values: Map<waarde, aantal>}
  const holes = new Map();
  const bump = (map, key, user, value) => {
    const e = map.get(key) ?? { count: 0, users: new Set(), values: new Map() };
    e.count++;
    e.users.add(user);
    if (value != null) e.values.set(value, (e.values.get(value) ?? 0) + 1);
    map.set(key, e);
  };

  for (const { user, sample } of rows) {
    const tokens = tokenize(sample?.texts?.[0] ?? '');
    const final = sample?.final ?? {};
    // Alleen gespeeld ("hal 4 fijf slagen"): geen speler in de zin, één score op de kaart.
    const finals = Object.values(final).filter(Number.isInteger);
    if (finals.length === 1 && !tokens.some(isPlayer)) {
      const word = tokens.find((t, i) => usable(t) && !(isNumber(tokens[i + 1] ?? '') && numberValue(tokens[i + 1]) === sample.hole));
      if (word) bump(numbers, word, user, finals[0]);
    }
    tokens.forEach((t, i) => {
      // "s1 fijf": het eerste onbekende woord na een speler, terwijl die speler een score kreeg
      if (isPlayer(t) && Number.isInteger(final[t])) {
        for (let k = i + 1; k < Math.min(tokens.length, i + 3); k++) {
          const w = tokens[k];
          if (isNumber(w) || isPlayer(w)) break;
          if (FILLER.has(w)) continue;
          if (usable(w)) bump(numbers, w, user, final[t]);
          break;
        }
      }
      // "hal 4": een onbekend woord vooraan, direct gevolgd door het holenummer
      if (i < 3 && usable(t) && isNumber(tokens[i + 1] ?? '') && numberValue(tokens[i + 1]) === sample.hole) {
        bump(holes, t, user);
      }
    });
  }

  const list = [];
  for (const [word, e] of numbers) {
    const [value, n] = [...e.values].sort((a, b) => b[1] - a[1])[0];
    list.push({ word, kind: 'number', count: e.count, users: e.users.size, value, share: n / e.count });
  }
  for (const [word, e] of holes) list.push({ word, kind: 'hole', count: e.count, users: e.users.size, value: null, share: 1 });
  return list.sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
}

/**
 * @param {{user:number, sample:object}[]} rows
 * @param {{minCount?:number, minUsers?:number, minShare?:number}} opts
 * @returns {{numbers:Object<string,number>, holeWords:string[], samples:number}}
 */
export function learnVocabulary(rows, { minCount = 3, minUsers = 1, minShare = 0.8 } = {}) {
  const enough = (w) => w.count >= minCount && w.users >= minUsers;
  const numbers = {};
  const holeWords = [];
  for (const w of wordStats(rows)) {
    if (w.kind === 'number' && enough(w) && w.share >= minShare && w.value >= 1 && w.value <= 20) numbers[w.word] = w.value;
    if (w.kind === 'hole' && enough(w)) holeWords.push(w.word);
  }
  return { numbers, holeWords: holeWords.sort(), samples: rows.length };
}
