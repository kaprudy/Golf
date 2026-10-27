// Haalt een golfbaan uit OpenStreetMap en schrijft het resultaat als JSON (voor in de app).
//   node tools/osm-fetch.mjs --lat 52.53 --lon 6.44 --radius 5000 > osm.json
//   node tools/osm-fetch.mjs --name "Hooge Graven"
import { fetchCourse } from '../server/api/osm.js';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []));
const params = args.name ? { name: args.name } : { lat: Number(args.lat), lon: Number(args.lon), radius: Number(args.radius) || 3000 };
const result = await fetchCourse(params);
console.log(JSON.stringify({ ...result, query: params, fetchedAt: new Date().toISOString() }));
