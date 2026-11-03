// tools/moments-build/apollo13.mjs -- Apollo 13, 11 to 17 April 1970 (release 1.7.0, internal #1058).
// Writes site/data/moments/apollo-13.json and paths/apollo-13-{ivb,csm,lm,sm}.json. `node tools/moments-build/apollo13.mjs`.
//
// WHAT IS FLOWN AND WHAT IS DRAWN. The event times are the Apollo 13 Mission Report's (NASA MSC-02680, 1971; NTRS 19710003598) Table 3-I,
// to the second: lift-off 19:13:00.65 UTC on 11 April 1970 (range zero 19:13:00), the S-II centre engine's early cut-off at 330.6 s, translunar
// injection at 2:35:46, docking at 3:19:09, the tank incident at 55:54:53, the descent-engine burn that put the craft back on a free
// return at 61:29:43, trans-earth injection two hours after the Moon at 79:27:39 (263.8 s, 860.5 ft/s), the service module's release at
// 138:01:48, the lunar module's at 141:30:00, entry at 142:40:46 and landing at 142:54:41 at 21 38.4 S 165 21.7 W. The two lines of the
// radio that are played are logged at 55:55:20 and 55:55:42 (the Flight Journal; Wikipedia, "Apollo 13").
//
// THE PATHS are reconstructions, as the other Moments' are. The launch is a profile (the Mission Report's event times, the heights and
// distances between them ours). The parking orbit is the Earth's own conic through the Report's state at translunar ignition (Table 4-II),
// joined to the launch's end by a blend. Translunar injection is a blend onto the Report's state at injection, and from there the path is
// INTEGRATED (the Earth's pull and the Moon's, from the app's ephemeris) to the Moon with a trim of that state's velocity (27.7 m/s,
// found by search: the table's altitudes are above the launch pad, and a 10 km error in radius is 8 m/s at that speed) that puts the pericentre
// where Table 4-III puts the one after the second correction: 254 km up over 3.02 N 179.29 W at 77:28. The two real corrections of the
// outward journey (7.1 m/s at 30:40 and 11.5 m/s at 61:29) are therefore not drawn as bends: the path they made is the path drawn, and the
// descent engine's flame at 61:29 burns on a path that does not change for it. The way home is a blend over the trans-earth burn onto a
// Lambert arc to the Report's entry point (28.23 S 173.44 E, 122 km up), then the entry on a great circle to the landing at
// 21 38.4 S 165 21.7 W.
import { writeFileSync } from 'node:fs';
import * as L from './lib.mjs';
import { monotoneCubic } from '../../site/js/moments/format.js';
import { fixedToInertial, siderealAt } from '../../site/js/moments/trajectory.js';
import { worldPositionKm } from '../../site/js/propagate/body.js';
const { add, sub, scale, dot, cross, len, norm, MU, EARTH_R, MU_MOON, R_MOON, DEG } = L;
const OUT = new URL('../../site/data/moments/', import.meta.url).pathname;
const epochMs = Date.parse('1970-04-11T19:13:00Z');
const place = { name: 'Launch Complex 39A', lat: 28.60825, lon: -80.60412, alt: 0, azimuth: 72.043, ground: { kind: 'coast', shoreBearing: 340, shoreM: 800, pad: true } };
const frame = L.placeFrame(place);
const G = (h, m, s) => h * 3600 + m * 60 + s;
const T = {
  ins: 750, tli0: G(2, 35, 46.4), tli1: G(2, 41, 47.2), sep: G(3, 6, 39), dock: G(3, 19, 9), extr: G(4, 1, 1), ivbman: G(4, 18, 1),
  boom: G(55, 54, 53), say1: G(55, 55, 20), say2: G(55, 55, 42), mcc2: G(61, 29, 43.5), pc: G(77, 28, 0), impact: G(77, 56, 40),
  tei0: G(79, 27, 39), tei1: G(79, 27, 39) + 263.8, mcc3: G(105, 18, 28), mcc4: G(137, 39, 52), smsep: G(138, 1, 48),
  undock: G(141, 30, 0), ei: G(142, 40, 46), splash: G(142, 54, 41),
};
T.drogue = T.splash - 380; T.main = T.splash - 310;
const SPLASH = { lat: -21.64, lon: -165.3617 }, EIPT = { lat: -28.23, lon: 173.44 };
const smooth = (u) => { const x = Math.min(1, Math.max(0, u)); return x * x * (3 - 2 * x); };
const mono = (pts) => { const f = monotoneCubic(pts.map((p) => p[0]), pts.map((p) => p[1])); return (x) => f(x).y; };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// --- the launch: the Mission Report's events; heights and distances between them ours (as in the Apollo 11 Moment)
const ASCENT = [[-9.5, 0, 0], [0.65, 0, 0], [12, 0.13, 0], [30, 1.3, 0.15], [50, 4.0, 1.0], [66, 7.8, 2.9], [83, 13.3, 6.4], [110, 25.0, 20.0], [137, 44.0, 49.0],
  [164, 67.5, 97.0], [195, 89.0, 166.0], [201, 93.0, 180.0], [300, 126, 455], [400, 152, 850], [500, 170, 1330], [593, 181, 1830], [680, 188, 2400], [750, 188.3, 2903]];
const track = L.profileTrack({ points: ASCENT, azimuth: 72.043 }, place);
const sIns = L.profileInertial(epochMs, track, frame, T.ins);
const elements = (s, mu = MU, R = EARTH_R) => { const r = len(s.r), v = len(s.v), a = 1 / (2 / r - v * v / mu), h = cross(s.r, s.v), e = Math.sqrt(Math.max(0, 1 - len(h) ** 2 / (mu * a))); return { perKm: +((a * (1 - e) - R) / 1e3).toFixed(1), apoKm: +((a * (1 + e) - R) / 1e3).toFixed(1), incl: +(Math.acos(h[2] / len(h)) / DEG).toFixed(1), speed: +len(s.v).toFixed(0), alt: +((r - R) / 1e3).toFixed(1) }; };
console.log('insertion from the profile (the Mission Report: 190 by 185 km, 7 792 m/s)', elements(sIns));

