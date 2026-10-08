// tests/test_timefacts.mjs -- the next 90 minutes of an Earth orbiter, in time (spec 0048 task 1):
// shadow entry and exit to 1 s, the next ascending node to 1 s, both against a brute-force scan a
// second at a time; the orbit number from the fixture's REV_AT_EPOCH against a count of every
// northbound equator crossing; the launch year from the designator; and the card's words, at 1x,
// scrubbed, and faster than 60x.
//
//   node tests/test_timefacts.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const tf = await import(join(JS, 'sky/timefacts.js'));
const { lightWindows, nextAscendingNode, prevAscendingNode, orbitNumber, launchYear, timeFacts, mmss, hasTimeFacts } = tf;
const { sunlitState } = await import(join(JS, 'scene/shadow.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { parseCelestrakGP } = await import(join(JS, 'data/parsers.js'));
const { timeFactWords, TIME_FAST_RATE } = await import(join(JS, 'ui/cards.js'));
const { timeText } = await import(join(JS, 'copy/en.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const gp = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/harvest/celestrak_gp.json'), 'utf8'));
const [iss] = parseCelestrakGP(gp, { layer: 'stations', source: 'celestrak-stations' });
check(iss && iss.meta.revAtEpoch === 58451, `data/parsers.js keeps REV_AT_EPOCH as meta.revAtEpoch (${iss && iss.meta.revAtEpoch})`);
check(hasTimeFacts(iss), 'the ISS has time facts');
check(!hasTimeFacts({ propagator: 'static', frame: 'sun-inertial' }) && !hasTimeFacts(null), 'a star has none');
const T0 = iss.epoch + 3 * 3600e3;

// --- 1. light and shadow, each edge within 1 s of a scan a second at a time --------------------
const t1 = performance.now();
const windows = lightWindows(iss, T0);
const lightMs = performance.now() - t1;
check(windows.length >= 2, `90 minutes of the ISS hold at least one change of light (${windows.length} runs)`);
check(windows[0].from === T0 && windows[windows.length - 1].to === T0 + 90 * 60e3, 'the runs cover exactly the next 90 minutes');
check(windows.every((w, i) => i === 0 || w.from === windows[i - 1].to), 'the runs are contiguous');
check(windows.every((w, i) => i === 0 || w.sunlit !== windows[i - 1].sunlit), 'neighbouring runs differ');
const brute = [];
let prev = sunlitState(iss, T0) === 'sunlit';
for (let t = T0 + 1000; t <= T0 + 90 * 60e3; t += 1000) {
  const now = sunlitState(iss, t) === 'sunlit';
  if (now !== prev) brute.push({ t, sunlit: now });
  prev = now;
}
check(brute.length === windows.length - 1, `as many edges as the 1 s scan (${windows.length - 1} vs ${brute.length})`);
for (let i = 0; i < brute.length && i + 1 < windows.length; i++) {
  const edge = windows[i + 1].from;
  check(Math.abs(edge - brute[i].t) <= 1000, `edge ${i} within 1 s of the scan (${((edge - brute[i].t) / 1000).toFixed(2)} s)`);
  check(windows[i + 1].sunlit === brute[i].sunlit, `edge ${i} goes the same way as the scan`);
}
const shadow = windows.find((w) => !w.sunlit);
check(shadow && shadow.to - shadow.from > 10 * 60e3 && shadow.to - shadow.from < 40 * 60e3, `an ISS shadow lasts 10-40 minutes (${shadow && ((shadow.to - shadow.from) / 60e3).toFixed(1)})`);

// --- 2. the lap: the next ascending node, within 1 s of a scan ---------------------------------
const node = nextAscendingNode(iss, T0);
let bruteNode = null;
let north = propagate(iss, T0).z >= 0;
for (let t = T0 + 1000; t <= T0 + 100 * 60e3; t += 1000) {
  const n = propagate(iss, t).z >= 0;
  if (!north && n) { bruteNode = t; break; }
  north = n;
}
check(node !== null && bruteNode !== null && Math.abs(node - bruteNode) <= 1000, `the next ascending node within 1 s of the scan (${node && bruteNode && ((node - bruteNode) / 1000).toFixed(2)} s)`);
const start = prevAscendingNode(iss, T0);
check(start !== null && start < T0 && node - start > 90 * 60e3 && node - start < 95 * 60e3, `this lap began at the previous node, one ~92.9-minute period before the next (${start && ((node - start) / 60e3).toFixed(2)} min)`);
// Latitude, not inertial z, is what the words claim: at the node the sub-satellite point is on the equator.
const { gmst, eciToEcef, ecefToGeodetic } = await import(join(JS, 'propagate/frames.js'));
const at = propagate(iss, node);
const gd = ecefToGeodetic(eciToEcef(at, gmst(new Date(node))));
check(Math.abs(gd.latRad * 180 / Math.PI) < 0.1, `at the node the ground point is on the equator (${(gd.latRad * 180 / Math.PI).toFixed(3)} deg)`);

// --- 3. the orbit number: REV_AT_EPOCH plus every northbound crossing since --------------------
function countCrossings(from, to, stepMs = 10e3) {
  let n = 0;
  let wasNorth = propagate(iss, from).z >= 0;
  for (let t = from + stepMs; t <= to; t += stepMs) {
    const isNorth = propagate(iss, t).z >= 0;
    if (!wasNorth && isNorth) n += 1;
    wasNorth = isNorth;
  }
  return n;
}
for (const hours of [3, 24, 72]) {
  const t = iss.epoch + hours * 3600e3;
  const got = orbitNumber(iss, t);
  const want = 58451 + countCrossings(iss.epoch, t);
  check(got && got.n === want && got.cls === 'inferred', `orbit number ${hours} h after the epoch is ${want}, inferred (${got && got.n}, ${got && got.cls})`);
}
const back = orbitNumber(iss, iss.epoch - 24 * 3600e3);
check(back && back.n === 58451 - countCrossings(iss.epoch - 24 * 3600e3, iss.epoch), `a day before the epoch counts back (${back && back.n})`);
check(orbitNumber(iss, iss.epoch + 15 * 86400e3) === null, 'past 14 days from the epoch it is not counted');
check(orbitNumber({ ...iss, meta: { ...iss.meta, revAtEpoch: null } }, T0) === null, 'no REV_AT_EPOCH, no orbit number');

// --- 4. the launch year, from the designator ----------------------------------------------------
check(launchYear(iss) === 1998, `the ISS was launched in 1998 by its designator (${launchYear(iss)})`);
check(launchYear({ meta: { intlDesignator: '1958-002B' } }) === 1958, 'Vanguard 1\'s designator gives 1958');
check(launchYear({ meta: {} }) === null, 'no designator, no year');

// --- 5. the card's words: 1x, scrubbed, faster than 60x -------------------------------------------
const facts = timeFacts(iss, T0);
check(facts && facts.change && facts.lapEndMs === node, 'timeFacts() carries the windows, the next change and the lap end');
const w1 = timeFactWords(facts, T0, 1);
const next = windows[1];
const minsTo = Math.floor((next.from - T0) / 60e3);
check(w1.light === `${next.sunlit ? 'Comes out into sunlight' : 'Enters Earth’s shadow'} in ${minsTo} min`, `at 1x the next change counts down in minutes (${w1.light})`);
check(w1.lap === `Completes this lap in ${mmss(node - T0)}` && /^\d+:\d\d$/.test(mmss(node - T0)), `the lap counts down in m:ss (${w1.lap})`);
check(/^Orbit 58 453 since launch$/.test(w1.orbit) && /Inferred/.test(w1.orbitNote), `the orbit number says it is inferred (${w1.orbit}; ${w1.orbitNote})`);
// Without the catalogue the year is the designator's, and the years up are said as "about" (internal #127).
check(new RegExp(`^Launched in 1998: about ${new Date(T0).getUTCFullYear() - 1998} years up$`).test(w1.launched), `launched (${w1.launched})`);
check(Math.abs(w1.bar.reduce((a, b) => a + b.share, 0) - 1) < 1e-9 && w1.bar.length === windows.length, 'the bar\'s runs fill it exactly');
check(/Sunlight and shadow over the next 90 minutes: /.test(w1.barLabel), `the bar has words for a screen reader (${w1.barLabel})`);
// Thirty seconds later on the same facts: the countdowns moved, and nothing was worked out again.
const w30 = timeFactWords(facts, T0 + 30e3, 1);
check(w30.lap === `Completes this lap in ${mmss(node - T0 - 30e3)}`, `the lap countdown follows the clock (${w30.lap})`);
// Scrubbed: the clock shows another day, rate 1 -- the countdown is in the shown time, not the wall.
const past = iss.epoch - 6 * 3600e3;
const pf = timeFacts(iss, past);
const wp = timeFactWords(pf, past, 1);
check(wp.lap === `Completes this lap in ${mmss(pf.lapEndMs - past)}`, `scrubbed, the countdown counts in clock time (${wp.lap})`);
// Faster than 60x: the clock time of the event instead of a countdown that is a blur.
const wf = timeFactWords(facts, T0, 3600);
check(wf.light === `${next.sunlit ? 'Comes out into sunlight' : 'Enters Earth’s shadow'} at ${timeText.hhmm(next.from)}`, `above ${TIME_FAST_RATE}x the light change is a clock time (${wf.light})`);
check(wf.lap === `Completes this lap at ${timeText.hhmm(node)}`, `and so is the lap's end (${wf.lap})`);
check(timeFactWords(facts, T0, 60).lap === w1.lap, 'at exactly 60x it still counts down');
const allLit = timeFactWords({ windows: [{ from: T0, to: T0 + 90 * 60e3, sunlit: true }] }, T0, 1);
check(allLit.light === 'In sunlight for all of the next 90 minutes' && allLit.lap === null && allLit.orbit === null, `no change in 90 minutes says so (${allLit.light})`);
const soon = timeFactWords({ windows: [{ from: T0, to: T0 + 40e3, sunlit: true }, { from: T0 + 40e3, to: T0 + 90 * 60e3, sunlit: false }] }, T0, 1);
check(soon.light === 'Enters Earth’s shadow in under a minute', `under a minute (${soon.light})`);
check(timeFactWords(null, T0) === null, 'no facts, no words');
check(mmss(27 * 60e3 + 34e3) === '27:34' && mmss(0) === '0:00' && mmss(-5) === '0:00' && mmss(3725e3) === '1:02:05', 'm:ss');

// --- 6. cost, and the wiring -------------------------------------------------------------------------
const t2 = performance.now();
for (let i = 0; i < 5; i++) timeFacts(iss, T0 + i * 61e3);
const warmMs = (performance.now() - t2) / 5;
check(warmMs < 250, `one card's worth of time facts costs ${warmMs.toFixed(1)} ms warm`);
const cards = readFileSync(join(JS, 'ui/cards.js'), 'utf8');
check(/setInterval\(tickTimeFacts, 1000\)/.test(cards) && /stopTimeFacts\(\);/.test(cards.slice(cards.indexOf('export function hideCard'))), 'the countdown repaints once a second and stops with the card');
check(/timeFactsSection\(record, ctx, m\)/.test(cards), 'the card renders the block');

if (problems.length) {
  console.error('timefacts FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`timefacts ok: ${windows.length - 1} light edges and the ascending node within 1 s of a 1 s scan; the orbit number matches every crossing counted for 3, 24 and 72 h; 1x, scrubbed and >60x wordings; ${warmMs.toFixed(1)} ms per card warm (first ${lightMs.toFixed(0)} ms cold)`);
