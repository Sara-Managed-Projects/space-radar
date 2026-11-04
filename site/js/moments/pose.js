// moments/pose.js -- a part that moves on its vehicle, and a vehicle that moves on its host (release 1.7.7, internal #1058).
//
// Two pieces of animation the player did not have, both pure maths so that a test can ask them without a browser:
//
//   PART POSES   A part event `{t, part, action: "pose", about, pos, quat, scale, ease}` is one KEYFRAME of the part's own pose, in the
//                vehicle's frame (metres): the point `about` stays, the part is scaled by `scale` along the vehicle's axes, turned by the
//                unit quaternion `quat` [x, y, z, w] and moved by `pos`. Hubble's arrays unroll by a scale along the tube; the arm's links
//                turn about their joints. Before its first keyframe a part holds the first one; after the last it holds the last; between two
//                it is linear, or smooth (`ease: "smooth"` on the later one). `about` is the first keyframe's.
//   CARRIER      A vehicle's `rideOn.keys` is `[{t, at, quat}]`: the point and the turn, in the host's axes, the rider has at each second (the
//                telescope lifted out of the bay on the arm). `at` and the quaternion are interpolated the same way.
//
// Nothing here is drawn; moments/player.js asks it for the matrix of a part and the pose of a rider every frame.

const smooth = (u) => u * u * (3 - 2 * u);

/** The keyframe pair round `t` and how far between them (0..1, eased by the later key's own `ease`). */
function between(keys, t) {
  if (!keys.length) return null;
  if (t <= keys[0].t) return { a: keys[0], b: keys[0], u: 0 };
  const last = keys[keys.length - 1];
  if (t >= last.t) return { a: last, b: last, u: 0 };
  let i = 1;
  while (keys[i].t < t) i += 1;
  const a = keys[i - 1], b = keys[i];
  let u = (t - a.t) / (b.t - a.t);
  if (b.ease === 'smooth') u = smooth(u);
  return { a, b, u };
}

const lerp3 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];

/** Spherical interpolation of two unit quaternions [x, y, z, w] (the short way). */
export function slerp(a, b, u) {
  let [bx, by, bz, bw] = b;
  let c = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
  if (c < 0) { c = -c; bx = -bx; by = -by; bz = -bz; bw = -bw; }
  let k0 = 1 - u, k1 = u;
  if (c < 0.9995) { const th = Math.acos(c), s = Math.sin(th); k0 = Math.sin((1 - u) * th) / s; k1 = Math.sin(u * th) / s; }
  const q = [k0 * a[0] + k1 * bx, k0 * a[1] + k1 * by, k0 * a[2] + k1 * bz, k0 * a[3] + k1 * bw];
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return q.map((x) => x / n);
}

/** The 3 x 3 matrix of a unit quaternion, as three COLUMNS (the images of the axes x, y, z). */
export function quatColumns(q) {
  const [x, y, z, w] = q;
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w)],
    [2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w)],
    [2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y)],
  ];
}

/** A unit quaternion from an axis (any length) and an angle in degrees. */
export function quatAxis(axis, deg) {
  const n = Math.hypot(axis[0], axis[1], axis[2]) || 1, h = deg * Math.PI / 360, s = Math.sin(h) / n;
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(h)];
}

/** The product a * b of two quaternions (b first, then a). */
export function quatMul(a, b) {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

/** The part events of one part that are keyframes, in time order. */
export function poseKeys(events) {
  return (events || []).filter((e) => e.action === 'pose');
}

/**
 * A part's pose at t from its keyframes, given its centre (vehicle frame): the three columns of its matrix (each the image of a part axis,
 * in the vehicle's frame, scale included) and where its centre now is (vehicle frame). Null when the part has no keyframes.
 */
export function partPoseAt(keys, centre, t) {
  const s = between(keys, t);
  if (!s) return null;
  const q = slerp(s.a.quat || [0, 0, 0, 1], s.b.quat || [0, 0, 0, 1], s.u);
  const sc = lerp3(s.a.scale || [1, 1, 1], s.b.scale || [1, 1, 1], s.u);
  const pos = lerp3(s.a.pos || [0, 0, 0], s.b.pos || [0, 0, 0], s.u);
  const about = keys[0].about || [0, 0, 0];
  const R = quatColumns(q);
  // M = R * S: S scales along the vehicle's axes, R then turns; the image of the axis e_k is sc_k times the k-th column of R
  const cols = [0, 1, 2].map((k) => R[k].map((x) => x * sc[k]));
  const d = [centre[0] - about[0], centre[1] - about[1], centre[2] - about[2]];
  const sd = [d[0] * sc[0], d[1] * sc[1], d[2] * sc[2]];
  const rd = [0, 1, 2].map((r) => R[0][r] * sd[0] + R[1][r] * sd[1] + R[2][r] * sd[2]);
  return { cols, centre: [about[0] + rd[0] + pos[0], about[1] + rd[1] + pos[1], about[2] + rd[2] + pos[2]] };
}

/** A rider's `at` and quaternion at t from `rideOn.keys` (null when it has none). */
export function carrierAt(keys, t) {
  const s = between(keys || [], t);
  if (!s) return null;
  return { at: lerp3(s.a.at || [0, 0, 0], s.b.at || [0, 0, 0], s.u), quat: slerp(s.a.quat || [0, 0, 0, 1], s.b.quat || [0, 0, 0, 1], s.u) };
}
