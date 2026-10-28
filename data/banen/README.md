# Banen rond Dedemsvaart (≤ 80 km)

Baangegevens voor import in de app: 80 golfbanen (75 NL, 5 DE) binnen 80 km hemelsbreed van
Dedemsvaart, verzameld op 28-10-2026 uit de scorekaarten van de clubs (waar die er niet zijn: Hole19,
Golfify, GolfPass; zie `scorecard.source` en `scorecard.notes` per baan).

| Bestand | Inhoud |
|---|---|
| `<slug>/course.json` | één baan: naam, adres, GPS, afstand, omschrijving, contact, lussen met tees (lengte, CR, slope) en per hole par, SI en lengte per tee |
| `courses.json` | alle `course.json` samen, gesorteerd op afstand (dit importeren) |
| `courses.csv` | één rij per baan (`;`-gescheiden, UTF-8) |
| `holes.csv` | één rij per hole per lus |
| `OVERZICHT.md` | leesbaar verslag per baan |

De originele scorekaarten (PDF's, afbeeldingen, HTML van de pagina) staan op de branch
**`scorekaarten`**, onder dezelfde paden als in `scorecard.files` (`<slug>/scorecard/...`), zodat
deze branch en de server klein blijven.

`scorecard.complete` is `true` als par, SI en lengtes per tee van alle holes bekend zijn. Bij
pitch & putt-banen komen de gegevens meestal van Hole19/Golfify en is de lengte-eenheid niet altijd
zeker; dat staat dan in `scorecard.notes`.

## Opnieuw opbouwen

```
python tools/banen/build_course_index.py     # courses.json, CSV's en OVERZICHT.md uit de course.json's
python tools/banen/capture_scorecards.py     # screenshot + PDF van elke scorekaartpagina (Playwright + Chrome)
```

Screenshots komen in `<slug>/screenshots/` en blijven buiten git (zie `.gitignore`).

## In de app

```
node tools/banen/to-courses.mjs            # zet de banen in js/courses.js (tussen <banen-regio>)
node tools/banen/to-courses.mjs --check    # alleen tonen wat er zou komen
```

Elke lus (of 18-holes combinatie) wordt een baan in `DEFAULT_COURSES`. Banen die al met de hand in
`js/courses.js` staan (Hooge Graven, De Hoek, Gelpenberg, Driene, Lochem, …) worden overgeslagen; zie
`SKIP`, `REPLACE` en `LABEL` in het script. Niet overgenomen: lussen van 12 holes (de app kent 9 of 18),
banen zonder holegegevens die geen par 3-baan zijn, en tees waarvan de par afwijkt van die van de baan.
De cacheversie in `sw.js` hoeft niet meer met de hand omhoog: de deploy zet er de commit in.
