// data/clouds.js -- the named debris clouds and the constellations, one tap each (forge #153).
//
// Contract, all pure:
//   CLOUDS                         the four breakups people name, each with its parent's designator, when and why
//   cloudById(id), constellationById(id)
//   isFragment(row, cloud)         a catalogue row (data/owners.js catalogueRows) that is a piece of that breakup
//   cloudCounts(rows, cloud)       -> {catalogued, up, parent}: pieces ever catalogued, pieces still up, the parent's row
//   recordInCloud(record, cloud)   a drawn record (the debris layer's) that is one of its pieces
//   CONSTELLATIONS                 the fleets a person names, matched by the names their operators give them
//   recordInConstellation(record, c)
//   spreadAt(fragment, cloud, tMs, out) -> {x, y, z} km, earth-inertial, or null before the event
//   J2, R_EARTH_KM
//
// WHERE THE PIECES COME FROM. Every piece of a breakup is catalogued under its parent's international
// designator and named for it: Fengyun-1C was launched as 1999-025A and its fragments are FENGYUN 1C DEB,
// 1999-025-something, 3 531 of them in the catalogue of 2026-11-05, 2 310 still up (Cosmos 1408's 1 806
// are down to 3). The count is the catalogue's (measured, for what radar can track: about 10 cm and up).
// The when and the why are NASA's Orbital
// Debris Quarterly News, one issue for each, linked from each row.
//
// THE SPREAD IS MODELLED, and says so. A cloud is born as one point and becomes a shell: each piece
// leaves with a slightly different speed, so a slightly different orbit; a different height is a
// different lap time, which strings the pieces out along the orbit within days; and the Earth's bulge
// (J2) turns each orbit's plane at a rate that depends on its height and tilt, which fans the planes
// out round the Earth over years. spreadAt() draws exactly that: every piece starts at one point at
// the instant of the event, on the orbit the catalogue gives it TODAY (its height at both ends and its
// tilt), and moves under two-body motion plus J2's secular drift of the node, the perigee and the mean
// anomaly (Vallado, Fundamentals of Astrodynamics and Applications, 4th ed., section 9.6). What it
// leaves out: the orbits of 2007 were not today's (drag has lowered them since), the angle of the
// parent's plane at the event is illustrative (one value for every cloud), and pieces that have come
// down are not drawn at all, so the cloud at the event is today's survivors, not the whole burst.

import { GM_EARTH, solveKeplerElliptic } from '../propagate/kepler.js';

export const R_EARTH_KM = 6378.137;
/** The Earth's second zonal harmonic, WGS-84 / EGM-96 (unnormalised). */
export const J2 = 1.08262668e-3;
const DEG = Math.PI / 180;

/**
 * The breakups. `parent` is the launch designator the pieces share and `parentId` the broken object's own;
 * `pieces` is the name the catalogue gives its fragments, because a launch's designator also covers its
 * rocket's debris (CZ-4B DEB under 1999-025, SL-8 DEB under 1993-036) and, for Iridium 33, six other
 * satellites. `eventMs` is the instant the source gives;
 * `precision: 'minute'` where it gives the minute. `heightKm` is the height of the event as the source states it.
 */
export const CLOUDS = [
  {
    id: 'fy1c', parent: '1999-025', parentId: '1999-025A', pieces: /^FENGYUN 1C DEB\b/, kind: 'asat', eventMs: Date.UTC(2007, 0, 11, 22, 26), precision: 'minute', heightKm: 865,
    source: { name: 'NASA Orbital Debris Quarterly News 11(2), April 2007', url: 'https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/odqnv11i2.pdf' },
  },
  {
    id: 'cosmos1408', parent: '1982-092', parentId: '1982-092A', pieces: /^COSMOS 1408 DEB\b/, kind: 'asat', eventMs: Date.UTC(2021, 10, 15, 2, 47), precision: 'minute', heightKm: 480,
    source: { name: 'NASA Orbital Debris Quarterly News 26(1), March 2022', url: 'https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/odqnv26i1.pdf' },
  },
  {
    id: 'iridium33', parent: '1997-051', parentId: '1997-051C', pieces: /^IRIDIUM 33 DEB\b/, kind: 'collision', eventMs: Date.UTC(2009, 1, 10, 16, 56), precision: 'minute', heightKm: 789,
    source: { name: 'NASA Orbital Debris Quarterly News 13(2), April 2009', url: 'https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/odqnv13i2.pdf' },
  },
  {
    id: 'cosmos2251', parent: '1993-036', parentId: '1993-036A', pieces: /^COSMOS 2251 DEB\b/, kind: 'collision', eventMs: Date.UTC(2009, 1, 10, 16, 56), precision: 'minute', heightKm: 789,
    source: { name: 'NASA Orbital Debris Quarterly News 13(2), April 2009', url: 'https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/odqnv13i2.pdf' },
  },
];

/**
 * The constellations, by the name each operator gives its satellites in the catalogue (2026-11-05:
 * STARLINK-1008, ONEWEB-0012, KUIPER-00008, QIANFAN-1, NAVSTAR 43 (USA 132), COSMOS 2433 [GLONASS-M],
 * GSAT0101 (GALILEO-PFM), BEIDOU-3 M1, IRIDIUM 106). `operator` is data/owners.js OPERATORS' id, where it has one.
 */
