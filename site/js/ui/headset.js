// ui/headset.js -- the headset mode (forge #158): the same scene in a WebXR `immersive-vr` session, for the Quest's
// browser or a Vision Pro, with no PC and no app: the sky from the ground, the distance ladder, and the inside of a Moment.
//
// Contract: mountHeadset(ctx, env?) -> headset (once per ctx; ctx.headset is it), and the rail's button and More's row
//             headset = { get active(), enter(), exit(), get yawDeg() }
//   Pure or mockable, for tests/test_headset.mjs: levelBasis(up, forward, yaw), unitsPerMetre({ ground, unitKm, distance }),
//   xrNearFar(near, far, s), blockedBy(ctx), frameShim(win), wrapRender(renderer, choose), momentCut(held, fwd, up, now),
//   frameGovernor(state, dtMs), createHeadset(ctx, { xr, win })
//
// WHEN. NOT AT BOOT, AND NOT FOR EVERYONE. main.js asks navigator.xr.isSessionSupported('immersive-vr') once and imports
// this module only when the answer is yes: a phone, Safari on a Mac and Chrome on a desktop with no headset runtime all
// say no, and fetch none of it. The button appears only then, in the tool rail (desktop) and in More (phone).
//
// ENTERING. The button opens a note first: comfort (jumps, not glides; turns in steps; the horizon level; sit down) and
// the seizure warning, the controls, and that this has not been tried on a real headset. Its Enter is the user gesture
// WebXR asks for. Refused while an imagined world, Dome and 360 or a recording is up: each draws its own picture with
// its own camera, and a second picture has no place in the headset (wrapRender below drops it).
//
// THE 2D VIEW IS NOT CHANGED. Nothing here runs until Enter is pressed. While the session lasts:
//   - THE LOOP. A WebXR frame comes from the session, not from the window: main.js's loop calls the window's
//     requestAnimationFrame for its next frame, so frameShim queues every such call and runs the queue inside the
//     session's frame (three's setAnimationLoop), then puts the window's own function back when the session ends. Each
//     session frame is drawn even when the loop chose to skip one (main.js's idle cap): a headset frame not drawn is a
//     black or torn eye, not a saved battery.
//   - THE CAMERA. The 2D camera stays what the rig and the sky view make it, every frame. wrapRender draws the frame
//     through a stand-in camera instead, the child of an ANCHOR placed at the 2D camera: at its position, with its up as
//     the anchor's up, and its look turned flat onto the horizon plane as the anchor's forward (levelBasis). The head's
//     own pose, in metres, is applied under the anchor by three's WebXRManager. So the horizon is the scene's, never
//     tilted by the 2D camera's pitch: THE FIXED HORIZON the comfort rules ask for. Picking, labels and everything else
//     that reads the 2D camera keep working as they do on the screen.
//   - THE SCALE. A metre of head movement is unitsPerMetre scene units: on the ground a true metre (0.001 km over the
//     stage's unit), so the field and the horizon are where they stand; in space a twentieth of the distance to what the
//     camera looks at, so it seems SEEMS_M (20 m) away whatever its true distance and the two eyes see it in depth
//     without a planet being a pebble. Illustrative, chosen: it is the eyes' parallax only, never a measured size.
//   - MOTION. data-sr-motion="off" on <html> for the session (the Motion row's Off, ui/whattoshow.js): every flight is a
//     cut (scene/camera.js flyTo), which is the TELEPORT the comfort rules ask for, and every other motion the app makes
//     is the reduced one. The visitor's own choice is put back after.
//
// INSIDE A MOMENT (moments/player.js draws its own stage, in metres, with its camera always at the stage's origin and
// the world moved round it). The headset draws that stage through the same anchor, at a metre a metre, but the
// director's camera path is never forced on the eyes: the anchor holds a pose (where the director stood, and its
// heading laid flat) and takes the director's new one only as a CUT, every MOMENT_CUT_MS or as soon as the heading has
// turned more than MOMENT_CUT_DEG (momentCut). Between cuts the viewer stands still while the vehicles move; the
// horizon is the place's own up, level, as everywhere else. A or the right trigger plays and pauses, B goes back to the
// map, the right stick snap-turns, Y shows the controls.
//
// FRAME TIME. The panel's last line is the frames' own time, smoothed (frameGovernor): the 72 a second the issue asks
// for is not measured here (no headset), so the panel shows it to whoever wears one. When frames run long (over
// LONG_FACTOR times the 72 Hz budget for LONG_RUN frames running) the headset draws less, in two steps: fixed
// foveation from FOVEATION_START to full, then the frame latch (main.js ctx.latch.force: the stars' low detail, the
// worlds' boot maps, no earthshine), and the panel says so.
//
// THE CONTROLLERS are ui/padmap.js readXR: the #164 mapping, so A chooses, X goes, B goes back and Y shows the controls,
// as on a pad (Y shows them there too; a Quest's left Menu button is the system's, not the page's). Moves are steps,
// never glides (padmap.js flick: one step per push of a stick):
//   right stick left / right   turn 30 degrees (a SNAP TURN: the anchor turns, the head does the rest)
//   right stick up / down      step in to half the distance, or out to twice it (a cut)
//   left stick left / right    step 30 degrees around what the view is on (a cut); from the ground, a snap turn
//   left stick up / down       one rung out or in along the distance ladder (ui/gamepad.js goRung)
//   A or the right trigger     choose what is straight ahead (the gaze ring); X go there; B back; hold B a second: leave
// What is chosen, the rung reached and the controls are written on a small panel half a metre below eye level and
// 1.4 m ahead, fixed to the anchor (it turns with a snap turn, never with the head).
//
// NOT TRIED ON A HEADSET. This was written and tested against a mocked navigator.xr (tests/test_headset.mjs) and the
// three.js WebXRManager's own code; it has not run on a Quest or a Vision Pro, so the 72 fps the issue asks for is not
// measured. The note says so to the visitor.

