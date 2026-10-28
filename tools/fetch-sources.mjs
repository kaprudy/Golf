// Haalt websites van golfclubs op (plus links naar scorekaart/baaninfo en PDF's) en bewaart ze
// als platte tekst, zodat de scorekaart uit de bron zelf gelezen kan worden.
//   node tools/fetch-sources.mjs urls.txt outdir
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const [list, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
// Eén regel per site: "url", of "map url1 url2 …" (een club met meerdere startpagina's in één map).
const sites = fs.readFileSync(list, 'utf8').split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#'))
  .map((line) => {
    const parts = line.split(/\s+/);
    return /^https?:/.test(parts[0]) ? { dir: null, seeds: parts } : { dir: parts[0], seeds: parts.slice(1) };
  });
const KEY = /scorekaart|scorecard|score-card|baaninfo|baan-info|onze-baan|de-baan|golfbaan|baan|course|holes?|hole-|slope|rating|\.pdf/i;
const MAX_BYTES = Number(process.env.MAX_MB ?? 15) * 1e6; // grote brochures overslaan (MAX_MB om te verhogen)
const UA = { 'User-Agent': 'Mozilla/5.0 (Golfscore scorekaart-onderzoek; https://golf.kapital.nl)' };

const slug = (u) => u.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '_').slice(0, 120);
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<(br|\/p|\/tr|\/li|\/h\d|\/div)>/gi, '\n').replace(/<\/t[dh]>/gi, ' | ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#\d+;/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();

// Sommige clubsites weigeren de verbinding van Node (bijv. door hun TLS-instellingen); dan curl.
function curlGet(url) {
  const buf = execFileSync('curl', ['-sSL', '--max-time', '30', '-A', UA['User-Agent'], '-w', '\n%{content_type}\n%{url_effective}', url], { maxBuffer: 40e6 });
  const text = buf.toString('latin1');
  const end = text.lastIndexOf('\n', text.lastIndexOf('\n') - 1);
  const [type, finalUrl] = text.slice(end + 1).split('\n');
  return { type, buf: buf.subarray(0, end), finalUrl };
}

async function get(url) {
  let res;
  try {
    res = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(25000) });
  } catch {
    return curlGet(url);
  }
  if (!res.ok) throw new Error(`${res.status}`);
  const size = Number(res.headers.get('content-length') ?? 0);
  if (size > MAX_BYTES) { res.body?.cancel(); throw new Error(`te groot (${Math.round(size / 1e6)} MB)`); }
  return { type: res.headers.get('content-type') ?? '', buf: Buffer.from(await res.arrayBuffer()), finalUrl: res.url };
}

async function save(url, dir) {
  const { type, buf, finalUrl } = await get(url);
  if (buf.length > MAX_BYTES) throw new Error(`te groot (${Math.round(buf.length / 1e6)} MB)`);
  const base = path.join(dir, slug(url));
  if (type.includes('pdf') || /\.pdf($|\?)/i.test(url)) {
    fs.writeFileSync(`${base}.pdf`, buf);
    try { execFileSync('pdftotext', ['-layout', `${base}.pdf`, `${base}.txt`]); } catch { /* geen tekst */ }
    return { url, kind: 'pdf', links: [] };
  }
  if (/^image\//.test(type) || /\.(png|jpe?g|webp|gif)($|\?)/i.test(url)) {
    // Scorekaarten staan soms als afbeelding online: binair bewaren.
    const ext = (type.split('/')[1] ?? 'img').split(';')[0].replace('jpeg', 'jpg');
    fs.writeFileSync(`${base}.${ext}`, buf);
    return { url, kind: 'image', links: [] };
  }
  const html = buf.toString('utf8');
  fs.writeFileSync(`${base}.txt`, `${finalUrl}\n\n${text(html)}`);
  const abs = (u) => { try { return new URL(u, finalUrl).href; } catch { return null; } };
  const links = [...html.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => abs(m[1])).filter((h) => h && /^https?:/.test(h));
  // Ingesloten afbeeldingen met een scorekaart of handicaptabel (die staan vaak alleen als plaatje online)
  for (const m of html.matchAll(/<img[^>]+(?:data-src|src)=["']([^"']+)["']/gi)) {
    const u = abs(m[1]);
    if (u && /scorekaart|scorecard|handicap|playing|rating|slope|tabel|phcp/i.test(u)) links.push(u);
  }
  return { url, kind: 'html', links };
}

const report = [];
for (const { dir: name, seeds } of sites) {
  const site = seeds[0];
  const dir = path.join(outDir, name ?? slug(site));
  fs.mkdirSync(dir, { recursive: true });
  const seen = new Set();
  const queue = [...seeds];
  let pages = 0;
  while (queue.length && pages < Number(process.env.MAX_PAGES ?? 18)) {
    const u = queue.shift();
    if (seen.has(u)) continue;
    seen.add(u);
    try {
      const r = await save(u, dir);
      pages++;
      const host = new URL(site).host.replace(/^www\./, '');
      for (const l of r.links) {
        const sameSite = new URL(l).host.replace(/^www\./, '') === host;
        if (/\.(ico|woff2?|css|js|svg)($|\?)|\/dynamic\/(image|proxy)\//i.test(l)) continue; // geen pictogrammen en lettertypes
        // Afbeeldingen alleen als ze op een scorekaart of handicaptabel lijken
        const image = /\.(png|jpe?g|webp)($|\?)/i.test(l);
        if (image && !/scorekaart|scorecard|handicap|playing|rating|slope|tabel|phcp/i.test(l)) continue;
        if (!seen.has(l) && (KEY.test(l) || image) && (sameSite || image || /\.pdf($|\?)/i.test(l))) queue.push(l);
      }
      report.push(`ok   ${u}`);
    } catch (err) {
      report.push(`fout ${u} (${err.message})`);
    }
    await new Promise((r) => setTimeout(r, 700));
  }
}
fs.writeFileSync(path.join(outDir, "rapport.txt"), report.join("\n"));
console.log(report.join('\n'));
