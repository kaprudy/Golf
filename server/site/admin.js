// Beheeroverzicht (admin.html). Los bestand, zodat de pagina geen inline scripts nodig heeft (CSP).
const TOKEN_KEY = 'golfscore-admin';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('nl-NL');
const pct = (x) => (x == null ? '–' : `${Math.round(x * 100)}%`);
const date = (iso) => (iso ? new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : '–');
const dateTime = (iso) => (iso ? new Date(iso).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '–');
// Telefoon van een account: model (als de browser het geeft), systeem, browser, scherm.
const deviceCell = (d) => {
  if (!d) return '<span class="muted">onbekend</span>';
  const main = d.model || d.os || 'onbekend';
  const sub = [d.model ? d.os : null, d.browser, d.screen, d.installed ? 'geïnstalleerd' : 'in browser',
    d.persisted === false ? 'opslag niet blijvend' : null].filter(Boolean).join(' · ');
  return `<b>${esc(main)}</b>${sub ? `<br><span class="muted small">${esc(sub)}</span>` : ''}`;
};
let token = sessionStorage.getItem(TOKEN_KEY);

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(data?.error ?? `Fout ${res.status}`), { status: res.status });
  return data;
}

function showLogin(message) {
  $('#login').hidden = false;
  $('#dash').hidden = true;
  $('#actions').hidden = true;
  $('#login-error').innerHTML = message ? `<div class="alert" role="alert"><strong>Geen toegang.</strong> ${esc(message)}</div>` : '';
}

async function load() {
  try {
    const o = await api('GET', '/api/admin/overview');
    $('#login').hidden = true;
    $('#actions').hidden = false;
    $('#dash').hidden = false;
    render(o);
  } catch (err) {
    if (err.status === 401) { token = null; sessionStorage.removeItem(TOKEN_KEY); showLogin(); }
    else if (err.status === 403) {
      const id = await api('GET', '/api/me').then((r) => r.user.id).catch(() => null);
      showLogin(`Dit account${id ? ` (id ${id})` : ''} is geen beheerder. Zet ADMIN_USER_IDS=${id ?? '<id>'} in server/.env op de server.`);
    }
    else showLogin(err.message);
  }
}

// Laatste 30 dagen, ook dagen zonder iets
function last30(rows, pick) {
  const map = new Map(rows.map((r) => [r.day, r]));
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 864e5).toISOString().slice(0, 10);
    return { day: d, values: pick(map.get(d)) };
  });
}

function barChart(id, days, series) {
  const max = Math.max(1, ...days.map((d) => d.values.reduce((a, b) => a + b, 0)));
  const cols = days.map((d, i) => {
    const total = d.values.reduce((a, b) => a + b, 0);
    const lastIdx = d.values.map((v, k) => (v ? k : -1)).filter((k) => k >= 0).pop();
    const segs = d.values.map((v, k) => (v ? `<div class="seg ${k === lastIdx ? 'top' : ''}" style="height:calc(${(v / max) * 100}% - 2px);background:${series[k].color}"></div>` : '')).join('');
    const tip = `${date(d.day)}: ${series.map((s, k) => `${s.name} ${d.values[k]}`).join(' · ')}${series.length > 1 ? ` · totaal ${total}` : ''}${d.extra ? ` · ${d.extra}` : ''}`;
    return `<div class="col" data-tip="${esc(tip)}" data-i="${i}">${segs}</div>`;
  }).join('');
  return `<div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}<span class="max">max ${max} per dag</span></div>
    <div class="chart" id="${id}"><div class="bars">${cols}</div>
    <div class="axis"><span>${date(days[0].day)}</span><span>vandaag</span></div></div>`;
}

