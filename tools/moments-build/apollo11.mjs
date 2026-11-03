// tools/moments-build/apollo11.mjs -- Apollo 11, 16 to 24 July 1969 (release 1.6.0, internal spec 0079 C6, internal #1055).
// Writes site/data/moments/apollo-11.json and paths/apollo-11-{csm,ivb,lm,lmasc}.json. `node tools/moments-build/apollo11.mjs`.
//
// THE PATHS. The launch is a profile (the Mission Report's event times, heights between them ours). Everything after it is
// built from the event times of the Apollo 11 Flight Journal and the Mission Report: a parking orbit, the translunar burn
// and an Earth-only conic to the Moon (Lambert), the lunar orbit as a circle round the Moon, the descent from the
// landing site backwards (so it ends on Tranquility Base), the ascent, the rendezvous, a conic home and the entry to the
// splashdown point. The two free numbers of the lunar orbit (the descent's speed at powered descent initiation and the
// azimuth the lander flies in on) are chosen to make the arrival burn and the departure burn smallest.
import { writeFileSync } from 'node:fs';
import * as L from './lib.mjs';
import { monotoneCubic } from '../../site/js/moments/format.js';
const { add, sub, scale, dot, cross, len, norm, MU, EARTH_R, MU_MOON, R_MOON, DEG } = L;
const OUT = new URL('../../site/data/moments/', import.meta.url).pathname;
const epochMs = Date.parse('1969-07-16T13:32:00Z');
const place = { name: 'Launch Complex 39A', lat: 28.60825, lon: -80.60412, alt: 0, azimuth: 72.058, ground: { kind: 'coast', shoreBearing: 340, shoreM: 800, pad: true } };
const frame = L.placeFrame(place);
const G = (h, m, s) => h * 3600 + m * 60 + s;
const T = {
  ins: 712, tli0: G(2, 44, 16), tli1: G(2, 50, 4), sla: G(3, 17, 4), extr: G(3, 56, 40), loi: G(75, 49, 50), loi1: G(75, 49, 50) + 357,
  undock: G(100, 12, 0), doi: G(101, 36, 14), pdi: G(102, 33, 5), land: G(102, 45, 40), step: G(109, 24, 15), lift: G(124, 22, 0), insl: G(124, 29, 15),
  dock: G(128, 3, 0), jett: G(130, 9, 31), tei: G(135, 23, 42), tei1: G(135, 23, 42) + 150, smsep: G(194, 49, 12), ei: G(195, 3, 6),
  drogue: G(195, 3, 6) + 560, main: G(195, 3, 6) + 620, splash: G(195, 18, 35),
};
const SITE = { lat: 0.67408, lon: 23.47297 };
const SPLASH = { lat: 13.32, lon: -169.15 };
const mn = (t) => L.moonAt(epochMs, t);
const smooth = (u) => { const x = Math.min(1, Math.max(0, u)); return x * x * (3 - 2 * x); };
const mono = (pts) => { const f = monotoneCubic(pts.map((p) => p[0]), pts.map((p) => p[1])); return (x) => f(x).y; };

// --- the launch: Table 3-I of the Mission Report for the events; heights and distances between them ours (as in the demonstration)
const ASCENT = [[-9.5, 0, 0], [0.6, 0, 0], [12, 0.13, 0], [30, 1.3, 0.15], [50, 4.0, 1.0], [66, 7.8, 2.9], [83, 13.3, 6.4], [110, 25.0, 20.0], [135.2, 44.0, 47.0],
  [161.7, 66.8, 93.0], [192.3, 88.0, 158.0], [200, 92.7, 176], [300, 128, 466], [400, 160, 876], [460, 175, 1182], [553, 185, 1745], [650, 186, 2428], [712, 187, 2873.5]];
const track = L.profileTrack({ points: ASCENT, azimuth: 72.058 }, place);
const s0 = L.profileInertial(epochMs, track, frame, T.ins);
const elements = (s, mu = MU, R = EARTH_R) => { const r = len(s.r), v = len(s.v), a = 1 / (2 / r - v * v / mu), h = cross(s.r, s.v), e = Math.sqrt(Math.max(0, 1 - len(h) ** 2 / (mu * a))); return { perKm: +((a * (1 - e) - R) / 1e3).toFixed(1), apoKm: +((a * (1 + e) - R) / 1e3).toFixed(1), incl: +(Math.acos(h[2] / len(h)) / DEG).toFixed(1), speed: +len(s.v).toFixed(0), alt: +((r - R) / 1e3).toFixed(1) }; };
console.log('parking orbit', elements(s0));
const leo = (t) => L.kepler(s0.r, s0.v, t - T.ins);

// --- translunar injection: the burn blended from the parking orbit to the Earth-only conic to the Moon
const sT0 = leo(T.tli0);
const kT1 = L.kepler(sT0.r, sT0.v, T.tli1 - T.tli0);
const tliHint = cross(sT0.r, sT0.v);

