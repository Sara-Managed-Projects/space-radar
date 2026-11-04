// tools/moments-build/newhorizons.mjs -- New Horizons at Pluto, 14 July 2015 (release 1.7.9, internal #1058).
// Writes site/data/moments/new-horizons-pluto.json and paths/new-horizons-pluto.json. `node tools/moments-build/newhorizons.mjs`.
//
// T-0 IS JPL'S, NOT NASA'S TIMETABLE'S. Horizons (https://ssd.jpl.nasa.gov/api/horizons.api, -98 about 500@999, read 3 November 2026 through a one-minute table
// from 11:46 to 11:52 UT) has the range rate pass through zero between 11:48:00 (-0.40 km/s) and 11:49:00 (+0.43 km/s): nearest Pluto at about 11:48:29 UT,
// and so has the repository's own file of that path (printed below). NASA's published timetable has the closest approach at 11:49:57 UTC, 88 seconds later;
// the two are not reconciled here (the planned time against the solved one is the likeliest reason, not a finding). The replay follows the track, and says so.
// WHAT IS PUBLISHED: closest approach to Pluto at 7:49:57 am EDT, 11:49:57 UTC on 14 July 2015, "approximately 7,800 miles (12,500 km) above the
// surface" at 30,800 mph (13.8 km/s), and the closest approach to Charon about 14 minutes later, within 17,930 miles (NASA's encounter timetable as
// phys.org printed it, "Pluto's time to shine just hours away", 2015-07-14); the signal that told the Earth it had survived arrived at 8:53 pm EDT, 00:53
// UTC on 15 July (Astronomy magazine, "Phoning home from Pluto").
// WHAT IS JPL'S: the path. The repository's own file of New Horizons' Horizons state vectors (site/data/eph/deep-new-horizons.bin, built by
// scripts/build_ephemerides.py from JPL Horizons -98, the stretch about Pluto) is read with the app's own reader, sampled and turned from the ecliptic
// into Pluto's frame (z its pole, x its node on the ICRF equator, as moments/world.js has it); it passes 13 676 km from Pluto's centre, 12 488 km over
// its surface, as printed below. WHAT IS OURS: Charon's place (above longitude 0 on Pluto's equator at 19 591 km: the two keep one face to each other),
// the craft's attitude (drawn nose along its path; it was pointing its instruments), the lamp.
import { readFileSync, writeFileSync } from 'node:fs';
import * as L from './lib.mjs';
import * as W from '../../site/js/moments/world.js';
import * as E from '../../site/js/propagate/ephemeris.js';

const OUT = new URL('../../site/data/moments/', import.meta.url).pathname;
const MODELS = new URL('../../site/models/', import.meta.url).pathname;
const DATA = new URL('../../site/data/eph/', import.meta.url).pathname;
const DEG = Math.PI / 180;
const epochMs = Date.parse('2015-07-14T11:48:29Z');                 // T-0: the second JPL Horizons has the craft nearest Pluto (NASA's timetable says 11:49:57)
const R_PLUTO = 1188300, CHARON_A = 19591;

