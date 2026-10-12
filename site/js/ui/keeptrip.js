// ui/keeptrip.js -- "Keep for offline" on a trip's intro (internal #551, from #390).
//
// Contract: tripAssets(tour, env) -> { urls, voice, models, maps, beds, other }   pure
//           keepTrip(urls, opts) -> Promise<{ done, failed, bytes }>               the fetching
//           keptRow(ctx, tour) -> HTMLElement | null                                the row's button and its line
//           readKept(storage), writeKept(storage, id, row), KEPT_KEY
//
// WHAT IT DOES. The service worker (site/sw.js) keeps what a visitor has used, so a trip is offline
// only after it was played once on that browser. A teacher before a lesson needs one action: this
// one fetches everything the trip would ask for -- the voice of each stop, the models and maps of
// what it flies to, the music of the places it visits, the stings and its picture -- and the worker
// answers each fetch from its own cache next time (its `asset` routes keep every 200 they see; this
// file touches nothing of the worker). It does NOT keep live data (weather, storms, the satellites'
// elements): data/sources.js keeps its own copies with their ages, and the line under the button
// says so.
//
// THE LIST IS COMPUTED, NOT TYPED. Every address comes from the same registries the trip itself
// reads: registry/narration.yaml (data/narration.js), the models (scene/realmodels.js), the maps
// (data/textures.js), the beds (data/audio.js). tests/test_keeptrip.mjs holds that every address
// of every trip is a file that exists in site/ and in a folder the worker keeps.
//
// LAZY: imported by ui/tripframe.js when the intro is drawn; never at boot (tests/test_boot_diet.mjs).
import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.later.js';
import { iconFrom } from './icons.js';
import { clipKey, clipRow } from '../audio/narration.js';
import { pickFormat, rungOf } from '../audio/pick.js';
import { parseFrame } from '../propagate/frames.js';

export const KEPT_KEY = 'sr.kept';
/** How many files are fetched at once: a classroom's connection is shared. */
export const AT_ONCE = 3;

