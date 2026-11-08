// tests/test_whenparse.mjs -- what a typed date means (forge #154; site/js/ui/whenparse.js).
//
// The free-text forms of the time pill's date field, the 1700-2200 range, the datetime-local round trip, the
// Julian date, the eclipses searched with the vendored astronomy-engine, and the satellites' fade.
//
//   node tests/test_whenparse.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = await import(join(ROOT, 'site/js/ui/whenparse.js'));
const A = await import(join(ROOT, 'site/vendor/astronomy.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const NOW = Date.UTC(2026, 10, 7, 12, 0, 0);
const at = (text) => W.parseWhen(text, NOW);
const is = (text, ms, precision) => {
  const r = at(text);
  check(r.ok && r.kind === 'instant' && r.ms === ms && (!precision || r.precision === precision), `"${text}" -> ${new Date(ms).toISOString()}${precision ? ` (${precision})` : ''}; got ${JSON.stringify(r)}${r.ms ? ` ${new Date(r.ms).toISOString()}` : ''}`);
};
const landing = Date.UTC(1969, 6, 20, 20, 17);
is('1969-07-20 20:17', landing, 'minute');
is('1969-07-20T20:17Z', landing, 'minute');
is('1969-07-20 20:17 UTC', landing);
is('  1969-07-20   20:17  ', landing);
is('1969-07-20T20:17:40', Date.UTC(1969, 6, 20, 20, 17, 40), 'second');
is('1969-07-20', Date.UTC(1969, 6, 20), 'day');
is('1969-07', Date.UTC(1969, 6, 1), 'day');
is('1969', Date.UTC(1969, 0, 1), 'year');
is('20 July 1969 20:17', landing, 'minute');
is('20 jul 1969', Date.UTC(1969, 6, 20), 'day');
is('July 20, 1969', Date.UTC(1969, 6, 20), 'day');
is('July 20th 1969 20:17', landing);
is('Aug 2027', Date.UTC(2027, 7, 1));
is('JD 2451545.0', Date.UTC(2000, 0, 1, 12), 'second');
is('jd2440423.345', W.julianToMs(2440423.345));
is('now', NOW, 'second');
is('today', Date.UTC(2026, 10, 7), 'day');
is('tomorrow', Date.UTC(2026, 10, 8), 'day');
is('yesterday', Date.UTC(2026, 10, 6), 'day');
is('in 3 days', NOW + 3 * 86400e3);
is('3 days ago', NOW - 3 * 86400e3);
is('2 weeks ago', NOW - 14 * 86400e3);
is('+6h', NOW + 6 * 3600e3);
is('-90 min', NOW - 90 * 60e3);
is('-10y', Date.UTC(2016, 10, 7, 12));
is('+1 month', Date.UTC(2026, 11, 7, 12));
is('next year', Date.UTC(2027, 10, 7, 12));
is('last month', Date.UTC(2026, 9, 7, 12));
is('1700-01-01', Date.UTC(1700, 0, 1));
is('2200-12-31 23:59', Date.UTC(2200, 11, 31, 23, 59));
const no = (text, why) => { const r = at(text); check(!r.ok && r.why === why, `"${text}" -> ${why}; got ${JSON.stringify(r)}`); };
no('', 'empty');
no('1699-12-31', 'range');
no('2201', 'range');
no('-500y', 'range');
no('1969-02-30', 'unknown');
no('1969-07-20 25:00', 'unknown');
no('the day after', 'unknown');
no('3 days', 'unknown');
no('next annular lunar eclipse', 'unknown');
const ec = (text, body, type, dir) => { const r = at(text); check(r.ok && r.kind === 'eclipse' && r.body === body && r.type === type && r.dir === dir, `"${text}" -> ${body} ${type} ${dir}; got ${JSON.stringify(r)}`); };
ec('next total eclipse', 'sun', 'total', 1);
ec('Next solar eclipse', 'sun', 'any', 1);
ec('last lunar eclipse', 'moon', 'any', -1);
ec('previous total lunar eclipse', 'moon', 'total', -1);
ec('next annular eclipse', 'sun', 'annular', 1);
ec('next total eclipse of the moon', 'moon', 'total', 1);

// The field's own value, read and written as UTC.
check(W.toInputValue(landing) === '1969-07-20T20:17', 'toInputValue');
check(W.fromInputValue('1969-07-20T20:17') === landing && W.fromInputValue('nonsense') === null, 'fromInputValue');
check(Math.abs(W.msToJulian(Date.UTC(2000, 0, 1, 12)) - 2451545) < 1e-9, 'msToJulian');
check(W.inRange(Date.UTC(1700, 0, 1)) && !W.inRange(Date.UTC(2201, 0, 1)), 'inRange');

// The eclipses, worked out by astronomy-engine (NASA's catalogue: total solar 2027-08-02, 2026-08-12; total lunar 2028-12-31).
const day = (ms) => new Date(ms).toISOString().slice(0, 10);
const nextTotal = W.findEclipse(A, at('next total eclipse'), NOW);
check(nextTotal && day(nextTotal.ms) === '2027-08-02' && nextTotal.kind === 'total', `next total solar eclipse: 2027-08-02, got ${nextTotal && day(nextTotal.ms)}`);
const lastTotal = W.findEclipse(A, at('last total eclipse'), NOW);
check(lastTotal && day(lastTotal.ms) === '2026-08-12', `last total solar eclipse: 2026-08-12, got ${lastTotal && day(lastTotal.ms)}`);
const lunar = W.findEclipse(A, at('next total lunar eclipse'), NOW);
check(lunar && day(lunar.ms) === '2028-12-31', `next total lunar eclipse: 2028-12-31, got ${lunar && day(lunar.ms)}`);
check(W.findEclipse(A, { body: 'sun', type: 'total', dir: 1 }, Date.UTC(2200, 11, 1)) === null, 'none past 2200');

// The fade of satellites far from now.
check(W.fadeFor(0) === 0 && W.fadeFor(6 * 86400e3) === 0 && W.fadeFor(-40 * 86400e3) === 0.8, 'fadeFor ends');
check(W.fadeFor(18.5 * 86400e3) > 0.3 && W.fadeFor(18.5 * 86400e3) < 0.5, 'fadeFor in between');
// b200-s4b-look: begin -- the coming launches are put away past a year from now, either way, and not before
check(!W.launchesHidden(0) && !W.launchesHidden(300 * 86400e3) && !W.launchesHidden(-W.LAUNCH_HIDE_MS), 'launches stay inside a year');
check(W.launchesHidden(W.LAUNCH_HIDE_MS + 1) && W.launchesHidden(-2 * W.LAUNCH_HIDE_MS) && W.launchesHidden(Date.UTC(1969, 6, 20) - Date.UTC(2026, 10, 8)), 'launches put away past a year (1969 from 2026)');
// b200-s4b-look: end

if (problems.length) {
  console.error(`test_whenparse: ${problems.length} problem(s)\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log('test_whenparse: ok');
