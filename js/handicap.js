// Handicapberekening volgens het World Handicap System (WHS), zoals de NGF die gebruikt.
// Alle functies zijn puur, zodat ze los te testen zijn.

export const MAX_INDEX = 54;

const round1 = (n) => Math.round(n * 10) / 10;

// Course handicap (playing handicap bij 100% allowance).
// Voor 9 holes: (HI / 2) x (slope / 113) + (CR9 - par9).
export function courseHandicap(index, { slope, rating, par, holes }) {
  if (index == null || Number.isNaN(index)) return null;
  const hi = holes === 9 ? index / 2 : index;
  return Math.round(hi * (slope / 113) + (rating - par));
}

// Rangorde van de stroke index binnen de gespeelde holes (1 = moeilijkste).
// Werkt ook als je bij 9 holes de 18-holes SI-waarden van de scorekaart invult.
export function strokeIndexRanks(strokeIndexes) {
  const order = strokeIndexes
    .map((si, i) => ({ si: Number(si) || i + 1, i }))
    .sort((a, b) => a.si - b.si || a.i - b.i);
  const ranks = new Array(strokeIndexes.length);
  order.forEach((o, rank) => { ranks[o.i] = rank + 1; });
  return ranks;
}

// Aantal handicapslagen per hole.
export function strokesPerHole(ch, strokeIndexes) {
  const n = strokeIndexes.length;
  const ranks = strokeIndexRanks(strokeIndexes);
  if (ch == null) return ranks.map(() => 0);
  if (ch < 0) {
    // Plushandicap: slagen teruggeven op de makkelijkste holes.
    const giveBack = -ch;
    return ranks.map((r) => 0 - (Math.floor(giveBack / n) + (r > n - (giveBack % n) ? 1 : 0)));
  }
  return ranks.map((r) => Math.floor(ch / n) + (r <= ch % n ? 1 : 0));
}

// Aangepaste bruto score: maximaal netto double bogey per hole.
// Zonder handicap geldt par + 5. Niet gespeelde hole telt als netto par.
export function adjustedHoleScores(scores, pars, strokes, hasIndex) {
  return pars.map((par, i) => {
    const gross = scores[i];
    if (gross == null || gross === '') return par + strokes[i];
    const max = hasIndex ? par + 2 + strokes[i] : par + 5;
    return Math.min(gross, max);
  });
}

// Score differential = (113 / slope) x (aangepaste bruto score - course rating - PCC).
export function scoreDifferential(adjustedGross, { slope, rating }, pcc = 0) {
  return round1((113 / slope) * (adjustedGross - rating - pcc));
}

// Verwachte 9-holes differential (WHS 2024): 0,52 x HI + 1,2.
export function expectedNineHoleDifferential(index) {
  return round1(index * 0.52 + 1.2);
}

// Handicap index uit een reeks (18-holes) differentials, volgens de WHS-tabel.
export function handicapIndexFromDifferentials(diffs) {
  const recent = diffs.slice(-20);
  const n = recent.length;
  if (n < 3) return null;
  const sorted = [...recent].sort((a, b) => a - b);
  const avgLowest = (k) => sorted.slice(0, k).reduce((s, d) => s + d, 0) / k;
  let value;
  if (n === 3) value = sorted[0] - 2;
  else if (n === 4) value = sorted[0] - 1;
  else if (n === 5) value = sorted[0];
  else if (n === 6) value = avgLowest(2) - 1;
  else if (n <= 8) value = avgLowest(2);
  else if (n <= 11) value = avgLowest(3);
  else if (n <= 14) value = avgLowest(4);
  else if (n <= 16) value = avgLowest(5);
  else if (n <= 18) value = avgLowest(6);
  else if (n === 19) value = avgLowest(7);
  else value = avgLowest(8);
  // WHS rondt af op 1 decimaal (half naar boven).
  return Math.min(MAX_INDEX, Math.floor(value * 10 + 0.5) / 10);
}

// Volledige analyse van één speler voor één ronde.
// course: { holes, pars[], strokeIndexes[], rating, slope }
// player: { name, index }   scores: array met slagen per hole (null = niet gespeeld)
export function analysePlayer(course, player, scores) {
  const par = course.pars.reduce((s, p) => s + p, 0);
  const hasIndex = player.index != null && !Number.isNaN(player.index);
  const ch = hasIndex ? courseHandicap(player.index, { ...course, par }) : null;
  const strokes = strokesPerHole(ch, course.strokeIndexes);
  const adjusted = adjustedHoleScores(scores, course.pars, strokes, hasIndex);

  const played = scores.filter((s) => s != null && s !== '');
  const gross = played.reduce((s, x) => s + x, 0);
  const parPlayed = course.pars.reduce((s, p, i) => (scores[i] != null && scores[i] !== '' ? s + p : s), 0);
  const adjustedGross = adjusted.reduce((s, x) => s + x, 0);
  const differential = scoreDifferential(adjustedGross, course);

  let differential18;
  let differential18Note;
  if (course.holes === 9) {
    if (hasIndex) {
      differential18 = round1(differential + expectedNineHoleDifferential(player.index));
      differential18Note = '9-holes differential + verwachte differential voor de andere 9 holes (WHS)';
    } else {
      differential18 = round1(differential * 2);
      differential18Note = 'indicatie: 9-holes differential x 2 (nog geen handicap bekend)';
    }
  } else {
    differential18 = differential;
    differential18Note = '18-holes differential';
  }

  const tally = { eagleOfBeter: 0, birdie: 0, par: 0, bogey: 0, doubleBogey: 0, slechter: 0 };
  course.pars.forEach((p, i) => {
    const s = scores[i];
    if (s == null || s === '') return;
    const d = s - p;
    if (d <= -2) tally.eagleOfBeter++;
    else if (d === -1) tally.birdie++;
    else if (d === 0) tally.par++;
    else if (d === 1) tally.bogey++;
    else if (d === 2) tally.doubleBogey++;
    else tally.slechter++;
  });

  const strokesReceived = strokes.reduce((s, x) => s + x, 0);
  const net = played.length ? gross - strokes.reduce((s, x, i) => (scores[i] != null && scores[i] !== '' ? s + x : s), 0) : null;
  // Stableford: 2 punten voor netto par, met een minimum van 0.
  const stableford = course.pars.reduce((s, p, i) => {
    const g = scores[i];
    if (g == null || g === '') return s;
    return s + Math.max(0, 2 + p + strokes[i] - g);
  }, 0);

  return {
    name: player.name,
    index: hasIndex ? player.index : null,
    courseHandicap: ch,
    strokes,
    holesPlayed: played.length,
    gross,
    par,
    parPlayed,
    toPar: gross - parPlayed,
    net,
    stableford: hasIndex ? stableford : null,
    strokesReceived,
    adjusted,
    adjustedGross,
    differential,
    differential18,
    differential18Note,
    tally,
  };
}
