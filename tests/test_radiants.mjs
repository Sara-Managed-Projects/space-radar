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
check(ids(new Date(2027, 0, 2, 22).getTime()).includes('quadrantids'), 'across the new year, the Quadrantids of 4 January 2027');
// Each year's date is worked out from the Sun's longitude, not copied from one year's calendar
// (internal #447): the IMO's 2027 calendar gives the Quadrantids' maximum as 4 January 03:25 UT,
// the Geminids' "centred around 20 h UT" on 14 December and the Ursids' as 23 December 4 h UT.
{
  const { peakInstant } = await import(join(JS, 'sky/radiants.js'));
  const by = (id) => SHOWERS.find((s) => s.id === id);
  const minutes = (id, y, iso) => Math.abs(peakInstant(by(id), y) - Date.parse(iso)) / 60e3;
  check(minutes('quadrantids', 2027, '2027-01-04T03:25Z') < 20, `Quadrantids 2027: ${new Date(peakInstant(by('quadrantids'), 2027)).toISOString()}`);
  check(minutes('geminids', 2027, '2027-12-14T20:00Z') < 60, `Geminids 2027: ${new Date(peakInstant(by('geminids'), 2027)).toISOString()}`);
  check(minutes('ursids', 2027, '2027-12-23T04:00Z') < 60, `Ursids 2027: ${new Date(peakInstant(by('ursids'), 2027)).toISOString()}`);
  // The same longitude is about six hours earlier the year before: the Orionids of 2026 are the 21st.
  check(new Date(peakInstant(by('orionids'), 2026)).toISOString().startsWith('2026-10-21') && new Date(peakInstant(by('orionids'), 2027)).toISOString().startsWith('2027-10-22'), 'Orionids: 21 October 2026, 22 October 2027');
  check(peakInstant({ id: 'x', peak: '05-05' }, 2027) === null && activeShowers(new Date(2027, 4, 5, 22).getTime(), [{ id: 'x', peak: '05-05' }]).length === 1, 'a row with no solar longitude keeps its calendar date');
  check(SHOWERS.every((s) => Number.isFinite(s.sol)), 'every shower carries its solar longitude');
}

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
