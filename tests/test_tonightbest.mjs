// tests/test_tonightbest.mjs -- Tonight's best (internal #358) and a pass as a row a person can use
// (pub #448): the night's window, the planets and the Moon against Astronomy Engine, the ranking,
// the pass row's formatting, and the wiring in the Tonight view.
//   TZ=UTC node tests/test_tonightbest.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

process.env.TZ = 'UTC';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const T = await import(join(JS, 'sky/tonightbest.js'));
const A = await import(join(ROOT, 'site/vendor/astronomy.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const { passTrack, predictPasses } = await import(join(JS, 'sky/passes.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const R = Math.PI / 180;
const here = { latDeg: 40, lonDeg: 0 };
const obs = new A.Observer(40, 0, 0);
const sunAlt = (ms) => { const d = new Date(ms); const eq = A.Equator('Sun', d, obs, true, true); return A.Horizon(d, obs, eq.ra, eq.dec, null).altitude; };

// --- the night ---------------------------------------------------------------------------------------
const evening = Date.parse('2026-10-20T15:00:00Z'); // mid-afternoon
const win = T.nightWindow(here, evening);
check(win && !win.darkNow && Math.abs(sunAlt(win.startMs) + 6) < 0.05 && Math.abs(sunAlt(win.endMs) + 6) < 0.05, 'tonight runs from the Sun 6 degrees down to 6 degrees down again');
check(win.endMs - win.startMs > 10 * 3600e3 && win.endMs - win.startMs < 13 * 3600e3, 'an October night at 40 north is 10 to 13 hours');
const midnight = Date.parse('2026-10-20T23:00:00Z');
const win2 = T.nightWindow(here, midnight);
check(win2 && win2.darkNow && win2.startMs === midnight && Math.abs(win2.endMs - win.endMs) < 60e3, 'already dark: the window starts now and ends at the same dawn');
check(T.nightWindow({ latDeg: 78, lonDeg: 15 }, Date.parse('2026-06-21T12:00:00Z')) === null, 'Svalbard in June: no night, and no throw');
check(T.nightWindow(null, evening) === null && T.nightWindow(here, NaN) === null, 'no place or no time: null');

// --- the planets and the Moon --------------------------------------------------------------------------
const saturn = T.planetTonight('saturn', here, win);
check(saturn && saturn.altDeg > 45 && saturn.altDeg < 56 && Math.abs(saturn.azDeg - 180) < 12, `Saturn in October 2026 is highest in the south, about 50 degrees up (${saturn && saturn.altDeg.toFixed(1)} at ${saturn && saturn.azDeg.toFixed(0)})`);
check(saturn && Math.abs(saturn.mag - A.Illumination('Saturn', new Date(saturn.bestMs)).mag) < 1e-9, 'its magnitude is Astronomy Engine\'s at that time');
check(saturn && saturn.bestMs >= win.startMs && saturn.bestMs <= win.endMs, 'its best time is inside the dark hours');
{
  // The best time really is the highest: half an hour either side is lower.
  const alt = (ms) => { const d = new Date(ms); const eq = A.Equator('Saturn', d, obs, true, true); return A.Horizon(d, obs, eq.ra, eq.dec, 'normal').altitude; };
  check(alt(saturn.bestMs) >= alt(saturn.bestMs - 1800e3) && alt(saturn.bestMs) >= alt(saturn.bestMs + 1800e3), 'and it is lower half an hour before and after');
}
check(T.planetTonight('venus', here, win) === null, 'Venus four days from the Sun in October 2026 is not offered');
check(T.planetTonight('pluto', here, win) === null, 'an unknown planet is null');
const moon = T.moonTonight(here, win);
check(moon && moon.percent === Math.round(A.Illumination('Moon', new Date(win.startMs)).phase_fraction * 100) && moon.waxing === true && moon.phase === 'waxingGibbous', `the Moon on 20 October 2026: ${moon && moon.percent} % and waxing gibbous`);
check(moon.upAtStart && moon.upTonight && moon.setMs > win.startMs && moon.setMs < win.endMs, 'up at dusk, and it sets before dawn');
const names = [[0, 'new'], [45, 'waxingCrescent'], [90, 'firstQuarter'], [135, 'waxingGibbous'], [180, 'full'], [225, 'waningGibbous'], [270, 'lastQuarter'], [315, 'waningCrescent'], [355, 'new']];
for (const [deg, name] of names) check(T.phaseName(deg) === name, `phase ${deg} is ${name}`);
check(names.every(([, n]) => typeof COPY.tonight.best.phases[n] === 'string'), 'every phase has its words');

// --- a pass as a row --------------------------------------------------------------------------------------
const t0 = Date.parse('2026-10-20T19:03:10Z');
const iss = {
  recordId: '25544', record: { id: '25544', name: 'ISS (ZARYA)', klass: 'station' },
  startMs: t0, peakMs: t0 + 190e3, endMs: t0 + 400e3, visibleStartMs: t0 + 40e3, visibleEndMs: t0 + 330e3,
  sunlitStartMs: t0, sunlitEndMs: t0 + 330e3,
  startAz: 225 * R, peakAz: 150 * R, endAz: 62 * R, peakEl: 52.4 * R, visible: true, sunlit: true, magnitude: -3.14,
};
const n = T.passNumbers(iss);
check(n.startMs === iss.startMs && n.endMs === iss.endMs && n.peakMs === iss.peakMs && n.peakDeg === 52 && n.fades === true && n.appears === false, 'the row\'s three moments are the pass\'s own, as its three directions are, and it says the pass fades into shadow');
const w = T.passWords(iss);
check(w.line === '19:03 SW · 19:06 52° SSE · 19:09 ENE' && w.side === 'mag −3.1', `the row: start, highest, end, and its magnitude beside the name (${w.line} / ${w.side})`);
check(w.line.length <= 40 && !/\s{2}/.test(w.line), 'one line that fits the sidebar in mono: 40 characters at most');
check(w.note === COPY.tonight.best.fades && w.aria.includes('highest 19:06 at 52°') && w.aria.endsWith(COPY.tonight.best.fades), 'the sentence for a screen reader says the same and adds the fade');
check(T.magText(-3.14) === '−3.1' && T.magText(0.04) === '0.0' && T.magText(null) === '—' && T.magText(NaN) === '—', 'a real minus sign, one decimal, and a dash for no number');
check(T.compassShort(0) === 'N' && T.compassShort(202.5) === 'SSW' && T.compassShort(359) === 'N' && T.compassShort(NaN) === '', 'sixteen compass points');
const rb = { ...iss, recordId: '22285', record: { id: '22285', name: 'SL-16 R/B', klass: 'rocket' }, magnitude: null, peakEl: 80 * R };
check(T.passWords(rb).name === 'Rocket body · SL-16' && T.passWords(rb).side === 'mag —', `a rocket body says so in words, and an unknown brightness is a dash (${T.passWords(rb).name})`);
check(T.plainName({ id: '1', name: 'FENGYUN 1C DEB', klass: 'debris' }) === 'Debris · FENGYUN 1C', 'debris says so too');
check(T.passWords({ ...iss, visible: false, visibleStartMs: null, visibleEndMs: null }).note === COPY.tonight.best.notVisible, 'a pass that cannot be seen says so');
check(T.passNumbers(null) === null && T.passWords({}) === null, 'no pass, no row');
check(T.standardMagnitude({ id: '25544' }) === -1.8 && T.standardMagnitude({ id: '48274' }) === 0 && T.standardMagnitude({ id: '20580' }) === null && T.standardMagnitude({ id: '5', meta: { stdMag: 3.2 } }) === 3.2, 'the two stations have a standard magnitude; nothing else is guessed');

// --- the ranking --------------------------------------------------------------------------------------------
check(T.passScore(iss) > T.passScore(rb) && T.passScore(rb) > 60 && T.passScore({ ...iss, visible: false }) === 0, 'a bright pass outranks a high one of unknown brightness; an invisible one scores nothing');
check(T.passScore({ ...iss, magnitude: -3.9 }) > T.passScore(iss) && T.passScore({ ...iss, peakEl: 80 * R }) > T.passScore(iss), 'brighter is better, higher is better');
const faint = (i) => ({ ...iss, recordId: `9${i}`, record: { id: `9${i}`, name: `SAT ${i}` }, magnitude: 3 + i * 0.1, startMs: t0 + i * 600e3, endMs: t0 + i * 600e3 + 300e3, visibleStartMs: null, visibleEndMs: null });
const best = T.tonightBest({ observer: here, nowMs: evening, passes: [faint(1), rb, faint(2), iss, faint(3), faint(4)] });
const kinds = best.rows.map((r) => r.kind);
check(best.rows.length <= T.MAX_ROWS && kinds.filter((k) => k === 'pass').length === T.MAX_PASSES, `at most seven rows and three passes (${kinds})`);
check(best.rows[0].kind === 'pass' && best.rows[0].pass === iss, 'the station at magnitude -3 is first');
{
  const twice = T.tonightBest({ observer: here, nowMs: evening, passes: [iss, { ...iss, recordId: 'visual-25544', record: { ...iss.record, id: 'visual-25544' } }] });
  check(twice.rows.filter((r) => r.kind === 'pass').length === 1, 'the same pass from two catalogues is one row');
}
// Junk is not "best" (seen on the live site 2026-10-06: "Rocket body · Thor Agena D, mag —" in the list).
check(!best.rows.some((r) => r.kind === 'pass' && r.pass === rb), 'a spent rocket body of unknown brightness is not one of the best things to see');
check(T.isJunk(rb.record) && T.isJunk({ name: 'COSMOS 1408 DEB' }) && T.isJunk({ name: 'X', klass: 'debris' }) && !T.isJunk(iss.record) && !T.isJunk({ name: 'HST' }), 'junk is told by the catalogue name or the class');
{
  const brightStage = { ...rb, magnitude: 2.1 };
  const dimStage = { ...rb, recordId: '1', record: { id: '1', name: 'ATLAS CENTAUR R/B' }, magnitude: 4.4, startMs: t0 + 1800e3, endMs: t0 + 2100e3 };
  const list = T.tonightBest({ observer: here, nowMs: evening, passes: [brightStage, dimStage, iss] }).rows.filter((r) => r.kind === 'pass').map((r) => r.pass);
  check(list.includes(brightStage) && !list.includes(dimStage) && list.includes(iss), 'a stage with a known bright magnitude stays; a dim one goes; the station is untouched');
  check(T.worthARow({ ...iss, magnitude: null, record: { id: '20580', name: 'HST' } }), 'a named satellite with no magnitude is still offered');
}
for (let i = 0; i + 1 < best.rows.length; i += 1) check(best.rows[i].score >= best.rows[i + 1].score, `row ${i} outranks row ${i + 1}`);
const ids = best.rows.map((r) => r.kind === 'pass' ? 'pass' : r.id);
check(ids.includes('jupiter') && ids.includes('saturn') && ids.includes('moon') && !ids.includes('venus'), `Jupiter, Saturn and the Moon are in; Venus, lost in the Sun, is not (${ids})`);
check(ids.indexOf('jupiter') < ids.indexOf('saturn') && ids.indexOf('saturn') < ids.indexOf('moon'), 'Jupiter over Saturn over the Moon: by brightness, and the Moon needs no finding');
const shower = T.tonightBest({ observer: here, nowMs: Date.parse('2026-08-12T20:00:00Z'), passes: [] });
check(shower.rows.some((r) => r.kind === 'shower' && r.id === 'perseids'), 'on 12 August the Perseids are on the list');
for (const r of best.rows.concat(shower.rows)) {
  const words = T.bestWords(r);
  check(words && words.title && words.line && words.line.length <= 44 && !/\n/.test(words.line), `a row is a title and one line that fits the sidebar (${words && words.line})`);
}
check(T.darkWords(best) === `Dark 17:40 to 05:49 · ${COPY.tonight.best.moonBright.replace('{pct}', String(moon.percent))}`, `how dark tonight, with the Moon's part (${T.darkWords(best)})`);
check(T.darkWords(T.tonightBest({ observer: here, nowMs: Date.parse('2026-10-10T19:00:00Z') })).endsWith(COPY.tonight.best.moonless), 'a new Moon: a dark night');
check(T.darkWords({ window: null }) === COPY.tonight.best.neverDark, 'no night: it says so');
const polar = T.tonightBest({ observer: { latDeg: 78, lonDeg: 15 }, nowMs: Date.parse('2026-06-21T12:00:00Z'), passes: [] });
check(polar.window === null && polar.rows.length === 0, 'where it does not get dark the list is empty, not an error');

// --- the arc of a pass ----------------------------------------------------------------------------------------
{
  const sat = await import(join(ROOT, 'site/vendor/satellite.es.js')).catch(() => null);
  const src = readFileSync(join(JS, 'sky/passes.js'), 'utf8');
  check(/export function passTrack\(record, pass, observer, n = 48\)/.test(src), 'sky/passes.js passTrack(record, pass, observer, n)');
  check(passTrack(null, iss, here).length === 0 && passTrack({ satrec: { jdsatepoch: 1 } }, null, here).length === 0, 'no record or no pass: an empty track');
  void sat; void predictPasses;
}

// --- the Tonight view ---------------------------------------------------------------------------------------------
const ui = readFileSync(join(JS, 'ui/tonight.js'), 'utf8');
check(/tonightBest\(\{ observer: o, nowMs: ctx\.clock\.now\(\), passes:/.test(ui) && /bestWords\(r\)/.test(ui), 'the view draws tonightBest() with bestWords()');
check(/sky\.showPass\(track, marks\)/.test(ui) && /ctx\.clock\.goTo\(n\.startMs\)/.test(ui), 'a pass row puts the clock at the pass and draws its arc on the sky');
check(/sky\(\)\.setOption\('red'/.test(ui) && /sky\(\)\.setOption\('darkness', d\)/.test(ui) && /sky\(\)\.setFov\(FOV\[f\]\)/.test(ui), 'the sky\'s controls: red light, the kind of sky, the field of view');
check(/removeEventListener\('sr:sky', onSky\)/.test(ui), 'destroy() stops listening to the sky');
check(/meta: m === null \? \{\} : \{ stdMag: m \}/.test(ui), 'a record with no standard magnitude sends none to the worker: a null there would be read as magnitude 0');
const css = readFileSync(join(ROOT, 'site/css/ui.css'), 'utf8');
check(/html\.sr-night-red::after \{[^}]*mix-blend-mode: multiply/.test(css) && /--sr-night-red: #c40000;/.test(css), 'red light is one red multiplied over the whole page, capped under full red');
const K = COPY.tonight.skybar;
for (const group of [K.fields, K.toggles, K.darknessModes]) for (const v of Object.values(group)) check(v.split(' ').length <= 2, `a button is two words at most (${v})`);

if (problems.length) { console.error('tonight best FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`tonight best ok: the night from -6 to -6 degrees, Saturn highest ${saturn.altDeg.toFixed(0)} degrees up in the south, the Moon ${moon.percent} % waxing gibbous, a pass as "${w.line}", ${best.rows.length} rows ranked (${ids.join(', ')}), the Perseids on 12 August, an empty list where it does not get dark`);
