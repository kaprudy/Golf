import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideSync, mergeStates, toCloud, fromCloud } from '../js/sync.js';

test('beslissen: push, pull, merge of niets', () => {
  assert.equal(decideSync({ localChangedAt: '2026-10-01', syncedAt: null, remoteUpdatedAt: null }), 'push');
  assert.equal(decideSync({ localChangedAt: '2026-10-01', syncedAt: null, remoteUpdatedAt: '2026-10-02' }), 'merge');
  // verse installatie: alles uit de cloud ophalen
  assert.equal(decideSync({ localChangedAt: null, syncedAt: null, remoteUpdatedAt: '2026-10-02' }), 'pull');
  assert.equal(decideSync({ localChangedAt: '2026-10-01', syncedAt: '2026-10-02', remoteUpdatedAt: '2026-10-03' }), 'pull');
  assert.equal(decideSync({ localChangedAt: '2026-10-04', syncedAt: '2026-10-03', remoteUpdatedAt: '2026-10-03' }), 'push');
  assert.equal(decideSync({ localChangedAt: '2026-10-04', syncedAt: '2026-10-03', remoteUpdatedAt: '2026-10-05' }), 'merge');
  assert.equal(decideSync({ localChangedAt: '2026-10-02', syncedAt: '2026-10-03', remoteUpdatedAt: '2026-10-03' }), 'none');
});

test('samenvoegen behoudt alles van beide kanten', () => {
  const local = {
    apiKey: 'sk-lokaal',
    players: [{ name: 'Rudy', index: 20, aliases: ['roede'] }],
    courses: [{ id: 'hooge-graven', dataVersion: 2 }, { id: 'eigen-1', name: 'Lemelerberg' }],
    history: [{ id: 1, date: '2026-10-01' }],
    round: { id: 5, date: '2026-10-05', scores: { Rudy: { 1: 5 } }, log: [{ time: '2026-10-05T10:00' }] },
  };
  const remote = {
    players: [{ name: 'Rudy', index: 21, aliases: ['bert'] }, { name: 'Peter', index: null }],
    courses: [{ id: 'hooge-graven', dataVersion: 1 }, { id: 'eigen-2', name: 'Zwolle' }],
    history: [{ id: 0, date: '2026-09-01' }, { id: 1, date: '2026-10-01' }],
    round: { id: 5, date: '2026-10-05', scores: { Rudy: { 2: 4 }, Peter: { 1: 6 } }, log: [{ time: '2026-10-05T10:05' }] },
  };
  const m = mergeStates(local, remote);
  assert.equal(m.apiKey, 'sk-lokaal');
  assert.deepEqual(m.players.map((p) => p.name), ['Rudy', 'Peter']);
  assert.equal(m.players[0].index, 20);
  assert.deepEqual(m.players[0].aliases.sort(), ['bert', 'roede']);
  assert.deepEqual(m.courses.map((c) => c.id).sort(), ['eigen-1', 'eigen-2', 'hooge-graven']);
  assert.equal(m.courses.find((c) => c.id === 'hooge-graven').dataVersion, 2);
  assert.deepEqual(m.history.map((h) => h.id), [0, 1]);
  assert.deepEqual(m.round.scores, { Rudy: { 1: 5, 2: 4 }, Peter: { 1: 6 } });
  assert.equal(m.round.log.length, 2);
});

test('lege ronde verliest van een ronde met scores', () => {
  const m = mergeStates(
    { players: [], courses: [], history: [], round: { id: 9, date: '2026-10-09', scores: {}, log: [] } },
    { players: [], courses: [], history: [], round: { id: 2, date: '2026-10-03', scores: { Rudy: { 1: 5 } }, log: [] } },
  );
  assert.equal(m.round.id, 2);
});

test('andere ronde: de meest recente wint', () => {
  const m = mergeStates(
    { players: [], courses: [], history: [], round: { id: 1, date: '2026-10-01', scores: {}, log: [] } },
    { players: [], courses: [], history: [], round: { id: 2, date: '2026-10-03', scores: {}, log: [] } },
  );
  assert.equal(m.round.id, 2);
});

test('API-sleutel gaat nooit naar de cloud', () => {
  const cloud = toCloud({ apiKey: 'sk-geheim', sync: { syncedAt: 'x' }, players: [] });
  assert.equal('apiKey' in cloud, false);
  assert.equal('sync' in cloud, false);
  const back = fromCloud({ players: [1] }, { apiKey: 'sk-lokaal', sync: { a: 1 } });
  assert.equal(back.apiKey, 'sk-lokaal');
});
