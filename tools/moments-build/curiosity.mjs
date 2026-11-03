// tools/moments-build/curiosity.mjs -- Curiosity's entry, descent and landing, 6 August 2012 (release 1.7.9, internal #1058).
// Writes site/data/moments/curiosity-edl.json. `node tools/moments-build/curiosity.mjs`.
//
// WHAT IS PUBLISHED (all read 3 November 2026):
//  - JPL, "Timeline of Major Mission Events During Curiosity's Landing" (jpl.nasa.gov/news/timeline-of-major-mission-events-during-curiositys-landing):
//    at Mars, in PDT: atmospheric entry 10:10:45.7 PM, parachute deploy 10:15:04.9, heat shield separation 10:15:24.6, rover separation from the
//    descent stage 10:17:38.6, touchdown 10:17:57.3; received on Earth 13 min 48 s later (10:31:45.4 PM). PDT is UTC-7, so entry is
//    05:10:45.7 UTC and touchdown 05:17:57.3 UTC on 6 August; the moment's T-0 is the entry.
//  - NASA/JPL, Mars Science Laboratory Landing press kit, July 2012 (Wikimedia Commons, 'MSL Press Kit.pdf', public domain), the typical-case
//    profile: entry interface at a radius of 3 522.2 km, 131.1 km over the landing site's ground, at 5 900 m/s; cruise stage off at entry minus
//    10 minutes; peak heating about 80 s after entry (3 800 F, 2 100 C), peak deceleration about 10 s later; parachute at about 11 km and 405 m/s;
//    heat shield off at about 8 km and 125 m/s; back shell off about 80 s later at about 1.6 km and 80 m/s, the eight landing engines lit;
//    rover separation at about 20 m and 0.75 m/s; touchdown at about 0.75 m/s; the descent stage flies off to land at least 150 m away.
//    Mid-afternoon at the site, about 3 p.m. local mean solar time.
//  - Wikipedia, "Mars Science Laboratory": the 16 m parachute, 80 lines each over 50 m, the 7.6 m bridle of three nylon cords, the descent stage's
//    eight hydrazine engines of 400 to 3 100 N, and the descent stage's crash 650 m away.
//  - Sell et al., "Powered Flight Design and Reconstructed Performance Summary for the Mars Science Laboratory Mission" (AAS 13-424, NTRS
//    20150007794): the 300 m divert that keeps the descent stage clear of the back shell and the parachute, 85 m/s to 0.75 m/s, the 7.5 m bridle.
//  - Bradbury Landing (Gale crater) 4.5895 S, 137.4417 E (registry/sites.yaml `gale`).
// WHAT IS OURS: the path between the events. Entry: a point mass on a round Mars (a lift fraction and an entry angle searched for so that it is at
// the published parachute altitude and speed at the published second; the peak of its deceleration then falls where the press kit puts it, which
// is printed below). After the parachute the heights are the published ones joined by a monotone curve, the along-track distance follows from the
// published speeds, the heading is the great circle from the entry point to the site (the real one is not published in what was read). The
// descent stage's flyaway, the heat shield's fall, the back shell's drift are illustrative.
import { writeFileSync } from 'node:fs';
import { monotoneCubic } from '../../site/js/moments/format.js';

const OUT = new URL('../../site/data/moments/', import.meta.url).pathname;
const DEG = Math.PI / 180;
const R = 3391100, GM = 4.282837e13;                       // Mars: the radius of the ground at the site (the press kit: 3 522.2 km minus 131.1 km), the NASA fact sheet's GM (m^3/s^2)
const GALE = { lat: -4.5895, lon: 137.4417 };
const epoch = '2012-08-06T05:10:45.7Z';                    // entry interface (JPL: 10:10:45.7 PM PDT)