// --- the states the Mission Report's Table 4-II gives: geodetic latitude, longitude, altitude (n mi), space-fixed speed (ft/s), flight-path angle and heading (degrees)
const FT = 0.3048, NMI = 1.852;
const stateFromTable = (t, lat, lon, altNmi, speedFts, fpa, hdg) => {
  const fr = L.placeFrame({ lat, lon, alt: altNmi * NMI * 1e3 });
  const g = siderealAt(epochMs, t);
  const dirE = add(scale(add(scale(fr.e, Math.sin(hdg * DEG)), scale(fr.n, Math.cos(hdg * DEG))), Math.cos(fpa * DEG)), scale(fr.u, Math.sin(fpa * DEG)));
  return { r: fixedToInertial(fr.ecef, g), v: scale(fixedToInertial(dirE, g), speedFts * FT) };
};
const sT0 = stateFromTable(T.tli0, -22.48, 142.45, 105.39, 25573.1, 0.032, 65.708);     // S-IVB second ignition, 2:35:46.4
const sT1 = stateFromTable(T.tli1, -8.92, 167.21, 182.45, 35588.4, 7.635, 59.318);       // translunar injection, 2:41:47.2
console.log('TLI ignition state', elements(sT0), 'and injection', elements(sT1));
const leo = (t) => L.kepler(sT0.r, sT0.v, t - T.tli0);
const back = leo(T.ins);
console.log('the parking orbit carried back to the insertion is', (len(sub(back.r, sIns.r)) / 1e3).toFixed(0), 'km from the profile\'s insertion point');

