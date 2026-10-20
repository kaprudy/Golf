import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEntry, pickBest, matchPlayer } from '../js/parser.js';

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

test('onbekende naam wordt niet als score opgeslagen maar apart teruggegeven', () => {
  const r = parseEntry('hole 1 Rudy 5 Anna 6', opts);
  assert.deepEqual(map(r), { Rudy: 5 });
  assert.deepEqual(r.unknownNames, [{ name: 'Anna', strokes: 6 }]);
  assert.equal(r.certain, false);
});

test('spraakfouten voor hole: Hal, hol, holdrie', () => {
  const a = parseEntry('Hal 1 Rudi 7', opts);
  assert.equal(a.hole, 1);
  assert.deepEqual(map(a), { Rudy: 7 });
  assert.deepEqual(a.unknownNames, []);
  assert.ok(a.certain);
  const b = parseEntry('holdrie Rudi 6', opts);
  assert.equal(b.hole, 3);
  assert.deepEqual(map(b), { Rudy: 6 });
  const c = parseEntry('hol 2 Rudy 3', opts);
  assert.equal(c.hole, 2);
  assert.equal(parseEntry('hole4 Peter 5', opts).hole, 4);
});

test('alleen spelen: score zonder naam', () => {
  const solo = { ...opts, players: ['Rudy'] };
  const r = parseEntry('hol 1, 5 slagen', solo);
  assert.equal(r.hole, 1);
  assert.deepEqual(map(r), { Rudy: 5 });
  assert.ok(r.certain);
  assert.deepEqual(map(parseEntry('hole 4 birdie', solo)), { Rudy: 2 });
});

test('score zonder naam bij meerdere spelers: vragen voor wie', () => {
  const r = parseEntry('hol 1, 5 slagen', opts);
  assert.deepEqual(r.scores, []);
  assert.equal(r.bareScore, 5);
});

test('onbegrepen woorden maken het onzeker', () => {
  const r = parseEntry('Rudy 5 en de bal lag in het water', opts);
  assert.deepEqual(map(r), { Rudy: 5 });
  assert.equal(r.certain, false);
});

test('beste spraakalternatief kiezen', () => {
  const best = pickBest(['Hal 1 roede 7', 'hole 1 Rudy 7'], opts);
  assert.equal(best.text, 'hole 1 Rudy 7');
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

test('namen op klank: Roedie, Ruddie, Pieter', () => {
  for (const w of ['Roedie', 'Ruddie', 'rudi', 'Ruudy']) assert.equal(matchPlayer(w, players), 'Rudy', w);
  for (const w of ['Pieter', 'Peeter', 'Petr']) assert.equal(matchPlayer(w, players), 'Peter', w);
  assert.equal(matchPlayer('vier', ['Piet']), null);
  assert.equal(matchPlayer('hal', players), null);
});

test('verhaspelde getallen', () => {
  assert.deepEqual(map(parseEntry('hole 2 Rudy fijf Peter ses', opts)), { Rudy: 5, Peter: 6 });
  assert.deepEqual(map(parseEntry('hol dri rudi ach', opts)), { Rudy: 8 });
  assert.equal(parseEntry('hol dri rudi ach', opts).hole, 3);
});

test('naam en getal aan elkaar', () => {
  assert.deepEqual(map(parseEntry('hole 1 rudi5 peter4', opts)), { Rudy: 5, Peter: 4 });
});

test('geleerde aliassen', () => {
  const r = parseEntry('hole 1 roede 5', { ...opts, aliases: { roede: 'Rudy' } });
  assert.deepEqual(map(r), { Rudy: 5 });
  assert.ok(r.certain);
});
