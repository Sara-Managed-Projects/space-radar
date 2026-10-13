// tests/test_real_models.mjs -- no spacecraft quietly falls back to a placeholder (public #472).
//
// Thirty-two models were rebuilt or added in one pull request (#466). That is exactly where one
// craft loses its model -- a file renamed, a route left pointing at the old name, a row with no
// route -- and nothing says so: the loader fails, the generic shape is drawn, and the card still
// says "Hubble". Held here, with no browser:
//
//   1. Every `real_models` row of registry/models.yaml has its file on disc, and the file is a
//      real binary glTF 2 with at least one mesh that has positions (not an error page, not an
//      empty export).
//   2. Every row is WORN: at least one route in scene/realmodels.js names its file. A model nobody
//      can reach is 100 to 300 kB of a repository saying something the app does not do.
//   3. Every route's file is a row, and is on disc: a route to a file that is not there is the
//      placeholder, drawn under a real name.
//   4. Every craft with a route of its own gets it: a record made from the route's own key -- the
//      catalogue number, the Horizons id, the site, the name with its class -- comes back from
//      realModelFor() with that file, and not a generic shape.
//
//   node tests/test_real_models.mjs
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const { REAL_MODELS, realModelFor } = await import(pathToFileURL(join(ROOT, 'site/js/scene/realmodels.js')).href);