// --- the lunar design, backwards from the landing
const axesLand = L.moonAxes(mn(T.land).r);
const sHat = L.moonSurfaceDir(axesLand, SITE.lat, SITE.lon);
const east = norm(cross(axesLand.z, sHat)), north = cross(sHat, east);
const heightPDI = 15240, descentP = 2.66, descentS = T.land - T.pdi;
function design(vPDI, azDeg) {
  const D = vPDI * descentS / descentP, psi = D / (R_MOON + 8000);
  const tHat = add(scale(north, Math.cos(azDeg * DEG)), scale(east, Math.sin(azDeg * DEG)));
  const rAt = (th) => add(scale(sHat, Math.cos(th)), scale(tHat, Math.sin(th)));
  const vAt = (th) => add(scale(sHat, -Math.sin(th)), scale(tHat, Math.cos(th)));
  const pdi = { r: scale(rAt(-psi), R_MOON + heightPDI), v: scale(vAt(-psi), vPDI) };
  const back = L.kepler(pdi.r, pdi.v, T.doi - T.pdi, MU_MOON);
  const Rc = len(back.r), vc = Math.sqrt(MU_MOON / Rc);
  const hDir = norm(sub(back.v, scale(norm(back.r), dot(back.v, norm(back.r)))));
  const circ = { r: back.r, v: scale(hDir, vc) };
  return { D, psi, tHat, pdi, desc: back, circ, Rc, csmRel: (t) => L.kepler(circ.r, circ.v, t - T.doi, MU_MOON), lmRel: (t) => L.kepler(back.r, back.v, t - T.doi, MU_MOON), rAt };
}
// the entry geometry (needed for the departure cost)
const sEnd = L.groundPos(epochMs, SPLASH.lat, SPLASH.lon, 0, T.splash);
const mHatEI = norm(mn(T.ei).r);
const arcEI = 2790e3 / EARTH_R;
const tHatE = norm(sub(mHatEI, scale(norm(sEnd), dot(mHatEI, norm(sEnd)))));
const uEI = add(scale(norm(sEnd), Math.cos(arcEI)), scale(tHatE, Math.sin(arcEI)));
const rEI = scale(uEI, EARTH_R + 121.9e3);
const cost = (d) => {
  const rLOI = add(mn(T.loi).r, d.csmRel(T.loi).r);
  const lam = L.lambert(kT1.r, rLOI, T.loi - T.tli1, MU, tliHint);
  const dvIn = len(sub(sub(lam.v2, mn(T.loi).v), d.csmRel(T.loi).v));
  const tb = T.tei1, mo = mn(tb), cr = d.csmRel(tb);
  const rb = add(mo.r, cr.r);
  const lam2 = L.lambert(rb, rEI, T.ei - tb, MU, cross(rb, rEI));
  const dvOut = len(sub(sub(lam2.v1, mo.v), cr.v));
  return { total: dvIn + dvOut, dvIn, dvOut, lam, lam2 };
};
let best = null;
for (let v = 1600; v <= 1780; v += 4) for (let az = 250; az <= 290; az += 2) {
  const d = design(v, az);
  if (d.Rc < R_MOON + 60e3 || d.Rc > R_MOON + 140e3) continue;
  const c = cost(d);
  if (!best || c.total < best.c.total) best = { v, az, d, c };
}
console.log('lunar design: PDI speed', best.v, 'azimuth', best.az, 'orbit radius km above the Moon', ((best.d.Rc - R_MOON) / 1e3).toFixed(1), 'arrival burn m/s', best.c.dvIn.toFixed(0), 'departure burn m/s', best.c.dvOut.toFixed(0));
const D = best.d;
const lam1 = best.c.lam, lam2 = best.c.lam2;
console.log('descent: range km', (D.D / 1e3).toFixed(0), 'arrival at the Moon, speed relative to it m/s', len(sub(sub(lam1.v2, mn(T.loi).v), D.csmRel(T.loi).v)).toFixed(0));
console.log('entry: arrival speed m/s', len(lam2.v2).toFixed(0), 'flight-path angle at EI deg', (Math.asin(dot(norm(rEI), norm(lam2.v2))) / DEG).toFixed(1));

// the hand-over at the Moon: burns blended with a cubic Hermite
const moonAbs = (t, rel) => { const m = mn(t); return { r: add(m.r, rel.r), v: add(m.v, rel.v) }; };
const csmAbs = (t) => moonAbs(t, D.csmRel(t));
const loiS = { r: add(mn(T.loi).r, D.csmRel(T.loi).r), v: lam1.v2 }, loiE = csmAbs(T.loi1);
const teiS = csmAbs(T.tei), teiE = { r: csmAbs(T.tei1).r, v: lam2.v1 };
// minimum distance to the Moon through the burns
for (const [name, a, b, t0, t1] of [['LOI', loiS, loiE, T.loi, T.loi1], ['TEI', teiS, teiE, T.tei, T.tei1]]) {
  let m = 1e99; for (let t = t0; t <= t1; t += 5) m = Math.min(m, len(sub(L.hermite(a, b, t0, t1, t).r, mn(t).r)));
  console.log(name, 'blend: lowest point above the Moon km', ((m - R_MOON) / 1e3).toFixed(0));
}

// --- the entry: the great circle in the inertial frame, from EI to the splashdown point
const ENTRY_ALT = mono([[0, 121.9], [60, 110], [120, 86], [180, 62], [240, 46], [300, 34], [360, 26], [420, 19], [480, 12], [560, 7.3], [620, 3.0], [929, 0]]);
const ENTRY_RNG = mono([[0, 0], [60, 660], [120, 1290], [180, 1830], [240, 2235], [300, 2500], [360, 2650], [420, 2720], [480, 2755], [540, 2770], [600, 2778], [929, 2790]]);
const slerp = (a, b, f) => { const w = Math.acos(Math.min(1, dot(a, b))); return add(scale(a, Math.sin((1 - f) * w) / Math.sin(w)), scale(b, Math.sin(f * w) / Math.sin(w))); };
const sEndDir = norm(sEnd);
const entryPos = (t) => { const f = Math.min(1, ENTRY_RNG(t - T.ei) / 2790); return scale(slerp(uEI, sEndDir, f), EARTH_R + Math.max(0, ENTRY_ALT(t - T.ei)) * 1e3); };
const entryAt = L.diffState(entryPos);

