// scene/weather/flow.js -- the arithmetic of weather on the other worlds (spec 0066).
//
// Pure: a wind profile to an angular rate, the two-phase clock that lets a still map flow, Mars's
// season from the date, and what that season does to its frost and its dust. No three.js and no
// DOM; tests/test_weather.mjs runs all of it in Node. scene/weather/worldweather.js puts the
// numbers into the world shader.
//
// WHY A MAP CAN FLOW AT ALL. Each map is one picture, and the winds on a giant planet blow along
// circles of latitude at speeds that differ by latitude. Sliding every row of the picture at its own
// rate is the honest motion -- and after a few days it has torn every storm in the picture into
// streaks, because nothing in a still picture re-forms the way a real atmosphere does. So the slide
// is run for a bounded stretch of time, twice, half a cycle apart, and the two are cross-faded: each
// copy is thrown away, at zero weight, just as it has sheared as far as MAX_SHIFT_TURNS (the
// "flow map" of game water). What is right: the direction and speed of every band at every moment
// of the clock, forwards or backwards. What is not known: where any one cloud is today. The
// registry row says `modelled`, and the card says the motion is.

/** Rows in the rate table handed to the shader: every 2.5 degrees of latitude, pole to pole. */
export const RATE_ROWS = 73;
/** How far a band may slide from where the map has it before its copy is faded out: 30 degrees. */
export const MAX_SHIFT_TURNS = 30 / 360;
/** The cycle is never shorter (a strobe) or longer (no visible flow in a month of scrubbing). */
export const CYCLE_DAYS = { min: 0.25, max: 30 };
const DAY_MS = 86400000;
const DEG = Math.PI / 180;

/**
 * A planetographic latitude as the planetocentric one. The papers give the first (the angle of
 * the local vertical on a flattened planet); a map wrapped on a sphere is laid out in the second.
 * tan(centric) = (1 - f)^2 tan(graphic).
 */
export function planetocentricDeg(graphicDeg, flattening = 0) {
  if (Math.abs(graphicDeg) >= 90) return Math.sign(graphicDeg) * 90;
  const k = (1 - flattening) ** 2;
  return Math.atan(k * Math.tan(graphicDeg * DEG)) / DEG;
}

/** A [x, y] table read at x, straight lines between the points, held flat past either end. */
export function interp(points, x) {
  if (!points || !points.length) return 0;
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    if (x <= points[i][0]) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      return x1 === x0 ? y1 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return points[points.length - 1][1];
}

/** The wind at a PLANETOCENTRIC latitude, m/s with the rotation, from a registry profile. */
export function windAt(profile, centricDeg) {
  const f = profile.flattening || 0;
  // The table is short, so it is re-keyed here rather than inverted: each point's latitude as the
  // planetocentric one, then read like any table.
  return interp(profile.points.map(([lat, u]) => [planetocentricDeg(lat, f), u]), centricDeg);
}

/**
 * A wind as how fast it carries a cloud round the planet, in turns per day, eastward positive.
 * `u` m/s along a circle of latitude of circumference 2 pi R cos(lat). Within a degree of a pole
 * that circle has no length; the rate there is the last one that had.
 */
export function turnsPerDay(uMs, latDeg, radiusKm) {
  const lat = Math.max(-89, Math.min(89, latDeg));
  return (uMs * 86.4) / (2 * Math.PI * radiusKm * Math.cos(lat * DEG));
}

/**
 * The profile as the shader's table: RATE_ROWS angular rates from the south pole to the north, in
 * turns per day toward the east of the map (`sense` -1 on a planet that turns backwards).
 */
export function rateTable(profile, rows = RATE_ROWS) {
  const out = new Float32Array(rows);
  const sense = profile.sense === -1 ? -1 : 1;
  for (let i = 0; i < rows; i++) {
    const lat = Math.max(-89, Math.min(89, -90 + (180 * i) / (rows - 1)));
    out[i] = sense * turnsPerDay(windAt(profile, lat), lat, profile.radius_km);
  }
  return out;
}

