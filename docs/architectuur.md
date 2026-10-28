# Architectuur

## C1 – systeemcontext

Wie gebruikt Golfscore, en met welke systemen buiten de app praat het. Een uitgebreidere
versie met uitleg per relatie staat in [c1-systeemcontext.html](c1-systeemcontext.html).

```mermaid
flowchart TB
  golfer["<b>Golfer</b><br/>[persoon]<br/>Speelt met de app op de telefoon"]
  beheerder["<b>Beheerder</b><br/>[persoon]<br/>Beheert gebruikers en baangegevens"]
  bezoeker["<b>Bezoeker</b><br/>[persoon]<br/>Zoekt een baan of wil de app installeren"]

  golfscore["<b>Golfscore</b><br/>[softwaresysteem]<br/>Web-app die ook zonder bereik werkt, opslag en<br/>synchronisatie op golf.kapital.nl, beheerpagina<br/>en website met meer dan 100 banen"]

  telefoon["<b>Telefoon en browser</b><br/>[extern]<br/>GPS en spraakherkenning"]
  osm["<b>OpenStreetMap</b><br/>[extern]<br/>Overpass-API en kaarttegels"]
  github["<b>GitHub</b><br/>[extern]<br/>Broncode, Pages en Actions"]
  clubs["<b>Websites van clubs</b><br/>[extern]<br/>Scorekaarten, rating en slope"]

  golfer -- "kiest baan en spelers, spreekt of tikt scores,<br/>ziet afstand en handicap" --> golfscore
  beheerder -- "bekijkt registraties, sessies en GPS,<br/>geeft GPS-rechten" --> golfscore
  bezoeker -- "leest banen per provincie en uitleg<br/>(ook zoekmachines en AI)" --> golfscore
  golfscore -- "spraak naar tekst, locatie" --> telefoon
  golfscore -- "holes, tees en greens, kaarttegels" --> osm
  github -. "host de app, test en rolt uit via SSH" .-> golfscore
  golfscore -- "haalt scorekaarten op (via Actions)" --> clubs

  classDef persoon fill:#1E4D36,color:#FBF8F1,stroke:#1E4D36
  classDef systeem fill:#2F6B4C,color:#FBF8F1,stroke:#2F6B4C
  classDef extern fill:#E2D7C1,color:#1F2A22,stroke:#C9BCA2
  class golfer,beheerder,bezoeker persoon
  class golfscore systeem
  class telefoon,osm,github,clubs extern
```
