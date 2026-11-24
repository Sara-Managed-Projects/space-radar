// tests/test_eclipse_2027.mjs -- "will I see it" for the total solar eclipse of 2 August 2027 (forge #553): sky/besselian.js
// held to NASA's own tables, to the values published for four cities, and to Astronomy Engine.
//
//   node tests/test_eclipse_2027.mjs
//
// THE PUBLISHED VALUES.
//   NASA GSFC, eclipse predictions by Fred Espenak (read 2026-11-24): the Besselian elements' page gives the greatest eclipse
//   at 10:06:37.7 UT, 25°30.3'N 33°11.0'E, central duration 6m22.6s, Sun at 81.7° altitude and 202.0° azimuth
//   (https://eclipse.gsfc.nasa.gov/SEbeselm/SEbeselm2001/SE2027Aug02Tbeselm.html); the path table gives the central line, its
//   duration and the two limits minute by minute (https://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2027Aug02Tpath.html).
//   timeanddate.com's city pages (read 2026-11-24; times to the minute, in local time, converted here to UT): Luxor (EEST,
//   UT+3) total 6 min 22 s, partial from 11:40, maximum 13:05, to 14:26; Cadiz (CEST, UT+2) total 2 min 56 s, 09:40, 10:46,
//   11:59; Jeddah (AST, UT+3) total 5 min 55 s, 12:00, 13:25, 14:43; London (BST, UT+1) partial, magnitude 0.518, 09:03,
//   10:00, 10:59. Their coordinates are not published with the values; this test uses Natural Earth's (public domain), the
//   ones the checker finds by name. A minute-rounded time is held to 61 s.
//   CADIZ is 15 km inside the northern limit, where totality grows by about a second for every 300 m: its duration is held to
//   4 s, the others to 2 s.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const notes = [];

const { ECLIPSE_2027_08_02: E, localCircumstances: L, overlapFraction } = await import(join(JS, 'sky/besselian.js'));
const Astronomy = await import(join(ROOT, 'site/vendor/astronomy.js'));
const { matchPlaces, placeList, durationParts } = await import(join(JS, 'ui/eclipsecheck.js'));

const utc = (hm) => Date.parse(`2027-08-02T${hm}:00Z`);
const hms = (ms) => new Date(ms).toISOString().slice(11, 19);
const dm = (d, m) => d + m / 60;

// --- the elements are the table's ---------------------------------------------------------------------------------------
check(E.t0 === 10 && E.deltaT === 71.7 && E.x[1] === 0.5447105 && E.y[0] === 0.160063 && E.mu[1] === 15.002093 && E.tanF2 === 0.0045834,
  'the elements are NASA\'s table, as printed');

// --- NASA's greatest eclipse --------------------------------------------------------------------------------------------
{
  const r = L(E, dm(25, 30.3), dm(33, 11.0));
  const err = (r.max - Date.parse('2027-08-02T10:06:37.7Z')) / 1000;
  check(r.kind === 'total' && Math.abs(err) < 2, `greatest eclipse at 10:06:37.7 UT (got ${hms(r.max)}, ${err.toFixed(1)} s)`);
  check(Math.abs(r.durationS - 382.6) < 1, `6m22.6s of totality there (got ${r.durationS.toFixed(1)} s)`);
  check(Math.abs(r.sunAltDeg - 81.7) < 0.2 && Math.abs(r.sunAzDeg - 202.0) < 0.5, `the Sun at 81.7° altitude, 202.0° azimuth (got ${r.sunAltDeg.toFixed(1)}, ${r.sunAzDeg.toFixed(1)})`);
  notes.push(`greatest eclipse ${err.toFixed(1)} s, duration ${(r.durationS - 382.6).toFixed(1)} s`);
}

