// tests/test_radiants.mjs -- a shower's radiant, placed in the sky view for the nights around its peak.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

process.env.TZ = 'Europe/London'; // "the nights around the peak" are local nights; test them in one place
const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { activeShowers, radiantAltAz } = await import(join(JS, 'sky/radiants.js'));
const { radiantThatNight } = await import(join(JS, 'ui/next.js'));
const { SHOWERS } = await import(join(JS, 'data/showers.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const ids = (tMs) => activeShowers(tMs, SHOWERS).map((s) => s.id).join();
check(ids(new Date(2026, 9, 21, 22).getTime()) === 'orionids', `on the Orionids' night only they are marked (${ids(new Date(2026, 9, 21, 22).getTime())})`);
check(ids(new Date(2026, 9, 19, 22).getTime()) === 'orionids', 'two nights before the peak, still');
check(ids(new Date(2026, 9, 25, 22).getTime()) === '', 'four nights after, no longer');
check(ids(new Date(2026, 8, 22, 22).getTime()) === '', 'and on 22 September nothing is near its peak');
check(ids(new Date(2027, 0, 1, 22).getTime()).includes('quadrantids'), 'across the new year, the Quadrantids of 3 January');

// The two answers agree: when "Coming up" says the radiant is highest, the sky puts it due south.
const london = { latRad: 51.5 * Math.PI / 180, lonRad: -0.13 * Math.PI / 180 };
const ori = SHOWERS.find((s) => s.id === 'orionids');
const best = radiantThatNight(ori, new Date(2026, 9, 21, 12).getTime(), london);
const aa = radiantAltAz(ori, best.tMs, london);
check(Math.abs(aa.altDeg - best.altDeg) < 0.01, `same altitude from both (${aa.altDeg.toFixed(2)} vs ${best.altDeg.toFixed(2)})`);
check(Math.abs(aa.azDeg - 180) < 4, `at its highest the Orionids' radiant is due south from London (az ${aa.azDeg.toFixed(1)})`);
// Six hours earlier it is lower and in the east.
const early = radiantAltAz(ori, best.tMs - 6 * 3600e3, london);
check(early.altDeg < aa.altDeg && early.azDeg > 45 && early.azDeg < 135, `earlier in the night it is low in the east (alt ${early.altDeg.toFixed(0)}, az ${early.azDeg.toFixed(0)})`);
check(radiantAltAz(ori, best.tMs, null) === null, 'no place, no position');

if (problems.length) { console.error('radiants FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('radiants ok: marked for the nights around the peak, due south at its highest, agreeing with "Coming up"');