// --- the published seconds from entry (JPL timeline, UTC = PDT + 7 h)
const T = { cruise: -600, start: -30, entry: 0, chute: 259.2, shield: 278.9, bs: 358.9, rover: 412.9, down: 431.6, cut: 433.6, end: 456 };
// 358.9 = shield + 80 s: the press kit's "about 80 seconds after heat shield separation" (the only time here that is not the JPL table's)
const H0 = 131100, V0 = 5900;                              // entry interface: height over the site's ground and speed (press kit)

// --- the entry as a point mass, to the parachute
function entry(g0deg, lift, dt = 0.05, upTo = T.chute, sc = 0.8) {
  const rho0 = 0.0297 * sc, H = 10800, bc = 140;           // the density at the site's ground, a scale height, m / (Cd A) in kg/m^2
  let h = H0, v = V0, g = g0deg * DEG, s = 0, t = 0, amax = 0, tmax = 0;
  const rows = [[0, h, s, v, 0]];
  while (t < upTo - 1e-9) {
    const d = Math.min(dt, upTo - t);
    const r = R + h, grav = GM / (r * r);
    const drag = 0.5 * rho0 * Math.exp(-h / H) * v * v / bc;
    const dgam = (grav * Math.cos(g)) / v - (v * Math.cos(g)) / r - lift * 0.24 * drag / v;
    v += (-drag + grav * Math.sin(g)) * d; g += dgam * d; h -= v * Math.sin(g) * d; s += v * Math.cos(g) * R / (R + h) * d; t += d;
    if (drag > amax) { amax = drag; tmax = t; }
    if (Math.abs(t / 5 - Math.round(t / 5)) < d / 10 || t >= upTo - 1e-9) rows.push([t, h, s, v, drag]);
  }
  return { h, v, s, g: g / DEG, amax, tmax, rows };
}
let best = null;
for (let g0 = 9; g0 <= 20; g0 += 0.1) for (let l = -0.2; l <= 1.2; l += 0.02) {
  const r = entry(g0, l, 0.25);
  const err = ((r.h - 11000) / 300) ** 2 + ((r.v - 405) / 8) ** 2;
  if (!best || err < best.err) best = { g0, l, err };
}
// refine round the best by pattern search
let step = [0.1, 0.02];
for (let it = 0; it < 60; it += 1) {
  let moved = false;
  for (const [dg, dl] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const g0 = best.g0 + dg * step[0], l = best.l + dl * step[1];
    const r = entry(g0, l, 0.1);
    const err = ((r.h - 11000) / 10) ** 2 + ((r.v - 405) / 0.3) ** 2;
    const cur = entry(best.g0, best.l, 0.1);
    const ce = ((cur.h - 11000) / 10) ** 2 + ((cur.v - 405) / 0.3) ** 2;
    if (err < ce) { best = { g0, l, err }; moved = true; break; }
  }
  if (!moved) { step = step.map((x) => x / 2); }
}
const fit = entry(best.g0, best.l, 0.02);
console.log(`entry fit: path angle ${best.g0.toFixed(2)} deg, lift ${best.l.toFixed(2)} of 0.24; at ${T.chute} s: ${(fit.h / 1000).toFixed(2)} km, ${fit.v.toFixed(1)} m/s; peak deceleration ${(fit.amax / 9.80665).toFixed(1)} g at ${fit.tmax.toFixed(0)} s (the press kit: about +90 s); downrange ${(fit.s / 1000).toFixed(0)} km`);
const g0 = best.g0;
const peakG = +(fit.amax / 9.80665).toFixed(1), peakAt = +fit.tmax.toFixed(0);

