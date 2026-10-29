// Zet de banen uit data/banen/courses.json om naar het formaat van DEFAULT_COURSES en schrijft ze in
// js/courses.js tussen de markeringen "<banen-regio>" en "</banen-regio>". Opnieuw draaien is veilig.
//   node tools/banen/to-courses.mjs            (schrijft js/courses.js)
//   node tools/banen/to-courses.mjs --check    (alleen tonen wat er zou komen)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const COURSES_JS = path.join(ROOT, 'js/courses.js');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/banen/courses.json'), 'utf8'));
const START = '  // <banen-regio>';
const END = '  // </banen-regio>';

// Lussen die al met de hand (van de scorekaart van de club) in courses.js staan: overslaan.
const SKIP = new Set([
  'hooge-graven-ommen/0', 'hooge-graven-ommen/1', 'gelpenberg-aalden/0', 'gelpenberg-aalden/1',
  'sallandsche-de-hoek-diepenveen/0', 'golfclub-driene-hengelo/0', 'lochemse-de-graafschap-lochem/0',
  'golfclub-prinses-wilhelmina-enschede/0', 'de-scherpenbergh-lieren/0', 'de-scherpenbergh-lieren/1',
  'de-scherpenbergh-lieren/2', 'golfpark-de-hildenberg/0', 'twentse-golf-park-haaksbergen/0', 'dutch-golf-hattem/1',
  // DGCC: de 18-holes combinaties (lus 3-5) hebben officiële ratings; de losse lussen niet dubbel opnemen.
  'drentsche-golf-country-club-zeijerveen/0', 'drentsche-golf-country-club-zeijerveen/1', 'drentsche-golf-country-club-zeijerveen/2',
  'golfclub-zwolle/0', 'golfclub-zwolle/1', 'golfclub-zwolle/2', // samengevoegd hieronder (COMBINE)
  'golftuin-zwolle/1', // eerste negen van de 18-holes par 3-baan
]);
// Banen die eerder uit openbare bronnen kwamen: nu de officiële gegevens, met dezelfde id.
const REPLACE = {
  'golfclub-zwolle/0+1': { id: 'zwolle', dataVersion: 4 },
  'de-koepel-wierden/0': { id: 'de-koepel', dataVersion: 4 },
  'martensplek-tiendeveen/0': { id: 'martensplek', dataVersion: 3 },
  'twentsche-golfclub-delden/0': { id: 'twentsche', dataVersion: 4 },
};
// Twee 9-holes lussen die samen de 18-holes baan vormen; ratings uit een aparte lus.
const COMBINE = [{ slug: 'golfclub-zwolle', loops: [0, 1], ratingsFrom: 2 }];
// Namen van lussen in de app (anders de opgeschoonde lusnaam).
const LABEL = {
  'dutch-golf-hattem/0': 'Grote lus', 'golfplezier-twente-hoge-hexel/0': '18 holes', 'golfplezier-twente-hoge-hexel/1': '9 holes',
  'golfpark-de-hildenberg/1': 'Pitch & Putt', 'golftuin-zwolle/0': 'Par 3-baan', 'de-lage-mors-delden/0': '', 'de-lage-mors-delden/1': 'Twickelbaan',
  'golfclub-emmeloord/0': 'Suydersee', 'golfclub-emmeloord/1': 'Pionier par 3', 'spielehof-boekelo/0': 'Grobbebaan',
  'spielehof-boekelo/1': 'Shortgolf', 'de-breuninkhof-bussloo/0': '', 'de-breuninkhof-bussloo/1': 'Par 3-baan',
  'semslanden-gasselte/0': '', 'semslanden-gasselte/1': 'Drieveld par 3', 'semslanden-gasselte/2': 'Par 3-variant',
  'holthuizen-roden/0': '', 'holthuizen-roden/1': 'Par 3-baan', 't-zelle-hengelo-gld/0': 'Bosrijk-Waterrijk',
  't-zelle-hengelo-gld/1': 'Veldrijk par 3', 'de-compagnie-veendam/0': '', 'de-compagnie-veendam/1': 'Par 3-baan',
  'keppelse-golfclub-hoog-keppel/0': '', 'keppelse-golfclub-hoog-keppel/1': 'Par 3/4-baan', 'golfclub-zeewolde/3': 'Jol',
  'golfclub-gaasterland/0': '', 'golfclub-gaasterland/1': 'Paarse par 3', 'golfclub-flevoland/0': 'Groen',
  'golf4all-harderwijk/0': '', 'golf4all-harderwijk/1': 'Par 3-baan', 'zuid-drenthe-erica/0': '',
  'the-links-valley-ermelo/0': 'North', 'the-links-valley-ermelo/1': 'South',
  'drentsche-golf-country-club-zeijerveen/3': 'Rood-Geel', 'drentsche-golf-country-club-zeijerveen/4': 'Wit-Rood',
  'drentsche-golf-country-club-zeijerveen/5': 'Geel-Wit', 'drentsche-golf-country-club-zeijerveen/6': 'Par 3-baan',
  'golfvereniging-reymerswael-rilland/0': '',
  'hcc-groen-geel-golf-wassenaar/0': '', 'hcc-groen-geel-golf-wassenaar/1': 'Gele baan', // groene baan houdt zijn id // 18 holes: id gelijk houden nu de 12- en 6-holeslus erbij staan
  'het-rijk-van-sybrook-enschede/0': 'Noord-Zuid', 'het-rijk-van-sybrook-enschede/1': 'Oost-Noord', 'het-rijk-van-sybrook-enschede/2': 'Zuid-Oost',
};
const COUNTRY = { DE: 'Duitsland' };
const COLOURS = [['wit', /\b(wit|weiss|weiß|white)\b/i], ['geel', /\b(geel|gelb|yellow)\b/i], ['blauw', /\b(blauw|blau|blue)\b/i],
  ['rood', /\b(rood|rot|red)\b/i], ['oranje', /\b(oranje|orange)\b/i], ['zwart', /\b(zwart|schwarz|black)\b/i],
  ['groen', /\b(groen|grün|gr.n|green)\b/i], ['paars', /\b(paars|purple)\b/i]];

