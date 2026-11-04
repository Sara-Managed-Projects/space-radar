// tests/test_bisect.mjs -- bisect finds the edge of a shadow by halving an interval (public #628).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const { bisect } = await import(join(JS, 'sky/timefacts.js'));

const r1 = bisect((x) => x >= 37, 0, 100, 1);
check(r1 >= 37 && r1 <= 38, `a predicate that turns true finds 37 within 1 (${r1})`);
const r2 = bisect((x) => x < 37, 0, 100, 1);
check(r2 >= 37 && r2 <= 38, `a predicate that turns false finds 37 within 1 (${r2})`);
const r3 = bisect((x) => x >= 37, 0, 100, 0.001);
check(Math.abs(r3 - 37) <= 0.001, `a tolerance of 0.001 is kept (${r3})`);
let calls = 0;
bisect((x) => { calls++; return x >= 37; }, 0, 100, 0.001);
check(calls <= Math.log2(100 / 0.001) + 3, `the predicate is called about log2(range / tol) times (${calls})`);

if (problems.length) { console.error('bisect FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('bisect ok: both directions, the tolerance and the number of calls');
