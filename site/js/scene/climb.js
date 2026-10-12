// scene/climb.js -- one continuous flight up the ladder and back (internal #410, public #451).
//
// Never at boot: main.js imports this the first time a visitor dollies well away from the Earth,
// presses "Zoom out to the edge", or a trip stop asks for a climb (tests/test_boot_diet.mjs).
//
// Contract: createClimb(ctx) ->
//   tick(frameMs)         before the rig's update: advances a running climb and the up's ease
//   afterRender()         after render(): the hand-off, when the camera has crossed a join
//   to(opts)              fly to a distance by ratio, crossing whatever joins lie between
//   toEdge(), toHome()    the two ends, for the ladder's own control
//   cancel(reason)        stop where it is
//   noteDolly()           the visitor's own wheel, pinch or key: the watcher is armed for a moment
//   handoff(stageId)      the pose-preserving stage change itself
//   state                 { active, crossings, fading, lastJoin }
//
// THREE THINGS HAPPEN AT A JOIN, in afterRender(), which runs right after the frame was drawn:
//   1. the frame just drawn is copied to a 2D canvas over the scene (the WebGL buffer is only
//      readable in the task that drew it);
//   2. the stage changes and the camera's position, look-at point and up are converted through
//      scene/handoff.js convertPose -- same place, same direction, the new stage's units;
//   3. over HANDOFF_FADE_MS the copy fades out, scaled about the look-at point by how far the camera
//      has moved since, so what the two stages draw differently (the planets the Earth's stage
//      draws nearer than they are, a rung's own marks) dissolves instead of popping.
// The trip's black veil is not used: it is still what covers a stage change that cannot keep its
// pose (ui/trip.js enterStage: into a planet's own stage, or a star system's).
//
// WHEN, for a visitor's own hand: only within WATCH_MS of their last dolly, never during a trip or
// from the ground, and only when the view is centred on the join's anchor (the look-at point within
// CENTRED_SHARE of the camera's distance from it). A selection flown to on the stellar rung --
// M87 from fifty-three million light-years -- is therefore left on the stage it was reached on.

import * as THREE from '../../vendor/three.module.min.js';
import { WORLDS, positionOf } from './worlds.js';
import { isLadderStage } from './stage.js';
import {
  JOINS, EDGE_KM, convertPose, stageAfter, restBand, easeTrapezoid, climbDistance, climbMs, targetShare,
} from './handoff.js';

/** How long the outgoing stage's last frame takes to fade, ms. */
export const HANDOFF_FADE_MS = 650;
/** How long the up takes to settle on the new stage's own after a join (the ecliptic is 23.4 degrees off the equator). */
export const UP_EASE_MS = 1600;
const WATCH_MS = 1500;
const CENTRED_SHARE = 0.3;
/** Where "back to the Earth" stops: the whole globe with room round it. */
export const HOME_KM = 30000;
const Y_UP = new THREE.Vector3(0, 1, 0);

