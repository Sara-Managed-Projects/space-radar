// tests/test_propagate_sampled.mjs -- hermite and sampled turn a table of positions into a position at any moment (public #619).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) < tol;
const { hermite, sampled } = await import(join(JS, 'propagate/sampled.js'));

const S = [{ tMs: 0, x: 0, y: 0, z: 0, vx: 1, vy: 0, vz: 0 }, { tMs: 10000, x: 10, y: 0, z: 0, vx: 1, vy: 0, vz: 0 }];
const mid = hermite(S, 5000);
check(near(mid.x, 5) && near(mid.vx, 1) && mid.cls === 'inferred', `between two samples the position is interpolated and inferred (${JSON.stringify(mid)})`);
const close = hermite(S, 500);
check(close.x === 0 && close.cls === 'measured', `within a second of a sample the answer is that sample, measured (${JSON.stringify(close)})`);
const edge = hermite(S, -900);
check(edge.x === 0 && edge.cls === 'measured', `within a second before the table it is the first sample, measured (${JSON.stringify(edge)})`);
check(hermite(S, -5000) === null && hermite(S, 15000) === null, 'five seconds outside the table there is no answer: no frozen endpoint');
check(hermite(S, -86400000) === null && hermite(S, 10000 + 2 * 86400000) === null, 'two days outside the table there is no answer (it was a position millions of km out)');
check(hermite([], 5) === null, 'an empty table gives no answer');
const rec = sampled({ samples: S }, 5000);
check(near(rec.x, 5) && rec.frame === 'sun-inertial' && rec.cls === 'inferred', `a record is read in the sun-inertial frame (${JSON.stringify(rec)})`);

if (problems.length) { console.error('sampled propagation FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('sampled propagation ok: interpolation, the exact-sample window, both ends of the table, the limit and the record wrapper');
