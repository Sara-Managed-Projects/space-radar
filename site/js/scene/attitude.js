// scene/attitude.js -- which way a spacecraft points: a few simple, stated laws. MODELLED, NEVER MEASURED.
//
// Nobody publishes the attitude of a catalogue number, so the app does not know which way anything is
// turned. What it can do is fly each craft by the rule its kind of craft is flown by, and say so on the
// card (COPY.drawing.attitude). Until the review of 2026-11-16 only the shapes built to the app's own
// axes were flown by a rule; the 99 files from other hands (every NASA file, the ISS and all the far
// probes among them) kept a constant angle seeded from the object's id, so the ISS's arrays, Terra's
// instruments, Webb's sunshield and Voyager's dish pointed nowhere in particular.
//
// THE APP'S AXES (scene/models.js, "Local frame convention"): +Z the face the law points (the Earth
// deck, a dish's boresight, a sunshield's hot side), +X the second axis (the wings' axis, the way a
// station flies, a telescope's tube), +Y the rest (the side the solar cells face, where that is fixed).
// A file from somewhere else says which of ITS axes those are, once, in its registry/models.yaml row:
//
//     attitude: {law: nadir, face: "-y", panel: "z"}                 Terra: instruments on -Y, the wing along Z
//     attitude: {law: sun, face: "+z", panel: "+y"}                  Hubble: cells to +Z, the tube along +Y
//     attitude: {law: nadir, face: "+x", panel: [0, -1, 1]}          Landsat 8: its wing is on a diagonal of the file
//
// scripts/gen_model_frames_js.py mirrors those rows into data/modelframes.js; frameQuat() below turns one
// into the turn from the file's axes to the app's, and the model is flown by `law` exactly as a shape
// built here is. A file with no `attitude:` keeps the seeded constant angle, and the card says nothing.
//
// THE LAWS. Each fixes one axis exactly and turns the craft about it to bring a second as near a
// second direction as it can go:
//
//     nadir   +Z at the centre of its world; +X square to the Sun, so +Y (the cells' side) is on the
//             Sun's side. Earth observers, communications and navigation craft. (The app's `sun-panels`.)
//     geo     +Z at the Earth; +X along the Earth's axis. A geostationary craft's wings lie north-south
//             and turn about that line once a day to follow the Sun: a shape with turning wings is
//             drawn so, a rigid file is turned end for end at noon and midnight to keep its cells sunward.
//     lvlh    +Z at the centre of its world; +X along the direction of travel. The ISS: the same face
//             down and the same end forward all the way round (local vertical, local horizontal).
//     sun     +Z at the Sun; +X as near the north of the sky as it can be. A sunshield, a heat shield, a
//             Sun-watching telescope, and a telescope whose cells are on one side: it looks at one
//             place in the sky, square to the Sun, and the Earth passes through its view as it does.
//     earth   +Z at the Earth; +Y as near the Sun as it can be. A far probe with a dish.
//     spin    as `earth`, and turning about +Z: a spin-stabilised craft (Pioneer 10 and 11, Juno).
//
// Pure: plain arrays in, plain arrays out, no three.js. tests/test_attitude.mjs holds every law.

const EPS = 1e-9;

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];

/** A unit vector from {x,y,z} or [x,y,z], or null when it has no length. */
export function unit(v) {
  if (!v) return null;
  const a = Array.isArray(v) ? v : [v.x, v.y, v.z];
  const l = Math.hypot(a[0], a[1], a[2]);
  return l > EPS && Number.isFinite(l) ? [a[0] / l, a[1] / l, a[2] / l] : null;
}