const DOWNLOAD = [['path', { d: 'M12 15V3' }], ['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }], ['path', { d: 'm7 10 5 5 5-5' }]];

/** The folders the worker keeps as `asset` (site/sw.js ASSET_DIRS); anything else would be fetched and not kept. */
export const KEPT_DIRS = ['textures/', 'models/', 'audio/', 'images/', 'og/', 'data/'];

const plain = (file) => typeof file === 'string' && file.length > 0 && !file.includes('{') && !file.startsWith('/') && !file.includes('..');

/** The world a stop's target stands on, or null: a world itself, or a record fixed to one. Pure. */
export function worldOfTarget(target, recordById) {
  if (!target) return null;
  if (target.world) return String(target.world);
  const id = target.record || target.site;
  if (!id || typeof recordById !== 'function') return null;
  const record = recordById(id);
  const frame = record && record.frame ? parseFrame(record.frame) : null;
  return frame && frame.kind === 'fixed' && frame.world ? frame.world : null;
}

/**
 * Every file a trip would ask for, relative to the page, and how many of each kind.
 *
 * @param {object} tour  a trip from data/tours.js (stops with their targets)
 * @param {object} env
 *   narration   data/narration.js NARRATION (clips and base)
 *   textures    data/textures.js TEXTURES
 *   audioRows   data/audio.js rows ({id, file, twin?}) for the beds and the stings
 *   recordById  id -> record | null
 *   realModelFor  record -> { file?, map? } | null
 *   canPlay     audio element canPlayType, to pick Opus or AAC as the engine would
 *   tier        the device's texture tier (0, 1, 2)
 *   isLadder    stage id -> bool, for the music
 *   voice       false when the voice is not wanted (the clips are then left out)
 */
export function tripAssets(tour, env) {
  const e = env || {};
  const out = { urls: [], voice: 0, models: 0, maps: 0, beds: 0, other: 0 };
  if (!tour) return out;
  const seen = new Set();
  const add = (kind, url) => {
    if (!plain(url) || seen.has(url)) return;
    seen.add(url);
    out.urls.push(url);
    out[kind] += 1;
  };
  const stops = Array.isArray(tour.stops) ? tour.stops : [];

  // The voice: a clip and its captions for each stop that has one, in the format the engine would pick.
  const N = e.narration;
  if (N && N.clips && e.voice !== false) {
    for (const stop of stops) {
      const key = clipKey(tour.id, stop.id);
      if (!Object.prototype.hasOwnProperty.call(N.clips, key)) continue;
      const row = clipRow(N.base || 'audio/narration', key);
      for (const f of pickFormat(row, e.canPlay).slice(0, 1)) add('voice', f);
      add('voice', row.vtt);
    }
  }

  // The models of what it flies to, and the maps of the worlds it visits.
  const worlds = new Set();
  const stageIds = new Set();
  if (tour.stage) stageIds.add(tour.stage);
  for (const stop of stops) {
    if (stop.stage) stageIds.add(stop.stage);
    const target = stop.target || null;
    const w = worldOfTarget(target, e.recordById);
    if (w) { worlds.add(w); stageIds.add(w); }
    const id = target && (target.record || target.site);
    if (id && typeof e.recordById === 'function' && typeof e.realModelFor === 'function') {
      const record = e.recordById(id);
      const real = record ? e.realModelFor(record) : null;
      if (real && real.file) {
        add('models', `models/${real.file}`);
        if (real.map) add('maps', `textures/${real.map}`);
      }
    }
  }
  const tier = Number.isFinite(e.tier) ? e.tier : 0;
  for (const row of Array.isArray(e.textures) ? e.textures : []) {
    if (!row || !worlds.has(row.world)) continue;
    // The cheapest file first (what a world shows at once), and the best the device earns.
    const files = (row.files || []).filter((f) => f && f.tier >= 0 && f.tier <= tier && plain(f.file)).sort((a, b) => a.tier - b.tier);
    if (files.length) add('maps', files[0].file);
    if (files.length > 1) add('maps', files[files.length - 1].file);
  }

  // The music of the places it goes through, and the stings.
  const rungs = new Set();
  for (const id of stageIds) rungs.add(rungOf(id, typeof e.isLadder === 'function' ? e.isLadder(id) : false));
  for (const row of Array.isArray(e.audioRows) ? e.audioRows : []) {
    if (!row || !row.id) continue;
    const bed = /^bed-(.+)$/.exec(row.id);
    const sting = /^sting-/.test(row.id);
    if (!(sting || (bed && rungs.has(bed[1])))) continue;
    for (const f of pickFormat({ file: row.file, twin: row.twin }, e.canPlay).slice(0, 1)) add('beds', f);
  }

  // The trip's picture.
  add('other', `images/trips/${encodeURIComponent(String(tour.id))}.webp`);
  return out;
}

/**
 * Fetch every address, AT_ONCE at a time, counting. Never rejects: a file that did not come is
 * counted in `failed` and the rest go on. `onProgress({ done, failed, total })` after each.
 */
export async function keepTrip(urls, opts = {}) {
  const doFetch = opts.fetch || ((u) => fetch(u, { credentials: 'same-origin' }));
  const list = Array.isArray(urls) ? urls.slice() : [];
  const total = list.length;
  const state = { done: 0, failed: 0, bytes: 0 };
  let next = 0;
  const worker = async () => {
    while (next < list.length) {
      const url = list[next++];
      try {
        const res = await doFetch(url);
        if (!res || res.ok === false) throw new Error(`HTTP ${res ? res.status : 'none'}`);
        // Read to the end: the worker keeps the answer it is given only when it is whole.
        const bytes = await res.arrayBuffer();
        state.bytes += bytes.byteLength;
        state.done += 1;
      } catch {
        state.failed += 1;
      }
      if (typeof opts.onProgress === 'function') opts.onProgress({ ...state, total });
    }
  };
  await Promise.all(Array.from({ length: Math.min(AT_ONCE, Math.max(1, total)) }, worker));
  return { ...state };
}

/** What this browser has kept: trip id -> { n, bytes, at }. */
export function readKept(storage) {
  try {
    const s = storage === undefined ? globalThis.localStorage : storage;
    const raw = s ? JSON.parse(s.getItem(KEPT_KEY) || '{}') : {};
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  } catch { return {}; }
}

export function writeKept(storage, id, row) {
  try {
    const s = storage === undefined ? globalThis.localStorage : storage;
    if (!s) return;
    const all = readKept(s);
    all[id] = row;
    s.setItem(KEPT_KEY, JSON.stringify(all));
  } catch { /* a browser that refuses storage just forgets */ }
}

/** "6.1 MB" / "480 kB", from bytes. Pure. */
export function sizeWords(bytes) {
  const b = Number(bytes) || 0;
  if (b >= 1e6) return `${fmt.num(b / 1e6, 1)} MB`;
  return `${fmt.int(Math.max(1, Math.round(b / 1e3)))} kB`;
}

/** Whether a worker is in charge of this page, so that a fetch is also a keep. */
export function workerKeeps(ctx, nav = typeof navigator !== 'undefined' ? navigator : null) {
  return !!(ctx && ctx.net && ctx.net.worker === 'register' && nav && nav.serviceWorker && nav.serviceWorker.controller);
}

/**
 * The button and the line under it, for the quiet row of the intro: `{ button, note }`, or null
 * where no worker keeps anything (a private window, `?sw=0`, an automated browser, http).
 * `env` is tripAssets()'s, supplied by the caller (ui/tripframe.js reads the registries it already has).
 */
export function keptRow(ctx, tour, env, { storage } = {}) {
  if (!tour || !workerKeeps(ctx)) return null;
  const K = COPY.keepTrip;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sr-tripsheet__quiet sr-tripsheet__keep';
  const label = document.createElement('span');
  const note = document.createElement('p');
  note.className = 'sr-tripsheet__note sr-tripsheet__keepnote';
  note.setAttribute('role', 'status');
  note.hidden = true;
  const paint = (text, title, busy) => {
    label.textContent = text;
    button.title = title;
    button.disabled = !!busy;
    button.setAttribute('aria-busy', busy ? 'true' : 'false');
  };
  button.appendChild(iconFrom('download', DOWNLOAD, 16));
  button.appendChild(label);
  const kept = readKept(storage)[tour.id];
  if (kept && kept.n) {
    paint(K.kept, K.keptTitle, false);
    note.textContent = t(K.keptNote, { n: fmt.int(kept.n), size: sizeWords(kept.bytes) });
    note.hidden = false;
  } else {
    paint(K.keep, K.keepTitle, false);
  }
  button.addEventListener('click', async () => {
    const plan = tripAssets(tour, env);
    if (!plan.urls.length) return;
    paint(t(K.keeping, { done: fmt.int(0), total: fmt.int(plan.urls.length) }), K.keepTitle, true);
    note.hidden = true;
    const result = await keepTrip(plan.urls, {
      onProgress: (p) => paint(t(K.keeping, { done: fmt.int(p.done + p.failed), total: fmt.int(p.total) }), K.keepTitle, true),
    });
    if (result.failed === 0) {
      writeKept(storage, tour.id, { n: result.done, bytes: result.bytes, at: Date.now() });
      paint(K.kept, K.keptTitle, false);
      note.textContent = t(K.keptNote, { n: fmt.int(result.done), size: sizeWords(result.bytes) });
    } else {
      paint(K.again, K.keepTitle, false);
      note.textContent = t(K.failedNote, { done: fmt.int(result.done), total: fmt.int(plan.urls.length) });
    }
    note.hidden = false;
  });
  return { button, note };
}

/**
 * keptRow() with its registries read from the app: what ui/tripframe.js calls, once the intro is
 * on screen. Resolves to `{ button, note }` or null (no worker keeps anything here).
 */
export async function keptRowFor(ctx, tour) {
  if (!tour || !workerKeeps(ctx)) return null;
  const [N, X, A, R, S] = await Promise.all([
    import('../data/narration.js'), import('../data/textures.js'), import('../data/audio.js'),
    import('../scene/realmodels.js'), import('../scene/stage.js'),
  ]);
  let probe = null;
  const canPlay = (type) => {
    try {
      if (!probe && typeof Audio === 'function') probe = new Audio();
      return probe ? probe.canPlayType(type) : '';
    } catch { return ''; }
  };
  const env = {
    narration: N.NARRATION,
    textures: X.TEXTURES,
    audioRows: A.AUDIO,
    recordById: typeof ctx.recordById === 'function' ? ctx.recordById : null,
    realModelFor: R.realModelFor,
    canPlay,
    tier: ctx.quality && Number.isFinite(ctx.quality.tier) ? ctx.quality.tier : 0,
    isLadder: S.isLadderStage,
  };
  return keptRow(ctx, tour, env);
}
