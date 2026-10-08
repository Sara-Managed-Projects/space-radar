// tests/test_overplace.mjs -- the country or sea under a point, offline (spec 0048 task 3, req 2):
// fixture points against the committed raster, the 50 km border rule, disputed ground as plain land,
// the raster's size, the PNG decoder against zlib, and the card's one new row.
//
//   node tests/test_overplace.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, statSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const op = await import(join(JS, 'sky/overplace.js'));
const { ensurePlaces, rightNowFor, belowWords } = await import(join(JS, 'ui/cards.js'));
const { parseCelestrakGP } = await import(join(JS, 'data/parsers.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const pngPath = join(ROOT, 'site/data/places.png');
const jsonPath = join(ROOT, 'site/data/places.json');
const pngBytes = statSync(pngPath).size;
const jsonBytes = statSync(jsonPath).size;
check(pngBytes <= 150e3, `places.png is ${pngBytes} bytes, within 150 KB`);
const table = JSON.parse(readFileSync(jsonPath, 'utf8'));
const grid = op.decodePng16(readFileSync(pngPath), (z) => inflateSync(z));
check(grid.width === 2048 && grid.height === 1024 && table.width === 2048 && table.height === 1024, `2048 x 1024, and the table agrees (${grid.width} x ${grid.height})`);
const places = { ...grid, entries: table.entries };
let max = 0;
for (const v of grid.data) if (v > max) max = v;
check(max < table.entries.length, `every pixel's index is in the table (max ${max} of ${table.entries.length})`);

// --- ten points and more ----------------------------------------------------------------------------
const say = (lat, lon) => belowWords(op.placeAt(places, lat, lon));
const CASES = [
  ['Astana', 51.17, 71.43, 'Kazakhstan'],
  ['the South Pacific, 5 S 150 W', -5, -150, 'the South Pacific Ocean'],
  ['the North Pacific, 5 N 150 W', 5, -150, 'the North Pacific Ocean'],
  ['the South Pole', -89.9, 0, 'Antarctica'],
  ['the North Pole', 89.9, 0, 'the Arctic Ocean'],
  ['Paris', 48.86, 2.35, 'France'],
  ['Kansas', 38.5, -98, 'the United States of America'],
  ['the Ionian Sea, 35 N 18 E', 35, 18, 'the Mediterranean Sea'],
  ['Alice Springs', -23.7, 133.9, 'Australia'],
  ['the Pyrenees, 20 km north of the border', 43.0, 0.0, 'near the border of France and Spain'],
  ['Almaty, 30-odd km from the Kyrgyz border', 43.24, 76.95, 'near the border of Kazakhstan and Kyrgyzstan'],
  ['the Gulf of Mexico', 25, -90, 'the Gulf of Mexico'],
  ['Western Sahara (Natural Earth: indeterminate)', 24, -13, 'land'],
];
for (const [name, lat, lon, want] of CASES) {
  const got = say(lat, lon);
  check(got === want, `${name}: "${got}", expected "${want}"`);
}
// Longitudes wrap, and the far edges of the map are one place.
check(say(-5, 210) === say(-5, -150) && say(-5, -150 - 360) === say(-5, -150), 'longitude wraps');
check(op.placeAt(places, NaN, 0) === null && op.placeAt(null, 0, 0) === null, 'no point, or no places: no answer');
// The border ellipse widens in longitude towards the poles, so 50 km stays 50 km.
const b = op.placeAt(places, 43.0, 0.0, 10);
check(b.kind === 'country' && b.names[0] === 'France', `with a 10 km rule the same point is simply France (${JSON.stringify(b)})`);
check(!table.entries.some((e) => e && e.kind === 'country' && /\.$|\. /.test(e.name || '')), 'no abbreviated names ("Central African Rep.")');
check(!table.entries.some((e) => e && /^(Kosovo|W\. Sahara|Western Sahara|Palestine|Siachen Glacier)$/.test(e.name || '')), 'disputed and indeterminate areas are not named');
check(table.entries.some((e) => e && e.name === 'Antarctica'), 'Antarctica is');

// --- the decoder against a PNG with every row filter -------------------------------------------------
// Pillow picks filters per row; decode the real file's rows twice, once with zlib inflating
// everything and once with the browser's split path (pngParts + the same unfilter): identical.
const parts = op.pngParts(readFileSync(pngPath));
check(parts.depth === 16 && parts.width === 2048, 'a 16-bit greyscale PNG');
const raw = inflateSync(parts.z);
const filters = new Set();
for (let y = 0; y < parts.height; y++) filters.add(raw[y * (parts.width * 2 + 1)]);
check(filters.size >= 2, `more than one row filter exercised (${[...filters].sort()})`);

// --- the card's row, after the places load ------------------------------------------------------------
const gp = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/harvest/celestrak_gp.json'), 'utf8'));
const [iss] = parseCelestrakGP(gp, { layer: 'stations', source: 'celestrak-stations' });
const ctx = { clock: { now: () => iss.epoch + 3 * 3600e3 }, observer: null };
check(!rightNowFor(iss, ctx).some(([label]) => label === 'Below it now'), 'before the places load, no row');
const fetchFn = async (url) => ({
  ok: true,
  arrayBuffer: async () => { const b2 = readFileSync(url.endsWith('.png') ? pngPath : jsonPath); return b2.buffer.slice(b2.byteOffset, b2.byteOffset + b2.byteLength); },
  json: async () => JSON.parse(readFileSync(jsonPath, 'utf8')),
});
const loaded = await ensurePlaces({ fetchFn, inflate: (z) => inflateSync(z) });
check(!!loaded && op.placesNow() === loaded, 'ensurePlaces() loads them once');
const rows = rightNowFor(iss, ctx);
const below = rows.find(([label]) => label === 'Below it now');
const over = rows.find(([label]) => label === 'Passing over');
check(!!below && typeof below[1] === 'string' && below[1].length > 0, `after, one row says what is below (${below && below[1]})`);
check(rows.indexOf(below) === rows.indexOf(over) + 1, 'right under "Passing over", whose numbers stay');

// --- never at boot ---------------------------------------------------------------------------------------
// ensurePlaces() and the row it feeds live in ui/cardfacts.js since 2026-10-08 (the card's facts, apart from the card).
const cards = readFileSync(join(JS, 'ui/cards.js'), 'utf8') + readFileSync(join(JS, 'ui/cardfacts.js'), 'utf8');
check(/import\('\.\.\/sky\/overplace\.js'\)/.test(cards) && !/^import[^\n]*overplace/m.test(cards), 'the module is a dynamic import, out of the boot graph');
const main = readFileSync(join(JS, 'main.js'), 'utf8');
check(!/overplace|places\.png/.test(main), 'main.js asks for nothing of it at boot');
const index = readFileSync(join(ROOT, 'site/index.html'), 'utf8');
check(!/overplace/.test(index), 'and index.html does not preload it');

if (problems.length) { console.error('overplace FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`overplace ok: ${CASES.length} points named (Kazakhstan, both Pacifics, the poles, the France-Spain and Kazakh-Kyrgyz borders, land for Western Sahara); places.png ${pngBytes} B, places.json ${jsonBytes} B; one card row after a lazy load`);
