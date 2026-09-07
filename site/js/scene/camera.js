// scene/camera.js — damped orbit controls + eased flights.
//
// Contract (site/js/CONTRACT.md):
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
    reducedMotion: prefersReducedMotion(),
    userInteracting: false,
  };

  const inputListeners = new Set();
  const fadeListeners = new Set();

  let followFn = null;
  const followPos = new THREE.Vector3();
  let flight = null;

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

  function interrupt() {
    flight = null;
    state.flying = false;
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
   * @param {{targetScene, distance, ms, azimuth, polar, onArrive}} opts
   *   targetScene  Vector3-like, scene units. Omit to keep the current target.
   *   distance     scene units. Omit to keep the current distance.
   *   ms           600-900 is the design range; default 750.
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

    // Re-read the media query: a visitor can turn reduced motion on mid-session.
    state.reducedMotion = prefersReducedMotion();
    if (state.reducedMotion) {
      // No flight: set the destination and let the UI cross-fade the frame.
      target.copy(to);
      azimuth = toAz;
      polar = toPolar;
      distance = toDistance;
      applyToCamera();
      flight = null;
      state.flying = false;
      emitFade(Number.isFinite(opts.ms) ? Math.min(opts.ms, REDUCED_FADE_MS) : REDUCED_FADE_MS);
      opts.onArrive?.();
      return;
    }

    const ms = Number.isFinite(opts.ms) && opts.ms > 0 ? Number(opts.ms) : DEFAULT_FLIGHT_MS;
    flight = {
      elapsed: 0,
      ms,
      fromTarget: target.clone(),
      toTarget: to.clone(),
      fromAz: azimuth,
      dAz: shortestAngle(azimuth, toAz),
      fromPolar: polar,
      dPolar: toPolar - polar,
      fromLogDist: Math.log(Math.max(distance, 1e-9)),
      toLogDist: Math.log(Math.max(toDistance, 1e-9)),
      onArrive: opts.onArrive,
    };
    state.flying = true;
  }

  function advanceFlight(dt) {
    flight.elapsed += dt * 1000;
    const raw = Math.min(1, flight.elapsed / flight.ms);
    const k = ease(raw);
    azimuth = flight.fromAz + flight.dAz * k;
    polar = flight.fromPolar + flight.dPolar * k;
    distance = Math.exp(flight.fromLogDist + (flight.toLogDist - flight.fromLogDist) * k);
    // The target lags: the world it was framing stays in shot for the first two thirds.
    const tk = ease(THREE.MathUtils.clamp((raw - TARGET_DELAY) / (1 - TARGET_DELAY), 0, 1));
    target.lerpVectors(flight.fromTarget, flight.toTarget, tk);
    if (raw >= 1) {
      const done = flight;
      flight = null;
      state.flying = false;
      done.onArrive?.();
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
    }

    applyToCamera();
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

export { cubicBezier, EASE as CAMERA_EASE };
