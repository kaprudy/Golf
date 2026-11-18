import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clubFor, carries } from '../js/clubs.js';

test('clubadvies op afstand, uit de 7-ijzer', () => {
  const c = (d, i7 = 130) => clubFor(d, i7)?.club;
  assert.equal(c(130), '7i');
  assert.equal(c(133), '7i'); // binnen een paar meter speling
  assert.equal(c(138), '6i');
  assert.equal(c(110), '9i');
  assert.equal(c(100), 'PW');
  assert.equal(c(60), 'SW');
  assert.equal(c(20), 'chip');
  assert.equal(c(100, 100), '7i'); // iemand die korter slaat
  const far = clubFor(260, 130);
  assert.deepEqual([far.club, far.reach], ['3H', false]);
  assert.equal(clubFor(null, 130), null);
  assert.equal(clubFor(120, null), null);
  // carries lopen af van lang naar kort
  const list = carries(130).map((x) => x.carry);
  assert.deepEqual(list, [...list].sort((a, b) => b - a));
});
