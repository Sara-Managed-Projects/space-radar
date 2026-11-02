// tools/moments-build/artemis2.mjs -- Artemis II, 1 to 10 April 2026 (release 1.6.0, internal spec 0079 C7, internal #1056).
// Writes site/data/moments/artemis-ii.json and paths/artemis-ii-{trip,icps}.json. `node tools/moments-build/artemis2.mjs`.
//
// WHAT IS FLOWN AND WHAT IS PLANNED. Flown, from the published accounts (Wikipedia "Artemis II", read 2 November 2026; NASA):
// lift-off 1 April 22:35:12 UTC from LC-39B, the strap-on boosters away at 48 km, the high Earth orbit of 192 by 70 174 km, TLI
// on flight day 2 (5 min 49 s), closest approach to the Moon 6 April 23:00 UTC at 6 545 km from the far side, the greatest
// distance 406 771 km at 23:02, splashdown 11 April 00:07:27 UTC at 32.3 N 117.8 W. PLANNED (the accounts give no time, so the
// flight plan's is drawn and said to be): the escape-system jettison, core-stage cut-off, the burn times of the upper stage, the
// separation from it, the moment of TLI within the day, the service module's release and entry interface. The paths between are
// two-body arcs, a hyperbola round the Moon.
import { writeFileSync } from 'node:fs';
import * as L from './lib.mjs';
import { monotoneCubic } from '../../site/js/moments/format.js';
const { add, sub, scale, dot, cross, len, norm, MU, EARTH_R, MU_MOON, R_MOON, DEG } = L;
const OUT = new URL('../../site/data/moments/', import.meta.url).pathname;
const epochMs = Date.parse('2026-04-01T22:35:12Z');
const place = { name: 'Launch Complex 39B', lat: 28.6272, lon: -80.6208, alt: 0, azimuth: 90, ground: { kind: 'coast', shoreBearing: 350, shoreM: 900, pad: true } };
const frame = L.placeFrame(place);
const DAY = 86400, H = 3600;
const T = { las: 202, srb: 126, meco: 484, cs: 496, hand: 520, ca: 5 * DAY + 24 * 60 + 48, ei: 9 * DAY + 1 * H + 32 * 60 + 15 - 13 * 60, splash: 9 * DAY + 1 * H + 32 * 60 + 15, apollo13: 5 * DAY - (4 * H + 39 * 60 + 12), los0: 5 * DAY + 648, los1: 5 * DAY + 2928, maxd: 5 * DAY + 24 * 60 + 48 + 120 };
T.esmsep = T.ei - 20 * 60;
const mn = (t) => L.moonAt(epochMs, t);
const mono = (pts) => { const f = monotoneCubic(pts.map((p) => p[0]), pts.map((p) => p[1])); return (x) => f(x).y; };
const smooth = (u) => { const x = Math.min(1, Math.max(0, u)); return x * x * (3 - 2 * x); };

