// sky/tonightbest.js -- what is worth looking at tonight from your place, ranked (internal #358),
// and a pass as a row a person can use (pub #448).
//
// Contract: nightWindow(observer, nowMs), planetTonight(id, observer, win), moonTonight(observer, win),
//           passNumbers(pass), passScore(pass), tonightBest({observer, nowMs, passes, showers, max}),
//           bestWords(row), passWords(pass), darkWords(best), plainName(record), magText(mag)
// Pure: no DOM, no clock of its own, no fetch. Astronomy Engine works out the planets, the Moon
// and the twilight; the passes are sky/passes.js's, handed in; the showers are registry rows.
//
// THE RANKING IS A RULE, NOT A TASTE, and it is this file's to state. A row's score is how easy
// the thing is to see: how bright (five points a magnitude), how high at its best (up to ten), and
// its kind's base. A bright station pass outranks Saturn; Venus outranks everything but the
// station; the Moon sits under the planets because it needs no finding; a shower is worth its
// hourly rate, halved by a bright Moon. At most seven rows, and never more than three passes: this
// is a list of what to look at, not a timetable. tests/test_tonightbest.mjs holds the order.
//
// EVERYTHING IS COMPUTED FOR THE PLACE, AND SAYS SO: the list's last line is the honesty line.

import * as Astronomy from '../../vendor/astronomy.js';
import { COPY, t, fmt, timeText } from '../copy/en.js';
import { SHOWERS } from '../data/showers.js';
import { activeShowers, radiantAltAz } from './radiants.js';
import { labelName } from '../ui/labels.js';

