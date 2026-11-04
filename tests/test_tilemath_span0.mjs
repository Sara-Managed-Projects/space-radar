// tests/test_tilemath_span0.mjs -- span0Of gives a level-0 map tile's side in degrees for both kinds of grid: [columns, rows] and { span0 } (public #822).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { span0Of } = await import(join(JS, 'scene/tilemath.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

check(span0Of() === 180, 'the default grid is [2, 1]: 180 degrees');
check(span0Of([2, 1]) === 180, '[2, 1] is 180 degrees');
check(span0Of([4, 2]) === 90, '[4, 2] is 90 degrees');
check(span0Of({ span0: 36 }) === 36, 'a grid that carries its own span0 uses it');

if (problems.length) { console.error('span0Of FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('span0Of ok: 180 divided by the rows, the default grid, and a grid with its own span0');
