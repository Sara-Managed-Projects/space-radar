// tools/moments-build/sts1.mjs -- STS-1, 12 to 14 April 1981 (release 1.7.2, internal #1058).
// Writes site/data/moments/sts-1.json and paths/sts-1-orbit.json. `node tools/moments-build/sts1.mjs`.
//
// WHAT IS FLOWN, from the published accounts (Wikipedia "STS-1", read 3 November 2026, from NASA's mission documents): lift-off from Launch
// Complex 39A at 12:00:04 UTC on 12 April 1981; the three main engines throttled to 65 percent through Max Q at 56 s (Mach 1.06); the
// boosters, better than expected, burnt out and were jettisoned at 2 min 12 s at 53 km; main engine cut-off at 8 min 34 s at 118 km; the
// external tank let go 18 s later; OMS burns at 10 min 34 s (86 s) and 44 min 2 s (75 s) to a 246 by 248 km orbit at 40.30 degrees; OMS-3 at
// 6:20:46 and OMS-4 at 7:05:32 raised it to 274 km; a 160 s deorbit burn in the 36th orbit over the southern Indian Ocean; entry interface
// over the eastern Pacific 8 110 km from the field at 28 240 km/h; 21 minutes of blackout; roll reversals at Mach 18.5 and 9.8, the California
// coast crossed near Big Sur at Mach 7 and 41 km, Mach 4.8 and 2.8 reversals, a wide left turn onto the lakebed runway 23 at Edwards, main
// gear down at 339 km/h at 18:20:57 UTC (54 h 20 m 53 s after lift-off), 800 m further down the runway than planned. ILLUSTRATIVE or ours:
// the heights and distances between the events of the ascent; the clock of the OMS-2 burn's apogee, the bay doors' opening and closing;
// the deorbit burn's clock and place (about 55 minutes before the field); the entry's heights and distances between the published
// Mach numbers, the heading-alignment circle's size and the gear's lowering; the boosters' and tank's tumbling. NOT DRAWN: the OMS
// plumes (nearly invisible in the sun), the reaction control jets, the roll to heads-down (the stack is drawn at the azimuth, heads down
// as flown), Young and Crippen.
import { writeFileSync } from 'node:fs';
import * as L from './lib.mjs';
import { monotoneCubic } from '../../site/js/moments/format.js';
import { siderealAt } from '../../site/js/moments/trajectory.js';
const { cross, sub, add, scale, len, dot, MU, EARTH_R, DEG } = L;
const OUT = new URL('../../site/data/moments/', import.meta.url).pathname;
const MODELS = new URL('../../site/models/', import.meta.url).pathname;
const epochMs = Date.parse('1981-04-12T12:00:04Z');
const rad = (x) => x * DEG;
const place = { name: 'Launch Complex 39A', lat: 28.60825, lon: -80.60412, alt: 0, azimuth: 67, ground: { kind: 'coast', shoreBearing: 340, shoreM: 800, pad: true } };
const frame = L.placeFrame(place);

// --- the published clock (mission seconds from lift-off)
const T_MAXQ = 56, T_SRB = 132, T_MECO = 514, T_ET = 532, T_OMS1 = 634, T_OMS1_S = 86, T_OMS2_S = 75, T_OMS3 = 6 * 3600 + 20 * 60 + 46, T_OMS4 = 7 * 3600 + 5 * 60 + 32;
const T_LAND = 54 * 3600 + 20 * 60 + 53;
let T_EI = T_LAND - 1800; const T_DEORBIT_S = 160, T_DOORS_OPEN = 5400, T_START = 534;
const T_END = T_LAND + 85;

// --- the ascent: a profile (t s, altitude km, downrange km); the events are published, the numbers between them approximate
const el = (s) => { const r = len(s.r), v = len(s.v), a = 1 / (2 / r - v * v / MU), h = cross(s.r, s.v), e = Math.sqrt(Math.max(0, 1 - len(h) ** 2 / (MU * a))); return { perigeeKm: +((a * (1 - e) - EARTH_R) / 1e3).toFixed(1), apogeeKm: +((a * (1 + e) - EARTH_R) / 1e3).toFixed(1), incl: +(Math.acos(h[2] / len(h)) / DEG).toFixed(2), periodMin: +(2 * Math.PI * Math.sqrt(a ** 3 / MU) / 60).toFixed(2), alt: +((r - EARTH_R) / 1e3).toFixed(1) }; };
const ascentPts = (R) => [[-10, 0, 0], [0.4, 0, 0], [7, 0.12, 0], [20, 1.8, 0.3], [40, 7, 2.5], [56, 12.5, 6.5], [80, 25, 21], [110, 43, 50], [132, 53, 72], [180, 78, 150], [240, 98, 330], [300, 108, 560], [380, 114, 1000], [450, 117, 1480], [T_MECO, 118, 1900], [T_START, 118.6, R]];
// the azimuth that gives the published 40.30 degrees (the ground heading, 067 in the report), and the last downrange that makes MECO's speed right (apogee near 160 km)
const build = (az, R) => { const pts = ascentPts(R); const tr = L.profileTrack({ points: pts, azimuth: az }, place); return { pts, tr, s: L.profileInertial(epochMs, tr, frame, T_START) }; };
let azLo = 55, azHi = 80;
for (let i = 0; i < 40; i += 1) { const mid = (azLo + azHi) / 2; (el(build(mid, 2000).s).incl > 40.3 ? (azLo = mid) : (azHi = mid)); }
const AZ = +((azLo + azHi) / 2).toFixed(2);
let lo = 1800, hi = 2300;
for (let i = 0; i < 60; i += 1) { const mid = (lo + hi) / 2; (el(build(AZ, mid).s).apogeeKm < 160 ? (lo = mid) : (hi = mid)); }
const asc = build(AZ, (lo + hi) / 2);
const ASCENT = asc.pts.map((p) => [p[0], p[1], Math.round(p[2] * 10) / 10]);
const track = L.profileTrack({ points: ASCENT, azimuth: AZ }, place);
const s0 = L.profileInertial(epochMs, track, frame, T_START);
console.log('azimuth', AZ, 'orbit after the tank is let go', el(s0), 'speed', len(s0.v).toFixed(0));
place.azimuth = AZ;

