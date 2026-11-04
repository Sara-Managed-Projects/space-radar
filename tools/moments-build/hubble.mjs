// tools/moments-build/hubble.mjs -- Hubble's deployment from Discovery, STS-31, 25 April 1990 (release 1.7.7, internal #1058).
// Writes site/data/moments/hubble-deployment.json and paths/hubble-deployment-{orbit,hst}.json. `node tools/moments-build/hubble.mjs`.
//
// WHAT IS PUBLISHED (and read): lift-off from Launch Complex 39B on 24 April 1990 at 12:33:51 UTC (NASA, STS-31 archive page and the press kit); an orbit
// of about 612 km at 28.45 degrees (NASA: "330 nautical miles", 380 statute miles, the highest a Shuttle went); the telescope taken out of the bay on the
// arm on flight day 2, 25 April, its arrays unrolled and its two high gain antenna booms unfolded; one array stopping part-way, the crew in the airlock at
// 5 psi in case of a spacewalk, the array freed by the ground a few attempts later; the release from the arm at 19:38 UTC on 25 April (3:38 p.m. EDT: Jonathan's
// Space Report no. 36; America Space gives 3:37 p.m.; the plan was a release on the 19th orbit, 1:47 p.m. EDT on the day after a 12 April launch, and the array
// trouble put it one orbit later in the day after); Discovery then pulsed its thrusters twice to raise its orbit a little and drift behind the telescope (America
// Space), the plan being a trail at about 40 nautical miles for the next 45 hours (the press kit).
// OURS, and said so on screen: where over the Earth the shuttle was at any minute (the orbit's size, tilt and plane are the published ones; the place along it
// is chosen so that the unrolling and the release are in sunlight, which the sources do not give); every clock but the release (the grapple, the lift out, the
// arrays' unrolling, the stop, the freeing, the antennas, the swing to the release position, the two thruster pulses and their size); the arm's joint angles
// (the arm moves as a two-link arm reaching the places it must, each joint turned by the least amount); the berth's latches; the way the stowed arrays and
// antenna booms lie. NOT DRAWN: the crew, the cabin, the IMAX camera and the other payloads of the bay, the cable runs, thruster plumes.
import { writeFileSync } from 'node:fs';
import * as L from './lib.mjs';
import { quatAxis, quatColumns, slerp } from '../../site/js/moments/pose.js';
import { siderealAt, attitude, tilt, OMEGA, EARTH_R } from '../../site/js/moments/trajectory.js';
import { worldPositionKm } from '../../site/js/propagate/body.js';
const { sub, add, scale, dot, cross, len, norm, MU, DEG } = L;
const OUT = new URL('../../site/data/moments/', import.meta.url).pathname;
const MODELS = new URL('../../site/models/', import.meta.url).pathname;
const epochMs = Date.parse('1990-04-24T12:33:51Z');
const R = (Date.parse('1990-04-25T19:38:00Z') - epochMs) / 1000;       // the release: 90 249 s after lift-off
const rel = (x) => Math.round((R + x) * 100) / 100;                    // a mission second from a second relative to the release
const r4 = (x) => Math.round(x * 10000) / 10000;
const v4 = (v) => v.map(r4);

// ---- the timeline, seconds from the release (ours, but the release); the orbit's lit windows are found below and these are fitted to them ------------
const T = {
  start: -7900, approach: -7870, grapple: -7680, umbilical: -7550, liftA: -7450, liftB: -7200, mastsOut: -6950, unrollL0: -6920, unrollL1: -6680,
  unrollR0: -6600, jam: -6470, free0: -2060, unrollR1: -1790, hga0: -1620, hga1: -1540, swing0: -1000, swing1: -300, ready: -120, release: 0,
  pull: 5, retract1: 120, burn1: 90, burn2: 420, end: 1500,
};

