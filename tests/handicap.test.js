import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  courseHandicap, strokesPerHole, scoreDifferential, handicapIndexFromDifferentials,
  analysePlayer, expectedNineHoleDifferential,
} from '../js/handicap.js';

test('course handicap 18 en 9 holes', () => {
  assert.equal(courseHandicap(20, { slope: 129, rating: 71.7, par: 72, holes: 18 }), 23);
  assert.equal(courseHandicap(20, { slope: 129, rating: 35.9, par: 35, holes: 9 }), 12);
});

test('slagen per hole volgens stroke index', () => {
  assert.deepEqual(strokesPerHole(11, [1, 2, 3, 4, 5, 6, 7, 8, 9]), [2, 2, 1, 1, 1, 1, 1, 1, 1]);
  // 18-holes SI-waarden op 9 holes worden gerangschikt
  assert.deepEqual(strokesPerHole(1, [7, 3, 15, 1, 11, 5, 17, 9, 13]), [0, 0, 0, 1, 0, 0, 0, 0, 0]);
  assert.deepEqual(strokesPerHole(-1, [1, 2, 3]), [0, 0, -1]);
});

test('score differential', () => {
  assert.equal(scoreDifferential(95, { slope: 129, rating: 71.7 }), 20.4);
});

test('handicap index tabel', () => {
  assert.equal(handicapIndexFromDifferentials([20, 22]), null);
  assert.equal(handicapIndexFromDifferentials([20, 22, 25]), 18);
  assert.equal(handicapIndexFromDifferentials(Array(20).fill(0).map((_, i) => i + 10)), 13.5);
  assert.equal(handicapIndexFromDifferentials([80, 80, 80]), 54);
});

test('net double bogey cap en 9-holes omrekening', () => {
  const course = { holes: 9, pars: [4, 4, 3, 5, 4, 4, 3, 4, 4], strokeIndexes: [1, 2, 3, 4, 5, 6, 7, 8, 9], rating: 35.5, slope: 125 };
  const res = analysePlayer(course, { name: 'Rudy', index: 18 }, [10, 5, 4, 6, 5, 5, 4, 5, 5]);
  // CH = round(9 * 125/113 + 0.5) = 10 -> hole 1 krijgt 2 slagen: max = 4+2+2 = 8
  assert.equal(res.courseHandicap, 10);
  assert.equal(res.adjusted[0], 8);
  assert.equal(res.gross, 49);
  assert.equal(res.adjustedGross, 47);
  assert.equal(res.differential, scoreDifferential(47, course));
  assert.equal(res.differential18, Math.round((res.differential + expectedNineHoleDifferential(18)) * 10) / 10);
});

test('speler zonder handicap: max par + 5', () => {
  const course = { holes: 9, pars: Array(9).fill(4), strokeIndexes: [1, 2, 3, 4, 5, 6, 7, 8, 9], rating: 36, slope: 113 };
  const res = analysePlayer(course, { name: 'Peter', index: null }, [12, 4, 4, 4, 4, 4, 4, 4, 4]);
  assert.equal(res.adjusted[0], 9);
  assert.equal(res.differential18, (41 - 36) * 2);
});
