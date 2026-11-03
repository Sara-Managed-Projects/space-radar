// tools/moments-build/sputnik1.mjs -- Sputnik 1, 4 October 1957 (release 1.7.0, internal #1058).
// Writes site/data/moments/sputnik-1.json and paths/sputnik-1-orbit.json (the satellite's path). `node tools/moments-build/sputnik1.mjs`.
//
// WHAT IS FLOWN, from the published accounts (Wikipedia "Sputnik 1", read 3 November 2026, from NASA, NSSDC and the Russian sources it
// cites): the 8K71PS rocket lifted off from Site 1 at NIIP-5 at 19:28:34 UTC on 4 October (the 5th at the launch site), the four strap-on
// blocks fell away 116 seconds into the flight (telemetry), the core stage shut down at 295.4 s at 223 km, and PS-1 was let go 19.9
// seconds after cut-off, T+315.3 s, when its transmitter came on and the fairing went; the orbit was 223 by 950 km, 65.10 degrees, 96.20
// minutes. ILLUSTRATIVE: the heights and distances between the events, the satellite's attitude (it is held on the orbit's prograde here;
// it was tumbling) and the speed the head leaves at. NOT DRAWN: the core stage, which followed the satellite round the Earth.
import { writeFileSync } from 'node:fs';
import * as L from './lib.mjs';
const { cross, len, MU, EARTH_R, DEG } = L;
const OUT = new URL('../../site/data/moments/', import.meta.url).pathname;
const epochMs = Date.parse('1957-10-04T19:28:34Z');
const place = { name: 'Baikonur, Site 1 (Gagarin\'s Start)', lat: 45.9203, lon: 63.3422, alt: 90, azimuth: 36.0, ground: { kind: 'land', pad: true } };
const frame = L.placeFrame(place);
const T_SEP = 315.3, T_COFF = 295.4, T_STRAP = 116, T_END = 5900;

// --- the ascent: a profile (t s, altitude km, downrange km): the events are published, the heights and distances between them approximate
const ASCENT = [[-10, 0, 0], [0.6, 0, 0], [10, 0.3, 0], [30, 3, 0.5], [60, 11, 4], [90, 26, 18], [116, 43, 45], [160, 78, 140], [200, 112, 285], [250, 172, 560], [295.4, 228.5, 850], [315.3, 230, 999.3]];
const track = L.profileTrack({ points: ASCENT, azimuth: 36.0 }, place);
const s0 = L.profileInertial(epochMs, track, frame, T_SEP);
const el = (s) => { const r = len(s.r), v = len(s.v), a = 1 / (2 / r - v * v / MU), h = cross(s.r, s.v), e = Math.sqrt(Math.max(0, 1 - len(h) ** 2 / (MU * a))); return { perigeeKm: +((a * (1 - e) - EARTH_R) / 1e3).toFixed(0), apogeeKm: +((a * (1 + e) - EARTH_R) / 1e3).toFixed(0), incl: +(Math.acos(h[2] / len(h)) / DEG).toFixed(2), periodMin: +(2 * Math.PI * Math.sqrt(a ** 3 / MU) / 60).toFixed(1), alt: +((r - EARTH_R) / 1e3).toFixed(1) }; };
console.log('orbit at the separation (published: 223 by 950 km, 65.10 degrees, 96.20 min)', el(s0));
const orbitAt = (t) => L.kepler(s0.r, s0.v, t - T_SEP);
L.save(OUT + 'paths/sputnik-1-orbit.json', L.rowsOf([{ from: T_SEP, to: T_END, at: orbitAt, step: (t) => L.arcStep(len(orbitAt(t).r), len(orbitAt(t).v), 6, 80) }]),
  'Sputnik 1 from its separation (T+315.3 s) for one lap of the Earth; a conic from the end of the launch profile. Earth-inertial (TEME) km and km/s.');

