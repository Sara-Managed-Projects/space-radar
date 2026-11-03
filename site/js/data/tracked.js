// data/tracked.js -- A9, tracked objects: debris and spent rocket bodies at the places their own elements give.
// (release 1.7.7, internal I#1069; the set is built daily by harvest/tracked.py and read by data/tilecloud.js)
//
// Contract:
//   loadTracked(opts)                 -> { records, set, failed, level } or null    fetches the tiles; opts { fetchBytes, plan }
//   tileRecords(set, tile)            -> Record[]   one decoded tile as map records (pure)
//   ommOf(set, tile, i)               -> the element set as CelesTrak's OMM JSON, for satellite.js
//   mergeTracked(illustrative, placed)-> { records, placed, illustrative }   (pure)
//
// WHAT CHANGED. data/satcat.js fieldRecords() gives each piece of debris its orbit's real size and tilt at a
// made-up place along it (the catalogue lists the shape of an orbit, not where on it the thing is). CelesTrak
// does publish element sets for most of them, so the places can be real: 12 402 of the 14 604 on 2026-11-03.
// Those are drawn by SGP4 from their own elements (class `measured` within half a day of the element set's epoch,
// `inferred` after it, as for the active satellites). The rest keep the illustrative place and the card says so.
// The count of each is on the card of the layer.
//
// WHAT IS NOT HERE. The working payloads are drawn from the active catalogue (celestrak-active) already. The dead
// ones (about 6 000) and the pieces CelesTrak has no element set for are not selectable by any public GP query;
// the catalogue lists them and the map keeps those that are debris or rocket bodies as illustrative.
//
// LOD. Under the frame latch only level 0 loads (rocket bodies and the pieces of 1 m2 or more, 2 390 of them);
// a connection that saves data loads none and the whole layer is illustrative, as before. Both are told to
// data/tilecloud.js by main.js.

import { createTileCloud, decodeTile, fieldValue, maxLevelFor } from './tilecloud.js';

const SET_ID = 'tracked';
const EPOCH_2000_MS = Date.UTC(2000, 0, 1);
export const KINDS = ['debris', 'rocket'];

/** OMM JSON of one row: what satellite.js json2satrec reads. Text epoch to the millisecond. */
export function ommOf(set, cols, i, fields) {
  const f = fields || fieldMap(set);
  const val = (name) => fieldValue(f[name], cols[name][i]);
  const id = cols.id[i];
  return {
    OBJECT_NAME: '', OBJECT_ID: '',
    EPOCH: epochText(val('epoch')),
    MEAN_MOTION: val('n'),
    ECCENTRICITY: val('ecc'),
    INCLINATION: val('inc'),
    RA_OF_ASC_NODE: val('raan'),
    ARG_OF_PERICENTER: val('argp'),
    MEAN_ANOMALY: val('ma'),
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: id,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 0,
    BSTAR: val('bstar'),
    MEAN_MOTION_DOT: val('ndot'),
    MEAN_MOTION_DDOT: 0,
  };
}

/** Seconds since 2000-01-01 as CelesTrak writes an EPOCH, to the microsecond (a millisecond is 7 m of track). */
export function epochText(sec) {
  const whole = Math.floor(sec);
  const us = Math.min(999999, Math.round((sec - whole) * 1e6));
  return new Date(EPOCH_2000_MS + whole * 1000).toISOString().slice(0, 19) + '.' + String(us).padStart(6, '0');
}

function fieldMap(set) {
  const m = {};
  for (const f of set.schema) m[f.name] = f;
  return m;
}

const DAY_MS = 86400e3;
const DEG = Math.PI / 180;

/** One tile as records, in the shape data/satcat.js fieldRecords() makes, with `propagator: 'sgp4'` and the `omm`. */
export function tileRecords(set, tile, opts = {}) {
  const f = fieldMap(set);
  const { cols, count } = tile;
  const layer = opts.layer || 'debris-field';
  const freshMs = (opts.freshDays === undefined ? 7 : opts.freshDays) * DAY_MS;
  const out = new Array(count);
  for (let i = 0; i < count; i += 1) {
    const id = cols.id[i];
    const epoch = EPOCH_2000_MS + fieldValue(f.epoch, cols.epoch[i]) * 1000;
    const kind = KINDS[cols.kind[i]] || 'debris';
    const n = cols.n[i];
    out[i] = {
      id: `cat-${id}`,
      name: `#${id}`,
      layer,
      klass: kind,
      propagator: 'sgp4',
      frame: 'earth-inertial',
      // The class the data deserves at its epoch; the renderer downgrades further as the clock moves on.
      cls: (opts.nowMs === undefined ? Date.now() : opts.nowMs) - epoch <= freshMs ? 'measured' : 'inferred',
      epoch,
      source: 'celestrak-gp',
      omm: ommOf(set, cols, i, f),
      meta: {
        noradId: id,
        meanMotion: n,
        periodMin: 1440 / n,
        inclinationDeg: fieldValue(f.inc, cols.inc[i]),
        eccentricity: fieldValue(f.ecc, cols.ecc[i]),
        placeIllustrative: false,
        tracked: true,
        sizeLevel: tile.level,
      },
    };
  }
  return out;
}

/**
 * The satcat's illustrative records with the tracked ones swapped in: a record keeps the catalogue's name, owner,
 * launch date and orbit extremes (its `meta`), and gets the element set's place. Pure.
 * `placed` is the tracked records (tileRecords), `illustrative` data/satcat.js fieldRecords().
 */
export function mergeTracked(illustrative, placed) {
  const byId = new Map();
  for (const r of placed || []) byId.set(r.id, r);
  const records = [];
  let swapped = 0;
  for (const base of illustrative || []) {
    const hit = byId.get(base.id);
    if (!hit) { records.push(base); continue; }
    byId.delete(base.id);
    swapped += 1;
    const { elements, ...rest } = base; // the two-body elements are the made-up place; the element set replaces them
    records.push({
      ...rest,
      propagator: 'sgp4',
      cls: hit.cls,
      epoch: hit.epoch,
      source: hit.source,
      omm: hit.omm,
      meta: { ...base.meta, tracked: true, placeIllustrative: false, sizeLevel: hit.meta.sizeLevel, meanMotion: hit.meta.meanMotion, periodMin: hit.meta.periodMin },
    });
  }
  // Tracked pieces the satcat file does not (yet) list: kept, under the number as the name.
  for (const extra of byId.values()) records.push(extra);
  return { records, placed: swapped + byId.size, illustrative: records.length - swapped - byId.size };
}

/** Fetch the tracked set's tiles for this device and return their records, or null when there is no set (the layer stays illustrative). */
export async function loadTracked(opts = {}) {
  const cloud = opts.cloud || createTileCloud({ id: SET_ID, fetchBytes: opts.fetchBytes });
  let set;
  try { set = await cloud.open(); } catch { return null; }
  const maxLevel = maxLevelFor(set, opts.plan);
  if (maxLevel < 0) return null;
  const { tiles, failed } = await cloud.load({ maxLevel });
  const records = [];
  for (const t of tiles) for (const r of tileRecords(set, t, opts)) records.push(r);
  return { records, set, failed, level: maxLevel, cloud };
}

export { decodeTile };
