// tests/test_pointing.mjs -- "Point your phone" (internal #450): the maths of sky/pointing.js.
// The attitudes are the W3C Device Orientation specification's own worked cases (flat; upright;
// upright with the top to the right is {alpha: 270 - heading, beta: 0, gamma: 90}) and matrices
// built from where the phone's axes physically point, decomposed by the specification's formula.
//   node tests/test_pointing.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as P from '../site/js/sky/pointing.js';
import { WMM } from '../site/js/data/wmm2025.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const nearAz = (a, b, tol) => Math.abs(((a - b + 540) % 360) - 180) <= tol;
const DEG = Math.PI / 180;

// --- the eight cardinal attitudes, portrait ------------------------------------------------------
const look = (a, b, g, s = 0) => P.quatToLook(P.deviceQuat(a, b, g, s));
{
  const flat = look(0, 0, 0);
  check(near(flat.altDeg, -90, 1e-6), `flat on a table, screen up: the back looks straight down (${flat.altDeg})`);
  const over = look(0, 180, 0);
  check(near(over.altDeg, 90, 1e-6), `held overhead, screen down: straight up (${over.altDeg})`);
  // Upright, facing a heading H: alpha = -H (alpha grows counter-clockwise).
  for (const [name, H] of [['north', 0], ['east', 90], ['south', 180], ['west', 270]]) {
    const l = look(360 - H, 90, 0);
    check(nearAz(l.azDeg, H, 1e-6) && near(l.altDeg, 0, 1e-6) && near(l.rollDeg, 0, 1e-6), `upright facing ${name}: az ${l.azDeg} alt ${l.altDeg} roll ${l.rollDeg}`);
  }
  const up45 = look(0, 135, 0);
  check(nearAz(up45.azDeg, 0, 1e-6) && near(up45.altDeg, 45, 1e-6) && near(up45.rollDeg, 0, 1e-6), `tipped back 45 degrees facing north: ${JSON.stringify(up45)}`);
  const up45e = look(270, 135, 0);
  check(nearAz(up45e.azDeg, 90, 1e-6) && near(up45e.altDeg, 45, 1e-6), `tipped back 45 degrees facing east: ${JSON.stringify(up45e)}`);
  const down30 = look(0, 60, 0);
  check(near(down30.altDeg, -30, 1e-6) && nearAz(down30.azDeg, 0, 1e-6), `tipped forward: 30 degrees under the horizon (${JSON.stringify(down30)})`);
}

// --- both landscapes ----------------------------------------------------------------------------
{
  // The specification: top of the screen to the holder's right, heading H: {270 - H, 0, 90}. That
  // is screen.orientation.angle 270. Its mirror, top to the left: {90 - H, 0, -90}, angle 90.
  for (const H of [0, 90, 180, 270]) {
    const r = look(270 - H, 0, 90, 270);
    check(nearAz(r.azDeg, H, 1e-6) && near(r.altDeg, 0, 1e-6) && near(r.rollDeg, 0, 1e-6), `landscape, top to the right, facing ${H}: ${JSON.stringify(r)}`);
    const l = look(90 - H, 0, -90, 90);
    check(nearAz(l.azDeg, H, 1e-6) && near(l.altDeg, 0, 1e-6) && near(l.rollDeg, 0, 1e-6), `landscape, top to the left, facing ${H}: ${JSON.stringify(l)}`);
  }
  // Without the screen angle the same phone reads as rolled a quarter turn: the angle matters.
  check(near(Math.abs(look(270, 0, 90, 0).rollDeg), 90, 1e-6), 'a landscape phone read as portrait is a quarter turn out');
}

