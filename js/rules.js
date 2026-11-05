// Golfregels in het kort (Regels van golf, editie 2023). Voor in de app (knop Regels) en de
// website (golfregels.html). Kort: één regel als samenvatting, daaronder wat je kunt doen.
// marks: kleuren van paaltjes of lijnen, als die bij de situatie horen.

export const RULES = [
  {
    id: 'wit', title: 'Witte paaltjes: buiten de baan', marks: ['#FFFFFF'], rule: 'Regel 18.2',
    short: 'Bal buiten de baan: 1 strafslag, opnieuw van je vorige plek.',
    body: 'Je bal is buiten de baan als hij helemaal voorbij de binnenkant van de witte paaltjes ligt. Speel met 1 strafslag opnieuw van de plek van je vorige slag (slag en afstand). Twijfel je? Sla meteen een provisionele bal. Heeft de club plaatselijke regel E-5, dan mag je ook met 2 strafslagen droppen bij de fairway, naast de plek waar de bal verdween. Witte paaltjes zijn geen obstakel: geen straffeloze ontheffing.',
  },
  {
    id: 'geel', title: 'Gele paaltjes: penaltygebied', marks: ['#E8C33A'], rule: 'Regel 17',
    short: 'Spelen zoals hij ligt, of 1 strafslag: terug naar je vorige plek of terug op de lijn.',
    body: 'Je mag de bal zonder straf spelen zoals hij ligt. Met 1 strafslag kun je kiezen: slag en afstand (opnieuw van je vorige plek), of terug-op-de-lijn: droppen op een lijn van de vlag door het punt waar de bal de rand van het gebied het laatst kruiste, zo ver naar achteren als je wilt.',
  },
  {
    id: 'rood', title: 'Rode paaltjes: penaltygebied', marks: ['#C8402E'], rule: 'Regel 17',
    short: 'Als geel, plus zijwaarts droppen binnen 2 stoklengtes. 1 strafslag.',
    body: 'Zelfde keuzes als bij geel (spelen zoals hij ligt, slag en afstand, terug-op-de-lijn), en daarnaast zijwaarts: met 1 strafslag droppen binnen 2 stoklengtes van het punt waar de bal de rand van het rode gebied het laatst kruiste, niet dichter bij de hole.',
  },
  {
    id: 'blauw', title: 'Blauwe paaltjes of lijn: grond in bewerking', marks: ['#3B6FB6'], rule: 'Regel 16.1',
    short: 'Gratis ontheffing: dichtstbijzijnde punt + 1 stoklengte.',
    body: 'Ligt je bal erin, of sta je erin voor je slag? Zoek het dichtstbijzijnde punt waar je er helemaal geen last meer van hebt, niet dichter bij de hole, en drop binnen 1 stoklengte daarvan. Geen straf. Spelen zoals hij ligt mag ook, tenzij de club dat verbiedt.',
  },
  {
    id: 'groen', title: 'Blauw met groene kop: verboden te spelen', marks: ['#3B6FB6', '#2F7A4E'], rule: 'Regel 16.1f en 17.1e',
    short: 'Je mag hier niet spelen; neem altijd ontheffing.',
    body: 'Vaak natuur of jonge aanplant. In het algemene gebied: gratis ontheffing zoals bij grond in bewerking. Ligt de zone in een penaltygebied (rode of gele paaltjes erbij), dan neem je ontheffing met 1 strafslag zoals bij rood of geel.',
  },
  {
    id: 'onspeelbaar', title: 'Onspeelbare bal (struiken, boom)', marks: [], rule: 'Regel 19',
    short: 'Jij beslist. 1 strafslag: terug, terug op de lijn of 2 stoklengtes zijwaarts.',
    body: 'Overal behalve in een penaltygebied mag je je bal onspeelbaar verklaren. Met 1 strafslag kies je: slag en afstand (opnieuw van je vorige plek); terug-op-de-lijn (van de vlag door de bal naar achteren); of zijwaarts binnen 2 stoklengtes van de bal, niet dichter bij de hole. In een bunker blijf je bij zijwaarts en terug-op-de-lijn in de bunker; voor 2 strafslagen mag je terug-op-de-lijn buiten de bunker.',
  },
  {
    id: 'verloren', title: 'Verloren bal en provisionele bal', marks: [], rule: 'Regel 18.2 en 18.3',
    short: '3 minuten zoeken. Niet gevonden: 1 strafslag, opnieuw van je vorige plek.',
    body: 'Je mag 3 minuten zoeken. Vind je hem niet, dan speel je met 1 strafslag opnieuw van de plek van je vorige slag. Denk je dat de bal verloren of buiten de baan is? Zeg dat je een provisionele bal speelt en sla die meteen: dat scheelt teruglopen. Vind je de eerste bal binnen 3 minuten (niet buiten de baan), dan speel je die.',
  },
  {
    id: 'obstakel', title: 'Paden, sprinklers en andere obstakels', marks: [], rule: 'Regel 16.1',
    short: 'Vast obstakel in de weg: gratis ontheffing, punt + 1 stoklengte.',
    body: 'Ligt je bal op of sta je op een verhard pad, sprinklerkop of ander vast, kunstmatig obstakel: dichtstbijzijnde punt van volledige ontheffing, niet dichter bij de hole, droppen binnen 1 stoklengte. Losse obstakels (hark, blikje) mag je gewoon weghalen.',
  },
  {
    id: 'ingebed', title: 'Ingebedde bal', marks: [], rule: 'Regel 16.3',
    short: 'Bal in zijn eigen pitchmark: gratis droppen direct erachter.',
    body: 'Zit je bal in het algemene gebied (niet in zand) vast in zijn eigen inslagputje, dan drop je zonder straf binnen 1 stoklengte direct achter die plek, niet dichter bij de hole.',
  },
  {
    id: 'los', title: 'Takjes, bladeren en steentjes', marks: [], rule: 'Regel 15.1',
    short: 'Weghalen mag overal, ook in bunker en penaltygebied.',
    body: 'Losse natuurlijke voorwerpen mag je overal weghalen. Beweegt je bal daardoor, dan krijg je 1 strafslag en leg je hem terug; op de green is dat zonder straf.',
  },
  {
    id: 'bunker', title: 'In de bunker', marks: [], rule: 'Regel 12',
    short: 'Zand niet aanraken met je club vóór je slag. Daarna harken.',
    body: 'Raak het zand niet aan met je club vlak voor of achter de bal, bij een oefenswing of in je backswing (2 strafslagen). Losse voorwerpen weghalen mag. Na je slag hark je je sporen glad.',
  },
  {
    id: 'green', title: 'Op de green', marks: [], rule: 'Regel 13',
    short: 'Markeren, schoonmaken en pitchmarks repareren mag. Vlag mag erin.',
    body: 'Markeer je bal voor je hem oppakt en leg hem op dezelfde plek terug. Pitchmarks en spikeschade mag je repareren. Je mag putten met de vlag in de hole. Raakt je putt vanaf de green een andere bal op de green: 2 strafslagen (strokeplay).',
  },
  {
    id: 'droppen', title: 'Zo drop je', marks: [], rule: 'Regel 14.3',
    short: 'Vanaf kniehoogte, in het ontheffingsgebied blijven.',
    body: 'Laat de bal recht vallen vanaf kniehoogte. Hij moet in het ontheffingsgebied neerkomen en blijven liggen. Rolt hij eruit, drop dan nog een keer; rolt hij er weer uit, leg hem dan neer waar hij de tweede keer de grond raakte. Een stoklengte is je langste club behalve de putter.',
  },
  {
    id: 'verkeerd', title: 'Verkeerde bal gespeeld', marks: [], rule: 'Regel 6.3',
    short: '2 strafslagen en alsnog je eigen bal spelen.',
    body: 'In strokeplay krijg je 2 strafslagen; de slagen met de verkeerde bal tellen niet. Speel daarna je eigen bal. Zet een eigen stipje op je bal, dan herken je hem altijd.',
  },
  {
    id: 'stableford', title: 'Stableford: oprapen', marks: [], rule: 'Regel 21.1',
    short: 'Geen punt meer te halen? Raap op, dat scheelt tijd.',
    body: 'Bij stableford tellen punten per hole. Kun je op een hole geen punt meer halen, raap dan je bal op en noteer een streep. Voor je handicap telt per hole hooguit netto dubbel bogey.',
  },
  {
    id: 'etiquette', title: 'Etiquette en de buggy', marks: [], rule: 'Regel 1.2',
    short: 'Fore roepen, divots terug, tempo houden, buggy van tees en greens.',
    body: 'Roep hard “Fore!” als je bal richting mensen gaat. Leg divots terug, hark de bunker en repareer pitchmarks. Houd tempo en laat een snellere flight door. Met de buggy: blijf op de paden waar dat moet, nooit op tees, greens of voorgreens, en volg de buggyregels van de club.',
  },
];
