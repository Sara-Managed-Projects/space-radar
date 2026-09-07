// scene/camera.js — damped orbit controls + eased flights.
//
// Contract (tests/test_contract.mjs):
//   createCameraRig(camera, domElement) -> { update(dt), flyTo({targetScene, distance, ms}),
//                                            follow(getPosFn), stopFollow(), onUserInput(fn), state }
//
// No OrbitControls: three's examples are not vendored and there is no build step. This is a small
// spherical-orbit controller written against pointer events, with exponential damping that gives
// both smoothing while dragging and coasting after release.
//
// Units: scene units throughout (km / stage.unitKm). Angles radians. Time: `dt` is seconds; a
// value that looks like milliseconds is converted, because main.js may hand either.
//
// prefers-reduced-motion: flights become an instant set plus a fade the UI can hook, either via
// the `camera-fade` CustomEvent on domElement or via onFade(fn).
//
// A flight ends EXACTLY ONCE and always says how. `onArrive(reason)` gets 'done' when the flight
// reached its destination and 'skipped' when finishFlight() collapsed it there. A flight that was
// ended without arriving calls `onCancel(reason)` if the caller supplied one and `onArrive(reason)`
// otherwise, with 'cancelled' (user input) or 'replaced' (a second flyTo). Before this, both flyTo
// and a pointer drag dropped a live flight's onArrive silently, which hangs anything driven by
// arrivals the first time somebody touches the canvas.
//
// THE TRAP: under prefers-reduced-motion, and for `ms: 0`, a flight arrives SYNCHRONOUSLY --
// onArrive fires before flyTo returns. `onArrive: () => flyTo(next)` is then a recursive call
// chain: a whole itinerary inside one tick with no frame drawn, and a stack overflow if it loops.
// It fails only for the people the accessibility flag protects, so it survives every manual test.
// The rig makes the overflow impossible -- a completion callback never runs inside another one, so
// such a chain advances one step per update() -- but that is a floor, not a feature: a caller with
// an itinerary still schedules its next stop (requestAnimationFrame or a timeout) with a generation
// guard, because the rig can bound the stack and cannot invent the caller's pacing. orbit()'s
// onDone is always deferred to a later update() and can never be synchronous at all.

import * as THREE from '../../vendor/three.module.min.js';

// docs/design-language.md: camera motion is always eased, cubic-bezier(0.2, 0.8, 0.2, 1),
// 600-900 ms, never a cut.
const EASE = [0.2, 0.8, 0.2, 1];
const DEFAULT_FLIGHT_MS = 750;
const REDUCED_FADE_MS = 220;

// Damping time constant. Smaller is snappier, larger coasts longer.
const TAU_ORBIT = 0.10;
const TAU_DOLLY = 0.12;
const TAU_PAN = 0.09;

// A world is never entered: the closest the camera may come to the stage's world centre is
// radius * 1.02 (spec 0005 design, "Camera").
const WORLD_CLEARANCE = 1.02;

const EPS_POLAR = 1e-4;
const MIN_MOVE = 1e-7;

// The first two thirds of a flight keep the old target — that is what "keeps Earth in frame until
// the last third" means in practice (docs/design-language.md, Motion).
const TARGET_DELAY = 0.34;

// Angle between the arrival view direction and the world-to-object radial. 0 would put the world
// exactly behind the object and read as a flat nadir shot; ~34 degrees frames it.
const FRAMING_TILT = 0.6;

/** cubic-bezier(x1,y1,x2,y2) as CSS defines it, solved by Newton-Raphson on x. */
function cubicBezier(x1, y1, x2, y2) {
  const ax = 1 - 3 * x2 + 3 * x1;
  const bx = 3 * x2 - 6 * x1;
  const cx = 3 * x1;
  const ay = 1 - 3 * y2 + 3 * y1;
  const by = 3 * y2 - 6 * y1;
  const cy = 3 * y1;
  const calcX = (t) => ((ax * t + bx) * t + cx) * t;
  const calcY = (t) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (!(x > 0)) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const err = calcX(t) - x;
      if (Math.abs(err) < 1e-6) break;
      const d = slopeX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;
    }
    return calcY(t);
  };
}

const ease = cubicBezier(EASE[0], EASE[1], EASE[2], EASE[3]);

