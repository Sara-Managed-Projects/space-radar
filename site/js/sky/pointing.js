// sky/pointing.js — "Point your phone": the phone's own attitude turns the sky (internal #450).
//
// Loaded only when the visitor presses the switch (tests/test_boot_diet.mjs holds it out of boot).
// No third-party script, nothing sent anywhere: the browser's orientation events, the place the
// visitor already gave (rounded to 0.1 degree), and a table of the Earth's magnetic field.
//
// THE MATHS, pure and tested in node (tests/test_pointing.mjs):
//
//   deviceQuat(alpha, beta, gamma, screen)  the W3C angles and screen.orientation.angle to the
//       camera's attitude in the sky view's local frame (+X east, +Y up, +Z south). The W3C frame
//       is east, north, up with R = Rz(alpha) Rx(beta) Ry(gamma) taking the device's axes (x right,
//       y to the top of the phone, z out of the screen) to the Earth's. The camera looks out of the
//       BACK of the phone, along the device's -z, and the screen's own axes are the device's turned
//       by -screen about z. So: q = C * Rz(alpha) * Rx(beta) * Ry(gamma) * Rz(-screen), with C the
//       quarter turn that takes (east, north, up) to (east, up, south).
//   quatToLook(q)                           azimuth (from north, clockwise), altitude, roll.
//   alphaFromCompass(heading, beta)         iOS gives no absolute alpha; it gives
//       `webkitCompassHeading`, the MAGNETIC heading of the top of the phone, clockwise. The top's
//       level part points at -alpha while the screen faces up (cos beta > 0) and at 180 - alpha once
//       the phone is tipped past upright, which is where it is held to look at the sky. That model
//       is read off Apple's description and the W3C angles; it has NOT been checked on a real
//       iPhone (internal #450 stays open for that), which is one reason "Line it up" exists.
//   declinationDeg(lat, lon, km, year)      true north = magnetic north + declination. The World
//       Magnetic Model 2025 (data/wmm2025.js; NOAA NCEI and the BGS, public domain), summed in full
//       to degree 12: the published test values are met to 0.01 degree (the test).
//   makeFilter(tauMs)                       a low-pass on the quaternion: each frame it goes
//       1 - exp(-dt / tau) of the way to the newest reading. A steady turn is followed tau behind
//       (60 ms here; the target is under 100).
//   applyOffset(q, az, tilt)                "Line it up": a turn about the vertical (the compass's
//       error, which is what indoors gets wrong by tens of degrees) and a tilt about the screen's
//       own level axis. A drag while the switch is on is this, not a fight with the sensor.
//
// THE SENSOR (createPointing): asks only on the tap (iOS: DeviceOrientationEvent.requestPermission),
// listens to `deviceorientationabsolute` (Android Chrome) and `deviceorientation`, holds a screen
// wake lock while on, lets go of everything when switched off or the tab is hidden.
// Measured: the angles, by the phone. Modelled: the declination. Assumed: that the browser's
// "absolute" alpha is from magnetic north (Android's rotation vector is), and the iOS model above.

import { WMM } from '../data/wmm2025.js';

const DEG = Math.PI / 180;
const wrap180 = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
const wrap360 = (d) => ((d % 360) + 360) % 360;

// ------------------------------------------------------------------------------- quaternions
// [x, y, z, w], Hamilton product, as three.js: a * b turns by b first, then a.

export function qMul(a, b) {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}
const qAxis = (x, y, z, rad) => { const s = Math.sin(rad / 2); return [x * s, y * s, z * s, Math.cos(rad / 2)]; };
export function qRotate(q, v) {
  const [x, y, z, w] = q;
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
}
export function qSlerp(a, b, t) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const s = d < 0 ? -1 : 1;
  d = Math.abs(d);
  let ka = 1 - t;
  let kb = t;
  if (d < 0.9995) {
    const th = Math.acos(d);
    ka = Math.sin((1 - t) * th) / Math.sin(th);
    kb = Math.sin(t * th) / Math.sin(th);
  }
  const o = [ka * a[0] + s * kb * b[0], ka * a[1] + s * kb * b[1], ka * a[2] + s * kb * b[2], ka * a[3] + s * kb * b[3]];
  const n = Math.hypot(o[0], o[1], o[2], o[3]) || 1;
  return [o[0] / n, o[1] / n, o[2] / n, o[3] / n];
}
/** The angle between two attitudes, in degrees. */
export function qAngleDeg(a, b) {
  const d = Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]));
  return 2 * Math.acos(d) / DEG;
}

