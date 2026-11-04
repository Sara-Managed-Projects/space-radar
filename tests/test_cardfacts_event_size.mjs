// tests/test_cardfacts_event_size.mjs -- eventSizeText prints an event's area on its card: two significant figures, groups joined by U+202F, 'under 1 km²' not '0', null for no area (public #846).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { eventSizeText } = await import(join(JS, 'ui/cardfacts.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const cases = [
  [0.5, 'under 1 km²'], [1, '1 km²'], [1234, '1 200 km²'], [56789, '57 000 km²'], [1500000, '1 500 000 km²'],
  [0, null], [-3, null], [NaN, null], [null, null],
];
for (const [km2, want] of cases) check(eventSizeText(km2) === want, `eventSizeText(${km2}) is ${JSON.stringify(want)} (${JSON.stringify(eventSizeText(km2))})`);

if (problems.length) { console.error('eventSizeText FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`eventSizeText ok: ${cases.length} areas, from under 1 km² to millions, and null for zero, negative or not a number`);