/** The unit vector from `from` toward `to` (the Sun from a craft, the Earth from a probe, a world's centre: the nadir), or null. */
export function directionTo(from, to) {
  if (!from || !to) return null;
  const a = Array.isArray(from) ? from : [from.x, from.y, from.z];
  const b = Array.isArray(to) ? to : [to.x, to.y, to.z];
  return unit([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
}

/** `v` with its part along the unit vector `n` taken out, as a unit vector; null when nothing is left (v along n). */
export function squareTo(v, n) {
  if (!v || !n) return null;
  const out = unit([v[0] - n[0] * dot(v, n), v[1] - n[1] * dot(v, n), v[2] - n[2] * dot(v, n)]);
  // a vector within about half a degree of `n` has no direction of its own across it
  return out && Math.abs(dot(unit(v), n)) < 0.99996 ? out : null;
}

/** An axis as a row writes it: "x", "+y", "-z", or three numbers. A unit vector, or null. */
export function axisOf(word) {
  if (Array.isArray(word)) return word.length === 3 && word.every(Number.isFinite) ? unit(word) : null;
  const m = /^([+-]?)([xyz])$/.exec(String(word || '').trim().toLowerCase());
  if (!m) return null;
  const v = [0, 0, 0];
  v['xyz'.indexOf(m[2])] = m[1] === '-' ? -1 : 1;
  return v;
}

/**
 * THE TURN FROM A FILE'S AXES TO THE APP'S, as a quaternion [x, y, z, w]: applied to the file, its `face`
 * axis lands on +Z and its `panel` axis on +X (made square to the face first). `cells`, where a row gives
 * it, is the side that must land on +Y: the panel axis is turned end for end if it would land on -Y.
 * Null when the row cannot be read (no face, or a panel axis along the face).
 */
export function frameQuat(spec) {
  const z = axisOf(spec && spec.face);
  let x = z && squareTo(axisOf(spec.panel) || [0, 0, 0], z);
  if (!z || !x) return null;
  let y = cross(z, x);
  const cells = spec.cells != null ? axisOf(spec.cells) : null;
  if (cells && dot(y, cells) < 0) { x = scale(x, -1); y = scale(y, -1); }
  // rows x, y, z: the matrix that takes a vector in the file's axes to the app's
  return quatOfRows(x, y, z);
}

/** The quaternion of the rotation matrix whose ROWS are the unit vectors x, y, z (a right-handed set). */
function quatOfRows(x, y, z) {
  const m00 = x[0], m01 = x[1], m02 = x[2], m10 = y[0], m11 = y[1], m12 = y[2], m20 = z[0], m21 = z[1], m22 = z[2];
  const tr = m00 + m11 + m22;
  let q;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, s / 4]; }
  else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; q = [s / 4, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]; }
  else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; q = [(m01 + m10) / s, s / 4, (m12 + m21) / s, (m02 - m20) / s]; }
  else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; q = [(m02 + m20) / s, (m12 + m21) / s, s / 4, (m10 - m01) / s]; }
  return q.map((v) => (Object.is(v, -0) ? 0 : v));
}

/** Turn the vector `v` by the quaternion `q` ([x, y, z, w]). For the tests, and for anyone who wants to see where a file's axis lands. */
export function turn(v, q) {
  const u = [q[0], q[1], q[2]];
  const t = scale(cross(u, v), 2);
  const c = cross(u, t);
  return [v[0] + q[3] * t[0] + c[0], v[1] + q[3] * t[1] + c[1], v[2] + q[3] * t[2] + c[2]];
}

/** The laws this file flies. `sun-panels` is the app's older name for `nadir`. */
export const LAWS = ['nadir', 'geo', 'lvlh', 'sun', 'earth', 'spin'];

/** A spin-stabilised craft with no cited rate turns once in this many seconds. OURS, illustrative: a rate somebody published is on the craft's row (`spin_s`). */
export const DEFAULT_SPIN_S = 30;

/** The angle, radians, a craft spinning once in `periodS` seconds has turned through at `tMs`. A function of the time DRAWN, so the clock scrubs it. */
export function spinAngle(tMs, periodS = DEFAULT_SPIN_S) {
  if (!Number.isFinite(tMs) || !(periodS > 0)) return 0;
  const p = periodS * 1000;
  return (((tMs % p) + p) % p) / p * Math.PI * 2;
}

function basis(z, xHint) {
  const x = squareTo(xHint, z);
  if (!x) return null;
  return { x, y: cross(z, x), z };
}

