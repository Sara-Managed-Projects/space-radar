// tests/test_headset.mjs -- the headset mode (forge #158): ui/headset.js against a MOCKED navigator.xr and a stand-in
// renderer. No headset has run this; what is held here is the session logic, not a picture in a Quest.
//
//   node tests/test_headset.mjs
//
// THE ANCHOR is level (its up is the camera's up, its forward the camera's look laid flat) and a snap turn turns it about
// that up. THE SCALE is a true metre on the ground and a twentieth of the distance in space. THE FRAME SHIM queues the
// window's requestAnimationFrame for the session's frame and gives it back after. THE RENDER WRAP draws the 2D camera's
// frame through the stand-in and drops any other camera's, only while presenting. THE SESSION: Enter asks for
// 'immersive-vr' with nothing optional, sets the 'local' space and the loop before the session, drives main.js's loop from
// the session's frames, draws a frame the loop skipped, snaps 30 degrees per push of the right stick, leaves on B held for
// a second, and puts everything back when the session ends (the window's frame function, the renderer, the scene, the
// motion choice). A refused session and a Moment on screen leave the page as it was. THE BOOT GRAPH asks
// isSessionSupported('immersive-vr') and imports the module only on a yes.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const mod = (rel) => import(pathToFileURL(join(ROOT, 'site/js', rel)).href);
const H = await mod('ui/headset.js');
const { COPY } = await mod('copy/en.js');
const THREE = await import(pathToFileURL(join(ROOT, 'site/vendor/three.module.min.js')).href);
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);

// --- the anchor -----------------------------------------------------------------------------------------------------------
const b0 = H.levelBasis([0, 0, 1], [0.6, 0, -0.8]); // Z up (earth-inertial), looking forward and down
check(near(len(b0.x), 1) && near(len(b0.y), 1) && near(len(b0.z), 1) && near(dot(b0.x, b0.y), 0) && near(dot(b0.y, b0.z), 0) && near(dot(b0.x, b0.z), 0), 'the anchor\'s axes are orthonormal');
check(near(b0.y[2], 1) && near(b0.z[2], 0) && near(b0.z[0], -1), 'its up is the camera\'s up and its -z the look laid flat: the pitch is dropped, the horizon level');
const xy = [b0.x[1] * b0.y[2] - b0.x[2] * b0.y[1], b0.x[2] * b0.y[0] - b0.x[0] * b0.y[2], b0.x[0] * b0.y[1] - b0.x[1] * b0.y[0]];
check(near(dot(xy, b0.z), 1), 'the frame is right-handed (x cross y is z)');
const turned = H.levelBasis([0, 1, 0], [0, 0, -1], 90 * Math.PI / 180);
check(near(turned.z[0], 1, 1e-9) && near(turned.z[2], 0, 1e-9), 'a yaw of +90 degrees turns the look from -z to -x (counter-clockwise seen from above)');
const right = H.levelBasis([0, 1, 0], [0, 0, -1], -H.SNAP_DEG * Math.PI / 180);
check(right.z[0] < 0 && near(right.y[1], 1), 'a snap turn to the right turns about the up and nothing else');
const straightUp = H.levelBasis([0, 1, 0], [0, 1, 0]);
check(near(len(straightUp.z), 1) && near(dot(straightUp.z, straightUp.y), 0), 'a look straight up still makes a level frame');

// --- the scale, the planes, the refusals ------------------------------------------------------------------------------------
check(near(H.unitsPerMetre({ ground: true, unitKm: 1000 }), 1e-6), 'on the ground a metre is a true metre (1e-6 units at 1 000 km a unit)');
check(near(H.unitsPerMetre({ ground: false, distance: 40 }), 2) && H.SEEMS_M === 20, 'in space what the camera looks at seems 20 m away');
check(H.unitsPerMetre({}) === 1, 'with nothing known, a unit a metre');
const nf = H.xrNearFar(1e-5, 1e9, 1e-6);
check(near(nf.near, H.NEAR_M) && near(nf.far, 1e15), 'the near plane is never past NEAR_M (the panel at 1.4 m) and the far is the camera\'s, in metres');
check(near(H.xrNearFar(1e-9, 10, 1).near, 1e-9), 'a nearer 2D near plane is kept');
check(H.blockedBy({}) === null && H.blockedBy({ replay: { active: true } }) === null && H.blockedBy({ projection: { active: true } }) === 'projection'
  && H.blockedBy({ recorder: { active: true } }) === 'recording' && H.blockedBy({ imagine: { active: true } }) === 'imagine', 'an imagined world, Dome and 360 or a recording keeps the headset out; a Moment does not');

