// moments/director.js -- the camera of a Moment: which shot is on and where it puts the lens (internal spec 0079 C1).
//
// THE CUTS ARE ON THE CLOCK. A shot is an entry of the moment's camera track, `{t, shot, ...}`, and it holds until
// the next one starts, so the picture at any second is a function of that second alone: a scrub, a share link at a
// time and a paused frame all show the same shot the player would have reached by playing. `blend` (play seconds)
// eases from the previous shot instead of cutting; under reduced motion every blend is a cut and no shot drifts on
// its own (`spin`), as the app's flights become instant sets (spec 0079: "cuts instead of camera moves").
//
// THE SHOTS (docs/MOMENTS.md has every field):
//   pad      a fixed camera on the ground near the place, east-north-up metres, looking at a vehicle or a point.
//   track    a fixed ground camera that follows a vehicle and narrows its lens to keep it a share of the frame
//            (`fill`), as the long-focus tracking cameras at the Cape did.
//   chase    a camera riding with a vehicle at an offset in the vehicle's own axes.
//   orbit    a camera on a sphere round a vehicle, azimuth from north and elevation from its horizon.
//   onboard  a camera on the vehicle looking along one of its own directions: the view out of the window.
//   globe    high over the vehicle's ground point, the Earth below and the vehicle in frame.
//   wide     far off, on a direction in the Earth's inertial axes, looking at the Earth, the Moon, both, or a vehicle.
//
// Nothing here knows three.js: positions are [x, y, z] metres in the stage's frame (moments/stage.js), and the
// result is { pos, look, up, fov } for the stage to put on its camera. tests/test_moments.mjs holds it.

import { add, sub, scale, dot, cross, len, norm, fromBasis } from './trajectory.js';
import { lastAt, playOf } from './format.js';

