// Alle golfbanen rond een punt uit OpenStreetMap, met per baan de holes (tee, green, par, SI).
// Eén zoekopdracht voor het hele gebied; de holes worden per baan ingedeeld.
//   node tools/osm-region.mjs --lat 52.52 --lon 6.42 --radius 50000 > region.json
import { fetchArea, distanceM } from '../server/api/osm.js';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []));
const center = { lat: Number(args.lat ?? 52.52), lon: Number(args.lon ?? 6.42) };
const radius = Number(args.radius ?? 50000);

let area;
for (let i = 1; ; i++) {
  try { area = await fetchArea({ ...center, radius }); break; } catch (err) {
    if (i >= 4) throw err;
    console.error(`poging ${i} mislukt (${err.message}), opnieuw over ${45 * i} s`);
    await new Promise((r) => setTimeout(r, 45000 * i));
  }
}
const courses = area.courses
  .map((c) => ({ ...c, distanceKm: c.center ? Math.round(distanceM(center, c.center) / 100) / 10 : null, holeList: area.holes.filter((h) => h.course === c.osmId) }))
  .filter((c) => c.distanceKm != null && c.distanceKm <= radius / 1000)
  .sort((a, b) => a.distanceKm - b.distanceKm);
for (const c of courses) console.error(`${c.distanceKm} km  ${c.name}  ${c.website ?? '-'}  holes in OSM: ${c.holeList.length} (met nummer: ${c.holeList.filter((h) => h.ref).length}, met par: ${c.holeList.filter((h) => h.par).length})`);
console.log(JSON.stringify(courses));