// --- from the parachute to the ground: the heights and speeds the press kit and JPL give, joined by monotone curves
const alt1 = monotoneCubic([T.chute, T.shield, T.bs], [11000, 8000, 1600]);
const spd1 = monotoneCubic([T.chute, T.shield, T.bs], [405, 125, 80]);
const rowsEdl = fit.rows.map((r) => [r[0], r[1], r[2]]);                   // [t, h m, s m]
let sNow = fit.s, tNow = T.chute;
// the along-track speed is what is left of the published speed once the fall is taken out; a parachute drifts with the wind, so it is never less than 6 m/s
const vh = (t) => { const a = alt1(t), vz = -a.dy, sp = spd1(t).y; return Math.max(6, Math.sqrt(Math.max(0, sp * sp - vz * vz))); };
for (let t = T.chute + 2; t <= T.bs + 1e-9; t += 2) {
  const tt = Math.min(t, T.bs);
  sNow += 0.5 * (vh(tNow) + vh(tt)) * (tt - tNow); tNow = tt;
  rowsEdl.push([tt, alt1(tt).y, sNow]);
}
if (rowsEdl[rowsEdl.length - 1][0] < T.bs) { sNow += vh(tNow) * (T.bs - tNow); rowsEdl.push([T.bs, alt1(T.bs).y, sNow]); }
const S_BS = sNow, A_BS = alt1(T.bs).y, VH_BS = vh(T.bs);
// before the entry interface: the same straight line, backwards
const vzEI = V0 * Math.sin(g0 * DEG), vhEI = V0 * Math.cos(g0 * DEG);
const pre = [];
for (let t = T.start; t < 0; t += 10) pre.push([t, H0 + vzEI * -t, vhEI * t]);
const S_PRE = -vhEI * T.start;                                              // metres flown between the first second and the entry interface
const edl = [...pre, ...rowsEdl].map(([t, h, s]) => [t, h, s + S_PRE]);

// --- the descent stage from the back shell's separation to the ground: 80 m/s down to 0.73 m/s, the lateral speed nulled by the 35 m waypoint
const GAP0 = 2.4, GAP1 = 8.8, UNDER = 1.4;                                  // the rover's base under the stage's underside at separation, and on the full bridle (m); the stage's underside under the entry vehicle's origin
const vz0 = -alt1(T.bs).dy;
const A_RS = 22.4, A_TD = GAP1;                                             // the stage's underside at rover separation (rover wheels at 20 m) and at touchdown (7.6 m of bridle plus the rover's 1.2 m to its deck)
const pExp = (() => { const mean = (A_BS - UNDER - A_RS) / (T.rover - T.bs); return (vz0 - 0.73) / (mean - 0.73) - 1; })();
const dsAlt = [], dsS = [];
{
  let s = S_BS + S_PRE, h = A_BS - UNDER;
  dsAlt.push([T.bs, h, s]);
  const n = 27;
  for (let k = 1; k <= n; k += 1) {
    const t0 = T.bs + (k - 1) * (T.rover - T.bs) / n, t1 = T.bs + k * (T.rover - T.bs) / n;
    const vzAt = (t) => 0.73 + (vz0 - 0.73) * Math.pow(1 - (t - T.bs) / (T.rover - T.bs), pExp);
    const vhAt = (t) => VH_BS * Math.pow(1 - (t - T.bs) / (T.rover - T.bs), 1.4);
    const a = (vzAt(t0) + vzAt(t1)) / 2, b = (vhAt(t0) + vhAt(t1)) / 2;
    h -= a * (t1 - t0); s += b * (t1 - t0);
    dsAlt.push([t1, h, s]);
  }
  // scale the last height to the published 22.4 m exactly
  const miss = dsAlt[dsAlt.length - 1][1] - A_RS;
  dsAlt.forEach((r, i) => { r[1] -= miss * (i / (dsAlt.length - 1)); });
}
const S_LAND = dsAlt[dsAlt.length - 1][2];
// the sky crane: the stage lowers at 0.73 m/s, 22.4 m to 8.8 m under its underside, the rover goes down on the bridle
const smooth = (x) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };
const gap = (t) => GAP0 + (GAP1 - GAP0) * smooth((t - (T.rover + 0.5)) / (T.down - T.rover - 1.5));
const dsLow = (t) => A_RS - (A_RS - A_TD) * Math.min(1, (t - T.rover) / (T.down - T.rover));
const roverRows = [], dsRows = dsAlt.slice();
for (let t = T.rover + 1; t <= T.down + 1e-9; t += 1) dsRows.push([t, dsLow(t), S_LAND]);
for (let t = T.rover; t <= T.down + 1e-9; t += 1) roverRows.push([t, dsLow(t) - gap(t), S_LAND]);
// the wheels are on the ground at T.down: a point a metre under it keeps the curve moving at 0.7 m/s as it arrives (the track clamps the height at the ground)
roverRows.push([T.down + 1, -0.73, S_LAND], [T.end, -0.73, S_LAND]);
// after the cords are cut the stage flies off (illustrative: the report says it came down 650 m away, and the press kit at least 150 m)
const fly = [[T.cut, A_TD, 0], [T.cut + 2.5, 24, 6], [T.cut + 6, 78, 70], [T.cut + 10, 110, 240], [T.cut + 14, 96, 470], [T.cut + 17.5, 0, 650]];
dsRows.push([T.down + 1, A_TD, S_LAND], [T.cut, A_TD, S_LAND]);
const dsFinal = [...dsRows.filter((r) => r[0] < T.cut), ...fly.map(([t, h, d]) => [t, h, S_LAND + d])];
const T_CRASH = T.cut + 17.5;
// the back shell under its parachute: it drifts on and comes down about 30 s later (illustrative)
const bsRows = [];
{
  let s = S_BS + S_PRE, h = A_BS;
  bsRows.push([T.bs, h, s]);
  for (let t = T.bs + 2; t <= T.bs + 40; t += 2) {
    const tau = t - T.bs;
    h = Math.max(0, A_BS - 58 * tau + 0.0); s += (VH_BS * Math.exp(-tau / 12) + 6) * 2;
    bsRows.push([t, h, s]);
    if (h <= 0) break;
  }
}
const T_BS_DOWN = bsRows[bsRows.length - 1][0];

