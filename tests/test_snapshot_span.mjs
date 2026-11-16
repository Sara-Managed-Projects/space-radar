// tests/test_snapshot_span.mjs -- the craft drawn from the saved Horizons tables (internal #397, review of 2026-11-16).
//   * Inside a saved table the app reproduces JPL Horizons' hourly vectors (tests/fixtures/horizons_span_reference.json: the
//     table's every 24th row for JWST and every 6th for Parker, JUICE and Solar Orbiter, as the harvester saves them, and the
//     hourly rows between) within a stated tolerance per craft, the flybys and the perihelion included.
//   * Outside the table the answer is null, two days before and two days after, not the first or last sample held: JWST was drawn 3.0
//     million km from Earth, two days before the saved month, against 1.66 million real.
//   node tests/test_snapshot_span.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { parseHorizonsVectors } = await import(join(JS, 'data/parsers.js'));
const { sampleDeepSpace } = await import(join(JS, 'data/sample.js'));
const fx = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/horizons_span_reference.json'), 'utf8'));
const DAY = 86400e3;

const worst = {};
for (const [id, c] of Object.entries(fx.craft)) {
  const rec = { id: 'x' + id, propagator: 'sampled', frame: 'sun-inertial', cls: 'measured', samples: c.samples };
  let w = 0;
  for (const q of c.checks) {
    const p = propagate(rec, q.tMs);
    if (!p) { check(false, `${c.name}: no position at ${new Date(q.tMs).toISOString()} inside the table`); continue; }
    w = Math.max(w, Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z));
  }
  worst[c.name] = Math.round(w);
  check(w <= c.tolKm, `${c.name}: worst miss against Horizons ${Math.round(w)} km, over its stated ${c.tolKm} km`);
  const first = c.samples[0].tMs;
  const last = c.samples[c.samples.length - 1].tMs;
  check(propagate(rec, first - 2 * DAY) === null && propagate(rec, first - 1000 - 1) === null, `${c.name}: two days before the table there is no position (it was a place millions of km out)`);
  check(propagate(rec, last + 2 * DAY) === null && propagate(rec, last + 8 * DAY) === null, `${c.name}: after the table there is no position`);
  check(propagate(rec, first) !== null && propagate(rec, last) !== null, `${c.name}: both ends of the table answer`);
}

// The records the app builds from a saved snapshot carry the table's span, which the card reads (ui/missions.js).
const snap = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/snapshots/horizons-deep-space.json'), 'utf8')).body;
const recs = parseHorizonsVectors(snap, sampleDeepSpace());
const jwst = recs.find((r) => r.id === 'deep-voyager-1');
check(jwst && jwst.propagator === 'sampled' && Number.isFinite(jwst.meta.samplesFromMs) && jwst.meta.samplesToMs > jwst.meta.samplesFromMs, 'Voyager 1 from the snapshot is a sampled record that says its span');
if (jwst) {
  const mid = (jwst.meta.samplesFromMs + jwst.meta.samplesToMs) / 2;
  check(propagate(jwst, mid) !== null, 'Voyager 1: inside its table it is drawn');
  check(propagate(jwst, jwst.meta.samplesFromMs - 2 * DAY) === null, 'Voyager 1: two days before its table it is not drawn');
  check(propagate(jwst, jwst.meta.samplesToMs + 3 * DAY) === null, 'Voyager 1: three days after its table it is not drawn');
  check(/every (day|six hours|hour)|every \w+ hours/.test(jwst.meta.why), `the card's source sentence names the table's step: ${jwst.meta.why}`);
}

if (problems.length) { console.error('snapshot span FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('snapshot span ok: against Horizons\' hourly vectors, worst miss in km ' + Object.entries(worst).map(([k, v]) => `${k} ${v}`).join(', ') + '; two days outside a saved table a craft has no position, and a record says its span');
