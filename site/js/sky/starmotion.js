// sky/starmotion.js -- the sky of another millennium: the stars' own motions and the slow turn of the
// Earth's axis, for a clock scrubbed up to 100 000 years from now (forge #141).
//
// Contract (pure: no three.js, no DOM, no fetch; tests/test_starmotion.mjs runs it in Node):
//   julianYear(ms) -> the Julian epoch of an instant (2000.0 is J2000)
//   MOTION_FROM_YEARS, FAR_FROM_YEARS, DEEP_YEARS, POLE_STAR_MAG, POLE_STAR_DEG
//   motionYears(ms, nowMs) -> years to move the stars from their J2000 places, 0 within 50 years of now
//   isFar(ms) -> true past what Astronomy Engine's own precession and planets are good for
//   equatorPole(epj), eclipticPole(epj) -> unit vectors in J2000 axes
//   precessionMatrix(epj) -> number[9], row-major: mean equator and equinox of J2000 -> of that epoch
//   obliquityDeg(epj)
//   parseMotion(buffer) -> { count, dir, mag, dist, vel, flags, faintest }   data/starmotion.bin
//   moveOne(m, i, years, out) -> out, the star's J2000 direction after `years`
//   moveAll(m, years) -> Float32Array of directions
//   createMatcher(m) -> match(dir, tolDeg, brightest = false) -> record index | -1
//   poleStar(m, dirs, epj, south = false) -> { index, sepDeg } the bright star nearest the pole of date
//   farEqjToLocal(ms, latDeg, lonDeg) -> number[9], J2000 -> the sky view's local frame, for a far clock
//   calendarSunEqj(ms) -> the Sun's direction, J2000, from the calendar (for a far clock)
//
// WHY. Nobody else moves the stars: SpaceEngine's FAQ says it has no proper motion and no precession.
// Scrub this map to the year 50 000 and the Big Dipper should have bent, Arcturus should have left
// Bootes' kite, and the pole should be somewhere else. Two things do that, and they are different:
//
//   THE STARS MOVE (measured, then modelled). data/starmotion.bin (scripts/build-starmotion.py) holds
//     each naked-eye star's J2000 place, distance and space velocity from HYG v4.4's Hipparcos and Gaia
//     proper motions and radial velocities. A star is moved along a straight line in space and seen
//     from the Sun, so a star that comes close (Barnard's, about the year 11 800) speeds up across the
//     sky as it really will. The motions are measured; carrying them 100 000 years in a straight line
//     is the model, and copy/en.js says so on the readout.
//   THE AXIS TURNS (modelled). The Earth's pole circles the ecliptic's every 26 000 years. Astronomy
//     Engine uses the IAU 2006 polynomials, which are good for a few thousand years and then run away
//     (at the year 50 000 its pole is tens of degrees out). Beyond FAR_FROM_YEARS this module's
//     long-term precession takes over: Vondrak, Capitaine and Wallace 2011, "New precession
//     expressions, valid for long time intervals" (A&A 534, A22), the expressions the IAU's SOFA library
//     carries as iauLtpequ and iauLtpecl, good to a few arcseconds over +-200 000 years. With it, the
//     pole comes to within 6.5 degrees of Vega about the year 13 700, as the literature says.
//
// THE FAR SKY'S CLOCK. Far from now neither the Earth's rotation nor the planets can be known: the day
// lengthens by tides, and Astronomy Engine's planets (VSOP87, truncated) are out by degrees within ten
// thousand years. So past FAR_FROM_YEARS the sky view turns the sky by a sidereal day of today's length
// from the clock's UT, puts the Sun where the calendar puts it (the mean Sun, with its yearly unevenness),
// and draws no Moon and no planets (sky/skybodies.js). That keeps night at night and summer in summer,
// which is what a visitor asking "what will the sky look like" means.

const DEG = Math.PI / 180;
const AS = DEG / 3600;
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const DAY_MS = 86400e3;
const YEAR_MS = 365.25 * DAY_MS;
/** km/s -> light-years a Julian year. */
const LY_YR_PER_KMS = 3.2615637771674333 / 977792.2216807891;

/** Within this of now the stars stay where the catalogues put them (Barnard's Star moves 2.9' in 50 years). */
export const MOTION_FROM_YEARS = 50;
/** Past this from J2000 the engine's precession and planets are not used (sky/skybodies.js). */
export const FAR_FROM_YEARS = 2500;
/** As far as the sky's deep-time steps go, either way. */
export const DEEP_YEARS = 100000;
/** A pole star is a star at least this bright ... */
export const POLE_STAR_MAG = 4.0;
/** ... within this of the pole (Vega's 5.7 degrees about AD 13 700 counts). Past it the readout names the nearest and how far. */
export const POLE_STAR_DEG = 7;