// ---- the orbit: 613 km circular at 28.45 degrees from the pad's plane, the place along it chosen so the unrolling and the release are lit ---------
const a = EARTH_R + 613e3, inc = 28.45 * DEG, nmot = Math.sqrt(MU / a ** 3);
const padLon = -80.6208 * DEG;                                           // Launch Complex 39B
const alpha0 = siderealAt(epochMs, 0) + padLon;                          // the pad's right ascension at lift-off
let OM = alpha0 - Math.PI / 2 + (-1.5 * 1.08263e-3 * nmot * (6378137 / a) ** 2 * Math.cos(inc)) * R;   // the plane (a due-east launch from 28.45: the pad is at the plane's northmost point), carried to the release by the oblateness
const sunAt = (t) => { const q = worldPositionKm('sun', epochMs + t * 1000, 'earth-inertial'); return norm([q.x, q.y, q.z]); };
const circ = (u, t) => {
  const cO = Math.cos(OM), sO = Math.sin(OM), ci = Math.cos(inc), si = Math.sin(inc), cu = Math.cos(u), su = Math.sin(u);
  const r = [a * (cO * cu - sO * ci * su), a * (sO * cu + cO * ci * su), a * si * su];
  const v = [a * nmot * (-cO * su - sO * ci * cu), a * nmot * (-sO * su + cO * ci * cu), a * nmot * si * cu];
  return { r, v };
};
const lit = (r, s) => dot(r, s) > 0 || len(sub(r, scale(s, dot(r, s)))) > 6378137;
// the argument of latitude at the release that puts the shadow's entry DARK_AT seconds after it
const DARK_AT = 1560;
let u0 = 0, best = 1e9;
for (let k = 0; k < 7200; k += 1) {
  const u = k * Math.PI * 2 / 7200;
  const s = sunAt(R);
  if (!lit(circ(u).r, s)) continue;
  let tIn = null;
  for (let dt = 0; dt < 6000; dt += 10) { const uu = u + nmot * dt; if (!lit(circ(uu).r, sunAt(R + dt))) { tIn = dt; break; } }
  if (tIn !== null && Math.abs(tIn - DARK_AT) < best) { best = Math.abs(tIn - DARK_AT); u0 = u; }
}
const orb0 = circ(u0);
const stateAt = (t) => L.kepler(orb0.r, orb0.v, t - R);                  // before the burns
const litWindows = [];
{ let prev = null, from = null;
  for (let t = R + T.start - 600; t <= R + T.end + 600; t += 10) {
    const s = stateAt(t); const l = lit(s.r, sunAt(t));
    if (l && prev !== true) from = t - R;
    if (!l && prev === true) litWindows.push([from, t - R]);
    prev = l;
  }
  if (prev) litWindows.push([from, T.end + 600]);
}
const earthFix = (r, t) => { const th = Math.atan2(r[1], r[0]) - siderealAt(epochMs, t); return { lat: +(Math.atan2(r[2], Math.hypot(r[0], r[1])) / DEG).toFixed(1), lon: +(((((th / DEG) % 360) + 540) % 360) - 180).toFixed(1) }; };
console.log('sunlit windows (s from the release):', JSON.stringify(litWindows.map(([x, y]) => [Math.round(x), Math.round(y)])), 'over', JSON.stringify(earthFix(orb0.r, R)), 'at the release');

// ---- the models: sizes from the files -------------------------------------------------------------------------------------------------
const bH = L.glbBox(MODELS + 'hubble-sts31.glb'), bO = L.glbBox(MODELS + 'shuttle-orbiter.glb'), bA = L.glbBox(MODELS + 'shuttle-rms.glb');
const H_H = bH.max[1] - bH.min[1], H_O = bO.max[1] - bO.min[1], H_A = bA.max[1] - bA.min[1];
const mH = [0, bH.min[1], 0];                                            // the telescope's file point that is its vehicle's origin (keepXZ: the file's x and z, the lowest y)
const mA = [0, bA.min[1], 0];
console.log('hubble file box', bH.min.map((x) => +x.toFixed(2)), bH.max.map((x) => +x.toFixed(2)), 'orbiter minY', bO.min[1].toFixed(3), 'rms minY', bA.min[1].toFixed(3));
if (Math.abs(bO.min[1]) > 0.01) throw new Error('the orbiter file no longer stands on y = 0: the rides below assume it does');

