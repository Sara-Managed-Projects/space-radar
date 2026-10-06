// scene/framing.js -- where the camera stops when it arrives at something: the limb of the world in
// view for an Earth orbiter, and the whole Solar System for the Planets tab (spec 0061 req 9).
//
// Contract: limbFraming({ r, R, distance, fovDeg, heightPx, subjectPx, upDot, room }) -> { distance, tilt, limb, worldBelow } | null
//           limbAt(r, R, d, tilt) -> { g, theta, rho, cameraR } | null
//           fitDistance(points, project, { lo, hi, band, margin }) -> distance
//           litOffset(sun, up, phase, prefer) -> { x, y, z } | null   (unit, from a world's centre to the camera)
// Pure: plain numbers in, plain numbers out, no three.js, so tests/test_framing.mjs can hold them.
//
// WHY LIMB FRAMING. An arrival used to put the camera on the far side of the object from the world,
// tilted 0.6 rad off the radial (scene/camera.js FRAMING_TILT), at the distance where the selected
// model is drawn at its full 260 px (scene/heroes.js closeUpDistance). For the ISS that is 1 407 km
// back, looking down: MEASURED 2026-10-02 in headless Chrome at 1440x900, the Earth filled 95 % of
// the screen and 14 % of its limb was on screen, in the corners -- the station on a wall of texture,
// with nothing to say it is 420 km up. Row D of the design canvas, and every photograph of the
// station anybody remembers, has the curve of the Earth in the picture.
//
// So the distance stays (the model keeps its size) and the ANGLE is solved for: the camera swings
// round the object in the plane camera.js already uses (the radial and the camera's up) until the
// limb crosses the screen a set share of the half-height away from the subject -- below it, with
// the subject against space, where that can be done; above it, with the subject over the ground,
// where it cannot (a launch pad is ON the ground: no camera sees it against space). The share keeps
// the limb clear of the model (subjectPx), and a framing whose limb is off the screen is refused.
//
// THE RIGHT WAY UP. camera.js tilts TOWARD the camera's up, and from there the world's centre is
// above the subject on screen. MEASURED with the first version of this file: the ISS framed with
// the limb in view and the Earth hanging from the top of the screen. So both sides of the plane are
// searched (a negative tilt is the side away from the up, as framingAngles reads it) and a pose with
// the world below is preferred. The camera's up is not turned to make one: the visitor's own up is
// what every later drag, trip and home view is read in, and a roll would carry into all of them.
// That leaves a subject far south of the up's equator with no way-up pose at its own distance, and
// there the world above (WORLD_ABOVE_COST) is taken before standing ten times farther back. The up
// is also the axis the picture is rolled around: a view that looks along it has no "below" at all,
// so no pose closer than MIN_UP_ANGLE to it is taken (`upDot`, the cosine between the radial and
// the up, says where that is).
// When no angle works at that distance the camera stands farther back, in steps, which is also the
// floor for small bodies: nothing is framed from closer than MIN_RADII of its world's radius.
//
// Every number is in the stage's own units; only ratios matter here.

/** The camera never arrives closer than this share of the world's radius (a "small body" floor). */
export const MIN_RADII = 0.05;
/** Where the limb should cross: this share of the half-height from the subject, room allowing. */
export const LIMB_SHARE = 0.42;
/** And never beyond this share: past it the limb is at the screen's edge, or off it. */
export const LIMB_MAX_SHARE = 0.85;
/** Pixels between the drawn model's edge and the limb. */
export const LIMB_MARGIN_PX = 40;
/** Farther than this many world radii from its centre, the world is a dot and there is no limb. */
export const LIMB_RANGE_RADII = 28;
/** The arrival tilt camera.js uses when nothing better is known (its FRAMING_TILT). */
export const DEFAULT_TILT = 0.6;
/** No view closer than this to the camera's up: along it the picture's roll is undefined. */
export const MIN_UP_ANGLE = (30 * Math.PI) / 180;
/** What a pose with the world above the subject costs, in shares of the half-height. */
export const WORLD_ABOVE_COST = 0.2;
/** And one with the subject over the ground rather than against space. */
export const OVER_GROUND_COST = 0.1;

const DIST_STEPS = [1, 1.25, 1.6, 2, 2.5, 3.2, 4, 5, 6.4, 8, 10, 13, 16];
const TILT_MIN = 0.03;
const TILT_MAX = 1.75;
const TILT_STEP = 0.01;
/** The camera keeps out of the world by this factor of its radius (camera.js WORLD_CLEARANCE). */
const CLEARANCE = 1.02;