// --- the coast to the Moon, integrated: the Earth's pull and the Moon's (an ephemeris), from the injection state, with ONE correction at 61:29:43 that is solved for
const moonRaw = (t) => { const q = worldPositionKm('moon', epochMs + t * 1000, 'earth-inertial'); return [q.x * 1e3, q.y * 1e3, q.z * 1e3]; };
const moonMemo = new Map();   // the Moon every 20 s, linear between (a metre of error at most)
const moonGrid = (i) => { let m = moonMemo.get(i); if (!m) { m = moonRaw(i * 20); moonMemo.set(i, m); } return m; };
const moonPos = (t) => { const x = t / 20, i = Math.floor(x), u = x - i, a = moonGrid(i), b = moonGrid(i + 1); return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; };
const acc = (t, r) => {
  const m = moonPos(t), d = sub(r, m), rr = len(r), dd = len(d), mm = len(m);
  return [0, 1, 2].map((k) => -MU * r[k] / rr ** 3 - MU_MOON * (d[k] / dd ** 3 + m[k] / mm ** 3));
};
function integrate(t0, r0, v0, t1) {
  const out = [{ t: t0, r: r0.slice(), v: v0.slice() }];
  let t = t0, r = r0, v = v0;
  while (t < t1 - 1e-9) {
    const dm = len(sub(r, moonPos(t)));
    const h = Math.min(t1 - t, Math.max(1, Math.min(60, dm / (len(v) * 40))));
    const k1r = v, k1v = acc(t, r);
    const r2 = add(r, scale(k1r, h / 2)), v2 = add(v, scale(k1v, h / 2));
    const k2r = v2, k2v = acc(t + h / 2, r2);
    const r3 = add(r, scale(k2r, h / 2)), v3 = add(v, scale(k2v, h / 2));
    const k3r = v3, k3v = acc(t + h / 2, r3);
    const r4 = add(r, scale(k3r, h)), v4 = add(v, scale(k3v, h));
    const k4r = v4, k4v = acc(t + h, r4);
    r = add(r, scale(add(add(k1r, scale(k2r, 2)), add(scale(k3r, 2), k4r)), h / 6));
    v = add(v, scale(add(add(k1v, scale(k2v, 2)), add(scale(k3v, 2), k4v)), h / 6));
    t += h;
    out.push({ t, r, v });
  }
  return out;
}
const lookup = (grid, t) => { // a cubic Hermite between the stored states
  let lo = 0, hi = grid.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (grid[mid].t <= t) lo = mid; else hi = mid; }
  const a = grid[lo], b = grid[hi];
  return L.hermite(a, b, a.t, b.t, clamp(t, a.t, b.t));
};
// The table's altitudes are "above the launch pad", not above a spheroid, and a 10 km error in radius is 8 m/s of energy at this speed, which moves the
// arrival at the Moon by hours. So the injection state is taken as the report's and TRIMMED by a few m/s (found below) until the integrated path passes
// the Moon where Table 4-III says the pericynthion after the second correction was: 3.02 N 179.29 W, about 136 n mi (252 km) up, at about 77:28.
// The two real midcourse corrections (7.1 m/s at 30:40, 11.5 m/s at 61:29) are then not drawn as burns: the path they made is the path drawn.
const pericentre = (grid) => { let k = 0, d0 = 1e99; for (let i = 0; i < grid.length; i += 1) { const d = len(sub(grid[i].r, moonPos(grid[i].t))); if (d < d0) { d0 = d; k = i; } } return { k, d: d0 }; };
const probe = (dv) => {
  const g = integrate(T.tli1, sT1.r, add(sT1.v, dv), T.pc + 4000);
  const { k, d } = pericentre(g);
  const t = g[k].t, mp = moonPos(t), ax = L.moonAxes(mp), rel = norm(sub(g[k].r, mp));
  const lat = Math.asin(dot(rel, ax.z)) / DEG, lon = Math.atan2(dot(rel, ax.y), dot(rel, ax.x)) / DEG;
  return { t, h: d - R_MOON, lat, lon };
};
const mis = (p) => ((p.t - T.pc) / 500) ** 2 + ((p.h - 254e3) / (3e4 + 0.2 * Math.abs(p.h))) ** 2 + ((p.lat - 3.02) / 1.0) ** 2 + ((((p.lon + 179.29 + 540) % 360) - 180) / 2.5) ** 2;
const vHat = norm(sT1.v), nHat = norm(cross(sT1.r, sT1.v)), bHat = cross(nHat, vHat);
const dvOf = (a, b, c) => add(add(scale(vHat, a), scale(bHat, b)), scale(nHat, c));
const TRIM = [-9.2834, -24.2943, 9.6333];   // m/s, inertial: what the search below found (set A13_SEARCH=1 to run it again, a minute and a half)
let dvT = TRIM;
if (process.env.A13_SEARCH) {
  const p0 = probe([0, 0, 0]);
  console.log('the injection state as given closes to', (p0.h / 1e3).toFixed(0), 'km above the Moon at', (p0.t / 3600).toFixed(2), 'h');
  let bestG = null;
  for (let a = -14; a <= 2; a += 1) for (let b = -8; b <= 8; b += 2) for (let c = -8; c <= 8; c += 2) { const m = mis(probe(dvOf(a, b, c))); if (!bestG || m < bestG.m) bestG = { m, a, b, c }; }
  console.log('best of the grid', JSON.stringify(bestG));
  const misTight = (p) => ((p.t - T.pc) / 15) ** 2 + ((p.h - 254e3) / 8e3) ** 2 + ((p.lat - 3.02) / 0.3) ** 2 + ((((p.lon + 179.29 + 540) % 360) - 180) / 1.0) ** 2;
  dvT = dvOf(bestG.a, bestG.b, bestG.c); let best0 = bestG.m, stp = 0.5;
  for (let round = 0; round < 120 && stp > 0.002; round += 1) {   // first the loose cost, to get near
    let moved = false;
    for (const dir of [vHat, bHat, nHat]) for (const sgn of [1, -1]) { const d = add(dvT, scale(dir, sgn * stp)); const c = mis(probe(d)); if (c < best0) { best0 = c; dvT = d; moved = true; } }
    if (!moved) stp /= 2;
  }
  best0 = misTight(probe(dvT)); stp = 0.2;
  for (let round = 0; round < 160 && stp > 0.0005; round += 1) {
    let moved = false;
    for (const dir of [vHat, bHat, nHat]) for (const sgn of [1, -1]) { const d = add(dvT, scale(dir, sgn * stp)); const c = misTight(probe(d)); if (c < best0) { best0 = c; dvT = d; moved = true; } }
    if (!moved) stp /= 2;
  }

}
if (process.env.A13_SEARCH) console.log('TRIM', JSON.stringify(dvT.map((x) => +x.toFixed(4))));
const pr = probe(dvT);
console.log('the trim of the injection state:', len(dvT).toFixed(1), 'm/s; pericentre', (pr.h / 1e3).toFixed(0), 'km up, lat', pr.lat.toFixed(2), 'lon', pr.lon.toFixed(1), 'at', pr.t.toFixed(0), 's (target', T.pc, ')');
const sT1t = { r: sT1.r, v: add(sT1.v, dvT) };      // the injection state with its trim
const gridB = integrate(T.tli1, sT1t.r, sT1t.v, T.tei0 + 60);
const gridA = gridB;
// --- the entry point and the landing point, on the turning Earth
const rEIv = L.groundPos(epochMs, EIPT.lat, EIPT.lon, 121.9e3, T.ei);
const sEnd = L.groundPos(epochMs, SPLASH.lat, SPLASH.lon, 0, T.splash);
const coastAt = (t) => lookup(t < T.mcc2 ? gridA : gridB, t);
const bState = coastAt(T.tei1);
const lam2 = L.lambert(bState.r, rEIv, T.ei - T.tei1, MU, cross(bState.r, rEIv));
const dvTei = len(sub(lam2.v1, bState.v));
console.log('trans-earth burn: Lambert dv', dvTei.toFixed(0), 'm/s (reported 262.3 over 263.8 s); entry flight-path angle', (Math.asin(dot(norm(rEIv), norm(lam2.v2))) / DEG).toFixed(2), 'deg (reported -6.27), entry speed', len(lam2.v2).toFixed(0), 'm/s (reported 11 037)');
const teiS = coastAt(T.tei0), teiE = { r: bState.r, v: lam2.v1 };
let low = 1e99; for (let t = T.tei0; t <= T.tei1; t += 5) low = Math.min(low, len(sub(L.hermite(teiS, teiE, T.tei0, T.tei1, t).r, moonPos(t))));
console.log('trans-earth burn blend: lowest point above the Moon km', ((low - R_MOON) / 1e3).toFixed(0));
const ENTRY_DUR = T.splash - T.ei;
const dist = Math.acos(clamp(dot(norm(rEIv), norm(sEnd)), -1, 1)) * 6371.0088;
console.log('entry: ground range km', dist.toFixed(0), 'in', ENTRY_DUR, 's');
const kk = ENTRY_DUR / 929;
const ENTRY_ALT = mono([[0, 121.9], [60, 110], [120, 86], [180, 62], [240, 46], [300, 34], [360, 26], [420, 19], [480, 12], [560, 7.3], [620, 3.0], [929, 0]].map(([x, y]) => [x * kk, y]));
const ENTRY_RNG = mono([[0, 0], [60, 660], [120, 1290], [180, 1830], [240, 2235], [300, 2500], [360, 2650], [420, 2720], [480, 2755], [540, 2770], [600, 2778], [929, 2790]].map(([x, y]) => [x * kk, y / 2790 * dist]));
const slerp = (a, b, f) => { const w = Math.acos(Math.min(1, dot(a, b))); return add(scale(a, Math.sin((1 - f) * w) / Math.sin(w)), scale(b, Math.sin(f * w) / Math.sin(w))); };
const uEI = norm(rEIv), sEndDir = norm(sEnd);
const entryPos = (t) => { const f = Math.min(1, ENTRY_RNG(t - T.ei) / dist); return scale(slerp(uEI, sEndDir, f), EARTH_R + Math.max(0, ENTRY_ALT(t - T.ei)) * 1e3); };
const entryAt = L.diffState(entryPos);
const rEI0 = { r: teiE.r, v: teiE.v };
const entryJoin = (t) => L.hermite(L.kepler(rEI0.r, rEI0.v, (T.ei - 300) - T.tei1), entryAt(T.ei), T.ei - 300, T.ei, t);
// the launch's end to the parking orbit: a blend from the profile's insertion state onto the Earth's own orbit through the injection state
const INS_BLEND = 1200;
const parking = (t) => (t <= T.ins + INS_BLEND ? L.hermite(sIns, leo(T.ins + INS_BLEND), T.ins, T.ins + INS_BLEND, t) : leo(t));

