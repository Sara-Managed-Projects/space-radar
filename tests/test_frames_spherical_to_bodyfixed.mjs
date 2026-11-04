// tests/test_frames_spherical_to_bodyfixed.mjs -- sphericalToBodyFixed turns latitude, longitude and height into a point in a world's own axes (public #749).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) < tol;
const { sphericalToBodyFixed: s2b } = await import(join(JS, 'propagate/frames.js'));

const same = (a, b) => a && ['x', 'y', 'z'].every((k) => near(a[k], b[k]));
check(same(s2b(0, 0, 0, 1737.4), { x: 1737.4, y: 0, z: 0 }), 'the point where the equator meets the prime meridian');
check(same(s2b(Math.PI / 2, 0, 10, 1000), { x: 0, y: 0, z: 1010 }), 'the north pole, ten km up');
check(same(s2b(0, Math.PI / 2, 0, 1000), { x: 0, y: 1000, z: 0 }), '90 degrees east');
check(same(s2b(0, 0, undefined, 1000), { x: 1000, y: 0, z: 0 }), 'no height means the surface');
check(s2b(NaN, 0, 0, 1000) === null, 'a missing number gives null');

if (problems.length) { console.error('spherical to body-fixed FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('spherical to body-fixed ok: the prime meridian, a pole, 90 degrees east, no height and NaN');
