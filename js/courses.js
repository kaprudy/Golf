// Golfbanen in de app: één bron voor de app én het overzicht op golf.kapital.nl (site/banen.html).
// Puur gegevens, zonder afhankelijkheden.

// 18-holes baan waarvan we alleen de totale par en de tee-ratings kennen.
export function standardCourse(id, name, parTotal, tees, holeCount = 18) {
  return {
    id,
    name,
    holeCount,
    parTotal,
    pars: Array(holeCount).fill(4),
    si: Array.from({ length: holeCount }, (_, i) => i + 1),
    confirmed: false,
    tees: tees.map(([teeId, teeName, gender, rating, slope]) => ({ id: teeId, name: teeName, gender, rating, slope, rating9: null, slope9: null })),
  };
}

// Standaardbanen. Par, stroke index, lengtes en ratings komen van de scorekaarten en
// handicaptabellen van de clubs zelf, tenzij fromSources: true (openbare bronnen, nog vergelijken).
// Bij een 9-holes baan zijn rating en slope de 9-holes waarden; bij 18 holes zijn rating9/slope9
// de waarden voor holes 1–9 en rating9Back/slope9Back voor 10–18.
// Verhoog dataVersion als de gegevens van een baan wijzigen: opgeslagen banen worden dan bijgewerkt.
export const DEFAULT_COURSES = [
  {
    id: 'hooge-graven', province: 'Overijssel', town: 'Ommen',
    dataVersion: 3,
    location: { lat: 52.5455, lon: 6.4474 },
    website: 'https://hoogegraven.nl/',
    name: 'Hooge Graven (18 holes)',
    holeCount: 18,
    parTotal: 72,
    pars: [4, 3, 4, 4, 4, 5, 3, 5, 3, 5, 3, 4, 4, 4, 5, 4, 4, 4],
    si: [6, 14, 18, 4, 8, 2, 16, 12, 10, 9, 17, 15, 3, 1, 13, 11, 5, 7],
    confirmed: true,
    tees: [
      { id: 'wit', name: 'Wit (heren)', gender: 'h', rating: 73.7, slope: 141, rating9: 35.7, slope9: 131, rating9Back: 38.1, slope9Back: 151,
        lengths: [401, 168, 301, 364, 364, 503, 167, 453, 182, 499, 172, 303, 368, 380, 458, 340, 394, 377] },
      { id: 'geel', name: 'Geel (heren)', gender: 'h', rating: 72.9, slope: 137, rating9: 35.3, slope9: 133, rating9Back: 37.6, slope9Back: 142,
        lengths: [387, 158, 295, 349, 349, 488, 159, 443, 172, 490, 157, 288, 358, 372, 435, 330, 381, 363] },
      { id: 'blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 70.1, slope: 127, rating9: 34.3, slope9: 128, rating9Back: 35.9, slope9Back: 126,
        lengths: [331, 147, 284, 340, 337, 478, 145, 386, 153, 407, 147, 277, 314, 353, 382, 282, 340, 304] },
      { id: 'rood-h', name: 'Rood (heren)', gender: 'h', rating: 68.5, slope: 122, rating9: 33.2, slope9: 115, rating9Back: 35.4, slope9Back: 128,
        lengths: [331, 137, 251, 296, 294, 410, 126, 382, 153, 404, 133, 257, 310, 325, 377, 282, 340, 304] },
      { id: 'oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 65.2, slope: 110, rating9: 31.8, slope9: 106, rating9Back: 33.7, slope9Back: 115,
        lengths: [290, 113, 211, 246, 257, 360, 102, 330, 136, 365, 113, 195, 268, 284, 367, 235, 290, 255] },
      { id: 'geel-d', name: 'Geel (dames)', gender: 'd', rating: 79.4, slope: 145, rating9: 38.1, slope9: 139, rating9Back: 41.3, slope9Back: 152,
        lengths: [387, 158, 295, 349, 349, 488, 159, 443, 172, 490, 157, 288, 358, 372, 435, 330, 381, 363] },
      { id: 'blauw', name: 'Blauw (dames)', gender: 'd', rating: 75.5, slope: 134, rating9: 37.0, slope9: 131, rating9Back: 38.5, slope9Back: 139,
        lengths: [331, 147, 284, 340, 337, 478, 145, 386, 153, 407, 147, 277, 314, 353, 382, 282, 340, 304] },
      { id: 'rood', name: 'Rood (dames)', gender: 'd', rating: 73.7, slope: 135, rating9: 35.6, slope9: 129, rating9Back: 38.1, slope9Back: 140,
        lengths: [331, 137, 251, 296, 294, 410, 126, 382, 153, 404, 133, 257, 310, 325, 377, 282, 340, 304] },
      { id: 'oranje', name: 'Oranje (dames)', gender: 'd', rating: 69.6, slope: 121, rating9: 33.4, slope9: 115, rating9Back: 36.2, slope9Back: 127,
        lengths: [290, 113, 211, 246, 257, 360, 102, 330, 136, 365, 113, 195, 268, 284, 367, 235, 290, 255] },
    ],
  },
  {
    // 9 holes; voor 18 holes speel je ze twee keer (holes 10-18 = tweede ronde, met eigen S.I.).
    id: 'par3', province: 'Overijssel', town: 'Ommen',
    dataVersion: 3,
    location: { lat: 52.5439, lon: 6.4500 },
    website: 'https://hoogegraven.nl/',
    name: 'Hooge Graven Par 3',
    holeCount: 18,
    countsForIndex: false, // te kort voor een WHS-qualifying ronde
    parTotal: 54,
    pars: Array(18).fill(3),
    si: [9, 3, 7, 11, 15, 5, 13, 1, 17, 10, 4, 8, 12, 16, 6, 14, 2, 18],
    confirmed: true,
    tees: [
      { id: 'par3-heren', name: 'Heren', gender: 'h', rating: 48.9, slope: 70, rating9: 24.5, slope9: 70,
        lengths: [89, 111, 86, 73, 87, 128, 78, 100, 93, 89, 111, 86, 73, 87, 128, 78, 100, 93] },
      { id: 'par3-dames', name: 'Dames', gender: 'd', rating: 50.8, slope: 77, rating9: 25.4, slope9: 77,
        lengths: [89, 111, 86, 73, 87, 128, 78, 100, 93, 89, 111, 86, 73, 87, 128, 78, 100, 93] },
    ],
  },
  // Banen in de regio (par, stroke index en ratings uit openbare bronnen; nog controleren met de
  // scorekaart van de club, daarom confirmed: false). Tees zonder bekende rating: ratingUnknown.
  {
    id: 'zwolle', province: 'Overijssel', town: 'Zwolle', dataVersion: 2, name: 'Golfclub Zwolle', holeCount: 18, parTotal: 72, pars: [4, 5, 3, 5, 4, 4, 4, 3, 4, 4, 3, 4, 4, 4, 5, 3, 4, 5], si: [11, 1, 15, 5, 3, 13, 9, 17, 7, 2, 16, 6, 10, 14, 12, 18, 8, 4], confirmed: false, fromSources: true, location: {lat: 52.537, lon: 6.15}, website: 'https://www.golfclubzwolle.nl/',
    tees: [
      {id: 'zwolle-geel', name: 'Geel (heren)', gender: 'h', rating: 71.4, slope: 131, rating9: null, slope9: null},
      {id: 'zwolle-rood', name: 'Rood (dames)', gender: 'd', rating: 72.8, slope: 129, rating9: null, slope9: null},
    ],
  },
  {
    id: 'de-koepel', province: 'Overijssel', town: 'Wierden', dataVersion: 3, name: 'Golfclub De Koepel (Wierden)', holeCount: 18, parTotal: 70, pars: [4, 5, 3, 4, 5, 3, 4, 4, 3, 5, 3, 4, 4, 4, 4, 4, 4, 3], si: [8, 6, 18, 4, 2, 16, 12, 10, 14, 5, 17, 1, 9, 3, 15, 7, 11, 13], confirmed: false, fromSources: true, location: {lat: 52.369, lon: 6.583}, website: 'https://www.golfclubdekoepel.nl/',
    tees: [
      { id: 'koepel-geel', name: 'Geel (heren)', gender: 'h', rating: 70.0, slope: 129, rating9: 34.6, slope9: 129, rating9Back: 35.5, slope9Back: 129,
        lengths: [303, 465, 134, 339, 459, 166, 320, 342, 168, 433, 149, 399, 347, 379, 282, 391, 340, 160] },
      { id: 'koepel-rood-h', name: 'Rood (heren)', gender: 'h', rating: 66.2, slope: 112, rating9: 32.7, slope9: 112, rating9Back: 33.6, slope9Back: 112 },
      { id: 'koepel-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 61.8, slope: 100, rating9: 30.6, slope9: 102, rating9Back: 31.2, slope9Back: 97 },
      { id: 'koepel-geel-d', name: 'Geel (dames)', gender: 'd', rating: 75.7, slope: 137, rating9: 37.4, slope9: 133, rating9Back: 38.4, slope9Back: 139,
        lengths: [303, 465, 134, 339, 459, 166, 320, 342, 168, 433, 149, 399, 347, 379, 282, 391, 340, 160] },
      { id: 'koepel-rood', name: 'Rood (dames)', gender: 'd', rating: 70.8, slope: 128, rating9: 34.8, slope9: 127, rating9Back: 36.0, slope9Back: 129 },
      { id: 'koepel-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 64.2, slope: 102, rating9: 32.1, slope9: 103, rating9Back: 32.2, slope9Back: 100 },
    ],
  },
  {
    id: 'de-hoek', province: 'Overijssel', town: 'Diepenveen', dataVersion: 3, name: 'Sallandsche Golfclub De Hoek (Diepenveen)', holeCount: 18, parTotal: 72, pars: [4, 4, 4, 5, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 3], si: [7, 5, 17, 3, 13, 11, 9, 1, 15, 4, 16, 12, 10, 18, 2, 14, 6, 8], confirmed: true, location: {lat: 52.297, lon: 6.163}, website: 'https://sallandsche.nl/',
    tees: [
      { id: 'hoek-wit', name: 'Wit (heren)', gender: 'h', rating: 72.4, slope: 131, rating9: 36.1, slope9: 136, rating9Back: 36.4, slope9Back: 125,
        lengths: [361, 421, 270, 502, 150, 364, 441, 343, 130, 396, 454, 339, 347, 128, 380, 510, 324, 196] },
      { id: 'hoek-geel', name: 'Geel (heren)', gender: 'h', rating: 71.5, slope: 128, rating9: 35.8, slope9: 131, rating9Back: 35.8, slope9Back: 125,
        lengths: [341, 395, 265, 502, 145, 342, 441, 338, 130, 379, 454, 331, 327, 116, 375, 450, 319, 192] },
      { id: 'hoek-blauw', name: 'Blauw (heren)', gender: 'h', rating: 68.5, slope: 118, rating9: 34.4, slope9: 114, rating9Back: 34.1, slope9Back: 123,
        lengths: [311, 331, 253, 431, 130, 297, 429, 279, 109, 325, 394, 300, 287, 116, 318, 424, 305, 170] },
      { id: 'hoek-rood', name: 'Rood (heren)', gender: 'h', rating: 67.4, slope: 115, rating9: 33.8, slope9: 110, rating9Back: 33.7, slope9Back: 119,
        lengths: [299, 331, 227, 431, 120, 297, 367, 279, 109, 325, 394, 300, 282, 104, 318, 386, 285, 161] },
      { id: 'hoek-oranje', name: 'Oranje (heren)', gender: 'h', rating: 63.4, slope: 109, rating9: 31.1, slope9: 107, rating9Back: 32.7, slope9Back: 112,
        lengths: [200, 240, 177, 350, 69, 215, 290, 212, 89, 289, 367, 294, 250, 104, 292, 386, 271, 111] },
      { id: 'hoek-geel-d', name: 'Geel (dames)', gender: 'd', rating: 77.4, slope: 140, rating9: 38.6, slope9: 139, rating9Back: 38.8, slope9Back: 141,
        lengths: [341, 395, 265, 502, 145, 342, 441, 338, 130, 379, 454, 331, 327, 116, 375, 450, 319, 192] },
      { id: 'hoek-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 73.8, slope: 130, rating9: 36.7, slope9: 131, rating9Back: 37.1, slope9Back: 130,
        lengths: [311, 331, 253, 431, 130, 297, 429, 279, 109, 325, 394, 300, 287, 116, 318, 424, 305, 170] },
      { id: 'hoek-rood-d', name: 'Rood (dames)', gender: 'd', rating: 72.6, slope: 128, rating9: 36.2, slope9: 126, rating9Back: 36.5, slope9Back: 129,
        lengths: [299, 331, 227, 431, 120, 297, 367, 279, 109, 325, 394, 300, 282, 104, 318, 386, 285, 161] },
      { id: 'hoek-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 67.6, slope: 112, rating9: 32.6, slope9: 105, rating9Back: 35.1, slope9Back: 120,
        lengths: [200, 240, 177, 350, 69, 215, 290, 212, 89, 289, 367, 294, 250, 104, 292, 386, 271, 111] },
    ],
  },
  {
    id: 'martensplek', province: 'Drenthe', town: 'Tiendeveen', dataVersion: 2, name: 'Golfclub Martensplek (Tiendeveen)', holeCount: 18, parTotal: 72, pars: [5, 4, 4, 4, 4, 3, 4, 3, 5, 5, 3, 4, 4, 4, 4, 4, 5, 3], si: [14, 8, 6, 4, 10, 18, 2, 16, 12, 1, 17, 7, 3, 11, 15, 5, 9, 13], confirmed: false, fromSources: true, location: {lat: 52.725, lon: 6.535}, website: null,
    tees: [
      {id: 'martensplek-wit', name: 'Wit (heren)', gender: 'h', rating: 72, slope: 113, rating9: null, slope9: null, ratingUnknown: true},
      {id: 'martensplek-rood', name: 'Rood (dames)', gender: 'd', rating: 72, slope: 113, rating9: null, slope9: null, ratingUnknown: true},
    ],
  },
  {
    id: 'gelpenberg', province: 'Drenthe', town: 'Aalden', dataVersion: 4, name: 'Drentse Golfclub De Gelpenberg (Aalden)', holeCount: 18, parTotal: 72, pars: [5, 3, 4, 5, 4, 4, 4, 3, 4, 4, 4, 3, 5, 4, 4, 5, 3, 4], si: [6, 8, 14, 12, 4, 18, 2, 16, 10, 13, 1, 17, 9, 3, 7, 11, 15, 5], confirmed: true, location: { lat: 52.801, lon: 6.7022 }, website: 'https://www.dgcdegelpenberg.nl/',
    tees: [
      { id: 'gelpenberg-wit-h', name: 'Wit (heren)', gender: 'h', rating: 74.2, slope: 142, rating9: 37.1, slope9: 135, rating9Back: 37.2, slope9Back: 148, lengths: [506, 197, 366, 458, 423, 301, 398, 148, 369, 343, 388, 150, 481, 393, 385, 446, 184, 385] },
      { id: 'gelpenberg-geel-h', name: 'Geel (heren)', gender: 'h', rating: 73.1, slope: 139, rating9: 36.2, slope9: 142, rating9Back: 36.9, slope9Back: 138, lengths: [489, 174, 338, 443, 400, 274, 373, 139, 340, 337, 377, 127, 477, 381, 373, 441, 174, 374] },
      { id: 'gelpenberg-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 70.5, slope: 126, rating9: 35.0, slope9: 126, rating9Back: 35.6, slope9Back: 126, lengths: [432, 165, 307, 412, 360, 263, 336, 131, 319, 313, 351, 120, 441, 342, 342, 390, 159, 330] },
      { id: 'gelpenberg-rood-h', name: 'Rood (heren)', gender: 'h', rating: 69.4, slope: 117, rating9: 34.1, slope9: 121, rating9Back: 35.3, slope9Back: 114, lengths: [409, 147, 292, 403, 328, 237, 316, 108, 300, 304, 328, 109, 420, 334, 312, 380, 150, 317] },
      { id: 'gelpenberg-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 66.8, slope: 107, rating9: 32.8, slope9: 103, rating9Back: 34.1, slope9Back: 111, lengths: [369, 138, 253, 363, 283, 200, 274, 98, 233, 259, 288, 100, 365, 302, 281, 350, 134, 278] },
      { id: 'gelpenberg-geel-d', name: 'Geel (dames)', gender: 'd', rating: 79.6, slope: 140, rating9: 39.6, slope9: 139, rating9Back: 40.0, slope9Back: 142, lengths: [489, 174, 338, 443, 400, 274, 373, 139, 340, 337, 377, 127, 477, 381, 373, 441, 174, 374] },
      { id: 'gelpenberg-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 76.0, slope: 137, rating9: 38.1, slope9: 131, rating9Back: 38.0, slope9Back: 144, lengths: [432, 165, 307, 412, 360, 263, 336, 131, 319, 313, 351, 120, 441, 342, 342, 390, 159, 330] },
      { id: 'gelpenberg-rood-d', name: 'Rood (dames)', gender: 'd', rating: 73.7, slope: 134, rating9: 36.5, slope9: 131, rating9Back: 37.3, slope9Back: 136, lengths: [409, 147, 292, 403, 328, 237, 316, 108, 300, 304, 328, 109, 420, 334, 312, 380, 150, 317] },
      { id: 'gelpenberg-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 70.9, slope: 117, rating9: 34.7, slope9: 121, rating9Back: 36.3, slope9Back: 112, lengths: [369, 138, 253, 363, 283, 200, 274, 98, 233, 259, 288, 100, 365, 302, 281, 350, 134, 278] },
    ],
  },
  {
    id: 'twentsche', province: 'Overijssel', town: 'Ambt Delden', dataVersion: 2, name: 'Twentsche Golfclub (Ambt Delden)', holeCount: 18, parTotal: 72, pars: [4, 4, 3, 4, 5, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 4, 5], si: [5, 17, 13, 3, 11, 15, 7, 9, 1, 6, 14, 10, 4, 2, 16, 8, 18, 12], confirmed: false, fromSources: true, location: {lat: 52.272, lon: 6.712}, website: 'https://twentschegolfclub.nl/',
    tees: [
      {id: 'twentsche-blauw', name: 'Blauw (heren)', gender: 'h', rating: 72, slope: 113, rating9: null, slope9: null, lengths: [322, 244, 125, 310, 430, 134, 438, 316, 344, 354, 143, 395, 327, 339, 119, 299, 244, 386], ratingUnknown: true},
      {id: 'twentsche-geel', name: 'Geel (heren)', gender: 'h', rating: 72, slope: 113, rating9: null, slope9: null, ratingUnknown: true},
      {id: 'twentsche-rood', name: 'Rood (dames)', gender: 'd', rating: 72, slope: 113, rating9: null, slope9: null, ratingUnknown: true},
    ],
  },
  // Officiële scorekaarten en handicaptabellen van de clubs (opgehaald met tools/fetch-sources.mjs).
  {
    id: 'driene', province: 'Overijssel', town: 'Hengelo', dataVersion: 4, name: 'Golfclub Driene (Hengelo)', holeCount: 18, parTotal: 72, pars: [4, 3, 4, 5, 4, 3, 5, 4, 4, 4, 3, 4, 5, 4, 3, 4, 5, 4], si: [3, 17, 5, 9, 7, 13, 11, 1, 15, 4, 18, 6, 10, 8, 14, 2, 12, 16], confirmed: true, location: { lat: 52.2525, lon: 6.8249 }, website: 'https://www.golfclubdriene.nl/',
    tees: [
      { id: 'driene-geel-h', name: 'Geel (heren)', gender: 'h', rating: 69.5, slope: 124, rating9: 34.9, slope9: 125, rating9Back: 34.7, slope9Back: 123, lengths: [386, 112, 344, 412, 245, 144, 424, 393, 275, 373, 112, 335, 412, 245, 144, 372, 443, 275] },
      { id: 'driene-rood-h', name: 'Rood (heren)', gender: 'h', rating: 66.8, slope: 112, rating9: 33.6, slope9: 111, rating9Back: 33.3, slope9Back: 114, lengths: [359, 104, 306, 386, 230, 131, 372, 366, 242, 317, 104, 307, 386, 234, 131, 348, 393, 242] },
      { id: 'driene-geel-d', name: 'Geel (dames)', gender: 'd', rating: 74.8, slope: 137, rating9: 37.5, slope9: 136, rating9Back: 37.4, slope9Back: 137, lengths: [386, 112, 344, 412, 245, 144, 424, 393, 275, 373, 112, 335, 412, 245, 144, 372, 443, 275] },
      { id: 'driene-rood-d', name: 'Rood (dames)', gender: 'd', rating: 71.7, slope: 134, rating9: 36.0, slope9: 135, rating9Back: 35.7, slope9Back: 132, lengths: [359, 104, 306, 386, 230, 131, 372, 366, 242, 317, 104, 307, 386, 234, 131, 348, 393, 242] },
    ],
  },
  {
    id: 'lochem', province: 'Gelderland', town: 'Lochem', dataVersion: 4, name: 'Lochemse Golfclub (Lochem)', holeCount: 18, parTotal: 72, pars: [4, 5, 5, 4, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 4, 3, 5, 4], si: [6, 14, 10, 18, 2, 8, 4, 16, 12, 17, 3, 9, 11, 13, 1, 15, 7, 5], confirmed: true, location: { lat: 52.1384, lon: 6.3587 }, website: 'https://www.lochemsegolfclub.nl/',
    tees: [
      { id: 'lochem-wit-h', name: 'Wit (heren)', gender: 'h', rating: 74.2, slope: 130, rating9: 36.5, slope9: 134, rating9Back: 37.7, slope9Back: 126, lengths: [383, 470, 488, 317, 426, 176, 343, 150, 315, 454, 363, 366, 360, 158, 391, 183, 536, 417] },
      { id: 'lochem-geel-h', name: 'Geel (heren)', gender: 'h', rating: 72.0, slope: 131, rating9: 35.5, slope9: 126, rating9Back: 36.5, slope9Back: 135, lengths: [362, 454, 465, 305, 411, 146, 310, 118, 301, 437, 353, 327, 348, 150, 372, 161, 503, 380] },
      { id: 'lochem-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 70.3, slope: 129, rating9: 34.8, slope9: 124, rating9Back: 35.5, slope9Back: 134, lengths: [319, 422, 430, 305, 383, 146, 300, 118, 301, 437, 325, 327, 348, 138, 342, 152, 457, 350] },
      { id: 'lochem-rood-h', name: 'Rood (heren)', gender: 'h', rating: 68.4, slope: 119, rating9: 34.0, slope9: 117, rating9Back: 34.5, slope9Back: 122, lengths: [295, 396, 421, 276, 362, 134, 281, 102, 270, 402, 301, 308, 307, 132, 333, 137, 421, 328] },
      { id: 'lochem-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 66.2, slope: 111, rating9: 32.9, slope9: 114, rating9Back: 33.4, slope9Back: 108, lengths: [267, 370, 375, 254, 320, 134, 262, 95, 251, 367, 261, 305, 269, 125, 301, 123, 375, 280] },
      { id: 'lochem-geel-d', name: 'Geel (dames)', gender: 'd', rating: 78.6, slope: 139, rating9: 38.8, slope9: 137, rating9Back: 39.9, slope9Back: 140, lengths: [362, 454, 465, 305, 411, 146, 310, 118, 301, 437, 353, 327, 348, 150, 372, 161, 503, 380] },
      { id: 'lochem-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 76.5, slope: 132, rating9: 37.7, slope9: 132, rating9Back: 38.8, slope9Back: 132, lengths: [319, 422, 430, 305, 383, 146, 300, 118, 301, 437, 325, 327, 348, 138, 342, 152, 457, 350] },
      { id: 'lochem-rood-d', name: 'Rood (dames)', gender: 'd', rating: 73.9, slope: 128, rating9: 36.6, slope9: 126, rating9Back: 37.4, slope9Back: 131, lengths: [295, 396, 421, 276, 362, 134, 281, 102, 270, 402, 301, 308, 307, 132, 333, 137, 421, 328] },
      { id: 'lochem-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 71.1, slope: 128, rating9: 35.6, slope9: 125, rating9Back: 35.6, slope9Back: 131, lengths: [267, 370, 375, 254, 320, 134, 262, 95, 251, 367, 261, 305, 269, 125, 301, 123, 375, 280] },
    ],
  },
  {
    id: 'prinses-wilhelmina', province: 'Overijssel', town: 'Enschede', dataVersion: 4, name: 'Golfclub Prinses Wilhelmina (Enschede)', holeCount: 18, parTotal: 56, pars: [3, 4, 3, 3, 3, 3, 3, 3, 3, 3, 4, 3, 3, 3, 3, 3, 3, 3], si: [7, 13, 1, 3, 17, 15, 5, 9, 11, 8, 14, 2, 4, 18, 16, 6, 10, 12], confirmed: true, countsForIndex: false, location: { lat: 52.2344, lon: 6.8754 }, website: 'https://www.pwgolf.nl/',
    tees: [
      { id: 'prinses-wilhelmina-geel-h', name: 'Geel (heren)', gender: 'h', rating: 54.2, slope: 85, rating9: 27.1, slope9: 85, lengths: [144, 276, 211, 144, 78, 133, 105, 137, 134, 144, 263, 211, 144, 78, 133, 111, 137, 136] },
      { id: 'prinses-wilhelmina-rood-h', name: 'Rood (heren)', gender: 'h', rating: 53.8, slope: 84, rating9: 26.9, slope9: 84, lengths: [144, 276, 167, 144, 78, 133, 105, 137, 134, 144, 263, 167, 144, 78, 133, 111, 137, 136] },
      { id: 'prinses-wilhelmina-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 48.0, slope: 71, rating9: 24.0, slope9: 71, lengths: [80, 155, 102, 73, 78, 83, 45, 71, 61, 80, 155, 102, 73, 78, 83, 45, 71, 61] },
      { id: 'prinses-wilhelmina-geel-d', name: 'Geel (dames)', gender: 'd', rating: 57.0, slope: 95, rating9: 28.5, slope9: 95, lengths: [144, 276, 211, 144, 78, 133, 105, 137, 134, 144, 263, 211, 144, 78, 133, 111, 137, 136] },
      { id: 'prinses-wilhelmina-rood-d', name: 'Rood (dames)', gender: 'd', rating: 56.5, slope: 94, rating9: 28.3, slope9: 94, lengths: [144, 276, 167, 144, 78, 133, 105, 137, 134, 144, 263, 167, 144, 78, 133, 111, 137, 136] },
      { id: 'prinses-wilhelmina-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 49.6, slope: 79, rating9: 24.8, slope9: 79, lengths: [80, 155, 102, 73, 78, 83, 45, 71, 61, 80, 155, 102, 73, 78, 83, 45, 71, 61] },
    ],
  },
  {
    id: 'scherpenbergh', province: 'Gelderland', town: 'Lieren', dataVersion: 4, name: 'De Scherpenbergh Zwaluwen-Dassenbaan (Lieren)', holeCount: 18, parTotal: 72, pars: [5, 3, 4, 3, 4, 3, 5, 5, 4, 5, 3, 4, 3, 5, 3, 4, 4, 5], si: [5, 13, 7, 17, 3, 15, 11, 1, 9, 4, 14, 10, 18, 6, 12, 2, 16, 8], confirmed: true, location: { lat: 52.1469, lon: 6.0194 }, website: 'https://www.descherpenbergh.nl/',
    tees: [
      { id: 'scherpenbergh-geel-h', name: 'Geel (heren)', gender: 'h', rating: 70.3, slope: 127, rating9: 34.7, slope9: 132, rating9Back: 35.6, slope9Back: 123, lengths: [431, 151, 319, 130, 330, 160, 442, 455, 348, 450, 181, 361, 141, 418, 150, 380, 295, 446] },
      { id: 'scherpenbergh-rood-h', name: 'Rood (heren)', gender: 'h', rating: 66.2, slope: 117, rating9: 32.6, slope9: 109, rating9Back: 33.6, slope9Back: 125, lengths: [352, 134, 244, 106, 279, 129, 380, 366, 289, 427, 158, 328, 121, 372, 120, 319, 255, 374] },
      { id: 'scherpenbergh-geel-d', name: 'Geel (dames)', gender: 'd', rating: 76.4, slope: 140, rating9: 37.9, slope9: 140, rating9Back: 38.5, slope9Back: 141, lengths: [431, 151, 319, 130, 330, 160, 442, 455, 348, 450, 181, 361, 141, 418, 150, 380, 295, 446] },
      { id: 'scherpenbergh-rood-d', name: 'Rood (dames)', gender: 'd', rating: 71.6, slope: 124, rating9: 35.2, slope9: 121, rating9Back: 36.4, slope9Back: 127, lengths: [352, 134, 244, 106, 279, 129, 380, 366, 289, 427, 158, 328, 121, 372, 120, 319, 255, 374] },
    ],
  },
  {
    id: 'scherpenbergh-berken', province: 'Gelderland', town: 'Lieren', dataVersion: 4, name: 'De Scherpenbergh Berkenbaan (Lieren)', holeCount: 18, parTotal: 62, pars: [3, 4, 3, 3, 3, 4, 4, 3, 4, 3, 4, 3, 3, 3, 4, 4, 3, 4], si: [17, 1, 9, 7, 13, 5, 3, 15, 11, 18, 2, 10, 8, 14, 6, 4, 16, 12], confirmed: true, location: { lat: 52.1469, lon: 6.0194 }, website: 'https://www.descherpenbergh.nl/',
    tees: [
      { id: 'scherpenbergh-berken-geel-h', name: 'Geel (heren)', gender: 'h', rating: 56.5, slope: 90, rating9: 28.3, slope9: 90, lengths: [63, 266, 105, 125, 112, 244, 300, 84, 220, 63, 266, 105, 125, 112, 244, 300, 84, 220] },
      { id: 'scherpenbergh-berken-rood-h', name: 'Rood (heren)', gender: 'h', rating: 54.7, slope: 89, rating9: 27.4, slope9: 89, lengths: [63, 236, 105, 125, 112, 210, 242, 84, 160, 63, 236, 105, 125, 112, 210, 242, 84, 160] },
      { id: 'scherpenbergh-berken-geel-d', name: 'Geel (dames)', gender: 'd', rating: 59.1, slope: 98, rating9: 29.6, slope9: 98, lengths: [63, 266, 105, 125, 112, 244, 300, 84, 220, 63, 266, 105, 125, 112, 244, 300, 84, 220] },
      { id: 'scherpenbergh-berken-rood-d', name: 'Rood (dames)', gender: 'd', rating: 57.3, slope: 91, rating9: 28.7, slope9: 91, lengths: [63, 236, 105, 125, 112, 210, 242, 84, 160, 63, 236, 105, 125, 112, 210, 242, 84, 160] },
    ],
  },
  {
    id: 'gelpenberg-par3', province: 'Drenthe', town: 'Aalden', dataVersion: 4, name: 'De Gelpenberg Par-3 baan (Aalden)', holeCount: 9, parTotal: 27, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3], si: [1, 2, 3, 4, 5, 6, 7, 8, 9], confirmed: true, siUnknown: true, countsForIndex: false, location: { lat: 52.801, lon: 6.7022 }, website: 'https://www.dgcdegelpenberg.nl/',
    tees: [
      { id: 'gelpenberg-par3-geel-h', name: 'Geel (heren)', gender: 'h', rating: 24.3, slope: 65, rating9: null, slope9: null },
      { id: 'gelpenberg-par3-rood-d', name: 'Rood (dames)', gender: 'd', rating: 25.0, slope: 68, rating9: null, slope9: null },
    ],
  },
  {
    id: 'hildenberg', province: 'Friesland', town: 'Appelscha', dataVersion: 4, name: 'Golfpark De Hildenberg (Appelscha)', holeCount: 9, parTotal: 35, pars: [3, 5, 4, 3, 4, 4, 3, 5, 4], si: [1, 2, 3, 4, 5, 6, 7, 8, 9], confirmed: true, siUnknown: true, location: { lat: 52.9405, lon: 6.352 }, website: 'https://golfparkdehildenberg.nl/',
    tees: [
      { id: 'hildenberg-geel-h', name: 'Geel (heren)', gender: 'h', rating: 33.2, slope: 115, rating9: null, slope9: null },
      { id: 'hildenberg-rood-h', name: 'Rood (heren)', gender: 'h', rating: 31.7, slope: 110, rating9: null, slope9: null },
      { id: 'hildenberg-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 30.5, slope: 102, rating9: null, slope9: null },
      { id: 'hildenberg-geel-d', name: 'Geel (dames)', gender: 'd', rating: 35.6, slope: 126, rating9: null, slope9: null },
      { id: 'hildenberg-rood-d', name: 'Rood (dames)', gender: 'd', rating: 34.3, slope: 117, rating9: null, slope9: null },
      { id: 'hildenberg-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 31.9, slope: 106, rating9: null, slope9: null },
    ],
  },
  {
    id: 'twentse-golf-park', province: 'Overijssel', town: 'Haaksbergen', dataVersion: 4, name: 'Twentse Golf Park (Haaksbergen)', holeCount: 9, parTotal: 27, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3], si: [1, 2, 3, 4, 5, 6, 7, 8, 9], confirmed: true, siUnknown: true, countsForIndex: false, location: { lat: 52.1399, lon: 6.7303 }, website: 'https://www.twentsegolfpark.nl/',
    tees: [
      { id: 'twentse-golf-park-geel-h', name: 'Geel (heren)', gender: 'h', rating: 25.1, slope: 81, rating9: null, slope9: null },
      { id: 'twentse-golf-park-rood-d', name: 'Rood (dames)', gender: 'd', rating: 26.1, slope: 83, rating9: null, slope9: null },
    ],
  },
  {
    id: 'dutch-golf-kort', province: 'Gelderland', town: 'Hattem', dataVersion: 4, name: 'Dutch Golf Hattem - Kleine lus (Hattem)', holeCount: 9, parTotal: 27, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3], si: [1, 2, 3, 4, 5, 6, 7, 8, 9], confirmed: true, siUnknown: true, countsForIndex: false, location: { lat: 52.4587, lon: 6.0754 }, website: 'https://www.dutchgolf.nl/',
    tees: [
      { id: 'dutch-golf-kort-rood-h', name: 'Rood (heren)', gender: 'h', rating: 23.8, slope: 67, rating9: null, slope9: null },
      { id: 'dutch-golf-kort-rood-d', name: 'Rood (dames)', gender: 'd', rating: 24.4, slope: 70, rating9: null, slope9: null },
    ],
  },
];

// Tees en greens uit OpenStreetMap (© OpenStreetMap-bijdragers, ODbL), opgehaald met
// tools/osm-fetch.mjs. Grote baan: alleen tees waarvan de OSM-lengte klopt met de scorekaart
// (geel, ±8%); greens altijd. Wat je zelf vastlegt (course.geo) gaat voor.
export const BASE_GEO = {
  'hooge-graven': {
    1: { tee: { lat: 52.547305, lon: 6.448482 }, green: { lat: 52.544257, lon: 6.447306 } },
    2: { tee: { lat: 52.548625, lon: 6.448108 }, green: { lat: 52.547514, lon: 6.446521 } },
    3: { tee: { lat: 52.546917, lon: 6.451189 }, green: { lat: 52.549381, lon: 6.449573 } },
    4: { tee: { lat: 52.546631, lon: 6.451232 }, green: { lat: 52.543619, lon: 6.453097 } },
    5: { green: { lat: 52.546496, lon: 6.452204 } },
    6: { tee: { lat: 52.545936, lon: 6.453987 }, green: { lat: 52.550007, lon: 6.451198 } },
    7: { tee: { lat: 52.549748, lon: 6.449431 }, green: { lat: 52.550367, lon: 6.451504 } },
    8: { tee: { lat: 52.548945, lon: 6.449014 }, green: { lat: 52.545203, lon: 6.451063 } },
    9: { green: { lat: 52.543862, lon: 6.447774 } },
    10: { green: { lat: 52.54392, lon: 6.445616 } },
    11: { tee: { lat: 52.546128, lon: 6.443466 }, green: { lat: 52.547558, lon: 6.44271 } },
    12: { tee: { lat: 52.545704, lon: 6.443848 }, green: { lat: 52.543244, lon: 6.44497 } },
    13: { green: { lat: 52.542838, lon: 6.444094 } },
    14: { green: { lat: 52.547948, lon: 6.441739 } },
    15: { tee: { lat: 52.549339, lon: 6.448286 }, green: { lat: 52.548341, lon: 6.442005 } },
    16: { tee: { lat: 52.54796, lon: 6.443245 }, green: { lat: 52.548639, lon: 6.448139 } },
    17: { tee: { lat: 52.545124, lon: 6.447312 }, green: { lat: 52.547428, lon: 6.444507 } },
    18: { green: { lat: 52.543196, lon: 6.446594 } },
  },
  // Par 3-baan: in OSM zonder holenummers; toegewezen met de plattegrond en de lengtes van de
  // scorekaart. Hole 8 alleen de green (lengte wijkt af), hole 2 en 7 zonder green (in OSM één vlak).
  // Holes 10–18 zijn de tweede ronde over dezelfde holes.
  par3: Object.fromEntries(Object.entries({
    1: { tee: { lat: 52.543122, lon: 6.447753 }, green: { lat: 52.543499, lon: 6.448908 } },
    2: { tee: { lat: 52.543934, lon: 6.449169 } },
    3: { tee: { lat: 52.544085, lon: 6.45142 }, green: { lat: 52.544243, lon: 6.450184 } },
    4: { tee: { lat: 52.543806, lon: 6.450917 }, green: { lat: 52.543478, lon: 6.451854 } },
    5: { tee: { lat: 52.54341, lon: 6.45246 }, green: { lat: 52.543102, lon: 6.451388 } },
    6: { tee: { lat: 52.543624, lon: 6.45245 }, green: { lat: 52.544667, lon: 6.451666 } },
    7: { tee: { lat: 52.544457, lon: 6.451482 } },
    8: { green: { lat: 52.543943, lon: 6.449185 } },
    9: { tee: { lat: 52.543866, lon: 6.448823 }, green: { lat: 52.54338, lon: 6.447728 } },
  }).flatMap(([h, pts]) => [[h, pts], [String(Number(h) + 9), pts]])),
};
