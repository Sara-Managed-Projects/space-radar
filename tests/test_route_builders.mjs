// EVERY ROUTE THAT AUTHORISES A CLASS MUST DRAW ITS SHAPE FOR THAT CLASS.
//
// realmodels.js routes a record to a procedural builder by name and gates the route by klass:
// `'crew dragon'` accepts a station or a satellite, because CelesTrak files a visiting vehicle
// under whichever it likes. The builders, though, live in ONE row of models.js's registry --
// `dragon`, `soyuz`, `progress`, `cygnus`, `shenzhou`, `tianzhou` all under `station`.
//
// So a Progress the catalogue calls a satellite was routed correctly, asked the `satellite` row
// for `progress`, found nothing, and was drawn as a comms satellite with a dish. Measured on the
// live stations layer on 2026-09-21: six visiting vehicles -- two Progress, a Crew Dragon, a
// Cygnus, a Tianzhou and a Shenzhou -- and all six were the wrong kind of spacecraft.
//
// This walks EVERY route with a `build` and every klass its gate admits, and asks the question
// the way heroes.js does. It covers the whole shape of the bug, not the six that were caught.
import assert from 'node:assert';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { REAL_MODELS, realModelFor } = await import(join(ROOT, 'site/js/scene/realmodels.js'));
const { modelFor, builderKlass, disposeModels } = await import(join(ROOT, 'site/js/scene/models.js'));

const problems = [];
let pairs = 0;
const draw = (klass, build) => {
  const obj = modelFor(builderKlass(klass, build), build);
  const generic = obj.userData.generic;
  disposeModels(obj);
  return generic;
};

// 1. every named route, every class its gate admits
for (const [key, route] of Object.entries(REAL_MODELS.named)) {
  if (!route || !route.build) continue;
  const gate = Array.isArray(route.klass) && route.klass.length ? route.klass : ['satellite'];
  for (const klass of gate) {
    pairs++;
    if (draw(klass, route.build)) problems.push(`named '${key}' admits klass ${klass} but build '${route.build}' falls back to a generic shape`);
  }
}
// 2. the id routes: whatever klass the record turns out to be, a build must resolve somewhere.
for (const table of ['norad', 'horizons']) {
  for (const [id, route] of Object.entries(REAL_MODELS[table] || {})) {
    if (!route || !route.build) continue;
    for (const klass of ['satellite', 'station', 'telescope', 'probe', 'rocket']) {
      pairs++;
      if (draw(klass, route.build)) problems.push(`${table} ${id} build '${route.build}' has no builder in any row`);
      break; // one klass is enough to prove the builder exists; builderKlass finds its row
    }
  }
}

// 3. the reported case end to end, through realModelFor as heroes.js calls it
const progress = { id: 'sat-99991', name: 'PROGRESS-MS 31', klass: 'satellite', layer: 'stations', meta: {} };
const route = realModelFor(progress);
assert.ok(route && route.build === 'progress', `PROGRESS-MS 31 should route to progress, got ${JSON.stringify(route)}`);
const obj = modelFor(builderKlass(progress.klass, route.build), route.build, { record: progress });
if (obj.userData.generic) problems.push('PROGRESS-MS 31, filed as a satellite, is drawn as a generic comms satellite, not a Progress');
disposeModels(obj);

// 4. builderKlass does not move anything that already had a home, or invent one
assert.equal(builderKlass('telescope', 'gaia'), 'telescope');
assert.equal(builderKlass('satellite', 'starlink-v2'), 'satellite');
assert.equal(builderKlass('satellite', 'no-such-shape'), 'satellite', 'an unknown variant stays put and falls back as before');
assert.equal(builderKlass('satellite', undefined), 'satellite');
assert.equal(builderKlass('asteroid', 'constructor'), 'asteroid', 'own properties only');

if (problems.length) {
  console.log(`route builders: ${problems.length} problem(s)`);
  for (const p of problems) console.log('  ' + p);
  process.exit(1);
}
console.log(`route builders ok: ${pairs} (route, klass) pairs each draw their own shape`);