/**
 * THE APP'S AXES IN THE SCENE under `law`: { x, y, z }, unit vectors, right-handed, or null when the law
 * is not one of these or what it needs is not known (the caller then keeps what it did before).
 *
 * @param {string} law
 * @param {object} d  unit directions in the scene, FROM THE CRAFT: `sun` toward the Sun, `nadir` toward the
 *                    centre of the world it circles, `earth` toward the Earth, `heading` the way it is
 *                    travelling, `north` the north of the sky it is drawn in (the Earth's axis in Earth
 *                    orbit, the ecliptic's pole beyond). `rigid`: a file whose wings cannot turn (see `geo`).
 *                    `angle`: radians about +Z, for `spin`.
 */
export function attitudeAxes(law, d) {
  const sun = unit(d && d.sun);
  const nadir = unit(d && d.nadir);
  switch (law) {
    case 'nadir':
    case 'sun-panels': {
      if (!nadir || !sun) return null;
      // +X square to the Sun and the nadir, signed so that +Y (= Z x X) is on the Sun's side
      const x = unit(cross(sun, nadir));
      return x && Math.abs(dot(sun, nadir)) < 0.99996 ? { x, y: cross(nadir, x), z: nadir } : null;
    }
    case 'geo': {
      const north = unit(d && d.north);
      if (!nadir || !north) return null;
      const b = basis(nadir, north);
      if (!b) return null;
      // A rigid file's cells are on +Y: when the Sun is on the other side, the craft is drawn turned end for end.
      if (d.rigid && sun && dot(b.y, sun) < 0) return { x: scale(b.x, -1), y: scale(b.y, -1), z: b.z };
      return b;
    }
    case 'lvlh': {
      const heading = unit(d && d.heading);
      return nadir && heading ? basis(nadir, heading) : null;
    }
    case 'sun': {
      const north = unit(d && d.north);
      return sun && north ? basis(sun, north) : null;
    }
    case 'earth':
    case 'spin': {
      const earth = unit(d && d.earth);
      if (!earth) return null;
      // +Y as near the Sun as it can be; from the Earth's own distance the Sun is almost behind the dish, so any steady side will do
      const y = squareTo(sun || [0, 1, 0], earth) || squareTo([0, 1, 0], earth) || squareTo([1, 0, 0], earth);
      const b = { x: cross(y, earth), y, z: earth };
      if (law !== 'spin' || !Number.isFinite(d.angle)) return b;
      const c = Math.cos(d.angle), s = Math.sin(d.angle);
      return {
        x: [b.x[0] * c + b.y[0] * s, b.x[1] * c + b.y[1] * s, b.x[2] * c + b.y[2] * s],
        y: [b.y[0] * c - b.x[0] * s, b.y[1] * c - b.x[1] * s, b.y[2] * c - b.x[2] * s],
        z: earth,
      };
    }
    default:
      return null;
  }
}

/**
 * WHICH LAW A DRAWN CRAFT FLIES. `base` is what its shape says (a file's row, or the class default the
 * app's own shapes carry: `sun-panels`, `earth-dish`); the record can change it:
 *   - a craft the app would point at its world and that is GEOSTATIONARY keeps its wings north-south (`geo`);
 *   - a far probe of the app's own making (`earth-dish`) that is in orbit round a world looks down at it and
 *     turns its wings to the Sun (`nadir`), and one that is on its way somewhere points its dish at the Earth
 *     (`earth`). Until 2026-11-16 `earth-dish` was the same rule as `nadir`: the dish looked at whatever the
 *     view was centred on. A file's own law (`earth`, `spin`, `sun`) is its own and is kept in any orbit.
 * Anything else is returned as it came (`ascent`, `up`, `tumble`, `fixed` are scene/models.js's own).
 *
 * @param {string} base
 * @param {{geostationary?: boolean, orbitsWorld?: boolean}} facts
 */
export function lawFor(base, facts = {}) {
  if ((base === 'sun-panels' || base === 'nadir') && facts.geostationary) return 'geo';
  if (base === 'earth-dish') return facts.orbitsWorld ? 'nadir' : 'earth';
  return base;
}

/** The card's words for a law: the key under COPY.drawing.attitude.rules, or null for a law the card says nothing of. */
export function ruleKey(law) {
  if (law === 'sun-panels' || law === 'nadir') return 'nadir';
  if (law === 'earth-dish') return 'earth';
  return LAWS.includes(law) ? law : null;
}
