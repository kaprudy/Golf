import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeState, decodeCommand, MAX_STATE_BYTES } from '../js/buggy-protocol.js';

const size = (s) => new TextEncoder().encode(s).length;

test('stand coderen', () => {
  const json = encodeState({
    course: 'Hooge Graven (18 holes)', hole: 4, par: 4, si: 4, length: 349,
    players: [{ name: 'Rudy', strokes: 5, gross: 23, toPar: 3 }, { name: 'Peter', strokes: null, gross: 20, toPar: 0 }],
  });
  assert.deepEqual(JSON.parse(json), {
    v: 1, h: 4, p: 4, i: 4, m: 349, c: 'Hooge Graven (18 holes)',
    pl: [['Rudy', 5, 23, 3], ['Peter', 0, 20, 0]],
  });
});

test('te veel of te lange namen worden ingekort tot het past', () => {
  const players = Array.from({ length: 8 }, (_, i) => ({ name: `Speler met een lange naam ${i} ééé`, strokes: 12, gross: 120, toPar: 48 }));
  const json = encodeState({ course: 'Een heel erg lange baannaam die niet past', hole: 18, par: 5, si: 18, length: 499, players });
  assert.ok(size(json) <= MAX_STATE_BYTES, `${size(json)} bytes`);
  const msg = JSON.parse(json);
  assert.ok(msg.pl.length >= 4);
  assert.equal(msg.h, 18);
});

test('opdrachten lezen', () => {
  assert.deepEqual(decodeCommand('{"c":"s","p":1,"d":1}'), { type: 'score', player: 1, delta: 1 });
  assert.deepEqual(decodeCommand('{"c":"s","p":0,"d":-1}'), { type: 'score', player: 0, delta: -1 });
  assert.deepEqual(decodeCommand('{"c":"h","d":-1}'), { type: 'hole', delta: -1 });
  assert.deepEqual(decodeCommand('{"c":"hi"}'), { type: 'hello' });
  assert.equal(decodeCommand('{"c":"s","p":9,"d":1}'), null);
  assert.equal(decodeCommand('{"c":"s","p":0,"d":0}'), null);
  assert.equal(decodeCommand('kapot'), null);
});