// --- inside a Moment: cuts, never a forced turn ----------------------------------------------------------------------
const UP = [0, 1, 0];
check(H.momentCut(null, [0, 0, -1], UP, 0), 'the first frame of a Moment takes the director\'s pose');
const held0 = { fwd: [0, 0, -1], up: UP, at: 1000 };
check(!H.momentCut(held0, [Math.sin(0.3), 0, -Math.cos(0.3)], UP, 2000), 'a heading turned 17 degrees a second later is not followed: the viewer is not turned');
check(H.momentCut(held0, [Math.sin(0.6), 0, -Math.cos(0.6)], UP, 2000), 'a heading turned past 30 degrees is a cut');
check(H.momentCut(held0, [0, 0, -1], UP, 1000 + H.MOMENT_CUT_MS), 'and every MOMENT_CUT_MS the director\'s new place is a cut');
check(!H.momentCut(held0, [0, -0.9, -0.4], UP, 2000), 'the director looking down is not a cut: the horizon stays level, only the heading counts');
check(H.momentCut(held0, [0, 0, -1], [0.5, 0.86, 0], 2000), 'a shot with another up (somewhere else) is a cut');

// --- frame time --------------------------------------------------------------------------------------------------------
let g = null;
for (let i = 0; i < 200; i += 1) g = H.frameGovernor(g, 1000 / 72);
check(near(g.ema, 1000 / 72, 1e-6) && g.step === 0, 'frames at 72 a second read 13.9 ms and draw everything');
let fires = 0;
for (let i = 0; i < 400; i += 1) { g = H.frameGovernor(g, 25); if (g.fire) fires += 1; }
check(fires === 2 && g.step === 2, 'frames at 40 a second step down twice, LONG_RUN frames apart, and no further');
const g2 = H.frameGovernor({ ema: 14, long: 3, step: 0 }, 5000);
check(!g2.fire && g2.ema === 14 && g2.long === 3, 'a gap of seconds (a pause, the system menu) is not a frame');

// --- the frame shim ---------------------------------------------------------------------------------------------------------
function fakeWindow() {
  const native = [];
  const cancelled = [];
  const win = {
    native, cancelled,
    requestAnimationFrame(cb) { native.push(cb); return native.length; },
    cancelAnimationFrame(id) { cancelled.push(id); },
  };
  win.origRaf = win.requestAnimationFrame;
  return win;
}
{
  const win = fakeWindow();
  const shim = H.frameShim(win);
  const seen = [];
  const again = (t) => { seen.push(['again', t]); win.requestAnimationFrame(again); };
  win.requestAnimationFrame(again);
  const gone = win.requestAnimationFrame(() => seen.push(['gone']));
  win.cancelAnimationFrame(gone);
  win.cancelAnimationFrame(3); // a native id
  check(win.native.length === 0 && shim.waiting === 1, 'while the shim is on, the window\'s requestAnimationFrame queues for the session');
  check(win.cancelled.length === 1 && win.cancelled[0] === 3, 'cancel takes its own ids out of the queue and hands the window\'s back to the window');
  check(shim.run(100) === 1 && seen.length === 1 && seen[0][1] === 100, 'a session frame runs what was queued, with the session\'s time');
  check(shim.waiting === 1, 'what a callback queues waits for the next session frame');
  shim.restore();
  check(win.requestAnimationFrame === win.origRaf && win.native.length === 1, 'restore puts the window\'s function back and hands it what was waiting');
}

// --- the render wrap --------------------------------------------------------------------------------------------------------
{
  const main = new THREE.PerspectiveCamera();
  const other = new THREE.PerspectiveCamera();
  const proxy = new THREE.PerspectiveCamera();
  const drawn = [];
  const renderer = { xr: { isPresenting: false }, render(scene, cam) { drawn.push(cam); } };
  const orig = renderer.render;
  const w = H.wrapRender(renderer, (sc, cam) => (cam === main ? proxy : null));
  renderer.render({}, main);
  renderer.render({}, other);
  check(drawn[0] === main && drawn[1] === other && w.drawn === 0, 'not presenting, every draw is as it was');
  renderer.xr.isPresenting = true;
  renderer.render({}, main);
  renderer.render({}, other);
  check(drawn.length === 3 && drawn[2] === proxy && w.drawn === 1, 'presenting, the 2D camera\'s frame is drawn through the stand-in and another camera\'s is dropped');
  w.restore();
  check(renderer.render === orig, 'restore puts the renderer\'s own render back');
}