/**
 * The table split into what the whole map does and what each band does against it. The first is a
 * plain turn with no shear in it, so it runs on the clock for ever; only the second goes through
 * the two-phase cycle. The split that leaves the least shear is the middle of the range -- except
 * where the map has a spot that must stay put (`pinned`), and then the whole map does not turn.
 * @returns {{rigid: number, rates: Float32Array, cycleDays: number}}
 */
export function splitFlow(table, pinned = false) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const r of table) { if (r < lo) lo = r; if (r > hi) hi = r; }
  const rigid = pinned ? 0 : (lo + hi) / 2;
  const rates = Float32Array.from(table, (r) => r - rigid);
  let peak = 0;
  for (const r of rates) peak = Math.max(peak, Math.abs(r));
  const cycleDays = peak > 0
    ? Math.max(CYCLE_DAYS.min, Math.min(CYCLE_DAYS.max, (2 * MAX_SHIFT_TURNS) / peak))
    : CYCLE_DAYS.max;
  return { rigid, rates, cycleDays };
}

const fract = (x) => x - Math.floor(x);

/**
 * The two copies of the map at the clock's time: how long each has been flowing, in days either
 * side of the moment it matches the map (-cycle/2 .. +cycle/2), and the second one's weight. A
 * copy's weight is 0 at the instant its time wraps, so the wrap is never seen.
 */
export function flowPhases(tMs, cycleDays) {
  const p1 = fract(tMs / DAY_MS / cycleDays);
  const p2 = fract(p1 + 0.5);
  return {
    tau1: (p1 - 0.5) * cycleDays,
    tau2: (p2 - 0.5) * cycleDays,
    w2: 1 - Math.abs(2 * p2 - 1),
  };
}

/** How far the whole map has turned at the clock's time, as a fraction of a turn, 0..1. */
export function rigidTurn(tMs, rigidTurnsPerDay) {
  return fract((tMs / DAY_MS) * rigidTurnsPerDay);
}

// --- Mars -----------------------------------------------------------------------------------------

/**
 * Mars's season: the areocentric longitude of the Sun, Ls, in degrees. 0 is the northern spring
 * equinox, 90 the northern summer solstice, 251 perihelion and the middle of the dusty season.
 * Allison and McEwen 2000 (Planet. Space Sci. 48, 215), the recipe NASA's Mars24 uses: the mean
 * anomaly, the angle of the fictitious mean Sun, seven planetary perturbations, and the equation
 * of centre. Good to a few thousandths of a degree over centuries; the clock's UTC is used as TT
 * (69 s apart, 0.0004 degrees of Ls).
 */
export function marsLs(tMs) {
  const d = tMs / DAY_MS - 10957.5;   // days from J2000.0 (2000-01-01 12:00)
  const M = (19.3871 + 0.52402073 * d) * DEG;
  const alphaFms = 270.3871 + 0.524038496 * d;
  const A = [0.0071, 0.0057, 0.0039, 0.0037, 0.0021, 0.0020, 0.0018];
  const tau = [2.2353, 2.7543, 1.1177, 15.7866, 2.1354, 2.4694, 32.8493];
  const phi = [49.409, 168.173, 191.837, 21.736, 15.704, 95.528, 49.095];
  let pbs = 0;
  for (let i = 0; i < 7; i++) pbs += A[i] * Math.cos(((0.985626 * d) / tau[i] + phi[i]) * DEG);
  const eoc = (10.691 + 3.0e-7 * d) * Math.sin(M) + 0.623 * Math.sin(2 * M) + 0.050 * Math.sin(3 * M)
    + 0.005 * Math.sin(4 * M) + 0.0005 * Math.sin(5 * M) + pbs;
  return ((alphaFms + eoc) % 360 + 360) % 360;
}

/**
 * What the season typically brings (registry/weather.yaml `mars-season`): the latitude of each
 * seasonal frost cap's edge in degrees, and how hazy the air is, 0..1. Illustrative, and the card
 * says so: the tables are a season's habit, not this week's pictures.
 */
export function marsSeason(row, ls) {
  return {
    ls,
    northEdgeDeg: interp(row.north_cap, ls),
    southEdgeDeg: interp(row.south_cap, ls),
    dust: Math.max(0, Math.min(1, interp(row.dust, ls))),
  };
}
