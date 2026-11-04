// tests/test_edit_distance.mjs -- editDistance, the nearest-name measure behind the search box's "did you mean" (public #622).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const { editDistance } = await import(join(JS, 'ui/search.js'));

check(editDistance('jupitr', 'jupiter', 2) === 1 && editDistance('satrun', 'saturn', 2) === 1, 'a missing letter costs one, and so do two swapped letters');
check(editDistance('abc', 'abc', 2) === 0 && editDistance('ab', 'ba', 2) === 1, 'equal words are 0 apart, a swap is 1');
check(editDistance('abc', 'xyz', 2) === 3, 'past the cap the answer is cap + 1');
check(editDistance('a', 'abcdef', 2) === 3, 'lengths that differ by more than the cap answer cap + 1 at once');

if (problems.length) { console.error('edit distance FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('edit distance ok: typos, swaps, equal words and both ways past the cap');
