// tests/test_systems_fit_distance.mjs -- fitDistanceUnits sets the camera back so an orbit's circle fills 85 % of the view; the 2026-09-23 outer ring that ran off the bottom stays fixed (public #826).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { fitDistanceUnits } = await import(join(JS, 'scene/systems.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const near = (a, b) => Math.abs(a - b) < 1e-9;
check(near(fitDistanceUnits(1, 90, 1, 0, 1), 1), 'a 90 degree view of a circle that fills it: one radius away');
check(near(fitDistanceUnits(1, 90, 1, Math.PI / 2, 1), 2), 'seen edge-on the near edge is a radius closer, so the camera backs off');
check(near(fitDistanceUnits(1, 60, 1, 0, 1), Math.sqrt(3)), '60 degrees, filling the view, is root 3');
check(Math.abs(fitDistanceUnits(1, 60, 1) - 2.0377) < 5e-5, `the default fill is 0.85 (${fitDistanceUnits(1, 60, 1)})`);
check(near(fitDistanceUnits(2, 60, 1), 2 * fitDistanceUnits(1, 60, 1)), 'twice the circle, twice the distance');
check(near(fitDistanceUnits(1, 60, 2), fitDistanceUnits(1, 60, 1)), 'a wider window changes nothing: the height decides');

if (problems.length) { console.error('fitDistanceUnits FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('fitDistanceUnits ok: face-on and edge-on circles, the default 0.85 fill, scale with the radius, and the aspect ratio does not matter');