/**
 * The limb's place for one candidate pose, in the plane of the radial (x) and the camera's up (y),
 * the world's centre at the origin and the subject at (r, 0). Returns null when the pose is not
 * allowed: the camera inside the clearance, or the subject hidden behind the world.
 *   g     the limb's angle from the view's centre, + when the subject is against space (the limb
 *         below it, toward the world), - when the subject is over the world (the limb beyond it)
 */
export function limbAt(r, R, d, tilt) {
  const cx = r + d * Math.cos(tilt);
  const cy = d * Math.sin(tilt);
  const c = Math.hypot(cx, cy);
  if (!(c > R * CLEARANCE)) return null;
  // The view runs from the camera to the subject: v = -(cos, sin). The world's centre is at -C.
  const cosTheta = (Math.cos(tilt) * cx + Math.sin(tilt) * cy) / c;
  const theta = Math.acos(Math.max(-1, Math.min(1, cosTheta)));
  const rho = Math.asin(Math.min(1, R / c));
  const g = theta - rho;
  if (g < 0) {
    // The line of sight meets the world; the subject must be in front of where it does.
    const along = c * cosTheta;
    const off2 = Math.max(0, c * c - along * along);
    const enter = along - Math.sqrt(Math.max(0, R * R - off2));
    if (d > enter * 1.001 + 1e-9) return null;
  }
  return { g, theta, rho, cameraR: c };
}

/**
 * The arrival for a thing at distance `r` from the centre of a world of radius `R`, starting from
 * the distance the caller would use (`distance`). Null when the world is too far to have a limb in
 * the picture (LIMB_RANGE_RADII) or nothing fits; the caller keeps its own framing then.
 *   fovDeg     the camera's vertical field of view
 *   heightPx   the view's height in CSS pixels
 *   subjectPx  how wide the subject is drawn, across its bounding circle. A selected model is held
 *              at that size well past the distance asked for (heroes.js caps it by the largest
 *              reach any model has, and the ISS's is smaller), so it is taken as constant here
 *   room       { above, below }: pixels from the subject to the nearest chrome above and below it
 *              (a phone's sheet, its top bar); the limb is kept inside them. Default half the view.
 *   upDot      the cosine between the radial and the camera's up (THE RIGHT WAY UP)
 * Returns { distance, tilt, limb, worldBelow } with `limb` the share of the half-height at which
 * the limb crosses, signed as limbAt's g.
 */
export function limbFraming({ r, R, distance, fovDeg = 45, heightPx = 800, subjectPx = 260, upDot = 0, room = null } = {}) {
  if (!(R > 0) || !(r > 0) || !(distance > 0) || !(heightPx > 0)) return null;
  if (r > R * LIMB_RANGE_RADII) return null;
  const tanHalf = Math.tan(((fovDeg * Math.PI) / 180) / 2);
  const half = heightPx / 2;
  const aboveRoom = room && room.above > 0 ? Math.min(room.above, heightPx) : half;
  const belowRoom = room && room.below > 0 ? Math.min(room.below, heightPx) : half;
  const d0 = Math.max(distance, R * MIN_RADII);
  // The up, in the plane's own axes (x the radial, y the side AWAY from the up): a, b.
  const a = Math.max(-1, Math.min(1, Number.isFinite(upDot) ? upDot : 0));
  const b = -Math.sqrt(1 - a * a);
  const maxAlong = Math.cos(MIN_UP_ANGLE);
  let best = null;
  for (const k of DIST_STEPS) {
    const d = d0 * k;

    for (let t = -TILT_MAX; t <= TILT_MAX; t += TILT_STEP) {
      if (Math.abs(t) < TILT_MIN) continue;
      // The view is -(cos t, sin t); its part along the up, and the radial's part along the
      // screen's up (positive: the world is below the subject).
      const along = -(Math.cos(t) * a + Math.sin(t) * b);
      if (Math.abs(along) > maxAlong) continue;
      const below = Math.sin(t) * (a * Math.sin(t) - b * Math.cos(t)) > 0;
      const at = limbAt(r, Math.min(R, r), d, Math.abs(t));
      if (!at) continue;
      const px = (Math.tan(Math.abs(at.g)) / tanHalf) * half;
      // The limb is on the world's side of the subject when the subject is against space, on the
      // far side when the subject is over the ground; which of those is down is `below`.
      const limbDown = (at.g > 0) === below;
      const side = limbDown ? belowRoom : aboveRoom;
      const maxPx = Math.min(LIMB_MAX_SHARE * half, 0.85 * side);
      // Where the limb may cross, in pixels from the subject: clear of the model, inside the free
      // band, and LIMB_SHARE of the half-height when there is room for it. Where the band is
      // narrower than the model (a phone with the card up), the limb may pass behind the model's
      // edge rather than leave the picture: in view is the requirement, clear of it a nicety.
      const minPx = Math.min(subjectPx / 2 + LIMB_MARGIN_PX, 0.6 * side);
      if (px < minPx || px > maxPx) continue;
      const wantPx = Math.min(Math.max(LIMB_SHARE * half, minPx), maxPx);
      // Nearest the wanted place; the world below before above; the subject against space before
      // over the ground; the nearer camera before the farther, which draws the model smaller.
      const cost = Math.abs(px - wantPx) / half + (below ? 0 : WORLD_ABOVE_COST) + (at.g < 0 ? OVER_GROUND_COST : 0)
        + 0.15 * Math.log2(k);
      // camera.js's tilt runs TOWARD the up: this plane's y is away from it, so the sign turns.
      if (!best || cost < best.cost) best = { cost, distance: d, tilt: -t, limb: Math.sign(at.g) * (px / half), below };
    }
    // A pose at the caller's own distance that is good enough ends the search: the model keeps
    // its full size.
    if (best && best.cost < 0.15) break;
  }
  return best ? { distance: best.distance, tilt: best.tilt, limb: best.limb, worldBelow: best.below } : null;
}

