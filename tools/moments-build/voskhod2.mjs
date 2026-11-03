// tools/moments-build/voskhod2.mjs -- Voskhod 2, 18 to 19 March 1965 (release 1.7.1, internal #1058).
// Writes site/data/moments/voskhod-2.json and paths/voskhod-2-orbit.json. `node tools/moments-build/voskhod2.mjs`.
//
// WHAT IS FLOWN, from the published accounts (Wikipedia "Voskhod 2" and "Voskhod (rocket)", read 3 November 2026; Sven Grahn, "The Voskhod 2
// mission revisited", planet4589.org, which cites General Kamanin's diary): lift-off 07:00:00 UTC on 18 March 1965 from Site 1 at Baikonur;
// the strap-on blocks burn 119 s, the shroud goes at about 2.5 minutes, the core burns 301 s and the third stage (Blok I) 240 s; orbit
// 167 by 475 km at 64.8 degrees, 90.9 minutes. The Volga airlock was inflated in orbit; Leonov's EVA: airlock depressurised 08:28:13, hatch
// opened 08:32:54, out 08:34:51, back in 08:47:00, hatch shut 08:48:40, repressurised 08:51:54 (12 min 9 s outside, 5.35 m umbilical). The
// automatic landing system did not take its orders in revolution 16 (command "6" did not go through); on 19 March the ground radioed the
// manual descent at 07:16 UT; Belyayev oriented the ship by the Vzor and fired the retro by hand a revolution later, and it was 46 s late
// because the two men in their suits could not get back to their seats in time; the landing was at 09:02:17 UT near 59.57 N 55.47 E in the
// taiga north-east of Perm, some 386 km from the intended field. ILLUSTRATIVE or ours: the heights and distances between the ascent's
// events, the time the Volga was inflated, the manual retrofire's clock (45 minutes before the landing, the least extra burn to reach the published landing) and where on the
// orbit it was, the entry's heights, the drift under the canopy; Leonov's pose (a still of the film), the camera shots.
// NOT DRAWN: the soft-landing rocket's burn at 1 m, the ejected hatch, Belyayev inside.
import { writeFileSync } from 'node:fs';
import * as L from './lib.mjs';
import { monotoneCubic } from '../../site/js/moments/format.js';
import { siderealAt } from '../../site/js/moments/trajectory.js';
const { cross, sub, len, norm, dot, MU, EARTH_R, DEG } = L;
const OUT = new URL('../../site/data/moments/', import.meta.url).pathname;
const MODELS = new URL('../../site/models/', import.meta.url).pathname;
const epochMs = Date.parse('1965-03-18T07:00:00Z');
const clock = (iso) => (Date.parse(iso) - epochMs) / 1000;
const place = { name: 'Baikonur, Site 1 (Gagarin\'s Start)', lat: 45.9203, lon: 63.3422, alt: 90, azimuth: 37.8, ground: { kind: 'land', pad: true } };
const frame = L.placeFrame(place);

// --- the published clock
const T_STRAP = 119, T_SHROUD = 150, T_CORE = 301, T_INS = 545;
const T_EVA_DEPRESS = clock('1965-03-18T08:28:13Z'), T_EVA_HATCH = clock('1965-03-18T08:32:54Z'), T_EVA_OUT = clock('1965-03-18T08:34:51Z');
const T_EVA_IN = clock('1965-03-18T08:47:00Z'), T_EVA_SHUT = clock('1965-03-18T08:48:40Z'), T_EVA_REPRESS = clock('1965-03-18T08:51:54Z');
const T_LAND = clock('1965-03-19T09:02:17Z');
const T_DEPLOY = clock('1965-03-18T08:13:00Z');      // ours: the Volga takes 7 minutes to inflate
const T_JETTISON = clock('1965-03-18T08:56:00Z');    // ours: after the repressurisation
const T_MANUAL_CALL = clock('1965-03-19T07:16:00Z'); // the ground's order, as heard by the listeners in the West
const T_AUTO = clock('1965-03-19T07:10:00Z');        // ours, near: "quite some time" before the 07:16 call
const T_END = T_LAND + 40;