const DEG = Math.PI / 180;
const smooth = (k) => { const x = Math.min(1, Math.max(0, k)); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** The focus of a vehicle shot: a point `lookY` metres up the stack (half its length by default). */
function focusOf(v, s) {
  const y = Number.isFinite(s.lookY) ? s.lookY : v.lengthM / 2;
  return add(v.pos, scale(v.basis[1], y));
}

/** An up vector for a camera at `pos` looking at `look`: `want`, unless the view runs along it. */
function upFor(pos, look, want, spare) {
  const d = norm(sub(look, pos));
  if (Math.abs(dot(d, want)) < 0.97) return want;
  return spare || [0, 1, 0];
}

/** North and east on the horizon of a point whose local vertical is `u` (the stage's +Y is the Earth's north pole). */
function horizonAxes(u) {
  let n = sub([0, 1, 0], scale(u, u[1]));
  if (len(n) < 1e-6) n = [0, 0, -1];
  n = norm(n);
  const e = norm(cross(n, u));
  return { n, e };
}

/**
 * One shot's lens at this second. `world` = { vehicle(id) -> {pos, basis, vel, up, lengthM} | null, place: {toWorld(enu),
 * up}, earth: {centre, radius}, moon: pos | null, dirToWorld(v) }; `held` play seconds since the shot began.
 */
export function evalShot(s, world, held, reduced) {
  const v = world.vehicle(s.vehicle || world.lead) || null;
  const fov0 = Number.isFinite(s.fov) ? s.fov : 40;
  switch (s.shot) {
    case 'pad':
    case 'track': {
      const pos = world.place.toWorld(s.at || [200, 0, 2]);
      const look = s.look ? world.place.toWorld(s.look) : v ? focusOf(v, s) : world.place.toWorld([0, 0, 50]);
      let fov = fov0;
      if (s.shot === 'track' && v) {
        const fill = s.fill > 0 ? s.fill : 0.5;
        const d = len(sub(look, pos));
        fov = 2 * Math.atan((v.lengthM / fill) / 2 / Math.max(d, 1)) / DEG;
        fov = Math.min(s.fovMax || 50, Math.max(s.fovMin || 0.5, fov));
      }
      return { pos, look, up: upFor(pos, look, world.place.up, v ? v.basis[2] : null), fov };
    }
    case 'chase': {
      if (!v) break;
      const pos = add(v.pos, fromBasis(v.basis, s.offset || [0, 0, -200]));
      const look = focusOf(v, s);
      const want = s.up === 'vehicle' ? v.basis[1] : v.up;
      return { pos, look, up: upFor(pos, look, want, v.basis[2]), fov: fov0 };
    }
    case 'orbit': {
      if (!v) break;
      const c = focusOf(v, s);
      const { n, e } = horizonAxes(v.up);
      const az = ((s.az || 0) + (reduced ? 0 : (s.spin || 0) * held)) * DEG, el = (s.el || 0) * DEG;
      const dist = s.dist > 0 ? s.dist : v.lengthM * 3;
      const dir = add(scale(add(scale(n, Math.cos(az)), scale(e, Math.sin(az))), Math.cos(el)), scale(v.up, Math.sin(el)));
      const pos = add(c, scale(dir, dist));
      return { pos, look: c, up: upFor(pos, c, v.up, n), fov: fov0 };
    }
    case 'onboard': {
      if (!v) break;
      const pos = add(v.pos, fromBasis(v.basis, s.at || [0, v.lengthM, 0]));
      const look = add(pos, fromBasis(v.basis, s.dir || [0, 0, 1]));
      const up = norm(fromBasis(v.basis, s.upv || [0, 1, 0]));
      return { pos, look, up: upFor(pos, look, up, v.basis[2]), fov: Number.isFinite(s.fov) ? s.fov : 55 };
    }
    case 'globe': {
      if (!v) break;
      const c = world.earth.centre;
      const u = norm(sub(v.pos, c));
      const { n } = horizonAxes(u);
      const back = (s.backKm || 0) * 1000;
      const along = len(v.vel) > 1 ? norm(sub(v.vel, scale(u, dot(v.vel, u)))) : n;
      const pos = add(add(c, scale(u, world.earth.radius + (s.altKm || 2000) * 1000)), scale(along, -back));
      const look = s.look === 'earth' ? c : v.pos;
      return { pos, look, up: upFor(pos, look, along, n), fov: fov0 };
    }
    case 'wide': {
      const target = s.look === 'moon' && world.moon ? world.moon
        : s.look === 'earth-moon' && world.moon ? scale(add(world.earth.centre, world.moon), 0.5)
          : s.look === 'vehicle' && v ? v.pos : world.earth.centre;
      const dir = norm(world.dirToWorld(s.dir || [1, 0, 0.3]));
      const pos = add(target, scale(dir, (s.distKm || 60000) * 1000));
      return { pos, look: target, up: upFor(pos, target, [0, 1, 0], [1, 0, 0]), fov: fov0 };
    }
    default: break;
  }
  // A vehicle shot with no vehicle (its model still loading, or a typo the validator missed): the place, from afar.
  const look = world.place.toWorld([0, 0, 30]);
  const pos = world.place.toWorld([600, -900, 40]);
  return { pos, look, up: world.place.up, fov: 35 };
}

/**
 * The lens at mission second t: the shot in force (the camera track's last entry at or before t), eased from the one
 * before it over its `blend` play seconds. Returns { pose, index, shot }.
 */
export function directAt(cam, world, t, table, reduced = false) {
  const i = Math.max(0, lastAt(cam, t));
  const s = cam[i];
  const p = playOf(table, t);
  const held = p - playOf(table, s.t);
  let pose = evalShot(s, world, held, reduced);
  if (!reduced && i > 0 && s.blend > 0 && held < s.blend) {
    const prev = evalShot(cam[i - 1], world, p - playOf(table, cam[i - 1].t), reduced);
    const k = smooth(held / s.blend);
    pose = { pos: lerp(prev.pos, pose.pos, k), look: lerp(prev.look, pose.look, k), up: norm(lerp(prev.up, pose.up, k)), fov: prev.fov + (pose.fov - prev.fov) * k };
  }
  return { pose, index: i, shot: s };
}

/** A visitor's own camera round a point: azimuth and elevation in radians about `up`, at `dist`. */
export function freePose(centre, up, az, el, dist, fov = 40) {
  const { n, e } = horizonAxes(up);
  const dir = add(scale(add(scale(n, Math.cos(az)), scale(e, Math.sin(az))), Math.cos(el)), scale(up, Math.sin(el)));
  const pos = add(centre, scale(dir, dist));
  return { pos, look: centre, up: upFor(pos, centre, up, n), fov };
}

/** The azimuth, elevation and distance of a pose about a centre: where a visitor's drag starts from. */
export function poseAngles(pose, centre, up) {
  const { n, e } = horizonAxes(up);
  const d = sub(pose.pos, centre);
  const dist = len(d) || 1;
  const u = scale(d, 1 / dist);
  return { az: Math.atan2(dot(u, e), dot(u, n)), el: Math.asin(Math.max(-1, Math.min(1, dot(u, up)))), dist };
}