// --- the lander, through its own parts
const dFixed = (axes, r) => [dot(r, axes.x), dot(r, axes.y), dot(r, axes.z)];
const fromFixed = (axes, d) => add(add(scale(axes.x, d[0]), scale(axes.y, d[1])), scale(axes.z, d[2]));
const siteFixed = dFixed(axesLand, sHat);
const surfaceAt = (t, h = 0) => { const ax = L.moonAxes(mn(t).r); return add(mn(t).r, scale(fromFixed(ax, siteFixed), R_MOON + h)); };
const pdiDir = norm(D.pdi.r);
const pdiFixed = dFixed(L.moonAxes(mn(T.pdi).r), pdiDir);
const DESC_H = mono([[0, 15.24], [100, 14.4], [200, 12.8], [300, 10.6], [400, 8.0], [506, 2.35], [580, 1.3], [640, 0.6], [700, 0.2], [740, 0.04], [755, 0]]);
const descentPos = (t) => { const x = Math.min(1, (t - T.pdi) / descentS), f = 1 - (1 - x) ** descentP; const ax = L.moonAxes(mn(t).r); const d = slerp(norm(pdiFixed), norm(siteFixed), f); return add(mn(t).r, scale(fromFixed(ax, d), R_MOON + DESC_H(t - T.pdi) * 1e3)); };
const descentAt = L.diffState(descentPos);
// the ascent: from the site to an orbit insertion point on the CSM's circle, 0.25 rad behind it, 18 km up
const rotAbout = (v, axis, ang) => add(add(scale(v, Math.cos(ang)), scale(cross(axis, v), Math.sin(ang))), scale(axis, dot(axis, v) * (1 - Math.cos(ang))));
const hAxis = norm(cross(D.circ.r, D.circ.v));
// the insertion point: the nearest point of the CSM's plane to the site at lift-off, 0.14 rad (250 km) ahead along the orbit
const siteIns = norm(sub(surfaceAt(T.insl), mn(T.insl).r));
const proj = norm(sub(siteIns, scale(hAxis, dot(siteIns, hAxis))));
const uIns = rotAbout(proj, hAxis, 0.14);
const cHat = norm(D.csmRel(T.insl).r);
const dphi0 = (Math.atan2(dot(cross(uIns, cHat), hAxis), dot(uIns, cHat)) + 2 * Math.PI) % (2 * Math.PI);
console.log('LM phasing: behind the CSM at insertion by rad', dphi0.toFixed(2));
const lmOrbit = (t, dphi, dh) => { const c = D.csmRel(t); const r = scale(norm(rotAbout(c.r, hAxis, -dphi)), len(c.r) - dh); return add(mn(t).r, r); };
const dhIns = D.Rc - (R_MOON + 18e3);
const insFixed = dFixed(L.moonAxes(mn(T.insl).r), norm(sub(lmOrbit(T.insl, dphi0, dhIns), mn(T.insl).r)));
const arcAsc = Math.acos(Math.min(1, dot(norm(siteFixed), norm(insFixed)))) * R_MOON;
const qAsc = Math.min(3, Math.max(1.2, 1600 * (T.insl - T.lift) / arcAsc));
console.log('ascent arc km', (arcAsc / 1e3).toFixed(0), 'q', qAsc.toFixed(2));
const ASC_H = mono([[0, 0], [10, 0.25], [60, 2.5], [150, 9], [300, 16.5], [T.insl - T.lift, 18]]);
const ascentPos = (t) => { const x = Math.min(1, (t - T.lift) / (T.insl - T.lift)); const ax = L.moonAxes(mn(t).r); const d = slerp(norm(siteFixed), norm(insFixed), x ** qAsc); return add(mn(t).r, scale(fromFixed(ax, d), R_MOON + ASC_H(t - T.lift) * 1e3)); };
const ascentAt = L.diffState(ascentPos);
const dockOff = 16.1;
const axisDir = (t) => { const s = tripAt(t); const m = mn(t); return norm(t > T.loi - 1000 && t < T.tei + 1000 ? sub(s.v, m.v) : s.v); };

