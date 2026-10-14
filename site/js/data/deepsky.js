// data/deepsky.js -- what contains what in the deep sky, how far, and what is drawn (internal spec 0075
// task 2-6, design sections 3 and 4). Pure: no THREE, no DOM; node-tested by tests/test_deepsky.mjs.
//
// Contract:
//   DISTANCE_METHODS, DRAWN_CLASSES, NAME_PARENT_PX, PARENT_FILL
//   parentIdOf(record) -> 'dso-…' | null           breadcrumb(record, byId) -> [root, …, record]
//   relationOf(child, parent) -> 'inside' | 'companion'
//   distanceEstimate(record) -> {value, low, high, method, source, assumed}
//   separationLy(a, b) -> ly between two records' positions (km in, ly out)
//   insideParent(child, parent) -> bool             drawnOf(record, hero?) -> classes, most 3D first
//   primaryDrawn(classes) -> the one the tag says    nameRule(record, {parentPx, selectedId, subjectId})
//   discFrame(posKm, paDeg, inclDeg, nearSide) -> {normal, major} unit vectors in sun-inertial
//   enterShare(from, to, centre, radius) -> share of a straight pan where it enters a sphere, or null
//   parentApexDistance(radius, fovYDeg, fill) -> camera distance at which a sphere fills `fill` of the height
//   parentPath({apex, at, ms}) -> a scene/camera.js `path(info)` that climbs to `apex` while the look-at
//                                  point enters the parent, then comes down to the child
//
// WHY. Until 2026-10-14 the Tarantula was "in the Large Magellanic Cloud" only as English text, and its
// place came from a rounded number on another page, 3 000 ly in front of its galaxy. The registry now
// says `parent:` (registry/dso-hand.yaml, scripts/data/messier-overlay.yaml) and a child with no
// distance of its own is placed at its parent's (scripts/build-dso.py). This file is the arithmetic the
// card, the names, the flight and the coordinator share, so the four cannot disagree.

export const DISTANCE_METHODS = ['parallax', 'eclipsing-binary', 'cepheid', 'TRGB', 'standard-candle', 'redshift', 'kinematic', 'assumed-member-of-parent'];
export const DRAWN_CLASSES = ['reconstruction', 'model', 'photograph', 'catalogue', 'illustration'];
/** A child's name competes only once its parent is this large on screen (radius, CSS px; design §4). */
export const NAME_PARENT_PX = 120;
/** A flight to a child from afar passes where its parent fills this share of the view's height. */
export const PARENT_FILL = 0.6;
const LY_KM = 9460730472580.8;
const D2R = Math.PI / 180;
const OBLIQUITY = 23.4392911 * D2R;
const POLE = [0, Math.sin(OBLIQUITY), Math.cos(OBLIQUITY)]; // the north celestial pole, sun-inertial

const meta = (r) => (r && r.meta) || {};
export const parentIdOf = (record) => (meta(record).parent ? String(meta(record).parent) : null);

/** The chain from the outermost parent down to the record. `byId` is a Map or a function. Pure. */
export function breadcrumb(record, byId) {
  const get = typeof byId === 'function' ? byId : (id) => (byId && byId.get ? byId.get(id) : null);
  const out = [];
  const seen = new Set();
  let at = record;
  while (at && !seen.has(at.id)) {
    seen.add(at.id);
    out.unshift(at);
    const p = parentIdOf(at);
    at = p ? get(p) : null;
  }
  return out;
}

/** A galaxy whose parent is a galaxy is its companion (M32 by Andromeda); anything else is inside. */
export function relationOf(child, parent) {
  return meta(child).kind === 'galaxy' && meta(parent).kind === 'galaxy' ? 'companion' : 'inside';
}

