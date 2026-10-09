// tests/test_pagelive.mjs -- the browser half of the crawlable pages (site/js/pages/live.js).
//
// The pages answer in static HTML first and let this module replace the numbers. What can be held
// without a browser is held here: the station's position from the saved elements (against what an
// orbit of 51.6 degrees and 420 km must give), the words for where it is, the saved-count readers,
// the planets and the dated events from a place (against the same maths scripts/seo_facts.mjs runs
// at build time), and the two promises the page makes about itself: it asks for no location until a
// button is pressed, and it asks no outside host for anything.
//   node tests/test_pagelive.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const L = await import(join(ROOT, 'site/js/pages/live.js'));
const A = await import(join(ROOT, 'site/vendor/astronomy.js'));
const R = await import(join(ROOT, 'site/js/sky/radiants.js'));
const T = await import(join(ROOT, 'site/js/sky/tonightbest.js'));
const { predictPasses } = await import(join(ROOT, 'site/js/sky/passes.js'));
const { satrecFrom } = await import(join(ROOT, 'site/js/propagate/sgp4.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// --- the saved copies
const fixture = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/harvest/celestrak_gp.json'), 'utf8'));
const snapshot = { schema: 1, source: 'celestrak-stations', fetched_at: '2026-09-07T12:30:00Z', body: fixture };
const omm = L.issElements(snapshot);
check(omm && omm.NORAD_CAT_ID === 25544, 'issElements finds the station (NORAD 25544) in a snapshot body');
check(L.issElements({ body: [{ NORAD_CAT_ID: 1 }] }) === null && L.issElements(null) === null, 'issElements is null when the station is not there');
const index = { snapshots: { 'celestrak-supplemental-starlink': { items: 11129, fetched_at: '2026-10-08T09:00:00Z', valid_until: null, status: 'ok' }, bad: { items: 'x' } } };
const row = L.snapshotRow(index, 'celestrak-supplemental-starlink');
check(row && row.items === 11129 && row.fetchedAt === '2026-10-08T09:00:00Z', 'snapshotRow reads the count and the day from index.json');
check(L.snapshotRow(index, 'bad') === null && L.snapshotRow(index, 'absent') === null && L.snapshotRow(null, 'x') === null, 'snapshotRow is null for a source without a count');
check(L.groups(11129) === '11,129' && L.groups(16587) === '16,587' && L.groups(999) === '999', 'groups() writes 11,129');
check(L.dateWords('2026-10-08T09:00:00Z') === '8 October 2026', 'dateWords() writes 8 October 2026');

// --- the station
const epoch = Date.parse(`${fixture[0].EPOCH}Z`);
let maxLat = 0;
let minAlt = 1e9;
let maxAlt = 0;
for (let m = 0; m <= 92; m += 4) {
  const s = L.subpoint(omm, epoch + m * 60e3);
  check(!!s, `subpoint exists ${m} minutes after the epoch`);
  if (!s) continue;
  maxLat = Math.max(maxLat, Math.abs(s.latDeg));
  minAlt = Math.min(minAlt, s.altKm);
  maxAlt = Math.max(maxAlt, s.altKm);
  check(s.lonDeg >= -180 && s.lonDeg <= 180, 'the longitude is folded into -180..180');
  check(s.speedKmh > 27000 && s.speedKmh < 28200, `the speed is about 27 600 km/h, not ${Math.round(s.speedKmh)}`);
}
check(maxLat > 50 && maxLat <= 51.7, `over an orbit the latitude reaches the inclination (51.6), not ${maxLat.toFixed(2)}`);
check(minAlt > 400 && maxAlt < 445, `the station is 400 to 445 km up, not ${minAlt.toFixed(0)} to ${maxAlt.toFixed(0)}`);
// A different element set must move it: the function cannot be returning a constant.
const a = L.subpoint(omm, epoch);
const b = L.subpoint(omm, epoch + 45 * 60e3);
check(Math.abs(a.lonDeg - b.lonDeg) > 5 || Math.abs(a.latDeg - b.latDeg) > 5, 'the station moves');
check(L.subpoint({}, epoch) === null && L.subpoint(omm, NaN) === null, 'no elements, or no time, is null and not a guess');

check(L.overWords({ kind: 'country', names: ['Brazil'], the: [false] }) === 'over Brazil', 'a country');
check(L.overWords({ kind: 'ocean', names: ['Pacific Ocean'], the: [true] }) === 'over the Pacific Ocean', 'an ocean takes its article');
check(L.overWords({ kind: 'border', names: ['Chad', 'Sudan'], the: [false, false] }) === 'near the border of Chad and Sudan', 'a border');
check(L.overWords({ kind: 'water', names: [], the: [] }) === 'over open water' && L.overWords(null) === '', 'open water, and no table at all');
const sentence = L.issSentence({ latDeg: -12.34, lonDeg: 150.06, altKm: 421.4, speedKmh: 27590 }, { kind: 'sea', names: ['Coral Sea'], the: [true] });
check(sentence === 'The International Space Station is now at 12.3° S, 150.1° E, over the Coral Sea, 421 km up and moving at 27,590 km/h.', `the sentence reads: ${sentence}`);

// passes: for a real place the next visible one starts after `from`, and is above the horizon
const london = { latDeg: 51.5074, lonDeg: -0.1278, altKm: 0, latRad: 51.5074 * Math.PI / 180, lonRad: -0.1278 * Math.PI / 180 };
const passes = predictPasses([{ satrec: satrecFrom(omm) }], london, epoch, 72);
check(passes.length > 5, `three days of ISS passes over London are many, not ${passes.length}`);
const next = L.nextPassOf(passes);
check(next === null || (next.visible === true && next.startMs >= epoch && next.peakEl > 10 * Math.PI / 180), 'nextPassOf is a visible pass, above 10 degrees');
check(L.nextPassOf([{ visible: false, startMs: 1 }]) === null, 'a pass that cannot be seen is not offered');
check(L.compass(0) === 'N' && L.compass(Math.PI / 2) === 'E' && L.compass(Math.PI) === 'S', 'compass points');

// --- tonight's planets: the page and the build use the same maths, so they agree
const day = Date.parse('2026-10-09T12:00:00Z');
const tonight = L.planetsTonight(T, london, day);
check(tonight.win && tonight.win.startMs > day && tonight.win.endMs > tonight.win.startMs, 'tonight has a window');
const names = tonight.up.map((p) => p.name).sort().join(',');
check(names === 'Jupiter,Mars,Saturn', `from London on the evening of 9 October 2026 Jupiter, Mars and Saturn are up in the dark, not ${names}`);
check(tonight.down.includes('Venus'), 'Venus (near the Sun that week) is not offered');
check(tonight.up[0].name === 'Jupiter', 'brightest first');
check(/^Jupiter, magnitude \u22121\.9: highest at \d\d:\d\d, \d+° up in the [NESW]{1,3}\.$/.test(L.planetRowWords(tonight.up[0], 'UTC')), `a planet row reads: ${L.planetRowWords(tonight.up[0], 'UTC')}`);
const south = { latDeg: -34.9, lonDeg: 138.6, altKm: 0 };
check(L.planetsTonight(T, south, day).up.length > 0, 'and from Adelaide too');

// --- dated events from a place
const geminids = { kind: 'meteor-shower', instant: '2026-12-14T02:00:00Z', shower: { raH: 7.47, decDeg: 33 } };
const g = L.eventFromPlace(A, R, geminids, london);
check(g.radiantAltDeg > 55 && g.radiantAltDeg < 85, `the Geminid radiant is high over London at 02:00 UT (it is ${g.radiantAltDeg}°)`);
const annular = { kind: 'eclipse', instant: '2027-02-06T15:59:32Z' };
const montevideo = { latDeg: -34.9, lonDeg: -56.2, altKm: 0, latRad: -34.9 * Math.PI / 180, lonRad: -56.2 * Math.PI / 180 };
const e1 = L.eventFromPlace(A, R, annular, montevideo).eclipse;
check(e1 && ['annular', 'partial'].includes(e1.kind) && e1.obscuration > 60, `Montevideo sees the 6 February 2027 eclipse (${JSON.stringify(e1)})`);
const e2 = L.eventFromPlace(A, R, annular, london).eclipse;
check(e2 && e2.kind === 'none', `London does not (${JSON.stringify(e2)})`);
const venus = { kind: 'meteor-shower', instant: '2027-01-04T03:30:00Z', shower: { raH: 15.33, decDeg: 49.5 }, also: [{ body: 'venus', instantMs: Date.parse('2027-01-03T17:56:03Z') }] };
check(L.eventFromPlace(A, R, venus, london).also[0].body === 'venus', 'an event can carry a planet along with it');

// --- what the page promises about itself
const src = readFileSync(join(ROOT, 'site/js/pages/live.js'), 'utf8');
const code = src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
check(!/watchPosition/.test(code), 'the position is never watched');
check(!/getCurrentPosition|geolocation/.test(code), 'the page never asks the browser where it is (only ui/place.js does: tests/test_place_privacy.mjs); the place is the kept one, a guess from the time zone, or a typed city');
check(!/https?:\/\//.test(code), 'the page module names no outside host; it reads the saved copies beside the page');
check(!/celestrak/i.test(code.replace(/celestrak-[a-z-]+/g, '')), 'and does not fetch CelesTrak (its usage policy: one download per update)');
check(!/localStorage\.setItem|keepPlace\(/.test(code), 'it never keeps a place (that is the map\'s to do, on the visitor\'s say)');

if (problems.length) { console.error('page live FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('page live ok: the station from saved elements (latitude to 51.6, 400 to 445 km up), the words, the counts, tonight\'s planets, a place\'s eclipse and shower, and no location prompt on load');