const ASCENT = [[-10, 0, 0], [0.5, 0, 0], [10, 0.3, 0], [30, 2.6, 0.3], [60, 9, 2], [90, 22, 10], [126, 48, 60], [160, 70, 125], [202, 92, 200], [300, 125, 494], [400, 148, 954], [484, 160, 1487], [520, 216, 1748]];
const track = L.profileTrack({ points: ASCENT, azimuth: 90 }, place);
const s0 = L.profileInertial(epochMs, track, frame, T.hand);
const el = (s) => { const r = len(s.r), v = len(s.v), a = 1 / (2 / r - v * v / MU), h = cross(s.r, s.v), e = Math.sqrt(Math.max(0, 1 - len(h) ** 2 / (MU * a))); return { perKm: +((a * (1 - e) - EARTH_R) / 1e3).toFixed(0), apoKm: +((a * (1 + e) - EARTH_R) / 1e3).toFixed(0), incl: +(Math.acos(h[2] / len(h)) / DEG).toFixed(1), period: +(2 * Math.PI * Math.sqrt(Math.abs(a) ** 3 / MU) / 60).toFixed(1) }; };
console.log('after core separation', el(s0), 'speed', len(s0.v).toFixed(0));
const sub0 = (t) => L.kepler(s0.r, s0.v, t - T.hand);
// apogee of the suborbital arc: where the radius stops growing
let tA = T.hand; for (let t = T.hand; t < T.hand + 8000; t += 5) if (len(sub0(t + 5).r) > len(sub0(t).r)) tA = t + 5; else break;
T.pr = tA;
console.log('perigee-raise burn at apogee', T.pr, 'radius km above the Earth', ((len(sub0(tA).r) - EARTH_R) / 1e3).toFixed(0));
// raise the perigee to 185 km at apogee (60 s burn), then the apogee to 70 174 km at the next perigee (15 min burn centred on it)
const burnAt = (state, tc, half, newPerKm, newApoKm, atApogee) => {
  const rc = len(state.r), rPer = atApogee ? EARTH_R + newPerKm * 1e3 : rc, rApo = atApogee ? rc : EARTH_R + newApoKm * 1e3;
  const a = (rPer + rApo) / 2, vNew = Math.sqrt(MU * (2 / rc - 1 / a));
  const hat = norm(sub(state.v, scale(norm(state.r), dot(state.v, norm(state.r)))));
  const after = { r: state.r, v: scale(hat, vNew) };
  return { tc, half, before: null, after };
};
const b1 = burnAt(sub0(T.pr), T.pr, 30, 185, 0, true);
const orbit1 = (t) => L.kepler(b1.after.r, b1.after.v, t - T.pr);
let tP = T.pr + 1500; for (let t = T.pr + 1500; t < T.pr + 9000; t += 5) if (len(orbit1(t + 5).r) < len(orbit1(t).r)) tP = t + 5; else if (t > T.pr + 2000) break;
T.ar = tP;
const b2 = burnAt(orbit1(T.ar), T.ar, 450, 0, 70174, false);
const heo = (t) => L.kepler(b2.after.r, b2.after.v, t - T.ar);
console.log('apogee-raise burn at', T.ar, 'HEO', el(b2.after));
// the second perigee after that, near flight day 2: TLI (planned minute)
const period = 2 * Math.PI * Math.sqrt(((EARTH_R + 185e3 + EARTH_R + 70174e3) / 2) ** 3 / MU);
T.tliC = T.ar + Math.round(period);
T.tli0 = T.tliC - 60; T.tli1 = T.tliC + 289;
T.sep = T.ar + 450 + 900;
console.log('HEO period min', (period / 60).toFixed(0), 'TLI (perigee) at', T.tliC, 'that is T+', (T.tliC / H).toFixed(2), 'h');
const sT0 = heo(T.tli0);
const kT1 = L.kepler(sT0.r, sT0.v, T.tli1 - T.tli0);