// --- the orbit: coast, OMS-1 to an apogee of 247 km, OMS-2 there to a circle, a day and more of circles with the oblateness's drift, OMS-3 and OMS-4 up to 274 km
const vcirc = (r) => Math.sqrt(MU / r);
const vForApo = (r, apoR) => Math.sqrt(MU * (2 / r - 2 / (r + apoR)));
const withSpeed = (s, v) => ({ r: s.r, v: scale(s.v, v / len(s.v)) });
const preOms1 = L.kepler(s0.r, s0.v, T_OMS1 - T_START);
const after1 = (() => { let lo2 = 1, hi2 = 1.2; for (let i = 0; i < 60; i += 1) { const mid = (lo2 + hi2) / 2; const s = { r: preOms1.r, v: scale(preOms1.v, mid) }; (el(s).apogeeKm < 247 ? (lo2 = mid) : (hi2 = mid)); } return { r: preOms1.r, v: scale(preOms1.v, (lo2 + hi2) / 2) }; })();
const burn1End = L.kepler(after1.r, after1.v, T_OMS1_S);
console.log('after OMS-1', el(after1), 'dv m/s', (len(after1.v) - len(preOms1.v)).toFixed(0));
// the apogee: the second when the climb stops
let tApo = T_OMS1 + 600, prevRr = -1;
for (let t = T_OMS1 + 120; t < T_OMS1 + 6000; t += 1) { const s = L.kepler(after1.r, after1.v, t - T_OMS1); const rr = dot(s.r, s.v); if (prevRr > 0 && rr <= 0) { tApo = t; break; } prevRr = rr; }
const T_OMS2 = Math.round(tApo);               // the burn is drawn from the apogee, where the circle is made
const preOms2 = L.kepler(after1.r, after1.v, T_OMS2 - T_OMS1);
const after2 = withSpeed(preOms2, vcirc(len(preOms2.r)));
const burn2End = L.kepler(after2.r, after2.v, T_OMS2_S);
console.log('OMS-2 at', T_OMS2, 's, apogee', el(preOms2), '-> circle', el(after2));
// physical orbit P(tau): the pieces
const pieceA = (tau) => L.j2Kepler(after2.r, after2.v, tau - T_OMS2);
const post3Base = pieceA(T_OMS3);
const after3 = withSpeed(post3Base, vForApo(len(post3Base.r), EARTH_R + 274e3));
const pieceB = (tau) => L.j2Kepler(after3.r, after3.v, tau - T_OMS3);
const pre4 = pieceB(T_OMS4);
const after4 = withSpeed(pre4, vcirc(len(pre4.r)));
console.log('OMS-3 up to', el(after3), 'OMS-4 circle', el(after4));
const physical = (tau) => (tau < T_OMS3 ? pieceA(tau) : tau < T_OMS4 ? pieceB(tau) : L.j2Kepler(after4.r, after4.v, tau - T_OMS4));
// the warp: the node turned and the clock moved, a little, evenly from OMS-2 to the field, as the reconstruction's own error (found below, printed)
let DNODE = 0, DTIME = 0;
const SPAN = T_LAND - T_OMS2;
const rotZ = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a), v[2]];
const orbitAt = (t) => {
  if (t < T_OMS2 + T_OMS2_S) return null;
  const f = 1 + DTIME / SPAN, tau = T_OMS2 + (t - T_OMS2) * f;
  const k = physical(tau);
  const a = DNODE * DEG * (t - T_OMS2) / SPAN, w = DNODE * DEG / SPAN;
  const r = rotZ(k.r, a), v = rotZ(scale(k.v, f), a);
  return { r, v: [v[0] - w * r[1], v[1] + w * r[0], v[2]] };
};

