// data/tilecloud.js -- streamed point-cloud tiles: the reader half of A1 (release 1.7.6, internal I#1059).
//
// A TILE SET is a catalogue the harvester cut into small binary files (harvest/tilepack.py says how and why):
//   data/v1/tiles/<id>/set.json      what it is, its schema, its levels and its tiles; read first
//   data/v1/tiles/<id>/L<n>/<key>.bin   one tile: the schema's fields as columns
//   data/v1/tiles/<id>/ids.bin       the pick index: catalogue id -> (tile, row), found by binary search
//   data/v1/tiles/<id>/names.txt     one name per line, in the id order of ids.bin
// Nothing here is read at boot. A page asks for a set the first time a layer or a card needs it, and
// this module is itself fetched by dynamic import (tests/test_boot_diet.mjs holds that).
//
// Contract (pure unless said):
//   parseSet(doc)                  -> the set, checked, or null
//   decodeTile(set, buffer)        -> { level, count, cols: { field: TypedArray } } or throws TileError
//   fieldValue(field, q)           -> offset + q * scale   (floats are stored as they are)
//   parsePick(buffer, build)       -> { count, ids, tile, row, find(id) -> { tile, row } | null, near(id) }
//   parseNames(text)               -> string[]
//   tilesFor(set, opts)            -> the tiles to fetch, level 0 first: opts { maxLevel, keys, cone, tilesInCone }
//   maxLevelFor(set, plan)         -> the finest level this device may draw (see LOD below)
//   isLatched() / setLatched(v) / setSaveData(v)   the frame-rate latch (read from window.spaceRadar.latch) and data-saver
//   createTileCloud(opts)          -> { open(), tiles(opts), load(opts), find(id), nameOf(id), set() } (impure: fetches)
//
// LOD ON THE FRAME LATCH. The levels are cuts by rank (size, brightness), level 0 the few that matter at
// a glance. A device whose frame rate has tripped the latch (scene/quality.js) draws level 0 only, and a
// connection that asked to save data draws none and gets the layer's illustrative stand-in, as for every
// other on-demand layer. The latch is read from `window.spaceRadar.latch` (isLatched) and never un-tripped here.

export class TileError extends Error {}

const TYPES = {
  u8: [Uint8Array, 1], u16: [Uint16Array, 2], u32: [Uint32Array, 4],
  i16: [Int16Array, 2], i32: [Int32Array, 4], f32: [Float32Array, 4], f64: [Float64Array, 8],
};
const MAGIC_TILE = 0x43545253; // 'SRTC' read little-endian
const MAGIC_PICK = 0x49505253; // 'SRPI'
const HEAD = 16;
export const SET_FORMAT = 'SRTC-1';
export const BASE = 'data/v1/tiles/';

let latched = false;
let saveData = false;
export function setLatched(v) { latched = !!v || latched; }
/**
 * Has this device tripped the frame-rate latch? Read from where main.js keeps it (`window.spaceRadar.latch.latched`, the
 * same object the look probes read) and remembered: a latch never un-trips. main.js says nothing to this module, so a
 * module that loads long after the latch tripped still draws one level. A page of a test or a worker has none: false.
 */
export function isLatched() {
  if (!latched && typeof window !== 'undefined') {
    try { if (window.spaceRadar && window.spaceRadar.latch && window.spaceRadar.latch.latched === true) latched = true; } catch { /* no latch to read */ }
  }
  return latched;
}
export function setSaveData(v) { saveData = !!v; }
/** Has the connection asked to save data (navigator.connection.saveData, as the other on-demand layers read it)? */
export function isSaveData() {
  if (saveData) return true;
  try { const c = typeof navigator !== 'undefined' ? navigator.connection : null; return !!(c && c.saveData === true); } catch { return false; }
}

export function maxLevelFor(set, plan = {}) {
  const l = plan.latched === undefined ? isLatched() : !!plan.latched;
  const s = plan.saveData === undefined ? isSaveData() : !!plan.saveData;
  if (s) return -1;
  if (!set || !Array.isArray(set.levels) || !set.levels.length) return -1;
  return l ? 0 : set.levels.length - 1;
}