// --- the flyby: a hyperbola round the Moon, pericentre 8 282 km from its centre, on the far side
const rp = R_MOON + 6545e3, rSoi = 66e6;
const mCA = mn(T.ca), mHat = norm(mCA.r);
// the pericentre is on the far side, off the Earth-Moon line by the angle that puts the craft 406 771 km from the Earth (the reported maximum)
const cosTh = Math.max(-1, Math.min(1, (406771e3 - len(mCA.r)) / rp)), sinTh = Math.sqrt(1 - cosTh * cosTh);
const bb1 = norm(cross([0, 0, 1], mHat)), bb2 = cross(mHat, bb1);
const hyper = (psi, sigma, vinf, phi) => {
  const pHat = add(scale(mHat, cosTh), scale(add(scale(bb1, Math.cos(phi)), scale(bb2, Math.sin(phi))), sinTh));
  const a1 = norm(cross(add(pHat, [1e-3, 2e-3, 3e-3]), pHat)), a2 = cross(pHat, a1);
  const q = add(scale(a1, Math.cos(psi)), scale(a2, Math.sin(psi)));
  const rpv = scale(pHat, rp), vp = scale(q, sigma * Math.sqrt(vinf * vinf + 2 * MU_MOON / rp));
  const at = (t) => L.kepler(rpv, vp, t - T.ca, MU_MOON);
  let lo = 0, hi = 4e5; for (let i = 0; i < 60; i += 1) { const m = (lo + hi) / 2; if (len(at(T.ca - m).r) < rSoi) lo = m; else hi = m; }
  return { at, dtSoi: lo };
};
const rEI = null;
const sEnd = L.groundPos(epochMs, 32.3, -117.8, 0, T.splash);
const arcEI = 2790e3 / EARTH_R;
const mHatEI = norm(mn(T.ei).r);
const tHatE = norm(sub(mHatEI, scale(norm(sEnd), dot(mHatEI, norm(sEnd)))));
const uEI = add(scale(norm(sEnd), Math.cos(arcEI)), scale(tHatE, Math.sin(arcEI)));
const rEIv = scale(uEI, EARTH_R + 121.9e3);
let best = null;
for (let phi = 0; phi < 2 * Math.PI; phi += 30 * DEG) for (let psi = 0; psi < 2 * Math.PI; psi += 10 * DEG) for (const sigma of [1, -1]) for (let vinf = 300; vinf <= 1300; vinf += 100) {
  const hy = hyper(psi, sigma, vinf, phi);
  const tIn = T.ca - hy.dtSoi, tOut = T.ca + hy.dtSoi;
  const pin = hy.at(tIn), pout = hy.at(tOut), mi = mn(tIn), mo = mn(tOut);
  const rin = add(mi.r, pin.r), rout = add(mo.r, pout.r);
  const l1 = L.lambert(kT1.r, rin, tIn - T.tli1, MU, cross(kT1.r, kT1.v));
  const l2 = L.lambert(rout, rEIv, T.ei - tOut, MU, cross(rout, rEIv));
  const m1 = len(sub(l1.v2, add(mi.v, pin.v))), m2 = len(sub(l2.v1, add(mo.v, pout.v)));
  if (!best || m1 + m2 < best.c) best = { phi, psi, sigma, vinf, hy, tIn, tOut, rin, rout, l1, l2, m1, m2, c: m1 + m2 };
}
console.log('flyby: v-infinity', best.vinf, 'sense', best.sigma, 'plane angle deg', (best.psi / DEG).toFixed(0), 'pericentre off the Earth-Moon line deg', (Math.acos(cosTh) / DEG).toFixed(0), 'at', (best.phi / DEG).toFixed(0), 'mismatch in / out m/s', best.m1.toFixed(0), best.m2.toFixed(0), 'SOI crossing at CA -/+ h', (best.hy.dtSoi / H).toFixed(1));
console.log('entry: arrival speed', len(best.l2.v2).toFixed(0), 'fpa deg', (Math.asin(dot(norm(rEIv), norm(best.l2.v2))) / DEG).toFixed(1));
const mAtCA = len(best.hy.at(T.ca).r) - R_MOON; console.log('closest approach above the surface km', (mAtCA / 1e3).toFixed(0));
const hy = best.hy;
const moonAbs = (t, rel) => { const m = mn(t); return { r: add(m.r, rel.r), v: add(m.v, rel.v) }; };

// the entry on the great circle
const ENTRY_ALT = mono([[0, 121.9], [60, 110], [120, 86], [180, 62], [240, 46], [300, 34], [360, 26], [420, 19], [480, 12], [560, 7.3], [620, 3.0], [780, 0]]);
const ENTRY_RNG = mono([[0, 0], [60, 660], [120, 1290], [180, 1830], [240, 2235], [300, 2500], [360, 2650], [420, 2720], [480, 2755], [540, 2770], [600, 2778], [780, 2790]]);
const slerp = (a, b, f) => { const w = Math.acos(Math.min(1, dot(a, b))); return add(scale(a, Math.sin((1 - f) * w) / Math.sin(w)), scale(b, Math.sin(f * w) / Math.sin(w))); };
const entryPos = (t) => { const f = Math.min(1, ENTRY_RNG(t - T.ei) / 2790); return scale(slerp(uEI, norm(sEnd), f), EARTH_R + Math.max(0, ENTRY_ALT(t - T.ei)) * 1e3); };
const entryAt = L.diffState(entryPos);

