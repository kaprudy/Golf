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

test('alleen clubs uit de tas', () => {
  const bag = ['5H', '6i', '7i', '9i', 'PW', 'SW'];
  assert.equal(clubFor(120, 130, bag).club, '7i'); // geen 8-ijzer en de 9 haalt het niet: de 7
  assert.equal(clubFor(112, 130, bag).club, '9i');
  assert.equal(clubFor(126, 130, bag).club, '7i');
  assert.equal(clubFor(150, 130, bag).club, '5H'); // geen 5-ijzer
  assert.equal(clubFor(60, 130, bag).club, 'SW');
  assert.deepEqual([clubFor(220, 130, bag).club, clubFor(220, 130, bag).reach], ['5H', false]);
  assert.equal(clubFor(120, 130, []), null);
  // Standaardtas: geen 4-ijzer of lob wedge
  assert.equal(clubFor(50, 130).club, 'SW');
  assert.equal(clubFor(70, 130, ['LW', 'SW']).club, 'SW');
  assert.equal(clubFor(55, 130, ['LW', 'SW']).club, 'LW');
});