// ---- the arm: two links reaching the grapple fixture wherever the telescope is --------------------------------------------------------
const P0 = [-2.62, 27.0, -0.80], L1 = 6.0, L2 = 6.8, L3 = 2.4;
const D0 = [0, -1, 0], UPZ = [0, 0, 1];
const GRAPPLE_T = [0.62, -0.5, 1.80];                                    // the end effector's tip, in the telescope's file frame (the probe of the +Z grapple fixture; hubble_sts31.py)
const frameOf = (f) => {                                                  // a link's axes (right, forward, up) from its forward axis; the stowed arm's are the reference
  let u = sub(UPZ, scale(f, dot(UPZ, f)));
  if (len(u) < 0.2) u = sub([1, 0, 0], scale(f, f[0]));
  u = norm(u);
  return [cross(f, u), f, u];
};
const quatOfCols = (c) => {                                               // a unit quaternion from a rotation given as columns
  const m00 = c[0][0], m10 = c[0][1], m20 = c[0][2], m01 = c[1][0], m11 = c[1][1], m21 = c[1][2], m02 = c[2][0], m12 = c[2][1], m22 = c[2][2];
  const tr = m00 + m11 + m22;
  let q;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, s / 4]; }
  else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; q = [s / 4, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]; }
  else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; q = [(m01 + m10) / s, s / 4, (m12 + m21) / s, (m02 - m20) / s]; }
  else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; q = [(m02 + m20) / s, (m12 + m21) / s, s / 4, (m10 - m01) / s]; }
  const n = Math.hypot(...q); return q.map((x) => x / n);
};
const F0 = frameOf(D0);
const linkQuat = (f) => {                                                  // the turn from the stowed link to one pointing along f: Fnew * F0^T
  const Fn = frameOf(f);
  const cols = [0, 1, 2].map((k) => [0, 1, 2].map((r) => Fn[0][r] * F0[0][k] + Fn[1][r] * F0[1][k] + Fn[2][r] * F0[2][k]));
  return quatOfCols(cols);
};
const E0 = add(P0, scale(D0, L1)), W0 = add(P0, scale(D0, L1 + L2));
let worstReach = 0;
/** The arm for the end effector's tip `tip` with its axis `dir` (the way it points, into the fixture): the three links' keyframe values. */
function arm(tip, dir) {
  const W = sub(tip, scale(dir, L3));
  const d = sub(W, P0), dl = len(d);
  worstReach = Math.max(worstReach, dl / (L1 + L2));
  if (dl > (L1 + L2) * 0.995) throw new Error(`the arm cannot reach: ${dl.toFixed(2)} m of ${(L1 + L2).toFixed(2)}`);
  const dh = scale(d, 1 / dl), aa = (L1 * L1 - L2 * L2 + dl * dl) / (2 * dl), hh = Math.sqrt(Math.max(0, L1 * L1 - aa * aa));
  let nrm = sub(UPZ, scale(dh, dot(UPZ, dh)));
  if (len(nrm) < 0.2) nrm = sub([-1, 0, 0], scale(dh, -dh[0]));
  nrm = norm(nrm);
  const E = add(add(P0, scale(dh, aa)), scale(nrm, hh));
  const u1 = norm(sub(E, P0)), u2 = norm(sub(W, E));
  return {
    upper: { quat: linkQuat(u1), pos: [0, 0, 0] },
    lower: { quat: linkQuat(u2), pos: sub(E, E0) },
    wrist: { quat: linkQuat(dir), pos: sub(W, W0) },
  };
}

// ---- the telescope's places: a carrier is its vehicle's origin `at` (the aft end on the axis) and its turn, in the orbiter's axes ----------------------------
const smooth = (u) => u * u * (3 - 2 * u);
const Q_BERTH = quatAxis([0, 0, 1], 180);                                  // X_h -> -X, Y_h -> -Y (the aperture toward the tail), Z_h -> +Z (up out of the bay)
const A_BERTH = [0, 27.0, -1.65];                                           // the aft end 27.0 m from the tail's tip, the axis 1.65 m below the sills
const A_HOLD = [0, 27.0, 2.35];                                             // lifted straight up 4.0 m
const Q_REL = quatOfCols([[0, -1, 0], [0, 0, 1], [-1, 0, 0]]);              // X_h -> -Y, Y_h -> +Z (the telescope stands on its aft end), Z_h -> -X (the fixture faces the arm)
const A_REL = [0, 21.5, 1.8];
const carrier = (A, q) => ({ at: A, quat: q });
const apply = (c, f) => { const Rm = quatColumns(c.quat); const g = sub(f, mH); return add(c.at, add(add(scale(Rm[0], g[0]), scale(Rm[1], g[1])), scale(Rm[2], g[2]))); };
const zOf = (c) => quatColumns(c.quat)[2];
const tipOf = (c) => apply(c, GRAPPLE_T);
const mix = (c0, c1, u) => ({ at: [0, 1, 2].map((k) => c0.at[k] + (c1.at[k] - c0.at[k]) * u), quat: slerp(c0.quat, c1.quat, u) });
const C_BERTH = carrier(A_BERTH, Q_BERTH), C_HOLD = carrier(A_HOLD, Q_BERTH), C_REL = carrier(A_REL, Q_REL);

