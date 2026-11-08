// ui/padmap.js -- what a gamepad's sticks, triggers and buttons mean (forge #164), and the headset controllers' reading of
// the same thing (forge #158). Pure: numbers in, numbers out; no DOM, no navigator, no three.
//
// Contract (tests/test_gamepad.mjs):
//   deadzone(x, y, inner?, outer?)   -> { x, y }   a stick's two axes, the rest band taken out radially
//   curve(v, k?)                     -> number     the response curve: fine near the middle, full at the edge
//   trigger(v, dz?)                  -> 0..1       a trigger's travel, its first few percent ignored
//   readStandard(gp)                 -> intent     a pad on the W3C "standard" layout (Xbox and PlayStation alike)
//   readXR(sources)                  -> intent     two WebXR controllers on the "xr-standard" layout, as one pad
//   pressed(prev, now)               -> [name]     the buttons that went down since the last reading
//   speedOf(intent)                  -> number     the triggers' speed: 4x with the right held, a quarter with the left
//   rates(intent)                    -> { az, pol, dolly, pan }   per second, in the camera rig's own units
//   shipStep(v, want, dt, inertia)   -> { az, pol, dolly, pan }   this frame's motion, with or without ship physics
//   flick(state, value, on?, off?)   -> { state, fire }            one discrete step per push of a stick (the headset)
//   moving(intent), restIntent(), nextRung(index, dir, count)      the stick at rest or not; the empty reading; a ladder step
//   STANDARD, XR_BUTTONS, PAD_BUTTONS: the indices and the names, for the hint and the tests
//
// THE INTENT is one shape for both readers, so the 2D flight (ui/gamepad.js) and the headset (ui/headset.js) answer the
// same buttons the same way: { lx, ly, rx, ry, lt, rt, a, b, x, y, view, up, down, menu, stop }, sticks -1..1 after the dead
// zone and the curve (up is negative, as the Gamepad API reports it), triggers 0..1, buttons true or false. The names are
// Xbox's; on a PlayStation pad A is Cross, B Circle, X Square and Y Triangle, which is what the standard layout guarantees.
//
// WHY THE STANDARD LAYOUT AND NOTHING ELSE. The W3C Gamepad spec's "standard" mapping fixes the index of every control
// (https://w3c.github.io/gamepad/#remapping), and Chrome, Safari and Firefox map an Xbox, a DualShock 4 and a DualSense
// onto it. A pad whose `mapping` is "" is the browser saying it does not know where the buttons are: its first two axes are
// still read as the left stick (every pad puts it there), and its buttons are not guessed at. The hint says so.
//
// WHY THESE DIRECTIONS. They are the keyboard's (scene/camera.js applyHeldKeys), which are the drag's: the left stick to the
// left does what ArrowLeft does, up what ArrowUp does; the right stick up flies in as W does and to the right slides the view
// as Shift+ArrowRight does. One camera with two inputs that disagree is a camera nobody trusts.
//
// THE NUMBERS ARE CHOSEN, NOT MEASURED. A 15 % inner dead zone is the common figure for a worn stick's rest drift (Xbox's
// own XInput samples use 7 849 of 32 767, 24 %, for the left stick; we take less because the curve below already flattens
// the middle). The rates at full deflection are the held keys' rates, so a pad is never faster than the keyboard unless the
// right trigger asks.

/** The W3C standard layout's indices (https://w3c.github.io/gamepad/#remapping). */
export const STANDARD = Object.freeze({
  a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, lt: 6, rt: 7, view: 8, menu: 9, ls: 10, rs: 11, up: 12, down: 13, left: 14, right: 15,
});
/** WebXR's xr-standard layout (https://immersive-web.github.io/webxr-gamepads-module/#xr-standard-gamepad-mapping). */
export const XR_BUTTONS = Object.freeze({ trigger: 0, squeeze: 1, stick: 3, a: 4, b: 5 });
/** The buttons an intent carries, in the order the hint lists them. */
export const PAD_BUTTONS = Object.freeze(['a', 'x', 'b', 'y', 'view', 'up', 'down', 'menu', 'stop']);