// --- the field: Edwards, the lakebed runway 23; the entry point 8 110 km up the track; the deorbit burn where the way to it costs least
const EDW = { lat: 34.9, lon: -117.88 };   // the touchdown point on Rogers Dry Lake (ours, to about 1 km: the runway is 23, its threshold is not looked up)
const RWY = 230;
const geoOf = (r, t) => { const th = Math.atan2(r[1], r[0]) - siderealAt(epochMs, t); return { lat: +(Math.asin(r[2] / len(r)) / DEG).toFixed(2), lon: +(((((th / DEG) % 360) + 540) % 360) - 180).toFixed(2) }; };
const bearingOf = (a, b) => { const p1 = rad(a.lat), p2 = rad(b.lat), dl = rad(b.lon - a.lon); return (Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) / DEG + 360) % 360; };
const arcKm = (a, b) => 6371.0088 * Math.acos(Math.min(1, Math.sin(rad(a.lat)) * Math.sin(rad(b.lat)) + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon))));
// The deorbit burn is found where the entry it gives meets the report: entry interface (120 km) about 8 110 km and 30 minutes from the field, Edwards within the
// 583 km of cross range the orbiter flew. The burn is impulsive here (the real one was 160 s), a retro push to a perigee of 30 km.
const retroTo = (s, periKm) => { let a = 0.9, b = 1; for (let i = 0; i < 40; i += 1) { const m = (a + b) / 2; (el({ r: s.r, v: scale(s.v, m) }).perigeeKm > periKm ? (b = m) : (a = m)); } return { r: s.r, v: scale(s.v, (a + b) / 2) }; };
let best = null;
for (let dn = -12; dn <= 12.001; dn += 1.5) for (let dt = -2700; dt <= 2700; dt += 90) {
  DNODE = dn; DTIME = dt;
  for (let tr0 = T_LAND - 4200; tr0 <= T_LAND - 1900; tr0 += 30) {
    const a = orbitAt(tr0), post = retroTo(a, 30);
    let ei = null;
    for (let t = tr0 + 200; t < tr0 + 3200; t += 5) { const k = L.kepler(post.r, post.v, t - tr0); if (len(k.r) - EARTH_R < 120e3) { ei = { t, k }; break; } }
    if (!ei) continue;
    const g = geoOf(ei.k.r, ei.t), dEdw = arcKm(g, EDW);
    const vFixed = [ei.k.v[0] + 7.2921159e-5 * ei.k.r[1], ei.k.v[1] - 7.2921159e-5 * ei.k.r[0], ei.k.v[2]];
    const ahead = geoOf(add(ei.k.r, scale(vFixed, 30)), ei.t), th = rad(bearingOf(g, ahead)), th13 = rad(bearingOf(g, EDW));
    if (Math.cos(th13 - th) < 0.7) continue;   // the track must lead to the field, not away from it
    const cross13 = Math.abs(Math.asin(Math.sin(dEdw / 6371.0088) * Math.sin(th13 - th))) * 6371.0088;
    const cost = Math.abs(T_LAND - ei.t - 1800) / 20 + Math.abs(dEdw - 8110) / 60 + Math.max(0, cross13 - 550) / 30 + Math.abs(dn) * 0.1;
    if (!best || cost < best.cost) best = { tr0, cost, a, post, ei, g, dEdw, cross13, dn, dt };
  }
}
DNODE = best.dn; DTIME = best.dt;
const T_DEORBIT = best.tr0, T_DEORBIT_END = T_DEORBIT + T_DEORBIT_S;
const EI = best.g, T_EI0 = best.ei.t;
T_EI = T_EI0;
console.log('node turned a further', DNODE, 'degrees and the clock moved', DTIME, 's; the deorbit burn at', T_DEORBIT, 's (', new Date(epochMs + T_DEORBIT * 1000).toISOString(), ') over', geoOf(best.a.r, T_DEORBIT), '; entry interface', EI, 'at', T_EI0, 's:', best.dEdw.toFixed(0), 'km and', T_LAND - T_EI0, 's from the field, cross range', best.cross13.toFixed(0), 'km');
const gEI = L.groundState(epochMs, EI.lat, EI.lon, 120e3, T_EI0);
const burn0 = best.a;
const burnEnd = L.kepler(best.post.r, best.post.v, T_DEORBIT_S);
const lam = L.lambert(burnEnd.r, gEI.r, T_EI0 - T_DEORBIT_END, MU, cross(burnEnd.r, burnEnd.v));
const sD0 = burn0, sD1 = { r: burnEnd.r, v: lam.v1 };
console.log('retro dv m/s', (len(best.a.v) - len(best.post.v)).toFixed(0), 'after the burn', el(best.post));
console.log('the burn to the entry point: the arc after the 160 s burn needs', len(sub(lam.v1, burnEnd.v)).toFixed(0), 'm/s of correction');