// --- the place: start the profile upstream of the site so that it ends on it
const S_TOTAL = S_LAND + 0;                                                // metres from the first point to the touchdown
const back = (lat, lon, bearing, km) => {                                  // the point `km` from (lat, lon) along `bearing` on a sphere of Mars's radius
  const d = km * 1000 / R, a = bearing * DEG, p1 = lat * DEG, l1 = lon * DEG;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(a));
  const l2 = l1 + Math.atan2(Math.sin(a) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return { lat: p2 / DEG, lon: ((l2 / DEG + 540) % 360) - 180 };
};
const bearingTo = (a, b) => { const p1 = a.lat * DEG, p2 = b.lat * DEG, dl = (b.lon - a.lon) * DEG; return ((Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) / DEG) + 360) % 360; };
const HEADING = 96;                                                        // the approach's compass heading: ours (the report names none); east, a little south
let start = back(GALE.lat, GALE.lon, (HEADING + 180) % 360, S_TOTAL / 1000);
// the great circle from `start` along its own initial bearing reaches the site; find the bearing that does
let az = bearingTo(start, GALE);
for (let it = 0; it < 6; it += 1) { start = back(GALE.lat, GALE.lon, (az + 180) % 360, S_TOTAL / 1000); az = bearingTo(start, GALE); }
console.log('start', start, 'azimuth', az.toFixed(2), 'downrange to the site', (S_TOTAL / 1000).toFixed(1), 'km (of which', (S_PRE / 1000).toFixed(0), 'km before the interface)');
console.log('at the back shell separation:', (A_BS).toFixed(0), 'm, along-track speed', VH_BS.toFixed(1), 'm/s; the descent stage covers', ((S_LAND - S_BS - S_PRE)).toFixed(0), 'm to the site');

