// tools/moments-build/vostok1.mjs -- Vostok 1, 12 April 1961 (release 1.6.0, internal spec 0079 C5, internal #1054).
// Writes site/data/moments/vostok-1.json and vostok-1-orbit.json (the paths). `node tools/moments-build/vostok1.mjs`.
import { writeFileSync } from 'node:fs';
import * as L from './lib.mjs';
import { monotoneCubic } from '../../site/js/moments/format.js';
const { add, sub, scale, dot, cross, len, norm, MU, EARTH_R, DEG } = L;
const OUT = new URL('../../site/data/moments/', import.meta.url).pathname;
const epochMs = Date.parse('1961-04-12T06:07:00Z');
const place = { name: 'Baikonur, Site 1 (Gagarin\'s Start)', lat: 45.9203, lon: 63.3422, alt: 90, azimuth: 36, ground: { kind: 'land', pad: true } };
const frame = L.placeFrame(place);

// --- the ascent: a profile (t s, altitude km, downrange km), the Soviet event times, the heights and distances between them approximate
const ASCENT = [[-10, 0, 0], [0.6, 0, 0], [10, 0.3, 0], [30, 3, 0.5], [60, 11, 4], [90, 27, 22], [119, 48, 60], [156, 78, 160], [220, 118, 400],
  [290, 150, 740], [400, 170, 1400], [500, 178, 2050], [600, 181, 2800], [676, 181, 3365]];
const track = L.profileTrack({ points: ASCENT, azimuth: 36 }, place);
const T_INS = 676, T_RETRO = 4680, T_RETRO_END = 4722, T_EI = 5510, T_EJECT = 5840, T_LAND = 6480;

// --- the orbit, from the profile's own last state
const s0 = L.profileInertial(epochMs, track, frame, T_INS);
const el = (s) => { const r = len(s.r), v = len(s.v), a = 1 / (2 / r - v * v / MU), h = len(cross(s.r, s.v)), e = Math.sqrt(Math.max(0, 1 - h * h / (MU * a))); return { perigeeKm: (a * (1 - e) - EARTH_R) / 1e3, apogeeKm: (a * (1 + e) - EARTH_R) / 1e3, incl: Math.acos(h && cross(s.r, s.v)[2] / h) / DEG, periodMin: 2 * Math.PI * Math.sqrt(a ** 3 / MU) / 60 }; };
console.log('insertion orbit', el(s0), 'speed', len(s0.v));
const orbitAt = (t) => L.kepler(s0.r, s0.v, t - T_INS);

// --- retrofire: 42 s, about 155 m/s, blended; then the conic to the entry point
const sR0 = orbitAt(T_RETRO);
const kr = L.kepler(sR0.r, sR0.v, T_RETRO_END - T_RETRO);
const sR1 = { r: kr.r, v: kr.v };
// the landing and the entry point, 1 068 km up its own track
const LAND = { lat: 51.2706, lon: 45.9972 }, PILOT = L.destination(LAND.lat, LAND.lon, 300, 2.1);
const EJECT = L.destination(LAND.lat, LAND.lon, 220, 7);
const EI = L.destination(LAND.lat, LAND.lon, 220, 1068);
const gEI = L.groundState(epochMs, EI.lat, EI.lon, 100e3, T_EI);
const lam = L.lambert(sR1.r, gEI.r, T_EI - T_RETRO_END, MU, cross(sR1.r, sR1.v));
sR1.v = lam.v1;
console.log('retro dv m/s', len(sub(lam.v1, kr.v)).toFixed(0), 'retro point ground lat/lon', geo(sR0.r, T_RETRO), 'lambert v mismatch m/s', len(sub(lam.v1, sR1.v)).toFixed(0), 'arrival', len(lam.v2).toFixed(0), 'flight-path angle deg', (Math.asin(dot(norm(gEI.r), norm(lam.v2))) / DEG).toFixed(1));
function geo(r, t) { const g = -(L.siderealAt ? 0 : 0); const th = Math.atan2(r[1], r[0]) - gmstAt(t); return { lat: +(Math.asin(r[2] / len(r)) / DEG).toFixed(1), lon: +((((th / DEG) % 360) + 540) % 360 - 180).toFixed(1) }; }
import { siderealAt } from '../../site/js/moments/trajectory.js';
function gmstAt(t) { return siderealAt(epochMs, t); }

