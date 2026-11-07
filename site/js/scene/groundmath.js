// scene/groundmath.js -- the arithmetic of standing on a landing site (release 2.0.0 batch f7-ground, forge #146).
//
// Contract: decodeHeights(bytes, cols, min, q) -> Float32Array, gridHeight(grid, x, z) -> metres | NaN,
//           groundHeight(near, far, x, z), groundNormal(near, far, x, z) -> [x, y, z],
//           tangentXZ(latDeg, lonDeg, lat0, lon0, radiusKm) -> [x, z], joystick(dx, dy, radiusPx) -> {x, y},
//           stepWalker(state, input, dtS, opts) -> state, horizonProfile(far, x, z, eyeM, bins) -> Float32Array (degrees),
//           horizonAt(profile, azDeg), sunlitShare(sunAltDeg, horizonDeg, sunRadiusDeg) -> 0..1, parseGroundLink(text)
// Pure: no DOM, no three. scene/groundstage.js draws with these; tests/test_ground.mjs holds each one.
//
// THE FRAME is scripts/build-ground.py's: a plane tangent to the world at the lander, x EAST and z SOUTH in metres
// (so +y is up and the frame is right-handed, as sky/worldframe.js's local frame is), heights up from the lander's
// own ground with the world's curvature already in them. A grid is { size, step, h: Float32Array }, row 0 to the north,
// column 0 to the west, centred on the lander: post (row r, col c) is at x = (c - (size - 1) / 2) step,
// z = (r - (size - 1) / 2) step. A post with no height is NaN.

const DEG = Math.PI / 180;
export const EMPTY = 65535;

/**
 * A height file after inflating (build-ground.py pack_heights): unsigned 16-bit steps, each row delta-coded from its
 * left neighbour mod 65536. Returns metres (min + q x step), NaN where the post is empty.
 */
export function decodeHeights(bytes, cols, min, q) {
  const n = Math.floor(bytes.length / 2);
  const out = new Float32Array(n);
  let acc = 0;
  for (let i = 0; i < n; i += 1) {
    const d = bytes[i * 2] | (bytes[i * 2 + 1] << 8);
    acc = i % cols === 0 ? d : (acc + d) & 0xffff;
    out[i] = acc === EMPTY ? NaN : min + acc * q;
  }
  return out;
}

/** Bilinear height of a grid at (x, z), NaN outside it or where a post is empty. */
export function gridHeight(grid, x, z) {
  if (!grid || !grid.h) return NaN;
  const half = (grid.size - 1) / 2;
  const c = x / grid.step + half;
  const r = z / grid.step + half;
  if (!(c >= 0 && r >= 0 && c <= grid.size - 1 && r <= grid.size - 1)) return NaN;
  const c0 = Math.min(grid.size - 2, Math.floor(c));
  const r0 = Math.min(grid.size - 2, Math.floor(r));
  const fc = c - c0, fr = r - r0;
  const i = r0 * grid.size + c0;
  const h = grid.h;
  return (h[i] * (1 - fc) + h[i + 1] * fc) * (1 - fr) + (h[i + grid.size] * (1 - fc) + h[i + grid.size + 1] * fc) * fr;
}

/** The near grid's height where it has one, else the far grid's. */
export function groundHeight(near, far, x, z) {
  const a = gridHeight(near, x, z);
  return Number.isFinite(a) ? a : gridHeight(far, x, z);
}

/** The ground's up-facing normal at (x, z), by central differences over a grid step. */
export function groundNormal(near, far, x, z) {
  const inNear = Number.isFinite(gridHeight(near, x, z));
  const d = inNear ? near.step : far ? far.step : 1;
  const hx = groundHeight(near, far, x + d, z) - groundHeight(near, far, x - d, z);
  const hz = groundHeight(near, far, x, z + d) - groundHeight(near, far, x, z - d);
  if (!Number.isFinite(hx) || !Number.isFinite(hz)) return [0, 1, 0];
  const nx = -hx / (2 * d), nz = -hz / (2 * d);
  const len = Math.hypot(nx, 1, nz);
  return [nx / len, 1 / len, nz / len];
}

/**
 * A planetocentric latitude and east longitude on the tangent plane at (lat0, lon0): the exact inverse of
 * build-ground.py tangent_latlon (the ray from the world's centre through the point, met with the plane), [x east,
 * z south] in metres. Used for the traverses, which are written in degrees.
 */
