// tests/test_comet_reference.mjs -- comets from the feed are placed where JPL Horizons has them (internal #393, review of 2026-11-16).
// tests/fixtures/comets_horizons_reference.json (made by scripts/make_comet_reference.mjs) holds, for 2P/Encke, 21P/Giacobini-Zinner and
// 13P/Olbers, the full-precision SBDB row as the jpl-sbdb-comets feed carries it since public #1438, and Horizons' heliocentric ecliptic
// J2000 vectors of each comet and of the Earth at 2026-11-16 06:00 UT. The app's parseComets + two-body propagator must put each comet
// within the stated angle, as seen from Earth, and the stated share of its distance from the Sun.
// Measured 2026-11-17 (full precision): Encke 0.075 deg, 21P 0.355 deg, Olbers 0.180 deg. The review's 4-figure rows read 0.42 deg for
// Encke and 0.18 deg for Olbers: rounding was Encke's cause; for 21P and Olbers it is two-body drift from an epoch 9 and 6 years old, which
// full precision does not touch (the remedy is the one named for the close approaches in #392: Horizons elements at a recent epoch).
// The limits sit just over the measured values and hold them there; the review's aim of 0.05 deg is not yet met by any of the three.
//   node tests/test_comet_reference.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const { parseComets } = await import(join(JS, 'data/parsers.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const fx = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/comets_horizons_reference.json'), 'utf8'));
const LIMIT = { '2P': { deg: 0.1, helio: 0.002 }, '21P': { deg: 0.4, helio: 0.01 }, '13P': { deg: 0.2, helio: 0.005 } };
const t = Date.UTC(2026, 10, 16, 6);
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const norm = (a) => Math.hypot(a.x, a.y, a.z);
const angDeg = (a, b) => {
  const c = { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
  return (Math.atan2(norm(c), a.x * b.x + a.y * b.y + a.z * b.z) * 180) / Math.PI;
};
check(fx.rows.length === 3 && Object.keys(LIMIT).every((d) => fx.rows.some((r) => r.des === d)), 'the three comets are stored');
check(Math.abs((fx.rows[0].horizons.jdTdb - 2440587.5) * 86400000 - t) < 100e3, 'the stored instant is 2026-11-16 06:00 UT (to the TDB offset)');
const recs = parseComets({ fields: fx.fields, data: fx.rows.map((r) => r.row) });
const earth = { x: fx.earth.xKm, y: fx.earth.yKm, z: fx.earth.zKm };
const done = [];
for (const r of fx.rows) {
  const rec = recs.find((x) => x.id === `comet-${r.des}`);
  if (!rec) { check(false, `${r.des}: no record`); continue; }
  const p = propagate(rec, t);
  const h = { x: r.horizons.xKm, y: r.horizons.yKm, z: r.horizons.zKm };
  const deg = angDeg(sub(p, earth), sub(h, earth));
  const helio = norm(sub(p, h)) / norm(h);
  done.push(`${r.des} ${deg.toFixed(3)} deg, ${(100 * helio).toFixed(2)} %`);
  check(deg <= LIMIT[r.des].deg, `${r.des}: ${deg.toFixed(3)} deg from Horizons as seen from Earth, over ${LIMIT[r.des].deg}`);
  check(helio <= LIMIT[r.des].helio, `${r.des}: ${(100 * helio).toFixed(2)} % of its heliocentric distance from Horizons, over ${100 * LIMIT[r.des].helio} %`);
}
check(done.length === 3, `three comets held (${done.length})`);
if (problems.length) { console.error('comet reference FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`comet reference ok: ${done.join('; ')} against Horizons at 2026-11-16 06:00 UT`);