/** The record's distance as an estimate: value and range in ly, its method and source. Pure. */
export function distanceEstimate(record) {
  const md = meta(record);
  const d = md.distance || null;
  const num = (v) => (Number.isFinite(Number(v)) && v !== null ? Number(v) : null);
  return {
    value: num(md.distLy),
    low: num(md.distLyLow),
    high: num(md.distLyHigh),
    method: d && d.method ? d.method : null,
    source: (d && d.source && d.source !== 'parent' ? d.source : null) || md.distanceSource || null,
    assumed: !!(d && d.method === 'assumed-member-of-parent'),
  };
}

/** Light-years between two records' positions (both `pos` in km, the same frame). Pure. */
export function separationLy(a, b) {
  if (!a || !b || !a.pos || !b.pos) return NaN;
  return Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y, a.pos.z - b.pos.z) / LY_KM;
}

/** Is the child within its parent's extent (half its catalogue major axis, at the parent's distance)? */
export function insideParent(child, parent) {
  const sizeLy = Number(meta(parent).sizeLy);
  if (!(sizeLy > 0)) return false;
  return separationLy(child, parent) <= sizeLy / 2;
}

const RANK = new Map(DRAWN_CLASSES.map((c, i) => [c, i]));
/**
 * What is drawn for a record, most three-dimensional first: the record's own classes (a photograph,
 * the illustrative glow) and, once a hero ships, the hero's (`drawn:` in registry/deepsky-heroes/). Pure.
 */
export function drawnOf(record, hero) {
  const own = Array.isArray(meta(record).drawnClasses) ? meta(record).drawnClasses : ['illustration'];
  // A shipped hero's classes: handed in, or stamped on the record by scene/deep/deepsky.js (`heroDrawn`).
  const add = hero && hero.shipped && Array.isArray(hero.drawn) ? hero.drawn : Array.isArray(meta(record).heroDrawn) ? meta(record).heroDrawn : [];
  return [...new Set([...add, ...own])].filter((c) => RANK.has(c)).sort((a, b) => RANK.get(a) - RANK.get(b));
}

/** The one class the HUD tag names: the most three-dimensional thing drawn. */
export function primaryDrawn(classes) {
  return Array.isArray(classes) && classes.length ? classes[0] : 'illustration';
}

/**
 * THE PARENT RULE FOR NAMES (design §4). A child's name is a candidate only when its parent is at least
 * NAME_PARENT_PX in radius on screen, or the child is the selection or a trip's subject. A record with no
 * parent is not this rule's business. `parentPx` is the parent's projected radius (CSS px), or null when
 * it is not known (not on screen): the child then waits. Pure.
 */
export function nameRule(record, { parentPx = null, selectedId = null, subjectId = null } = {}) {
  if (!parentIdOf(record)) return true;
  if (record.id === selectedId || record.id === subjectId) return true;
  return typeof parentPx === 'number' && parentPx >= NAME_PARENT_PX; // Infinity: the camera is inside it
}

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const comb = (a, ka, b, kb) => [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];

/**
 * A disc galaxy's frame in sun-inertial axes from its published viewing angles: the line of nodes at
 * `paDeg` east of north on the sky, the disc tilted `inclDeg` from face-on about it, the `nearSide`
 * (a compass word: NE, SW, …) toward the Sun. `major` is the line of nodes, `normal` the disc's axis.
 * With no inclination the disc faces the Sun. Pure.
 */
export function discFrame(posKm, paDeg, inclDeg, nearSide) {
  const u = norm([posKm.x, posKm.y, posKm.z]);       // from the Sun to the object
  const east = norm(cross(POLE, u));
  const north = cross(u, east);
  const pa = (Number(paDeg) || 0) * D2R;
  const major = comb(north, Math.cos(pa), east, Math.sin(pa));
  const i = (Number(inclDeg) || 0) * D2R;
  const back = [-u[0], -u[1], -u[2]];
  const minorSky = cross(back, major);               // on the sky, at right angles to the nodes
  let normal = norm(comb(back, Math.cos(i), minorSky, Math.sin(i)));
  // Which way it tilts: the side named near must come toward the Sun (its in-disc point has a smaller
  // distance along u). Compass words read as north/east signs on the sky.
  const w = String(nearSide || '').toUpperCase();
  const toward = comb(north, w.includes('N') ? 1 : w.includes('S') ? -1 : 0, east, w.includes('E') ? 1 : w.includes('W') ? -1 : 0);
  if (Math.hypot(...toward) > 0) {
    const inDisc = comb(toward, 1, normal, -dot(toward, normal));
    if (dot(inDisc, u) > 0) normal = norm(comb(back, Math.cos(i), minorSky, -Math.sin(i)));
  }
  return { normal, major };
}

