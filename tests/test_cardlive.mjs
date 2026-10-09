// tests/test_cardlive.mjs -- the pure pieces of "cards and live facts" (2026-10-08):
//   the distance that ticks and its light time (internal #295), the six-year distance curve's
//   samples and closest approach (#296), "Up for N years" (#127), who is aboard a station and
//   what is docked, with the list's age (#133), and the oldest things in the catalogue (#135).
//
//   node tests/test_cardlive.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const live = await import(join(JS, 'ui/cardlive.js'));
const crew = await import(join(JS, 'data/crew.js'));
const { crewRows } = await import(join(JS, 'ui/cardextras.js'));
const { oldestRows, rememberLaunches, launchMsOf, parseSatcat } = await import(join(JS, 'data/satcat.js'));
const { earthDistanceAt, timeFactWords } = await import(join(JS, 'ui/cards.js'));
const { UNITS, COPY } = await import(join(JS, 'copy/en.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const NN = ' ';

// --- 1. light time, to the second ----------------------------------------------------------------
const C = 299792.458;
check(live.lightTimeText(C * 1.3) === '1.3 s', `1.3 light seconds (${live.lightTimeText(C * 1.3)})`);
check(live.lightTimeText(C * 499) === '8 min 19 s', `the Sun's 499 s is 8 min 19 s (${live.lightTimeText(C * 499)})`);
check(live.lightTimeText(C * 425) === '7 min 05 s', `seconds keep two digits (${live.lightTimeText(C * 425)})`);
check(live.lightTimeText(C * (4 * 3600 + 10 * 60 + 7)) === '4 h 10 min 07 s', `hours (${live.lightTimeText(C * 15007)})`);
check(live.lightTimeText(NaN) === '' && live.lightTimeText(-1) === '', 'no distance, no light time');
const w = live.liveDistanceWords(312456789.4);
check(w && w.km === `312${NN}456${NN}789`, `kilometres to the last one, in groups of three with U+202F (${w && w.km})`);
check(w && w.light === '17 min 22 s', `and its light time (${w && w.light})`);
check(live.liveDistanceWords(null) === null && live.liveDistanceWords(0) === null, 'nothing to give is null, never a zero');

// --- 1b. another star's planet: light-years, three figures, no ticking (internal #476) ----------------
{
  const trappist = 40.7 * live.LIGHT_YEAR_KM;
  const f = live.liveDistanceWords(trappist);
  check(f && f.far === true && f.km === '40.7' && f.light === f.km, `TRAPPIST-1 at 40.7 light-years reads 40.7, not a kilometre count (${f && f.km})`);
  const g = live.liveDistanceWords(trappist + 5e6);
  check(g.km === f.km, 'five million kilometres later it is the same words: it does not tick');
  check(live.liveDistanceWords(4.2465 * live.LIGHT_YEAR_KM).km === '4.25', 'under ten, two decimals');
  check(live.liveDistanceWords(2.5e10).far === undefined, 'Voyager 1 (about 165 au) is still kilometres');
  check(Math.abs(live.LIGHT_YEAR_KM - 9.4607304725808e12) < 1e3, 'a light-year is 9.4607e12 km');
  const extras = readFileSync(new URL('../site/js/ui/cardextras.js', import.meta.url), 'utf8');
  check(/words\.far/.test(extras) && /L\.lightYears/.test(extras) && /L\.noteFar/.test(extras), 'the card block gives the far words one row and its note');
}

// --- 2. it ticks once a second, and stands still under reduced motion ----------------------------
const T = Date.UTC(2026, 9, 8, 12, 0, 0);
check(live.liveKey(T + 999) === T && live.liveKey(T + 1000) === T + 1000, 'the shown instant is the whole second');
check(live.liveKey(T + 59e3, true) === T && live.liveKey(T + 60e3, true) === T + 60e3, 'under reduced motion it is the whole minute');
// A thing receding at 24 km/s: two readings a second apart differ, and by 24 km.
const receding = (tMs) => 3e8 + ((tMs - T) / 1000) * 24;
const a = live.liveDistanceWords(receding(live.liveKey(T + 100)));
const b = live.liveDistanceWords(receding(live.liveKey(T + 1100)));
check(a.km !== b.km && a.km === `300${NN}000${NN}000` && b.km === `300${NN}000${NN}024`, `a second later the number has moved by what the speed says (${a.km} -> ${b.km})`);
const still1 = live.liveDistanceWords(receding(live.liveKey(T + 100, true)));
const still2 = live.liveDistanceWords(receding(live.liveKey(T + 30e3, true)));
check(still1.km === still2.km, 'under reduced motion it does not move within the minute');

// --- 3. the curve: samples, and a closest approach finer than the sampling -----------------------
// A rock that passes 38 000 km from the Earth at a known instant, moving at 7 km/s past it: the
// distance is a hyperbola-like V, and the true minimum sits between two six-day samples.
const PASS = T + 400.37 * 864e5;
const flyby = (tMs) => Math.hypot(38000, ((tMs - PASS) / 1000) * 7);
const samples = live.distanceSamples(flyby, T - live.SPARK_SPAN_MS, T + live.SPARK_SPAN_MS);
check(samples.length === live.SPARK_SAMPLES, `${live.SPARK_SAMPLES} samples (${samples.length})`);
check(samples[0].tMs === T - live.SPARK_SPAN_MS && samples[samples.length - 1].tMs === T + live.SPARK_SPAN_MS, 'from three years before to three years after');
const coarse = Math.min(...samples.map((s) => s.km));
const min = live.closestApproach(flyby, samples);
check(coarse > 1e5, `the coarse samples alone miss the pass (${Math.round(coarse)} km)`);
check(Math.abs(min.tMs - PASS) < 120e3, `the closest approach is found to two minutes (${Math.round((min.tMs - PASS) / 1000)} s off)`);
check(Math.abs(min.km - 38000) < 50, `and its distance to 50 km (${Math.round(min.km)} km)`);
// A function with holes (a path file that ends) gives fewer samples and never throws.
const holes = live.distanceSamples((tMs) => (tMs > T ? null : flyby(tMs)), T - live.SPARK_SPAN_MS, T + live.SPARK_SPAN_MS);
check(holes.length > 0 && holes.length < samples.length && holes.every((s) => s.tMs <= T), 'a time with no answer is left out');
check(live.distanceSamples(() => { throw new Error('x'); }, 0, 1e9).length === 0, 'a propagator that throws gives no samples');
check(live.closestApproach(flyby, []) === null, 'no samples, no closest approach');
const g = live.sparkGeometry(samples, T, min, 320, 56);
check(g && g.path.startsWith('M0 ') && g.nowX === 160 && g.minX > 160 && g.minX < 320, `the geometry puts now in the middle and the pass after it (${g && g.nowX}, ${g && g.minX})`);
check(g && g.minY > 54, `a pass at a tenth of the Moon's distance sits on the baseline (${g && g.minY})`);
check(live.closestDistanceText(38000) === '0.1 Moon distances', `38 000 km is 0.1 of the Moon's distance (${live.closestDistanceText(38000)})`);
check(live.closestDistanceText(1.5 * UNITS.AU_KM) === '1.50 AU', `beyond a hundred Moon distances it is AU (${live.closestDistanceText(1.5 * UNITS.AU_KM)})`);
const cw = live.closestWords({ tMs: Date.UTC(2029, 3, 13, 21, 46), km: 38000 }, false);
check(cw === 'Closest: 13 Apr 2029 · 0.1 Moon distances', `the closest approach in words, the date in UTC (${cw})`);
check(live.closestWords({ tMs: Date.UTC(2029, 3, 13), km: 38000 }, true).startsWith('Closest: about '), 'an approximate path says "about"');
check(cw.length <= 44 && live.closestWords({ tMs: Date.UTC(2029, 8, 23), km: 99 * 384400 }, true).length <= 50, `one line of a 320 px card (${cw.length} characters)`);
check(g && g.tickY < 56 - 10, `the closest approach's mark stands on the baseline even when the curve touches it (${g && g.tickY})`);

// --- 4. the card's own distance function: from the same propagation, and null where it has none --
const earthAt = (tMs) => ({ x: UNITS.AU_KM * Math.cos(tMs / 5e9), y: UNITS.AU_KM * Math.sin(tMs / 5e9), z: 0 });
const ctx = { worlds: { positionOf: (id, tMs) => (id === 'earth' ? earthAt(tMs) : null) } };
check(earthDistanceAt({ id: 'earth', frame: 'sun-inertial' }, ctx) === null, 'the Earth has no distance from itself');
check(earthDistanceAt({ id: 'sat-1', frame: 'earth-inertial' }, ctx) === null, 'an Earth orbiter is not given one here');
check(earthDistanceAt({ id: 'jwst', frame: 'sun-inertial', meta: { earthRangeKm: 1.5e6 } }, ctx) === null, 'a craft whose range is a typed number does not tick');
const fixed = { id: 'rock', frame: 'sun-inertial', propagator: 'static', position: { x: 0, y: 0, z: 0 }, cls: 'modelled' };
const dAt = earthDistanceAt(fixed, ctx);
const d0 = dAt ? dAt(T) : null;
check(d0 === null || Math.abs(d0 - UNITS.AU_KM) < 1, `a thing at the Sun is one AU from the Earth, or has no position at all (${d0})`);

// --- 5. "Up for N years" -------------------------------------------------------------------------
const L98 = Date.UTC(1998, 10, 20);
check(live.upFor(L98, Date.UTC(2026, 9, 8)) === 27 && live.upFor(L98, Date.UTC(2026, 10, 21)) === 28, 'whole years, counted to the day');
check(live.upFor(L98, L98 - 1) === null && live.upFor(null, T) === null, 'no date, or a date after the clock: null');
check(live.upForWords(L98, 1998, Date.UTC(2026, 9, 8)) === 'Up for 27 years: launched 20 November 1998', `from the catalogue's date (${live.upForWords(L98, 1998, Date.UTC(2026, 9, 8))})`);
check(live.upForWords(null, 1998, Date.UTC(2026, 9, 8)) === 'Launched in 1998: about 28 years up', `from the designator's year, said as about (${live.upForWords(null, 1998, Date.UTC(2026, 9, 8))})`);
check(live.upForWords(null, null, T) === null, 'from neither: nothing');
check(timeFactWords({ windows: [], launchYear: 1998, launchMs: L98 }, Date.UTC(2026, 9, 8)).launched === 'Up for 27 years: launched 20 November 1998', 'the card says it from the catalogue when it is at hand');
// The catalogue remembered by number: Vanguard 1 is NORAD 5, 17 March 1958.
const csv = readFileSync(join(ROOT, 'tests/fixtures/harvest/celestrak_satcat.csv'), 'utf8');
const rows = parseSatcat(csv);
check(launchMsOf(5) === null, 'before the catalogue is read the card has no date');
rememberLaunches(rows);
check(launchMsOf(5) === Date.UTC(1958, 2, 17), `after it, Vanguard 1's is 17 March 1958 (${new Date(launchMsOf(5) || 0).toISOString()})`);
check(launchMsOf('nope') === null && launchMsOf(999999) === null, 'an unknown number is null');

// --- 6. the oldest things up (internal #135) ----------------------------------------------------
const FIXED = Date.UTC(2026, 9, 8);
const old = oldestRows(rows, FIXED, 5);
check(old.length > 0 && old[0].id === 5 && /VANGUARD 1/.test(old[0].name), `Vanguard 1 is first (${old[0] && old[0].name})`);
check(old[0].years === 68, `68 whole years on 8 October 2026 from a fixed clock (${old[0] && old[0].years})`);
check(old.every((r, i) => i === 0 || r.launchMs >= old[i - 1].launchMs), 'oldest first');
check(old.every((r) => r.kind !== 'debris'), 'no debris in the list');
const { OLDEST_NOTES } = await import(join(JS, 'data/oldestnotes.js'));
check(OLDEST_NOTES['5'] && OLDEST_NOTES['5'].source.startsWith('https://') && OLDEST_NOTES['5'].line.length <= 120, 'Vanguard 1 has a sourced line');

// --- 7. who is aboard, and what is docked (internal #133) ----------------------------------------
const stations = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/harvest/ll2_stations.json'), 'utf8'));
const astros = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/harvest/ll2_crew.json'), 'utf8'));
const READ = Date.UTC(2026, 9, 8, 9, 0, 0);
const iss = crew.stationCrew('sat-25544', stations, astros);
const css = crew.stationCrew('sat-48274', stations, astros);
check(iss && iss.crewCount === 7 && iss.matched && iss.people.length === 7, `the ISS: the publisher's count is 7 and the join finds 7 (${iss && iss.people && iss.people.length})`);
check(css && css.crewCount === 3 && css.matched && css.people.length === 3, `Tiangong: 3 and 3 (${css && css.people && css.people.length})`);
check(crew.parseAstronauts(astros).length === 14, `LL2 flags 14 people as in space (a "Non-Human" row is dropped) (${crew.parseAstronauts(astros).length})`);
check(!iss.people.some((p) => /Starman/.test(p.name)), 'a mannequin is not a person aboard');
check(!iss.people.some((p) => /Meir|Adenot/.test(p.name)), 'someone whose spacecraft has left is not listed, whatever the flag says');
check(iss.docked.length === 5 && css.docked.length === 2, `five vehicles at the ISS, two at Tiangong (${iss.docked.length}, ${css.docked.length})`);
check(iss.docked[0].vehicle === 'Crew Dragon Grace' && iss.docked[0].port === 'Harmony forward', `newest docking first (${iss.docked[0].vehicle})`);
check(crew.stationCrew('sat-1', stations, astros) === null, 'another satellite has no crew source');
// The ages: days up are counted to the moment the list was read.
const r = crewRows(iss, READ, READ + 2 * 3600e3);
check(r.count === '7 people aboard' && r.hint === '7 aboard', `the count (${r.count})`);
const kikina = r.people.find(([name]) => name === 'Anna Kikina');
check(kikina && kikina[1] === 'RFSA · 85 days up', `launched 14 July, read 8 October: 85 days up (${kikina && kikina[1]})`);
const watkins = r.people.find(([name]) => name === 'Jessica Watkins');
check(watkins && watkins[1] === 'NASA · 6 days up', `launched 1 October: 6 days (${watkins && watkins[1]})`);
check(crew.daysBetween(Date.UTC(2026, 9, 1, 15, 10, 6), READ) === 6 && crew.daysBetween(READ, READ - 1) === 0 && crew.daysBetween(null, READ) === null, 'whole days, never negative, null without a date');
check(r.asOf === 'Read 2 hours ago from Launch Library 2 (The Space Devs).' && !r.stale, `two hours old says so (${r.asOf})`);
check(r.docked[0][1] === 'Harmony forward · 1 Oct 2026', `a docked vehicle's port and the day it docked (${r.docked[0][1]})`);
const stale = crewRows(iss, READ, READ + 49 * 3600e3);
check(stale.stale && stale.asOf === 'Read on 8 October 2026: more than two days old, so it may have changed.', `past 48 h it says so, with the date (${stale.asOf})`);
check(!crewRows(iss, READ, READ + 47 * 3600e3).stale, 'at 47 h it is not stale yet');
// When the join and the publisher's count disagree, the count stands alone.
const fewer = JSON.parse(JSON.stringify(astros));
fewer.results = fewer.results.filter((x) => x.name !== 'Anna Kikina');
const off = crew.stationCrew('sat-25544', stations, fewer);
check(off.crewCount === 7 && off.people === null && !off.matched, 'a list that does not add up to the count is not shown');
check(crewRows(off, READ, READ).unmatched && crewRows(off, READ, READ).people.length === 0, 'and the card says the names did not match');
check(crew.stationCrew('sat-25544', stations, null).people === null, 'no astronauts answer: the count and the vehicles only');
check(crewRows(null, READ, READ) === null, 'no station, no rows');
for (const key of ['asOf', 'stale', 'joined', 'unmatched']) check(COPY.crew[key].length <= 90, `COPY.crew.${key} fits a caption`);

// --- 8. a comet's rises, highest and sets, in words (internal #299) ------------------------------
{
  const { fromPlaceWords, smallBodyFromLine } = await import(join(JS, 'ui/cardextras.js'));
  const Astronomy = await import(join(ROOT, 'site/vendor/astronomy.js'));
  const { timeText } = await import(join(JS, 'copy/en.js'));
  const NOWMS = Date.UTC(2026, 9, 8, 12, 0, 0);
  const jupiterAsARock = (ms) => { const v = Astronomy.GeoVector('Jupiter', new Date(ms), true); return { x: v.x, y: v.y, z: v.z }; };
  const line = smallBodyFromLine(jupiterAsARock, { latDeg: 51.5, lonDeg: -0.1, name: 'London' }, NOWMS);
  check(typeof line === 'string' && /^From London: /.test(line) && /sets \d\d:\d\d in the /.test(line), `the line names the place and a set time (${line})`);
  check(/most need a telescope\.$/.test(line || ''), 'and ends by saying that up is not bright');
  check(smallBodyFromLine(jupiterAsARock, null, NOWMS) === null, 'no place, no line');
  check(smallBodyFromLine(jupiterAsARock, { latRad: 51.5 * Math.PI / 180, lonRad: 0 }, NOWMS).startsWith('From where you are: '), 'a place in radians and without a name is "where you are", as on a planet\'s card');
  const down = fromPlaceWords({ upNow: false, altDeg: -20, azDeg: 80, riseMs: NOWMS + 3600e3, riseAzDeg: 90, highMs: NOWMS + 6 * 3600e3, highAltDeg: 20, setMs: NOWMS + 11 * 3600e3, setAzDeg: 270, never: false, always: false }, 'Quito');
  check(down === `From Quito: rises ${timeText.hhmm(NOWMS + 3600e3)} in the east, highest ${timeText.hhmm(NOWMS + 6 * 3600e3)}, about two fists above the horizon; sets ${timeText.hhmm(NOWMS + 11 * 3600e3)} in the west.`, `down now (${down})`);
  check(fromPlaceWords({ upNow: false, never: true, altDeg: -40, azDeg: 0, riseMs: null, riseAzDeg: null, highMs: null, highAltDeg: null, setMs: null, setAzDeg: null }, 'Quito') === 'From Quito it does not rise in the next day and a half.', 'never up');
  check(fromPlaceWords(null, 'Quito') === null, 'no answer, no words');
}

// --- the ticking distance is for the Solar System only (internal #476) ---------------------------
{
  const far = (id, klass) => ({ id, klass, frame: 'sun-inertial', meta: {} });
  for (const k of ['star', 'exoplanet', 'dso', 'exotic']) check(earthDistanceAt(far('x-' + k, k), {}) === null, `a ${k} has no ticking kilometres`);
}

if (problems.length) {
  console.error('cardlive FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`cardlive ok: light time to the second, a number that moves by 24 km a second later and stands still under reduced motion, a closest approach found ${Math.round(Math.abs(min.tMs - PASS) / 1000)} s from a pass between six-day samples, "Up for 27 years" from the catalogue and "about 28" from the designator, Vanguard 1 first at 68 years, and 7 + 3 people aboard joined to 7 docked vehicles with ages to the read time`);