function render(o) {
  $('#stamp').textContent = `Bijgewerkt ${dateTime(o.generatedAt)}`;
  const css = getComputedStyle(document.documentElement);
  const cEmail = css.getPropertyValue('--s-email').trim();
  const cAnon = css.getPropertyValue('--s-anon').trim();
  const learnedCount = Object.keys(o.vocab.numbers).length + o.vocab.holeWords.length;
  const regDays = last30(o.registrations, (r) => [r?.email ?? 0, r?.anonymous ?? 0]);
  const sampleDays = last30(o.samples.perDay, (r) => [r?.count ?? 0]);
  const sessionDays = last30(o.sessions.perDay, (r) => [r?.count ?? 0]).map((d) => ({ ...d, users: o.sessions.perDay.find((r) => r.day === d.day)?.users ?? 0 }));
  const share = (n, of) => (of ? `${Math.round((n / of) * 100)}%` : '–');

  $('#dash').innerHTML = `
    <div class="tiles">
      <div class="tile"><div class="label">Accounts</div><div class="value">${nf.format(o.users.total)}</div><div class="sub">${o.users.email} met e-mail · ${o.users.anonymous} anoniem</div></div>
      <div class="tile"><div class="label">Nieuw</div><div class="value">${nf.format(o.users.last7)}</div><div class="sub">afgelopen 7 dagen · ${o.users.last30} in 30 dagen</div></div>
      <div class="tile"><div class="label">Sessies (7 dagen)</div><div class="value">${nf.format(o.sessions.last7)}</div><div class="sub">door ${o.sessions.users7} gebruiker(s) · vandaag ${o.sessions.today} door ${o.sessions.usersToday}</div></div>
      <div class="tile"><div class="label">GPS aan</div><div class="value">${share(o.sessions.gpsUsers, o.sessions.users30)}</div><div class="sub">${o.sessions.gpsUsers} van ${o.sessions.users30} gebruikers (30 dagen)</div></div>
      <div class="tile"><div class="label">Op beginscherm gezet</div><div class="value">${share(o.sessions.installed, o.sessions.users30)}</div><div class="sub">${o.sessions.installed} van ${o.sessions.users30} gebruikers (30 dagen)</div></div>
      <div class="tile"><div class="label">Actief (gesynchroniseerd)</div><div class="value">${nf.format(o.active.d7)}</div><div class="sub">7 dagen · vandaag ${o.active.d1} · 30 dagen ${o.active.d30}</div></div>
      <div class="tile"><div class="label">Spraakvoorbeelden</div><div class="value">${nf.format(o.samples.total)}</div><div class="sub">van ${o.samples.users} gebruiker(s) · ${o.samples.last7} deze week</div></div>
      <div class="tile"><div class="label">Meteen goed verstaan</div><div class="value">${pct(o.samples.firstTimeRight)}</div><div class="sub">verstaan = eindscore op de kaart</div></div>
      <div class="tile"><div class="label">Geleerde woorden</div><div class="value">${learnedCount}</div><div class="sub">gebruikt door alle apps</div></div>
    </div>

    <div class="two">
      <div class="card"><h2>Sessies</h2><p class="muted small">Keren dat de app geopend werd per dag (na een half uur weg telt terugkomen opnieuw), laatste 30 dagen.</p>
        ${barChart('ses', sessionDays.map((d) => ({ ...d, extra: `${d.users} gebruiker(s)` })), [{ name: 'Sessies', color: cEmail }])}</div>
      <div class="card"><h2>Rondes per baan</h2><p class="muted small">Laatste 30 dagen. Opgeslagen = met “Ronde opslaan” of bewaard bij het starten van een nieuwe ronde.</p>
        <div class="scroll"><table><tr><th>Baan</th><th class="num">Gestart</th><th class="num">Opgeslagen</th><th class="num">Spelers (accounts)</th></tr>
        ${o.rounds.map((r) => `<tr><td>${esc(r.name)}</td><td class="num">${r.started}</td><td class="num">${r.saved}</td><td class="num">${r.users}</td></tr>`).join('')
          || '<tr><td colspan="4" class="muted">Nog geen rondes.</td></tr>'}</table></div></div>
    </div>

    <div class="two" style="margin-top:16px">
      <div class="card"><h2>Registraties</h2><p class="muted small">Nieuwe accounts per dag, laatste 30 dagen. Een anoniem account dat later een e-mailadres kreeg telt als e-mail.</p>
        ${barChart('reg', regDays, [{ name: 'Met e-mail', color: cEmail }, { name: 'Anoniem', color: cAnon }])}</div>
      <div class="card"><h2>Gedeelde spraak</h2><p class="muted small">Ingesproken zinnen per dag (alleen met toestemming), laatste 30 dagen.</p>
        ${barChart('smp', sampleDays, [{ name: 'Zinnen', color: cEmail }])}</div>
    </div>

    <div class="card"><h2>Wat de app leert</h2>
      <p class="muted small">Woorden die de spraakherkenning opschrijft en die de app (nog) niet kende. Een woord wordt geleerd bij minstens 3 keer en 80% dezelfde betekenis.</p>
      <div class="scroll"><table>
        <tr><th>Woord</th><th>Soort</th><th>Betekent</th><th class="num">Keer</th><th class="num">Gebruikers</th><th class="num">Eenduidig</th><th>Status</th></tr>
        ${o.candidates.map((c) => `<tr><td><b>${esc(c.word)}</b></td><td>${c.kind === 'hole' ? 'woord voor “hole”' : 'getal'}</td>
          <td>${c.kind === 'hole' ? 'hole' : esc(c.value)}</td><td class="num">${c.count}</td><td class="num">${c.users}</td><td class="num">${pct(c.share)}</td>
          <td>${c.learned ? '<span class="pill ok">geleerd</span>' : `<span class="pill">${c.count < 3 ? `nog ${3 - c.count}× nodig` : 'te wisselend'}</span>`}</td></tr>`).join('')
          || '<tr><td colspan="7" class="muted">Nog geen onbekende woorden.</td></tr>'}
      </table></div>
    </div>

    <div class="card"><h2>Laatste ingesproken zinnen</h2>
      <p class="muted small">Zoals gedeeld: spelers zijn s1, s2…; andere namen x. Rood = de app verstond iets anders dan er uiteindelijk op de kaart stond.</p>
      <div class="scroll"><table>
        <tr><th>Wanneer</th><th class="num">Hole</th><th>Verstaan</th><th>App las</th><th>Op de kaart</th><th></th></tr>
        ${o.recentSamples.map((s) => {
          const keys = [...new Set([...Object.keys(s.final ?? {}), ...Object.keys(s.parsed ?? {})])].sort();
          const fmt = (obj) => keys.map((k) => `${k}: ${obj?.[k] ?? '–'}`).join(', ') || '–';
          const wrong = keys.some((k) => (s.parsed ?? {})[k] !== (s.final ?? {})[k]);
          return `<tr><td>${dateTime(s.createdAt)}</td><td class="num">${esc(s.hole)}</td><td class="text">${esc(s.texts?.[0])}</td>
            <td>${esc(fmt(s.parsed))}</td><td class="${wrong ? 'diff' : ''}">${esc(fmt(s.final))}</td><td>${s.ai ? '<span class="pill">AI</span>' : ''}</td></tr>`;
        }).join('') || '<tr><td colspan="6" class="muted">Nog niets gedeeld.</td></tr>'}
      </table></div>
    </div>

    <div class="card"><h2>GPS-punten van de banen</h2>
      <p class="muted small">Tees en greens die gebruikers tijdens een ronde vastlegden, per hole samengevoegd (mediaan). “Spreiding” is hoe ver het verste punt van het midden ligt: groot = iemand tikte op de verkeerde plek. Locaties van spelers zelf komen niet op de server.</p>
      ${o.geo.length ? `<label class="small">Baan <select id="geo-course">${o.geo.map((c, i) => `<option value="${i}">${esc(c.name)}</option>`).join('')}</select></label>
        <div id="geo-detail"></div>` : '<p class="muted">Nog geen punten vastgelegd.</p>'}
    </div>

    <div class="card"><h2>Accounts</h2>
      <p class="muted small">De nieuwste 100. Scores en rondes zelf zijn hier niet te zien, alleen aantallen. Wie GPS-punten mag vastleggen, ziet in de app de knoppen “Ik sta op de tee/green”; alleen hun punten tellen mee in het overzicht hierboven.</p>
      <div class="scroll"><table>
        <tr><th class="num">#</th><th>Account</th><th>Aangemaakt</th><th>Telefoon</th><th>Laatst geopend</th><th class="num">Keer geopend</th><th>Laatst gesynchroniseerd</th><th class="num">Rondes</th><th class="num">Spelers</th><th class="num">Zinnen gedeeld</th><th>GPS-punten vastleggen</th></tr>
        ${o.recentUsers.map((u) => `<tr><td class="num">${u.id}</td><td>${u.email ? esc(u.email) : '<span class="muted">anoniem (telefoon)</span>'}</td>
          <td>${dateTime(u.createdAt)}</td><td>${deviceCell(u.device)}</td><td>${dateTime(u.lastOpen)}</td><td class="num">${u.opens || '–'}</td><td>${dateTime(u.lastSync)}</td><td class="num">${u.rounds ?? '–'}</td><td class="num">${u.players ?? '–'}</td><td class="num">${u.samples}</td>
          <td>${u.admin ? '<span class="pill ok">beheerder</span>' : `<label class="small"><input type="checkbox" data-perm="gps-mark" data-user="${u.id}" ${u.perms?.includes('gps-mark') ? 'checked' : ''}> mag</label>`}</td></tr>`).join('')}
      </table></div>
    </div>`;

  if (o.geo.length) {
    const show = (i) => renderGeo(o.geo[i]);
    $('#geo-course').addEventListener('change', (e) => show(Number(e.target.value)));
    show(0);
  }

  // Tooltip per dag (de hele kolom is het doel)
  for (const chart of document.querySelectorAll('.chart')) {
    const tip = document.createElement('div');
    tip.className = 'tip';
    tip.hidden = true;
    chart.append(tip);
    chart.addEventListener('pointerover', (e) => {
      const col = e.target.closest('.col');
      if (!col) return;
      tip.textContent = col.dataset.tip;
      tip.hidden = false;
      const r = col.getBoundingClientRect();
      const c = chart.getBoundingClientRect();
      const x = Math.min(Math.max(r.left - c.left + r.width / 2, 90), c.width - 90);
      tip.style.left = `${x}px`;
      tip.style.top = '0px';
    });
    chart.addEventListener('pointerleave', () => { tip.hidden = true; });
  }
}

