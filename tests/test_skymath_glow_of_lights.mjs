// tests/test_skymath_glow_of_lights.mjs -- glowOfLights turns a night-lights reading into the horizon glow: nothing under 0.1, the square of the rest, full from 0.9 (public #813).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { glowOfLights } = await import(join(JS, 'sky/skymath.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const near = (a, b) => Math.abs(a - b) < 1e-9;
check(glowOfLights(0) === 0, 'a dark place has no glow');
check(glowOfLights(0.1) === 0, 'a reading of 0.1 is still nothing');
check(near(glowOfLights(0.5), 0.25), `halfway up the range, squared (${glowOfLights(0.5)})`);
check(near(glowOfLights(0.9), 1), 'from 0.9 the whole glow');
check(glowOfLights(2) === 1, 'above the range is clamped');
check(glowOfLights(NaN) === 0, 'NaN gives no glow');
check(glowOfLights(undefined) === 0, 'a missing reading gives no glow');

if (problems.length) { console.error('glowOfLights FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('glowOfLights ok: zero up to 0.1, the square of the range between, full from 0.9, and no glow for a missing or non-number reading');