// --- the whole stack's path (the reference point is the CSM-LM stack's centre line)
function tripAt(t) {
  if (t <= T.tli0) return parking(t);
  if (t <= T.tli1) return L.hermite(sT0, sT1t, T.tli0, T.tli1, t);
  if (t <= T.tei0) return coastAt(t);
  if (t <= T.tei1) return L.hermite(teiS, teiE, T.tei0, T.tei1, t);
  if (t <= T.ei - 300) return L.kepler(rEI0.r, rEI0.v, t - T.tei1);
  if (t <= T.ei) return entryJoin(t);
  return entryAt(t);
}
const mn = (t) => L.moonAt(epochMs, t);
const nearMoon = (t) => t > T.pc - 40000 && t < T.tei1 + 8000;
const axisDir = (t) => { const s = tripAt(t); const m = mn(t); return norm(nearMoon(t) ? sub(s.v, m.v) : s.v); };
const dockOff = 16.1;
const offAt = (t) => (t < T.extr ? 104.3 : t >= T.extr + 1800 ? 0 : (104.3 + 60 * smooth((t - T.extr) / 200)) * (1 - smooth((t - T.extr - 400) / 1400)));
const csmAt = (t) => { const s = tripAt(t), o = offAt(t); return { r: add(s.r, scale(axisDir(t), o)), v: s.v }; };
const ivbAt = (t) => { const s = tripAt(t); const o = t > T.extr ? 0.35 * (t - T.extr) : 0; return { r: sub(s.r, scale(axisDir(t), o)), v: s.v }; };
const lmAt = (t) => { const c = csmAt(t); const o = dockOff + (t > T.undock ? 0.3 * (t - T.undock) : 0); return { r: sub(c.r, scale(axisDir(t), o)), v: c.v }; };
// the spent service module: it leaves along its own axis (the aft end, +v here) at about 0.4 m/s once the two modules are apart
const SM_V = 0.4;
const smAt = (t) => { const c = csmAt(t); return { r: add(c.r, scale(axisDir(t), SM_V * (t - T.smsep))), v: c.v }; };
for (const [name, f, t] of [['TLI start', tripAt, T.tli0], ['TLI end', tripAt, T.tli1], ['correction', tripAt, T.mcc2], ['trans-earth burn start', tripAt, T.tei0], ['burn end', tripAt, T.tei1], ['entry join', tripAt, T.ei - 300], ['EI', tripAt, T.ei]]) {
  const a = f(t - 0.05), b = f(t + 0.05);
  console.log('join', name, 'position jump m', len(sub(a.r, b.r)).toFixed(0), 'velocity jump m/s', len(sub(a.v, b.v)).toFixed(0));
}
console.log('at the tank incident the craft is', (len(tripAt(T.boom).r) / 1e3).toFixed(0), 'km from the Earth\'s centre (the NARA recording gives about 321 860 km from the Earth)');
let far = 0; for (let t = T.pc - 8000; t < T.pc + 8000; t += 30) far = Math.max(far, len(tripAt(t).r)); console.log('farthest from the Earth\'s centre', (far / 1e3).toFixed(0), 'km (400 171 reported from its surface, so 406 542)');

const stepIn = (fn) => (t) => { const s = fn(t); return L.arcStep(len(s.r), len(s.v)); };
const stepTrip = (t) => (nearMoon(t) ? L.arcStep(Math.max(len(sub(tripAt(t).r, mn(t).r)), 1.8e6), Math.max(len(sub(tripAt(t).v, mn(t).v)), 1500), 4, 900) : stepIn(tripAt)(t));
const seg = (from, to, at, step) => ({ from, to, at, step });
// A step that never jumps over a window that wants a finer one: where a window is ahead, the step stops at its start.
const WINDOWS = [[T.tli0 - 600, T.tli1 + 300, 4], [T.boom - 60, T.boom + 600, 10], [T.tei0 - 100, T.tei1 + 100, 4], [T.smsep - 60, T.smsep + 3700, 20], [T.undock - 60, T.undock + 300, 6], [T.ei - 300, T.splash, 4]];
const stepAll = (t) => {
  for (const [lo, hi, st] of WINDOWS) if (t >= lo && t < hi) return st;
  let st = stepTrip(t);
  for (const [lo] of WINDOWS) if (lo > t && lo - t < st) st = Math.max(0.5, lo - t);
  return st;
};
L.save(OUT + 'paths/apollo-13-csm.json', L.rowsOf([seg(T.extr, T.splash - 1, csmAt, stepAll), seg(T.splash - 1, T.splash, csmAt, () => 1)]),
  'Apollo 13 CSM Odyssey, 4:01 to splashdown; reconstructed by tools/moments-build/apollo13.mjs. Earth-inertial (TEME) km and km/s.');
L.save(OUT + 'paths/apollo-13-ivb.json', L.rowsOf([seg(T.ins, T.extr + 700, ivbAt, (t) => (t >= T.tli0 - 300 && t <= T.tli1 + 300 ? 4 : stepIn(tripAt)(t)))]),
  'Apollo 13 S-IVB: parking orbit, translunar injection, the extraction of the CSM and LM.');
L.save(OUT + 'paths/apollo-13-lm.json', L.rowsOf([seg(T.extr, T.ei + 90, lmAt, stepAll)]),
  'Apollo 13 Aquarius: docked to Odyssey from the extraction to 141:30:00, then drifting behind it to entry.');
L.save(OUT + 'paths/apollo-13-sm.json', L.rowsOf([seg(T.smsep, T.smsep + 3600, smAt, () => 20)]),
  'Apollo 13 service module from its release at 138:01:48: leaving along its axis at about 0.4 m/s, an illustrative drift (the sources give the crew\'s sighting at about 80 feet, not a speed).');

