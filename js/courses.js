// Golfbanen in de app: één bron voor de app én het overzicht op golf.kapital.nl (site/banen.html).
// Puur gegevens, zonder afhankelijkheden.

// 18-holes baan waarvan we alleen de totale par en de tee-ratings kennen.
// Pitch & putt, par 3- en shortgolfbanen (in de app en op de website een aparte groep).
export const isShortCourse = (c) => /pitch|\bputt\b|par[ -]?3|short ?golf|golftuin|country ?golf/i.test(c.name)
  || (c.holeCount === 9 ? c.parTotal < 30 : c.parTotal < 60);

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
  // <banen-regio>
  // Gegenereerd door tools/banen/to-courses.mjs uit data/banen/courses.json (scorekaarten van de clubs;
  // fromSources: true = Hole19/Golfify/GolfPass). Niet met de hand wijzigen: pas de data aan en draai het script.
  {
    id: 'pitch-putt-play-stay-ruinerwold', province: 'Drenthe', town: 'Ruinerwold', dataVersion: 1, name: 'Pitch & Putt Play & Stay (Ruinerwold)', holeCount: 9, parTotal: 27, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3], si: [1, 2, 3, 4, 5, 6, 7, 8, 9], confirmed: true, siUnknown: true, countsForIndex: false, location: { lat: 52.71536, lon: 6.3063 }, website: 'https://playstay.nl/',
    tees: [
      { id: 'pitch-putt-play-stay-ruinerwold-standaard-h', name: 'Standaard (heren)', gender: 'h', rating: 27, slope: 113, rating9: null, slope9: null, ratingUnknown: true },
      { id: 'pitch-putt-play-stay-ruinerwold-standaard-d', name: 'Standaard (dames)', gender: 'd', rating: 27, slope: 113, rating9: null, slope9: null, ratingUnknown: true },
    ],
  },
  {
    id: 'pitch-putt-lemele', province: 'Overijssel', town: 'Lemele', dataVersion: 1, name: 'Pitch & Putt Lemele', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], confirmed: true, siUnknown: true, countsForIndex: false, location: { lat: 52.4533, lon: 6.41128 }, website: 'https://pitch-putt.nl/locaties/lemele/',
    tees: [
      { id: 'pitch-putt-lemele-standaard-h', name: 'Standaard (heren)', gender: 'h', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true },
      { id: 'pitch-putt-lemele-standaard-d', name: 'Standaard (dames)', gender: 'd', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true },
    ],
  },
  {
    id: 'martensplek', province: 'Drenthe', town: 'Tiendeveen', dataVersion: 3, name: 'Golfbaan Martensplek (Tiendeveen)', holeCount: 18, parTotal: 72, pars: [5, 4, 4, 4, 4, 3, 4, 3, 5, 5, 3, 4, 4, 4, 4, 4, 5, 3], si: [14, 8, 6, 4, 10, 18, 2, 16, 12, 1, 17, 7, 3, 11, 15, 5, 9, 13], confirmed: true, location: { lat: 52.76151, lon: 6.56427 }, website: 'https://www.martensplek.nl/',
    tees: [
      { id: 'martensplek-wit-h', name: 'Wit (heren)', gender: 'h', rating: 71.9, slope: 129, rating9: null, slope9: null, lengths: [430, 351, 364, 254, 294, 152, 364, 190, 435, 508, 187, 345, 397, 347, 366, 368, 471, 159] },
      { id: 'martensplek-geel-h', name: 'Geel (heren)', gender: 'h', rating: 71.4, slope: 131, rating9: null, slope9: null, lengths: [423, 343, 357, 247, 288, 146, 355, 184, 428, 504, 177, 337, 387, 340, 357, 357, 464, 154] },
      { id: 'martensplek-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 69.1, slope: 122, rating9: null, slope9: null, lengths: [406, 327, 342, 234, 273, 137, 340, 171, 411, 458, 165, 314, 328, 306, 317, 318, 400, 139] },
      { id: 'martensplek-rood-h', name: 'Rood (heren)', gender: 'h', rating: 68.3, slope: 117, rating9: null, slope9: null, lengths: [395, 319, 335, 228, 268, 130, 333, 164, 403, 453, 156, 305, 321, 299, 310, 311, 393, 133] },
      { id: 'martensplek-geel-d', name: 'Geel (dames)', gender: 'd', rating: 78.2, slope: 134, rating9: null, slope9: null, lengths: [423, 343, 357, 247, 288, 146, 355, 184, 428, 504, 177, 337, 387, 340, 357, 357, 464, 154] },
      { id: 'martensplek-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 74.3, slope: 128, rating9: null, slope9: null, lengths: [406, 327, 342, 234, 273, 137, 340, 171, 411, 458, 165, 314, 328, 306, 317, 318, 400, 139] },
      { id: 'martensplek-rood-d', name: 'Rood (dames)', gender: 'd', rating: 73.7, slope: 126, rating9: null, slope9: null, lengths: [395, 319, 335, 228, 268, 130, 333, 164, 403, 453, 156, 305, 321, 299, 310, 311, 393, 133] },
    ],
  },
  {
    id: 'pitch-putt-martensplek-tiendeveen', province: 'Drenthe', town: 'Tiendeveen', dataVersion: 1, name: 'Pitch & Putt Martensplek (Tiendeveen)', holeCount: 9, parTotal: 27, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3], si: [1, 2, 3, 4, 5, 6, 7, 8, 9], confirmed: true, siUnknown: true, countsForIndex: false, location: { lat: 52.76151, lon: 6.56427 }, website: 'https://www.pitchenputtmartensplek.nl/',
    tees: [
      { id: 'pitch-putt-martensplek-tiendeveen-standaard-h', name: 'Standaard (heren)', gender: 'h', rating: 27, slope: 113, rating9: null, slope9: null, ratingUnknown: true },
      { id: 'pitch-putt-martensplek-tiendeveen-standaard-d', name: 'Standaard (dames)', gender: 'd', rating: 27, slope: 113, rating9: null, slope9: null, ratingUnknown: true },
    ],
  },
  {
    id: 'golfplezier-twente-hoge-hexel-18-holes', province: 'Overijssel', town: 'Hoge Hexel', dataVersion: 1, name: 'Golfplezier Twente 18 holes (Hoge Hexel)', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [9, 15, 5, 7, 17, 1, 3, 11, 13, 10, 2, 12, 14, 16, 8, 4, 6, 18], confirmed: false, fromSources: true, countsForIndex: false, location: { lat: 52.40817, lon: 6.57135 }, website: 'https://golfpleziertwente.nl',
    tees: [
      { id: 'golfplezier-twente-hoge-hexel-18-holes-standaard-h', name: 'Standaard (heren)', gender: 'h', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [71, 44, 55, 56, 49, 92, 69, 50, 69, 58, 55, 40, 34, 39, 65, 66, 58, 46] },
      { id: 'golfplezier-twente-hoge-hexel-18-holes-standaard-d', name: 'Standaard (dames)', gender: 'd', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [71, 44, 55, 56, 49, 92, 69, 50, 69, 58, 55, 40, 34, 39, 65, 66, 58, 46] },
    ],
  },
  {
    id: 'golfplezier-twente-hoge-hexel-9-holes', province: 'Overijssel', town: 'Hoge Hexel', dataVersion: 1, name: 'Golfplezier Twente 9 holes (Hoge Hexel)', holeCount: 9, parTotal: 27, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3], si: [4, 8, 2, 5, 3, 6, 7, 1, 9], confirmed: false, fromSources: true, countsForIndex: false, location: { lat: 52.40817, lon: 6.57135 }, website: 'https://golfpleziertwente.nl',
    tees: [
      { id: 'golfplezier-twente-hoge-hexel-9-holes-standaard-h', name: 'Standaard (heren)', gender: 'h', rating: 27, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [125, 56, 153, 69, 86, 77, 69, 124, 59] },
      { id: 'golfplezier-twente-hoge-hexel-9-holes-standaard-d', name: 'Standaard (dames)', gender: 'd', rating: 27, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [125, 56, 153, 69, 86, 77, 69, 124, 59] },
    ],
  },
  {
    id: 'zwolle', province: 'Overijssel', town: 'Zwolle', dataVersion: 4, name: 'Golfclub Zwolle', holeCount: 18, parTotal: 71, pars: [4, 5, 3, 5, 4, 4, 4, 3, 4, 4, 3, 4, 3, 4, 5, 3, 4, 5], si: [11, 1, 15, 5, 3, 13, 9, 17, 7, 2, 16, 6, 10, 14, 12, 18, 8, 4], confirmed: true, location: { lat: 52.49782, lon: 6.14361 }, website: 'https://www.golfclubzwolle.nl',
    tees: [
      { id: 'zwolle-geel-h', name: 'Geel (heren)', gender: 'h', rating: 71, slope: 130, rating9: 35.9, slope9: 131, rating9Back: 35.2, slope9Back: 129, lengths: [306, 491, 177, 472, 405, 372, 316, 137, 269, 390, 137, 393, 167, 341, 466, 145, 319, 467] },
      { id: 'zwolle-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 68.7, slope: 121, rating9: 34.9, slope9: 123, rating9Back: 33.9, slope9Back: 120, lengths: [298, 442, 157, 430, 398, 319, 309, 127, 259, 331, 131, 339, 167, 333, 398, 134, 309, 427] },
      { id: 'zwolle-rood-h', name: 'Rood (heren)', gender: 'h', rating: 66.6, slope: 110, rating9: 34, slope9: 105, rating9Back: 32.7, slope9Back: 115, lengths: [259, 432, 149, 394, 341, 315, 264, 116, 248, 323, 126, 331, 167, 283, 380, 112, 264, 393] },
      { id: 'zwolle-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 63.5, slope: 105, rating9: 32.2, slope9: 105, rating9Back: 31.3, slope9Back: 107, lengths: [207, 377, 118, 335, 294, 252, 225, 105, 213, 267, 115, 279, 167, 239, 347, 107, 222, 347] },
      { id: 'zwolle-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 74.4, slope: 131, rating9: 37.7, slope9: 140, rating9Back: 36.7, slope9Back: 124, lengths: [298, 442, 157, 430, 398, 319, 309, 127, 259, 331, 131, 339, 167, 333, 398, 134, 309, 427] },
      { id: 'zwolle-rood-d', name: 'Rood (dames)', gender: 'd', rating: 72, slope: 127, rating9: 36.5, slope9: 131, rating9Back: 35.5, slope9Back: 123, lengths: [259, 432, 149, 394, 341, 315, 264, 116, 248, 323, 126, 331, 167, 283, 380, 112, 264, 393] },
      { id: 'zwolle-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 67.9, slope: 110, rating9: 34.5, slope9: 105, rating9Back: 33.4, slope9Back: 114, lengths: [207, 377, 118, 335, 294, 252, 225, 105, 213, 267, 115, 279, 167, 239, 347, 107, 222, 347] },
    ],
  },
  {
    id: 'golfclub-havelte', province: 'Drenthe', town: 'Havelte', dataVersion: 1, name: 'Golf Club Havelte', holeCount: 18, parTotal: 73, pars: [4, 3, 5, 4, 4, 3, 4, 5, 4, 5, 4, 4, 4, 4, 3, 5, 4, 4], si: [5, 17, 7, 9, 13, 11, 3, 15, 1, 14, 12, 4, 2, 10, 16, 8, 18, 6], confirmed: true, location: { lat: 52.7814, lon: 6.2529 }, website: 'https://www.golfclubhavelte.nl',
    tees: [
      { id: 'golfclub-havelte-wit-h', name: 'Wit (heren)', gender: 'h', rating: 73.3, slope: 129, rating9: null, slope9: null, lengths: [385, 122, 487, 371, 300, 204, 380, 464, 394, 457, 340, 406, 378, 391, 166, 488, 240, 390] },
      { id: 'golfclub-havelte-geel-h', name: 'Geel (heren)', gender: 'h', rating: 72, slope: 122, rating9: null, slope9: null, lengths: [367, 116, 427, 353, 294, 193, 358, 457, 381, 449, 335, 371, 368, 360, 160, 475, 235, 358] },
      { id: 'golfclub-havelte-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 68.8, slope: 119, rating9: null, slope9: null, lengths: [326, 116, 422, 311, 272, 180, 329, 394, 341, 403, 330, 317, 324, 310, 146, 398, 216, 327] },
      { id: 'golfclub-havelte-rood-h', name: 'Rood (heren)', gender: 'h', rating: 67.4, slope: 111, rating9: null, slope9: null, lengths: [308, 110, 396, 303, 267, 132, 320, 381, 327, 396, 269, 312, 315, 305, 98, 389, 213, 313] },
      { id: 'golfclub-havelte-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 63.2, slope: 104, rating9: null, slope9: null, lengths: [261, 104, 310, 258, 251, 128, 272, 321, 297, 348, 226, 258, 264, 258, 93, 321, 150, 277] },
      { id: 'golfclub-havelte-geel-d', name: 'Geel (dames)', gender: 'd', rating: 78.4, slope: 139, rating9: null, slope9: null, lengths: [367, 116, 427, 353, 294, 193, 358, 457, 381, 449, 335, 371, 368, 360, 160, 475, 235, 358] },
      { id: 'golfclub-havelte-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 74.5, slope: 127, rating9: null, slope9: null, lengths: [326, 116, 422, 311, 272, 180, 329, 394, 341, 403, 330, 317, 324, 310, 146, 398, 216, 327] },
      { id: 'golfclub-havelte-rood-d', name: 'Rood (dames)', gender: 'd', rating: 72.8, slope: 123, rating9: null, slope9: null, lengths: [308, 110, 396, 303, 267, 132, 320, 381, 327, 396, 269, 312, 315, 305, 98, 389, 213, 313] },
      { id: 'golfclub-havelte-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 67.9, slope: 112, rating9: null, slope9: null, lengths: [261, 104, 310, 258, 251, 128, 272, 321, 297, 348, 226, 258, 264, 258, 93, 321, 150, 277] },
    ],
  },
  {
    id: 'golftuin-zwolle-par-3-baan', province: 'Overijssel', town: 'Zwolle', dataVersion: 1, name: 'Golftuin Zwolle Par 3-baan', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], confirmed: true, siUnknown: true, countsForIndex: false, location: { lat: 52.46551, lon: 6.12651 }, website: 'https://www.golftuinzwolle.nl',
    tees: [
      { id: 'golftuin-zwolle-par-3-baan-geel-h', name: 'Geel (heren)', gender: 'h', rating: 49.2, slope: 65, rating9: null, slope9: null },
      { id: 'golftuin-zwolle-par-3-baan-rood-d', name: 'Rood (dames)', gender: 'd', rating: 51.5, slope: 70, rating9: null, slope9: null },
    ],
  },
  {
    id: 'pitch-putt-orvelte', province: 'Drenthe', town: 'Witteveen', dataVersion: 1, name: 'Pitch & Putt Golf Orvelte (Witteveen)', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [8, 4, 12, 14, 16, 2, 6, 10, 18, 7, 3, 11, 13, 15, 1, 5, 9, 17], confirmed: false, fromSources: true, countsForIndex: false, location: { lat: 52.83447, lon: 6.66678 }, website: 'https://www.landal.nl/parken/orveltermarke',
    tees: [
      { id: 'pitch-putt-orvelte-wit-h', name: 'Wit (heren)', gender: 'h', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [54, 67, 48, 40, 49, 74, 62, 49, 68, 55, 37, 37, 38, 46, 56, 49, 74, 38] },
      { id: 'pitch-putt-orvelte-wit-d', name: 'Wit (dames)', gender: 'd', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [54, 67, 48, 40, 49, 74, 62, 49, 68, 55, 37, 37, 38, 46, 56, 49, 74, 38] },
    ],
  },
  {
    id: 'de-koepel', province: 'Overijssel', town: 'Wierden', dataVersion: 4, name: 'Golfclub De Koepel (Wierden)', holeCount: 18, parTotal: 70, pars: [4, 5, 3, 4, 5, 3, 4, 4, 3, 5, 3, 4, 4, 4, 4, 4, 4, 3], si: [8, 6, 18, 4, 2, 16, 12, 10, 14, 5, 17, 1, 9, 3, 15, 7, 11, 13], confirmed: true, location: { lat: 52.34218, lon: 6.56839 }, website: 'https://www.golfclubdekoepel.nl/',
    tees: [
      { id: 'de-koepel-geel-h', name: 'Geel (heren)', gender: 'h', rating: 70, slope: 129, rating9: null, slope9: null, lengths: [303, 465, 134, 339, 459, 166, 320, 342, 168, 433, 149, 399, 347, 379, 282, 391, 340, 160] },
      { id: 'de-koepel-geel-d', name: 'Geel (dames)', gender: 'd', rating: 75.7, slope: 137, rating9: null, slope9: null, lengths: [303, 465, 134, 339, 459, 166, 320, 342, 168, 433, 149, 399, 347, 379, 282, 391, 340, 160] },
      { id: 'de-koepel-rood-h', name: 'Rood (heren)', gender: 'h', rating: 66.2, slope: 112, rating9: null, slope9: null, lengths: [257, 395, 118, 289, 390, 152, 262, 302, 113, 366, 130, 325, 300, 315, 238, 315, 318, 139] },
      { id: 'de-koepel-rood-d', name: 'Rood (dames)', gender: 'd', rating: 70.8, slope: 128, rating9: null, slope9: null, lengths: [257, 395, 118, 289, 390, 152, 262, 302, 113, 366, 130, 325, 300, 315, 238, 315, 318, 139] },
      { id: 'de-koepel-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 61.8, slope: 100, rating9: null, slope9: null, lengths: [204, 341, 52, 248, 324, 71, 200, 228, 69, 304, 54, 284, 206, 249, 148, 276, 225, 84] },
      { id: 'de-koepel-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 64.2, slope: 102, rating9: null, slope9: null, lengths: [204, 341, 52, 248, 324, 71, 200, 228, 69, 304, 54, 284, 206, 249, 148, 276, 225, 84] },
    ],
  },
  {
    id: 'dutch-golf-hattem-grote-lus', province: 'Gelderland', town: 'Hattem', dataVersion: 1, name: 'Dutch Golf Hattem Grote lus', holeCount: 18, parTotal: 60, pars: [3, 3, 4, 4, 4, 3, 3, 3, 3, 3, 3, 4, 4, 4, 3, 3, 3, 3], si: [15, 9, 5, 3, 1, 11, 13, 17, 7, 16, 10, 6, 4, 2, 12, 14, 18, 8], confirmed: true, location: { lat: 52.45867, lon: 6.07199 }, website: 'https://www.dutchgolf.nl',
    tees: [
      { id: 'dutch-golf-hattem-grote-lus-geel-h', name: 'Geel (heren)', gender: 'h', rating: 55, slope: 91, rating9: null, slope9: null, lengths: [74, 85, 198, 270, 320, 92, 92, 75, 130, 74, 85, 198, 270, 320, 92, 92, 75, 130] },
      { id: 'dutch-golf-hattem-grote-lus-rood-h', name: 'Rood (heren)', gender: 'h', rating: 53.9, slope: 84, rating9: null, slope9: null, lengths: [74, 75, 198, 258, 275, 82, 92, 75, 112, 74, 75, 198, 258, 275, 82, 92, 75, 112] },
      { id: 'dutch-golf-hattem-grote-lus-geel-d', name: 'Geel (dames)', gender: 'd', rating: 57.3, slope: 101, rating9: null, slope9: null, lengths: [74, 85, 198, 270, 320, 92, 92, 75, 130, 74, 85, 198, 270, 320, 92, 92, 75, 130] },
      { id: 'dutch-golf-hattem-grote-lus-rood-d', name: 'Rood (dames)', gender: 'd', rating: 56.4, slope: 93, rating9: null, slope9: null, lengths: [74, 75, 198, 258, 275, 82, 92, 75, 112, 74, 75, 198, 258, 275, 82, 92, 75, 112] },
    ],
  },
  {
    id: 'hattemse-golf-country-club', province: 'Gelderland', town: 'Hattem', dataVersion: 1, name: 'De Hattemse Golf & Country Club', holeCount: 18, parTotal: 68, pars: [4, 4, 3, 4, 4, 4, 4, 3, 4, 4, 4, 3, 4, 4, 4, 4, 3, 4], si: [9, 7, 13, 1, 11, 5, 17, 15, 3, 12, 10, 16, 4, 8, 2, 14, 18, 6], confirmed: true, location: { lat: 52.45466, lon: 6.07493 }, website: 'https://www.golfclub-hattem.nl',
    tees: [
      { id: 'hattemse-golf-country-club-geel-h', name: 'Geel (heren)', gender: 'h', rating: 69.2, slope: 131, rating9: null, slope9: null, lengths: [325, 330, 144, 373, 340, 387, 249, 117, 369, 325, 330, 144, 373, 340, 387, 249, 117, 369] },
      { id: 'hattemse-golf-country-club-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 66.7, slope: 122, rating9: null, slope9: null, lengths: [312, 317, 132, 353, 310, 365, 239, 117, 310, 312, 317, 132, 353, 293, 365, 239, 117, 310] },
      { id: 'hattemse-golf-country-club-rood-h', name: 'Rood (heren)', gender: 'h', rating: 64.5, slope: 121, rating9: null, slope9: null, lengths: [293, 290, 120, 320, 293, 312, 212, 108, 300, 298, 290, 120, 320, 293, 312, 212, 108, 300] },
      { id: 'hattemse-golf-country-club-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 63.2, slope: 112, rating9: null, slope9: null, lengths: [293, 260, 100, 300, 263, 285, 190, 108, 272, 298, 260, 100, 300, 263, 285, 190, 108, 272] },
      { id: 'hattemse-golf-country-club-geel-d', name: 'Geel (dames)', gender: 'd', rating: 74.4, slope: 138, rating9: null, slope9: null, lengths: [325, 330, 144, 373, 340, 387, 249, 117, 369, 325, 330, 144, 373, 340, 387, 249, 117, 369] },
      { id: 'hattemse-golf-country-club-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 72.1, slope: 130, rating9: null, slope9: null, lengths: [312, 317, 132, 353, 310, 365, 239, 117, 310, 312, 317, 132, 353, 293, 365, 239, 117, 310] },
      { id: 'hattemse-golf-country-club-rood-d', name: 'Rood (dames)', gender: 'd', rating: 69.6, slope: 122, rating9: null, slope9: null, lengths: [293, 290, 120, 320, 293, 312, 212, 108, 300, 298, 290, 120, 320, 293, 312, 212, 108, 300] },
      { id: 'hattemse-golf-country-club-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 66.7, slope: 120, rating9: null, slope9: null, lengths: [293, 260, 100, 300, 263, 285, 190, 108, 272, 298, 260, 100, 300, 263, 285, 190, 108, 272] },
    ],
  },
  {
    id: 'shortgolf-twente-tubbergen', province: 'Overijssel', town: 'Tubbergen', dataVersion: 1, name: 'Shortgolf Twente (Tubbergen)', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], confirmed: true, siUnknown: true, countsForIndex: false, location: { lat: 52.40996, lon: 6.80609 }, website: 'https://shortgolftwente.nl/',
    tees: [
      { id: 'shortgolf-twente-tubbergen-standaard-h', name: 'Standaard (heren)', gender: 'h', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true },
      { id: 'shortgolf-twente-tubbergen-standaard-d', name: 'Standaard (dames)', gender: 'd', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true },
    ],
  },
  {
    id: 'zuid-drenthe-erica', province: 'Drenthe', town: 'Erica', dataVersion: 1, name: 'Golfbaan Zuid-Drenthe (Erica)', holeCount: 18, parTotal: 70, pars: [4, 3, 4, 5, 4, 5, 3, 4, 3, 4, 3, 4, 5, 4, 5, 3, 4, 3], si: [18, 14, 6, 12, 8, 4, 10, 2, 16, 17, 13, 5, 11, 7, 3, 9, 1, 15], confirmed: true, location: { lat: 52.68404, lon: 6.93341 }, website: 'https://www.golfclubzuiddrenthe.nl/',
    tees: [
      { id: 'zuid-drenthe-erica-wit-h', name: 'Wit (heren)', gender: 'h', rating: 71.2, slope: 131, rating9: null, slope9: null, lengths: [350, 155, 340, 499, 380, 531, 164, 332, 134, 350, 155, 340, 478, 380, 531, 164, 332, 134] },
      { id: 'zuid-drenthe-erica-geel-h', name: 'Geel (heren)', gender: 'h', rating: 68.7, slope: 128, rating9: null, slope9: null, lengths: [320, 145, 332, 490, 329, 502, 136, 311, 126, 320, 145, 332, 457, 329, 502, 136, 311, 126] },
      { id: 'zuid-drenthe-erica-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 67.5, slope: 123, rating9: null, slope9: null, lengths: [308, 140, 332, 490, 322, 491, 132, 305, 103, 308, 140, 332, 387, 322, 491, 132, 305, 103] },
      { id: 'zuid-drenthe-erica-rood-h', name: 'Rood (heren)', gender: 'h', rating: 65.8, slope: 117, rating9: null, slope9: null, lengths: [287, 105, 304, 456, 307, 472, 125, 286, 98, 287, 105, 304, 387, 307, 472, 125, 286, 98] },
      { id: 'zuid-drenthe-erica-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 63.3, slope: 109, rating9: null, slope9: null, lengths: [258, 97, 276, 411, 299, 445, 61, 253, 84, 258, 97, 276, 367, 299, 445, 61, 253, 84] },
      { id: 'zuid-drenthe-erica-geel-d', name: 'Geel (dames)', gender: 'd', rating: 74.8, slope: 137, rating9: null, slope9: null, lengths: [320, 145, 332, 490, 329, 502, 136, 311, 126, 320, 145, 332, 457, 329, 502, 136, 311, 126] },
      { id: 'zuid-drenthe-erica-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 73.3, slope: 135, rating9: null, slope9: null, lengths: [308, 140, 332, 490, 322, 491, 132, 305, 103, 308, 140, 332, 387, 322, 491, 132, 305, 103] },
      { id: 'zuid-drenthe-erica-rood-d', name: 'Rood (dames)', gender: 'd', rating: 71.1, slope: 125, rating9: null, slope9: null, lengths: [287, 105, 304, 456, 307, 472, 125, 286, 98, 287, 105, 304, 387, 307, 472, 125, 286, 98] },
      { id: 'zuid-drenthe-erica-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 68.2, slope: 114, rating9: null, slope9: null, lengths: [258, 97, 276, 411, 299, 445, 61, 253, 84, 258, 97, 276, 367, 299, 445, 61, 253, 84] },
    ],
  },
  {
    id: 'golfparc-sandur-emmen', province: 'Drenthe', town: 'Emmen', dataVersion: 1, name: 'Golfparc Sandur (Emmen)', holeCount: 18, parTotal: 68, pars: [5, 3, 4, 5, 3, 4, 4, 3, 3, 5, 3, 4, 5, 3, 4, 4, 3, 3], si: [1, 15, 5, 3, 11, 9, 7, 13, 17, 2, 16, 6, 4, 12, 10, 8, 14, 18], confirmed: true, location: { lat: 52.72902, lon: 6.91347 }, website: 'https://www.golfparcsandur.nl/',
    tees: [
      { id: 'golfparc-sandur-emmen-geel-h', name: 'Geel (heren)', gender: 'h', rating: 66.2, slope: 116, rating9: null, slope9: null, lengths: [445, 158, 348, 441, 174, 290, 291, 120, 148, 445, 158, 348, 441, 174, 290, 291, 120, 148] },
      { id: 'golfparc-sandur-emmen-rood-h', name: 'Rood (heren)', gender: 'h', rating: 63.6, slope: 98, rating9: null, slope9: null, lengths: [380, 142, 289, 372, 146, 250, 245, 100, 112, 380, 142, 289, 372, 146, 250, 245, 100, 112] },
      { id: 'golfparc-sandur-emmen-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 60.2, slope: 100, rating9: null, slope9: null, lengths: [341, 122, 186, 290, 100, 184, 188, 72, 89, 341, 122, 186, 290, 100, 184, 188, 72, 89] },
      { id: 'golfparc-sandur-emmen-geel-d', name: 'Geel (dames)', gender: 'd', rating: 71.3, slope: 131, rating9: null, slope9: null, lengths: [445, 158, 348, 441, 174, 290, 291, 120, 148, 445, 158, 348, 441, 174, 290, 291, 120, 148] },
      { id: 'golfparc-sandur-emmen-rood-d', name: 'Rood (dames)', gender: 'd', rating: 67.3, slope: 108, rating9: null, slope9: null, lengths: [380, 142, 289, 372, 146, 250, 245, 100, 112, 380, 142, 289, 372, 146, 250, 245, 100, 112] },
      { id: 'golfparc-sandur-emmen-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 63.3, slope: 99, rating9: null, slope9: null, lengths: [341, 122, 186, 290, 100, 184, 188, 72, 89, 341, 122, 186, 290, 100, 184, 188, 72, 89] },
    ],
  },
  {
    id: 'weleveld-golf-zenderen', province: 'Overijssel', town: 'Zenderen', dataVersion: 1, name: 'Weleveld Golf (Zenderen)', holeCount: 18, parTotal: 72, pars: [4, 5, 4, 4, 4, 3, 3, 4, 5, 4, 5, 4, 4, 4, 3, 3, 4, 5], si: [9, 5, 11, 13, 1, 17, 7, 15, 3, 10, 6, 12, 14, 2, 18, 8, 16, 4], confirmed: true, location: { lat: 52.33481, lon: 6.73154 }, website: 'https://www.weleveldgolf.nl/',
    tees: [
      { id: 'weleveld-golf-zenderen-geel-h', name: 'Geel (heren)', gender: 'h', rating: 69.4, slope: 130, rating9: null, slope9: null, lengths: [345, 433, 260, 285, 338, 104, 140, 312, 425, 345, 433, 260, 285, 338, 104, 140, 312, 425] },
      { id: 'weleveld-golf-zenderen-geel-d', name: 'Geel (dames)', gender: 'd', rating: 75.4, slope: 147, rating9: null, slope9: null, lengths: [345, 433, 260, 285, 338, 104, 140, 312, 425, 345, 433, 260, 285, 338, 104, 140, 312, 425] },
      { id: 'weleveld-golf-zenderen-rood-h', name: 'Rood (heren)', gender: 'h', rating: 66, slope: 110, rating9: null, slope9: null, lengths: [307, 360, 255, 240, 265, 99, 100, 277, 386, 307, 360, 255, 240, 265, 99, 100, 277, 386] },
      { id: 'weleveld-golf-zenderen-rood-d', name: 'Rood (dames)', gender: 'd', rating: 70.7, slope: 129, rating9: null, slope9: null, lengths: [307, 360, 255, 240, 265, 99, 100, 277, 386, 307, 360, 255, 240, 265, 99, 100, 277, 386] },
    ],
  },
  {
    id: 'twentsche', province: 'Overijssel', town: 'Ambt Delden', dataVersion: 4, name: 'Twentsche Golfclub (Ambt Delden)', holeCount: 18, parTotal: 72, pars: [4, 4, 3, 4, 5, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 4, 5], si: [5, 17, 13, 3, 11, 15, 7, 9, 1, 6, 14, 10, 4, 2, 16, 8, 18, 12], confirmed: true, location: { lat: 52.28935, lon: 6.67458 }, website: 'https://twentschegolfclub.nl/',
    tees: [
      { id: 'twentsche-wit-h', name: 'Wit (heren)', gender: 'h', rating: 73.8, slope: 138, rating9: 36.8, slope9: 138, rating9Back: 37.1, slope9Back: 137, lengths: [386, 304, 157, 362, 484, 173, 480, 373, 423, 394, 179, 516, 393, 408, 144, 357, 287, 459] },
      { id: 'twentsche-geel-h', name: 'Geel (heren)', gender: 'h', rating: 71.9, slope: 127, rating9: 35.8, slope9: 126, rating9Back: 36.1, slope9Back: 128, lengths: [348, 280, 125, 336, 476, 144, 447, 363, 378, 361, 162, 477, 365, 399, 119, 331, 264, 449] },
      { id: 'twentsche-geel-d', name: 'Geel (dames)', gender: 'd', rating: 77.7, slope: 142, rating9: 38.7, slope9: 146, rating9Back: 39, slope9Back: 139, lengths: [348, 280, 125, 336, 476, 144, 447, 363, 378, 361, 162, 477, 365, 399, 119, 331, 264, 449] },
      { id: 'twentsche-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 69.4, slope: 118, rating9: 34.7, slope9: 121, rating9Back: 34.7, slope9Back: 116, lengths: [322, 244, 125, 310, 430, 134, 438, 316, 344, 354, 143, 395, 327, 339, 119, 299, 244, 386] },
      { id: 'twentsche-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 74.4, slope: 131, rating9: 37.2, slope9: 134, rating9Back: 37.2, slope9Back: 128, lengths: [322, 244, 125, 310, 430, 134, 438, 316, 344, 354, 143, 395, 327, 339, 119, 299, 244, 386] },
      { id: 'twentsche-rood-h', name: 'Rood (heren)', gender: 'h', rating: 66.5, slope: 112, rating9: 33.6, slope9: 112, rating9Back: 33, slope9Back: 112, lengths: [289, 213, 116, 287, 398, 113, 401, 283, 310, 306, 127, 343, 305, 305, 97, 252, 221, 377] },
      { id: 'twentsche-rood-d', name: 'Rood (dames)', gender: 'd', rating: 71.5, slope: 120, rating9: 36, slope9: 118, rating9Back: 35.5, slope9Back: 123, lengths: [289, 213, 116, 287, 398, 113, 401, 283, 310, 306, 127, 343, 305, 305, 97, 252, 221, 377] },
      { id: 'twentsche-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 63.5, slope: 107, rating9: 32.2, slope9: 108, rating9Back: 31.3, slope9Back: 108, lengths: [241, 165, 116, 234, 343, 113, 352, 226, 260, 256, 127, 312, 248, 256, 97, 203, 174, 334] },
      { id: 'twentsche-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 67, slope: 116, rating9: 33.9, slope9: 117, rating9Back: 33.2, slope9Back: 115, lengths: [241, 165, 116, 234, 343, 113, 352, 226, 260, 256, 127, 312, 248, 256, 97, 203, 174, 334] },
    ],
  },
  {
    id: 'pitch-putt-heerde', province: 'Gelderland', town: 'Heerde', dataVersion: 1, name: 'Pitch & Putt Heerde', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], confirmed: false, fromSources: true, siUnknown: true, countsForIndex: false, location: { lat: 52.39725, lon: 6.0113 }, website: 'https://www.pitchenputtheerde.nl',
    tees: [
      { id: 'pitch-putt-heerde-standaard-h', name: 'Standaard (heren)', gender: 'h', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [53, 34, 45, 50, 55, 55, 46, 63, 36, 55, 53, 52, 35, 48, 53, 54, 70, 55] },
      { id: 'pitch-putt-heerde-standaard-d', name: 'Standaard (dames)', gender: 'd', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [53, 34, 45, 50, 55, 55, 46, 63, 36, 55, 53, 52, 35, 48, 53, 54, 70, 55] },
    ],
  },
  {
    id: 'golfpark-de-hildenberg-pitch-putt', province: 'Friesland', town: 'Appelscha', dataVersion: 1, name: 'Golfpark De Hildenberg Pitch & Putt (Appelscha)', holeCount: 9, parTotal: 27, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3], si: [4, 9, 3, 5, 1, 8, 6, 7, 2], confirmed: true, countsForIndex: false, location: { lat: 52.94229, lon: 6.35254 }, website: 'https://www.golfparkdehildenberg.nl/',
    tees: [
      { id: 'golfpark-de-hildenberg-pitch-putt-standaard-h', name: 'Standaard (heren)', gender: 'h', rating: 27, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [50, 40, 40, 30, 65, 70, 35, 40, 100] },
      { id: 'golfpark-de-hildenberg-pitch-putt-standaard-d', name: 'Standaard (dames)', gender: 'd', rating: 27, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [50, 40, 40, 30, 65, 70, 35, 40, 100] },
    ],
  },
  {
    id: 'countrygolf-ees', province: 'Drenthe', town: 'Ees', dataVersion: 1, name: 'Country Golf Ees', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [14, 8, 16, 10, 18, 4, 6, 2, 12, 5, 3, 15, 13, 1, 11, 7, 17, 9], confirmed: true, countsForIndex: false, location: { lat: 52.90667, lon: 6.81356 }, website: 'https://countrygolfees.nl/',
    tees: [
      { id: 'countrygolf-ees-geel-h', name: 'Geel (heren)', gender: 'h', rating: 47.3, slope: 64, rating9: null, slope9: null, lengths: [69, 65, 46, 60, 53, 107, 103, 93, 71, 107, 94, 61, 59, 112, 74, 86, 60, 74] },
      { id: 'countrygolf-ees-rood-d', name: 'Rood (dames)', gender: 'd', rating: 48.9, slope: 66, rating9: null, slope9: null, lengths: [69, 65, 46, 60, 53, 107, 103, 93, 71, 107, 94, 61, 59, 112, 74, 86, 60, 74] },
    ],
  },
  {
    id: 'golfpark-exloo', province: 'Drenthe', town: 'Exloo', dataVersion: 1, name: 'Golfpark Exloo', holeCount: 18, parTotal: 64, pars: [3, 3, 3, 4, 3, 3, 3, 4, 3, 4, 4, 3, 4, 3, 4, 4, 5, 4], si: [14, 18, 8, 10, 4, 2, 6, 16, 12, 9, 13, 3, 15, 1, 5, 17, 11, 7], confirmed: true, location: { lat: 52.87565, lon: 6.88073 }, website: 'https://www.golfparkexloo.nl/',
    tees: [
      { id: 'golfpark-exloo-geel-h', name: 'Geel (heren)', gender: 'h', rating: 62.8, slope: 105, rating9: null, slope9: null, lengths: [111, 159, 157, 303, 150, 120, 128, 219, 110, 307, 302, 185, 290, 188, 382, 248, 461, 305] },
      { id: 'golfpark-exloo-rood-h', name: 'Rood (heren)', gender: 'h', rating: 62.1, slope: 100, rating9: null, slope9: null, lengths: [111, 159, 157, 270, 150, 120, 128, 219, 110, 298, 252, 185, 263, 165, 360, 227, 444, 273] },
      { id: 'golfpark-exloo-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 60.4, slope: 99, rating9: null, slope9: null, lengths: [91, 100, 135, 244, 131, 106, 113, 191, 98, 245, 237, 170, 219, 140, 321, 204, 420, 249] },
      { id: 'golfpark-exloo-geel-d', name: 'Geel (dames)', gender: 'd', rating: 65.6, slope: 122, rating9: null, slope9: null, lengths: [111, 159, 157, 303, 150, 120, 128, 219, 110, 307, 302, 185, 290, 188, 382, 248, 461, 305] },
      { id: 'golfpark-exloo-rood-d', name: 'Rood (dames)', gender: 'd', rating: 65.1, slope: 112, rating9: null, slope9: null, lengths: [111, 159, 157, 270, 150, 120, 128, 219, 110, 298, 252, 185, 263, 165, 360, 227, 444, 273] },
      { id: 'golfpark-exloo-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 63.2, slope: 104, rating9: null, slope9: null, lengths: [91, 100, 135, 244, 131, 106, 113, 191, 98, 245, 237, 170, 219, 140, 321, 204, 420, 249] },
    ],
  },
  {
    id: 'de-lage-mors-delden', province: 'Overijssel', town: 'Delden', dataVersion: 1, name: 'Golfbaan De Lage Mors (Delden)', holeCount: 18, parTotal: 70, pars: [3, 4, 4, 3, 5, 3, 4, 5, 4, 3, 4, 4, 4, 5, 3, 3, 5, 4], si: [17, 9, 5, 11, 3, 15, 13, 1, 7, 18, 12, 8, 16, 6, 14, 4, 2, 10], confirmed: true, location: { lat: 52.25645, lon: 6.73013 }, website: 'https://www.golfbaandelagemors.nl/',
    tees: [
      { id: 'de-lage-mors-delden-geel-h', name: 'Geel (heren)', gender: 'h', rating: 66.5, slope: 118, rating9: null, slope9: null, lengths: [77, 229, 281, 173, 465, 142, 231, 492, 294, 77, 207, 281, 225, 465, 142, 199, 469, 294] },
      { id: 'de-lage-mors-delden-geel-d', name: 'Geel (dames)', gender: 'd', rating: 71.1, slope: 128, rating9: null, slope9: null, lengths: [77, 229, 281, 173, 465, 142, 231, 492, 294, 77, 207, 281, 225, 465, 142, 199, 469, 294] },
      { id: 'de-lage-mors-delden-rood-h', name: 'Rood (heren)', gender: 'h', rating: 64, slope: 114, rating9: null, slope9: null, lengths: [77, 200, 240, 145, 404, 115, 199, 469, 256, 77, 193, 240, 216, 404, 115, 167, 432, 256] },
      { id: 'de-lage-mors-delden-rood-d', name: 'Rood (dames)', gender: 'd', rating: 68.7, slope: 118, rating9: null, slope9: null, lengths: [77, 200, 240, 145, 404, 115, 199, 469, 256, 77, 193, 240, 216, 404, 115, 167, 432, 256] },
      { id: 'de-lage-mors-delden-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 62.1, slope: 98, rating9: null, slope9: null, lengths: [56, 166, 218, 121, 370, 93, 130, 452, 234, 56, 166, 218, 121, 370, 93, 130, 452, 234] },
      { id: 'de-lage-mors-delden-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 64.1, slope: 114, rating9: null, slope9: null, lengths: [56, 166, 218, 121, 370, 93, 130, 452, 234, 56, 166, 218, 121, 370, 93, 130, 452, 234] },
    ],
  },
  {
    id: 'de-lage-mors-delden-twickelbaan', province: 'Overijssel', town: 'Delden', dataVersion: 1, name: 'Golfbaan De Lage Mors Twickelbaan (Delden)', holeCount: 18, parTotal: 58, pars: [3, 3, 3, 3, 4, 3, 3, 4, 3, 3, 3, 3, 3, 4, 3, 3, 4, 3], si: [17, 13, 7, 11, 5, 15, 9, 1, 3, 18, 14, 8, 12, 6, 16, 10, 2, 4], confirmed: true, countsForIndex: false, location: { lat: 52.25645, lon: 6.73013 }, website: 'https://www.golfbaandelagemors.nl/',
    tees: [
      { id: 'de-lage-mors-delden-twickelbaan-wit-h', name: 'Wit (heren)', gender: 'h', rating: 53.1, slope: 87, rating9: null, slope9: null, lengths: [52, 101, 121, 122, 237, 89, 126, 265, 161, 52, 101, 121, 122, 237, 89, 126, 265, 161] },
      { id: 'de-lage-mors-delden-twickelbaan-wit-d', name: 'Wit (dames)', gender: 'd', rating: 55.7, slope: 96, rating9: null, slope9: null, lengths: [52, 101, 121, 122, 237, 89, 126, 265, 161, 52, 101, 121, 122, 237, 89, 126, 265, 161] },
    ],
  },
  {
    id: 'pitch-putt-twente-diepenheim', province: 'Overijssel', town: 'Diepenheim', dataVersion: 1, name: 'Pitch & Putt Twente (Diepenheim)', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], confirmed: true, siUnknown: true, countsForIndex: false, location: { lat: 52.19813, lon: 6.59089 }, website: 'https://pitch-putt-twente.nl/',
    tees: [
      { id: 'pitch-putt-twente-diepenheim-standaard-h', name: 'Standaard (heren)', gender: 'h', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [47, 52, 44, 49, 55, 47, 55, 50, 60, 55, 42, 53, 59, 50, 45, 58, 58, 41] },
      { id: 'pitch-putt-twente-diepenheim-standaard-d', name: 'Standaard (dames)', gender: 'd', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [47, 52, 44, 49, 55, 47, 55, 50, 60, 55, 42, 53, 59, 50, 45, 58, 58, 41] },
    ],
  },
  {
    id: 't-kruisselt-de-lutte', province: 'Overijssel', town: 'De Lutte', dataVersion: 1, name: 'Golf & Country Club \'t Kruisselt (De Lutte)', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], confirmed: true, siUnknown: true, countsForIndex: false, location: { lat: 52.31916, lon: 6.96638 }, website: 'https://www.kruisselt.nl/golf/',
    tees: [
      { id: 't-kruisselt-de-lutte-geel-h', name: 'Geel (heren)', gender: 'h', rating: 47, slope: 68, rating9: null, slope9: null },
      { id: 't-kruisselt-de-lutte-rood-d', name: 'Rood (dames)', gender: 'd', rating: 48.5, slope: 69, rating9: null, slope9: null },
    ],
  },
  {
    id: 'drentsche-golf-country-club-zeijerveen-rood-geel', province: 'Drenthe', town: 'Zeijerveen', dataVersion: 1, name: 'Drentsche Golf & Country Club Rood-Geel (Zeijerveen)', holeCount: 18, parTotal: 72, pars: [5, 4, 4, 4, 4, 3, 5, 5, 3, 4, 4, 4, 4, 3, 4, 3, 4, 5], si: [13, 3, 9, 1, 7, 17, 5, 15, 11, 14, 4, 10, 12, 16, 2, 18, 6, 8], confirmed: true, location: { lat: 53.01762, lon: 6.52863 }, website: 'https://dgcc.nl/',
    tees: [
      { id: 'drentsche-golf-country-club-zeijerveen-rood-geel-zwart-63-h', name: 'Zwart 63 (heren)', gender: 'h', rating: 73.1, slope: 136, rating9: null, slope9: null },
      { id: 'drentsche-golf-country-club-zeijerveen-rood-geel-wit-60-h', name: 'Wit 60 (heren)', gender: 'h', rating: 71.2, slope: 133, rating9: null, slope9: null, lengths: [478, 345, 335, 364, 333, 154, 452, 456, 164, 299, 378, 344, 341, 168, 381, 139, 310, 464] },
      { id: 'drentsche-golf-country-club-zeijerveen-rood-geel-geel-56-h', name: 'Geel 56 (heren)', gender: 'h', rating: 69.6, slope: 125, rating9: null, slope9: null, lengths: [399, 345, 335, 307, 316, 154, 452, 456, 156, 299, 321, 291, 337, 145, 348, 132, 286, 464] },
      { id: 'drentsche-golf-country-club-zeijerveen-rood-geel-blauw-52-h', name: 'Blauw 52 (heren)', gender: 'h', rating: 67.6, slope: 118, rating9: null, slope9: null, lengths: [399, 303, 324, 307, 316, 127, 378, 384, 156, 260, 321, 285, 286, 145, 348, 132, 286, 390] },
      { id: 'drentsche-golf-country-club-zeijerveen-rood-geel-rood-50-h', name: 'Rood 50 (heren)', gender: 'h', rating: 66.7, slope: 112, rating9: null, slope9: null, lengths: [393, 298, 318, 302, 267, 127, 374, 380, 148, 257, 315, 285, 286, 140, 318, 119, 252, 380] },
      { id: 'drentsche-golf-country-club-zeijerveen-rood-geel-geel-56-d', name: 'Geel 56 (dames)', gender: 'd', rating: 75.2, slope: 137, rating9: null, slope9: null, lengths: [399, 345, 335, 307, 316, 154, 452, 456, 156, 299, 321, 291, 337, 145, 348, 132, 286, 464] },
      { id: 'drentsche-golf-country-club-zeijerveen-rood-geel-blauw-52-d', name: 'Blauw 52 (dames)', gender: 'd', rating: 72.7, slope: 134, rating9: null, slope9: null, lengths: [399, 303, 324, 307, 316, 127, 378, 384, 156, 260, 321, 285, 286, 145, 348, 132, 286, 390] },
      { id: 'drentsche-golf-country-club-zeijerveen-rood-geel-rood-50-d', name: 'Rood 50 (dames)', gender: 'd', rating: 71.8, slope: 129, rating9: null, slope9: null, lengths: [393, 298, 318, 302, 267, 127, 374, 380, 148, 257, 315, 285, 286, 140, 318, 119, 252, 380] },
    ],
  },
  {
    id: 'drentsche-golf-country-club-zeijerveen-wit-rood', province: 'Drenthe', town: 'Zeijerveen', dataVersion: 1, name: 'Drentsche Golf & Country Club Wit-Rood (Zeijerveen)', holeCount: 18, parTotal: 73, pars: [4, 3, 4, 4, 3, 5, 4, 4, 5, 5, 4, 4, 4, 4, 3, 5, 5, 3], si: [3, 15, 7, 1, 17, 11, 13, 5, 9, 14, 4, 10, 2, 8, 18, 6, 16, 12], confirmed: true, location: { lat: 53.01762, lon: 6.52863 }, website: 'https://dgcc.nl/',
    tees: [
      { id: 'drentsche-golf-country-club-zeijerveen-wit-rood-zwart-63-h', name: 'Zwart 63 (heren)', gender: 'h', rating: 74.3, slope: 146, rating9: null, slope9: null },
      { id: 'drentsche-golf-country-club-zeijerveen-wit-rood-wit-60-h', name: 'Wit 60 (heren)', gender: 'h', rating: 72.9, slope: 138, rating9: null, slope9: null, lengths: [354, 154, 403, 353, 144, 445, 312, 360, 464, 478, 345, 335, 364, 333, 154, 452, 456, 164] },
      { id: 'drentsche-golf-country-club-zeijerveen-wit-rood-geel-57-h', name: 'Geel 57 (heren)', gender: 'h', rating: 70.9, slope: 134, rating9: null, slope9: null },
      { id: 'drentsche-golf-country-club-zeijerveen-wit-rood-blauw-52-h', name: 'Blauw 52 (heren)', gender: 'h', rating: 68.8, slope: 124, rating9: null, slope9: null, lengths: [291, 126, 330, 302, 123, 378, 271, 303, 388, 399, 303, 324, 307, 316, 127, 378, 384, 156] },
      { id: 'drentsche-golf-country-club-zeijerveen-wit-rood-rood-50-h', name: 'Rood 50 (heren)', gender: 'h', rating: 68, slope: 118, rating9: null, slope9: null, lengths: [285, 126, 290, 295, 123, 372, 264, 292, 383, 393, 298, 318, 302, 267, 127, 374, 380, 148] },
      { id: 'drentsche-golf-country-club-zeijerveen-wit-rood-geel-56-d', name: 'Geel 56 (dames)', gender: 'd', rating: 76.7, slope: 144, rating9: null, slope9: null, lengths: [291, 154, 330, 302, 144, 445, 312, 303, 464, 399, 345, 335, 307, 316, 154, 452, 456, 156] },
      { id: 'drentsche-golf-country-club-zeijerveen-wit-rood-blauw-52-d', name: 'Blauw 52 (dames)', gender: 'd', rating: 73.9, slope: 140, rating9: null, slope9: null, lengths: [291, 126, 330, 302, 123, 378, 271, 303, 388, 399, 303, 324, 307, 316, 127, 378, 384, 156] },
      { id: 'drentsche-golf-country-club-zeijerveen-wit-rood-rood-50-d', name: 'Rood 50 (dames)', gender: 'd', rating: 73.3, slope: 133, rating9: null, slope9: null, lengths: [285, 126, 290, 295, 123, 372, 264, 292, 383, 393, 298, 318, 302, 267, 127, 374, 380, 148] },
    ],
  },
  {
    id: 'drentsche-golf-country-club-zeijerveen-geel-wit', province: 'Drenthe', town: 'Zeijerveen', dataVersion: 1, name: 'Drentsche Golf & Country Club Geel-Wit (Zeijerveen)', holeCount: 18, parTotal: 71, pars: [4, 4, 4, 4, 3, 4, 3, 4, 5, 4, 3, 4, 4, 3, 5, 4, 4, 5], si: [13, 3, 9, 11, 15, 1, 17, 5, 7, 4, 16, 8, 2, 18, 12, 14, 6, 10], confirmed: true, location: { lat: 53.01762, lon: 6.52863 }, website: 'https://dgcc.nl/',
    tees: [
      { id: 'drentsche-golf-country-club-zeijerveen-geel-wit-zwart-63-h', name: 'Zwart 63 (heren)', gender: 'h', rating: 72.4, slope: 145, rating9: null, slope9: null },
      { id: 'drentsche-golf-country-club-zeijerveen-geel-wit-wit-60-h', name: 'Wit 60 (heren)', gender: 'h', rating: 71, slope: 139, rating9: null, slope9: null, lengths: [299, 378, 344, 341, 168, 381, 139, 310, 464, 354, 154, 403, 353, 144, 445, 312, 360, 464] },
      { id: 'drentsche-golf-country-club-zeijerveen-geel-wit-geel-56-h', name: 'Geel 56 (heren)', gender: 'h', rating: 69, slope: 129, rating9: null, slope9: null, lengths: [299, 321, 291, 337, 145, 348, 132, 286, 464, 291, 154, 330, 302, 144, 445, 312, 303, 464] },
      { id: 'drentsche-golf-country-club-zeijerveen-geel-wit-blauw-52-h', name: 'Blauw 52 (heren)', gender: 'h', rating: 67, slope: 121, rating9: null, slope9: null, lengths: [260, 321, 285, 286, 145, 348, 132, 286, 390, 291, 126, 330, 302, 123, 378, 271, 303, 388] },
      { id: 'drentsche-golf-country-club-zeijerveen-geel-wit-rood-50-h', name: 'Rood 50 (heren)', gender: 'h', rating: 66.2, slope: 116, rating9: null, slope9: null, lengths: [257, 315, 285, 286, 140, 318, 119, 252, 380, 285, 126, 290, 295, 123, 372, 264, 292, 383] },
      { id: 'drentsche-golf-country-club-zeijerveen-geel-wit-geel-56-d', name: 'Geel 56 (dames)', gender: 'd', rating: 74.5, slope: 139, rating9: null, slope9: null, lengths: [299, 321, 291, 337, 145, 348, 132, 286, 464, 291, 154, 330, 302, 144, 445, 312, 303, 464] },
      { id: 'drentsche-golf-country-club-zeijerveen-geel-wit-blauw-52-d', name: 'Blauw 52 (dames)', gender: 'd', rating: 71.9, slope: 133, rating9: null, slope9: null, lengths: [260, 321, 285, 286, 145, 348, 132, 286, 390, 291, 126, 330, 302, 123, 378, 271, 303, 388] },
      { id: 'drentsche-golf-country-club-zeijerveen-geel-wit-rood-50-d', name: 'Rood 50 (dames)', gender: 'd', rating: 71.2, slope: 128, rating9: null, slope9: null, lengths: [257, 315, 285, 286, 140, 318, 119, 252, 380, 285, 126, 290, 295, 123, 372, 264, 292, 383] },
    ],
  },
  {
    id: 'drentsche-golf-country-club-zeijerveen-par-3-baan', province: 'Drenthe', town: 'Zeijerveen', dataVersion: 1, name: 'Drentsche Golf & Country Club Par 3-baan (Zeijerveen)', holeCount: 9, parTotal: 27, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3], si: [9, 2, 4, 6, 7, 1, 8, 3, 5], confirmed: true, countsForIndex: false, location: { lat: 53.01762, lon: 6.52863 }, website: 'https://dgcc.nl/',
    tees: [
      { id: 'drentsche-golf-country-club-zeijerveen-par-3-baan-geel-h', name: 'Geel (heren)', gender: 'h', rating: 24.6, slope: 69, rating9: null, slope9: null, lengths: [77, 110, 105, 85, 88, 120, 85, 109, 99] },
      { id: 'drentsche-golf-country-club-zeijerveen-par-3-baan-rood-d', name: 'Rood (dames)', gender: 'd', rating: 25.4, slope: 76, rating9: null, slope9: null, lengths: [77, 110, 105, 85, 88, 120, 85, 109, 99] },
    ],
  },
  {
    id: 'golfclub-emmeloord-suydersee', province: 'Flevoland', town: 'Emmeloord', dataVersion: 1, name: 'Golfclub Emmeloord Suydersee', holeCount: 18, parTotal: 72, pars: [4, 5, 4, 3, 4, 3, 4, 4, 5, 4, 5, 4, 3, 4, 4, 4, 3, 5], si: [15, 1, 5, 9, 13, 17, 3, 11, 7, 16, 4, 2, 10, 12, 18, 6, 14, 8], confirmed: true, location: { lat: 52.73947, lon: 5.78077 }, website: 'https://golfclub-emmeloord.nl/',
    tees: [
      { id: 'golfclub-emmeloord-suydersee-wit-h', name: 'Wit (heren)', gender: 'h', rating: 72.7, slope: 140, rating9: null, slope9: null, lengths: [272, 498, 404, 186, 289, 141, 375, 358, 492, 272, 498, 437, 186, 289, 274, 375, 161, 492] },
      { id: 'golfclub-emmeloord-suydersee-geel-h', name: 'Geel (heren)', gender: 'h', rating: 70.9, slope: 138, rating9: null, slope9: null, lengths: [261, 479, 339, 166, 289, 141, 365, 331, 465, 261, 479, 404, 139, 289, 274, 365, 161, 465] },
      { id: 'golfclub-emmeloord-suydersee-geel-d', name: 'Geel (dames)', gender: 'd', rating: 77.4, slope: 142, rating9: null, slope9: null, lengths: [261, 479, 339, 166, 289, 141, 365, 331, 465, 261, 479, 404, 139, 289, 274, 365, 161, 465] },
      { id: 'golfclub-emmeloord-suydersee-rood-h', name: 'Rood (heren)', gender: 'h', rating: 65.8, slope: 125, rating9: null, slope9: null, lengths: [220, 400, 270, 142, 239, 124, 302, 277, 394, 220, 400, 345, 127, 239, 236, 302, 149, 394] },
      { id: 'golfclub-emmeloord-suydersee-rood-d', name: 'Rood (dames)', gender: 'd', rating: 70.9, slope: 131, rating9: null, slope9: null, lengths: [220, 400, 270, 142, 239, 124, 302, 277, 394, 220, 400, 345, 127, 239, 236, 302, 149, 394] },
    ],
  },
  {
    id: 'golfclub-emmeloord-pionier-par-3', province: 'Flevoland', town: 'Emmeloord', dataVersion: 1, name: 'Golfclub Emmeloord Pionier par 3', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [7, 11, 1, 9, 13, 3, 15, 5, 17, 8, 12, 2, 10, 14, 4, 16, 6, 18], confirmed: true, countsForIndex: false, location: { lat: 52.73947, lon: 5.78077 }, website: 'https://golfclub-emmeloord.nl/',
    tees: [
      { id: 'golfclub-emmeloord-pionier-par-3-geel-h', name: 'Geel (heren)', gender: 'h', rating: 48.3, slope: 60, rating9: null, slope9: null, lengths: [83, 68, 93, 79, 79, 115, 66, 122, 67, 83, 68, 93, 79, 79, 115, 66, 122, 67] },
      { id: 'golfclub-emmeloord-pionier-par-3-rood-d', name: 'Rood (dames)', gender: 'd', rating: 49.4, slope: 64, rating9: null, slope9: null, lengths: [83, 68, 93, 79, 79, 115, 66, 122, 67, 83, 68, 93, 79, 79, 115, 66, 122, 67] },
    ],
  },
  {
    id: 'het-rijk-van-sybrook-enschede-noord-zuid', province: 'Overijssel', town: 'Enschede', dataVersion: 1, name: 'Golfbaan Het Rijk van Sybrook Noord-Zuid (Enschede)', holeCount: 18, parTotal: 72, pars: [4, 4, 3, 5, 4, 3, 4, 5, 4, 4, 4, 4, 3, 5, 4, 3, 5, 4], si: [7, 13, 15, 5, 1, 9, 17, 3, 11, 4, 10, 2, 12, 18, 6, 8, 16, 14], confirmed: true, location: { lat: 52.27396, lon: 6.93395 }, website: 'https://www.golfenophetrijk.nl/sybrook.html',
    tees: [
      { id: 'het-rijk-van-sybrook-enschede-noord-zuid-wit-h', name: 'Wit (heren)', gender: 'h', rating: 73.9, slope: 138, rating9: null, slope9: null, lengths: [378, 315, 178, 437, 433, 195, 288, 489, 332, 378, 410, 376, 147, 478, 334, 212, 454, 317] },
      { id: 'het-rijk-van-sybrook-enschede-noord-zuid-geel-h', name: 'Geel (heren)', gender: 'h', rating: 72.5, slope: 133, rating9: null, slope9: null, lengths: [365, 315, 178, 437, 396, 195, 288, 463, 313, 378, 355, 376, 147, 445, 334, 185, 432, 317] },
      { id: 'het-rijk-van-sybrook-enschede-noord-zuid-geel-d', name: 'Geel (dames)', gender: 'd', rating: 78.7, slope: 145, rating9: null, slope9: null, lengths: [365, 315, 178, 437, 396, 195, 288, 463, 313, 378, 355, 376, 147, 445, 334, 185, 432, 317] },
      { id: 'het-rijk-van-sybrook-enschede-noord-zuid-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 68.7, slope: 121, rating9: null, slope9: null, lengths: [340, 266, 151, 395, 365, 169, 238, 414, 272, 353, 305, 319, 125, 371, 269, 162, 432, 270] },
      { id: 'het-rijk-van-sybrook-enschede-noord-zuid-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 74.2, slope: 130, rating9: null, slope9: null, lengths: [340, 266, 151, 395, 365, 169, 238, 414, 272, 353, 305, 319, 125, 371, 269, 162, 432, 270] },
      { id: 'het-rijk-van-sybrook-enschede-noord-zuid-rood-h', name: 'Rood (heren)', gender: 'h', rating: 67.8, slope: 118, rating9: null, slope9: null, lengths: [315, 266, 151, 364, 354, 169, 238, 414, 272, 324, 305, 319, 125, 371, 269, 162, 357, 270] },
      { id: 'het-rijk-van-sybrook-enschede-noord-zuid-rood-d', name: 'Rood (dames)', gender: 'd', rating: 73.4, slope: 127, rating9: null, slope9: null, lengths: [315, 266, 151, 364, 354, 169, 238, 414, 272, 324, 305, 319, 125, 371, 269, 162, 357, 270] },
      { id: 'het-rijk-van-sybrook-enschede-noord-zuid-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 63.5, slope: 110, rating9: null, slope9: null, lengths: [268, 226, 123, 304, 300, 144, 202, 352, 231, 275, 259, 266, 112, 315, 224, 138, 303, 207] },
      { id: 'het-rijk-van-sybrook-enschede-noord-zuid-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 67.4, slope: 109, rating9: null, slope9: null, lengths: [268, 226, 123, 304, 300, 144, 202, 352, 231, 275, 259, 266, 112, 315, 224, 138, 303, 207] },
    ],
  },
  {
    id: 'het-rijk-van-sybrook-enschede-oost-noord', province: 'Overijssel', town: 'Enschede', dataVersion: 1, name: 'Golfbaan Het Rijk van Sybrook Oost-Noord (Enschede)', holeCount: 18, parTotal: 72, pars: [4, 3, 5, 4, 3, 5, 4, 4, 4, 4, 4, 3, 5, 4, 3, 4, 5, 4], si: [13, 17, 9, 3, 15, 5, 1, 7, 11, 8, 14, 16, 6, 2, 10, 18, 4, 12], confirmed: true, location: { lat: 52.27396, lon: 6.93395 }, website: 'https://www.golfenophetrijk.nl/sybrook.html',
    tees: [
      { id: 'het-rijk-van-sybrook-enschede-oost-noord-wit-h', name: 'Wit (heren)', gender: 'h', rating: 73.4, slope: 134, rating9: null, slope9: null, lengths: [358, 123, 494, 350, 134, 497, 419, 326, 338, 378, 315, 178, 437, 433, 195, 288, 489, 332] },
      { id: 'het-rijk-van-sybrook-enschede-oost-noord-geel-h', name: 'Geel (heren)', gender: 'h', rating: 71.6, slope: 135, rating9: null, slope9: null, lengths: [300, 123, 453, 339, 134, 482, 398, 326, 338, 365, 315, 178, 437, 396, 195, 288, 463, 313] },
      { id: 'het-rijk-van-sybrook-enschede-oost-noord-geel-d', name: 'Geel (dames)', gender: 'd', rating: 78.3, slope: 139, rating9: null, slope9: null, lengths: [300, 123, 453, 339, 134, 482, 398, 326, 338, 365, 315, 178, 437, 396, 195, 288, 463, 313] },
      { id: 'het-rijk-van-sybrook-enschede-oost-noord-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 68.2, slope: 119, rating9: null, slope9: null, lengths: [300, 104, 408, 281, 116, 433, 349, 279, 282, 340, 266, 151, 395, 365, 169, 238, 414, 272] },
      { id: 'het-rijk-van-sybrook-enschede-oost-noord-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 73.7, slope: 125, rating9: null, slope9: null, lengths: [300, 104, 408, 281, 116, 433, 349, 279, 282, 340, 266, 151, 395, 365, 169, 238, 414, 272] },
      { id: 'het-rijk-van-sybrook-enschede-oost-noord-rood-h', name: 'Rood (heren)', gender: 'h', rating: 67.6, slope: 114, rating9: null, slope9: null, lengths: [266, 104, 408, 281, 116, 405, 349, 279, 282, 315, 266, 151, 364, 354, 169, 238, 414, 272] },
      { id: 'het-rijk-van-sybrook-enschede-oost-noord-rood-d', name: 'Rood (dames)', gender: 'd', rating: 73, slope: 124, rating9: null, slope9: null, lengths: [266, 104, 408, 281, 116, 405, 349, 279, 282, 315, 266, 151, 364, 354, 169, 238, 414, 272] },
      { id: 'het-rijk-van-sybrook-enschede-oost-noord-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 63.6, slope: 108, rating9: null, slope9: null, lengths: [227, 82, 337, 233, 98, 344, 297, 237, 237, 268, 226, 123, 304, 300, 144, 202, 352, 231] },
      { id: 'het-rijk-van-sybrook-enschede-oost-noord-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 67.4, slope: 106, rating9: null, slope9: null, lengths: [227, 82, 337, 233, 98, 344, 297, 237, 237, 268, 226, 123, 304, 300, 144, 202, 352, 231] },
    ],
  },
  {
    id: 'het-rijk-van-sybrook-enschede-zuid-oost', province: 'Overijssel', town: 'Enschede', dataVersion: 1, name: 'Golfbaan Het Rijk van Sybrook Zuid-Oost (Enschede)', holeCount: 18, parTotal: 72, pars: [4, 4, 4, 3, 5, 4, 3, 5, 4, 4, 3, 5, 4, 3, 5, 4, 4, 4], si: [3, 9, 1, 11, 17, 5, 7, 15, 13, 14, 18, 10, 4, 16, 6, 2, 8, 12], confirmed: true, location: { lat: 52.27396, lon: 6.93395 }, website: 'https://www.golfenophetrijk.nl/sybrook.html',
    tees: [
      { id: 'het-rijk-van-sybrook-enschede-zuid-oost-wit-h', name: 'Wit (heren)', gender: 'h', rating: 74.2, slope: 129, rating9: null, slope9: null, lengths: [378, 410, 376, 147, 478, 334, 212, 454, 317, 358, 123, 494, 350, 134, 497, 419, 326, 338] },
      { id: 'het-rijk-van-sybrook-enschede-zuid-oost-geel-h', name: 'Geel (heren)', gender: 'h', rating: 72, slope: 130, rating9: null, slope9: null, lengths: [378, 355, 376, 147, 445, 334, 185, 432, 317, 300, 123, 453, 339, 134, 482, 398, 326, 338] },
      { id: 'het-rijk-van-sybrook-enschede-zuid-oost-geel-d', name: 'Geel (dames)', gender: 'd', rating: 78.1, slope: 143, rating9: null, slope9: null, lengths: [378, 355, 376, 147, 445, 334, 185, 432, 317, 300, 123, 453, 339, 134, 482, 398, 326, 338] },
      { id: 'het-rijk-van-sybrook-enschede-zuid-oost-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 68.6, slope: 116, rating9: null, slope9: null, lengths: [353, 305, 319, 125, 371, 269, 162, 432, 270, 300, 104, 408, 281, 116, 433, 349, 279, 282] },
      { id: 'het-rijk-van-sybrook-enschede-zuid-oost-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 74.2, slope: 123, rating9: null, slope9: null, lengths: [353, 305, 319, 125, 371, 269, 162, 432, 270, 300, 104, 408, 281, 116, 433, 349, 279, 282] },
      { id: 'het-rijk-van-sybrook-enschede-zuid-oost-rood-h', name: 'Rood (heren)', gender: 'h', rating: 67.5, slope: 114, rating9: null, slope9: null, lengths: [324, 305, 319, 125, 371, 269, 162, 357, 270, 266, 104, 408, 281, 116, 405, 349, 279, 282] },
      { id: 'het-rijk-van-sybrook-enschede-zuid-oost-rood-d', name: 'Rood (dames)', gender: 'd', rating: 73.4, slope: 120, rating9: null, slope9: null, lengths: [324, 305, 319, 125, 371, 269, 162, 357, 270, 266, 104, 408, 281, 116, 405, 349, 279, 282] },
      { id: 'het-rijk-van-sybrook-enschede-zuid-oost-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 63.6, slope: 104, rating9: null, slope9: null, lengths: [275, 259, 266, 112, 315, 224, 138, 303, 207, 227, 82, 337, 233, 98, 344, 297, 237, 237] },
      { id: 'het-rijk-van-sybrook-enschede-zuid-oost-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 67.2, slope: 112, rating9: null, slope9: null, lengths: [275, 259, 266, 112, 315, 224, 138, 303, 207, 227, 82, 337, 233, 98, 344, 297, 237, 237] },
    ],
  },
  {
    id: 'semslanden-gasselte', province: 'Drenthe', town: 'Gasselternijveen', dataVersion: 1, name: 'Golfclub de Semslanden (Gasselternijveen)', holeCount: 18, parTotal: 72, pars: [4, 4, 4, 3, 5, 4, 5, 3, 4, 4, 3, 4, 5, 4, 4, 3, 4, 5], si: [11, 13, 7, 15, 1, 3, 9, 17, 5, 2, 18, 12, 8, 10, 14, 16, 4, 6], confirmed: true, location: { lat: 52.98576, lon: 6.80663 }, website: 'https://semslanden.nl/',
    tees: [
      { id: 'semslanden-gasselte-wit-h', name: 'Wit (heren)', gender: 'h', rating: 73.7, slope: 142, rating9: null, slope9: null, lengths: [333, 343, 384, 192, 517, 402, 491, 182, 353, 416, 152, 331, 455, 372, 335, 172, 355, 485] },
      { id: 'semslanden-gasselte-geel-h', name: 'Geel (heren)', gender: 'h', rating: 71.7, slope: 137, rating9: null, slope9: null, lengths: [327, 328, 373, 181, 488, 366, 456, 157, 307, 398, 138, 290, 445, 358, 323, 146, 342, 465] },
      { id: 'semslanden-gasselte-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 69.1, slope: 125, rating9: null, slope9: null, lengths: [318, 293, 307, 175, 450, 343, 426, 145, 300, 339, 138, 290, 388, 305, 323, 142, 309, 397] },
      { id: 'semslanden-gasselte-rood-h', name: 'Rood (heren)', gender: 'h', rating: 67.8, slope: 113, rating9: null, slope9: null, lengths: [281, 265, 301, 158, 433, 319, 394, 112, 242, 330, 117, 244, 380, 277, 276, 125, 265, 397] },
      { id: 'semslanden-gasselte-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 65.7, slope: 106, rating9: null, slope9: null, lengths: [245, 260, 271, 113, 389, 290, 362, 107, 230, 301, 89, 216, 345, 271, 234, 120, 255, 340] },
      { id: 'semslanden-gasselte-geel-d', name: 'Geel (dames)', gender: 'd', rating: 78.4, slope: 144, rating9: null, slope9: null, lengths: [327, 328, 373, 181, 488, 366, 456, 157, 307, 398, 138, 290, 445, 358, 323, 146, 342, 465] },
      { id: 'semslanden-gasselte-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 74.8, slope: 142, rating9: null, slope9: null, lengths: [318, 293, 307, 175, 450, 343, 426, 145, 300, 339, 138, 290, 388, 305, 323, 142, 309, 397] },
      { id: 'semslanden-gasselte-rood-d', name: 'Rood (dames)', gender: 'd', rating: 71.8, slope: 134, rating9: null, slope9: null, lengths: [281, 265, 301, 158, 433, 319, 394, 112, 242, 330, 117, 244, 380, 277, 276, 125, 265, 397] },
      { id: 'semslanden-gasselte-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 69.2, slope: 122, rating9: null, slope9: null, lengths: [245, 260, 271, 113, 389, 290, 362, 107, 230, 301, 89, 216, 345, 271, 234, 120, 255, 340] },
    ],
  },
  {
    id: 'semslanden-gasselte-drieveld-par-3', province: 'Drenthe', town: 'Gasselternijveen', dataVersion: 1, name: 'Golfclub de Semslanden Drieveld par 3 (Gasselternijveen)', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [11, 7, 5, 15, 17, 13, 3, 1, 9, 18, 6, 8, 16, 14, 10, 2, 4, 12], confirmed: true, countsForIndex: false, location: { lat: 52.98576, lon: 6.80663 }, website: 'https://semslanden.nl/',
    tees: [
      { id: 'semslanden-gasselte-drieveld-par-3-geel-h', name: 'Geel (heren)', gender: 'h', rating: 47, slope: 60, rating9: null, slope9: null, lengths: [70, 81, 90, 63, 67, 86, 115, 125, 72, 45, 81, 65, 54, 58, 66, 105, 82, 60] },
      { id: 'semslanden-gasselte-drieveld-par-3-rood-d', name: 'Rood (dames)', gender: 'd', rating: 48.5, slope: 64, rating9: null, slope9: null, lengths: [70, 81, 90, 63, 67, 86, 115, 125, 72, 45, 81, 65, 54, 58, 66, 105, 82, 60] },
    ],
  },
  {
    id: 'semslanden-gasselte-par-3-variant', province: 'Drenthe', town: 'Gasselternijveen', dataVersion: 1, name: 'Golfclub de Semslanden Par 3-variant (Gasselternijveen)', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [3, 9, 15, 1, 7, 17, 13, 5, 11, 14, 16, 2, 6, 18, 4, 10, 12, 8], confirmed: true, countsForIndex: false, location: { lat: 52.98576, lon: 6.80663 }, website: 'https://semslanden.nl/',
    tees: [
      { id: 'semslanden-gasselte-par-3-variant-geel-h', name: 'Geel (heren)', gender: 'h', rating: 54.6, slope: 85, rating9: null, slope9: null, lengths: [211, 156, 120, 181, 169, 112, 142, 157, 131, 143, 138, 180, 138, 131, 222, 146, 119, 186] },
      { id: 'semslanden-gasselte-par-3-variant-rood-h', name: 'Rood (heren)', gender: 'h', rating: 50.6, slope: 72, rating9: null, slope9: null, lengths: [147, 115, 75, 158, 144, 112, 92, 112, 93, 94, 117, 104, 124, 73, 160, 125, 85, 136] },
      { id: 'semslanden-gasselte-par-3-variant-geel-d', name: 'Geel (dames)', gender: 'd', rating: 57.4, slope: 92, rating9: null, slope9: null, lengths: [211, 156, 120, 181, 169, 112, 142, 157, 131, 143, 138, 180, 138, 131, 222, 146, 119, 186] },
      { id: 'semslanden-gasselte-par-3-variant-rood-d', name: 'Rood (dames)', gender: 'd', rating: 52.5, slope: 75, rating9: null, slope9: null, lengths: [147, 115, 75, 158, 144, 112, 92, 112, 93, 94, 117, 104, 124, 73, 160, 125, 85, 136] },
    ],
  },
  {
    id: 'spielehof-boekelo-grobbebaan', province: 'Overijssel', town: 'Boekelo', dataVersion: 1, name: 'Golfbaan Spielehof Grobbebaan (Boekelo)', holeCount: 18, parTotal: 58, pars: [3, 3, 3, 4, 3, 3, 4, 3, 3, 3, 3, 3, 4, 3, 3, 4, 3, 3], si: [5, 17, 1, 7, 13, 15, 3, 11, 9, 6, 18, 2, 8, 14, 16, 4, 12, 10], confirmed: true, countsForIndex: false, location: { lat: 52.20171, lon: 6.7849 }, website: 'https://www.spielehof.nl/',
    tees: [
      { id: 'spielehof-boekelo-grobbebaan-geel-h', name: 'Geel (heren)', gender: 'h', rating: 56.5, slope: 100, rating9: null, slope9: null, lengths: [139, 110, 150, 308, 130, 104, 347, 150, 93, 139, 110, 150, 308, 130, 104, 347, 150, 93] },
      { id: 'spielehof-boekelo-grobbebaan-geel-d', name: 'Geel (dames)', gender: 'd', rating: 59.7, slope: 106, rating9: null, slope9: null, lengths: [139, 110, 150, 308, 130, 104, 347, 150, 93, 139, 110, 150, 308, 130, 104, 347, 150, 93] },
      { id: 'spielehof-boekelo-grobbebaan-rood-h', name: 'Rood (heren)', gender: 'h', rating: 54.6, slope: 94, rating9: null, slope9: null, lengths: [117, 99, 139, 272, 130, 91, 311, 138, 93, 117, 99, 139, 272, 130, 91, 311, 138, 93] },
      { id: 'spielehof-boekelo-grobbebaan-rood-d', name: 'Rood (dames)', gender: 'd', rating: 57.6, slope: 105, rating9: null, slope9: null, lengths: [117, 99, 139, 272, 130, 91, 311, 138, 93, 117, 99, 139, 272, 130, 91, 311, 138, 93] },
    ],
  },
  {
    id: 'spielehof-boekelo-shortgolf', province: 'Overijssel', town: 'Boekelo', dataVersion: 1, name: 'Golfbaan Spielehof Shortgolf (Boekelo)', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [8, 14, 6, 10, 7, 15, 12, 17, 2, 1, 5, 11, 3, 16, 18, 13, 9, 4], confirmed: true, countsForIndex: false, location: { lat: 52.20171, lon: 6.7849 }, website: 'https://www.spielehof.nl/',
    tees: [
      { id: 'spielehof-boekelo-shortgolf-standaard-h', name: 'Standaard (heren)', gender: 'h', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [65, 57, 61, 54, 48, 47, 63, 50, 73, 60, 52, 57, 76, 30, 49, 48, 62, 67] },
      { id: 'spielehof-boekelo-shortgolf-standaard-d', name: 'Standaard (dames)', gender: 'd', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [65, 57, 61, 54, 48, 47, 63, 50, 73, 60, 52, 57, 76, 30, 49, 48, 62, 67] },
    ],
  },
  {
    id: 'de-breuninkhof-bussloo', province: 'Gelderland', town: 'Voorst', dataVersion: 1, name: 'Golfpark De Breuninkhof (Voorst)', holeCount: 18, parTotal: 72, pars: [4, 3, 4, 3, 5, 4, 4, 5, 4, 4, 3, 4, 3, 5, 4, 4, 5, 4], si: [6, 12, 10, 18, 14, 8, 2, 16, 4, 7, 9, 11, 17, 13, 5, 3, 15, 1], confirmed: true, location: { lat: 52.19903, lon: 6.12452 }, website: 'https://www.hollandschegolfclub.nl/golfpark/de-breuninkhof/',
    tees: [
      { id: 'de-breuninkhof-bussloo-geel-h', name: 'Geel (heren)', gender: 'h', rating: 73.3, slope: 135, rating9: null, slope9: null, lengths: [346, 154, 314, 105, 441, 371, 421, 446, 344, 320, 172, 303, 121, 456, 408, 384, 459, 396] },
      { id: 'de-breuninkhof-bussloo-geel-d', name: 'Geel (dames)', gender: 'd', rating: 79.4, slope: 151, rating9: null, slope9: null, lengths: [346, 154, 314, 105, 441, 371, 421, 446, 344, 320, 172, 303, 121, 456, 408, 384, 459, 396] },
      { id: 'de-breuninkhof-bussloo-rood-h', name: 'Rood (heren)', gender: 'h', rating: 69.4, slope: 124, rating9: null, slope9: null, lengths: [317, 133, 303, 92, 380, 317, 357, 384, 313, 286, 154, 272, 105, 394, 343, 324, 404, 344] },
      { id: 'de-breuninkhof-bussloo-rood-d', name: 'Rood (dames)', gender: 'd', rating: 74.8, slope: 137, rating9: null, slope9: null, lengths: [317, 133, 303, 92, 380, 317, 357, 384, 313, 286, 154, 272, 105, 394, 343, 324, 404, 344] },
      { id: 'de-breuninkhof-bussloo-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 65.6, slope: 116, rating9: null, slope9: null, lengths: [256, 122, 214, 83, 342, 285, 292, 336, 293, 256, 122, 214, 83, 342, 285, 292, 336, 293] },
      { id: 'de-breuninkhof-bussloo-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 70.7, slope: 123, rating9: null, slope9: null, lengths: [256, 122, 214, 83, 342, 285, 292, 336, 293, 256, 122, 214, 83, 342, 285, 292, 336, 293] },
    ],
  },
  {
    id: 'de-breuninkhof-bussloo-par-3-baan', province: 'Gelderland', town: 'Voorst', dataVersion: 1, name: 'Golfpark De Breuninkhof Par 3-baan (Voorst)', holeCount: 9, parTotal: 27, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3], si: [3, 9, 2, 7, 5, 8, 1, 6, 4], confirmed: true, countsForIndex: false, location: { lat: 52.19903, lon: 6.12452 }, website: 'https://www.hollandschegolfclub.nl/golfpark/de-breuninkhof/',
    tees: [
      { id: 'de-breuninkhof-bussloo-par-3-baan-geel-h', name: 'Geel (heren)', gender: 'h', rating: 24.6, slope: 67, rating9: null, slope9: null, lengths: [126, 70, 125, 103, 108, 76, 135, 103, 116] },
      { id: 'de-breuninkhof-bussloo-par-3-baan-rood-d', name: 'Rood (dames)', gender: 'd', rating: 25.6, slope: 73, rating9: null, slope9: null, lengths: [126, 70, 125, 103, 108, 76, 135, 103, 116] },
    ],
  },
  {
    id: 'pitch-putt-bussloo-a', province: 'Gelderland', town: 'Wilp', dataVersion: 1, name: 'Pitch & Putt Bussloo A (Wilp)', holeCount: 9, parTotal: 27, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3], si: [4, 8, 5, 2, 6, 9, 1, 7, 3], confirmed: false, fromSources: true, countsForIndex: false, location: { lat: 52.20138, lon: 6.09192 }, website: 'https://multifunbussloo.nl/outdoor/pitch-en-putt/',
    tees: [
      { id: 'pitch-putt-bussloo-a-wit-h', name: 'Wit (heren)', gender: 'h', rating: 27, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [54, 39, 49, 68, 48, 36, 77, 42, 57] },
      { id: 'pitch-putt-bussloo-a-wit-d', name: 'Wit (dames)', gender: 'd', rating: 27, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [54, 39, 49, 68, 48, 36, 77, 42, 57] },
    ],
  },
  {
    id: 'pitch-putt-bussloo-b', province: 'Gelderland', town: 'Wilp', dataVersion: 1, name: 'Pitch & Putt Bussloo B (Wilp)', holeCount: 9, parTotal: 27, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3], si: [4, 1, 3, 9, 8, 7, 2, 5, 6], confirmed: false, fromSources: true, countsForIndex: false, location: { lat: 52.20138, lon: 6.09192 }, website: 'https://multifunbussloo.nl/outdoor/pitch-en-putt/',
    tees: [
      { id: 'pitch-putt-bussloo-b-wit-h', name: 'Wit (heren)', gender: 'h', rating: 27, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [54, 62, 54, 38, 38, 47, 56, 52, 51] },
      { id: 'pitch-putt-bussloo-b-wit-d', name: 'Wit (dames)', gender: 'd', rating: 27, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [54, 62, 54, 38, 38, 47, 56, 52, 51] },
    ],
  },
  {
    id: 'pitch-putt-bussloo-c', province: 'Gelderland', town: 'Wilp', dataVersion: 1, name: 'Pitch & Putt Bussloo C (Wilp)', holeCount: 9, parTotal: 27, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3], si: [9, 1, 4, 3, 7, 5, 2, 8, 6], confirmed: false, fromSources: true, countsForIndex: false, location: { lat: 52.20138, lon: 6.09192 }, website: 'https://multifunbussloo.nl/outdoor/pitch-en-putt/',
    tees: [
      { id: 'pitch-putt-bussloo-c-wit-h', name: 'Wit (heren)', gender: 'h', rating: 27, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [45, 71, 62, 66, 50, 60, 66, 45, 52] },
      { id: 'pitch-putt-bussloo-c-wit-d', name: 'Wit (dames)', gender: 'd', rating: 27, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [45, 71, 62, 66, 50, 60, 66, 45, 52] },
    ],
  },
  {
    id: 'golfclub-heidemeer', province: 'Friesland', town: 'Heerenveen', dataVersion: 1, name: 'Golfclub Heidemeer (Heerenveen)', holeCount: 9, parTotal: 35, pars: [4, 5, 4, 4, 3, 4, 3, 4, 4], si: [9, 3, 2, 6, 5, 1, 7, 4, 8], confirmed: true, location: { lat: 52.93761, lon: 5.93926 }, website: 'https://golfclubheidemeer.nl/',
    tees: [
      { id: 'golfclub-heidemeer-geel-h', name: 'Geel (heren)', gender: 'h', rating: 34.4, slope: 124, rating9: null, slope9: null, lengths: [250, 461, 324, 321, 164, 394, 152, 315, 234] },
      { id: 'golfclub-heidemeer-rood-h', name: 'Rood (heren)', gender: 'h', rating: 33.1, slope: 114, rating9: null, slope9: null, lengths: [231, 436, 279, 276, 144, 329, 131, 287, 211] },
      { id: 'golfclub-heidemeer-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 31.3, slope: 102, rating9: null, slope9: null, lengths: [181, 369, 213, 218, 92, 287, 87, 245, 170] },
      { id: 'golfclub-heidemeer-geel-d', name: 'Geel (dames)', gender: 'd', rating: 37.1, slope: 131, rating9: null, slope9: null, lengths: [250, 461, 324, 321, 164, 394, 152, 315, 234] },
      { id: 'golfclub-heidemeer-rood-d', name: 'Rood (dames)', gender: 'd', rating: 35.3, slope: 124, rating9: null, slope9: null, lengths: [231, 436, 279, 276, 144, 329, 131, 287, 211] },
      { id: 'golfclub-heidemeer-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 32.6, slope: 105, rating9: null, slope9: null, lengths: [181, 369, 213, 218, 92, 287, 87, 245, 170] },
    ],
  },
  {
    id: 'rijk-van-nunspeet-noord', province: 'Gelderland', town: 'Nunspeet', dataVersion: 1, name: 'Golfbaan Het Rijk van Nunspeet Noord', holeCount: 9, parTotal: 36, pars: [4, 3, 5, 4, 4, 4, 3, 5, 4], si: [5, 9, 3, 7, 2, 1, 6, 4, 8], confirmed: true, location: { lat: 52.36771, lon: 5.79827 }, website: 'https://www.golfenophetrijk.nl/nunspeet.html',
    tees: [
      { id: 'rijk-van-nunspeet-noord-wit-h', name: 'Wit (heren)', gender: 'h', rating: 36.4, slope: 138, rating9: null, slope9: null, lengths: [346, 146, 488, 315, 338, 375, 167, 478, 341] },
      { id: 'rijk-van-nunspeet-noord-geel-h', name: 'Geel (heren)', gender: 'h', rating: 36, slope: 132, rating9: null, slope9: null, lengths: [331, 138, 442, 304, 328, 363, 157, 469, 334] },
      { id: 'rijk-van-nunspeet-noord-geel-d', name: 'Geel (dames)', gender: 'd', rating: 38.9, slope: 144, rating9: null, slope9: null, lengths: [331, 138, 442, 304, 328, 363, 157, 469, 334] },
      { id: 'rijk-van-nunspeet-noord-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 35.3, slope: 127, rating9: null, slope9: null, lengths: [320, 124, 436, 301, 319, 347, 141, 442, 301] },
      { id: 'rijk-van-nunspeet-noord-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 38.1, slope: 136, rating9: null, slope9: null, lengths: [320, 124, 436, 301, 319, 347, 141, 442, 301] },
      { id: 'rijk-van-nunspeet-noord-rood-h', name: 'Rood (heren)', gender: 'h', rating: 34.2, slope: 119, rating9: null, slope9: null, lengths: [283, 116, 414, 274, 276, 326, 135, 412, 284] },
      { id: 'rijk-van-nunspeet-noord-rood-d', name: 'Rood (dames)', gender: 'd', rating: 36.8, slope: 127, rating9: null, slope9: null, lengths: [283, 116, 414, 274, 276, 326, 135, 412, 284] },
      { id: 'rijk-van-nunspeet-noord-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 32, slope: 112, rating9: null, slope9: null, lengths: [249, 62, 343, 183, 238, 211, 95, 338, 238] },
      { id: 'rijk-van-nunspeet-noord-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 34, slope: 111, rating9: null, slope9: null, lengths: [249, 62, 343, 183, 238, 211, 95, 338, 238] },
    ],
  },
  {
    id: 'rijk-van-nunspeet-oost', province: 'Gelderland', town: 'Nunspeet', dataVersion: 1, name: 'Golfbaan Het Rijk van Nunspeet Oost', holeCount: 9, parTotal: 36, pars: [5, 4, 3, 5, 4, 4, 3, 4, 4], si: [5, 9, 8, 3, 7, 1, 6, 4, 2], confirmed: true, location: { lat: 52.36771, lon: 5.79827 }, website: 'https://www.golfenophetrijk.nl/nunspeet.html',
    tees: [
      { id: 'rijk-van-nunspeet-oost-wit-h', name: 'Wit (heren)', gender: 'h', rating: 36, slope: 125, rating9: null, slope9: null, lengths: [479, 262, 147, 467, 320, 366, 189, 352, 399] },
      { id: 'rijk-van-nunspeet-oost-geel-h', name: 'Geel (heren)', gender: 'h', rating: 35.5, slope: 126, rating9: null, slope9: null, lengths: [455, 257, 138, 456, 304, 353, 177, 343, 387] },
      { id: 'rijk-van-nunspeet-oost-geel-d', name: 'Geel (dames)', gender: 'd', rating: 38.2, slope: 137, rating9: null, slope9: null, lengths: [455, 257, 138, 456, 304, 353, 177, 343, 387] },
      { id: 'rijk-van-nunspeet-oost-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 34.5, slope: 121, rating9: null, slope9: null, lengths: [425, 249, 131, 414, 290, 340, 170, 317, 361] },
      { id: 'rijk-van-nunspeet-oost-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 37.1, slope: 131, rating9: null, slope9: null, lengths: [425, 249, 131, 414, 290, 340, 170, 317, 361] },
      { id: 'rijk-van-nunspeet-oost-rood-h', name: 'Rood (heren)', gender: 'h', rating: 33.4, slope: 119, rating9: null, slope9: null, lengths: [407, 202, 111, 395, 258, 315, 162, 301, 334] },
      { id: 'rijk-van-nunspeet-oost-rood-d', name: 'Rood (dames)', gender: 'd', rating: 36.4, slope: 120, rating9: null, slope9: null, lengths: [407, 202, 111, 395, 258, 315, 162, 301, 334] },
      { id: 'rijk-van-nunspeet-oost-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 31.1, slope: 105, rating9: null, slope9: null, lengths: [335, 148, 81, 329, 206, 217, 83, 231, 243] },
      { id: 'rijk-van-nunspeet-oost-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 32.8, slope: 110, rating9: null, slope9: null, lengths: [335, 148, 81, 329, 206, 217, 83, 231, 243] },
    ],
  },
  {
    id: 'rijk-van-nunspeet-zuid', province: 'Gelderland', town: 'Nunspeet', dataVersion: 1, name: 'Golfbaan Het Rijk van Nunspeet Zuid', holeCount: 9, parTotal: 36, pars: [4, 5, 3, 4, 4, 4, 4, 3, 5], si: [7, 4, 9, 2, 1, 8, 5, 6, 3], confirmed: true, location: { lat: 52.36771, lon: 5.79827 }, website: 'https://www.golfenophetrijk.nl/nunspeet.html',
    tees: [
      { id: 'rijk-van-nunspeet-zuid-wit-h', name: 'Wit (heren)', gender: 'h', rating: 36.8, slope: 141, rating9: null, slope9: null, lengths: [334, 458, 144, 365, 400, 326, 330, 179, 496] },
      { id: 'rijk-van-nunspeet-zuid-geel-h', name: 'Geel (heren)', gender: 'h', rating: 36.1, slope: 139, rating9: null, slope9: null, lengths: [311, 433, 137, 357, 380, 304, 322, 171, 481] },
      { id: 'rijk-van-nunspeet-zuid-geel-d', name: 'Geel (dames)', gender: 'd', rating: 39.1, slope: 146, rating9: null, slope9: null, lengths: [311, 433, 137, 357, 380, 304, 322, 171, 481] },
      { id: 'rijk-van-nunspeet-zuid-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 35.4, slope: 129, rating9: null, slope9: null, lengths: [298, 423, 117, 329, 350, 298, 308, 166, 465] },
      { id: 'rijk-van-nunspeet-zuid-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 38.2, slope: 142, rating9: null, slope9: null, lengths: [298, 423, 117, 329, 350, 298, 308, 166, 465] },
      { id: 'rijk-van-nunspeet-zuid-rood-h', name: 'Rood (heren)', gender: 'h', rating: 34.1, slope: 126, rating9: null, slope9: null, lengths: [283, 386, 113, 288, 332, 260, 283, 144, 427] },
      { id: 'rijk-van-nunspeet-zuid-rood-d', name: 'Rood (dames)', gender: 'd', rating: 37.1, slope: 135, rating9: null, slope9: null, lengths: [283, 386, 113, 288, 332, 260, 283, 144, 427] },
      { id: 'rijk-van-nunspeet-zuid-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 31.1, slope: 114, rating9: null, slope9: null, lengths: [173, 306, 55, 216, 288, 188, 214, 79, 338] },
      { id: 'rijk-van-nunspeet-zuid-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 32.7, slope: 110, rating9: null, slope9: null, lengths: [173, 306, 55, 216, 288, 188, 214, 79, 338] },
    ],
  },
  {
    id: 'golf-residentie-dronten', province: 'Flevoland', town: 'Dronten', dataVersion: 1, name: 'Golf Residentie Dronten', holeCount: 18, parTotal: 72, pars: [4, 4, 3, 4, 4, 5, 3, 4, 4, 4, 4, 5, 3, 5, 3, 4, 4, 5], si: [8, 6, 16, 2, 12, 10, 18, 4, 14, 3, 9, 5, 15, 1, 17, 13, 11, 7], confirmed: true, location: { lat: 52.50035, lon: 5.71047 }, website: 'https://golfresidentie.nl/',
    tees: [
      { id: 'golf-residentie-dronten-wit-h', name: 'Wit (heren)', gender: 'h', rating: 73.2, slope: 140, rating9: null, slope9: null, lengths: [322, 338, 181, 391, 310, 442, 154, 335, 274, 388, 361, 514, 190, 523, 138, 326, 424, 520] },
      { id: 'golf-residentie-dronten-geel-h', name: 'Geel (heren)', gender: 'h', rating: 71.4, slope: 138, rating9: null, slope9: null, lengths: [322, 338, 151, 354, 310, 442, 154, 335, 274, 322, 361, 487, 165, 500, 115, 326, 336, 476] },
      { id: 'golf-residentie-dronten-geel-d', name: 'Geel (dames)', gender: 'd', rating: 78.1, slope: 143, rating9: null, slope9: null, lengths: [322, 338, 151, 354, 310, 442, 154, 335, 274, 322, 361, 487, 165, 500, 115, 326, 336, 476] },
      { id: 'golf-residentie-dronten-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 69.7, slope: 131, rating9: null, slope9: null, lengths: [273, 313, 143, 354, 286, 435, 132, 310, 241, 322, 338, 487, 154, 450, 115, 303, 336, 476] },
      { id: 'golf-residentie-dronten-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 75.9, slope: 140, rating9: null, slope9: null, lengths: [273, 313, 143, 354, 286, 435, 132, 310, 241, 322, 338, 487, 154, 450, 115, 303, 336, 476] },
      { id: 'golf-residentie-dronten-rood-h', name: 'Rood (heren)', gender: 'h', rating: 67, slope: 119, rating9: null, slope9: null, lengths: [247, 285, 123, 320, 255, 382, 116, 283, 221, 300, 308, 410, 139, 450, 90, 275, 304, 399] },
      { id: 'golf-residentie-dronten-rood-d', name: 'Rood (dames)', gender: 'd', rating: 72.2, slope: 134, rating9: null, slope9: null, lengths: [247, 285, 123, 320, 255, 382, 116, 283, 221, 300, 308, 410, 139, 450, 90, 275, 304, 399] },
      { id: 'golf-residentie-dronten-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 64, slope: 111, rating9: null, slope9: null, lengths: [210, 243, 117, 272, 217, 325, 110, 241, 188, 255, 262, 349, 134, 383, 86, 234, 259, 340] },
      { id: 'golf-residentie-dronten-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 68.2, slope: 121, rating9: null, slope9: null, lengths: [210, 243, 117, 272, 217, 325, 110, 241, 188, 255, 262, 349, 134, 383, 86, 234, 259, 340] },
    ],
  },
  {
    id: 'openbare-golfclub-dronten', province: 'Flevoland', town: 'Dronten', dataVersion: 1, name: 'Openbare Golfclub Dronten', holeCount: 18, parTotal: 71, pars: [5, 3, 4, 4, 3, 4, 4, 5, 4, 4, 3, 4, 4, 3, 4, 4, 5, 4], si: [10, 4, 12, 14, 6, 8, 2, 18, 16, 1, 3, 11, 9, 5, 7, 17, 13, 15], confirmed: true, location: { lat: 52.49752, lon: 5.70899 }, website: 'https://www.openbaregolfclubdronten.nl/',
    tees: [
      { id: 'openbare-golfclub-dronten-geel-h', name: 'Geel (heren)', gender: 'h', rating: 67.7, slope: 118, rating9: null, slope9: null, lengths: [396, 170, 276, 247, 113, 321, 340, 416, 268, 337, 170, 276, 280, 113, 321, 249, 466, 268] },
      { id: 'openbare-golfclub-dronten-geel-d', name: 'Geel (dames)', gender: 'd', rating: 72.8, slope: 131, rating9: null, slope9: null, lengths: [396, 170, 276, 247, 113, 321, 340, 416, 268, 337, 170, 276, 280, 113, 321, 249, 466, 268] },
      { id: 'openbare-golfclub-dronten-rood-h', name: 'Rood (heren)', gender: 'h', rating: 64.9, slope: 108, rating9: null, slope9: null, lengths: [337, 153, 250, 216, 98, 280, 249, 375, 254, 294, 153, 250, 247, 98, 280, 225, 416, 254] },
      { id: 'openbare-golfclub-dronten-rood-d', name: 'Rood (dames)', gender: 'd', rating: 69.1, slope: 120, rating9: null, slope9: null, lengths: [337, 153, 250, 216, 98, 280, 249, 375, 254, 294, 153, 250, 247, 98, 280, 225, 416, 254] },
      { id: 'openbare-golfclub-dronten-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 62, slope: 95, rating9: null, slope9: null, lengths: [294, 105, 202, 153, 94, 222, 225, 305, 207, 219, 105, 202, 153, 94, 222, 225, 305, 207] },
      { id: 'openbare-golfclub-dronten-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 64.5, slope: 100, rating9: null, slope9: null, lengths: [294, 105, 202, 153, 94, 222, 225, 305, 207, 219, 105, 202, 153, 94, 222, 225, 305, 207] },
    ],
  },
  {
    id: 'gut-dueneburg-haren', province: 'Duitsland', town: 'Haren', dataVersion: 1, name: 'Golfclub Gut Düneburg (Haren)', holeCount: 18, parTotal: 72, pars: [4, 5, 4, 3, 5, 4, 4, 4, 3, 4, 4, 4, 5, 3, 5, 3, 4, 4], si: [15, 9, 5, 17, 11, 1, 7, 3, 13, 4, 8, 16, 18, 6, 10, 14, 12, 2], confirmed: false, fromSources: true, location: { lat: 52.7792, lon: 7.2082 }, website: 'https://www.golf-emsland.de/',
    tees: [
      { id: 'gut-dueneburg-haren-wit-h', name: 'Wit (heren)', gender: 'h', rating: 72.9, slope: 136, rating9: null, slope9: null, lengths: [328, 467, 315, 139, 442, 357, 337, 270, 149, 376, 355, 346, 464, 190, 507, 154, 330, 333] },
      { id: 'gut-dueneburg-haren-geel-h', name: 'Geel (heren)', gender: 'h', rating: 71.8, slope: 133, rating9: null, slope9: null, lengths: [320, 455, 307, 121, 432, 350, 326, 258, 138, 369, 345, 316, 437, 173, 473, 146, 319, 323] },
      { id: 'gut-dueneburg-haren-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 73.6, slope: 130, rating9: null, slope9: null, lengths: [263, 416, 275, 121, 389, 314, 297, 248, 134, 306, 289, 285, 371, 154, 414, 125, 270, 272] },
      { id: 'gut-dueneburg-haren-rood-d', name: 'Rood (dames)', gender: 'd', rating: 72.6, slope: 128, rating9: null, slope9: null, lengths: [255, 405, 267, 111, 381, 306, 290, 235, 123, 298, 284, 261, 371, 145, 387, 117, 262, 262] },
    ],
  },
  {
    id: 'emstal-lingen', province: 'Duitsland', town: 'Lingen', dataVersion: 1, name: 'Golfclub Emstal (Lingen)', holeCount: 18, parTotal: 72, pars: [5, 3, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 4, 4, 5, 4, 3], si: [5, 17, 3, 13, 11, 9, 7, 1, 15, 14, 2, 12, 6, 10, 16, 8, 4, 18], confirmed: true, location: { lat: 52.5375, lon: 7.2722 }, website: 'https://www.gc-emstal.de/',
    tees: [
      { id: 'emstal-lingen-geel-h', name: 'Geel (heren)', gender: 'h', rating: 71.5, slope: 134, rating9: null, slope9: null, lengths: [445, 143, 342, 329, 186, 446, 334, 402, 274, 171, 513, 370, 418, 331, 311, 466, 338, 161] },
      { id: 'emstal-lingen-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 68.8, slope: 127, rating9: null, slope9: null, lengths: [431, 127, 342, 305, 154, 446, 300, 348, 240, 143, 447, 326, 365, 296, 293, 436, 338, 161] },
      { id: 'emstal-lingen-rood-d', name: 'Rood (dames)', gender: 'd', rating: 73.1, slope: 133, rating9: null, slope9: null, lengths: [409, 127, 272, 305, 154, 401, 300, 348, 240, 143, 447, 326, 365, 296, 260, 393, 266, 146] },
      { id: 'emstal-lingen-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 69.2, slope: 127, rating9: null, slope9: null, lengths: [373, 111, 272, 254, 108, 392, 251, 307, 203, 102, 385, 244, 335, 266, 245, 370, 266, 146] },
    ],
  },
  {
    id: 'shortgolf-swifterbant', province: 'Flevoland', town: 'Swifterbant', dataVersion: 1, name: 'Shortgolf Swifterbant', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [12, 8, 10, 2, 4, 18, 6, 16, 14, 17, 5, 7, 15, 1, 3, 13, 9, 11], confirmed: false, fromSources: true, countsForIndex: false, location: { lat: 52.5817, lon: 5.62625 }, website: 'https://shortgolf.nl/',
    tees: [
      { id: 'shortgolf-swifterbant-geel-h', name: 'Geel (heren)', gender: 'h', rating: 46.7, slope: 54, rating9: null, slope9: null, lengths: [59, 78, 65, 125, 99, 60, 75, 61, 50, 71, 107, 98, 87, 143, 95, 55, 74, 58] },
      { id: 'shortgolf-swifterbant-geel-d', name: 'Geel (dames)', gender: 'd', rating: 47.8, slope: 56, rating9: null, slope9: null, lengths: [59, 78, 65, 125, 99, 60, 75, 61, 50, 71, 107, 98, 87, 143, 95, 55, 74, 58] },
    ],
  },
  {
    id: 'golf-country-club-lauswolt', province: 'Friesland', town: 'Beetsterzwaag', dataVersion: 1, name: 'Golf & Country Club Lauswolt (Beetsterzwaag)', holeCount: 18, parTotal: 73, pars: [5, 3, 4, 4, 5, 3, 4, 4, 4, 4, 3, 5, 4, 5, 4, 5, 3, 4], si: [15, 11, 1, 7, 3, 17, 13, 9, 5, 8, 18, 6, 2, 4, 12, 10, 16, 14], confirmed: true, location: { lat: 53.05936, lon: 6.09126 }, website: 'https://golfclublauswolt.nl/',
    tees: [
      { id: 'golf-country-club-lauswolt-wit-h', name: 'Wit (heren)', gender: 'h', rating: 74.5, slope: 140, rating9: null, slope9: null, lengths: [461, 170, 408, 304, 500, 140, 338, 372, 406, 355, 173, 510, 410, 471, 311, 481, 145, 284] },
      { id: 'golf-country-club-lauswolt-geel-h', name: 'Geel (heren)', gender: 'h', rating: 72.6, slope: 130, rating9: null, slope9: null, lengths: [429, 153, 399, 286, 491, 124, 325, 355, 373, 341, 154, 495, 376, 461, 289, 444, 135, 265] },
      { id: 'golf-country-club-lauswolt-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 69.9, slope: 123, rating9: null, slope9: null, lengths: [383, 136, 342, 278, 426, 124, 320, 308, 338, 303, 145, 425, 323, 409, 271, 412, 125, 259] },
      { id: 'golf-country-club-lauswolt-rood-h', name: 'Rood (heren)', gender: 'h', rating: 67.7, slope: 119, rating9: null, slope9: null, lengths: [356, 125, 307, 245, 406, 104, 276, 297, 317, 285, 126, 412, 300, 396, 248, 361, 115, 226] },
      { id: 'golf-country-club-lauswolt-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 63.4, slope: 110, rating9: null, slope9: null, lengths: [297, 117, 266, 196, 325, 78, 221, 240, 260, 228, 95, 330, 251, 310, 198, 289, 89, 181] },
      { id: 'golf-country-club-lauswolt-geel-d', name: 'Geel (dames)', gender: 'd', rating: 79, slope: 150, rating9: null, slope9: null, lengths: [429, 153, 399, 286, 491, 124, 325, 355, 373, 341, 154, 495, 376, 461, 289, 444, 135, 265] },
      { id: 'golf-country-club-lauswolt-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 75.3, slope: 140, rating9: null, slope9: null, lengths: [383, 136, 342, 278, 426, 124, 320, 308, 338, 303, 145, 425, 323, 409, 271, 412, 125, 259] },
      { id: 'golf-country-club-lauswolt-rood-d', name: 'Rood (dames)', gender: 'd', rating: 72.7, slope: 123, rating9: null, slope9: null, lengths: [356, 125, 307, 245, 406, 104, 276, 297, 317, 285, 126, 412, 300, 396, 248, 361, 115, 226] },
      { id: 'golf-country-club-lauswolt-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 66.8, slope: 117, rating9: null, slope9: null, lengths: [297, 117, 266, 196, 325, 78, 221, 240, 260, 228, 95, 330, 251, 310, 198, 289, 89, 181] },
    ],
  },
  {
    id: 'veluwse-golfclub-hoog-soeren', province: 'Gelderland', town: 'Hoog Soeren', dataVersion: 1, name: 'Veluwse Golfclub (Hoog Soeren)', holeCount: 18, parTotal: 72, pars: [4, 3, 4, 5, 3, 4, 4, 4, 5, 4, 3, 4, 5, 3, 4, 4, 4, 5], si: [7, 17, 1, 11, 15, 5, 3, 13, 9, 6, 16, 4, 12, 18, 10, 2, 14, 8], confirmed: true, location: { lat: 52.21736, lon: 5.87103 }, website: 'https://veluwsegolfclub.nl/',
    tees: [
      { id: 'veluwse-golfclub-hoog-soeren-geel-h', name: 'Geel (heren)', gender: 'h', rating: 70.9, slope: 136, rating9: null, slope9: null, lengths: [329, 119, 408, 441, 147, 342, 347, 293, 413, 350, 130, 408, 435, 106, 319, 374, 273, 434] },
      { id: 'veluwse-golfclub-hoog-soeren-geel-d', name: 'Geel (dames)', gender: 'd', rating: 76.9, slope: 142, rating9: null, slope9: null, lengths: [329, 119, 408, 441, 147, 342, 347, 293, 413, 350, 130, 408, 435, 106, 319, 374, 273, 434] },
      { id: 'veluwse-golfclub-hoog-soeren-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 68.8, slope: 130, rating9: null, slope9: null, lengths: [329, 100, 345, 441, 147, 312, 347, 293, 363, 286, 130, 345, 435, 99, 319, 342, 273, 378] },
      { id: 'veluwse-golfclub-hoog-soeren-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 74.7, slope: 137, rating9: null, slope9: null, lengths: [329, 100, 345, 441, 147, 312, 347, 293, 363, 286, 130, 345, 435, 99, 319, 342, 273, 378] },
      { id: 'veluwse-golfclub-hoog-soeren-rood-h', name: 'Rood (heren)', gender: 'h', rating: 67.2, slope: 119, rating9: null, slope9: null, lengths: [280, 100, 345, 388, 136, 312, 321, 244, 363, 286, 109, 345, 388, 99, 296, 342, 220, 378] },
      { id: 'veluwse-golfclub-hoog-soeren-rood-d', name: 'Rood (dames)', gender: 'd', rating: 72.2, slope: 134, rating9: null, slope9: null, lengths: [280, 100, 345, 388, 136, 312, 321, 244, 363, 286, 109, 345, 388, 99, 296, 342, 220, 378] },
      { id: 'veluwse-golfclub-hoog-soeren-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 64.5, slope: 109, rating9: null, slope9: null, lengths: [255, 95, 302, 341, 99, 246, 256, 182, 354, 255, 95, 302, 341, 99, 246, 256, 182, 354] },
      { id: 'veluwse-golfclub-hoog-soeren-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 67.9, slope: 121, rating9: null, slope9: null, lengths: [255, 95, 302, 341, 99, 246, 256, 182, 354, 255, 95, 302, 341, 99, 246, 256, 182, 354] },
    ],
  },
  {
    id: 'noord-nederlandse-glimmen', province: 'Groningen', town: 'Glimmen', dataVersion: 1, name: 'Noord-Nederlandse Golf & Country Club (Glimmen)', holeCount: 18, parTotal: 72, pars: [4, 5, 4, 3, 4, 4, 4, 5, 3, 4, 5, 3, 5, 4, 4, 4, 3, 4], si: [6, 16, 8, 14, 10, 18, 2, 4, 12, 17, 1, 13, 5, 3, 7, 9, 15, 11], confirmed: true, location: { lat: 53.12072, lon: 6.63174 }, website: 'https://www.nngcc.nl/',
    tees: [
      { id: 'noord-nederlandse-glimmen-wit-h', name: 'Wit (heren)', gender: 'h', rating: 72.4, slope: 136, rating9: null, slope9: null, lengths: [360, 470, 290, 130, 316, 285, 384, 467, 139, 304, 560, 190, 495, 409, 375, 320, 160, 335] },
      { id: 'noord-nederlandse-glimmen-geel-h', name: 'Geel (heren)', gender: 'h', rating: 70.8, slope: 133, rating9: null, slope9: null, lengths: [347, 448, 265, 124, 286, 276, 366, 432, 139, 285, 498, 171, 477, 389, 350, 310, 150, 320] },
      { id: 'noord-nederlandse-glimmen-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 69.1, slope: 126, rating9: null, slope9: null, lengths: [326, 428, 225, 124, 259, 276, 322, 432, 130, 265, 425, 157, 466, 354, 316, 290, 150, 320] },
      { id: 'noord-nederlandse-glimmen-rood-h', name: 'Rood (heren)', gender: 'h', rating: 67.6, slope: 122, rating9: null, slope9: null, lengths: [304, 375, 225, 112, 259, 239, 322, 408, 122, 260, 425, 143, 420, 338, 316, 290, 140, 286] },
      { id: 'noord-nederlandse-glimmen-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 63.2, slope: 106, rating9: null, slope9: null, lengths: [255, 301, 154, 104, 203, 182, 267, 310, 104, 195, 344, 132, 329, 293, 272, 229, 102, 214] },
      { id: 'noord-nederlandse-glimmen-geel-d', name: 'Geel (dames)', gender: 'd', rating: 76.8, slope: 142, rating9: null, slope9: null, lengths: [347, 448, 265, 124, 286, 276, 366, 432, 139, 285, 498, 171, 477, 389, 350, 310, 150, 320] },
      { id: 'noord-nederlandse-glimmen-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 74.5, slope: 133, rating9: null, slope9: null, lengths: [326, 428, 225, 124, 259, 276, 322, 432, 130, 265, 425, 157, 466, 354, 316, 290, 150, 320] },
      { id: 'noord-nederlandse-glimmen-rood-d', name: 'Rood (dames)', gender: 'd', rating: 72.6, slope: 129, rating9: null, slope9: null, lengths: [304, 375, 225, 112, 259, 239, 322, 408, 122, 260, 425, 143, 420, 338, 316, 290, 140, 286] },
      { id: 'noord-nederlandse-glimmen-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 65.7, slope: 110, rating9: null, slope9: null, lengths: [255, 301, 154, 104, 203, 182, 267, 310, 104, 195, 344, 132, 329, 293, 272, 229, 102, 214] },
    ],
  },
  {
    id: 'euregio-bad-bentheim', province: 'Duitsland', town: 'Bad Bentheim', dataVersion: 1, name: 'Golfclub Euregio Bad Bentheim', holeCount: 18, parTotal: 72, pars: [5, 4, 3, 4, 3, 4, 4, 4, 5, 5, 4, 5, 3, 4, 3, 5, 3, 4], si: [7, 9, 13, 5, 17, 15, 11, 1, 3, 8, 2, 6, 16, 12, 18, 4, 14, 10], confirmed: true, location: { lat: 52.2755, lon: 7.153 }, website: 'https://www.golfclub-euregio.de/',
    tees: [
      { id: 'euregio-bad-bentheim-geel-h', name: 'Geel (heren)', gender: 'h', rating: 70.8, slope: 130, rating9: null, slope9: null, lengths: [441, 331, 173, 301, 130, 299, 300, 395, 487, 456, 375, 473, 154, 304, 169, 489, 178, 325] },
      { id: 'euregio-bad-bentheim-rood-d', name: 'Rood (dames)', gender: 'd', rating: 71.9, slope: 126, rating9: null, slope9: null, lengths: [370, 268, 147, 264, 115, 264, 256, 348, 424, 385, 328, 413, 154, 261, 150, 428, 151, 285] },
    ],
  },
  {
    id: 'holthuizen-roden', province: 'Drenthe', town: 'Roden', dataVersion: 1, name: 'Golfclub Holthuizen (Roden)', holeCount: 18, parTotal: 73, pars: [5, 4, 4, 5, 4, 3, 5, 3, 4, 4, 4, 4, 5, 4, 3, 5, 3, 4], si: [18, 4, 14, 10, 12, 16, 8, 6, 2, 1, 7, 9, 11, 17, 5, 13, 15, 3], confirmed: true, location: { lat: 53.14377, lon: 6.4482 }, website: 'https://golfclubholthuizen.nl/',
    tees: [
      { id: 'holthuizen-roden-geel-h', name: 'Geel (heren)', gender: 'h', rating: 71.2, slope: 124, rating9: null, slope9: null, lengths: [423, 358, 286, 492, 268, 142, 473, 186, 362, 359, 351, 329, 469, 234, 183, 414, 157, 366] },
      { id: 'holthuizen-roden-rood-h', name: 'Rood (heren)', gender: 'h', rating: 67.8, slope: 113, rating9: null, slope9: null, lengths: [374, 310, 246, 454, 244, 128, 410, 147, 315, 344, 291, 282, 431, 218, 165, 386, 135, 310] },
      { id: 'holthuizen-roden-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 64.5, slope: 103, rating9: null, slope9: null, lengths: [308, 254, 241, 355, 206, 128, 375, 130, 256, 308, 254, 241, 355, 206, 128, 375, 130, 256] },
      { id: 'holthuizen-roden-geel-d', name: 'Geel (dames)', gender: 'd', rating: 77.3, slope: 136, rating9: null, slope9: null, lengths: [423, 358, 286, 492, 268, 142, 473, 186, 362, 359, 351, 329, 469, 234, 183, 414, 157, 366] },
      { id: 'holthuizen-roden-rood-d', name: 'Rood (dames)', gender: 'd', rating: 73, slope: 126, rating9: null, slope9: null, lengths: [374, 310, 246, 454, 244, 128, 410, 147, 315, 344, 291, 282, 431, 218, 165, 386, 135, 310] },
      { id: 'holthuizen-roden-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 69, slope: 119, rating9: null, slope9: null, lengths: [308, 254, 241, 355, 206, 128, 375, 130, 256, 308, 254, 241, 355, 206, 128, 375, 130, 256] },
    ],
  },
  {
    id: 'holthuizen-roden-par-3-baan', province: 'Drenthe', town: 'Roden', dataVersion: 1, name: 'Golfclub Holthuizen Par 3-baan (Roden)', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [10, 4, 6, 12, 2, 8, 18, 16, 14, 9, 3, 5, 11, 1, 7, 17, 15, 13], confirmed: true, countsForIndex: false, location: { lat: 53.14377, lon: 6.4482 }, website: 'https://golfclubholthuizen.nl/',
    tees: [
      { id: 'holthuizen-roden-par-3-baan-geel-h', name: 'Geel (heren)', gender: 'h', rating: 48.5, slope: 61, rating9: null, slope9: null, lengths: [87, 130, 117, 86, 161, 100, 75, 77, 80, 87, 130, 117, 86, 161, 100, 75, 77, 80] },
      { id: 'holthuizen-roden-par-3-baan-rood-d', name: 'Rood (dames)', gender: 'd', rating: 50, slope: 67, rating9: null, slope9: null, lengths: [87, 130, 117, 86, 161, 100, 75, 77, 80, 87, 130, 117, 86, 161, 100, 75, 77, 80] },
    ],
  },
  {
    id: 'kasteel-engelenburg-brummen', province: 'Gelderland', town: 'Brummen', dataVersion: 1, name: 'Golfbaan Kasteel Engelenburg (Brummen)', holeCount: 18, parTotal: 72, pars: [4, 4, 4, 5, 3, 4, 5, 3, 4, 4, 4, 4, 5, 3, 4, 5, 3, 4], si: [5, 15, 7, 3, 17, 1, 9, 11, 13, 6, 16, 8, 4, 18, 2, 10, 12, 14], confirmed: true, location: { lat: 52.09048, lon: 6.1346 }, website: 'https://engelenburg.com/golf/',
    tees: [
      { id: 'kasteel-engelenburg-brummen-geel-h', name: 'Geel (heren)', gender: 'h', rating: 72, slope: 131, rating9: null, slope9: null, lengths: [371, 323, 311, 483, 172, 395, 451, 156, 264, 371, 323, 311, 483, 172, 395, 451, 156, 264] },
      { id: 'kasteel-engelenburg-brummen-geel-d', name: 'Geel (dames)', gender: 'd', rating: 78.3, slope: 147, rating9: null, slope9: null, lengths: [371, 323, 311, 483, 172, 395, 451, 156, 264, 371, 323, 311, 483, 172, 395, 451, 156, 264] },
      { id: 'kasteel-engelenburg-brummen-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 69, slope: 123, rating9: null, slope9: null, lengths: [348, 310, 300, 412, 155, 339, 382, 145, 233, 348, 310, 300, 412, 155, 339, 382, 145, 233] },
      { id: 'kasteel-engelenburg-brummen-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 74.3, slope: 132, rating9: null, slope9: null, lengths: [348, 310, 300, 412, 155, 339, 382, 145, 233, 348, 310, 300, 412, 155, 339, 382, 145, 233] },
      { id: 'kasteel-engelenburg-brummen-rood-h', name: 'Rood (heren)', gender: 'h', rating: 68, slope: 112, rating9: null, slope9: null, lengths: [305, 278, 266, 403, 147, 339, 382, 136, 233, 305, 278, 266, 403, 147, 339, 382, 136, 233] },
      { id: 'kasteel-engelenburg-brummen-rood-d', name: 'Rood (dames)', gender: 'd', rating: 73.2, slope: 127, rating9: null, slope9: null, lengths: [305, 278, 266, 403, 147, 339, 382, 136, 233, 305, 278, 266, 403, 147, 339, 382, 136, 233] },
      { id: 'kasteel-engelenburg-brummen-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 66.7, slope: 104, rating9: null, slope9: null, lengths: [290, 260, 250, 388, 138, 318, 375, 127, 210, 290, 260, 250, 388, 138, 318, 375, 127, 210] },
      { id: 'kasteel-engelenburg-brummen-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 71.7, slope: 125, rating9: null, slope9: null, lengths: [290, 260, 250, 388, 138, 318, 375, 127, 210, 290, 260, 250, 388, 138, 318, 375, 127, 210] },
    ],
  },
  {
    id: 't-zelle-hengelo-gld-bosrijk-waterrijk', province: 'Gelderland', town: 'Hengelo', dataVersion: 1, name: 'Golfclub \'t Zelle Bosrijk-Waterrijk (Hengelo)', holeCount: 18, parTotal: 73, pars: [4, 5, 4, 5, 3, 4, 4, 3, 4, 4, 5, 4, 4, 5, 3, 4, 4, 4], si: [12, 14, 18, 6, 10, 4, 2, 16, 8, 17, 3, 1, 5, 7, 9, 15, 13, 11], confirmed: true, location: { lat: 52.0547, lon: 6.38784 }, website: 'https://www.gczelle.nl',
    tees: [
      { id: 't-zelle-hengelo-gld-bosrijk-waterrijk-geel-h', name: 'Geel (heren)', gender: 'h', rating: 73.2, slope: 135, rating9: null, slope9: null, lengths: [296, 447, 267, 510, 201, 369, 406, 151, 355, 264, 480, 406, 372, 511, 150, 299, 240, 304] },
      { id: 't-zelle-hengelo-gld-bosrijk-waterrijk-geel-d', name: 'Geel (dames)', gender: 'd', rating: 79.2, slope: 142, rating9: null, slope9: null, lengths: [296, 447, 267, 510, 201, 369, 406, 151, 355, 264, 480, 406, 372, 511, 150, 299, 240, 304] },
      { id: 't-zelle-hengelo-gld-bosrijk-waterrijk-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 70.6, slope: 125, rating9: null, slope9: null, lengths: [296, 367, 267, 421, 170, 369, 331, 151, 355, 264, 370, 340, 372, 424, 150, 299, 240, 304] },
      { id: 't-zelle-hengelo-gld-bosrijk-waterrijk-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 75.9, slope: 137, rating9: null, slope9: null, lengths: [296, 367, 267, 421, 170, 369, 331, 151, 355, 264, 370, 340, 372, 424, 150, 299, 240, 304] },
      { id: 't-zelle-hengelo-gld-bosrijk-waterrijk-rood-h', name: 'Rood (heren)', gender: 'h', rating: 68.5, slope: 118, rating9: null, slope9: null, lengths: [251, 367, 212, 421, 170, 307, 331, 138, 304, 229, 370, 340, 313, 424, 134, 252, 211, 253] },
      { id: 't-zelle-hengelo-gld-bosrijk-waterrijk-rood-d', name: 'Rood (dames)', gender: 'd', rating: 73.6, slope: 131, rating9: null, slope9: null, lengths: [251, 367, 212, 421, 170, 307, 331, 138, 304, 229, 370, 340, 313, 424, 134, 252, 211, 253] },
    ],
  },
  {
    id: 't-zelle-hengelo-gld-veldrijk-par-3', province: 'Gelderland', town: 'Hengelo', dataVersion: 1, name: 'Golfclub \'t Zelle Veldrijk par 3 (Hengelo)', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [15, 11, 9, 3, 7, 1, 17, 5, 13, 16, 12, 10, 4, 8, 2, 18, 6, 14], confirmed: true, countsForIndex: false, location: { lat: 52.0547, lon: 6.38784 }, website: 'https://www.gczelle.nl',
    tees: [
      { id: 't-zelle-hengelo-gld-veldrijk-par-3-geel-h', name: 'Geel (heren)', gender: 'h', rating: 48.6, slope: 63, rating9: null, slope9: null, lengths: [69, 107, 113, 98, 82, 138, 77, 95, 75, 69, 107, 113, 98, 82, 138, 77, 95, 75] },
      { id: 't-zelle-hengelo-gld-veldrijk-par-3-rood-d', name: 'Rood (dames)', gender: 'd', rating: 50.2, slope: 68, rating9: null, slope9: null, lengths: [69, 107, 113, 98, 82, 138, 77, 95, 75, 69, 107, 113, 98, 82, 138, 77, 95, 75] },
    ],
  },
  {
    id: 'ullerberg-ermelo', province: 'Gelderland', town: 'Leuvenum', dataVersion: 1, name: 'Landgoed Ullerberg (Leuvenum)', holeCount: 9, parTotal: 35, pars: [3, 4, 4, 4, 4, 4, 5, 3, 4], si: [6, 7, 9, 2, 3, 5, 4, 8, 1], confirmed: false, fromSources: true, location: { lat: 52.29999, lon: 5.7059 }, website: 'https://golfullerberg.nl/',
    tees: [
      { id: 'ullerberg-ermelo-geel-h', name: 'Geel (heren)', gender: 'h', rating: 33.6, slope: 113, rating9: null, slope9: null, lengths: [125, 320, 225, 354, 350, 275, 423, 106, 387] },
      { id: 'ullerberg-ermelo-geel-d', name: 'Geel (dames)', gender: 'd', rating: 33.6, slope: 115, rating9: null, slope9: null, lengths: [125, 320, 225, 354, 350, 275, 423, 106, 387] },
      { id: 'ullerberg-ermelo-rood-h', name: 'Rood (heren)', gender: 'h', rating: 32, slope: 107, rating9: null, slope9: null, lengths: [125, 320, 225, 354, 350, 275, 423, 106, 387] },
      { id: 'ullerberg-ermelo-rood-d', name: 'Rood (dames)', gender: 'd', rating: 32.5, slope: 109, rating9: null, slope9: null, lengths: [125, 320, 225, 354, 350, 275, 423, 106, 387] },
    ],
  },
  {
    id: 'the-links-valley-ermelo-north', province: 'Gelderland', town: 'Ermelo', dataVersion: 1, name: 'The Links Valley North (Ermelo)', holeCount: 9, parTotal: 35, pars: [5, 4, 3, 4, 4, 4, 4, 3, 4], si: [5, 3, 9, 1, 8, 4, 6, 7, 2], confirmed: true, location: { lat: 52.30176, lon: 5.68989 }, website: 'https://www.thelinksvalley.nl/',
    tees: [
      { id: 'the-links-valley-ermelo-north-zwart-h', name: 'Zwart (heren)', gender: 'h', rating: 36.7, slope: 128, rating9: null, slope9: null, lengths: [503, 387, 108, 415, 280, 360, 337, 130, 437] },
      { id: 'the-links-valley-ermelo-north-wit-h', name: 'Wit (heren)', gender: 'h', rating: 35.8, slope: 133, rating9: null, slope9: null, lengths: [503, 387, 108, 372, 280, 360, 337, 130, 404] },
      { id: 'the-links-valley-ermelo-north-geel-h', name: 'Geel (heren)', gender: 'h', rating: 35.7, slope: 128, rating9: null, slope9: null, lengths: [499, 350, 107, 372, 270, 358, 308, 126, 391] },
      { id: 'the-links-valley-ermelo-north-geel-d', name: 'Geel (dames)', gender: 'd', rating: 38.5, slope: 140, rating9: null, slope9: null, lengths: [499, 350, 107, 372, 270, 358, 308, 126, 391] },
      { id: 'the-links-valley-ermelo-north-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 33.8, slope: 131, rating9: null, slope9: null, lengths: [428, 348, 98, 323, 266, 332, 269, 117, 347] },
      { id: 'the-links-valley-ermelo-north-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 36.8, slope: 136, rating9: null, slope9: null, lengths: [428, 348, 98, 323, 266, 332, 269, 117, 347] },
      { id: 'the-links-valley-ermelo-north-rood-h', name: 'Rood (heren)', gender: 'h', rating: 32.3, slope: 122, rating9: null, slope9: null, lengths: [426, 288, 96, 287, 189, 267, 264, 112, 347] },
      { id: 'the-links-valley-ermelo-north-rood-d', name: 'Rood (dames)', gender: 'd', rating: 35.7, slope: 130, rating9: null, slope9: null, lengths: [426, 288, 96, 287, 189, 267, 264, 112, 347] },
    ],
  },
  {
    id: 'the-links-valley-ermelo-south', province: 'Gelderland', town: 'Ermelo', dataVersion: 1, name: 'The Links Valley South (Ermelo)', holeCount: 9, parTotal: 35, pars: [5, 3, 4, 4, 3, 4, 3, 4, 5], si: [8, 7, 9, 3, 5, 1, 6, 2, 4], confirmed: true, location: { lat: 52.30176, lon: 5.68989 }, website: 'https://www.thelinksvalley.nl/',
    tees: [
      { id: 'the-links-valley-ermelo-south-zwart-h', name: 'Zwart (heren)', gender: 'h', rating: 36.3, slope: 133, rating9: null, slope9: null, lengths: [462, 143, 265, 383, 197, 422, 157, 375, 588] },
      { id: 'the-links-valley-ermelo-south-wit-h', name: 'Wit (heren)', gender: 'h', rating: 35.7, slope: 134, rating9: null, slope9: null, lengths: [462, 143, 265, 383, 197, 422, 157, 375, 553] },
      { id: 'the-links-valley-ermelo-south-geel-h', name: 'Geel (heren)', gender: 'h', rating: 35, slope: 129, rating9: null, slope9: null, lengths: [408, 125, 258, 381, 165, 395, 132, 373, 521] },
      { id: 'the-links-valley-ermelo-south-geel-d', name: 'Geel (dames)', gender: 'd', rating: 37.6, slope: 141, rating9: null, slope9: null, lengths: [408, 125, 258, 381, 165, 395, 132, 373, 521] },
      { id: 'the-links-valley-ermelo-south-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 33.6, slope: 120, rating9: null, slope9: null, lengths: [404, 123, 253, 342, 143, 363, 117, 335, 448] },
      { id: 'the-links-valley-ermelo-south-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 36.4, slope: 131, rating9: null, slope9: null, lengths: [404, 123, 253, 342, 143, 363, 117, 335, 448] },
      { id: 'the-links-valley-ermelo-south-rood-h', name: 'Rood (heren)', gender: 'h', rating: 32.7, slope: 111, rating9: null, slope9: null, lengths: [356, 101, 218, 279, 140, 363, 117, 305, 448] },
      { id: 'the-links-valley-ermelo-south-rood-d', name: 'Rood (dames)', gender: 'd', rating: 35.1, slope: 127, rating9: null, slope9: null, lengths: [356, 101, 218, 279, 140, 363, 117, 305, 448] },
    ],
  },
  {
    id: 'golfpark-sint-nyk', province: 'Friesland', town: 'Legemeer', dataVersion: 1, name: 'Golfpark Sint Nyk (Legemeer)', holeCount: 18, parTotal: 72, pars: [4, 3, 4, 4, 4, 5, 5, 3, 4, 3, 5, 4, 4, 4, 4, 3, 4, 5], si: [13, 15, 5, 1, 7, 3, 9, 17, 11, 18, 12, 4, 14, 10, 2, 16, 6, 8], confirmed: true, location: { lat: 52.93942, lon: 5.72967 }, website: 'https://www.hollandschegolfclub.nl/golfpark/sint-nyk/',
    tees: [
      { id: 'golfpark-sint-nyk-wit-h', name: 'Wit (heren)', gender: 'h', rating: 72.7, slope: 132, rating9: null, slope9: null, lengths: [331, 168, 347, 389, 357, 460, 474, 150, 323, 131, 463, 372, 291, 340, 408, 149, 345, 540] },
      { id: 'golfpark-sint-nyk-geel-h', name: 'Geel (heren)', gender: 'h', rating: 71.2, slope: 129, rating9: null, slope9: null, lengths: [320, 154, 341, 376, 350, 439, 443, 140, 314, 121, 450, 360, 280, 325, 385, 140, 339, 488] },
      { id: 'golfpark-sint-nyk-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 67.9, slope: 121, rating9: null, slope9: null, lengths: [291, 142, 301, 333, 305, 390, 393, 113, 276, 115, 402, 337, 262, 300, 344, 126, 313, 442] },
      { id: 'golfpark-sint-nyk-rood-h', name: 'Rood (heren)', gender: 'h', rating: 67.1, slope: 116, rating9: null, slope9: null, lengths: [281, 142, 292, 325, 296, 386, 380, 113, 269, 110, 386, 323, 249, 289, 331, 113, 303, 405] },
      { id: 'golfpark-sint-nyk-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 63.8, slope: 105, rating9: null, slope9: null, lengths: [224, 125, 261, 281, 242, 338, 341, 74, 215, 82, 329, 256, 174, 235, 277, 103, 241, 349] },
      { id: 'golfpark-sint-nyk-geel-d', name: 'Geel (dames)', gender: 'd', rating: 77.6, slope: 136, rating9: null, slope9: null, lengths: [320, 154, 341, 376, 350, 439, 443, 140, 314, 121, 450, 360, 280, 325, 385, 140, 339, 488] },
      { id: 'golfpark-sint-nyk-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 73.5, slope: 131, rating9: null, slope9: null, lengths: [291, 142, 301, 333, 305, 390, 393, 113, 276, 115, 402, 337, 262, 300, 344, 126, 313, 442] },
      { id: 'golfpark-sint-nyk-rood-d', name: 'Rood (dames)', gender: 'd', rating: 72.2, slope: 128, rating9: null, slope9: null, lengths: [281, 142, 292, 325, 296, 386, 380, 113, 269, 110, 386, 323, 249, 289, 331, 113, 303, 405] },
      { id: 'golfpark-sint-nyk-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 67.5, slope: 110, rating9: null, slope9: null, lengths: [224, 125, 261, 281, 242, 338, 341, 74, 215, 82, 329, 256, 174, 235, 277, 103, 241, 349] },
    ],
  },
  {
    id: 'de-compagnie-veendam', province: 'Groningen', town: 'Veendam', dataVersion: 1, name: 'Golfclub Landgoed De Compagnie (Veendam)', holeCount: 18, parTotal: 72, pars: [4, 4, 3, 4, 5, 4, 3, 4, 5, 4, 5, 4, 3, 4, 4, 3, 4, 5], si: [6, 12, 18, 2, 14, 4, 16, 10, 8, 7, 15, 5, 17, 11, 1, 13, 3, 9], confirmed: true, location: { lat: 53.11569, lon: 6.84393 }, website: 'https://www.gcdecompagnie.nl/',
    tees: [
      { id: 'de-compagnie-veendam-wit-h', name: 'Wit (heren)', gender: 'h', rating: 74.2, slope: 140, rating9: null, slope9: null, lengths: [397, 326, 156, 374, 450, 364, 156, 355, 504, 393, 485, 359, 147, 341, 366, 195, 414, 503] },
      { id: 'de-compagnie-veendam-geel-h', name: 'Geel (heren)', gender: 'h', rating: 72.6, slope: 135, rating9: null, slope9: null, lengths: [380, 316, 140, 371, 440, 353, 146, 341, 475, 374, 462, 336, 134, 330, 351, 166, 390, 483] },
      { id: 'de-compagnie-veendam-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 69.4, slope: 126, rating9: null, slope9: null, lengths: [336, 283, 130, 314, 426, 316, 138, 301, 400, 321, 392, 330, 134, 288, 300, 157, 330, 421] },
      { id: 'de-compagnie-veendam-rood-h', name: 'Rood (heren)', gender: 'h', rating: 68.5, slope: 115, rating9: null, slope9: null, lengths: [321, 270, 120, 308, 376, 305, 133, 289, 387, 312, 383, 283, 115, 279, 290, 137, 325, 412] },
      { id: 'de-compagnie-veendam-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 64.4, slope: 114, rating9: null, slope9: null, lengths: [250, 222, 74, 256, 338, 252, 88, 234, 355, 283, 354, 246, 71, 228, 252, 65, 277, 397] },
      { id: 'de-compagnie-veendam-geel-d', name: 'Geel (dames)', gender: 'd', rating: 78.7, slope: 145, rating9: null, slope9: null, lengths: [380, 316, 140, 371, 440, 353, 146, 341, 475, 374, 462, 336, 134, 330, 351, 166, 390, 483] },
      { id: 'de-compagnie-veendam-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 74.6, slope: 135, rating9: null, slope9: null, lengths: [336, 283, 130, 314, 426, 316, 138, 301, 400, 321, 392, 330, 134, 288, 300, 157, 330, 421] },
      { id: 'de-compagnie-veendam-rood-d', name: 'Rood (dames)', gender: 'd', rating: 73.4, slope: 135, rating9: null, slope9: null, lengths: [321, 270, 120, 308, 376, 305, 133, 289, 387, 312, 383, 283, 115, 279, 290, 137, 325, 412] },
      { id: 'de-compagnie-veendam-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 69.1, slope: 112, rating9: null, slope9: null, lengths: [250, 222, 74, 256, 338, 252, 88, 234, 355, 283, 354, 246, 71, 228, 252, 65, 277, 397] },
    ],
  },
  {
    id: 'de-compagnie-veendam-par-3-baan', province: 'Groningen', town: 'Veendam', dataVersion: 1, name: 'Golfclub Landgoed De Compagnie Par 3-baan (Veendam)', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [5, 9, 3, 13, 11, 1, 7, 17, 15, 6, 10, 4, 14, 12, 2, 8, 18, 16], confirmed: true, countsForIndex: false, location: { lat: 53.11569, lon: 6.84393 }, website: 'https://www.gcdecompagnie.nl/',
    tees: [
      { id: 'de-compagnie-veendam-par-3-baan-rood-d', name: 'Rood (dames)', gender: 'd', rating: 48.3, slope: 65, rating9: null, slope9: null, lengths: [116, 113, 80, 84, 99, 100, 67, 41, 70, 116, 113, 80, 84, 99, 100, 67, 41, 70] },
      { id: 'de-compagnie-veendam-par-3-baan-geel-h', name: 'Geel (heren)', gender: 'h', rating: 47.4, slope: 64, rating9: null, slope9: null, lengths: [116, 113, 80, 84, 99, 100, 67, 41, 70, 116, 113, 80, 84, 99, 100, 67, 41, 70] },
    ],
  },
  {
    id: 'glc-ahaus-alstaette-ost-nord', province: 'Duitsland', town: 'Ahaus-Alstätte', dataVersion: 1, name: 'Golf- und Landclub Ahaus Ost/Nord (Ahaus-Alstätte)', holeCount: 18, parTotal: 72, pars: [4, 5, 4, 3, 4, 4, 4, 3, 5, 4, 5, 4, 4, 4, 3, 4, 3, 5], si: [15, 5, 11, 17, 1, 9, 7, 13, 3, 4, 8, 16, 14, 12, 18, 10, 6, 2], confirmed: true, location: { lat: 52.1115, lon: 6.9257 }, website: 'https://www.glc-ahaus.de/',
    tees: [
      { id: 'glc-ahaus-alstaette-ost-nord-geel-h', name: 'Geel (heren)', gender: 'h', rating: 70.6, slope: 128, rating9: null, slope9: null, lengths: [294, 438, 306, 126, 365, 354, 358, 125, 483, 324, 452, 244, 275, 278, 85, 292, 200, 511] },
      { id: 'glc-ahaus-alstaette-ost-nord-rood-h', name: 'Rood (heren)', gender: 'h', rating: 67.7, slope: 115, rating9: null, slope9: null, lengths: [275, 424, 260, 115, 325, 318, 313, 110, 420, 290, 428, 229, 240, 250, 70, 255, 185, 440] },
      { id: 'glc-ahaus-alstaette-ost-nord-rood-d', name: 'Rood (dames)', gender: 'd', rating: 72.7, slope: 131, rating9: null, slope9: null, lengths: [275, 424, 260, 115, 325, 318, 313, 110, 420, 290, 428, 229, 240, 250, 70, 255, 185, 440] },
    ],
  },
  {
    id: 'glc-ahaus-alstaette-ost-west', province: 'Duitsland', town: 'Ahaus-Alstätte', dataVersion: 1, name: 'Golf- und Landclub Ahaus Ost/West (Ahaus-Alstätte)', holeCount: 18, parTotal: 71, pars: [4, 5, 4, 3, 4, 4, 4, 3, 5, 4, 3, 4, 4, 5, 3, 4, 4, 4], si: [15, 5, 11, 17, 1, 9, 7, 13, 3, 10, 18, 2, 6, 8, 16, 4, 12, 14], confirmed: true, location: { lat: 52.1115, lon: 6.9257 }, website: 'https://www.glc-ahaus.de/',
    tees: [
      { id: 'glc-ahaus-alstaette-ost-west-geel-h', name: 'Geel (heren)', gender: 'h', rating: 69.6, slope: 128, rating9: null, slope9: null, lengths: [294, 438, 306, 126, 365, 354, 358, 125, 483, 287, 125, 378, 285, 472, 127, 323, 336, 298] },
      { id: 'glc-ahaus-alstaette-ost-west-rood-d', name: 'Rood (dames)', gender: 'd', rating: 71.6, slope: 133, rating9: null, slope9: null, lengths: [275, 424, 260, 115, 325, 318, 313, 110, 420, 258, 116, 337, 264, 405, 112, 296, 297, 265] },
    ],
  },
  {
    id: 'glc-ahaus-alstaette-sud-ost', province: 'Duitsland', town: 'Ahaus-Alstätte', dataVersion: 1, name: 'Golf- und Landclub Ahaus Süd/Ost (Ahaus-Alstätte)', holeCount: 18, parTotal: 72, pars: [4, 3, 5, 4, 5, 4, 3, 4, 4, 4, 5, 4, 3, 4, 4, 4, 3, 5], si: [9, 17, 5, 1, 11, 3, 15, 7, 13, 14, 4, 12, 18, 6, 8, 10, 16, 2], confirmed: true, location: { lat: 52.1115, lon: 6.9257 }, website: 'https://www.glc-ahaus.de/',
    tees: [
      { id: 'glc-ahaus-alstaette-sud-ost-geel-h', name: 'Geel (heren)', gender: 'h', rating: 71.1, slope: 127, rating9: null, slope9: null, lengths: [340, 153, 400, 314, 448, 363, 166, 322, 337, 294, 438, 306, 126, 365, 354, 358, 125, 483] },
      { id: 'glc-ahaus-alstaette-sud-ost-rood-h', name: 'Rood (heren)', gender: 'h', rating: 67.7, slope: 115, rating9: null, slope9: null, lengths: [299, 93, 360, 284, 395, 325, 152, 280, 289, 275, 424, 260, 115, 325, 318, 313, 110, 420] },
      { id: 'glc-ahaus-alstaette-sud-ost-rood-d', name: 'Rood (dames)', gender: 'd', rating: 72.7, slope: 130, rating9: null, slope9: null, lengths: [299, 93, 360, 284, 395, 325, 152, 280, 289, 275, 424, 260, 115, 325, 318, 313, 110, 420] },
    ],
  },
  {
    id: 'glc-ahaus-alstaette-sud-nord', province: 'Duitsland', town: 'Ahaus-Alstätte', dataVersion: 1, name: 'Golf- und Landclub Ahaus Süd/Nord (Ahaus-Alstätte)', holeCount: 18, parTotal: 72, pars: [4, 3, 5, 4, 5, 4, 3, 4, 4, 4, 5, 4, 4, 4, 3, 4, 3, 5], si: [9, 15, 7, 5, 3, 1, 17, 13, 11, 4, 8, 16, 14, 12, 18, 10, 6, 2], confirmed: true, location: { lat: 52.1115, lon: 6.9257 }, website: 'https://www.glc-ahaus.de/',
    tees: [
      { id: 'glc-ahaus-alstaette-sud-nord-geel-h', name: 'Geel (heren)', gender: 'h', rating: 70.5, slope: 128, rating9: null, slope9: null, lengths: [340, 153, 400, 314, 448, 363, 166, 322, 337, 324, 452, 244, 275, 278, 85, 292, 200, 511] },
      { id: 'glc-ahaus-alstaette-sud-nord-rood-h', name: 'Rood (heren)', gender: 'h', rating: 67.2, slope: 114, rating9: null, slope9: null, lengths: [299, 93, 360, 284, 395, 325, 152, 280, 289, 290, 428, 229, 240, 250, 70, 255, 185, 440] },
      { id: 'glc-ahaus-alstaette-sud-nord-rood-d', name: 'Rood (dames)', gender: 'd', rating: 72.2, slope: 131, rating9: null, slope9: null, lengths: [299, 93, 360, 284, 395, 325, 152, 280, 289, 290, 428, 229, 240, 250, 70, 255, 185, 440] },
    ],
  },
  {
    id: 'glc-ahaus-alstaette-west-nord', province: 'Duitsland', town: 'Ahaus-Alstätte', dataVersion: 1, name: 'Golf- und Landclub Ahaus West/Nord (Ahaus-Alstätte)', holeCount: 18, parTotal: 71, pars: [4, 3, 4, 4, 5, 3, 4, 4, 4, 4, 5, 4, 4, 4, 3, 4, 3, 5], si: [9, 17, 1, 5, 7, 15, 3, 11, 13, 4, 8, 16, 14, 12, 18, 10, 6, 2], confirmed: true, location: { lat: 52.1115, lon: 6.9257 }, website: 'https://www.glc-ahaus.de/',
    tees: [
      { id: 'glc-ahaus-alstaette-west-nord-geel-h', name: 'Geel (heren)', gender: 'h', rating: 69, slope: 129, rating9: null, slope9: null, lengths: [287, 125, 378, 285, 472, 127, 323, 336, 298, 324, 452, 244, 275, 278, 85, 292, 200, 511] },
      { id: 'glc-ahaus-alstaette-west-nord-rood-d', name: 'Rood (dames)', gender: 'd', rating: 71.1, slope: 133, rating9: null, slope9: null, lengths: [258, 116, 337, 264, 405, 112, 296, 297, 265, 290, 428, 229, 240, 250, 70, 255, 185, 440] },
    ],
  },
  {
    id: 'glc-ahaus-alstaette-west-sud', province: 'Duitsland', town: 'Ahaus-Alstätte', dataVersion: 1, name: 'Golf- und Landclub Ahaus West/Süd (Ahaus-Alstätte)', holeCount: 18, parTotal: 71, pars: [4, 3, 4, 4, 5, 3, 4, 4, 4, 4, 3, 5, 4, 5, 4, 3, 4, 4], si: [9, 17, 1, 5, 7, 15, 3, 11, 13, 10, 16, 8, 6, 4, 2, 18, 14, 12], confirmed: true, location: { lat: 52.1115, lon: 6.9257 }, website: 'https://www.glc-ahaus.de/',
    tees: [
      { id: 'glc-ahaus-alstaette-west-sud-geel-h', name: 'Geel (heren)', gender: 'h', rating: 69.5, slope: 129, rating9: null, slope9: null, lengths: [287, 125, 378, 285, 472, 127, 323, 336, 298, 340, 153, 400, 314, 448, 363, 166, 322, 337] },
      { id: 'glc-ahaus-alstaette-west-sud-rood-d', name: 'Rood (dames)', gender: 'd', rating: 71.1, slope: 132, rating9: null, slope9: null, lengths: [258, 116, 337, 264, 405, 112, 296, 297, 265, 299, 93, 360, 284, 395, 325, 152, 280, 289] },
    ],
  },
  {
    id: 'golf4all-harderwijk', province: 'Flevoland', town: 'Zeewolde', dataVersion: 1, name: 'Harderwold Golf & Events (Zeewolde)', holeCount: 18, parTotal: 62, pars: [4, 4, 4, 4, 3, 3, 3, 3, 3, 4, 4, 4, 4, 3, 3, 3, 3, 3], si: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], confirmed: true, siUnknown: true, location: { lat: 52.3782, lon: 5.60339 }, website: 'https://harderwold.nl/golf/golfbaan/',
    tees: [
      { id: 'golf4all-harderwijk-geel-h', name: 'Geel (heren)', gender: 'h', rating: 57, slope: 88, rating9: null, slope9: null, lengths: [235, 230, 205, 230, 140, 144, 98, 102, 55, 210, 220, 245, 200, 165, 123, 103, 95, 77] },
      { id: 'golf4all-harderwijk-geel-d', name: 'Geel (dames)', gender: 'd', rating: 60.1, slope: 95, rating9: null, slope9: null, lengths: [235, 230, 205, 230, 140, 144, 98, 102, 55, 210, 220, 245, 200, 165, 123, 103, 95, 77] },
    ],
  },
  {
    id: 'golf4all-harderwijk-par-3-baan', province: 'Flevoland', town: 'Zeewolde', dataVersion: 1, name: 'Harderwold Golf & Events Par 3-baan (Zeewolde)', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], confirmed: true, siUnknown: true, countsForIndex: false, location: { lat: 52.3782, lon: 5.60339 }, website: 'https://harderwold.nl/golf/golfbaan/',
    tees: [
      { id: 'golf4all-harderwijk-par-3-baan-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 47, slope: 57, rating9: null, slope9: null },
      { id: 'golf4all-harderwijk-par-3-baan-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 48.1, slope: 61, rating9: null, slope9: null },
    ],
  },
  {
    id: 'de-blanckenborg-groenlo', province: 'Gelderland', town: 'Groenlo', dataVersion: 1, name: 'Pitch & Putt Golf Groenlo', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [17, 10, 11, 2, 14, 13, 8, 9, 6, 15, 3, 16, 1, 4, 12, 18, 7, 5], confirmed: false, fromSources: true, countsForIndex: false, location: { lat: 52.03313, lon: 6.63813 }, website: 'https://www.pitch-putt.nl/locaties/groenlo/',
    tees: [
      { id: 'de-blanckenborg-groenlo-wit-h', name: 'Wit (heren)', gender: 'h', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [51, 61, 68, 63, 50, 65, 72, 60, 60, 52, 73, 54, 66, 75, 48, 61, 60, 67] },
      { id: 'de-blanckenborg-groenlo-wit-d', name: 'Wit (dames)', gender: 'd', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [51, 61, 68, 63, 50, 65, 72, 60, 60, 52, 73, 54, 66, 75, 48, 61, 60, 67] },
    ],
  },
  {
    id: 'westerwolde-vlagtwedde', province: 'Groningen', town: 'Vlagtwedde', dataVersion: 1, name: 'Golfclub Westerwolde (Vlagtwedde)', holeCount: 18, parTotal: 70, pars: [4, 4, 4, 3, 5, 4, 5, 3, 3, 4, 4, 4, 3, 5, 4, 5, 3, 3], si: [5, 3, 13, 17, 11, 1, 7, 15, 9, 6, 4, 14, 18, 12, 2, 8, 16, 10], confirmed: true, location: { lat: 53.03695, lon: 7.10743 }, website: 'https://www.gcwesterwolde.nl/',
    tees: [
      { id: 'westerwolde-vlagtwedde-geel-h', name: 'Geel (heren)', gender: 'h', rating: 67.8, slope: 124, rating9: null, slope9: null, lengths: [306, 397, 236, 84, 409, 355, 423, 101, 157, 306, 397, 236, 84, 409, 355, 423, 101, 157] },
      { id: 'westerwolde-vlagtwedde-rood-h', name: 'Rood (heren)', gender: 'h', rating: 66.4, slope: 118, rating9: null, slope9: null, lengths: [300, 386, 225, 84, 398, 321, 390, 87, 157, 300, 386, 225, 84, 398, 321, 390, 87, 157] },
      { id: 'westerwolde-vlagtwedde-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 62.5, slope: 105, rating9: null, slope9: null, lengths: [254, 326, 180, 84, 349, 263, 305, 55, 107, 254, 326, 180, 84, 349, 263, 305, 55, 107] },
    ],
  },
  {
    id: 'golfclub-gaasterland', province: 'Friesland', town: 'Oudemirdum', dataVersion: 1, name: 'Golfclub Gaasterland (Oudemirdum)', holeCount: 9, parTotal: 35, pars: [4, 3, 4, 3, 4, 5, 4, 4, 4], si: [6, 8, 2, 9, 1, 4, 3, 7, 5], confirmed: true, location: { lat: 52.86211, lon: 5.54447 }, website: 'https://golfclubgaasterland.nl/',
    tees: [
      { id: 'golfclub-gaasterland-geel-h', name: 'Geel (heren)', gender: 'h', rating: 35.5, slope: 130, rating9: null, slope9: null, lengths: [353, 136, 358, 139, 335, 458, 345, 338, 351] },
      { id: 'golfclub-gaasterland-rood-h', name: 'Rood (heren)', gender: 'h', rating: 33.5, slope: 117, rating9: null, slope9: null, lengths: [291, 114, 301, 124, 317, 385, 298, 291, 297] },
      { id: 'golfclub-gaasterland-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 31.5, slope: 117, rating9: null, slope9: null, lengths: [248, 97, 256, 102, 276, 327, 253, 247, 252] },
      { id: 'golfclub-gaasterland-geel-d', name: 'Geel (dames)', gender: 'd', rating: 38.3, slope: 145, rating9: null, slope9: null, lengths: [353, 136, 358, 139, 335, 458, 345, 338, 351] },
      { id: 'golfclub-gaasterland-rood-d', name: 'Rood (dames)', gender: 'd', rating: 35.7, slope: 127, rating9: null, slope9: null, lengths: [291, 114, 301, 124, 317, 385, 298, 291, 297] },
      { id: 'golfclub-gaasterland-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 33.3, slope: 117, rating9: null, slope9: null, lengths: [248, 97, 256, 102, 276, 327, 253, 247, 252] },
    ],
  },
  {
    id: 'golfclub-gaasterland-paarse-par-3', province: 'Friesland', town: 'Oudemirdum', dataVersion: 1, name: 'Golfclub Gaasterland Paarse par 3 (Oudemirdum)', holeCount: 9, parTotal: 27, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3], si: [1, 2, 3, 4, 5, 6, 7, 8, 9], confirmed: true, siUnknown: true, countsForIndex: false, location: { lat: 52.86211, lon: 5.54447 }, website: 'https://golfclubgaasterland.nl/',
    tees: [
      { id: 'golfclub-gaasterland-paarse-par-3-paars-h', name: 'Paars (heren)', gender: 'h', rating: 26.3, slope: 84, rating9: null, slope9: null },
      { id: 'golfclub-gaasterland-paarse-par-3-paars-d', name: 'Paars (dames)', gender: 'd', rating: 27.5, slope: 86, rating9: null, slope9: null },
    ],
  },
  {
    id: 'golfclub-flevoland-groen', province: 'Flevoland', town: 'Lelystad', dataVersion: 1, name: 'Golfclub Flevoland Groen (Lelystad)', holeCount: 18, parTotal: 72, pars: [4, 5, 3, 3, 4, 4, 5, 4, 4, 4, 5, 3, 3, 4, 4, 5, 4, 4], si: [15, 5, 7, 11, 13, 17, 9, 1, 3, 16, 6, 8, 12, 14, 18, 10, 2, 4], confirmed: true, location: { lat: 52.5437, lon: 5.45532 }, website: 'https://www.gcflevoland.nl/',
    tees: [
      { id: 'golfclub-flevoland-groen-geel-h', name: 'Geel (heren)', gender: 'h', rating: 73.3, slope: 137, rating9: null, slope9: null, lengths: [281, 488, 204, 171, 261, 290, 508, 383, 392, 281, 488, 204, 171, 261, 290, 508, 383, 392] },
      { id: 'golfclub-flevoland-groen-rood-h', name: 'Rood (heren)', gender: 'h', rating: 69, slope: 116, rating9: null, slope9: null, lengths: [261, 389, 170, 137, 242, 275, 402, 318, 329, 261, 389, 170, 137, 242, 275, 402, 318, 329] },
      { id: 'golfclub-flevoland-groen-geel-d', name: 'Geel (dames)', gender: 'd', rating: 79.2, slope: 148, rating9: null, slope9: null, lengths: [281, 488, 204, 171, 261, 290, 508, 383, 392, 281, 488, 204, 171, 261, 290, 508, 383, 392] },
      { id: 'golfclub-flevoland-groen-rood-d', name: 'Rood (dames)', gender: 'd', rating: 73.9, slope: 131, rating9: null, slope9: null, lengths: [261, 389, 170, 137, 242, 275, 402, 318, 329, 261, 389, 170, 137, 242, 275, 402, 318, 329] },
    ],
  },
  {
    id: 'keppelse-golfclub-hoog-keppel', province: 'Gelderland', town: 'Hoog-Keppel', dataVersion: 1, name: 'Keppelse Golfclub (Hoog-Keppel)', holeCount: 18, parTotal: 70, pars: [5, 4, 3, 4, 3, 4, 4, 4, 5, 4, 4, 3, 4, 3, 5, 4, 3, 4], si: [3, 7, 17, 1, 11, 15, 9, 13, 5, 8, 16, 10, 14, 12, 4, 2, 18, 6], confirmed: true, location: { lat: 52.00663, lon: 6.20076 }, website: 'https://www.keppelse.nl',
    tees: [
      { id: 'keppelse-golfclub-hoog-keppel-wit-h', name: 'Wit (heren)', gender: 'h', rating: 69.9, slope: 126, rating9: null, slope9: null, lengths: [520, 335, 173, 441, 162, 296, 345, 294, 477, 354, 280, 124, 308, 185, 460, 417, 127, 333] },
      { id: 'keppelse-golfclub-hoog-keppel-geel-h', name: 'Geel (heren)', gender: 'h', rating: 68.1, slope: 123, rating9: null, slope9: null, lengths: [487, 330, 173, 408, 124, 288, 345, 294, 452, 327, 280, 124, 291, 138, 426, 417, 123, 325] },
      { id: 'keppelse-golfclub-hoog-keppel-geel-d', name: 'Geel (dames)', gender: 'd', rating: 73.7, slope: 129, rating9: null, slope9: null, lengths: [487, 330, 173, 408, 124, 288, 345, 294, 452, 327, 280, 124, 291, 138, 426, 417, 123, 325] },
      { id: 'keppelse-golfclub-hoog-keppel-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 67, slope: 117, rating9: null, slope9: null, lengths: [487, 330, 153, 372, 124, 281, 311, 257, 452, 327, 270, 116, 283, 131, 422, 365, 118, 316] },
      { id: 'keppelse-golfclub-hoog-keppel-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 72.4, slope: 128, rating9: null, slope9: null, lengths: [487, 330, 153, 372, 124, 281, 311, 257, 452, 327, 270, 116, 283, 131, 422, 365, 118, 316] },
      { id: 'keppelse-golfclub-hoog-keppel-rood-h', name: 'Rood (heren)', gender: 'h', rating: 65.9, slope: 105, rating9: null, slope9: null, lengths: [417, 281, 145, 335, 97, 249, 311, 257, 406, 301, 270, 116, 255, 125, 392, 365, 113, 285] },
      { id: 'keppelse-golfclub-hoog-keppel-rood-d', name: 'Rood (dames)', gender: 'd', rating: 69.9, slope: 123, rating9: null, slope9: null, lengths: [417, 281, 145, 335, 97, 249, 311, 257, 406, 301, 270, 116, 255, 125, 392, 365, 113, 285] },
      { id: 'keppelse-golfclub-hoog-keppel-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 63.7, slope: 100, rating9: null, slope9: null, lengths: [351, 248, 126, 335, 65, 210, 271, 215, 406, 262, 240, 116, 249, 121, 385, 315, 108, 265] },
      { id: 'keppelse-golfclub-hoog-keppel-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 67.2, slope: 114, rating9: null, slope9: null, lengths: [351, 248, 126, 335, 65, 210, 271, 215, 406, 262, 240, 116, 249, 121, 385, 315, 108, 265] },
    ],
  },
  {
    id: 'keppelse-golfclub-hoog-keppel-par-3-4-baan', province: 'Gelderland', town: 'Hoog-Keppel', dataVersion: 1, name: 'Keppelse Golfclub Par 3/4-baan (Hoog-Keppel)', holeCount: 18, parTotal: 56, pars: [4, 3, 3, 3, 3, 3, 3, 3, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [1, 5, 13, 7, 15, 9, 11, 17, 3, 4, 18, 8, 10, 16, 6, 2, 14, 12], confirmed: true, countsForIndex: false, location: { lat: 52.00663, lon: 6.20076 }, website: 'https://www.keppelse.nl',
    tees: [
      { id: 'keppelse-golfclub-hoog-keppel-par-3-4-baan-geel-h', name: 'Geel (heren)', gender: 'h', rating: 51, slope: 72, rating9: null, slope9: null, lengths: [237, 126, 126, 105, 65, 100, 106, 85, 223, 117, 88, 116, 99, 121, 116, 150, 108, 98] },
      { id: 'keppelse-golfclub-hoog-keppel-par-3-4-baan-geel-d', name: 'Geel (dames)', gender: 'd', rating: 53.1, slope: 79, rating9: null, slope9: null, lengths: [237, 126, 126, 105, 65, 100, 106, 85, 223, 117, 88, 116, 99, 121, 116, 150, 108, 98] },
    ],
  },
  {
    id: 'pitch-putt-strand-horst-ermelo', province: 'Gelderland', town: 'Ermelo', dataVersion: 1, name: 'Pitch & Putt Golf Strand Horst (Ermelo)', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [8, 18, 2, 12, 14, 4, 16, 10, 6, 7, 17, 1, 11, 13, 3, 15, 9, 5], confirmed: false, fromSources: true, countsForIndex: false, location: { lat: 52.30221, lon: 5.55438 }, website: null,
    tees: [
      { id: 'pitch-putt-strand-horst-ermelo-wit-h', name: 'Wit (heren)', gender: 'h', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true },
      { id: 'pitch-putt-strand-horst-ermelo-wit-d', name: 'Wit (dames)', gender: 'd', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true },
    ],
  },
  {
    id: 'golfclub-zeewolde-aak-botter', province: 'Flevoland', town: 'Zeewolde', dataVersion: 1, name: 'Golfclub Zeewolde Aak/Botter', holeCount: 18, parTotal: 72, pars: [4, 3, 4, 4, 5, 4, 4, 3, 5, 4, 3, 4, 4, 3, 4, 5, 5, 4], si: [17, 7, 1, 3, 15, 11, 5, 9, 13, 14, 16, 2, 4, 12, 10, 18, 6, 8], confirmed: true, location: { lat: 52.32401, lon: 5.50704 }, website: 'https://www.golfclub-zeewolde.nl/',
    tees: [
      { id: 'golfclub-zeewolde-aak-botter-wit-h', name: 'Wit (heren)', gender: 'h', rating: 74.4, slope: 145, rating9: null, slope9: null, lengths: [324, 173, 406, 389, 472, 340, 389, 142, 481, 354, 136, 364, 429, 185, 361, 455, 520, 383] },
      { id: 'golfclub-zeewolde-aak-botter-geel-h', name: 'Geel (heren)', gender: 'h', rating: 72.7, slope: 133, rating9: null, slope9: null, lengths: [309, 165, 363, 346, 463, 333, 384, 134, 469, 344, 136, 318, 413, 176, 324, 446, 475, 378] },
      { id: 'golfclub-zeewolde-aak-botter-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 69.8, slope: 118, rating9: null, slope9: null, lengths: [280, 151, 340, 319, 398, 285, 317, 124, 395, 310, 119, 293, 325, 158, 297, 389, 415, 314] },
      { id: 'golfclub-zeewolde-aak-botter-rood-h', name: 'Rood (heren)', gender: 'h', rating: 69.2, slope: 114, rating9: null, slope9: null, lengths: [275, 146, 324, 292, 389, 280, 308, 117, 390, 310, 119, 277, 314, 153, 269, 383, 406, 308] },
      { id: 'golfclub-zeewolde-aak-botter-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 65.3, slope: 115, rating9: null, slope9: null, lengths: [243, 99, 277, 259, 331, 227, 258, 117, 336, 277, 91, 235, 260, 124, 252, 328, 346, 249] },
      { id: 'golfclub-zeewolde-aak-botter-geel-d', name: 'Geel (dames)', gender: 'd', rating: 79, slope: 142, rating9: null, slope9: null, lengths: [309, 165, 363, 346, 463, 333, 384, 134, 469, 344, 136, 318, 413, 176, 324, 446, 475, 378] },
      { id: 'golfclub-zeewolde-aak-botter-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 74.8, slope: 134, rating9: null, slope9: null, lengths: [280, 151, 340, 319, 398, 285, 317, 124, 395, 310, 119, 293, 325, 158, 297, 389, 415, 314] },
      { id: 'golfclub-zeewolde-aak-botter-rood-d', name: 'Rood (dames)', gender: 'd', rating: 73.9, slope: 133, rating9: null, slope9: null, lengths: [275, 146, 324, 292, 389, 280, 308, 117, 390, 310, 119, 277, 314, 153, 269, 383, 406, 308] },
      { id: 'golfclub-zeewolde-aak-botter-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 70.4, slope: 114, rating9: null, slope9: null, lengths: [243, 99, 277, 259, 331, 227, 258, 117, 336, 277, 91, 235, 260, 124, 252, 328, 346, 249] },
    ],
  },
  {
    id: 'golfclub-zeewolde-botter-pluut', province: 'Flevoland', town: 'Zeewolde', dataVersion: 1, name: 'Golfclub Zeewolde Botter/Pluut', holeCount: 18, parTotal: 72, pars: [4, 3, 4, 4, 3, 4, 5, 5, 4, 4, 5, 3, 4, 3, 4, 4, 5, 4], si: [13, 15, 1, 3, 11, 9, 17, 5, 7, 10, 12, 6, 4, 18, 2, 16, 14, 8], confirmed: true, location: { lat: 52.32401, lon: 5.50704 }, website: 'https://www.golfclub-zeewolde.nl/',
    tees: [
      { id: 'golfclub-zeewolde-botter-pluut-wit-h', name: 'Wit (heren)', gender: 'h', rating: 74.6, slope: 143, rating9: null, slope9: null, lengths: [354, 136, 364, 429, 185, 361, 455, 520, 383, 290, 495, 217, 375, 127, 397, 314, 486, 366] },
      { id: 'golfclub-zeewolde-botter-pluut-geel-h', name: 'Geel (heren)', gender: 'h', rating: 72.5, slope: 135, rating9: null, slope9: null, lengths: [344, 136, 318, 413, 176, 324, 446, 475, 378, 284, 472, 178, 339, 119, 377, 279, 455, 333] },
      { id: 'golfclub-zeewolde-botter-pluut-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 69.2, slope: 122, rating9: null, slope9: null, lengths: [310, 119, 293, 325, 158, 297, 389, 415, 314, 245, 401, 178, 300, 119, 324, 279, 396, 307] },
      { id: 'golfclub-zeewolde-botter-pluut-rood-h', name: 'Rood (heren)', gender: 'h', rating: 68.3, slope: 118, rating9: null, slope9: null, lengths: [310, 119, 277, 314, 153, 269, 383, 406, 308, 241, 391, 148, 284, 94, 317, 259, 396, 287] },
      { id: 'golfclub-zeewolde-botter-pluut-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 64.9, slope: 118, rating9: null, slope9: null, lengths: [277, 91, 235, 260, 124, 252, 328, 346, 249, 202, 354, 120, 279, 94, 262, 232, 335, 249] },
      { id: 'golfclub-zeewolde-botter-pluut-geel-d', name: 'Geel (dames)', gender: 'd', rating: 77.8, slope: 144, rating9: null, slope9: null, lengths: [344, 136, 318, 413, 176, 324, 446, 475, 378, 284, 472, 178, 339, 119, 377, 279, 455, 333] },
      { id: 'golfclub-zeewolde-botter-pluut-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 74.5, slope: 134, rating9: null, slope9: null, lengths: [310, 119, 293, 325, 158, 297, 389, 415, 314, 245, 401, 178, 300, 119, 324, 279, 396, 307] },
      { id: 'golfclub-zeewolde-botter-pluut-rood-d', name: 'Rood (dames)', gender: 'd', rating: 73.2, slope: 133, rating9: null, slope9: null, lengths: [310, 119, 277, 314, 153, 269, 383, 406, 308, 241, 391, 148, 284, 94, 317, 259, 396, 287] },
      { id: 'golfclub-zeewolde-botter-pluut-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 69.8, slope: 116, rating9: null, slope9: null, lengths: [277, 91, 235, 260, 124, 252, 328, 346, 249, 202, 354, 120, 279, 94, 262, 232, 335, 249] },
    ],
  },
  {
    id: 'golfclub-zeewolde-pluut-aak', province: 'Flevoland', town: 'Zeewolde', dataVersion: 1, name: 'Golfclub Zeewolde Pluut/Aak', holeCount: 18, parTotal: 72, pars: [4, 5, 3, 4, 3, 4, 4, 5, 4, 4, 3, 4, 4, 5, 4, 4, 3, 5], si: [9, 11, 5, 3, 17, 1, 15, 13, 7, 18, 8, 2, 4, 16, 12, 6, 10, 14], confirmed: true, location: { lat: 52.32401, lon: 5.50704 }, website: 'https://www.golfclub-zeewolde.nl/',
    tees: [
      { id: 'golfclub-zeewolde-pluut-aak-wit-h', name: 'Wit (heren)', gender: 'h', rating: 73.8, slope: 140, rating9: null, slope9: null, lengths: [290, 495, 217, 375, 127, 397, 314, 486, 366, 324, 173, 406, 389, 472, 340, 389, 142, 481] },
      { id: 'golfclub-zeewolde-pluut-aak-geel-h', name: 'Geel (heren)', gender: 'h', rating: 72.1, slope: 131, rating9: null, slope9: null, lengths: [284, 472, 178, 339, 119, 377, 279, 455, 333, 309, 165, 363, 346, 463, 333, 384, 134, 469] },
      { id: 'golfclub-zeewolde-pluut-aak-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 69.3, slope: 118, rating9: null, slope9: null, lengths: [245, 401, 178, 300, 119, 324, 279, 396, 307, 280, 151, 340, 319, 398, 285, 317, 124, 395] },
      { id: 'golfclub-zeewolde-pluut-aak-rood-h', name: 'Rood (heren)', gender: 'h', rating: 68.3, slope: 113, rating9: null, slope9: null, lengths: [241, 391, 148, 284, 94, 317, 259, 396, 287, 275, 146, 324, 292, 389, 280, 308, 117, 390] },
      { id: 'golfclub-zeewolde-pluut-aak-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 64.7, slope: 114, rating9: null, slope9: null, lengths: [202, 354, 120, 279, 94, 262, 232, 335, 249, 243, 99, 277, 259, 331, 227, 258, 117, 336] },
      { id: 'golfclub-zeewolde-pluut-aak-geel-d', name: 'Geel (dames)', gender: 'd', rating: 78.3, slope: 141, rating9: null, slope9: null, lengths: [284, 472, 178, 339, 119, 377, 279, 455, 333, 309, 165, 363, 346, 463, 333, 384, 134, 469] },
      { id: 'golfclub-zeewolde-pluut-aak-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 74.3, slope: 133, rating9: null, slope9: null, lengths: [245, 401, 178, 300, 119, 324, 279, 396, 307, 280, 151, 340, 319, 398, 285, 317, 124, 395] },
      { id: 'golfclub-zeewolde-pluut-aak-rood-d', name: 'Rood (dames)', gender: 'd', rating: 73.2, slope: 130, rating9: null, slope9: null, lengths: [241, 391, 148, 284, 94, 317, 259, 396, 287, 275, 146, 324, 292, 389, 280, 308, 117, 390] },
      { id: 'golfclub-zeewolde-pluut-aak-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 69.5, slope: 114, rating9: null, slope9: null, lengths: [202, 354, 120, 279, 94, 262, 232, 335, 249, 243, 99, 277, 259, 331, 227, 258, 117, 336] },
    ],
  },
  {
    id: 'golfclub-zeewolde-jol', province: 'Flevoland', town: 'Zeewolde', dataVersion: 1, name: 'Golfclub Zeewolde Jol', holeCount: 18, parTotal: 58, pars: [3, 3, 3, 4, 3, 3, 3, 4, 3, 3, 3, 3, 4, 3, 3, 3, 4, 3], si: [17, 13, 11, 3, 9, 7, 5, 1, 15, 18, 14, 12, 4, 10, 8, 6, 2, 16], confirmed: true, countsForIndex: false, location: { lat: 52.32401, lon: 5.50704 }, website: 'https://www.golfclub-zeewolde.nl/',
    tees: [
      { id: 'golfclub-zeewolde-jol-geel-h', name: 'Geel (heren)', gender: 'h', rating: 54.5, slope: 90, rating9: null, slope9: null, lengths: [113, 93, 101, 292, 111, 129, 145, 292, 86, 72, 93, 113, 244, 116, 147, 166, 246, 92] },
      { id: 'golfclub-zeewolde-jol-rood-d', name: 'Rood (dames)', gender: 'd', rating: 57.2, slope: 97, rating9: null, slope9: null, lengths: [113, 93, 101, 292, 111, 129, 145, 292, 86, 72, 93, 113, 244, 116, 147, 166, 246, 92] },
    ],
  },
  {
    id: 'de-voortwisch-winterswijk', province: 'Gelderland', town: 'Winterswijk', dataVersion: 1, name: 'Golfbaan De Voortwisch (Winterswijk)', holeCount: 18, parTotal: 71, pars: [4, 3, 4, 5, 3, 4, 5, 4, 3, 5, 3, 4, 4, 4, 3, 4, 5, 4], si: [11, 13, 7, 1, 15, 3, 9, 5, 17, 10, 6, 2, 16, 4, 8, 18, 14, 12], confirmed: true, location: { lat: 51.98534, lon: 6.7685 }, website: 'https://www.golfclubwinterswijk.nl',
    tees: [
      { id: 'de-voortwisch-winterswijk-wit-h', name: 'Wit (heren)', gender: 'h', rating: 71.6, slope: 128, rating9: null, slope9: null, lengths: [297, 150, 376, 504, 164, 365, 424, 391, 125, 486, 183, 391, 283, 366, 177, 274, 432, 330] },
      { id: 'de-voortwisch-winterswijk-geel-h', name: 'Geel (heren)', gender: 'h', rating: 70.1, slope: 128, rating9: null, slope9: null, lengths: [290, 140, 366, 494, 157, 358, 417, 376, 117, 444, 172, 380, 277, 357, 156, 271, 422, 323] },
      { id: 'de-voortwisch-winterswijk-geel-d', name: 'Geel (dames)', gender: 'd', rating: 76.3, slope: 136, rating9: null, slope9: null, lengths: [290, 140, 366, 494, 157, 358, 417, 376, 117, 444, 172, 380, 277, 357, 156, 271, 422, 323] },
      { id: 'de-voortwisch-winterswijk-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 67.7, slope: 112, rating9: null, slope9: null, lengths: [263, 130, 326, 428, 144, 314, 369, 324, 107, 406, 172, 326, 233, 313, 146, 263, 369, 285] },
      { id: 'de-voortwisch-winterswijk-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 72.4, slope: 130, rating9: null, slope9: null, lengths: [263, 130, 326, 428, 144, 314, 369, 324, 107, 406, 172, 326, 233, 313, 146, 263, 369, 285] },
      { id: 'de-voortwisch-winterswijk-rood-h', name: 'Rood (heren)', gender: 'h', rating: 66.9, slope: 109, rating9: null, slope9: null, lengths: [260, 130, 316, 415, 135, 305, 365, 318, 99, 399, 158, 310, 230, 303, 146, 253, 360, 275] },
      { id: 'de-voortwisch-winterswijk-rood-d', name: 'Rood (dames)', gender: 'd', rating: 72.1, slope: 121, rating9: null, slope9: null, lengths: [260, 130, 316, 415, 135, 305, 365, 318, 99, 399, 158, 310, 230, 303, 146, 253, 360, 275] },
      { id: 'de-voortwisch-winterswijk-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 63, slope: 110, rating9: null, slope9: null, lengths: [190, 63, 265, 376, 74, 238, 320, 261, 85, 337, 101, 279, 149, 278, 78, 194, 330, 206] },
      { id: 'de-voortwisch-winterswijk-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 66.6, slope: 106, rating9: null, slope9: null, lengths: [190, 63, 265, 376, 74, 238, 320, 261, 85, 337, 101, 279, 149, 278, 78, 194, 330, 206] },
    ],
  },
  {
    id: 'pitch-putt-groningen-kardinge', province: 'Groningen', town: 'Groningen', dataVersion: 1, name: 'Pitch & Putt Groningen', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [15, 5, 10, 13, 11, 6, 2, 9, 8, 12, 17, 14, 18, 4, 1, 3, 16, 7], confirmed: false, fromSources: true, countsForIndex: false, location: { lat: 53.24095, lon: 6.59652 }, website: 'https://pitch-putt.nl/locaties/groningen/',
    tees: [
      { id: 'pitch-putt-groningen-kardinge-standaard-h', name: 'Standaard (heren)', gender: 'h', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [41, 64, 52, 50, 47, 66, 70, 54, 45, 52, 50, 45, 50, 64, 65, 57, 30, 55] },
      { id: 'pitch-putt-groningen-kardinge-standaard-d', name: 'Standaard (dames)', gender: 'd', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [41, 64, 52, 50, 47, 66, 70, 54, 45, 52, 50, 45, 50, 64, 65, 57, 30, 55] },
    ],
  },
  {
    id: 'pitch-putt-doetinchem', province: 'Gelderland', town: 'Doetinchem', dataVersion: 1, name: 'Pitch & Putt Golf Doetinchem', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], confirmed: false, fromSources: true, siUnknown: true, countsForIndex: false, location: { lat: 51.96869, lon: 6.23673 }, website: 'https://pitch-putt-doetinchem.nl',
    tees: [
      { id: 'pitch-putt-doetinchem-standaard-h', name: 'Standaard (heren)', gender: 'h', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [50, 47, 54, 55, 42, 58, 35, 48, 56, 60, 50, 53, 60, 55, 69, 51, 54, 47] },
      { id: 'pitch-putt-doetinchem-standaard-d', name: 'Standaard (dames)', gender: 'd', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [50, 47, 54, 55, 42, 58, 35, 48, 56, 60, 50, 53, 60, 55, 69, 51, 54, 47] },
    ],
  },
  {
    id: 'rosendaelsche-golfclub-arnhem', province: 'Gelderland', town: 'Arnhem', dataVersion: 1, name: 'Rosendaelsche Golfclub (Arnhem)', holeCount: 18, parTotal: 72, pars: [4, 4, 4, 5, 4, 3, 4, 5, 3, 4, 4, 3, 4, 4, 5, 3, 5, 4], si: [11, 3, 7, 13, 1, 9, 17, 15, 5, 12, 8, 4, 16, 2, 14, 18, 10, 6], confirmed: true, location: { lat: 52.01903, lon: 5.9264 }, website: 'https://rosendaelsche.nl/',
    tees: [
      { id: 'rosendaelsche-golfclub-arnhem-wit-h', name: 'Wit (heren)', gender: 'h', rating: 74.6, slope: 133, rating9: null, slope9: null, lengths: [366, 389, 375, 504, 408, 198, 395, 519, 152, 377, 376, 168, 292, 432, 476, 127, 510, 387] },
      { id: 'rosendaelsche-golfclub-arnhem-geel-h', name: 'Geel (heren)', gender: 'h', rating: 72.7, slope: 129, rating9: null, slope9: null, lengths: [356, 381, 339, 463, 372, 178, 354, 486, 141, 350, 369, 161, 282, 403, 439, 127, 469, 364] },
      { id: 'rosendaelsche-golfclub-arnhem-geel-d', name: 'Geel (dames)', gender: 'd', rating: 78.6, slope: 137, rating9: null, slope9: null, lengths: [356, 381, 339, 463, 372, 178, 354, 486, 141, 350, 369, 161, 282, 403, 439, 127, 469, 364] },
      { id: 'rosendaelsche-golfclub-arnhem-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 69.9, slope: 124, rating9: null, slope9: null, lengths: [335, 334, 313, 402, 342, 174, 347, 437, 130, 331, 302, 152, 272, 337, 421, 110, 445, 331] },
      { id: 'rosendaelsche-golfclub-arnhem-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 75.2, slope: 130, rating9: null, slope9: null, lengths: [335, 334, 313, 402, 342, 174, 347, 437, 130, 331, 302, 152, 272, 337, 421, 110, 445, 331] },
      { id: 'rosendaelsche-golfclub-arnhem-rood-h', name: 'Rood (heren)', gender: 'h', rating: 67.9, slope: 114, rating9: null, slope9: null, lengths: [305, 302, 301, 394, 329, 147, 313, 410, 112, 292, 286, 146, 257, 327, 390, 110, 410, 289] },
      { id: 'rosendaelsche-golfclub-arnhem-rood-d', name: 'Rood (dames)', gender: 'd', rating: 72.9, slope: 126, rating9: null, slope9: null, lengths: [305, 302, 301, 394, 329, 147, 313, 410, 112, 292, 286, 146, 257, 327, 390, 110, 410, 289] },
      { id: 'rosendaelsche-golfclub-arnhem-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 65.6, slope: 105, rating9: null, slope9: null, lengths: [265, 244, 231, 388, 255, 143, 279, 369, 105, 285, 248, 133, 253, 288, 370, 110, 379, 279] },
      { id: 'rosendaelsche-golfclub-arnhem-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 70, slope: 118, rating9: null, slope9: null, lengths: [265, 244, 231, 388, 255, 143, 279, 369, 105, 285, 248, 133, 253, 288, 370, 110, 379, 279] },
    ],
  },
  {
    id: 'golfclub-putten', province: 'Gelderland', town: 'Putten', dataVersion: 1, name: 'Golfclub Putten', holeCount: 9, parTotal: 32, pars: [4, 3, 3, 4, 3, 4, 3, 4, 4], si: [1, 3, 7, 4, 9, 5, 8, 2, 6], confirmed: true, location: { lat: 52.23717, lon: 5.51314 }, website: 'https://www.golfclubputten.com/',
    tees: [
      { id: 'golfclub-putten-geel-h', name: 'Geel (heren)', gender: 'h', rating: 29.9, slope: 94, rating9: null, slope9: null, lengths: [278, 140, 123, 267, 91, 251, 119, 259, 272] },
      { id: 'golfclub-putten-geel-d', name: 'Geel (dames)', gender: 'd', rating: 31.3, slope: 114, rating9: null, slope9: null, lengths: [278, 140, 123, 267, 91, 251, 119, 259, 272] },
      { id: 'golfclub-putten-rood-h', name: 'Rood (heren)', gender: 'h', rating: 29, slope: 94, rating9: null, slope9: null, lengths: [264, 130, 95, 236, 91, 228, 119, 241, 252] },
      { id: 'golfclub-putten-rood-d', name: 'Rood (dames)', gender: 'd', rating: 30.7, slope: 105, rating9: null, slope9: null, lengths: [264, 130, 95, 236, 91, 228, 119, 241, 252] },
      { id: 'golfclub-putten-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 28.7, slope: 89, rating9: null, slope9: null, lengths: [223, 130, 95, 172, 91, 228, 119, 241, 252] },
      { id: 'golfclub-putten-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 30, slope: 104, rating9: null, slope9: null, lengths: [223, 130, 95, 172, 91, 228, 119, 241, 252] },
    ],
  },
  {
    id: 'pitch-putt-golf-koudum', province: 'Friesland', town: 'Koudum', dataVersion: 1, name: 'Pitch & Putt Golf Koudum', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], confirmed: false, fromSources: true, siUnknown: true, countsForIndex: false, location: { lat: 52.91984, lon: 5.46076 }, website: 'https://www.pitch-putt.nl/locaties/koudum/',
    tees: [
      { id: 'pitch-putt-golf-koudum-standaard-h', name: 'Standaard (heren)', gender: 'h', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true },
      { id: 'pitch-putt-golf-koudum-standaard-d', name: 'Standaard (dames)', gender: 'd', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true },
    ],
  },
  {
    id: 'het-buiten-land-pitch-putt-leeuwarden', province: 'Friesland', town: 'Leeuwarden', dataVersion: 1, name: 'Het Buiten-Land Pitch & Putt Golf Leeuwarden', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [18, 13, 10, 9, 8, 12, 4, 17, 6, 11, 16, 7, 1, 14, 3, 15, 2, 5], confirmed: false, fromSources: true, countsForIndex: false, location: { lat: 53.18369, lon: 5.85419 }, website: 'https://hetbuiten-land.nl/',
    tees: [
      { id: 'het-buiten-land-pitch-putt-leeuwarden-standaard-h', name: 'Standaard (heren)', gender: 'h', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [49, 46, 54, 50, 68, 48, 62, 46, 67, 52, 39, 53, 66, 55, 69, 42, 67, 60] },
      { id: 'het-buiten-land-pitch-putt-leeuwarden-standaard-d', name: 'Standaard (dames)', gender: 'd', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [49, 46, 54, 50, 68, 48, 62, 46, 67, 52, 39, 53, 66, 55, 69, 42, 67, 60] },
    ],
  },
  {
    id: 'huningas-heem-oostwold', province: 'Groningen', town: 'Oostwold', dataVersion: 1, name: 'Huninga\'s Heem Pitch & Putt (Oostwold)', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [12, 11, 17, 7, 1, 15, 2, 8, 6, 9, 5, 13, 3, 10, 14, 16, 18, 4], confirmed: false, fromSources: true, countsForIndex: false, location: { lat: 53.20162, lon: 7.03288 }, website: 'https://sites.google.com/view/huningas-heem/homepage',
    tees: [
      { id: 'huningas-heem-oostwold-standaard-h', name: 'Standaard (heren)', gender: 'h', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [27, 47, 49, 59, 70, 36, 59, 40, 61, 30, 42, 31, 60, 55, 59, 48, 35, 47] },
      { id: 'huningas-heem-oostwold-standaard-d', name: 'Standaard (dames)', gender: 'd', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [27, 47, 49, 59, 70, 36, 59, 40, 61, 30, 42, 31, 60, 55, 59, 48, 35, 47] },
    ],
  },
  {
    id: 'leeuwarder-golfclub-de-groene-ster', province: 'Friesland', town: 'Leeuwarden', dataVersion: 1, name: 'Leeuwarder Golfclub De Groene Ster (Leeuwarden)', holeCount: 18, parTotal: 72, pars: [5, 4, 3, 4, 5, 3, 4, 4, 5, 5, 4, 4, 4, 3, 4, 3, 4, 4], si: [8, 14, 16, 4, 10, 18, 12, 2, 6, 1, 9, 11, 13, 17, 5, 15, 7, 3], confirmed: true, location: { lat: 53.21001, lon: 5.8913 }, website: 'https://www.leeuwardergolfclub.nl/',
    tees: [
      { id: 'leeuwarder-golfclub-de-groene-ster-wit-h', name: 'Wit (heren)', gender: 'h', rating: 73.8, slope: 147, rating9: null, slope9: null, lengths: [481, 313, 198, 396, 459, 145, 336, 395, 464, 514, 348, 326, 371, 141, 357, 181, 364, 399] },
      { id: 'leeuwarder-golfclub-de-groene-ster-geel-h', name: 'Geel (heren)', gender: 'h', rating: 72.5, slope: 137, rating9: null, slope9: null, lengths: [455, 289, 186, 383, 451, 127, 319, 379, 449, 494, 334, 317, 336, 136, 343, 167, 344, 381] },
      { id: 'leeuwarder-golfclub-de-groene-ster-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 69.1, slope: 129, rating9: null, slope9: null, lengths: [385, 252, 177, 328, 378, 118, 271, 371, 377, 415, 328, 299, 335, 116, 296, 167, 337, 337] },
      { id: 'leeuwarder-golfclub-de-groene-ster-rood-h', name: 'Rood (heren)', gender: 'h', rating: 67.8, slope: 121, rating9: null, slope9: null, lengths: [381, 246, 156, 322, 372, 112, 264, 326, 372, 402, 302, 293, 270, 113, 288, 148, 301, 321] },
      { id: 'leeuwarder-golfclub-de-groene-ster-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 65, slope: 109, rating9: null, slope9: null, lengths: [316, 213, 136, 274, 310, 104, 224, 270, 322, 360, 242, 240, 230, 80, 236, 103, 250, 271] },
      { id: 'leeuwarder-golfclub-de-groene-ster-geel-d', name: 'Geel (dames)', gender: 'd', rating: 78.7, slope: 144, rating9: null, slope9: null, lengths: [455, 289, 186, 383, 451, 127, 319, 379, 449, 494, 334, 317, 336, 136, 343, 167, 344, 381] },
      { id: 'leeuwarder-golfclub-de-groene-ster-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 75, slope: 139, rating9: null, slope9: null, lengths: [385, 252, 177, 328, 378, 118, 271, 371, 377, 415, 328, 299, 335, 116, 296, 167, 337, 337] },
      { id: 'leeuwarder-golfclub-de-groene-ster-rood-d', name: 'Rood (dames)', gender: 'd', rating: 73.4, slope: 135, rating9: null, slope9: null, lengths: [381, 246, 156, 322, 372, 112, 264, 326, 372, 402, 302, 293, 270, 113, 288, 148, 301, 321] },
      { id: 'leeuwarder-golfclub-de-groene-ster-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 68.3, slope: 115, rating9: null, slope9: null, lengths: [316, 213, 136, 274, 310, 104, 224, 270, 322, 360, 242, 240, 230, 80, 236, 103, 250, 271] },
    ],
  },
  {
    id: 'duurswold-steendam', province: 'Groningen', town: 'Steendam', dataVersion: 1, name: 'Groningse Golfclub Duurswold (Steendam)', holeCount: 18, parTotal: 74, pars: [4, 5, 4, 4, 4, 4, 3, 4, 5, 4, 5, 4, 4, 4, 4, 3, 4, 5], si: [11, 7, 3, 15, 5, 13, 17, 1, 9, 12, 8, 4, 16, 6, 14, 18, 2, 10], confirmed: true, location: { lat: 53.2632, lon: 6.83622 }, website: 'https://golfclubduurswold.nl/',
    tees: [
      { id: 'duurswold-steendam-wit-h', name: 'Wit (heren)', gender: 'h', rating: 76.5, slope: 148, rating9: null, slope9: null, lengths: [336, 501, 402, 330, 373, 352, 137, 373, 490, 336, 501, 402, 330, 373, 352, 137, 373, 490] },
      { id: 'duurswold-steendam-geel-h', name: 'Geel (heren)', gender: 'h', rating: 75.3, slope: 139, rating9: null, slope9: null, lengths: [316, 483, 374, 310, 359, 336, 130, 359, 456, 316, 483, 374, 310, 359, 336, 130, 359, 456] },
      { id: 'duurswold-steendam-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 71.6, slope: 134, rating9: null, slope9: null, lengths: [306, 474, 314, 299, 296, 336, 130, 315, 380, 306, 474, 314, 299, 296, 336, 130, 315, 380] },
      { id: 'duurswold-steendam-rood-h', name: 'Rood (heren)', gender: 'h', rating: 69.5, slope: 129, rating9: null, slope9: null, lengths: [264, 398, 314, 269, 296, 295, 119, 309, 380, 264, 398, 314, 269, 296, 295, 119, 309, 380] },
      { id: 'duurswold-steendam-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 66, slope: 115, rating9: null, slope9: null, lengths: [211, 381, 268, 223, 258, 256, 70, 265, 355, 211, 381, 268, 223, 258, 256, 70, 265, 355] },
      { id: 'duurswold-steendam-geel-d', name: 'Geel (dames)', gender: 'd', rating: 82, slope: 156, rating9: null, slope9: null, lengths: [316, 483, 374, 310, 359, 336, 130, 359, 456, 316, 483, 374, 310, 359, 336, 130, 359, 456] },
      { id: 'duurswold-steendam-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 78.5, slope: 149, rating9: null, slope9: null, lengths: [306, 474, 314, 299, 296, 336, 130, 315, 380, 306, 474, 314, 299, 296, 336, 130, 315, 380] },
      { id: 'duurswold-steendam-rood-d', name: 'Rood (dames)', gender: 'd', rating: 76.4, slope: 139, rating9: null, slope9: null, lengths: [264, 398, 314, 269, 296, 295, 119, 309, 380, 264, 398, 314, 269, 296, 295, 119, 309, 380] },
      { id: 'duurswold-steendam-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 71.4, slope: 131, rating9: null, slope9: null, lengths: [211, 381, 268, 223, 258, 256, 70, 265, 355, 211, 381, 268, 223, 258, 256, 70, 265, 355] },
    ],
  },
  {
    id: 'edese-golfclub-papendal', province: 'Gelderland', town: 'Arnhem', dataVersion: 1, name: 'Edese Golf Club Papendal (Arnhem)', holeCount: 18, parTotal: 71, pars: [3, 4, 5, 4, 4, 3, 4, 3, 5, 5, 3, 4, 4, 4, 4, 3, 4, 5], si: [16, 12, 6, 2, 10, 14, 8, 18, 4, 9, 17, 1, 13, 5, 11, 15, 7, 3], confirmed: true, location: { lat: 52.01005, lon: 5.82836 }, website: 'https://www.edesegcpapendal.nl/',
    tees: [
      { id: 'edese-golfclub-papendal-wit-h', name: 'Wit (heren)', gender: 'h', rating: 72.7, slope: 133, rating9: null, slope9: null, lengths: [146, 310, 492, 418, 341, 160, 356, 157, 502, 479, 192, 398, 284, 371, 324, 188, 397, 518] },
      { id: 'edese-golfclub-papendal-geel-h', name: 'Geel (heren)', gender: 'h', rating: 71.6, slope: 131, rating9: null, slope9: null, lengths: [135, 297, 483, 396, 333, 154, 346, 157, 486, 451, 152, 373, 275, 329, 305, 173, 384, 492] },
      { id: 'edese-golfclub-papendal-geel-d', name: 'Geel (dames)', gender: 'd', rating: 77, slope: 138, rating9: null, slope9: null, lengths: [135, 297, 483, 396, 333, 154, 346, 157, 486, 451, 152, 373, 275, 329, 305, 173, 384, 492] },
      { id: 'edese-golfclub-papendal-blauw-h', name: 'Blauw (heren)', gender: 'h', rating: 69.4, slope: 120, rating9: null, slope9: null, lengths: [115, 277, 449, 356, 333, 138, 299, 127, 417, 410, 152, 348, 275, 309, 305, 173, 360, 479] },
      { id: 'edese-golfclub-papendal-blauw-d', name: 'Blauw (dames)', gender: 'd', rating: 74.9, slope: 131, rating9: null, slope9: null, lengths: [115, 277, 449, 356, 333, 138, 299, 127, 417, 410, 152, 348, 275, 309, 305, 173, 360, 479] },
      { id: 'edese-golfclub-papendal-rood-h', name: 'Rood (heren)', gender: 'h', rating: 68, slope: 114, rating9: null, slope9: null, lengths: [115, 267, 412, 343, 304, 133, 299, 127, 410, 398, 132, 324, 244, 298, 292, 143, 322, 426] },
      { id: 'edese-golfclub-papendal-rood-d', name: 'Rood (dames)', gender: 'd', rating: 73.1, slope: 129, rating9: null, slope9: null, lengths: [115, 267, 412, 343, 304, 133, 299, 127, 410, 398, 132, 324, 244, 298, 292, 143, 322, 426] },
      { id: 'edese-golfclub-papendal-oranje-h', name: 'Oranje (heren)', gender: 'h', rating: 65, slope: 111, rating9: null, slope9: null, lengths: [87, 234, 391, 309, 270, 90, 266, 114, 375, 366, 116, 280, 207, 253, 255, 129, 293, 384] },
      { id: 'edese-golfclub-papendal-oranje-d', name: 'Oranje (dames)', gender: 'd', rating: 69.9, slope: 117, rating9: null, slope9: null, lengths: [87, 234, 391, 309, 270, 90, 266, 114, 375, 366, 116, 280, 207, 253, 255, 129, 293, 384] },
    ],
  },
  {
    id: 'pitch-putt-papendal', province: 'Gelderland', town: 'Arnhem', dataVersion: 1, name: 'Pitch & Putt Papendal (Arnhem)', holeCount: 18, parTotal: 54, pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], si: [16, 18, 14, 12, 8, 2, 10, 4, 6, 9, 7, 17, 13, 1, 15, 5, 11, 3], confirmed: false, fromSources: true, countsForIndex: false, location: { lat: 52.01017, lon: 5.82457 }, website: 'https://www.pitch-putt.nl/locaties/papendal/',
    tees: [
      { id: 'pitch-putt-papendal-wit-h', name: 'Wit (heren)', gender: 'h', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [50, 35, 39, 39, 40, 67, 38, 68, 57, 42, 56, 52, 41, 65, 54, 64, 53, 54] },
      { id: 'pitch-putt-papendal-wit-d', name: 'Wit (dames)', gender: 'd', rating: 54, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [50, 35, 39, 39, 40, 67, 38, 68, 57, 42, 56, 52, 41, 65, 54, 64, 53, 54] },
    ],
  },
  {
    id: 'gc-muensterland-burgsteinfurt', province: 'Duitsland', town: 'Steinfurt', dataVersion: 1, name: 'Golfclub Münsterland (Steinfurt)', holeCount: 9, parTotal: 36, pars: [4, 4, 5, 3, 3, 5, 4, 4, 4], si: [2, 1, 3, 8, 9, 5, 7, 4, 6], confirmed: true, countsForIndex: false, location: { lat: 52.1408, lon: 7.355 }, website: 'https://www.gc-muensterland.de/',
    tees: [
      { id: 'gc-muensterland-burgsteinfurt-standaard-h', name: 'Standaard (heren)', gender: 'h', rating: 36, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [327, 365, 435, 165, 135, 430, 243, 305, 305] },
      { id: 'gc-muensterland-burgsteinfurt-standaard-d', name: 'Standaard (dames)', gender: 'd', rating: 36, slope: 113, rating9: null, slope9: null, ratingUnknown: true, lengths: [327, 365, 435, 165, 135, 430, 243, 305, 305] },
    ],
  },
  // </banen-regio>
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
