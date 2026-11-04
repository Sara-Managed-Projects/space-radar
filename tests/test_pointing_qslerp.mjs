// tests/test_pointing_qslerp.mjs -- qSlerp slides along the shorter arc between two attitudes: the ends, the middle, and the sign flip when the dot product is negative (public #811).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { qSlerp } = await import(join(JS, 'sky/pointing.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const near = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
const R = Math.SQRT1_2;
const id = [0, 0, 0, 1];
const quarter = [0, 0, R, R];
const eighth = [0, 0, Math.sin(Math.PI / 8), Math.cos(Math.PI / 8)];
check(near(qSlerp(id, quarter, 0), id), 't = 0 is the first attitude');
check(near(qSlerp(id, quarter, 1), quarter), 't = 1 is the second attitude');
check(near(qSlerp(id, quarter, 0.5), eighth), `half of a quarter turn is an eighth (${qSlerp(id, quarter, 0.5)})`);
check(near(qSlerp(id, [0, 0, -R, -R], 0.5), eighth), 'the same turn with every sign flipped goes the same short way');
check(near(qSlerp(id, id, 0.5), id), 'two equal attitudes give that attitude');


if (problems.length) { console.error('qSlerp FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('qSlerp ok: both ends, the middle of a quarter turn, the same short way for a negated quaternion, and equal inputs');