// --- the moment
const sat = L.registryRow('saturn-v'), lmr = L.registryRow('lunar-module'), csmr = L.registryRow('apollo-csm');
const ev = (t, vehicle, part, action, extra = {}) => ({ t, part, action, vehicle, ...extra });
// the bay-4 vent: the cloud that leaves the SM at the incident, in the SM's own metres (azimuth 240 degrees, 1.95 m out, 4.5 m up)
const ventAt = [[-0.98, 4.4, -1.69], [-0.9, 5.2, -1.56], [-1.0, 3.9, -1.73]], ventDir = [-0.5, 0.18, -0.866];
const parts = [
  ev(-8.9, 'saturn', 's-ic', 'ignite', { engines: [0], rampS: 1.4 }), ev(-8.6, 'saturn', 's-ic', 'ignite', { engines: [1, 3], rampS: 1.4 }), ev(-8.3, 'saturn', 's-ic', 'ignite', { engines: [2, 4], rampS: 1.4 }),
  ev(164, 'saturn', 's-ic', 'cutoff'),
  ev(164.6, 'saturn', 's-ic', 'separate', { dv: [0, -9, 0], spin: [0.012, 0, 0.02], puffs: { at: [[5.2, 5, 3.6], [-3.6, 5, 5.2], [-5.2, 5, -3.6], [3.6, 5, -5.2]], dir: [0, 1, 0], exitM: 0.4, dur: 0.7, lead: -0.1 } }),
  ev(165, 'saturn', 's-ii', 'ignite', { rampS: 2.5 }),
  ev(194, 'saturn', 'interstage-ic-ii', 'separate', { dv: [0, -4, 0], spin: [0.01, 0, -0.008] }),
  ev(201, 'saturn', 'les-tower', 'separate', { dv: [4, 30, 0], spin: [0.04, 0, 0.09], puffs: { at: [[0.5, 106.5, 0], [-0.5, 106.5, 0]], dir: [0, -1, 0], exitM: 0.35, dur: 1.2 } }),
  ev(201, 'saturn', 'bpc', 'separate', { dv: [2, 22, 1], spin: [0.03, 0, 0.05] }),
  ev(330.6, 'saturn', 's-ii', 'cutoff', { engines: [0] }), ev(593, 'saturn', 's-ii', 'cutoff'),
  ev(593.6, 'saturn', 's-ii', 'separate', { dv: [0, -5, 0], spin: [0.01, 0, 0.015] }),
  ev(594, 'saturn', 's-ivb', 'ignite', { rampS: 2 }), ev(T.ins, 'saturn', 's-ivb', 'cutoff'),
  ...['s-ic', 'interstage-ic-ii', 'les-tower', 'bpc', 's-ii'].map((n) => ev(T.ins + 12, 'ivb', n, 'hide')),
  ev(T.tli0, 'ivb', 's-ivb', 'ignite', { rampS: 3 }), ev(T.tli1, 'ivb', 's-ivb', 'cutoff'),
  ev(T.sep, 'ivb', 'sla-1', 'separate', { dv: [0, -0.3, 1.8], spin: [-0.5, 0, 0] }), ev(T.sep, 'ivb', 'sla-2', 'separate', { dv: [-1.8, -0.3, 0], spin: [0, 0, -0.5] }),
  ev(T.sep, 'ivb', 'sla-3', 'separate', { dv: [0, -0.3, -1.8], spin: [0.5, 0, 0] }), ev(T.sep, 'ivb', 'sla-4', 'separate', { dv: [1.8, -0.3, 0], spin: [0, 0, 0.5] }),
  ev(T.extr, 'ivb', 'csm-stowed', 'hide'),
  // the CSM: bay 4's torn foil is hidden until the panel goes
  ev(T.extr, 'csm', 'sm-bay-foil', 'hide'),
  ev(T.boom, 'csm', 'sm-bay-foil', 'show'),
  ev(T.boom, 'csm', 'sm-panel-4', 'separate', { dv: [-4.2, 1.4, -7.3], spin: [0.5, 0.2, -0.8], puffs: { part: 'service-module', at: ventAt, dir: ventDir, exitM: 2.4, dur: 400 } }),
  ev(T.boom + 80, 'csm', 'sm-panel-4', 'hide'),
  ev(T.mcc2, 'lm', 'descent-stage', 'ignite', { rampS: 3 }), ev(T.mcc2 + 4, 'lm', 'descent-stage', 'throttle', { level: 0.15 }), ev(T.mcc2 + 34.2, 'lm', 'descent-stage', 'cutoff'),
  ev(T.tei0, 'lm', 'descent-stage', 'ignite', { rampS: 3 }), ev(T.tei0 + 26, 'lm', 'descent-stage', 'throttle', { level: 0.95 }), ev(T.tei1, 'lm', 'descent-stage', 'cutoff'),
  ev(T.mcc3, 'lm', 'descent-stage', 'ignite', { rampS: 1 }), ev(T.mcc3 + 14, 'lm', 'descent-stage', 'cutoff'),
  ev(T.smsep, 'csm', 'service-module', 'hide'), ev(T.smsep, 'csm', 'sm-bay-foil', 'hide'),
  // the spent service module, a vehicle of its own: the command module is not in it
  ev(T.smsep, 'sm', 'command-module', 'hide'),
  ev(T.ei + 5, 'lm', 'ascent-stage', 'hide'), ev(T.ei + 5, 'lm', 'descent-stage', 'hide'),
  ev(T.drogue, 'csm', 'drogue', 'deploy', { reefS: 3, openS: 2 }), ev(T.main, 'csm', 'main', 'deploy', { reefS: 5, openS: 4 }), ev(T.main + 2, 'csm', 'drogue', 'hide'),
].sort((a, b) => a.t - b.t);

