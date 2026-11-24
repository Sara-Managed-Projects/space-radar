// scripts/build-eclipse-places.mjs -- the places the eclipse checker can find by name (ui/eclipsecheck.js, forge #553).
//
//   node scripts/build-eclipse-places.mjs <ne_10m_populated_places_simple.geojson> [--out site/data/eclipse-2027-places.json]
//   node scripts/build-eclipse-places.mjs --check      the file is whole: its shape, its count, every place sees the eclipse
//
// WHERE FROM. Natural Earth's 1:10m populated places, version 5.1.2 (public domain; https://www.naturalearthdata.com/about/terms-of-use/,
// the file read 2026-11-24 from https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_populated_places_simple.geojson).
// Its name, its country and its latitude and longitude, nothing else.
//
// WHICH. Every place that sees the eclipse of 2 August 2027 (sky/besselian.js, the Sun up at some part of it) with at least
// 30 percent of the Sun's diameter covered AND either 250 000 people or more (Natural Earth's pop_max), or a place in the path of
// totality of 20 000 or more. So a visitor finds the town they would travel to, and the city they live in, by its name, on
// this page and without asking anybody: the checker sends nothing anywhere (forge #553: local geocoding only).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ECLIPSE_2027_08_02, localCircumstances } from '../site/js/sky/besselian.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'site/data/eclipse-2027-places.json');
const args = process.argv.slice(2);

if (args[0] === '--check') {
  const doc = JSON.parse(readFileSync(OUT, 'utf8'));
  const bad = [];
  if (doc.v !== 1 || !Array.isArray(doc.cols) || doc.cols.join() !== 'name,country,lat,lon') bad.push('shape');
  if (!Array.isArray(doc.rows) || doc.rows.length < 200) bad.push(`only ${doc.rows && doc.rows.length} places`);
  for (const [name, country, lat, lon] of doc.rows || []) {
    if (!name || !country || !(Math.abs(lat) <= 90) || !(Math.abs(lon) <= 180)) { bad.push(`row ${name}`); continue; }
    if (!localCircumstances(ECLIPSE_2027_08_02, lat, lon).visible) bad.push(`${name} does not see it`);
  }
  if (bad.length) { console.error('eclipse places FAILED: ' + bad.slice(0, 10).join('; ')); process.exit(1); }
  console.log(`eclipse places ok: ${doc.rows.length} places, each sees the eclipse`);
  process.exit(0);
}
if (!args[0]) { console.error('usage: node scripts/build-eclipse-places.mjs <geojson> | --check'); process.exit(2); }

const geo = JSON.parse(readFileSync(args[0], 'utf8'));
const rows = [];
const seen = new Set();
for (const f of geo.features) {
  const p = f.properties || {};
  const lat = Number(p.latitude), lon = Number(p.longitude), pop = Number(p.pop_max) || 0;
  if (!p.name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
  const r = localCircumstances(ECLIPSE_2027_08_02, lat, lon);
  if (!r.visible || r.magnitude < 0.3) continue;
  if (!(pop >= 250000 || (r.kind === 'total' && pop >= 20000))) continue;
  const key = `${p.name}|${p.adm0name}`;
  if (seen.has(key)) continue;
  seen.add(key);
  rows.push([p.name, p.adm0name, Math.round(lat * 1000) / 1000, Math.round(lon * 1000) / 1000, pop]);
}
rows.sort((a, b) => b[4] - a[4] || a[0].localeCompare(b[0]));
const doc = {
  v: 1,
  about: 'Places that see the total solar eclipse of 2 August 2027, for the map\'s eclipse checker. Built by scripts/build-eclipse-places.mjs.',
  source: 'Natural Earth 1:10m populated places v5.1.2 (public domain), read 2026-11-24',
  cols: ['name', 'country', 'lat', 'lon'],
  rows: rows.map((r) => r.slice(0, 4)),
};
writeFileSync(OUT, JSON.stringify(doc) + '\n');
console.log(`wrote ${OUT}: ${rows.length} places, ${rows.filter((r) => localCircumstances(ECLIPSE_2027_08_02, r[2], r[3]).kind === 'total').length} in the path`);
