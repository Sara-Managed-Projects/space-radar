// sky/figures.js -- the constellation figures as strokes a pen can draw, and where their stars are.
//
// Pure: no three.js, no DOM, no fetch, so tests/test_figures.mjs runs it in Node. The drawing is
// scene/figures3d.js; the trip that asks for it is registry/tours.yaml's `figures:`.
//
// Contract:
//   dirOf(raDeg, decDeg) -> [x, y, z]            J2000 equatorial unit vector (x to RA 0, z north)
//   eqToEcl(v), eclToEq(v)                       equatorial J2000 <-> ecliptic J2000 (sun-inertial)
//   angleBetween(a, b) -> radians
//   parseFigures(linesJson, namesJson) -> Map(id -> { id, name, centre: [ra, dec], lines })
//   strokeSchedule(lines) -> { segments: [{ a, b, t0, t1 }], lengthRad }
//   brightIndex(data, magLimit) -> candidates    the stars a figure's corner may be, from stars3d
//   starFor(dir, candidates, tolRad) -> candidate | null
//   placeFigure(figure, candidates) -> { segments, stars, medianLy, unplaced }
//   figureProgress(elapsedMs, index, opts) -> 0..1
//   eclipticRing(n) -> [[x, y, z], ...]          the Sun's yearly path, equatorial unit vectors
//
// WHY A SCHEDULE. A figure in data/constellations.lines.json is a handful of polylines in no
// order a hand would draw them in. Drawn all at once it is a diagram that appears; drawn as one
// stroke that travels from star to star it is somebody showing you the figure, which is what a
// planetarium presenter's pointer does. So the polylines are put end to end, nearest end first,
// and each segment is given the share of the stroke its length on the sky earns it.
//
// WHY THE STARS ARE LOOKED UP. The file gives each corner as a right ascension and a declination,
// which is a direction and not a place. The map has 109 389 stars with measured distances
// (scene/stars3d.js); a corner is the brightest of them within a third of a degree of that
// direction. From the Sun the figure then looks exactly as the file draws it, and from anywhere
// else it comes apart the way it really would, because its stars are nowhere near each other.
// A corner with no such star (the file has a few that are a bend in a line, not a star) is put
// at the figure's median distance and counted in `unplaced`, so nothing claims it was measured.

const DEG = Math.PI / 180;
/** The obliquity of the ecliptic at J2000, IAU 1976: 23 deg 26' 21.448". */
export const OBLIQUITY_DEG = 23.4392911;
/** A corner is a star when one this bright or brighter is this close to it. */
export const CORNER_TOLERANCE_DEG = 0.35;
export const CORNER_MAG_LIMIT = 6.6;
/** One figure's stroke, and the gap before the next figure's begins, in milliseconds. */
export const DRAW_MS = 3600;
export const STAGGER_MS = 900;

export function dirOf(raDeg, decDeg) {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const c = Math.cos(dec);
  return [c * Math.cos(ra), c * Math.sin(ra), Math.sin(dec)];
}

const COS_E = Math.cos(OBLIQUITY_DEG * DEG);
const SIN_E = Math.sin(OBLIQUITY_DEG * DEG);

/** Equatorial J2000 axes -> ecliptic J2000 axes (the stage's `sun-inertial`). */
export function eqToEcl(v) {
  return [v[0], v[1] * COS_E + v[2] * SIN_E, -v[1] * SIN_E + v[2] * COS_E];
}

/** Ecliptic J2000 axes -> equatorial J2000 axes. */
export function eclToEq(v) {
  return [v[0], v[1] * COS_E - v[2] * SIN_E, v[1] * SIN_E + v[2] * COS_E];
}

export function angleBetween(a, b) {
  const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return Math.acos(Math.min(1, Math.max(-1, d)));
}

/**
 * The figures by their three-letter id. `linesJson` is d3-celestial's GeoJSON (a MultiLineString
 * of [ra, dec] in degrees per figure, right ascension from -180 to 180); `namesJson` the names
 * and label places beside it. A figure with no lines is left out: there is nothing to draw.
 * 89 features, 88 figures.
 */
