// The Now moment's guessed place: from the time zone when its city is bundled, from the UTC
// offset otherwise, always marked as a guess, and never a throw.
//   node tests/test_guessplace.mjs
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { guessObserver } = await import(join(ROOT, 'site/js/sky/guessplace.js'));
const { CITIES } = await import(join(ROOT, 'site/js/copy/en.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const berlin = guessObserver(CITIES, { timeZone: 'Europe/Berlin' });
check(berlin && berlin.name === 'Berlin' && berlin.source === 'guess' && berlin.how === 'timezone', `Europe/Berlin -> Berlin by time zone: ${JSON.stringify(berlin)}`);
const ny = guessObserver(CITIES, { timeZone: 'America/New_York' });
check(ny && ny.name === 'New York', 'America/New_York -> New York (underscore becomes a space)');
check(berlin && Math.abs(berlin.latRad - 52.52 * Math.PI / 180) < 1e-9, 'radians are derived from degrees');

// A zone whose city is not bundled falls back to the meridian nearest the clock's offset.
const il = guessObserver(CITIES, { timeZone: 'Asia/Jerusalem', offsetMinutes: 180 });
check(il && il.how === 'offset' && il.source === 'guess', `unbundled city -> offset guess, said so: ${JSON.stringify(il)}`);
check(il && Math.abs(il.lonDeg - 45) < 15, `offset +3 h is the 45 E meridian; nearest bundled city is near it: ${il && il.name} at ${il && il.lonDeg}`);

// No zone, no offset: nothing is invented.
check(guessObserver(CITIES, { timeZone: null, offsetMinutes: null }) === null, 'with no hint at all there is no guess');
check(guessObserver([], { timeZone: 'Europe/Berlin' }) === null, 'no cities, no guess');
const jp = guessObserver(CITIES, { timeZone: 'Etc/GMT-9', offsetMinutes: 540 });
// The 135 E meridian: Osaka (135.5 E) is nearer it than Tokyo (139.7 E), and either is the
// honest answer to "somewhere at UTC+9".
check(jp && jp.country === 'Japan', `UTC+9 -> a Japanese city by meridian: ${jp && jp.name}`);

if (problems.length) { console.log(`guessplace: ${problems.length} problem(s)`); for (const p of problems) console.log('  - ' + p); process.exit(1); }
console.log('guessplace ok: a bundled time-zone city is the guess, an unbundled one falls to the nearest meridian, and both say guess');