/** The set document, checked. A set this reader cannot read is null: the layer keeps its stand-in. */
export function parseSet(doc) {
  if (!doc || typeof doc !== 'object' || doc.format !== SET_FORMAT) return null;
  if (!Array.isArray(doc.schema) || !Array.isArray(doc.tiles) || !Array.isArray(doc.levels)) return null;
  if (!Number.isInteger(doc.build) || !doc.id) return null;
  for (const f of doc.schema) if (!f || !TYPES[f.type] || !f.name) return null;
  const idField = doc.id_field;
  if (!doc.schema.some((f) => f.name === idField)) return null;
  return doc;
}

export function fieldValue(field, q) {
  return field.scale === undefined && field.offset === undefined ? q : (field.offset || 0) + q * (field.scale === undefined ? 1 : field.scale);
}

/** Column views over a tile's bytes. Every column starts at a multiple of its width, so these are views, not copies. */
export function decodeTile(set, buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < HEAD) throw new TileError('not a tile');
  const dv = new DataView(buffer);
  if (dv.getUint32(0, true) !== MAGIC_TILE) throw new TileError('not a tile (magic)');
  const version = dv.getUint8(4);
  const level = dv.getUint8(5);
  const nf = dv.getUint16(6, true);
  const count = dv.getUint32(8, true);
  const build = dv.getUint32(12, true);
  if (version !== 1 || nf !== set.schema.length) throw new TileError('tile and set disagree about the schema');
  if (build !== set.build) throw new TileError('tile from another build');
  const cols = {};
  let pos = HEAD;
  for (const f of set.schema) {
    const [Ctor, width] = TYPES[f.type];
    pos = Math.ceil(pos / width) * width;
    if (pos + count * width > buffer.byteLength) throw new TileError('tile is shorter than it says');
    cols[f.name] = new Ctor(buffer, pos, count);
    pos += count * width;
  }
  return { level, count, build, cols };
}

export function parsePick(buffer, build) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < HEAD) throw new TileError('not a pick index');
  const dv = new DataView(buffer);
  if (dv.getUint32(0, true) !== MAGIC_PICK || dv.getUint8(4) !== 1) throw new TileError('not a pick index (magic)');
  const count = dv.getUint32(8, true);
  if (build !== undefined && dv.getUint32(12, true) !== build) throw new TileError('pick index from another build');
  let pos = HEAD;
  const ids = new Uint32Array(buffer, pos, count); pos += count * 4;
  const tile = new Uint16Array(buffer, pos, count); pos += count * 2;
  pos = Math.ceil(pos / 4) * 4;
  const row = new Uint32Array(buffer, pos, count);
  if (pos + count * 4 > buffer.byteLength) throw new TileError('pick index is shorter than it says');
  function at(id) {
    let lo = 0;
    let hi = count - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const v = ids[mid];
      if (v === id) return mid;
      if (v < id) lo = mid + 1; else hi = mid - 1;
    }
    return -1;
  }
  return {
    count, ids, tile, row,
    at,
    find(id) { const i = at(Number(id)); return i < 0 ? null : { tile: tile[i], row: row[i], index: i }; },
  };
}

export function parseNames(text) {
  const out = String(text || '').split('\n');
  if (out.length && out[out.length - 1] === '') out.pop();
  return out;
}

/** The tiles to fetch for a request, level 0 first. `keys` limits to those tile keys; `cone` {dir, radiusDeg} with a healpix partition. */
export function tilesFor(set, opts = {}) {
  const maxLevel = opts.maxLevel === undefined ? set.levels.length - 1 : opts.maxLevel;
  let keep = null;
  if (opts.keys) keep = new Set(opts.keys);
  if (opts.cone && set.partition && set.partition.kind === 'healpix' && typeof opts.tilesInCone === 'function') {
    const pix = opts.tilesInCone(set.partition.nside, opts.cone.dir, opts.cone.radiusDeg);
    keep = new Set(Array.from(pix, (p) => `p${p}`));
  }
  const out = [];
  set.tiles.forEach((t, index) => {
    if (t.level > maxLevel) return;
    if (keep && !keep.has(t.key)) return;
    out.push({ ...t, index });
  });
  return out.sort((a, b) => a.level - b.level || a.index - b.index);
}

