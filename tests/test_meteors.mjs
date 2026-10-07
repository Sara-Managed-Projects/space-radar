// tests/test_meteors.mjs -- a shower over its whole activity period (sky/meteors.js, internal #416):
// each shower's own population index, the activity curve, and the antihelion source.
//   node tests/test_meteors.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const M = await import(join(JS, 'sky/meteors.js'));
const { SHOWERS } = await import(join(JS, 'data/showers.js'));
const { SHOWER_ACTIVITY, ANTIHELION } = await import(join(JS, 'data/showers-activity.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const DAY = 86400000;
const DEG = Math.PI / 180;

// --- the IMO's numbers are there for every shower, and are the IMO's ---------------------------------
const byId = new Map(SHOWER_ACTIVITY.map((a) => [a.id, a]));
for (const sh of SHOWERS) {
  const a = byId.get(sh.id);
  check(!!a && a.r >= 2 && a.r <= 3.1 && /^\d\d-\d\d$/.test(a.active_from) && /^\d\d-\d\d$/.test(a.active_to) && a.sol >= 0 && a.sol < 360, `${sh.id}: a population index, an activity period and a solar longitude`);
}
check(byId.get('quadrantids').r === 2.1 && byId.get('perseids').r === 2.2 && byId.get('geminids').r === 2.6 && byId.get('ursids').r === 2.8, 'the population indices are Table 5\'s');
check(byId.get('perseids').sol === 140.0 && byId.get('perseids').active_from === '07-17' && byId.get('perseids').active_to === '08-24', 'the Perseids are active 17 July to 24 August, maximum at 140.0 degrees');
check(ANTIHELION.zhr === 4 && ANTIHELION.r === 3.0 && ANTIHELION.v_kms === 30, 'the antihelion source: ZHR 4, r 3.0, 30 km/s');
const yaml = readFileSync(join(ROOT, 'registry/showers.yaml'), 'utf8');
check(/2027 Meteor Shower Calendar/.test(yaml) && /read 2026-10-07/.test(yaml), 'the registry says which calendar and when it was read');

// --- the Sun's longitude -------------------------------------------------------------------------------
// The March equinox of 2026 (20 March 14:46 UTC) is longitude 0 of date, 0.366 degrees short of it on the equinox of 2000.
const equinox = Date.UTC(2026, 2, 20, 14, 46);
check(near(((M.solarLongitude(equinox) + 180) % 360) - 180, -0.366, 0.02), `the Sun's longitude is on the equinox of 2000 (${M.solarLongitude(equinox).toFixed(3)} at the 2026 equinox)`);
// The Perseids' maximum at 140.0 degrees falls on 12 or 13 August in any year.
const row = (id) => ({ ...SHOWERS.find((s) => s.id === id), ...byId.get(id) });
function peakOf(id, year) {
  let best = null;
  const r = row(id);
  for (let t = Date.UTC(year, 0, 1); t < Date.UTC(year + 1, 0, 1); t += 3600e3) {
    const a = M.showerActivity(r, t);
    if (!best || a > best.a) best = { a, t };
  }
  return best;
}
for (const year of [2026, 2027, 2030]) {
  const p = peakOf('perseids', year);
  const d = new Date(p.t);
  check(d.getUTCMonth() === 7 && (d.getUTCDate() === 12 || d.getUTCDate() === 13) && p.a > 0.97, `the Perseids of ${year} peak on 12 or 13 August (${d.toISOString()}, ${p.a.toFixed(3)})`);
}

// --- the curve --------------------------------------------------------------------------------------------
{
  const r = row('perseids');
  const peak = peakOf('perseids', 2026).t;
  check(near(M.showerActivity(r, peak), 1, 0.03), 'at the maximum the rate is the ZHR');
  check(M.showerActivity(r, Date.UTC(2026, 5, 1)) === 0 && M.showerActivity(r, Date.UTC(2026, 8, 10)) === 0, 'outside the activity period: nothing');
  // One an hour on the first and last day of the period.
  check(near(r.zhr * M.showerActivity(r, Date.UTC(2026, 6, 17, 12)), 1, 0.25), `about one an hour on the first day (${(r.zhr * M.showerActivity(r, Date.UTC(2026, 6, 17, 12))).toFixed(2)})`);
  check(near(r.zhr * M.showerActivity(r, Date.UTC(2026, 7, 24, 12)), 1, 0.25), `and on the last (${(r.zhr * M.showerActivity(r, Date.UTC(2026, 7, 24, 12))).toFixed(2)})`);
  // It rises to the peak and falls from it, with no step, and faster after than before (11 days against 26).
  let up = true;
  let down = true;
  for (let t = Date.UTC(2026, 6, 18); t < peak - DAY; t += DAY) if (M.showerActivity(r, t + DAY) <= M.showerActivity(r, t)) up = false;
  for (let t = peak; t < Date.UTC(2026, 7, 23); t += DAY) if (M.showerActivity(r, t + DAY) >= M.showerActivity(r, t)) down = false;
  check(up && down, 'the rate climbs to the maximum and falls from it');
  const twoBefore = M.showerActivity(r, peak - 2 * DAY);
  const twoAfter = M.showerActivity(r, peak + 2 * DAY);
  check(twoBefore > twoAfter && twoBefore > 0.5 && twoBefore < 0.95 && twoAfter > 0.15, `two nights before the peak is better than two nights after (${twoBefore.toFixed(2)}, ${twoAfter.toFixed(2)})`);
  // A shower that spans the new year.
  const q = row('quadrantids');
  check(M.showerActivity(q, Date.UTC(2026, 11, 30)) > 0 && M.showerActivity(q, Date.UTC(2027, 0, 8)) > 0 && M.showerActivity(q, Date.UTC(2027, 1, 1)) === 0, 'the Quadrantids run from December into January');
  check(M.showerActivity({}, peak) === 0 && M.showerActivity(null, peak) === 0, 'a row without the numbers is not active');
}

// --- the population index -------------------------------------------------------------------------------
// In a town (limit 5.3) a shower of bright meteors keeps more of its rate than one of faint ones.
const town = (r) => M.visibleRate({ zhr: 100, radiantAltDeg: 90, limitMag: 5.3, r });
check(town(2.1) > town(2.8) && near(town(2.1), 100 * Math.pow(2.1, -1.2), 1e-9), `r is each shower's own: ${town(2.1).toFixed(0)} an hour of 100 for the Quadrantids' 2.1, ${town(2.8).toFixed(0)} for the Ursids' 2.8`);
check(near(M.visibleRate({ zhr: 100, radiantAltDeg: 90, limitMag: 6.5, r: 2.1 }), 100, 1e-9), 'and at magnitude 6.5 with the radiant overhead the rate is the ZHR, whatever r is');
check(M.drawMagnitude(6.5, 0.1, 2.1) < M.drawMagnitude(6.5, 0.1, 3.0), 'a low r draws brighter meteors');

// --- the sources of a night -------------------------------------------------------------------------------
const london = { latDeg: 51.5, lonDeg: -0.1 };
const aug = M.sourcesAt(Date.UTC(2026, 7, 10, 1), london);
const per = aug.find((s) => s.id === 'perseids');
check(per && per.r === 2.2 && per.zhr < per.peakZhr && per.zhr > 30 && per.altDeg > 30, `three nights before the peak the Perseids are drawn, under their peak rate (${per && per.zhr.toFixed(0)} of ${per && per.peakZhr})`);
const late = M.sourcesAt(Date.UTC(2026, 6, 25, 1), london).find((s) => s.id === 'perseids');
check(late && late.zhr > 1 && late.zhr < 10, `in late July they are a few an hour (${late && late.zhr.toFixed(1)})`);
check(aug.some((s) => s.id === 'antihelion' && s.sporadic && s.zhr === 4 && s.r === 3), 'the antihelion source is there too, at four an hour');
check(!M.sourcesAt(Date.UTC(2026, 9, 7, 22), london).some((s) => s.id === 'antihelion'), 'and not in October, when the IMO folds it into the Taurids');
check(M.sourcesAt(Date.UTC(2026, 9, 7, 22), london).some((s) => s.id === 'orionids'), 'the Orionids are active on 7 October, two weeks before their peak');
// The antihelion radiant: on the ecliptic, 195 degrees from the Sun. The IMO's Table 6 has it at
// 112 degrees, +21 degrees on 0 January and 177, 0 on 5 March.
for (const [t, ra, dec] of [[Date.UTC(2027, 0, 0), 112, 21], [Date.UTC(2027, 2, 5), 177, 0], [Date.UTC(2027, 5, 5), 267, -23]]) {
  const d = M.antihelionRadiant(t);
  const gotRa = ((Math.atan2(d[1], d[0]) / DEG) + 360) % 360;
  const gotDec = Math.asin(d[2]) / DEG;
  check(near(gotRa, ra, 4) && near(gotDec, dec, 2.5), `the antihelion radiant is where Table 6 has it (${gotRa.toFixed(0)}, ${gotDec.toFixed(0)} against ${ra}, ${dec})`);
}
check(M.antihelionRadiant(Date.UTC(2026, 9, 15)) === null, 'no antihelion radiant out of its season');
const ground = readFileSync(join(JS, 'sky/groundsky.js'), 'utf8');
check(/meteorsMod\.sourcesAt\(frame\.tMs, observer\)/.test(ground), 'sky/groundsky.js draws the sources of the night, not only a shower at its peak');

if (problems.length) { console.error('meteors FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`meteors ok: eight showers with the IMO's r and activity period, a curve that is 1 at the Sun's longitude of the maximum and one an hour at the period's ends, the Perseids at ${per.zhr.toFixed(0)} an hour three nights early, and the antihelion source where Table 6 puts it`);
