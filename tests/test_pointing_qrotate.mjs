// tests/test_pointing_qrotate.mjs -- qRotate turns a direction by a quaternion [x, y, z, w], which is how a phone's attitude becomes a place in the sky (public #809).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { qRotate } = await import(join(JS, 'sky/pointing.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const near = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
const R = Math.SQRT1_2;
check(near(qRotate([0, 0, 0, 1], [1, 2, 3]), [1, 2, 3]), 'the identity leaves a vector where it is');
check(near(qRotate([0, 0, R, R], [1, 0, 0]), [0, 1, 0]), `a quarter turn about z carries x to y (${qRotate([0, 0, R, R], [1, 0, 0])})`);
check(near(qRotate([1, 0, 0, 0], [0, 1, 0]), [0, -1, 0]), `a half turn about x flips y (${qRotate([1, 0, 0, 0], [0, 1, 0])})`);
check(near(qRotate([0, R, 0, R], [0, 0, 1]), [1, 0, 0]), `a quarter turn about y carries z to x (${qRotate([0, R, 0, R], [0, 0, 1])})`);


if (problems.length) { console.error('qRotate FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('qRotate ok: the identity, a quarter turn about z and y, and a half turn about x move a vector the right way');
