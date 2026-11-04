// tests/test_card_latlon.mjs -- latText and lonText write a card's latitude and longitude with the right hemisphere (public #626).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const { latText, lonText } = await import(join(JS, 'ui/cardfacts.js'));

// The space before the letter may be a non-breaking one, so match with expressions.
check(/^51\.5.*N$/.test(latText(51.5)), `51.5 is north (${latText(51.5)})`);
check(/^33\.9.*S$/.test(latText(-33.9)), `-33.9 is south (${latText(-33.9)})`);
check(/^0\.0.*N$/.test(latText(0)), `zero latitude counts as north (${latText(0)})`);
check(/^151\.2.*E$/.test(lonText(151.2)), `151.2 is east (${lonText(151.2)})`);
check(/^0\.1.*W$/.test(lonText(-0.12)), `-0.12 is west, rounded to a tenth (${lonText(-0.12)})`);
check(/E$/.test(lonText(0)), `zero longitude counts as east (${lonText(0)})`);

if (problems.length) { console.error('card latitude and longitude FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('card latitude and longitude ok: north, south, east, west and zero');