const round1 = (x) => Math.round(x * 10) / 10;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const colourOf = (name) => COLOURS.find(([, re]) => re.test(name ?? ''))?.[0] ?? null;
const genderOf = (t) => (t.gender === 'men' || /herren|\bheren\b/i.test(t.name) ? 'h' : t.gender === 'women' || /damen|\bdames\b/i.test(t.name) ? 'd' : null);

function lengthsFor(tee, holeData) {
  const keys = [...new Set(holeData.flatMap((h) => Object.keys(h.lengths_m ?? {})))];
  const num = tee.name.match(/^\d+/)?.[0];
  const key = keys.find((k) => k === tee.name) ?? (num && keys.find((k) => k === num))
    ?? keys.find((k) => colourOf(k) && colourOf(k) === colourOf(tee.name)) ?? (keys.length === 1 ? keys[0] : null);
  if (!key) return null;
  const l = holeData.map((h) => h.lengths_m?.[key] ?? null);
  return l.every((x) => x == null) ? null : l.map((x) => x ?? 0);
}

// Eén lus (of samengevoegde lussen) omzetten naar een baan voor de app; null als dat niet kan.
function convert(c, key, loop, ratingLoop, problems) {
  let holeData = loop.hole_data ?? [];
  let n = holeData.length || loop.holes;
  const parTotal = loop.par ?? (holeData.length ? holeData.reduce((a, h) => a + (h.par ?? 0), 0) : null);
  const parOnly3 = /pitch|par-3/.test(c.course_type ?? '') || (parTotal && parTotal === 3 * n);
  if (n !== 9 && n !== 18) { problems.push(`${key}: ${n} holes (app kent alleen 9 of 18)`); return null; }
  if (!holeData.length && !parOnly3) { problems.push(`${key}: geen holegegevens`); return null; }
  const pars = holeData.length ? holeData.map((h) => h.par) : Array(n).fill(3);
  if (pars.some((p) => !p)) { problems.push(`${key}: par ontbreekt bij een hole`); return null; }
  const par = pars.reduce((a, b) => a + b, 0);
  let si = holeData.map((h) => h.si);
  // 9 holes met S.I. in 18-holes stijl (1, 3, 5 … of 2, 4, 6 …): omzetten naar de volgorde 1–9.
  if (n === 9 && si.every((x) => Number.isInteger(x) && x >= 1 && x <= 18) && new Set(si).size === 9) {
    const sorted = [...si].sort((a, b) => a - b);
    si = si.map((x) => sorted.indexOf(x) + 1);
  }
  const siOk = si.length === n && [...si].sort((a, b) => a - b).every((x, i) => x === i + 1);
  if (!siOk) si = Array.from({ length: n }, (_, i) => i + 1);

  // Tees: per geslacht, alleen met dezelfde par als de baan; zonder rating alleen als niets een rating heeft.
  const src = (ratingLoop ?? loop).tees ?? [];
  const rated = src.filter((t) => t.course_rating && t.slope && (t.par == null || t.par === par || t.par === 2 * par));
  const skippedPar = src.filter((t) => t.course_rating && t.par && t.par !== par && t.par !== 2 * par);
  if (skippedPar.length) problems.push(`${key}: tees met andere par overgeslagen (${skippedPar.map((t) => `${t.name}/${t.gender} par ${t.par}`).join(', ')})`);
  const tees = [];
  const add = (t, gender, rating, slope, ratingUnknown) => {
    const colour = colourOf(t.name) ?? (ratingUnknown ? 'standaard' : null) ?? 'standaard';
    const num = t.name.match(/^\d+/)?.[0];
    const name = `${cap(colour)}${num ? ` ${num}` : ''} (${gender === 'h' ? 'heren' : 'dames'})`;
    const id = `${key.id}-${colour}${num ? `-${num}` : ''}-${gender}`;
    if (tees.some((x) => x.id === id)) return;
    const lengths = lengthsFor(t, holeData);
    // Officiële ratings per negen (handicaptabellen van de club), alleen bij 18 holes.
    const nine = n === 18 && !ratingUnknown && t.course_rating_front9 && t.slope_front9
      ? { rating9: t.course_rating_front9, slope9: t.slope_front9, ...(t.course_rating_back9 && t.slope_back9 ? { rating9Back: t.course_rating_back9, slope9Back: t.slope_back9 } : {}) }
      : { rating9: null, slope9: null };
    tees.push({ id, name, gender, rating, slope, ...nine, ...(ratingUnknown ? { ratingUnknown: true } : {}), ...(lengths ? { lengths } : {}) });
  };
  for (const t of rated) {
    const g = genderOf(t);
    if (!g) continue; // rating zonder geslacht (niet bevestigd): niet gebruiken
    // 9-holes baan met 18-holes ratings (2x rond): halveren, slope blijft.
    const r18 = n === 9 && t.course_rating > 1.5 * par;
    add(t, g, r18 ? round1(t.course_rating / 2) : t.course_rating, t.slope, false);
  }
  if (!tees.length) {
    const base = (loop.tees ?? []).length ? loop.tees : [{ name: 'standaard' }];
    for (const t of base) for (const g of ['h', 'd']) add(t, g, par, 113, true);
  }
  // Bron per lus (loop.source) gaat voor de bron van de hele baan: een club kan voor de grote baan een
  // eigen scorekaart hebben en voor de par 3-baan alleen gegevens van derden.
  const official = (loop.source ?? c.scorecard?.source) === 'official';
  return {
    id: key.id,
    province: COUNTRY[c.address?.country] ?? c.address?.province ?? null,
    town: (c.address?.city ?? '').replace(/\s*\(.*\)$/, '') || null,
    dataVersion: key.dataVersion ?? 1,
    name: key.name,
    holeCount: n,
    parTotal: par,
    pars,
    si,
    confirmed: official,
    ...(official ? {} : { fromSources: true }),
    ...(siOk ? {} : { siUnknown: true }),
    ...((n === 18 ? par : 2 * par) < 60 || tees.every((t) => t.ratingUnknown) ? { countsForIndex: false } : {}),
    location: c.gps?.lat ? { lat: round5(c.gps.lat), lon: round5(c.gps.lon) } : null,
    website: c.website ?? null,
    // Baan die gaat sluiten (status uit de statuscontrole): de site en de app tonen de notitie.
    ...(c.status === 'sluit' && c.status_note ? { closing: c.status_note } : {}),
    tees,
  };
}
const round5 = (x) => Math.round(x * 1e5) / 1e5;