const pts = (rows) => rows.map(([t, h, s]) => [+t.toFixed(2), +(h / 1000).toFixed(5), +(s / 1000).toFixed(4)]);
// the profile's downrange is measured from the place, which is the first point
const place = { name: 'Mars: the entry from the west, 30 seconds before the atmosphere', lat: +start.lat.toFixed(4), lon: +start.lon.toFixed(4), alt: 0, azimuth: +az.toFixed(2), ground: { kind: 'land' } };
const landing = { name: 'Bradbury Landing, Gale crater', lat: GALE.lat, lon: GALE.lon, alt: 0, ground: { kind: 'land' } };

// --- the vehicles
const U = 1.115;                                                           // the descent stage model's height from its base (the engines' lips) to its underside plane
const ENG = [[-1.911, -1.069, -1.713], [-1.713, -1.069, -1.911], [-1.713, -1.069, 1.911], [-1.911, -1.069, 1.713], [1.713, -1.069, -1.911], [1.911, -1.069, -1.713], [1.911, -1.069, 1.713], [1.713, -1.069, 1.911]].map(([x, y, z]) => [x, +(y + U + 0.05).toFixed(3), z]);
const CHUTE = { diameterM: 16, count: 1, lineM: 50, gores: 40, at: [0, 0, 0], colours: ['#e0642a', '#f1ece0'], spreadDeg: 0 };
const ev = (t, vehicle, part, action, extra = {}) => ({ t, part, action, vehicle, ...extra });
const parts = [
  ev(T.chute, 'entry', 'main', 'deploy', { reefS: 1.0, openS: 1.8 }),
  ev(T.shield, 'entry', 'msl-heat-shield', 'separate', { dv: [0, 4, 0], spin: [0.25, 0.05, 0.18] }),
  ev(T.shield + 40, 'entry', 'msl-heat-shield', 'hide'),
  ev(T.start, 'bs', 'msl-heat-shield', 'hide'),
  ev(T.bs, 'bs', 'main', 'deploy', { reefS: 0.01, openS: 0.01 }),
  ev(T.bs + 0.4, 'ds', 'msl-descent-stage', 'ignite', { rampS: 0.8 }),
  ev(T.rover - 1.4, 'ds', 'msl-descent-stage', 'cutoff', { engines: [0, 2, 4, 6] }),
  ev(T.cut, 'ds', 'msl-descent-stage', 'ignite', { engines: [0, 2, 4, 6], rampS: 1.2 }),
  ev(T_CRASH - 0.2, 'ds', 'msl-descent-stage', 'cutoff'),
].sort((a, b) => a.t - b.t);

const pace = [[T.start, 0, 3], [0, 60, 2], [60, 120, 1.5], [120, 235, 3], [235, 300, 1], [300, 358.9, 1.5], [358.9, 413, 1], [413, 460, 1]].map(([from, to, rate]) => ({ from, to, rate }));
pace[pace.length - 1].to = T.end;
let play = 0; for (const q of pace) play += (q.to - q.from) / q.rate;
console.log('play time s', play.toFixed(0));

