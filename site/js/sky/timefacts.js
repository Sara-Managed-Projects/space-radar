// sky/timefacts.js -- the next ninety minutes of an Earth orbiter, in time: when it goes into the
// Earth's shadow and comes out, when it finishes this lap, and which lap it is on (spec 0048).
//
// Contract: lightWindows(record, t0, minutes, stepS) -> [{from, to, sunlit}]
//           nextAscendingNode(record, t0) -> ms | null
//           orbitNumber(record, tMs) -> {n, cls: 'inferred', revAtEpoch, laps} | null
//           launchYear(record) -> number | null
//           timeFacts(record, t0, opts) -> everything the card says, as numbers
// Pure: no DOM, no clock of its own. The card (ui/cards.js) and, later, the follow strip read the
// same answers, so the two can never disagree (spec 0048 req 9).
//
// WHY. orbitalradar.com's card says "enters sunlight in ~22 min" and "Orbit completion in 0:27:34".
// We computed every part already -- scene/shadow.js knows sunlit or not for one instant, the
// propagator knows where the station will be -- and said none of it forward. The review ranked
// these third of twelve gaps: high value, small effort.
//
// HOW, AND HOW WELL.
//   * Light: scene/shadow.js sunlitState() sampled every 30 s, each change refined by bisection to
//     1 s. The shortest shadow a low orbit has is minutes long, so a 30 s step cannot step over one.
//     The shadow is the card's own cylinder (no penumbra): the edge here is the edge the dot dims at,
//     which is the point, and it can be a few seconds from the true umbra crossing.
//   * The lap: from ascending node to ascending node, where the sub-satellite point crosses the
//     equator going north. Found by sampling the inertial z (whose sign is the latitude's) every
//     60 s and bisecting to 1 s -- not `period - elapsed`, which is off by the whole drift of the
//     node between element sets.
//   * The orbit number: CelesTrak's REV_AT_EPOCH (data/parsers.js keeps it as meta.revAtEpoch) plus
//     the ascending nodes between the epoch and now. It extrapolates a catalogue count, so it is
//     `inferred` in the class vocabulary, and past 14 days from the epoch it is not counted at all:
//     two hundred laps of drag drift would make the last digits a guess wearing a fact's clothes.

import { propagate } from '../propagate/index.js';
import { sunlitState } from '../scene/shadow.js';
import { periodMsOfSgp4 } from '../ui/trajectory.js';

export const LIGHT_MINUTES = 90;
export const LIGHT_STEP_S = 30;
export const NODE_STEP_S = 60;
export const REFINE_MS = 1000;
/** Past this far from the element epoch the orbit number is not counted (see the header). */
export const ORBIT_COUNT_MAX_DAYS = 14;

/** Is this a record the time facts are about: something the propagator flies round the Earth? */
export function hasTimeFacts(record) {
  if (!record || record.propagator !== 'sgp4') return false;
  if (record.frame !== 'earth-inertial' && record.frame !== 'earth-fixed') return false;
  return !!periodMsOfSgp4(record);
}

/** The boundary between a and b (pred(a) !== pred(b)) to within `tol` ms, by bisection. */
export function bisect(pred, a, b, tol = REFINE_MS) {
  const va = pred(a);
  let lo = a;
  let hi = b;
  while (hi - lo > tol) {
    const mid = (lo + hi) / 2;
    if (pred(mid) === va) lo = mid;
    else hi = mid;
  }
  return hi;
}

const lit = (record, t) => sunlitState(record, t) === 'sunlit';

/**
 * The next `minutes` split into sunlit and shadowed runs, each edge to 1 s.
 * @returns {{from: number, to: number, sunlit: boolean}[]} contiguous, from t0 to t0 + minutes
 */
export function lightWindows(record, t0, minutes = LIGHT_MINUTES, stepS = LIGHT_STEP_S) {
  if (!hasTimeFacts(record) || !Number.isFinite(t0)) return [];
  if (sunlitState(record, t0) === null) return [];
  const end = t0 + minutes * 60e3;
  const step = stepS * 1e3;
  const out = [];
  let prev = lit(record, t0);
  let start = t0;
  let before = t0;
  for (let t = t0 + step; before < end; t += step) {
    const at = Math.min(t, end);
    const now = lit(record, at);
    if (now !== prev) {
      const edge = bisect((x) => lit(record, x), before, at);
      out.push({ from: start, to: edge, sunlit: prev });
      start = edge;
      prev = now;
    }
    before = at;
  }
  out.push({ from: start, to: end, sunlit: prev });
  return out;
}

/** The next change of light after t0 within the windows, or null: {tMs, toSunlit}. */
export function nextLightChange(windows) {
  if (!Array.isArray(windows) || windows.length < 2) return null;
  return { tMs: windows[1].from, toSunlit: windows[1].sunlit };
}

/** The sign of the latitude: the inertial z, which has it (geodetic and geocentric agree on it). */
function northOf(record, t) {
  let p = null;
  try { p = propagate(record, t); } catch { p = null; }
  if (!p || !Number.isFinite(p.z)) return null;
  return p.z >= 0;
}

/**
 * The next time after t0 the sub-satellite point crosses the equator going north, to 1 s, or null.
 * Searched over 1.1 periods, which always holds one.
 */