const Q_C = qAxis(1, 0, 0, -Math.PI / 2);

/** The camera's attitude in the sky's local frame (+X east, +Y up, +Z south) from the W3C angles, in degrees. */
export function deviceQuat(alphaDeg, betaDeg, gammaDeg, screenDeg = 0) {
  let q = qMul(Q_C, qAxis(0, 0, 1, alphaDeg * DEG));
  q = qMul(q, qAxis(1, 0, 0, betaDeg * DEG));
  q = qMul(q, qAxis(0, 1, 0, gammaDeg * DEG));
  return qMul(q, qAxis(0, 0, 1, -screenDeg * DEG));
}

/**
 * Where an attitude looks: azimuth from north clockwise, altitude, and roll (how far the screen's
 * top is turned clockwise, as the holder sees it, from "up"), all in degrees. Straight up or down
 * the azimuth is the screen top's (or its opposite) and the roll is 0: one turn, not two.
 */
export function quatToLook(q) {
  const f = qRotate(q, [0, 0, -1]);
  const u = qRotate(q, [0, 1, 0]);
  const altDeg = Math.asin(Math.max(-1, Math.min(1, f[1]))) / DEG;
  const level = Math.hypot(f[0], f[2]);
  if (level < 1e-4) {
    const s = f[1] > 0 ? -1 : 1;
    return { azDeg: wrap360(Math.atan2(s * u[0], -s * u[2]) / DEG), altDeg, rollDeg: 0 };
  }
  const azDeg = wrap360(Math.atan2(f[0], -f[2]) / DEG);
  // "Up" for this line of sight, and the level direction to its right.
  const right = [-f[2] / level, 0, f[0] / level];
  const up = [right[1] * f[2] - right[2] * f[1], right[2] * f[0] - right[0] * f[2], right[0] * f[1] - right[1] * f[0]];
  const rollDeg = Math.atan2(u[0] * right[0] + u[2] * right[2], u[0] * up[0] + u[1] * up[1] + u[2] * up[2]) / DEG;
  return { azDeg, altDeg, rollDeg };
}

/** The attitude that looks at an azimuth and an altitude with a roll: quatToLook's inverse. */
export function lookToQuat(azDeg, altDeg, rollDeg = 0) {
  return qMul(qMul(qAxis(0, 1, 0, -azDeg * DEG), qAxis(1, 0, 0, altDeg * DEG)), qAxis(0, 0, 1, -rollDeg * DEG));
}

/** "Line it up": turn about the vertical by `azDeg` (clockwise from above), tilt about the screen's level axis by `tiltDeg`. */
export function applyOffset(q, azDeg, tiltDeg) {
  if (!azDeg && !tiltDeg) return q;
  return qMul(qMul(qAxis(0, 1, 0, -azDeg * DEG), q), qAxis(1, 0, 0, tiltDeg * DEG));
}

/**
 * The absolute (magnetic) alpha that a compass heading of the phone's top implies, or null when the
 * top points too nearly straight up or down for its heading to mean anything. iOS only; see the head.
 */
export function alphaFromCompass(headingDeg, betaDeg) {
  if (!Number.isFinite(headingDeg) || !Number.isFinite(betaDeg)) return null;
  const c = Math.cos(betaDeg * DEG);
  if (Math.abs(c) < 0.2) return null;
  return wrap360(c > 0 ? -headingDeg : 180 - headingDeg);
}

/** Alpha from true north, from alpha from magnetic north and the declination (east positive). */
export function trueAlpha(alphaMagDeg, declDeg) {
  return wrap360(alphaMagDeg - (Number.isFinite(declDeg) ? declDeg : 0));
}

// ------------------------------------------------------------------------------- declination

/** The year as a decimal, for the model: 2026.77. */
export function decimalYear(ms) {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const a = Date.UTC(y, 0, 1);
  return y + (ms - a) / (Date.UTC(y + 1, 0, 1) - a);
}

/**
 * Magnetic declination in degrees, east positive: how far magnetic north is to the right of true
 * north at a place (geodetic degrees, kilometres above the ellipsoid) in a year. The World Magnetic
 * Model's own recipe: geodetic to geocentric, the Schmidt half-normalised harmonics to degree 12,
 * the field turned back to the ellipsoid's north and east. The year is held inside the model's five.
 */