/**
 * The distance at which every one of `points` (scene units, relative to the target the camera looks
 * at) is inside the view, looked at from `polar` radians above the plane of their orbits and an
 * azimuth chosen by the caller. `band` is the share of the view's width and height left free of
 * chrome ({ w, h }, 1 = all of it); the fit is to that band, with a margin. The points are projected
 * after the camera turns, so this is solved by bisection on the distance: the view's own rule, not
 * an approximation of it. Pure: `project(point, distance)` is supplied by the caller (so the test
 * can use a plain pinhole) and returns {x, y} in -1..1 normalised device coordinates, or null when
 * the point is behind the camera.
 */
export function fitDistance(points, project, { lo = 1, hi = 1e7, band = { w: 1, h: 1 }, margin = 0.88 } = {}) {
  const pts = (Array.isArray(points) ? points : []).filter(Boolean);
  if (!pts.length || typeof project !== 'function') return null;
  const limX = Math.max(0.1, band.w) * margin;
  const limY = Math.max(0.1, band.h) * margin;
  const fits = (d) => pts.every((p) => {
    const q = project(p, d);
    return q && Math.abs(q.x) <= limX && Math.abs(q.y) <= limY;
  });
  if (!fits(hi)) return hi;
  let a = lo;
  let b = hi;
  if (fits(a)) return a;
  for (let i = 0; i < 60; i++) {
    const m = Math.sqrt(a * b);
    if (fits(m)) b = m; else a = m;
    if (b / a < 1.002) break;
  }
  return b;
}

/** The share of the free band a world's disc may span on arrival. */
export const DISC_FILL = 0.8;

/**
 * How far from a world's centre the camera must stand for its whole disc to sit inside the free
 * part of the view: `shareV` and `shareH` are the free band's height and width as shares of the
 * view's (1 = all of it). Pure. A world was framed at 3.5 radii whatever the screen: on a desktop
 * that is the Moon at 73 % of the height, and MEASURED 2026-10-02 at 390x844 it was a disc twice as
 * wide as the phone, its limb off both sides, the reticle dropped because the box was wider than
 * the view. The narrower of the two directions decides.
 */
export function discDistance(radius, { fovDeg = 45, aspect = 1, shareV = 1, shareH = 1, fill = DISC_FILL } = {}) {
  if (!(radius > 0)) return 0;
  const tanV = Math.tan(((fovDeg * Math.PI) / 180) / 2);
  const tanH = tanV * (aspect > 0 ? aspect : 1);
  const v = Math.atan(tanV * Math.max(0.1, Math.min(1, shareV)) * fill);
  const h = Math.atan(tanH * Math.max(0.1, Math.min(1, shareH)) * fill);
  return radius / Math.sin(Math.min(v, h));
}