export function nextAscendingNode(record, t0) {
  if (!hasTimeFacts(record) || !Number.isFinite(t0)) return null;
  const P = periodMsOfSgp4(record);
  const step = NODE_STEP_S * 1e3;
  let a = t0;
  let na = northOf(record, a);
  if (na === null) return null;
  for (let t = t0 + step; t <= t0 + P * 1.1 + step; t += step) {
    const nb = northOf(record, t);
    if (nb === null) return null;
    if (!na && nb) return bisect((x) => northOf(record, x) === true, a, t);
    a = t;
    na = nb;
  }
  return null;
}

/**
 * The previous ascending node before t0 (the start of this lap), to 1 s, or null.
 */
export function prevAscendingNode(record, t0) {
  if (!hasTimeFacts(record) || !Number.isFinite(t0)) return null;
  const P = periodMsOfSgp4(record);
  const step = NODE_STEP_S * 1e3;
  let b = t0;
  let nb = northOf(record, b);
  if (nb === null) return null;
  for (let t = t0 - step; t >= t0 - P * 1.1 - step; t -= step) {
    const na = northOf(record, t);
    if (na === null) return null;
    if (!na && nb) return bisect((x) => northOf(record, x) === true, t, b);
    b = t;
    nb = na;
  }
  return null;
}

// Counting nodes over days is the one expensive thing here, and a card repaints on every scrub, so
// each record keeps the nodes it has already found: {id, epoch, nodes: [ms...]} from the epoch on.
const nodeCache = new Map();

/** Ascending nodes in (from, to], found node to node: ~8 propagations a lap rather than ~95. */
function nodesBetween(record, from, to) {
  const key = record.id || record.name;
  let c = nodeCache.get(key);
  if (!c || c.epoch !== record.epoch || c.from !== from) {
    c = { epoch: record.epoch, from, nodes: [], done: from };
    nodeCache.set(key, c);
  }
  const P = periodMsOfSgp4(record);
  while (c.done < to) {
    const last = c.nodes.length ? c.nodes[c.nodes.length - 1] : null;
    // From just past the last node, jump most of a lap and search from there.
    const searchFrom = last === null ? c.done : last + P * 0.9;
    const n = nextAscendingNode(record, searchFrom);
    if (n === null) break;
    if (n > to) { c.done = to; break; }
    c.nodes.push(n);
    c.done = n;
  }
  let count = 0;
  for (const n of c.nodes) if (n > from && n <= to) count += 1;
  return count;
}

/**
 * Which lap it is on: the catalogue's revolution number at the element epoch plus the ascending
 * nodes since. Null without REV_AT_EPOCH, and more than ORBIT_COUNT_MAX_DAYS from the epoch.
 */
export function orbitNumber(record, tMs) {
  const rev = record && record.meta ? record.meta.revAtEpoch : null;
  if (!Number.isFinite(rev) || !hasTimeFacts(record) || !Number.isFinite(record.epoch) || !Number.isFinite(tMs)) return null;
  if (Math.abs(tMs - record.epoch) > ORBIT_COUNT_MAX_DAYS * 86400e3) return null;
  const laps = tMs >= record.epoch ? nodesBetween(record, record.epoch, tMs) : -nodesBetweenBack(record, tMs, record.epoch);
  return { n: rev + laps, cls: 'inferred', revAtEpoch: rev, laps };
}

/** Before the epoch (a scrub back): nodes in (from, to], found forward from `from`, not cached. */
function nodesBetweenBack(record, from, to) {
  const P = periodMsOfSgp4(record);
  let count = 0;
  let t = from;
  for (let guard = 0; guard < 2000; guard++) {
    const n = nextAscendingNode(record, t);
    if (n === null || n > to) break;
    count += 1;
    t = n + P * 0.9;
  }
  return count;
}

/** The launch year from the international designator ("1998-067A" -> 1998), or null. */
export function launchYear(record) {
  const m = record && record.meta ? record.meta : {};
  if (Number.isFinite(m.launchYear)) return m.launchYear;
  const d = typeof m.intlDesignator === 'string' ? /^(\d{4})-/.exec(m.intlDesignator) : null;
  return d ? Number(d[1]) : null;
}

/**
 * Everything the card says in time, as numbers, for one instant:
 *   windows       the next 90 minutes of light and shadow
 *   change        the next change of light, or null (sunlit or shadowed throughout)
 *   lapEndMs      when this lap ends (the next ascending node), or null
 *   lapStartMs    when it began, or null
 *   orbit         orbitNumber(), or null
 *   launchYear    from the designator, or null
 */
export function timeFacts(record, t0, opts = {}) {
  if (!hasTimeFacts(record) || !Number.isFinite(t0)) return null;
  const windows = lightWindows(record, t0, opts.minutes || LIGHT_MINUTES);
  return {
    t0,
    windows,
    change: nextLightChange(windows),
    lapEndMs: nextAscendingNode(record, t0),
    lapStartMs: prevAscendingNode(record, t0),
    orbit: orbitNumber(record, t0),
    launchYear: launchYear(record),
  };
}

/** "27:34" from ms, never negative; hours only when there are any ("1:02:05"). */
export function mmss(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const two = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(r)}` : `${m}:${two(r)}`;
}