export const INNER_DEAD = 0.15;
export const OUTER_DEAD = 0.95;
export const TRIGGER_DEAD = 0.05;
/** The curve's cubic share: 0 is linear, 1 is all cube. */
export const CURVE_K = 0.6;
/** The held keys' rates (scene/camera.js KEY_ORBIT_RAD_PER_S, KEY_DOLLY_LOG_PER_S, KEY_PAN_PER_S), at full deflection. */
export const TURN_RAD_PER_S = 1.1;
export const DOLLY_LOG_PER_S = 0.9;
export const PAN_PER_S = 0.7;
/** Ship physics: full stick reaches the plain rate in about ACCEL_S seconds, and a coast halves in about COAST_HALF_S. */
export const ACCEL_S = 0.8;
export const COAST_HALF_S = 4;
/** And the most a ship may build up, as a multiple of the plain rate. */
export const SHIP_MAX = 3;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const num = (v) => (Number.isFinite(v) ? v : 0);

/** A stick's two axes with the rest band taken out radially, so a diagonal is not squared off; then rescaled to 0..1. */
export function deadzone(x, y, inner = INNER_DEAD, outer = OUTER_DEAD) {
  x = num(x);
  y = num(y);
  const m = Math.hypot(x, y);
  if (m <= inner) return { x: 0, y: 0 };
  const scaled = clamp((m - inner) / (outer - inner), 0, 1);
  return { x: (x / m) * scaled, y: (y / m) * scaled };
}

/** Odd and monotonic: curve(0) = 0, curve(+-1) = +-1, and gentler than a straight line in between. */
export function curve(v, k = CURVE_K) {
  v = clamp(num(v), -1, 1);
  return (1 - k) * v + k * v * v * v;
}

/** A trigger's travel, 0..1, with the first few percent (the spring's slack) ignored. */
export function trigger(v, dz = TRIGGER_DEAD) {
  v = clamp(num(v), 0, 1);
  return v <= dz ? 0 : (v - dz) / (1 - dz);
}

const stick = (x, y) => {
  const d = deadzone(x, y);
  return { x: curve(d.x), y: curve(d.y) };
};
const btn = (b) => !!(b && (b.pressed || (typeof b === 'object' && b.value > 0.5)));
const val = (b) => (b && typeof b === 'object' ? num(b.value) || (b.pressed ? 1 : 0) : 0);

/** The empty intent: what a pad at rest, or no pad, says. */
export function restIntent() {
  return { lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0, a: false, b: false, x: false, y: false, view: false, up: false, down: false, menu: false, stop: false, standard: true };
}

/** A Gamepad (or anything shaped like one) on the standard layout. A pad that is not gets its left stick only. */
export function readStandard(gp) {
  const out = restIntent();
  if (!gp || !gp.axes) return out;
  const ax = gp.axes;
  const l = stick(ax[0], ax[1]);
  out.lx = l.x;
  out.ly = l.y;
  out.standard = gp.mapping === 'standard';
  if (!out.standard) return out;
  const r = stick(ax[2], ax[3]);
  out.rx = r.x;
  out.ry = r.y;
  const b = gp.buttons || [];
  out.lt = trigger(val(b[STANDARD.lt]));
  out.rt = trigger(val(b[STANDARD.rt]));
  out.a = btn(b[STANDARD.a]);
  out.b = btn(b[STANDARD.b]);
  out.x = btn(b[STANDARD.x]);
  out.y = btn(b[STANDARD.y]);
  out.view = btn(b[STANDARD.view]);
  out.up = btn(b[STANDARD.up]);
  out.down = btn(b[STANDARD.down]);
  out.menu = btn(b[STANDARD.menu]);
  out.stop = btn(b[STANDARD.ls]) || btn(b[STANDARD.rs]);
  return out;
}

/**
 * Two WebXR input sources as one pad: the left controller's stick and trigger are the left stick and trigger, the right's the
 * right. A and B are the right controller's buttons, X and Y the left's (Quest's Touch controllers print exactly that). A
 * controller that reports two axes has its stick there; xr-standard puts the stick at axes 2 and 3 after a touchpad's.
 */
export function readXR(sources) {
  const out = restIntent();
  let left = null;
  let right = null;
  for (const s of sources || []) {
    if (!s || !s.gamepad) continue;
    if (s.handedness === 'left') left = s.gamepad;
    else if (s.handedness === 'right') right = s.gamepad;
  }
  const stickOf = (g) => {
    const a = (g && g.axes) || [];
    return a.length >= 4 ? stick(a[2], a[3]) : stick(a[0], a[1]);
  };
  if (left) {
    const l = stickOf(left);
    out.lx = l.x;
    out.ly = l.y;
    const b = left.buttons || [];
    out.lt = trigger(val(b[XR_BUTTONS.trigger]));
    out.x = btn(b[XR_BUTTONS.a]);
    out.y = btn(b[XR_BUTTONS.b]);
  }
  if (right) {
    const r = stickOf(right);
    out.rx = r.x;
    out.ry = r.y;
    const b = right.buttons || [];
    out.rt = trigger(val(b[XR_BUTTONS.trigger]));
    out.a = btn(b[XR_BUTTONS.a]);
    out.b = btn(b[XR_BUTTONS.b]);
  }
  out.standard = !!(left || right);
  return out;
}

