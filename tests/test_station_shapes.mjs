// The procedural visiting-vehicle shapes (spec 0027): they build, they fit their budget, and the
// name route picks them for the right records only.
//   node tests/test_station_shapes.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { modelFor, modelVariants, disposeModels } = await import(join(ROOT, 'site/js/scene/models.js'));
const { realModelFor } = await import(join(ROOT, 'site/js/scene/realmodels.js'));
const yaml = readFileSync(join(ROOT, 'registry/models.yaml'), 'utf8');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const tris = (obj) => { let n = 0; obj.traverse((o) => { if (o.isMesh && o.geometry) { const g = o.geometry; n += g.index ? g.index.count / 3 : g.attributes.position.count / 3; } }); return n; };
const budgetOf = (id) => Number(((yaml.split('\n').find((l) => l.includes(`id: ${id},`)) || '').match(/budget_tris:\s*(\d+)/) || [])[1] || 0);

for (const v of ['soyuz', 'progress']) {
  check(modelVariants().station.includes(v), `station variant ${v} is registered`);
  const obj = modelFor('station', v);
  check(!obj.userData.generic, `${v} is a real variant, not a fallback`);
  const n = tris(obj); const b = budgetOf(`station-${v}`);
  check(b > 0, `models.yaml has a budget for station-${v}`);
  check(n > 0 && n <= b, `${v} builds ${n} triangles within its budget of ${b}`);
  check(obj.userData.realSizeM > 10 && obj.userData.realSizeM < 11, `${v} is about 10.7 m across the wings, got ${obj.userData.realSizeM}`);
  disposeModels(obj);
}
const soyuzRec = { id: 'sat-1', name: 'SOYUZ-MS 28', klass: 'station', layer: 'stations', meta: { noradId: 1 } };
const progRec = { id: 'sat-2', name: 'PROGRESS-MS 35', klass: 'station', layer: 'stations', meta: { noradId: 2 } };
const debRec = { id: 'sat-3', name: 'SOYUZ-MS DEB', klass: 'debris', layer: 'active', meta: { noradId: 3 } };
const iss = { id: 'sat-25544', name: 'ISS (ZARYA)', klass: 'station', layer: 'stations', meta: { noradId: 25544 } };
const e1 = realModelFor(soyuzRec), e2 = realModelFor(progRec), e3 = realModelFor(debRec), e4 = realModelFor(iss);
check(e1 && e1.build === 'soyuz' && e1.generic === true && !e1.file, `SOYUZ-MS -> build soyuz, generic: ${JSON.stringify(e1)}`);
check(e2 && e2.build === 'progress' && e2.generic === true, `PROGRESS-MS -> build progress: ${JSON.stringify(e2)}`);
check(e3 === null, 'Soyuz debris keeps the debris shape');
check(e4 && e4.file === 'iss.glb', 'the ISS keeps its own file (the id route wins)');
if (problems.length) { console.log(`station shapes: ${problems.length} problem(s)`); for (const p of problems) console.log('  - ' + p); process.exit(1); }
console.log('station shapes ok: Soyuz and Progress build inside budget at 10.7 m, and the name route picks them for stations-layer vehicles only');
