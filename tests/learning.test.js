import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anonymize, recordEntry, finalizeRound, loadQueue, saveQueue } from '../js/learning.js';
import { setLearnedVocab, parseEntry } from '../js/parser.js';

const players = ['Rudy', 'Peter'];

test('namen worden s1, s2 en onbekende namen x', () => {
  const a = anonymize('Hole 4, Rudy fijf en Peter 3. Jan had 6', players);
  assert.equal(a.text, 'hole 4 s1 fijf en s2 3 x had 6');
  assert.deepEqual(a.ids, { Rudy: 's1', Peter: 's2' });
  // ook verhaspelde namen en geleerde bijnamen
  assert.equal(anonymize('roede 5', players, { roede: 'Rudy' }).text, 's1 5');
});

test('na de ronde komt de eindscore (met correcties) erbij', () => {
  const entry = recordEntry({ roundId: 'r1', hole: 4, par: 4, texts: ['Rudy fijf Peter ses'], scores: [{ name: 'Rudy', strokes: 5 }], viaAi: false, players });
  assert.deepEqual(entry.parsed, { s1: 5 });
  const scores = { Rudy: { 4: 5 }, Peter: { 4: 6 } }; // Peter later met de hand verbeterd
  const q = finalizeRound({ open: [entry, { ...entry, roundId: 'oud' }], ready: [] }, 'r1', (n, h) => scores[n]?.[h] ?? null);
  assert.equal(q.open.length, 0);
  assert.deepEqual(q.ready, [{ v: 1, hole: 4, par: 4, texts: ['s1 fijf s2 ses'], parsed: { s1: 5 }, final: { s1: 5, s2: 6 }, ai: false }]);
  assert.equal(JSON.stringify(q.ready).includes('Rudy'), false);
});

test('wachtrij overleeft kapotte opslag', () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  assert.deepEqual(loadQueue(storage), { open: [], ready: [] });
  saveQueue({ open: [1], ready: [2] }, storage);
  assert.deepEqual(loadQueue(storage), { open: [1], ready: [2] });
  store.set('golfscore-samples', '{kapot');
  assert.deepEqual(loadQueue(storage), { open: [], ready: [] });
});

test('geleerde woorden worden door de parser gebruikt', () => {
  const opts = { players, currentHole: 1, parForHole: () => 4 };
  assert.equal(parseEntry('heul 7 Rudy zoef', opts).hole, 1);
  setLearnedVocab({ numbers: { zoef: 5, vijf: 9, rudy: 3 }, holeWords: ['heul'] });
  const r = parseEntry('heul 7 Rudy zoef', opts);
  assert.equal(r.hole, 7);
  assert.deepEqual(r.scores, [{ name: 'Rudy', strokes: 5 }]);
  // bestaande woorden blijven zoals ze waren
  assert.deepEqual(parseEntry('Rudy vijf', opts).scores, [{ name: 'Rudy', strokes: 5 }]);
});
