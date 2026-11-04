// tests/test_systems_planet_radius.mjs -- planetRadiusKm gives a planet its measured radius, or one Earth's when the row has none (the card says it is a default) (public #831).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { planetRadiusKm } = await import(join(JS, 'scene/systems.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

check(planetRadiusKm({ radiusEarths: 1 }) === 6371, 'one Earth is 6 371 km');
check(planetRadiusKm({ radiusEarths: 2 }) === 12742, 'two Earths');
check(planetRadiusKm({}) === 6371, 'no radius falls back to one Earth');
check(planetRadiusKm(null) === 6371, 'no planet falls back to one Earth');
check(planetRadiusKm({ radiusEarths: 0 }) === 6371, 'a radius of 0 falls back');
check(planetRadiusKm({ radiusEarths: '2' }) === 6371, 'a string is not a number here');

if (problems.length) { console.error('planetRadiusKm FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('planetRadiusKm ok: the measured radius in km, and one Earth for none, zero, a string or no planet');
