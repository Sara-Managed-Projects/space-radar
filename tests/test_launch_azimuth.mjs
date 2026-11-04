// tests/test_launch_azimuth.mjs -- launchAzimuth picks the heading a rocket's climb starts from and never answers NaN (public #624).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) < tol;
const { launchAzimuth } = await import(join(JS, 'propagate/ascent.js'));

const deg = (x) => x * Math.PI / 180;
const az = (...a) => launchAzimuth(...a) * 180 / Math.PI;
check(near(az(deg(28.5), deg(51.6)), 44.975, 0.01), `Cape Canaveral to the station heads 44.975 degrees (${az(deg(28.5), deg(51.6))})`);
check(near(az(deg(28.5), deg(51.6), -1), 135.025, 0.01), `the southerly launch heads 135.025 degrees (${az(deg(28.5), deg(51.6), -1)})`);
check(near(az(0, 0), 90, 0.01), 'the equator into an equatorial orbit is due east');
check(near(az(deg(60), 0), 90, 0.01), 'an inclination the pad cannot reach is clamped, not NaN');
check(az(Math.PI / 2, deg(1)) === 0, 'at the pole the code answers 0');

if (problems.length) { console.error('launch azimuth FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('launch azimuth ok: two Cape headings, the equator, the clamp and the pole');
