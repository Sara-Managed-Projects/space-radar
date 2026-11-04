// tests/test_frames_is_planet_moon.mjs -- isPlanetMoon says which worlds are placed as their planet plus an offset, from the MOON_PARENT table (public #800).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { isPlanetMoon } = await import(join(JS, 'propagate/frames.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

check(isPlanetMoon('titan') === true, 'Titan is a planet moon');
check(isPlanetMoon('Titan') === true, 'case is ignored');
check(isPlanetMoon('charon') === true, 'Charon is one');
check(isPlanetMoon('io') === true, 'Io is one');
check(isPlanetMoon('moon') === false, 'the Moon is not placed this way (it has its own frame)');
check(isPlanetMoon('mars') === false, 'Mars is a planet, not a moon');
check(isPlanetMoon(null) === false, 'a world id that is not a string is false');

if (problems.length) { console.error('isPlanetMoon FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('isPlanetMoon ok: Titan, Charon and Io are planet moons in any case; the Moon, Mars and a non-id are not');
