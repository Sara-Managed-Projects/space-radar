// The two parsers that turn harvested JPL snapshots into records -- asteroids from the
// close-approach table joined to the SBDB, and the deep-space craft from Horizons vectors -- run
// against fixtures cut from the REAL snapshots the harvester wrote on 2026-09-08. Plus the loader's
// rule: a real body wins, a stand-in appears only when the snapshot is missing.
//
//   node tests/test_snapshot_parsers.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const fx = (n) => JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/snapshots', n), 'utf8')).body;

const { horizonsSamples, parseHorizonsVectors, parseNeoApproaches } = await import(join(JS, 'data/parsers.js'));
const { sampleDeepSpace, sampleAsteroids } = await import(join(JS, 'data/sample.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));

const AU_KM = 149597870.7;
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// --- Horizons -------------------------------------------------------------------------------
const hz = fx('horizons-deep-space.json');
const v1 = horizonsSamples(hz['-31']);
check(v1.length === 3, `Voyager 1: 3 sample rows expected, got ${v1.length}`);
const r = Math.hypot(v1[0].x, v1[0].y, v1[0].z) / AU_KM;
check(Math.abs(r - 171.7) < 1.5, `Voyager 1 |r| should be about 171.7 au on 2026-09-07, got ${r.toFixed(2)}`);
check(v1[0].z / (r * AU_KM) > 0.5, 'Voyager 1 z/r should be ~0.58: the ECLIPTIC frame, which is sun-inertial here');
check(v1[1].tMs - v1[0].tMs === 6 * 3600 * 1000, 'samples six hours apart');
check(horizonsSamples('no block here').length === 0, 'text without $$SOE yields no samples, not a throw');
check(horizonsSamples(null).length === 0, 'null yields no samples');

const base = sampleDeepSpace();
const deep = parseHorizonsVectors(hz, base);
check(deep.length === base.length, 'every stand-in record is still present (none dropped)');
const byId = new Map(deep.map((d) => [d.id, d]));
const dv1 = byId.get('deep-voyager-1');
const dpsp = byId.get('deep-parker');
const djuno = byId.get('deep-juno'); // -61 is NOT in the fixture -> must stay the stand-in
check(dv1 && dv1.propagator === 'sampled' && dv1.cls === 'measured', 'Voyager 1 becomes sampled + measured');
check(dv1 && dv1.samples && dv1.samples.length === 3 && dv1.elements === undefined, 'Voyager 1 carries samples and no elements');
check(dv1 && dv1.meta.approxFields.length === 0 && dv1.meta.construction === 'horizons', 'Voyager 1 meta stops claiming an approximation');
check(dpsp && dpsp.cls === 'measured', 'Parker Solar Probe (-96) becomes measured too');
check(djuno && djuno.cls === 'sample' && djuno.propagator === 'kepler', 'Juno, absent from the snapshot, stays the honest stand-in');
check(new Set(deep.map((d) => d.id)).size === deep.length, 'ids stay unique and unchanged');
const pos = dv1 && propagate(dv1, v1[1].tMs + 3 * 3600 * 1000);
check(pos && Math.abs(Math.hypot(pos.x, pos.y, pos.z) / AU_KM - r) < 0.01, 'the sampled propagator interpolates Voyager 1 between two real samples');

// --- NEO approaches -------------------------------------------------------------------------
const neos = parseNeoApproaches(fx('jpl-cad.json'), fx('jpl-sbdb-neo.json'));
check(neos.length === 3, `3 close approaches joined to 3 SBDB orbits, got ${neos.length}`);
const rr1 = neos.find((n) => n.meta.designation === '2026 RR1');
check(rr1 && rr1.name === '2026 RR1', 'an unnumbered body is named by its designation without brackets');
check(rr1 && rr1.cls === 'inferred' && rr1.propagator === 'kepler' && rr1.frame === 'sun-inertial', 'a NEO is inferred, kepler, sun-inertial -- like a comet');
check(rr1 && rr1.meta.closeApproachLunarDistances > 0 && rr1.meta.closeApproachLunarDistances < 10, 'close approach is inside ten lunar distances');
check(rr1 && rr1.elements.aKm > 0 && rr1.elements.e >= 0 && Number.isFinite(rr1.elements.maRad), 'elements carry a, e and the mean anomaly');
const state = rr1 && propagate(rr1, rr1.epoch);
check(state && Math.hypot(state.x, state.y, state.z) / AU_KM > 0.3, 'the kepler propagator places a NEO from these elements');
check(parseNeoApproaches(null, fx('jpl-sbdb-neo.json')).length === 0, 'no CAD table -> no records, not a throw');
check(parseNeoApproaches(fx('jpl-cad.json'), { fields: [], data: [] }).length === 0, 'an empty SBDB -> no records');
// Eros is in the SBDB fixture but not in the CAD fixture: "passing by" is the CAD's list, so no Eros.
check(!neos.some((n) => /Eros/.test(n.name)), 'a body not in the close-approach table is not drawn as passing by');
check(sampleAsteroids().length > 0, 'the stand-in still exists for the day the snapshot is missing');

if (problems.length) {
  console.log(`snapshot parsers: ${problems.length} problem(s)`);
  for (const p of problems) console.log('  - ' + p);
  process.exit(1);
}
console.log('snapshot parsers ok: Horizons vectors become measured sampled records with their ids intact, ' +
  'a missing id keeps its stand-in, and close approaches join the SBDB into inferred kepler records');