const wideDir = (t) => { const m = norm(mn(t).r); const d = norm(add(scale(norm(cross([0, 0, 1], m)), 0.9), [0, 0, 0.35])); return d.map((x) => +x.toFixed(3)); };
const cam = [
  { t: -9.5, shot: 'pad', at: [190, -150, 4], lookY: 45, fov: 42, vehicle: 'saturn' }, { t: -2.5, shot: 'pad', at: [95, -60, 5], lookY: 14, fov: 56, vehicle: 'saturn' },
  { t: 3, shot: 'track', at: [-1300, -900, 12], lookY: 55, fill: 0.6, fovMin: 0.6, fovMax: 20, vehicle: 'saturn' },
  { t: 18, shot: 'chase', offset: [150, -50, -130], lookY: 50, fov: 40, blend: 1.5, vehicle: 'saturn' }, { t: 128, shot: 'chase', offset: [55, -25, -45], lookY: 18, fov: 50, vehicle: 'saturn' },
  { t: 161, shot: 'orbit', az: 115, el: 6, dist: 210, lookY: 45, fov: 40, spin: 1.5, vehicle: 'saturn' }, { t: 168, shot: 'chase', offset: [110, -60, -90], lookY: 40, fov: 52, blend: 1.0, vehicle: 'saturn' },
  { t: 190, shot: 'orbit', az: 60, el: 4, dist: 190, lookY: 75, fov: 44, vehicle: 'saturn' }, { t: 215, shot: 'chase', offset: [150, -60, -110], lookY: 40, fov: 46, blend: 1.5, vehicle: 'saturn' },
  { t: 322, shot: 'orbit', az: 100, el: 5, dist: 230, lookY: 50, fov: 40, spin: 1.2, vehicle: 'saturn', blend: 2 }, { t: 340, shot: 'chase', offset: [200, -80, -150], lookY: 50, fov: 44, blend: 2, vehicle: 'saturn' },
  { t: 588, shot: 'orbit', az: 100, el: 5, dist: 230, lookY: 60, fov: 40, spin: 1.2, vehicle: 'saturn', blend: 2 }, { t: 610, shot: 'chase', offset: [140, -30, -110], lookY: 70, fov: 45, vehicle: 'saturn', blend: 1.5 },
  { t: 745, shot: 'orbit', az: 70, el: 8, dist: 230, lookY: 75, fov: 42, vehicle: 'saturn', blend: 1.5 },
  { t: 770, shot: 'globe', altKm: 1400, backKm: 2200, fov: 46, vehicle: 'ivb', blend: 3 },
  { t: 9000, shot: 'globe', altKm: 2500, backKm: 5000, fov: 50, vehicle: 'ivb', blend: 2 }, { t: T.tli0 + 90, shot: 'globe', altKm: 6000, backKm: 3000, fov: 46, vehicle: 'ivb', blend: 3 },
  { t: T.tli1 + 30, shot: 'orbit', az: 80, el: 12, dist: 90, lookY: 82, fov: 40, vehicle: 'ivb', blend: 2 }, { t: T.sep - 20, shot: 'orbit', az: 140, el: 8, dist: 70, lookY: 100, fov: 40, vehicle: 'ivb' },
  { t: T.extr + 200, shot: 'orbit', az: 30, el: 12, dist: 60, lookY: 4, fov: 40, vehicle: 'csm', blend: 2 },
  { t: 16000, shot: 'wide', look: 'earth', distKm: 22000, dir: wideDir(16000), fov: 40, vehicle: 'csm', blend: 3 },
  { t: 40000, shot: 'wide', look: 'earth-moon', distKm: 800000, dir: wideDir(60000), fov: 38, vehicle: 'csm', blend: 3 },
  { t: T.boom - 70, shot: 'orbit', az: 160, el: 14, dist: 52, lookY: 6, fov: 40, vehicle: 'csm', blend: 3 },
  { t: T.boom - 6, shot: 'chase', offset: [-13, 3, -23], lookY: 4.5, fov: 40, vehicle: 'csm', blend: 1.5 },
  { t: T.boom + 26, shot: 'orbit', az: 100, el: 10, dist: 38, lookY: 5, fov: 42, vehicle: 'csm', spin: 2.5, blend: 1 },
  { t: T.boom + 120, shot: 'wide', look: 'vehicle', distKm: 0.12, dir: wideDir(T.boom), fov: 40, vehicle: 'csm', blend: 3 },
  { t: T.boom + 4000, shot: 'wide', look: 'earth-moon', distKm: 900000, dir: wideDir(T.boom + 100000), fov: 38, vehicle: 'csm', blend: 3 },
  { t: T.mcc2 - 60, shot: 'orbit', az: 200, el: 12, dist: 45, lookY: 4, fov: 40, vehicle: 'lm', blend: 3 },
  { t: T.mcc2 + 60, shot: 'wide', look: 'moon', distKm: 140000, dir: wideDir(T.mcc2 + 20000), fov: 40, vehicle: 'csm', blend: 3 },
  { t: T.pc - 7000, shot: 'wide', look: 'moon', distKm: 9000, dir: wideDir(T.pc - 3000), fov: 40, vehicle: 'csm', blend: 3 },
  { t: T.pc - 400, shot: 'wide', look: 'moon', distKm: 2600, dir: wideDir(T.pc), fov: 46, vehicle: 'csm', blend: 3 },
  { t: T.pc + 600, shot: 'wide', look: 'moon', distKm: 9000, dir: wideDir(T.pc + 7000), fov: 40, vehicle: 'csm', blend: 3 },
  { t: T.tei0 - 200, shot: 'orbit', az: 200, el: 12, dist: 40, lookY: 4, fov: 40, vehicle: 'lm', blend: 3 }, { t: T.tei0 + 120, shot: 'chase', offset: [22, -6, -26], lookY: 3, fov: 46, vehicle: 'lm', blend: 1.5 },
  { t: T.tei1 + 300, shot: 'wide', look: 'earth-moon', distKm: 800000, dir: wideDir(T.tei1 + 200000), fov: 38, vehicle: 'csm', blend: 3 },
  { t: 400000, shot: 'wide', look: 'earth', distKm: 90000, dir: wideDir(400000), fov: 40, vehicle: 'csm', blend: 3 },
  { t: T.smsep - 120, shot: 'orbit', az: 20, el: 8, dist: 36, lookY: 4, fov: 40, vehicle: 'csm', blend: 3 },
  { t: T.smsep + 4, shot: 'chase', offset: [-14, 2, -24], lookY: 4.4, fov: 38, vehicle: 'sm', blend: 1 },
  { t: T.smsep + 150, shot: 'chase', offset: [-24, 1, -42], lookY: 4.4, fov: 36, vehicle: 'sm', blend: 2 },
  { t: T.smsep + 700, shot: 'wide', look: 'earth', distKm: 60000, dir: wideDir(T.smsep + 700), fov: 40, vehicle: 'csm', blend: 3 },
  { t: T.undock - 300, shot: 'orbit', az: 60, el: 15, dist: 44, lookY: 3, fov: 40, vehicle: 'lm', blend: 3 },
  { t: T.undock + 40, shot: 'orbit', az: 130, el: 10, dist: 60, lookY: 3, fov: 40, vehicle: 'lm', blend: 1.5 },
  { t: T.ei - 150, shot: 'chase', offset: [14, -3, 16], lookY: 1.5, fov: 44, vehicle: 'csm', blend: 3 },
  { t: T.ei + 80, shot: 'orbit', az: 160, el: 14, dist: 22, lookY: 1.5, fov: 44, vehicle: 'csm', blend: 2 }, { t: T.drogue - 20, shot: 'orbit', az: 30, el: 10, dist: 150, lookY: 8, fov: 46, vehicle: 'csm', blend: 2 },
  { t: T.main + 50, shot: 'orbit', az: 200, el: 6, dist: 130, lookY: 6, fov: 50, vehicle: 'csm', spin: 0.6, blend: 2 },
];
const caps = [[-9.5, 'ignition'], [0.65, 'liftoff'], [12.6, 'roll'], [164, 'staging'], [201, 'tower'], [330.6, 'pogo'], [593.5, 'siicut'], [T.ins, 'parking'],
  [T.tli0, 'tli'], [T.sep, 'sep'], [T.extr, 'extract'], [T.extr + 700, 'coast'], [T.boom - 70, 'tv'], [T.boom, 'bang'], [T.say1, 'problem'], [T.say2, 'problem2'], [T.boom + 160, 'barber'],
  [T.boom + 6000, 'lifeboat'], [T.mcc2, 'mcc2'], [T.impact, 'impact'], [T.pc - 600, 'farside'], [T.pc, 'closest'], [T.tei0 - 100, 'tei'], [T.tei1 + 300, 'home'], [T.mcc3, 'mcc3'], [T.mcc4, 'mcc4'],
  [T.smsep - 6, 'smsep'], [T.smsep + 60, 'photo'], [T.undock, 'undock'], [T.ei, 'entry'], [T.drogue, 'drogue'], [T.main, 'mains'], [T.splash - 20, 'splash']].sort((x, y) => x[0] - y[0]).map(([t, say]) => ({ t, say }));