/** The Julian epoch of an instant: 2000.0 at J2000 (2000-01-01 12:00), 365.25 days a year. */
export function julianYear(ms) {
  return 2000 + (ms - J2000_MS) / YEAR_MS;
}

/**
 * How many years to move the stars from their catalogue places (J2000) at `ms`: 0 while the clock is
 * within MOTION_FROM_YEARS of `nowMs`, so today's sky is the catalogues' own, unchanged.
 */
export function motionYears(ms, nowMs) {
  if (!Number.isFinite(ms) || !Number.isFinite(nowMs)) return 0;
  if (Math.abs(ms - nowMs) <= MOTION_FROM_YEARS * YEAR_MS) return 0;
  const y = julianYear(Math.max(-DEEP_YEARS * 1.05 * YEAR_MS + nowMs, Math.min(DEEP_YEARS * 1.05 * YEAR_MS + nowMs, ms)));
  return y - 2000;
}

/** Past what the engine's own precession, Earth and planets are good for. */
export function isFar(ms) {
  return Number.isFinite(ms) && Math.abs(julianYear(ms) - 2000) > FAR_FROM_YEARS;
}

// Vondrak, Capitaine & Wallace 2011, Tables 1 and 2 (equator pole X, Y) and 3 and 4 (ecliptic pole P, Q),
// in arcseconds, T in Julian centuries from J2000; periodic rows are [period, cos X, cos Y, sin X, sin Y].
const XYPOL = [[5453.282155, 0.4252841, -0.00037173, -0.000000152], [-73750.930350, -0.7675452, -0.00018725, 0.000000231]];
const XYPER = [
  [256.75, -819.940624, 75004.344875, 81491.287984, 1558.515853], [708.15, -8444.676815, 624.033993, 787.163481, 7774.939698],
  [274.20, 2600.009459, 1251.136893, 1251.296102, -2219.534038], [241.45, 2755.175630, -1102.212834, -1257.950837, -2523.969396],
  [2309.00, -167.659835, -2660.664980, -2966.799730, 247.850422], [492.20, 871.855056, 699.291817, 639.744522, -846.485643],
  [396.10, 44.769698, 153.167220, 131.600209, -1393.124055], [288.90, -512.313065, -950.865637, -445.040117, 368.526116],
  [231.10, -819.415595, 499.754645, 584.522874, 749.045012], [1610.00, -538.071099, -145.188210, -89.756563, 444.704518],
  [620.00, -189.793622, 558.116553, 524.429630, 235.934465], [157.87, -402.922932, -23.923029, -13.549067, 374.049623],
  [220.30, 179.516345, -165.405086, -210.157124, -171.330180], [1200.00, -9.814756, 9.344131, -44.919798, -22.899655],
];
const PQPOL = [[5851.607687, -0.1189000, -0.00028913, 0.000000101], [-1600.886300, 1.1689818, -0.00000020, -0.000000437]];
const PQPER = [
  [708.15, -5486.751211, -684.661560, 667.666730, -5523.863691], [2309.00, -17.127623, 2446.283880, -2354.886252, -549.747450],
  [1620.00, -617.517403, 399.671049, -428.152441, -310.998056], [492.20, 413.442940, -356.652376, 376.202861, 421.535876],
  [1183.00, 78.614193, -186.387003, 184.778874, -36.776172], [622.00, -180.732815, -316.800070, 335.321713, -145.278396],
  [882.00, -87.676083, 198.296701, -185.138669, -34.744450], [547.00, 46.140315, 101.135679, -120.972830, 22.885731],
];
const EPS0 = 84381.406 * AS;

function series(pol, per, t) {
  let a = 0;
  let b = 0;
  const w = 2 * Math.PI * t;
  for (const p of per) {
    const ang = w / p[0];
    const s = Math.sin(ang);
    const c = Math.cos(ang);
    a += c * p[1] + s * p[3];
    b += c * p[2] + s * p[4];
  }
  let k = 1;
  for (let j = 0; j < 4; j += 1) { a += pol[0][j] * k; b += pol[1][j] * k; k *= t; }
  return [a * AS, b * AS];
}

/** The mean pole of the equator at Julian epoch `epj`, a unit vector in J2000 axes (SOFA iauLtpequ). */
export function equatorPole(epj) {
  const [x, y] = series(XYPOL, XYPER, (epj - 2000) / 100);
  return [x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y))];
}

