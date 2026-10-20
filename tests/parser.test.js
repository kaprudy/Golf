import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEntry } from '../js/parser.js';

const players = ['Rudy', 'Peter'];
const opts = { players, currentHole: 2, parForHole: (h) => (h === 4 ? 3 : 4) };
const map = (r) => Object.fromEntries(r.scores.map((s) => [s.name, s.strokes]));

test('basiszin met hole vooraan', () => {
  const r = parseEntry('Hole 4, Rudy 5 slagen, Peter 3 slagen', opts);
  assert.equal(r.hole, 4);
  assert.deepEqual(map(r), { Rudy: 5, Peter: 3 });
});

test('hole achteraan en getallen als woorden', () => {
  const r = parseEntry('Rudy vijf en Peter drie op hole zeven', opts);
  assert.equal(r.hole, 7);
  assert.deepEqual(map(r), { Rudy: 5, Peter: 3 });
});

test('rangtelwoord: de vierde hole', () => {
  const r = parseEntry('de vierde hole Rudy 6 Peter 4', opts);
  assert.equal(r.hole, 4);
  assert.deepEqual(map(r), { Rudy: 6, Peter: 4 });
});

test('zonder hole wordt de huidige hole gebruikt', () => {
  const r = parseEntry('Rudy heeft 5 slagen, Peter had er 3', { ...opts });
  assert.equal(r.hole, 2);
  assert.equal(r.holeMentioned, false);
  assert.equal(map(r).Rudy, 5);
});

test('golftermen worden omgezet met par van de hole', () => {
  const r = parseEntry('hole 4 Rudy een birdie Peter dubbel bogey', opts);
  assert.deepEqual(map(r), { Rudy: 2, Peter: 5 });
  const r2 = parseEntry('Rudy par Peter bogey', opts);
  assert.deepEqual(map(r2), { Rudy: 4, Peter: 5 });
});

test('kleine spraakfouten in namen', () => {
  const r = parseEntry('Ruddy 5 Pieter 4', opts);
  assert.deepEqual(map(r), { Rudy: 5, Peter: 4 });
});

test('nieuwe speler wordt herkend', () => {
  const r = parseEntry('hole 1 Rudy 5 Anna 6', opts);
  const anna = r.scores.find((s) => s.name === 'Anna');
  assert.ok(anna?.isNew);
  assert.equal(anna.strokes, 6);
});

test('5 slagen voor Rudy', () => {
  const r = parseEntry('5 slagen voor Rudy', opts);
  assert.equal(map(r).Rudy, 5);
});

test('hole in one', () => {
  const r = parseEntry('hole 4 Peter hole in one', opts);
  assert.equal(r.hole, 4);
  assert.equal(map(r).Peter, 1);
});