export function tangentXZ(latDeg, lonDeg, lat0, lon0, radiusKm) {
  const R = radiusKm * 1000;
  const p = latDeg * DEG, l = lonDeg * DEG, p0 = lat0 * DEG, l0 = lon0 * DEG;
  const v = [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
  const U = [Math.cos(p0) * Math.cos(l0), Math.cos(p0) * Math.sin(l0), Math.sin(p0)];
  const E = [-Math.sin(l0), Math.cos(l0), 0];
  const N = [-Math.sin(p0) * Math.cos(l0), -Math.sin(p0) * Math.sin(l0), Math.cos(p0)];
  const along = v[0] * U[0] + v[1] * U[1] + v[2] * U[2];
  if (!(along > 0)) return [NaN, NaN];
  const k = R / along;
  return [k * (v[0] * E[0] + v[1] * E[1] + v[2] * E[2]), -k * (v[0] * N[0] + v[1] * N[1] + v[2] * N[2])];
}

/**
 * A touch joystick's push: the thumb's offset from the pad's centre in pixels, to a vector of length 0..1 (x right,
 * y FORWARD, which is up the screen), with a dead zone of 12 % so a resting thumb does not creep.
 */
export function joystick(dx, dy, radiusPx) {
  const r = Math.max(1, radiusPx);
  let x = dx / r, y = -dy / r;
  const len = Math.hypot(x, y);
  if (len < 0.12) return { x: 0, y: 0 };
  const k = Math.min(1, (len - 0.12) / 0.88) / len;
  x *= k; y *= k;
  return { x, y };
}

/** How fast a visitor goes, in metres a second: a walk, a run (Shift), and a rover driven far faster than it can go. */
export const SPEEDS = { walk: 1.4, run: 4.2, drive: 4.0 };
/** Curiosity's and Perseverance's top speed on flat ground, 4.2 cm/s (NASA/JPL mission pages); the stage says how many times that. */
export const ROVER_TOP_MS = 0.042;
export const EYE_M = 1.7;

/**
 * One step of a walker or a rover. state { x, z, yawDeg, pitchDeg }: yaw from north clockwise, as an azimuth.
 * input { forward, strafe, turn, look } each -1..1 (turn and look are degrees a second over 90), `run` a boolean.
 * opts { mode: 'walk' | 'drive', limitM (the square half-width the walker is kept in), height(x, z) }.
 * A rover turns but does not strafe. The walker is stopped at the edge of the near ground, and on a post with no
 * height (it does not step off the map).
 */
export function stepWalker(state, input, dtS, opts = {}) {
  const dt = Math.min(0.1, Math.max(0, dtS || 0));
  const drive = opts.mode === 'drive';
  const speed = drive ? SPEEDS.drive : input.run ? SPEEDS.run : SPEEDS.walk;
  const yawDeg = (((state.yawDeg + (input.turn || 0) * 90 * dt) % 360) + 360) % 360;
  const pitchDeg = Math.max(-80, Math.min(85, state.pitchDeg + (input.look || 0) * 90 * dt));
  const yaw = yawDeg * DEG;
  // Forward is the azimuth's direction: east sin(yaw), north cos(yaw), and north is -z.
  const fwd = input.forward || 0;
  const side = drive ? 0 : (input.strafe || 0);
  let x = state.x + (Math.sin(yaw) * fwd + Math.cos(yaw) * side) * speed * dt;
  let z = state.z + (-Math.cos(yaw) * fwd + Math.sin(yaw) * side) * speed * dt;
  const lim = Number.isFinite(opts.limitM) ? opts.limitM : Infinity;
  x = Math.max(-lim, Math.min(lim, x));
  z = Math.max(-lim, Math.min(lim, z));
  if (typeof opts.height === 'function' && !Number.isFinite(opts.height(x, z))) { x = state.x; z = state.z; }
  return { x, z, yawDeg, pitchDeg };
}

/**
 * The skyline round a point: for each of `bins` azimuths (from north, clockwise), the highest elevation angle of the
 * far ground seen from an eye `eyeM` above the ground at (x, z), in degrees, marched out to the grid's edge. The
 * curvature is in the heights already (build-ground.py), so a distant ridge sinks as it should. The Sun is behind the
 * skyline when its altitude is under horizonAt(profile, its azimuth): the whole near ground is then in shadow.
 */
export function horizonProfile(far, x, z, eyeM, bins = 360, near = null) {
  const out = new Float32Array(bins);
  const eye = groundHeight(near, far, x, z) + eyeM;
  if (!far || !Number.isFinite(eye)) return out.fill(-90);
  const reach = ((far.size - 1) / 2) * far.step;
  for (let b = 0; b < bins; b += 1) {
    const az = (b / bins) * 360 * DEG;
    const dx = Math.sin(az), dz = -Math.cos(az);
    let best = -90;
    // Steps that grow with distance: 10 m near, a far post's width out at the edge.
    for (let d = 20; d < reach; d += Math.max(10, d * 0.02)) {
      const h = groundHeight(near, far, x + dx * d, z + dz * d);
      if (!Number.isFinite(h)) continue;
      const e = Math.atan2(h - eye, d) / DEG;
      if (e > best) best = e;
    }
    out[b] = best;
  }
  return out;
}

/** The skyline's elevation at an azimuth, interpolated between bins. */
export function horizonAt(profile, azDeg) {
  const n = profile.length;
  const f = ((((azDeg % 360) + 360) % 360) / 360) * n;
  const i = Math.floor(f) % n;
  const k = f - Math.floor(f);
  return profile[i] * (1 - k) + profile[(i + 1) % n] * k;
}

/** How much of the Sun's disc stands above a skyline of `horizonDeg`: 0 to 1 over its diameter (a chord's share, near enough). */
export function sunlitShare(sunAltDeg, horizonDeg, sunRadiusDeg) {
  const r = Math.max(1e-3, sunRadiusDeg);
  const t = Math.min(1, Math.max(0, (sunAltDeg - horizonDeg + r) / (2 * r)));
  return t * t * (3 - 2 * t);
}

/** `#ground=` read: a site id (`apollo-15`), or null. */
export function parseGroundLink(text) {
  const s = String(text || '').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{0,39}$/.test(s) ? s : null;
}
