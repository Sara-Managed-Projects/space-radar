// tests/test_ascent_ground_azimuth.mjs -- groundRelativeAzimuth corrects a launch heading for the pad's own eastward motion (public #735).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) < tol;
const { groundRelativeAzimuth: g } = await import(join(JS, 'propagate/ascent.js'));

check(near(g(Math.PI / 4, 0.4, 7.8), 0.7478, 1e-4), `45 degrees inertial from the Cape is about 42.85 on the ground (${g(Math.PI / 4, 0.4, 7.8)})`);
check(near(g(Math.PI / 2, 0, 7.8), Math.PI / 2), 'a pad that does not move changes nothing');
check(near(g(1.2, 0, 0), 1.2), 'no speeds at all gives the input back');
check(near(g(0, 0.5, 0), 3 * Math.PI / 2), 'the result is wrapped into 0 to 2 pi');
check(near(g(0, 0.5, 7.8), 6.2192, 1e-4), `a northward heading from a moving pad is just under a full turn (${g(0, 0.5, 7.8)})`);

if (problems.length) { console.error('ground-relative azimuth FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('ground-relative azimuth ok: the Cape case, a still pad, no speeds, the wrap and a northward heading');
