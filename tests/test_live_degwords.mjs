// tests/test_live_degwords.mjs -- degWords writes one half of the live page's "51.2° N, 0.4° W" (public #712).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const { degWords } = await import(join(JS, 'pages/live.js'));

check(degWords(51.234, 'N', 'S') === '51.2° N', `a positive value takes the first word (${degWords(51.234, 'N', 'S')})`);
check(degWords(-0.44, 'E', 'W') === '0.4° W', `a negative value takes the second word (${degWords(-0.44, 'E', 'W')})`);
check(degWords(0, 'N', 'S') === '0.0° N', `zero takes the first word (${degWords(0, 'N', 'S')})`);
// Pinned as it is today: the hemisphere follows the sign, not the rounded value.
check(degWords(-0.04, 'N', 'S') === '0.0° S', `a value that rounds to zero keeps the hemisphere of its sign (${degWords(-0.04, 'N', 'S')})`);

if (problems.length) { console.error('live degrees FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('live degrees ok: both hemispheres, zero and a value that rounds to zero');
