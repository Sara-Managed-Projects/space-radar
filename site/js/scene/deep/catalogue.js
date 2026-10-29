// scene/deep/catalogue.js -- every known deep-sky object, in two quantised files (internal spec 0079 stage A2, internal #1060).
// The coordinator (scene/deep/deepsky.js) builds it from scene/deep/heroes.js DEEP_LAYERS on the Sun's three ladder rungs and
// never at boot: the files are fetched the first time one of them is entered.
//
//   createLayer(THREE, env) -> { group, frame(info), ready(), stats(), records(), recordAt(i), recordById(id), ownsId(id),
//                                pickAll(ndcX, ndcY, camera, viewport, limit), search(query, limit), caldwell(n), dispose() }
//     env  = { load?(): Promise<{main, oc}>, base?: URL }   (load is for tests; each is {manifest, buffer} or null)
//     info = { camera, renderer, stage, gain, visible, selectedId }
//   Pure, for tests/test_catalogue.mjs: parseTile, decodeRow, buildTable, arraysOf, rowOf, recordOfRow, searchNames, tileFade, tileRadiusPx,
//   glyphPx, designationKey
//
// WHAT IS IN THEM (scripts/build_deep_catalogue.py says how, and from what):
//   catalogue.bin  OpenNGC (13 372 objects less the 323 this map already draws as records or in the local volume), 46 of Harris's
//                  157 globular clusters (the rest are OpenNGC's own rows, with Harris's distance), 299 of Green's 310 supernova
//                  remnants (the rest are OpenNGC's own), and the Caldwell numbers of all 109.
//   catalogue-oc.bin  Hunt & Reffert's open clusters from Gaia DR3 that nothing else lists (6 072), and, in its manifest, the
//                  Gaia distance of 543 that OpenNGC lists too. A separate file because the Gaia term is non-commercial.
// ONE OBJECT, ONE MARK. An object the map already draws (dso.json: the Messier objects and the hand rows; the local volume's
// 800 galaxies) is left out of the files, by designation, when they are built.
//
// WHAT IS DRAWN. One point per object, in the sun-inertial frame at its distance, in a single draw call (two while the range of
// one distance is shown). Its mark is a symbol of its CLASS, not a picture of it: a soft round glow for a galaxy, a ring of dots
// for an open cluster, a bright core for a globular, a thin ring for a planetary nebula, a shell for a remnant, and so on
// (GLYPHS, in the fragment shader). Below GLYPH_FROM_PX across every mark is a soft dot in the class colour; the colour is
// illustrative. Where the catalogue gives a size the mark is as wide as the object (never under its class's floor); its light
// follows the apparent magnitude it would have from the camera, M + 5 log10(d / 10 pc), where the catalogue has a magnitude.
// An object whose distance is not its own (scripts/build_deep_catalogue.py: `typical` and `velocity`) is the FAINTER, LARGER,
// SOFTER grey-blue mark the local volume uses for its inferred galaxies, and the range of its distance is drawn as a line
// along its sky direction for the one selected -- its direction is measured, its depth is not, and the mark says so.
//
// PRECISION. Positions are in million light-years about the Sun, float32; the matrix carries them into the stage's scene units
// (scene/deep/localvolume.js says why that is enough).

import { parseDso } from '../../data/parsers.js';

export const UNDER_MEASURED = { marks: 'same' };

const MLY_KM = 9460730472580.8 * 1e6;
const LY_PER_MLY = 1e6;
const SUN_INERTIAL = 'sun-inertial';
const OBLIQUITY = (23.4392911 * Math.PI) / 180;
export const MAGIC = 'SRNC';
export const STRIDE = 24;
export const HEADER = 16;
/** The smallest a mark is drawn, CSS px: a galaxy's, then any other class's (so its symbol can be read). */
export const MIN_PX = 4.5;
export const MIN_PX_CLASS = 7;
export const MAX_PX = 256;
/** A mark shows its class symbol from GLYPH_FROM_PX across, fully by GLYPH_FULL_PX; narrower it is a soft dot. */
export const GLYPH_FROM_PX = 10;
export const GLYPH_FULL_PX = 20;
export const CULL_PX = 3;
export const FADE_PX = 40;
export const INFERRED_COLOUR = [0.6, 0.66, 0.8];
export const INFERRED_LIGHT = 0.6;
export const INFERRED_SIZE = 1.6;
export const LITE = [0.55, 0.8];
export const SELECTED_PX = 24;
export const PICK_MIN_PX = 12;
export const PICK_BEHIND_PX = 6;
/** Flags (byte 19 of a row): bit 0 inferred, bit 1 range assumed, bits 2-4 the method, bit 5 a Caldwell number. */
export const F_INFERRED = 1;
export const F_ASSUMED = 2;
export const F_CALDWELL = 32;
/** The classes' order is the build script's CLASSES; these are the draw words by index (the shader's `cls`). */
export const GLYPHS = ['ellipse', 'ellipse', 'dots', 'core', 'ring', 'lobes', 'lobes', 'patch', 'lobes', 'core-halo', 'shell', 'dots', 'point', 'point', 'cross', 'point'];
/** Class colours, an illustration: galaxies by Hubble group (warm, white, blue, unknown), then by class index. */
export const GALAXY_COLOURS = [[1.0, 0.86, 0.7], [0.95, 0.95, 1.0], [0.72, 0.84, 1.0], [0.88, 0.88, 0.92]];
export const CLASS_COLOURS = [
  null, [0.9, 0.9, 1.0], [0.75, 0.86, 1.0], [1.0, 0.86, 0.55], [0.4, 1.0, 0.85], [1.0, 0.45, 0.5], [0.5, 0.7, 1.0], [0.55, 0.45, 0.4],
  [0.92, 0.6, 0.8], [0.9, 0.7, 0.8], [0.72, 0.55, 1.0], [0.8, 0.86, 1.0], [1.0, 1.0, 0.9], [1.0, 1.0, 0.9], [0.8, 0.8, 0.8], [1.0, 0.8, 0.6],
];