import * as THREE from '../../vendor/three.module.min.js';
import { COPY, t } from '../copy/en.js';
import '../copy/en.xr.js';
import { loadCss } from './latercss.js';
import { toast } from './share.js';
import { LADDER_RUNGS } from '../data/ladder.js';
import { readXR, flick, pressed, restIntent, nextRung } from './padmap.js';
import { chooseAt, goChosen, goBack, goRung } from './gamepad.js';

export const SESSION_MODE = 'immersive-vr';
/** 'local': the origin is where the eyes were when the session began, which is where the 2D camera stands. */
export const REFERENCE_SPACE = 'local';
export const SNAP_DEG = 30;
export const ORBIT_STEP_DEG = 30;
export const STEP_FACTOR = 2;
export const LEAVE_HOLD_MS = 1000;
/** In space, what the camera looks at seems this many metres away (THE SCALE above). */
export const SEEMS_M = 20;
/** The nearest the headset draws, in metres: the panel at 1.4 m must not be cut. */
export const NEAR_M = 0.05;
/** The panel stays this long after it last changed, unless Y pinned it. */
export const PANEL_MS = 8000;
/** Inside a Moment the director's pose is taken as a cut this often at most, or when its heading turns this far. */
export const MOMENT_CUT_MS = 3000;
export const MOMENT_CUT_DEG = 30;
/** 72 frames a second (Quest's default), and when a frame is "long". */
export const FRAME_BUDGET_MS = 1000 / 72;
export const LONG_FACTOR = 1.2;
export const LONG_RUN = 90;
export const FOVEATION_START = 0.5;
const DEG = Math.PI / 180;

// --- pure ---------------------------------------------------------------------------------------------------------