// --- the session, against a mocked navigator.xr --------------------------------------------------------------------------
class FakeSession {
  constructor() { this.inputSources = []; this.listeners = {}; this.ended = false; }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  end() { if (this.ended) return Promise.resolve(); this.ended = true; for (const fn of this.listeners.end || []) fn({ type: 'end' }); return Promise.resolve(); }
}
function fakeXr({ refuse = false } = {}) {
  const asked = [];
  return {
    asked, session: null,
    isSessionSupported: async (mode) => mode === 'immersive-vr',
    requestSession(mode, init) {
      asked.push({ mode, init });
      if (refuse) return Promise.reject(new Error('NotAllowedError'));
      this.session = new FakeSession();
      return Promise.resolve(this.session);
    },
  };
}
function fakeRenderer() {
  const r = {
    drawn: [], loop: null, loops: [],
    xr: {
      enabled: false, isPresenting: false, refSpace: null, foveation: null, cam: new THREE.PerspectiveCamera(),
      setReferenceSpaceType(t) { this.refSpace = t; },
      setFoveation(f) { this.foveation = f; },
      async setSession(s) { this.session = s; this.isPresenting = true; s.addEventListener('end', () => { this.isPresenting = false; }); },
      getCamera() { return this.cam; },
    },
    setAnimationLoop(cb) { r.loop = cb; r.loops.push(cb); },
    render(scene, cam) { r.drawn.push(cam); },
    domElement: null,
  };
  return r;
}
const ctl = (handedness, axes, down = {}) => ({ handedness, gamepad: { mapping: 'xr-standard', axes, buttons: Array.from({ length: 6 }, (_, i) => ({ pressed: !!down[i], value: down[i] ? 1 : 0 })) } });