function displayName(c, label) {
  const town = (c.address?.city ?? '').replace(/\s*\(.*\)$/, '');
  const base = c.name.replace(/\s*\(.*\)\s*$/, '');
  const withLabel = label ? `${base} ${label}` : base;
  return town && !base.toLowerCase().includes(town.toLowerCase()) ? `${withLabel} (${town})` : withLabel;
}
const cleanLabel = (s) => (s ?? '').replace(/\s*\(.*?\)\s*/g, ' ').replace(/\b(18|9) holes\b/gi, '').replace(/\s+/g, ' ').trim();

const out = [];
const problems = [];
for (const c of DATA) {
  const loops = c.loops ?? [];
  const entries = [];
  for (const comb of COMBINE.filter((x) => x.slug === c.slug)) {
    const [a, b] = comb.loops.map((i) => loops[i]);
    const ref = `${c.slug}/${comb.loops.join('+')}`;
    entries.push({ ref, loop: { ...a, holes: 18, par: (a.par ?? 0) + (b.par ?? 0), hole_data: [...a.hole_data, ...b.hole_data].map((h, i) => ({ ...h, hole: i + 1 })) }, ratingLoop: loops[comb.ratingsFrom] });
  }
  loops.forEach((loop, i) => { if (!SKIP.has(`${c.slug}/${i}`)) entries.push({ ref: `${c.slug}/${i}`, loop }); });
  // Labels per lus; geven twee lussen hetzelfde label (bijv. "18 holes" en "9 holes" worden allebei
  // leeg), dan de lusnaam zonder haakjes, en anders met een volgnummer. Bestaande id's blijven gelijk.
  const labels = entries.map((e) => (e.ref in LABEL ? LABEL[e.ref] : entries.length > 1 ? cleanLabel(e.loop.name) : ''));
  const dupes = (list) => list.map((l, i) => list.indexOf(l) !== i || list.lastIndexOf(l) !== i);
  if (dupes(labels).some(Boolean)) {
    const plain = (s) => (s ?? '').replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
    dupes(labels).forEach((d, i) => { if (d && !(entries[i].ref in LABEL)) labels[i] = plain(entries[i].loop.name) || `lus ${i + 1}`; });
    dupes(labels).forEach((d, i) => { if (d) labels[i] = `${labels[i]} ${i + 1}`.trim(); });
  }
  for (const [n, e] of entries.entries()) {
    const rep = REPLACE[e.ref];
    const label = labels[n];
    const idSuffix = label && !rep ? `-${label.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}` : '';
    const key = { id: rep?.id ?? `${c.slug}${idSuffix}`, dataVersion: rep?.dataVersion, name: displayName(c, label), ref: e.ref, toString() { return this.ref; } };
    const course = convert(c, key, e.loop, e.ratingLoop, problems);
    if (course) out.push({ course, distance: c.distance_km_from_dedemsvaart ?? 999 });
  }
}
// Gecontroleerd met de eigen bronnen van de clubs (data/banen/verified.json): stroke index,
// ratings (ook per negen), lengtes en extra tees. Gaat boven wat courses.json zegt.
const VERIFIED = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/banen/verified.json'), 'utf8'));
for (const { course: c } of out) {
  const v = VERIFIED[c.id];
  if (!v) continue;
  if (v.si) {
    if (v.si.length !== c.holeCount || [...v.si].sort((a, b) => a - b).some((x, i) => x !== i + 1)) throw new Error(`verified ${c.id}: ongeldige stroke index`);
    c.si = v.si;
    delete c.siUnknown;
  }
  for (const [name, fields] of Object.entries(v.tees ?? {})) {
    const t = c.tees.find((x) => x.name === name);
    if (!t) { problems.push(`verified ${c.id}: tee ${name} niet gevonden`); continue; }
    Object.assign(t, fields);
    if (fields.rating) delete t.ratingUnknown;
  }
  for (const add of v.addTees ?? []) {
    const id = `${c.id}-${add.name.split(' ')[0].toLowerCase()}-${add.gender}`;
    if (!c.tees.some((x) => x.id === id)) c.tees.push({ id, ...add, ...(add.rating9 ? {} : { rating9: null, slope9: null }) });
  }
  c.dataVersion = (c.dataVersion ?? 1) + 1; // opgeslagen banen op de telefoons bijwerken
}