// --- the ascent: a profile (t s, altitude km, downrange km); the published events, the distances between them approximate
const ASCENT_FIXED = [[-10, 0, 0], [0.6, 0, 0], [10, 0.3, 0], [30, 3, 0.5], [60, 11, 4], [90, 27, 22], [119, 48, 60], [150, 72, 140], [220, 118, 400], [301, 150, 800], [400, 172, 1450], [480, 177, 2030]];
const el = (s) => { const r = len(s.r), v = len(s.v), a = 1 / (2 / r - v * v / MU), h = cross(s.r, s.v), e = Math.sqrt(Math.max(0, 1 - len(h) ** 2 / (MU * a))); return { perigeeKm: +((a * (1 - e) - EARTH_R) / 1e3).toFixed(1), apogeeKm: +((a * (1 + e) - EARTH_R) / 1e3).toFixed(1), incl: +(Math.acos(h[2] / len(h)) / DEG).toFixed(2), periodMin: +(2 * Math.PI * Math.sqrt(a ** 3 / MU) / 60).toFixed(2), alt: +((r - EARTH_R) / 1e3).toFixed(1) }; };
const insertion = (R, az = 37.8) => {
  const pts = [...ASCENT_FIXED, [T_INS, 177, R]];
  const tr = L.profileTrack({ points: pts, azimuth: az }, place);
  return { pts, tr, s: L.profileInertial(epochMs, tr, frame, T_INS) };
};
// the last point's downrange is found so that the orbit's far point is the published 475 km (the speed at the end is what it sets)
// the heading that gives the published 64.8 degrees, then the last downrange that makes the far point the published 475 km
let azLo = 30, azHi = 50;
for (let i = 0; i < 40; i += 1) { const mid = (azLo + azHi) / 2; (el(insertion(2516, mid).s).incl > 64.8 ? (azLo = mid) : (azHi = mid)); }
const AZ = +((azLo + azHi) / 2).toFixed(2);
place.azimuth = AZ;
let lo = 2440, hi = 2600;
for (let i = 0; i < 60; i += 1) { const mid = (lo + hi) / 2; (el(insertion(mid, AZ).s).apogeeKm < 475 ? (lo = mid) : (hi = mid)); }
const ins = insertion((lo + hi) / 2, AZ);
const ASCENT = ins.pts.map((p) => [p[0], p[1], Math.round(p[2] * 10) / 10]);
const track = L.profileTrack({ points: ASCENT, azimuth: AZ }, place);
const s0 = L.profileInertial(epochMs, track, frame, T_INS);
console.log('orbit at insertion (published 167 by 475 km, 64.8 degrees, 90.9 min)', el(s0), 'last downrange', ASCENT[ASCENT.length - 1][2]);
// The oblateness's drift of the node, as modelled here, is good to a degree or two over a day; the node is turned a little more, evenly, until the
// path meets the landing site (DNODE, found below), which is the honest size of this reconstruction's error and is printed.
let DNODE = 0, DTIME = 0;
const rotZ = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a), v[2]];
const orbitAt = (t) => {
  const k = L.j2Kepler(s0.r, s0.v, (t - T_INS) * (1 + DTIME / (T_LAND - T_INS)));
  if (!DNODE) return k;
  const a = DNODE * DEG * (t - T_INS) / (T_LAND - T_INS), w = DNODE * DEG / (T_LAND - T_INS);
  const r = rotZ(k.r, a), v = rotZ(k.v, a);
  return { r, v: [v[0] - w * r[1], v[1] + w * r[0], v[2]] };
};

