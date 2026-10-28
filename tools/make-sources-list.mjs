// Maakt tools/sources-all.txt: per club-website één regel "map url1 url2 …" met de website en de
// eigen bronpagina's van de club uit data/banen (scorekaart, handicaptabellen). Sites als Hole19
// of GolfPass slaan we over: we willen de bron van de club zelf.
//   node tools/make-sources-list.mjs
import fs from 'node:fs';
import { DEFAULT_COURSES } from '../js/courses.js';

const data = JSON.parse(fs.readFileSync('data/banen/courses.json', 'utf8'));
const host = (u) => { try { return new URL(u).host.replace(/^www\./, ''); } catch { return null; } };
const byHost = new Map(); // host -> {seeds:Set, ids:Set}
const add = (h, url, id) => {
  if (!h) return;
  if (!byHost.has(h)) byHost.set(h, { seeds: new Set(), ids: new Set() });
  const e = byHost.get(h);
  if (url) e.seeds.add(url);
  if (id) e.ids.add(id);
};
for (const c of DEFAULT_COURSES) if (c.website) add(host(c.website), c.website, c.id);
for (const c of data) {
  const h = host(c.website);
  if (!h) continue;
  for (const u of c.sources ?? []) if (host(u) === h || /\.(pdf|png|jpe?g)($|\?)/i.test(u) && host(u)?.endsWith(h)) add(h, u);
}
const lines = [...byHost].sort().map(([h, e]) => `${h.replace(/[^a-z0-9]+/gi, '_')} ${[...e.seeds].join(' ')}`);
const map = Object.fromEntries([...byHost].map(([h, e]) => [h.replace(/[^a-z0-9]+/gi, '_'), [...e.ids]]));
fs.writeFileSync('tools/sources-all.txt', `# Alle clubs uit js/courses.js (gemaakt met tools/make-sources-list.mjs): map en startpagina's\n${lines.join('\n')}\n`);
fs.writeFileSync('tools/sources-all.map.json', `${JSON.stringify(map, null, 1)}\n`);
console.log(`${lines.length} sites, ${[...byHost.values()].reduce((a, e) => a + e.seeds.size, 0)} startpagina's`);
