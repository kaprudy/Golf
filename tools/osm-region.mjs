// Alle golfbanen rond een punt uit OpenStreetMap, met per baan de holes (tee, green, par, SI).
//   node tools/osm-region.mjs --lat 52.52 --lon 6.42 --radius 50000 > region.json
import { listCourses, fetchCourse } from '../server/api/osm.js';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []));
// Publieke Overpass-servers zijn soms overbelast: een paar keer opnieuw proberen.
async function retry(fn, tries = 4) {
  for (let i = 1; ; i++) {
    try { return await fn(); } catch (err) {
      if (i >= tries) throw err;
      console.error(`poging ${i} mislukt (${err.message}), opnieuw over ${30 * i} s`);
      await new Promise((r) => setTimeout(r, 30000 * i));
    }
  }
}
const center = { lat: Number(args.lat ?? 52.52), lon: Number(args.lon ?? 6.42) };
const courses = (await retry(() => listCourses({ ...center, radius: Number(args.radius ?? 50000) })))
  .filter((c) => c.distanceKm == null || c.distanceKm <= Number(args.radius ?? 50000) / 1000);
console.error(`${courses.length} banen gevonden`);
for (const c of courses) {
  try {
    const detail = await retry(() => fetchCourse({ osmId: c.osmId }), 3);
    c.detail = { holes: detail.holes.map(({ ref, par, si, tee, green, greenFromArea, lengthM, course }) => ({ ref, par, si, tee, green, greenFromArea, lengthM, inCourse: course === c.osmId })), greens: detail.greens, tees: detail.tees };
  } catch (err) {
    c.error = err.message;
  }
  console.error(`${c.distanceKm} km  ${c.name}  ${c.website ?? ''}  holes in OSM: ${c.detail?.holes.length ?? c.error}`);
  await new Promise((r) => setTimeout(r, 2000)); // vriendelijk voor de publieke Overpass-server
}
console.log(JSON.stringify(courses));