const moment = {
  format: 1, id: 'curiosity-edl', words: 'curiosity-edl', wordsFile: 'en.moments.curiosity.js', world: 'mars',
  epoch, span: [T.start, T.end], pace, place,
  places: [{ from: 200, place: landing }],
  trajectories: {
    edl: { kind: 'profile', truth: 'reconstructed', say: 'pathEdl', azimuth: place.azimuth, points: pts(edl),
      source: 'JPL\'s timeline of Curiosity\'s landing (parachute 259.2 s, heat shield 278.9 s after the entry at 05:10:45.7 UTC) and NASA\'s Mars Science Laboratory press kit (entry at 131 km and 5.9 km/s, parachute at 11 km and 405 m/s, heat shield off at 8 km and 125 m/s, back shell off at 1.6 km and 80 m/s); a point mass fitted to them, the heading is ours' },
    'ds-path': { kind: 'profile', truth: 'reconstructed', say: 'pathDescent', azimuth: place.azimuth, points: pts(dsFinal),
      source: 'the press kit (80 m/s to 0.75 m/s, the rover separated at about 20 m, the stage holding the descent speed to touchdown), JPL\'s times (rover separation 05:17:38.6, touchdown 05:17:57.3 UTC) and the 7.6 m bridle (Wikipedia, Mars Science Laboratory); the stage\'s flyaway is illustrative (it came down some 650 m away)' },
    'bs-path': { kind: 'profile', truth: 'illustrative', say: 'pathBackshell', azimuth: place.azimuth, points: pts(bsRows),
      source: 'ours: the back shell hangs from the parachute and drifts on; its fall is not published in what was read' },
    'rover-path': { kind: 'profile', truth: 'reconstructed', say: 'pathRover', azimuth: place.azimuth, points: pts(roverRows),
      source: 'JPL\'s times and the press kit\'s 20 m at separation and 0.75 m/s at touchdown; the bridle pays out over the 18.7 s between them' },
  },
  vehicles: [
    { id: 'entry', model: 'msl-entry', lengthM: 2.63, path: 'edl', attitude: 'prograde', window: [T.start, T.bs], colour: 'station',
      parts: ['msl-heat-shield', 'msl-backshell'], chutes: { main: CHUTE }, plasma: { radiusM: 2.7, at: [0, 2.6, 0] } },
    { id: 'ds', model: 'msl-descent-stage', lengthM: 3.215, path: 'ds-path', attitude: 'vertical', window: [T.bs, T_CRASH], colour: 'station',
      parts: ['msl-descent-stage'], engines: { 'msl-descent-stage': ENG }, flames: { 'msl-descent-stage': { kind: 'hypergolic', exitM: 0.32 } } },
    { id: 'bs', model: 'msl-entry', lengthM: 2.63, path: 'bs-path', attitude: 'prograde', window: [T.bs, T_BS_DOWN], colour: 'station',
      parts: ['msl-heat-shield', 'msl-backshell'], chutes: { main: CHUTE } },
    { id: 'rover-hang', model: 'curiosity', lengthM: 2.22, rideOn: { vehicle: 'ds', at: [0, +(U - GAP0).toFixed(3), 0] }, attitude: 'vertical', window: [T.bs, T.rover], colour: 'station', marker: false },
    { id: 'rover', model: 'curiosity', lengthM: 2.22, path: 'rover-path', attitude: 'vertical', window: [T.rover, T.end], colour: 'station' },
  ],
  tracks: {
    parts,
    camera: [
      { t: T.start, shot: 'globe', altKm: 900, backKm: 700, fov: 40, vehicle: 'entry' },
      { t: -16, shot: 'orbit', az: 205, el: 9, dist: 17, lookY: 1.4, fov: 36, vehicle: 'entry', blend: 2.5 },
      { t: 30, shot: 'orbit', az: 160, el: 5, dist: 20, lookY: 1.6, fov: 38, spin: 2.5, vehicle: 'entry', blend: 1.5 },
      { t: 84, shot: 'orbit', az: 190, el: 3, dist: 15, lookY: 1.4, fov: 34, spin: -3, vehicle: 'entry', blend: 1.5 },
      { t: 135, shot: 'orbit', az: 250, el: 12, dist: 34, lookY: 1.4, fov: 38, vehicle: 'entry', blend: 3 },
      { t: 215, shot: 'orbit', az: 205, el: 6, dist: 30, lookY: 1.4, fov: 38, vehicle: 'entry', blend: 3 },
      { t: 252, shot: 'orbit', az: 200, el: 6, dist: 70, lookY: 24, fov: 40, vehicle: 'entry', blend: 2.5 },
      { t: 273, shot: 'orbit', az: 230, el: -4, dist: 26, lookY: 1.4, fov: 40, vehicle: 'entry', blend: 1.5 },
      { t: 290, shot: 'orbit', az: 200, el: 10, dist: 85, lookY: 28, fov: 42, vehicle: 'entry', blend: 3 },
      { t: 346, shot: 'orbit', az: 215, el: 4, dist: 30, lookY: 6, fov: 40, vehicle: 'entry', blend: 2 },
      { t: T.bs + 1, shot: 'orbit', az: 210, el: -8, dist: 24, lookY: 2, fov: 42, vehicle: 'ds', blend: 0.8 },
      { t: 372, shot: 'orbit', az: 255, el: 14, dist: 28, lookY: 0, fov: 42, spin: 3, vehicle: 'ds', blend: 3 },
      { t: 396, shot: 'orbit', az: 215, el: 8, dist: 30, lookY: 0, fov: 42, vehicle: 'ds', blend: 3 },
      { t: T.rover - 6, shot: 'orbit', az: 205, el: 5, dist: 34, lookY: 6, fov: 40, vehicle: 'rover', blend: 2 },
      { t: T.down - 4, shot: 'orbit', az: 235, el: 4, dist: 26, lookY: 4.6, fov: 40, vehicle: 'rover', blend: 2.5 },
      { t: T.cut + 1, shot: 'track', at: [-90, -70, 3], fill: 0.5, fovMin: 4, fovMax: 36, vehicle: 'ds', blend: 2 },
      { t: T_CRASH - 2, shot: 'orbit', az: 240, el: 6, dist: 20, lookY: 1.2, fov: 40, vehicle: 'rover', blend: 3 },
    ],
    captions: [
      { t: T.start, say: 'ready' }, { t: 0, say: 'entry' }, { t: 40, say: 'guided' }, { t: 84, say: 'heating' }, { t: 140, say: 'slow' }, { t: 236, say: 'weights' },
      { t: T.chute, say: 'chute' }, { t: T.shield, say: 'shield' }, { t: 300, say: 'radar' }, { t: T.bs, say: 'backshell' }, { t: 376, say: 'divert' },
      { t: T.rover, say: 'skycrane' }, { t: T.down, say: 'touchdown' }, { t: T.cut, say: 'cut' }, { t: T.cut + 6, say: 'flyaway' }, { t: T_CRASH + 1, say: 'earth' },
    ],
    audio: [],
    effects: [
      { t: 26, effect: 'plasma', until: 186, peak: 84, vehicle: 'entry' },
      { t: T.rover, effect: 'tether', until: T.cut, from: { vehicle: 'ds', at: [[0.55, U, 0.0], [-0.28, U, 0.48], [-0.28, U, -0.48]] }, to: { vehicle: 'rover', at: [[0.5, 1.3, 0.0], [-0.25, 1.3, 0.43], [-0.25, 1.3, -0.43]] }, colour: '#eadfc8' },
    ],
  },
  chapters: [{ t: T.start, say: 'chEntry' }, { t: 84, say: 'chHeat' }, { t: T.chute, say: 'chChute' }, { t: T.bs, say: 'chPowered' }, { t: T.rover, say: 'chCrane' }, { t: T.down, say: 'chLanded' }],
  sources: [
    { say: 'srcJpl', url: 'https://www.jpl.nasa.gov/news/timeline-of-major-mission-events-during-curiositys-landing/' },
    { say: 'srcKit', url: 'https://commons.wikimedia.org/wiki/File:MSL_Press_Kit.pdf' },
    { say: 'srcPowered', url: 'https://ntrs.nasa.gov/citations/20150007794' },
    { say: 'srcWiki', url: 'https://en.wikipedia.org/wiki/Mars_Science_Laboratory' },
  ],
  audio_note: 'No sound plays. NASA\'s recording of the Mission Control room on the night is a NASA video with no audio file under a clear free licence read; the words are captions.',
  facts: { peakG, peakAtS: peakAt, headingDeg: HEADING },
};
writeFileSync(OUT + 'curiosity-edl.json', JSON.stringify(moment, null, 1).replace(/\n\s+/g, (m) => (m.length > 60 ? m : ' ')) + '\n');
console.log('curiosity-edl.json written');