// --- the moment
const reg = L.registryRow('r7-8k72k');
const quad = (x, z) => reg.engines['boosters-4'].filter((p) => Math.sign(p[0]) === x && Math.sign(p[2]) === z);
const B = { 'booster-b': [1, 1], 'booster-v': [-1, 1], 'booster-g': [-1, -1], 'booster-d': [1, -1] };
const boosterEngines = Object.fromEntries(Object.entries(B).map(([k, [x, z]]) => [k, quad(x, z)]));
const ev = (t, vehicle, part, action, extra = {}) => ({ t, part, action, vehicle, ...extra });
const parts = [];
// the launcher is the Vostok-K's model with its third stage and shroud put away: the 8K71PS had neither
parts.push(ev(-10, 'rocket', 'blok-e', 'hide'), ev(-10, 'rocket', 'fairing', 'hide'));
for (const b of Object.keys(B)) parts.push(ev(-9, 'rocket', b, 'ignite', { rampS: 8 }));
parts.push(ev(-9, 'rocket', 'core-stage', 'ignite', { rampS: 8 }));
for (const [b, [x, z]] of Object.entries(B)) {
  parts.push(ev(T_STRAP, 'rocket', b, 'cutoff'));
  parts.push(ev(T_STRAP + 0.4, 'rocket', b, 'separate', { dv: [4 * x, -3, 4 * z], spin: [0.05 * z, 0, -0.05 * x] }));
}
parts.push(ev(T_COFF, 'rocket', 'core-stage', 'cutoff'));
// the satellite rides in its head; the whips are folded in it and are shown when it is let go
parts.push(ev(-10, 'sat-up', 'sputnik-antennas', 'hide'));
parts.push(ev(T_SEP, 'sat-up', 'sputnik-nose', 'separate', { dv: [0.5, 1.6, 0.3], spin: [0.2, 0.1, 0.35] }));
parts.push(ev(T_SEP, 'sat-up', 'sputnik-sphere', 'hide'));
parts.push(ev(T_SEP + 60, 'sat-up', 'sputnik-nose', 'hide'));
parts.push(ev(T_SEP, 'sat', 'sputnik-nose', 'hide'));
parts.sort((a, b) => a.t - b.t);