// ---- keyframes -----------------------------------------------------------------------------------------------------------------------------------
const carrierKeys = [], armKeys = { upper: [], lower: [], wrist: [] };
const putArm = (t, tip, dir) => { const k = arm(tip, dir); for (const n of ['upper', 'lower', 'wrist']) armKeys[n].push({ t: rel(t), quat: k[n].quat.map(r4), pos: v4(k[n].pos) }); };
const putCarrier = (t, c) => carrierKeys.push({ t: rel(t), at: v4(c.at), quat: c.quat.map(r4) });
const STEP = 6;
// the pre-grapple hover: the end effector 1.6 m over the probe, then down onto it
const hover = (c) => add(tipOf(c), scale(zOf(c), 1.6));
putCarrier(T.start, C_BERTH); putArm(T.start, hover(C_BERTH), scale(zOf(C_BERTH), -1));
for (let t = T.approach; t < T.grapple; t += STEP) { const s = smooth((t - T.approach) / (T.grapple - T.approach)); const tip = add(hover(C_BERTH), scale(zOf(C_BERTH), -1.6 * s)); putCarrier(t, C_BERTH); putArm(t, tip, scale(zOf(C_BERTH), -1)); }
putCarrier(T.grapple, C_BERTH); putArm(T.grapple, tipOf(C_BERTH), scale(zOf(C_BERTH), -1));
putCarrier(T.liftA, C_BERTH); putArm(T.liftA, tipOf(C_BERTH), scale(zOf(C_BERTH), -1));
for (let t = T.liftA + STEP; t < T.liftB; t += STEP) { const c = mix(C_BERTH, C_HOLD, smooth((t - T.liftA) / (T.liftB - T.liftA))); putCarrier(t, c); putArm(t, tipOf(c), scale(zOf(c), -1)); }
putCarrier(T.liftB, C_HOLD); putArm(T.liftB, tipOf(C_HOLD), scale(zOf(C_HOLD), -1));
putCarrier(T.swing0, C_HOLD); putArm(T.swing0, tipOf(C_HOLD), scale(zOf(C_HOLD), -1));
for (let t = T.swing0 + STEP * 2; t < T.swing1; t += STEP * 2) { const c = mix(C_HOLD, C_REL, smooth((t - T.swing0) / (T.swing1 - T.swing0))); putCarrier(t, c); putArm(t, tipOf(c), scale(zOf(c), -1)); }
putCarrier(T.swing1, C_REL); putArm(T.swing1, tipOf(C_REL), scale(zOf(C_REL), -1));
putCarrier(T.release, C_REL); putArm(T.release, tipOf(C_REL), scale(zOf(C_REL), -1));
// after the release the end effector draws back 3 m, away from the probe and toward the shoulder, and stays
const pullDir = norm(add(scale(zOf(C_REL), 0.6), [0, 0.8, 0]));
for (let t = T.pull; t <= T.retract1; t += 10) { const s = smooth((t - T.pull) / (T.retract1 - T.pull)); putArm(t, add(tipOf(C_REL), scale(pullDir, 3 * s)), scale(zOf(C_REL), -1)); }
putArm(T.end, add(tipOf(C_REL), scale(pullDir, 3)), scale(zOf(C_REL), -1));
console.log('the arm reaches at most', (worstReach * 100).toFixed(0), 'percent of its length; carrier keys', carrierKeys.length, 'arm keys', armKeys.upper.length);

