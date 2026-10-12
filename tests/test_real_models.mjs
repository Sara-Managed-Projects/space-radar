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

if (problems.length) { console.error('real models FAILED:\n  ' + problems.slice(0, 40).join('\n  ') + (problems.length > 40 ? `\n  ... and ${problems.length - 40} more` : '')); process.exit(1); }
console.log(`real models ok: ${rows.length} models on disc are binary glTF 2 with meshes (${triangles} triangles in all), each worn by a route (${rows.filter(waiting).map((r) => r.id).join(', ') || 'none'} waiting, and saying so) and each route's file a row; ${own} craft with a route of their own get it from realModelFor, none a generic shape (${generic} routes are a class's shape and say so)`);
