// tests/test_propagate_static.mjs -- staticPos places every star and galaxy and refuses a record with no position (public #620).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const m = await import(join(JS, 'propagate/static.js'));

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
check(same(m.staticPos({ pos: { x: 1, y: 2, z: 3 } }), { x: 1, y: 2, z: 3, frame: 'sun-inertial', cls: 'measured' }), 'a position is read in the sun-inertial frame, measured');
check(m.staticPos({ pos: { x: 1, y: 2, z: 3 }, frame: 'earth-inertial' }).frame === 'earth-inertial', 'a frame on the record is kept');
check(m.staticPos(null) === null && m.staticPos({}) === null, 'no record, or no position, gives null');
check(m.staticPos({ pos: { x: 1, y: NaN, z: 3 } }) === null, 'a position with a NaN gives null');
check(m.static === m.staticPos && m.default === m.staticPos, 'the named export `static` and the default export are the same function');

if (problems.length) { console.error('static position FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('static position ok: the position, the kept frame, the refusals and the three exports');