// --- the landing, the entry point and the manual retrofire
const LAND = { lat: 59.5667, lon: 55.4667 };
const EI = L.destination(LAND.lat, LAND.lon, 237, 1100);
const T_EI = T_LAND - 1000, T_EJECT = T_LAND - 670;   // T_EJECT: the end of the fire: 7 km up, the canopy
const geoOf = (r, t) => { const th = Math.atan2(r[1], r[0]) - siderealAt(epochMs, t); return { lat: Math.asin(r[2] / len(r)) / DEG, lon: ((((th / DEG) % 360) + 540) % 360) - 180 }; };
const gEI = L.groundState(epochMs, EI.lat, EI.lon, 100e3, T_EI);
// the retrofire: 45 s of the KTDU-60 (about 140 m/s); its clock is found where the way to the entry point costs least
const RETRO_S = 45;
let best = null;
for (let dn = -6; dn <= 6.001; dn += 0.5) for (let dt = -900; dt <= 900; dt += 30) for (let tr0 = T_LAND - 2700; tr0 <= T_LAND - 1500; tr0 += 30) {
  DNODE = dn; DTIME = dt;
  const a = orbitAt(tr0), b = L.j2Kepler(a.r, a.v, RETRO_S);
  const lam = L.lambert(b.r, gEI.r, T_EI - (tr0 + RETRO_S), MU, cross(b.r, b.v));
  const dv = len(sub(lam.v1, b.v));
  if (!best || dv < best.dv) best = { tr0, dv, lam, a, b, dn, dt };
}
DNODE = best.dn; DTIME = best.dt;
const T_RETRO = best.tr0, T_RETRO_END = best.tr0 + RETRO_S;
console.log('node turned a further', DNODE, 'degrees and the clock moved', DTIME, 's over the day; manual retrofire at', new Date(epochMs + T_RETRO * 1000).toISOString(), 'over', geoOf(best.a.r, T_RETRO), 'extra dv m/s', best.dv.toFixed(0), 'landing minus retro s', T_LAND - T_RETRO);
const sR0 = best.a, sR1 = { r: best.b.r, v: best.b.v };
const lam = best.lam;
sR1.v = lam.v1;

// --- entry (Earth-fixed along the great circle) and the descent under the canopy
const ENTRY_ALT = [[0, 100], [40, 88], [80, 70], [120, 52], [160, 38], [200, 28], [240, 20], [290, 12], [330, 7]];
const ENTRY_RNG = [[0, 0], [40, 315], [80, 600], [120, 810], [160, 930], [200, 1000], [240, 1040], [290, 1075], [330, 1090]];
const mono = (pts) => { const f = monotoneCubic(pts.map((p) => p[0]), pts.map((p) => p[1])); return (x) => f(x).y; };
const entryAlt = mono(ENTRY_ALT), entryRng = mono(ENTRY_RNG);
const rad = (x) => x * DEG;
const distKm = (a, b) => 6371.0088 * Math.acos(Math.min(1, Math.sin(rad(a.lat)) * Math.sin(rad(b.lat)) + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon))));
const bearing = (a, b) => { const p1 = rad(a.lat), p2 = rad(b.lat), dl = rad(b.lon - a.lon); return (Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) / DEG + 360) % 360; };
const START = L.destination(LAND.lat, LAND.lon, 237, 0.6);   // the canopy comes down almost straight: the wind's drift is 0.6 km
const GROUND_M = 150;                                          // the place's height (the ground is drawn there)
const brg = bearing(EI, START), totalKm = distKm(EI, START);
const entryPos = (t) => { const p = L.destination(EI.lat, EI.lon, brg, Math.min(1, entryRng(t - T_EI) / 1090) * totalKm); return L.groundPos(epochMs, p.lat, p.lon, entryAlt(t - T_EI) * 1000 + GROUND_M, t); };
const entryAt = L.diffState(entryPos);
const DESCENT = [[T_EJECT, 7.0], [T_EJECT + 40, 6.2], [T_EJECT + 160, 3.2], [T_EJECT + 400, 1.0], [T_EJECT + 600, 0.2], [T_LAND, 0.0]];
const lerpGround = (a, b, u) => ({ lat: a.lat + (b.lat - a.lat) * u, lon: a.lon + (b.lon - a.lon) * u });
const shipDown = L.diffState((t) => { const u = (t - T_EJECT) / (T_LAND - T_EJECT); const p = lerpGround(START, LAND, u); return L.groundPos(epochMs, p.lat, p.lon, mono(DESCENT)(t) * 1000 + GROUND_M, t); });
console.log('entry bearing', brg.toFixed(1), 'EI to landing km', totalKm.toFixed(0), 'retro-to-EI lambert arrival m/s', len(lam.v2).toFixed(0), 'join EI', len(sub(lam.v2, entryAt(T_EI).v)).toFixed(0), 'ejection join', len(sub(entryAt(T_EJECT).v, shipDown(T_EJECT).v)).toFixed(0));
const segs = [
  { from: T_INS, to: T_RETRO, at: orbitAt, step: (t) => L.arcStep(len(orbitAt(t).r), len(orbitAt(t).v), 6, 150) },
  { from: T_RETRO, to: T_RETRO_END, at: (t) => L.hermite(sR0, sR1, T_RETRO, T_RETRO_END, t), step: () => 3 },
  { from: T_RETRO_END, to: T_EI, at: (t) => L.kepler(sR1.r, lam.v1, t - T_RETRO_END), step: (t) => L.arcStep(len(L.kepler(sR1.r, lam.v1, t - T_RETRO_END).r), 7500, 4, 120) },
  { from: T_EI, to: T_EJECT, at: entryAt, step: () => 5 },
  { from: T_EJECT, to: T_LAND, at: shipDown, step: () => 10 },
];
L.save(OUT + 'paths/voskhod-2-orbit.json', L.rowsOf(segs), 'Voskhod 2 from its orbit insertion (T+545 s) to the landing in the taiga; reconstructed by tools/moments-build/voskhod2.mjs: a conic with the J2 drift, the manual retrofire, the entry and the canopy. Earth-inertial (TEME) km and km/s.');

