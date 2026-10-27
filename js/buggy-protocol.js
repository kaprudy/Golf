// Protocol tussen de app en het buggy-scherm (Bluetooth Low Energy).
// Puur, zodat het los te testen is. De firmware (hardware/buggy-display) gebruikt dezelfde
// UUID's en hetzelfde berichtformaat.
//
// App -> scherm (STATE, schrijven): compacte JSON met de stand van de huidige hole
//   {"v":1,"h":4,"p":4,"i":4,"m":349,"c":"Hooge Graven","pl":[["Rudy",5,23,3],["Peter",0,20,0]]}
//   h = hole, p = par, i = stroke index, m = lengte (0 = onbekend), c = baan (optioneel),
//   pl = spelers: [naam, slagen op deze hole (0 = nog niet), bruto totaal, totaal t.o.v. par]
// Scherm -> app (INPUT, notify): korte opdrachten
//   {"c":"s","p":0,"d":1}  score van speler 0 één slag hoger (-1 = lager)
//   {"c":"h","d":1}        volgende hole (-1 = vorige)
//   {"c":"hi"}             scherm vraagt de stand op

export const SERVICE_UUID = '480d22ab-2fa5-4c57-82c2-638cf27025df';
export const STATE_UUID = '7d07a84e-acbe-4784-8dd8-20c1be5a8b3f';
export const INPUT_UUID = '06bd9c2e-ebfd-4f11-8e80-3b541c03f86a';

// Past ruim in één Bluetooth-pakket als het scherm een grotere MTU afspreekt (de firmware vraagt 247).
export const MAX_STATE_BYTES = 240;
export const MAX_PLAYERS = 6;

const bytes = (s) => new TextEncoder().encode(s).length;

/**
 * @param {{course?:string, hole:number, par:number, si:number, length?:number,
 *          players:{name:string, strokes:number|null, gross:number, toPar:number}[]}} s
 * @returns {string} JSON van hooguit MAX_STATE_BYTES bytes
 */
export function encodeState(s) {
  const build = (nameLen, maxPlayers, withCourse) => {
    const msg = {
      v: 1,
      h: s.hole,
      p: s.par,
      i: s.si,
      m: s.length ?? 0,
      pl: s.players.slice(0, maxPlayers).map((p) => [p.name.slice(0, nameLen), p.strokes ?? 0, p.gross, p.toPar]),
    };
    if (withCourse && s.course) msg.c = s.course.slice(0, 24);
    return JSON.stringify(msg);
  };
  // Eerst alles; past het niet, dan stap voor stap inkorten.
  for (const [nameLen, maxPlayers, withCourse] of [[12, MAX_PLAYERS, true], [12, MAX_PLAYERS, false], [8, MAX_PLAYERS, false], [6, 4, false]]) {
    const json = build(nameLen, maxPlayers, withCourse);
    if (bytes(json) <= MAX_STATE_BYTES) return json;
  }
  return build(4, 4, false);
}

// Opdracht van het scherm lezen; onbekend of kapot = null.
export function decodeCommand(text) {
  let cmd;
  try { cmd = JSON.parse(text); } catch { return null; }
  if (!cmd || typeof cmd !== 'object') return null;
  if (cmd.c === 'hi') return { type: 'hello' };
  const d = Math.sign(Number(cmd.d));
  if (cmd.c === 'h' && d) return { type: 'hole', delta: d };
  if (cmd.c === 's' && d && Number.isInteger(cmd.p) && cmd.p >= 0 && cmd.p < MAX_PLAYERS) {
    return { type: 'score', player: cmd.p, delta: d };
  }
  return null;
}
