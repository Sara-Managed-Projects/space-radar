// tests/test_trajectory.mjs -- spec 0026 req 14: height and ground track from the record's own path.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const { sampleTrajectory, splitAtWrap } = await import(join(JS, 'ui/trajectory.js'));
const { parseCelestrakGP } = await import(join(JS, 'data/parsers.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const gp = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/harvest/celestrak_gp.json'), 'utf8'));
const [iss] = parseCelestrakGP(gp, { layer: 'stations', source: 'celestrak-stations' });
const t0 = Number.isFinite(iss.epoch) ? iss.epoch : Date.parse('2026-09-07T00:00:00Z');
const pts = sampleTrajectory(iss, t0, 1.5, 120);
check(pts.length === 121, `121 samples over a lap and a half (${pts.length})`);
check(pts.every((p) => p.altKm > 380 && p.altKm < 460), `the ISS stays 380-460 km up (${Math.min(...pts.map((p) => p.altKm)).toFixed(0)}-${Math.max(...pts.map((p) => p.altKm)).toFixed(0)})`);
check(pts.every((p) => Math.abs(p.latDeg) <= 52), 'latitude never exceeds the 51.6 deg inclination');
check(Math.max(...pts.map((p) => p.latDeg)) > 45 && Math.min(...pts.map((p) => p.latDeg)) < -45, 'a lap and a half reaches both hemispheres');
check(pts[pts.length - 1].tMs - pts[0].tMs > 130 * 60e3 && pts[pts.length - 1].tMs - pts[0].tMs < 145 * 60e3, 'a lap and a half of the ISS is about 139 minutes');
const runs = splitAtWrap(pts);
check(runs.length >= 2 && runs.reduce((n, r) => n + r.length, 0) === pts.length, `the ground track breaks at the date line into ${runs.length} runs and loses no point`);
check(runs.every((r) => r.every((p, i) => i === 0 || Math.abs(p.lonDeg - r[i - 1].lonDeg) <= 180)), 'no run jumps across the world');
check(sampleTrajectory({ propagator: 'static', pos: { x: 1, y: 0, z: 0 }, frame: 'sun-inertial' }, t0).length === 0, 'a star has no trajectory chart');
check(sampleTrajectory(null, t0).length === 0, 'null record, empty');
check(splitAtWrap([]).length === 0, 'no points, no runs');

if (problems.length) { console.error('trajectory FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('trajectory ok: the ISS samples 121 points over 139 minutes at 380-460 km, both hemispheres, broken at the date line');