// ---------- GPS-kaart (Leaflet + OpenStreetMap, alleen geladen als er punten zijn) ----------

let leaflet = null;
let map = null;
function loadLeaflet() {
  leaflet ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    // Alleen deze exacte versie (Subresource Integrity): een gewijzigd bestand op het CDN wordt geweigerd.
    s.integrity = 'sha512-puJW3E/qXDqYp9IfhAI54BJEaWIfloJ7JWs7OeD5i6ruC9JZL1gERT1wjtwXFlh7CjE7ZJ+/vcRZRkIYIb6p4g==';
    s.crossOrigin = 'anonymous';
    s.onload = () => resolve(window.L);
    s.onerror = reject;
    document.head.append(s);
  });
  return leaflet;
}

async function renderGeo(course) {
  const holes = [...new Set(course.points.map((p) => p.hole))].sort((a, b) => a - b);
  const get = (h, kind) => course.points.find((p) => p.hole === h && p.kind === kind);
  const tees = course.points.filter((p) => p.kind === 'tee').length;
  const greens = course.points.filter((p) => p.kind === 'green').length;
  const css = getComputedStyle(document.documentElement);
  const cTee = css.getPropertyValue('--s-anon').trim();
  const cGreen = css.getPropertyValue('--s-email').trim();
  const cell = (p) => (p ? `${p.n}× · ${p.spreadM} m` : '<span class="muted">–</span>');
  $('#geo-detail').innerHTML = `<p class="small">${tees} tees en ${greens} greens vastgelegd.</p>
    <div class="legend"><span><i style="background:${cTee}"></i>Tee</span><span><i style="background:${cGreen}"></i>Green</span></div>
    <div class="map" id="geo-map" role="img" aria-label="Kaart met vastgelegde tees en greens"></div>
    <div class="scroll" style="margin-top:12px"><table>
      <tr><th class="num">Hole</th><th>Tee (mensen · spreiding)</th><th>Green (mensen · spreiding)</th><th class="num">Tee → green</th></tr>
      ${holes.map((h) => { const t = get(h, 'tee'); const g = get(h, 'green');
        return `<tr><td class="num">${h}</td><td>${cell(t)}</td><td>${cell(g)}</td><td class="num">${t && g ? `${Math.round(distM(t, g))} m` : '–'}</td></tr>`; }).join('')}
    </table></div>`;
  try {
    const L = await loadLeaflet();
    map?.remove();
    map = L.map('geo-map', { scrollWheelZoom: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    const bounds = [];
    for (const h of holes) {
      const t = get(h, 'tee');
      const g = get(h, 'green');
      if (t && g) L.polyline([[t.lat, t.lon], [g.lat, g.lon]], { color: cGreen, weight: 2, opacity: .6, dashArray: '4 6' }).addTo(map);
      for (const p of [t, g].filter(Boolean)) {
        bounds.push([p.lat, p.lon]);
        L.marker([p.lat, p.lon], { icon: L.divIcon({ className: 'hole-label', html: `<span style="background:${p.kind === 'tee' ? cTee : cGreen}">${h}</span>`, iconSize: [26, 20], iconAnchor: [13, 10] }) })
          .bindTooltip(`Hole ${h} ${p.kind === 'tee' ? 'tee' : 'green'} · ${p.n} ${p.n === 1 ? 'persoon' : 'mensen'} · spreiding ${p.spreadM} m`)
          .addTo(map);
      }
    }
    if (bounds.length) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 });
  } catch {
    $('#geo-map').innerHTML = '<p class="muted small" style="padding:12px">Kaart kon niet laden.</p>';
  }
}

function distM(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const r = await api('POST', '/api/login', { email: $('#email').value.trim(), password: $('#password').value });
    token = r.token;
    sessionStorage.setItem(TOKEN_KEY, token);
    $('#password').value = '';
    load();
  } catch (err) {
    showLogin(err.message);
  }
});
$('#refresh').addEventListener('click', load);

// Rechten per account (bijv. tees en greens vastleggen met GPS)
document.addEventListener('change', async (e) => {
  const box = e.target.closest('[data-perm]');
  if (!box) return;
  box.disabled = true;
  try {
    await api('POST', '/api/admin/perms', { userId: Number(box.dataset.user), perm: box.dataset.perm, on: box.checked });
  } catch (err) {
    box.checked = !box.checked;
    alert(`Opslaan lukte niet: ${err.message}`);
  } finally {
    box.disabled = false;
  }
});
$('#logout').addEventListener('click', async () => {
  try { await api('POST', '/api/logout'); } catch { /* toch uitloggen */ }
  token = null;
  sessionStorage.removeItem(TOKEN_KEY);
  showLogin();
});

if (token) load(); else showLogin();