// the path of the stack's base to the separation, then of Orion's service module
const rEI0 = { r: best.rout, v: best.l2.v1 };
const tripAt = (t) => {
  if (t <= T.hand) return L.profileInertial(epochMs, track, frame, t);
  if (t <= T.pr - 30) return sub0(t);
  if (t <= T.pr + 30) return L.hermite(sub0(T.pr - 30), orbit1(T.pr + 30), T.pr - 30, T.pr + 30, t);
  if (t <= T.ar - 450) return orbit1(t);
  if (t <= T.ar + 450) return L.hermite(orbit1(T.ar - 450), heo(T.ar + 450), T.ar - 450, T.ar + 450, t);
  if (t <= T.tli0) return heo(t);
  if (t <= T.tli1) return L.hermite(sT0, { r: kT1.r, v: best.l1.v1 }, T.tli0, T.tli1, t);
  const W = 3600, conicIn = (x) => L.kepler(kT1.r, best.l1.v1, x - T.tli1), hypAt = (x) => moonAbs(x, hy.at(x)), conicOut = (x) => L.kepler(rEI0.r, rEI0.v, x - best.tOut);
  // the joins at the edge of the Moon's sphere are blended over two hours, so the turn from one conic to the other is a curve
  if (t <= best.tIn - W) return conicIn(t);
  if (t <= best.tIn + W) return L.hermite(conicIn(best.tIn - W), hypAt(best.tIn + W), best.tIn - W, best.tIn + W, t);
  if (t <= best.tOut - W) return hypAt(t);
  if (t <= best.tOut + W) return L.hermite(hypAt(best.tOut - W), conicOut(best.tOut + W), best.tOut - W, best.tOut + W, t);
  if (t <= T.ei - 300) return conicOut(t);
  if (t <= T.ei) return L.hermite(L.kepler(rEI0.r, rEI0.v, T.ei - 300 - best.tOut), entryAt(T.ei), T.ei - 300, T.ei, t);
  return entryAt(t);
};
for (const [name, t] of [['TLI start', T.tli0], ['TLI end', T.tli1], ['into the Moon\'s sphere', best.tIn], ['out of it', best.tOut], ['entry join', T.ei - 300], ['EI', T.ei]]) {
  const a = tripAt(t - 0.05), b = tripAt(t + 0.05);
  console.log('join', name, 'velocity jump m/s', len(sub(a.v, b.v)).toFixed(0));
}
const axisDir = (t) => norm(tripAt(t).v);
const offAt = (t) => (t < T.sep ? 76.0 : t >= T.sep + 6000 ? 0 : (76 + 0.4 * (t - T.sep) * (1 - smooth((t - T.sep - 3000) / 3000))) * (1 - smooth((t - T.sep - 3000) / 3000)));
const orionAt = (t) => { const s = tripAt(t); return { r: add(s.r, scale(axisDir(t), offAt(t))), v: s.v }; };
const arc = (t, lo, hi) => { const s = tripAt(t), m = mn(t); const dm = len(sub(s.r, m.r)); const rr = dm < 3e7 ? dm : len(s.r); const vv = dm < 3e7 ? len(sub(s.v, m.v)) : len(s.v); return L.arcStep(rr, vv, lo, hi); };
const stepOf = (t) => ((t > T.tli0 - 300 && t < T.tli1 + 300) || (t > T.ei - 300) ? 4 : (t > T.pr - 60 && t < T.pr + 60) || (t > T.ar - 500 && t < T.ar + 500) ? 10 : arc(t, 4, 1500));
const seg = (from, to, at, step) => ({ from, to, at, step });
L.save(OUT + 'paths/artemis-ii-trip.json', L.rowsOf([seg(T.hand, T.splash - 1, orionAt, stepOf), seg(T.splash - 1, T.splash, orionAt, () => 1)]), 'Artemis II Orion, from the stack after core separation to splashdown; reconstructed by tools/moments-build/artemis2.mjs. Earth-inertial (TEME) km and km/s.');
L.save(OUT + 'paths/artemis-ii-icps.json', L.rowsOf([seg(T.hand, T.sep + 3500, tripAt, stepOf)]), 'Artemis II: the upper stage and the base of the stack, from core separation to the end of the separation from Orion.');
let minR = 1e9; for (const r of JSON.parse(JSON.stringify(0 ? [] : []))) minR = 0;
console.log('times s:', JSON.stringify(T));

