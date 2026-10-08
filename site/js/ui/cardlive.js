// ui/cardlive.js -- the numbers on an open card that move while you read them, and the chart of
// how far a thing is from the Earth over six years (internal #295, #296, #127; after TheSkyLive).
//
// Everything here is pure: numbers in, words and points out. ui/cards.js owns the DOM, the timer
// and the clock; it imports this, so none of it is on a first visit (ui/cardgate.js).
//
//   lightTimeText(km)                      "17 min 22 s": light's travel time, to the second
//   liveDistanceWords(km)                  { km: "312 456 789", light: "17 min 22 s" } | null
//   liveKey(tMs, still)                    the instant a shown distance belongs to: the whole
//                                          second, or (reduced motion) the whole minute
//   distanceSamples(distAt, t0, t1, n)     [{ tMs, km }] where distAt gave a number
//   closestApproach(distAt, samples)       { tMs, km } refined inside the best coarse bracket
//   sparkGeometry(samples, nowMs, min, w, h)  { path, nowX, minX, minY } for an SVG of w x h
//   closestWords(min, approximate)         "Closest: 13 Apr 2029 · 0.1 Moon distances"
//   upFor(launchMs, nowMs)                 whole years in orbit, or null
//   upForWords(launchMs, year, nowMs)      the sentence, from a catalogue date or a designator's year
//
// HONESTY. The kilometres are computed from the orbit the map draws, not measured: a planet's
// place is good to about an arcminute, so the last digits show that the thing MOVES, not where it
// is to a kilometre. The card says so beside the number (COPY.live.note).

import { COPY, t, fmt, timeText, UNITS } from '../copy/en.js';
import '../copy/en.later.js';

const LIGHT_KM_PER_S = UNITS.LIGHT_MINUTE_KM / 60;
const DAY_MS = 864e5;
const YEAR_MS = 365.25 * DAY_MS;

/** Three years either side of the clock (internal #296). */
export const SPARK_SPAN_MS = 3 * YEAR_MS;
/** One sample every six days: a close pass is a V some weeks wide, never between two samples. */
export const SPARK_SAMPLES = 366;
/** Fewer points than this is not a curve (a path file that covers a month of the six years). */
export const SPARK_MIN_SAMPLES = 30;

const two = (n) => String(n).padStart(2, '0');

/** Light's travel time over `km`, to the second: "1.3 s", "8 min 19 s", "4 h 10 min 07 s". */
export function lightTimeText(km) {
  if (!Number.isFinite(km) || km < 0) return '';
  const L = COPY.live;
  const s = km / LIGHT_KM_PER_S;
  if (s < 60) return t(L.seconds, { s: fmt.num(s, s < 10 ? 1 : 0) });
  const whole = Math.floor(s + 1e-6); // a whole second is not lost to the division
  const sec = whole % 60;
  const min = Math.floor(whole / 60) % 60;
  const h = Math.floor(whole / 3600);
  if (h < 1) return t(L.minSec, { min: String(min), s: two(sec) });
  return t(L.hourMinSec, { h: fmt.int(h), min: two(min), s: two(sec) });
}

/** The two moving values, or null when there is no distance to give. */
export function liveDistanceWords(km) {
  if (!Number.isFinite(km) || km <= 0) return null;
  return { km: fmt.int(Math.round(km)), light: lightTimeText(km) };
}

/**
 * The instant a shown distance is worked out for. Once a second while things may move; under
 * reduced motion once a minute, so the row is still while it is read but follows a clock that is
 * set somewhere else.
 */
export function liveKey(tMs, still = false) {
  const step = still ? 60e3 : 1000;
  return Math.floor(tMs / step) * step;
}

/** `n` evenly spaced samples of distAt(tMs) -> km over [t0, t1]; a time with no answer is left out. */
export function distanceSamples(distAt, t0, t1, n = SPARK_SAMPLES) {
  const out = [];
  if (typeof distAt !== 'function' || !(t1 > t0) || !(n > 1)) return out;
  for (let i = 0; i < n; i += 1) {
    const tMs = t0 + ((t1 - t0) * i) / (n - 1);
    let km = null;
    try { km = distAt(tMs); } catch { km = null; }
    if (Number.isFinite(km) && km >= 0) out.push({ tMs, km });
  }
  return out;
}

/**
 * The closest approach inside the sampled span: the lowest coarse sample, then a golden-section
 * search between its neighbours (to a minute). Null without samples.
 */
