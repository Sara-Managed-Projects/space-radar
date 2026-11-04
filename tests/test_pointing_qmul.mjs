// tests/test_pointing_qmul.mjs -- qMul is the Hamilton product as three.js has it: qMul(a, b) turns by b first, then by a (public #804).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { qMul } = await import(join(JS, 'sky/pointing.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const near = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
const R = Math.SQRT1_2;
const qz = [0, 0, R, R]; // a quarter turn about z
const qx = [R, 0, 0, R]; // about x
const qy = [0, R, 0, R]; // about y
const id = [0, 0, 0, 1];
check(near(qMul(id, [0.1, 0.2, 0.3, 0.9]), [0.1, 0.2, 0.3, 0.9]), 'the identity on the left changes nothing');
check(near(qMul([0.1, 0.2, 0.3, 0.9], id), [0.1, 0.2, 0.3, 0.9]), 'the identity on the right changes nothing');
check(near(qMul(qz, qz), [0, 0, 1, 0]), `two quarter turns about z make a half turn (${qMul(qz, qz)})`);
check(near(qMul(qx, qy), [0.5, 0.5, 0.5, 0.5]), `a quarter turn about x after one about y (${qMul(qx, qy)})`);
check(near(qMul(qy, qx), [0.5, 0.5, -0.5, 0.5]), `the other order differs, which pins the convention (${qMul(qy, qx)})`);


if (problems.length) { console.error('qMul FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('qMul ok: identity on either side, two quarter turns are a half turn, and the product is not commutative in the three.js order');
