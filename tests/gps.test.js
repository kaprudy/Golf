import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceM, teeAt, toGreen, geoProgress } from '../js/gps.js';

// Punten bij Ommen; 0,001 graad noorderbreedte is ongeveer 111 m.
const base = { lat: 52.5, lon: 6.4 };
const north = (m) => ({ lat: base.lat + m / 111195, lon: base.lon });

test('afstand', () => {
  assert.ok(Math.abs(distanceM(base, north(100)) - 100) < 0.5);
  assert.equal(Math.round(distanceM(base, base)), 0);
});

test('op welke tee sta je', () => {
  const geo = { 1: { tee: north(0) }, 2: { tee: north(200) }, 3: { green: north(400) } };
  const holes = [1, 2, 3];
  assert.equal(teeAt({ ...north(10), accuracy: 5 }, geo, holes), 1);
  assert.equal(teeAt({ ...north(195), accuracy: 5 }, geo, holes), 2);
  assert.equal(teeAt({ ...north(100), accuracy: 5 }, geo, holes), null);
  // grote onnauwkeurigheid telt maar beperkt mee
  assert.equal(teeAt({ ...north(45), accuracy: 100 }, geo, holes), 1);
  assert.equal(teeAt({ ...north(60), accuracy: 100 }, geo, holes), null);
  // alleen holes van deze ronde
  assert.equal(teeAt({ ...north(200), accuracy: 5 }, geo, [1]), null);
});

test('afstand tot de green', () => {
  const geo = { 4: { green: north(150) } };
  assert.equal(toGreen(north(0), geo, 4), 150);
  assert.equal(toGreen(north(0), geo, 5), null);
  assert.equal(toGreen(null, geo, 4), null);
});

test('voortgang vastleggen', () => {
  const geo = { 1: { tee: base, green: base }, 2: { tee: base } };
  assert.deepEqual(geoProgress(geo, [1, 2, 3]), { tees: 2, greens: 1, total: 3 });
  assert.deepEqual(geoProgress(undefined, [1, 2]), { tees: 0, greens: 0, total: 2 });
});