export function closestApproach(distAt, samples) {
  if (!Array.isArray(samples) || !samples.length) return null;
  let k = 0;
  for (let i = 1; i < samples.length; i += 1) if (samples[i].km < samples[k].km) k = i;
  let a = samples[Math.max(0, k - 1)].tMs;
  let b = samples[Math.min(samples.length - 1, k + 1)].tMs;
  let best = { tMs: samples[k].tMs, km: samples[k].km };
  if (typeof distAt !== 'function' || !(b > a)) return best;
  const G = (Math.sqrt(5) - 1) / 2;
  const f = (x) => { let v = null; try { v = distAt(x); } catch { v = null; } return Number.isFinite(v) ? v : Infinity; };
  let c = b - G * (b - a);
  let d = a + G * (b - a);
  let fc = f(c);
  let fd = f(d);
  for (let i = 0; i < 60 && b - a > 60e3; i += 1) {
    if (fc < fd) { b = d; d = c; fd = fc; c = b - G * (b - a); fc = f(c); }
    else { a = c; c = d; fc = fd; d = a + G * (b - a); fd = f(d); }
  }
  const tMs = (a + b) / 2;
  const km = f(tMs);
  if (km < best.km) best = { tMs, km };
  return best;
}

/**
 * The curve as an SVG path in a w x h box: time left to right, distance from zero at the bottom to
 * the farthest sample at the top (a linear scale with its zero on the baseline, so a dip to the
 * Earth reads as one). And where now and the closest approach sit.
 */
export function sparkGeometry(samples, nowMs, min, w = 320, h = 56) {
  if (!Array.isArray(samples) || samples.length < 2) return null;
  const t0 = samples[0].tMs;
  const t1 = samples[samples.length - 1].tMs;
  const top = Math.max(...samples.map((s) => s.km));
  if (!(t1 > t0) || !(top > 0)) return null;
  const x = (ms) => Math.min(w, Math.max(0, ((ms - t0) / (t1 - t0)) * w));
  // One unit of headroom: a 2 px stroke at the top or the bottom is not cut by the box.
  const y = (km) => 1 + (1 - km / top) * (h - 2);
  const r = (v) => Math.round(v * 10) / 10;
  const path = samples.map((s, i) => `${i ? 'L' : 'M'}${r(x(s.tMs))} ${r(y(s.km))}`).join('');
  return {
    path,
    nowX: Number.isFinite(nowMs) && nowMs >= t0 && nowMs <= t1 ? r(x(nowMs)) : null,
    minX: min ? r(x(min.tMs)) : null,
    minY: min ? r(y(Math.min(top, min.km))) : null,
    // The mark is a tick standing on the baseline, a quarter of the box high: a pass that reaches
    // the baseline would otherwise have a mark of no height at all (seen 2026-10-08 on Apophis).
    tickY: r(h - 1 - h / 4),
    t0, t1, topKm: top,
  };
}

/** How far, in the Moon's distances under a hundred of them and in astronomical units beyond. */
export function closestDistanceText(km) {
  if (!Number.isFinite(km)) return '';
  const L = COPY.live;
  const ld = km / UNITS.LUNAR_DISTANCE_KM;
  if (ld < 100) return t(L.moonDistances, { n: fmt.num(ld, ld < 10 ? 1 : 0) });
  return t(L.au, { n: fmt.smart(km / UNITS.AU_KM) });
}

/** "13 Apr 2029", in UTC: a date for one line of a narrow card. */
export function shortUtcDate(ms) {
  if (!Number.isFinite(ms)) return '';
  const d = new Date(ms);
  return t(COPY.live.shortDate, { day: String(d.getUTCDate()), month: COPY.live.months[d.getUTCMonth()], year: String(d.getUTCFullYear()) });
}

/** "Closest: 13 Apr 2029 · 0.1 Moon distances", and "about" in front when the path is approximate. */
export function closestWords(min, approximate = false) {
  if (!min || !Number.isFinite(min.tMs) || !Number.isFinite(min.km)) return '';
  const L = COPY.live;
  return t(approximate ? L.closestAbout : L.closest, { date: shortUtcDate(min.tMs), dist: closestDistanceText(min.km) });
}

/** Whole years since launch, or null (no date, or a date after the clock). */
export function upFor(launchMs, nowMs) {
  if (!Number.isFinite(launchMs) || !Number.isFinite(nowMs) || nowMs < launchMs) return null;
  return Math.floor((nowMs - launchMs) / YEAR_MS);
}

/**
 * "Up for 28 years (launched 20 November 1998)" from a catalogue date, "Launched in 1998, about 28
 * years up" from the designator alone, null from neither. `year` is the designator's.
 */
export function upForWords(launchMs, year, nowMs) {
  const L = COPY.live;
  const n = upFor(launchMs, nowMs);
  if (n !== null) {
    const date = timeText.utcLong(launchMs);
    if (n < 1) return t(L.upUnderAYear, { date });
    return t(n === 1 ? L.upOneYear : L.upYears, { n: fmt.int(n), date });
  }
  if (!Number.isFinite(year) || !Number.isFinite(nowMs)) return null;
  const y = new Date(nowMs).getUTCFullYear() - year;
  if (y < 0) return null;
  return y < 1 ? t(L.upSinceYearNew, { year: String(year) }) : t(L.upSinceYear, { year: String(year), n: fmt.int(y) });
}