// ------------------------------------------------------------------------------------------------ the files
/** A tile's header and a view of its rows, checked. Pure. */
export function parseTile(buffer) {
  const head = new DataView(buffer, 0, HEADER);
  const magic = String.fromCharCode(head.getUint8(0), head.getUint8(1), head.getUint8(2), head.getUint8(3));
  if (magic !== MAGIC) throw new Error(`catalogue: not a tile (${magic})`);
  const version = head.getUint32(4, true);
  const count = head.getUint32(8, true);
  const stride = head.getUint32(12, true);
  if (stride !== STRIDE || buffer.byteLength !== HEADER + count * stride) throw new Error(`catalogue: ${buffer.byteLength} bytes for ${count} rows of ${stride}`);
  return { version, count, stride, view: new DataView(buffer, HEADER) };
}

/** One row, decoded (the layout is the build script's pack()). Pure. */
export function decodeRow(tile, i) {
  const v = tile.view;
  const o = i * STRIDE;
  const raQ = v.getUint32(o, true);
  const deQ = v.getInt32(o + 4, true);
  const dQ = v.getUint16(o + 8, true);
  const loQ = v.getUint8(o + 10);
  const hiQ = v.getUint8(o + 11);
  const majQ = v.getUint16(o + 12, true);
  const ratioQ = v.getUint8(o + 14);
  const paQ = v.getUint8(o + 15);
  const magQ = v.getInt16(o + 16, true);
  const flags = v.getUint8(o + 19);
  const d = 10 ** ((dQ / 65535) * 10 + 1);
  return {
    raDeg: (raQ / 4294967296) * 360, decDeg: (deQ / 2147483648) * 90,
    distLy: d, loLy: d * 10 ** (-loQ / 100), hiLy: d * 10 ** (hiQ / 100),
    majArcmin: majQ ? 10 ** ((majQ / 65535) * 6 - 3) : null,
    minArcmin: majQ && ratioQ ? 10 ** ((majQ / 65535) * 6 - 3) * (ratioQ / 255) : null,
    paDeg: paQ === 255 ? null : paQ * 2,
    vmag: magQ === -32768 ? null : magQ / 100,
    cls: v.getUint8(o + 18), flags, inferred: (flags & F_INFERRED) !== 0, assumed: (flags & F_ASSUMED) !== 0,
    method: (flags >> 2) & 7, caldwell: (flags & F_CALDWELL) !== 0, sub: v.getUint8(o + 20), con: v.getUint8(o + 21),
  };
}

/** A unit vector on the sun-inertial (ecliptic J2000) axes for an equatorial J2000 direction. Pure. */
export function eclDir(raDeg, decDeg) {
  const ra = (raDeg * Math.PI) / 180, dec = (decDeg * Math.PI) / 180;
  const x = Math.cos(dec) * Math.cos(ra), y = Math.cos(dec) * Math.sin(ra), z = Math.sin(dec);
  const ce = Math.cos(OBLIQUITY), se = Math.sin(OBLIQUITY);
  return [x, y * ce + z * se, -y * se + z * ce];
}

/**
 * The two files as one table of rows, the open clusters after the OpenNGC ones. `main` and `oc` are {manifest, tile}; `oc` may be
 * null. The overlay of the second manifest (Gaia's distance for an OpenNGC cluster) is applied here, not in the first file. Pure.
 */
export function buildTable(main, oc) {
  const parts = oc ? [main, oc] : [main];
  const n = parts.reduce((a, p) => a + p.tile.count, 0);
  const T = {
    n, nMain: main.tile.count, parts,
    raDeg: new Float64Array(n), decDeg: new Float64Array(n), distLy: new Float64Array(n), loLy: new Float64Array(n), hiLy: new Float64Array(n),
    majArcmin: new Float32Array(n), minArcmin: new Float32Array(n), paDeg: new Float32Array(n).fill(NaN), vmag: new Float32Array(n).fill(NaN),
    cls: new Uint8Array(n), sub: new Uint8Array(n), con: new Uint8Array(n), method: new Uint8Array(n), inferred: new Uint8Array(n),
    assumed: new Uint8Array(n), caldwell: new Uint8Array(n), overlay: new Map(), ids: idsOf(parts),
  };
  let at = 0;
  for (const p of parts) {
    for (let i = 0; i < p.tile.count; i++, at++) {
      const r = decodeRow(p.tile, i);
      T.raDeg[at] = r.raDeg; T.decDeg[at] = r.decDeg; T.distLy[at] = r.distLy; T.loLy[at] = r.loLy; T.hiLy[at] = r.hiLy;
      T.majArcmin[at] = r.majArcmin || 0; T.minArcmin[at] = r.minArcmin || 0;
      if (r.paDeg !== null) T.paDeg[at] = r.paDeg;
      if (r.vmag !== null) T.vmag[at] = r.vmag;
      T.cls[at] = r.cls; T.sub[at] = r.sub; T.con[at] = r.con; T.method[at] = r.method;
      T.inferred[at] = r.inferred ? 1 : 0; T.assumed[at] = r.assumed ? 1 : 0; T.caldwell[at] = r.caldwell ? 1 : 0;
    }
  }
  if (oc && Array.isArray(oc.manifest.overlay)) {
    const gaia = main.manifest.methods.indexOf('gaia');
    for (const [row, d, lo, hi, members, age, name] of oc.manifest.overlay) {
      if (!(row >= 0 && row < T.nMain)) continue;
      T.distLy[row] = d; T.loLy[row] = lo; T.hiLy[row] = hi; T.method[row] = gaia; T.inferred[row] = 0; T.assumed[row] = 0;
      T.overlay.set(row, { members, age, name });
    }
  }
  return T;
}

