// tests/test_timefacts_next_light_change.mjs -- nextLightChange reads the next sun/shadow change from lightWindows' runs: the start of the second run, or null (public #835).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { nextLightChange } = await import(join(JS, 'sky/timefacts.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

check(nextLightChange([]) === null, 'no runs, no change');
check(nextLightChange(null) === null, 'no list, no change');
check(nextLightChange([{ from: 0, to: 5, sunlit: true }]) === null, 'one run: no change ahead');
const next = nextLightChange([{ from: 0, to: 5, sunlit: true }, { from: 5, to: 9, sunlit: false }]);
check(next !== null && next.tMs === 5 && next.toSunlit === false, `two runs: the change is at the second run's start, into shadow (${JSON.stringify(next)})`);

if (problems.length) { console.error('nextLightChange FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('nextLightChange ok: null for no list, an empty list or one run; the second run\'s start and light state otherwise');