// --- from where the axes point: a matrix, decomposed as the specification does ----------------------
// Columns are the device's x, y, z in (east, north, up). R = Rz(a) Rx(b) Ry(g).
function eulerOf(x, y, z) {
  const m33 = z[2];
  const m32 = y[2];
  const m31 = x[2];
  const m12 = y[0];
  const m22 = y[1];
  const beta = Math.asin(Math.max(-1, Math.min(1, m32)));
  let alpha; let gamma;
  if (Math.abs(Math.cos(beta)) > 1e-9) {
    alpha = Math.atan2(-m12, m22);
    gamma = Math.atan2(-m31, m33);
  } else { alpha = Math.atan2(x[1], x[0]); gamma = 0; }
  // The specification keeps gamma in [-90, 90): past that, beta carries the half turn.
  let a = alpha / DEG; let b = beta / DEG; let g = gamma / DEG;
  if (g >= 90 || g < -90) { a += 180; b = 180 - b; g = g >= 90 ? g - 180 : g + 180; }
  return [((a % 360) + 360) % 360, b > 180 ? b - 360 : b, g];
}
const enu = (azDeg, altDeg) => [Math.sin(azDeg * DEG) * Math.cos(altDeg * DEG), Math.cos(azDeg * DEG) * Math.cos(altDeg * DEG), Math.sin(altDeg * DEG)];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const neg = (v) => v.map((c) => -c);
{
  for (const [az, alt] of [[0, 45], [90, 45], [200, 20], [315, 70], [45, -25], [120, 5]]) {
    const f = enu(az, alt); // the back of the phone
    const right = enu(az + 90, 0);
    const up = cross(right, f);
    // Portrait: x right, y up, z towards the holder.
    let [a, b, g] = eulerOf(right, up, neg(f));
    let l = look(a, b, g, 0);
    check(nearAz(l.azDeg, az, 1e-4) && near(l.altDeg, alt, 1e-4) && near(l.rollDeg, 0, 1e-4), `portrait at az ${az} alt ${alt}: ${JSON.stringify(l)} from ${[a, b, g].map((v) => v.toFixed(1))}`);
    // Landscape, the phone's top to the left (angle 90): device x is up, device y is left.
    [a, b, g] = eulerOf(up, neg(right), neg(f));
    l = look(a, b, g, 90);
    check(nearAz(l.azDeg, az, 1e-4) && near(l.altDeg, alt, 1e-4) && near(l.rollDeg, 0, 1e-4), `landscape left at az ${az} alt ${alt}: ${JSON.stringify(l)}`);
    // Landscape, the top to the right (angle 270): device x is down, device y is right.
    [a, b, g] = eulerOf(neg(up), right, neg(f));
    l = look(a, b, g, 270);
    check(nearAz(l.azDeg, az, 1e-4) && near(l.altDeg, alt, 1e-4) && near(l.rollDeg, 0, 1e-4), `landscape right at az ${az} alt ${alt}: ${JSON.stringify(l)}`);
  }
  // A roll: the phone's top tipped 20 degrees clockwise as the holder sees it.
  const f = enu(30, 40);
  const right0 = enu(120, 0);
  const up0 = cross(right0, f);
  const c = Math.cos(20 * DEG); const s = Math.sin(20 * DEG);
  const up = up0.map((v, i) => v * c + right0[i] * s);
  const right = right0.map((v, i) => v * c - up0[i] * s);
  const l = look(...eulerOf(right, up, neg(f)), 0);
  check(near(l.rollDeg, 20, 1e-4) && nearAz(l.azDeg, 30, 1e-4) && near(l.altDeg, 40, 1e-4), `a 20 degree clockwise roll: ${JSON.stringify(l)}`);
  // lookToQuat is quatToLook's inverse.
  const back = P.quatToLook(P.lookToQuat(222, 33, -14));
  check(nearAz(back.azDeg, 222, 1e-6) && near(back.altDeg, 33, 1e-6) && near(back.rollDeg, -14, 1e-6), `lookToQuat round trip: ${JSON.stringify(back)}`);
}

