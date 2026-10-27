import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOverpass, buildQuery } from './osm.js';

const square = (lat, lon, d) => [{ lat, lon }, { lat: lat + d, lon }, { lat: lat + d, lon: lon + d }, { lat, lon: lon + d }, { lat, lon }];
const fixture = {
  elements: [
    { type: 'way', id: 1, tags: { leisure: 'golf_course', name: 'Hooge Graven' }, geometry: square(52.50, 6.40, 0.02) },
    { type: 'way', id: 10, tags: { golf: 'hole', ref: '2', par: '4', handicap: '7' }, geometry: [{ lat: 52.505, lon: 6.405 }, { lat: 52.507, lon: 6.406 }, { lat: 52.508, lon: 6.407 }] },
    { type: 'way', id: 11, tags: { golf: 'hole', ref: '1', par: '3' }, geometry: [{ lat: 52.501, lon: 6.401 }, { lat: 52.502, lon: 6.401 }] },
    { type: 'way', id: 20, tags: { golf: 'green' }, geometry: square(52.50795, 6.40695, 0.0002) },
    { type: 'way', id: 30, tags: { golf: 'tee' }, geometry: square(52.505, 6.405, 0.0001) },
    { type: 'way', id: 12, tags: { golf: 'hole', ref: '1' }, geometry: [{ lat: 53, lon: 7 }, { lat: 53.001, lon: 7 }] },
  ],
};

test('holes uit OpenStreetMap', () => {
  const r = parseOverpass(fixture);
  assert.deepEqual(r.courses.map((c) => [c.name, c.holes]), [['Hooge Graven', 2]]);
  const [h1, h2] = r.holes.filter((h) => h.course === 'way/1');
  assert.deepEqual([h1.ref, h1.par, h1.si, h1.greenFromArea], [1, 3, null, false]);
  assert.deepEqual(h1.green, { lat: 52.502, lon: 6.401 }); // einde van de lijn als er geen greenvlak is
  assert.deepEqual([h2.ref, h2.par, h2.si, h2.greenFromArea], [2, 4, 7, true]);
  assert.deepEqual(h2.tee, { lat: 52.505, lon: 6.405 });
  assert.deepEqual(h2.green, { lat: 52.50803, lon: 6.40703 }); // midden van de greenvlakte
  assert.ok(h2.lengthM > 300 && h2.lengthM < 400, String(h2.lengthM));
  assert.equal(r.holes.find((h) => h.osmId === 'way/12').course, null); // buiten de baan
  assert.deepEqual([r.greens, r.tees], [1, 1]);
});

test('query is veilig', () => {
  assert.ok(!buildQuery({ name: 'x"];out;(' }).includes('"];out;('));
  assert.match(buildQuery({ lat: 52.5, lon: 6.4 }), /around:2500,52\.50000,6\.40000/);
});

test('valt terug op een reserveserver en noemt de reden', async () => {
  const { fetchCourse } = await import('./osm.js');
  const seen = [];
  const fake = async (url) => {
    seen.push(new URL(url).host);
    if (url.includes('a.example')) return { ok: false, status: 429 };
    return { ok: true, json: async () => ({ elements: [] }) };
  };
  const r = await fetchCourse({ name: 'x' }, { fetchImpl: fake, urls: ['https://a.example/i', 'https://b.example/i'] });
  assert.deepEqual([seen, r.server], [['a.example', 'b.example'], 'b.example']);
  const down = async () => { throw Object.assign(new Error('fetch failed'), { cause: { code: 'ENOTFOUND' } }); };
  await assert.rejects(fetchCourse({ name: 'x' }, { fetchImpl: down, urls: ['https://a.example/i'] }), /a\.example: ENOTFOUND/);
});
