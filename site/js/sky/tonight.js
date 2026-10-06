// sky/tonight.js -- what you can see tonight from roughly where you are: the rules (spec 0051).
//
// Contract: nextVisible(passes, observer, nowMs), guessFilter(passes, observer), passState(pass, nowMs),
//           darkness(observer, nowMs), countdown(ms), tonightWords(state), minPeakDeg(observer)
// Pure: no DOM, no clock of its own, no fetch. The Tonight card (ui/tonight.js) and its tests read
// these; the passes come from sky/passworker.js, which runs sky/passes.js predictPasses off the
// main thread.
//
// WHY. orbitalradar.com's phone home, which the 2026-09-28 review called their best screen, opens
// on "YOUR SKY TONIGHT": a guessed place, the next visible pass with a live countdown, and a mini
// sky arc. Ours had every piece one door in -- the guess (sky/guessplace.js), the pass maths
// (sky/passes.js), the words (copy/en.js compassWords, fistsWords) -- and showed none of it first.
//
// THE PLACE IS A GUESS, AND THE RULE KNOWS IT. With no place set, the observer is guessObserver():
// a city from the device's time zone, never an IP lookup. A zone is coarse (America/Chicago runs
// from Texas to Manitoba), so while the place is a guess only passes that peak at 40 degrees or more
// at the guessed city are offered as "the next one": a high pass is still well up a few hundred
// kilometres away, a 15 degree pass may be under the horizon there. tests/test_tonight.mjs computes
// that table for the ISS (the PR body prints it). With a place set, the ordinary rule: visible above
// 10 degrees (PASS_RULES).
//
// DARKNESS is Astronomy Engine's, computed, never fetched: the end of civil twilight (Sun at -6
// degrees, the rule predictPasses uses for "dark enough"), the Moon's lit fraction and its rise.

import * as Astronomy from '../../vendor/astronomy.js';
import { COPY, t, fmt, timeText, compassWords, fistsWords } from '../copy/en.js';
import '../copy/en.later.js';
import { labelName } from '../ui/labels.js';

export const GUESS_MIN_PEAK_DEG = 40;
export const SET_MIN_PEAK_DEG = 10;
/** How far "nothing tonight" looks for the next one. */
export const SEARCH_HOURS = 24;
export const LONG_SEARCH_HOURS = 72;
const DEG = 180 / Math.PI;

/** The lowest peak offered as "the next one" for this observer. */
export function minPeakDeg(observer) {
  return observer && observer.source === 'guess' ? GUESS_MIN_PEAK_DEG : SET_MIN_PEAK_DEG;
}

/** The passes that may be offered: visible, high enough for how sure we are of the place. */
export function guessFilter(passes, observer) {
  const min = minPeakDeg(observer);
  return (Array.isArray(passes) ? passes : []).filter((p) => p && p.visible === true && Number.isFinite(p.peakEl) && p.peakEl * DEG >= min);
}

/**
 * How long a crewed station may be later than the earliest pass and still be the one offered.
 * MEASURED 2026-10-01 on the live site: "the next pass" from San Juan was an SL-16 rocket body.
 * Correct, and not what anyone came for; a station a couple of hours later is worth the wait.
 */
export const CREWED_WAIT_MS = 3 * 3600e3;
/** Classes offered only when nothing else is up (data/parsers.js classify: station, satellite, rocket, debris). */
const LAST_RESORT = new Set(['rocket', 'debris']);
const klassOf = (p) => (p && p.record && p.record.klass) || 'satellite';

/**
 * The next pass worth looking up for: still to end and visible; rocket bodies and debris only when
 * nothing else is; otherwise the earliest, unless a crewed station starts within CREWED_WAIT_MS of
 * it, which wins. Null when there is none.
 */
export function nextVisible(passes, observer, nowMs) {
  const open = guessFilter(passes, observer)
    .filter((p) => p.endMs > nowMs)
    .sort((a, b) => a.startMs - b.startMs);
  const worth = open.filter((p) => !LAST_RESORT.has(klassOf(p)));
  const pool = worth.length ? worth : open;
  const first = pool[0];
  if (!first) return null;
  return pool.find((p) => klassOf(p) === 'station' && p.startMs - first.startMs <= CREWED_WAIT_MS) || first;
}

/** 'coming' | 'up' | 'gone' for a pass at nowMs. */
export function passState(pass, nowMs) {
  if (!pass) return 'gone';
  if (nowMs < pass.startMs) return 'coming';
  if (nowMs < pass.endMs) return 'up';
  return 'gone';
}

