// data/a45.js -- the compact catalogues of release 1.5.0 stages A4 (stars) and A5 (beyond the Milky Way).
// Pure rows in, rows out, plus the fetches. NOTHING AT BOOT: data/layers.js imports this file by `import()` the first time one of
// the layers below is asked for (the search box taking focus, a ladder stage, the layer's box ticked); main.js imports it for the
// stars' IAU names when the Stars layer loads. Every file it reads is site/data/a45/*, written by scripts/gen_a45_data.py (read
// its head for the sources and licences; CREDITS.md section 3m).
//
// Contract:
//   loadIau() / loadExtremes() / loadPulsars() / loadQuasars() / loadBeyond() / loadUnplaced() / loadUnplacedNames()   fetch one file (once)
//   withIauNames(namedRows, doc) -> rows   the names file's rows with the IAU's names and designations joined in
//   iauHostAliases(doc, planets)           the IAU's names of exoplanet host stars, added to the planets' aliases
//   extremeRows(doc) / pulsarRows(doc) / quasarRows(doc) / farRows(doc)   rows in the shape data/exotics.js has
//   parseUnplaced(buffer) -> { count, ra, dec, mag, ci, id }              the stars with no distance (scene/unplaced.js)
//
// WHAT IS NOT HERE. WD J1011+2845 (it arrives through registry/exotics.yaml, not through this file).

import { comovingLy, ageGyr } from './cosmology.js';
import { COPY, t } from '../copy/en.js';
import '../copy/en.later.js';

export const KPC_LY = 3261.5637771674333;
const here = typeof import.meta !== 'undefined' ? import.meta.url : undefined;
const base = (f) => (here ? new URL(`../../data/a45/${f}`, here) : `data/a45/${f}`);
const pending = new Map();
/** Three significant figures: a comoving distance from a redshift is good to a few per cent, and the card must not print ten digits of it. */
const sig3 = (n) => (n >= 1000 ? Number(n.toPrecision(3)) : Math.round(n));