// --- the entry: Earth-fixed along the great circle from EI to the ejection point; altitude km and range km by second
const ENTRY_ALT = [[0, 100], [40, 88], [80, 70], [120, 52], [160, 38], [200, 28], [240, 20], [280, 14], [330, 7]];
const ENTRY_RNG = [[0, 0], [40, 290], [80, 570], [120, 790], [160, 910], [200, 980], [240, 1020], [280, 1045], [330, 1061]];
const mono = (pts) => { const f = monotoneCubic(pts.map((p) => p[0]), pts.map((p) => p[1])); return (x) => f(x).y; };
const entryAlt = mono(ENTRY_ALT), entryRng = mono(ENTRY_RNG);
const totalEntryKm = 1061;
const entryGround = (t) => { // t seconds after T_EI
  const km = entryRng(t) * (1068 - 7) / totalEntryKm;
  const p = L.destination(EI.lat, EI.lon, 40 + (km / 1068) * 0, km);   // the bearing from EI is the reverse of 220, to within a degree
  return { lat: p.lat, lon: p.lon, alt: entryAlt(t) * 1000 };
};
// the great circle from EI to the landing is walked directly: bearing from EI, recomputed so it ends on the ejection point
const bearing = (a, b) => { const p1 = a.lat * DEG, p2 = b.lat * DEG, dl = (b.lon - a.lon) * DEG; return (Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) / DEG + 360) % 360; };
const brg = bearing(EI, EJECT);
const entryPos = (t) => { const p = L.destination(EI.lat, EI.lon, brg, entryRng(t - T_EI) * distKm(EI, EJECT) / 1061); return L.groundPos(epochMs, p.lat, p.lon, entryAlt(t - T_EI) * 1000, t); };
const entryAt = L.diffState(entryPos);
function distKm(a, b) { const p1 = a.lat * DEG, p2 = b.lat * DEG, dl = (b.lon - a.lon) * DEG; return 6371.0088 * Math.acos(Math.min(1, Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl))); }
// the descent under the canopies: altitude km by second, a drift to the landing point
const CAPSULE_ALT = [[T_EJECT, 7.0], [5900, 5.4], [5960, 2.5], [6100, 1.5], [6300, 0.6], [T_LAND, 0.0]];
const PILOT_ALT = [[T_EJECT, 7.0], [5843, 7.035], [5850, 6.95], [5870, 6.5], [5960, 4.0], [6200, 1.6], [T_LAND, 0.0]];
const lerpGround = (a, b, u) => ({ lat: a.lat + (b.lat - a.lat) * u, lon: a.lon + (b.lon - a.lon) * u });
const capsuleAt = L.diffState((t) => { const u = (t - T_EJECT) / (T_LAND - T_EJECT); const p = lerpGround(EJECT, LAND, u); return L.groundPos(epochMs, p.lat, p.lon, mono(CAPSULE_ALT)(t) * 1000, t); });
const pilotAt = L.diffState((t) => { const u = (t - T_EJECT) / (T_LAND - T_EJECT); const p = lerpGround(EJECT, PILOT, u); return L.groundPos(epochMs, p.lat, p.lon, mono(PILOT_ALT)(t) * 1000, t); });
console.log('entry bearing', brg.toFixed(1), 'EI to ejection km', distKm(EI, EJECT).toFixed(0), 'EI', EI);

const segs = [
  { from: T_INS, to: T_RETRO, at: orbitAt, step: (t) => L.arcStep(len(orbitAt(t).r), len(orbitAt(t).v)) },
  { from: T_RETRO, to: T_RETRO_END, at: (t) => L.hermite(sR0, sR1, T_RETRO, T_RETRO_END, t), step: () => 3 },
  { from: T_RETRO_END, to: T_EI, at: (t) => L.kepler(sR1.r, lam.v1, t - T_RETRO_END), step: (t) => L.arcStep(len(L.kepler(sR1.r, lam.v1, t - T_RETRO_END).r), 7500) },
  { from: T_EI, to: T_EJECT, at: entryAt, step: () => 5 },
  { from: T_EJECT, to: T_LAND, at: capsuleAt, step: () => 10 },
];
const rows = L.rowsOf(segs);
L.save(OUT + 'paths/vostok-1-orbit.json', rows, 'Vostok 1: from orbit insertion (T+676 s) to the capsule on the ground; reconstructed by tools/moments-build/vostok1.mjs. Earth-inertial (TEME) km and km/s.');
console.log('EI join: lambert arrival vs entry velocity m/s', len(sub(lam.v2, entryAt(T_EI).v)).toFixed(0), 'speeds', len(lam.v2).toFixed(0), len(entryAt(T_EI).v).toFixed(0), 'ejection join', len(sub(entryAt(T_EJECT).v, capsuleAt(T_EJECT).v)).toFixed(0));
const pilotRows = L.rowsOf([{ from: T_EJECT, to: T_LAND, at: pilotAt, step: () => 10 }]);
L.save(OUT + 'paths/vostok-1-pilot.json', pilotRows, 'Gagarin under his own canopy from the ejection to the ground; illustrative drift, the sources give no distance between pilot and capsule.');