// --- entry, the heading-alignment circle, the final approach and the roll-out: Earth-fixed
const mono = (pts) => { const f = monotoneCubic(pts.map((p) => p[0]), pts.map((p) => p[1])); return (x) => f(x).y; };
// seconds before touchdown -> range to go along the track (km) and altitude (km) until the circle starts
const RTG = mono([[2100, 10350], [1950, 9230], [1800, 8110], [1500, 5900], [1200, 3950], [1000, 2750], [800, 1650], [650, 900], [480, 400], [300, 150], [170, 55], [0, 55 - 55]].map(([a, b]) => [-a, b]));
const ALT = mono([[2100, 150], [1950, 135], [1800, 120], [1650, 104], [1500, 90], [1200, 70], [1000, 62], [800, 56], [650, 50], [480, 41], [300, 24], [170, 12.5]].map(([a, b]) => [-a, b]));
// the circle: radius 6 km, a left turn (counter-clockwise), ending on the extended runway 13 km before the touchdown point
const u = [Math.sin(rad(RWY)), Math.cos(rad(RWY))];             // the roll-out's direction (east, north)
const left = [-u[1], u[0]];
const R_HAC = 6000, S_FINAL = 13000;
const pEnd = [-u[0] * S_FINAL, -u[1] * S_FINAL];
const centre = [pEnd[0] + left[0] * R_HAC, pEnd[1] + left[1] * R_HAC];
const aEnd = Math.atan2(pEnd[1] - centre[1], pEnd[0] - centre[0]), aStart = aEnd - rad(240);
const pStart = [centre[0] + R_HAC * Math.cos(aStart), centre[1] + R_HAC * Math.sin(aStart)];
const ll = (p) => L.destination(EDW.lat, EDW.lon, ((Math.atan2(p[0], p[1]) / DEG) + 360) % 360, Math.hypot(p[0], p[1]) / 1000);
const HAC0 = ll(pStart);
const arcLen = R_HAC * rad(240), T_HAC0 = T_LAND - 170, DIST = mono([[170, arcLen + S_FINAL], [130, 24500], [90, 13200], [60, 7000], [30, 2700], [10, 800], [0, 0]].map(([a, b]) => [-a, b]));
const ALT2 = mono([[170, 12.5], [130, 9], [90, 6], [60, 4.2], [30, 1.8], [10, 0.22], [4, 0.04], [0, 0]].map(([a, b]) => [-a, b]));
const ROLL = (tt) => { const d = 94 * tt - 0.5 * 1.9 * tt * tt; return Math.min(d, 94 * 94 / (2 * 1.9)); };
const GROUND_M = 700;                                             // Rogers Dry Lake is about 700 m above the sea
const clearance = 8.592, clearTouch = 6.546;                                          // the model's origin above the runway when level on its gear (shuttle-orbiter.glb, from its own file)
const bearingTo = (a, b) => { const p1 = rad(a.lat), p2 = rad(b.lat), dl = rad(b.lon - a.lon); return (Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) / DEG + 360) % 360; };
const distKm = (a, b) => 6371.0088 * Math.acos(Math.min(1, Math.sin(rad(a.lat)) * Math.sin(rad(b.lat)) + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon))));
const brgEi = bearingTo(EI, HAC0), kmEi = distKm(EI, HAC0);
const entryGround = (t) => {
  const tt = t - T_LAND;                                           // seconds from touchdown (negative before)
  if (tt >= 0) { const p = ll([u[0] * ROLL(tt), u[1] * ROLL(tt)]); const k = Math.min(1, tt / 12); return { lat: p.lat, lon: p.lon, altM: GROUND_M + clearTouch + (clearance - clearTouch) * k * k * (3 - 2 * k) }; }
  if (tt < -170) {
    const q = Math.max(-2090, tt * 1800 / (T_LAND - T_EI));       // the table's own clock, stretched to the entry's length
    const f = RTG(q); const along = (8110 - f) / (8110 - RTG(-170));
    const p = L.destination(EI.lat, EI.lon, brgEi, Math.min(1, along) * kmEi);
    return { lat: p.lat, lon: p.lon, altM: ALT(q) * 1000 + GROUND_M };
  }
  const d = DIST(tt);                                              // distance still to go along circle + final
  let pos;
  if (d > S_FINAL) { const a = aEnd - (d - S_FINAL) / R_HAC; pos = [centre[0] + R_HAC * Math.cos(a), centre[1] + R_HAC * Math.sin(a)]; }
  else pos = [-u[0] * d, -u[1] * d];
  const p = ll(pos);
  return { lat: p.lat, lon: p.lon, altM: ALT2(tt) * 1000 + GROUND_M + clearTouch };
};
const entryPos = (t) => { const g = entryGround(t); return L.groundPos(epochMs, g.lat, g.lon, g.altM, t); };
const entryAt = L.diffState(entryPos);
for (const dt of [0, 5, 30, 100, 300]) console.log('  entry +', dt, 's speed', len(entryAt(T_EI + dt).v).toFixed(0), JSON.stringify(entryGround(T_EI + dt)).slice(0, 90), 'T_LAND-T_EI', T_LAND - T_EI);
console.log('entry speed at EI', len(entryAt(T_EI).v).toFixed(0), 'lambert arrival', len(lam.v2).toFixed(0), 'dot', (dot(entryAt(T_EI).v, lam.v2) / len(entryAt(T_EI).v) / len(lam.v2)).toFixed(3));
console.log('EI to the circle km', kmEi.toFixed(0), 'bearing', brgEi.toFixed(0), 'EI lambert arrival', len(lam.v2).toFixed(0), 'join', len(sub(lam.v2, entryAt(T_EI).v)).toFixed(0));
const segs = [
  { from: T_START, to: T_OMS1, at: (t) => L.kepler(s0.r, s0.v, t - T_START), step: () => 10 },
  { from: T_OMS1, to: T_OMS1 + T_OMS1_S, at: (t) => L.hermite({ r: preOms1.r, v: after1.v }, burn1End, T_OMS1, T_OMS1 + T_OMS1_S, t), step: () => 5 },
  { from: T_OMS1 + T_OMS1_S, to: T_OMS2, at: (t) => L.kepler(after1.r, after1.v, t - T_OMS1), step: (t) => L.arcStep(len(L.kepler(after1.r, after1.v, t - T_OMS1).r), 7700, 10, 90) },
  { from: T_OMS2, to: T_OMS2 + T_OMS2_S, at: (t) => L.hermite({ r: preOms2.r, v: after2.v }, burn2End, T_OMS2, T_OMS2 + T_OMS2_S, t), step: () => 5 },
  { from: T_OMS2 + T_OMS2_S, to: T_DEORBIT, at: orbitAt, step: (t) => L.arcStep(len(orbitAt(t).r), 7700, 8, 150) },
  { from: T_DEORBIT, to: T_DEORBIT_END, at: (t) => L.hermite(sD0, sD1, T_DEORBIT, T_DEORBIT_END, t), step: () => 5 },
  { from: T_DEORBIT_END, to: T_EI, at: (t) => L.kepler(sD1.r, lam.v1, t - T_DEORBIT_END), step: (t) => L.arcStep(len(L.kepler(sD1.r, lam.v1, t - T_DEORBIT_END).r), 7700, 8, 120) },
  { from: T_EI, to: T_LAND + 70, at: entryAt, step: (t) => (t > T_LAND - 200 ? 1 : 4) },
];
L.save(OUT + 'paths/sts-1-orbit.json', L.rowsOf(segs), 'STS-1 from the end of the ascent (T+534 s) to the stop on the runway; reconstructed by tools/moments-build/sts1.mjs: the OMS burns, a circle drifted by the Earth\'s oblateness, the deorbit burn, the entry and the approach. Earth-inertial (TEME) km and km/s.');

