// tests/test_texturetiers_bytes_for.mjs -- bytesFor reads a texture row's size, and for a monthly file the month's entry, clamped to 1-12 (public #824).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { bytesFor } = await import(join(JS, 'scene/texturetiers.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const twelve = Array.from({ length: 12 }, (_, i) => (i + 1) * 100);
check(bytesFor(null, 3) === 0, 'no row, no bytes');
check(bytesFor({ bytes: 500 }, 3) === 500, 'a plain number is the size');
check(bytesFor({}, 5) === 0, 'a row with no bytes is 0');
check(bytesFor({ bytes: twelve }, 1) === 100, 'January is the first entry');
check(bytesFor({ bytes: twelve }, 12) === 1200, 'December is the last');
check(bytesFor({ bytes: twelve }, 0) === 100, 'below 1 is clamped to January');
check(bytesFor({ bytes: twelve }, 13) === 1200, 'above 12 is clamped to December');
check(bytesFor({ bytes: twelve }) === 100, 'no month means January');

if (problems.length) { console.error('bytesFor FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('bytesFor ok: no row, a plain size, a monthly list, and the month clamped to 1-12');
