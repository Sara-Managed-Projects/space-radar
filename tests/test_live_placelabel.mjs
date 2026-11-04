// tests/test_live_placelabel.mjs -- placeLabel tells the live page whose place the passes are for, and says when it is a guess (public #728).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const { placeLabel } = await import(join(JS, 'pages/live.js'));

const want = [
  [null, ''],
  [{ source: 'guess', name: 'Paris' }, 'Paris (a guess from your time zone)'],
  [{ source: 'kept' }, 'the place you set in the map'],
  [{ source: 'kept', name: 'Home' }, 'Home (the place you set in the map)'],
  [{ source: 'geo' }, 'your position (rounded to 11 km, not kept)'],
  [{ source: 'city', name: 'Lima' }, 'Lima'],
  [{ source: 'city' }, ''],
];
for (const [o, label] of want) check(placeLabel(o) === label, `${JSON.stringify(o)} reads ${JSON.stringify(label)} (${JSON.stringify(placeLabel(o))})`);

if (problems.length) { console.error('live place label FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('live place label ok: a guess says so, the kept place, the position, a city and nothing');