// --- the CSM's path from one end to the other
const entryJoin = (t) => L.hermite(L.kepler(rEI0.r, rEI0.v, (T.ei - 300) - T.tei1), entryAt(T.ei), T.ei - 300, T.ei, t);
const rEI0 = { r: teiE.r, v: teiE.v };
function tripAt(t) {
  if (t <= T.tli0) return leo(t);
  if (t <= T.tli1) return L.hermite(sT0, { r: kT1.r, v: lam1.v1 }, T.tli0, T.tli1, t);
  if (t <= T.loi) return L.kepler(kT1.r, lam1.v1, t - T.tli1);
  if (t <= T.loi1) return L.hermite(loiS, loiE, T.loi, T.loi1, t);
  if (t <= T.tei) return csmAbs(t);
  if (t <= T.tei1) return L.hermite(teiS, teiE, T.tei, T.tei1, t);
  if (t <= T.ei - 300) return L.kepler(teiE.r, teiE.v, t - T.tei1);
  if (t <= T.ei) return entryJoin(t);
  return entryAt(t);
}
const offAt = (t) => (t < T.extr ? 104.3 : t >= T.extr + 1800 ? 0 : (104.3 + 60 * smooth((t - T.extr) / 200)) * (1 - smooth((t - T.extr - 400) / 1400)));
const csmAt = (t) => { const s = tripAt(t), o = offAt(t); return { r: add(s.r, scale(axisDir(t), o)), v: s.v }; };
const ivbAt = (t) => { const s = tripAt(t); const o = t > T.extr ? 0.35 * (t - T.extr) : 0; return { r: sub(s.r, scale(axisDir(t), o)), v: s.v }; };
const lmAt = (t) => {
  if (t < T.undock) { const c = csmAt(t); return { r: sub(c.r, scale(axisDir(t), dockOff)), v: c.v }; }
  if (t < T.doi) { const c = csmAt(t); const k = 1 - smooth((t - T.undock) / (T.doi - T.undock)); return { r: sub(c.r, scale(axisDir(t), dockOff * k)), v: c.v }; }
  if (t < T.pdi) return moonAbs(t, D.lmRel(t));
  if (t < T.land) return descentAt(t);
  return L.diffState((x) => surfaceAt(x))(t);
};
const lmAscAt = (t) => {
  if (t < T.insl) return t <= T.lift ? L.diffState((x) => surfaceAt(x))(t) : ascentAt(t);
  if (t < T.dock) { const u = (t - T.insl) / (T.dock - T.insl), k = 1 - smooth(u); return L.diffState((x) => lmOrbit(x, dphi0 * (1 - smooth((x - T.insl) / (T.dock - T.insl))), dhIns * (1 - smooth((x - T.insl) / (T.dock - T.insl)))))(t); }
  const c = csmAt(t); return { r: sub(c.r, scale(axisDir(t), dockOff)), v: c.v };
};
// continuity check at the joins
for (const [name, f, t] of [['TLI start', tripAt, T.tli0], ['TLI end', tripAt, T.tli1], ['LOI start', tripAt, T.loi], ['LOI end', tripAt, T.loi1], ['TEI start', tripAt, T.tei], ['TEI end', tripAt, T.tei1], ['entry join', tripAt, T.ei - 300], ['EI', tripAt, T.ei],
  ['LM DOI', lmAt, T.doi], ['LM PDI', lmAt, T.pdi], ['LM land', lmAt, T.land], ['LM insertion', lmAscAt, T.insl], ['LM dock', lmAscAt, T.dock]]) {
  const a = f(t - 0.05), b = f(t + 0.05);
  console.log('join', name, 'position jump m', len(sub(a.r, b.r)).toFixed(0), 'velocity jump m/s', len(sub(a.v, b.v)).toFixed(0));
}
const stepIn = (fn, centreFn) => (t) => { const s = fn(t), c = centreFn ? centreFn(t) : { r: [0, 0, 0], v: [0, 0, 0] }; return L.arcStep(len(sub(s.r, c.r)), len(sub(s.v, c.v))); };
const moonRel = (t) => mn(t);
const nearMoon = (t) => t > T.loi - 2000 && t < T.tei1 + 2000;
const stepTrip = (t) => (nearMoon(t) ? L.arcStep(Math.max(len(sub(tripAt(t).r, mn(t).r)), 1.8e6), Math.max(len(sub(tripAt(t).v, mn(t).v)), 1500), 4, 900) : stepIn(tripAt)(t));
const seg = (from, to, at, step) => ({ from, to, at, step });
const rowsCsm = L.rowsOf([seg(T.extr, T.splash - 1, csmAt, (t) => (t >= T.ei - 300 ? 4 : t > T.tli0 - 600 && t < T.tli1 + 300 ? 4 : stepTrip(t))), seg(T.splash - 1, T.splash, csmAt, () => 1)]);
L.save(OUT + 'paths/apollo-11-csm.json', rowsCsm, 'Apollo 11 CSM Columbia, 3:56 to splashdown; reconstructed by tools/moments-build/apollo11.mjs. Earth-inertial (TEME) km and km/s.');
L.save(OUT + 'paths/apollo-11-ivb.json', L.rowsOf([seg(T.ins, T.extr + 700, ivbAt, (t) => (t >= T.tli0 - 300 && t <= T.tli1 + 300 ? 4 : stepIn(tripAt)(t)))]), 'Apollo 11 S-IVB: parking orbit, translunar injection, the extraction of the CSM and LM.');
L.save(OUT + 'paths/apollo-11-lm.json', L.rowsOf([
  seg(T.extr, T.undock, lmAt, (t) => (t < T.loi - 2000 ? 1800 : stepTrip(t))), seg(T.undock, T.pdi, lmAt, (t) => L.arcStep(D.Rc, 1630, 4, 120)), seg(T.pdi, T.land, lmAt, () => 2),
  seg(T.land, T.lift - 20, lmAt, () => 900), seg(T.lift - 20, T.dock + 600, lmAt, () => 600)]), 'Apollo 11 Eagle: docked to Columbia, the descent to Tranquility Base, and the descent stage left on the surface.');
L.save(OUT + 'paths/apollo-11-lmasc.json', L.rowsOf([seg(T.lift - 20, T.lift, lmAscAt, () => 10), seg(T.lift, T.insl, lmAscAt, () => 2), seg(T.insl, T.dock, lmAscAt, () => L.arcStep(D.Rc, 1630, 4, 120)), seg(T.dock, T.jett + 60, lmAscAt, () => 300)]), 'Apollo 11 Eagle\'s ascent stage: ascent, rendezvous, docking, jettison.');