const pace = [[-9.5, 12, 1], [12, 130, 8], [130, 164, 4], [164, 205, 3], [205, 325, 20], [325, 337, 1], [337, 585, 25], [585, 600, 2], [600, 760, 12], [760, 9300, 600],
  [9300, 9780, 25], [9780, 11100, 300], [11100, 11300, 20], [11300, 14300, 300], [14300, 14600, 20], [14600, T.boom - 200, 9000], [T.boom - 200, T.boom - 30, 20], [T.boom - 30, T.boom + 150, 1],
  [T.boom + 150, T.boom + 7000, 800], [T.boom + 7000, T.mcc2 - 120, 3000], [T.mcc2 - 120, T.mcc2 + 70, 6], [T.mcc2 + 70, T.pc - 1500, 4500], [T.pc - 1500, T.pc + 1500, 70], [T.pc + 1500, T.tei0 - 150, 1500],
  [T.tei0 - 150, T.tei1 + 100, 14], [T.tei1 + 100, T.smsep - 300, 9000], [T.smsep - 300, T.smsep + 400, 6], [T.smsep + 400, T.undock - 120, 700], [T.undock - 120, T.undock + 60, 8],
  [T.undock + 60, T.ei - 200, 500], [T.ei - 200, T.splash, 8]].map(([from, to, rate]) => ({ from, to, rate }));