const buf = readFileSync(DATA + 'deep-new-horizons.bin');
const eph = E.decode(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
// the turn from the ecliptic J2000 to the ICRF equator (the obliquity 84381.448 arcseconds), then to Pluto's frame fixed at the epoch
const eps = 84381.448 / 3600 * DEG, ce = Math.cos(eps), se = Math.sin(eps);
const ax = W.worldAxes('pluto', epochMs);
const toPluto = (v) => W.toWorldFrame(ax, [v[0], v[1] * ce - v[2] * se, v[1] * se + v[2] * ce]);
const T0 = -21600, T1 = 2400;
const rows = [];
const times = [];
for (let t = T0; t <= T1; t += (Math.abs(t) <= 3600 ? 60 : 300)) times.push(t);
for (const t of times) {
  const s = E.stateAt(eph, epochMs + t * 1000);
  if (!s || s.centre !== 'pluto') throw new Error(`no Pluto-centred sample at ${t}`);
  const p = toPluto([s.x, s.y, s.z]), v = toPluto([s.vx, s.vy, s.vz]);
  rows.push([t, ...p.map((x) => +x.toFixed(3)), ...v.map((x) => +x.toFixed(6))]);
}
let nearest = 1e18, tNear = 0;
for (let t = -300; t <= 300; t += 0.5) { const s = E.stateAt(eph, epochMs + t * 1000); const r = Math.hypot(s.x, s.y, s.z); if (r < nearest) { nearest = r; tNear = t; } }
const sNear = E.stateAt(eph, epochMs + tNear * 1000);
console.log(`closest approach in the file: ${nearest.toFixed(0)} km from Pluto's centre (${(nearest - R_PLUTO / 1000).toFixed(0)} km over the surface; NASA: about 12 500) at ${tNear} s from 11:48:29 UTC, ${Math.hypot(sNear.vx, sNear.vy, sNear.vz).toFixed(2)} km/s (NASA: 13.8)`);
const near = toPluto([sNear.x, sNear.y, sNear.z]);
// the sub-craft point at the nearest second, on the turning Pluto (the frame the moment is placed in)
const wNear = W.worldAxes('pluto', epochMs + tNear * 1000).w;
const lat = Math.asin(near[2] / Math.hypot(...near)) / DEG;
const lon = ((((Math.atan2(near[1], near[0]) - wNear) / DEG) % 360) + 540) % 360 - 180;
console.log('sub-craft point at closest approach', lat.toFixed(1), lon.toFixed(1));
// Charon above longitude 0 on the equator: the time it is nearest the craft
let cn = 1e18, tC = 0;
for (let t = 0; t <= 2400; t += 1) {
  const w = W.worldAxes('pluto', epochMs + t * 1000).w;
  const q = [CHARON_A * Math.cos(w), CHARON_A * Math.sin(w), 0];
  const s = E.stateAt(eph, epochMs + t * 1000), p = toPluto([s.x, s.y, s.z]);
  const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  if (d < cn) { cn = d; tC = t; }
}
console.log(`Charon (above longitude 0) is nearest the craft ${cn.toFixed(0)} km at ${tC} s (${new Date(epochMs + tC * 1000).toISOString()}); NASA: about 14 minutes after Pluto's closest approach (11:49:57), within 28 860 km`);

L.save(OUT + 'paths/new-horizons-pluto.json', rows, 'New Horizons about Pluto, 6 hours before closest approach to 40 minutes after: JPL Horizons -98 as the repository\'s site/data/eph/deep-new-horizons.bin holds it (scripts/build_ephemerides.py), sampled every 60 s inside an hour of the closest approach and every 300 s outside, in Pluto\'s frame (z the pole, x the node on the ICRF equator, fixed at 11:48:29 UTC). km and km/s.');

const box = L.glbBox(MODELS + 'new-horizons.glb');
const lengthM = +(box.max[1] - box.min[1]).toFixed(3);
const pace = [[T0, -3600, 300], [-3600, -300, 40], [-300, -40, 6], [-40, 40, 1.5], [40, 700, 20], [700, 1000, 10], [1000, T1, 25]].map(([from, to, rate]) => ({ from, to, rate }));
let play = 0; for (const q of pace) play += (q.to - q.from) / q.rate;
console.log('play time s', play.toFixed(0), 'length', lengthM);
// the camera: a wide view along the line of the approach, turned a little aside so the craft is not in front of the planet; and the compass
// azimuth and elevation (the director's own horizon axes, stage +Y the pole) of a camera that has Charon behind the craft, a few degrees to one side
const interp = (t) => { let i = rows.findIndex((r) => r[0] >= t); if (i < 1) i = 1; const a = rows[i - 1], b = rows[i], u = (t - a[0]) / (b[0] - a[0]); return [1, 2, 3].map((k) => a[k] + (b[k] - a[k]) * u); };
const rotZ = (v, deg) => { const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; };
const unit3 = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
const a0 = unit3(rows[0].slice(1, 4));
const approach = rotZ(a0, -3.5);
const toStage = (v) => [v[0], v[2], -v[1]];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function azElBehind(t, aside = 6) {
  const nh = interp(t), w = W.worldAxes('pluto', epochMs + t * 1000).w;
  const ch = [CHARON_A * Math.cos(w), CHARON_A * Math.sin(w), 0];
  const back = unit3(sub3(nh, ch));                                        // from Charon through the craft: where a camera must be to have Charon behind it
  const up = toStage(unit3(nh));
  let n = sub3([0, 1, 0], up.map((x) => x * up[1])); n = unit3(n);
  const e = unit3(cross3(n, up));
  const b = toStage(back), side = unit3(cross3(b, up));
  const d = unit3(b.map((x, k) => x * Math.cos(aside * DEG) + side[k] * Math.sin(aside * DEG)));
  return { az: +(Math.atan2(dot3(d, e), dot3(d, n)) / DEG + 360) % 360, el: +(Math.asin(dot3(d, up)) / DEG) };
}
const ch1 = azElBehind(tC - 20);
console.log('camera for Charon', ch1);
const moment = {
  format: 1, id: 'new-horizons-pluto', words: 'new-horizons-pluto', wordsFile: 'en.moments.newhorizons.js', world: 'pluto',
  epoch: '2015-07-14T11:48:29Z', span: [T0, T1], pace,
  place: { name: 'Pluto, under New Horizons at its closest approach', lat: +lat.toFixed(2), lon: +lon.toFixed(2), alt: 0, ground: { kind: 'land' } },
  trajectories: {
    path: { kind: 'vectors', truth: 'reconstructed', say: 'pathFlyby', frame: 'world', file: 'paths/new-horizons-pluto.json',
      source: 'JPL Horizons -98 about Pluto as the repository\'s file of its path holds it (the file follows JPL\'s track to a few kilometres), turned into Pluto\'s frame; the craft\'s attitude is ours' },
  },
  vehicles: [
    { id: 'nh', model: 'new-horizons', lengthM, path: 'path', attitude: 'prograde', window: [T0, T1], colour: 'probe' },
  ],
  tracks: {
    parts: [],
    camera: [
      { t: T0, shot: 'wide', look: 'earth-moon', dir: approach.map((x) => +x.toFixed(4)), distKm: 340000, fov: 34, vehicle: 'nh' },
      { t: -7200, shot: 'orbit', az: 90, el: 84, dist: 90, lookY: 1.2, fov: 36, vehicle: 'nh', blend: 5 },
      { t: -900, shot: 'orbit', az: 60, el: 84, dist: 60, lookY: 1.2, fov: 40, vehicle: 'nh', blend: 3 },
      { t: -40, shot: 'orbit', az: 20, el: 82, dist: 14, lookY: 1.2, fov: 42, spin: 0.2, vehicle: 'nh', blend: 3 },
      { t: 30, shot: 'orbit', az: 200, el: 86, dist: 13, lookY: 1.2, fov: 42, vehicle: 'nh', blend: 2 },
      { t: 200, shot: 'wide', look: 'earth-moon', dir: rotZ(a0, 100).map((x) => +x.toFixed(4)), distKm: 90000, fov: 30, vehicle: 'nh', blend: 5 },
      { t: tC - 60, shot: 'orbit', az: +ch1.az.toFixed(1), el: +ch1.el.toFixed(1), dist: 40, lookY: 1.2, fov: 40, vehicle: 'nh', blend: 3 },
      { t: 1300, shot: 'wide', look: 'earth-moon', dir: rotZ(a0, 100).map((x) => +x.toFixed(4)), distKm: 200000, fov: 34, vehicle: 'nh', blend: 4 },
    ],
    captions: [
      { t: T0, say: 'ready' }, { t: -7000, say: 'approach' }, { t: -900, say: 'last' }, { t: -45, say: 'closest' }, { t: 20, say: 'pluto' }, { t: 260, say: 'away' },
      { t: tC - 40, say: 'charon' }, { t: 1100, say: 'clock' }, { t: 2000, say: 'home' },
    ],
    audio: [],
    effects: [],
  },
  chapters: [{ t: T0, say: 'chApproach' }, { t: -300, say: 'chClosest' }, { t: 120, say: 'chAway' }, { t: tC - 60, say: 'chCharon' }],
  sources: [
    { say: 'srcTimetable', url: 'https://phys.org/news/2015-07-pluto-hours-timetable.html' },
    { say: 'srcHorizons', url: 'https://ssd.jpl.nasa.gov/horizons/' },
    { say: 'srcWiki', url: 'https://en.wikipedia.org/wiki/New_Horizons' },
    { say: 'srcPhone', url: 'https://www.astronomy.com/science/phoning-home-from-pluto-what-to-expect-from-new-horizons-this-week/' },
  ],
  audio_note: 'No sound plays: the encounter was silent on the craft and no recording of Mission Control read has a clear free licence; the words are captions.',
  facts: { closestKm: +nearest.toFixed(0), tClosest: tNear, charonNearS: tC, charonNearKm: +cn.toFixed(0) },
};
writeFileSync(OUT + 'new-horizons-pluto.json', JSON.stringify(moment, null, 1).replace(/\n\s+/g, (m) => (m.length > 60 ? m : ' ')) + '\n');
console.log('new-horizons-pluto.json written');
