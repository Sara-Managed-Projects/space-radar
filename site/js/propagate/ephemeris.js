// propagate/ephemeris.js -- a craft's own path, read from its file (internal #277, #406).
//
// Contract: indexOf(id) -> the row of data/ephemerides.js, or null
//           covers(id, tMs) -> boolean        from the index alone, no file needed
//           ensure(id, opts) -> Promise<eph|null>   fetch, decode, and answer for that record
//           decode(arrayBuffer) -> eph         pure; throws on a file this was not written for
//           stateAt(eph, tMs) -> {x,y,z,vx,vy,vz,centre,seg} | null   km and km/s round `centre`
//           placeAt(eph, tMs) -> {x,y,z,frame,cls,eph:true} | null  what propagate() returns
//           pathOf(eph) -> {t: Float64Array (ms), xyz: Float64Array (km, heliocentric ecliptic)}
//           loaded(id) -> eph | null
//
// WHY. A deep-space craft was drawn from today's position only, so no flyby and no launch could
// move the clock: the map had no path for that day (registry/missions.yaml, `place: none`). Each
// craft now has a small file of JPL Horizons state vectors over its whole life,
// site/data/eph/<id>.bin, built by scripts/build_ephemerides.py (the format is written there).
// Between two samples the path is a cubic Hermite curve through both positions and both
// velocities, the same sum as propagate/sampled.js.
//
// NEVER AT BOOT. Nothing in the boot graph imports this file. ui/missions.js does, and it arrives
// with the first card; a craft's file is fetched when its card opens or an event of its mission
// is chosen. Once here, the file answers for the record inside its span (propagate/index.js asks
// EPHEMERIS_OF first), and outside it the record's own propagator answers as it always did.
//
// A SEGMENT IS ROUND A WORLD OR ROUND THE SUN. Near a planet the samples are relative to that
// planet, and the answer is given in that planet's frame, so the craft is drawn exactly as far
// from the drawn planet as JPL has it from the real one (propagate/orbiter.js measured why: the
// drawn Jupiter is up to 18 000 km from JPL's). Round the EARTH the answer is given round the Sun
// instead, by adding where this map draws the Earth at that instant: the stage subtracts the same
// Earth again, so the craft is still exactly as far from the drawn Earth as JPL has it (float64
// keeps that to a few metres), and the card does not take Webb at L2, or a probe an hour after
// launch, for a satellite in Earth orbit with a lap time (seen 2026-10-06: "525 972 min a lap").
//
// HONEST ABOUT WHAT IT IS: `inferred`, never `measured`. It is JPL's track, interpolated, and the
// index says how closely the file follows that track (`goodToKm`, held to it by
// tests/test_ephemerides.mjs against Horizons positions the file was not built from) and, where
// JPL's own header calls the track rough or a plan, that too (`rough`).

import { EPHEMERIDES, EPH_CENTRES } from '../data/ephemerides.js';
import { EPHEMERIS_OF } from './index.js';
import { worldHelioEclKm } from './frames.js';

export { EPHEMERIDES, EPH_CENTRES };

const MAGIC = 'SREP';

export function indexOf(id) {
  return (id && Object.prototype.hasOwnProperty.call(EPHEMERIDES, id)) ? EPHEMERIDES[id] : null;
}

/** Whether the craft's file spans `tMs`. From the index: true before the file has been fetched. */
export function covers(id, tMs) {
  const row = indexOf(id);
  return !!row && Number.isFinite(tMs) && tMs >= Date.parse(row.from) && tMs <= Date.parse(row.to);
}

/** The file into segments of typed arrays. Times become unix seconds, float64. */
export function decode(buffer) {
  const view = new DataView(buffer);
  let magic = '';
  for (let i = 0; i < 4; i++) magic += String.fromCharCode(view.getUint8(i));
  if (magic !== MAGIC) throw new Error('ephemeris: not the file this was written for');
  if (view.getUint8(4) !== 1) throw new Error(`ephemeris: version ${view.getUint8(4)}, this reader knows 1`);
  const count = view.getUint8(5);
  const heads = [];
  let at = 8;
  for (let k = 0; k < count; k++) {
    const centre = EPH_CENTRES[view.getUint8(at)];
    const wide = view.getUint8(at + 1) === 0;
    const n = view.getUint32(at + 4, true);
    const t0 = view.getFloat64(at + 8, true);
    if (!centre || n < 2) throw new Error('ephemeris: a segment with no centre or fewer than two samples');
    heads.push({ centre, wide, n, t0 });
    at += 24;
  }
  const segments = heads.map((h) => {
    const t = new Float64Array(h.n);
    for (let i = 0; i < h.n; i++, at += 4) t[i] = h.t0 + view.getUint32(at, true);
    const p = new Float64Array(h.n * 3);
    if (h.wide) for (let i = 0; i < h.n * 3; i++, at += 8) p[i] = view.getFloat64(at, true);
    else for (let i = 0; i < h.n * 3; i++, at += 4) p[i] = view.getFloat32(at, true);
    const v = new Float64Array(h.n * 3);
    for (let i = 0; i < h.n * 3; i++, at += 4) v[i] = view.getFloat32(at, true);
    return { centre: h.centre, t, p, v };
  });
  if (at !== buffer.byteLength) throw new Error('ephemeris: the file is not as long as its header says');
  return { segments, fromMs: segments[0].t[0] * 1000, toMs: segments[segments.length - 1].t[segments[segments.length - 1].t.length - 1] * 1000 };
}