/**
 * The share (0..1) of a straight move of the look-at point from `from` to `to` at which it enters the
 * sphere (`centre`, `radius`); 0 when it starts inside; null when the line never enters. Pure.
 */
export function enterShare(from, to, centre, radius) {
  const d = [to.x - from.x, to.y - from.y, to.z - from.z];
  const f = [from.x - centre.x, from.y - centre.y, from.z - centre.z];
  const c = dot(f, f) - radius * radius;
  if (c <= 0) return 0;
  const a = dot(d, d);
  if (!(a > 0)) return null;
  const b = 2 * dot(f, d);
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}

/** How far the camera stands for a sphere of `radius` to fill `fill` of the view's height. Pure. */
export function parentApexDistance(radius, fovYDeg = 45, fill = PARENT_FILL) {
  const half = (fovYDeg * D2R) / 2;
  return radius / Math.sin(Math.atan(Math.tan(half) * fill));
}

const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
function slerp(a, b, k) {
  if (!a || !b) return null;
  const c = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
  const w = Math.acos(c);
  if (w < 1e-6) return { x: b.x, y: b.y, z: b.z };
  const s = Math.sin(w);
  const ka = Math.sin((1 - k) * w) / s, kb = Math.sin(k * w) / s;
  return { x: a.x * ka + b.x * kb, y: a.y * ka + b.y * kb, z: a.z * ka + b.z * kb };
}

/**
 * A flight THROUGH a parent (design §4): a `path(info)` for scene/camera.js flyTo. The look-at point pans
 * on an ease that reaches the parent's edge (`at`, the share enterShare gave) at 55 % of the flight;
 * the camera's distance climbs (or comes down) in log space to `apex` by then, holds it while the parent
 * fills the view, and comes down to the child's own framing; the side turns with it. Never a lone dot:
 * the parent is in the frame from the apex on. Null for a missing apex. Pure.
 */
export function parentPath({ apex, at = 0.5, ms = 3600 } = {}) {
  if (!(apex > 0)) return null;
  const share = Math.min(0.95, Math.max(0, Number(at) || 0));
  return (info) => {
    if (!info || !(info.from > 0) || !(info.to > 0)) return null;
    const lf = Math.log(info.from), la = Math.log(apex), lt = Math.log(info.to);
    const P = 0.55; // when the look-at point is at the parent's edge
    // pan(raw): an ease scaled so pan(P) = share, then on to 1 by raw = 0.85
    const panAt = (raw) => (raw <= P ? share * ease(raw / P) : share + (1 - share) * ease((raw - P) / 0.3));
    const distanceAt = (raw) => {
      if (raw <= P) return Math.exp(lf + (la - lf) * ease(raw / P));
      if (raw <= P + 0.1) return apex;
      return Math.exp(la + (lt - la) * ease((raw - P - 0.1) / (1 - P - 0.1)));
    };
    return {
      ms,
      at(raw) {
        const x = raw > 0 ? (raw < 1 ? raw : 1) : 0;
        if (x >= 1) return { pan: 1, distance: info.to, dir: info.toDir || null };
        return { pan: Math.min(1, panAt(x)), distance: distanceAt(x), dir: slerp(info.fromDir, info.toDir, ease(x)) };
      },
    };
  };
}