async function defaultFetchBytes(url, reload) {
  const r = await fetch(url, reload ? { cache: 'reload' } : undefined);
  if (!r.ok) throw new TileError(`${url}: HTTP ${r.status}`);
  return r.arrayBuffer();
}

/**
 * One set, by its id. `fetchBytes(url, reload)` is the transport (a test passes its own). open() reads set.json
 * (always revalidated: it is the one file that names the build); a tile of another build is fetched once more
 * past the cache before it is refused.
 */
export function createTileCloud(opts) {
  const base = (opts.base === undefined ? BASE : opts.base) + opts.id + '/';
  const fetchBytes = opts.fetchBytes || defaultFetchBytes;
  let doc = null;
  let pick = null;
  let names = null;
  let opening = null;
  const tiles = new Map();

  async function tileBytes(path, decode) {
    try {
      return decode(await fetchBytes(base + path, false));
    } catch (e) {
      if (!(e instanceof TileError) || !/another build/.test(e.message)) throw e;
      return decode(await fetchBytes(base + path, true)); // a CDN edge still holds yesterday's file
    }
  }

  return {
    async open() {
      if (doc) return doc;
      if (!opening) {
        opening = (async () => {
          const buf = await fetchBytes(base + 'set.json', true);
          const parsed = parseSet(JSON.parse(new TextDecoder().decode(buf)));
          if (!parsed) throw new TileError('set.json is not a set this page can read');
          doc = parsed;
          return doc;
        })();
        opening.catch(() => { opening = null; });
      }
      return opening;
    },
    set() { return doc; },
    tiles(o) { return doc ? tilesFor(doc, o) : []; },
    /** Fetch and decode the tiles `tiles(o)` names, `limit` at a time. A tile that fails is left out and counted. */
    async load(o = {}) {
      const set = await this.open();
      const want = tilesFor(set, { ...o, maxLevel: o.maxLevel === undefined ? maxLevelFor(set) : o.maxLevel });
      const out = [];
      let failed = 0;
      const limit = o.limit || 6;
      let next = 0;
      async function worker() {
        while (next < want.length) {
          const t = want[next++];
          try {
            let got = tiles.get(t.path);
            if (!got) { got = await tileBytes(t.path, (b) => decodeTile(set, b)); tiles.set(t.path, got); }
            out.push({ ...t, ...got });
          } catch { failed += 1; }
        }
      }
      await Promise.all(Array.from({ length: Math.min(limit, want.length) }, worker));
      out.sort((a, b) => a.level - b.level || a.index - b.index);
      return { set, tiles: out, failed };
    },
    /** id -> { tile, row, tilePath } from the pick index, which is fetched on the first ask. */
    async find(id) {
      const set = await this.open();
      if (!pick) pick = await tileBytes(set.pick.path, (b) => parsePick(b, set.build));
      const hit = pick.find(id);
      return hit ? { ...hit, tilePath: set.tiles[hit.tile] && set.tiles[hit.tile].path } : null;
    },
    async nameOf(id) {
      const set = await this.open();
      if (!set.names) return null;
      if (!pick) pick = await tileBytes(set.pick.path, (b) => parsePick(b, set.build));
      if (!names) names = parseNames(new TextDecoder().decode(await fetchBytes(base + set.names.path, false)));
      const i = pick.at(Number(id));
      return i < 0 ? null : names[i] || null;
    },
    async allNames() {
      const set = await this.open();
      if (!set.names) return [];
      if (!pick) pick = await tileBytes(set.pick.path, (b) => parsePick(b, set.build));
      if (!names) names = parseNames(new TextDecoder().decode(await fetchBytes(base + set.names.path, false)));
      return Array.from(pick.ids, (id, i) => [id, names[i] || '']);
    },
  };
}