// --- the registry's rows ---------------------------------------------------------------------------
const yaml = readFileSync(join(ROOT, 'registry/models.yaml'), 'utf8');
const section = yaml.slice(yaml.indexOf('\nreal_models:'));
const rows = [...section.matchAll(/^ {2}- \{id: ([\w-]+), file: site\/models\/([\w.-]+\.glb),(.*)$/gm)].map((m) => ({ id: m[1], file: m[2], usedFor: (/used_for: "([^"]*)"/.exec(m[3]) || [])[1] || '' }));
// A model may wait for the record that will carry it, IF its row says so in as many words
// (`used_for: "NOTHING YET, ..."` and the reason): MAVEN, with no path to draw it on since March 2026.
const waiting = (row) => /^NOTHING YET\b/.test(row.usedFor);
check(rows.length >= 50, `registry/models.yaml real_models was read (${rows.length} rows)`);
check(new Set(rows.map((r) => r.file)).size === rows.length, 'no two rows name the same file');

/** A binary glTF 2, read far enough to know it holds a mesh: {meshes, triangles} or a reason. */
function readGlb(path) {
  const b = readFileSync(path);
  if (b.length < 20 || b.readUInt32LE(0) !== 0x46546c67) return { why: 'not a binary glTF (no glTF magic)' };
  if (b.readUInt32LE(4) !== 2) return { why: `glTF version ${b.readUInt32LE(4)}, not 2` };
  if (b.readUInt32LE(8) !== b.length) return { why: `the header says ${b.readUInt32LE(8)} B and the file is ${b.length} B (cut short?)` };
  const jsonLen = b.readUInt32LE(12);
  if (b.readUInt32LE(16) !== 0x4e4f534a) return { why: 'the first chunk is not JSON' };
  let doc = null;
  try { doc = JSON.parse(b.subarray(20, 20 + jsonLen).toString('utf8')); } catch (e) { return { why: `its JSON does not parse: ${e.message}` }; }
  const meshes = doc.meshes || [];
  let triangles = 0; let positioned = 0;
  for (const mesh of meshes) {
    for (const p of mesh.primitives || []) {
      const pos = p.attributes && doc.accessors && doc.accessors[p.attributes.POSITION];
      if (!pos || !(pos.count > 0)) continue;
      positioned += 1;
      const idx = p.indices != null ? doc.accessors[p.indices] : null;
      triangles += Math.floor((idx ? idx.count : pos.count) / 3);
    }
  }
  if (!meshes.length || !positioned) return { why: 'it holds no mesh with positions' };
  if (!(triangles > 0)) return { why: 'its meshes have no triangles' };
  return { meshes: meshes.length, triangles };
}

// --- the routes ---------------------------------------------------------------------------------------
const routes = []; // { table, key, entry }
for (const [table, map] of Object.entries(REAL_MODELS)) for (const [key, entry] of Object.entries(map)) routes.push({ table, key, entry });
check(routes.length > 150, `scene/realmodels.js routes were read (${routes.length})`);
const routedFiles = new Set(routes.map((r) => r.entry && r.entry.file).filter(Boolean));

// 1 and 2
let triangles = 0;
for (const row of rows) {
  const path = join(ROOT, 'site/models', row.file);
  if (!existsSync(path)) { problems.push(`${row.id}: registry/models.yaml names site/models/${row.file} and it is not on disc`); continue; }
  const glb = readGlb(path);
  if (glb.why) problems.push(`${row.id}: site/models/${row.file}: ${glb.why}`);
  else triangles += glb.triangles;
  if (waiting(row)) check(!routedFiles.has(row.file), `${row.id}: its row says "NOTHING YET" and a route wears it: say what it is used for`);
  else check(routedFiles.has(row.file), `${row.id}: site/models/${row.file} has a row and no route in scene/realmodels.js: no craft wears it (a model that waits for its record says used_for: "NOTHING YET, ..." and why)`);
}
// 3
const rowFiles = new Set(rows.map((r) => r.file));
for (const file of routedFiles) {
  check(rowFiles.has(file), `scene/realmodels.js routes to ${file}, which has no real_models row (no licence, no budget)`);
  check(existsSync(join(ROOT, 'site/models', file)), `scene/realmodels.js routes to ${file}, which is not in site/models: the placeholder would be drawn under a real name`);
}
for (const f of readdirSync(join(ROOT, 'site/models')).filter((x) => x.endsWith('.glb'))) check(rowFiles.has(f), `site/models/${f} is on disc with no real_models row`);

// 4. A record made from each route's own key gets that route's model.
const recordFor = ({ table, key, entry }) => {
  if (table === 'norad') return { id: `sat-${key}`, name: `OBJECT ${key}`, klass: 'satellite', meta: { noradId: Number(key) } };
  if (table === 'horizons') return { id: `deep-${key}`, name: `craft ${key}`, klass: 'probe', meta: { horizonsId: key } };
  if (table === 'bySite') return { id: key, name: key, klass: 'site', meta: {} };
  if (table === 'named') return { id: `named-${key}`, name: key.toUpperCase(), klass: (entry.klass && entry.klass[0]) || 'satellite', meta: {} };
  return null;
};
let own = 0; let generic = 0;
for (const route of routes) {
  const { table, key, entry } = route;
  if (!entry) { problems.push(`${table}[${key}] is empty`); continue; }
  if (entry.generic) { generic += 1; continue; } // a class's shape, said as one ("a spent rocket stage")
  const record = recordFor(route);
  if (!record) continue;
  own += 1;
  let got = null;
  try { got = realModelFor(record); } catch (e) { problems.push(`${table}[${key}]: realModelFor threw: ${e.message}`); continue; }
  if (!got) { problems.push(`${table}[${key}] (${entry.name}): a record with that ${table === 'named' ? 'name' : 'id'} gets NO model: it would be a dot or the placeholder`); continue; }
  check(!got.generic, `${table}[${key}] (${entry.name}): gets a generic shape ("${got.name}") instead of its own`);
  const want = entry.file || entry.build;
  const have = got.file || got.build;
  // Two keys may share a name ("oco 2" and "oco-2"): the model is what must agree, not the object.
  check(!!have && (have === want || typeof entry.resolve === 'function'), `${table}[${key}] (${entry.name}): wears ${have}, and its route says ${want}`);
  if (got.file) check(existsSync(join(ROOT, 'site/models', got.file)), `${table}[${key}] (${entry.name}): its model ${got.file} is not on disc`);
}
check(own >= 60, `the routes of their own were exercised (${own})`);
// The comet that a telescope found is not the telescope (the miss that made the class gate).
const tessComet = realModelFor({ id: 'comet-C/2019M4', name: 'C/2019 M4 (TESS)', klass: 'comet', meta: {} });
check(!tessComet || !tessComet.file || !/tess/i.test(tessComet.file), 'C/2019 M4 (TESS), a comet, does not wear the TESS spacecraft');

// A MODEL GENERATED FROM PHOTOGRAPHS SAYS SO ON THE CARD, IN THE ROW'S OWN WORDS (2026-10-12, public #938).
// registry/models.yaml `kind: derived-from-images` carries `honesty:`; scene/realmodels.js marks the
// route `made: 'images'`; ui/cards.js adds COPY.drawing.objectMade.images. Three files, one sentence.
{
  const { COPY } = await import(pathToFileURL(join(ROOT, 'site/js/copy/en.js')).href);
  const { drawingLine } = await import(pathToFileURL(join(ROOT, 'site/js/ui/cards.js')).href).catch((e) => ({ drawingLine: null, why: e }));
  // 2026-10-13: three sentences, not one. `images` and `render` are the two a derived-from-images
  // row may print (a photograph is not an artist's render), `dimensions` is the one a
  // built-from-dimensions row prints; the route's `made` picks the sentence and the row must agree.
  const made = [...section.matchAll(/^ {2}- \{id: ([\w-]+), file: site\/models\/([\w.-]+\.glb),.*kind: (derived-from-images|built-from-dimensions),.*honesty: "([^"]*)"/gm)].map((m) => ({ id: m[1], file: m[2], kind: m[3], honesty: m[4] }));
  const sentences = (COPY.drawing && COPY.drawing.objectMade) || {};
  const copy = sentences.images || null;
  check(made.some((row) => row.id === 'cygnus'), 'the Cygnus row is no longer read as a made model: the pattern above has stopped matching models.yaml');
  for (const row of made) {
    const worn = routes.filter((r) => r.entry && r.entry.file === row.file);
    check(worn.length > 0, `${row.id}: no route wears ${row.file}`);
    for (const r of worn) {
      const how = r.entry.made;
      check(typeof how === 'string' && sentences[how] === row.honesty, `${row.id}: ${r.table}[${r.key}] says made: ${JSON.stringify(how)}, whose card sentence is ${JSON.stringify(sentences[how])}, and the row's honesty line is ${JSON.stringify(row.honesty)}`);
      check((how === 'dimensions') === (row.kind === 'built-from-dimensions'), `${row.id}: made: '${how}' on a row of kind ${row.kind}`);
    }
  }
  for (const r of routes) if (r.entry && r.entry.made) check(made.some((row) => row.file === r.entry.file), `${r.table}[${r.key}] says made: '${r.entry.made}' and ${r.entry.file} has no row of a made kind`);
  // The Cygnus route itself: the ship gets the file, and the Swan's other namesakes do not.
  const ship = realModelFor({ id: 'sat-68689', name: 'CYGNUS NG-24', klass: 'satellite', layer: 'stations', meta: { noradId: 68689 } });
  check(ship && ship.file === 'cygnus.glb' && ship.build === 'cygnus' && ship.generic === true && ship.made === 'images', `CYGNUS NG-24 wears cygnus.glb over the procedural shape, as the kind of thing: ${JSON.stringify(ship)}`);
  for (const other of [{ id: 'exotic-cygnus-x-1', name: 'Cygnus X-1', klass: 'exotic' }, { id: 'dso-cygnus-loop', name: 'Cygnus Loop', klass: 'dso' }, { id: 'x', name: 'CYGNUS NG-24 DEB', klass: 'debris' }, { id: 'y', name: 'CYGNUSAT 1', klass: 'satellite' }]) {
    const got = realModelFor({ ...other, meta: {} });
    check(!got || got.file !== 'cygnus.glb', `${other.name} (${other.klass}) does not wear the cargo ship`);
  }
  // THE FIRST BATCH (2026-10-13, public #946, #964, #968, #994): each file is worn by ONE catalogue
  // number, and the craft a careless route would give it to do not get it.
  const sat = (norad, name, klass = 'satellite') => realModelFor({ id: `sat-${norad}`, name, klass, layer: 'active', meta: { noradId: norad } });
  // THE SECOND BATCH (2026-10-13, public #947, #969; NOAA 21 rebuilt from dimensions): Hitomi, Ajisai
  // and the two LAGEOS by number, as themselves.
  for (const [norad, name, file, how] of [[57800, 'XRISM', 'xrism.glb', 'render'], [54234, 'NOAA 21 (JPSS-2)', 'noaa21.glb', 'dimensions'], [10967, 'SEASAT 1', 'seasat.glb', 'render'], [38358, 'NUSTAR', 'nustar.glb', 'dimensions'],
    [41337, 'ASTRO-H (HITOMI)', 'hitomi.glb', 'render'], [16908, 'AJISAI (EGS)', 'ajisai.glb', 'dimensions'], [8820, 'LAGEOS 1', 'lageos.glb', 'dimensions'], [22195, 'LAGEOS 2', 'lageos.glb', 'dimensions'],
    // THE THIRD BATCH (2026-10-13): the other laser-ranging balls, each from its own ILRS page.
    [7646, 'STARLETTE', 'starlette.glb', 'dimensions'], [22824, 'STELLA', 'starlette.glb', 'dimensions'], [38077, 'LARES', 'lares.glb', 'dimensions'], [53105, 'LARES-2', 'lares2.glb', 'dimensions'],
    [19751, 'COSMOS 1989 (ETALON 1)', 'etalon.glb', 'dimensions'], [20026, 'COSMOS 2024 (ETALON 2)', 'etalon.glb', 'dimensions'], [25398, 'WESTPAC', 'westpac.glb', 'dimensions']]) {
    const got = sat(norad, name);
    check(got && got.file === file && got.made === how && !got.generic, `${name} (${norad}) wears ${file}, made: '${how}', as itself: ${JSON.stringify(got)}`);
  }
  for (const [norad, name, file, klass] of [
    [43013, 'NOAA 20 (JPSS-1)', 'noaa21.glb'],   // a different bus: NASA's Suomi model
    [33591, 'NOAA 19', 'noaa21.glb'],            // the POES bus
    [41337, 'ASTRO-H (HITOMI)', 'xrism.glb'],    // the same bus with an optical bench this file lacks
    [44322, 'RCM-1', 'seasat.glb'],              // the other radar satellites keep the generic build
    [99001, 'SEASAT 1 DEB', 'seasat.glb', 'debris'],
    [99002, 'NUSTAR DEB', 'nustar.glb', 'debris'],
    [99003, 'XRISM R/B', 'xrism.glb', 'rocket'],
    [57800, 'XRISM', 'hitomi.glb'],              // XRISM has no extensible bench: it keeps its own file
    [7646, 'STARLETTE', 'lageos.glb'],           // every ball wears its OWN surface (batch three), never another's:
    [38077, 'LARES', 'lageos.glb'],
    [38077, 'LARES', 'lares2.glb'],              // LARES and LARES-2 are two balls of two sizes and two arrays
    [53105, 'LARES-2', 'lares.glb'],
    [52307, 'STARLINK-3755', 'lares2.glb'],      // the id LARES-2 is often given is a Starlink
    [19751, 'COSMOS 1989 (ETALON 1)', 'ajisai.glb'],
    [27944, 'LARETS', 'westpac.glb'],            // no page read gives Larets's arrangement: it has no file
    [27944, 'LARETS', 'starlette.glb'],
    [60533, 'LEMUR-2-STELLA', 'starlette.glb'],  // a CubeSat with Stella in its name is not the ball
    [99004, 'ASTRO-H DEB', 'hitomi.glb', 'debris'],  // Hitomi's fragments stay fragments
    [99005, 'SOYUZ-MS 29 DEB', 'soyuz-ms.glb', 'debris'],
    [99006, 'SL-4 R/B', 'soyuz-ms.glb', 'rocket'],   // the Soyuz ROCKET's stage is not the ship
  ]) {
    const got = sat(norad, name, klass || 'satellite');
    check(!got || got.file !== file, `${name} (${norad}) does not wear ${file}`);
  }
  if (typeof drawingLine === 'function') {
    const line = drawingLine({ id: 'sat-57800', name: 'XRISM', klass: 'satellite', layer: 'visual', meta: { noradId: 57800 } }, Date.UTC(2026, 9, 13));
    check(typeof line === 'string' && line.startsWith('drawn as XRISM') && line.includes(sentences.render) && !/published model/.test(line), `XRISM's card says it is drawn as XRISM from an artist's render, and not from a published model: ${JSON.stringify(line)}`);
    const nu = drawingLine({ id: 'sat-38358', name: 'NUSTAR', klass: 'satellite', layer: 'notable', meta: { noradId: 38358 } }, Date.UTC(2026, 9, 13));
    check(typeof nu === 'string' && nu.startsWith('drawn as NuSTAR') && nu.includes(sentences.dimensions) && !/published model/.test(nu), `NuSTAR's card says it was built from dimensions, and not that somebody published it: ${JSON.stringify(nu)}`);
  }
  // The Soyuz: by name, on the stations layer, over its build, as the kind of thing (the Cygnus's pattern).
  const soyuz = realModelFor({ id: 'sat-100057', name: 'SOYUZ-MS 29', klass: 'station', layer: 'stations', meta: { noradId: 100057 } });
  check(soyuz && soyuz.file === 'soyuz-ms.glb' && soyuz.build === 'soyuz' && soyuz.generic === true && soyuz.made === 'dimensions', `SOYUZ-MS 29 wears soyuz-ms.glb over the procedural Soyuz, as the kind of thing: ${JSON.stringify(soyuz)}`);
  // THE THIRD BATCH: the Progress has a file of its own, and the two are never swapped.
  const progress = realModelFor({ id: 'sat-68837', name: 'PROGRESS-MS 34', klass: 'station', layer: 'stations', meta: { noradId: 68837 } });
  check(progress && progress.file === 'progress-ms.glb' && progress.build === 'progress' && progress.generic === true && progress.made === 'dimensions', `PROGRESS-MS 34 wears progress-ms.glb over the procedural Progress, and not the crewed ship: ${JSON.stringify(progress)}`);
  check(soyuz.file !== 'progress-ms.glb', 'a Soyuz is not drawn as a Progress');
  // The other visiting vehicles of the batch, each by name on the stations layer, over its own build,
  // as the kind of thing; and what must NOT wear each.
  const visit = (name, klass = 'satellite', layer = 'stations') => realModelFor({ id: 'sat-9', name, klass, layer, meta: { noradId: 9 } });
  for (const [name, file, build] of [['CREW DRAGON 13', 'dragon-crew.glb', 'dragon'], ['DRAGON CRS-33', 'dragon-cargo.glb', 'dragon-cargo'], ['SHENZHOU-23 (SZ-23)', 'shenzhou.glb', 'shenzhou'], ['TIANZHOU-10', 'tianzhou.glb', 'tianzhou'], ['PROGRESS-MS 35', 'progress-ms.glb', 'progress']]) {
    for (const klass of ['station', 'satellite']) {
      const got = visit(name, klass);
      check(got && got.file === file && got.build === build && got.generic === true && got.made === 'dimensions' && got.axes === 'app', `${name} (klass ${klass}) wears ${file} over the build ${build}, as the kind of thing: ${JSON.stringify(got)}`);
    }
    const deb = visit(name + ' DEB', 'debris', 'active');
    check(!deb || !deb.file, `${name} DEB is debris and wears no ship's file: ${JSON.stringify(deb)}`);
  }
  for (const [name, file, klass] of [['CREW DRAGON 13', 'dragon-cargo.glb'], ['DRAGON CRS-33', 'dragon-crew.glb'], ['SHENZHOU-23 (SZ-23)', 'tianzhou.glb'], ['TIANZHOU-10', 'shenzhou.glb'], ['SHENZHOU-23 (SZ-23)', 'soyuz-ms.glb'],
    ['CSS (TIANHE)', 'tianzhou.glb', 'station'], ['CZ-2F R/B', 'shenzhou.glb', 'rocket'], ['FALCON 9 R/B', 'dragon-crew.glb', 'rocket'], ['DRAGONFLY', 'dragon-crew.glb'], ['SNAPDRAGON', 'dragon-cargo.glb']]) {
    const got = visit(name, klass || 'satellite');
    check(!got || got.file !== file, `${name} does not wear ${file}: ${JSON.stringify(got && got.file)}`);
  }
  // `axes: 'app'` only on files built to the app's axes HERE (scene/heroes.js then keeps the build's
  // attitude): never on a published mesh, whose axes say nothing about which way the craft points.
  for (const r of routes) if (r.entry && r.entry.axes !== undefined) check(r.entry.axes === 'app' && !!r.entry.made, `${r.table}[${r.key}] says axes: ${JSON.stringify(r.entry.axes)}; only a file made here (made:) may say axes: 'app'`);
  if (typeof drawingLine === 'function') {
    // HITOMI IS DRAWN WHOLE AND IS A WRECK: its card must say so, after how the shape was made.
    const h = drawingLine({ id: 'sat-41337', name: 'ASTRO-H (HITOMI)', klass: 'satellite', layer: 'visual', meta: { noradId: 41337 } }, Date.UTC(2026, 9, 13));
    const was = COPY.drawing.objectWas && COPY.drawing.objectWas.hitomi;
    check(typeof was === 'string' && /broke apart/.test(was) && /main body/.test(was), `COPY.drawing.objectWas.hitomi says the craft broke apart and what is tracked is its main body: ${JSON.stringify(was)}`);
    check(typeof h === 'string' && h.startsWith('drawn as Hitomi') && h.includes(sentences.render) && h.endsWith(was), `Hitomi's card says it is drawn as Hitomi, from a render, and that it is shown whole though it broke apart: ${JSON.stringify(h)}`);
    for (const r of routes) if (r.entry && r.entry.was !== undefined) check(typeof (COPY.drawing.objectWas || {})[r.entry.was] === 'string', `${r.table}[${r.key}] says was: '${r.entry.was}', and COPY.drawing.objectWas has no such sentence`);
    const lg = drawingLine({ id: 'sat-8820', name: 'LAGEOS 1', klass: 'satellite', layer: 'active', meta: { noradId: 8820 } }, Date.UTC(2026, 9, 13));
    check(typeof lg === 'string' && lg.startsWith('drawn as LAGEOS') && lg.includes(sentences.dimensions) && !/kind of thing/.test(lg), `LAGEOS 1's card says it is drawn as LAGEOS, built from dimensions: ${JSON.stringify(lg)}`);
  }
  if (made.length && typeof drawingLine === 'function') {
    const line = drawingLine({ id: 'sat-68689', name: 'CYGNUS NG-24', klass: 'satellite', layer: 'stations', meta: { noradId: 68689 } }, Date.UTC(2026, 9, 12));
    check(typeof line === 'string' && line.includes(copy) && line.includes('the kind of thing'), `the card of a Cygnus says both that it is the kind of thing and how the shape was made: ${JSON.stringify(line)}`);
  } else if (made.length) problems.push('ui/cards.js could not be imported in node, so the card line of a generated model was not read');
}

if (problems.length) { console.error('real models FAILED:\n  ' + problems.slice(0, 40).join('\n  ') + (problems.length > 40 ? `\n  ... and ${problems.length - 40} more` : '')); process.exit(1); }
console.log(`real models ok: ${rows.length} models on disc are binary glTF 2 with meshes (${triangles} triangles in all), each worn by a route (${rows.filter(waiting).map((r) => r.id).join(', ') || 'none'} waiting, and saying so) and each route's file a row; ${own} craft with a route of their own get it from realModelFor, none a generic shape (${generic} routes are a class's shape and say so)`);
