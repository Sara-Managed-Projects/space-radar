// scripts/eclipse2027_table.mjs -- what each named place sees of the eclipse of 2 August 2027, for the event page's table
// (scripts/seo_eclipse2027.py, forge #553). The same arithmetic as the map's checker: site/js/sky/besselian.js, NASA's
// Besselian elements. Reads {"places": ["Luxor", ...]} on stdin (names of site/data/eclipse-2027-places.json) and writes
// {"rows": [{name, country, kind, obscuration, magnitude, maxUtc, durationS, sunAltDeg}]} in the order asked.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ECLIPSE_2027_08_02, localCircumstances } from '../site/js/sky/besselian.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const places = JSON.parse(readFileSync(join(ROOT, 'site/data/eclipse-2027-places.json'), 'utf8')).rows;
const ask = JSON.parse(readFileSync(0, 'utf8')).places;
const rows = ask.map((name) => {
  const p = places.find((r) => r[0] === name);
  if (!p) throw new Error(`no place called ${name} in site/data/eclipse-2027-places.json`);
  const r = localCircumstances(ECLIPSE_2027_08_02, p[2], p[3]);
  return { name: p[0], country: p[1], kind: r.kind, obscuration: r.obscuration, magnitude: r.magnitude, maxUtc: new Date(r.max).toISOString(),
    durationS: r.durationS, sunAltDeg: r.sunAltDeg };
});
process.stdout.write(JSON.stringify({ rows }));
