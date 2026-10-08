// ui/story.js -- this week's story out of the catalogue (public #450). Pure: no DOM, no fetch.
//
// Contract:
//   RULES                              the four rules, in the order the weeks take them
//   FRESH_MS, BAND_KM
//   isoWeek(nowMs) -> { year, week }   ISO 8601 week of a UTC moment
//   freshSets(records, nowMs) -> [record]   catalogued element sets no older than FRESH_MS
//   storyFor(ruleId, records, nowMs) -> story | null
//   weeklyStory(records, nowMs) -> story | null   this week's rule, or the next one that has an answer
//     story = { id, week, kicker, title, line, rule, record, numbers }
//
// WHY. The catalogue is 10 000 rows of numbers, and nobody reads rows. KeepTrack writes stories
// from it by hand. This writes one a week by RULE: a question asked of the element sets the map
// has already loaded, answered by arithmetic, printed with its numbers and with the rule itself, so
// a reader can check it and nobody typed a claim. The ISO week picks the rule; the data picks the
// subject. With no element sets loaded there is no story, and the card is absent.
//
// WHAT AN ELEMENT SET CAN SAY. Its mean motion and eccentricity give the orbit's size and shape
// (data/parsers.js orbitShape: heights above the 6 378 km equatorial radius), its international
// designator gives the launch year, and its epoch says how old it is. That is all that is used.
// A height is printed to the kilometre and no finer. Sets older than FRESH_MS are left out: an
// object that has not been tracked for a week may no longer be where its last set says, or up at
// all. Provisional sets (not yet numbered by the public catalogue) are left out too.
//
// NOT USED: the rate of change of the mean motion. It would give "falling N km a week", but the
// field's meaning in the JSON we read (the whole derivative, or the half the old two-line format
// carried) could not be read from CelesTrak's documentation on 2026-10-08, and a factor of two is
// not a rounding error. Internal issue: the weekly altitude change from two dated snapshots.

import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.later.js';

export const FRESH_MS = 7 * 86400e3;
/** The height of one shell in the "busiest" rule. */
export const BAND_KM = 10;
export const RULES = ['lowest', 'farthest', 'busiest', 'oldest'];

/** ISO 8601: weeks start on Monday, and week 1 holds the year's first Thursday. Pure. */
export function isoWeek(nowMs) {
  const d = new Date(nowMs);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  const thursday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day + 3);
  const year = new Date(thursday).getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week1 = Date.UTC(year, 0, 4 - ((jan4.getUTCDay() + 6) % 7) + 3);
  return { year, week: 1 + Math.round((thursday - week1) / (7 * 86400e3)) };
}

/** The element sets a story may be about. Pure. */
export function freshSets(records, nowMs) {
  const out = [];
  const seen = new Set();
  for (const r of Array.isArray(records) ? records : []) {
    const m = r && r.meta;
    if (!m || r.propagator !== 'sgp4' || m.provisional || seen.has(r.id)) continue;
    if (!Number.isFinite(r.epoch) || nowMs - r.epoch > FRESH_MS || r.epoch - nowMs > 86400e3) continue;
    if (!Number.isFinite(m.apogeeKm) || !Number.isFinite(m.perigeeKm) || !Number.isFinite(m.periodMin)) continue;
    if (m.perigeeKm < 0) continue; // an orbit that crosses the ground is a bad set, not a story
    seen.add(r.id);
    out.push(r);
  }
  return out;
}

const km = (v) => fmt.int(Math.round(v));
const nameOf = (r) => r.name || (r.meta && r.meta.objectName) || r.id;