// Named curves for opts.ease. 'ui' is the shipped one and stays the default, so no existing call
// changes. The other three exist because one curve cannot serve every length of move:
//   inout   cubic-bezier(0.65, 0, 0.35, 1) -- symmetric, rest to rest. A dolly, up to ~3 s.
//   cruise  15% accelerate / 70% constant / 15% decelerate. Above ~3 s a cubic ease is nearly
//           stationary at both ends and blurs through the middle; Celestia's `goto` ships 10/80/10
//           for the same reason.
//   linear  no ease at all. An eased turn around an object reads as a wobble, not as a move.
const CRUISE_ACCEL = 0.15;
const CRUISE_DECEL = 0.15;

/** Trapezoidal velocity: constant acceleration, cruise, constant deceleration. Area normalised. */
function cruise(x) {
  if (!(x > 0)) return 0;
  if (x >= 1) return 1;
  const a = CRUISE_ACCEL;
  const d = CRUISE_DECEL;
  const c = 1 - a - d;
  const v = 1 / (a / 2 + c + d / 2); // peak velocity that makes the whole area 1
  if (x < a) return (v * x * x) / (2 * a);
  if (x < a + c) return v * (a / 2 + (x - a));
  const u = x - a - c;
  return v * (a / 2 + c + u - (u * u) / (2 * d));
}

const EASES = {
  ui: ease,
  inout: cubicBezier(0.65, 0, 0.35, 1),
  cruise,
  linear: (x) => (x > 0 ? (x < 1 ? x : 1) : 0),
};

function easeFor(name) {
  if (typeof name === 'function') return name;
  return EASES[name] || ease;
}

// A drift around a stop: slow enough to read, fast enough not to look broken. 4-8 deg/s is the
// usable band; a product turntable is 18-30 deg/s, which is 3-5x too fast for someone reading.
const DEFAULT_ORBIT_DEG_S = 6;