/** One file, once. `no-cache` = revalidate: the files keep their names when a rebuild changes them. */
function once(file, kind) {
  if (!pending.has(file)) {
    const p = fetch(String(base(file)), { cache: 'no-cache' })
      .then((r) => { if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`); return kind === 'bin' ? r.arrayBuffer() : r.json(); })
      .catch((e) => { pending.delete(file); throw e; });
    pending.set(file, p);
  }
  return pending.get(file);
}
export const loadIau = () => once('iau-names.json');
export const loadExtremes = () => once('extremes.json');
export const loadPulsars = () => once('pulsars.json');
export const loadQuasars = () => once('quasars.json');
export const loadBeyond = () => once('beyond.json');
export const loadUnplacedNames = () => once('unplaced.names.json');
export const loadUnplaced = () => Promise.all([once('unplaced.bin', 'bin'), once('unplaced.names.json')]);

// a '+' is kept as 'p' so that J1837+10 and J1837-10 are two ids
const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\+/g, 'p').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ------------------------------------------------------------------------------------------------ the IAU's star names
/**
 * The rows of data/stars3d.names.json with the IAU Working Group on Star Names' names joined in: a star the IAU has named but HYG
 * had no name for takes the IAU's; a star HYG names differently keeps its name and gains the IAU's as another. The thirteenth
 * element of a row is `{ name, designation, approved }`. Stars the names file lacks (named by the IAU, no Bayer or Flamsteed letter,
 * so not in it) arrive whole in `doc.extra`. Pure; the input is not changed.
 */
export function withIauNames(namedRows, doc) {
  const rows = Array.isArray(namedRows) ? namedRows : [];
  if (!doc || !Array.isArray(doc.stars)) return rows;
  const byIdx = new Map();
  for (const s of doc.stars) byIdx.set(s[0], { name: s[1], designation: s[3], approved: s[4] || null });
  const out = rows.map((r) => {
    const iau = byIdx.get(r[0]);
    if (!iau) return r;
    const row = r.slice();
    if (!row[1]) row[1] = iau.name;
    row[12] = iau;
    byIdx.delete(r[0]);
    return row;
  });
  for (const r of Array.isArray(doc.extra) ? doc.extra : []) {
    const iau = byIdx.get(r[0]);
    if (!iau) continue;
    const row = r.slice(0, 12);
    row[1] = row[1] || iau.name;
    row[12] = iau;
    out.push(row);
  }
  return out;
}

/** The IAU's names of exoplanet host stars become aliases of the host's planets ("Bambaruush" finds HAT-P-21 b). Returns how many it added. */
export function iauHostAliases(doc, planets) {
  if (!doc || !Array.isArray(doc.hosts)) return 0;
  const names = new Map(doc.hosts.map(([host, name]) => [host, name]));
  let n = 0;
  for (const rec of planets || []) {
    const meta = rec && rec.meta;
    const name = meta && names.get(meta.host);
    if (!name) continue;
    const have = Array.isArray(meta.aliases) ? meta.aliases : (meta.aliases = []);
    if (!have.includes(name)) { have.push(name); n++; }
  }
  return n;
}

// ------------------------------------------------------------------------------------------------ rows in the shape data/exotics.js has
const note = (z, how) => t(COPY.a45.farNote, { z: String(z), how });

/** Magnetars, black-hole transients, Gaia BH2, white-dwarf records and the brown dwarfs: the file already holds the rows. */
export function extremeRows(doc) {
  return (doc && Array.isArray(doc.rows) ? doc.rows : []).map((r) => {
    const row = { ...r, noBlink: true };
    if (r.distanceNote) { row.distance_note = r.distanceNote; delete row.distanceNote; }
    if (r.jmag != null) { row.sizePx = 5; }
    return row;
  });
}

/** ATNF pulsars: one fact sheet each, made from the file's columns. No `why`: 4 000 pulsars are not 4 000 stories. */
export function pulsarRows(doc) {
  if (!doc || !Array.isArray(doc.rows)) return [];
  const notes = COPY.a45.pulsarDistance;
  return doc.rows.map(([name, raDeg, decDeg, distKpc, by, periodS, flags, alias]) => {
    const row = {
      id: `psr-${slug(name)}`, name: `PSR ${name}`, kind: 'pulsar', raDeg, decDeg, distLy: Math.round(distKpc * KPC_LY),
      distance_note: notes[by] || '', source: doc.source, aliases: [name, ...(alias ? [`PSR ${alias}`, alias] : [])], noBlink: true, sizePx: 4,
    };
    if (periodS > 0) row.periodS = periodS;
    if (flags) row.flags = flags;
    return row;
  });
}

/** The brightest quasars and every one beyond z = 7. A quasar's distance is how far it is now, from its redshift (data/cosmology.js). */
export function quasarRows(doc) {
  if (!doc || !Array.isArray(doc.rows)) return [];
  const z7 = doc.rows.filter((r) => r[5]).length;
  return doc.rows.map(([name, raDeg, decDeg, z, mag, high]) => {
    const row = {
      id: `qso-${slug(name)}`, name, kind: 'quasar', raDeg, decDeg, redshift: z, distLy: sig3(comovingLy(z)),
      distance_note: note(z, COPY.a45.comoving), source: doc.source, aliases: [], noBlink: true, sizePx: 5,
    };
    if (mag != null) row.vmag = mag;
    if (high) row.why = t(COPY.a45.quasarZ7, { age: String(Math.round(ageGyr(z) * 1000 / 10) * 10), n: String(z7) });
    return row;
  });
}

/** Record-redshift galaxies and clusters: a redshift gives the distance, unless the row carries one measured by another method. */
export function farRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((r) => {
    const row = { ...r, noBlink: true };
    if (Number.isFinite(r.redshift) && !Number.isFinite(r.distLy)) {
      row.distLy = sig3(comovingLy(r.redshift));
      row.distance_note = note(r.redshift, COPY.a45.comoving);
    } else if (r.distanceNote) {
      row.distance_note = r.distanceNote;
    }
    delete row.distanceNote;
    delete row.record;
    return row;
  });
}

// ------------------------------------------------------------------------------------------------ the stars with no distance
/** data/a45/unplaced.bin: 'SRUP', u16 version, u16 bytes per star, u32 count, f32 faintest; then 8 bytes a star (as data/skystars-*.bin), then a u32 HYG id each. */
export function parseUnplaced(buffer) {
  const dv = new DataView(buffer);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== 'SRUP' || dv.getUint16(6, true) !== 8) throw new Error('unplaced: not the file this was written for');
  const count = dv.getUint32(8, true);
  const ra = new Float32Array(count), dec = new Float32Array(count), mag = new Float32Array(count), ci = new Float32Array(count);
  const id = new Uint32Array(count);
  for (let i = 0; i < count; i += 1) {
    const o = 16 + i * 8;
    ra[i] = (dv.getUint8(o) | (dv.getUint8(o + 1) << 8) | (dv.getUint8(o + 2) << 16)) / 16777216 * 360;
    dec[i] = (dv.getUint8(o + 3) | (dv.getUint8(o + 4) << 8) | (dv.getUint8(o + 5) << 16)) / 16777215 * 180 - 90;
    mag[i] = dv.getUint8(o + 6) / 12.5 - 1.5;
    const bv = dv.getUint8(o + 7);
    ci[i] = bv === 255 ? NaN : bv / 50 - 0.5;
    id[i] = dv.getUint32(16 + count * 8 + i * 4, true);
  }
  return { count, ra, dec, mag, ci, id };
}

const OBLIQUITY = 23.4392911 * (Math.PI / 180);
const LY_KM = 9460730472580.8;
/** A made-up distance used for nothing but giving the record a direction: the card prints no distance for it (`meta.noDistance`). */
const DIRECTION_LY = 1e5;

/** The ecliptic unit direction (the app's `sun-inertial` axes) of a J2000 right ascension and declination in degrees. Pure. */
export function eclipticDirection(raDeg, decDeg) {
  const ra = raDeg * (Math.PI / 180), dec = decDeg * (Math.PI / 180);
  const x = Math.cos(dec) * Math.cos(ra), y = Math.cos(dec) * Math.sin(ra), z = Math.sin(dec);
  const c = Math.cos(OBLIQUITY), s = Math.sin(OBLIQUITY);
  return [x, y * c + z * s, -y * s + z * c];
}

/**
 * The record of a star that has a direction and a brightness and no distance. `row` is a row of unplaced.names.json: [index, name,
 * bayerOrFlamsteed, spect, hip, hd, con, iauApproved, raDeg, decDeg, mag, hygId]; `unnamed` gives it the catalogue's number for a name.
 * It sits in the Stars layer (`layer: 'stars'`), has `meta.noDistance`, and the map never flies to it. Pure.
 */
export function unplacedRecord(row, unnamed) {
  const [, proper, bayer, spect, hip, hd, con, approved, raDeg, decDeg, mag, hygId] = row;
  const name = proper || bayer || unnamed || t(COPY.a45.unplaced.unnamed, { id: String(hygId) });
  const dir = eclipticDirection(raDeg, decDeg);
  return {
    id: `hyg-u${hygId}`,
    name,
    klass: 'star',
    layer: 'stars',
    propagator: 'static',
    frame: 'sun-inertial',
    pos: { x: dir[0] * DIRECTION_LY * LY_KM, y: dir[1] * DIRECTION_LY * LY_KM, z: dir[2] * DIRECTION_LY * LY_KM },
    cls: 'measured',
    meta: {
      noDistance: true,
      starIndex: -1,
      mag: Math.round(mag * 100) / 100,
      spect: spect || null,
      hip: hip || null,
      con: con || null,
      aliases: [bayer, proper, hip ? `HIP ${hip}` : null, hd ? `HD ${hd}` : null].filter((a) => a && a !== name),
      named: !!(proper || bayer),
      iau: approved ? { name, designation: bayer || '', approved: approved === 'IAU' ? '' : approved } : null, // 'IAU': approved, the date not on the list we read
      // no `why`: a record with one is "notable" and ui/labels.js would name it on a rung of the ladder, where it has no place
      cite: COPY.a45.unplaced.cite,
    },
  };
}

/** The named stars with no distance, as records for the Stars layer: search finds "Garnet Star" and "Cexing" by them. */
export function unplacedNamedRecords(namesDoc) {
  return ((namesDoc && namesDoc.rows) || []).map((r) => unplacedRecord(r));
}
