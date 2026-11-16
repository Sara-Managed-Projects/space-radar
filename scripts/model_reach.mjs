#!/usr/bin/env node
// scripts/model_reach.mjs -- which objects of the live map each model file is drawn for, by the app's OWN routing.
//
//   node scripts/model_reach.mjs [--sat LAYER=FILE ...]          (JSON on stdout)
//
// scripts/models_catalog.py runs this to say, on each model's page on models.spaceradar.ai, what the file is used for.
// It calls realModelFor() of site/js/scene/realmodels.js, the function the map calls (catalogue number, Horizons id,
// site id, site class, name with its class, CubeSat and bus tables, the geostationary ring), over
//   - the hand-kept records the app ships (deep space, landing sites and dishes, named asteroids and comets, far bodies),
//   - and every CelesTrak file given as --sat LAYER=FILE (a saved .cols.json, the saved envelope with a `body`, or a plain OMM JSON array), parsed by the
//     app's own parseCelestrakGP() with that layer's name: `active` and `stations` on the map. Without --sat only the
//     hand-kept records are counted, and the output says so (`satellites: false`).
//
// Output: {satellites: bool, routed: [every file a route names], moments: {model id: [Moment ids]}, files: {"<file>.glb": {count, examples: [{id, name, layer, klass}], layers: {layer: n}}}}.
// `examples` are the first three objects in file order (the link on the page goes to the first). A file that no object
// reaches is absent.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const at = (p) => import(pathToFileURL(join(ROOT, p)).href);
const { realModelFor, REAL_MODELS } = await at('site/js/scene/realmodels.js');
await at('site/js/scene/sourcedtables.js'); // the CubeSat and bus tables, as the card and the shapes load them
const sample = await at('site/js/data/sample.js');
const { parseCelestrakGP } = await at('site/js/data/parsers.js');
const { decodeColumns } = await at('site/js/data/columnar.js');

const sats = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--sat') {
    const [layer, ...rest] = String(argv[++i]).split('=');
    sats.push([layer, rest.join('=')]);
  } else throw new Error(`unknown argument ${argv[i]}`);
}

const records = [
  ...sample.sampleDeepSpace(), ...sample.handKeptSites(), ...sample.namedAsteroids(), ...sample.namedComets(),
  ...sample.farBodies(), ...sample.sampleAsteroids(),
];
for (const [layer, file] of sats) {
  const body = JSON.parse(readFileSync(file, 'utf8'));
  const rows = body && body.format === 'columns-1' ? decodeColumns(body) : body && Array.isArray(body.body) ? body.body : body;
  records.push(...parseCelestrakGP(rows, { layer, source: `celestrak-${layer}` }));
}

const files = {};
const seen = new Set(); // one object on two layers (a station's visiting craft are in `stations` and `active`) is one object
for (const r of records) {
  if (seen.has(r.id)) continue;
  seen.add(r.id);
  let entry = null;
  try { entry = realModelFor(r); } catch { entry = null; }
  if (!entry || !entry.file) continue;
  const f = files[entry.file] || (files[entry.file] = { count: 0, examples: [], layers: {} });
  f.count++;
  f.layers[r.layer] = (f.layers[r.layer] || 0) + 1;
  if (f.examples.length < 3) f.examples.push({ id: r.id, name: r.name, layer: r.layer, klass: r.klass });
}
// Every file a route names, whether or not today's data has an object for it (a craft that left the list is routed and reaches
// nothing): read as text from the routing file, the way scripts/check-model-reach.py reads it, because some routes are built by helpers.
const routing = readFileSync(join(ROOT, 'site/js/scene/realmodels.js'), 'utf8')
  + readFileSync(join(ROOT, 'site/js/data/geobuses.js'), 'utf8') + readFileSync(join(ROOT, 'site/js/data/cubesats.js'), 'utf8');
const routed = [...new Set([...routing.matchAll(/['"`]([a-z0-9][a-z0-9.-]*\.glb)['"`]/g)].map((m) => m[1]))].sort();
// The Moments (moments/shelf.js): the model ids each story stages, {modelId: [momentId, ...]}.
const moments = {};
for (const m of readFileSync(join(ROOT, 'site/js/moments/shelf.js'), 'utf8').matchAll(/\{ id: '([a-z0-9-]+)',[^\n]*?models: \[([^\]]*)\]/g)) {
  for (const mid of m[2].match(/[a-z0-9-]+/g) || []) (moments[mid] || (moments[mid] = [])).push(m[1]);
}
process.stdout.write(JSON.stringify({ satellites: sats.length > 0, routed, moments, files }) + '\n');