export function parseFigures(linesJson, namesJson) {
  const names = new Map();
  for (const row of Array.isArray(namesJson) ? namesJson : []) {
    if (row && row.id) names.set(String(row.id), row);
  }
  const out = new Map();
  const features = linesJson && Array.isArray(linesJson.features) ? linesJson.features : [];
  for (const f of features) {
    const g = f && f.geometry;
    if (!f || !f.id || !g) continue;
    const multi = g.type === 'MultiLineString' ? g.coordinates : g.type === 'LineString' ? [g.coordinates] : [];
    const lines = [];
    for (const line of multi) {
      const pts = (Array.isArray(line) ? line : [])
        .filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
        .map((p) => [p[0], p[1]]);
      if (pts.length >= 2) lines.push(pts);
    }
    if (!lines.length) continue;
    // The Serpent is two features with one id, its head and its tail either side of Ophiuchus:
    // one figure here, drawn in one stroke with the pen lifted across the gap.
    const had = out.get(String(f.id));
    if (had) { had.lines.push(...lines); continue; }
    const n = names.get(String(f.id));
    out.set(String(f.id), {
      id: String(f.id),
      name: n && n.name ? String(n.name) : String(f.id),
      centre: n && Number.isFinite(n.ra) && Number.isFinite(n.dec) ? [n.ra, n.dec] : lines[0][0].slice(),
      lines,
    });
  }
  return out;
}

/**
 * One stroke through every polyline: the order to draw the segments in, and when. `t0` and `t1`
 * are shares of the whole stroke, 0 to 1, in proportion to each segment's length on the sky. The
 * pen starts on the first polyline as the file has it, then goes to whichever unused polyline
 * has an end nearest to where it stopped, entering it from that end; lifting the pen takes no
 * time. Every segment of the input appears exactly once.
 */
export function strokeSchedule(lines) {
  const todo = (Array.isArray(lines) ? lines : []).filter((l) => Array.isArray(l) && l.length >= 2).map((l) => l.map((p) => [p[0], p[1]]));
  const ordered = [];
  let pen = null;
  while (todo.length) {
    let best = 0;
    let reverse = false;
    if (pen) {
      let bestAngle = Infinity;
      for (let i = 0; i < todo.length; i++) {
        const head = angleBetween(pen, dirOf(todo[i][0][0], todo[i][0][1]));
        const last = todo[i][todo[i].length - 1];
        const tail = angleBetween(pen, dirOf(last[0], last[1]));
        if (head < bestAngle) { bestAngle = head; best = i; reverse = false; }
        if (tail < bestAngle) { bestAngle = tail; best = i; reverse = true; }
      }
    }
    const line = todo.splice(best, 1)[0];
    if (reverse) line.reverse();
    ordered.push(line);
    const end = line[line.length - 1];
    pen = dirOf(end[0], end[1]);
  }
  const segments = [];
  let total = 0;
  for (const line of ordered) {
    for (let i = 0; i + 1 < line.length; i++) {
      const len = angleBetween(dirOf(line[i][0], line[i][1]), dirOf(line[i + 1][0], line[i + 1][1]));
      segments.push({ a: line[i], b: line[i + 1], len });
      total += len;
    }
  }
  let run = 0;
  for (const s of segments) {
    s.t0 = total > 0 ? run / total : 0;
    run += s.len;
    s.t1 = total > 0 ? run / total : 1;
    delete s.len;
  }
  if (segments.length) segments[segments.length - 1].t1 = 1;
  return { segments, lengthRad: total };
}

/**
 * The stars a corner may be: every star of scene/stars3d.js's parsed binary no fainter than
 * `magLimit`, with its direction from the Sun in equatorial axes. `data.posLy` is ecliptic
 * (the stage's sun-inertial frame), which is why it is turned here.
 */
