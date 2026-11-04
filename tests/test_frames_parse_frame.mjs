// tests/test_frames_parse_frame.mjs -- parseFrame reads a record's frame word: case ignored, a bare kind means Earth, nonsense is null (public #794).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { parseFrame } = await import(join(JS, 'propagate/frames.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const same = (got, world, kind) => got !== null && got.world === world && got.kind === kind;
check(same(parseFrame('earth-fixed'), 'earth', 'fixed'), 'earth-fixed is the Earth, fixed');
check(same(parseFrame('Moon-Inertial'), 'moon', 'inertial'), 'case is ignored');
check(same(parseFrame('fixed'), 'earth', 'fixed'), 'a bare "fixed" means the Earth');
check(same(parseFrame('inertial'), 'earth', 'inertial'), 'a bare "inertial" means the Earth');
check(parseFrame(null) === null, 'no frame is null');
check(parseFrame('earth-orbit') === null, '"orbit" is not a kind, so null');
check(parseFrame('sun') === null, 'a word with no kind at all is null');

if (problems.length) { console.error('parseFrame FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('parseFrame ok: <world>-<kind> splits at the last hyphen, a bare kind is the Earth, and anything else is null');