function segmentAt(eph, tS) {
  const segs = eph.segments;
  // The last segment that has started: at a boundary the later one answers.
  for (let k = segs.length - 1; k >= 0; k--) {
    const t = segs[k].t;
    if (tS >= t[0]) return tS <= t[t.length - 1] ? segs[k] : null;
  }
  return null;
}

/** State at `tMs`, km and km/s relative to `centre` on ecliptic J2000 axes; null outside the file. */
export function stateAt(eph, tMs) {
  if (!eph || !Number.isFinite(tMs)) return null;
  const tS = tMs / 1000;
  const seg = segmentAt(eph, tS);
  if (!seg) return null;
  const { t, p, v } = seg;
  let lo = 0;
  let hi = t.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (t[mid] <= tS) lo = mid; else hi = mid;
  }
  const a = lo * 3;
  const b = hi * 3;
  const h = t[hi] - t[lo];
  const s = (tS - t[lo]) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1;
  const h10 = (s3 - 2 * s2 + s) * h;
  const h01 = -2 * s3 + 3 * s2;
  const h11 = (s3 - s2) * h;
  const d00 = (6 * s2 - 6 * s) / h;
  const d10 = 3 * s2 - 4 * s + 1;
  const d11 = 3 * s2 - 2 * s;
  return {
    x: h00 * p[a] + h10 * v[a] + h01 * p[b] + h11 * v[b],
    y: h00 * p[a + 1] + h10 * v[a + 1] + h01 * p[b + 1] + h11 * v[b + 1],
    z: h00 * p[a + 2] + h10 * v[a + 2] + h01 * p[b + 2] + h11 * v[b + 2],
    vx: d00 * (p[a] - p[b]) + d10 * v[a] + d11 * v[b],
    vy: d00 * (p[a + 1] - p[b + 1]) + d10 * v[a + 1] + d11 * v[b + 1],
    vz: d00 * (p[a + 2] - p[b + 2]) + d10 * v[a + 2] + d11 * v[b + 2],
    centre: seg.centre,
    seg,
  };
}

/** The same, as propagate() answers: in the centre's frame, `inferred`, and marked as the file's. */
export function placeAt(eph, tMs) {
  const st = stateAt(eph, tMs);
  if (!st) return null;
  if (st.centre === 'earth') {
    const e = worldHelioEclKm('earth', tMs);
    if (!e) return null;
    return { x: st.x + e.x, y: st.y + e.y, z: st.z + e.z, frame: 'sun-inertial', cls: 'inferred', eph: true, centre: 'earth', tMs };
  }
  return { x: st.x, y: st.y, z: st.z, frame: `${st.centre}-inertial`, cls: 'inferred', eph: true, centre: st.centre, tMs };
}

/**
 * Every kept sample as a point round the Sun (km, ecliptic J2000), for the line of the path. A
 * sample round a world is moved by where this map draws that world AT THAT SAMPLE'S TIME, so the
 * line passes through the craft wherever the clock is. Worked out once a file.
 */
export function pathOf(eph) {
  if (!eph) return null;
  if (eph.path) return eph.path;
  let n = 0;
  for (const s of eph.segments) n += s.t.length;
  const t = new Float64Array(n);
  const xyz = new Float64Array(n * 3);
  let k = 0;
  for (const s of eph.segments) {
    for (let i = 0; i < s.t.length; i++) {
      const o = s.centre === 'sun' ? null : worldHelioEclKm(s.centre, s.t[i] * 1000);
      if (s.centre !== 'sun' && !o) continue;
      t[k] = s.t[i] * 1000;
      xyz[k * 3] = s.p[i * 3] + (o ? o.x : 0);
      xyz[k * 3 + 1] = s.p[i * 3 + 1] + (o ? o.y : 0);
      xyz[k * 3 + 2] = s.p[i * 3 + 2] + (o ? o.z : 0);
      k += 1;
    }
  }
  eph.path = { t: t.subarray(0, k), xyz: xyz.subarray(0, k * 3) };
  return eph.path;
}

const ready = new Map();   // id -> eph
const pending = new Map(); // id -> Promise<eph|null>

export function loaded(id) {
  return ready.get(id) || null;
}

/**
 * Fetch and decode a craft's file, once, and let it answer for that record. Resolves with null
 * (and says why on the console) when the craft has no file or the file cannot be read: the
 * record's own propagator goes on answering, which is today's behaviour.
 * `opts.read(file)` -> Promise<ArrayBuffer> replaces the fetch (the tests read from disk).
 */
export function ensure(id, opts = {}) {
  const row = indexOf(id);
  if (!row) return Promise.resolve(null);
  if (ready.has(id)) return Promise.resolve(ready.get(id));
  if (pending.has(id)) return pending.get(id);
  const read = opts.read || ((file) => fetch(new URL(`../../data/eph/${file}`, import.meta.url))
    .then((r) => { if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`); return r.arrayBuffer(); }));
  const p = Promise.resolve().then(() => read(row.file)).then((buffer) => {
    if (buffer.byteLength !== row.bytes) throw new Error(`${row.file}: ${buffer.byteLength} bytes, the index says ${row.bytes}`);
    const eph = decode(buffer);
    eph.id = id;
    eph.row = row;
    ready.set(id, eph);
    EPHEMERIS_OF.set(id, (tMs) => placeAt(eph, tMs));
    if (typeof window !== 'undefined' && window.dispatchEvent) window.dispatchEvent(new CustomEvent('sr:ephemeris', { detail: { id } }));
    return eph;
  }).catch((e) => {
    pending.delete(id);
    console.warn('a path file did not load', e);
    return null;
  });
  pending.set(id, p);
  return p;
}
