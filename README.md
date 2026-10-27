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
  - Speel je alleen, dan is `Hol 1, 5 slagen` genoeg: een score zonder naam is voor de enige speler.
    Met meerdere spelers vraagt de app voor wie de score is.
  - Spraakfouten worden opgevangen: namen worden op klank vergeleken („Roedie”, „Ruddie” = Rudy),
    verhaspelde getallen herkend („fijf”, „ses”, „ach”) en „hal 1”, „hol 2” of „holdrie” = hole 1, 2, 3.
  - De app leert: koppel je een onbekend woord aan een speler, dan herkent hij het de volgende keer zelf
    (te zien en te wissen bij Instellingen → Spelers).
    De app vergelijkt meerdere varianten van wat de spraakherkenning hoorde en kiest de beste.
  - Een onbekende naam wordt nooit zomaar een nieuwe speler: de app vraagt eerst of het een
    bestaande speler is, een nieuwe speler, of genegeerd moet worden.
  - Twijfelt de app en heb je een API-sleutel ingesteld, dan kijkt de AI mee.
- **Ongedaan maken** direct na elke invoer, plus **+/−-knoppen** per speler.
- **Tellen tijdens het lopen**: tik op een speler voor elke slag (de telefoon trilt kort). Zolang je op
  die hole bent staat de score op *bezig*; naar de volgende hole gaan of de score inspreken rondt hem af.
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
2. **Baan**: voor Hooge Graven (18 holes en par 3) staan par, stroke index en lengtes van de
   officiële scorekaarten van de club al in de app. De course ratings/slopes (wit 72,9/132,
   geel 71,7/129, blauw 74,5/127, rood 72,4/124) staan niet op de scorekaart en komen uit
   openbare baangegevens – controleer ze bij de club. Voor andere banen vul je par en stroke index zelf in.
3. **Banen**: in de app staan Hooge Graven (18 holes en par 3), Golfclub Zwolle, Golfclub De Koepel (Wierden)
   en Sallandsche Golfclub De Hoek (Diepenveen). Er bestaat geen openbare lijst met Nederlandse baangegevens;
   de ratings komen van [1golf.eu](https://www.1golf.eu) – controleer ze op de scorekaart en vul de par per hole in.
   Andere banen voeg je toe met **+ Andere baan toevoegen**. Je **thuisbaan** (standaard Hooge Graven) staat bij
   elke nieuwe ronde vooraf gekozen.
4. **Baan voor de ronde**: de grote baan (18 holes) of de **par 3-baan** (9 holes, par 27; CR heren 24,4 / slope 68,
   dames 25,2 / slope 70). Op de grote baan kies je ook: eerste 9, laatste 9 of 18 holes.
   Rondes op de par 3-baan tellen niet mee voor de handicap index (te kort voor een WHS-qualifying ronde).
5. Optioneel: **Claude API-sleutel** (maak er een op <https://console.anthropic.com>). De sleutel blijft alleen op je telefoon.

## Op je telefoon zetten

Spraakherkenning in de browser werkt alleen via **https**. De makkelijkste manier is GitHub Pages:

1. Zorg dat de repository openbaar is (gratis GitHub Pages werkt alleen bij openbare repositories).
2. Ga in GitHub naar **Settings → Pages** en kies bij *Source* **GitHub Actions**.
3. Elke push naar de standaardbranch publiceert de app op `https://<gebruikersnaam>.github.io/<repo>/`
   (handmatig: *Actions → Test en publiceer → Run workflow*).
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

## Opslag in de cloud (Supabase)

Met een account worden spelers, banen, rondes en geleerde woorden in de cloud bewaard.
Op een nieuwe telefoon log je in en staat alles er weer. De app blijft offline werken en
synchroniseert zodra er internet is. De Claude API-sleutel blijft altijd alleen op de telefoon.

Eenmalig instellen in het Supabase-dashboard:

1. **SQL Editor → New query**: plak de inhoud van [`supabase/schema.sql`](supabase/schema.sql) en kies *Run*.
   Dit maakt de tabel `golf_state`, waarin iedere gebruiker alleen zijn eigen gegevens kan zien.
2. **Authentication → URL Configuration**: zet *Site URL* op `https://kaprudy.github.io/Golf/`
   en voeg dezelfde URL toe bij *Redirect URLs*.
3. **Authentication → Emails → Magic Link**: zet `{{ .Token }}` in de mail, zodat er ook een
   inlogcode in staat (handig op de iPhone, waar de link in Safari opent in plaats van in de app).
4. Vul in [`js/config.js`](js/config.js) de *Project URL* en de *anon/publishable key* in
   (Project Settings → API). Die sleutel mag in de app staan; de beveiliging zit in de database.

Let op: de ingebouwde mailserver van Supabase verstuurt alleen een paar mails per uur en alleen
naar leden van je Supabase-team. Voor andere gebruikers stel je een eigen SMTP-dienst in
(Authentication → Emails → SMTP Settings, bijvoorbeeld Resend of Brevo).

## Buggy-scherm (Bluetooth)

Een klein scherm op de golfbuggy (bijv. M5Stack CoreInk) toont de huidige hole en de stand,
en met de knoppen pas je scores aan. Het praat via Bluetooth met de app (Chrome op Android).
Alles over het apparaat, de software erop en het koppelen staat in
[`hardware/buggy-display/README.md`](hardware/buggy-display/README.md).