const pace = [[-10, 20, 1], [20, 110, 5], [110, 125, 1.5], [125, 285, 10], [285, 325, 1.2], [325, T_END, 50]].map(([from, to, rate]) => ({ from, to, rate }));
let play = 0; for (const q of pace) play += (q.to - q.from) / q.rate;
console.log('play time s', play.toFixed(0));
const SPH_Y = 2.2755;     // the sphere's centre above the whips' tips in the model's metres
const moment = {
  format: 1, id: 'sputnik-1', words: 'sputnik-1', wordsFile: 'en.moments.sputnik.js',
  epoch: '1957-10-04T19:28:34Z', span: [-10, T_END], pace, place,
  trajectories: {
    ascent: { kind: 'profile', truth: 'reconstructed', say: 'pathAscent', pitchStart: 10, turnS: 110, azimuth: 36.0, points: ASCENT,
      source: 'the event times (strap-ons at 116 s, core cut-off at 295.4 s, PS-1 let go 19.9 s later) and the orbit as Wikipedia, "Sputnik 1", gives them, read 3 November 2026; heights and distances between the events, and the launch azimuth for a 65.1 degree orbit, are ours' },
    orbit: { kind: 'vectors', truth: 'reconstructed', say: 'pathOrbit', frame: 'earth-teme', file: 'paths/sputnik-1-orbit.json',
      source: 'the orbit of 223 by 950 km at 65.10 degrees and 96.20 minutes (Wikipedia, "Sputnik 1"; NSSDCA 1957-001B), a conic from the end of the launch profile, one lap; the satellite\'s attitude is not drawn as flown (it tumbled)' },
  },
  vehicles: [
    { id: 'rocket', model: 'r7-8k72k', lengthM: 38.246, path: 'ascent', attitude: 'ascent', window: [-10, T_SEP + 15], parts: [...Object.keys(B), 'core-stage', 'blok-e', 'fairing'],
      engines: { ...boosterEngines, 'core-stage': reg.engines['core-stage'] },
      flames: { ...Object.fromEntries(Object.keys(B).map((k) => [k, { kind: 'kerolox', exitM: 0.9 }])), 'core-stage': { kind: 'kerolox', exitM: 0.9 } } },
    { id: 'sat-up', model: 'sputnik-1', lengthM: 3.608, rideOn: { vehicle: 'rocket', at: [0, 25.5245, 0] }, attitude: 'ascent', window: [-10, T_SEP + 70], parts: ['sputnik-nose', 'sputnik-sphere', 'sputnik-antennas'], marker: false },
    { id: 'sat', model: 'sputnik-1', lengthM: 3.608, path: 'orbit', attitude: 'prograde', window: [T_SEP, T_END], colour: 'station', parts: ['sputnik-nose', 'sputnik-sphere', 'sputnik-antennas'] },
  ],
  tracks: {
    parts,
    camera: [
      { t: -10, shot: 'pad', at: [120, -95, 3], lookY: 15, fov: 42, vehicle: 'rocket' },
      { t: -3, shot: 'pad', at: [75, -45, 4], lookY: 8, fov: 54, vehicle: 'rocket' },
      { t: 4, shot: 'track', at: [-900, -700, 10], lookY: 15, fill: 0.55, fovMin: 0.6, fovMax: 20, vehicle: 'rocket' },
      { t: 22, shot: 'chase', offset: [90, -30, -80], lookY: 13, fov: 40, blend: 1.5, vehicle: 'rocket' },
      { t: 100, shot: 'chase', offset: [60, -25, -48], lookY: 11, fov: 46, vehicle: 'rocket' },
      { t: 134, shot: 'orbit', az: 120, el: 8, dist: 80, lookY: 12, fov: 40, spin: 2, vehicle: 'rocket' },
      { t: 175, shot: 'chase', offset: [120, -60, -100], lookY: 12, fov: 46, blend: 1.0, vehicle: 'rocket' },
      { t: 270, shot: 'orbit', az: 60, el: 5, dist: 70, lookY: 12, fov: 42, vehicle: 'rocket', blend: 2 },
      { t: 306, shot: 'orbit', az: 25, el: 10, dist: 14, lookY: 28, fov: 40, vehicle: 'rocket', blend: 2 },
      { t: T_SEP + 0.5, shot: 'orbit', az: 40, el: 14, dist: 7.5, lookY: SPH_Y, fov: 42, vehicle: 'sat', blend: 1 },
      { t: T_SEP + 30, shot: 'orbit', az: 150, el: 18, dist: 11, lookY: SPH_Y, fov: 42, vehicle: 'sat', spin: 1.2, blend: 2 },
      { t: T_SEP + 260, shot: 'globe', altKm: 2200, backKm: 2600, fov: 46, vehicle: 'sat', blend: 3 },
      { t: 3200, shot: 'globe', altKm: 3600, backKm: 3000, fov: 46, vehicle: 'sat', blend: 3 },
      { t: 5300, shot: 'orbit', az: 200, el: 14, dist: 16, lookY: SPH_Y, fov: 42, vehicle: 'sat', blend: 3 },
    ],
    captions: [
      { t: -10, say: 'ready' }, { t: 0.6, say: 'liftoff' }, { t: 16, say: 'regulator' }, { t: T_STRAP, say: 'boosters' }, { t: T_COFF, say: 'core' }, { t: T_SEP, say: 'sep' }, { t: T_SEP + 4, say: 'beep' },
      { t: T_SEP + 400, say: 'orbit' }, { t: 5500, say: 'lap' },
    ],
    audio: [
      { t: T_SEP + 0.8, src: 'audio/sputnik-beep.m4a', twin: 'audio/sputnik-beep.m4a', gain: 1 },
      { t: T_SEP + 6, src: 'audio/sputnik-beep.m4a', twin: 'audio/sputnik-beep.m4a', gain: 1 },
    ],
    effects: [
      { t: -9, effect: 'exhaust-cloud', until: 14, axis: [0, 1, 0], count: 500, fire: 'core-stage', vehicle: 'rocket' },
    ],
  },
  chapters: [{ t: -10, say: 'chPad' }, { t: 0.6, say: 'chAscent' }, { t: T_STRAP - 6, say: 'chBoosters' }, { t: T_COFF - 8, say: 'chCore' }, { t: T_SEP, say: 'chSep' }, { t: T_SEP + 260, say: 'chOrbit' }],
  sources: [
    { say: 'srcWiki', url: 'https://en.wikipedia.org/wiki/Sputnik_1' },
    { say: 'srcNssdc', url: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1957-001B' },
    { say: 'srcClip', url: 'https://commons.wikimedia.org/wiki/File:Sputnik_beep.ogg' },
  ],
};
writeFileSync(OUT + 'sputnik-1.json', JSON.stringify(moment, null, 1).replace(/\n\s+/g, (m) => (m.length > 40 ? m : ' ')) + '\n');
console.log('sputnik-1.json written');
