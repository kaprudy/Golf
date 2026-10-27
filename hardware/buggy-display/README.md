# Buggy-scherm voor Golfscore

Een klein scherm op de golfbuggy dat via Bluetooth met de Golfscore-app op je telefoon praat.
Het toont de huidige hole en de stand, en met de knoppen pas je scores aan zonder je telefoon
te pakken. De telefoon blijft de baas: alles wordt in de app bewaard (en in de cloud).

```
 ┌──────────────────────────┐
 │ Hole 4            BT 82% │
 │ Par 4  SI 4  349 m       │
 ├──────────────────────────┤
 │▌Rudy          5      +3 ▐│  ← gekozen speler
 │ Peter         4       E  │
 ├──────────────────────────┤
 │ A:-  B:speler  C:+       │
 └──────────────────────────┘
```

## Wat heb je nodig

| | Apparaat | Waarom | Ongeveer |
|---|---|---|---|
| **Aanbevolen** | **M5Stack CoreInk** | E-ink: goed leesbaar in de zon, zuinig, echte knoppen (werkt met handschoen) | € 40 |
| Alternatief | M5Stack Core2 | Groter kleurenscherm met aanraken; in fel zonlicht minder goed leesbaar | € 55 |

Verder: een **USB-C-kabel** (om te programmeren en op te laden) en een **houder** voor op de
buggy, bijvoorbeeld een telefoon- of fietsstuurhouder, of klittenband. Het apparaat is niet
waterdicht: gebruik bij regen een klein plastic hoesje.

Controleer of het apparaat nog leverbaar is (bijv. bij m5stack.com of een Nederlandse
elektronicawinkel). Dezelfde software werkt op meer M5Stack-apparaten, omdat de bibliotheek
het apparaat zelf herkent.

## Software op het apparaat zetten

1. Installeer **Visual Studio Code** en daarin de extensie **PlatformIO IDE**.
2. Open in VS Code de map `hardware/buggy-display` uit deze repository.
3. Sluit het apparaat aan met USB-C.
4. Kies onderin PlatformIO de omgeving **coreink** (of **core2**) en klik op **Upload** (→).

Met de opdrachtregel kan het ook: `pio run -e coreink -t upload`.

Na het opstarten toont het scherm *"Open de app en tik op Verbinden"*.

## Koppelen met de app

1. Open Golfscore in **Chrome op Android**.
2. Ga naar **⚙️ Instellingen → Buggy-scherm (Bluetooth) → Verbinden met buggy-scherm**.
3. Kies **Golfscore Buggy** in de lijst.

Bovenin het rondescherm staat dan *"Buggy-scherm verbonden"*. Valt de verbinding weg (te ver
weg, telefoon op slot), dan probeert de app het zelf opnieuw zodra de app weer open is.

**iPhone:** Safari ondersteunt geen Bluetooth vanuit een website. Op de iPhone werkt het alleen
met een browser die dat wel kan, zoals *Bluefy* (App Store), of later met een echte App Store-app.

## Bediening

**CoreInk (knoppen)**: de multifunctieknop aan de zijkant kan omhoog, omlaag en ingedrukt
worden (A, C en B). Zitten + en − bij jou net andersom, laat het weten: dan draai ik ze om.

| Actie | Knop |
|---|---|
| Slag erbij | C kort |
| Slag eraf | A kort |
| Volgende speler | B kort |
| Volgende hole | B lang |
| Vorige hole | A lang |

**Core2 (aanraken)**: tik op een speler om hem te kiezen; onderste balk *− / Speler / +*;
bovenste balk links/rechts = vorige/volgende hole.

Een lege score begint bij **par**, net als de +/− knoppen in de app. Het scherm laat de wijziging
meteen zien; de app stuurt direct de echte stand terug.

## Hoe het werkt

De app en het scherm praten via Bluetooth Low Energy (BLE). Het scherm is een *peripheral* met
één service en twee kenmerken:

| | UUID | Richting | Inhoud |
|---|---|---|---|
| Service | `480d22ab-2fa5-4c57-82c2-638cf27025df` | | |
| Stand | `7d07a84e-acbe-4784-8dd8-20c1be5a8b3f` | app → scherm (schrijven) | `{"v":1,"h":4,"p":4,"i":4,"m":349,"pl":[["Rudy",5,23,3]]}` |
| Invoer | `06bd9c2e-ebfd-4f11-8e80-3b541c03f86a` | scherm → app (notify) | `{"c":"s","p":0,"d":1}` (score), `{"c":"h","d":1}` (hole) |

Het protocol staat in [`js/buggy-protocol.js`](../../js/buggy-protocol.js) (met tests) en
de firmware in [`src/main.cpp`](src/main.cpp).

## Wat is getest en wat niet

- **Getest:** het protocol (unit tests), de koppeling in de app met een nagebootst
  Bluetooth-apparaat in Chrome, en de firmware-logica (stand inlezen met de echte ArduinoJson,
  scores aanpassen) op een computer.
- **Nog niet getest:** op een echt M5Stack-apparaat. De software is gecontroleerd tegen de
  broncode van de gebruikte bibliotheken, maar niet voor de chip gebouwd. Meld het als er bij
  het bouwen of gebruiken iets misgaat, met de foutmelding erbij.
- **Batterijduur** is nog niet gemeten. Laad het apparaat voor de ronde volledig op en neem
  eventueel een kleine powerbank mee.
- Er is geen koppelcode: iemand in de buurt met dezelfde app zou kunnen verbinden. Voor gebruik
  op de baan is dat een klein risico; een koppelcode kan later worden toegevoegd.