// --- the moment
const sat = L.registryRow('saturn-v'), lmr = L.registryRow('lunar-module'), csmr = L.registryRow('apollo-csm');
const ev = (t, vehicle, part, action, extra = {}) => ({ t, part, action, vehicle, ...extra });
const parts = [
  ev(-8.9, 'saturn', 's-ic', 'ignite', { engines: [0], rampS: 1.4 }), ev(-8.6, 'saturn', 's-ic', 'ignite', { engines: [1, 3], rampS: 1.4 }), ev(-8.3, 'saturn', 's-ic', 'ignite', { engines: [2, 4], rampS: 1.4 }),
  ev(135.2, 'saturn', 's-ic', 'cutoff', { engines: [0] }), ev(161.7, 'saturn', 's-ic', 'cutoff'),
  ev(162.3, 'saturn', 's-ic', 'separate', { dv: [0, -9, 0], spin: [0.012, 0, 0.02], puffs: { at: [[5.2, 5, 3.6], [-3.6, 5, 5.2], [-5.2, 5, -3.6], [3.6, 5, -5.2]], dir: [0, 1, 0], exitM: 0.4, dur: 0.7, lead: -0.1 } }),
  ev(163.0, 'saturn', 's-ii', 'ignite', { rampS: 2.5 }),
  ev(192.3, 'saturn', 'interstage-ic-ii', 'separate', { dv: [0, -4, 0], spin: [0.01, 0, -0.008] }),
  ev(197.9, 'saturn', 'les-tower', 'separate', { dv: [4, 30, 0], spin: [0.04, 0, 0.09], puffs: { at: [[0.5, 106.5, 0], [-0.5, 106.5, 0]], dir: [0, -1, 0], exitM: 0.35, dur: 1.2 } }),
  ev(197.9, 'saturn', 'bpc', 'separate', { dv: [2, 22, 1], spin: [0.03, 0, 0.05] }),
  ev(460.6, 'saturn', 's-ii', 'cutoff', { engines: [0] }), ev(552.9, 'saturn', 's-ii', 'cutoff'),
  ev(553.6, 'saturn', 's-ii', 'separate', { dv: [0, -5, 0], spin: [0.01, 0, 0.015] }),
  ev(556.9, 'saturn', 's-ivb', 'ignite', { rampS: 2 }), ev(702, 'saturn', 's-ivb', 'cutoff'),
  ...['s-ic', 'interstage-ic-ii', 'les-tower', 'bpc', 's-ii'].map((n) => ev(712, 'ivb', n, 'hide')),
  ev(T.tli0, 'ivb', 's-ivb', 'ignite', { rampS: 3 }), ev(T.tli1, 'ivb', 's-ivb', 'cutoff'),
  ev(T.sla, 'ivb', 'sla-1', 'separate', { dv: [0, -0.3, 1.8], spin: [-0.5, 0, 0] }), ev(T.sla, 'ivb', 'sla-2', 'separate', { dv: [-1.8, -0.3, 0], spin: [0, 0, -0.5] }),
  ev(T.sla, 'ivb', 'sla-3', 'separate', { dv: [0, -0.3, -1.8], spin: [0.5, 0, 0] }), ev(T.sla, 'ivb', 'sla-4', 'separate', { dv: [1.8, -0.3, 0], spin: [0, 0, 0.5] }),
  ev(T.extr, 'ivb', 'csm-stowed', 'hide'),
  ev(T.extr, 'csm', 'sm-bay-foil', 'hide'),   // 1.7.0: the SM's torn foil of bay 4 belongs to Apollo 13's story (the model has it as a part)
  ev(T.loi, 'csm', 'service-module', 'ignite', { rampS: 2 }), ev(T.loi1, 'csm', 'service-module', 'cutoff'),
  ev(T.pdi, 'lm', 'descent-stage', 'ignite', { rampS: 3 }), ev(T.pdi + 26, 'lm', 'descent-stage', 'throttle', { level: 0.95 }), ev(T.pdi + 600, 'lm', 'descent-stage', 'throttle', { level: 0.55 }), ev(T.land - 0.1, 'lm', 'descent-stage', 'cutoff'),
  ev(T.lift, 'lm', 'ascent-stage', 'hide'),
  ev(T.lift, 'lm-asc', 'descent-stage', 'hide'), ev(T.lift, 'lm-asc', 'ascent-stage', 'ignite', { rampS: 0.5 }), ev(T.insl, 'lm-asc', 'ascent-stage', 'cutoff'),
  ev(T.tei, 'csm', 'service-module', 'ignite', { rampS: 2 }), ev(T.tei1, 'csm', 'service-module', 'cutoff'),
  ev(T.smsep, 'csm', 'service-module', 'separate', { dv: [0, -2, 0], spin: [0.05, 0, 0.1] }),
  ev(T.ei + 120, 'csm', 'service-module', 'hide'),
  ev(T.drogue, 'csm', 'drogue', 'deploy', { reefS: 3, openS: 2 }), ev(T.main, 'csm', 'main', 'deploy', { reefS: 5, openS: 4 }), ev(T.main + 2, 'csm', 'drogue', 'hide'),
].sort((a, b) => a.t - b.t);

