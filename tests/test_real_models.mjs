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
// A route that picks its file from the record (Starlink, by launch year, batch five): each answer is a
// route of its own here, or the first generation's file would be worn by nothing this list can see.
for (const year of [2020, 2025]) {
  routes.push({ table: 'named', key: `starlink@${year}`, entry: realModelFor({ id: `sl-${year}`, name: 'STARLINK-1007', klass: 'satellite', layer: 'active', meta: { noradId: 99000, launchYear: year } }) });
}
// Batch six: the navigation rows pick a file from the record's launch year or name; each answer is a route here.
for (const [name, year] of [['NAVSTAR 56 (USA 180)', 2004], ['NAVSTAR 71 (USA 256)', 2014], ['NAVSTAR 81 (USA 319)', 2021], ['GSAT0210 (GALILEO 13)', 2016], ['QZS-2 (MICHIBIKI-2)', 2017], ['IRNSS-1B', 2014]]) {
  routes.push({ table: 'named', key: `${name}@${year}`, entry: realModelFor({ id: `nav-${name}`, name, klass: 'satellite', layer: 'active', meta: { noradId: 99200, launchYear: year } }) });
}
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
    [19751, 'COSMOS 1989 (ETALON 1)', 'etalon.glb', 'dimensions'], [20026, 'COSMOS 2024 (ETALON 2)', 'etalon.glb', 'dimensions'], [25398, 'WESTPAC', 'westpac.glb', 'dimensions'],
    // THE FOURTH BATCH (2026-10-13, public #953, #954, #965): three NASA craft built from dimensions.
    [65053, 'NISAR', 'nisar.glb', 'dimensions'], [49954, 'IXPE', 'ixpe.glb', 'dimensions'], [58928, 'PACE', 'pace.glb', 'dimensions']]) {
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
    [38358, 'NUSTAR', 'ixpe.glb'],               // two X-ray telescopes on a mast, two files (batch four)
    [49954, 'IXPE', 'nustar.glb'],
    [99007, 'PACE', 'pace.glb'],                 // a name is not the route: only catalogue number 58928 is NASA's PACE
    [99008, 'SWOT', 'swot.glb'],
    [39634, 'SENTINEL-1A', 'nisar.glb'],         // a radar satellite with a flat blade is not the mesh reflector
    [46984, 'SENTINEL-6A', 'swot.glb'],          // the other altimeter keeps NASA's model of itself
    [99005, 'SOYUZ-MS 29 DEB', 'soyuz-ms.glb', 'debris'],
    [99006, 'SL-4 R/B', 'soyuz-ms.glb', 'rocket'],   // the Soyuz ROCKET's stage is not the ship
  ]) {
    const got = sat(norad, name, klass || 'satellite');
    check(!got || got.file !== file, `${name} (${norad}) does not wear ${file}`);
  }
  // THE FIFTH BATCH (2026-10-13, public #983, #998, #1000): three commercial craft BY NAME, each a
  // file over the build it replaces, as the kind of thing. The launch-year gate is the same gate.
  for (const [name, year, file, build] of [['STARLINK-1007', 2019, 'starlink-v1.glb', 'starlink-v1'], ['STARLINK-4321', 2022, 'starlink-v1.glb', 'starlink-v1'],
    ['UMBRA-07', undefined, 'umbra.glb', 'radar-mesh'], ['ICEYE-X2', undefined, 'iceye.glb', 'radar'], ['ICEYE-X31', undefined, 'iceye.glb', 'radar']]) {
    const got = realModelFor({ id: `b5-${name}`, name, klass: 'satellite', layer: 'active', meta: { noradId: 99100, launchYear: year } });
    check(got && got.file === file && got.build === build && got.generic === true && got.made === 'dimensions' && got.axes === 'app', `${name} (launched ${year}) wears ${file} over the build ${build}, as the kind of thing: ${JSON.stringify(got)}`);
  }
  // The V2 Mini keeps its build and wears NO file (public #999 stays open: its file was not clearly better).
  for (const [name, year] of [['STARLINK-5001', 2023], ['STARLINK-33001', 2026], ['STARLINK-9999', undefined]]) {
    const got = realModelFor({ id: `b5v2-${name}`, name, klass: 'satellite', layer: 'active', meta: { noradId: 99102, launchYear: year } });
    check(got && got.build === 'starlink-v2' && !got.file && !got.made && !got.axes && got.generic === true, `${name} (launched ${year}) keeps the procedural V2 Mini: ${JSON.stringify(got)}`);
  }
  for (const [name, klass, file] of [['STARLINK-1007 DEB', 'debris', 'starlink-v1.glb'], ['UMBRA-07 DEB', 'debris', 'umbra.glb'], ['ICEYE-X2 DEB', 'debris', 'iceye.glb'],
    ['CAPELLA-11 (ACADIA-1)', 'satellite', 'umbra.glb'],          // Capella's dish is offset-fed on a boom: not Umbra's plan
    ['QPS-SAR-5 (TSUKUYOMI-I)', 'satellite', 'umbra.glb'],
    ['PENUMBRA-1', 'satellite', 'umbra.glb'],                     // a whole word, not letters inside one
    ['STRIX-1', 'satellite', 'iceye.glb'], ['SENTINEL-1A', 'satellite', 'iceye.glb'], ['NICEYE-1', 'satellite', 'iceye.glb'],
    ['ONEWEB-0012', 'satellite', 'starlink-v1.glb'], ['KUIPER-00008', 'satellite', 'starlink-v1.glb']]) {
    const got = realModelFor({ id: `b5n-${name}`, name, klass, layer: 'active', meta: { noradId: 99101, launchYear: 2020 } });
    check(!got || got.file !== file, `${name} (klass ${klass}) does not wear ${file}`);
  }
  // THE SIXTH BATCH (2026-10-13, public #985, #986, #989, #990, #978): the navigation constellations keep every
  // key and gate they had; a file is an answer chosen from the record's own name or launch year.
  const nav = (name, launchYear, klass = 'satellite', noradId = 99300) => realModelFor({ id: `b6-${name}`, name, klass, layer: 'active', meta: { noradId, launchYear } });
  for (const [name, year, file, build, called] of [
    ['NAVSTAR 43 (USA 132)', 1997, 'gps-iir.glb', 'navigation', 'a GPS Block IIR navigation satellite'], ['NAVSTAR 46 (USA 145)', 1999, 'gps-iir.glb', 'navigation', 'a GPS Block IIR navigation satellite'],
    ['NAVSTAR 64 (USA 206)', 2009, 'gps-iir.glb', 'navigation', 'a GPS Block IIR navigation satellite'], ['GPS BIIR-5  (PRN 22)', 2000, 'gps-iir.glb', 'navigation', 'a GPS Block IIR navigation satellite'],
    ['NAVSTAR 65 (USA 213)', 2010, 'gps-iif.glb', 'navigation-gps-iif', 'a GPS Block IIF navigation satellite'], ['NAVSTAR 76 (USA 266)', 2016, 'gps-iif.glb', 'navigation-gps-iif', 'a GPS Block IIF navigation satellite'],
    ['NAVSTAR 77 (USA 289)', 2018, 'gps-iii.glb', 'navigation-gps-iii', 'a GPS III navigation satellite'], ['NAVSTAR 86 (USA 585)', 2026, 'gps-iii.glb', 'navigation-gps-iii', 'a GPS III navigation satellite'],
    ['GSAT0201 (GALILEO 5)', 2014, 'galileo-foc.glb', 'navigation', 'a Galileo navigation satellite'], ['GSAT0234 (GALILEO 34)', 2025, 'galileo-foc.glb', 'navigation', 'a Galileo navigation satellite'],
    ['QZS-2 (MICHIBIKI-2)', 2017, 'michibiki.glb', 'navigation', 'a QZSS navigation satellite'], ['QZS-4 (MICHIBIKI-4)', 2017, 'michibiki.glb', 'navigation', 'a QZSS navigation satellite'],
    ['IRNSS-1A', 2013, 'irnss.glb', 'navigation', 'an IRNSS navigation satellite'], ['IRNSS-1I', 2018, 'irnss.glb', 'navigation', 'an IRNSS navigation satellite']]) {
    const got = nav(name, year);
    check(got && got.file === file && got.build === build && got.name === called && got.generic === true && got.made === 'dimensions' && got.axes === 'app', `${name} (launched ${year}) wears ${file} over the build ${build}, as the kind of thing: ${JSON.stringify(got)}`);
  }
  // What no file was built for keeps the family box and wears NO file: another block, another maker's bus, another antenna.
  for (const [name, year] of [['NAVSTAR 38 (USA 135)', 1997], ['NAVSTAR 30 (USA 100)', 1996], ['NAVSTAR 90 (USA 999)', 2017], ['NAVSTAR 81 (USA 319)', undefined],
    ['GSAT0101 (GALILEO-PFM)', 2011], ['GSAT0103 (GALILEO-FM3)', 2012], ['GSAT0301 (GALILEO 35)', 2027],
    ['QZS-1R (MICHIBIKI-1R)', 2021], ['QZS-3 (MICHIBIKI-3)', 2017], ['QZS-6 (MICHIBIKI-6)', 2025], ['QZS-7 (MICHIBIKI-7)', 2026],
    ['NVS-01 (IRNSS-1J)', 2023], ['IRNSS-1J', 2023], ['BEIDOU-3 M1', 2017], ['BEIDOU-2 G1', 2010]]) {
    const got = nav(name, year);
    check(got && String(got.build).startsWith('navigation') && !got.file && !got.made && !got.axes && got.generic === true, `${name} (launched ${year}) keeps a procedural navigation shape and wears no file: ${JSON.stringify(got)}`);
  }
  // One constellation's or block's file never reaches another's craft, debris, or a communications satellite that carries a navigation payload.
  const sixth = ['gps-iir.glb', 'gps-iif.glb', 'gps-iii.glb', 'galileo-foc.glb', 'michibiki.glb', 'irnss.glb', 'saocom.glb'];
  for (const [name, year, klass, id] of [['NAVSTAR 56 (USA 180) DEB', 2004, 'debris'], ['GSAT0210 (GALILEO 13) DEB', 2016, 'debris'], ['IRNSS-1A DEB', 2013, 'debris'], ['QZS-2 DEB', 2017, 'debris'],
    ['GSAT-10', 2012, 'satellite'], ['GSAT-15', 2015, 'satellite'], ['GSAT0210', 2016, 'satellite'], ['COSMOS 2433 [GLONASS-M]', 2007, 'satellite', 32275], ['GLONASS 701K', 2011, 'satellite'],
    ['INMARSAT 4-F2', 2005, 'satellite'], ['SES-5', 2012, 'satellite'], ['QZS-20', 2030, 'satellite'], ['AQZS-2', 2017, 'satellite'],
    ['SAOCOM 1A DEB', 2018, 'debris'], ['SAOCOM 2A', 2030, 'satellite'], ['SENTINEL-1A', 2014, 'satellite', 39634], ['TERRASAR-X', 2007, 'satellite', 31698], ['PAZ', 2018, 'satellite']]) {
    const got = nav(name, year, klass, id);
    check(!got || !sixth.includes(got.file), `${name} (klass ${klass}, launched ${year}) wears none of batch six's files: ${JSON.stringify(got)}`);
  }
  const worn = (name, year, file) => { const g = nav(name, year); return g && g.file === file; };
  check(!worn('NAVSTAR 65 (USA 213)', 2010, 'gps-iir.glb') && !worn('NAVSTAR 64 (USA 206)', 2009, 'gps-iif.glb') && !worn('NAVSTAR 76 (USA 266)', 2016, 'gps-iii.glb') && !worn('NAVSTAR 77 (USA 289)', 2018, 'gps-iif.glb'), 'the edges of the GPS blocks: 2009 is IIR, 2010 and 2016 are IIF, 2018 is III');
  // SAOCOM 1A and 1B by number, as themselves; the radar blade is only what is drawn while the file loads.
  for (const [norad, name] of [[43641, 'SAOCOM 1A'], [46265, 'SAOCOM 1B']]) {
    const got = sat(norad, name);
    check(got && got.file === 'saocom.glb' && got.build === 'radar' && got.name === name && !got.generic && got.made === 'dimensions' && got.axes === 'app', `${name} (${norad}) wears saocom.glb as itself: ${JSON.stringify(got)}`);
  }
  // BATCH SEVEN (public #992, #966, #979, #984): MetOp-B and -C, XMM-Newton, TerraSAR-X and TanDEM-X by number; StriX by name.
  for (const [norad, cat, name, file, build] of [[38771, 'METOP-B', 'MetOp-B', 'metop.glb', undefined], [43689, 'METOP-C', 'MetOp-C', 'metop.glb', undefined],
    [25989, 'XMM-NEWTON', 'XMM-Newton', 'xmm-newton.glb', undefined], [31698, 'TERRASAR-X', 'TerraSAR-X', 'terrasar-x.glb', 'radar'], [36605, 'TANDEM-X', 'TanDEM-X', 'terrasar-x.glb', 'radar']]) {
    const got = sat(norad, cat);
    check(got && got.file === file && got.build === build && got.name === name && !got.generic && got.made === 'dimensions' && got.axes === 'app', `${cat} (${norad}) wears ${file} as itself: ${JSON.stringify(got)}`);
  }
  for (const name of ['STRIX-1', 'STRIX-3', 'STRIX-12']) {
    const got = nav(name, 2024);
    check(got && got.file === 'strix.glb' && got.build === 'radar' && got.generic === true && got.made === 'dimensions' && got.axes === 'app' && got.name === 'a StriX radar satellite', `${name} wears strix.glb over the radar blade, as the kind of thing: ${JSON.stringify(got)}`);
  }
  // None of the four files reaches another craft: a newer MetOp, debris, a rocket body, the same design under another name, a name that only contains the word.
  const seventh = ['metop.glb', 'xmm-newton.glb', 'terrasar-x.glb', 'strix.glb'];
  for (const [name, year, klass, id] of [['METOP-SGA1', 2025, 'satellite', 65140], ['METOP-A', 2006, 'satellite', 29499], ['METOP-B DEB', 2012, 'debris'], ['FREGAT R/B', 2012, 'rocket-body'],
    ['XMM-NEWTON DEB', 1999, 'debris'], ['ARIANE 5 R/B', 1999, 'rocket-body'], ['PAZ', 2018, 'satellite'], ['TERRASAR-X DEB', 2007, 'debris'], ['STRIX-1 DEB', 2022, 'debris'],
    ['ASTRIX-1', 2024, 'satellite'], ['ICEYE-X2', 2018, 'satellite'], ['SENTINEL-1A', 2014, 'satellite', 39634], ['NOAA 21 (JPSS-2)', 2022, 'satellite', 54234], ['XRISM', 2023, 'satellite', 57800]]) {
    const got = nav(name, year, klass, id);
    check(!got || !seventh.includes(got.file), `${name} (klass ${klass}, launched ${year}) wears none of batch seven's files: ${JSON.stringify(got)}`);
  }
  // BATCH EIGHT (public #944, #945, #948, #949, #950): Envisat, ERS-1, Sentinel-1, -2 and -3A/B by number; Sentinel-3C by name.
  for (const [norad, cat, name, file, build, was] of [[27386, 'ENVISAT', 'Envisat', 'envisat.glb', 'radar', 'envisat'], [21574, 'ERS-1', 'ERS-1', 'ers-1.glb', 'radar', 'ers1'],
    [39634, 'SENTINEL-1A', 'Sentinel-1A', 'sentinel-1.glb', 'radar'], [41456, 'SENTINEL-1B', 'Sentinel-1B', 'sentinel-1.glb', 'radar'], [62261, 'SENTINEL-1C', 'Sentinel-1C', 'sentinel-1.glb', 'radar'], [66315, 'SENTINEL-1D', 'Sentinel-1D', 'sentinel-1.glb', 'radar'],
    [40697, 'SENTINEL-2A', 'Sentinel-2A', 'sentinel-2.glb'], [42063, 'SENTINEL-2B', 'Sentinel-2B', 'sentinel-2.glb'], [60989, 'SENTINEL-2C', 'Sentinel-2C', 'sentinel-2.glb'],
    [41335, 'SENTINEL-3A', 'Sentinel-3A', 'sentinel-3.glb'], [43437, 'SENTINEL-3B', 'Sentinel-3B', 'sentinel-3.glb']]) {
    const got = sat(norad, cat);
    check(got && got.file === file && got.build === build && got.name === name && !got.generic && got.made === 'dimensions' && got.axes === 'app' && got.was === was, `${cat} (${norad}) wears ${file} as itself: ${JSON.stringify(got)}`);
  }
  {
    // Sentinel-3C: the live saved data has it under 100690, which data/parsers.js reads as a placeholder, so the NAME carries it.
    const got = nav('SENTINEL-3C', 2026, 'satellite', 100690);
    check(got && got.file === 'sentinel-3.glb' && got.name === 'Sentinel-3C' && !got.generic && !got.build && got.made === 'dimensions' && got.axes === 'app', `SENTINEL-3C wears sentinel-3.glb by name: ${JSON.stringify(got)}`);
    check(!Object.prototype.hasOwnProperty.call(REAL_MODELS.norad, 100690), 'no route is keyed on 100690: Sentinel-3C is routed by name');
    // The two dead craft say so on the card, in a sentence of their own after "drawn as".
    for (const key of ['envisat', 'ers1']) {
      const was = COPY.drawing.objectWas && COPY.drawing.objectWas[key];
      check(typeof was === 'string' && /shown steady/.test(was) && /nobody steers it/.test(was), `COPY.drawing.objectWas.${key} says the drawing is steady and the craft is not steered: ${JSON.stringify(was)}`);
    }
    check(/dead since 2012/.test(COPY.drawing.objectWas.envisat), 'Envisat is "dead since 2012" in the drawing line, the words data/layers.js already uses for it');
  }
  // None of the five files reaches another craft: the other Sentinels, debris, a rocket body, a name that only contains the word.
  const eighth = ['envisat.glb', 'ers-1.glb', 'sentinel-1.glb', 'sentinel-2.glb', 'sentinel-3.glb'];
  for (const [name, year, klass, id] of [['SENTINEL-5P', 2017, 'satellite', 42969], ['SENTINEL-6A', 2020, 'satellite', 46984], ['SENTINEL-6B', 2025, 'satellite', 66514], ['SENTINEL-3C DEB', 2026, 'debris'],
    ['SENTINEL-3C R/B', 2026, 'rocket-body'], ['SENTINEL-3CX', 2030, 'satellite'], ['SENTINEL-3D', 2030, 'satellite'], ['SENTINEL-2D', 2030, 'satellite'], ['SENTINEL-1 DEB', 2014, 'debris'], ['ENVISAT DEB', 2002, 'debris'],
    ['ERS-1 DEB', 1991, 'debris'], ['ERS-2', 1995, 'satellite', 23560], ['ERS-17', 1965, 'satellite'], ['ARIANE 40 R/B', 1991, 'rocket-body'], ['METOP-B', 2012, 'satellite', 38771], ['PAZ', 2018, 'satellite'], ['RADARSAT-2', 2007, 'satellite', 32382]]) {
    const got = nav(name, year, klass, id);
    check(!got || !eighth.includes(got.file), `${name} (klass ${klass}, launched ${year}) wears none of batch eight's files: ${JSON.stringify(got)}`);
  }
  // BATCH NINE (public #951, #957, #958, #977): Sentinel-5P, CryoSat-2, SMOS and ALOS-2, each by number. ALOS-2 keeps the radar blade as what is drawn while its file loads.
  for (const [norad, cat, name, file, build] of [[42969, 'SENTINEL-5P', 'Sentinel-5P', 'sentinel-5p.glb'], [36508, 'CRYOSAT 2', 'CryoSat-2', 'cryosat-2.glb'],
    [36036, 'SMOS', 'SMOS', 'smos.glb'], [39766, 'ALOS-2', 'ALOS-2', 'alos-2.glb', 'radar']]) {
    const got = sat(norad, cat);
    check(got && got.file === file && got.build === build && got.name === name && !got.generic && got.made === 'dimensions' && got.axes === 'app' && !got.was, `${cat} (${norad}) wears ${file} as itself: ${JSON.stringify(got)}`);
  }
  // None of the four files reaches another craft: ALOS and ALOS-4 (other antennas), the RADARSAT and COSMO-SkyMed radars, debris, names that only contain the word.
  const ninth = ['sentinel-5p.glb', 'cryosat-2.glb', 'smos.glb', 'alos-2.glb'];
  for (const [name, year, klass, id] of [['ALOS (DAICHI)', 2006, 'satellite', 28931], ['ALOS-4 (DAICHI-4)', 2024, 'satellite', 60182], ['ALOS-2 DEB', 2014, 'debris'], ['RADARSAT-2', 2007, 'satellite', 32382],
    ['RCM-1', 2019, 'satellite', 44322], ['COSMO-SKYMED 1', 2007, 'satellite', 31598], ['SENTINEL-6A', 2020, 'satellite', 46984], ['SENTINEL-5P DEB', 2017, 'debris'], ['CRYOSAT 2 DEB', 2010, 'debris'],
    ['SMOS DEB', 2009, 'debris'], ['PROBA-1', 2001, 'satellite'], ['ROCKOT R/B', 2009, 'rocket-body'], ['SENTINEL-3A', 2016, 'satellite', 41335]]) {
    const got = nav(name, year, klass, id);
    check(!got || !ninth.includes(got.file), `${name} (klass ${klass}, launched ${year}) wears none of batch nine's files: ${JSON.stringify(got)}`);
  }
  // BATCH TEN (public #988, #995, #996): GLONASS-M and -K wear a file over the build they had, still `generic` as every navigation
  // file is; Himawari-8 and -9 and Fengyun-3A to 3D wear theirs as themselves. BeiDou-3 was built and did not ship: it keeps its shape.
  for (const [norad, cat, name, file] of [[40267, 'HIMAWARI-8', 'Himawari-8', 'himawari.glb'], [41836, 'HIMAWARI-9', 'Himawari-9', 'himawari.glb'],
    [32958, 'FENGYUN 3A', 'Fengyun-3A', 'fengyun-3.glb'], [37214, 'FENGYUN 3B', 'Fengyun-3B', 'fengyun-3.glb'], [39260, 'FENGYUN 3C', 'Fengyun-3C', 'fengyun-3.glb'], [43010, 'FENGYUN 3D', 'Fengyun-3D', 'fengyun-3.glb']]) {
    const got = sat(norad, cat);
    check(got && got.file === file && !got.build && got.name === name && !got.generic && got.made === 'dimensions' && got.axes === 'app', `${cat} (${norad}) wears ${file} as itself: ${JSON.stringify(got)}`);
  }
  for (const [norad, cat, file, build] of [[32275, 'COSMOS 2433 [GLONASS-M]', 'glonass-m.glb', 'navigation-glonass-m'], [54377, 'COSMOS 2564 [GLONASS-M]', 'glonass-m.glb', 'navigation-glonass-m'],
    [40315, 'COSMOS 2501 [GLONASS-K]', 'glonass-k.glb', 'navigation-glonass-k'], [65590, 'COSMOS 2596 [GLONASS-K1]', 'glonass-k.glb', 'navigation-glonass-k']]) {
    const got = sat(norad, cat);
    check(got && got.file === file && got.build === build && got.generic === true && got.made === 'dimensions' && got.axes === 'app', `${cat} (${norad}) wears ${file} over ${build}: ${JSON.stringify(got)}`);
  }
  // A placeholder number (90 000 and up) reaches the `glonass` name key: the bracket decides; K2 keeps the family box.
  for (const [name, file, build] of [['COSMOS 2620 [GLONASS-K1]', 'glonass-k.glb', 'navigation-glonass-k'], ['COSMOS 2699 [GLONASS-M]', 'glonass-m.glb', 'navigation-glonass-m'], ['COSMOS 2650 [GLONASS-K2]', undefined, 'navigation']]) {
    const got = nav(name, 2026, 'satellite', 100744);
    check(got && got.file === file && got.build === build && got.generic === true, `${name} (a placeholder number) is drawn as ${build}${file ? ` wearing ${file}` : ' with no file'}: ${JSON.stringify(got)}`);
  }
  // None of the four files reaches another craft: BeiDou-3 (CAST's and SECM's), BeiDou's other orbits, GLONASS-K2, the second Fengyun-3 batch,
  // Fengyun-4 and -2, the other geostationary weather craft, debris.
  const tenth = ['glonass-m.glb', 'glonass-k.glb', 'fengyun-3.glb', 'himawari.glb'];
  for (const [name, year, klass, id] of [['BEIDOU-3 M1', 2017, 'satellite', 43001], ['BEIDOU-3 M7', 2018, 'satellite', 43107], ['BEIDOU-3 M28', 2024, 'satellite', 61187], ['BEIDOU-3 G2', 2020, 'satellite', 45344], ['BEIDOU-3 IGSO-1', 2019, 'satellite', 44204],
    ['COSMOS 2569 [GLONASS-K2]', 2023, 'satellite', 57517], ['COSMOS 2219', 1992, 'satellite', 22219], ['FENGYUN 3E', 2021, 'satellite', 49008], ['FENGYUN 3G', 2023, 'satellite', 56232],
    ['FENGYUN 4A', 2016, 'satellite', 41882], ['FENGYUN 2H', 2018, 'satellite', 43491], ['FENGYUN 1C DEB', 1999, 'debris', 29716], ['HIMAWARI-7', 2006, 'satellite', 28937], ['ELEKTRO-L 3', 2019, 'satellite', 44903],
    ['BEIDOU-3 M1 DEB', 2017, 'debris']]) {
    const got = nav(name, year, klass, id);
    check(!got || !tenth.includes(got.file), `${name} (klass ${klass}, launched ${year}) wears none of batch ten's files: ${JSON.stringify(got)}`);
  }
  // SWOT is JPL's OWN published model (public #952): its file, as itself, and NOT `made`: nobody here made it.
  {
    const swot = sat(54754, 'SWOT');
    check(swot && swot.file === 'swot.glb' && !swot.made && !swot.generic && swot.axes === 'app', `SWOT (54754) wears swot.glb as a published model of itself, turned to the app's axes: ${JSON.stringify(swot)}`);
    for (const n of [65053, 49954, 58928]) check(sat(n, 'X').axes === 'app', `${n} flies in the app's axes`);
  }
  // THE ELEVENTH BATCH (2026-10-15, public #1075 to #1079): five agencies' own models, none `made`; the
  // ones turned to the app's axes say so, SORCE (a Sun-pointer) is not turned. And the routing-only extras.
  {
    for (const [norad, name, file, axes] of [[41240, 'JASON-3', 'jason-3.glb', 'app'], [40376, 'SMAP', 'smap.glb', 'app'], [27651, 'SORCE', 'sorce.glb', undefined]]) {
      const got = sat(norad, name);
      check(got && got.file === file && !got.made && !got.generic && got.axes === axes, `${name} (${norad}) wears ${file} as a published model of itself${axes ? ', turned to the app\'s axes' : ', not turned'}: ${JSON.stringify(got)}`);
    }
    const ostm = sat(33105, 'JASON-2 (OSTM)');
    check(ostm && ostm.file === 'jason.glb' && !ostm.generic, `JASON-2 (OSTM) keeps NASA's OSTM model, now as itself: ${JSON.stringify(ostm)}`);
    for (const [norad, name, file] of [[66514, 'SENTINEL-6B', 'sentinel6.glb'], [43477, 'GRACE-FO 2', 'grace.glb']]) {
      const got = sat(norad, name);
      check(got && got.file === file && got.generic === true && !got.axes, `${name} (${norad}) wears ${file} as its twin, and says so: ${JSON.stringify(got)}`);
    }
    const s6a = sat(46984, 'SENTINEL-6A');
    check(s6a && s6a.file === 'sentinel6.glb' && !s6a.generic, `SENTINEL-6A keeps NASA's model of itself: ${JSON.stringify(s6a)}`);
    const clipper = realModelFor({ id: 'deep-europa-clipper', name: 'Europa Clipper', klass: 'probe', meta: { horizonsId: -159 } });
    check(clipper && clipper.file === 'europa-clipper.glb' && !clipper.generic && clipper.axes === 'app', `Europa Clipper (Horizons -159) wears NASA's model, turned to the app's axes: ${JSON.stringify(clipper)}`);
    const gale = realModelFor({ id: 'gale', name: 'Curiosity, Gale crater', klass: 'site', meta: { siteShape: 'rover' } });
    const jezero = realModelFor({ id: 'jezero', name: 'Perseverance, Jezero crater', klass: 'site', meta: { siteShape: 'rover' } });
    check(gale && gale.file === 'curiosity.glb' && gale.name === 'Curiosity' && !gale.generic && !gale.axes, `Gale crater draws Curiosity's own model, standing as published: ${JSON.stringify(gale)}`);
    check(jezero && jezero.file === 'perseverance.glb', `Jezero keeps Perseverance: ${JSON.stringify(jezero)}`);
  }
  if (typeof drawingLine === 'function') {
    const line = drawingLine({ id: 'sat-57800', name: 'XRISM', klass: 'satellite', layer: 'visual', meta: { noradId: 57800 } }, Date.UTC(2026, 9, 13));
    check(typeof line === 'string' && line.startsWith('drawn as XRISM') && line.includes(sentences.render) && !/published model/.test(line), `XRISM's card says it is drawn as XRISM from an artist's render, and not from a published model: ${JSON.stringify(line)}`);
    const nu = drawingLine({ id: 'sat-38358', name: 'NUSTAR', klass: 'satellite', layer: 'notable', meta: { noradId: 38358 } }, Date.UTC(2026, 9, 13));
    const sw = drawingLine({ id: 'sat-54754', name: 'SWOT', klass: 'satellite', layer: 'active', meta: { noradId: 54754 } }, Date.UTC(2026, 9, 13));
    check(typeof sw === 'string' && /published model of SWOT/.test(sw) && !sw.includes(sentences.dimensions), `SWOT's card says it is drawn from a published model, and not that it was built here: ${JSON.stringify(sw)}`);
    const ni = drawingLine({ id: 'sat-65053', name: 'NISAR', klass: 'satellite', layer: 'active', meta: { noradId: 65053 } }, Date.UTC(2026, 9, 13));
    check(typeof ni === 'string' && ni.startsWith('drawn as NISAR') && ni.includes(sentences.dimensions) && !/published model/.test(ni), `NISAR's card says it was built from dimensions: ${JSON.stringify(ni)}`);
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
  // 2026-10-13, batch four: ONE OTHER CASE. A published mesh that was TURNED to the app's axes before its
  // bake, as one piece, may say it too, and only when its registry row's `modified:` says so in these
  // words (SWOT, JPL's own model: the altimeter's dish put on +Z, the wings along X).
  const turnedHere = (file) => yaml.split('\n').some((line) => line.includes(`file: site/models/${file},`) && /turned as one piece so that the file's [-xyz, ]+ are the app's \+X, \+Y, \+Z/.test(line));
  for (const r of routes) if (r.entry && r.entry.axes !== undefined) check(r.entry.axes === 'app' && (!!r.entry.made || turnedHere(r.entry.file)), `${r.table}[${r.key}] says axes: ${JSON.stringify(r.entry.axes)}; only a file made here (made:), or a published one whose row says it was turned to the app's axes, may say axes: 'app'`);
  check(!turnedHere('hubble.glb') && turnedHere('swot.glb'), 'the turned-here rule reads the registry: Hubble was not turned, SWOT was');
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