// --- the moment
const reg = L.registryRow('r7-8k72k');
const quad = (x, z) => reg.engines['boosters-4'].filter((p) => Math.sign(p[0]) === x && Math.sign(p[2]) === z);
const B = { 'booster-b': [1, 1], 'booster-v': [-1, 1], 'booster-g': [-1, -1], 'booster-d': [1, -1] };
const boosterEngines = Object.fromEntries(Object.entries(B).map(([k, [x, z]]) => [k, quad(x, z)]));
const ev = (t, part, action, extra = {}) => ({ t, part, action, vehicle: 'rocket', ...extra });
const parts = [];
for (const b of Object.keys(B)) parts.push(ev(-9, b, 'ignite', { rampS: 8 }));
parts.push(ev(-9, 'core-stage', 'ignite', { rampS: 8 }));
for (const [b, [x, z]] of Object.entries(B)) {
  parts.push(ev(119, b, 'cutoff'));
  parts.push(ev(119.4, b, 'separate', { dv: [1.6 * x, -1.2, 1.6 * z], spin: [0.05 * z, 0, -0.05 * x] }));
}
parts.push(ev(156, 'fairing', 'separate', { dv: [0.6, 3.0, 0], spin: [0.15, 0, 0.1] }));
parts.push(ev(300, 'core-stage', 'cutoff'));
parts.push(ev(300.5, 'core-stage', 'separate', { dv: [0.3, -4, 0.3], spin: [0.03, 0, 0.02] }));
parts.push(ev(301, 'blok-e', 'ignite', { rampS: 3 }));
parts.push(ev(676, 'blok-e', 'cutoff'));
parts.push({ t: 4680, part: 'vostok-im', action: 'ignite', vehicle: 'ship', rampS: 1 });
parts.push({ t: 4722, part: 'vostok-im', action: 'cutoff', vehicle: 'ship' });
parts.push({ t: 5500, part: 'vostok-im', action: 'separate', vehicle: 'ship', dv: [0, -2.5, 0.8], spin: [0.25, 0.1, 0.4] });
parts.push({ t: 5560, part: 'vostok-im', action: 'hide', vehicle: 'ship' });
parts.push({ t: 5838, part: 'vostok-hatch', action: 'separate', vehicle: 'ship', dv: [4, 1, 0], spin: [1, 0, 2] });
parts.push({ t: 5840, part: 'vostok-seat', action: 'ignite', vehicle: 'seat', rampS: 0.3 });
parts.push({ t: 5842, part: 'vostok-seat', action: 'cutoff', vehicle: 'seat' });
parts.push({ t: 5845, part: 'drogue', action: 'deploy', vehicle: 'ship', reefS: 3, openS: 2 });
parts.push({ t: 5846, part: 'p-drogue', action: 'deploy', vehicle: 'seat', reefS: 1, openS: 1.5 });
parts.push({ t: 5960, part: 'main', action: 'deploy', vehicle: 'ship', reefS: 4, openS: 3 });
parts.push({ t: 5960, part: 'vostok-seat', action: 'separate', vehicle: 'seat', dv: [0, 0, 0.6], spin: [0.6, 0, 0.3] });
parts.push({ t: 5962, part: 'p-main', action: 'deploy', vehicle: 'seat', reefS: 1.5, openS: 2.5 });
parts.push({ t: 6010, part: 'vostok-seat', action: 'hide', vehicle: 'seat' });
parts.sort((a, b) => a.t - b.t);

const pace = [[-10, 20, 1], [20, 100, 6], [100, 135, 3], [135, 150, 6], [150, 170, 2], [170, 285, 8], [285, 315, 3], [315, 660, 12], [660, 700, 2], [700, 4620, 300],
  [4620, 4780, 8], [4780, 5440, 100], [5440, 5620, 4], [5620, 5830, 8], [5830, 5990, 2], [5990, 6480, 30]].map(([from, to, rate]) => ({ from, to, rate }));
