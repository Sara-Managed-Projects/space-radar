// tests/test_scrubber.mjs -- the timeline in the time pill (public #455; ui/scrubber.js, ui/timepill.js).
//
// The pure half: where an instant sits on the tape and back, the ticks and their labels on round
// UTC instants, the marks made from the Coming up list and kept once seen, the tap that means a
// mark, where the tape is hatched "rougher" and where it ends, the step sizes, and the words for
// a time far from now. The drag itself is a browser's to test (tools/cdp.mjs).
//
//   node tests/test_scrubber.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const S = await import(join(JS, 'ui/scrubber.js'));
const P = await import(join(JS, 'ui/timepill.js'));
const { COPY, inWords, timeText } = await import(join(JS, 'copy/en.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

const now = Date.parse('2026-10-06T08:16:00Z');
const H = 3600e3;
const D = 86400e3;

// --- the tape: an instant and a pixel ------------------------------------------------------------
for (const unit of P.PILL_UNITS) {
  check(near(S.tapeX(now, now, unit, 480), 160), `${unit}: the shown instant is under the fixed line, a third of the way along`);
  const t = now + 5 * P.UNIT_MS[unit];
  check(near(S.tapeTime(S.tapeX(t, now, unit, 480), now, unit, 480), t, 1), `${unit}: a pixel maps back to its instant`);
  check(S.tapeX(t, now, unit, 480) > 160, `${unit}: later is to the right`);
}
check(near(S.tapeX(now + H, now, 'hour', 480) - 160, 20) && near(S.tapeX(now + D, now, 'day', 480) - 160, 16) && near(S.tapeX(now + 60e3, now, 'minute', 480) - 160, 4), 'an hour is 20 px, a day 16, a minute 4');
// A phone's tape (about 250 px) shows about an hour, half a day, two weeks; a desktop's two hours, a day, a month.
check(near(250 / S.SCALES.minute.pxPerMs / 60e3, 62.5) && near(250 / S.SCALES.hour.pxPerMs / H, 12.5) && near(480 / S.SCALES.day.pxPerMs / D, 30), 'the three units are three views: about an hour, half a day, a month');

// --- ticks and labels on round UTC instants --------------------------------------------------------
{
  const plan = S.tickPlan(now, 'hour', 480);
  check(near(plan.stepPx, 20), 'a tick an hour');
  const firstTick = S.tapeTime(plan.offsetPx, now, 'hour', 480);
  check(near(firstTick % H, 0, 1) && plan.offsetPx >= 0 && plan.offsetPx < plan.stepPx, 'the ticks start on a whole hour inside the first step');
  check(plan.labels.length >= 3 && plan.labels.every((l) => l.tMs % (6 * H) === 0), 'a label every six hours, on 00, 06, 12, 18 UTC');
  const midnight = plan.labels.find((l) => l.tMs % D === 0);
  check(midnight && midnight.day && midnight.text === '07 Oct', `midnight is labelled with the day (${midnight && midnight.text})`);
  check(plan.labels.some((l) => l.text === '12:00' && !l.day), 'and noon with the hour');
  for (let i = 1; i < plan.labels.length; i += 1) check(plan.labels[i].x - plan.labels[i - 1].x >= 96, 'labels are at least 96 px apart');
}
{
  const plan = S.tickPlan(now, 'day', 480);
  check(plan.labels.every((l) => l.day && new Date(l.tMs).getUTCDay() === 1 && l.tMs % D === 0), 'the day view labels Mondays, at midnight UTC');
  check(S.tickPlan(now, 'minute', 480).labels.every((l) => l.tMs % (30 * 60e3) === 0), 'the minute view labels the half hours');
}

// --- marks ----------------------------------------------------------------------------------------
const iss = { id: 'sat-25544', name: 'ISS (ZARYA)', klass: 'station', layer: 'stations', meta: {} };
const items = [
  { kind: 'pass', record: iss, tMs: now + 2 * H },
  { kind: 'launch', record: { id: 'l1', name: 'Falcon 9 | Starlink', layer: 'launches', meta: {} }, tMs: now + 30 * H },
  { kind: 'shower', record: null, label: 'Orionids', tMs: now + 15 * D, zhr: 20 },
  { kind: 'solar-eclipse', record: null, label: 'Total solar eclipse', eclipseKind: 'total', tMs: Date.parse('2027-08-02T10:07:00Z') },
  { kind: 'aurora', record: null, tMs: now, now: true, kp: 6 },
];
const win = { lo: now - P.SCRUB_BACK_MS, hi: now + P.SCRUB_FORWARD_MS };
const marks = S.mergeMarks([], items, now, win);
check(marks.length === 4 && marks.map((m) => m.kind).join(',') === 'pass,launch,shower,eclipse', `a pass, a launch, a shower and an eclipse become marks; a storm under way has no instant to go to (${marks.map((m) => m.kind)})`);
check(marks[0].record === iss && /comes over you in 2 hours$/.test(marks[0].what), `a mark says what it is, as its row does (${marks[0].what})`);
check(S.markOf({ kind: 'pass', record: { id: 'x', name: 'SL-8 R/B', klass: 'rocket' }, tMs: now + H }, now) === null, 'a spent rocket body\'s pass is not a mark');
check(S.CURSOR_AT === 1 / 3 && near(250 * (1 - S.CURSOR_AT) / S.SCALES.hour.pxPerMs / H, 8.33, 0.01), 'two thirds of the tape is what is coming: eight hours of it on a phone');
check(marks[3].tMs <= win.hi, 'next August\'s eclipse is inside the year the tape runs to');
{
  // An hour later the pass is behind the clock and off the list; its mark stays on the tape.
  const later = S.mergeMarks(marks, items.slice(1), now + 3 * H, win);
  check(later.length === 4 && later.some((m) => m.id === marks[0].id), 'a mark once seen stays after the clock passes it');
  const again = S.mergeMarks(later, items, now + 3 * H, win);
  check(again.length === 4, 'and the same event seen twice is one mark');
  const far = S.mergeMarks([], [{ kind: 'launch', record: { id: 'x', name: 'X' }, tMs: now + 500 * D }], now, win);
  check(far.length === 0, 'an event past the end of the tape is not marked');
}
{
  const x = S.tapeX(marks[0].tMs, now, 'hour', 480);
  check(S.nearestMark(marks, x + 10, now, 'hour', 480) === marks[0], 'a tap within reach of a mark means the mark');
  check(S.nearestMark(marks, x + 60, now, 'hour', 480) === null, 'a tap on empty tape means the instant under it');
}

// --- where the tape is rough, and where it ends ----------------------------------------------------
{
  const s = S.roughSpans(now, now, 'day', 480);
  check(s.left && s.right && near(s.right.x, 160 + 7 * 16) && near(s.left.x + s.left.w, 160 - 7 * 16), 'live, in the day view: hatched from a week either side of now');
  check(!s.endLeft && !s.endRight, 'and neither end of the tape in view');
  check(!S.roughSpans(now, now, 'hour', 480).left && !S.roughSpans(now, now, 'hour', 480).right, 'the hour view near now is all fine');
  const end = S.roughSpans(now + P.SCRUB_FORWARD_MS, now, 'day', 480);
  check(end.endRight && near(end.endRight.x, 160) && end.right && end.right.x === 0 && near(end.right.w, 160), 'at the year\'s end the tape stops under the line and all before it is rough');
  check(P.FINE_MS === 7 * D && P.SCRUB_BACK_MS === 30 * D && P.SCRUB_FORWARD_MS === 365 * D, 'fine for a week; a month back and a year on');
}

// --- steps, and a time far from now ----------------------------------------------------------------
check(P.nextUnit('minute') === 'hour' && P.nextUnit('hour') === 'day' && P.nextUnit('day') === 'event' && P.nextUnit('event') === 'minute' && P.nextUnit('fortnight') === 'hour', 'the step cycles a minute, an hour, a day, an event');

// --- Prev and Next event (internal #408): the step "Event" goes from mark to mark ------------------
{
  const list = [{ id: 'a', tMs: now - 3 * D }, { id: 'b', tMs: now + 2 * H }, { id: 'c', tMs: now + 5 * D }];
  check(S.stepMark(list, now, 1).id === 'b' && S.stepMark(list, now, -1).id === 'a', 'from now: the mark after, and the mark before');
  check(S.stepMark(list, now + 2 * H, 1).id === 'c' && S.stepMark(list, now + 2 * H, -1).id === 'a', 'standing on a mark, a step leaves it: it is not its own next');
  check(S.stepMark(list, now + 6 * D, 1) === null && S.stepMark(list, now - 4 * D, -1) === null && S.stepMark([], now, 1) === null && S.stepMark(list, NaN, 1) === null, 'nothing that way is null, and the pill says so');
  check(S.SCALES.event === S.SCALES.day && P.UNIT_MS.event === D, 'stepping by event shows the month view, and a drag along the readout moves by days');
  const pill = readFileSync(join(ROOT, 'site/js/ui/timepill.js'), 'utf8');
  check(/unit === 'event' && eventStep/.test(pill) && /T\.noEventBack : T\.noEventOn/.test(pill) && /setEventStep/.test(readFileSync(join(ROOT, 'site/js/ui/scrubber.js'), 'utf8')), 'the pill asks the timeline for the mark, and says when there is none');
  // The Moon's phases as marks: real instants, in order, about a week apart, each with its words.
  const moon = S.moonMarks(now);
  check(moon.length === 10 && moon.every((m, i) => i === 0 || (m.tMs - moon[i - 1].tMs > 6 * D && m.tMs - moon[i - 1].tMs < 9 * D)), `ten phases of the Moon round now, a week apart (${moon.length})`);
  check(moon.filter((m) => m.tMs < now).length >= 1 && moon.filter((m) => m.tMs > now).length >= 8, 'at least one behind and eight ahead');
  // A regression pin, not an outside source: astronomy-engine's own instant for the next full Moon.
  const full = moon.find((m) => m.label === 'full' && m.tMs > now);
  check(full && Math.abs(full.tMs - Date.parse('2026-10-26T04:12:00Z')) < 5 * 60e3, `the next full Moon is 26 October 2026 at 04:12 UTC (${full && new Date(full.tMs).toISOString()})`);
  const mk = S.markOf(moon[3], now);
  check(mk && mk.kind === 'moon' && /^The Moon is (new|first quarter|full|last quarter), /.test(mk.what) && mk.record === null, `a phase is a mark with its own words and nothing to select (${mk && mk.what})`);
}
// --- Sunrise and sunset at the visitor's place as marks (internal #408) ------------------------
{
  const Astronomy = await import(join(ROOT, 'site/vendor/astronomy.js'));
  const quito = { latDeg: -0.2, lonDeg: -78.5, name: 'Quito', source: 'city' };
  const sun = S.sunMarks(now, quito);
  check(sun.length >= 4 && sun.length <= 6, `two and a half days of the Sun at Quito are four to six marks (${sun.length})`);
  check(sun.every((m, i) => i === 0 || (m.kind !== sun[i - 1].kind && Math.abs(m.tMs - sun[i - 1].tMs - 12 * H) < 30 * 60e3)), 'on the equator a rise and a set alternate, twelve hours apart to half an hour');
  const obs = new Astronomy.Observer(quito.latDeg, quito.lonDeg, 0);
  const altAt = (tMs) => { const eq = Astronomy.Equator(Astronomy.Body.Sun, new Date(tMs), obs, true, true); return Astronomy.Horizon(new Date(tMs), obs, eq.ra, eq.dec, 'normal').altitude; };
  check(sun.every((m) => Math.abs(altAt(m.tMs)) < 1), `at each mark the Sun's centre is within a degree of the horizon (${sun.map((m) => altAt(m.tMs).toFixed(2)).join(', ')})`);
  check(sun.every((m) => m.tMs > now - 12 * H - 1 && m.tMs < now + 48 * H + 1), 'none further than half a day behind or two days on');
  const mk = S.markOf(sun[0], now);
  check(mk && mk.kind === 'sun' && /^Sun(rise|set) where you are, \d\d [A-Z]{3} \d\d:\d\d UTC$/.test(mk.what) && mk.record === null, `a sunrise is a mark with its own words and nothing to select (${mk && mk.what})`);
  const guessed = S.sunMarks(now, { ...quito, source: 'guess' });
  check(guessed.length === sun.length && /at the place guessed for you/.test(guessed[0].what), 'a guessed place says it was guessed');
  check(S.sunMarks(now, null).length === 0, 'no place, no sunrise');
  // A sunrise is a place's: when the place changes the old place's marks go (the first browser run
  // showed Moscow's sunset on the tape after London was chosen; marks are otherwise kept once seen).
  {
    const win = { lo: now - 30 * D, hi: now + 365 * D };
    const moscow = S.mergeMarks([], S.sunMarks(now, { latDeg: 55.8, lonDeg: 37.6, source: 'guess' }).concat(S.moonMarks(now)), now, win);
    const london = S.mergeMarks(S.withoutSun(moscow), S.sunMarks(now, { latDeg: 51.5, lonDeg: -0.1, source: 'city' }).concat(S.moonMarks(now)), now, win);
    check(moscow.some((m) => /guessed for you/.test(m.what)) && !london.some((m) => /guessed for you/.test(m.what)), 'the guessed place\'s sunrises leave the tape when a place is chosen');
    check(london.filter((m) => m.kind === 'sun').length === S.sunMarks(now, { latDeg: 51.5, lonDeg: -0.1 }).length && london.filter((m) => m.kind === 'moon').length === moscow.filter((m) => m.kind === 'moon').length, 'and only those: the Moon\'s phases stay');
  }
  // 80 N on the June solstice: the Sun does not set; the search finds nothing in the window.
  check(S.sunMarks(Date.parse('2027-06-21T12:00:00Z'), { latDeg: 80, lonDeg: 0 }).length === 0, 'in a polar summer there is no sunrise to mark');
}
// --- every eclipse of the year, and its solstices and equinoxes, on the tape (internal #408) ------
{
  const from = Date.parse('2026-10-08T12:00:00Z');
  const year = S.yearMarks(from);
  const kinds = year.map((it) => it.kind);
  check(kinds.filter((k) => k === 'solar-eclipse').length >= 2 && kinds.filter((k) => k === 'lunar-eclipse').length >= 2, `a year holds at least two solar and two lunar eclipses (${kinds.join(',')})`);
  check(kinds.filter((k) => k === 'season').length === 4, `and four turns of the year (${kinds.filter((k) => k === 'season').length})`);
  check(year.every((it) => it.tMs > from && it.tMs < from + 365 * D + 1), 'all inside the tape\'s reach, a year on');
  const marks = S.mergeMarks([], year.concat(year), from, { lo: from - 30 * D, hi: from + 365 * D });
  check(marks.length === Math.min(year.length, marks.length) && new Set(marks.map((m) => m.id)).size === marks.length, 'an item the Coming up list also holds is one mark, not two');
  const feb = marks.find((m) => m.kind === 'eclipse' && /6 February 2027/.test(m.what));
  check(!!feb && /^Annular solar eclipse on 6 February 2027/.test(feb.what), `the annular eclipse of 6 February 2027 is one of them, with its sentence (${feb && feb.what.slice(0, 50)})`);
  check(marks.some((m) => m.kind === 'sun' && /^December solstice on 21 December 2026/.test(m.what)), 'and the December solstice');
}
check(P.UNIT_MS.minute === 60e3 && P.UNIT_MS.hour === H && P.UNIT_MS.day === D, 'and they are a minute, an hour and a day');
check(P.pillText({ tMs: Date.parse('1979-03-05T12:05:00Z'), live: false, rate: 1, anchorMs: now }) === '05 MAR 1979 12:05 UTC · 48 years ago', `a mission's event far from now carries its year (${P.pillText({ tMs: Date.parse('1979-03-05T12:05:00Z'), live: false, rate: 1, anchorMs: now })})`);
check(P.pillText({ tMs: now + 6 * H, live: false, rate: 1, anchorMs: now }) === '06 OCT 14:16 UTC · in 6 hours', 'a time near now does not');
check(inWords(45 * D) === 'in 45 days' && inWords(300 * D) === 'in 10 months' && inWords(-3 * 365.25 * D) === '3 years ago', 'days to three months, then months, then years');
check(timeText.utcHm(now) === '08:16' && timeText.utcDay(now) === '06 Oct' && timeText.utcLong(Date.parse('1969-07-20T20:17:00Z')) === '20 July 1969', 'the tape\'s and the cards\' dates are UTC');

// --- the wiring, as text ---------------------------------------------------------------------------
const main = readFileSync(join(JS, 'main.js'), 'utf8');
check(!/^import .*scrubber\.js/m.test(main) && /import\('\.\/ui\/scrubber\.js'\)/.test(main), 'the timeline is a dynamic import, not a first visit\'s cost');
check(/SCRUBBER_MS = \d{4}/.test(main) && Number(/SCRUBBER_MS = (\d+)/.exec(main)[1]) > 2000, 'and it is asked for after the two seconds the first-visit measure waits');
const pill = readFileSync(join(JS, 'ui/timepill.js'), 'utf8');
check(!/import .*scrubber/.test(pill), 'the pill does not import the timeline');
const scrub = readFileSync(join(JS, 'ui/scrubber.js'), 'utf8');
check(!/Date\.now\(\)/.test(scrub.replace(/\/\/.*$/gm, '')), 'the timeline never reads the wall clock: now is the pill\'s anchor');
check(/role', 'slider'/.test(scrub) && /aria-valuetext/.test(scrub) && /'Home'/.test(scrub), 'it is a slider: a value in words, arrows, Home for now');
// internal #472: axe's nested-interactive: the focusable slider holds no button; the marks are its siblings.
check(/slider = el\('div', 'sr-tape__slider'\)/.test(scrub) && /root\.append\(slider, /.test(scrub) && !/root\.setAttribute\('role'/.test(scrub), 'the slider is a child of the tape and the marks and Now are its siblings (no nested interactive)');
check(typeof COPY.timePill.roughTitle === 'string' && /week/.test(COPY.timePill.roughTitle) && /centuries/.test(COPY.timePill.worlds), 'the copy says where accuracy drops, and what holds');

// --- the stylesheet is whole -------------------------------------------------------------------------
// A merge once dropped one closing brace above the rules this work added (2026-10-06): every rule
// after it sat inside a phone's media query, and a mission's card drew unstyled on a desktop.
{
  const css = readFileSync(join(ROOT, 'site/css/ui.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  let depth = 0; let deepest = 0;
  for (const c of css) { if (c === '{') depth += 1; else if (c === '}') depth -= 1; deepest = Math.max(deepest, depth); if (depth < 0) break; }
  check(depth === 0, `ui.css opens and closes the same number of braces (off by ${depth})`);
  const at = (sel) => { const i = css.indexOf(sel); let d = 0; for (let k = 0; k < i; k += 1) { if (css[k] === '{') d += 1; else if (css[k] === '}') d -= 1; } return i < 0 ? -1 : d; };
  for (const sel of ['\n.sr-tape {', '\n.sr-today__grid {', '\n.sr-debris {', '\n.sr-mission {']) check(at(sel) === 0, `${sel.trim()} is a top-level rule, not inside a media query`);
}

// Two marks never cover each other's box, and the glyph goes back to its time (axe target-size, #472).
{
  const { spreadMarks } = await import(join(JS, 'ui/scrubber.js'));
  const gap = (xs, w) => { const sh = spreadMarks(xs, w); const at = xs.map((x, i) => x + sh[i]).sort((a, b) => a - b); return Math.min(...at.slice(1).map((v, i) => v - at[i])); };
  check(spreadMarks([100], 28)[0] === 0, 'a lone mark does not move');
  check(spreadMarks([100, 200, 300], 28).every((v) => v === 0), 'marks that are apart do not move');
  check(gap([100, 107], 28) >= 28 && gap([100, 100, 103], 28) >= 28, 'a sunset beside a pass, and three together, end at least a box apart');
  const sh = spreadMarks([107, 100], 28);
  check(sh[1] === 0 && sh[0] === 21, `the order given does not matter and the earlier mark stays on its time (${sh})`);
  check(Math.max(...spreadMarks([100, 100, 100, 100, 100, 100], 28)) <= 84, 'no mark is pushed more than three boxes from its time');
  check(spreadMarks([], 28).length === 0, 'no marks, no shifts');
  const ui = readFileSync(join(ROOT, 'site/css/ui.css'), 'utf8');
  check(/margin-left: calc\(-5px \+ var\(--sr-mark-shift, 0px\)\)/.test(ui) && /margin-left: calc\(-2px \+ var\(--sr-mark-shift, 0px\)\)/.test(ui), 'the glyph is drawn back by the shift (both shapes)');
}

if (problems.length) { console.error('scrubber FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`scrubber ok: an hour is 20 px, labels on round UTC instants, ${marks.length} marks from the Coming up list kept once seen, hatched past a week, the tape a month back and a year on`);