// --- the models: where things are, from the files themselves
const box3 = L.glbBox(MODELS + 'voskhod-3kd.glb'), boxL = L.glbBox(MODELS + 'leonov-eva.glb');
const H3 = +(box3.max[1] - box3.min[1]).toFixed(3), HL = +(boxL.max[1] - boxL.min[1]).toFixed(3);
const MOUTH = [-3.743, 3.776, 0], AXIS = [-0.9903, 0.1392, 0], TETHER_END = [-8.714, 4.475, -0.58], RING = [0.116, -0.124, -0.217];
const spinZ = (v, deg) => { const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; };
// Leonov out: along the airlock's axis, head outward, his tether ring on the end of the umbilical (his foot is the model's base, y = 0 after the stand)
const ringOut = spinZ([RING[0], RING[1] - boxL.min[1], RING[2]], 82);
const AT_OUT = TETHER_END.map((x, i) => +(x - ringOut[i]).toFixed(3));
// Leonov back in: head first, his head at the mouth of the airlock, the body along the axis
const headIn = [MOUTH[0] + AXIS[0] * 0.3, MOUTH[1] + AXIS[1] * 0.3, 0], bodyIn = spinZ([0, HL, 0], -98);
const AT_IN = headIn.map((x, i) => +(x - bodyIn[i]).toFixed(3));