const moment = {
  format: 1, id: 'vostok-1', words: 'vostok-1', wordsFile: 'en.moments.vostok.js',
  epoch: '1961-04-12T06:07:00Z', span: [-10, 6480], pace, place,
  places: [{ from: 5500, place: { name: 'A field near Smelovka, Saratov Oblast', lat: LAND.lat, lon: LAND.lon, alt: 100, ground: { kind: 'land' } } }],
  trajectories: {
    ascent: { kind: 'profile', truth: 'reconstructed', say: 'pathAscent', pitchStart: 10, turnS: 110, azimuth: 36, points: ASCENT,
      source: 'Soviet event times (strap-ons 119 s, shroud 156 s, core 300 s, orbit about 10 min) as Wikipedia, "Vostok 1", gives them, read 2 November 2026; heights and distances between the events, and the launch azimuth for a 64.95 degree orbit, are ours' },
    orbit: { kind: 'vectors', truth: 'reconstructed', say: 'pathOrbit', frame: 'earth-teme', file: 'paths/vostok-1-orbit.json',
      source: 'orbit of 181 by 327 km at 64.95 degrees and 89.1 minutes (Wikipedia, "Vostok 1"), retrofire at 07:25 UTC for about 42 seconds over the west coast of Africa, entry and the ejection at 7 km above the landing field; arcs fitted by tools/moments-build/vostok1.mjs' },
    pilot: { kind: 'vectors', truth: 'illustrative', say: 'pathPilot', frame: 'earth-teme', file: 'paths/vostok-1-pilot.json',
      source: 'ejection at 7 km, the descent under the pilot\'s own canopy about ten minutes long; the sources give no distance between pilot and capsule, two kilometres is drawn' },
  },
  vehicles: [
    { id: 'rocket', model: 'r7-8k72k', lengthM: 38.246, path: 'ascent', attitude: 'ascent', window: [-10, 690],
      parts: [...Object.keys(B), 'core-stage', 'blok-e', 'fairing'],
      engines: { ...boosterEngines, 'core-stage': reg.engines['core-stage'], 'blok-e': reg.engines['blok-e'] },
      flames: { ...Object.fromEntries(Object.keys(B).map((k) => [k, { kind: 'kerolox', exitM: 0.9 }])), 'core-stage': { kind: 'kerolox', exitM: 0.9 }, 'blok-e': { kind: 'kerolox', exitM: 1.0 } } },
    { id: 'ship-up', model: 'vostok-3ka', lengthM: 4.4, rideOn: { vehicle: 'rocket', at: [0, 32, 0] }, attitude: 'ascent', window: [-10, 676], parts: ['vostok-im', 'vostok-sm-sphere'] },
    { id: 'ship', model: 'vostok-3ka', lengthM: 4.4, path: 'orbit', attitude: 'retrograde', window: [676, 6480], colour: 'station',
      parts: ['vostok-antennas', 'vostok-hatch', 'vostok-sm-sphere', 'vostok-im'],
      engines: { 'vostok-im': [[0, 0, 0]] }, flames: { 'vostok-im': { kind: 'hypergolic', exitM: 0.35 } },
      chutes: { drogue: { diameterM: 2.2, count: 1, lineM: 6, at: [0, 1.5, 0], colours: ['#d9d4c8', '#d9d4c8'] },
        main: { diameterM: 27, count: 1, lineM: 24, at: [0, 1.5, 0], colours: ['#e2622a', '#f1efe9'], spreadDeg: 0 } },
      plasma: { radiusM: 1.4, at: [0, -0.4, 0] } },
    { id: 'seat', model: 'vostok-seat', lengthM: 1.5, path: 'pilot', attitude: 'vertical', window: [5840, 6480], colour: 'station',
      parts: ['vostok-seat', 'vostok-pilot'],
      engines: { 'vostok-seat': [[-0.14, -0.88, 0.08], [0.14, -0.88, 0.08]] }, flames: { 'vostok-seat': { kind: 'solid', exitM: 0.12 } },
      chutes: { 'p-drogue': { diameterM: 1.6, count: 1, lineM: 3, at: [0, 0.9, 0.2], colours: ['#d9d4c8', '#d9d4c8'] },
        'p-main': { diameterM: 8.5, count: 1, lineM: 8, at: [0, 0.9, 0.2], colours: ['#e2622a', '#f1efe9'], spreadDeg: 0 } } },
  ],
  tracks: {
    parts,
    camera: [
      { t: -10, shot: 'pad', at: [120, -95, 3], lookY: 17, fov: 42 },
      { t: -3, shot: 'pad', at: [75, -45, 4], lookY: 9, fov: 54 },
      { t: 4, shot: 'track', at: [-900, -700, 10], lookY: 18, fill: 0.55, fovMin: 0.6, fovMax: 20 },
      { t: 22, shot: 'chase', offset: [90, -30, -80], lookY: 15, fov: 40, blend: 1.5 },
      { t: 108, shot: 'chase', offset: [60, -25, -48], lookY: 12, fov: 46 },
      { t: 140, shot: 'orbit', az: 120, el: 8, dist: 95, lookY: 14, fov: 40, spin: 2 },
      { t: 170, shot: 'chase', offset: [120, -60, -100], lookY: 14, fov: 46, blend: 1.0 },
      { t: 285, shot: 'orbit', az: 60, el: 5, dist: 75, lookY: 10, fov: 42 },
      { t: 320, shot: 'chase', offset: [150, -40, -120], lookY: 8, fov: 42, blend: 1.0 },
      { t: 655, shot: 'orbit', az: 95, el: 12, dist: 36, lookY: 30, fov: 42, vehicle: 'rocket' },
      { t: 682, shot: 'orbit', az: 40, el: 16, dist: 20, lookY: 2, fov: 42, vehicle: 'ship', blend: 1.5 },
      { t: 740, shot: 'globe', altKm: 2600, backKm: 2200, fov: 46, vehicle: 'ship', blend: 3 },
      { t: 4630, shot: 'orbit', az: 150, el: 10, dist: 14, lookY: 1.5, fov: 40, vehicle: 'ship', blend: 2 },
      { t: 4740, shot: 'globe', altKm: 1800, backKm: 2500, fov: 46, vehicle: 'ship', blend: 3 },
      { t: 5440, shot: 'chase', offset: [16, 5, -12], lookY: 1.5, fov: 42, vehicle: 'ship', blend: 2 },
      { t: 5640, shot: 'orbit', az: 200, el: 12, dist: 16, lookY: 1, fov: 42, vehicle: 'ship', blend: 2 },
      { t: 5832, shot: 'orbit', az: 120, el: 20, dist: 9, lookY: 1.5, fov: 46, vehicle: 'seat', blend: 0.5 },
      { t: 5880, shot: 'chase', offset: [18, -4, -14], lookY: 2, fov: 46, vehicle: 'ship', blend: 1.5 },
      { t: 5990, shot: 'orbit', az: 40, el: 10, dist: 90, lookY: 1, fov: 46, vehicle: 'ship', spin: 0.8, blend: 2 },
      { t: 6200, shot: 'chase', offset: [-30, 8, -40], lookY: 1, fov: 50, vehicle: 'seat', blend: 2 },
      { t: 6440, shot: 'orbit', az: 200, el: 6, dist: 50, lookY: 1, fov: 50, vehicle: 'ship', blend: 2 },
    ],
    captions: [
      { t: -10, say: 'ready' }, { t: -7, say: 'korolev' }, { t: 0.6, say: 'liftoff' }, { t: 119, say: 'boosters' }, { t: 156, say: 'shroud' },
      { t: 300, say: 'core' }, { t: 360, say: 'earth' }, { t: 600, say: 'kosberg' }, { t: 680, say: 'orbit' }, { t: 4690, say: 'retro' },
      { t: 5500, say: 'wires' }, { t: 5600, say: 'entry' }, { t: 5838, say: 'eject' }, { t: 5960, say: 'chutes' }, { t: 6440, say: 'landing' },
    ],
    audio: [],
    effects: [
      { t: -9, effect: 'exhaust-cloud', until: 14, axis: [0, 1, 0], count: 500, fire: 'core-stage', vehicle: 'rocket' },
      { t: 5515, effect: 'plasma', until: 5640, peak: 5560, vehicle: 'ship' },
    ],
  },
  chapters: [{ t: -10, say: 'chPad' }, { t: 0.6, say: 'chAscent' }, { t: 680, say: 'chOrbit' }, { t: 4680, say: 'chRetro' }, { t: 5500, say: 'chEntry' }, { t: 5838, say: 'chEject' }, { t: 6440, say: 'chLand' }],
  sources: [
    { say: 'srcWiki', url: 'https://en.wikipedia.org/wiki/Vostok_1' },
    { say: 'srcNssdc', url: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1961-012A' },
  ],
  audio_note: 'No radio recording plays. The Soviet-era recordings of Gagarin and Korolev are Roscosmos or TASS archive material with no free licence stated on any page found (Wikimedia Commons has none under a clear licence at the time of writing); the words are captions.',
};
writeFileSync(OUT + 'vostok-1.json', JSON.stringify(moment, null, 1).replace(/\n\s+/g, (m) => (m.length > 40 ? m : ' ')) + '\n');
console.log('vostok-1.json written');
