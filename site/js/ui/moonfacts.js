// ui/moonfacts.js -- the rows under a moon's first sentence, and the sentence's own clauses.
// Release 1.5.0, internal spec 0079 stage A3 (internal i#1061). Reads the record data/moons.js builds; nothing else.
//
// Not in the boot graph: ui/cardfacts.js (the card's facts) imports it, and that arrives with the card.
import { COPY, t, fmt, timeText } from '../copy/en.js';

const meta = (r) => (r && r.meta && typeof r.meta === 'object' ? r.meta : {});
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** "3.6 days", "7 hours", "2.1 years": a lap, in the unit a person counts it in. */
export function lapWords(days) {
  const V = COPY.moonCard.values;
  if (!(days > 0)) return null;
  if (days < 2) return t(V.hours, { n: fmt.smart(days * 24) });
  if (days > 700) return t(V.years, { n: fmt.smart(days / 365.25) });
  return t(V.days, { n: fmt.smart(days) });
}

/** The size, written the way the source gave it: a number, a range, an upper limit, or "not measured". */
export function acrossWords(md) {
  const V = COPY.moonCard.values;
  const d = num(md.diameterKm);
  const lo = num(md.diameterLowKm);
  const hi = num(md.diameterHighKm);
  const atMost = num(md.diameterAtMostKm);
  if (d !== null && lo !== null && hi !== null) return t(V.acrossRange, { lo: fmt.int(lo), hi: fmt.int(hi) });
  if (d !== null) return t(V.acrossMeasured, { n: fmt.int(d) });
  if (atMost !== null) return t(V.acrossAtMost, { n: fmt.int(atMost) });
  return null;
}

/** The first sentence's size clause, or null when nothing is measured. */
export function sizeClause(md) {
  const C = COPY.moonCard;
  const d = num(md.diameterKm);
  if (d !== null) return t(C.across, { n: fmt.int(d) });
  const atMost = num(md.diameterAtMostKm);
  return atMost !== null ? t(C.acrossAtMost, { n: fmt.int(atMost) }) : null;
}

/** The first sentence's lap clause, or null. */
export function lapClause(md) {
  const days = num(md.periodDays) ?? num(md.lapDays);
  const words = days !== null ? lapWords(days) : null;
  return words ? t(COPY.moonCard.lap, { n: words }) : null;
}

/**
 * The rows a moon's card prints after the generic ones, in order. Pure; `record` is a record of the moons or companions layer.
 * @param {Object} record
 * @returns {Array<[string, string]>}
 */
export function moonRows(record) {
  const C = COPY.moonCard;
  const V = C.values;
  const md = meta(record);
  const rows = [];
  const planet = md.planetName ? String(md.planetName) : null;
  const parent = md.parentLabel ? String(md.parentLabel) : null;

  if (!planet && parent) rows.push([C.rows.moonOf, parent]);
  const days = num(md.periodDays) ?? num(md.lapDays);
  const lap = days !== null ? lapWords(days) : null;
  if (lap) rows.push([(planet || num(md.periodDays) !== null) ? C.rows.lap : C.rows.lapKnown, lap]);
  const a = num(md.meanAKm);
  if (a !== null) rows.push([planet ? t(C.rows.mean, { planet }) : C.rows.separation, t(V.km, { n: fmt.int(a) })]);
  const e = num(md.eccentricity);
  if (e !== null) rows.push([C.rows.shape, t(e < 0.05 ? V.shapeNear : e < 0.3 ? V.shape : V.shapeLong, { e: fmt.num(e, e < 0.01 ? 4 : 3) })]);
  const across = acrossWords(md);
  rows.push([C.rows.across, across || V.acrossNone]);
  if (md.designation && String(md.designation) !== String(record.name)) rows.push([C.rows.designation, String(md.designation)]);
  const year = num(md.discYear);
  if (year !== null) rows.push([C.rows.found, md.discoverer ? t(V.foundBy, { year: String(Math.round(year)), by: String(md.discoverer) }) : t(V.foundYear, { year: String(Math.round(year)) })]);
  // Where it is on its orbit: the one row that says how far to trust the dot (the planets' moons carry the check against JPL).
  const state = md.placeState;
  if (state) {
    const epoch = timeText.longDate(num(md.elementsEpochMs) + 12 * 3600e3);
    const deg = fmt.int(num(md.checkedDeg) ?? 0);
    rows.push([C.rows.place, state === 'good' ? t(V.placeGood, { deg, n: fmt.int(num(md.checkedN) ?? 0), epoch }) : state === 'lost' ? t(V.placeLost, { deg, epoch }) : V.placeUnchecked]);
  }
  return rows;
}
