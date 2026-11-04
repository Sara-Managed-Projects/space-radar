// tests/test_exoface_helpers.mjs -- the exoplanet face's star colour, habitable zone and planet size helpers (public #627).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) < tol;
const { starRgb, habitableFlux, radiusFromMass } = await import(join(JS, 'scene/exoface.js'));

check(starRgb(3000)[0] === 1, 'a cool star is brightest in red');
check(starRgb(20000)[2] === 1, 'a hot star is brightest in blue');
check([3000, 5772, 9000, 20000].every((t) => Math.max(...starRgb(t)) === 1), 'the brightest channel is always exactly 1');
check(JSON.stringify(starRgb(undefined)) === JSON.stringify(starRgb(5772)), 'the Sun\'s colour is the default');
const hz = habitableFlux(5780);
check(hz.inner === 1.776 && hz.outer === 0.32, `the zone for a Sun-like star (${JSON.stringify(hz)})`);
check(habitableFlux(100000).inner === habitableFlux(7200).inner, 'the temperature is clamped to 7200 K at the top');
check(radiusFromMass(1) === 1, 'one Earth mass is one Earth radius');
check(near(radiusFromMass(318), 11.1, 0.05), `Jupiter\'s mass gives about eleven Earth radii (${radiusFromMass(318)})`);

if (problems.length) { console.error('exoplanet face helpers FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('exoplanet face helpers ok: star colour, default colour, habitable zone, its clamp and planet size');
