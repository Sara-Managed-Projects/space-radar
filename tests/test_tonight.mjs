// tests/test_tonight.mjs -- your sky tonight, the rules (spec 0051 task 1): the next visible pass and
// its words, the 40 degree rule under a guessed place (and the offset table that justifies it), the
// "Up now" transition, "nothing tonight" searching 72 hours, the darkness line against Astronomy
// Engine directly and in a polar summer, and the worker's message shape.
//
//   node tests/test_tonight.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const tn = await import(join(JS, 'sky/tonight.js'));
const { runPasses } = await import(join(JS, 'sky/passworker.js'));
const { predictPasses } = await import(join(JS, 'sky/passes.js'));
const { parseCelestrakGP } = await import(join(JS, 'data/parsers.js'));
const { guessObserver } = await import(join(JS, 'sky/guessplace.js'));
const { CITIES, timeText } = await import(join(JS, 'copy/en.js'));
const Astronomy = await import(join(ROOT, 'site/vendor/astronomy.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

const gp = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/harvest/celestrak_gp.json'), 'utf8'));
const records = parseCelestrakGP(gp, { layer: 'stations', source: 'celestrak-stations' });
const iss = records[0];
const place = (latDeg, lonDeg, extra = {}) => ({ name: 'Chicago', latDeg, lonDeg, latRad: latDeg * RAD, lonRad: lonDeg * RAD, altKm: 0, ...extra });
const guess = guessObserver(CITIES, { timeZone: 'America/Chicago', now: new Date(iss.epoch) });
check(guess && guess.name === 'Chicago' && guess.source === 'guess', `America/Chicago guesses Chicago, as a guess (${guess && guess.name}, ${guess && guess.source})`);
const chicagoGuess = guess || place(41.8781, -87.6298, { source: 'guess' });
const chicagoSet = { ...chicagoGuess, source: 'set' };

// --- the worker's message --------------------------------------------------------------------------
const T0 = iss.epoch;
const answer = runPasses({ id: 7, records, observer: chicagoGuess, fromMs: T0, hours: 72 });
check(answer.id === 7 && Array.isArray(answer.passes) && answer.passes.length > 0, `the worker answers its message with passes (${answer.passes.length})`);
check(answer.passes.every((p) => p.recordId === iss.id && !('record' in p)), 'passes cross back with the record id, not the record');
const passes = answer.passes.map((p) => ({ ...p, record: records.find((r) => r.id === p.recordId) }));
const visible = passes.filter((p) => p.visible);
check(visible.length >= 3, `the fixture ISS has visible passes over Chicago in 72 h (${visible.length})`);

// --- the next pass, and the 40 degree rule under a guess -----------------------------------------------
const first = tn.nextVisible(passes, chicagoGuess, T0);
check(first && first.visible && first.peakEl * DEG >= 40, `under a guess the next one peaks at 40 degrees or more (${first && (first.peakEl * DEG).toFixed(0)})`);
const low = visible.find((p) => p.peakEl * DEG < 40 && p.peakEl * DEG >= 10);
check(!!low, 'the fixture has a visible pass under 40 degrees to test the rule with');
if (low) {
  const before = low.startMs - 60e3;
  const g = tn.nextVisible(passes, chicagoGuess, before);
  const s = tn.nextVisible(passes, chicagoSet, before);
  check(s && s.startMs === low.startMs, `with a place set, a ${(low.peakEl * DEG).toFixed(0)} degree pass is the next one`);
  check(!g || g.startMs !== low.startMs, 'under a guess it is skipped');
}
check(tn.minPeakDeg(chicagoGuess) === 40 && tn.minPeakDeg(chicagoSet) === 10 && tn.minPeakDeg(null) === 10, 'the thresholds are 40 guessed, 10 set');

// The table the 40 degree rule rests on: how high the same passes get for someone 300, 500 and
// 1 000 km from the guessed city, north, south, east and west. Printed for the PR body.
const KM_PER_DEG = 111.195;
const offsets = [300, 500, 1000];
const rows = [];
for (const p of visible) {
  const peak = p.peakEl * DEG;
  const row = { peak: Math.round(peak), min: {} };
  for (const km of offsets) {
    let worst = Infinity;
    for (const [dn, de] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const lat = chicagoGuess.latDeg + (dn * km) / KM_PER_DEG;
      const lon = chicagoGuess.lonDeg + (de * km) / (KM_PER_DEG * Math.cos(chicagoGuess.latDeg * RAD));
      const theirs = predictPasses([iss], place(lat, lon), p.startMs - 10 * 60e3, 0.4).find((q) => q.endMs > p.startMs - 5 * 60e3 && q.startMs < p.endMs + 5 * 60e3);
      worst = Math.min(worst, theirs ? theirs.peakEl * DEG : 0);
    }
    row.min[km] = Math.round(worst);
  }
  rows.push(row);
}
const high = rows.filter((r) => r.peak >= 40);
check(high.length > 0 && high.every((r) => r.min[300] >= 20), `every 40+ degree pass stays 20+ degrees up 300 km away (${JSON.stringify(high)})`);
const table = rows.map((r) => `peak ${r.peak}° here -> lowest ${r.min[300]}° / ${r.min[500]}° / ${r.min[1000]}° at 300 / 500 / 1000 km`).join('; ');

// --- the words, the countdown, Up now ------------------------------------------------------------------
const dark = tn.darkness(chicagoGuess, T0);
const w = tn.tonightWords({ observer: chicagoGuess, nowMs: first.startMs - 3725e3, ready: true, pass: first, dark });
check(/^Near Chicago, guessed from your time zone$/.test(w.place), `the place says it is a guess (${w.place})`);
check(w.line.startsWith('International Space Station · ') && w.line.includes(timeText.hhmm(first.startMs)) && /at its highest \(\d+°\) · \d+ min$/.test(w.line), `the pass line (${w.line})`);
check(w.countdown === '1:02:05' && w.status === 'Starts in 1:02:05', `the countdown in h:mm:ss (${w.status})`);
check(w.caveat === 'Times can be a few minutes off where you are.', 'a guessed place carries the caveat');
check(w.parts && w.parts.name === 'International Space Station' && w.parts.time === timeText.hhmm(first.startMs) && /^\d+°$/.test(w.parts.deg) && /^\d+$/.test(w.parts.mins) && /^From \S.* to \S/.test(w.parts.path), `the pass as its parts (${JSON.stringify(w.parts)})`);
const wSet = tn.tonightWords({ observer: chicagoSet, nowMs: first.startMs - 60e3, ready: true, pass: first, dark });
check(wSet.caveat === null && /^From Chicago$/.test(wSet.place), 'a set place has no caveat');
const up = tn.tonightWords({ observer: chicagoGuess, nowMs: first.startMs + 30e3, ready: true, pass: first, dark });
check(/^Up now, look /.test(up.status) && up.countdown === null && up.lookDir, `during the pass it says "Up now" (${up.status})`);
check(tn.passState(first, first.startMs - 1) === 'coming' && tn.passState(first, first.startMs) === 'up' && tn.passState(first, first.endMs) === 'gone', 'coming, up, gone');
const after = tn.nextVisible(passes, chicagoGuess, first.endMs + 1);
check(!after || after.startMs > first.endMs, 'after the end the next one is offered, without a reload');
const scrub = tn.tonightWords({ observer: chicagoGuess, nowMs: first.startMs - 60e3, ready: true, pass: first, dark, scrubbed: true });
check(scrub.status === `Starts at ${timeText.hhmm(first.startMs)}` && scrub.countdown === null, 'scrubbed: the clock time, not a countdown');
check(tn.countdown(0) === '0:00' && tn.countdown(-5) === '0:00' && tn.countdown(65e3) === '1:05' && tn.countdown(3725e3) === '1:02:05', 'h:mm:ss');

// --- nothing tonight: the 72 h search ----------------------------------------------------------------
const later = visible.filter((p) => p.peakEl * DEG >= 40).slice(-1)[0];
const none = tn.tonightWords({ observer: chicagoGuess, nowMs: T0, ready: true, pass: null, later, dark });
check(none.empty === 'Nothing bright passes over tonight.' && none.next === `Next: ${timeText.dayAndTime(later.startMs)} · International Space Station`, `nothing tonight names the next one, on its own line (${none.empty} / ${none.next})`);
check(tn.tonightWords({ observer: chicagoGuess, nowMs: T0, ready: true, pass: null, later: null }).empty === 'Nothing bright passes over for three days.', 'nothing in 72 h says so');
check(tn.tonightWords({ observer: chicagoGuess, nowMs: T0, ready: false }).empty === 'Working out tonight’s passes…', 'until the worker answers: working');
check(/Could not look/.test(tn.tonightWords({ observer: chicagoGuess, couldNotLook: true }).empty), 'no catalogue: could not look, never an empty card');
check(tn.SEARCH_HOURS === 24 && tn.LONG_SEARCH_HOURS === 72, '24 h, then 72 h');

// --- darkness, against Astronomy Engine directly -------------------------------------------------------
const obs = new Astronomy.Observer(chicagoGuess.latDeg, chicagoGuess.lonDeg, 0);
const noon = Date.UTC(2026, 8, 7, 18, 0); // 13:00 in Chicago: light
const d1 = tn.darkness(chicagoGuess, noon);
const dusk = Astronomy.SearchAltitude(Astronomy.Body.Sun, obs, -1, new Date(noon), 1, -6).date.getTime();
check(d1 && !d1.darkNow && d1.fromMs === dusk, `dark from the end of civil twilight (${new Date(d1.fromMs).toISOString()})`);
const pct = Math.round(Astronomy.Illumination(Astronomy.Body.Moon, new Date(noon)).phase_fraction * 100);
check(d1.moonPercent === pct, `the Moon's lit share is Astronomy Engine's (${d1.moonPercent} %)`);
const night = tn.darkness(chicagoGuess, dusk + 3600e3);
check(night.darkNow && night.untilMs > dusk + 3600e3, 'at night it says until when');
const svalbard = place(78.22, 15.65);
const summer = tn.darkness(svalbard, Date.UTC(2026, 5, 21, 12));
check(summer && summer.never === true, 'Svalbard in June: it does not get dark');
check(tn.tonightWords({ observer: svalbard, nowMs: Date.UTC(2026, 5, 21, 12), ready: true, pass: null, later: null, dark: summer }).dark.startsWith('It does not get dark tonight'), 'and the line says so');
check(/^Dark from \d\d:\d\d · Moon \d+ %, /.test(w.dark), `the darkness line (${w.dark})`);

// --- off the main thread, and nothing at boot ---------------------------------------------------------
const worker = readFileSync(join(JS, 'sky/passworker.js'), 'utf8');
check(/self\.onmessage/.test(worker) && /typeof window === 'undefined'/.test(worker), 'passworker.js answers messages only inside a worker');
const main = readFileSync(join(JS, 'main.js'), 'utf8');
// The Tonight tab mounts the view with a dynamic import (main.js, mountTab), so neither the view nor the
// worker is in the boot graph; a static import of either would put them on every first visit.
check(!/^import[^\n]*(tonight|passworker)/m.test(main) && /mountTab\('tonight'[\s\S]{0,200}import\('\.\/ui\/tonight\.js'\)/.test(main), 'nothing at boot: main.js mounts the Tonight tab with a dynamic import, and the worker starts when it does');
const cdp = readFileSync(join(ROOT, 'tools/cdp.mjs'), 'utf8');
check(/Emulation\.setTimezoneOverride/.test(cdp) && /arg\('timezone'/.test(cdp), 'tools/cdp.mjs --timezone=<IANA> for the acceptance screenshots');

// --- what is worth looking up for (2026-10-01: the live site offered a rocket body) ------------------
{
  const H = 3600e3, up = 60 / (180 / Math.PI);
  const mk = (name, klass, startH) => ({ visible: true, peakEl: up, startMs: T0 + startH * H, endMs: T0 + startH * H + 6e5, record: { name, klass } });
  const setObs = { ...chicagoSet };
  const rb = mk('SL-16 R/B', 'rocket', 0.5), sat = mk('Lacrosse 5', 'satellite', 1), iss = mk('ISS (ZARYA)', 'station', 2.5), late = mk('CSS (TIANHE)', 'station', 5);
  check(tn.nextVisible([rb, sat, late], setObs, T0) === sat, 'a rocket body is passed over while a satellite is up');
  check(tn.nextVisible([rb, sat, iss], setObs, T0) === iss, 'a crewed station within three hours of the earliest wins');
  check(tn.nextVisible([sat, late], setObs, T0) === sat, 'a station more than three hours later does not');
  check(tn.nextVisible([rb], setObs, T0) === rb, 'a rocket body is still offered when it is all there is');
  check(tn.nextVisible([mk('X', undefined, 1)], setObs, T0) !== null, 'a pass without a class counts as a satellite');
}

// Internal #391 (found in public #468): "no standard magnitude" arrives as null, and Number(null) is 0, which is a
// satellite as bright as Vega at 1000 km. standardMagnitudeOf must read null, '', undefined and booleans as none.
{
  const { standardMagnitudeOf } = await import(join(JS, 'sky/passes.js'));
  const of = (meta) => standardMagnitudeOf({ meta });
  check(of({ stdMag: null }) === null && of({ stdMag: '' }) === null && of({}) === null && of(undefined) === null, 'no standard magnitude reads as none, never as 0');
  check(of({ stdMag: false }) === null && of({ stdMag: 'bright' }) === null, 'a boolean or a word is none');
  check(of({ stdMag: 0 }) === 0 && of({ stdMag: -1.8 }) === -1.8 && of({ standardMagnitude: '3.5' }) === 3.5, 'a real number, zero included, is kept');
  check(of({ stdMag: null, standardMagnitude: 2 }) === 2, 'a null in the first key does not hide a value in the next');
}

if (problems.length) { console.error('tonight FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`tonight ok: next pass and words, the 40 degree rule (${table}), Up now, 72 h search, darkness against Astronomy Engine and a polar summer, the worker's message`);