export function createClimb(ctx) {
  const { stage, camera, clock } = ctx;
  const rig = ctx.cameraRig;
  const worlds = ctx.worlds;
  const canvas = ctx.renderer && ctx.renderer.domElement;
  const state = { active: false, crossings: 0, fading: false, lastJoin: null };

  let run = null;
  let armedUntil = 0;
  let lastKm = 0;
  let upEase = null;
  let fade = null;
  let overlay = null;
  const _dir = new THREE.Vector3();
  const _tgt = new THREE.Vector3();
  const _a = new THREE.Vector3();
  const _b = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _qk = new THREE.Quaternion();

  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  // The fade and the up's ease run on the frames' own time, so a film (fixed steps) and a slow
  // machine both see the whole of each.
  let frameClock = 0;
  const reduced = () => !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const tripRunning = () => !!(ctx.trip && ctx.trip.state && ctx.trip.state.phase !== 'idle');
  const descOf = () => ({ id: stage.worldId, frame: stage.frame, unitKm: stage.unitKm, originKm: { ...stage.originKm } });

  /** A world's true place in the current stage's scene units (never the drawn-nearer one). */
  function anchorScene(id, out) {
    const p = positionOf(id, clock.now());
    const v = p ? stage.toSceneInto(p, p.frame, out || new THREE.Vector3(), clock.now()) : null;
    return v || (out || new THREE.Vector3()).set(0, 0, 0);
  }

  // ------------------------------------------------------------------ the fade

  function ensureOverlay() {
    if (overlay || !canvas || typeof document === 'undefined') return overlay;
    overlay = document.createElement('canvas');
    overlay.id = 'sr-handoff';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.hidden = true;
    canvas.insertAdjacentElement('afterend', overlay);
    return overlay;
  }

  /** Copy the frame just drawn, to fade out over the next stage's. False when it could not be copied. */
  function snapshot() {
    const el = ensureOverlay();
    if (!el || !canvas.width || !canvas.height) return false;
    // A device the frame latch has already slowed down (scene/quality.js) copies at half size.
    const half = typeof ctx.latched === 'function' && !!ctx.latched();
    const w = Math.max(1, Math.round(canvas.width / (half ? 2 : 1)));
    const h = Math.max(1, Math.round(canvas.height / (half ? 2 : 1)));
    try {
      if (el.width !== w) el.width = w;
      if (el.height !== h) el.height = h;
      const g = el.getContext('2d');
      g.clearRect(0, 0, w, h);
      g.drawImage(canvas, 0, 0, w, h);
    } catch {
      return false;
    }
    _a.copy(rig.state.target).project(camera);
    const ox = Number.isFinite(_a.x) ? (_a.x * 0.5 + 0.5) * 100 : 50;
    const oy = Number.isFinite(_a.y) ? (-_a.y * 0.5 + 0.5) * 100 : 50;
    el.style.transformOrigin = `${ox.toFixed(2)}% ${oy.toFixed(2)}%`;
    el.style.transform = 'none';
    el.style.opacity = '1';
    el.hidden = false;
    fade = { at: frameClock, ms: HANDOFF_FADE_MS, dKm: camera.position.distanceTo(rig.state.target) * stage.unitKm };
    state.fading = true;
    return true;
  }

  function stepFade() {
    if (!fade || !overlay) return;
    const k = Math.min(1, (frameClock - fade.at) / fade.ms);
    if (k >= 1) {
      overlay.hidden = true;
      overlay.style.opacity = '0';
      fade = null;
      state.fading = false;
      return;
    }
    // The copy shrinks (or grows) with the dolly since it was taken, about the look-at point, so
    // the thing in the middle stays the size the live stage under it draws it.
    const dKm = camera.position.distanceTo(rig.state.target) * stage.unitKm;
    const s = dKm > 0 && fade.dKm > 0 ? Math.min(3, Math.max(0.33, fade.dKm / dKm)) : 1;
    overlay.style.transform = `scale(${s.toFixed(4)})`;
    overlay.style.opacity = (1 - k * k * (3 - 2 * k)).toFixed(3);
  }

  // ------------------------------------------------------------------ the hand-off

  /**
   * Change stage and keep the pose. Returns whether the stage changed.
   * @param {string} id
   * @param {{fade?: boolean}} [opts]
   */
  function handoff(id, opts = {}) {
    if (!id || id === stage.worldId) return false;
    const from = descOf();
    const pose = { position: camera.position.clone(), target: rig.state.target.clone(), up: camera.up.clone() };
    const tMs = clock.now();
    if (opts.fade !== false) snapshot();
    stage.setWorld(id);
    if (stage.worldId !== id) return false;
    worlds.update(tMs);
    const out = convertPose(pose, from, descOf(), tMs);
    // The rig's ground: a world's own sphere, or none on a rung.
    const w = WORLDS.find((x) => x.id === id);
    rig.setWorldRadius(w ? w.radiusKm / stage.unitKm : 0);
    rig.setWorldCentre({ x: 0, y: 0, z: 0 });
    if (out) {
      camera.up.set(out.up.x, out.up.y, out.up.z).normalize();
      camera.position.set(out.position.x, out.position.y, out.position.z);
      rig.setTarget(out.target);
      // The new stage's own up, eased to: a slow roll under the fade, never a jump.
      if (reduced() || camera.up.angleTo(Y_UP) < 1e-4) { camera.up.copy(Y_UP); rig.sync(); upEase = null; } else upEase = { from: camera.up.clone(), at: frameClock, ms: UP_EASE_MS };
    } else {
      // The frames would not convert (never on the chain; here so a new stage fails as a cut).
      camera.up.copy(Y_UP);
      rig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: 5, ms: 0 });
    }
    // A selection the new stage does not draw (a satellite, from a light-year) is put down.
    const sel = typeof ctx.selected === 'function' ? ctx.selected() : null;
    if (sel && sel.klass !== 'world' && isLadderStage(id) && typeof ctx.isLayerDrawable === 'function') {
      const layer = (ctx.layers || []).find((l) => l.id === sel.layer);
      if (layer && !ctx.isLayerDrawable(layer) && typeof ctx.deselect === 'function') ctx.deselect();
    }
    // Every mark (the glyph layers, the labels) is placed in scene units: main.js places them all again on the next frame.
    ctx.marksStale = true;
    state.crossings += 1;
    state.lastJoin = { from: from.id, to: id, atMs: now(), distanceKm: out ? out.distanceKm : null, kept: !!out };
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('sr:handoff', { detail: { from: from.id, to: id, kept: !!out } }));
    }
    return true;
  }

  function stepUp() {
    if (!upEase) return;
    // Somebody else set the up since the last step (a trip stop settling its own): theirs stands.
    if (rig.state.flying || (upEase.last && !camera.up.equals(upEase.last))) { upEase = null; return; }
    const k = Math.min(1, (frameClock - upEase.at) / upEase.ms);
    const e = k * k * (3 - 2 * k);
    _q.setFromUnitVectors(upEase.from, Y_UP);
    _qk.identity().slerp(_q, e);
    camera.up.copy(upEase.from).applyQuaternion(_qk).normalize();
    if (k >= 1) { camera.up.copy(Y_UP); upEase = null; } else upEase.last = camera.up.clone();
    rig.sync();
  }

  /** The join the camera has crossed, if any: the stage it now belongs on. */
  function crossed() {
    const id = stage.worldId;
    const up = JOINS.find((j) => j.from === id);
    const down = JOINS.find((j) => j.to === id);
    if (!up && !down) return null;
    const cam = camera.position;
    const tgt = rig.state.target;
    if (run) {
      // A running climb is measured from what it looks at: the stops it flies between are the chain's own.
      const d = cam.distanceTo(tgt) * stage.unitKm;
      return stageAfter(id, run.out ? d : 0, run.out ? Infinity : d);
    }
    let upKm = 0;
    if (up) {
      // The outward join's centre is the stage's own origin (the Earth, or the Sun).
      const d = cam.length();
      if (tgt.length() <= CENTRED_SHARE * d) upKm = d * stage.unitKm;
    }
    let downKm = Infinity;
    if (down) {
      anchorScene(down.anchor, _a);
      const d = cam.distanceTo(_a);
      if (tgt.distanceTo(_a) <= CENTRED_SHARE * d) downKm = d * stage.unitKm;
    }
    return stageAfter(id, upKm, downKm);
  }

  function afterRender() {
    if (ctx.skyView && ctx.skyView.active) return;
    if (!run) {
      // A held key dollies for as long as it is held and says so once: while the distance is still
      // changing after a dolly, the watcher stays armed.
      const dKm = camera.position.distanceTo(rig.state.target) * stage.unitKm;
      const moving = lastKm > 0 && dKm > 0 && Math.abs(Math.log(dKm / lastKm)) > 5e-4;
      lastKm = dKm;
      if (now() > armedUntil || rig.state.flying || tripRunning()) return;
      if (moving) armedUntil = now() + WATCH_MS;
    }
    const next = crossed();
    if (!next) return;
    const leftEarth = stage.worldId === 'earth';
    handoff(next);
    // The far catalogues (the 3D stars, the galaxy) load on a rung; ask as the Earth's stage is
    // left, so they are there by the time the camera is among them.
    if (typeof ctx.loadAfterFirstVisit === 'function') ctx.loadAfterFirstVisit();
    // A visitor who scrolled out from the Earth scrolls back to the Earth: hold it, as a selection
    // would, unless something is held already.
    if (!run && leftEarth && !rig.state.following) rig.follow(() => anchorScene('earth'));
  }

  // ------------------------------------------------------------------ a climb

  function finish(reason) {
    const r = run;
    if (!r) return;
    run = null;
    state.active = false;
    const fn = reason === 'done' ? r.onArrive : r.onCancel || r.onArrive;
    if (typeof fn === 'function') { try { fn(reason); } catch { /* a callback must not break the frame */ } }
  }

  function cancel(reason = 'cancelled') {
    if (run) finish(reason);
  }

  /**
   * Fly to `distanceKm` from the look-at point, by ratio, through every join between here and there.
   *
   * @param {object} opts
   *   distanceKm   where to stop
   *   stage        the stage that distance belongs on (checked on arrival: a stop on the wrong
   *                side of a join is handed over without a fade rather than left on the wrong unit)
   *   toPos        () => scene position of what to look at on arrival, in the stage current when
   *                it is called; omitted, the look-at point stays what it is
   *   ms           the duration; omitted, climbMs() at msPerDecade
   *   msPerDecade  the rate, ms per factor of ten (default 900)
   *   onArrive(reason), onCancel(reason)
   */
  function to(opts = {}) {
    cancel('replaced');
    const d1 = Number(opts.distanceKm);
    if (!(d1 > 0)) return false;
    if (typeof ctx.loadAfterFirstVisit === 'function' && opts.stage && isLadderStage(opts.stage)) ctx.loadAfterFirstVisit();
    rig.stopFollow();
    if (rig.stopOrbit) rig.stopOrbit('replaced');
    const d0 = Math.max(1e-6, camera.position.distanceTo(rig.state.target) * stage.unitKm);
    // Where the look-at point starts, kept in km in the frame it was read in: a point by the Earth
    // stays by the Earth while the stage under it changes.
    const fromKm = stage.fromScene(rig.state.target);
    const fromPos = () => stage.toSceneInto(fromKm, fromKm.frame, _b, clock.now()) || _b.copy(rig.state.target);
    const toPos = typeof opts.toPos === 'function' ? opts.toPos : null;
    run = {
      d0, d1, out: d1 >= d0, stage: opts.stage || null,
      fromPos, toPos,
      ms: Number.isFinite(opts.ms) ? Math.max(0, opts.ms) : climbMs(d0, d1, opts.msPerDecade || 900),
      elapsed: 0,
      onArrive: opts.onArrive, onCancel: opts.onCancel,
    };
    state.active = true;
    if (reduced() || !(run.ms > 0)) {
      // Less motion: one cut under one fade, to the stage and the distance asked for.
      snapshot();
      place(1);
      if (run && run.stage && run.stage !== stage.worldId) { handoff(run.stage, { fade: false }); place(1); }
      upEase = null;
      camera.up.copy(Y_UP);
      rig.sync();
      finish('done');
      return true;
    }
    return true;
  }

  /** Put the camera where the climb has it at `k` of its time. */
  function place(k) {
    const r = run;
    const dKm = climbDistance(r.d0, r.d1, easeTrapezoid(k));
    _dir.copy(camera.position).sub(rig.state.target);
    if (_dir.lengthSq() < 1e-24) _dir.set(0, 0, 1);
    _dir.normalize();
    const a = r.fromPos();
    _tgt.copy(a);
    if (r.toPos) {
      const b = r.toPos();
      if (b && Number.isFinite(b.x)) {
        const offKm = a.distanceTo(b) * stage.unitKm;
        const near = Math.min(r.d0, r.d1);
        const far = Math.max(r.d0, r.d1);
        const share = targetShare(dKm, offKm, near, far);
        // `share` is of the FAR stop's subject: the arrival's on the way out, the departure's on the way in.
        _tgt.lerpVectors(a, b, r.out ? share : 1 - share);
      }
    }
    camera.position.copy(_tgt).addScaledVector(_dir, dKm / stage.unitKm);
    rig.setTarget(_tgt);
  }

  function tick(frameMs) {
    frameClock += Math.min(100, Math.max(0, Number(frameMs) || 0));
    stepFade();
    stepUp();
    if (!run) return;
    // Somebody else took the camera (a selection's flight): the climb gives way.
    if (rig.state.flying) { cancel('replaced'); return; }
    // Wall time, as a flight's is (scene/camera.js update, internal #322): a second a frame at most.
    run.elapsed += Math.min(1000, Math.max(0, Number(frameMs) || 0));
    const k = Math.min(1, run.elapsed / run.ms);
    place(k);
    if (k >= 1) {
      if (run.stage && run.stage !== stage.worldId) { handoff(run.stage, { fade: !!canvas }); place(1); }
      finish('done');
    }
  }

  /** The visitor's own dolly: for a moment the watcher may hand the camera on. */
  function noteDolly() {
    armedUntil = now() + WATCH_MS;
    if (run) cancel('cancelled');
  }

  function toEdge(opts = {}) {
    return to({ distanceKm: EDGE_KM, stage: 'local-group', toPos: () => anchorScene('sun'), ...opts });
  }

  function toHome(opts = {}) {
    const done = opts.onArrive;
    return to({
      distanceKm: HOME_KM, stage: 'earth', toPos: () => anchorScene('earth'), ...opts,
      onArrive: (reason) => {
        if (reason === 'done') rig.follow(() => anchorScene('earth'));
        if (typeof done === 'function') done(reason);
      },
    });
  }

  /** Is the camera out past the first join (so the ladder's control offers the way back)? */
  function isOut() {
    return stage.worldId !== 'earth' && JOINS.some((j) => j.to === stage.worldId);
  }

  return { tick, afterRender, to, toEdge, toHome, cancel, noteDolly, handoff, isOut, restBand, state };
}