export function brightIndex(data, magLimit = CORNER_MAG_LIMIT) {
  const out = [];
  if (!data || !data.posLy || !data.appMag) return out;
  for (let i = 0; i < data.count; i++) {
    const mag = data.appMag[i];
    if (!(mag <= magLimit)) continue;
    const x = data.posLy[i * 3];
    const y = data.posLy[i * 3 + 1];
    const z = data.posLy[i * 3 + 2];
    const ly = Math.hypot(x, y, z);
    if (!(ly > 0)) continue;
    out.push({ index: i, mag, ly, posLy: [x, y, z], dir: eclToEq([x / ly, y / ly, z / ly]) });
  }
  return out;
}

/** The brightest candidate within `tolRad` of a direction, or null. */
export function starFor(dir, candidates, tolRad = CORNER_TOLERANCE_DEG * DEG) {
  const min = Math.cos(tolRad);
  let best = null;
  for (const c of candidates) {
    const d = dir[0] * c.dir[0] + dir[1] * c.dir[1] + dir[2] * c.dir[2];
    if (d < min) continue;
    if (!best || c.mag < best.mag) best = c;
  }
  return best;
}

function median(values) {
  if (!values.length) return 0;
  const s = values.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * A figure with every corner given a place in light-years from the Sun, ecliptic axes: the
 * star's own where one was found, the direction at the figure's median distance where none was.
 * `stars` are the distinct stars found, brightest first; `unplaced` counts the corners that are
 * not a measured star.
 */
export function placeFigure(figure, candidates) {
  const sched = strokeSchedule(figure.lines);
  const cache = new Map();
  const found = new Map();
  const lookup = (p) => {
    const key = `${p[0]},${p[1]}`;
    if (cache.has(key)) return cache.get(key);
    const dir = dirOf(p[0], p[1]);
    const star = starFor(dir, candidates);
    if (star) found.set(star.index, star);
    const v = { dir, star };
    cache.set(key, v);
    return v;
  };
  for (const s of sched.segments) { lookup(s.a); lookup(s.b); }
  const medianLy = median([...found.values()].map((s) => s.ly)) || 100;
  let unplaced = 0;
  for (const v of cache.values()) {
    if (v.star) v.posLy = v.star.posLy;
    else {
      unplaced++;
      const e = eqToEcl(v.dir);
      v.posLy = [e[0] * medianLy, e[1] * medianLy, e[2] * medianLy];
    }
  }
  const segments = sched.segments.map((s) => {
    const a = lookup(s.a);
    const b = lookup(s.b);
    return { a: a.posLy, b: b.posLy, t0: s.t0, t1: s.t1, measured: !!(a.star && b.star) };
  });
  const stars = [...found.values()].sort((x, y) => x.mag - y.mag);
  return { id: figure.id, name: figure.name, centre: figure.centre, segments, stars, medianLy, unplaced, lengthRad: sched.lengthRad };
}

/**
 * How much of figure `index`'s stroke is drawn `elapsedMs` after the stop's figures were asked
 * for: each starts `staggerMs` after the one before and takes `drawMs`, eased out so the pen
 * slows into its last star. With `reduced` (prefers-reduced-motion) every figure is whole at once.
 */
export function figureProgress(elapsedMs, index, opts = {}) {
  if (opts.reduced) return 1;
  const drawMs = opts.drawMs > 0 ? opts.drawMs : DRAW_MS;
  const staggerMs = opts.staggerMs >= 0 ? opts.staggerMs : STAGGER_MS;
  const k = (elapsedMs - index * staggerMs) / drawMs;
  if (!(k > 0)) return 0;
  if (k >= 1) return 1;
  return 1 - (1 - k) * (1 - k);
}

/** The ecliptic as `n` equatorial unit vectors, from the March equinox round through the year. */
export function eclipticRing(n = 180) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const l = (i / n) * 2 * Math.PI;
    out.push(eclToEq([Math.cos(l), Math.sin(l), 0]));
  }
  return out;
}
