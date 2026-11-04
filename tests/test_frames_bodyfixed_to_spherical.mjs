// tests/test_frames_bodyfixed_to_spherical.mjs -- bodyFixedToSpherical is the inverse: where a point in a world's own axes sits on that world (public #757).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) < tol;
const { bodyFixedToSpherical: b2s, sphericalToBodyFixed: s2b } = await import(join(JS, 'propagate/frames.js'));

const same = (a, b) => a && ['latRad', 'lonRad', 'altKm'].every((k) => near(a[k], b[k]));
check(same(b2s({ x: 1010, y: 0, z: 0 }, 1000), { latRad: 0, lonRad: 0, altKm: 10 }), 'ten km above the prime meridian');
check(same(b2s({ x: 0, y: 0, z: 1000 }, 1000), { latRad: Math.PI / 2, lonRad: 0, altKm: 0 }), 'at a pole the longitude is 0, not NaN');
check(same(b2s({ x: 0, y: -1000, z: 0 }, 1000), { latRad: 0, lonRad: -Math.PI / 2, altKm: 0 }), '90 degrees west');
check(b2s(null, 1000) === null, 'a missing vector gives null');
check(same(b2s(s2b(0.3, -1.2, 5, 1737.4), 1737.4), { latRad: 0.3, lonRad: -1.2, altKm: 5 }), 'the round trip through sphericalToBodyFixed');

if (problems.length) { console.error('body-fixed to spherical FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('body-fixed to spherical ok: a height, a pole, the west, a missing vector and the round trip');
