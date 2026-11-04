// tests/test_systems_star_radius.mjs -- starRadiusKm gives a system's star the measured radius or 0 (a point of light), never a guess (public #829).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { starRadiusKm } = await import(join(JS, 'scene/systems.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

check(starRadiusKm({ star: { radiusSuns: 1 } }) === 695700, 'one solar radius is 695 700 km');
check(starRadiusKm({ star: { radiusSuns: 2.5 } }) === 1739250, `2.5 solar radii (${starRadiusKm({ star: { radiusSuns: 2.5 } })})`);
check(starRadiusKm({ star: {} }) === 0, 'no radius is 0, not a guess');
check(starRadiusKm({ star: { radiusSuns: 0 } }) === 0, 'a radius of 0 is 0');
check(starRadiusKm({ star: { radiusSuns: -1 } }) === 0, 'a negative radius is 0');
check(starRadiusKm(null) === 0, 'no system is 0');

if (problems.length) { console.error('starRadiusKm FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('starRadiusKm ok: the measured radius in km, and 0 for none, zero, negative or no system');