// ---- the arrays and the antenna booms: stowed along the tube, folded out and unrolled -----------------------------------------------------------
const SA = [1.57, -0.85, 0], HG = -0.75, R_T = 1.55;
const vh = (p) => [p[0] - mH[0], p[1] - mH[1], p[2] - mH[2]];              // a file point in the vehicle's frame
const partEv = (t, part, vehicle, pose) => ({ t: rel(t), part, action: 'pose', vehicle, ...pose });
const hst = [];
const IDQ = [0, 0, 0, 1];
const stowM = (s) => ({ about: v4(vh([s * SA[0], SA[1], 0])), quat: quatAxis([0, 0, 1], s * 90).map(r4), pos: [s * 0.3, 0, 0], scale: [1, 1, 1] });
const openM = (s) => ({ about: v4(vh([s * SA[0], SA[1], 0])), quat: IDQ, pos: [0, 0, 0], scale: [1, 1, 1] });
const stowA = (s) => ({ ...stowM(s), scale: [1, 0.05, 1] });
const openA = (s) => ({ ...openM(s), scale: [1, 1, 1] });
const hgaAbout = (s) => vh([0, HG, s * R_T]);
const stowH = (s) => ({ about: v4(hgaAbout(s)), quat: quatAxis([1, 0, 0], -s * 90).map(r4), pos: [0, 0, s * 0.3], scale: [1, 1, 1] });
const openH = (s) => ({ about: v4(hgaAbout(s)), quat: IDQ, pos: [0, 0, 0], scale: [1, 1, 1] });
const side = { l: -1, r: 1 };
const V_B = 'hubble-berthed';
for (const k of ['l', 'r']) {
  const s = side[k];
  hst.push(partEv(T.start, `mast-${k}`, V_B, stowM(s)), partEv(T.start, `array-${k}`, V_B, stowA(s)), partEv(T.start, `hga-${k}`, V_B, stowH(s)));
}
// the masts swing out, both together
for (const k of ['l', 'r']) hst.push(partEv(T.mastsOut, `mast-${k}`, V_B, stowM(side[k])), partEv(T.unrollL0, `mast-${k}`, V_B, { ...openM(side[k]), ease: 'smooth' }), partEv(T.unrollL0, `array-${k}`, V_B, stowA(side[k])));
// the first array (port) unrolls in one go; the second starts, stops 38 percent out, waits, and then comes out whole
hst.push(partEv(T.unrollL1, 'array-l', V_B, { ...openA(-1), ease: 'smooth' }));
hst.push(partEv(T.unrollR0, 'array-r', V_B, stowA(1)), partEv(T.jam, 'array-r', V_B, { ...stowA(1), scale: [1, 0.38, 1], ease: 'smooth' }), partEv(T.free0, 'array-r', V_B, { ...stowA(1), scale: [1, 0.38, 1] }), partEv(T.unrollR1, 'array-r', V_B, { ...openA(1), ease: 'smooth' }));
for (const k of ['l', 'r']) hst.push(partEv(T.hga0, `hga-${k}`, V_B, stowH(side[k])), partEv(T.hga1, `hga-${k}`, V_B, { ...openH(side[k]), ease: 'smooth' }));
hst.sort((x, y) => x.t - y.t);

// ---- the paths: Discovery's orbit with its two pulses, the telescope's from the release ---------------------------------------------------------------
const orbiterBasis = (st) => {
  const velRel = [st.v[0] + OMEGA * st.r[1], st.v[1] - OMEGA * st.r[0], st.v[2]];
  return tilt(attitude('prograde', { up: norm(st.r), vel: velRel, ref: norm(cross(st.r, velRel)), t: 0 }), 0, ROLL);
};
const ROLL = -90;                                                          // the bay faces away from the Earth
const dvAlong = (st, dv) => ({ r: st.r, v: add(st.v, scale(norm(st.v), dv)) });
const tB1 = R + T.burn1, tB2 = R + T.burn2, BURN_S = 6, DV = 0.5;
const sB1 = stateAt(tB1), sB1a = dvAlong(sB1, DV), sB1e = L.kepler(sB1a.r, sB1a.v, BURN_S);
const afterB1 = (t) => L.kepler(sB1e.r, sB1e.v, t - (tB1 + BURN_S));
const sB2 = afterB1(tB2), sB2a = dvAlong(sB2, DV), sB2e = L.kepler(sB2a.r, sB2a.v, BURN_S);
const afterB2 = (t) => L.kepler(sB2e.r, sB2e.v, t - (tB2 + BURN_S));
const tEnd = R + T.end, tStart = R + T.start;
const segsOrb = [
  { from: tStart, to: tB1, at: stateAt, step: () => 60 },
  { from: tB1, to: tB1 + BURN_S, at: (t) => L.hermite(sB1, sB1e, tB1, tB1 + BURN_S, t), step: () => 3 },
  { from: tB1 + BURN_S, to: tB2, at: afterB1, step: () => 30 },
  { from: tB2, to: tB2 + BURN_S, at: (t) => L.hermite(sB2, sB2e, tB2, tB2 + BURN_S, t), step: () => 3 },
  { from: tB2 + BURN_S, to: tEnd, at: afterB2, step: () => 30 },
];
L.save(OUT + 'paths/hubble-deployment-orbit.json', L.rowsOf(segsOrb), 'Discovery on STS-31, 8 700 s before the release of the Hubble to 1 500 s after it: a circular 613 km orbit at 28.45 degrees (the published size and tilt; the place along it is ours), two small thruster pulses at +90 s and +420 s after the release; tools/moments-build/hubble.mjs. Earth-inertial (TEME) km and km/s.');
// the telescope leaves from where the end effector held it: the carrier's origin at the release, in the orbiter's axes at that second
const sRel = stateAt(R), BR = orbiterBasis(sRel);
const fromB = (B, v) => add(add(scale(B[0], v[0]), scale(B[1], v[1])), scale(B[2], v[2]));
const rH = add(sRel.r, fromB(BR, A_REL)), vH = sRel.v;
const hstAt = (t) => L.kepler(rH, vH, t - R);
L.save(OUT + 'paths/hubble-deployment-hst.json', L.rowsOf([{ from: R, to: tEnd, at: hstAt, step: () => 30 }]), 'The Hubble Space Telescope from its release (19:38 UTC, 25 April 1990) to 1 500 s later: the orbit it was released in, a circle of 613 km at 28.45 degrees, from where the arm held it; tools/moments-build/hubble.mjs. Earth-inertial (TEME) km and km/s.');
const sep = (t) => len(sub(afterB2 ? (t < tB1 ? stateAt(t).r : t < tB2 + BURN_S ? afterB1(t).r : afterB2(t).r) : [0, 0, 0], hstAt(t).r));
console.log('Discovery to the telescope at +60, +300, +600, +1000, +1500 s:', [60, 300, 600, 1000, 1500].map((x) => Math.round(sep(R + x)) + ' m').join(', '));

