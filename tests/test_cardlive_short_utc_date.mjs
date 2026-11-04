// tests/test_cardlive_short_utc_date.mjs -- shortUtcDate prints an asteroid's closest-approach date in UTC, so it does not move with the visitor's time zone (public #820).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { shortUtcDate } = await import(join(JS, 'ui/cardlive.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

check(shortUtcDate(Date.UTC(2029, 3, 13, 21, 46)) === '13 Apr 2029', `Apophis (${shortUtcDate(Date.UTC(2029, 3, 13, 21, 46))})`);
check(shortUtcDate(Date.UTC(2027, 0, 1)) === '1 Jan 2027', 'no leading zero on the day');
check(shortUtcDate(Date.UTC(2026, 11, 31, 23, 59)) === '31 Dec 2026', '23:59 UTC is still the 31st wherever the test runs');
check(shortUtcDate(NaN) === '', 'a time that is not a number gives an empty string');

if (problems.length) { console.error('shortUtcDate FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('shortUtcDate ok: day, short month and year in UTC, no leading zero, and an empty string for NaN');
