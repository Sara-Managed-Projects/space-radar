// tests/test_objectnow.mjs -- the object page's "where is it now" line (internal #294).
//   * the sentence for a planet, the Moon and the Sun is worked out from the date it is given, in range;
//   * it never invents a body: anything outside the ten Astronomy Engine places returns null (the static line stays);
//   * the built page carries the hook only for those ten, with the static sentence as the fallback inside it.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as A from '../site/vendor/astronomy.js';
import { BODIES, nowSentence, distanceWords } from '../site/js/objectnow.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const at = new Date('2026-07-01T12:00:00Z');

const sun = nowSentence(A, 'Sun', at);
if (!/^Sun is 1\.0\d au \(15\d(\.\d)? million km\) from the Earth right now, in the constellation Gemini\./.test(sun || '')) problems.push(`the Sun on 1 July 2026: ${sun}`);
const moon = nowSentence(A, 'Moon', at, 'The Moon');
const km = Number((moon || '').match(/is ([\d ]+) km/)?.[1].replace(/ /g, ''));
if (!(km >= 356000 && km <= 407000)) problems.push(`the Moon's distance must lie between its perigee and apogee: ${moon}`);
const mars = nowSentence(A, 'Mars', at);
const au = Number((mars || '').match(/is ([\d.]+) au/)?.[1]);
if (!(au >= 0.37 && au <= 2.68)) problems.push(`Mars is between 0.37 and 2.68 au from the Earth: ${mars}`);
for (const b of BODIES) if (!nowSentence(A, b, at)) problems.push(`no sentence for ${b}`);
for (const bad of ['Earth', 'Ceres', 'Halley', '', undefined]) if (nowSentence(A, bad, at) !== null) problems.push(`invented a sentence for ${bad}`);
if (nowSentence(null, 'Mars', at) !== null) problems.push('no library must give null, not an exception');
// Different days give different words: it reads the date it is given.
if (nowSentence(A, 'Mars', new Date('2026-01-01T00:00:00Z')) === mars) problems.push('the sentence ignores the date');
if (distanceWords('Jupiter', 5.2) !== '5.20 au (778.0 million km)' && distanceWords('Jupiter', 5.2) !== '5.20 au (778 million km)') problems.push(`distanceWords(Jupiter, 5.2) = ${distanceWords('Jupiter', 5.2)}`);
// The module must never be pulled into the app: it is for the static pages only.
const main = readFileSync(join(ROOT, 'site/js/main.js'), 'utf8');
if (/objectnow/.test(main)) problems.push('main.js imports objectnow.js: it belongs to the static object pages only');
// And the template carries the hook with a fallback.
const tpl = readFileSync(join(ROOT, 'templates/object.html'), 'utf8');
if (!tpl.includes('{{now_attrs}}') || !tpl.includes('{{now_script}}')) problems.push('templates/object.html lost the now hooks');

if (problems.length) { console.error('objectnow FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`objectnow ok: ${BODIES.length} bodies worked out from the given date (${sun.split(' from')[0]}; ${moon.split(' from')[0]}), nothing else invented`);
