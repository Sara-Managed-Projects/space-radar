// tests/test_cardfacts_split_readout.mjs -- splitReadout finds where a card value's number ends and its unit begins: the first ordinary space, because the groups inside a number use U+202F (public #848).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { splitReadout } = await import(join(JS, 'ui/cardfacts.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const split = (value, num, unit) => { const r = splitReadout(value); return r !== null && r.num === num && r.unit === unit; };
check(split('27 580 km/h', '27 580', 'km/h'), 'a grouped number keeps its groups');
check(split('408 km', '408', 'km'), 'a plain number and a unit');
check(split('−12 km', '−12', 'km'), 'a true minus sign (U+2212) is part of the number');
check(split('3.5 AU', '3.5', 'AU'), 'a decimal');
check(split('27 580 km/h', '27', '580 km/h'), 'with an ordinary space the split is early: this is why the groups use U+202F');
check(splitReadout('could not work this out') === null, 'text that does not start with a number is null');
check(splitReadout('408') === null, 'no unit is null');
check(splitReadout(null) === null, 'no value is null');

if (problems.length) { console.error('splitReadout FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('splitReadout ok: number and unit split at the first ordinary space, U+202F groups and a true minus stay in the number, and text with no number or no unit is null');