// --- the moment
const sls = L.registryRow('sls-block1'), ori = L.registryRow('orion-esm');
const ev = (t, vehicle, part, action, extra = {}) => ({ t, part, action, vehicle, ...extra });
const arrays = ['array-1', 'array-2', 'array-3', 'array-4'], fairings = ['fairing-1', 'fairing-2', 'fairing-3'];
const parts = [
  ev(-6.4, 'sls', 'core-stage', 'ignite', { rampS: 5 }), ev(0, 'sls', 'srb-left', 'ignite', { rampS: 0.6 }), ev(0, 'sls', 'srb-right', 'ignite', { rampS: 0.6 }),
  ...arrays.map((a) => ev(-10, 'orion-up', a, 'hide')), ...arrays.map((a) => ev(-10, 'orion', a, 'hide')),
  ev(T.srb, 'sls', 'srb-left', 'cutoff'), ev(T.srb, 'sls', 'srb-right', 'cutoff'),
  ev(T.srb + 0.5, 'sls', 'srb-left', 'separate', { dv: [-3, -2, 0], spin: [0, 0, 0.05] }), ev(T.srb + 0.5, 'sls', 'srb-right', 'separate', { dv: [3, -2, 0], spin: [0, 0, -0.05] }),
  ev(T.las, 'orion-up', 'las', 'separate', { dv: [3, 25, 1], spin: [0.03, 0, 0.1] }),
  ev(T.meco, 'sls', 'core-stage', 'cutoff'), ev(T.cs, 'sls', 'core-stage', 'separate', { dv: [0, -2, 0], spin: [0.01, 0, 0.02] }),
  ev(T.hand, 'icps', 'srb-left', 'hide'), ev(T.hand, 'icps', 'srb-right', 'hide'), ev(T.hand, 'icps', 'core-stage', 'hide'),
  ev(T.hand, 'orion', 'las', 'hide'),
  ev(T.pr, 'icps', 'icps', 'ignite', { rampS: 2 }), ev(T.pr + 30, 'icps', 'icps', 'cutoff'),
  ev(T.ar - 450, 'icps', 'icps', 'ignite', { rampS: 2 }), ev(T.ar + 450, 'icps', 'icps', 'cutoff'),
  ev(1200, 'orion', 'fairing-1', 'separate', { dv: [1.5, 0.3, 0], spin: [0, 0, 0.1] }), ev(1200, 'orion', 'fairing-2', 'separate', { dv: [-0.8, 0.3, 1.3], spin: [0, 0, 0.1] }), ev(1200, 'orion', 'fairing-3', 'separate', { dv: [-0.8, 0.3, -1.3], spin: [0, 0, 0.1] }),
  ...arrays.map((a) => ev(1500, 'orion', a, 'show')),
  ev(T.tli0, 'orion', 'esm', 'ignite', { rampS: 2 }), ev(T.tli1, 'orion', 'esm', 'cutoff'),
  ev(T.esmsep, 'orion', 'esm', 'separate', { dv: [0, -0.8, 0], spin: [0.02, 0, 0.03] }),
  ...arrays.map((a) => ev(T.esmsep, 'orion', a, 'separate', { dv: [0, -0.8, 0], spin: [0.02, 0, 0.03] })),
  ev(T.ei + 100, 'orion', 'esm', 'hide'), ...arrays.map((a) => ev(T.ei + 100, 'orion', a, 'hide')),
  ev(T.ei + 520, 'orion', 'drogue', 'deploy', { reefS: 3, openS: 2 }), ev(T.ei + 580, 'orion', 'main', 'deploy', { reefS: 5, openS: 4 }), ev(T.ei + 582, 'orion', 'drogue', 'hide'),
].sort((a, b) => a.t - b.t);
const wideDir = (t) => { const m = norm(mn(t).r); return norm(add(scale(norm(cross([0, 0, 1], m)), 0.9), [0, 0, 0.35])).map((x) => +x.toFixed(3)); };
const cam = [
  { t: -10, shot: 'pad', at: [260, -190, 4], lookY: 48, fov: 44, vehicle: 'sls' }, { t: -4, shot: 'pad', at: [120, -80, 5], lookY: 16, fov: 56, vehicle: 'sls' },
  { t: 3, shot: 'track', at: [-1500, -1000, 14], lookY: 55, fill: 0.6, fovMin: 0.6, fovMax: 20, vehicle: 'sls' },
  { t: 20, shot: 'chase', offset: [160, -50, -140], lookY: 55, fov: 40, blend: 1.5, vehicle: 'sls' }, { t: 112, shot: 'chase', offset: [60, -25, -50], lookY: 25, fov: 50, vehicle: 'sls' },
  { t: 134, shot: 'orbit', az: 110, el: 6, dist: 190, lookY: 55, fov: 42, spin: 1.5, vehicle: 'sls', blend: 1 }, { t: 160, shot: 'chase', offset: [120, -50, -100], lookY: 60, fov: 50, vehicle: 'sls', blend: 1.5 },
  { t: 196, shot: 'orbit', az: 60, el: 6, dist: 160, lookY: 90, fov: 44, vehicle: 'sls' }, { t: 225, shot: 'chase', offset: [180, -70, -140], lookY: 50, fov: 46, vehicle: 'sls', blend: 2 },
  { t: 470, shot: 'orbit', az: 100, el: 5, dist: 200, lookY: 50, fov: 42, spin: 1.2, vehicle: 'sls', blend: 2 }, { t: T.hand + 20, shot: 'globe', altKm: 1200, backKm: 2000, fov: 46, vehicle: 'icps', blend: 3 },
  { t: T.pr - 120, shot: 'orbit', az: 40, el: 10, dist: 150, lookY: 70, fov: 42, vehicle: 'icps', blend: 2 }, { t: T.pr + 200, shot: 'globe', altKm: 5000, backKm: 3000, fov: 46, vehicle: 'icps', blend: 3 },
  { t: T.ar - 500, shot: 'orbit', az: 120, el: 8, dist: 130, lookY: 70, fov: 42, vehicle: 'icps', blend: 2 }, { t: T.ar + 600, shot: 'orbit', az: 160, el: 10, dist: 60, lookY: 80, fov: 42, vehicle: 'orion', blend: 2 },
  { t: T.sep + 800, shot: 'globe', altKm: 20000, backKm: 20000, fov: 46, vehicle: 'orion', blend: 3 },
  { t: T.tli0 - 200, shot: 'orbit', az: 30, el: 12, dist: 40, lookY: 6, fov: 42, vehicle: 'orion', blend: 3 }, { t: T.tli1 + 100, shot: 'wide', look: 'earth', distKm: 40000, dir: wideDir(T.tli1), fov: 40, vehicle: 'orion', blend: 3 },
  { t: T.tli1 + 20000, shot: 'wide', look: 'earth-moon', distKm: 800000, dir: wideDir(T.ca - 100000), fov: 38, vehicle: 'orion', blend: 3 },
  { t: best.tIn - 20000, shot: 'wide', look: 'moon', distKm: 80000, dir: wideDir(T.ca), fov: 40, vehicle: 'orion', blend: 3 },
  { t: T.ca - 4000, shot: 'wide', look: 'moon', distKm: 22000, dir: wideDir(T.ca), fov: 40, vehicle: 'orion', blend: 3 },
  { t: T.ca + 900, shot: 'wide', look: 'moon', distKm: 30000, dir: wideDir(T.ca), fov: 40, vehicle: 'orion', blend: 3 },
  { t: T.ca + 20000, shot: 'wide', look: 'earth-moon', distKm: 800000, dir: wideDir(T.ca + 100000), fov: 38, vehicle: 'orion', blend: 3 },
  { t: T.esmsep - 200, shot: 'orbit', az: 40, el: 12, dist: 35, lookY: 6, fov: 42, vehicle: 'orion', blend: 3 }, { t: T.ei - 120, shot: 'chase', offset: [8, -2, 10], lookY: 2.5, fov: 44, vehicle: 'orion', blend: 2 },
  { t: T.ei + 180, shot: 'orbit', az: 160, el: 14, dist: 18, lookY: 2.5, fov: 44, vehicle: 'orion', blend: 2 }, { t: T.ei + 500, shot: 'orbit', az: 30, el: 10, dist: 150, lookY: 8, fov: 46, vehicle: 'orion', blend: 2 },
  { t: T.ei + 640, shot: 'orbit', az: 200, el: 6, dist: 140, lookY: 6, fov: 50, vehicle: 'orion', spin: 0.6, blend: 2 },
];
const caps = [[-10, 'ready'], [-6.4, 'cored'], [0, 'liftoff'], [T.srb, 'srb'], [T.las, 'las'], [T.meco, 'meco'], [T.cs, 'coresep'], [T.pr - 60, 'prb'], [T.ar - 500, 'arb'], [1200, 'fairings'], [1500, 'arrays'], [T.sep, 'sep'],
  [T.tliC - 300, 'tli'], [T.tli1 + 600, 'outbound'], [T.apollo13 - 600, 'record'], [T.ca - 2400, 'moon'], [T.los0, 'los'], [T.ca, 'closest'], [T.maxd, 'far'], [T.los1, 'aos'], [T.ca + 3600, 'home'],
  [T.esmsep, 'esmsep'], [T.ei, 'entry'], [T.ei + 520, 'drogue'], [T.ei + 580, 'mains'], [T.splash - 25, 'splash']].map(([t, say]) => ({ t, say })).sort((a, b) => a.t - b.t);