// --- the moment
const reg = L.registryRow('r7-8k72k');
const quad = (x, z) => reg.engines['boosters-4'].filter((p) => Math.sign(p[0]) === x && Math.sign(p[2]) === z);
const B = { 'booster-b': [1, 1], 'booster-v': [-1, 1], 'booster-g': [-1, -1], 'booster-d': [1, -1] };
const boosterEngines = Object.fromEntries(Object.entries(B).map(([k, [x, z]]) => [k, quad(x, z)]));
const SHIP_PARTS = ['vk-im', 'vk-sphere', 'vk-hatch', 'vk-antennas', 'vk-retro', 'volga-stowed', 'volga', 'volga-hatch-open', 'umbilical'];
const ev = (t, part, action, extra = {}) => ({ t, part, action, vehicle: 'rocket', ...extra });
const sh = (t, part, action, extra = {}) => ({ t, part, action, vehicle: 'ship', ...extra });
const parts = [];
for (const b of Object.keys(B)) parts.push(ev(-9, b, 'ignite', { rampS: 8 }));
parts.push(ev(-9, 'core-stage', 'ignite', { rampS: 8 }));
for (const [b, [x, z]] of Object.entries(B)) {
  parts.push(ev(T_STRAP, b, 'cutoff'));
  parts.push(ev(T_STRAP + 0.4, b, 'separate', { dv: [4 * x, -3, 4 * z], spin: [0.05 * z, 0, -0.05 * x] }));
}
parts.push(ev(T_SHROUD, 'fairing', 'separate', { dv: [0.6, 3.0, 0], spin: [0.15, 0, 0.1] }));
parts.push(ev(T_CORE, 'core-stage', 'cutoff'));
parts.push(ev(T_CORE + 0.5, 'core-stage', 'separate', { dv: [0.3, -4, 0.3], spin: [0.03, 0, 0.02] }));
parts.push(ev(T_CORE + 1, 'blok-e', 'ignite', { rampS: 3 }));
parts.push(ev(T_INS, 'blok-e', 'cutoff'));
// the spacecraft rides under the shroud: out of sight until it goes (the Vostok shroud is the stand-in for the 11A57's); its airlock is folded
for (const p of SHIP_PARTS) parts.push({ t: -10, part: p, action: 'hide', vehicle: 'ship-up' });
for (const p of ['vk-im', 'vk-sphere', 'vk-hatch', 'vk-retro', 'volga-stowed']) parts.push({ t: T_SHROUD, part: p, action: 'show', vehicle: 'ship-up' });
// on its own: the airlock stowed, then inflated; the umbilical goes out with Leonov; the airlock is let go after the repressurisation
for (const p of ['volga', 'umbilical', 'volga-hatch-open']) parts.push(sh(T_INS, p, 'hide'));
parts.push(sh(T_DEPLOY, 'volga-stowed', 'hide'), sh(T_DEPLOY, 'volga', 'show'));
parts.push(sh(T_EVA_HATCH, 'umbilical', 'show'), sh(T_EVA_IN + 20, 'umbilical', 'hide'));
parts.push(sh(T_JETTISON, 'volga', 'separate', { dv: [-1.0, 0.15, 0.1], spin: [0.05, 0.02, 0.12] }));
parts.push(sh(T_JETTISON + 90, 'volga', 'hide'));
parts.push(sh(T_RETRO, 'vk-im', 'ignite', { rampS: 1 }), sh(T_RETRO_END, 'vk-im', 'cutoff'));
parts.push(sh(T_EI - 10, 'vk-im', 'separate', { dv: [0, -2.5, 0.8], spin: [0.25, 0.1, 0.4] }), sh(T_EI + 50, 'vk-im', 'hide'));
parts.push(sh(T_EJECT, 'drogue', 'deploy', { reefS: 3, openS: 2 }), sh(T_EJECT + 90, 'main', 'deploy', { reefS: 4, openS: 3 }));
parts.sort((a, b) => a.t - b.t);

const pace = [[-10, 20, 1], [20, 119, 6], [119, 160, 3], [160, 305, 8], [305, 560, 6], [560, 4300, 200], [4300, T_EVA_DEPRESS - 20, 14], [T_EVA_DEPRESS - 20, T_EVA_OUT - 10, 5],
  [T_EVA_OUT - 10, T_EVA_IN + 30, 6], [T_EVA_IN + 30, T_EVA_REPRESS + 20, 6], [T_EVA_REPRESS + 20, T_JETTISON - 15, 20], [T_JETTISON - 15, T_JETTISON + 60, 3], [T_JETTISON + 60, T_AUTO - 120, 1400],
  [T_AUTO - 120, T_AUTO + 120, 20], [T_AUTO + 120, T_RETRO - 150, 90], [T_RETRO - 150, T_RETRO + 80, 5], [T_RETRO + 80, T_EI - 40, 25], [T_EI - 40, T_EJECT, 5], [T_EJECT, T_EJECT + 140, 3], [T_EJECT + 140, T_END, 14]]
  .map(([from, to, rate]) => ({ from: Math.round(from), to: Math.round(to), rate }));