export function declinationDeg(latDeg, lonDeg, altKm = 0, year = WMM.epoch) {
  if (!Number.isFinite(latDeg) || !Number.isFinite(lonDeg)) return 0;
  const N = WMM.nMax;
  const dt = Math.max(0, Math.min(WMM.validTo - WMM.epoch, year - WMM.epoch));
  const a = 6378.137;
  const b = 6356.7523142;
  const re = 6371.2;
  const e2 = 1 - (b * b) / (a * a);
  const lat = Math.max(-89.999, Math.min(89.999, latDeg)) * DEG;
  const lon = lonDeg * DEG;
  const sl = Math.sin(lat);
  const cl = Math.cos(lat);
  const rc = a / Math.sqrt(1 - e2 * sl * sl);
  const p = (rc + altKm) * cl;
  const z = (rc * (1 - e2) + altKm) * sl;
  const r = Math.hypot(p, z);
  const latC = Math.asin(z / r);
  const ct = Math.sin(latC); // cos of the colatitude
  const st = Math.cos(latC);
  // P[n][m] and dP/dtheta, Schmidt half-normalised, by the usual recursion.
  const P = [];
  const dP = [];
  for (let n = 0; n <= N; n += 1) { P.push(new Float64Array(N + 1)); dP.push(new Float64Array(N + 1)); }
  P[0][0] = 1;
  for (let n = 1; n <= N; n += 1) {
    const k = n === 1 ? 1 : Math.sqrt((2 * n - 1) / (2 * n));
    P[n][n] = k * st * P[n - 1][n - 1];
    dP[n][n] = k * (st * dP[n - 1][n - 1] + ct * P[n - 1][n - 1]);
    for (let m = 0; m < n; m += 1) {
      const den = Math.sqrt(n * n - m * m);
      const k2 = n > 1 ? Math.sqrt((n - 1) * (n - 1) - m * m) : 0;
      const p2 = n > 1 ? P[n - 2][m] : 0;
      const d2 = n > 1 ? dP[n - 2][m] : 0;
      P[n][m] = ((2 * n - 1) * ct * P[n - 1][m] - k2 * p2) / den;
      dP[n][m] = ((2 * n - 1) * (ct * dP[n - 1][m] - st * P[n - 1][m]) - k2 * d2) / den;
    }
  }
  let bt = 0; // along the colatitude (south)
  let bp = 0; // east
  let br = 0; // outward
  let i = 0;
  let rr = (re / r) * (re / r);
  for (let n = 1; n <= N; n += 1) {
    rr *= re / r;
    for (let m = 0; m <= n; m += 1, i += 4) {
      const g = WMM.c[i] + dt * WMM.c[i + 2];
      const h = WMM.c[i + 1] + dt * WMM.c[i + 3];
      const cm = Math.cos(m * lon);
      const sm = Math.sin(m * lon);
      br += (n + 1) * rr * (g * cm + h * sm) * P[n][m];
      bt -= rr * (g * cm + h * sm) * dP[n][m];
      bp += rr * m * (g * sm - h * cm) * P[n][m] / st;
    }
  }
  // Geocentric north and down, turned to the ellipsoid's.
  const psi = latC - lat;
  const x = -bt * Math.cos(psi) + br * Math.sin(psi);
  return Math.atan2(bp, x) / DEG;
}

// ------------------------------------------------------------------------------- the filter

/** How far behind a steady turn the view runs, in milliseconds: the filter's time constant. */
export const FILTER_TAU_MS = 60;

/** A low-pass on the attitude. `step(q, nowMs)` gives the smoothed attitude; `reset(q)` starts it somewhere. */
export function makeFilter(tauMs = FILTER_TAU_MS) {
  let state = null;
  let at = NaN;
  return {
    reset(q) { state = q ? q.slice() : null; at = NaN; },
    step(q, nowMs) {
      if (!q) return state;
      if (!state || !Number.isFinite(at) || !(tauMs > 0)) { state = q.slice(); at = nowMs; return state; }
      const dt = Math.max(0, Math.min(250, nowMs - at));
      at = nowMs;
      state = qSlerp(state, q, 1 - Math.exp(-dt / tauMs));
      return state;
    },
    get value() { return state; },
  };
}

// ------------------------------------------------------------------------------- one reading

/**
 * What one orientation event says, kept between events: which kind of heading the phone gives
 * ('absolute' from magnetic north, 'compass' the iOS heading, 'relative' none at all), the attitude
 * from true north, and the compass's own estimate of its error when the browser reports one.
 * Pure: createPointing feeds it events; the tests feed it samples.
 */