/**
 * How far round from the Sun's side the camera stands when it arrives at a world, radians: 0.6 is a
 * gibbous disc, 91 % of it lit ((1 + cos 0.6) / 2), with the terminator on screen so craters and
 * mountains near it throw shadows. Straight down the sunlight (0) is a full disc with no relief.
 */
export const ARRIVAL_PHASE = 0.6;

/**
 * The direction from a world's centre to the arriving camera, so that it meets the LIT face (issue
 * #419). MEASURED 2026-10-03 on the live map: flying to Jupiter, Saturn, Mars, Pluto and Ganymede
 * framed the dark hemisphere -- the rig's default arrival is "beyond the subject, looking back at
 * the stage's world" (camera.js framingAngles), which for anything farther from the Sun than the
 * stage is the night side. This is the Sun's direction turned `phase` round the camera's up, so
 * the terminator is upright on the right of the disc and the picture keeps its horizon. Pure.
 *
 * WHICH SIDE OF THE SUN'S DIRECTION (2026-10-07, internal #426). Turning the other way round the
 * same up is as good a picture -- the terminator upright on the LEFT -- and shows a different
 * quarter of the world. Pluto arrived with its heart behind the limb, on a day the heart was in
 * sunlight. So a world may name the face it is known by (`prefer`, from its centre, any length:
 * scene/worlds.js faceDirOf), and when that face is on the lit hemisphere the camera takes
 * whichever of the two sides sees more of it. A face in the dark changes nothing: the lit side is
 * the rule and the face is only the tie-break.
 *
 * @param {{x:number,y:number,z:number}} sun  from the world toward the Sun, any length
 * @param {{x:number,y:number,z:number}} up   the camera's up, any length
 * @param {number} [phase]
 * @param {{x:number,y:number,z:number}|null} [prefer]  from the world's centre to the face it is known by
 * @returns {{x:number,y:number,z:number}|null} unit vector, or null when there is no Sun direction
 */
export function litOffset(sun, up, phase = ARRIVAL_PHASE, prefer = null) {
  if (!sun) return null;
  const sl = Math.hypot(sun.x, sun.y, sun.z);
  if (!(sl > 0)) return null;
  const s = { x: sun.x / sl, y: sun.y / sl, z: sun.z / sl };
  let u = up && Math.hypot(up.x, up.y, up.z) > 0 ? up : { x: 0, y: 1, z: 0 };
  // side = up x sun; when the Sun is along up, any perpendicular does.
  let side = { x: u.y * s.z - u.z * s.y, y: u.z * s.x - u.x * s.z, z: u.x * s.y - u.y * s.x };
  let l = Math.hypot(side.x, side.y, side.z);
  if (l < 1e-6) {
    u = Math.abs(s.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 0, z: 1 };
    side = { x: u.y * s.z - u.z * s.y, y: u.z * s.x - u.x * s.z, z: u.x * s.y - u.y * s.x };
    l = Math.hypot(side.x, side.y, side.z);
  }
  const c = Math.cos(phase);
  let k = Math.sin(phase) / l;
  if (prefer && prefer.x * s.x + prefer.y * s.y + prefer.z * s.z > 0
    && prefer.x * side.x + prefer.y * side.y + prefer.z * side.z < 0) k = -k;
  return { x: s.x * c + side.x * k, y: s.y * c + side.y * k, z: s.z * c + side.z * k };
}

// --- an arrival at a point on the Earth's own ground (internal #420) -----------------------------
//
// SEEN 2026-10-06 by the regression walk: the home's first line flew to a storm on the night side
// and showed a black screen with a label on nothing; a launch from Coming up arrived a few tens of
// kilometres over its pad, where the day map (about 5 km to a pixel at its best) is a blur. Both
// are the first things a visitor presses. Two rules, pure, and main.js flyToRecord applies them:
//
//   1. NO NEARER THAN THE MAP CAN BEAR: the distance at which one screen pixel is one map pixel.
//   2. AT NIGHT THE WHOLE EARTH, TURNED SO THE EDGE OF DAYLIGHT IS IN THE PICTURE: the camera looks
//      at the Earth's centre from the home view's distance, over the point when it is in twilight,
//      and leaning toward the Sun by as much as it takes (and no more than NIGHT_MAX_LEAN, past
//      which the point is on the limb) when it is deeper in the night. Nothing is lit that the Sun
//      does not light: the point is where its mark and the city lights say, and the day is beside it.