let play = 0; for (const q of pace) play += (q.to - q.from) / q.rate;
console.log('play time s', play.toFixed(0));
const moment = {
  format: 1, id: 'voskhod-2', words: 'voskhod-2', wordsFile: 'en.moments.voskhod.js',
  epoch: '1965-03-18T07:00:00Z', span: [-10, Math.round(T_END)], pace, place,
  places: [{ from: Math.round(T_EI - 60), place: { name: 'The taiga north-east of Perm', lat: LAND.lat, lon: LAND.lon, alt: 150, ground: { kind: 'land' } } }],
  trajectories: {
    ascent: { kind: 'profile', truth: 'reconstructed', say: 'pathAscent', pitchStart: 10, turnS: 110, azimuth: AZ, points: ASCENT,
      source: 'the published event times (strap-ons 119 s, shroud about 150 s, core 301 s, third stage 240 s) as Wikipedia, "Voskhod (rocket)" and "Voskhod 2", give them, read 3 November 2026; heights and distances between the events, and the azimuth for a 64.8 degree orbit, are ours' },
    orbit: { kind: 'vectors', truth: 'reconstructed', say: 'pathOrbit', frame: 'earth-teme', file: 'paths/voskhod-2-orbit.json',
      source: 'orbit of 167 by 475 km at 64.8 degrees and 90.9 minutes (Wikipedia, "Voskhod 2") drifted by the Earth\'s oblateness for 26 hours; the manual retrofire 45 minutes before the published landing (09:02:17 UT, 59.57 N 55.47 E), its clock and place ours; the entry and the canopy drawn between; arcs fitted by tools/moments-build/voskhod2.mjs' },
  },
  vehicles: [
    { id: 'rocket', model: 'r7-8k72k', lengthM: 38.246, path: 'ascent', attitude: 'ascent', window: [-10, T_INS + 20], parts: [...Object.keys(B), 'core-stage', 'blok-e', 'fairing'],
      engines: { ...boosterEngines, 'core-stage': reg.engines['core-stage'], 'blok-e': reg.engines['blok-e'] },
      flames: { ...Object.fromEntries(Object.keys(B).map((k) => [k, { kind: 'kerolox', exitM: 0.9 }])), 'core-stage': { kind: 'kerolox', exitM: 0.9 }, 'blok-e': { kind: 'kerolox', exitM: 1.0 } } },
    { id: 'ship-up', model: 'voskhod-3kd', lengthM: H3, keepXZ: true, rideOn: { vehicle: 'rocket', at: [0, 32, 0] }, attitude: 'ascent', window: [-10, T_INS], parts: SHIP_PARTS, marker: false },
    { id: 'ship', model: 'voskhod-3kd', lengthM: H3, keepXZ: true, path: 'orbit', attitude: 'prograde', window: [T_INS, T_END], colour: 'station', parts: SHIP_PARTS,
      phases: [{ t: T_RETRO - 240, attitude: 'retrograde' }],
      engines: { 'vk-im': [[0, 0, 0]] }, flames: { 'vk-im': { kind: 'hypergolic', exitM: 0.45 } },
      chutes: { drogue: { diameterM: 2.4, count: 1, lineM: 6, at: [0, 4.9, 0], colours: ['#d9d4c8', '#d9d4c8'] },
        main: { diameterM: 27, count: 1, lineM: 24, at: [0, 4.9, 0], colours: ['#c8321e', '#e6e1d4'], spreadDeg: 0 } },
      plasma: { radiusM: 1.25, at: [0, 3.25, 0] } },
    { id: 'leonov', model: 'leonov-eva', lengthM: HL, keepXZ: true, rideOn: { vehicle: 'ship', at: AT_OUT, spin: [0, 0, 82] }, attitude: 'prograde', window: [T_EVA_OUT, T_EVA_IN - 80], parts: ['leonov-suit', 'leonov-pack'], colour: 'station' },
    { id: 'leonov-in', model: 'leonov-eva', lengthM: HL, keepXZ: true, rideOn: { vehicle: 'ship', at: AT_IN, spin: [0, 0, -98] }, attitude: 'prograde', window: [T_EVA_IN - 80, T_EVA_IN], parts: ['leonov-suit', 'leonov-pack'], colour: 'station', marker: false },
  ],
  tracks: {
    parts,
    camera: [
      { t: -10, shot: 'pad', at: [120, -95, 3], lookY: 17, fov: 42, vehicle: 'rocket' },
      { t: -3, shot: 'pad', at: [75, -45, 4], lookY: 9, fov: 54, vehicle: 'rocket' },
      { t: 4, shot: 'track', at: [-900, -700, 10], lookY: 18, fill: 0.55, fovMin: 0.6, fovMax: 20, vehicle: 'rocket' },
      { t: 22, shot: 'chase', offset: [90, -30, -80], lookY: 15, fov: 40, blend: 1.5, vehicle: 'rocket' },
      { t: 108, shot: 'chase', offset: [60, -25, -48], lookY: 12, fov: 46, vehicle: 'rocket' },
      { t: 140, shot: 'orbit', az: 120, el: 8, dist: 95, lookY: 14, fov: 40, spin: 2, vehicle: 'rocket' },
      { t: 170, shot: 'chase', offset: [120, -60, -100], lookY: 14, fov: 46, blend: 1.0, vehicle: 'rocket' },
      { t: 285, shot: 'orbit', az: 60, el: 5, dist: 75, lookY: 10, fov: 42, vehicle: 'rocket' },
      { t: 320, shot: 'chase', offset: [150, -40, -120], lookY: 8, fov: 42, blend: 1.0, vehicle: 'rocket' },
      { t: 520, shot: 'orbit', az: 95, el: 12, dist: 40, lookY: 32, fov: 42, vehicle: 'rocket', blend: 2 },
      { t: T_INS + 3, shot: 'chase', offset: [-9, 3.5, 11], lookY: 3.4, fov: 44, vehicle: 'ship', blend: 1.5 },
      { t: 700, shot: 'globe', altKm: 2600, backKm: 2200, fov: 46, vehicle: 'ship', blend: 3 },
      { t: T_DEPLOY - 30, shot: 'chase', offset: [-8, 3, 9], lookY: 3.5, fov: 46, vehicle: 'ship', blend: 2 },
      { t: T_EVA_DEPRESS - 20, shot: 'chase', offset: [-11, 4.5, 8], lookY: 3.8, fov: 46, vehicle: 'ship', blend: 2 },
      { t: T_EVA_OUT - 8, shot: 'onboard', at: [-4.5, 4.4, 24], dir: [0, 0, -24], upv: [1, 0, 0], fov: 58, vehicle: 'ship', blend: 1.5 },
      { t: T_EVA_OUT + 200, shot: 'onboard', at: [-9.2, 5.6, 6.5], dir: [2.4, -1.2, -6.9], upv: [1, 0, 0], fov: 40, vehicle: 'ship', blend: 2.5 },
      { t: T_EVA_OUT + 460, shot: 'globe', altKm: 1600, backKm: 1800, fov: 46, vehicle: 'ship', blend: 3 },
      { t: T_EVA_IN - 85, shot: 'onboard', at: [-8.2, 5.6, 6.5], dir: [3.2, -1.5, -6.5], upv: [1, 0, 0], fov: 40, vehicle: 'ship', blend: 1.5 },
      { t: T_EVA_SHUT, shot: 'chase', offset: [-9, 3, 7], lookY: 3.8, fov: 46, vehicle: 'ship', blend: 2 },
      { t: T_JETTISON - 10, shot: 'chase', offset: [-5, 5, 12], lookY: 3.6, fov: 46, vehicle: 'ship', blend: 1.5 },
      { t: T_JETTISON + 70, shot: 'globe', altKm: 2400, backKm: 2400, fov: 46, vehicle: 'ship', blend: 3 },
      { t: T_AUTO - 40, shot: 'globe', altKm: 3000, backKm: 2000, fov: 48, vehicle: 'ship', blend: 3 },
      { t: T_RETRO - 140, shot: 'chase', offset: [7, 3, 11], lookY: 2.4, fov: 44, vehicle: 'ship', blend: 2 },
      { t: T_RETRO_END + 30, shot: 'globe', altKm: 1800, backKm: 2500, fov: 46, vehicle: 'ship', blend: 3 },
      { t: T_EI - 60, shot: 'chase', offset: [16, 5, -12], lookY: 2, fov: 42, vehicle: 'ship', blend: 2 },
      { t: T_EI + 120, shot: 'orbit', az: 200, el: 12, dist: 16, lookY: 1.6, fov: 42, vehicle: 'ship', blend: 2 },
      { t: T_EJECT - 5, shot: 'chase', offset: [18, -4, -14], lookY: 2, fov: 46, vehicle: 'ship', blend: 1.5 },
      { t: T_EJECT + 140, shot: 'orbit', az: 40, el: 10, dist: 90, lookY: 1, fov: 46, vehicle: 'ship', spin: 0.8, blend: 2 },
      { t: T_LAND - 120, shot: 'orbit', az: 200, el: 6, dist: 45, lookY: 1.5, fov: 50, vehicle: 'ship', blend: 2 },
    ],
    captions: [
      { t: -10, say: 'ready' }, { t: 0.6, say: 'liftoff' }, { t: T_STRAP, say: 'boosters' }, { t: T_SHROUD, say: 'shroud' }, { t: T_CORE, say: 'core' }, { t: T_INS - 5, say: 'orbit' },
      { t: T_DEPLOY, say: 'volga' }, { t: T_EVA_DEPRESS, say: 'depress' }, { t: T_EVA_HATCH, say: 'hatch' }, { t: T_EVA_OUT, say: 'out' }, { t: T_EVA_OUT + 150, say: 'tether' }, { t: T_EVA_OUT + 420, say: 'swell' },
      { t: T_EVA_IN - 80, say: 'back' }, { t: T_EVA_IN + 5, say: 'inside' }, { t: T_EVA_REPRESS, say: 'repress' }, { t: T_JETTISON, say: 'jettison' }, { t: T_AUTO - 20, say: 'auto' }, { t: T_MANUAL_CALL, say: 'manual' },
      { t: T_RETRO - 20, say: 'late' }, { t: T_RETRO + 5, say: 'retro' }, { t: T_EI - 10, say: 'wires' }, { t: T_EI + 60, say: 'entry' }, { t: T_EJECT + 30, say: 'chutes' }, { t: T_LAND - 25, say: 'landing' }, { t: T_LAND + 8, say: 'taiga' },
    ],
    audio: [],
    effects: [
      { t: -9, effect: 'exhaust-cloud', until: 14, axis: [0, 1, 0], count: 500, fire: 'core-stage', vehicle: 'rocket' },
      { t: T_EI + 5, effect: 'plasma', until: T_EI + 200, peak: T_EI + 50, vehicle: 'ship' },
    ],
  },
  chapters: [{ t: -10, say: 'chPad' }, { t: 0.6, say: 'chAscent' }, { t: T_INS, say: 'chOrbit' }, { t: T_EVA_DEPRESS - 20, say: 'chEva' }, { t: T_EVA_IN - 80, say: 'chBack' }, { t: T_AUTO - 20, say: 'chFail' },
    { t: T_RETRO - 20, say: 'chRetro' }, { t: T_EI - 10, say: 'chEntry' }, { t: T_LAND - 25, say: 'chLand' }],
  sources: [
    { say: 'srcWiki', url: 'https://en.wikipedia.org/wiki/Voskhod_2' },
    { say: 'srcRocket', url: 'https://en.wikipedia.org/wiki/Voskhod_(rocket)' },
    { say: 'srcGrahn', url: 'https://planet4589.org/space/archive/sven/histind/Voskhod2/Voskhod2.htm' },
    { say: 'srcNssdc', url: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1965-022A' },
  ],
  audio_note: 'No radio recording plays. The Soviet-era recordings of Voskhod 2 (the crew\'s voice, TASS and Radio Moscow) are Roscosmos or state-broadcast archive material; no file with a clear free licence was found on Wikimedia Commons, NASA, the Internet Archive\'s public-domain collections or the sources cited (searched 3 November 2026). The words are captions.',
};
writeFileSync(OUT + 'voskhod-2.json', JSON.stringify(moment, null, 1).replace(/\n\s+/g, (m) => (m.length > 40 ? m : ' ')) + '\n');
console.log('voskhod-2.json written; times', { T_DEPLOY, T_EVA_OUT, T_EVA_IN, T_JETTISON, T_AUTO, T_RETRO, T_EI, T_EJECT, T_LAND });