const BUILD = {
  /** The whole of its orbit is lower than anything else's: the lowest apogee. */
  lowest(sets) {
    let best = null;
    for (const r of sets) if (!best || r.meta.apogeeKm < best.meta.apogeeKm) best = r;
    if (!best) return null;
    const S = COPY.story.lowest;
    return {
      record: best,
      title: t(S.title, { name: nameOf(best) }),
      line: t(S.line, { apogee: km(best.meta.apogeeKm), perigee: km(best.meta.perigeeKm), min: fmt.int(Math.round(best.meta.periodMin)) }),
      rule: t(S.rule, { n: fmt.int(sets.length) }),
      numbers: { apogeeKm: best.meta.apogeeKm, perigeeKm: best.meta.perigeeKm, periodMin: best.meta.periodMin, sets: sets.length },
    };
  },
  /** The one that swings farthest from the Earth: the highest apogee. */
  farthest(sets) {
    let best = null;
    for (const r of sets) if (!best || r.meta.apogeeKm > best.meta.apogeeKm) best = r;
    if (!best) return null;
    const S = COPY.story.farthest;
    const hours = best.meta.periodMin / 60;
    return {
      record: best,
      title: t(S.title, { name: nameOf(best) }),
      line: t(S.line, { apogee: km(best.meta.apogeeKm), perigee: km(best.meta.perigeeKm), lap: hours >= 48 ? t(S.days, { n: fmt.int(Math.round(hours / 24)) }) : t(S.hours, { n: fmt.int(Math.round(hours)) }) }),
      rule: t(S.rule, { n: fmt.int(sets.length) }),
      numbers: { apogeeKm: best.meta.apogeeKm, perigeeKm: best.meta.perigeeKm, periodMin: best.meta.periodMin, sets: sets.length },
    };
  },
  /** The fullest BAND_KM of height, by the middle of each orbit. */
  busiest(sets) {
    const bands = new Map();
    for (const r of sets) {
      const mid = (r.meta.apogeeKm + r.meta.perigeeKm) / 2;
      const b = Math.floor(mid / BAND_KM);
      const row = bands.get(b) || { n: 0, first: r };
      row.n += 1;
      bands.set(b, row);
    }
    let top = null;
    for (const [b, row] of bands) if (!top || row.n > top.n || (row.n === top.n && b < top.b)) top = { b, ...row };
    if (!top || top.n < 2) return null;
    const S = COPY.story.busiest;
    const lo = top.b * BAND_KM;
    return {
      record: top.first,
      title: t(S.title, { lo: km(lo), hi: km(lo + BAND_KM) }),
      line: t(S.line, { n: fmt.int(top.n), total: fmt.int(sets.length), pct: fmt.int(Math.round((100 * top.n) / sets.length)) }),
      rule: t(S.rule, { band: fmt.int(BAND_KM), n: fmt.int(sets.length) }),
      numbers: { loKm: lo, hiKm: lo + BAND_KM, inBand: top.n, sets: sets.length },
    };
  },
  /** The earliest launch still tracked: the lowest launch year, then the lowest catalogue number. */
  oldest(sets, nowMs) {
    let best = null;
    const key = (r) => [r.meta.launchYear, r.meta.catalogueNumber];
    for (const r of sets) {
      if (!Number.isFinite(r.meta.launchYear) || !Number.isFinite(r.meta.catalogueNumber)) continue;
      const [y, c] = key(r);
      if (!best || y < best.meta.launchYear || (y === best.meta.launchYear && c < best.meta.catalogueNumber)) best = r;
    }
    if (!best) return null;
    const S = COPY.story.oldest;
    const years = new Date(nowMs).getUTCFullYear() - best.meta.launchYear;
    return {
      record: best,
      title: t(S.title, { name: nameOf(best) }),
      line: t(S.line, { year: String(best.meta.launchYear), years: fmt.int(years), min: fmt.int(Math.round(best.meta.periodMin)) }),
      rule: t(S.rule, { n: fmt.int(sets.length) }),
      numbers: { launchYear: best.meta.launchYear, years, periodMin: best.meta.periodMin, sets: sets.length },
    };
  },
};

/** One rule's story from the loaded records, or null when it has no answer. Pure. */
export function storyFor(ruleId, records, nowMs) {
  const build = BUILD[ruleId];
  if (!build || !Number.isFinite(nowMs)) return null;
  const sets = freshSets(records, nowMs);
  if (!sets.length) return null;
  const made = build(sets, nowMs);
  if (!made) return null;
  const w = isoWeek(nowMs);
  return { id: `story-${ruleId}`, ruleId, week: w, kicker: t(COPY.story.kicker, { week: String(w.week) }), ...made };
}

/** This week's story: the week's own rule, or the next rule that has an answer. Pure. */
export function weeklyStory(records, nowMs) {
  if (!Number.isFinite(nowMs)) return null;
  const { week } = isoWeek(nowMs);
  for (let i = 0; i < RULES.length; i++) {
    const s = storyFor(RULES[(week + i) % RULES.length], records, nowMs);
    if (s) return s;
  }
  return null;
}