/** The pole of the ecliptic at Julian epoch `epj`, a unit vector in J2000 equatorial axes (SOFA iauLtpecl). */
export function eclipticPole(epj) {
  const [p, q] = series(PQPOL, PQPER, (epj - 2000) / 100);
  const w = Math.sqrt(Math.max(0, 1 - p * p - q * q));
  const s = Math.sin(EPS0);
  const c = Math.cos(EPS0);
  return [p, -q * c - w * s, -q * s + w * c];
}

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v) => { const n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; };

/**
 * The long-term precession matrix (SOFA iauLtp): rows are the equinox, the equator's 90 degree point
 * and the pole of `epj`, so `M v` turns a J2000 mean direction into that epoch's mean equator and equinox.
 */
export function precessionMatrix(epj) {
  const pe = equatorPole(epj);
  const eqx = norm(cross(pe, eclipticPole(epj)));
  const mid = cross(pe, eqx);
  return [eqx[0], eqx[1], eqx[2], mid[0], mid[1], mid[2], pe[0], pe[1], pe[2]];
}

/** The mean obliquity of the ecliptic at `epj`, degrees: the angle between the two poles. */
export function obliquityDeg(epj) {
  const a = equatorPole(epj);
  const b = eclipticPole(epj);
  return Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) / DEG;
}

/** data/starmotion.bin, as scripts/build-starmotion.py writes it. Velocities come back in light-years a year. */
export function parseMotion(buffer) {
  const dv = new DataView(buffer);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== 'SRPM' || dv.getUint16(6, true) !== 16) throw new Error('starmotion.bin: not the file this was written for');
  const count = dv.getUint32(8, true);
  const dir = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const dist = new Float32Array(count);
  const mag = new Float32Array(count);
  const flags = new Uint8Array(count);
  for (let i = 0; i < count; i += 1) {
    const o = 16 + i * 16;
    const ra = (dv.getUint8(o) | (dv.getUint8(o + 1) << 8) | (dv.getUint8(o + 2) << 16)) / 16777216 * 360 * DEG;
    const dec = ((dv.getUint8(o + 3) | (dv.getUint8(o + 4) << 8) | (dv.getUint8(o + 5) << 16)) / 16777215 * 180 - 90) * DEG;
    dir[i * 3] = Math.cos(dec) * Math.cos(ra);
    dir[i * 3 + 1] = Math.cos(dec) * Math.sin(ra);
    dir[i * 3 + 2] = Math.sin(dec);
    mag[i] = dv.getUint8(o + 6) / 12.5 - 1.5;
    flags[i] = dv.getUint8(o + 7);
    dist[i] = Math.pow(10, dv.getUint16(o + 8, true) / 8192);
    for (let k = 0; k < 3; k += 1) vel[i * 3 + k] = dv.getInt16(o + 10 + k * 2, true) * 0.04 * LY_YR_PER_KMS;
  }
  return { count, dir, vel, dist, mag, flags, faintest: dv.getFloat32(12, true) };
}

/** Star `i` of a parsed file, `years` after J2000, seen from the Sun: its J2000 unit vector in `out`. */
export function moveOne(m, i, years, out = [0, 0, 0]) {
  const d = m.dist[i];
  const x = m.dir[i * 3] * d + m.vel[i * 3] * years;
  const y = m.dir[i * 3 + 1] * d + m.vel[i * 3 + 1] * years;
  const z = m.dir[i * 3 + 2] * d + m.vel[i * 3 + 2] * years;
  const n = Math.hypot(x, y, z) || 1;
  out[0] = x / n; out[1] = y / n; out[2] = z / n;
  return out;
}

/** Every star of a parsed file `years` after J2000, as J2000 unit vectors. */
export function moveAll(m, years) {
  const out = new Float32Array(m.count * 3);
  const v = [0, 0, 0];
  for (let i = 0; i < m.count; i += 1) {
    moveOne(m, i, years, v);
    out[i * 3] = v[0]; out[i * 3 + 1] = v[1]; out[i * 3 + 2] = v[2];
  }
  return out;
}

// A grid on the unit sphere's cube, a cell 0.01 wide (0.57 degrees): any tolerance under that is found
// in the 27 cells around a direction.
const CELL = 0.01;
const keyOf = (i, j, k) => `${i},${j},${k}`;

/**
 * A lookup from a J2000 direction to the star of the file there. The sky's own points ask for the
 * nearest within a few arcseconds; a figure's corner, as sky/figures.js does, for the brightest within
 * a third of a degree.
 */