// --- NASA's path table: the central line and the limits -----------------------------------------------------------------
// [UT, N limit lat, lon, S limit lat, lon, central lat, lon, duration s] (lon east +), every few minutes of the page's table.
const PATH = [
  ['08:26', [30, 43.3], [-38, -53.6], [30, 2.1], [-34, -13.5], [30, 29.3], [-36, -14.0], 3 * 60 + 24.6],
  ['08:40', [36, 14.4], [-13, -1.4], [34, 14.5], [-11, -57.8], [35, 14.6], [-12, -27.6], 4 * 60 + 30.3],
  ['08:50', [36, 48.9], [-3, -38.2], [34, 40.2], [-3, -10.2], [35, 44.6], [-3, -22.9], 4 * 60 + 59.1],
  ['09:00', [36, 34.8], [3, 47.7], [34, 22.6], [3, 48.7], [35, 28.6], [3, 49.1], 5 * 60 + 22.4],
  ['09:10', [35, 49.9], [10, 1.5], [33, 37.2], [9, 40.4], [34, 43.4], [9, 51.5], 5 * 60 + 41.5],
  ['09:20', [34, 42.8], [15, 24.3], [32, 31.6], [14, 44.8], [33, 37.1], [15, 4.8], 5 * 60 + 56.8],
  ['09:30', [33, 18.7], [20, 8.3], [31, 10.2], [19, 13.6], [32, 14.4], [19, 41.0], 6 * 60 + 8.5],
];
const deg = ([d, m]) => (d < 0 || Object.is(d, -0) ? d - Math.abs(m) / 60 : d + m / 60);
let worstLine = 0, worstMax = 0;
for (const [hm, nLat, nLon, sLat, sLon, cLat, cLon, durS] of PATH) {
  const c = L(E, deg(cLat), deg(cLon));
  const dErr = c.durationS - durS;
  const tErr = (c.max - utc(hm)) / 1000;
  worstLine = Math.max(worstLine, Math.abs(dErr));
  worstMax = Math.max(worstMax, Math.abs(tErr));
  check(c.kind === 'total' && Math.abs(dErr) < 2, `${hm}: the central line is total for ${durS} s (got ${c.kind}, ${c.durationS.toFixed(1)} s)`);
  check(Math.abs(tErr) < 60, `${hm}: the maximum on the central line is at that minute (got ${hms(c.max)})`);
  for (const [name, la, lo] of [['northern', nLat, nLon], ['southern', sLat, sLon]]) {
    const r = L(E, deg(la), deg(lo));
    check(Math.abs(r.magnitude - 1) < 0.003 && r.durationS < 25, `${hm}: the ${name} limit grazes (magnitude ${r.magnitude.toFixed(4)}, ${r.durationS.toFixed(0)} s of totality)`);
  }
}
notes.push(`central line: duration within ${worstLine.toFixed(1)} s, maximum within ${worstMax.toFixed(0)} s of the row's minute (${PATH.length} rows)`);

// --- four cities, as published ------------------------------------------------------------------------------------------
const CITY = [
  { name: 'Luxor', lat: 25.700019, lon: 32.650038, kind: 'total', dur: 382, c1: '08:40', max: '10:05', c4: '11:26', durTol: 2 },
  { name: 'Cadiz', lat: 36.534991, lon: -6.225005, kind: 'total', dur: 176, c1: '07:40', max: '08:46', c4: '09:59', durTol: 4 },
  { name: 'Jeddah', lat: 21.518835, lon: 39.217252, kind: 'total', dur: 355, c1: '09:00', max: '10:25', c4: '11:43', durTol: 2 },
  { name: 'London', lat: 51.501941, lon: -0.118668, kind: 'partial', mag: 0.518, c1: '08:03', max: '09:00', c4: '09:59' },
];
const astroObs = (c) => new Astronomy.Observer(c.lat, c.lon, 0);
for (const c of CITY) {
  const r = L(E, c.lat, c.lon);
  check(r.kind === c.kind, `${c.name}: ${c.kind} (got ${r.kind})`);
  const errs = [];
  for (const k of ['c1', 'max', 'c4']) {
    // A minute-rounded time HH:MM stands for HH:MM:00 to HH:MM:59 if it was cut, HH:MM-0:30 to +0:30 if rounded: 61 s holds both.
    const e = (r[k] - utc(c[k])) / 1000;
    errs.push(`${k} ${e >= 0 ? '+' : ''}${e.toFixed(0)} s`);
    check(Math.abs(e) <= 61, `${c.name}: ${k} at ${c[k]} UT (got ${hms(r[k])})`);
  }
  if (c.dur) {
    const e = r.durationS - c.dur;
    errs.push(`totality ${e >= 0 ? '+' : ''}${e.toFixed(1)} s`);
    check(Math.abs(e) <= c.durTol, `${c.name}: ${c.dur} s of totality, within ${c.durTol} s (got ${r.durationS.toFixed(1)} s)`);
  }
  if (c.mag) {
    errs.push(`magnitude ${(r.magnitude - c.mag).toFixed(4)}`);
    check(Math.abs(r.magnitude - c.mag) < 0.005, `${c.name}: magnitude ${c.mag} (got ${r.magnitude.toFixed(4)})`);
  }
  // Astronomy Engine, the map's own library, from first principles (its own ephemeris and ΔT): the same eclipse within a minute.
  const a = Astronomy.SearchLocalSolarEclipse(new Date('2027-07-20T00:00:00Z'), astroObs(c));
  const aMax = a.peak.time.date.getTime();
  const ae = (r.max - aMax) / 1000;
  errs.push(`against Astronomy Engine ${ae >= 0 ? '+' : ''}${ae.toFixed(0)} s, its ${a.kind}`);
  check(a.kind === c.kind && Math.abs(ae) < 60, `${c.name}: Astronomy Engine agrees on the kind and the maximum (it says ${a.kind}, ${hms(aMax)})`);
  if (c.kind === 'partial') check(Math.abs(a.obscuration - r.obscuration) < 0.01, `${c.name}: and on the share of the Sun covered (${a.obscuration.toFixed(3)} against ${r.obscuration.toFixed(3)})`);
  notes.push(`${c.name}: ${errs.join(', ')}`);
}