const norm = (v) => {
  const m = Math.hypot(v[0], v[1], v[2]);
  return m > 0 ? [v[0] / m, v[1] / m, v[2] / m] : [0, 0, 0];
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/**
 * The anchor's axes: y is `up`, z is the look `forward` laid flat on the plane square to `up`, turned by `yaw` (radians,
 * counter-clockwise seen from above) and reversed (a camera looks down its -z), and x completes a right-handed frame. A
 * look straight up or down has no flat part; then any direction square to `up` will do.
 */
export function levelBasis(up, forward, yaw = 0) {
  const y = norm(up);
  if (!(Math.abs(dot(y, y) - 1) < 1e-6)) return { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
  let f = forward.map((c, i) => c - dot(forward, y) * y[i]);
  if (Math.hypot(f[0], f[1], f[2]) < 1e-9) f = Math.abs(y[0]) < 0.9 ? cross(y, [1, 0, 0]) : cross(y, [0, 0, 1]);
  f = norm(f);
  const side = cross(f, y); // to the right of f
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  // Turning counter-clockwise about y: forward leans toward the left, which is -side.
  const fy = norm([f[0] * c - side[0] * s, f[1] * c - side[1] * s, f[2] * c - side[2] * s]);
  const z = [-fy[0], -fy[1], -fy[2]];
  const x = cross(y, z);
  return { x, y, z };
}

/** Scene units per metre of head movement (THE SCALE in the header). */
export function unitsPerMetre({ ground = false, unitKm = 0, distance = 0 } = {}) {
  if (ground) return unitKm > 0 ? 0.001 / unitKm : 1e-6;
  return distance > 0 && Number.isFinite(distance) ? distance / SEEMS_M : 1;
}

/** The stand-in camera's near and far in the anchor's metres: the 2D camera's planes, with the near never past NEAR_M. */
export function xrNearFar(near, far, s) {
  const k = s > 0 ? s : 1;
  return { near: Math.min(NEAR_M, near > 0 ? near / k : NEAR_M), far: far > 0 ? far / k : 1e9 };
}

/** What would draw a picture of its own over the headset's, or null when entering is fine. */
export function blockedBy(ctx) {
  if (!ctx) return null;
  if (ctx.imagine && ctx.imagine.active) return 'imagine';
  if (ctx.projection && ctx.projection.active) return 'projection';
  if (ctx.recorder && ctx.recorder.active) return 'recording';
  return null;
}

/**
 * The window's requestAnimationFrame, queued for the session's frame. run(t) calls everything queued since the last run
 * (and what they queue waits for the next); restore() puts the window's functions back and hands them what is waiting.
 */
export function frameShim(win) {
  const raf = win.requestAnimationFrame;
  const caf = win.cancelAnimationFrame;
  const queue = new Map();
  let next = 1e9; // far above any id the window hands out, so cancel can tell the two apart
  win.requestAnimationFrame = (cb) => { next += 1; queue.set(next, cb); return next; };
  win.cancelAnimationFrame = (id) => { if (!queue.delete(id) && caf) caf.call(win, id); };
  return {
    get waiting() { return queue.size; },
    run(time) {
      const batch = [...queue.values()];
      queue.clear();
      for (const cb of batch) {
        try { cb(time); } catch (e) { console.warn('a frame callback failed in the headset', e); }
      }
      return batch.length;
    },
    restore() {
      win.requestAnimationFrame = raf;
      win.cancelAnimationFrame = caf;
      const batch = [...queue.values()];
      queue.clear();
      for (const cb of batch) raf.call(win, cb);
    },
  };
}

/**
 * While the renderer presents to a headset, every draw asks choose(scene, camera): a stand-in camera to draw it through
 * (the 2D camera's frame, or a Moment's), or null to drop it (Dome and 360's, the map's while a Moment is up). Otherwise
 * every draw is as it was.
 */
export function wrapRender(renderer, choose) {
  const orig = renderer.render;
  let drawn = 0;
  renderer.render = function render(scene, cam) {
    if (!(renderer.xr && renderer.xr.isPresenting)) return orig.call(this, scene, cam);
    const through = choose(scene, cam);
    if (!through) return undefined;
    drawn += 1;
    return orig.call(this, scene, through);
  };
  return {
    get drawn() { return drawn; },
    reset() { drawn = 0; },
    restore() { renderer.render = orig; },
  };
}

/**
 * Inside a Moment: whether the anchor takes the director's pose now. `held` is { fwd, up, at } or null; a cut when there is
 * none, when it is MOMENT_CUT_MS old, when the heading (laid flat on the held up) has turned past MOMENT_CUT_DEG, or when
 * the up itself has turned past 10 degrees (a shot from somewhere else).
 */
export function momentCut(held, fwd, up, now, maxMs = MOMENT_CUT_MS, maxDeg = MOMENT_CUT_DEG) {
  if (!held) return true;
  if (!(now - held.at < maxMs)) return true;
  const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(norm(a), norm(b))))) / DEG;
  if (ang(held.up, up) > 10) return true;
  return ang(levelBasis(held.up, held.fwd).z, levelBasis(held.up, fwd).z) > maxDeg;
}