// --- the models: the numbers are from the files and the model builder's report (scripts/shuttle/build-sts1.mjs)
const bs = L.glbBox(MODELS + 'shuttle-sts-stack.glb'), bo = L.glbBox(MODELS + 'shuttle-orbiter.glb');
const H_STACK = +(bs.max[1] - bs.min[1]).toFixed(3), H_ORB = +(bo.max[1] - bo.min[1]).toFixed(3);
const ORB_AT = [0, 2.876, 9.13];
const SSME = [[0, 2.139, 0.273], [1.125, 2.086, -3.743], [-1.125, 2.086, -3.743]];
const SRB_EXIT = { 'srb-l': [[-6.782, 0, 0.076]], 'srb-r': [[6.782, 0, 0.076]] };
const stackEv = (t, part, action, extra = {}) => ({ t, part, action, vehicle: 'stack', ...extra });
const orbEv = (t, part, action, extra = {}) => ({ t, part, action, vehicle: 'columbia-up', ...extra });
const col = (t, part, action, extra = {}) => ({ t, part, action, vehicle: 'columbia', ...extra });
const ORB_PARTS = ['orbiter-body', 'bay-door-l', 'bay-door-r', 'bay-door-l-open', 'bay-door-r-open', 'gear-nose', 'gear-main-l', 'gear-main-r', 'bay-open-detail', 'dfi-pallet'];
const parts = [];
// on the pad and up: the doors shut and the gear up; the open doors and the gear are out of sight
for (const p of ['bay-door-l-open', 'bay-door-r-open', 'bay-open-detail', 'dfi-pallet', 'gear-nose', 'gear-main-l', 'gear-main-r']) { parts.push(orbEv(-10, p, 'hide'), col(T_START, p, 'hide')); }
parts.push(col(T_START, 'bay-door-l-open', 'hide'));
parts.push(orbEv(-6.6, 'orbiter-body', 'ignite', { rampS: 3 }));
parts.push(stackEv(0, 'srb-l', 'ignite', { rampS: 0.3 }), stackEv(0, 'srb-r', 'ignite', { rampS: 0.3 }));
parts.push(orbEv(36, 'orbiter-body', 'throttle', { level: 0.65 }), orbEv(70, 'orbiter-body', 'throttle', { level: 1 }));
parts.push(stackEv(124, 'srb-l', 'cutoff'), stackEv(124, 'srb-r', 'cutoff'));
parts.push(stackEv(T_SRB, 'srb-l', 'separate', { dv: [-6, -2, 0.6], spin: [0.0, 0.02, 0.06] }), stackEv(T_SRB, 'srb-r', 'separate', { dv: [6, -2, 0.6], spin: [0.0, -0.02, -0.06] }));
parts.push(orbEv(T_MECO, 'orbiter-body', 'cutoff'));
parts.push(stackEv(T_ET, 'tank', 'separate', { dv: [0, -0.5, -1.4], spin: [0.012, 0.004, 0.0] }));
// in orbit: the doors open for the radiators, shut again before the burn home; the gear is lowered seconds before touchdown
parts.push(col(T_DOORS_OPEN, 'bay-door-l', 'hide'), col(T_DOORS_OPEN, 'bay-door-r', 'hide'), col(T_DOORS_OPEN, 'bay-door-l-open', 'show'), col(T_DOORS_OPEN, 'bay-door-r-open', 'show'), col(T_DOORS_OPEN, 'bay-open-detail', 'show'), col(T_DOORS_OPEN, 'dfi-pallet', 'show'));
parts.push(col(T_DEORBIT - 1800, 'bay-door-l-open', 'hide'), col(T_DEORBIT - 1800, 'bay-door-r-open', 'hide'), col(T_DEORBIT - 1800, 'bay-open-detail', 'hide'), col(T_DEORBIT - 1800, 'dfi-pallet', 'hide'), col(T_DEORBIT - 1800, 'bay-door-l', 'show'), col(T_DEORBIT - 1800, 'bay-door-r', 'show'));
for (const p of ['gear-nose', 'gear-main-l', 'gear-main-r']) parts.push(col(T_LAND - 14, p, 'show'));
parts.sort((a, b) => a.t - b.t);
// the hide of the open doors at T_START must come before the show: sort is stable on time
const pace = [[-10, 0, 1], [0, 30, 1], [30, 110, 5], [110, 145, 1.5], [145, 505, 12], [505, 560, 1.5], [560, 640, 4], [640, 2560, 90], [2560, 2800, 4], [2800, T_DOORS_OPEN - 100, 400], [T_DOORS_OPEN - 100, T_DOORS_OPEN + 200, 8],
  [T_DOORS_OPEN + 200, T_OMS3 - 60, 1600], [T_OMS3 - 60, T_OMS3 + 100, 20], [T_OMS3 + 100, T_DEORBIT - 2000, 2800], [T_DEORBIT - 2000, T_DEORBIT - 1700, 12], [T_DEORBIT - 1700, T_DEORBIT - 100, 120], [T_DEORBIT - 100, T_DEORBIT_END + 150, 6],
  [T_DEORBIT_END + 150, T_EI - 60, 60], [T_EI - 60, T_EI + 700, 14], [T_EI + 700, T_LAND - 300, 8], [T_LAND - 300, T_LAND - 30, 2.2], [T_LAND - 30, T_END, 1]].map(([from, to, rate]) => ({ from: Math.round(from), to: Math.round(to), rate }));
