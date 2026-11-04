// tests/test_shadow_orbits_earth.mjs -- orbitsEarth gates the card's sunlight and shadow line to things that go round the Earth (public #720).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const { orbitsEarth } = await import(join(JS, 'scene/shadow.js'));

check(orbitsEarth({ frame: 'earth-inertial' }) === true, 'an Earth-inertial record orbits the Earth');
check(orbitsEarth({ frame: 'earth-fixed' }) === true, 'an Earth-fixed record orbits the Earth');
check(orbitsEarth({ frame: 'moon-fixed' }) === false, 'a record at the Moon does not');
check(orbitsEarth({ frame: 'sun-inertial' }) === false, 'a record in the Sun\'s frame does not');
check(orbitsEarth({}) === false, 'a record with no frame does not');
check(orbitsEarth(null) === false, 'no record does not');

if (problems.length) { console.error('orbits Earth FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('orbits Earth ok: the two Earth frames and the four refusals');