export const CONSTELLATIONS = [
  { id: 'starlink', names: /^STARLINK\b/, operator: 'spacex', kind: 'internet' },
  { id: 'oneweb', names: /^ONEWEB\b/, operator: 'oneweb', kind: 'internet' },
  { id: 'kuiper', names: /^KUIPER\b/, operator: 'amazon', kind: 'internet' },
  { id: 'qianfan', names: /^QIANFAN\b/, operator: 'spacesail', kind: 'internet' },
  { id: 'gps', names: /^NAVSTAR\b/, operator: null, kind: 'navigation' },
  { id: 'glonass', names: /\bGLONASS\b/, operator: null, kind: 'navigation' },
  { id: 'galileo', names: /^GSAT0\d{3}\b|\bGALILEO\b/, operator: null, kind: 'navigation' },
  { id: 'beidou', names: /^BEIDOU\b/, operator: null, kind: 'navigation' },
  { id: 'iridium', names: /^IRIDIUM\b(?!.*\bDEB\b)/, operator: 'iridium', kind: 'phone' },
];

export function cloudById(id) {
  const k = String(id || '').toLowerCase();
  return CLOUDS.find((c) => c.id === k) || null;
}

export function constellationById(id) {
  const k = String(id || '').toLowerCase();
  return CONSTELLATIONS.find((c) => c.id === k) || null;
}

const parentOf = (intl) => String(intl || '').slice(0, 8);

/** Is this catalogue row a piece of the breakup? Debris only: the parent and its rocket are not fragments. */
export function isFragment(row, cloud) {
  if (!row || !cloud || row.type !== 'DEB') return false;
  return parentOf(row.intl) === cloud.parent && cloud.pieces.test(String(row.name || '').toUpperCase());
}

/** Pieces ever catalogued, pieces still up, and the parent's own row (null when the catalogue has none). */
export function cloudCounts(rows, cloud) {
  let catalogued = 0;
  let up = 0;
  let parent = null;
  for (const r of rows || []) {
    if (isFragment(r, cloud)) { catalogued += 1; if (r.decayMs === null) up += 1; continue; }
    if (!parent && r.intl === cloud.parentId) parent = r;
  }
  return { catalogued, up, parent };
}

/** A drawn record of the debris layer (data/satcat.js fieldRecords, data/tracked.js) that is one of the pieces. */
export function recordInCloud(record, cloud) {
  if (!record || !cloud) return false;
  const m = record.meta || {};
  if (parentOf(m.intlDesignator) !== cloud.parent) return false;
  return cloud.pieces.test(String(record.name || '').toUpperCase());
}

/** A drawn satellite that belongs to the constellation, by its name. */
export function recordInConstellation(record, c) {
  if (!record || !c) return false;
  return c.names.test(String(record.name || '').toUpperCase());
}

/** The orbit's shape from what a record or a catalogue row says: semi-major axis, eccentricity, tilt. */
function shapeOf(frag) {
  const m = frag && frag.meta ? frag.meta : frag || {};
  let apo = Number(m.apogeeKm);
  let peri = Number(m.perigeeKm);
  let inc = Number(m.inclinationDeg !== undefined ? m.inclinationDeg : m.incDeg);
  const el = frag && frag.elements;
  if ((!Number.isFinite(apo) || !Number.isFinite(peri)) && el && Number.isFinite(el.aKm)) {
    apo = el.aKm * (1 + (el.e || 0)) - R_EARTH_KM;
    peri = el.aKm * (1 - (el.e || 0)) - R_EARTH_KM;
  }
  if (!Number.isFinite(inc) && el && Number.isFinite(el.iRad)) inc = el.iRad / DEG;
  if (!Number.isFinite(apo) || !Number.isFinite(peri) || !Number.isFinite(inc)) return null;
  const a = R_EARTH_KM + (apo + peri) / 2;
  const e = Math.max(0, Math.min(0.9, (apo - peri) / (2 * a)));
  return { a, e, i: inc * DEG };
}

/**
 * Where the modelled cloud puts a piece at tMs: earth-inertial km, or null before the event (and for a
 * piece whose orbit the catalogue does not give). At the event every piece is at perigee on the ascending
 * node of a plane at the cloud's illustrative node angle; afterwards J2's secular rates move the node,
 * the perigee and the mean anomaly (THE SPREAD IS MODELLED, above).
 */
export function spreadAt(frag, cloud, tMs, out = { x: 0, y: 0, z: 0 }) {
  if (!cloud || !(tMs >= cloud.eventMs)) return null;
  const s = shapeOf(frag);
  if (!s) return null;
  const dt = (tMs - cloud.eventMs) / 1000;
  const n = Math.sqrt(GM_EARTH / (s.a * s.a * s.a));
  const p = s.a * (1 - s.e * s.e);
  const k = J2 * (R_EARTH_KM / p) ** 2;
  const ci = Math.cos(s.i);
  const node = -1.5 * n * k * ci * dt;
  const argp = 0.75 * n * k * (5 * ci * ci - 1) * dt;
  const mean = n * (1 + 0.75 * k * Math.sqrt(1 - s.e * s.e) * (3 * ci * ci - 1)) * dt;
  const M = ((mean % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const E = solveKeplerElliptic(M, s.e);
  const nu = 2 * Math.atan2(Math.sqrt(1 + s.e) * Math.sin(E / 2), Math.sqrt(1 - s.e) * Math.cos(E / 2));
  const r = s.a * (1 - s.e * Math.cos(E));
  const u = argp + nu;
  const cu = Math.cos(u), su = Math.sin(u), cn = Math.cos(node), sn = Math.sin(node), si = Math.sin(s.i);
  out.x = r * (cn * cu - sn * su * ci);
  out.y = r * (sn * cu + cn * su * ci);
  out.z = r * (su * si);
  return out;
}
