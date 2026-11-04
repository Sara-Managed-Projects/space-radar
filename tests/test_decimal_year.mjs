// tests/test_decimal_year.mjs -- decimalYear gives the magnetic model its year as 2026.77 (public #625).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) < tol;
const { decimalYear } = await import(join(JS, 'sky/pointing.js'));

check(decimalYear(Date.UTC(2026, 0, 1)) === 2026, 'the first instant of 2026 is exactly 2026');
check(decimalYear(Date.UTC(2026, 6, 2, 12)) === 2026.5, 'day 182.5 of 365 is exactly 2026.5');
check(decimalYear(Date.UTC(2027, 0, 1)) === 2027, 'the first instant of 2027 is exactly 2027');
check(decimalYear(Date.UTC(2027, 0, 1) - 1) < 2027, 'a millisecond before it is still under 2027');
check(near(decimalYear(Date.UTC(2028, 6, 1, 12)), 2028.49863, 0.0001), `a leap year has 366 days (${decimalYear(Date.UTC(2028, 6, 1, 12))})`);

if (problems.length) { console.error('decimal year FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('decimal year ok: year starts, mid-year, the instant before a year and a leap year');