// --- declination: the model's own published test values -----------------------------------------------
{
  const cof = readFileSync(join(ROOT, 'registry/wmm/WMM2025.COF'), 'utf8').split('\n').slice(1).map((l) => l.trim().split(/\s+/)).filter((p) => p.length === 6);
  check(cof.length === 90 && WMM.c.length === 360, `90 rows of coefficients (${cof.length}, ${WMM.c.length})`);
  check(cof.every((p, i) => [2, 3, 4, 5].every((k) => Number(p[k]) === WMM.c[i * 4 + k - 2])), 'data/wmm2025.js is registry/wmm/WMM2025.COF (python3 scripts/gen_wmm_js.py)');
  const rows = readFileSync(join(ROOT, 'registry/wmm/WMM2025_TEST_VALUES.txt'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.trim().split(/\s+/).map(Number));
  check(rows.length >= 12, `NOAA's test values are here (${rows.length})`);
  let worst = 0;
  for (const r of rows) {
    const d = P.declinationDeg(r[2], r[3], r[1], r[0]);
    const err = Math.abs(((d - r[10] + 540) % 360) - 180);
    worst = Math.max(worst, err);
    check(err <= 0.011, `declination at ${r[2]}, ${r[3]}, ${r[1]} km in ${r[0]}: ${d.toFixed(3)} against the published ${r[10]}`);
  }
  // Three places a visitor stands in. The bounds are the sign and rough size from the model's
  // declination chart as remembered (London a degree or so east, Arizona nine to ten east, Sydney
  // about thirteen east), NOT values read from NOAA's calculator: the published test values above
  // are the check of the arithmetic; these only catch a flipped sign or longitude.
  const lon = P.declinationDeg(51.5, -0.1, 0, 2026.8);
  const flag = P.declinationDeg(35.2, -111.7, 2.1, 2026.8);
  const syd = P.declinationDeg(-33.9, 151.2, 0, 2026.8);
  check(lon > 0 && lon < 2.5, `London: a degree or so east (${lon.toFixed(2)})`);
  check(flag > 8 && flag < 11, `Flagstaff: about nine and a half east (${flag.toFixed(2)})`);
  check(syd > 11.5 && syd < 14, `Sydney: about thirteen east (${syd.toFixed(2)})`);
  check(P.declinationDeg(51.5, -0.1, 0, 2099) === P.declinationDeg(51.5, -0.1, 0, WMM.validTo), 'past the model\'s five years the last year is held, not extrapolated');
  check(near(P.trueAlpha(10, 9.5), 0.5, 1e-9) && near(P.trueAlpha(2, 9.5), 352.5, 1e-9), 'true alpha = magnetic alpha - declination');
  // Facing magnetic north where the declination is 10 east is facing azimuth 10.
  const l = P.quatToLook(P.deviceQuat(P.trueAlpha(0, 10), 90, 0, 0));
  check(nearAz(l.azDeg, 10, 1e-6), `magnetic north with 10 degrees east declination is azimuth 10 (${l.azDeg})`);
  console.log(`  declination: worst error against ${rows.length} published values ${worst.toFixed(4)} deg; London ${lon.toFixed(2)}, Flagstaff ${flag.toFixed(2)}, Sydney ${syd.toFixed(2)}`);
}

// --- the filter's lag -----------------------------------------------------------------------------
{
  const f = P.makeFilter();
  const rate = 90; // degrees a second, a brisk sweep
  let lag = 0;
  for (let ms = 0; ms <= 2000; ms += 1000 / 60) {
    const q = P.deviceQuat(-(rate * ms) / 1000, 90, 0, 0);
    const s = f.step(q, ms);
    if (ms > 1000) lag = Math.max(lag, P.qAngleDeg(s, q) / rate * 1000);
  }
  check(lag < 100 && lag > 20, `a steady 90 degrees a second is followed ${lag.toFixed(1)} ms behind (under 100, and it does smooth)`);
  // A still phone with a jittering compass: the shake is cut.
  const g = P.makeFilter();
  let spread = 0;
  for (let i = 0; i < 240; i += 1) {
    const s = g.step(P.deviceQuat((i % 2 ? 1 : -1) * 1.5, 90, 0, 0), i * 1000 / 60);
    if (i > 60) spread = Math.max(spread, P.qAngleDeg(s, P.deviceQuat(0, 90, 0, 0)));
  }
  check(spread < 0.5, `a +-1.5 degree jitter at 60 Hz is cut to ${spread.toFixed(2)} degrees`);
  console.log(`  filter: lag ${lag.toFixed(1)} ms at 90 deg/s; +-1.5 deg jitter -> ${spread.toFixed(2)} deg`);
  const h = P.makeFilter(0);
  const q = P.deviceQuat(40, 100, 3, 0);
  check(P.qAngleDeg(h.step(q, 0), q) < 1e-9, 'no time constant, no smoothing');
}

// --- the offset ("Line it up") --------------------------------------------------------------------
{
  const q = P.deviceQuat(0, 120, 0, 0); // facing north, 30 up
  const a = P.quatToLook(P.applyOffset(q, 25, 0));
  check(nearAz(a.azDeg, 25, 1e-6) && near(a.altDeg, 30, 1e-6) && near(a.rollDeg, 0, 1e-6), `25 degrees of heading offset is 25 of azimuth and nothing else: ${JSON.stringify(a)}`);
  const b = P.quatToLook(P.applyOffset(q, 0, 10));
  check(nearAz(b.azDeg, 0, 1e-6) && near(b.altDeg, 40, 1e-6), `10 degrees of tilt offset is 10 of altitude: ${JSON.stringify(b)}`);
  const c = P.quatToLook(P.applyOffset(P.applyOffset(q, 25, 0), -25, 0));
  check(nearAz(c.azDeg, 0, 1e-6), 'offsets add: 25 then -25 is none');
  check(P.applyOffset(q, 0, 0) === q, 'no offset, the same attitude');
  // The heading offset is the same turn wherever the phone points, also straight up.
  const z = P.applyOffset(P.deviceQuat(0, 180, 0, 0), 40, 0);
  check(nearAz(P.quatToLook(z).azDeg, P.quatToLook(P.deviceQuat(0, 180, 0, 0)).azDeg + 40, 1e-4), 'at the zenith the offset still turns the sky 40 degrees');
}

// --- one reading: Android's absolute event, the iPhone's compass, a phone with neither ----------------
{
  const r = P.makeReader({ declDeg: 10 });
  r.read({ alpha: 0, beta: 90, gamma: 0 }, 0, true);
  check(r.state.kind === 'absolute' && nearAz(P.quatToLook(r.state.q).azDeg, 10, 1e-6), 'deviceorientationabsolute: magnetic north plus the declination');
  const before = r.state.q;
  r.read({ alpha: 123, beta: 90, gamma: 0, absolute: false }, 0, false);
  check(r.state.q === before, 'the relative twin of an absolute event does not move the view');

  // iOS: alpha starts anywhere (here 77 when the phone faces magnetic east), the compass says 90.
  const ios = P.makeReader({ declDeg: 0 });
  ios.read({ alpha: 77, beta: 60, gamma: 0, webkitCompassHeading: 90, webkitCompassAccuracy: 15 }, 0, false);
  let l = P.quatToLook(ios.state.q);
  check(ios.state.kind === 'compass' && nearAz(l.azDeg, 90, 1e-6) && ios.state.accuracyDeg === 15, `the iPhone's compass ties alpha to north: ${JSON.stringify(l)}`);
  // Tipped past upright to look at the sky, the top of the phone points BEHIND the holder: the
  // compass reads 270 while the back still faces east.
  const ios2 = P.makeReader({ declDeg: 0 });
  ios2.read({ alpha: 77, beta: 130, gamma: 0, webkitCompassHeading: 270 }, 0, false);
  l = P.quatToLook(ios2.state.q);
  check(nearAz(l.azDeg, 90, 1e-6) && near(l.altDeg, 40, 1e-6), `past upright the heading is the top's, half a turn from the view: ${JSON.stringify(l)}`);
  check(P.alphaFromCompass(90, 90) === null, 'upright exactly, the top has no heading: no reading');
  // The gyroscope carries a quick turn; one wild compass reading barely moves north.
  ios.read({ alpha: 47, beta: 60, gamma: 0, webkitCompassHeading: 120 }, 0, false);
  check(nearAz(P.quatToLook(ios.state.q).azDeg, 120, 1e-6), 'a 30 degree turn is 30 degrees');
  ios.read({ alpha: 47, beta: 60, gamma: 0, webkitCompassHeading: 160 }, 0, false);
  check(nearAz(P.quatToLook(ios.state.q).azDeg, 120, 1), 'one wild compass reading moves north by under a degree');
  ios.read({ alpha: 47, beta: 60, gamma: 0, webkitCompassHeading: 120, webkitCompassAccuracy: -1 }, 0, false);
  check(ios.state.accuracyDeg === null, 'a negative accuracy is "not known"');

  // No compass: the turn is right and the view starts where it was.
  const rel = P.makeReader({});
  rel.read({ alpha: 200, beta: 90, gamma: 0 }, 0, false, 180);
  check(rel.state.kind === 'relative' && nearAz(P.quatToLook(rel.state.q).azDeg, 180, 1e-6), 'no compass: starts where the view was looking');
  rel.read({ alpha: 170, beta: 90, gamma: 0 }, 0, false, 180);
  check(nearAz(P.quatToLook(rel.state.q).azDeg, 210, 1e-6), 'and a 30 degree turn to the right is 30 degrees');
  check(P.makeReader({}).read({ alpha: null, beta: null, gamma: null }, 0, false) === null, 'an empty event (a laptop) is no reading');
}

// --- the sensor: permission refused, nothing answering, on and off --------------------------------------
function fakeWin({ permission, wake = true } = {}) {
  const ls = new Map();
  const log = [];
  const win = {
    isSecureContext: true,
    DeviceOrientationEvent: function DeviceOrientationEvent() {},
    screen: { orientation: { angle: 0 } },
    navigator: { maxTouchPoints: 5 },
    document: { hidden: false, addEventListener(t, f) { ls.set(`doc:${t}`, f); }, removeEventListener(t) { ls.delete(`doc:${t}`); } },
    matchMedia: () => ({ matches: true }),
    addEventListener(t, f) { ls.set(t, f); log.push(`+${t}`); },
    removeEventListener(t) { ls.delete(t); log.push(`-${t}`); },
    fire(t, e) { const f = ls.get(t); if (f) f(e); },
    ls, log, locks: 0, released: 0,
  };
  if (permission) win.DeviceOrientationEvent.requestPermission = async () => { log.push('asked'); if (permission === 'throw') throw new Error('not from a tap'); return permission; };
  if (wake) win.navigator.wakeLock = { request: async () => { win.locks += 1; return { release() { win.released += 1; }, addEventListener() {} }; } };
  return win;
}
{
  // Refused on an iPhone: said, nothing listening, nothing locked.
  const w = fakeWin({ permission: 'denied' });
  const p = P.createPointing({ win: w, observer: { latDeg: 51.5, lonDeg: -0.1 } });
  check(w.log.length === 0, 'creating the sensor asks for nothing and listens to nothing');
  const got = await p.start();
  check(got.ok === false && got.why === 'denied' && !p.on && w.ls.size === 0 && w.locks === 0, `refused: ${JSON.stringify(got)}, listeners ${w.ls.size}`);
  check(p.sample(0) === null, 'refused: no attitude, the drag view carries on');
  const t = fakeWin({ permission: 'throw' });
  const got2 = await P.createPointing({ win: t }).start();
  check(got2.ok === false && got2.why === 'denied', 'a request that throws (not from a tap) is a refusal, not a crash');

  // Granted, and the phone answers.
  const g = fakeWin({ permission: 'granted' });
  const states = [];
  const q = P.createPointing({ win: g, observer: { latDeg: 35.2, lonDeg: -111.65 }, startLook: { azDeg: 180, altDeg: 12 }, reduced: true, onChange: (s) => states.push(s) });
  const started = q.start();
  await new Promise((r) => setTimeout(r, 20));
  g.fire('deviceorientationabsolute', { alpha: 0, beta: 135, gamma: 0, absolute: true });
  const ok = await started;
  check(ok.ok === true && q.on && g.log.includes('asked'), `granted: ${JSON.stringify(ok)}`);
  const decl = q.state.declinationDeg;
  let l = P.quatToLook(q.sample(0));
  check(nearAz(l.azDeg, decl, 1e-6) && near(l.altDeg, 45, 1e-6), `the view is the phone's: magnetic north is azimuth ${decl.toFixed(2)} at Flagstaff, 45 up (${JSON.stringify(l)})`);
  check(g.locks === 1 && q.state.wakeLock, 'the screen is kept awake while it is on');
  // A drag is the offset, and stays.
  q.dragBy(-20, 5);
  for (let ms = 16; ms < 800; ms += 16) q.sample(ms);
  l = P.quatToLook(q.sample(800));
  check(nearAz(l.azDeg, decl - 20, 0.01) && near(l.altDeg, 50, 0.01), `a drag became the offset: ${JSON.stringify(l)}`);
  g.fire('deviceorientationabsolute', { alpha: 300, beta: 135, gamma: 0, absolute: true });
  for (let ms = 816; ms < 1600; ms += 16) q.sample(ms);
  l = P.quatToLook(q.sample(1600));
  check(nearAz(l.azDeg, decl + 60 - 20, 0.01), `the offset is kept as the phone turns: ${l.azDeg.toFixed(2)}`);
  // Hidden: the lock goes; back: it is asked for again.
  g.document.hidden = true; g.fire('doc:visibilitychange');
  check(g.released === 1, 'the tab hidden: the wake lock is let go');
  g.document.hidden = false; g.fire('doc:visibilitychange');
  await new Promise((r) => setTimeout(r, 5));
  check(g.locks === 2, 'and asked for again when the tab is back');
  q.stop();
  check(!q.on && g.ls.size === 0 && g.released === 2 && q.sample(2000) === null, `off: no listeners (${g.ls.size}), no lock, no attitude`);

  // Android without the permission call; no wake lock in this browser: still works.
  const a = fakeWin({ wake: false });
  const r = P.createPointing({ win: a, startLook: { azDeg: 90, altDeg: 10 } });
  const s2 = r.start();
  a.fire('deviceorientation', { alpha: 10, beta: 100, gamma: 0, absolute: false });
  check((await s2).ok === true && r.state.kind === 'relative' && !a.log.includes('asked'), 'no permission call where there is none; no compass is said as "relative"');
  // With motion allowed the view glides from where it was (the filter starts at the old look).
  const first = P.quatToLook(r.sample(0));
  check(nearAz(first.azDeg, 90, 1e-6) && near(first.altDeg, 10, 1e-6), 'the first frame is the old view; the filter carries it to the phone');
  r.stop();

  // A sensor that never answers (a desktop with a touch screen): said, and switched off.
  const n = fakeWin({});
  const silent = await P.createPointing({ win: n, silentMs: 150 }).start();
  check(silent.ok === false && silent.why === 'none' && n.ls.size === 0, `nothing answered: ${JSON.stringify(silent)}`);
  check(P.canPoint(fakeWin({})) === true && P.canPoint({ navigator: {} }) === false && P.canPoint({ ...fakeWin({}), isSecureContext: false }) === false, 'canPoint: the event exists, a finger, a secure page');
}

// --- the sky view takes the phone's attitude (sky/skyview.js pointPhone) ------------------------------
{
  const THREE = await import('../site/vendor/three.module.min.js');
  const { stage } = await import('../site/js/scene/stage.js');
  const { createSkyView } = await import('../site/js/sky/skyview.js');
  const src = readFileSync(join(ROOT, 'site/js/sky/skyview.js'), 'utf8');
  check(!/^import[^\n]*pointing\.js/m.test(src) && /import\('\.\/pointing\.js'\)/.test(src), 'the sky view fetches sky/pointing.js when the switch is pressed, never before');
  // A phone: the event exists, no permission call (Android), and a canvas to drag on.
  const ls = new Map();
  const win = new EventTarget();
  win.DeviceOrientationEvent = function DeviceOrientationEvent() {};
  win.isSecureContext = true;
  win.screen = { orientation: { angle: 0 } };
  win.navigator = {};
  win.document = { hidden: false, addEventListener() {}, removeEventListener() {} };
  const hadWindow = 'window' in globalThis;
  globalThis.window = win;
  const canvas = { clientHeight: 800, clientWidth: 400, addEventListener(t, f) { ls.set(t, f); }, removeEventListener(t) { ls.delete(t); }, setPointerCapture() {}, releasePointerCapture() {} };
  const camera = new THREE.PerspectiveCamera(50, 0.5, 0.001, 1e9);
  const sky = createSkyView({ camera, scene: new THREE.Scene(), stage }, { domElement: canvas, ground: false, glow: false, storage: null });
  const tNight = Date.parse('2026-01-10T02:00:00Z');
  check((await sky.pointPhone(true)).why === 'place', 'before the sky view has a place the switch says so');
  sky.enter({ latDeg: 51.5, lonDeg: -0.13, altKm: 0 });
  sky.update(tNight);
  check(sky.pointing.on === false && Math.abs(sky.look.azimuthDeg - 180) < 1e-6, 'off by default: the drag view, facing south');
  const fire = (alpha, beta, gamma) => { const e = new Event('deviceorientationabsolute'); Object.assign(e, { alpha, beta, gamma, absolute: true }); win.dispatchEvent(e); };
  const started = sky.pointPhone(true);
  const pump = setInterval(() => fire(270, 120, 0), 10);
  const got = await started;
  check(got.ok === true && sky.pointing.on && sky.pointing.kind === 'absolute', `on: ${JSON.stringify(got)} ${JSON.stringify(sky.pointing)}`);
  const decl = sky.pointing.declinationDeg;
  const settle = async () => { for (let i = 0; i < 40; i += 1) { sky.update(tNight); await new Promise((r) => setTimeout(r, 12)); } };
  await settle();
  check(nearAz(sky.look.azimuthDeg, 90 + decl, 0.05) && near(sky.look.altitudeDeg, 30, 0.05), `the view is where the phone points: ${JSON.stringify(sky.look)} (declination ${decl.toFixed(2)})`);
  // The camera really looks there: its forward, in the local frame the view builds.
  const f = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  check(Math.abs(f.length() - 1) < 1e-9, 'the camera has an attitude');
  // lookAtDeg does not fight the phone; a drag is the offset.
  sky.lookAtDeg(10, 10);
  await settle();
  check(near(sky.look.altitudeDeg, 30, 0.05), 'lookAtDeg leaves the phone\'s view alone');
  ls.get('pointerdown')({ pointerId: 1, clientX: 100, clientY: 100 });
  ls.get('pointermove')({ pointerId: 1, clientX: 160, clientY: 100 });
  ls.get('pointerup')({ pointerId: 1, clientX: 160, clientY: 100 });
  await settle();
  const perPx = 72 / 800;
  check(near(sky.pointing.offsetAzDeg, -60 * perPx, 0.01) && nearAz(sky.look.azimuthDeg, 90 + decl - 60 * perPx, 0.05), `a 60 px drag to the right is ${(60 * perPx).toFixed(2)} degrees of offset: ${sky.pointing.offsetAzDeg}`);
  sky.resetPointing();
  // Past the drag view's own limits: straight down and nearly straight up both hold.
  clearInterval(pump);
  const pump2 = setInterval(() => fire(0, 10, 0), 10);
  await settle();
  check(near(sky.look.altitudeDeg, -80, 0.1), `the phone can look at the ground (${sky.look.altitudeDeg})`);
  clearInterval(pump2);
  // Off: nothing listens, and the drag view carries on from a sane place.
  await sky.pointPhone(false);
  sky.update(tNight);
  check(sky.pointing.on === false && sky.look.altitudeDeg >= -20.001, `off: the drag view, inside its own limits (${sky.look.altitudeDeg})`);
  // Leaving the sky view lets go of the sensor too.
  const again = sky.pointPhone(true);
  const pump3 = setInterval(() => fire(0, 100, 0), 10);
  await again;
  sky.exit();
  clearInterval(pump3);
  check(sky.pointing.on === false, 'leaving the sky view switches the phone off');
  if (!hadWindow) delete globalThis.window;
}

if (problems.length) { console.error(`test_pointing: ${problems.length} problem(s)`); for (const p of problems) console.error('  - ' + p); process.exit(1); }
console.log('test_pointing: ok');
