// Gedeelde uitslag van een ronde: wat de app meestuurt controleren, en de openbare pagina
// (golf.kapital.nl/u/<id>) die je via WhatsApp deelt. Alleen namen, holes, par en scores;
// totalen rekent de server zelf uit.

const SITE = 'https://golf.kapital.nl';
const APP = 'https://kaprudy.github.io/Golf/';

export class ShareError extends Error {}

const str = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);

export function cleanShare(b) {
  const holes = Array.isArray(b?.holes) ? b.holes.slice(0, 18).map((h) => int(h, 1, 18)) : [];
  if (!holes.length || holes.includes(null)) throw new ShareError('Geen geldige holes');
  const pars = holes.map((_, i) => int(b.pars?.[i], 2, 7));
  const players = (Array.isArray(b.players) ? b.players : []).slice(0, 8).map((p) => ({
    name: str(p?.name, 40) || 'Speler',
    scores: holes.map((_, i) => int(p?.scores?.[i], 1, 20)),
    stableford: int(p?.stableford, 0, 200),
  })).filter((p) => p.scores.some((s) => s != null));
  if (!players.length) throw new ShareError('Nog geen scores om te delen');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(b.date ?? '') && !Number.isNaN(Date.parse(b.date)) ? b.date : new Date().toISOString().slice(0, 10);
  return { course: str(b.course, 80) || 'Golfbaan', date, tee: str(b.tee, 40) || null, holes, pars, players };
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const signed = (n) => (n > 0 ? `+${n}` : n === 0 ? 'E' : String(n));

// Bruto en stand t.o.v. par over de gespeelde holes
function totals(share, p) {
  let gross = 0, par = 0, played = 0;
  p.scores.forEach((s, i) => { if (s != null) { gross += s; par += share.pars[i] ?? 0; played++; } });
  return { gross, toPar: gross - par, played };
}

const dateText = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Amsterdam' });

// Eén zin voor WhatsApp en de voorvertoning: "Rudy 84 (+12) · Peter 90 (+18)"
export function shareSummary(share) {
  return ranked(share).map(({ p, t }) => `${p.name} ${t.gross} (${signed(t.toPar)})`).join(' · ');
}

function ranked(share) {
  const rows = share.players.map((p) => ({ p, t: totals(share, p) }));
  const allStableford = rows.every((r) => r.p.stableford != null);
  return rows.sort((a, b) => (b.t.played - a.t.played)
    || (allStableford ? b.p.stableford - a.p.stableford : a.t.toPar - b.t.toPar));
}

function term(s, par) {
  if (s == null || par == null) return '';
  const d = s - par;
  return d <= -2 ? 'eagle' : d === -1 ? 'birdie' : d === 0 ? 'par' : d === 1 ? 'bogey' : d === 2 ? 'double' : 'worse';
}

// "18 holes", "holes 1–9", of bij losse holes "7 holes"
function holesText(holes) {
  const run = holes.every((h, i) => i === 0 || h === holes[i - 1] + 1);
  return holes.length === 18 || !run ? `${holes.length} holes` : `holes ${holes[0]}–${holes.at(-1)}`;
}

export function renderSharePage(id, share) {
  const title = `${share.course}, ${dateText(share.date)}`;
  const summary = shareSummary(share);
  const rows = ranked(share);
  const anyStableford = share.players.some((p) => p.stableford != null);
  const url = `${SITE}/u/${id}`;
  const n = share.holes.length;
  const parTotal = share.pars.reduce((a, b) => a + (b ?? 0), 0);

  const standing = rows.map(({ p, t }, i) => `<tr><td class="num">${i + 1}</td><th scope="row">${esc(p.name)}</th>
      <td class="num"><b>${t.gross}</b></td><td class="num">${signed(t.toPar)}</td>${anyStableford ? `<td class="num">${p.stableford ?? '–'}</td>` : ''}
      <td class="num muted">${t.played < n ? `${t.played} van ${n}` : n}</td></tr>`).join('');

  const head = `<tr><th scope="col">Hole</th>${share.holes.map((h) => `<th scope="col">${h}</th>`).join('')}<th scope="col">Tot</th></tr>
    <tr class="par"><th scope="row">Par</th>${share.pars.map((p) => `<td>${p ?? ''}</td>`).join('')}<td>${parTotal || ''}</td></tr>`;
  const card = rows.map(({ p, t }) => `<tr><th scope="row">${esc(p.name)}</th>${p.scores.map((s, i) => `<td class="${term(s, share.pars[i])}">${s ?? '·'}</td>`).join('')}<td><b>${t.gross}</b></td></tr>`).join('');

  return `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Uitslag ${esc(title)} · Golfscore</title>
  <meta name="robots" content="noindex">
  <meta name="description" content="${esc(summary)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Golfscore">
  <meta property="og:title" content="⛳ ${esc(title)}">
  <meta property="og:description" content="${esc(summary)} · bijgehouden met Golfscore">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE}/img/ronde.webp">
  <meta property="og:locale" content="nl_NL">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=DM+Sans:wght@400;500;600&display=swap">
  <link rel="stylesheet" href="/style.css">
  <style>
    .standing td.num, .standing th.num { text-align: right; }
    .standing th[scope=row] { text-align: left; font-weight: 600; }
    .card tr.par td, .card tr.par th { color: var(--muted); }
    .card td { border-radius: 0; }
    .card td.eagle { background: #F3E6B5; color: #6B5310; } .card td.birdie { background: #DCE6F2; color: #24365C; }
    .card td.bogey { background: #F6E3CF; color: #8F3F0C; } .card td.double, .card td.worse { background: #F2D3C4; color: #7A2E12; }
    @media (prefers-color-scheme: dark) {
      .card td.eagle { background: #4A3F14; color: #F3DF94; } .card td.birdie { background: #22324A; color: #BCD0EC; }
      .card td.bogey { background: #4A2E1C; color: #F4C9A4; } .card td.double, .card td.worse { background: #522718; color: #F2B49A; }
    }
    .legend-row { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: .85rem; color: var(--muted); margin-top: 8px; }
    .legend-row span::before { content: ''; display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; background: var(--c); }
    .cta-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 12px; }
  </style>
</head>
<body>
<nav class="nav" aria-label="Hoofdmenu">
  <div class="nav-in">
    <a class="brand" href="/">Golfscore</a>
    <a href="/banen.html">Banen</a>
    <a class="cta" href="${APP}">Open de app</a>
  </div>
</nav>
<main>
  <section class="hero">
    <div class="overline">Uitslag · ${esc(dateText(share.date))}</div>
    <h1>${esc(share.course)}</h1>
    <p class="lead">${holesText(share.holes)}${share.tee ? ` · ${esc(share.tee)}` : ''} · ${share.players.length} ${share.players.length === 1 ? 'speler' : 'spelers'}</p>
  </section>

  <section>
    <h2>Stand</h2>
    <div class="table-scroll"><table class="standing">
      <thead><tr><th class="num">#</th><th>Speler</th><th class="num">Bruto</th><th class="num">Par</th>${anyStableford ? '<th class="num">Stableford</th>' : ''}<th class="num">Holes</th></tr></thead>
      <tbody>${standing}</tbody>
    </table></div>
  </section>

  <section>
    <h2>Scorekaart</h2>
    <div class="table-scroll"><table class="card"><thead>${head}</thead><tbody>${card}</tbody></table></div>
    <div class="legend-row" aria-hidden="true"><span style="--c:#E8C33A">eagle of beter</span><span style="--c:#7FA3D1">birdie</span><span style="--c:#E9A86E">bogey</span><span style="--c:#D9805F">dubbel bogey of meer</span></div>
  </section>

  <section class="sand">
    <h2>Zelf je scores bijhouden?</h2>
    <p>Deze uitslag is bijgehouden met <b>Golfscore</b>. Spreek je slagen in terwijl je loopt (“Hole 4, Rudy 5, Peter 4”), zie de afstand tot de hole en krijg na de ronde direct de stand en je handicapberekening. Gratis, zonder account, en het werkt ook zonder bereik.</p>
    <div class="cta-row"><a class="cta" href="${APP}">Open de app</a><a href="/#installeren">Zo zet je hem op je telefoon →</a></div>
  </section>
</main>
<footer class="site-footer">
  <div class="footer-in">
    <div><b>Golfscore</b> · golfscores inspreken, GPS-afstanden en handicap volgens WHS</div>
    <div class="footer-links"><a href="/">Home</a> <a href="/banen.html">Banen</a> <a href="/handicap-berekenen.html">Handicap berekenen</a> <a href="/veelgestelde-vragen.html">Veelgestelde vragen</a></div>
  </div>
</footer>
</body>
</html>`;
}

export function renderNotFound() {
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Uitslag niet gevonden · Golfscore</title><meta name="robots" content="noindex"><link rel="stylesheet" href="/style.css"></head>
<body><main><section class="hero"><h1>Uitslag niet gevonden</h1><p class="lead">Deze link bestaat niet (meer). Misschien is hij niet helemaal gekopieerd.</p>
<p><a class="cta" href="${APP}">Open Golfscore</a> <a href="/">Meer over Golfscore</a></p></section></main></body></html>`;
}