export function createMatcher(m) {
  const grid = new Map();
  for (let i = 0; i < m.count; i += 1) {
    const key = keyOf(Math.floor(m.dir[i * 3] / CELL), Math.floor(m.dir[i * 3 + 1] / CELL), Math.floor(m.dir[i * 3 + 2] / CELL));
    const list = grid.get(key);
    if (list) list.push(i); else grid.set(key, [i]);
  }
  return function match(dir, tolDeg, brightest = false) {
    // The chord, not the cosine: float directions are good to 1e-7, which is all of a 0.02 degree cosine's margin.
    const chord = 2 * Math.sin((Math.min(0.5, tolDeg) * DEG) / 2);
    const chord2 = chord * chord;
    const ci = Math.floor(dir[0] / CELL);
    const cj = Math.floor(dir[1] / CELL);
    const ck = Math.floor(dir[2] / CELL);
    let best = -1;
    let bestScore = -Infinity;
    for (let a = -1; a <= 1; a += 1) for (let b = -1; b <= 1; b += 1) for (let c = -1; c <= 1; c += 1) {
      const list = grid.get(keyOf(ci + a, cj + b, ck + c));
      if (!list) continue;
      for (const i of list) {
        const dx = dir[0] - m.dir[i * 3];
        const dy = dir[1] - m.dir[i * 3 + 1];
        const dz = dir[2] - m.dir[i * 3 + 2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > chord2) continue;
        const score = brightest ? -m.mag[i] : -d2;
        if (score > bestScore) { bestScore = score; best = i; }
      }
    }
    return best;
  };
}

/**
 * The bright star nearest the pole of `epj` (the south pole when `south`), from the stars at their
 * places of that epoch (`dirs`, moveAll's output): { index, sepDeg }, index -1 if none is bright enough.
 */
export function poleStar(m, dirs, epj, south = false) {
  const p = equatorPole(epj);
  const s = south ? -1 : 1;
  let best = -1;
  let bestDot = -2;
  for (let i = 0; i < m.count; i += 1) {
    if (!(m.mag[i] <= POLE_STAR_MAG)) continue;
    const dot = s * (p[0] * dirs[i * 3] + p[1] * dirs[i * 3 + 1] + p[2] * dirs[i * 3 + 2]);
    if (dot > bestDot) { bestDot = dot; best = i; }
  }
  return { index: best, sepDeg: best < 0 ? NaN : Math.acos(Math.max(-1, Math.min(1, bestDot))) / DEG };
}

/**
 * For a far clock: J2000 -> the sky view's local frame (+X east, +Y up, +Z south, as sky/skybodies.js
 * eqjToLocal), through the long-term precession and a sidereal day of today's length from the UT.
 * No nutation (under 20 arcseconds), no refraction (the drawing adds it).
 */
export function farEqjToLocal(ms, latDeg, lonDeg) {
  const P = precessionMatrix(julianYear(ms));
  const days = (ms - J2000_MS) / DAY_MS;
  const lst = ((280.46061837 + 360.98564736629 * days + lonDeg) % 360) * DEG;
  const cl = Math.cos(lst);
  const sl = Math.sin(lst);
  const cp = Math.cos(latDeg * DEG);
  const sp = Math.sin(latDeg * DEG);
  // Rows on the equator of date: towards the meridian, towards the east, the pole.
  const mer = [cl, sl, 0];
  const east = [-sl, cl, 0];
  const up = [mer[0] * cp, mer[1] * cp, sp];
  const south = [mer[0] * sp, mer[1] * sp, -cp];
  const rows = [east, up, south];
  const out = new Array(9);
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) out[r * 3 + c] = rows[r][0] * P[c] + rows[r][1] * P[3 + c] + rows[r][2] * P[6 + c];
  }
  return out;
}

/**
 * The Sun from the calendar, for a far clock: the mean Sun of the Astronomical Almanac's low-precision
 * formula (to 0.01 degree near now) with the yearly unevenness, on the ecliptic of date, turned back to
 * J2000 axes. Its year is the tropical one, so a date keeps its season as the Gregorian calendar meant.
 */
export function calendarSunEqj(ms) {
  const days = (ms - J2000_MS) / DAY_MS;
  const L = 280.460 + 0.9856474 * days;
  const g = (357.528 + 0.9856003 * days) * DEG;
  const lam = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * DEG;
  const epj = julianYear(ms);
  const eps = obliquityDeg(epj) * DEG;
  const v = [Math.cos(lam), Math.cos(eps) * Math.sin(lam), Math.sin(eps) * Math.sin(lam)];
  const P = precessionMatrix(epj);
  return [P[0] * v[0] + P[3] * v[1] + P[6] * v[2], P[1] * v[0] + P[4] * v[1] + P[7] * v[2], P[2] * v[0] + P[5] * v[1] + P[8] * v[2]];
}