/** "1:02:05" / "4:07" / "0:09": the countdown, never negative, h only when there are hours. */
export function countdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const two = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(r)}` : `${m}:${two(r)}`;
}

/**
 * Darkness at the observer from nowMs: {darkNow, fromMs, untilMs, never, moonPercent, moonRiseMs,
 * moonUp}. `never`: the Sun does not reach -6 degrees in the next day (a high-latitude summer).
 */
export function darkness(observer, nowMs) {
  const latDeg = Number.isFinite(observer && observer.latDeg) ? observer.latDeg : observer && observer.latRad * DEG;
  const lonDeg = Number.isFinite(observer && observer.lonDeg) ? observer.lonDeg : observer && observer.lonRad * DEG;
  if (!Number.isFinite(latDeg) || !Number.isFinite(lonDeg) || !Number.isFinite(nowMs)) return null;
  const obs = new Astronomy.Observer(latDeg, lonDeg, 0);
  const now = new Date(nowMs);
  const altOf = (body, d) => {
    const eq = Astronomy.Equator(body, d, obs, true, true);
    return Astronomy.Horizon(d, obs, eq.ra, eq.dec, 'normal').altitude;
  };
  const out = { darkNow: false, fromMs: null, untilMs: null, never: false, moonPercent: null, moonRiseMs: null, moonUp: false };
  try {
    out.darkNow = altOf(Astronomy.Body.Sun, now) < -6;
    if (out.darkNow) {
      const dawn = Astronomy.SearchAltitude(Astronomy.Body.Sun, obs, +1, now, 1, -6);
      out.untilMs = dawn ? dawn.date.getTime() : null;
    } else {
      const dusk = Astronomy.SearchAltitude(Astronomy.Body.Sun, obs, -1, now, 1, -6);
      if (dusk) out.fromMs = dusk.date.getTime();
      else out.never = true;
    }
    out.moonPercent = Math.round(Astronomy.Illumination(Astronomy.Body.Moon, now).phase_fraction * 100);
    out.moonUp = altOf(Astronomy.Body.Moon, now) > 0;
    if (!out.moonUp) {
      const rise = Astronomy.SearchRiseSet(Astronomy.Body.Moon, obs, +1, now, 1);
      out.moonRiseMs = rise ? rise.date.getTime() : null;
    }
  } catch {
    return null;
  }
  return out;
}

/** The place line: "near Chicago (estimated from your time zone)" or "from Chicago". */
function placeWords(observer) {
  const T = COPY.tonight;
  if (!observer) return T.noPlace;
  const name = observer.name || t(T.coords, { lat: fmt.num(observer.latDeg, 1), lon: fmt.num(observer.lonDeg, 1) });
  if (observer.source === 'guess') return t(T.placeGuess, { place: name });
  if (observer.source === 'shared') return t(T.placeShared, { place: name });
  return t(T.placeSet, { place: name });
}

/**
 * Everything the card says, as strings: {place, line, countdown, status, caveat, dark, empty},
 * and the pass as its parts for the layout that draws them apart: `parts` {name, time, deg, mins,
 * path}, and `next`, the line under an empty tonight.
 * `state`: {observer, nowMs, pass (nextVisible's), later (the next one found within 72 h when none
 * tonight), passes loaded?, couldNotLook, dark (darkness()), scrubbed}.
 */
export function tonightWords(state) {
  const T = COPY.tonight;
  const out = { place: placeWords(state.observer), line: null, parts: null, countdown: null, status: null, caveat: null, dark: null, empty: null, next: null, lookDir: null };
  if (state.couldNotLook) { out.empty = COPY.controls.tonightCouldNotLook; return out; }
  if (!state.ready) { out.empty = T.working; return out; }
  const p = state.pass;
  if (!p) {
    const later = state.later;
    out.empty = later ? T.nothingTonight : T.nothingAtAll;
    if (later) out.next = t(T.nextPass, { when: timeText.dayAndTime(later.startMs), name: nameOf(later) });
  } else {
    const minutes = Math.max(1, Math.round((p.endMs - p.startMs) / 60000));
    out.line = t(T.passLine, {
      name: nameOf(p),
      time: timeText.hhmm(p.startMs),
      from: compassWords(p.startAz * DEG),
      to: compassWords(p.endAz * DEG),
      fists: fistsWords(p.peakEl * DEG),
      deg: fmt.int(p.peakEl * DEG),
      mins: fmt.int(minutes),
    });
    out.parts = {
      name: nameOf(p),
      time: timeText.hhmm(p.startMs),
      deg: t(T.degrees, { deg: fmt.int(p.peakEl * DEG) }),
      mins: fmt.int(minutes),
      path: t(T.path, { from: compassWords(p.startAz * DEG), to: compassWords(p.endAz * DEG) }),
    };
    const st = passState(p, state.nowMs);
    if (st === 'up') {
      out.lookDir = compassWords(p.startAz * DEG);
      out.status = t(T.upNow, { dir: out.lookDir });
    } else if (state.scrubbed) {
      out.status = t(T.startsAt, { time: timeText.hhmm(p.startMs) });
    } else {
      out.countdown = countdown(p.startMs - state.nowMs);
      out.status = t(T.startsIn, { countdown: out.countdown });
    }
    if (state.observer && state.observer.source === 'guess') out.caveat = T.guessCaveat;
  }
  const d = state.dark;
  if (d) {
    const moon = d.moonUp ? t(T.moonUp, { pct: fmt.int(d.moonPercent) })
      : d.moonRiseMs ? t(T.moonRises, { pct: fmt.int(d.moonPercent), time: timeText.hhmm(d.moonRiseMs) })
        : t(T.moonDown, { pct: fmt.int(d.moonPercent) });
    const dark = d.never ? T.neverDark : d.darkNow ? (d.untilMs ? t(T.darkUntil, { time: timeText.hhmm(d.untilMs) }) : T.darkNow) : t(T.darkFrom, { time: timeText.hhmm(d.fromMs) });
    out.dark = dark + COPY.punctuation.separator + moon;
  }
  return out;
}

/** The name a person uses ("International Space Station", not "ISS (ZARYA)"), as the labels do. */
function nameOf(p) {
  const r = p && p.record;
  return (r && labelName(r)) || COPY.card.unknownName;
}