/**
 * The frames' time, smoothed, and when to draw less: `fire` is true when frames have run over LONG_FACTOR times the 72 Hz
 * budget for LONG_RUN frames in a row, at most twice (`step` 1 and 2). A gap of a second or more (a pause, a menu) is not a
 * frame and is not counted.
 */
export function frameGovernor(st, dtMs) {
  const prev = st || { ema: 0, long: 0, step: 0 };
  if (!(dtMs > 0 && dtMs < 1000)) return { ...prev, fire: false };
  const ema = prev.ema ? prev.ema * 0.9 + dtMs * 0.1 : dtMs;
  const long = ema > FRAME_BUDGET_MS * LONG_FACTOR ? prev.long + 1 : 0;
  const fire = long >= LONG_RUN && prev.step < 2;
  return { ema, long: fire ? 0 : long, step: prev.step + (fire ? 1 : 0), fire };
}

// --- the session ----------------------------------------------------------------------------------------------------

const tripOn = (ctx) => !!(ctx.trip && ctx.trip.state && ctx.trip.state.phase !== 'idle');

export function createHeadset(ctx, env = {}) {
  const C = COPY.headset;
  const xr = env.xr;
  const win = env.win || (typeof window !== 'undefined' ? window : null);
  const say = env.say || ((line) => toast(line, 4000));
  const renderer = ctx.renderer;
  const scene = ctx.scene;
  const camera = ctx.camera;

  let session = null;
  let starting = false;
  let shim = null;
  let wrap = null;
  let motionWas;
  let yaw = 0;
  let prev = restIntent();
  const flicks = { rx: 0, ry: 0, lx: 0, ly: 0 };
  let bDown = 0;
  let rtWas = false;
  let rung = -1;

  // The anchor, its stand-in camera, the panel and the gaze ring: made on the first entry.
  let anchor = null;
  let proxy = null;
  let panel = null;
  let ring = null;
  const _m = new THREE.Matrix4();
  const _inv = new THREE.Matrix4();
  const _rot = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _f = new THREE.Vector3();
  const _p = new THREE.Vector3();
  const _x = new THREE.Vector3();
  const _y = new THREE.Vector3();
  const _z = new THREE.Vector3();

  function build3d() {
    if (anchor) return;
    anchor = new THREE.Group();
    anchor.name = 'sr-headset-anchor';
    anchor.matrixAutoUpdate = false;
    proxy = new THREE.PerspectiveCamera(90, 1, NEAR_M, 1e9);
    anchor.add(proxy);
    panel = makePanel();
    if (panel) anchor.add(panel.mesh);
    const rg = new THREE.RingGeometry(0.008, 0.013, 32);
    const rm = new THREE.MeshBasicMaterial({ color: 0xff9f43, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false, toneMapped: false });
    ring = new THREE.Mesh(rg, rm);
    ring.renderOrder = 10001;
    ring.frustumCulled = false;
    anchor.add(ring);
  }

  // The panel: a canvas texture on a plane 1.2 m wide, fixed to the anchor (it turns with a snap turn, not with the head).
  // Its last line is the frame time, redrawn at most twice a second.
  function makePanel() {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 384;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.45), mat);
    mesh.position.set(0, -0.5, -1.4);
    mesh.rotation.x = -0.34; // tipped back toward the eyes, which look down at it
    mesh.renderOrder = 10000;
    mesh.frustumCulled = false;
    let shown = '';
    let until = 0;
    let pinned = false;
    let status = '';
    let help = C.panelHelp;
    let frameLine = '';
    let frameAt = 0;
    const draw = () => {
      const g = canvas.getContext('2d');
      if (!g) return;
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.fillStyle = 'rgba(11, 14, 20, 0.86)';
      g.beginPath();
      if (g.roundRect) g.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 36); else g.rect(4, 4, canvas.width - 8, canvas.height - 8);
      g.fill();
      const w = canvas.width - 88;
      g.fillStyle = '#e8ecf2';
      g.font = '600 46px system-ui, sans-serif';
      g.fillText(status || help, 44, 92, w);
      g.fillStyle = '#9aa4b2';
      g.font = '400 34px system-ui, sans-serif';
      let y = 160;
      if (status) { g.fillText(help, 44, y, w); y += 60; }
      if (help === C.panelHelp) { g.fillText(C.panelMove, 44, y, w); y += 60; }
      g.fillStyle = '#ff9f43';
      g.fillText(C.panelLeave, 44, y, w);
      g.fillStyle = '#9aa4b2';
      g.font = '400 30px ui-monospace, monospace';
      if (frameLine) g.fillText(frameLine, 44, 344, w);
      tex.needsUpdate = true;
    };
    return {
      mesh,
      say(line, now) { status = line || ''; until = now + PANEL_MS; },
      pin(now) { pinned = !pinned; until = pinned ? Infinity : now; },
      setHelp(line) { help = line; },
      frameTime(line, now) { if (now - frameAt >= 500) { frameAt = now; frameLine = line; } },
      frame(now) {
        const want = `${status}|${help}|${frameLine}|${pinned ? 1 : 0}`;
        mesh.visible = pinned || now < until;
        if (mesh.visible && want !== shown) { shown = want; draw(); }
      },
    };
  }

  // INSIDE A MOMENT: the player's stage and camera, or null.
  const momentView = () => (ctx.replay && ctx.replay.active && ctx.replay.view) || null;
  let held = null;
  let momentScene = null;
  const _hp = new THREE.Vector3();

  /** What each draw is drawn through while presenting (wrapRender): the map's frame, a Moment's, or nothing. */
  function choose(sc, cam) {
    const mv = momentView();
    if (cam === camera) return mv ? null : place(sc, camera, null);
    if (mv && cam === mv.camera) { momentScene = sc; return place(sc, cam, mv); }
    return null;
  }

  // The anchor at the camera, level, turned by the snap turns; the stand-in camera's planes in its metres. Inside a Moment
  // the pose is the held one (momentCut), in the stage's metres, relative to where the director stands now.
  function place(sc, cam, mv) {
    if (anchor.parent !== sc) sc.add(anchor);
    _f.set(0, 0, -1).applyQuaternion(cam.quaternion);
    let up = [cam.up.x, cam.up.y, cam.up.z];
    let fwd = [_f.x, _f.y, _f.z];
    let P = cam.position;
    let s;
    if (mv) {
      const o = mv.origin || [0, 0, 0];
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (momentCut(held, fwd, up, now)) held = { fwd, up, origin: [o[0], o[1], o[2]], at: now };
      up = held.up;
      fwd = held.fwd;
      P = _hp.set(held.origin[0] - o[0], held.origin[1] - o[1], held.origin[2] - o[2]);
      s = 1; // the Moment's stage is in metres
    } else {
      held = null;
      const ground = !!(ctx.skyView && ctx.skyView.active);
      const rs = ctx.cameraRig && ctx.cameraRig.state;
      s = unitsPerMetre({ ground, unitKm: ctx.stage && ctx.stage.unitKm, distance: rs ? rs.cameraDistance || rs.distance : 0 });
    }
    const b = levelBasis(up, fwd, yaw);
    _m.set(
      b.x[0] * s, b.y[0] * s, b.z[0] * s, P.x,
      b.x[1] * s, b.y[1] * s, b.z[1] * s, P.y,
      b.x[2] * s, b.y[2] * s, b.z[2] * s, P.z,
      0, 0, 0, 1,
    );
    _inv.copy(sc.matrixWorld).invert();
    anchor.matrix.multiplyMatrices(_inv, _m);
    anchor.matrixWorldNeedsUpdate = true;
    _rot.makeBasis(_x.fromArray(b.x), _y.fromArray(b.y), _z.fromArray(b.z));
    _q.setFromRotationMatrix(_rot);
    const nf = xrNearFar(cam.near, cam.far, s);
    proxy.near = nf.near;
    proxy.far = nf.far;
    proxy.layers.mask = cam.layers.mask;
    return proxy;
  }

  // What is straight ahead of the eyes: the 2D camera turned to the head's look for one decision, and turned back.
  function gazeChoose() {
    const head = renderer.xr.getCamera();
    const canvas = renderer.domElement;
    if (!head || !canvas || !canvas.getBoundingClientRect) return null;
    const keep = camera.quaternion.clone();
    camera.quaternion.copy(_q).multiply(head.quaternion);
    camera.updateMatrixWorld(true);
    _p.set(0, 0, -1).applyQuaternion(camera.quaternion).add(camera.position).project(camera);
    const r = canvas.getBoundingClientRect();
    let rec = null;
    try { rec = chooseAt(ctx, r.left + ((_p.x + 1) / 2) * r.width, r.top + ((1 - _p.y) / 2) * r.height); } finally {
      camera.quaternion.copy(keep);
      camera.updateMatrixWorld(true);
    }
    return rec;
  }

  // A cut of the rig: the same target, at `factor` times the distance or `dAz` further round.
  function cut(factor, dAz) {
    const rig = ctx.cameraRig;
    if (!rig || typeof rig.saveState !== 'function') return;
    const s = rig.saveState();
    s.distance *= factor;
    s.azimuth += dAz;
    rig.restoreState(s, 0);
  }

  function controls(time) {
    const intent = readXR(session.inputSources);
    const mv = momentView();
    const ground = !!(ctx.skyView && ctx.skyView.active);
    const busy = tripOn(ctx);
    // Inside a Moment the director has the camera: the sticks only turn the viewer, A plays and pauses, B goes back to the map.
    const still = ground || busy || !!mv;
    if (panel) panel.setHelp(mv ? C.momentHelp : C.panelHelp);
    let f = flick(flicks.rx, intent.rx);
    flicks.rx = f.state;
    if (f.fire) yaw -= f.fire * SNAP_DEG * DEG;
    f = flick(flicks.lx, intent.lx);
    flicks.lx = f.state;
    if (f.fire) { if (still) yaw -= f.fire * SNAP_DEG * DEG; else cut(1, -f.fire * ORBIT_STEP_DEG * DEG); }
    f = flick(flicks.ry, intent.ry);
    flicks.ry = f.state;
    if (f.fire && !still) cut(f.fire > 0 ? STEP_FACTOR : 1 / STEP_FACTOR, 0);
    f = flick(flicks.ly, intent.ly);
    flicks.ly = f.state;
    if (f.fire && !busy && !mv) {
      rung = nextRung(rung, f.fire < 0 ? 1 : -1, LADDER_RUNGS.length);
      if (panel) panel.say(goRung(ctx, rung), time);
    }
    const choose1 = () => {
      if (mv) { if (mv.playing) ctx.replay.pause(); else ctx.replay.play(); return; }
      if (busy) return;
      const rec = gazeChoose();
      if (panel) panel.say(rec ? t(C.chosen, { name: rec.name }) : C.nothing, time);
    };
    for (const name of pressed(prev, intent)) {
      if (name === 'a') choose1();
      else if (name === 'x' && !busy && !mv) { if (!goChosen(ctx) && panel) panel.say(COPY.pad.chooseFirst, time); }
      else if (name === 'y' && panel) panel.pin(time);
      else if (name === 'b') bDown = time;
    }
    const rt = intent.rt > 0.6;
    if (rt && !rtWas) choose1();
    rtWas = rt;
    if (intent.b && bDown && time - bDown >= LEAVE_HOLD_MS) { bDown = 0; prev = intent; exit(); return; }
    if (!intent.b && prev.b && bDown) {
      bDown = 0;
      if (mv) ctx.replay.close();
      else if (!busy) goBack(ctx);
    }
    prev = intent;
    // The gaze ring, 1.5 m down the look of this frame's pose (the anchor's metres are the reference space's).
    const head = renderer.xr.getCamera();
    if (ring && head) {
      _f.set(0, 0, -1).applyQuaternion(head.quaternion);
      ring.position.copy(head.position).addScaledVector(_f, 1.5);
      ring.quaternion.copy(head.quaternion);
      ring.visible = !mv;
    }
    if (panel) panel.frame(time);
  }

  // Frame time: the readout, and the two steps down when frames run long.
  let gov = null;
  let lastT = 0;
  function frameTime(time) {
    if (lastT) {
      gov = frameGovernor(gov, time - lastT);
      if (panel && gov.ema > 0) panel.frameTime(t(C.frame, { ms: gov.ema.toFixed(1), fps: Math.round(1000 / gov.ema) }), time);
      if (gov.fire) {
        if (gov.step === 1 && typeof renderer.xr.setFoveation === 'function') renderer.xr.setFoveation(1);
        if (gov.step === 2 && ctx.latch && typeof ctx.latch.force === 'function') ctx.latch.force();
        if (panel) panel.say(C.lighter, time);
      }
    }
    lastT = time;
  }

  function tick(time) {
    if (!session) return;
    frameTime(time);
    try { controls(time); } catch (e) { console.warn('the headset controls failed', e); }
    if (!session) return; // left from the controls
    if (wrap) wrap.reset();
    if (shim) shim.run(time);
    if (wrap && !wrap.drawn) {
      // A frame the loop did not draw (the idle cap) is drawn all the same: a Moment's stage if one is up, else the map.
      const mv = momentView();
      if (mv && momentScene) renderer.render(momentScene, mv.camera); else renderer.render(scene, camera);
    }
  }

  function motionOff() {
    const html = typeof document !== 'undefined' ? document.documentElement : null;
    if (!html) return;
    motionWas = html.dataset.srMotion;
    html.dataset.srMotion = 'off';
  }
  function motionBack() {
    const html = typeof document !== 'undefined' ? document.documentElement : null;
    if (!html) return;
    if (motionWas === undefined) delete html.dataset.srMotion; else html.dataset.srMotion = motionWas;
  }

  function teardown() {
    if (typeof renderer.setAnimationLoop === 'function') renderer.setAnimationLoop(null);
    if (shim) { shim.restore(); shim = null; }
    if (wrap) { wrap.restore(); wrap = null; }
    if (renderer.xr) renderer.xr.enabled = false;
    if (anchor && anchor.parent) anchor.parent.remove(anchor);
    motionBack();
    if (ctx.rendererApi && typeof ctx.rendererApi.resize === 'function') ctx.rendererApi.resize(true);
  }

  function onEnd() {
    const was = !!session;
    session = null;
    starting = false;
    teardown();
    if (was) say(C.left);
  }

  async function enter() {
    if (session || starting || !xr) return false;
    if (blockedBy(ctx)) { say(C.busy); return false; }
    starting = true;
    let s = null;
    try {
      // Nothing optional is asked for: 'local' is granted to every immersive session, and a floor is not wanted (the
      // eyes go where the 2D camera stands, not 1.6 m above it).
      s = await xr.requestSession(SESSION_MODE);
    } catch (e) {
      starting = false;
      console.warn('the headset session was refused', e);
      say(C.failed);
      return false;
    }
    try {
      build3d();
      scene.add(anchor);
      yaw = 0;
      prev = restIntent();
      wrap = wrapRender(renderer, choose);
      gov = null;
      lastT = 0;
      held = null;
      renderer.xr.enabled = true;
      if (typeof renderer.xr.setReferenceSpaceType === 'function') renderer.xr.setReferenceSpaceType(REFERENCE_SPACE);
      if (typeof renderer.xr.setFoveation === 'function') renderer.xr.setFoveation(FOVEATION_START);
      // Before the session: three stops its window loop when the session starts, and runs this from the session's frames.
      renderer.setAnimationLoop(tick);
      s.addEventListener('end', onEnd, { once: true });
      await renderer.xr.setSession(s);
    } catch (e) {
      console.warn('the headset session could not be set up', e);
      starting = false;
      teardown();
      try { s.end(); } catch { /* already over */ }
      say(C.failed);
      return false;
    }
    session = s;
    starting = false;
    shim = frameShim(win);
    motionOff();
    if (panel) panel.say('', typeof performance !== 'undefined' ? performance.now() : 0);
    return true;
  }

  function exit() {
    if (!session) return;
    try { session.end(); } catch { onEnd(); }
  }

  return {
    get active() { return !!session; },
    enter,
    exit,
    get yawDeg() { return yaw / DEG; },
  };
}