const wideDir = (t) => { const m = norm(mn(t).r); const d = norm(add(scale(norm(cross([0, 0, 1], m)), 0.9), [0, 0, 0.35])); return d.map((x) => +x.toFixed(3)); };
const cam = [
  { t: -9.5, shot: 'pad', at: [190, -150, 4], lookY: 45, fov: 42, vehicle: 'saturn' }, { t: -2.5, shot: 'pad', at: [95, -60, 5], lookY: 14, fov: 56, vehicle: 'saturn' },
  { t: 3, shot: 'track', at: [-1300, -900, 12], lookY: 55, fill: 0.6, fovMin: 0.6, fovMax: 20, vehicle: 'saturn' },
  { t: 18, shot: 'chase', offset: [150, -50, -130], lookY: 50, fov: 40, blend: 1.5, vehicle: 'saturn' }, { t: 128, shot: 'chase', offset: [55, -25, -45], lookY: 18, fov: 50, vehicle: 'saturn' },
  { t: 158, shot: 'orbit', az: 115, el: 6, dist: 210, lookY: 45, fov: 40, spin: 1.5, vehicle: 'saturn' }, { t: 166, shot: 'chase', offset: [110, -60, -90], lookY: 40, fov: 52, blend: 1.0, vehicle: 'saturn' },
  { t: 188, shot: 'orbit', az: 60, el: 4, dist: 190, lookY: 75, fov: 44, vehicle: 'saturn' }, { t: 215, shot: 'chase', offset: [150, -60, -110], lookY: 40, fov: 46, blend: 1.5, vehicle: 'saturn' },
  { t: 340, shot: 'chase', offset: [200, -80, -150], lookY: 50, fov: 44, blend: 2, vehicle: 'saturn' }, { t: 548, shot: 'orbit', az: 100, el: 5, dist: 230, lookY: 60, fov: 40, spin: 1.2, vehicle: 'saturn', blend: 2 },
  { t: 575, shot: 'chase', offset: [140, -30, -110], lookY: 70, fov: 45, vehicle: 'saturn', blend: 1.5 }, { t: 700, shot: 'orbit', az: 70, el: 8, dist: 230, lookY: 75, fov: 42, vehicle: 'saturn', blend: 1.5 },
  { t: 722, shot: 'globe', altKm: 1400, backKm: 2200, fov: 46, vehicle: 'ivb', blend: 3 },
  { t: 9780, shot: 'globe', altKm: 2500, backKm: 5000, fov: 50, vehicle: 'ivb', blend: 2 }, { t: T.tli1 + 80, shot: 'globe', altKm: 6000, backKm: 3000, fov: 46, vehicle: 'ivb', blend: 3 },
  { t: 11780, shot: 'orbit', az: 80, el: 12, dist: 90, lookY: 82, fov: 40, vehicle: 'ivb', blend: 2 }, { t: T.extr - 60, shot: 'orbit', az: 140, el: 8, dist: 70, lookY: 100, fov: 40, vehicle: 'ivb' },
  { t: T.extr + 200, shot: 'orbit', az: 30, el: 12, dist: 60, lookY: 4, fov: 40, vehicle: 'csm', blend: 2 },
  { t: 15600, shot: 'wide', look: 'earth', distKm: 22000, dir: wideDir(15600), fov: 40, vehicle: 'csm', blend: 3 },
  { t: 30000, shot: 'wide', look: 'earth-moon', distKm: 800000, dir: wideDir(60000), fov: 38, vehicle: 'csm', blend: 3 },
  { t: 200000, shot: 'wide', look: 'moon', distKm: 60000, dir: wideDir(250000), fov: 40, vehicle: 'csm', blend: 3 },
  { t: 271000, shot: 'wide', look: 'moon', distKm: 9000, dir: wideDir(272000), fov: 40, vehicle: 'csm', blend: 3 }, { t: T.loi - 80, shot: 'orbit', az: 150, el: 10, dist: 45, lookY: 4, fov: 40, vehicle: 'csm', blend: 2 },
  { t: T.loi1 + 300, shot: 'wide', look: 'moon', distKm: 6000, dir: wideDir(T.loi1), fov: 40, vehicle: 'csm', blend: 3 },
  { t: T.undock - 150, shot: 'orbit', az: 60, el: 15, dist: 40, lookY: 3, fov: 40, vehicle: 'lm', blend: 2 }, { t: T.undock + 600, shot: 'wide', look: 'vehicle', distKm: 600, dir: wideDir(T.undock), fov: 40, vehicle: 'lm', blend: 3 },
  { t: T.pdi - 60, shot: 'chase', offset: [25, 8, -45], lookY: 3, fov: 45, vehicle: 'lm', blend: 2 }, { t: T.land - 120, shot: 'orbit', az: 160, el: 12, dist: 55, lookY: 3, fov: 46, vehicle: 'lm', blend: 2 },
  { t: T.land - 20, shot: 'orbit', az: 200, el: 8, dist: 28, lookY: 3, fov: 48, vehicle: 'lm', blend: 1 }, { t: T.land + 60, shot: 'orbit', az: 210, el: 8, dist: 32, lookY: 3, fov: 48, vehicle: 'lm', spin: 0.3, blend: 2 },
  { t: T.step - 20, shot: 'orbit', az: 100, el: 5, dist: 22, lookY: 2.5, fov: 48, vehicle: 'lm', blend: 2 },
  { t: T.step + 80, shot: 'orbit', az: 140, el: 8, dist: 40, lookY: 3, fov: 46, vehicle: 'lm', spin: 0.2, blend: 2 },
  { t: T.lift - 220, shot: 'orbit', az: 40, el: 6, dist: 28, lookY: 3, fov: 48, vehicle: 'lm', blend: 2 }, { t: T.lift + 25, shot: 'chase', offset: [25, -6, -20], lookY: 2.5, fov: 46, vehicle: 'lm-asc', blend: 1.5 },
  { t: T.insl + 200, shot: 'wide', look: 'vehicle', distKm: 500, dir: wideDir(T.insl), fov: 40, vehicle: 'lm-asc', blend: 3 }, { t: T.dock - 500, shot: 'orbit', az: 120, el: 15, dist: 70, lookY: 3, fov: 42, vehicle: 'lm-asc', blend: 3 },
  { t: T.dock + 200, shot: 'wide', look: 'moon', distKm: 7000, dir: wideDir(T.dock), fov: 40, vehicle: 'csm', blend: 3 },
  { t: T.tei - 120, shot: 'orbit', az: 200, el: 12, dist: 45, lookY: 4, fov: 40, vehicle: 'csm', blend: 2 }, { t: T.tei1 + 400, shot: 'wide', look: 'earth-moon', distKm: 800000, dir: wideDir(T.tei1 + 200000), fov: 38, vehicle: 'csm', blend: 3 },
  { t: 640000, shot: 'wide', look: 'earth', distKm: 60000, dir: wideDir(640000), fov: 40, vehicle: 'csm', blend: 3 },
  { t: T.smsep - 250, shot: 'orbit', az: 20, el: 8, dist: 40, lookY: 4, fov: 40, vehicle: 'csm', blend: 2 }, { t: T.ei - 90, shot: 'chase', offset: [14, -3, 16], lookY: 1.5, fov: 44, vehicle: 'csm', blend: 2 },
  { t: T.ei + 200, shot: 'orbit', az: 160, el: 14, dist: 22, lookY: 1.5, fov: 44, vehicle: 'csm', blend: 2 }, { t: T.drogue - 20, shot: 'orbit', az: 30, el: 10, dist: 150, lookY: 8, fov: 46, vehicle: 'csm', blend: 2 },
  { t: T.main + 50, shot: 'orbit', az: 200, el: 6, dist: 130, lookY: 6, fov: 50, vehicle: 'csm', spin: 0.6, blend: 2 },
];
const caps = [[-9.5, 'ignition'], [0.6, 'liftoff'], [12, 'tower'], [66, 'maxq'], [135.2, 'ceco'], [158.5, 'staging'], [163, 'sii'], [192.3, 'interstage'], [553, 'siicut'], [712, 'parking'],
  [T.tli0, 'tli'], [T.sla, 'sla'], [T.extr, 'extract'], [T.extr + 700, 'coast'], [T.loi - 200, 'loi'], [T.loi1 + 200, 'lunarorbit'], [T.undock, 'undock'], [T.pdi, 'pdi'], [T.land - 60, 'landing'], [T.land, 'landed'],
  [T.step, 'step'], [T.step + 33, 'smallstep'], [T.lift, 'liftoffe'], [T.insl + 100, 'rendezvous'], [T.dock, 'docked'], [T.jett, 'jettison'], [T.tei - 100, 'tei'], [T.tei1 + 300, 'home'], [T.smsep, 'smsep'],
  [T.ei, 'entry'], [T.drogue, 'drogue'], [T.main, 'mains'], [T.splash - 20, 'splash']].map(([t, say]) => ({ t, say }));