// --- places it does not reach -------------------------------------------------------------------------------------------
check(L(E, -33.87, 151.21).kind === 'none', 'Sydney does not see it (night there)');
check(L(E, 40.71, -74.01).kind === 'none', 'New York does not see it (before sunrise, and outside the penumbra)');
const moscow = L(E, 55.75, 37.62);
check(moscow.kind === 'partial' && moscow.magnitude < 0.4, `Moscow sees a small partial eclipse (${moscow.magnitude.toFixed(3)})`);

// --- the obscuration is an area ------------------------------------------------------------------------------------------
check(Math.abs(overlapFraction(1, 0) - 1) < 1e-12 && overlapFraction(1, 2) === 0 && Math.abs(overlapFraction(1, 1) - 0.391) < 0.001,
  'two equal discs: whole when centred, nothing when touching, 39.1 percent when one radius apart');

// --- the checker's place lookup -----------------------------------------------------------------------------------------
const rows = JSON.parse(readFileSync(join(ROOT, 'site/data/eclipse-2027-places.json'), 'utf8')).rows;
const list = placeList([{ name: 'London', country: 'United Kingdom', latDeg: 51.5074, lonDeg: -0.1278 }], rows);
check(matchPlaces(list, 'luxor')[0]?.name === 'Luxor' && matchPlaces(list, 'CADIZ')[0]?.name === 'Cádiz', 'a place is found by its name, case and accents ignored');
check(matchPlaces(list, 'london')[0]?.latDeg === 51.5074, 'the map\'s own city comes before Natural Earth\'s of the same name');
check(matchPlaces(list, 'x').length === 0 && matchPlaces(list, 'zzzz').length === 0, 'one letter, or a name not in the lists, finds nothing (nothing is asked of anybody)');
check(JSON.stringify(durationParts(359.6)) === '{"m":6,"s":0}' && JSON.stringify(durationParts(382.4)) === '{"m":6,"s":22}', 'durations round to whole seconds without "5 min 60 s"');
const checker = readFileSync(join(JS, 'ui/eclipsecheck.js'), 'utf8');
check(!/fetch\(\s*['"`]https?:/.test(checker) && !/coords\.|geolocation\./.test(checker) && /askPosition\(/.test(checker), 'the checker fetches no other host and never asks for a position itself (ui/place.js askPosition does, and rounds it)');
check(/writeLink\(fromName \? place\.name : ''\)/.test(checker), 'only a listed place\'s name ever goes in the address, never a position');

// --- the budget ------------------------------------------------------------------------------------------------------------
{
  const yaml = readFileSync(join(ROOT, 'registry/budgets.yaml'), 'utf8');
  const m = yaml.match(/id: eclipse_2027_places_bytes, value: (\d+)/);
  const size = readFileSync(join(ROOT, 'site/data/eclipse-2027-places.json')).length;
  check(m && size <= Number(m[1]), `site/data/eclipse-2027-places.json is ${size} B, inside eclipse_2027_places_bytes (${m && m[1]})`);
}

if (problems.length) { console.error(`eclipse 2027 FAILED (${problems.length}):\n  ` + problems.join('\n  ')); process.exit(1); }
console.log(`eclipse 2027 ok: NASA's elements reproduce its greatest eclipse, its central line and its limits; four cities agree with the published values (${notes.join('; ')})`);