{
  const xr = fakeXr();
  const renderer = fakeRenderer();
  const renderOrig = renderer.render;
  const win = fakeWindow();
  const said = [];
  let resized = 0;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 1e-5, 1e9);
  camera.position.set(0, 0, 20);
  camera.lookAt(0, 0, 0);
  const ctx = { renderer, scene, camera, cameraRig: { state: { distance: 20, cameraDistance: 20 } }, stage: { unitKm: 1000 }, rendererApi: { resize() { resized += 1; } } };
  const hs = H.createHeadset(ctx, { xr, win, say: (l) => said.push(l) });
  check(!hs.active, 'nothing happens before Enter');
  const ok = await hs.enter();
  check(ok && hs.active, 'Enter starts a session');
  check(xr.asked.length === 1 && xr.asked[0].mode === 'immersive-vr' && xr.asked[0].init === undefined, 'it asks for immersive-vr with nothing optional');
  check(renderer.xr.enabled && renderer.xr.refSpace === 'local' && renderer.xr.foveation === H.FOVEATION_START, 'the renderer presents in the local space with fixed foveation');
  check(renderer.loops.length === 1 && typeof renderer.loop === 'function', 'the loop is set before the session, so three runs it from the session\'s frames');
  check(scene.children.some((c) => c.name === 'sr-headset-anchor'), 'the anchor is in the scene');
  check(win.requestAnimationFrame !== win.origRaf, 'main.js\'s requestAnimationFrame now waits for the session');
  // main.js's loop: it asks for its next frame and draws.
  let frames = 0;
  let going = true;
  const frame = () => { frames += 1; if (going) win.requestAnimationFrame(frame); renderer.render(scene, camera); };
  win.requestAnimationFrame(frame);
  renderer.loop(1000);
  check(frames === 1 && renderer.drawn.length === 1 && renderer.drawn[0] !== camera && renderer.drawn[0].isPerspectiveCamera, 'a session frame runs the loop, which draws through the stand-in');
  const proxy = renderer.drawn[0];
  check(proxy.parent && proxy.parent.name === 'sr-headset-anchor', 'the stand-in hangs under the anchor, so three puts the head\'s pose under it');
  const anchorMatrix = proxy.parent.matrix.elements;
  check(near(anchorMatrix[12], 0) && near(anchorMatrix[13], 0) && near(anchorMatrix[14], 20), 'the anchor stands where the 2D camera stands');
  check(near(Math.hypot(anchorMatrix[0], anchorMatrix[1], anchorMatrix[2]), 1), 'a metre there is a twentieth of the distance (20 units away: 1 unit a metre)');
  check(near(camera.position.z, 20) && camera.parent === null, 'the 2D camera is not moved or re-parented');
  // A frame the loop skipped (the idle cap) is drawn all the same, and a frame it drew is not drawn twice.
  going = false;
  renderer.loop(1008);
  check(frames === 2 && renderer.drawn.length === 2, 'a frame the loop drew is drawn once');
  const skipped = () => { win.requestAnimationFrame(skipped); };
  win.cancelAnimationFrame(win.requestAnimationFrame(() => {}));
  win.requestAnimationFrame(skipped);
  renderer.loop(1016);
  check(renderer.drawn.length === 3 && renderer.drawn[2] === proxy, 'a session frame the loop did not draw is drawn anyway, through the stand-in');
  // Snap turns: one per push of the right stick.
  xr.session.inputSources = [ctl('right', [0, 0, 0.95, 0])];
  renderer.loop(1033);
  renderer.loop(1050);
  check(near(hs.yawDeg, -30), 'the right stick pushed right turns 30 degrees, once however long it is held');
  xr.session.inputSources = [ctl('right', [0, 0, 0, 0])];
  renderer.loop(1066);
  xr.session.inputSources = [ctl('right', [0, 0, -0.95, 0])];
  renderer.loop(1083);
  check(near(hs.yawDeg, 0), 'released and pushed the other way, it turns back');
  // Hold B for a second to leave.
  xr.session.inputSources = [ctl('right', [0, 0, 0, 0], { 5: 1 })];
  renderer.loop(2000);
  check(hs.active, 'B held for less than a second does not leave');
  renderer.loop(3100);
  check(!hs.active && xr.session.ended, 'B held for a second ends the session');
  check(!renderer.xr.enabled && renderer.render === renderOrig && renderer.loop === null, 'the renderer is put back: XR off, its own render, no loop');
  check(win.requestAnimationFrame === win.origRaf && win.native.length >= 1, 'the window\'s frame function is back, and main.js\'s loop goes on with it');
  check(!scene.children.some((c) => c.name === 'sr-headset-anchor') && resized === 1, 'the anchor is gone and the canvas is resized to the page again');
  check(said.length === 1 && said[0] === COPY.headset.left, 'one line says the screen is back');
  // Enter again after leaving.
  check(await hs.enter() && hs.active, 'the headset can be entered again');
  await xr.session.end();
  check(!hs.active && win.requestAnimationFrame === win.origRaf, 'a session ended from the headset\'s own menu puts everything back too');
}

{
  const xr = fakeXr({ refuse: true });
  const renderer = fakeRenderer();
  const win = fakeWindow();
  const said = [];
  const ctx = { renderer, scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(), rendererApi: {} };
  const hs = H.createHeadset(ctx, { xr, win, say: (l) => said.push(l) });
  check((await hs.enter()) === false && !hs.active && !renderer.xr.enabled && win.requestAnimationFrame === win.origRaf && said.length === 1, 'a refused session leaves the page as it was, and says so');
  const busy = H.createHeadset({ ...ctx, imagine: { active: true } }, { xr: fakeXr(), win, say: (l) => said.push(l) });
  check((await busy.enter()) === false && said.length === 2, 'with an imagined world on screen Enter is refused before a session is asked for');
}