let play = 0; for (const q of pace) play += (q.to - q.from) / q.rate;
console.log('play time s', play.toFixed(0), 'pace is contiguous', pace.every((q, i) => i === 0 || q.from === pace[i - 1].to));
const moment = {
  format: 1, id: 'sts-1', words: 'sts-1', wordsFile: 'en.moments.sts1.js',
  epoch: '1981-04-12T12:00:04Z', span: [-10, T_END], pace, place,
  places: [{ from: Math.round(T_EI - 60), place: { name: 'Edwards Air Force Base, Rogers Dry Lake, runway 23', lat: EDW.lat, lon: EDW.lon, alt: 700, azimuth: RWY, ground: { kind: 'land', lakebed: true, runway: { bearing: RWY, widthM: 90, lengthM: 7500 } } } }],
  trajectories: {
    ascent: { kind: 'profile', truth: 'reconstructed', say: 'pathAscent', pitchStart: 7, turnS: 90, azimuth: AZ, points: ASCENT,
      source: 'the published event times and heights (Max Q 56 s, boosters 132 s at 53 km, main engine cut-off 514 s at 118 km, the tank 18 s later) as Wikipedia, "STS-1", gives them, read 3 November 2026; the distances between them, and the heading for the published 40.30 degree orbit, are ours' },
    orbit: { kind: 'vectors', truth: 'reconstructed', say: 'pathOrbit', frame: 'earth-teme', file: 'paths/sts-1-orbit.json',
      source: 'the burns and orbits of the mission report as Wikipedia, "STS-1", gives them (246 by 248 km, then 274 km, 40.30 degrees; entry interface 8 110 km from the field; touchdown 54 h 20 m 53 s), joined by arcs fitted by tools/moments-build/sts1.mjs; the deorbit burn\'s clock and place, and the entry\'s heights between the published Mach numbers, are ours' },
  },
  vehicles: [
    { id: 'stack', model: 'shuttle-sts-stack', lengthM: H_STACK, path: 'ascent', attitude: 'ascent', window: [-10, T_ET + 90], parts: ['srb-l', 'srb-r', 'tank'],
      engines: SRB_EXIT, flames: { 'srb-l': { kind: 'solid', exitM: 3.8 }, 'srb-r': { kind: 'solid', exitM: 3.8 } } },
    { id: 'columbia-up', model: 'shuttle-orbiter', lengthM: H_ORB, rideOn: { vehicle: 'stack', at: ORB_AT }, attitude: 'ascent', window: [-10, T_START], parts: ORB_PARTS, marker: false,
      engines: { 'orbiter-body': SSME }, flames: { 'orbiter-body': { kind: 'hydrolox', exitM: 2.3 } } },
    { id: 'columbia', model: 'shuttle-orbiter', lengthM: H_ORB, path: 'orbit', attitude: 'prograde', window: [T_START, T_END], colour: 'station', parts: ORB_PARTS,
      phases: [{ t: T_START, rollDeg: -90, pitchDeg: 0 }, { t: T_DEORBIT - 400, attitude: 'retrograde', rollDeg: -90, pitchDeg: 0 },
        { t: T_DEORBIT_END + 200, attitude: 'prograde', rollDeg: -90, pitchDeg: 0 }, { t: T_DEORBIT_END + 900, rollDeg: -90, pitchDeg: 40 },
        // the entry: belly first, 40 degrees nose-up held to Mach 8; the bank of the roll reversals (Mach 18.5 and 9.8) drawn as 45 degrees each way, ours in size and clock
        { t: T_EI + 120, rollDeg: -90 }, { t: T_EI + 330, rollDeg: -45 }, { t: T_LAND - 1130, rollDeg: -45 }, { t: T_LAND - 1090, rollDeg: -135 },
        { t: T_LAND - 780, rollDeg: -135 }, { t: T_LAND - 740, rollDeg: -45 }, { t: T_LAND - 700, pitchDeg: 40 }, { t: T_LAND - 520, rollDeg: -45 },
        { t: T_LAND - 480, rollDeg: -90, pitchDeg: 25 }, { t: T_LAND - 300, pitchDeg: 15 }, { t: T_LAND - 170, pitchDeg: 10 }, { t: T_LAND - 6, pitchDeg: 8 }, { t: T_LAND + 12, pitchDeg: 0 }],
      // the layer under the belly (effects.js createBellyPlasma), in the model's frame: the lower surface's outline, the nose cap, the wake along the flight path
      plasma: { kind: 'belly', zM: -4.4, planform: [[0, 37.0], [2.2, 32], [4.5, 24], [11.7, 9.0], [11.5, 3.8], [4.0, 1.5], [-4.0, 1.5], [-11.5, 3.8], [-11.7, 9.0], [-4.5, 24], [-2.2, 32]],
        noseCap: [0, 35.6, -3.9], capRadiusM: 1.4, wakeM: 13, wakeRadiusM: 4 } },
  ],
  tracks: {
    parts,
    camera: [
      { t: -10, shot: 'pad', at: [190, -125, 5], lookY: 28, fov: 40, vehicle: 'stack' },
      { t: -3, shot: 'pad', at: [120, -75, 5], lookY: 20, fov: 50, vehicle: 'stack' },
      { t: 4, shot: 'track', at: [-1300, -900, 12], lookY: 30, fill: 0.55, fovMin: 0.6, fovMax: 20, vehicle: 'stack' },
      { t: 24, shot: 'chase', offset: [160, -40, 150], lookY: 28, fov: 40, blend: 1.5, vehicle: 'stack' },
      { t: 112, shot: 'chase', offset: [70, -30, 70], lookY: 22, fov: 46, vehicle: 'stack' },
      { t: T_SRB - 3, shot: 'orbit', az: 110, el: 6, dist: 140, lookY: 22, fov: 38, vehicle: 'stack', blend: 1.5 },
      { t: T_SRB + 14, shot: 'chase', offset: [110, -60, 100], lookY: 24, fov: 46, vehicle: 'stack', blend: 1.2 },
      { t: 300, shot: 'orbit', az: 60, el: 5, dist: 120, lookY: 22, fov: 42, vehicle: 'stack', blend: 2 },
      { t: T_MECO - 10, shot: 'orbit', az: 130, el: 8, dist: 70, lookY: 26, fov: 42, vehicle: 'stack', blend: 2 },
      { t: T_ET + 10, shot: 'orbit', az: 100, el: 10, dist: 75, lookY: 26, fov: 44, vehicle: 'columbia-up', blend: 1.5 },
      { t: T_START + 12, shot: 'orbit', az: 40, el: 16, dist: 70, lookY: 18, fov: 44, vehicle: 'columbia', blend: 2 },
      { t: 900, shot: 'globe', altKm: 2400, backKm: 2200, fov: 46, vehicle: 'columbia', blend: 3 },
      { t: T_OMS2 - 120, shot: 'globe', altKm: 1800, backKm: 2400, fov: 46, vehicle: 'columbia', blend: 3 },
      { t: T_DOORS_OPEN - 100, shot: 'orbit', az: 150, el: 52, dist: 62, lookY: 19, fov: 50, vehicle: 'columbia', blend: 2 },
      { t: T_DOORS_OPEN + 240, shot: 'globe', altKm: 2600, backKm: 2400, fov: 46, vehicle: 'columbia', blend: 3 },
      { t: T_OMS3 - 40, shot: 'orbit', az: 30, el: 20, dist: 58, lookY: 19, fov: 44, vehicle: 'columbia', blend: 3 },
      { t: T_OMS3 + 150, shot: 'globe', altKm: 3200, backKm: 2600, fov: 46, vehicle: 'columbia', blend: 3 },
      { t: T_DEORBIT - 120, shot: 'orbit', az: 210, el: 12, dist: 60, lookY: 19, fov: 44, vehicle: 'columbia', blend: 3 },
      { t: T_DEORBIT_END + 60, shot: 'globe', altKm: 2000, backKm: 2400, fov: 46, vehicle: 'columbia', blend: 3 },
      { t: T_EI - 40, shot: 'orbit', az: 200, el: 14, dist: 48, lookY: 18, fov: 44, vehicle: 'columbia', blend: 2 },
      { t: T_EI + 200, shot: 'chase', offset: [26, 4, -50], lookY: 18, fov: 46, vehicle: 'columbia', blend: 2 },
      { t: T_EI + 900, shot: 'orbit', az: 140, el: 10, dist: 80, lookY: 18, fov: 46, vehicle: 'columbia', blend: 2 },
      { t: T_LAND - 330, shot: 'chase', offset: [40, -10, -60], lookY: 10, fov: 48, vehicle: 'columbia', blend: 2 },
      { t: T_LAND - 150, shot: 'orbit', az: 250, el: 12, dist: 110, lookY: 6, fov: 48, vehicle: 'columbia', blend: 2 },
      { t: T_LAND - 40, shot: 'pad', at: [-450, 450, 3], lookY: 6, fov: 24, vehicle: 'columbia', blend: 1.5 },
      { t: T_LAND + 4, shot: 'orbit', az: 250, el: 6, dist: 70, lookY: 6, fov: 44, vehicle: 'columbia', blend: 1.5 },
    ],
    captions: [
      { t: -10, say: 'ready' }, { t: -6.6, say: 'ignition' }, { t: 0.4, say: 'liftoff' }, { t: 12, say: 'roll' }, { t: T_MAXQ - 6, say: 'maxq' }, { t: T_SRB - 6, say: 'srb' }, { t: T_MECO - 8, say: 'meco' }, { t: T_ET, say: 'tank' },
      { t: T_OMS1, say: 'oms1' }, { t: T_OMS2 - 20, say: 'oms2' }, { t: T_DOORS_OPEN, say: 'doors' }, { t: T_OMS3, say: 'oms3' }, { t: T_DEORBIT - 600, say: 'wake' }, { t: T_DEORBIT, say: 'deorbit' },
      { t: T_EI, say: 'entry' }, { t: T_EI + 400, say: 'blackout' }, { t: T_LAND - 480, say: 'bigsur' }, { t: T_LAND - 170, say: 'hac' }, { t: T_LAND - 6, say: 'touch' }, { t: T_LAND + 20, say: 'stop' },
    ],
    audio: [],
    effects: [
      { t: -6.5, effect: 'exhaust-cloud', until: 16, axis: [0, 1, 0], count: 700, fire: 'srb-l', vehicle: 'stack' },
      { t: T_EI + 60, effect: 'plasma', until: T_EI + 1250, peak: T_EI + 500, vehicle: 'columbia' },
    ],
  },
  chapters: [{ t: -10, say: 'chPad' }, { t: 0.4, say: 'chAscent' }, { t: T_SRB - 6, say: 'chSrb' }, { t: T_MECO - 8, say: 'chMeco' }, { t: T_START + 12, say: 'chOrbit' }, { t: T_DEORBIT - 600, say: 'chHome' },
    { t: T_EI, say: 'chEntry' }, { t: T_LAND - 170, say: 'chLand' }],
  sources: [
    { say: 'srcWiki', url: 'https://en.wikipedia.org/wiki/STS-1' },
    { say: 'srcNssdc', url: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1981-034A' },
  ],
  audio_note: 'No radio recording plays. NASA\'s air-to-ground audio of the whole mission is on Wikimedia Commons as hundreds of unlabelled clips ("STS-001-1-1.ogg" and on, public domain, CC0, from NASA via the Internet Archive); only the first day is there and nothing says which clip holds which line, and the server stopped serving them to me while I looked through them (3 November 2026). The words are captions; the line of Young\'s quoted is from the report\'s account.',
};
const written = JSON.stringify(moment, null, 1).replace(/\n\s+/g, (m) => (m.length > 40 ? m : ' ')) + '\n';
writeFileSync(OUT + 'sts-1.json', written);
console.log('sts-1.json written; times', { T_OMS2, T_DEORBIT, T_EI, T_LAND, T_END });