// ---- the moment --------------------------------------------------------------------------------------------------------------------------------------
const place = { name: 'Low Earth orbit, 613 km up, 28.45 degrees from the equator', lat: 28.6, lon: -80.6, alt: 0, azimuth: 90, ground: { kind: 'sea' } };
const ORB_PARTS = ['orbiter-body', 'bay-door-l', 'bay-door-r', 'bay-door-l-open', 'bay-door-r-open', 'gear-nose', 'gear-main-l', 'gear-main-r', 'bay-open-detail', 'dfi-pallet'];
const hidden = ['bay-door-l', 'bay-door-r', 'gear-nose', 'gear-main-l', 'gear-main-r', 'dfi-pallet'];
const parts = [...hidden.map((p) => ({ t: rel(T.start), part: p, action: 'hide', vehicle: 'discovery' }))];
const poseEv = (name, list, vehicle) => list.map((k) => ({ t: k.t, part: name, action: 'pose', vehicle, about: v4(sub(name === 'rms-upper' ? P0 : name === 'rms-lower' ? E0 : W0, mA)), quat: k.quat, pos: k.pos }));
parts.push(...poseEv('rms-upper', armKeys.upper, 'rms'), ...poseEv('rms-lower', armKeys.lower, 'rms'), ...poseEv('rms-wrist', armKeys.wrist, 'rms'), ...hst);
parts.sort((x, y) => x.t - y.t);
const paceList = [
  [T.start, T.approach, 4], [T.approach, T.grapple, 7], [T.grapple, T.liftA - 30, 90], [T.liftA - 30, T.liftB + 20, 8], [T.liftB + 20, T.mastsOut - 40, 220],
  [T.mastsOut - 40, T.unrollL1 + 20, 8], [T.unrollL1 + 20, T.unrollR0 - 10, 12], [T.unrollR0 - 10, T.jam + 25, 6], [T.jam + 25, -4300, 300], [-4300, T.free0 - 30, 600], [T.free0 - 30, T.unrollR1 + 20, 9],
  [T.unrollR1 + 20, T.hga0 - 20, 60], [T.hga0 - 20, T.hga1 + 20, 6], [T.hga1 + 20, T.swing0 - 20, 90], [T.swing0 - 20, T.swing1 + 20, 13], [T.swing1 + 20, T.release - 25, 14],
  [T.release - 25, T.pull + 15, 1.2], [T.pull + 15, T.burn1 - 5, 6], [T.burn1 - 5, T.burn1 + 20, 2], [T.burn1 + 20, T.end, 40],
].map(([from, to, rate]) => ({ from: rel(from), to: rel(to), rate }));
paceList.forEach((q, i) => { if (i && q.from !== paceList[i - 1].to) console.log('PACE GAP', paceList[i - 1].to, q.from); });
let play = 0; for (const q of paceList) play += (q.to - q.from) / q.rate;
console.log('play time s', play.toFixed(0));

