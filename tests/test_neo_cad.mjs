// tests/test_neo_cad.mjs -- a listed close approach is drawn where JPL's close-approach table has it (internal #392, review of 2026-11-16).
// The saved SBDB rows carried four figures (a = 1.823, ma = 294.29); registry/sources.yaml now asks sbdb_query with full-prec=1.
// tests/fixtures/neo_fullprec_cad.json holds the full-precision SBDB elements read 2026-11-16 and the CAD rows of the same day for
// three objects of the saved list. The app's two-body path (parsers.parseNeoApproaches + propagate/kepler.js, the Earth of frames.js)
// must pass Earth within TOL_PCT of CAD's distance and TOL_H hours of CAD's time. Measured 2026-11-16: VW15 0.84 % and 0.83 h, VJ13
// 0.31 % and 0.33 h, VM3 0.98 % and 1.33 h.
// 2026 QQ8 (a = 0.9887 au, e = 0.026, 3.5 lunar distances on 13 December) is held only through the second pass below: a two-body orbit from
// SBDB's own epoch (8 June 2026, 188 days before the pass) puts it 16.7 lunar distances out, because the pass of such a slow Earth-like orbit
// depends on the perturbations in between. The harvester (harvest/neo_elements.py) therefore replaces each listed object's elements with JPL
// Horizons' at the epoch of its CAD approach; tests/fixtures/neo_horizons_elements.json holds Horizons' answers, and the second pass runs the
// real harvester function over them (python3) and holds ALL FOUR objects to the same limits.
//   node tests/test_neo_cad.mjs
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const { parseNeoApproaches } = await import(join(JS, 'data/parsers.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const frames = await import(join(JS, 'propagate/frames.js'));
const fx = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/neo_fullprec_cad.json'), 'utf8'));
const SBDB_PCT = 1.5;
const SBDB_H = 2;
const HZ_PCT = 0.5; // measured 0.00 to 0.12 %, 0 to 0.33 h
const HZ_H = 1;
const AU = 149597870.7;
function pass(label, sbdb, skip, TOL_PCT, TOL_H) {
  const recs = parseNeoApproaches(fx.cad, sbdb);
  const done = [];
  for (const row of fx.cad.data) {
    const des = row[0];
    if (skip.includes(des)) continue; // see the head of this file
    const rec = recs.find((r) => r.meta.designation === des);
    if (!rec) { check(false, `${label} ${des}: no record`); continue; }
    const caMs = (Number(row[2]) - 2440587.5) * 86400000 - 69184; // CAD's jd is TDB
    const distKm = Number(row[4]) * AU;
    let best = { d: Infinity, t: 0 };
    for (let t = caMs - 3 * 3600e3 * 24; t <= caMs + 3 * 3600e3 * 24; t += 600e3) {
      const p = propagate(rec, t);
      const e = frames.worldHelioEclKm('earth', t);
      const d = Math.hypot(p.x - e.x, p.y - e.y, p.z - e.z);
      if (d < best.d) best = { d, t };
    }
    const pct = (100 * Math.abs(best.d - distKm)) / distKm;
    const hours = Math.abs(best.t - caMs) / 3600e3;
    done.push(`${des} ${pct.toFixed(2)} % ${hours.toFixed(2)} h`);
    check(pct <= TOL_PCT, `${label} ${des}: closest ${(best.d / 384400).toFixed(3)} lunar distances against CAD's ${(distKm / 384400).toFixed(3)} (${pct.toFixed(2)} %, over ${TOL_PCT} %)`);
    check(hours <= TOL_H, `${label} ${des}: closest ${hours.toFixed(2)} h from CAD's time, over ${TOL_H} h`);
  }
  return done;
}
const done = pass('SBDB elements', fx.sbdb, ['2026 QQ8'], SBDB_PCT, SBDB_H);
check(done.length === 3, `three objects held on SBDB's elements (${done.length})`);
// Pass two: the harvester's own function over Horizons' stored answers.
const py = spawnSync('python3', ['-c', `
import json, sys
sys.path.insert(0, '.')
from harvest import neo_elements as ne, fetch
fx = json.load(open('tests/fixtures/neo_fullprec_cad.json'))
hz = json.load(open('tests/fixtures/neo_horizons_elements.json'))['rows']
def get(url, **kw):
    des = next(d for d in hz if ('DES%3D' + d.replace(' ', '%20')) in url)
    return fetch.Response(url, 200, hz[des]['text'].encode(), 'text/plain', None, None, 1)
body, n = ne.refine_body(fx['sbdb'], fx['cad'], get, log=lambda *_: None)
print(json.dumps({'n': n, 'body': body}))
`], { cwd: ROOT, encoding: 'utf8' });
check(py.status === 0, `the harvester step ran: ${py.stderr}`);
let refined = null;
if (py.status === 0) {
  refined = JSON.parse(py.stdout);
  check(refined.n === 4, `Horizons elements for four objects (${refined.n})`);
  const done2 = pass('Horizons elements', refined.body, [], HZ_PCT, HZ_H);
  check(done2.length === 4, `four objects held on Horizons' elements (${done2.length})`);
  done.push(...done2.map((x) => 'harvested ' + x));
}
if (problems.length) { console.error('neo vs cad FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`neo vs cad ok: closest approach against JPL CAD, ${done.join('; ')} (limits ${SBDB_PCT} % and ${SBDB_H} h on SBDB's elements, ${HZ_PCT} % and ${HZ_H} h on Horizons')`);