// --- a Moment in the headset, against the same mocks ------------------------------------------------------------------
{
  const xr = fakeXr();
  const renderer = fakeRenderer();
  const win = fakeWindow();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const mScene = new THREE.Scene();
  const mCam = new THREE.PerspectiveCamera(40, 1.6, 0.1, 1e12); // at the stage's origin, as moments/stage.js keeps it
  mCam.lookAt(0, 0, -1);
  const calls = [];
  const view = { camera: mCam, origin: [100, 0, 0], playing: false };
  let forced = 0;
  const ctx = {
    renderer, scene, camera, rendererApi: {}, latch: { force() { forced += 1; return true; } },
    replay: { active: true, get view() { return view; }, play() { calls.push('play'); }, pause() { calls.push('pause'); }, close() { calls.push('close'); this.active = false; }, render() { renderer.render(mScene, mCam); } },
  };
  const hs = H.createHeadset(ctx, { xr, win, say: () => {} });
  check(await hs.enter(), 'a Moment on screen can be entered');
  check(renderer.xr.foveation === H.FOVEATION_START, 'the session starts at the lighter foveation, with room to step down');
  const frame = () => { win.requestAnimationFrame(frame); renderer.render(scene, camera); ctx.replay.render(); };
  win.requestAnimationFrame(frame);
  // performance.now() is the Moment's clock for the cuts; the session's own time drives the frames.
  const realNow = performance.now.bind(performance);
  let clock = 50000;
  performance.now = () => clock;
  let T = 1000;
  const step = (ms = 1000 / 72) => { T += ms; renderer.loop(T); };
  step();
  const drawnMoment = renderer.drawn.filter((c) => c !== camera);
  check(renderer.drawn.length === 1 && drawnMoment.length === 1 && drawnMoment[0].parent.parent === mScene, 'the map\'s frame is dropped and the Moment\'s drawn through the anchor, now in the Moment\'s scene');
  const anchorOf = () => renderer.drawn[renderer.drawn.length - 1].parent;
  check(near(anchorOf().matrix.elements[12], 0) && near(Math.hypot(...anchorOf().matrix.elements.slice(0, 3)), 1), 'the viewer stands where the director stands, a metre a metre');
  view.origin = [110, 0, 0]; // the director moved 10 m
  mCam.lookAt(Math.sin(0.3), 0, -Math.cos(0.3)); // and turned 17 degrees
  clock += 1000;
  step();
  check(near(anchorOf().matrix.elements[12], -10) && near(anchorOf().matrix.elements[8], 0, 1e-9), 'a second later the viewer has not been carried or turned: the director is 10 m on, the heading held');
  clock += H.MOMENT_CUT_MS;
  step();
  check(near(anchorOf().matrix.elements[12], 0) && Math.abs(anchorOf().matrix.elements[8]) > 0.2, 'then a cut: the director\'s new place and heading at once');
  // Controls inside a Moment: A plays, B (short) goes back to the map.
  xr.session.inputSources = [ctl('right', [0, 0, 0, 0], { 4: 1 })];
  step();
  xr.session.inputSources = [ctl('right', [0, 0, 0, 0], { 5: 1 })];
  step();
  xr.session.inputSources = [ctl('right', [0, 0, 0, 0])];
  step();
  check(calls.join() === 'play,close' && hs.active, 'A plays the Moment, a short B closes it and the headset stays on');
  // Long frames: two steps down, then no more.
  for (let i = 0; i < 400; i += 1) step(25);
  check(renderer.xr.foveation === 1 && forced === 1, 'frames running long raise the foveation, then trip the frame latch');
  performance.now = realNow;
  await xr.session.end();
  check(!hs.active && !mScene.children.some((c) => c.name === 'sr-headset-anchor'), 'leaving takes the anchor out of the Moment\'s scene too');
}

// --- the pad and the headset agree on Y ----------------------------------------------------------------------------------
{
  const G = await mod('ui/gamepad.js');
  const rows = G.hintRows(COPY.pad);
  const y = rows.find((r) => r[0] === 'y');
  check(y && y[2] === COPY.pad.controls && /\bY\b/.test(COPY.headset.how) && /\bY\b/.test(COPY.headset.panelHelp), 'Y shows the controls on a pad and in the headset alike');
  const src = readFileSync(join(ROOT, 'site/js/ui/headset.js'), 'utf8');
  check(/name === 'y' && panel\) panel\.pin/.test(src), 'the headset\'s Y pins its controls panel');
}

// --- the boot graph asks first --------------------------------------------------------------------------------------------
const main = readFileSync(join(ROOT, 'site/js/main.js'), 'utf8');
const block = (main.match(/\/\/ b200-f8-xr: begin[\s\S]*?\/\/ b200-f8-xr: end/) || [''])[0];
check(/isSessionSupported\('immersive-vr'\)\.then\(\(ok\) => ok && import\('\.\/ui\/headset\.js'\)/.test(block), 'main.js imports ui/headset.js only when isSessionSupported(\'immersive-vr\') says yes');
check(/if \(!embed\)/.test(block), 'never in an embed');

if (problems.length) {
  console.error(`test_headset: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('test_headset: the level anchor, the scale, the frame shim, the render wrap, the session with a mocked navigator.xr and the boot gate hold (no real headset was used)');