export function makeReader({ declDeg = 0 } = {}) {
  const st = { kind: null, accuracyDeg: null, compassOff: null, relativeOff: null, q: null, events: 0 };
  return {
    state: st,
    /**
     * @param {{alpha:number,beta:number,gamma:number,absolute?:boolean,webkitCompassHeading?:number,webkitCompassAccuracy?:number}} e
     * @param {number} screenDeg screen.orientation.angle
     * @param {boolean} absoluteEvent the event came as `deviceorientationabsolute`
     * @param {number} [startAzDeg] where the view was looking, for a phone with no compass to start from
     */
    read(e, screenDeg, absoluteEvent, startAzDeg) {
      if (!e || !Number.isFinite(e.beta) || !Number.isFinite(e.gamma)) return null;
      const hasAlpha = Number.isFinite(e.alpha);
      const compass = Number.isFinite(e.webkitCompassHeading) && e.webkitCompassHeading >= 0;
      const absolute = hasAlpha && (absoluteEvent || e.absolute === true);
      let alpha;
      if (absolute) {
        st.kind = 'absolute';
        alpha = trueAlpha(e.alpha, declDeg);
      } else if (st.kind === 'absolute') {
        return st.q; // the relative twin of an absolute event: the absolute one is the reading
      } else if (compass && hasAlpha) {
        // iOS: alpha drifts from wherever it began; the compass ties it to north, slowly, so the
        // gyroscope carries the motion and the magnetometer only the long run.
        st.kind = 'compass';
        const abs = alphaFromCompass(e.webkitCompassHeading, e.beta);
        if (abs !== null) {
          const want = wrap180(abs - e.alpha);
          const w = Math.abs(Math.cos(e.beta * DEG));
          st.compassOff = st.compassOff === null ? want : wrap180(st.compassOff + wrap180(want - st.compassOff) * 0.03 * w);
        }
        if (st.compassOff === null) return st.q;
        alpha = trueAlpha(e.alpha + st.compassOff, declDeg);
        const acc = e.webkitCompassAccuracy;
        st.accuracyDeg = Number.isFinite(acc) && acc >= 0 ? acc : null;
      } else if (hasAlpha) {
        // No compass at all: the turn is right, north is not. Start where the view was looking.
        st.kind = 'relative';
        if (st.relativeOff === null) {
          const first = quatToLook(deviceQuat(e.alpha, e.beta, e.gamma, screenDeg));
          st.relativeOff = Number.isFinite(startAzDeg) ? wrap180(first.azDeg - startAzDeg) : 0;
        }
        alpha = e.alpha + st.relativeOff;
      } else return st.q;
      st.events += 1;
      st.q = deviceQuat(alpha, e.beta, e.gamma, screenDeg);
      return st.q;
    },
  };
}

// ------------------------------------------------------------------------------- the sensor

/** Is this a device that could have an orientation sensor: the event exists and the pointer is a finger. */
export function canPoint(win = typeof window !== 'undefined' ? window : null) {
  if (!win || typeof win.DeviceOrientationEvent === 'undefined') return false;
  if (win.isSecureContext === false) return false;
  const nav = win.navigator || {};
  const coarse = typeof win.matchMedia === 'function' && win.matchMedia('(pointer: coarse)').matches;
  return coarse || (nav.maxTouchPoints || 0) > 0;
}

/** How long the sensor is given to say anything before the switch reports that none answered. */
export const SILENT_MS = 2500;

/**
 * The sensor, switched on by a tap. `start()` resolves to { ok: true } or { ok: false, why }, why
 * one of 'denied' (the visitor or the browser said no), 'none' (no sensor answered), 'unsupported'.
 * `sample(nowMs)` is the smoothed attitude with the offset, or null before the first reading.
 *
 * @param {object} env { win, observer: {latDeg, lonDeg, altKm}, startLook: {azDeg, altDeg}, reduced, onChange,
 *   permission: the promise of DeviceOrientationEvent.requestPermission() when the caller asked already }
 */
