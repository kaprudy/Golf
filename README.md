# ⛳ Golfscore – spraakgestuurde scorekaart

Een webapp voor op je telefoon om tijdens het lopen golfslagen bij te houden.
Druk op de microfoon en zeg bijvoorbeeld:

> „Hole 4, Rudy 5 slagen, Peter 3 slagen”

Aan het eind krijg je een analyse per speler met de **score differential en
handicapberekening** volgens het World Handicap System (WHS) dat de NGF gebruikt.

## Wat kan de app?

- **Inspreken** (Nederlands) of typen. Herkent o.a.:
  - `Hole 4, Rudy 5 slagen, Peter 3 slagen`
  - `Rudy vijf en Peter drie op de vierde hole`
  - `Rudy par, Peter bogey` / `Rudy een birdie` / `Peter dubbel bogey` / `hole in one`
  - `5 slagen voor Rudy`
  - Zonder holenummer geldt de huidige hole; als iedereen een score heeft gaat de app door naar de volgende hole.
  - Kleine spraakfouten in namen („Ruddy”, „Pieter”) worden opgevangen. Een nieuwe naam wordt automatisch als speler toegevoegd.
- **Ongedaan maken** direct na elke invoer, plus **+/−-knoppen** per speler.
- **Scorekaart** met kleuren (birdie, bogey, …) die je met de hand kunt aanpassen.
- **Analyse** per speler: bruto, tegen par, Stableford, verdeling birdies/pars/bogeys, beste en lastigste hole,
  score differential en handicap(-indicatie) – met uitleg hoe het berekend is.
- **Historie**: sla rondes op; na 3 rondes berekent de app een handicap index volgens de WHS-tabel (beste 8 van de laatste 20).
- **Werkt offline** op de baan (behalve de AI) en is te installeren als app op je beginscherm.
- **AI (optioneel)**: met een Claude API-sleutel worden lastige zinnen alsnog begrepen en schrijft Claude een
  analyse met tips per speler, en controleert hij of alles wat je hebt ingesproken overeenkomt met de scorekaart.

## Handicapberekening (WHS)

| Stap | Formule |
|---|---|
| Course handicap (18 holes) | HI × slope / 113 + (CR − par) |
| Course handicap (9 holes) | HI/2 × slope / 113 + (CR9 − par9) |
| Max. score per hole | netto double bogey (par + 2 + handicapslagen); zonder handicap par + 5 |
| Score differential | 113 / slope × (aangepaste bruto score − course rating) |
| 9 holes → 18 holes | 9-holes differential + (0,52 × HI + 1,2); zonder handicap: × 2 als indicatie |
| Handicap index | WHS-tabel: 3 rondes → laagste − 2, … , 20 rondes → gemiddelde van beste 8 |

De berekening zit in [`js/handicap.js`](js/handicap.js) en wordt getest in `tests/`.
Het is een eigen berekening als hulpmiddel; je officiële handicap registreer je via de NGF/je club.

## Eerst instellen (één keer)

Open **Instellingen**:

1. **Spelers**: namen, eventueel huidige handicap index en de tee (geel/rood/…).
2. **Baan**: vul de **par en stroke index per hole** in van de scorekaart van de club
   (standaard staat alles op par 4). De course ratings/slopes van Hooge Graven
   (geel 71,7/129, wit 72,9/132, rood 72,4/124, blauw 74,5/127) komen uit openbare
   baangegevens – controleer ze op de scorekaart. Heb je officiële 9-holes ratings, vul die ook in.
3. **Welke holes**: eerste 9, laatste 9 of 18 holes.
4. Optioneel: **Claude API-sleutel** (maak er een op <https://console.anthropic.com>). De sleutel blijft alleen op je telefoon.

## Op je telefoon zetten

Spraakherkenning in de browser werkt alleen via **https**. De makkelijkste manier is GitHub Pages:

1. Merge deze code naar de `main`-branch.
2. Ga in GitHub naar **Settings → Pages** en kies bij *Source* **GitHub Actions**.
3. Na de volgende push staat de app op `https://<gebruikersnaam>.github.io/<repo>/`.
4. Open die link op je telefoon:
   - **iPhone (Safari)**: deelknop → *Zet op beginscherm*.
   - **Android (Chrome)**: menu ⋮ → *App installeren*.
5. Sta het gebruik van de microfoon toe als daarom gevraagd wordt.

## Lokaal draaien en testen

```bash
npm start        # webserver op http://localhost:8080
npm test         # tests voor tekstherkenning en handicapberekening
```

## Bestanden

| Bestand | Inhoud |
|---|---|
| `index.html`, `css/style.css` | Interface (mobiel) |
| `js/app.js` | Schermen, opslag (localStorage), spraak |
| `js/parser.js` | Herkenning van ingesproken tekst (werkt zonder internet) |
| `js/handicap.js` | WHS-handicapberekening |
| `js/ai.js` | Claude API: tekstherkenning als vangnet en eindanalyse |
| `js/vendor/anthropic-sdk.js` | Gebundelde `@anthropic-ai/sdk` 0.135.0 (MIT, zie LICENSE-bestand) |
| `sw.js`, `manifest.webmanifest` | Offline gebruik en installeren als app |