const DEG = 180 / Math.PI;
const STEP_MS = 10 * 60e3;
/** A planet must climb this high in the dark to be offered; Mercury and Venus, which never get far from the Sun, half that. */
export const MIN_ALT_DEG = 10;
export const MIN_ALT_INNER_DEG = 5;
/** The planets anyone can see without a lens, in the order they are tried. */
export const NAKED_EYE_PLANETS = ['venus', 'jupiter', 'mars', 'saturn', 'mercury'];
const BODY = { sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn' };
/**
 * Standard magnitudes (at 1000 km, half lit), by catalogue number, for the two stations: what
 * Heavens-Above lists as "intrinsic brightness" on each object's page, read 2026-10-05
 * (heavens-above.com/SatInfo.aspx?satid=25544 and 48274). sky/passes.js turns one into the
 * brightness of a pass from its range and phase. Every other object has none here, and its row
 * says "—": a missing number is never a guess.
 */
export const STANDARD_MAGNITUDE = { 25544: -1.8, 48274: 0.0 };

/** The standard magnitude a record carries, or the table's, or null. */
export function standardMagnitude(record) {
  const m = record && record.meta;
  for (const v of [m && m.stdMag, m && m.standardMagnitude]) if (v !== null && v !== undefined && Number.isFinite(Number(v))) return Number(v);
  const id = record && String(record.id).replace(/\D/g, '');
  return id && Object.prototype.hasOwnProperty.call(STANDARD_MAGNITUDE, id) ? STANDARD_MAGNITUDE[id] : null;
}

export const MAX_ROWS = 7;
export const MAX_PASSES = 3;

function observerOf(o) {
  const latDeg = Number.isFinite(o && o.latDeg) ? o.latDeg : o && o.latRad * DEG;
  const lonDeg = Number.isFinite(o && o.lonDeg) ? o.lonDeg : o && o.lonRad * DEG;
  if (!Number.isFinite(latDeg) || !Number.isFinite(lonDeg)) return null;
  return new Astronomy.Observer(latDeg, lonDeg, 0);
}

function altAz(body, ms, obs) {
  const d = new Date(ms);
  const eq = Astronomy.Equator(body, d, obs, true, true);
  const h = Astronomy.Horizon(d, obs, eq.ra, eq.dec, 'normal');
  return { altDeg: h.altitude, azDeg: h.azimuth };
}

/**
 * Tonight, as two instants: from the end of civil twilight (the Sun 6 degrees down, the rule
 * sky/passes.js uses for "dark enough") to its start in the morning. Dark already: from now.
 * `{startMs, endMs, darkNow}`, or null where the Sun does not get that low in the next day.
 */
export function nightWindow(observer, nowMs) {
  const obs = observerOf(observer);
  if (!obs || !Number.isFinite(nowMs)) return null;
  try {
    const now = new Date(nowMs);
    const darkNow = altAz('Sun', nowMs, obs).altDeg < -6;
    let startMs = nowMs;
    if (!darkNow) {
      const dusk = Astronomy.SearchAltitude('Sun', obs, -1, now, 1, -6);
      if (!dusk) return null;
      startMs = dusk.date.getTime();
    }
    const dawn = Astronomy.SearchAltitude('Sun', obs, +1, new Date(startMs + 60e3), 1, -6);
    if (!dawn) return null;
    return { startMs, endMs: dawn.date.getTime(), darkNow };
  } catch {
    return null;
  }
}

/**
 * A planet tonight: when it is highest while the sky is dark, how high and which way then, how
 * bright. Null when it never clears MIN_ALT_DEG in the window (it is not offered at all then).
 */
export function planetTonight(id, observer, win) {
  const obs = observerOf(observer);
  const body = BODY[id];
  if (!obs || !body || !win) return null;
  try {
    let best = null;
    for (let ms = win.startMs; ms <= win.endMs; ms += STEP_MS) {
      const aa = altAz(body, ms, obs);
      if (!best || aa.altDeg > best.altDeg) best = { ms, ...aa };
    }
    const min = id === 'mercury' || id === 'venus' ? MIN_ALT_INNER_DEG : MIN_ALT_DEG;
    if (!best || best.altDeg < min) return null;
    const mag = Astronomy.Illumination(body, new Date(best.ms)).mag;
    return { kind: 'planet', id, bestMs: best.ms, altDeg: best.altDeg, azDeg: best.azDeg, mag };
  } catch {
    return null;
  }
}

/**
 * The Moon tonight: how much of it is lit, whether that is growing, when it rises and sets inside
 * a day of the window's start, and whether it is up at any time while the sky is dark.
 */
export function moonTonight(observer, win) {
  const obs = observerOf(observer);
  if (!obs || !win) return null;
  try {
    const at = new Date(win.startMs);
    const il = Astronomy.Illumination('Moon', at);
    const phase = Astronomy.MoonPhase(at); // 0 new, 90 first quarter, 180 full, 270 last quarter
    let best = null;
    for (let ms = win.startMs; ms <= win.endMs; ms += STEP_MS) {
      const aa = altAz('Moon', ms, obs);
      if (!best || aa.altDeg > best.altDeg) best = { ms, ...aa };
    }
    const upAtStart = altAz('Moon', win.startMs, obs).altDeg > 0;
    const rise = Astronomy.SearchRiseSet('Moon', obs, +1, at, 1);
    const set = Astronomy.SearchRiseSet('Moon', obs, -1, at, 1);
    const riseMs = rise ? rise.date.getTime() : null;
    const setMs = set ? set.date.getTime() : null;
    return {
      kind: 'moon', id: 'moon',
      percent: Math.round(il.phase_fraction * 100),
      waxing: phase < 180,
      phase: phaseName(phase),
      upAtStart,
      // Up at some point in the dark: at the start, or it rises before the window ends.
      upTonight: best.altDeg > 0,
      riseMs: riseMs !== null && riseMs < win.endMs ? riseMs : null,
      setMs: setMs !== null && setMs < win.endMs && (upAtStart || (riseMs !== null && setMs > riseMs)) ? setMs : null,
      bestMs: best.ms, altDeg: best.altDeg, azDeg: best.azDeg, mag: il.mag,
    };
  } catch {
    return null;
  }
}

/** The eight names, from the Moon's ecliptic angle from the Sun: 'new', 'waxingCrescent', ... */
export function phaseName(phaseDeg) {
  const p = ((phaseDeg % 360) + 360) % 360;
  if (p < 12 || p >= 348) return 'new';
  if (p < 78) return 'waxingCrescent';
  if (p < 102) return 'firstQuarter';
  if (p < 168) return 'waxingGibbous';
  if (p < 192) return 'full';
  if (p < 258) return 'waningGibbous';
  if (p < 282) return 'lastQuarter';
  return 'waningCrescent';
}

/**
 * A pass as the numbers a row prints (pub #448): when and where it starts, peaks and ends, how
 * high, how bright, and whether it fades into the Earth's shadow before it sets. The three moments
 * are of the whole pass above sky/passes.js's horizon, because the three directions are: a pass
 * that is lit for only part of that says so in its note (`fades`, `appears`), and its arc on the
 * sky is drawn solid only where it is lit.
 */
export function passNumbers(pass) {
  if (!pass || !Number.isFinite(pass.startMs) || !Number.isFinite(pass.endMs)) return null;
  const startMs = pass.startMs;
  const endMs = pass.endMs;
  const peakMs = Math.min(Math.max(Number.isFinite(pass.peakMs) ? pass.peakMs : (startMs + endMs) / 2, startMs), endMs);
  return {
    startMs, peakMs, endMs,
    startAzDeg: pass.startAz * DEG,
    peakAzDeg: Number.isFinite(pass.peakAz) ? pass.peakAz * DEG : null,
    endAzDeg: pass.endAz * DEG,
    peakDeg: Math.round(pass.peakEl * DEG),
    mag: Number.isFinite(pass.magnitude) ? pass.magnitude : null,
    visible: pass.visible === true,
    // Lit when it rises and gone before it sets: the pass ends in mid-sky, which surprises people.
    fades: pass.visible === true && Number.isFinite(pass.sunlitEndMs) && pass.sunlitEndMs < pass.endMs - 20e3,
    appears: pass.visible === true && Number.isFinite(pass.sunlitStartMs) && pass.sunlitStartMs > pass.startMs + 20e3,
  };
}

/** Two passes are the same pass when the name and the minute it starts are the same. */
export function samePassKey(pass) {
  return `${plainName(pass && pass.record)}@${Math.round(((pass && pass.startMs) || 0) / 60e3)}`;
}

/** How easy a pass is to see: brightness first, then height. No magnitude known: height alone. */
export function passScore(pass) {
  const n = passNumbers(pass);
  if (!n || !n.visible) return 0;
  const bright = n.mag === null ? 0 : Math.max(-10, Math.min(35, (2 - n.mag) * 5));
  return 60 + bright + Math.min(10, n.peakDeg / 9);
}

function planetScore(p) {
  return 55 + Math.max(-10, Math.min(30, (2 - p.mag) * 5)) + Math.min(10, p.altDeg / 9);
}

/**
 * The list: `{window, rows, moon, moonLight}`. `rows` are at most `max`, best first, each
 * `{kind: 'pass'|'planet'|'moon'|'shower', score, ...}`; `moon` is moonTonight() whether or not it
 * made the list, for the "how dark" line. Null window: the Sun does not set far enough, and the
 * only rows are passes.
 */
export function tonightBest({ observer, nowMs, passes = [], showers = SHOWERS, max = MAX_ROWS } = {}) {
  const win = nightWindow(observer, nowMs);
  const rows = [];
  const until = win ? win.endMs : nowMs + 24 * 3600e3;
  const open = (Array.isArray(passes) ? passes : [])
    .filter((p) => p && p.visible === true && p.endMs > nowMs && p.startMs < until)
    .map((p) => ({ kind: 'pass', id: `${p.recordId || (p.record && p.record.id)}:${p.startMs}`, pass: p, score: passScore(p), whenMs: p.startMs }))
    .sort((a, b) => b.score - a.score);
  // The same object is in two catalogues (a station is also one of the brightest): one row.
  const seen = new Set();
  const once = open.filter((r) => { const k = samePassKey(r.pass); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, MAX_PASSES);
  rows.push(...once);
  let moon = null;
  if (win) {
    for (const id of NAKED_EYE_PLANETS) {
      const p = planetTonight(id, observer, win);
      if (p) rows.push({ ...p, score: planetScore(p), whenMs: p.bestMs });
    }
    moon = moonTonight(observer, win);
    if (moon && moon.upTonight && moon.percent >= 2) rows.push({ ...moon, score: 50 + moon.percent / 10 + Math.min(10, moon.altDeg / 9), whenMs: moon.bestMs });
    const where = { latRad: (Number.isFinite(observer.latDeg) ? observer.latDeg : observer.latRad * DEG) / DEG, lonRad: (Number.isFinite(observer.lonDeg) ? observer.lonDeg : observer.lonRad * DEG) / DEG };
    for (const sh of activeShowers(win.startMs, showers)) {
      // Where the radiant is highest in the dark: a radiant under the horizon sends nothing up.
      let best = null;
      for (let ms = win.startMs; ms <= win.endMs; ms += 3 * STEP_MS) {
        const aa = radiantAltAz(sh, ms, where);
        if (aa && (!best || aa.altDeg > best.altDeg)) best = { ms, ...aa };
      }
      if (!best || best.altDeg < 15) continue;
      const moonCost = moon && moon.upTonight ? 1 - 0.5 * (moon.percent / 100) : 1;
      rows.push({ kind: 'shower', id: sh.id, shower: sh, bestMs: best.ms, altDeg: best.altDeg, azDeg: best.azDeg, whenMs: best.ms, score: 35 + Math.min(40, (Number(sh.zhr) || 0) / 3) * moonCost });
    }
  }
  rows.sort((a, b) => b.score - a.score || a.whenMs - b.whenMs);
  return { window: win, rows: rows.slice(0, max), moon, moonLight: moon ? moon.upTonight && moon.percent >= 35 : false };
}

// ------------------------------------------------------------------------------------- words

/** "−3.1" with a real minus sign, one decimal; an unknown magnitude is the dash, never a guess. */
export function magText(mag) {
  if (!Number.isFinite(mag)) return COPY.punctuation.missing || '—';
  const v = Math.round(mag * 10) / 10;
  return (v < 0 ? '−' : '') + Math.abs(v).toFixed(1);
}

/** Sixteen-point compass letters for a row ("SSW"), from copy/en.js. */
export function compassShort(azDeg) {
  const list = COPY.sky.compassShort;
  if (!Number.isFinite(azDeg) || !Array.isArray(list)) return '';
  return list[Math.round((((azDeg % 360) + 360) % 360) / 22.5) % 16];
}

/**
 * What a person calls it. A rocket body or a piece of debris says so in words, with the
 * catalogue's name after it: "SL-16 R/B" tells a beginner nothing (pub #448).
 */
export function plainName(record) {
  const B = COPY.tonight.best;
  const name = (record && labelName(record)) || COPY.card.unknownName;
  const raw = String((record && record.name) || name);
  if (/\bR\/B\b/i.test(raw) || (record && record.klass === 'rocket')) return t(B.rocket, { name: name.replace(/\s*R\/B.*$/i, '').trim() });
  if (/\bDEB\b/i.test(raw) || (record && record.klass === 'debris')) return t(B.debris, { name: name.replace(/\s*DEB.*$/i, '').trim() });
  return name;
}

/**
 * A pass as a row: its name, and one mono line of the three moments.
 * "21:03 SW · 21:06 52° S · 21:09 NE", with "mag −3.1" for the row's right side. `aria` is the
 * same as a sentence.
 */
export function passWords(pass) {
  const B = COPY.tonight.best;
  const n = passNumbers(pass);
  if (!n) return null;
  const vars = {
    t0: timeText.hhmm(n.startMs), d0: compassShort(n.startAzDeg),
    t1: timeText.hhmm(n.peakMs), d1: n.peakAzDeg === null ? '' : compassShort(n.peakAzDeg), deg: fmt.int(n.peakDeg),
    t2: timeText.hhmm(n.endMs), d2: compassShort(n.endAzDeg),
    mag: magText(n.mag),
  };
  const name = plainName(pass.record);
  const note = !n.visible ? B.notVisible : n.fades ? B.fades : n.appears ? B.appears : '';
  return {
    name,
    line: t(B.passLine, vars).replace(/\s+·/g, ' ·').replace(/\s{2,}/g, ' ').trim(),
    side: t(B.mag, vars),
    note,
    aria: t(B.passAria, { name, ...vars }) + (note ? ` ${note}` : ''),
  };
}

/** One row of the list as `{title, line, aria}`: one line each, numbers in the line. */
export function bestWords(row) {
  const B = COPY.tonight.best;
  if (!row) return null;
  if (row.kind === 'pass') {
    const w = passWords(row.pass);
    return w ? { title: w.name, line: w.line, side: w.side, aria: w.aria } : null;
  }
  if (row.kind === 'planet') {
    const title = (COPY.sky.bodies || {})[row.id] || row.id;
    const line = t(B.planetLine, { time: timeText.hhmm(row.bestMs), deg: fmt.int(row.altDeg), dir: compassShort(row.azDeg) });
    const side = t(B.mag, { mag: magText(row.mag) });
    return { title, line, side, aria: `${title}: ${line}, ${side}` };
  }
  if (row.kind === 'moon') {
    const title = t(B.moonTitle, { phase: B.phases[row.phase] || '', pct: fmt.int(row.percent) });
    const line = row.setMs && row.upAtStart ? t(B.moonSets, { time: timeText.hhmm(row.setMs) })
      : row.riseMs ? t(B.moonRises, { time: timeText.hhmm(row.riseMs) })
        : B.moonAllNight;
    return { title, line, aria: `${title}: ${line}` };
  }
  if (row.kind === 'shower') {
    const title = row.shower.display;
    const line = t(B.showerLine, { zhr: fmt.int(row.shower.zhr), time: timeText.hhmm(row.bestMs), dir: compassShort(row.azDeg) });
    return { title, line, aria: `${title}: ${line}` };
  }
  return null;
}

/** "How dark tonight": the hours of darkness and what the Moon does to them, one line. */
export function darkWords(best) {
  const B = COPY.tonight.best;
  if (!best || !best.window) return B.neverDark;
  const hours = t(B.darkHours, { from: timeText.hhmm(best.window.startMs), to: timeText.hhmm(best.window.endMs) });
  const m = best.moon;
  const moon = !m ? '' : !m.upTonight || m.percent < 2 ? B.moonless : best.moonLight ? t(B.moonBright, { pct: fmt.int(m.percent) }) : t(B.moonFaint, { pct: fmt.int(m.percent) });
  return moon ? hours + COPY.punctuation.separator + moon : hours;
}