const cam = (t, shot) => ({ t: rel(t), ...shot });
const moment = {
  format: 1, id: 'hubble-deployment', words: 'hubble-deployment', wordsFile: 'en.moments.hubble.js',
  epoch: '1990-04-24T12:33:51Z', span: [rel(T.start), rel(T.end)], pace: paceList, place,
  trajectories: {
    orbit: { kind: 'vectors', truth: 'illustrative', say: 'pathOrbit', frame: 'earth-teme', file: 'paths/hubble-deployment-orbit.json',
      source: 'the published orbit (about 612 km at 28.45 degrees, NASA\'s STS-31 pages and press kit) drawn as a circle; where over the Earth the shuttle is at each minute, the clocks of everything before the release, and the two thruster pulses are ours' },
    hst: { kind: 'vectors', truth: 'illustrative', say: 'pathHst', frame: 'earth-teme', file: 'paths/hubble-deployment-hst.json',
      source: 'the release at 19:38 UTC on 25 April 1990 (Jonathan\'s Space Report no. 36; America Space says 3:37 p.m. EDT) from the arm into the same orbit; where it was over the Earth is ours' },
  },
  vehicles: [
    { id: 'discovery', model: 'shuttle-orbiter', lengthM: +H_O.toFixed(4), keepXZ: true, path: 'orbit', attitude: 'prograde', window: [rel(T.start), rel(T.end)], colour: 'station', parts: ORB_PARTS,
      phases: [{ t: rel(T.start), rollDeg: ROLL, pitchDeg: 0 }] },
    { id: 'rms', model: 'shuttle-rms', lengthM: +H_A.toFixed(4), keepXZ: true, rideOn: { vehicle: 'discovery', at: v4(mA) }, window: [rel(T.start), rel(T.end)], colour: 'station', parts: ['rms-upper', 'rms-lower', 'rms-wrist'], marker: false },
    { id: V_B, model: 'hubble-sts31', lengthM: +H_H.toFixed(4), keepXZ: true, rideOn: { vehicle: 'discovery', at: A_BERTH, keys: carrierKeys.map((k) => ({ ...k, at: v4(sub(k.at, [0, 0, 0])) })) }, window: [rel(T.start), rel(T.release)], colour: 'station',
      parts: ['mast-l', 'mast-r', 'array-l', 'array-r', 'hga-l', 'hga-r'], marker: false },
    { id: 'hubble', model: 'hubble-sts31', lengthM: +H_H.toFixed(4), keepXZ: true, path: 'hst', attitude: 'prograde', window: [rel(T.release), rel(T.end)], colour: 'station',
      phases: [{ t: rel(T.release), pitchDeg: 90, rollDeg: 0 }] },
  ],
  tracks: {
    parts,
    camera: [
      cam(T.start, { shot: 'chase', offset: [-9, 36, 11], lookAt: [-1, 21, -0.4], fov: 40, vehicle: 'discovery' }),
      cam(T.grapple - 40, { shot: 'chase', offset: [-6, 26, 6], lookAt: [-0.6, 20.3, 0.4], fov: 36, vehicle: 'discovery', blend: 2 }),
      cam(T.liftA, { shot: 'chase', offset: [-17, 31, 4], lookAt: [0, 21, 1.5], fov: 44, vehicle: 'discovery', blend: 2 }),
      cam(T.liftB + 40, { shot: 'chase', offset: [-24, 12, 9], lookAt: [0, 21, 1.5], fov: 46, vehicle: 'discovery', blend: 2.5 }),
      cam(T.mastsOut - 20, { shot: 'chase', offset: [-15, 31, 19], lookAt: [0, 21, 3], fov: 46, vehicle: 'discovery', blend: 3 }),
      cam(T.unrollL0 + 40, { shot: 'chase', offset: [9, 32, 24], lookAt: [0, 21, 3], fov: 48, vehicle: 'discovery', blend: 2 }),
      cam(T.unrollR0 - 10, { shot: 'chase', offset: [-14, 10, 24], lookAt: [0, 21, 3], fov: 48, vehicle: 'discovery', blend: 2 }),
      cam(T.jam + 15, { shot: 'chase', offset: [-17, 26, 10], lookAt: [-3.5, 21.5, 2.5], fov: 42, vehicle: 'discovery', blend: 3 }),
      cam(-4300, { shot: 'globe', altKm: 2600, backKm: 1700, fov: 46, vehicle: V_B, blend: 3 }),
      cam(T.free0 - 60, { shot: 'chase', offset: [-17, 26, 10], lookAt: [-3.5, 21.5, 2.5], fov: 42, vehicle: 'discovery', blend: 3 }),
      cam(T.unrollR1 + 30, { shot: 'chase', offset: [-13, 33, 22], lookAt: [-1, 21, 3], fov: 48, vehicle: 'discovery', blend: 2.5 }),
      cam(T.hga0 - 10, { shot: 'chase', offset: [-13, 36, 9], lookAt: [0, 21, 4.5], fov: 50, vehicle: 'discovery', blend: 2.5 }),
      cam(T.swing0 + 20, { shot: 'chase', offset: [-30, 8, 18], lookAt: [0, 21, 5], fov: 48, vehicle: 'discovery', blend: 3 }),
      cam(T.swing1 - 80, { shot: 'chase', offset: [-26, 2, 10], lookAt: [-1, 21, 8], fov: 48, vehicle: 'discovery', blend: 3 }),
      cam(T.release - 20, { shot: 'orbit', az: 80, el: 8, dist: 38, lookY: 6, fov: 44, vehicle: V_B, blend: 2 }),
      cam(T.release + 8, { shot: 'orbit', az: 80, el: 8, dist: 44, lookY: 6, fov: 44, vehicle: 'hubble', blend: 0.01 }),
      cam(T.retract1 + 20, { shot: 'orbit', az: 160, el: 20, dist: 160, lookY: 6, fov: 40, vehicle: 'hubble', blend: 3 }),
      cam(T.burn2 + 40, { shot: 'orbit', az: 200, el: 14, dist: 300, lookY: 6, fov: 40, vehicle: 'hubble', blend: 3 }),
      cam(T.end - 350, { shot: 'wide', distKm: 4, dir: [0, 0.4, 1], look: 'vehicle', fov: 44, vehicle: 'hubble', blend: 3 }),
    ].map((c) => ({ ...c, t: c.t })),
    captions: [
      { t: rel(T.start), say: 'ready' }, { t: rel(T.grapple - 30), say: 'grapple' }, { t: rel(T.umbilical), say: 'umbilical' }, { t: rel(T.liftA + 20), say: 'unberth' },
      { t: rel(T.mastsOut - 25), say: 'arrays' }, { t: rel(T.unrollL0 + 20), say: 'unroll' }, { t: rel(T.jam - 30), say: 'stop' }, { t: rel(T.jam + 60), say: 'wait' },
      { t: rel(T.free0), say: 'free' }, { t: rel(T.hga0 - 10), say: 'antennas' }, { t: rel(T.swing0 + 10), say: 'swing' }, { t: rel(T.ready), say: 'readyRelease' },
      { t: rel(T.release - 3), say: 'release' }, { t: rel(T.release + 20), say: 'away' }, { t: rel(T.burn1), say: 'pulses' }, { t: rel(T.burn2 + 120), say: 'trail' },
    ],
    audio: [],
    effects: [],
  },
  chapters: [{ t: rel(T.start), say: 'chBay' }, { t: rel(T.liftA - 30), say: 'chLift' }, { t: rel(T.mastsOut - 25), say: 'chArrays' }, { t: rel(T.jam - 30), say: 'chStop' }, { t: rel(T.hga0 - 10), say: 'chAntennas' }, { t: rel(T.swing0 + 10), say: 'chSwing' },
    { t: rel(T.release - 25), say: 'chRelease' }, { t: rel(T.retract1 + 10), say: 'chAway' }],
  sources: [
    { say: 'srcNasa', url: 'https://www.nasa.gov/mission_pages/shuttle/shuttlemissions/archives/sts-31.html' },
    { say: 'srcKit', url: 'https://science.nasa.gov/wp-content/uploads/2023/06/sts-031r-press-kit.pdf' },
    { say: 'srcJsr', url: 'https://www.planet4589.org/space/jsr/back/news.36.txt' },
    { say: 'srcAmerica', url: 'https://www.americaspace.com/2020/04/25/somebody-get-a-camera-remembering-the-deployment-of-hubble-otd-in-1990/' },
  ],
  audio_note: 'No radio recording plays. NASA\'s STS-31 air-to-ground audio was not found as a clearly licensed, labelled file (3 November 2026); the words are captions.',
};
writeFileSync(OUT + 'hubble-deployment.json', JSON.stringify(moment, null, 1).replace(/\n\s+/g, (m) => (m.length > 40 ? m : ' ')) + '\n');
console.log('hubble-deployment.json written; the release is at mission second', R, ', the span', moment.span);
