// moments/telemetry.js -- a launch's published heights and speeds, read and checked (forge #571). Pure: node holds all of it.
//
// A telemetry file is site/data/moments/telemetry/<id>.json (docs/MOMENTS.md, "Flight data"): the published table of one
// ascent, copied as it is printed, in the table's own units (nautical miles, feet a second, pounds a square foot), each row
// naming its source. Nothing here makes a number the source does not have: the player draws the rows as dots and the
// straight lines between them, says that the lines are not measurements, and reads out the last row the clock has passed,
// never a value between two rows (docs/DESIGN_PRINCIPLES.md, "missing is shown as missing").
//
// A moment names its file with `telemetry: {flight: "<id>", compare: ["<id>", ...]}`; `compare` is another flight of the
// same rocket, drawn faintly.

export const TELEMETRY_FORMAT = 1;
/** Exact conversions: the international nautical mile and foot, and a pound-force per square foot in pascals. */
export const NMI_KM = 1.852;
export const FT_M = 0.3048;
export const PSF_PA = 47.880259;
/** The events a row may name; the words are COPY.momentTelemetry.events. */
export const EVENTS = ['liftoff', 'mach1', 'maxQ', 'sicCeco', 'sicOeco', 'sicSep', 'siiCeco', 'siiPlannedCeco', 'siiOeco', 'siiSep', 'sivbCutoff', 'orbit'];
/** The rows the chart marks: the highest dynamic pressure and the two stagings. */
export const MARKED = { maxQ: 'maxQ', sicSep: 'staging', siiSep: 'staging' };
const ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const TRUTH = ['measured', 'reconstructed'];
const UNITS = { t: 's', alt: 'nmi', range: 'nmi', vEarth: 'ft/s', vSpace: 'ft/s', q: 'lb/ft2', altFt: 'ft' };
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export function isTelemetryId(id) {
  return typeof id === 'string' && ID.test(id);
}

