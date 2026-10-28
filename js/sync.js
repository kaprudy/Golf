// Samenvoegen van de gegevens op dit toestel met die in de cloud.
// Puur (geen netwerk), zodat het los te testen is.

// Wat er gebeuren moet, op basis van tijdstempels (ISO-strings of null).
// localChangedAt: laatste wijziging op dit toestel; syncedAt: tijdstempel van de cloudversie
// bij de laatste geslaagde synchronisatie; remoteUpdatedAt: tijdstempel van de cloudversie nu.
export function decideSync({ localChangedAt, syncedAt, remoteUpdatedAt }) {
  if (!remoteUpdatedAt) return 'push';
  // Nooit iets gewijzigd op dit toestel (verse installatie): niets lokaal te bewaren.
  const localDirty = Boolean(localChangedAt) && (!syncedAt || localChangedAt > syncedAt);
  const remoteNew = !syncedAt || remoteUpdatedAt > syncedAt;
  if (localDirty && remoteNew) return 'merge';
  if (localDirty) return 'push';
  if (remoteNew) return 'pull';
  return 'none';
}

const byKey = (list, key) => new Map((list ?? []).map((x) => [x[key], x]));

function unionBy(localList, remoteList, key, pick) {
  const local = byKey(localList, key);
  const remote = byKey(remoteList, key);
  const out = [];
  for (const [k, l] of local) out.push(remote.has(k) ? pick(l, remote.get(k)) : l);
  for (const [k, r] of remote) if (!local.has(k)) out.push(r);
  return out;
}

const lastActivity = (round) => [round?.date, ...(round?.log ?? []).map((l) => l.time)].filter(Boolean).sort().at(-1) ?? '';

function mergeRounds(local, remote) {
  if (!remote) return local;
  if (!local) return remote;
  const hasScores = (r) => Object.values(r.scores ?? {}).some((holes) => Object.keys(holes).length);
  if (!hasScores(local) && hasScores(remote)) return remote;
  if (hasScores(local) && !hasScores(remote)) return local;
  if (local.id !== remote.id) return lastActivity(remote) > lastActivity(local) ? remote : local;
  // Dezelfde ronde op twee toestellen bijgehouden: scores samenvoegen, dit toestel wint bij verschil.
  const scores = structuredClone(remote.scores ?? {});
  for (const [name, holes] of Object.entries(local.scores ?? {})) scores[name] = { ...scores[name], ...holes };
  const log = unionBy(local.log, remote.log, 'time', (l) => l).sort((a, b) => (a.time < b.time ? 1 : -1));
  return { ...local, scores, log };
}

// GPS-punten per hole van beide kanten behouden; bij hetzelfde punt wint dit toestel.
function mergeGeo(remote = {}, local = {}) {
  const out = { ...remote };
  for (const [hole, points] of Object.entries(local)) out[hole] = { ...out[hole], ...points };
  return out;
}

// Beide kanten zijn gewijzigd: alles behouden wat er aan beide kanten is.
export function mergeStates(local, remote) {
  return {
    ...remote,
    ...local,
    players: unionBy(local.players, remote.players, 'name', (l, r) => ({
      ...r,
      ...l,
      aliases: [...new Set([...(r.aliases ?? []), ...(l.aliases ?? [])])],
    })),
    courses: unionBy(local.courses, remote.courses, 'id', (l, r) => ({
      ...((r.dataVersion ?? 1) > (l.dataVersion ?? 1) ? r : l),
      geo: mergeGeo(r.geo, l.geo),
    })),
    history: unionBy(local.history, remote.history, 'id', (l) => l).sort((a, b) => (a.date < b.date ? -1 : 1)),
    round: mergeRounds(local.round, remote.round),
  };
}

// Wat er naar de cloud gaat: alles behalve de API-sleutel en de sync-boekhouding.
export function toCloud(state) {
  const { apiKey: _oud, sync, ...rest } = state; // apiKey: oude opslag, nooit naar de server
  return rest;
}

// Cloudgegevens toepassen op dit toestel, met behoud van de lokale API-sleutel.
export function fromCloud(data, local) {
  const { apiKey: _oud, ...clean } = data;
  return { ...clean, sync: local.sync };
}