/** The day map's ground sample at its best, kilometres to a pixel, as internal #420 measured it. */
export const GROUND_KM_PER_PX = 5;
/** The floor and the ceiling of a ground arrival, kilometres above the ground. */
export const GROUND_MIN_KM = 3000;
export const GROUND_MAX_KM = 8000;
/** Below this cosine of the Sun's zenith angle (96 degrees: the end of civil twilight) the ground is dark. */
export const NIGHT_COS = Math.cos((96 * Math.PI) / 180);
/** Where the camera's own ground point is kept, as a zenith angle of the Sun: the terminator is then 25 degrees from the disc's middle. */
export const NIGHT_VIEW_ZENITH = (115 * Math.PI) / 180;
/** The camera never leans farther from the point than this: at 55 degrees it is 82 % of the way to the limb. */
export const NIGHT_MAX_LEAN = (55 * Math.PI) / 180;

/** How far above the ground the camera stands for one screen pixel to be one map pixel. Pure, kilometres. */
export function groundDistanceKm(heightPx, fovDeg = 45, kmPerPx = GROUND_KM_PER_PX) {
  const h = heightPx > 0 ? heightPx : 800;
  const d = (kmPerPx * h) / (2 * Math.tan(((fovDeg * Math.PI) / 180) / 2));
  return Math.max(GROUND_MIN_KM, Math.min(GROUND_MAX_KM, d));
}

/**
 * The night arrival: null in daylight and twilight, else the unit direction from the Earth's
 * centre to the camera and how far it leans from the point toward the Sun. Pure.
 * @param {{x,y,z}} point  from the world's centre to the place, any length
 * @param {{x,y,z}} sun    from the world toward the Sun, any length
 * @returns {{offset:{x:number,y:number,z:number}, lean:number, zenith:number}|null}
 */
export function nightGroundPose(point, sun) {
  if (!point || !sun) return null;
  const pl = Math.hypot(point.x, point.y, point.z);
  const sl = Math.hypot(sun.x, sun.y, sun.z);
  if (!(pl > 0) || !(sl > 0)) return null;
  const p = { x: point.x / pl, y: point.y / pl, z: point.z / pl };
  const s = { x: sun.x / sl, y: sun.y / sl, z: sun.z / sl };
  const cosZ = Math.max(-1, Math.min(1, p.x * s.x + p.y * s.y + p.z * s.z));
  if (cosZ >= NIGHT_COS) return null;
  const zenith = Math.acos(cosZ);
  const lean = Math.max(0, Math.min(NIGHT_MAX_LEAN, zenith - NIGHT_VIEW_ZENITH));
  // The part of the Sun's direction square to the point; at local midnight any perpendicular does.
  let q = { x: s.x - cosZ * p.x, y: s.y - cosZ * p.y, z: s.z - cosZ * p.z };
  let ql = Math.hypot(q.x, q.y, q.z);
  if (ql < 1e-6) {
    const a = Math.abs(p.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    q = { x: a.y * p.z - a.z * p.y, y: a.z * p.x - a.x * p.z, z: a.x * p.y - a.y * p.x };
    ql = Math.hypot(q.x, q.y, q.z);
  }
  const c = Math.cos(lean);
  const k = Math.sin(lean) / ql;
  return { offset: { x: p.x * c + q.x * k, y: p.y * c + q.y * k, z: p.z * c + q.z * k }, lean, zenith };
}

// --- the opening (public #287) -------------------------------------------------------------------
//
// A first visit used to land on a still Earth. It now eases in: the same scene, from OPENING_FROM
// times the home view's distance, in OPENING_MS. No splash, no words, nothing to press; a touch on
// the camera ends it where it is. Never under reduced motion, never for a link to somewhere (the
// link's own flight is the arrival), never in an embed, and once per visitor.

export const OPENING_FROM = 2.4;
export const OPENING_MS = 2400;
export const OPENING_KEY = 'sr:opening';

/** Whether the opening plays, and how: null, or { from, ms }. Pure. */
export function openingPlan({ seen = false, link = false, reducedMotion = false, embed = false, hidden = false, automated = false } = {}) {
  // `automated`: a browser driven by a test or a screenshot job (navigator.webdriver) wants the settled
  // home view on its first frame. CI's "is the Earth drawn" check read a globe 3.9 % of the frame mid-opening.
  if (seen || link || reducedMotion || embed || hidden || automated) return null;
  return { from: OPENING_FROM, ms: OPENING_MS };
}
