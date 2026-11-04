// tests/test_today_kicker_date.mjs -- kickerDate prints the small date above a Today card in UTC, and adds the year once it is more than 180 days from now, either side (public #818).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { kickerDate } = await import(join(JS, 'ui/today.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const NOW = Date.UTC(2026, 9, 6, 12);
const DAY = 86400000;
// The doc comment in today.js writes "06 OCT"; the function returns "06 Oct" (the card's CSS upper-cases it).
check(kickerDate(NOW, NOW) === '06 Oct', `today, no year (${kickerDate(NOW, NOW)})`);
check(kickerDate(NOW + 179 * DAY, NOW) === '03 Apr', `179 days ahead, still no year (${kickerDate(NOW + 179 * DAY, NOW)})`);
check(kickerDate(NOW + 181 * DAY, NOW) === '05 Apr 2027', `181 days ahead, the year (${kickerDate(NOW + 181 * DAY, NOW)})`);
check(kickerDate(NOW - 181 * DAY, NOW) === '08 Apr 2026', `181 days back, the year too (${kickerDate(NOW - 181 * DAY, NOW)})`);

if (problems.length) { console.error('kickerDate FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('kickerDate ok: the UTC day and short month, with the year from 181 days either side of now');
