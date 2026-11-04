// tests/test_cardfacts_age_parts.mjs -- ageParts prints an age in the unit that suits it: minutes to 90 minutes, hours to 48 hours, days to 730 days, then years (public #850).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { ageParts } = await import(join(JS, 'ui/cardfacts.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const cases = [
  [0, '0', 'minutes'], [60e3, '1', 'minute'], [89 * 60e3, '89', 'minutes'], [90 * 60e3, '2', 'hours'],
  [47 * 3600e3, '47', 'hours'], [100 * 86400e3, '100', 'days'], [730 * 86400e3, '2', 'years'],
];
for (const [ms, n, unit] of cases) {
  const r = ageParts(ms);
  check(r.n === n && r.unit === unit, `ageParts(${ms}) is ${n} ${unit} (${r.n} ${r.unit})`);
}

if (problems.length) { console.error('ageParts FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`ageParts ok: ${cases.length} ages across the minute, hour, day and year thresholds, singular and plural`);