export function createPointing(env = {}) {
  const win = env.win || (typeof window !== 'undefined' ? window : null);
  const observer = env.observer || null;
  const declDeg = observer ? declinationDeg(observer.latDeg, observer.lonDeg, observer.altKm || 0, decimalYear(Date.now())) : 0;
  const reader = makeReader({ declDeg });
  const filter = makeFilter(FILTER_TAU_MS);
  const startAzDeg = env.startLook ? env.startLook.azDeg : NaN;
  // Reduced motion: no glide from the dragged view to the phone's; the first reading is the view.
  if (!env.reduced && env.startLook) filter.reset(lookToQuat(env.startLook.azDeg, env.startLook.altDeg, 0));
  let on = false;
  let offAz = 0;
  let offTilt = 0;
  let lock = null;
  let silent = 0;
  const tell = () => { if (typeof env.onChange === 'function') env.onChange(api.state); };
  const screenDeg = () => {
    const o = win && win.screen && win.screen.orientation;
    if (o && Number.isFinite(o.angle)) return o.angle;
    return win && Number.isFinite(win.orientation) ? win.orientation : 0;
  };
  const onEvent = (absolute) => (e) => {
    if (!on) return;
    const before = reader.state.kind;
    const acc = reader.state.accuracyDeg;
    reader.read(e, screenDeg(), absolute, startAzDeg);
    if (reader.state.kind !== before || reader.state.accuracyDeg !== acc) tell();
  };
  const onAbs = onEvent(true);
  const onRel = onEvent(false);
  async function takeLock() {
    try {
      const wl = win && win.navigator && win.navigator.wakeLock;
      if (!wl || lock || (win.document && win.document.hidden)) return;
      lock = await wl.request('screen');
      if (!on) { releaseLock(); return; }
      if (lock && lock.addEventListener) lock.addEventListener('release', () => { lock = null; });
    } catch { lock = null; /* refused (battery saver): the view still follows the phone */ }
  }
  function releaseLock() {
    const l = lock;
    lock = null;
    try { if (l && l.release) l.release(); } catch { /* gone */ }
  }
  // The browser drops a wake lock when the tab is hidden; it is asked for again when it comes back.
  const onVisible = () => { if (!on) return; if (win.document.hidden) releaseLock(); else takeLock(); };

  function stop() {
    if (!on) return;
    on = false;
    if (silent) { clearTimeout(silent); silent = 0; }
    win.removeEventListener('deviceorientationabsolute', onAbs);
    win.removeEventListener('deviceorientation', onRel);
    if (win.document && win.document.removeEventListener) win.document.removeEventListener('visibilitychange', onVisible);
    releaseLock();
    tell();
  }

  async function start() {
    if (on) return { ok: true };
    if (!win || typeof win.DeviceOrientationEvent === 'undefined') return { ok: false, why: 'unsupported' };
    const ask = win.DeviceOrientationEvent.requestPermission;
    if (env.permission || typeof ask === 'function') {
      // iOS Safari 13 and later: only from a tap, and the answer is remembered for the page. The
      // sky view asks inside the tap, before this module has loaded, and hands the answer in.
      let got = 'denied';
      try { got = await (env.permission || ask.call(win.DeviceOrientationEvent)); } catch { got = 'denied'; }
      if (got !== 'granted') return { ok: false, why: 'denied' };
    }
    on = true;
    win.addEventListener('deviceorientationabsolute', onAbs);
    win.addEventListener('deviceorientation', onRel);
    if (win.document && win.document.addEventListener) win.document.addEventListener('visibilitychange', onVisible);
    takeLock();
    return new Promise((resolve) => {
      const t0 = Date.now();
      const poll = () => {
        if (!on) return resolve({ ok: false, why: 'stopped' });
        if (reader.state.q) { tell(); return resolve({ ok: true }); }
        if (Date.now() - t0 >= (env.silentMs || SILENT_MS)) { stop(); return resolve({ ok: false, why: 'none' }); }
        silent = setTimeout(poll, 100);
      };
      poll();
    });
  }

  const api = {
    start,
    stop,
    get on() { return on; },
    /** The attitude to draw this frame: [x, y, z, w] in the sky's local frame, or null. */
    sample(nowMs) {
      if (!on || !reader.state.q) return null;
      return filter.step(applyOffset(reader.state.q, offAz, offTilt), nowMs);
    },
    /** A drag: the sky moves under the finger and stays moved (degrees). */
    dragBy(dAzDeg, dTiltDeg) {
      offAz = wrap180(offAz + dAzDeg);
      offTilt = Math.max(-60, Math.min(60, offTilt + dTiltDeg));
      tell();
    },
    resetOffset() { offAz = 0; offTilt = 0; tell(); },
    get state() {
      return { on, kind: reader.state.kind, accuracyDeg: reader.state.accuracyDeg, declinationDeg: declDeg, offsetAzDeg: offAz, offsetTiltDeg: offTilt, events: reader.state.events, wakeLock: !!lock };
    },
  };
  return api;
}