const pace = [[-10, 12, 1], [12, 126, 8], [126, 140, 3], [140, 200, 6], [200, 490, 16], [490, 540, 4], [540, T.pr - 200, 400], [T.pr - 200, T.pr + 200, 40], [T.pr + 200, T.ar - 700, 400], [T.ar - 700, T.ar + 700, 100],
  [T.ar + 700, T.sep + 1500, 100], [T.sep + 1500, T.tli0 - 400, 4000], [T.tli0 - 400, T.tli1 + 200, 25], [T.tli1 + 200, best.tIn - 30000, 12000], [best.tIn - 30000, T.ca - 5000, 1500], [T.ca - 5000, T.ca + 5000, 60],
  [T.ca + 5000, best.tOut + 30000, 3000], [best.tOut + 30000, T.esmsep - 400, 12000], [T.esmsep - 400, T.ei - 100, 40], [T.ei - 100, T.ei + 100, 8], [T.ei + 100, T.ei + 500, 14], [T.ei + 500, T.splash, 6]].map(([from, to, rate]) => ({ from, to, rate }));
let play = 0; for (const q of pace) play += (q.to - q.from) / q.rate;
console.log('play time s', play.toFixed(0));
for (const q of pace) if (!(q.to > q.from)) console.log('BAD pace', q);
const moment = {
  format: 1, id: 'artemis-ii', words: 'artemis-ii', wordsFile: 'en.moments.artemis2.js',
  epoch: '2026-04-01T22:35:12Z', span: [-10, T.splash], pace, place,
  places: [{ from: T.ei - 300, place: { name: 'Pacific Ocean, 32.3 N 117.8 W', lat: 32.3, lon: -117.8, alt: 0, ground: { kind: 'sea' } } }],
  trajectories: {
    ascent: { kind: 'profile', truth: 'reconstructed', say: 'pathAscent', pitchStart: 8, turnS: 60, azimuth: 90, points: ASCENT,
      source: 'lift-off 22:35:12 UTC and the boosters\' separation at 48 km (Wikipedia, "Artemis II", read 2 November 2026); the other events are NASA\'s flight plan (planned, not reported); heights and distances between them are ours' },
    trip: { kind: 'vectors', truth: 'reconstructed', say: 'pathTrip', frame: 'earth-teme', file: 'paths/artemis-ii-trip.json',
      source: 'high Earth orbit of 192 by 70 174 km, TLI on flight day 2, closest approach 6 April 23:00 UTC at 6 545 km, splashdown 11 April 00:07:27 UTC (Wikipedia, "Artemis II"); two-body arcs and a hyperbola round the Moon, fitted by tools/moments-build/artemis2.mjs' },
    icps: { kind: 'vectors', truth: 'reconstructed', say: 'pathTrip', frame: 'earth-teme', file: 'paths/artemis-ii-icps.json',
      source: 'the upper stage follows the same arcs to the separation; its own later path is not drawn' },
  },
  vehicles: [
    { id: 'sls', model: 'sls-block1', lengthM: 76.0, path: 'ascent', attitude: 'ascent', window: [-10, T.hand], parts: sls.parts, engines: sls.engines,
      flames: { 'core-stage': { kind: 'hydrolox', exitM: 2.4 }, 'srb-left': { kind: 'solid', exitM: 3.8 }, 'srb-right': { kind: 'solid', exitM: 3.8 } } },
    { id: 'orion-up', model: 'orion-esm', colour: 'spacecraft', lengthM: 22.1, rideOn: { vehicle: 'sls', at: [0, 76.0, 0] }, attitude: 'ascent', window: [-10, T.hand], parts: ori.parts },
    { id: 'icps', model: 'sls-block1', lengthM: 76.0, path: 'icps', attitude: 'prograde', window: [T.hand, T.sep + 3500], parts: sls.parts, engines: { icps: [[0, 73.5, 0]] }, flames: { icps: { kind: 'hydrolox', exitM: 1.2 } } },
    { id: 'orion', model: 'orion-esm', colour: 'spacecraft', lengthM: 22.1, path: 'trip', attitude: 'prograde', window: [T.hand, T.splash], parts: ori.parts,
      phases: [{ t: T.esmsep + 1, attitude: 'retrograde' }],
      engines: { esm: ori.engines.esm }, flames: { esm: { kind: 'hypergolic', exitM: 1.1 } },
      chutes: { drogue: { diameterM: 7, count: 2, lineM: 10, at: [0, 5.7, 0], colours: ['#f1efe9', '#f1efe9'], spreadDeg: 10 }, main: { diameterM: 35, count: 3, lineM: 40, at: [0, 5.7, 0], colours: ['#e2622a', '#f1efe9'], spreadDeg: 12 } },
      plasma: { radiusM: 2.0, at: [0, 2.4, 0] } },
  ],
  tracks: { parts, camera: cam.sort((a, b) => a.t - b.t), captions: caps,
    audio: [{ t: T.srb, sting: 'stage' }, { t: T.ca, sting: 'arrive' }, { t: T.splash, sting: 'end' }],
    effects: [{ t: -6.4, effect: 'exhaust-cloud', until: 16, axis: [0, 1, 0], count: 700, fire: 'core-stage', vehicle: 'sls' }, { t: T.ei + 30, effect: 'plasma', until: T.ei + 420, peak: T.ei + 150, vehicle: 'orion' }] },
  chapters: [{ t: -10, say: 'chPad' }, { t: 0, say: 'chLiftoff' }, { t: T.srb, say: 'chStaging' }, { t: T.hand, say: 'chOrbit' }, { t: T.tliC - 300, say: 'chTli' }, { t: T.ca - 2400, say: 'chMoon' }, { t: T.ca + 3600, say: 'chHome' },
    { t: T.esmsep - 200, say: 'chEntry' }, { t: T.ei + 500, say: 'chSplash' }],
  sources: [{ say: 'srcWiki', url: 'https://en.wikipedia.org/wiki/Artemis_II' }, { say: 'srcNasa', url: 'https://www.nasa.gov/mission/artemis-ii/' }],
};
writeFileSync(OUT + 'artemis-ii.json', JSON.stringify(moment, null, 1).replace(/\n\s+/g, (m) => (m.length > 40 ? m : ' ')) + '\n');
console.log('artemis-ii.json written');