// --- the button and the note ----------------------------------------------------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg';
// A headset seen from the front, after Lucide's `rectangle-goggles` (ISC, CREDITS.md), on the 24-unit box.
const GOGGLES_PATH = 'M20 6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4a2 2 0 0 1-1.6-.8l-1.6-2.13a1 1 0 0 0-1.6 0L9.6 17.2A2 2 0 0 1 8 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z';

function goggles() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of [['viewBox', '0 0 24 24'], ['width', '20'], ['height', '20'], ['fill', 'none'], ['stroke', 'currentColor'], ['stroke-width', '1.75'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round'], ['aria-hidden', 'true'], ['focusable', 'false'], ['class', 'sr-icon sr-icon--goggles']]) svg.setAttribute(k, v);
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', GOGGLES_PATH);
  svg.appendChild(p);
  return svg;
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

/** The note before entering: a modal dialog whose Enter is the gesture WebXR needs. */
function openNote(hs, opener) {
  const C = COPY.headset;
  const dlg = el('dialog', 'sr-xrnote sr-float');
  dlg.setAttribute('aria-labelledby', 'sr-xrnote-title');
  const h = el('h2', 'sr-xrnote__title', C.noteTitle);
  h.id = 'sr-xrnote-title';
  dlg.appendChild(h);
  for (const [key, cls] of [['comfort', ''], ['seizure', ' sr-xrnote__p--warn'], ['how', ''], ['untried', ' sr-xrnote__p--dim']]) dlg.appendChild(el('p', `sr-xrnote__p${cls}`, C[key]));
  const row = el('div', 'sr-xrnote__row');
  const no = el('button', 'ui-btn ui-btn--quiet sr-xrnote__btn', C.cancel);
  no.type = 'button';
  const go = el('button', 'ui-btn ui-btn--primary sr-xrnote__btn', C.go);
  go.type = 'button';
  row.appendChild(no);
  row.appendChild(go);
  dlg.appendChild(row);
  document.body.appendChild(dlg);
  const close = () => { if (dlg.open) dlg.close(); dlg.remove(); if (opener && opener.focus) opener.focus(); };
  no.addEventListener('click', close);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  go.addEventListener('click', () => { hs.enter(); close(); });
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  go.focus();
  return dlg;
}

function mountButtons(ctx, hs) {
  const C = COPY.headset;
  const rail = ctx.rail && ctx.rail.root;
  if (!rail || rail.querySelector('.sr-rail__btn--headset')) return;
  const btn = el('button', 'sr-rail__btn sr-rail__btn--headset');
  btn.type = 'button';
  btn.setAttribute('aria-label', C.enter);
  btn.title = C.enterTitle;
  btn.appendChild(goggles());
  btn.addEventListener('click', () => openNote(hs, btn));
  rail.insertBefore(btn, rail.querySelector('.sr-rail__btn--github') || rail.querySelector('.sr-rail__btn--more'));
  // The phone's More menu: a row of its own, the menu's way (ui/rail.js menuRow).
  const menu = document.getElementById('sr-more');
  if (menu) {
    const row = el('button', 'sr-more__item sr-more__item--headset');
    row.type = 'button';
    row.setAttribute('role', 'menuitem');
    row.tabIndex = -1;
    row.appendChild(goggles());
    row.appendChild(el('span', null, C.enter));
    row.addEventListener('click', () => {
      if (ctx.rail && typeof ctx.rail.closeMore === 'function') ctx.rail.closeMore();
      openNote(hs, document.querySelector('.sr-rail__btn--more'));
    });
    menu.insertBefore(row, menu.firstChild);
  }
}

/**
 * main.js calls this once navigator.xr has said an immersive-vr session is supported. `env.xr` stands in for
 * navigator.xr (a test, a probe).
 */
export function mountHeadset(ctx, env = {}) {
  if (ctx.headset) return ctx.headset;
  const xr = env.xr || (typeof navigator !== 'undefined' ? navigator.xr : null);
  if (!xr) return null;
  const hs = createHeadset(ctx, { ...env, xr });
  ctx.headset = hs;
  const mount = () => loadCss('xr').then(() => mountButtons(ctx, hs));
  if (typeof window === 'undefined') return hs;
  if (window.__srLayersReady) mount(); else window.addEventListener('sr:layers-ready', mount, { once: true });
  return hs;
}