let playS = 0; for (const q of pace) playS += (q.to - q.from) / q.rate;
console.log('play time s', playS.toFixed(0));
const moment = {
  format: 1, id: 'apollo-13', words: 'apollo-13', wordsFile: 'en.moments.apollo13.js',
  epoch: '1970-04-11T19:13:00Z', span: [-9.5, T.splash], pace, place,
  places: [{ from: T.ei - 300, place: { name: 'South Pacific Ocean, 21.6 S 165.4 W', lat: SPLASH.lat, lon: SPLASH.lon, alt: 0, ground: { kind: 'sea' } } }],
  trajectories: {
    ascent: { kind: 'profile', truth: 'reconstructed', say: 'pathAscent', pitchStart: 12.6, turnS: 30, azimuth: 72.043, points: ASCENT,
      source: 'Apollo 13 Mission Report (NASA MSC-02680, 1971), Table 3-I and section 13: the event times, the roll to 72.043 degrees at 12.6 s and the early cut-off of the S-II centre engine at 330.6 s; heights and distances between the events are ours' },
    ivb: { kind: 'vectors', truth: 'reconstructed', say: 'pathTrip', frame: 'earth-teme', file: 'paths/apollo-13-ivb.json',
      source: 'parking orbit of 190 by 185 km, translunar injection at 2:35:46 for 5 min 51 s, the CSM separated at 3:06:39 and docked with the lunar module at 3:19:09, the spacecraft ejected at 4:01:01 (Mission Report Table 3-I); two-body arcs fitted by tools/moments-build/apollo13.mjs' },
    csm: { kind: 'vectors', truth: 'reconstructed', say: 'pathTrip', frame: 'earth-teme', file: 'paths/apollo-13-csm.json',
      source: 'Mission Report Table 3-I and Table 4-II: the tank incident 55:54:53, the burn of the lunar module\'s descent engine at 61:29:43, the Moon passed at about 77:28 and 254 km, trans-earth injection at 79:27:39, entry interface at 142:40:46 over 28.2 S 173.4 E, landing at 142:54:41; an integrated path out, with the trim of its injection speed that puts the pericentre where the Report puts it, and a Lambert arc home' },
    lm: { kind: 'vectors', truth: 'reconstructed', say: 'pathLm', frame: 'earth-teme', file: 'paths/apollo-13-lm.json',
      source: 'docked to the command module from 3:19:09 to 141:30:00 (Mission Report Table 3-I); the drift after undocking is illustrative' },
    sm: { kind: 'vectors', truth: 'illustrative', say: 'pathSm', frame: 'earth-teme', file: 'paths/apollo-13-sm.json',
      source: 'the service module was released at 138:01:48 and first seen in the docking window at about 80 feet (Mission Report section 8.9.4); the drift speed is ours' },
  },
  vehicles: [
    { id: 'saturn', model: 'saturn-v', lengthM: 110.6, path: 'ascent', attitude: 'ascent', window: [-9.5, T.ins], parts: sat.parts, engines: { 's-ic': sat.engines['s-ic'], 's-ii': sat.engines['s-ii'], 's-ivb': sat.engines['s-ivb'] },
      flames: { 's-ic': { kind: 'kerolox', exitM: 3.7 }, 's-ii': { kind: 'hydrolox', exitM: 2.9 }, 's-ivb': { kind: 'hydrolox', exitM: 2.0 } } },
    { id: 'ivb', model: 'saturn-v', lengthM: 110.6, path: 'ivb', attitude: 'prograde', window: [T.ins, T.extr + 700], parts: sat.parts, engines: { 's-ivb': sat.engines['s-ivb'] }, flames: { 's-ivb': { kind: 'hydrolox', exitM: 2.0 } } },
    { id: 'csm', model: 'apollo-csm', colour: 'site', lengthM: 11.0, path: 'csm', attitude: 'retrograde', window: [T.extr, T.splash], parts: csmr.parts,
      phases: [{ t: T.pc - 40000, body: 'moon' }, { t: T.tei0 - 1500, attitude: 'prograde' }, { t: T.tei1 + 3000, body: 'earth' }, { t: T.smsep - 600, attitude: 'prograde' }, { t: T.smsep + 1, attitude: 'retrograde' }],
      flames: {}, chutes: { drogue: { diameterM: 5, count: 2, lineM: 7, at: [0, 10.6, 0], colours: ['#f1efe9', '#f1efe9'], spreadDeg: 10 }, main: { diameterM: 25.4, count: 3, lineM: 30, at: [0, 10.6, 0], colours: ['#e2622a', '#f1efe9'], spreadDeg: 12 } },
      plasma: { radiusM: 1.7, at: [0, 6.1, 0] } },
    { id: 'lm', model: 'lunar-module', colour: 'site', lengthM: 7.04, path: 'lm', attitude: 'prograde', window: [T.extr, T.ei + 90], parts: lmr.parts,
      phases: [{ t: T.pc - 40000, body: 'moon' }, { t: T.tei1 + 3000, body: 'earth' }],
      engines: lmr.engines, flames: { 'descent-stage': { kind: 'hypergolic', exitM: 1.5 }, 'ascent-stage': { kind: 'hypergolic', exitM: 0.8 } } },
    { id: 'sm', model: 'apollo-csm', colour: 'site', lengthM: 11.0, path: 'sm', attitude: 'retrograde', window: [T.smsep, T.smsep + 3600], parts: ['command-module', 'service-module', 'sm-bay-foil'], marker: false },
  ],
  tracks: {
    parts,
    camera: cam.sort((a, b) => a.t - b.t),
    captions: caps,
    audio: [{ t: 164.6, sting: 'stage' }, { t: T.say1, src: 'audio/a13-problem-1.m4a', twin: 'audio/a13-problem-1.m4a', gain: 1 }, { t: T.say2, src: 'audio/a13-problem-2.m4a', twin: 'audio/a13-problem-2.m4a', gain: 1 }, { t: T.splash, sting: 'end' }],
    effects: [
      { t: -8.9, effect: 'exhaust-cloud', until: 14, axis: [0, 1, 0], count: 600, fire: 's-ic', vehicle: 'saturn' },
      { t: T.ei + 30, effect: 'plasma', until: T.ei + 420, peak: T.ei + 150, vehicle: 'csm' },
    ],
  },
  chapters: [{ t: -9.5, say: 'chIgnition' }, { t: 0.65, say: 'chLiftoff' }, { t: 164, say: 'chStaging' }, { t: T.ins, say: 'chParking' }, { t: T.tli0 - 30, say: 'chTli' }, { t: T.extr + 700, say: 'chCoast' },
    { t: T.boom - 70, say: 'chBang' }, { t: T.boom + 160, say: 'chLifeboat' }, { t: T.mcc2 - 120, say: 'chReturn' }, { t: T.pc - 1500, say: 'chMoon' }, { t: T.tei0 - 150, say: 'chBurn' },
    { t: T.tei1 + 300, say: 'chHome' }, { t: T.smsep - 300, say: 'chSm' }, { t: T.undock - 120, say: 'chUndock' }, { t: T.ei - 200, say: 'chEntry' }, { t: T.drogue - 20, say: 'chSplash' }],
  sources: [
    { say: 'srcReport', url: 'https://ntrs.nasa.gov/citations/19710003598' },
    { say: 'srcJournal', url: 'https://www.nasa.gov/history/afj/ap13fj/index.html' },
    { say: 'srcClip', url: 'https://commons.wikimedia.org/wiki/File:Houston_problem.ogg' },
    { say: 'srcPhoto', url: 'https://commons.wikimedia.org/wiki/File:Apollo_13_Service_Module_-_AS13-59-8500.jpg' },
  ],
};
writeFileSync(OUT + 'apollo-13.json', JSON.stringify(moment, null, 1).replace(/\n\s+/g, (m) => (m.length > 40 ? m : ' ')) + '\n');
console.log('apollo-13.json written');
