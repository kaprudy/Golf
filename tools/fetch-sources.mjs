// Haalt websites van golfclubs op (plus links naar scorekaart/baaninfo en PDF's) en bewaart ze
// als platte tekst, zodat de scorekaart uit de bron zelf gelezen kan worden.
//   node tools/fetch-sources.mjs urls.txt outdir
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const [list, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const urls = fs.readFileSync(list, 'utf8').split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
const KEY = /scorekaart|scorecard|score-card|baaninfo|baan-info|onze-baan|de-baan|golfbaan|baan|course|holes?|hole-|slope|rating|\.pdf/i;
const UA = { 'User-Agent': 'Mozilla/5.0 (Golfscore scorekaart-onderzoek; https://golf.kapital.nl)' };

const slug = (u) => u.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '_').slice(0, 120);
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<(br|\/p|\/tr|\/li|\/h\d|\/div)>/gi, '\n').replace(/<\/t[dh]>/gi, ' | ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#\d+;/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();

async function get(url) {
  const res = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`${res.status}`);
  return { type: res.headers.get('content-type') ?? '', buf: Buffer.from(await res.arrayBuffer()), finalUrl: res.url };
}

async function save(url, dir) {
  const { type, buf, finalUrl } = await get(url);
  const base = path.join(dir, slug(url));
  if (type.includes('pdf') || /\.pdf($|\?)/i.test(url)) {
    fs.writeFileSync(`${base}.pdf`, buf);
    try { execFileSync('pdftotext', ['-layout', `${base}.pdf`, `${base}.txt`]); } catch { /* geen tekst */ }
    return { url, kind: 'pdf', links: [] };
  }
  const html = buf.toString('utf8');
  fs.writeFileSync(`${base}.txt`, `${finalUrl}\n\n${text(html)}`);
  const links = [...html.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => { try { return new URL(m[1], finalUrl).href; } catch { return null; } })
    .filter((h) => h && /^https?:/.test(h));
  return { url, kind: 'html', links };
}

const report = [];
for (const site of urls) {
  const dir = path.join(outDir, slug(site));
  fs.mkdirSync(dir, { recursive: true });
  const seen = new Set();
  const queue = [site];
  let pages = 0;
  while (queue.length && pages < 14) {
    const u = queue.shift();
    if (seen.has(u)) continue;
    seen.add(u);
    try {
      const r = await save(u, dir);
      pages++;
      const host = new URL(site).host.replace(/^www\./, '');
      for (const l of r.links) {
        const sameSite = new URL(l).host.replace(/^www\./, '') === host;
        if (!seen.has(l) && KEY.test(l) && (sameSite || /\.pdf($|\?)/i.test(l))) queue.push(l);
      }
      report.push(`ok   ${u}`);
    } catch (err) {
      report.push(`fout ${u} (${err.message})`);
    }
    await new Promise((r) => setTimeout(r, 700));
  }
}
fs.writeFileSync(path.join(outDir, 'rapport.txt'), report.join('\n'));
console.log(report.join('\n'));
