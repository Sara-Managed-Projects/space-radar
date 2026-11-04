// tests/test_type_words.mjs -- typeWords lowers a catalogue's type words for the middle of a sentence (public #704).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const { typeWords } = await import(join(JS, 'copy/en.js'));

check(typeWords('H II region nebula') === 'H II region nebula', 'short all-capital tokens stay as they are');
check(typeWords('Emission Nebula in the Large Magellanic Cloud') === 'emission nebula in the Large Magellanic Cloud', 'proper names stay capitalised');
check(typeWords('Planetary Nebula') === 'planetary nebula', 'plain type words are lowered');
check(typeWords(null) === '', 'anything that is not text is an empty string');

if (problems.length) { console.error('type words FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('type words ok: initialisms, proper names, plain words and non-text');
