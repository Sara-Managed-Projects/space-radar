// tests/test_frames_equatorial_to_ecliptic.mjs -- equatorialToEcliptic turns a direction about the x axis by the J2000 obliquity, and in that sign (public #770).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { equatorialToEcliptic } = await import(join(JS, 'propagate/frames.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// The module takes the obliquity from astronomy-engine's own EQJ->ECL matrix (frames.js, "Obliquity of
// the ecliptic at J2000.0"), which differs from the literal 23.4392911 degrees by about 2e-7 in a sine:
// so the tilted axes are compared to 1e-6, and the axis that does not move to 1e-9.
const EPS = 23.4392911 * Math.PI / 180;
const same = (v, w, tol = 1e-6) => Math.abs(v.x - w.x) < tol && Math.abs(v.y - w.y) < tol && Math.abs(v.z - w.z) < tol;
const show = (v) => `{${v.x}, ${v.y}, ${v.z}}`;
const x = equatorialToEcliptic({ x: 1, y: 0, z: 0 });
check(same(x, { x: 1, y: 0, z: 0 }, 1e-9), `the x axis does not move (${show(x)})`);
const pole = equatorialToEcliptic({ x: 0, y: 0, z: 1 });
check(same(pole, { x: 0, y: Math.sin(EPS), z: Math.cos(EPS) }), `the celestial pole is 23.44 degrees from the ecliptic pole (${show(pole)})`);
const y = equatorialToEcliptic({ x: 0, y: 1, z: 0 });
check(same(y, { x: 0, y: Math.cos(EPS), z: -Math.sin(EPS) }), `the y axis tips towards -z, which pins the sign of the rotation (${show(y)})`);

if (problems.length) { console.error('equatorialToEcliptic FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('equatorialToEcliptic ok: the x axis stays, the pole and the y axis turn by the obliquity (23.4392911 degrees, to 1e-6) in the documented sign');