/** What is wrong with a telemetry file, in words (empty when nothing is). */
export function validateTelemetry(d) {
  const out = [];
  const say = (s) => out.push(s);
  if (!d || typeof d !== 'object') return ['not an object'];
  if (d.format !== TELEMETRY_FORMAT) say(`format is ${d.format}, this reader knows ${TELEMETRY_FORMAT}`);
  if (!isTelemetryId(d.id)) say(`id ${JSON.stringify(d.id)} is not lower-case words with dashes`);
  if (!TRUTH.includes(d.truth)) say(`truth must be ${TRUTH.join(' or ')}: a flight's data are never illustrative`);
  if (typeof d.truthNote !== 'string' || d.truthNote.length < 20) say('truthNote: say in a sentence how the source got its numbers');
  if (!isNum(Date.parse(d.epoch)) || !/Z$/.test(String(d.epoch))) say('epoch is not an ISO time in UTC (ending in Z)');
  for (const [k, u] of Object.entries(UNITS)) if (!d.units || d.units[k] !== u) say(`units.${k} must be ${u} (the table's own units; the reader converts)`);
  const sources = d.sources || {};
  for (const [k, s] of Object.entries(sources)) {
    if (!s || !/^https:\/\//.test(String(s.url))) say(`sources.${k}: needs an https url`);
    for (const f of ['title', 'table', 'licence', 'read']) if (!s || typeof s[f] !== 'string' || !s[f]) say(`sources.${k}: needs ${f}`);
    if (!s || !Number.isInteger(s.page) || s.page < 1) say(`sources.${k}: needs the page the table is on`);
  }
  const pts = Array.isArray(d.points) ? d.points : [];
  if (pts.length < 3) say('points: at least three published rows');
  let last = -Infinity;
  const seen = new Set();
  pts.forEach((p, i) => {
    const where = `points[${i}]`;
    if (!p || !isNum(p.t)) { say(`${where}: needs t`); return; }
    if (!(p.t > last)) say(`${where}: t ${p.t} is not after ${last}`);
    last = p.t;
    if (!EVENTS.includes(p.event)) say(`${where}: event ${JSON.stringify(p.event)} is not one of ${EVENTS.join(', ')}`);
    if (seen.has(p.event)) say(`${where}: event ${p.event} twice`);
    seen.add(p.event);
    for (const f of ['alt', 'range', 'vEarth', 'vSpace']) if (!isNum(p[f]) || p[f] < 0) say(`${where}: ${f} must be a number, not below 0`);
    if (isNum(p.alt) && p.alt > 1000) say(`${where}: alt ${p.alt} nmi is not an ascent`);
    if (isNum(p.vSpace) && p.vSpace > 40000) say(`${where}: vSpace ${p.vSpace} ft/s is faster than escape`);
    if (!sources[p.src]) say(`${where}: src ${JSON.stringify(p.src)} is not in sources`);
    if (p.note !== undefined && p.note !== 'commanded') say(`${where}: note may only be "commanded" (the table gives only the commanded time)`);
  });
  if (pts.length && pts[0].event !== 'liftoff') say('points: the first row is the lift-off');
  const q = d.maxQ;
  if (!q || !isNum(q.t) || !isNum(q.q) || !isNum(q.altFt) || q.q <= 0) say('maxQ needs t, q and altFt');
  else {
    if (!sources[q.src]) say(`maxQ: src ${JSON.stringify(q.src)} is not in sources`);
    if (pts.length && (q.t < pts[0].t || q.t > pts[pts.length - 1].t)) say('maxQ: its second is outside the rows');
    const row = pts.find((p) => p.event === 'maxQ');
    if (row && Math.abs(row.t - q.t) > 0.5) say(`maxQ: ${q.t} s here, ${row.t} s in the rows: the two tables disagree`);
  }
  return out;
}

/** The file in the units the chart draws: seconds, kilometres, kilometres a second, kilopascals. */
export function toSeries(d) {
  const points = (d.points || []).map((p) => ({
    t: p.t,
    event: p.event,
    altKm: p.alt * NMI_KM,
    rangeKm: p.range * NMI_KM,
    speedKms: (p.vEarth * FT_M) / 1000,
    inertialKms: (p.vSpace * FT_M) / 1000,
    commanded: p.note === 'commanded',
    src: p.src,
  }));
  const q = d.maxQ ? { t: d.maxQ.t, kPa: (d.maxQ.q * PSF_PA) / 1000, psf: d.maxQ.q, altKm: (d.maxQ.altFt * FT_M) / 1000 } : null;
  return { id: d.id, flight: d.flight, rocket: d.rocket, serial: d.serial, moment: d.moment, truth: d.truth, points, maxQ: q, sources: d.sources || {} };
}

/** The index of the last row at or before mission second t; -1 before the first. */
export function rowAt(points, t) {
  let lo = 0, hi = points.length - 1, at = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].t <= t) { at = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return at;
}

/** The row nearest to mission second t (for a pointer over the chart). */
export function nearestRow(points, t) {
  let best = -1, gap = Infinity;
  points.forEach((p, i) => { const g = Math.abs(p.t - t); if (g < gap) { gap = g; best = i; } });
  return best;
}

/** A round top for an axis: the first of 1, 2, 2.5, 4, 5 or 10 times a power of ten at or above v. */
export function niceTop(v) {
  if (!(v > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const k of [1, 2, 2.5, 4, 5, 10]) if (k * p >= v - 1e-9) return k * p;
  return 10 * p;
}

/** The axes the flights share: the last second (a whole minute), the highest height and the fastest speed, rounded up. */
export function axesOf(series) {
  let t = 60, alt = 1, v = 0.1;
  for (const s of series) for (const p of s.points) { t = Math.max(t, p.t); alt = Math.max(alt, p.altKm); v = Math.max(v, p.speedKms); }
  return { tMax: Math.ceil(t / 120) * 120, altMax: niceTop(alt), speedMax: niceTop(v) };
}

/** An SVG path through the rows: straight lines between published points, nothing past the ends. */
export function linePath(points, x, y, key) {
  return points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p[key]).toFixed(1)}`).join(' ');
}

/** The telemetry a moment names: `{flight, compare}` ids, or null when it has none or names it wrongly. */
export function telemetryOf(m) {
  const tm = m && m.telemetry;
  if (!tm || !isTelemetryId(tm.flight)) return null;
  const compare = Array.isArray(tm.compare) ? tm.compare.filter(isTelemetryId) : [];
  return { flight: tm.flight, compare };
}
