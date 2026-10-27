// Golfbaan uit OpenStreetMap (via de Overpass API). In OSM is elke hole een lijn van tee naar
// green (golf=hole, met ref = holenummer, par en handicap = stroke index); greens en tees zijn vlakken.
// Puur deel (parseOverpass) is los te testen; fetchCourse doet het verzoek.

// Hoofdserver plus reserves (de publieke Overpass-servers zijn soms overbelast).
const OVERPASS_URLS = (process.env.OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter,https://overpass.private.coffee/api/interpreter,https://maps.mail.ru/osm/tools/overpass/api/interpreter')
  .split(',').map((s) => s.trim()).filter(Boolean);

const rad = (d) => (d * Math.PI) / 180;
export function distanceM(a, b) {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}
const round6 = (p) => ({ lat: +p.lat.toFixed(6), lon: +p.lon.toFixed(6) });
const centroid = (pts) => round6({ lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length, lon: pts.reduce((s, p) => s + p.lon, 0) / pts.length });
const int = (v) => (/^\d+$/.test(String(v ?? '').trim()) ? Number(v) : null);

// Ligt punt p binnen de veelhoek (lijst {lat, lon})?
function inside(p, poly) {
  let ok = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if ((a.lat > p.lat) !== (b.lat > p.lat) && p.lon < ((b.lon - a.lon) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lon) ok = !ok;
  }
  return ok;
}

// Overpass-query: op naam van de baan, of rond een punt.
export function buildQuery({ name, lat, lon, radius = 2500, osmId }) {
  if (osmId) {
    // Eén baan op OSM-id ("way/123" of "relation/456"): de baan zelf en alles erbinnen.
    const [type, id] = String(osmId).split('/');
    if (!['way', 'relation'].includes(type) || !/^\d+$/.test(id)) throw new Error('Ongeldig OSM-id');
    return `[out:json][timeout:60];
${type}(${id})->.c;
.c map_to_area->.a;
(way(area.a)["golf"~"^(hole|green|tee)$"];)->.g;
(.c;.g;);
out geom;`;
  }
  if (name) {
    const safe = String(name).replace(/[^\p{L}\p{N} '-]/gu, '').slice(0, 60);
    return `[out:json][timeout:25];
(way["leisure"="golf_course"]["name"~"${safe}",i];relation["leisure"="golf_course"]["name"~"${safe}",i];)->.c;
.c map_to_area->.a;
(way(area.a)["golf"~"^(hole|green|tee)$"];)->.g;
(.c;.g;);
out geom;`;
  }
  const at = `${Number(lat).toFixed(5)},${Number(lon).toFixed(5)}`;
  const r = Math.min(5000, Math.max(200, Number(radius) || 2500));
  return `[out:json][timeout:25];
(way["leisure"="golf_course"](around:${r},${at});relation["leisure"="golf_course"](around:${r},${at});
 way["golf"~"^(hole|green|tee)$"](around:${r},${at}););
out geom;`;
}

export function parseOverpass(json) {
  const elements = json?.elements ?? [];
  const geom = (e) => (e.geometry ?? []).filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lon));

  const courses = [];
  for (const e of elements) {
    if (e.tags?.leisure !== 'golf_course') continue;
    // Relatie: buitenringen samenvoegen tot één lijst punten (genoeg voor punt-in-veelhoek per ring).
    const rings = e.type === 'relation'
      ? (e.members ?? []).filter((m) => m.role !== 'inner').map((m) => geom(m)).filter((g) => g.length > 2)
      : [geom(e)].filter((g) => g.length > 2);
    courses.push({ osmId: `${e.type}/${e.id}`, name: e.tags.name ?? 'Golfbaan', rings, center: rings.length ? centroid(rings.flat()) : null,
      website: e.tags.website ?? e.tags['contact:website'] ?? null, holesTag: Number(e.tags.holes) || null });
  }

  const greens = elements.filter((e) => e.tags?.golf === 'green').map((e) => ({ ref: int(e.tags.ref), center: centroid(geom(e)), poly: geom(e) }))
    .filter((g) => g.poly.length > 2);

  const holes = [];
  for (const e of elements) {
    if (e.tags?.golf !== 'hole') continue;
    const line = geom(e);
    if (line.length < 2) continue;
    const tee = round6(line[0]);
    const end = round6(line.at(-1));
    // Midden van de green: de greenvlakte waar de lijn eindigt (of de dichtstbijzijnde binnen 40 m).
    const green = greens.find((g) => inside(end, g.poly))
      ?? greens.map((g) => ({ g, d: distanceM(end, g.center) })).filter((x) => x.d < 40).sort((a, b) => a.d - b.d)[0]?.g;
    let length = 0;
    for (let i = 1; i < line.length; i++) length += distanceM(line[i - 1], line[i]);
    const course = courses.find((c) => c.rings.some((r) => inside(tee, r)));
    holes.push({
      osmId: `way/${e.id}`,
      course: course?.osmId ?? null,
      ref: int(e.tags.ref),
      par: int(e.tags.par),
      si: int(e.tags.handicap),
      name: e.tags.name ?? null,
      tee,
      green: green?.center ?? end,
      greenFromArea: Boolean(green),
      lengthM: Math.round(length),
    });
  }
  holes.sort((a, b) => (a.course ?? '').localeCompare(b.course ?? '') || (a.ref ?? 99) - (b.ref ?? 99));
  return {
    source: 'OpenStreetMap',
    courses: courses.map(({ osmId, name, center, website, holesTag }) => ({ osmId, name, center, website, holesTag, holes: holes.filter((h) => h.course === osmId).length })),
    holes,
    greens: greens.length,
    tees: elements.filter((e) => e.tags?.golf === 'tee').length,
  };
}

export async function fetchCourse(params, opts = {}) {
  const { json, server } = await overpass(buildQuery(params), opts);
  return { ...parseOverpass(json), server };
}

// Golfbanen rond een punt: naam, website, aantal holes volgens OSM, midden.
export async function listCourses({ lat, lon, radius = 50000 }, opts = {}) {
  const r = Math.min(80000, Math.max(1000, Number(radius) || 50000));
  // Rechthoek om de cirkel: veel lichter voor Overpass dan 'around' met een grote straal.
  const dLat = r / 111320;
  const dLon = r / (111320 * Math.cos((Number(lat) * Math.PI) / 180));
  const bbox = [Number(lat) - dLat, Number(lon) - dLon, Number(lat) + dLat, Number(lon) + dLon].map((v) => v.toFixed(4)).join(',');
  const { json } = await overpass(`[out:json][timeout:120][bbox:${bbox}];
(way["leisure"="golf_course"];relation["leisure"="golf_course"];);
out center tags;`, opts);
  return (json.elements ?? []).map((e) => ({
    osmId: `${e.type}/${e.id}`,
    name: e.tags?.name ?? null,
    website: e.tags?.website ?? e.tags?.['contact:website'] ?? null,
    holes: Number(e.tags?.holes) || null,
    par: Number(e.tags?.par) || null,
    center: e.center ? { lat: +e.center.lat.toFixed(5), lon: +e.center.lon.toFixed(5) } : null,
    distanceKm: e.center ? Math.round(distanceM({ lat: Number(lat), lon: Number(lon) }, e.center) / 100) / 10 : null,
  })).sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
}

export async function overpass(query, { fetchImpl = fetch, urls = OVERPASS_URLS } = {}) {
  const body = `data=${encodeURIComponent(query)}`;
  const problems = [];
  for (const url of urls) {
    const host = new URL(url).host;
    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'User-Agent': 'Golfscore/1.0 (https://golf.kapital.nl)',
        },
        body,
        signal: AbortSignal.timeout(Number(process.env.OVERPASS_TIMEOUT_MS ?? 38000)),
      });
      if (res.ok) return { json: await res.json(), server: host };
      problems.push(`${host}: ${res.status}`);
    } catch (err) {
      problems.push(`${host}: ${err.cause?.code ?? err.name ?? err.message}`);
    }
  }
  throw new Error(`OpenStreetMap niet bereikbaar (${problems.join('; ')})`);
}

// Alles in een rechthoek in één keer: banen en hun holes, greens en tees.
export async function fetchArea({ lat, lon, radius = 50000 }, opts = {}) {
  const r = Math.min(80000, Math.max(1000, Number(radius) || 50000));
  const dLat = r / 111320;
  const dLon = r / (111320 * Math.cos((Number(lat) * Math.PI) / 180));
  const bbox = [Number(lat) - dLat, Number(lon) - dLon, Number(lat) + dLat, Number(lon) + dLon].map((v) => v.toFixed(4)).join(',');
  const { json, server } = await overpass(`[out:json][timeout:180][bbox:${bbox}];
(way["leisure"="golf_course"];relation["leisure"="golf_course"];way["golf"~"^(hole|green|tee)$"];);
out geom;`, opts);
  return { ...parseOverpass(json), server };
}
