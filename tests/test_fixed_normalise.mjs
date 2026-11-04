// tests/test_fixed_normalise.mjs -- normaliseFixed reads a ground-fixed place in three spellings and refuses bad input (public #742).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) < tol;
const { normaliseFixed } = await import(join(JS, 'propagate/fixed.js'));

const D = Math.PI / 180;
const same = (a, b) => a && b && ['latRad', 'lonRad', 'altKm'].every((k) => near(a[k], b[k]));
check(same(normaliseFixed({ latDeg: 10, lonDeg: 20, altKm: 1 }), { latRad: 10 * D, lonRad: 20 * D, altKm: 1 }), 'latDeg, lonDeg, altKm');
check(same(normaliseFixed({ lat: 10, lon: 20, alt: 2 }), { latRad: 10 * D, lonRad: 20 * D, altKm: 2 }), 'lat, lon, alt');
check(same(normaliseFixed({ latRad: 0.5, lonRad: 1 }), { latRad: 0.5, lonRad: 1, altKm: 0 }), 'radians, with a height of 0 by default');
check(same(normaliseFixed({ latDeg: 0, lonDeg: 0, elevationM: 1500 }), { latRad: 0, lonRad: 0, altKm: 1.5 }), 'an elevation in metres becomes kilometres');
check(same(normaliseFixed({ latDeg: 90, lonDeg: 0 }), { latRad: Math.PI / 2, lonRad: 0, altKm: 0 }), 'the pole itself is allowed');
check(normaliseFixed(null) === null, 'no place gives null');
check(normaliseFixed({ latDeg: 91, lonDeg: 0 }) === null, 'past a pole gives null');
check(normaliseFixed({ latDeg: 10 }) === null, 'no longitude gives null');

if (problems.length) { console.error('normalise fixed FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('normalise fixed ok: three spellings, elevation, the pole and the refusals');
