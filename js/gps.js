// GPS-rekenwerk voor op de baan. Puur, zodat het los te testen is.
// Posities: {lat, lon} in graden; afstanden in meters.

const R = 6371000; // straal van de aarde

export function distanceM(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Op welke tee sta je? De dichtstbijzijnde vastgelegde tee binnen `radius` meter (plus een deel
// van de GPS-onnauwkeurigheid), of null.
export function teeAt(pos, geo, holes, radius = 30) {
  if (!pos || !geo) return null;
  const reach = radius + Math.min(pos.accuracy ?? 0, 20);
  let best = null;
  for (const h of holes) {
    const tee = geo[h]?.tee;
    if (!tee) continue;
    const d = distanceM(pos, tee);
    if (d <= reach && (!best || d < best.d)) best = { hole: h, d };
  }
  return best?.hole ?? null;
}

// Afstand tot de green van een hole, afgerond op hele meters (null als onbekend).
export function toGreen(pos, geo, hole) {
  const green = geo?.[hole]?.green;
  if (!pos || !green) return null;
  return Math.round(distanceM(pos, green));
}

// Hoeveel tees en greens zijn er vastgelegd voor deze holes?
export function geoProgress(geo, holes) {
  let tees = 0;
  let greens = 0;
  for (const h of holes) {
    if (geo?.[h]?.tee) tees++;
    if (geo?.[h]?.green) greens++;
  }
  return { tees, greens, total: holes.length };
}
