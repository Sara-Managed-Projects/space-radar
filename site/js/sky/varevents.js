// sky/varevents.js -- the variable stars worth going out for, from where the visitor stands: an eclipsing star at the
// bottom of its eclipse ("Algol at minimum tonight") and a Mira near its brightest (forge #142).
//
// Contract (pure but for the vendored Astronomy Engine; tests/test_varevents.mjs runs it in Node):
//   VAR_EVENT_RULES                     what is worth a row, in numbers
//   worthSeeing(row) -> 'min' | 'max' | null
//   variableEvents(rows, { fromMs, toMs, observer: { latDeg, lonDeg, altKm } })
//     -> [{ kind: 'variable', record: null, id, name, what, tMs, mag, altDeg, azDeg, raDeg, decDeg, cls, cite }]  by time
// The rows are data/variables.json's (scripts/build-variables.py). Used by sky/findworker.js for Coming up (a worker,
// so the month's search is off the page's thread) and by ui/tonight.js for the night's list.
//
// WHAT IS WORTH A ROW. A star the eye can follow, changing by enough to see:
//   an eclipsing star (the GCVS's EA, EB or EW) with current elements (row.linear: Kreiner 2004, fitted to its minima
//     of the last decades), brighter than magnitude 5 at its brightest and at least 0.4 magnitudes deeper at minimum:
//     Algol, lambda Tauri, delta Librae, V Puppis. The row is the primary minimum itself, when the Sun is 12 degrees
//     down and the star 15 degrees up there. The instant is the elements' (MEASURED minima, the timing carried forward
//     by the period: Algol's to within about a quarter of an hour, which is why the row says "about");
//   a Mira brighter than magnitude 5 at its brightest: the night nearest its maximum, at the hour it stands highest in
//     the dark. Its maxima come weeks early or late and vary in brightness from cycle to cycle, so the row is MODELLED
//     and says so. A Mira's minimum is not a row: at magnitude 9 to 14 there is nothing to see without a telescope.
// One row a star (the first that can be seen): a month of Algol is ten minima, three of them in the dark.

import * as Astronomy from '../../vendor/astronomy.js';
import { magAt, nextMinimum, phaseAt } from './variables.js';

export const VAR_EVENT_RULES = { brightest: 5.0, depth: 0.4, sunBelowDeg: -12, starAboveDeg: 15, miraStepMin: 30 };
const DEG = 180 / Math.PI;
const DAY_MS = 86400e3;

/** 'min' for an eclipsing star worth watching fade, 'max' for a Mira worth catching bright, else null. Pure. */
export function worthSeeing(row) {
  if (!row || !Number.isFinite(row.max) || !Number.isFinite(row.ra) || !Number.isFinite(row.dec)) return null;
  if (row.max > VAR_EVENT_RULES.brightest) return null;
  if ((row.shape === 'eclipse' || row.shape === 'binary') && row.linear && Number.isFinite(row.min)
    && row.min - row.max >= VAR_EVENT_RULES.depth) return 'min';
  if (row.shape === 'pulse' && /^M\b/.test(String(row.type || '')) && row.periodD > 0 && Number.isFinite(row.epochJd)) return 'max';
  return null;
}

function altAz(obs, ms, raDeg, decDeg) {
  const date = new Date(ms);
  const time = Astronomy.MakeTime(date);
  const c = Math.cos(decDeg / DEG);
  const j2000 = new Astronomy.Vector(c * Math.cos(raDeg / DEG), c * Math.sin(raDeg / DEG), Math.sin(decDeg / DEG), time);
  const eq = Astronomy.EquatorFromVector(Astronomy.RotateVector(Astronomy.Rotation_EQJ_EQD(time), j2000));
  const hor = Astronomy.Horizon(time, obs, eq.ra, eq.dec, 'normal');
  return { alt: hor.altitude, az: hor.azimuth };
}

function sunAlt(obs, ms) {
  const date = new Date(ms);
  const sun = Astronomy.Equator('Sun', date, obs, true, true);
  return Astronomy.Horizon(date, obs, sun.ra, sun.dec, 'normal').altitude;
}

function seen(obs, ms, row) {
  if (sunAlt(obs, ms) > VAR_EVENT_RULES.sunBelowDeg) return null;
  const h = altAz(obs, ms, row.ra, row.dec);
  return h.alt >= VAR_EVENT_RULES.starAboveDeg ? h : null;
}

/** The next maximum of a Mira at or after `fromMs` (phase 0 of sky/variables.js is a maximum). */
function nextMaximum(row, fromMs) {
  const ph = phaseAt(row, fromMs);
  if (ph === null) return null;
  return fromMs + (ph === 0 ? 0 : (1 - ph) * row.periodD * DAY_MS);
}

function eventOf(row, what, tMs, h) {
  const mag = magAt(row, tMs);
  return {
    kind: 'variable', record: null, id: row.id, name: row.name, what, tMs,
    mag: mag === null ? (what === 'min' ? row.min : row.max) : Math.round(mag * 10) / 10,
    altDeg: Math.round(h.alt), azDeg: Math.round(h.az), raDeg: row.ra, decDeg: row.dec,
    cls: what === 'min' ? 'measured' : 'modelled',
    cite: what === 'min' ? row.linear.cite : 'GCVS 5.1 (Samus et al. 2017)',
  };
}

/** Every row worth going out for between `fromMs` and `toMs`, seen from `observer`, one a star, by time. */
export function variableEvents(rows, { fromMs, toMs, observer } = {}) {
  if (!Array.isArray(rows) || !observer || !Number.isFinite(observer.latDeg) || !Number.isFinite(observer.lonDeg)
    || !(toMs > fromMs)) return [];
  const obs = new Astronomy.Observer(observer.latDeg, observer.lonDeg, (Number(observer.altKm) || 0) * 1000);
  const out = [];
  for (const row of rows) {
    const what = worthSeeing(row);
    if (what === 'min') {
      for (let t = nextMinimum(row, fromMs); t !== null && t < toMs; t = nextMinimum(row, t + 3600e3)) {
        const h = seen(obs, t, row);
        if (h) { out.push(eventOf(row, 'min', t, h)); break; }
      }
    } else if (what === 'max') {
      // A maximum a few days before `fromMs` is still "near its brightest": the search starts a week back.
      const peak = nextMaximum(row, fromMs - 7 * DAY_MS);
      if (peak === null || peak > toMs + 7 * DAY_MS) continue;
      // The night nearest the maximum that is still ahead: its darkest hour with the star highest.
      const start = Math.max(fromMs, peak - 12 * 3600e3);
      let best = null;
      for (let t = start; t < start + DAY_MS && t < toMs; t += VAR_EVENT_RULES.miraStepMin * 60e3) {
        const h = seen(obs, t, row);
        if (h && (!best || h.alt > best.h.alt)) best = { t, h };
      }
      if (best) out.push(eventOf(row, 'max', best.t, best.h));
    }
  }
  return out.sort((a, b) => a.tMs - b.tMs);
}
