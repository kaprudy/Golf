// Bouwt de statische pagina's van golf.kapital.nl uit de banenlijst van de app (js/courses.js):
// banen.html, een pagina per baan en per provincie, uitleg over de handicap, veelgestelde vragen,
// sitemap.xml, robots.txt, llms.txt en data/banen.json.
//   node tools/build-site.mjs           schrijft de bestanden in server/site/
//   node tools/build-site.mjs --check   controleert alleen of ze actueel zijn (voor de tests)
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_COURSES, BASE_GEO, isShortCourse } from '../js/courses.js';
import { distanceM } from '../js/gps.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'server', 'site');
// Versie van de stylesheet in de link, zodat een browser na een wijziging niet de oude uit de cache houdt.
const CSS = `/style.css?v=${crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'style.css'))).digest('hex').slice(0, 10)}`;
const SITE = 'https://golf.kapital.nl';
const APP = 'https://kaprudy.github.io/Golf/';
const REPO = 'https://github.com/kaprudy/Golf';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl = (n, d = 1) => (n == null ? '–' : Number(n).toFixed(d).replace('.', ','));
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

// ---------- Baangegevens voor de pagina's ----------

const title = (c) => c.name.replace(/\s*\([^)]*\)\s*$/, '');
const holesOf = (c) => (c.id === 'par3' ? 9 : c.holeCount); // par 3 Hooge Graven: 9 holes, 18 = twee keer rond
const parOf = (c) => (c.id === 'par3' ? 27 : c.parTotal);
const official = (c) => c.confirmed && !c.fromSources;
const teeColour = (t) => t.name.split(' ')[0];
const genderName = (g) => (g === 'd' ? 'dames' : 'heren');
// Representatieve tee: geel heren, anders de eerste herentee, anders de eerste.
const mainTee = (c) => c.tees.find((t) => t.gender === 'h' && /^geel/i.test(t.name) && !t.ratingUnknown)
  ?? c.tees.find((t) => t.gender === 'h' && !t.ratingUnknown) ?? c.tees.find((t) => !t.ratingUnknown) ?? null;
const longest = (c) => Math.max(0, ...c.tees.filter((t) => t.lengths).map((t) => sum(t.lengths.slice(0, holesOf(c)))));
const country = (c) => (c.province === 'Duitsland' ? 'DE' : 'NL');

const courses = [...DEFAULT_COURSES].sort((a, b) => a.name.localeCompare(b.name, 'nl'));
const provinces = [...new Set(courses.map((c) => c.province ?? 'Overig'))]
  .map((p) => ({ name: p, slug: slug(p), courses: courses.filter((c) => (c.province ?? 'Overig') === p) }))
  .sort((a, b) => b.courses.length - a.courses.length || a.name.localeCompare(b.name));
const provinceOf = (c) => provinces.find((p) => p.courses.includes(c));
const courseUrl = (c) => `/banen/${c.id}.html`;

function nearby(c, n = 6) {
  if (!c.location) return [];
  return courses.filter((x) => x !== c && x.location)
    .map((x) => ({ c: x, km: distanceM(c.location, x.location) / 1000 }))
    .sort((a, b) => a.km - b.km).slice(0, n);
}

// ---------- Opmaak ----------