out.sort((a, b) => a.distance - b.distance);
const ids = out.map((o) => o.course.id);
const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dup.length) throw new Error(`dubbele id's: ${dup.join(', ')}`);

// Als JS schrijven in de stijl van courses.js: één regel met de baan, de tees elk op een eigen regel.
const js = (v) => (v === null ? 'null' : Array.isArray(v) ? `[${v.map(js).join(', ')}]`
  : typeof v === 'object' ? `{ ${Object.entries(v).map(([k, x]) => `${/^[a-z_]\w*$/i.test(k) ? k : `'${k}'`}: ${js(x)}`).join(', ')} }`
  : typeof v === 'string' ? `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'` : String(v));
const block = out.map(({ course: { tees, ...rest } }) => {
  const head = js(rest).slice(2, -2);
  return `  {\n    ${head},\n    tees: [\n${tees.map((t) => `      ${js(t)},`).join('\n')}\n    ],\n  },`;
}).join('\n');

const header = `${START}\n  // Gegenereerd door tools/banen/to-courses.mjs uit data/banen/courses.json (scorekaarten van de clubs;\n  // fromSources: true = Hole19/Golfify/GolfPass). Niet met de hand wijzigen: pas de data aan en draai het script.\n`;
const raw = fs.readFileSync(COURSES_JS, 'utf8');
const crlf = raw.includes('\r\n');
const src = raw.replace(/\r\n/g, '\n');
const s = src.indexOf(START);
const e = src.indexOf(END);
if (s < 0 || e < 0) throw new Error('markeringen <banen-regio> niet gevonden in js/courses.js');
const next = src.slice(0, s) + header + block + '\n' + src.slice(e);

console.log(`${out.length} banen gegenereerd`);
for (const p of problems) console.log(`  overgeslagen/let op: ${p}`);
if (process.argv.includes('--check')) for (const { course: c } of out) console.log(`  ${c.id}  ${c.name}  ${c.holeCount}h par ${c.parTotal}  tees ${c.tees.length}${c.siUnknown ? ' siUnknown' : ''}${c.countsForIndex === false ? ' noIndex' : ''}${c.confirmed ? '' : ' fromSources'}`);
else fs.writeFileSync(COURSES_JS, crlf ? next.replace(/\n/g, '\r\n') : next);
