// ui/deeptime.js -- the sky's deep-time row: go a thousand or ten thousand years either way, or to the
// years when another star marked the pole, and read which one does (forge #141).
//
// Contract: shiftYears(ms, years, nowMs) -> ms        the same date and hour, `years` later (clamped to +-DEEP_YEARS of now)
//           yearOf(ms) -> the astronomical year (0 is 1 BC)
//           yearWords(year, K) -> 'AD 14 000' | '2 800 BC' | '2026'
//           deepWords(epoch, far, K) -> { line, pole } | null       the readout, from groundsky's epoch() state
//           PRESETS                                            [{ id, year }]
//           mountDeepTime(node, ctx, helpers) -> { paint() }    helpers: { row, button, el }, ui/tonight.js's own
// Mounted by ui/tonight.js in the sky's controls, under the time strip. The words are copy/en.stars.js's.
//
// WHY STEPS AND PRESETS, NOT A SLIDER. The time pill's tape is a month back and a year on, which is the span
// satellites mean anything over. The stars need 100 000 years, and a slider across that has 7 days a pixel
// nowhere near today and 300 years a pixel at the ends: steps of a thousand and ten thousand years, with
// keyboard and screen-reader names, are the ones a person can aim. The three presets are the sky's own
// stories: Thuban at the pole when the pyramids were built, Vega's turn about AD 13 700, and AD 50 000.
//
// THE CLOCK. A step moves the one clock (clock.goTo), keeping the month, day and hour, so a night stays a
// night and a December sky stays a winter one. Nothing animates: reduced motion has nothing to turn off.

import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.stars.js';
import { DEEP_YEARS, isFar, POLE_STAR_DEG } from '../sky/starmotion.js';

export const STEPS = [-10000, -1000, 1000, 10000];
export const PRESETS = [{ id: 'thuban', year: -2799 }, { id: 'vega', year: 13700 }, { id: 'far', year: 50000 }];

/** The astronomical year of an instant: 1 BC is 0, 2 BC is -1. */
export function yearOf(ms) {
  return new Date(ms).getUTCFullYear();
}

/** The same month, day and hour `years` later, never further than DEEP_YEARS from `nowMs`. */
export function shiftYears(ms, years, nowMs = Date.now()) {
  const d = new Date(ms);
  const want = d.getUTCFullYear() + Math.round(years);
  const lo = new Date(nowMs).getUTCFullYear() - DEEP_YEARS;
  const hi = new Date(nowMs).getUTCFullYear() + DEEP_YEARS;
  const y = Math.max(lo, Math.min(hi, want));
  // 29 February in a year that has none would roll into March: keep the 28th instead.
  const day = d.getUTCMonth() === 1 && d.getUTCDate() === 29 ? 28 : d.getUTCDate();
  const out = new Date(0);
  out.setUTCFullYear(y, d.getUTCMonth(), day);
  out.setUTCHours(d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), 0);
  return out.getTime();
}

/** A year as people write it: '2026', 'AD 14 000' past 9999, '2 800 BC' for the astronomical -2799. */
export function yearWords(year, K) {
  if (year <= 0) return t(K.yearBc, { n: fmt.int(1 - year) });
  if (year > 9999) return t(K.yearAd, { n: fmt.int(year) });
  return String(year);
}

/**
 * The readout's two lines from sky/groundsky.js epoch() ({ epoch, pole: { name, mag, sepDeg } | null }) and
 * whether the clock is far enough that the Moon and planets are not drawn. Null for today's sky.
 */
export function deepWords(epoch, far, K) {
  if (!epoch || !Number.isFinite(epoch.epoch)) return null;
  const year = Math.round(epoch.epoch);
  const line = [t(K.moved, { year: yearWords(year, K) }), far ? K.far : ''].filter(Boolean).join(' ');
  const p = epoch.pole;
  let pole = '';
  if (p) {
    const name = p.name || t(K.unnamed, { mag: fmt.num(p.mag, 1) });
    pole = t(p.sepDeg <= POLE_STAR_DEG ? K.pole : K.noPole, { name, deg: fmt.num(p.sepDeg, 1) });
  }
  return { line, pole };
}

export function mountDeepTime(node, ctx, { row, button, el }) {
  const K = COPY.deepTime;
  const goYears = (n) => {
    if (!ctx.clock || typeof ctx.clock.goTo !== 'function') return;
    ctx.clock.goTo(shiftYears(ctx.clock.now(), n));
    paint();
  };
  const steps = row(K.title, true);
  for (const n of STEPS) {
    const b = button(steps, t(n < 0 ? K.back : K.on, { n: fmt.int(Math.abs(n)) }), t(n < 0 ? K.backTitle : K.onTitle, { n: fmt.int(Math.abs(n)) }), () => goYears(n));
    b.removeAttribute('aria-pressed');
  }
  const presets = row(K.presetsLabel, true);
  for (const p of PRESETS) {
    const b = button(presets, K.presets[p.id], K.presetTitles[p.id], () => goYears(p.year - yearOf(ctx.clock.now())));
    b.removeAttribute('aria-pressed');
  }
  const line = el('p', 'sr-density__note');
  line.setAttribute('aria-live', 'polite');
  const pole = el('p', 'sr-density__note');
  const honest = el('p', 'sr-density__note', K.honest); // wraps: the caveat style is one line
  node.append(line, pole, honest);

  function paint() {
    const s = ctx.skyView;
    const g = s && typeof s.groundStats === 'function' ? s.groundStats() : null;
    const now = ctx.clock ? ctx.clock.now() : Date.now();
    const far = isFar(now);
    // The year in the readout is the clock's calendar year, not the Julian epoch the stars are moved to.
    const w = deepWords(g && g.epoch ? { ...g.epoch, epoch: yearOf(now) } : null, far, K);
    line.hidden = !w;
    pole.hidden = !w || !w.pole;
    honest.hidden = !w;
    if (w) {
      if (line.textContent !== w.line) line.textContent = w.line;
      if (pole.textContent !== w.pole) pole.textContent = w.pole;
    }
  }
  paint();
  return { paint };
}