function prefersReducedMotion() {
  try {
    return (
      typeof globalThis.matchMedia === 'function' &&
      globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    return false;
  }
}

function shortestAngle(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function toVector3(v, out) {
  if (!v) return null;
  if (v.isVector3) return out.copy(v);
  if (typeof v.x === 'number') return out.set(v.x, v.y, v.z);
  if (Array.isArray(v) && v.length >= 3) return out.set(v[0], v[1], v[2]);
  return null;
}

/**
 * @param {THREE.PerspectiveCamera} camera
 * @param {HTMLElement} domElement
 * @param {object} [options]
 *   worldRadius      {number}   scene units; distance is clamped to worldRadius * 1.02
 *   worldCentre      {Vector3}  scene position of the world being orbited (default 0,0,0)
 *   minDistance/maxDistance {number}
 *   rotateSpeed/dollySpeed/panSpeed {number}
 *   onFade           {function(ms)} called instead of a flight under prefers-reduced-motion
 */
export function createCameraRig(camera, domElement, options = {}) {
  const target = new THREE.Vector3();
  const pendingPan = new THREE.Vector3();
  const worldCentre = new THREE.Vector3();
  toVector3(options.worldCentre, worldCentre);

  let azimuth = 0;
  let polar = Math.PI / 2;
  let distance = 1;

  let dAz = 0;
  let dPolar = 0;
  let dLogDist = 0;

  // Basis that maps camera.up onto +Y, so the rig works in a Z-up frame (earth-inertial) as well
  // as three's default Y-up.
  const upQuat = new THREE.Quaternion();
  const upQuatInv = new THREE.Quaternion();
  const lastUp = new THREE.Vector3(0, 0, 0);
  const Y_UP = new THREE.Vector3(0, 1, 0);

  const state = {
    target,
    azimuth,
    polar,
    distance,
    worldRadius: Number(options.worldRadius) || 0,
    worldCentre,
    minDistance: Number(options.minDistance) || 1e-4,
    maxDistance: Number(options.maxDistance) || Infinity,
    rotateSpeed: options.rotateSpeed ?? 1,
    dollySpeed: options.dollySpeed ?? 1,
    panSpeed: options.panSpeed ?? 1,
    following: false,
    flying: false,
    orbiting: false,
    reducedMotion: prefersReducedMotion(),
    userInteracting: false,
  };

  const inputListeners = new Set();
  const fadeListeners = new Set();

  let followFn = null;
  const followPos = new THREE.Vector3();
  let flight = null;
  let orbitRun = null;
  // orbit()'s completions are drained here by update(), never called from orbit() itself: a
  // callback that fires before its own starter returns is how an itinerary eats its own stack.
  const pendingDone = [];

  function queueDone(fn, reason) {
    if (typeof fn === 'function') pendingDone.push({ fn, reason });
  }

  // Depth guard: a completion callback never runs inside another completion callback. Under
  // reduced motion (and for ms: 0) a flight arrives synchronously, so `onArrive: () => flyTo(next)`
  // is a recursive call chain -- ten stops in one tick with no frame drawn, and a looping
  // itinerary is a stack overflow that only ever happens to the people the accessibility flag
  // protects. Here the second callback is queued instead of called, so a chain advances one step
  // per update() and the stack cannot grow past two. It still does not give a caller its pacing:
  // schedule the next stop rather than chaining, and keep a generation guard.
  let firingDone = 0;

  function fireDone(fn, reason) {
    if (typeof fn !== 'function') return;
    if (firingDone > 0) {
      pendingDone.push({ fn, reason });
      return;
    }
    firingDone += 1;
    try {
      fn(reason);
    } catch {
      /* a callback must never break the frame */
    } finally {
      firingDone -= 1;
    }
  }

  function drainDone() {
    if (!pendingDone.length) return;
    // A snapshot: anything queued by these callbacks waits for the next frame.
    const batch = pendingDone.splice(0, pendingDone.length);
    for (const { fn, reason } of batch) fireDone(fn, reason);
  }

  /**
   * End a flight, once, telling whoever asked. `arrived` picks the callback: an arrival is always
   * onArrive; a cancellation prefers onCancel and falls back to onArrive so that a caller who
   * passed only onArrive still hears about it instead of waiting forever.
   */
  function endFlight(f, reason, arrived) {
    if (!f || f.ended) return;
    f.ended = true;
    fireDone(arrived ? f.onArrive : f.onCancel || f.onArrive, reason);
  }

  function syncUpBasis() {
    if (lastUp.equals(camera.up)) return;
    lastUp.copy(camera.up);
    upQuat.setFromUnitVectors(camera.up.clone().normalize(), Y_UP);
    upQuatInv.copy(upQuat).invert();
  }

  const _off = new THREE.Vector3();

  /** Read azimuth/polar/distance out of wherever the camera currently is. */
  function readFromCamera() {
    syncUpBasis();
    _off.copy(camera.position).sub(target).applyQuaternion(upQuat);
    distance = _off.length();
    if (distance < 1e-9) {
      distance = Math.max(state.minDistance, 1e-6);
      azimuth = 0;
      polar = Math.PI / 2;
      return;
    }
    azimuth = Math.atan2(_off.x, _off.z);
    polar = Math.acos(THREE.MathUtils.clamp(_off.y / distance, -1, 1));
  }

  function clampDistance(d) {
    return THREE.MathUtils.clamp(d, state.minDistance, state.maxDistance);
  }

  const _unit = new THREE.Vector3();
  const _toTarget = new THREE.Vector3();

  /** Unit offset direction for the current azimuth/polar, in world (scene) axes. */
  function offsetDirection(out) {
    syncUpBasis();
    const sinPhi = Math.sin(polar);
    return out
      .set(sinPhi * Math.sin(azimuth), Math.cos(polar), sinPhi * Math.cos(azimuth))
      .applyQuaternion(upQuatInv);
  }

  /**
   * The camera never enters a world (spec 0005 design). The rule is about the camera's ABSOLUTE
   * position, not its distance to the target -- clamping the latter would shove the camera away
   * from every object that happens to be near the surface. So: walk the ray target + d*u and, if
   * the requested d puts the camera inside the sphere of radius R*1.02 around the world centre,
   * push d out to the far intersection.
   */
  function clearWorld(d, u) {
    const R = state.worldRadius > 0 ? state.worldRadius * WORLD_CLEARANCE : 0;
    if (R <= 0) return d;
    _toTarget.copy(target).sub(worldCentre);
    const b = u.dot(_toTarget);
    const c = _toTarget.lengthSq() - R * R;
    const disc = b * b - c;
    if (disc < 0) return d; // the ray never crosses the sphere
    const root = Math.sqrt(disc);
    const dNear = -b - root;
    const dFar = -b + root;
    if (d > dNear && d < dFar) return dFar;
    return d;
  }

  function applyToCamera() {
    polar = THREE.MathUtils.clamp(polar, EPS_POLAR, Math.PI - EPS_POLAR);
    distance = clampDistance(distance);
    offsetDirection(_unit);
    const d = clearWorld(distance, _unit);
    camera.position.copy(target).addScaledVector(_unit, d);
    camera.lookAt(target);
    state.azimuth = azimuth;
    state.polar = polar;
    state.distance = distance;
    state.cameraDistance = d;
  }

  function emitUserInput(kind) {
    state.userInteracting = true;
    for (const fn of inputListeners) {
      try {
        fn(kind);
      } catch {
        /* a listener must never break the frame */
      }
    }
  }

  function emitFade(ms) {
    for (const fn of fadeListeners) {
      try {
        fn(ms);
      } catch {
        /* ignore */
      }
    }
    if (domElement && typeof domElement.dispatchEvent === 'function') {
      try {
        domElement.dispatchEvent(
          new CustomEvent('camera-fade', { detail: { ms }, bubbles: true }),
        );
      } catch {
        /* CustomEvent is not available outside a browser */
      }
    }
  }

  // ---------------------------------------------------------------- pointer input

  const pointers = new Map(); // pointerId -> {x, y}
  let pinchDistance = 0;
  const pinchMid = { x: 0, y: 0 };

  function elementSize() {
    const w = domElement?.clientWidth || domElement?.width || 1;
    const h = domElement?.clientHeight || domElement?.height || 1;
    return { w: w || 1, h: h || 1 };
  }

  function orbitBy(dxPx, dyPx) {
    const { h } = elementSize();
    // A full drag across the height is half a turn: the same feel as OrbitControls.
    dAz -= (Math.PI * dxPx * state.rotateSpeed) / h;
    dPolar -= (Math.PI * dyPx * state.rotateSpeed) / h;
  }

  const _panX = new THREE.Vector3();
  const _panY = new THREE.Vector3();

  function panBy(dxPx, dyPx) {
    const { h } = elementSize();
    const fov = (camera.fov ?? 50) * THREE.MathUtils.DEG2RAD;
    // World units per pixel at the target plane.
    const scale = (2 * distance * Math.tan(fov / 2)) / h;
    camera.matrixWorld.extractBasis(_panX, _panY, _off);
    pendingPan.addScaledVector(_panX, -dxPx * scale * state.panSpeed);
    pendingPan.addScaledVector(_panY, dyPx * scale * state.panSpeed);
  }

  function dollyBy(logDelta) {
    dLogDist += logDelta * state.dollySpeed;
  }

  /** The user grabbed the camera: a live flight and a live drift both end where they are. */
  function interrupt() {
    const was = flight;
    flight = null;
    state.flying = false;
    stopOrbit('cancelled');
    endFlight(was, 'cancelled', false);
  }

  function onPointerDown(e) {
    if (!domElement) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      pinchMid.x = (a.x + b.x) / 2;
      pinchMid.y = (a.y + b.y) / 2;
    }
    try {
      domElement.setPointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onPointerMove(e) {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    prev.x = e.clientX;
    prev.y = e.clientY;

    if (pointers.size === 1) {
      const panning = e.shiftKey || e.buttons === 2 || e.buttons === 4;
      if (panning) panBy(dx, dy);
      else orbitBy(dx, dy);
      if (dx || dy) {
        interrupt();
        emitUserInput(panning ? 'pan' : 'orbit');
      }
      return;
    }

    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      if (pinchDistance > 0 && d > 0) dollyBy(Math.log(pinchDistance / d));
      panBy(mx - pinchMid.x, my - pinchMid.y);
      pinchDistance = d;
      pinchMid.x = mx;
      pinchMid.y = my;
      interrupt();
      emitUserInput('pinch');
    }
  }

  function onPointerUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDistance = 0;
    state.userInteracting = pointers.size > 0;
    try {
      domElement?.releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onWheel(e) {
    e.preventDefault?.();
    // deltaMode 1 is lines, 2 is pages.
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    dollyBy((e.deltaY * unit) / 600);
    interrupt();
    emitUserInput('dolly');
  }

  function onContextMenu(e) {
    e.preventDefault?.();
  }

  if (domElement && typeof domElement.addEventListener === 'function') {
    if (domElement.style) domElement.style.touchAction = 'none';
    domElement.addEventListener('pointerdown', onPointerDown);
    domElement.addEventListener('pointermove', onPointerMove);
    domElement.addEventListener('pointerup', onPointerUp);
    domElement.addEventListener('pointercancel', onPointerUp);
    domElement.addEventListener('wheel', onWheel, { passive: false });
    domElement.addEventListener('contextmenu', onContextMenu);
  }

  // ---------------------------------------------------------------- flights

  const _framing = new THREE.Vector3();
  const _perp = new THREE.Vector3();
  const _tmp = new THREE.Vector3();

  /**
   * Azimuth/polar that put the object's world behind it: the camera sits on the far side of the
   * object from the world centre, tilted off the radial so it does not read as a flat nadir shot.
   */
  function framingAngles(targetVec) {
    syncUpBasis();
    _framing.copy(targetVec).sub(worldCentre);
    if (_framing.lengthSq() < 1e-12) _framing.copy(camera.position).sub(targetVec);
    if (_framing.lengthSq() < 1e-12) return { azimuth, polar };
    _framing.normalize();
    // Any perpendicular will do; prefer one that leans toward the current up.
    _perp.copy(camera.up).normalize();
    if (Math.abs(_perp.dot(_framing)) > 0.95) _perp.set(_framing.z, _framing.x, _framing.y);
    _perp.projectOnPlane(_framing).normalize();
    _tmp
      .copy(_framing)
      .multiplyScalar(Math.cos(FRAMING_TILT))
      .addScaledVector(_perp, Math.sin(FRAMING_TILT))
      .applyQuaternion(upQuat);
    const r = _tmp.length();
    return {
      azimuth: Math.atan2(_tmp.x, _tmp.z),
      polar: Math.acos(THREE.MathUtils.clamp(_tmp.y / r, -1, 1)),
    };
  }

  /**
   * @param {object} opts
   *   targetScene  Vector3-like, scene units. Omit to keep the current target.
   *   distance     scene units. Omit to keep the current distance.
   *   ms           600-900 is the design range; default 750. **0 means instant** -- the pose is
   *                set, onArrive('done') fires synchronously, and no flight starts.
   *   azimuth/polar radians; either one missing is supplied by framingAngles().
   *   ease         'ui' (default) | 'inout' | 'cruise' | 'linear', or a function k => k'.
   *   targetDelay  0..0.95, default 0.34. The fraction of the flight for which the look-at point
   *                stays put. It is what keeps the world you are leaving in shot, and it is wrong
   *                at close framing: at 50 km the subject walks off screen and back. Pass ~0.10
   *                for a short move, 0 for a move that must never let go of its subject.
   *   apex         {distance, at} -- pull back through `distance` at `at` (0..1, default 0.45) and
   *                come back down, instead of interpolating log-distance straight through. Two
   *                stops far apart laterally otherwise sweep across at close range: a smear, not
   *                a shot.
   *   onArrive(reason)  'done' | 'skipped', and 'cancelled'/'replaced' when no onCancel was given.
   *   onCancel(reason)  'cancelled' | 'replaced'. Optional; see the header.
   */
  function flyTo(opts = {}) {
    const to = new THREE.Vector3();
    const haveTarget = toVector3(opts.targetScene, to) !== null;
    if (!haveTarget) to.copy(target);
    const toDistance = clampDistance(
      Number.isFinite(opts.distance) ? Number(opts.distance) : distance,
    );

    let toAz = opts.azimuth;
    let toPolar = opts.polar;
    if (!Number.isFinite(toAz) || !Number.isFinite(toPolar)) {
      const f = framingAngles(to);
      if (!Number.isFinite(toAz)) toAz = f.azimuth;
      if (!Number.isFinite(toPolar)) toPolar = f.polar;
    }
    toPolar = THREE.MathUtils.clamp(toPolar, EPS_POLAR, Math.PI - EPS_POLAR);

    dAz = 0;
    dPolar = 0;
    dLogDist = 0;
    pendingPan.set(0, 0, 0);

    // A second flight replaces the first, and the first is told so rather than dropped.
    const superseded = flight;
    flight = null;
    state.flying = false;
    stopOrbit('replaced');
    endFlight(superseded, 'replaced', false);

    const wantMs = Number.isFinite(opts.ms) && opts.ms >= 0 ? Number(opts.ms) : DEFAULT_FLIGHT_MS;

    // Re-read the media query: a visitor can turn reduced motion on mid-session.
    state.reducedMotion = prefersReducedMotion();
    const cut = state.reducedMotion || wantMs === 0;
    if (cut) {
      // No flight: set the destination. Under reduced motion the UI cross-fades the frame; an
      // explicit ms: 0 is a caller asking for a cut and gets no fade it did not ask for.
      target.copy(to);
      azimuth = toAz;
      polar = toPolar;
      distance = toDistance;
      applyToCamera();
      if (state.reducedMotion) {
        emitFade(Number.isFinite(opts.ms) ? Math.min(opts.ms, REDUCED_FADE_MS) : REDUCED_FADE_MS);
      }
      // Synchronous. See THE TRAP in the header.
      endFlight({ onArrive: opts.onArrive, onCancel: opts.onCancel }, 'done', true);
      return;
    }

    let apex = null;
    if (opts.apex && Number.isFinite(opts.apex.distance)) {
      const at = THREE.MathUtils.clamp(
        Number.isFinite(opts.apex.at) ? Number(opts.apex.at) : 0.45,
        0.05,
        0.95,
      );
      apex = { logDist: Math.log(Math.max(clampDistance(Number(opts.apex.distance)), 1e-9)), at };
    }

    flight = {
      elapsed: 0,
      ms: wantMs,
      ease: easeFor(opts.ease),
      targetDelay: THREE.MathUtils.clamp(
        Number.isFinite(opts.targetDelay) ? Number(opts.targetDelay) : TARGET_DELAY,
        0,
        0.95,
      ),
      apex,
      fromTarget: target.clone(),
      toTarget: to.clone(),
      fromAz: azimuth,
      dAz: shortestAngle(azimuth, toAz),
      fromPolar: polar,
      dPolar: toPolar - polar,
      fromLogDist: Math.log(Math.max(distance, 1e-9)),
      toLogDist: Math.log(Math.max(toDistance, 1e-9)),
      onArrive: opts.onArrive,
      onCancel: opts.onCancel,
      ended: false,
    };
    state.flying = true;
  }

  /**
   * Log-distance through an apex: a quadratic Bezier in log space whose curve passes exactly
   * through `apex.logDist` at k = apex.at. Straight interpolation between two stops that are far
   * apart sideways keeps the camera down at close range for the whole move.
   */
  function logDistanceAt(f, k) {
    const p0 = f.fromLogDist;
    const p2 = f.toLogDist;
    if (!f.apex) return p0 + (p2 - p0) * k;
    const a = f.apex.at;
    const p1 = (f.apex.logDist - (1 - a) * (1 - a) * p0 - a * a * p2) / (2 * (1 - a) * a);
    const u = 1 - k;
    return u * u * p0 + 2 * u * k * p1 + k * k * p2;
  }

  /** Put the flight's pose at parameter `raw` (0..1 of its wall clock). */
  function poseAt(f, raw) {
    const k = f.ease(raw);
    azimuth = f.fromAz + f.dAz * k;
    polar = f.fromPolar + f.dPolar * k;
    distance = Math.exp(logDistanceAt(f, k));
    // The target lags: the world it was framing stays in shot for the first third.
    const delay = f.targetDelay;
    const tk = f.ease(THREE.MathUtils.clamp((raw - delay) / (1 - delay), 0, 1));
    target.lerpVectors(f.fromTarget, f.toTarget, tk);
  }

  function advanceFlight(dt) {
    flight.elapsed += dt * 1000;
    const raw = Math.min(1, flight.elapsed / flight.ms);
    poseAt(flight, raw);
    if (raw >= 1) {
      const done = flight;
      flight = null;
      state.flying = false;
      endFlight(done, 'done', true);
    }
  }

  /**
   * Collapse a running flight onto its end state now and report it as an arrival, reason
   * 'skipped'. This is a video player's seek: pressing Next during a 4 s move must not start a
   * fifth half-finished sweep from wherever the camera happens to be.
   * @returns {boolean} whether there was a flight to finish.
   */
  function finishFlight() {
    if (!flight) return false;
    const done = flight;
    poseAt(done, 1);
    applyToCamera();
    flight = null;
    state.flying = false;
    endFlight(done, 'skipped', true);
    return true;
  }

  // ---------------------------------------------------------------- orbit

  /**
   * A slow constant turn around the target: the shot flyTo cannot do. flyTo runs its azimuth delta
   * through shortestAngle, so one flight can never turn more than half a circle, and its ease makes
   * any turn accelerate and decelerate rather than read as constant.
   *
   * @param {object} opts
   *   deg        SIGNED total travel in degrees, unwrapped -- 540 is a turn and a half, -34 goes
   *              the other way. Required.
   *   degPerSec  magnitude, default 6.
   *   onDone(reason)  'done' | 'cancelled' | 'replaced' | 'refused' | 'reduced-motion'.
   *              **Always deferred to a later update()**, never called from inside orbit().
   * @returns {boolean} whether the drift started.
   */
  function orbit(opts = {}) {
    const deg = Number(opts.deg);
    const onDone = opts.onDone;
    // A drift while a flight is running would fight it: both write azimuth.
    if (flight || !Number.isFinite(deg)) {
      queueDone(onDone, 'refused');
      return false;
    }
    stopOrbit('replaced');
    state.reducedMotion = prefersReducedMotion();
    if (state.reducedMotion) {
      // Cut, do not shorten: a faster version of the move is a worse version of it. The camera
      // simply does not drift, and the caller is told which of the two happened.
      queueDone(onDone, 'reduced-motion');
      return false;
    }
    if (deg === 0) {
      queueDone(onDone, 'done');
      return false;
    }
    const degPerSec = Number.isFinite(opts.degPerSec)
      ? Math.abs(Number(opts.degPerSec))
      : DEFAULT_ORBIT_DEG_S;
    if (!(degPerSec > 0)) {
      queueDone(onDone, 'refused');
      return false;
    }
    orbitRun = {
      remaining: deg * THREE.MathUtils.DEG2RAD,
      radPerSec: degPerSec * THREE.MathUtils.DEG2RAD,
      onDone,
    };
    state.orbiting = true;
    return true;
  }

  function stopOrbit(reason = 'cancelled') {
    if (!orbitRun) return;
    const was = orbitRun;
    orbitRun = null;
    state.orbiting = false;
    queueDone(was.onDone, reason);
  }

  function advanceOrbit(dts) {
    const step =
      Math.min(Math.abs(orbitRun.remaining), orbitRun.radPerSec * dts) *
      Math.sign(orbitRun.remaining);
    azimuth += step;
    orbitRun.remaining -= step;
    if (Math.abs(orbitRun.remaining) < 1e-9) {
      const was = orbitRun;
      orbitRun = null;
      state.orbiting = false;
      queueDone(was.onDone, 'done');
    }
  }

  // ---------------------------------------------------------------- follow

  function follow(getPosFn) {
    followFn = typeof getPosFn === 'function' ? getPosFn : null;
    state.following = followFn !== null;
  }

  function stopFollow() {
    followFn = null;
    state.following = false;
  }

  function applyFollow() {
    let p;
    try {
      p = followFn();
    } catch {
      return;
    }
    if (!toVector3(p, followPos)) return;
    if (flight) {
      // A flight to a moving object: keep re-aiming its destination.
      flight.toTarget.copy(followPos);
      return;
    }
    target.copy(followPos);
  }

  // ---------------------------------------------------------------- frame

  function update(dt) {
    // main.js may hand seconds or milliseconds; a 0.5 s frame is already pathological, so a value
    // above that is milliseconds.
    let dts = Number(dt);
    if (!Number.isFinite(dts) || dts <= 0) dts = 1 / 60;
    if (dts > 0.5) dts /= 1000;
    if (dts > 0.25) dts = 0.25; // a tab that was backgrounded must not fling the camera

    if (followFn) applyFollow();

    if (flight) {
      advanceFlight(dts);
    } else {
      const kOrbit = 1 - Math.exp(-dts / TAU_ORBIT);
      const kDolly = 1 - Math.exp(-dts / TAU_DOLLY);
      const kPan = 1 - Math.exp(-dts / TAU_PAN);

      azimuth += dAz * kOrbit;
      dAz *= 1 - kOrbit;
      polar += dPolar * kOrbit;
      dPolar *= 1 - kOrbit;
      distance *= Math.exp(dLogDist * kDolly);
      dLogDist *= 1 - kDolly;
      target.addScaledVector(pendingPan, kPan);
      pendingPan.multiplyScalar(1 - kPan);

      if (Math.abs(dAz) < MIN_MOVE) dAz = 0;
      if (Math.abs(dPolar) < MIN_MOVE) dPolar = 0;
      if (Math.abs(dLogDist) < MIN_MOVE) dLogDist = 0;
      if (pendingPan.lengthSq() < MIN_MOVE * MIN_MOVE) pendingPan.set(0, 0, 0);

      // Dollying into the world stops dead rather than bouncing off the clearance sphere.
      if (dLogDist < 0) {
        offsetDirection(_unit);
        if (clearWorld(distance, _unit) > distance) dLogDist = 0;
      }

      // The drift runs after the damping and only when no flight owns the azimuth. It composes
      // with follow() because applyFollow() has already moved the target this frame.
      if (orbitRun) advanceOrbit(dts);
    }

    applyToCamera();
    // Completions last, with the camera already where the callback will find it.
    drainDone();
  }

  // ---------------------------------------------------------------- misc api

  function onUserInput(fn) {
    if (typeof fn === 'function') inputListeners.add(fn);
    return () => inputListeners.delete(fn);
  }

  function onFade(fn) {
    if (typeof fn === 'function') fadeListeners.add(fn);
    return () => fadeListeners.delete(fn);
  }

  function setWorldRadius(r) {
    state.worldRadius = Number(r) || 0;
  }

  function setWorldCentre(v) {
    toVector3(v, worldCentre);
  }

  /**
   * Adopt the camera's current position as the rig's state. Call after main.js (or the sky view)
   * has moved the camera by hand, so the rig does not snap it back.
   */
  function sync() {
    readFromCamera();
    applyToCamera();
  }

  /** Point the rig at a new target, keeping the camera where it is. */
  function setTarget(v) {
    if (!toVector3(v, target)) return;
    sync();
  }

  function saveState() {
    return {
      target: target.clone(),
      azimuth,
      polar,
      distance,
      fov: camera.fov,
      up: camera.up.clone(),
    };
  }

  function restoreState(s, ms) {
    if (!s) return;
    camera.up.copy(s.up);
    if (Number.isFinite(s.fov)) {
      camera.fov = s.fov;
      camera.updateProjectionMatrix?.();
    }
    flyTo({ targetScene: s.target, distance: s.distance, azimuth: s.azimuth, polar: s.polar, ms });
  }

  function dispose() {
    if (domElement && typeof domElement.removeEventListener === 'function') {
      domElement.removeEventListener('pointerdown', onPointerDown);
      domElement.removeEventListener('pointermove', onPointerMove);
      domElement.removeEventListener('pointerup', onPointerUp);
      domElement.removeEventListener('pointercancel', onPointerUp);
      domElement.removeEventListener('wheel', onWheel);
      domElement.removeEventListener('contextmenu', onContextMenu);
    }
    // Nothing is left waiting on a rig that no longer exists.
    const was = flight;
    flight = null;
    state.flying = false;
    stopOrbit('cancelled');
    endFlight(was, 'cancelled', false);
    drainDone();
    inputListeners.clear();
    fadeListeners.clear();
    pointers.clear();
  }

  readFromCamera();
  applyToCamera();

  return {
    update,
    flyTo,
    follow,
    stopFollow,
    onUserInput,
    state,
    // beyond the contract, and additive: the integrator needs these to wire the rig up.
    finishFlight,
    orbit,
    stopOrbit,
    onFade,
    setWorldRadius,
    setWorldCentre,
    setTarget,
    sync,
    saveState,
    restoreState,
    dispose,
  };
}

export { cubicBezier, EASE as CAMERA_EASE, EASES as CAMERA_EASES };