/** The record ids, in row order: the slug of the name, a number after it where two rows would share one (the build script does the same). Pure. */
export function idsOf(parts) {
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    for (const name of p.manifest.names) {
      const base = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      let id = base;
      for (let n = 2; seen.has(id); n++) id = `${base}-${n}`;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}
/** The class group whose measured distances stand in for a missing one (the build script's GROUP, by class index). */
export const GROUP_OF = ['galaxy', 'galaxy', 'cluster', 'globular', 'galactic', 'galactic', 'galactic', 'galactic', 'galactic', 'galactic', 'galactic', 'cluster', 'star', 'star', 'galactic', 'star'];

/** Where row `i` lives: its part (0 or 1), the row in that part, and the part's manifest. Pure. */
export function partOf(T, i) {
  return i < T.nMain ? { p: 0, j: i, manifest: T.parts[0].manifest } : { p: 1, j: i - T.nMain, manifest: T.parts[1].manifest };
}

/**
 * The geometry's arrays from the table: one point per object, million light-years about the Sun; `radius` (half the width, Mly)
 * from its size at its distance; `mag` the absolute magnitude (99 where the catalogue has none). Pure.
 */
export function arraysOf(T) {
  const n = T.n;
  const P = { position: new Float32Array(n * 3), radius: new Float32Array(n), mag: new Float32Array(n), colour: new Float32Array(n * 3), cls: new Float32Array(n), inferred: new Float32Array(n), index: new Float32Array(n) };
  let far = 0, nInferred = 0;
  for (let i = 0; i < n; i++) {
    const dMly = T.distLy[i] / LY_PER_MLY;
    const dir = eclDir(T.raDeg[i], T.decDeg[i]);
    for (let k = 0; k < 3; k++) P.position[i * 3 + k] = dir[k] * dMly;
    P.radius[i] = T.majArcmin[i] > 0 ? (Math.tan((T.majArcmin[i] / 60 / 2) * (Math.PI / 180)) * dMly) : 0;
    const v = T.vmag[i];
    P.mag[i] = Number.isFinite(v) ? v - 5 * Math.log10(Math.max(1e-3, T.distLy[i] / 3.261563777) / 10) : 99;
    const cls = T.cls[i];
    const c = T.inferred[i] ? INFERRED_COLOUR : cls === 0 ? GALAXY_COLOURS[Math.min(3, T.sub[i])] : CLASS_COLOURS[cls] || CLASS_COLOURS[14];
    for (let k = 0; k < 3; k++) P.colour[i * 3 + k] = c[k];
    P.cls[i] = cls;
    P.inferred[i] = T.inferred[i];
    P.index[i] = i;
    if (T.inferred[i]) nInferred += 1;
    far = Math.max(far, T.hiLy[i] / LY_PER_MLY);
  }
  return { points: P, farMly: far, nInferred };
}

/** The apparent width of a row's mark in CSS px, as the vertex shader computes it (for picking). Pure. */
export function glyphPx(radiusMly, dMly, cls, inferred, pxPerRad) {
  const wide = (2 * radiusMly / Math.max(1e-9, dMly)) * pxPerRad;
  const floor = (cls <= 1 ? MIN_PX : MIN_PX_CLASS) * (inferred ? INFERRED_SIZE : 1);
  return Math.min(MAX_PX, Math.max(wide, floor));
}

/** The tile's light as its radius on the screen shrinks from FADE_PX to CULL_PX: 1 to 0, smooth. Pure. */
export function tileFade(radiusPx) {
  if (!(radiusPx < FADE_PX)) return 1;
  const t = Math.min(1, Math.max(0, (radiusPx - CULL_PX) / (FADE_PX - CULL_PX)));
  return t * t * (3 - 2 * t);
}

/** The whole tile's radius on the screen, CSS px; Infinity from inside it. Pure. */
export function tileRadiusPx(radiusScene, distanceScene, fovYRad, viewH) {
  if (!(distanceScene > radiusScene)) return Infinity;
  return (Math.asin(radiusScene / distanceScene) / (fovYRad / 2)) * (viewH / 2);
}

// ------------------------------------------------------------------------------------------------ names and searches
/** 'NGC 7000', 'ngc7000', 'NGC-7000' -> 'ngc7000'; 'Caldwell 20', 'C20', 'c 20' -> 'c20'; anything else lower-cased with spaces and hyphens removed. Pure. */
export function designationKey(text) {
  const s = String(text == null ? '' : text).trim().toLowerCase().replace(/[\s\-_.]+/g, '');
  const c = /^(?:caldwell|cald|c)0*(\d{1,3})$/.exec(s);
  return c ? `c${c[1]}` : s.replace(/^(ngc|ic)0+(\d)/, '$1$2');
}

/**
 * Rows of the table that a typed name finds: by designation (exact, then by its start), by common name or another identifier
 * (the start of a word), and a Caldwell number. At most `limit`, best first: [{ row, id (the record's, `dso-...`), name, sub, score }]. `caldwell`
 * numbers of objects the map already has answer with that record's id. Pure.
 */
export function searchNames(T, query, limit = 5) {
  const q = designationKey(query);
  const raw = String(query || '').trim().toLowerCase();
  if (q.length < 2) return [];
  const out = [];
  const main = T.parts[0].manifest;
  const cm = /^c(\d{1,3})$/.exec(q);
  if (cm && main.caldwellTable && main.caldwellTable[cm[1]]) {
    const e = main.caldwellTable[cm[1]];
    if (e.row !== undefined) out.push({ row: e.row, id: null, score: 100 });
    else if (e.id) out.push({ row: -1, id: e.id, score: 100, name: `Caldwell ${cm[1]}` });
  }
  const seen = new Set(out.map((o) => o.row));
  const consider = (i, score) => { if (!seen.has(i) && out.length < 200) { seen.add(i); out.push({ row: i, id: null, score }); } };
  if (!T.keys) T.keys = T.parts.flatMap((p) => p.manifest.names.map((n) => designationKey(n)));
  let at = 0;
  for (const p of T.parts) {
    const m = p.manifest;
    for (let j = 0; j < m.names.length; j++) {
      const i = at + j;
      const k = T.keys[i];
      if (k === q) { consider(i, 90); continue; }
      if (k.startsWith(q) && q.length >= 3 && /\d/.test(q)) { consider(i, 60 - Math.min(20, k.length - q.length)); continue; }
      const common = m.common && m.common[j];
      if (common && raw.length >= 3) {
        const c = common.toLowerCase();
        if (c === raw) consider(i, 80);
        else if (c.startsWith(raw)) consider(i, 55);
        else if (c.includes(` ${raw}`)) consider(i, 40);
      }
    }
    at += m.names.length;
  }
  out.sort((a, b) => b.score - a.score || a.row - b.row);
  return out.slice(0, Math.max(1, limit)).map((o) => {
    if (o.row < 0) return { row: -1, id: o.id, name: o.name, sub: 'Deep-sky object', score: o.score };
    const { p, j, manifest } = partOf(T, o.row);
    return { row: o.row, id: `dso-${T.ids[o.row]}`, name: (manifest.common && manifest.common[j]) || manifest.names[j], sub: manifest.classes[T.cls[o.row]].text, score: o.score };
  });
}

// ------------------------------------------------------------------------------------------------ records
const fmt1 = (x) => (Math.round(x * 10) / 10).toString();
/** ', about 120 million years old' from log10(age/yr); '' where there is none. Pure. */
export function ageWords(logAge) {
  if (!Number.isFinite(logAge)) return '';
  const y = 10 ** logAge;
  return `, about ${y >= 1e9 ? `${fmt1(y / 1e9)} billion` : `${Math.max(1, Math.round(y / 1e6))} million`} years old`;
}
const METHOD_TEXT = {
  redshift: (T, i) => `its redshift (OpenNGC, from NED), turned into a distance with the map's one cosmology (Planck 2018, comoving); the range is a peculiar velocity of 300 km/s`,
  velocity: () => 'not measured: its redshift is too small to say how far it is (galaxies move as fast as the expansion carries them at this distance), so it is placed where the expansion alone would put it, with a wide range (OpenNGC, from NED)',
  parallax: () => 'its parallax (OpenNGC); the catalogue lists no error, so the range is assumed',
  parent: (T, i, manifest, j) => { const pid = manifest.parents && manifest.parents[j]; const pn = (pid && manifest.parentNames && manifest.parentNames[pid]) || 'its parent'; return `not measured: it lies inside the outline of ${pn} on the sky and has no distance of its own, so it is placed at ${pn}\u2019s distance, with its range; that it belongs there is assumed from the position, not measured`; },
  harris: () => 'Harris, Catalog of Parameters for Milky Way Globular Clusters (1996, 2010 edition), distance from the Sun; the range is assumed',
  gaia: () => 'Hunt & Reffert 2023 from Gaia DR3 parallaxes, the 16th to 84th percentile of the cluster’s distance',
};
const DISTANCE_METHOD = { parallax: 'parallax', redshift: 'redshift', harris: 'standard-candle', gaia: 'parallax', parent: 'assumed-member-of-parent' };

/** The row of dso.json's shape for table row `i`. Pure; `T` from buildTable. */
export function rowOf(T, i) {
  const { j, manifest } = partOf(T, i);
  const name = manifest.names[j];
  const common = manifest.common && manifest.common[j] ? manifest.common[j] : null;
  const cls = manifest.classes[T.cls[i]];
  const methodName = manifest.methods[T.method[i]];
  const section = manifest.sections.find((s) => j >= s.from && j < s.to) || { src: 'openngc' };
  const src = (manifest.sources && manifest.sources[section.src]) || { name: 'the catalogue' };
  const dir = eclDir(T.raDeg[i], T.decDeg[i]);
  const dLy = T.distLy[i];
  const overlay = T.overlay.get(i);
  let distanceSource;
  if (T.inferred[i] && methodName === 'typical') {
    const g = GROUP_OF[T.cls[i]];
    const t = g && manifest.typical && manifest.typical[g];
    distanceSource = `not measured: the catalogue gives no distance. Its direction is measured and its depth is not: it is drawn at ${Math.round(dLy).toLocaleString('en-US')} light-years, a point in the range ${t ? `in which the ${t.of} measured distances of its kind in this file lie (the middle 68 %, ${Math.round(t.low).toLocaleString('en-US')} to ${Math.round(t.high).toLocaleString('en-US')} light-years)` : 'of its kind'}, chosen by its name so that the unmeasured ones do not stack on one sphere`;
  } else {
    distanceSource = (METHOD_TEXT[methodName] || METHOD_TEXT.parallax)(T, i, manifest, j);
  }
  const distance = !T.inferred[i] && DISTANCE_METHOD[methodName]
    ? { method: DISTANCE_METHOD[methodName], source: distanceSource, read: manifest.read || null } : null;
  const cald = manifest.cald && manifest.cald[j];
  const bits = [];
  if (cald) bits.push(`Caldwell ${cald}`);
  if (section.src === 'green' && manifest.snr && manifest.snr[j]) {
    const s = manifest.snr[j];
    bits.push(`in Green’s catalogue as a ${({ S: 'shell', C: 'filled-centre', F: 'filled-centre', '?': 'remnant' })[String(s.type).charAt(0)] || 'remnant'} remnant`);
  }
  if (overlay) bits.push(`${overlay.members} Gaia members${ageWords(overlay.age)} (Hunt & Reffert 2023)`);
  if (section.src === 'hr23' && manifest.members) {
    const n = manifest.members[j];
    const age = manifest.ages ? manifest.ages[j] : null;
    bits.push(`${n} Gaia members${ageWords(age)} (Hunt & Reffert 2023)`);
  }
  const aka = manifest.aka && manifest.aka[j] ? manifest.aka[j] : '';
  const kindWord = cls.text.toLowerCase();
  return {
    id: T.ids[i],
    name: common || name,
    messier: null,
    designation: /^(NGC|IC) \d/.test(name) ? name : null,
    common,
    kind: cls.kind,
    typeCode: cls.code,
    typeText: cls.text,
    hubble: null,
    con: T.con[i] === 255 ? null : manifest.cons[T.con[i]] || null,
    raDeg: T.raDeg[i], decDeg: T.decDeg[i],
    distLy: Math.round(dLy), distLyLow: Math.round(T.loLy[i]), distLyHigh: Math.round(T.hiLy[i]),
    majAxArcmin: T.majArcmin[i] > 0 ? Math.round(T.majArcmin[i] * 100) / 100 : null,
    minAxArcmin: T.minArcmin[i] > 0 ? Math.round(T.minArcmin[i] * 100) / 100 : null,
    posAngDeg: Number.isFinite(T.paDeg[i]) ? T.paDeg[i] : null,
    vmag: Number.isFinite(T.vmag[i]) ? T.vmag[i] : null,
    posLy: [dir[0] * dLy, dir[1] * dLy, dir[2] * dLy],
    distanceSource,
    positionSource: src.name,
    why: bits.length ? `${bits.join('; ')}.` : null,
    parent: (manifest.parents && manifest.parents[j]) || null, orientation: null, morphology: null,
    distance,
    drawn: ['catalogue'],
    _aka: [aka, kindWord],
  };
}

/** The record (parseDso's shape) of row `i`, with the card's "drawn as" words. Pure. */
export function recordOfRow(T, i) {
  const row = rowOf(T, i);
  const aka = row._aka[0];
  delete row._aka;
  const rec = parseDso({ objects: [row] })[0] || null;
  if (!rec) return null;
  if (aka) rec.meta.aliases.push(...aka.split('; ').filter(Boolean));
  if (rec.meta.designation == null && row.name !== row.designation) rec.meta.aliases.push(row.name);
  Object.assign(rec.meta, {
    drawsAs: 'variant',
    drawnName: `${rec.name}, as a ${row.typeText.toLowerCase()} mark from the catalogue`,
    departure: 'a point of light at its catalogued place with a symbol for its kind, as wide as its catalogued size allows and never under a few pixels, so the size is only a lower bound on screen; its shape is not drawn' +
      (T.inferred[i] ? '. Its distance is not its own, so the mark is fainter and softer, and its possible range can be shown as a line' : ''),
  });
  return rec;
}

// ------------------------------------------------------------------------------------------------ the shaders
const VERT_POINTS = /* glsl */ `
attribute float aRadius;   // half the object's width, million light-years (0: none catalogued)
attribute float aMag;      // absolute magnitude (99: none catalogued)
attribute vec3 aColour;
attribute float aClass;    // the class index (GLYPHS)
attribute float aInferred; // 1: the distance is not its own (fainter, wider, softer)
attribute float aIndex;    // the row (the selected one is lit: uSelected)
uniform float uSelected;
uniform vec2 uLite;
uniform vec2 uInfer;
uniform float uScale;      // scene units per million light-years
uniform float uPxPerRad;
uniform float uPixelRatio;
uniform vec2 uMinPx;       // a galaxy's floor, any other class's floor
uniform float uMaxPx;
varying vec3 vColour;
varying float vLight;
varying float vSoft;
varying float vClass;
varying float vSize;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float dMly = max(1e-9, length(mv.xyz) / uScale);
  float wide = 2.0 * aRadius / dMly * uPxPerRad;
  float floorPx = (aClass < 1.5 ? uMinPx.x : uMinPx.y) * mix(1.0, uInfer.y, aInferred);
  float size = clamp(wide, floorPx, uMaxPx);
  float sel = step(abs(aIndex - uSelected), 0.5);
  size = max(size, sel * ${SELECTED_PX.toFixed(1)});
  float m = aMag + 5.0 * log(dMly * 1.0e6 / 32.6156) / log(10.0);
  float lit = aMag > 90.0 ? 0.3 : clamp((19.0 - m) / 11.0, 0.0, 1.0);
  float spread = clamp((floorPx * 2.5) / size, 0.18, 1.0);
  float past = wide > uMaxPx ? uMaxPx / wide : 1.0;
  vLight = (uLite.x + uLite.y * lit) * spread * spread * past * mix(1.0, uInfer.x, aInferred);
  vLight = mix(vLight, max(vLight, 1.2), sel);
  vSoft = aInferred;
  vColour = aColour;
  vClass = aClass;
  vSize = size;
  gl_PointSize = size * uPixelRatio;
}`;

// The symbols. p is the point sprite's coordinate in [-1, 1]; each returns a profile in 0..1, 0 at the rim. A mark narrower than
// GLYPH_FROM_PX is only the soft disc (so a thousand distant galaxies are a haze and not a thousand symbols).
const FRAG_POINTS = /* glsl */ `
uniform float uGain;
uniform float uFade;
varying vec3 vColour;
varying float vLight;
varying float vSoft;
varying float vClass;
varying float vSize;
float disc(float r2, float k) {
  float floorK = exp(-k);
  return (exp(-r2 * k) - floorK) / (1.0 - floorK);
}
float ring(float r, float at, float w) {
  float d = (r - at) / w;
  return exp(-d * d);
}
float symbol(vec2 p, float cls) {
  float r = length(p);
  float r2 = r * r;
  float a = atan(p.y, p.x);
  if (cls < 1.5) return disc(r2, 2.6);                                                      // galaxy: a soft disc
  if (cls < 2.5 || (cls > 10.5 && cls < 11.5)) {                                             // open cluster, association: a ring of dots
    float dots = 0.5 + 0.5 * cos(a * 7.0);
    return 0.35 * disc(r2, 5.0) + 0.9 * ring(r, 0.68, 0.16) * (0.25 + 0.75 * dots * dots);
  }
  if (cls < 3.5) return exp(-r2 * 9.0) + 0.35 * disc(r2, 2.4);                              // globular: a bright core in a halo
  if (cls < 4.5) return ring(r, 0.55, 0.11) + 0.6 * exp(-r2 * 45.0);                         // planetary nebula: a thin ring, a point
  if (cls < 5.5 || cls < 6.5 || (cls > 7.5 && cls < 8.5)) {                                  // emission, reflection, plain nebula: two lobes
    float q = p.y * 1.3;
    float l1 = exp(-((p.x - 0.28) * (p.x - 0.28) + q * q) * 7.0);
    float l2 = exp(-((p.x + 0.28) * (p.x + 0.28) + q * q) * 7.0);
    return 0.5 * disc(r2, 2.2) + 0.55 * (l1 + l2);
  }
  if (cls < 7.5) return 0.45 * disc(r2, 3.0);                                                // dark nebula: a faint patch
  if (cls < 9.5) return exp(-r2 * 14.0) + 0.45 * disc(r2, 2.0);                              // cluster with nebulosity
  if (cls < 10.5) return 0.35 * disc(r2, 3.0) + 0.95 * ring(r, 0.72, 0.15);                  // remnant: a shell
  if (cls < 13.5) return exp(-r2 * 12.0);                                                    // a star, a double star: a point
  if (cls < 14.5) {                                                                          // other: a cross
    float arm = exp(-(p.x * 5.0) * (p.x * 5.0)) + exp(-(p.y * 5.0) * (p.y * 5.0));
    return clamp(arm, 0.0, 1.0) * exp(-r2 * 2.0);
  }
  return exp(-r2 * 12.0);                                                                    // a nova: a point
}
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(p, p);
  if (r2 > 1.0) discard;
  float k = mix(2.2, 3.6, vSoft);
  float soft = disc(r2, k);
  float glyph = mix(0.0, 1.0, smoothstep(${GLYPH_FROM_PX.toFixed(1)}, ${GLYPH_FULL_PX.toFixed(1)}, vSize)) * (1.0 - vSoft * 0.6);
  float prof = mix(soft, symbol(p, vClass), glyph);
  gl_FragColor = vec4(vColour * (vLight * prof * uGain * uFade), 1.0);
}`;

const VERT_LINES = /* glsl */ `
attribute float aWeight;
varying float vWeight;
varying vec3 vColour;
varying vec3 vView;
void main() {
  vWeight = aWeight;
  vColour = vec3(${INFERRED_COLOUR.join(', ')});
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG_LINES = /* glsl */ `
uniform float uGain;
uniform float uScale;
uniform float uFade;
varying float vWeight;
varying vec3 vColour;
varying vec3 vView;
void main() {
  float dMly = length(vView) / uScale;
  float nearFade = smoothstep(0.0005, 0.004, dMly);
  gl_FragColor = vec4(vColour * (0.45 * vWeight * nearFade * uGain * uFade), 1.0);
}`;

async function fetchPart(base, stem) {
  const at = (name) => String(new URL(`data/deep/${name}`, base));
  const [mr, br] = await Promise.all([fetch(at(`${stem}.json`)), fetch(at(`${stem}.bin`))]);
  if (!mr.ok || !br.ok) throw new Error(`${stem}: HTTP ${mr.status} / ${br.status}`);
  return { manifest: await mr.json(), buffer: await br.arrayBuffer() };
}

/** The two files from the same origin; the open clusters' file may fail without the rest. */
async function fetchFiles(base) {
  const [main, oc] = await Promise.all([fetchPart(base, 'catalogue'), fetchPart(base, 'catalogue-oc').catch((e) => { console.warn('deep: the open clusters did not load', e); return null; })]);
  return { main, oc };
}

export function createLayer(THREE, env = {}) {
  const group = new THREE.Group();
  group.name = 'deep-catalogue';
  group.renderOrder = -1;
  group.matrixAutoUpdate = false;
  group.visible = false;
  const uniforms = {
    uScale: { value: 1 }, uPxPerRad: { value: 1000 }, uPixelRatio: { value: 1 },
    uMinPx: { value: new THREE.Vector2(MIN_PX, MIN_PX_CLASS) }, uMaxPx: { value: MAX_PX }, uGain: { value: 1 }, uFade: { value: 1 }, uSelected: { value: -1 },
    uLite: { value: new THREE.Vector2(LITE[0], LITE[1]) }, uInfer: { value: new THREE.Vector2(INFERRED_LIGHT, INFERRED_SIZE) },
  };
  const state = { loaded: false, failed: null, T: null, arrays: null, bytes: 0, fileBytes: 0, placedFor: null, culled: 'not loaded', radiusPx: 0, calls: 0 };
  let points = null;
  let lines = null;
  let rangeShown = -1;
  const sphere = new THREE.Sphere();
  const frustum = new THREE.Frustum();
  const _m = new THREE.Matrix4();
  const _c = new THREE.Vector3();
  const base = env.base || (typeof import.meta !== 'undefined' ? new URL('../../../', import.meta.url) : null);

  const loading = Promise.resolve()
    .then(() => (env.load ? env.load() : fetchFiles(base)))
    .then(({ main, oc }) => {
      const m = { manifest: main.manifest, tile: parseTile(main.buffer) };
      const o = oc ? { manifest: oc.manifest, tile: parseTile(oc.buffer) } : null;
      state.T = buildTable(m, o);
      state.arrays = arraysOf(state.T);
      state.fileBytes = main.buffer.byteLength + (oc ? oc.buffer.byteLength : 0);
      build(state.arrays);
      state.loaded = true;
    })
    .catch((e) => { state.failed = String((e && e.message) || e); console.warn('deep: the catalogue did not load', e); });

  function build(a) {
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(a.points.position, 3));
    pg.setAttribute('aRadius', new THREE.BufferAttribute(a.points.radius, 1));
    pg.setAttribute('aMag', new THREE.BufferAttribute(a.points.mag, 1));
    pg.setAttribute('aColour', new THREE.BufferAttribute(a.points.colour, 3));
    pg.setAttribute('aClass', new THREE.BufferAttribute(a.points.cls, 1));
    pg.setAttribute('aInferred', new THREE.BufferAttribute(a.points.inferred, 1));
    pg.setAttribute('aIndex', new THREE.BufferAttribute(a.points.index, 1));
    points = new THREE.Points(pg, new THREE.ShaderMaterial({
      vertexShader: VERT_POINTS, fragmentShader: FRAG_POINTS, uniforms,
      transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    }));
    points.name = 'deep-catalogue-points';
    points.frustumCulled = false;
    points.renderOrder = -1;
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
    lg.setAttribute('aWeight', new THREE.BufferAttribute(new Float32Array([0, 1, 1, 0]), 1));
    lines = new THREE.LineSegments(lg, new THREE.ShaderMaterial({
      vertexShader: VERT_LINES, fragmentShader: FRAG_LINES, uniforms,
      transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    }));
    lines.name = 'deep-catalogue-ranges';
    lines.frustumCulled = false;
    lines.renderOrder = -1;
    lines.visible = false;
    group.add(points, lines);
    state.bytes = [pg, lg].reduce((n, g) => n + Object.values(g.attributes).reduce((k, at) => k + at.array.byteLength, 0), 0);
    sphere.radius = a.farMly;
  }

  /** The tile's matrix: million light-years about the Sun, sun-inertial, into this stage's scene. */
  function place(stage) {
    const key = `${stage.worldId}:${stage.unitKm}`;
    if (state.placedFor === key) return true;
    const A = stage.affineFrom ? stage.affineFrom(SUN_INERTIAL, stage.tMs) : null;
    if (!A) return false;
    const k = MLY_KM;
    _m.set(
      A.x[0] * k, A.y[0] * k, A.z[0] * k, A.o[0],
      A.x[1] * k, A.y[1] * k, A.z[1] * k, A.o[1],
      A.x[2] * k, A.y[2] * k, A.z[2] * k, A.o[2],
      0, 0, 0, 1,
    );
    const sun = stage.toScene({ x: 0, y: 0, z: 0 }, SUN_INERTIAL, stage.tMs);
    if (sun) _m.setPosition(sun);
    group.matrix.copy(_m);
    group.matrixWorldNeedsUpdate = true;
    uniforms.uScale.value = MLY_KM / stage.unitKm;
    state.placedFor = key;
    return true;
  }

  // ---- records on demand (24 000 rows are not parsed in advance): a row becomes a record when it is asked for
  const recs = new Map();
  let idRow = null;
  function recordAt(i) {
    if (!state.loaded || !(i >= 0 && i < state.T.n)) return null;
    if (!recs.has(i)) recs.set(i, recordOfRow(state.T, i));
    return recs.get(i);
  }
  function rowOfId(id) {
    if (!state.loaded || typeof id !== 'string' || !id.startsWith('dso-')) return -1;
    if (!idRow) {
      idRow = new Map();
      state.T.ids.forEach((x, i) => idRow.set(`dso-${x}`, i));
    }
    return idRow.has(id) ? idRow.get(id) : -1;
  }
  function recordById(id) { const i = rowOfId(id); return i >= 0 ? recordAt(i) : null; }

  let selectedRow = -1;
  function selectRow(id) {
    const row = typeof id === 'string' ? rowOfId(id) : -1;
    if (row === selectedRow) return;
    selectedRow = row;
    uniforms.uSelected.value = row;
    showRange(row);
  }

  function frame(info = {}) {
    state.calls = 0;
    const camera = info.camera;
    if (!state.loaded || !camera || info.visible === false || !info.stage) { group.visible = false; state.culled = state.loaded ? 'off' : 'not loaded'; return; }
    if (!place(info.stage)) { group.visible = false; state.culled = 'no frame'; return; }
    group.updateMatrixWorld(true);
    const viewH = info.renderer && info.renderer.domElement ? info.renderer.domElement.clientHeight || 800 : info.viewH || 800;
    const fovY = (camera.fov * Math.PI) / 180 / (camera.zoom || 1);
    uniforms.uPxPerRad.value = (viewH / 2) / Math.tan(fovY / 2);
    if (info.renderer && typeof info.renderer.getPixelRatio === 'function') uniforms.uPixelRatio.value = Math.min(2, Math.max(0.5, info.renderer.getPixelRatio()));
    uniforms.uGain.value = Number.isFinite(info.gain) && info.gain > 0 ? info.gain : 1;
    selectRow(info.selectedId);
    _c.setFromMatrixPosition(group.matrixWorld);
    sphere.center.copy(_c);
    const R = (state.arrays ? state.arrays.farMly : 0) * uniforms.uScale.value;
    sphere.radius = R;
    camera.updateMatrixWorld();
    _m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(_m);
    state.radiusPx = tileRadiusPx(R, camera.position.distanceTo(_c), fovY, viewH);
    if (!frustum.intersectsSphere(sphere)) { group.visible = false; state.culled = 'frustum'; return; }
    if (state.radiusPx < CULL_PX) { group.visible = false; state.culled = 'size'; return; }
    uniforms.uFade.value = tileFade(state.radiusPx);
    group.visible = true;
    state.culled = null;
    state.calls = 1 + (lines && lines.visible ? 1 : 0);
  }

  const _p = new THREE.Vector3();
  /** Candidates for a tap: {record, px, score}, nearest first. Ranks just behind the map's own marks. */
  function pickAll(ndcX, ndcY, camera, viewport, limit = 6) {
    if (!state.loaded || !group.visible || state.culled || !camera || !viewport) return [];
    camera.updateMatrixWorld();
    group.updateMatrixWorld();
    _m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(group.matrixWorld);
    const e = _m.elements;
    const A = state.arrays.points;
    const T = state.T;
    const halfW = viewport.w * 0.5, halfH = viewport.h * 0.5;
    const out = [];
    for (let i = 0; i < T.n; i++) {
      const x = A.position[i * 3], y = A.position[i * 3 + 1], z = A.position[i * 3 + 2];
      const w = e[3] * x + e[7] * y + e[11] * z + e[15];
      if (w <= 0) continue;
      const dx = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / w - ndcX) * halfW, dy = ((e[1] * x + e[5] * y + e[9] * z + e[13]) / w - ndcY) * halfH;
      const px = Math.sqrt(dx * dx + dy * dy);
      if (px > 30) continue;
      const dMly = T.distLy[i] / LY_PER_MLY;
      const reach = Math.min(24, Math.max(PICK_MIN_PX, glyphPx(A.radius[i], dMly, T.cls[i], T.inferred[i], uniforms.uPxPerRad.value) / 2 + 4));
      if (px > reach) continue;
      out.push({ i, px });
    }
    out.sort((p, q) => p.px - q.px);
    return out.slice(0, Math.max(1, limit)).map(({ i, px }) => ({ record: recordAt(i), px, score: px + PICK_BEHIND_PX })).filter((c) => c.record);
  }

  function showRange(i) {
    if (!lines || !state.T) return false;
    const ok = Number.isInteger(i) && i >= 0 && i < state.T.n && state.T.inferred[i] === 1;
    rangeShown = ok ? i : -1;
    lines.visible = ok;
    if (ok) {
      const T = state.T;
      const dir = eclDir(T.raDeg[i], T.decDeg[i]);
      const at = [T.loLy[i], T.distLy[i], T.distLy[i], T.hiLy[i]].map((x) => x / LY_PER_MLY);
      const pos = lines.geometry.getAttribute('position');
      for (let v = 0; v < 4; v++) for (let k = 0; k < 3; k++) pos.array[v * 3 + k] = dir[k] * at[v];
      pos.needsUpdate = true;
    }
    return ok;
  }

  return {
    group, frame, showRange, recordAt, recordById, rowOfId,
    ownsId: (id) => rowOfId(id) >= 0,
    pickAll,
    search: (query, limit) => (state.loaded ? searchNames(state.T, query, limit) : []),
    caldwell: (n) => (state.loaded && state.T.parts[0].manifest.caldwellTable ? state.T.parts[0].manifest.caldwellTable[String(n)] || null : null),
    /** The 543 clusters' Gaia overlay and the like, for a probe. */
    table: () => state.T,
    whenLoaded: () => loading,
    ready: () => state.loaded || !!state.failed,
    stats: () => ({
      id: 'catalogue', loaded: state.loaded, failed: state.failed,
      objects: state.T ? state.T.n : 0, inferred: state.arrays ? state.arrays.nInferred : 0, rangeShown,
      fade: Math.round(uniforms.uFade.value * 100) / 100,
      bytes: state.bytes, fileBytes: state.fileBytes, calls: state.calls, culled: state.culled,
      radiusPx: Number.isFinite(state.radiusPx) ? Math.round(state.radiusPx) : 'inside',
    }),
    dispose() {
      for (const o of [points, lines]) if (o) { o.geometry.dispose(); o.material.dispose(); }
      if (group.parent) group.parent.remove(group);
    },
  };
}
