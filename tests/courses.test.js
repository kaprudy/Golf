import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_COURSES } from '../js/courses.js';

test('elke baan heeft een unieke id', () => {
  const ids = DEFAULT_COURSES.map((c) => c.id);
  assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), []);
});

test('par, stroke index en lengtes passen bij het aantal holes', () => {
  for (const c of DEFAULT_COURSES) {
    assert.ok([9, 18].includes(c.holeCount), `${c.id}: holeCount ${c.holeCount}`);
    assert.equal(c.pars.length, c.holeCount, `${c.id}: pars`);
    assert.equal(c.pars.reduce((a, b) => a + b, 0), c.parTotal, `${c.id}: parTotal`);
    assert.deepEqual([...c.si].sort((a, b) => a - b), Array.from({ length: c.holeCount }, (_, i) => i + 1), `${c.id}: si`);
    for (const t of c.tees) {
      if (t.lengths) assert.equal(t.lengths.length, c.holeCount, `${c.id}/${t.id}: lengths`);
    }
  }
});

test('tees: uniek per baan, geslacht h/d en een plausibele rating', () => {
  for (const c of DEFAULT_COURSES) {
    assert.ok(c.tees.length > 0, `${c.id}: geen tees`);
    const ids = c.tees.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length, `${c.id}: dubbele tee-id`);
    for (const t of c.tees) {
      assert.ok(['h', 'd'].includes(t.gender), `${c.id}/${t.id}: gender`);
      if (t.ratingUnknown) continue;
      // Course rating ligt binnen een paar slagen van de par; slope rond 55–155 (WHS; officieel ook 54 bij Shortgolf
      // Swifterbant en 156 bij Duurswold geel dames).
      assert.ok(Math.abs(t.rating - c.parTotal) <= 12, `${c.id}/${t.id}: rating ${t.rating} bij par ${c.parTotal}`);
      assert.ok(t.slope >= 50 && t.slope <= 160, `${c.id}/${t.id}: slope ${t.slope}`);
    }
  }
});

test('banen met een locatie liggen in Nederland of net over de grens', () => {
  for (const c of DEFAULT_COURSES.filter((x) => x.location)) {
    assert.ok(c.location.lat > 50.7 && c.location.lat < 53.6 && c.location.lon > 3.3 && c.location.lon < 7.6, `${c.id}: ${JSON.stringify(c.location)}`);
  }
});
