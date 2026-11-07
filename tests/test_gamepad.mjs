// tests/test_gamepad.mjs -- free flight with a gamepad (forge #164): ui/padmap.js's mapping and ui/gamepad.js's pure parts.
//
//   node tests/test_gamepad.mjs
//
// THE DEAD ZONE is radial (a diagonal keeps its direction) and rescaled, THE CURVE is odd and gentle near the middle, A
// TRIGGER ignores its slack. THE STANDARD LAYOUT reads an Xbox pad and a PlayStation pad the same, and a pad that is not
// on it gives its left stick only. TWO XR CONTROLLERS read as one pad. THE DIRECTIONS AND RATES are the held keys' own
// (read out of scene/camera.js, so the two cannot drift apart), and the rig's nudge() moves the camera the way ArrowLeft
// does. THE SHIP builds up, coasts, stops on a stick press and is capped. THE FLICK fires once per push. THE HINT opens
// once, and not at all where storage throws. THE BOOT GRAPH only listens: main.js imports ui/gamepad.js on
// `gamepadconnected`, and nothing at boot imports the pad's modules.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const mod = (rel) => import(pathToFileURL(join(ROOT, 'site/js', rel)).href);
const P = await mod('ui/padmap.js');
const G = await mod('ui/gamepad.js');
const { COPY } = await mod('copy/en.js');
const THREE = await import(pathToFileURL(join(ROOT, 'site/vendor/three.module.min.js')).href);
const { createCameraRig } = await mod('scene/camera.js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

// --- the dead zone, the curve, the trigger ------------------------------------------------------------------------------
check(P.deadzone(0.1, 0.1).x === 0 && P.deadzone(0.1, 0.1).y === 0, 'a stick resting inside the dead zone reads nothing');
const d1 = P.deadzone(0.6, 0.6);
check(near(d1.x, d1.y) && d1.x > 0, 'a diagonal keeps its direction (radial, not a square cut)');
check(near(Math.hypot(P.deadzone(1, 0).x, P.deadzone(1, 0).y), 1) && near(P.deadzone(0, -0.97).y, -1), 'full deflection (and past the outer edge) is 1');
check(near(P.deadzone(P.INNER_DEAD + 1e-6, 0).x, 0, 1e-4), 'the response starts at zero just outside the dead zone, without a jump');
check(P.curve(0) === 0 && near(P.curve(1), 1) && near(P.curve(-1), -1), 'the curve keeps 0 and the ends');
check(near(P.curve(-0.4), -P.curve(0.4)), 'the curve is odd');
let mono = true;
for (let v = -1; v < 1; v += 0.05) if (P.curve(v + 0.05) <= P.curve(v)) mono = false;
check(mono, 'the curve only rises');
check(P.curve(0.5) < 0.5 && P.curve(0.5) > 0, 'the curve is gentler than a straight line near the middle');
check(P.trigger(0.03) === 0 && near(P.trigger(1), 1) && P.trigger(0.5) > 0.45, 'a trigger ignores its slack and reaches 1');
check(P.deadzone(NaN, undefined).x === 0 && P.trigger(NaN) === 0, 'a missing axis reads nothing');

// --- the standard layout: Xbox and PlayStation read the same --------------------------------------------------------------
const pad = (mapping, axes, down = {}, id = 'pad') => ({
  id, mapping, connected: true, timestamp: 1, axes,
  buttons: Array.from({ length: 17 }, (_, i) => {
    const v = down[i] ?? 0;
    return { pressed: v > 0.5, value: v };
  }),
});
const S = P.STANDARD;
const axes = [-0.8, 0.2, 0.5, -1];
const press = { [S.a]: 1, [S.rt]: 1, [S.up]: 1, [S.ls]: 1 };
const xbox = P.readStandard(pad('standard', axes, press, 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)'));
const ps = P.readStandard(pad('standard', axes, press, 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)'));
check(JSON.stringify(xbox) === JSON.stringify(ps), 'an Xbox pad and a PlayStation pad on the standard layout read the same');
check(xbox.a && !xbox.b && xbox.up && xbox.stop && near(xbox.rt, 1) && xbox.lt === 0, 'A, the D-pad, a stick press and the right trigger are where the standard layout puts them');
check(xbox.lx < 0 && xbox.ry < 0 && xbox.rx > 0, 'the four axes are the two sticks, up negative as the Gamepad API reports it');
const odd = P.readStandard(pad('', axes, press));
check(!odd.standard && odd.lx < 0 && odd.rx === 0 && odd.ry === 0 && !odd.a && odd.rt === 0, 'a pad off the standard layout gives its left stick and nothing guessed');
check(P.readStandard(null).lx === 0 && P.readStandard({}).standard === true, 'no pad reads as rest');
check(P.STANDARD.a === 0 && P.STANDARD.b === 1 && P.STANDARD.x === 2 && P.STANDARD.y === 3 && P.STANDARD.lt === 6 && P.STANDARD.rt === 7 && P.STANDARD.menu === 9 && P.STANDARD.up === 12 && P.STANDARD.down === 13,
  'the indices are the W3C standard mapping\'s');

// --- two XR controllers as one pad ----------------------------------------------------------------------------------------
const ctl = (handedness, axesXr, down = {}) => ({ handedness, gamepad: { mapping: 'xr-standard', axes: axesXr, buttons: Array.from({ length: 7 }, (_, i) => ({ pressed: (down[i] ?? 0) > 0.5, value: down[i] ?? 0 })) } });
const xr = P.readXR([ctl('left', [0, 0, -1, 0], { 0: 1, 4: 1 }), ctl('right', [0, 0, 0, 1], { 4: 1, 5: 0 })]);
check(xr.lx < -0.99 && xr.ry > 0.99 && near(xr.lt, 1) && xr.x && xr.a && !xr.b && !xr.y, 'the left controller is the left stick, trigger and X; the right is the right stick, A and B');
const xr2 = P.readXR([ctl('right', [0.9, 0])]);
check(xr2.rx > 0.8 && xr2.lx === 0, 'a controller with two axes has its stick there');
check(!P.readXR([]).standard && !P.readXR([{ handedness: 'left' }]).standard, 'no controllers, or one without a gamepad, read as rest');

// --- edges, speed, rates ----------------------------------------------------------------------------------------------------
check(JSON.stringify(P.pressed({ a: true }, { a: true, b: true, x: false })) === '["b"]', 'a held button acts once; a new one acts');
check(near(P.speedOf({ rt: 1, lt: 0 }), 4) && near(P.speedOf({ rt: 0, lt: 1 }), 0.25) && near(P.speedOf({ rt: 0, lt: 0 }), 1), 'the right trigger is 4x, the left a quarter');
// The held keys' rates and directions, read out of scene/camera.js so they cannot drift apart.
const cam = readFileSync(join(ROOT, 'site/js/scene/camera.js'), 'utf8');
const rate = (name) => Number((cam.match(new RegExp(`const ${name} = ([0-9.]+)`)) || [])[1]);
check(rate('KEY_ORBIT_RAD_PER_S') === P.TURN_RAD_PER_S && rate('KEY_DOLLY_LOG_PER_S') === P.DOLLY_LOG_PER_S && rate('KEY_PAN_PER_S') === P.PAN_PER_S,
  'full deflection is the held keys\' rates (scene/camera.js KEY_*_PER_S)');
check(/held\.has\('ArrowLeft'\)\) az \+= 1/.test(cam) && /held\.has\('ArrowUp'\)\) polar \+= 1/.test(cam), 'the camera still reads ArrowLeft as +azimuth and ArrowUp as +polar');
const left = P.rates({ ...P.restIntent(), lx: -1 });
const up = P.rates({ ...P.restIntent(), ly: -1 });
const fwd = P.rates({ ...P.restIntent(), ry: -1 });
const rightSlide = P.rates({ ...P.restIntent(), rx: 1 });
check(left.az > 0 && up.pol > 0, 'the left stick to the left turns as ArrowLeft does, up as ArrowUp does');
check(fwd.dolly < 0 && rightSlide.pan > 0, 'the right stick up flies in (as W), to the right slides as Shift+ArrowRight');
check(near(P.rates({ ...P.restIntent(), ry: -1, rt: 1 }).dolly, 4 * fwd.dolly) && near(P.rates({ ...P.restIntent(), lx: -1, rt: 1 }).az, left.az),
  'the triggers scale the flying, not the turning');

// --- the rig: nudge() is the held keys' path ------------------------------------------------------------------------------
{
  const camera = new THREE.PerspectiveCamera(45, 1, 1e-5, 1e9);
  camera.position.set(0, 0, 20);
  const rig = createCameraRig(camera, null, { keyTarget: null });
  const kinds = [];
  rig.onUserInput((k) => kinds.push(k));
  const az0 = rig.state.azimuth;
  for (let i = 0; i < 30; i += 1) {
    rig.nudge(left.az * 0.016, 0, 0, 0, i === 0 ? 'pad' : '');
    rig.update(0.016);
  }
  check(rig.state.azimuth > az0 + 0.3, 'a stick to the left for half a second turns the rig toward +azimuth, as ArrowLeft');
  check(kinds.length === 1 && kinds[0] === 'pad', 'the hand on the controls is heard once per push, not every frame');
  const d0 = rig.state.distance;
  for (let i = 0; i < 30; i += 1) { rig.nudge(0, 0, fwd.dolly * 0.016, 0, ''); rig.update(0.016); }
  check(rig.state.distance < d0, 'the right stick up brings the camera in');
  rig.dispose();
}

// --- the ship ---------------------------------------------------------------------------------------------------------------
const want = P.rates({ ...P.restIntent(), lx: -1 });
check(JSON.stringify(P.shipStep(null, want, 0.016, false)) === JSON.stringify(want), 'without the ship the motion is what the sticks ask');
let v = { az: 0, pol: 0, dolly: 0, pan: 0 };
for (let i = 0; i < 50; i += 1) v = P.shipStep(v, want, 0.016, true); // 0.8 s of thrust
check(v.az > 0.8 * want.az && v.az < 1.2 * want.az, 'with the ship, full stick builds to about the plain rate in ACCEL_S');
let coast = v;
for (let i = 0; i < 250; i += 1) coast = P.shipStep(coast, P.rates(P.restIntent()), 0.016, true); // 4 s let go
check(near(coast.az, v.az / 2, v.az * 0.02), 'let go, the ship coasts and halves in COAST_HALF_S');
check(P.shipStep(coast, want, 0.016, true, true).az === 0, 'a stick pressed in stops the ship at once');
let flung = v;
for (let i = 0; i < 2000; i += 1) flung = P.shipStep(flung, want, 0.05, true);
check(flung.az <= P.TURN_RAD_PER_S * P.SHIP_MAX + 1e-9, 'the ship cannot build past SHIP_MAX times the plain rate');

// --- the flick and the ladder -----------------------------------------------------------------------------------------------
let f = P.flick(0, 0.8);
check(f.fire === 1 && f.state === 1, 'a push past the threshold fires once');
f = P.flick(f.state, 0.9);
check(f.fire === 0, 'held there, it does not fire again');
f = P.flick(f.state, 0.5);
check(f.fire === 0 && f.state === 1, 'half way back is not yet released');
f = P.flick(f.state, 0.1);
check(f.state === 0 && P.flick(f.state, -0.75).fire === -1, 'back to the middle re-arms it, and the other way fires -1');
check(P.nextRung(-1, 1, 9) === 0 && P.nextRung(0, -1, 9) === -1 && P.nextRung(-1, -1, 9) === -1 && P.nextRung(8, 1, 9) === 8, 'the ladder runs from the Earth (-1) to the last rung and holds at both ends');

// --- ui/gamepad.js's pure parts ---------------------------------------------------------------------------------------------
const store = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, val) => m.set(k, String(val)), removeItem: (k) => m.delete(k) };
};
const st = store();
check(G.shouldHint(st) === true && G.shouldHint(st) === false, 'the hint opens the first time, once');
const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
check(G.shouldHint(throwing) === false && G.shouldHint(null) === false, 'storage that throws (or none) means no hint by itself');
check(G.readShip(st) === false, 'the ship is off by default');
G.writeShip(st, true);
check(G.readShip(st) === true, 'the ship choice is remembered');
G.writeShip(st, false);
check(G.readShip(st) === false && G.readShip(throwing) === false, 'and forgotten; storage that throws reads as off');
G.writeShip(throwing, true); // must not throw
const a = { ...pad('', [0, 0]), timestamp: 50 };
const b = { ...pad('standard', [0, 0]), timestamp: 10 };
const c = { ...pad('standard', [0, 0]), timestamp: 20 };
check(G.pickPad([null, a, b, c]) === c, 'the pad read is the standard one used last');
check(G.pickPad([a, { ...b, connected: false }]) === a && G.pickPad([null]) === null, 'a disconnected pad is skipped, and none is none');
check(G.padName('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)') === 'Xbox Wireless Controller', 'a pad\'s name loses the vendor and product codes');
check(G.padName('054c-0ce6-DualSense Wireless Controller') === 'DualSense Wireless Controller', 'and Firefox\'s numeric prefix');
await mod('copy/en.xr.js');
const rows = G.hintRows(COPY.pad);
check(rows.length === 9 && rows.every((r) => r.length === 3 && r.every((s) => typeof s === 'string' && s.length > 0)), 'every row of the hint has a control and a sentence');
for (const key of ['title', 'label', 'close', 'shipToggle', 'shipHow', 'notStandard', 'connected', 'disconnected', 'shipOn', 'shipOff', 'nothing', 'chooseFirst', 'rung', 'home', 'trip']) {
  check(typeof COPY.pad[key] === 'string' && COPY.pad[key].length > 0, `COPY.pad.${key} is written`);
}

// --- the boot graph only listens -----------------------------------------------------------------------------------------------
const main = readFileSync(join(ROOT, 'site/js/main.js'), 'utf8');
const block = (main.match(/\/\/ b200-f8-xr: begin[\s\S]*?\/\/ b200-f8-xr: end/) || [''])[0];
check(/addEventListener\('gamepadconnected', \(e\) => import\('\.\/ui\/gamepad\.js'\)/.test(block), 'main.js imports ui/gamepad.js on the first gamepadconnected, and only then');
check(!/^import[^;]*ui\/(gamepad|padmap|headset)\.js/m.test(main), 'main.js imports none of the pad\'s or the headset\'s modules statically');
check(/\{ once: true \}/.test(block), 'the boot listener is removed after the first connection (the module listens from then on)');

if (problems.length) {
  console.error(`test_gamepad: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('test_gamepad: the dead zones, the curve, the standard and XR layouts, the keys\' directions and rates, the ship, the flick, the hint and the boot listener hold');