const pace = [[-9.5, 12, 1], [12, 130, 8], [130, 170, 4], [170, 200, 4], [200, 560, 18], [560, 720, 12], [720, 9800, 600], [9800, 10260, 25], [10260, 11780, 160], [11780, 14300, 120],
  [14300, 271500, 8000], [271500, 273600, 100], [273600, 359500, 6000], [359500, 365500, 400], [365500, 369140, 160], [369140, 369880, 40], [369880, 369950, 1.5], [369950, 393800, 4000],
  [393800, 393840, 4], [393840, 393910, 1.5], [393910, 447500, 7000], [447500, 447690, 60], [447690, 447780, 3], [447780, 448300, 25], [448300, 460500, 800], [460500, 461100, 20], [461100, 487250, 6000], [487250, 487700, 25],
  [487700, 701200, 9000], [701200, 701900, 25], [701900, 702100, 30], [702100, 702700, 20], [702700, 703115, 12]].map(([from, to, rate]) => ({ from, to, rate }));
let playS = 0; for (const q of pace) playS += (q.to - q.from) / q.rate;
console.log('play time s', playS.toFixed(0));
const nearAt = (id) => [0, 0, 0];
const moment = {
  format: 1, id: 'apollo-11', words: 'apollo-11', wordsFile: 'en.moments.apollo11.js',
  epoch: '1969-07-16T13:32:00Z', span: [-9.5, T.splash], pace, place,
  places: [{ from: T.ei - 300, place: { name: 'Pacific Ocean, 13.3 N 169.2 W', lat: SPLASH.lat, lon: SPLASH.lon, alt: 0, ground: { kind: 'sea' } } }],
  moonSite: { name: 'Tranquility Base', lat: SITE.lat, lon: SITE.lon },
  trajectories: {
    ascent: { kind: 'profile', truth: 'reconstructed', say: 'pathAscent', pitchStart: 13.2, turnS: 30, azimuth: 72.058, points: ASCENT,
      source: 'Apollo 11 Mission Report (NASA MSC-00171, 1969), Table 3-I and section 7.1: the event times; heights and distances between the events are ours' },
    ivb: { kind: 'vectors', truth: 'reconstructed', say: 'pathTrip', frame: 'earth-teme', file: 'paths/apollo-11-ivb.json',
      source: 'parking orbit, translunar injection at 2:44:16 for 5 min 48 s, the CSM and LM pulled out at about 3:57 (Apollo 11 Flight Journal event times); two-body arcs fitted by tools/moments-build/apollo11.mjs' },
    csm: { kind: 'vectors', truth: 'reconstructed', say: 'pathTrip', frame: 'earth-teme', file: 'paths/apollo-11-csm.json',
      source: 'Apollo 11 Flight Journal event times: lunar orbit insertion 75:49:50, trans-Earth injection 135:23:42, entry interface 195:03:06, splashdown 195:18:35 (16:50:35 UTC); Earth-only conics out and home, a circle round the Moon, the entry laid on the splashdown point' },
    lm: { kind: 'vectors', truth: 'reconstructed', say: 'pathLm', frame: 'earth-teme', file: 'paths/apollo-11-lm.json',
      source: 'undocking 100:12:00, descent orbit insertion 101:36, powered descent 102:33:05, landing 102:45:40 at 0.674 N 23.473 E (Apollo 11 Mission Report); the descent is drawn backwards from the landing site' },
    lmasc: { kind: 'vectors', truth: 'reconstructed', say: 'pathLm', frame: 'earth-teme', file: 'paths/apollo-11-lmasc.json',
      source: 'lift-off 124:22:00, orbit insertion 124:29:15, docking 128:03:00, jettison 130:09:31 (Apollo 11 Flight Journal); the rendezvous is a shape, not the mission\'s own manoeuvres' },
  },
  vehicles: [
    { id: 'saturn', model: 'saturn-v', lengthM: 110.6, path: 'ascent', attitude: 'ascent', window: [-9.5, 712], parts: sat.parts, engines: { 's-ic': sat.engines['s-ic'], 's-ii': sat.engines['s-ii'], 's-ivb': sat.engines['s-ivb'] },
      flames: { 's-ic': { kind: 'kerolox', exitM: 3.7 }, 's-ii': { kind: 'hydrolox', exitM: 2.9 }, 's-ivb': { kind: 'hydrolox', exitM: 2.0 } } },
    { id: 'ivb', model: 'saturn-v', lengthM: 110.6, path: 'ivb', attitude: 'prograde', window: [712, T.extr + 700], parts: sat.parts, engines: { 's-ivb': sat.engines['s-ivb'] }, flames: { 's-ivb': { kind: 'hydrolox', exitM: 2.0 } } },
    { id: 'csm', model: 'apollo-csm', colour: 'site', lengthM: 11.0, path: 'csm', attitude: 'retrograde', window: [T.extr, T.splash], parts: csmr.parts,
      phases: [{ t: T.loi - 1500, body: 'moon' }, { t: T.tei - 1500, attitude: 'prograde' }, { t: T.tei1 + 3000, body: 'earth' }, { t: T.smsep - 500, attitude: 'prograde' }, { t: T.smsep + 1, attitude: 'retrograde' }],
      engines: { 'service-module': csmr.engines['service-module'] }, flames: { 'service-module': { kind: 'hypergolic', exitM: 2.1 } },
      chutes: { drogue: { diameterM: 5, count: 2, lineM: 7, at: [0, 10.6, 0], colours: ['#f1efe9', '#f1efe9'], spreadDeg: 10 }, main: { diameterM: 25.4, count: 3, lineM: 30, at: [0, 10.6, 0], colours: ['#e2622a', '#f1efe9'], spreadDeg: 12 } },
      plasma: { radiusM: 1.7, at: [0, 6.1, 0] } },
    { id: 'lm', model: 'lunar-module', colour: 'site', lengthM: 7.04, path: 'lm', attitude: 'prograde', window: [T.extr, T.dock + 600], parts: lmr.parts,
      phases: [{ t: T.loi - 1500, body: 'moon' }, { t: T.pdi - 120, attitude: 'retrograde' }, { t: T.land - 40, attitude: 'vertical' }],
      engines: lmr.engines, flames: { 'descent-stage': { kind: 'hypergolic', exitM: 1.5 }, 'ascent-stage': { kind: 'hypergolic', exitM: 0.8 } } },
    { id: 'lm-asc', model: 'lunar-module', colour: 'site', lengthM: 7.04, path: 'lmasc', attitude: 'prograde', window: [T.lift, T.jett], parts: lmr.parts, body: 'moon',
      engines: lmr.engines, flames: { 'descent-stage': { kind: 'hypergolic', exitM: 1.5 }, 'ascent-stage': { kind: 'hypergolic', exitM: 0.8 } } },
  ],
  tracks: {
    parts,
    camera: cam.sort((a, b) => a.t - b.t),
    captions: caps,
    audio: [{ t: 162.3, sting: 'stage' }, { t: T.land, sting: 'arrive' }, { t: T.step + 33, src: 'audio/a11-small-step.m4a', twin: 'audio/a11-small-step.m4a', gain: 1 }, { t: T.splash, sting: 'end' }],
    effects: [
      { t: -8.9, effect: 'exhaust-cloud', until: 14, axis: [0, 1, 0], count: 600, fire: 's-ic', vehicle: 'saturn' },
      { t: T.ei + 30, effect: 'plasma', until: T.ei + 420, peak: T.ei + 150, vehicle: 'csm' },
    ],
  },
  chapters: [{ t: -9.5, say: 'chIgnition' }, { t: 0.6, say: 'chLiftoff' }, { t: 158, say: 'chStaging' }, { t: 712, say: 'chParking' }, { t: T.tli0 - 30, say: 'chTli' }, { t: T.extr + 700, say: 'chCoast' },
    { t: T.loi - 200, say: 'chLoi' }, { t: T.undock - 150, say: 'chUndock' }, { t: T.pdi - 60, say: 'chDescent' }, { t: T.land, say: 'chSurface' }, { t: T.lift - 220, say: 'chAscent' }, { t: T.dock - 500, say: 'chDock' },
    { t: T.tei - 120, say: 'chTei' }, { t: T.smsep - 250, say: 'chEntry' }, { t: T.drogue - 20, say: 'chSplash' }],
  sources: [
    { say: 'srcReport', url: 'https://ntrs.nasa.gov/citations/19700008096' },
    { say: 'srcJournal', url: 'https://www.nasa.gov/history/afj/ap11fj/' },
    { say: 'srcClip', url: 'https://commons.wikimedia.org/wiki/File:Neil_Armstrong_small_step.wav' },
  ],
};
writeFileSync(OUT + 'apollo-11.json', JSON.stringify(moment, null, 1).replace(/\n\s+/g, (m) => (m.length > 40 ? m : ' ')) + '\n');
console.log('apollo-11.json written');
