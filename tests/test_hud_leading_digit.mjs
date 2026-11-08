// tests/test_hud_leading_digit.mjs -- leadingDigit is the key that decides when the tracked tag speaks its number again: order of magnitude and first digit (public #815).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { leadingDigit } = await import(join(JS, 'ui/hud.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const cases = [
  ['27 580', '4|2'], ['408', '2|4'], ['1 240', '3|1'], ['980', '2|9'], ['9.5', '0|9'], ['0.04', '-2|4'],
  ['9,5', '0|9'], ['5,32', '0|5'], ['1 240,5', '3|1'], // a decimal comma (de, ru) is a point, not more digits (2.0.0 look finding 1)
  ['-35', '1|3'], // the sign is ignored
  ['0', '0|0'], ['', '0|0'], [null, '0|0'], ['abc', '0|0'],
];
for (const [text, want] of cases) check(leadingDigit(text) === want, `leadingDigit(${JSON.stringify(text)}) is ${want} (${leadingDigit(text)})`);

if (problems.length) { console.error('leadingDigit FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`leadingDigit ok: ${cases.length} readings, with spaces, signs, decimals, zero, empty and not a number`);