/** The buttons that are down now and were not at the last reading: each press acts once, however long it is held. */
export function pressed(prev, now) {
  const out = [];
  if (!now) return out;
  for (const k of PAD_BUTTONS) if (now[k] && !(prev && prev[k])) out.push(k);
  return out;
}

/** The triggers set the speed of flight: 2^(2 rt - 2 lt), so 4x with the right held down, a quarter with the left. */
export function speedOf(intent) {
  if (!intent) return 1;
  return 2 ** (2 * num(intent.rt) - 2 * num(intent.lt));
}

/**
 * What the sticks ask for, per second, in the rig's units: radians of turn (az, pol), log distance (dolly, negative is in),
 * and fractions of the view's height to slide (pan). The speed scales the flying, not the turning: turning faster than the
 * keys would only make the stars smear.
 */
export function rates(intent) {
  if (!intent) return { az: 0, pol: 0, dolly: 0, pan: 0 };
  const s = speedOf(intent);
  return {
    az: -num(intent.lx) * TURN_RAD_PER_S,
    pol: -num(intent.ly) * TURN_RAD_PER_S,
    dolly: num(intent.ry) * DOLLY_LOG_PER_S * s,
    pan: num(intent.rx) * PAN_PER_S * s,
  };
}

const KEYS4 = ['az', 'pol', 'dolly', 'pan'];

/**
 * This frame's motion. Without inertia it is what the sticks ask, and stops when they are let go (the camera's own damping
 * still eases it, as it eases a key). With ship physics the sticks are thrust: the motion builds toward what they ask over
 * about ACCEL_S, carries on when they are let go, and bleeds away with a half-life of COAST_HALF_S; `stop` (a stick pressed
 * in) ends it at once. Capped at SHIP_MAX times the plain rate so a long push cannot fling the camera past the map's edge.
 */
export function shipStep(v, want, dt, inertia, stop = false) {
  const w = want || { az: 0, pol: 0, dolly: 0, pan: 0 };
  if (!inertia || stop) {
    const z = {};
    for (const k of KEYS4) z[k] = stop ? 0 : num(w[k]);
    return z;
  }
  const t = clamp(num(dt), 0, 0.25);
  const decay = 0.5 ** (t / COAST_HALF_S);
  const cap = { az: TURN_RAD_PER_S * SHIP_MAX, pol: TURN_RAD_PER_S * SHIP_MAX, dolly: DOLLY_LOG_PER_S * 4 * SHIP_MAX, pan: PAN_PER_S * 4 * SHIP_MAX };
  const out = {};
  for (const k of KEYS4) {
    const cur = num(v && v[k]);
    out[k] = clamp(cur * decay + (num(w[k]) * t) / ACCEL_S, -cap[k], cap[k]);
  }
  return out;
}

/**
 * One step per push (the headset's comfort moves): a stick pushed past `on` fires once, -1 or +1, and must come back
 * inside `off` before it can fire again. `state` is 0 (armed) or the direction last fired.
 */
export function flick(state, value, on = 0.7, off = 0.3) {
  const v = num(value);
  if (state) return { state: Math.abs(v) < off ? 0 : state, fire: 0 };
  if (v >= on) return { state: 1, fire: 1 };
  if (v <= -on) return { state: -1, fire: -1 };
  return { state: 0, fire: 0 };
}

/** Whether a reading asks for any motion at all (the reticle shows, the hint counts it as the pad in use). */
export function moving(intent) {
  if (!intent) return false;
  return Math.abs(intent.lx) + Math.abs(intent.ly) + Math.abs(intent.rx) + Math.abs(intent.ry) > 0;
}

/**
 * The next rung of the distance ladder (data/ladder.js LADDER_RUNGS) one step out (+1) or in (-1), where -1 is the Earth
 * itself, under the first rung. Held at both ends: a step past the edge stays at the edge.
 */
export function nextRung(index, dir, count) {
  const i = Number.isInteger(index) ? index : -1;
  const n = Math.max(0, count | 0);
  return Math.max(-1, Math.min(n - 1, i + (dir > 0 ? 1 : dir < 0 ? -1 : 0)));
}
