import { test } from 'node:test';
import assert from 'node:assert/strict';
import { learnVocabulary, tokenize } from './learn.js';

const row = (user, text, hole, final) => ({ user, sample: { hole, par: 4, texts: [text], final } });

test('tokens', () => {
  assert.deepEqual(tokenize('Hal 4, S1 fijf!'), ['hal', '4', 's1', 'fijf']);
  assert.deepEqual(tokenize('s1 5slagen'), ['s1', '5', 'slagen']);
});

test('verhaspeld getal wordt geleerd na genoeg voorbeelden', () => {
  const rows = [
    row(1, 's1 fijf s2 vier', 1, { s1: 5, s2: 4 }),
    row(1, 's1 fijf slagen', 2, { s1: 5 }),
    row(2, 's2 fijf', 3, { s2: 5 }),
  ];
  assert.deepEqual(learnVocabulary(rows).numbers, { fijf: 5 });
  assert.deepEqual(learnVocabulary(rows.slice(0, 2)).numbers, {}); // te weinig
  assert.deepEqual(learnVocabulary(rows, { minUsers: 3 }).numbers, {}); // te weinig mensen
});

test('tegenstrijdige waarden worden niet geleerd', () => {
  const rows = [row(1, 's1 zus', 1, { s1: 5 }), row(1, 's1 zus', 2, { s1: 6 }), row(1, 's1 zus', 3, { s1: 7 })];
  assert.deepEqual(learnVocabulary(rows).numbers, {});
});

test('woord voor "hole" wordt geleerd', () => {
  const rows = [row(1, 'hal 4 s1 5', 4, { s1: 5 }), row(1, 'hal 7 s1 3', 7, { s1: 3 }), row(2, 'hal 2 s1 4', 2, { s1: 4 })];
  assert.deepEqual(learnVocabulary(rows).holeWords, ['hal']);
  // bekende woorden en getallen worden nooit "geleerd"
  const known = [row(1, 'hole 4 s1 vijf', 4, { s1: 5 }), row(1, 'hole 4 s1 vijf', 4, { s1: 5 }), row(1, 'hole 4 s1 vijf', 4, { s1: 5 })];
  assert.deepEqual(learnVocabulary(known), { numbers: {}, holeWords: [], samples: 3 });
});

test('kapotte voorbeelden worden genegeerd', () => {
  assert.deepEqual(learnVocabulary([{ user: 1, sample: null }, { user: 1, sample: { texts: [42] } }]).numbers, {});
});