function page({ path: p, title: t, description, body, jsonld = [], active = '' }) {
  const url = SITE + p;
  const nav = (href, label, key) => `<a href="${href}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(t)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Golfscore">
  <meta property="og:title" content="${esc(t)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:locale" content="nl_NL">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=DM+Sans:wght@400;500;600&display=swap">
  <link rel="stylesheet" href="${CSS}">
${jsonld.map((j) => `  <script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
</head>
<body>
<nav class="nav" aria-label="Hoofdmenu">
  <div class="nav-in">
    <a class="brand" href="/">Golfscore</a>
    ${nav('/banen.html', 'Banen', 'banen')}
    <span class="hide-sm">${nav('/handicap-berekenen.html', 'Handicap', 'handicap')}</span>
    <span class="hide-sm">${nav('/veelgestelde-vragen.html', 'Vragen', 'faq')}</span>
    <a class="cta" href="${APP}">Open de app</a>
  </div>
</nav>
<main>
${body}
</main>
<footer class="site-footer">
  <div class="footer-in">
    <div><b>Golfscore</b> · golfscores inspreken, GPS-afstanden en handicap volgens WHS</div>
    <div class="footer-links"><a href="/">Home</a> <a href="/banen.html">Banen</a> <a href="/handicap-berekenen.html">Handicap berekenen</a> <a href="/veelgestelde-vragen.html">Veelgestelde vragen</a> <a href="${REPO}">Broncode op GitHub</a></div>
    <div class="muted small">Een persoonlijk project · gehost op kapital.nl · baangegevens van de clubs · kaartgegevens © OpenStreetMap-bijdragers</div>
  </div>
</footer>
</body>
</html>
`;
}

const breadcrumb = (items) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + p })),
});
const crumbs = (items) => `<nav class="crumbs" aria-label="Kruimelpad">${items.map(([name, p], i) => (i < items.length - 1 ? `<a href="${p}">${esc(name)}</a> › ` : `<span>${esc(name)}</span>`)).join('')}</nav>`;

function badges(c) {
  return [
    official(c) ? '<span class="badge ok">Scorekaart van de club</span>' : '<span class="badge warn">Nog te controleren</span>',
    BASE_GEO[c.id] ? '<span class="badge">GPS-afstanden</span>' : '',
    c.countsForIndex === false ? '<span class="badge">Telt niet voor handicap</span>' : '',
    c.closing ? '<span class="badge warn">Gaat sluiten</span>' : '',
  ].join('');
}

function card(c) {
  const t = mainTee(c);
  const search = `${c.name} ${c.town ?? ''} ${c.province ?? ''}`.toLowerCase();
  return `<article class="course" data-search="${esc(search)}">
      <h3><a href="${courseUrl(c)}">${esc(title(c))}</a></h3>
      <div class="meta">${esc(c.town ?? '')} · ${holesOf(c)} holes · par ${parOf(c)}</div>
      ${t ? `<div class="rating">CR <b>${nl(t.rating)}</b> · slope <b>${t.slope}</b> <span class="muted">${esc(teeColour(t).toLowerCase())} ${genderName(t.gender)}</span></div>` : '<div class="rating muted">Rating nog onbekend</div>'}
      <div class="badges">${badges(c)}</div>
    </article>`;
}

function groups(list, headingTag = 'h3') {
  const long = list.filter((c) => !isShortCourse(c));
  const short = list.filter(isShortCourse);
  return [
    long.length ? `<${headingTag} class="group-title">Golfbanen <span>${long.length}</span></${headingTag}><div class="courses">${long.map(card).join('')}</div>` : '',
    short.length ? `<${headingTag} class="group-title">Pitch &amp; putt en par 3-banen <span>${short.length}</span></${headingTag}><div class="courses">${short.map(card).join('')}</div>` : '',
  ].join('\n');
}

// ---------- Pagina's ----------

const files = {};

// Overzicht van alle banen
{
  const total = courses.length;
  const shortN = courses.filter(isShortCourse).length;
  const body = `
  <section class="hero">
    ${crumbs([['Home', '/'], ['Banen', '/banen.html']])}
    <h1>Golfbanen in Golfscore</h1>
    <p class="lead">${total} banen in Oost-Nederland en net over de grens, met par en stroke index per hole, lengtes per tee en de course rating en slope voor heren en dames.</p>
    <div class="stats">
      <div><b>${total - shortN}</b><span>golfbanen</span></div>
      <div><b>${shortN}</b><span>pitch &amp; putt en par 3</span></div>
      <div><b>${courses.filter(official).length}</b><span>volgens de scorekaart van de club</span></div>
      <div><b>${provinces.length}</b><span>provincies</span></div>
    </div>
  </section>

  <div class="toolbar">
    <label class="search"><span class="sr-only">Zoek een baan</span><input id="q" type="search" placeholder="Zoek op naam of plaats…" autocomplete="off"></label>
    <div class="chips">${provinces.map((p) => `<a class="pill" href="#${p.slug}">${esc(p.name)} <b>${p.courses.length}</b></a>`).join('')}</div>
  </div>
  <p id="no-results" class="muted" hidden>Geen baan gevonden. Staat je baan er niet bij? In de app voeg je hem zelf toe.</p>

  ${provinces.map((p) => `<section class="province" id="${p.slug}">
    <h2><a href="/provincie/${p.slug}.html">${esc(p.name)}</a> <span>${p.courses.length} ${p.courses.length === 1 ? 'baan' : 'banen'}</span></h2>
    ${groups(p.courses)}
  </section>`).join('\n')}

  <section>
    <div class="sand legend">
      <div><span class="badge ok">Scorekaart van de club</span> par, stroke index en ratings komen van de scorekaart en handicaptabellen van de club zelf.</div>
      <div><span class="badge warn">Nog te controleren</span> gegevens uit openbare bronnen; de app vraagt om ze te vergelijken met de scorekaart.</div>
      <div><span class="badge">GPS-afstanden</span> tees en greens staan al klaar, dus de afstand tot de green werkt direct.</div>
      <div>De gegevens zijn ook beschikbaar als <a href="/data/banen.json">JSON</a>.</div>
    </div>
  </section>
  <script>
    // Zoeken in de lijst (de pagina werkt ook zonder)
    const q = document.getElementById('q');
    q.addEventListener('input', () => {
      const term = q.value.trim().toLowerCase();
      let shown = 0;
      document.querySelectorAll('.course').forEach((el) => { const hit = !term || el.dataset.search.includes(term); el.hidden = !hit; shown += hit; });
      document.querySelectorAll('.province').forEach((s) => { s.hidden = !s.querySelector('.course:not([hidden])'); });
      document.querySelectorAll('.group-title').forEach((h) => { h.hidden = !h.nextElementSibling.querySelector('.course:not([hidden])'); });
      document.getElementById('no-results').hidden = shown > 0;
    });
  </script>`;
  files['banen.html'] = page({
    path: '/banen.html', active: 'banen', body,
    title: `Golfbanen per provincie – ${total} banen met scorekaart, course rating en slope | Golfscore`,
    description: `Overzicht van ${total} golfbanen in Overijssel, Gelderland, Drenthe, Friesland, Flevoland, Groningen en Duitsland, met par, stroke index, course rating en slope per tee.`,
    jsonld: [breadcrumb([['Home', '/'], ['Banen', '/banen.html']]), {
      '@context': 'https://schema.org', '@type': 'ItemList', name: 'Golfbanen in Golfscore', numberOfItems: total,
      itemListElement: courses.map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + courseUrl(c), name: title(c) })),
    }],
  });
}

// Per provincie
for (const p of provinces) {
  const long = p.courses.filter((c) => !isShortCourse(c)).length;
  const short = p.courses.length - long;
  const body = `
  <section class="hero">
    ${crumbs([['Home', '/'], ['Banen', '/banen.html'], [p.name, `/provincie/${p.slug}.html`]])}
    <h1>Golfbanen in ${esc(p.name)}</h1>
    <p class="lead">${p.courses.length} banen in ${esc(p.name)} in Golfscore: ${long} golfbanen${short ? ` en ${short} pitch &amp; putt- en par 3-banen` : ''}. Per baan vind je de par en stroke index per hole, de lengtes per tee en de course rating en slope.</p>
  </section>
  ${groups(p.courses, 'h2')}`;
  files[`provincie/${p.slug}.html`] = page({
    path: `/provincie/${p.slug}.html`, active: 'banen', body,
    title: `Golfbanen in ${p.name} – scorekaart, course rating en slope | Golfscore`,
    description: `${p.courses.length} golfbanen in ${p.name}: ${p.courses.slice(0, 5).map(title).join(', ')}${p.courses.length > 5 ? ' en meer' : ''}. Met par, stroke index en course rating per tee.`,
    jsonld: [breadcrumb([['Home', '/'], ['Banen', '/banen.html'], [p.name, `/provincie/${p.slug}.html`]])],
  });
}

// Per baan
for (const c of courses) {
  const p = provinceOf(c);
  const holes = holesOf(c);
  const h = Array.from({ length: holes }, (_, i) => i);
  const nines = holes === 18 ? [h.slice(0, 9), h.slice(9)] : [h];
  const lengthTees = c.tees.filter((t) => t.lengths).filter((t, i, all) => all.findIndex((x) => teeColour(x) === teeColour(t)) === i);
  const t = mainTee(c);
  const len = longest(c);
  const twice = c.id === 'par3' || (c.holeCount === 18 && c.pars.slice(0, 9).join() === c.pars.slice(9).join() && c.tees.every((x) => !x.lengths || x.lengths.slice(0, 9).join() === x.lengths.slice(9).join()));
  const summary = `${title(c)} in ${c.town ?? ''}${p ? ` (${p.name})` : ''} is een ${isShortCourse(c) ? (/pitch/i.test(c.name) ? 'pitch & putt-baan' : 'korte baan') : 'golfbaan'} met ${holes} holes en par ${parOf(c)}${len ? `, de langste tee is ${len.toLocaleString('nl-NL')} meter` : ''}.`;
  const ratingSentence = t ? ` Vanaf ${teeColour(t).toLowerCase()} (${genderName(t.gender)}) is de course rating ${nl(t.rating)} en de slope rating ${t.slope}.` : '';
  const scoreTable = nines.map((nine, k) => `<table class="scorecard">
      <thead><tr><th>Hole</th>${nine.map((i) => `<th>${i + 1}</th>`).join('')}<th>${holes === 18 ? (k ? 'In' : 'Uit') : 'Tot.'}</th></tr></thead>
      <tbody>
        <tr><th>Par</th>${nine.map((i) => `<td>${c.pars[i]}</td>`).join('')}<td><b>${sum(nine.map((i) => c.pars[i]))}</b></td></tr>
        <tr><th>SI</th>${nine.map((i) => `<td>${c.siUnknown ? '–' : c.si[i]}</td>`).join('')}<td></td></tr>
        ${lengthTees.map((x) => `<tr><th>${esc(teeColour(x))}</th>${nine.map((i) => `<td>${x.lengths[i]}</td>`).join('')}<td>${sum(nine.map((i) => x.lengths[i]))}</td></tr>`).join('')}
      </tbody></table>`).join('');
  const rated = c.tees.filter((x) => !x.ratingUnknown);
  const has9 = rated.some((x) => x.rating9 != null) && c.holeCount === 18 && !twice;
  const ratingTable = rated.length ? `<table class="ratings">
      <thead><tr><th>Tee</th><th>Course rating</th><th>Slope</th>${has9 ? '<th>Holes 1–9</th><th>Holes 10–18</th>' : ''}</tr></thead>
      <tbody>${rated.map((x) => `<tr><td>${esc(x.name)}</td><td>${nl(x.rating)}</td><td>${x.slope}</td>${has9 ? `<td>${x.rating9 != null ? `${nl(x.rating9)} / ${x.slope9}` : '–'}</td><td>${x.rating9Back != null ? `${nl(x.rating9Back)} / ${x.slope9Back}` : x.rating9 != null ? `${nl(x.rating9)} / ${x.slope9}` : '–'}</td>` : ''}</tr>`).join('')}</tbody>
    </table>` : '<p class="muted">De course rating en slope van deze baan zijn nog niet bekend.</p>';
  const near = nearby(c);
  const body = `
  <section class="hero">
    ${crumbs([['Home', '/'], ['Banen', '/banen.html'], ...(p ? [[p.name, `/provincie/${p.slug}.html`]] : []), [title(c), courseUrl(c)]])}
    <h1>${esc(title(c))}</h1>
    <p class="lead">${esc(summary)}${esc(ratingSentence)}</p>
    <div class="badges">${badges(c)}</div>
    ${c.closing ? `<p class="alert">${esc(c.closing)}</p>` : ''}
  </section>

  <section class="facts">
    <dl>
      <div><dt>Plaats</dt><dd>${esc(c.town ?? '–')}</dd></div>
      <div><dt>Provincie</dt><dd>${p ? `<a href="/provincie/${p.slug}.html">${esc(p.name)}</a>` : '–'}</dd></div>
      <div><dt>Holes</dt><dd>${holes}${twice && c.holeCount === 18 ? ' (18 = twee keer rond)' : ''}</dd></div>
      <div><dt>Par</dt><dd>${parOf(c)}</dd></div>
      ${len ? `<div><dt>Lengte</dt><dd>${len.toLocaleString('nl-NL')} m (langste tee)</dd></div>` : ''}
      <div><dt>Tees</dt><dd>${new Set(c.tees.map(teeColour)).size}</dd></div>
      <div><dt>Handicap</dt><dd>${c.countsForIndex === false ? 'telt niet mee voor de handicapindex' : 'telt mee voor de handicapindex'}</dd></div>
      ${c.website ? `<div><dt>Website</dt><dd><a href="${esc(c.website)}" rel="noopener">${esc(c.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a></dd></div>` : ''}
      ${c.location ? `<div><dt>Kaart</dt><dd><a href="https://www.openstreetmap.org/?mlat=${c.location.lat}&amp;mlon=${c.location.lon}#map=15/${c.location.lat}/${c.location.lon}" rel="noopener">OpenStreetMap</a></dd></div>` : ''}
    </dl>
  </section>

  <section>
    <h2>Scorekaart</h2>
    ${c.siUnknown ? '<p class="small muted">De stroke index staat niet op de scorekaart van de club.</p>' : ''}
    <div class="table-scroll">${scoreTable}</div>
  </section>

  <section>
    <h2>Course rating en slope</h2>
    <div class="table-scroll">${ratingTable}</div>
    <p class="small muted">${official(c) ? 'Volgens de scorekaart en handicaptabellen van de club.' : 'Uit openbare bronnen; controleer ze met de scorekaart van de club.'} Hoe de app hiermee je handicap berekent, lees je bij <a href="/handicap-berekenen.html">handicap berekenen</a>.</p>
  </section>

  <section class="sand">
    <h2>Speel ${esc(title(c))} met Golfscore</h2>
    <p>Kies deze baan in de app, spreek je slagen in (“Hole 4, 5 slagen”) en zie na de ronde je stableford, score differential en handicapindicatie.${BASE_GEO[c.id] ? ' Met GPS zie je de afstand tot de green.' : ''}</p>
    <a class="cta" href="${APP}">Open de app</a>
  </section>

  ${near.length ? `<section>
    <h2>Banen in de buurt</h2>
    <ul class="near">${near.map(({ c: x, km }) => `<li><a href="${courseUrl(x)}">${esc(title(x))}</a> <span class="muted">${esc(x.town ?? '')} · ${Math.round(km)} km</span></li>`).join('')}</ul>
  </section>` : ''}`;
  const jsonld = [breadcrumb([['Home', '/'], ['Banen', '/banen.html'], ...(p ? [[p.name, `/provincie/${p.slug}.html`]] : []), [title(c), courseUrl(c)]]), {
    '@context': 'https://schema.org', '@type': 'GolfCourse', name: title(c), url: SITE + courseUrl(c),
    ...(c.website ? { sameAs: [c.website] } : {}),
    address: { '@type': 'PostalAddress', addressLocality: c.town, ...(p && p.name !== 'Duitsland' ? { addressRegion: p.name } : {}), addressCountry: country(c) },
    ...(c.location ? { geo: { '@type': 'GeoCoordinates', latitude: c.location.lat, longitude: c.location.lon } } : {}),
    description: summary + ratingSentence,
  }];
  files[`banen/${c.id}.html`] = page({
    path: courseUrl(c), active: 'banen', body, jsonld,
    title: `${title(c)}${c.town && !title(c).includes(c.town) ? ` (${c.town})` : ''} – scorekaart, course rating en slope | Golfscore`,
    description: `${summary}${ratingSentence} Scorekaart met par en stroke index per hole en de ratings van ${rated.length} tees.`.slice(0, 300),
  });
}

// Handicap berekenen
{
  const hg = DEFAULT_COURSES.find((c) => c.id === 'hooge-graven');
  const tee = hg.tees.find((t) => t.id === 'geel');
  const hi = 18.4;
  const ch = Math.round(hi * tee.slope / 113 + (tee.rating - hg.parTotal));
  const ags = 90;
  const diff = Math.round((113 / tee.slope) * (ags - tee.rating) * 10) / 10;
  const faq = [
    ['Wat is een score differential?', `De score differential is de waarde van één ronde voor je handicap: 113 gedeeld door de slope, keer je aangepaste bruto score min de course rating. Op ${title(hg)} vanaf geel heren (course rating ${nl(tee.rating)}, slope ${tee.slope}) is een aangepaste score van ${ags} een differential van ${nl(diff)}.`],
    ['Hoe wordt de handicapindex berekend?', 'Je handicapindex is het gemiddelde van de 8 laagste score differentials uit je laatste 20 rondes. Heb je minder dan 20 rondes, dan gebruikt het World Handicap System een kleiner aantal met een correctie.'],
    ['Wat is mijn baanhandicap (course handicap)?', `Baanhandicap = handicapindex × slope / 113 + (course rating − par). Met handicapindex ${nl(hi)} op ${title(hg)} vanaf geel heren is dat ${nl(hi)} × ${tee.slope} / 113 + (${nl(tee.rating)} − ${hg.parTotal}) ≈ ${ch} slagen.`],
    ['Wat is netto double bogey?', 'Voor je handicap telt per hole hooguit netto double bogey: de par plus 2 plus de slagen die je op die hole krijgt. Zo telt één slechte hole niet te zwaar mee.'],
    ['Telt een 9-holes ronde mee?', 'Ja. Sinds 2024 berekent het WHS bij een 9-holes ronde de verwachte score voor de andere negen holes op basis van je handicapindex; samen geeft dat een 18-holes score differential.'],
  ];
  const body = `
  <section class="hero">
    ${crumbs([['Home', '/'], ['Handicap berekenen', '/handicap-berekenen.html']])}
    <h1>Handicap berekenen volgens het WHS</h1>
    <p class="lead">Zo berekent Golfscore na elke ronde je score differential en een indicatie van je handicapindex, volgens het World Handicap System dat de NGF in Nederland gebruikt.</p>
  </section>

  <section>
    <h2>De stappen</h2>
    <ol class="steps">
      <li><h3>Aangepaste bruto score</h3>Per hole telt hooguit <b>netto double bogey</b>: par + 2 + de slagen die je op die hole krijgt volgens je baanhandicap en de stroke index. Zonder handicap is het maximum par + 5.</li>
      <li><h3>Score differential</h3><b>113 / slope × (aangepaste bruto score − course rating)</b>. Voorbeeld op ${esc(title(hg))}, geel heren (CR ${nl(tee.rating)}, slope ${tee.slope}): een aangepaste score van ${ags} geeft 113 / ${tee.slope} × (${ags} − ${nl(tee.rating)}) = <b>${nl(diff)}</b>.</li>
      <li><h3>Handicapindex</h3>Het gemiddelde van de <b>8 laagste</b> score differentials uit je laatste 20 rondes. Bij minder rondes geldt een kleiner aantal.</li>
      <li><h3>Baanhandicap</h3><b>handicapindex × slope / 113 + (course rating − par)</b>, afgerond. Met index ${nl(hi)} op geel heren: ${ch} slagen.</li>
      <li><h3>9 holes</h3>Speel je 9 holes, dan gebruikt de app de officiële rating van die negen (holes 1–9 of 10–18) en vult hij de andere negen aan met de verwachte score bij je index, zoals het WHS sinds 2024 doet.</li>
    </ol>
  </section>

  <section>
    <h2>Course rating en slope rating</h2>
    <p>De <b>course rating</b> is de score die een scratchspeler (handicap 0) op een baan gemiddeld haalt, per tee en voor heren en dames apart. De <b>slope rating</b> (55–155, gemiddeld 113) geeft aan hoeveel moeilijker de baan is voor een gemiddelde speler dan voor een scratchspeler. Beide staan op de scorekaart of in de handicaptabellen van de club. Golfscore kent ze voor ${DEFAULT_COURSES.filter((c) => c.tees.some((t) => !t.ratingUnknown)).length} banen: zie het <a href="/banen.html">overzicht van de banen</a>.</p>
  </section>

  <section>
    <h2>Vragen</h2>
    ${faq.map(([q, a]) => `<details class="qa"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}
  </section>
  <p class="small muted">De berekening in de app is een indicatie. Je officiële handicapindex staat in de NGF-app (Golf.nl).</p>`;
  files['handicap-berekenen.html'] = page({
    path: '/handicap-berekenen.html', active: 'handicap', body,
    title: 'Handicap berekenen volgens het WHS – score differential, course rating en slope | Golfscore',
    description: 'Zo bereken je je golfhandicap volgens het World Handicap System: netto double bogey, score differential (113 / slope × (score − course rating)), handicapindex en baanhandicap, met een rekenvoorbeeld.',
    jsonld: [breadcrumb([['Home', '/'], ['Handicap berekenen', '/handicap-berekenen.html']]), {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    }],
  });
}

// Veelgestelde vragen
{
  const faq = [
    ['Wat is Golfscore?', 'Golfscore is een web-app om tijdens een golfronde je slagen in te spreken of per slag te tikken. De app toont met GPS de afstand tot de green en berekent na de ronde bruto, stableford, score differential en een handicapindicatie volgens het World Handicap System.'],
    ['Hoe spreek ik een score in?', 'Tik op de microfoon en zeg bijvoorbeeld “Hole 4, Rudy 5, Peter 4”. Speel je alleen, dan is “Hole 4, 5 slagen” genoeg. Golftermen zoals par, birdie en bogey werken ook.'],
    ['Werkt de app zonder internet?', 'Ja. Alles wordt eerst op je telefoon bewaard en de app opent ook zonder bereik. Zodra er weer verbinding is, wordt alles vanzelf gesynchroniseerd, op Android zelfs als de app dicht is.'],
    ['Hoe installeer ik Golfscore op mijn iPhone?', 'Open kaprudy.github.io/Golf in Safari, tik op de deelknop en kies “Zet op beginscherm”.'],
    ['Hoe installeer ik Golfscore op Android?', 'Open kaprudy.github.io/Golf in Chrome, tik op het menu (drie puntjes) en kies “App installeren” of “Toevoegen aan startscherm”.'],
    ['Heb ik een account nodig?', 'Nee. Je gegevens worden bewaard en gekoppeld aan je telefoon. Met een account met e-mailadres zie je ze ook terug op een nieuwe telefoon.'],
    ['Welke golfbanen staan erin?', `${DEFAULT_COURSES.length} banen in heel Nederland en net over de grens in Duitsland, met par, stroke index, course rating en slope per tee.`],
    ['Mijn baan staat er niet bij. Wat nu?', 'In de app voeg je zelf een baan toe via Instellingen. Je vult de par en stroke index per hole in en de course rating en slope van de tees.'],
    ['Telt een ronde op een par 3-baan mee voor mijn handicap?', 'Nee. Rondes op pitch & putt- en par 3-banen tellen in Golfscore niet mee voor de handicapindicatie; je ziet wel je score en stableford.'],
    ['Kan ik mijn telefoon op de buggy gebruiken?', 'Ja. Zet je telefoon in een houder op de buggy en tik op “Buggystand”, of leg hem dwars: dan vraagt de app het zelf. Je ziet groot de afstand tot de hole en telt de slagen met grote knoppen; het scherm blijft aan. Met de zonstand is het ook in fel zonlicht goed leesbaar.'],
    ['Hoe nauwkeurig is de afstand tot de green?', 'De app gebruikt de GPS van je telefoon, meestal tot op een paar meter nauwkeurig. De afstand is tot het midden van de green.'],
    ['Wat gebeurt er met mijn gegevens?', 'Alleen je spelers, banen en rondes worden bewaard, via een beveiligde verbinding. Je locatie tijdens de ronde blijft op je telefoon. Je kunt je account en gegevens altijd verwijderen in de app.'],
  ];
  const body = `
  <section class="hero">
    ${crumbs([['Home', '/'], ['Veelgestelde vragen', '/veelgestelde-vragen.html']])}
    <h1>Veelgestelde vragen</h1>
    <p class="lead">Over inspreken, installeren, werken zonder bereik, de banen en je handicap.</p>
  </section>
  <section>${faq.map(([q, a]) => `<details class="qa" open><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
  <p>Meer over de berekening: <a href="/handicap-berekenen.html">handicap berekenen volgens het WHS</a>. Alle banen: <a href="/banen.html">banen per provincie</a>.</p>`;
  files['veelgestelde-vragen.html'] = page({
    path: '/veelgestelde-vragen.html', active: 'faq', body,
    title: 'Veelgestelde vragen over Golfscore – inspreken, installeren, offline en handicap',
    description: 'Antwoorden op vragen over Golfscore: scores inspreken, installeren op iPhone en Android, werken zonder internet, welke golfbanen erin staan en hoe je handicap wordt berekend.',
    jsonld: [breadcrumb([['Home', '/'], ['Veelgestelde vragen', '/veelgestelde-vragen.html']]), {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    }],
  });
}

// Open gegevens, sitemap, robots en llms.txt
files['data/banen.json'] = `${JSON.stringify(courses.map((c) => ({
  id: c.id, name: title(c), town: c.town, province: c.province, url: SITE + courseUrl(c), website: c.website ?? null,
  location: c.location ?? null, holes: holesOf(c), par: parOf(c), pars: c.pars, strokeIndex: c.siUnknown ? null : c.si,
  shortCourse: isShortCourse(c), fromClubScorecard: official(c),
  tees: c.tees.map((t) => ({ name: t.name, gender: t.gender, courseRating: t.ratingUnknown ? null : t.rating, slope: t.ratingUnknown ? null : t.slope, lengths: t.lengths ?? null })),
})), null, 1)}\n`;

const pages = ['/', '/banen.html', '/handicap-berekenen.html', '/veelgestelde-vragen.html',
  ...provinces.map((p) => `/provincie/${p.slug}.html`), ...courses.map(courseUrl)];
files['sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${SITE}${p}</loc></url>`).join('\n')}
</urlset>
`;
files['robots.txt'] = `User-agent: *
Allow: /
Disallow: /admin.html
Disallow: /api/

Sitemap: ${SITE}/sitemap.xml
`;
files['llms.txt'] = `# Golfscore

> Golfscore is een Nederlandstalige web-app voor golfers: slagen inspreken of tikken tijdens de ronde, GPS-afstand tot de green, en na de ronde bruto, stableford, score differential en een handicapindicatie volgens het World Handicap System (WHS). De app werkt ook zonder bereik. Deze site bevat ook de scorekaarten, course ratings en slopes van ${DEFAULT_COURSES.length} golfbanen in Nederland en net over de grens.

- App: ${APP}
- Broncode: ${REPO}

## Pagina's

- [Home: hoe werkt het en installeren op Android en iPhone](${SITE}/)
- [Golfbanen per provincie](${SITE}/banen.html)
- [Handicap berekenen volgens het WHS](${SITE}/handicap-berekenen.html)
- [Veelgestelde vragen](${SITE}/veelgestelde-vragen.html)

## Provincies

${provinces.map((p) => `- [Golfbanen in ${p.name}](${SITE}/provincie/${p.slug}.html): ${p.courses.length} banen`).join('\n')}

## Gegevens

- [Alle banen als JSON](${SITE}/data/banen.json): per baan plaats, provincie, holes, par, par en stroke index per hole, en per tee course rating, slope en lengtes.

## Banen

${courses.map((c) => `- [${title(c)}](${SITE}${courseUrl(c)}): ${c.town ?? ''}, ${holesOf(c)} holes, par ${parOf(c)}`).join('\n')}
`;

// De pagina's die niet gegenereerd worden krijgen dezelfde stylesheet-link.
for (const rel of ['index.html']) {
  files[rel] = fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/href="\/style\.css(\?v=\w+)?"/, `href="${CSS}"`);
}

// ---------- Schrijven of controleren ----------

const check = process.argv.includes('--check');
const stale = [];
for (const [rel, content] of Object.entries(files)) {
  const file = path.join(ROOT, rel);
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (current === content) continue;
  if (check) { stale.push(rel); continue; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
// Pagina's van banen die niet meer bestaan opruimen
for (const dir of ['banen', 'provincie']) {
  const d = path.join(ROOT, dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) {
    if (files[`${dir}/${f}`]) continue;
    if (check) stale.push(`${dir}/${f} (overbodig)`); else fs.rmSync(path.join(d, f));
  }
}
if (check && stale.length) {
  console.error(`Website niet actueel (${stale.length}): ${stale.slice(0, 5).join(', ')}${stale.length > 5 ? ' …' : ''}\nDraai: node tools/build-site.mjs`);
  process.exit(1);
}
if (!check) console.log(`${Object.keys(files).length} bestanden in server/site/`);
