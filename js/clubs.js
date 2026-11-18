// Clubadvies op afstand: uit hoe ver iemand een 7-ijzer slaat (carry) volgen de andere clubs met
// de gebruikelijke verhoudingen. Geen wind, hoogteverschil of lig; een indicatie.

// Van lang naar kort: [korte naam, voluit, carry als deel van de 7-ijzer]
export const CLUBS = [
  ['3H', '3-hout', 1.42], ['5H', '5-hout', 1.31], ['Hy', 'hybride', 1.22],
  ['5i', '5-ijzer', 1.15], ['6i', '6-ijzer', 1.075], ['7i', '7-ijzer', 1], ['8i', '8-ijzer', 0.925], ['9i', '9-ijzer', 0.85],
  ['PW', 'pitching wedge', 0.77], ['GW', 'gap wedge', 0.68], ['SW', 'sand wedge', 0.58],
];
export const DEFAULT_IRON7 = { h: 130, d: 100 }; // gemiddelde amateur, carry in meters
const CHIP_M = 30; // korter: chippen of putten, geen volle slag

export function carries(iron7) {
  return CLUBS.map(([club, name, f]) => ({ club, name, carry: Math.round(iron7 * f) }));
}

// Kleinste club die de afstand haalt (een paar meter speling). Te ver voor één slag: de langste
// club van de fairway, met reach false.
export function clubFor(dist, iron7) {
  if (!(dist > 0) || !(iron7 > 0)) return null;
  if (dist < CHIP_M) return { club: 'chip', name: 'chippen of putten', carry: null, reach: true };
  const list = carries(iron7);
  const pick = [...list].reverse().find((c) => c.carry >= dist - 4);
  return pick ? { ...pick, reach: true } : { ...list[0], reach: false };
}
