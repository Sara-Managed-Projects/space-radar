// scene/texturetiers.js -- which map each world wears on this device, and when the sharper one arrives.
//
// 2026-09-28. registry/textures.yaml lists every map with a file per tier (site/js/data/textures.js is
// its mirror); scene/quality.js chooseTier() says which tier this device is. This module decides what
// to fetch and when, and hands each decoded texture to whoever draws it. It knows nothing about
// THREE: the loader and the three targets are passed in, which is what lets tests/test_tiers.mjs run
// it on a fake clock with fake textures.
//
// THE RULES, each one a thing that went wrong somewhere else first:
//   - NOTHING BEFORE THE FIRST FRAME. The boot set is the tier-0 file of every row, byte for byte what
//     shipped before tiers existed; a first visit is measured against a 2.5 MB gate with ~140 KB to
//     spare. start() is called by main.js after the first frame has drawn, and even then every fetch
//     waits for the browser to be idle.
//   - ONE FETCH AT A TIME. A 4k map is 1-2 MB. Four at once would compete with the catalogues the
//     visitor is waiting for; one at a time, in the order below, the Earth is sharp first.
//   - EAGER ONLY WHAT IS ON SCREEN FROM THE START: the Earth's day, night and water maps and the
//     Milky Way (`when: idle`). A planet (`when: near`) is fetched when its disc is big enough for 4k
//     to show -- PLANET_4K_AT_PX of radius, where a 2k map starts to run out of texels -- or when it
//     is selected, and at most TIER_PLANET_SLOTS of them hold 4k at once (the GPU budget).
//   - A SWAP NEVER BLOCKS AND NEVER GOES BLACK. A texture is handed over only once it has decoded;
//     until then the 2k map stays. The 2k map is kept (its GPU copy freed), because the frame latch
//     puts every world back on it: latch() is the only way down, as in scene/quality.js.
//   - THE SEASON FOLLOWS THE CLOCK, slowly. The Earth's 4k day map is one of twelve monthly Blue
//     Marbles, chosen from the clock's month. A scrub through the year must not become twelve 1.5 MB
//     downloads, so a new month is fetched only after the clock has stayed in it MONTH_HOLD_MS.

import { TEXTURES } from '../data/textures.js';
import { TIER_PLANET_SLOTS } from './quality.js';

/** Disc radius, in device pixels, above which a world's 2k map has fewer texels than the screen. */
export const PLANET_4K_AT_PX = 300;

/** How long the clock must stay in a new month before that month's Earth is fetched. */
export const MONTH_HOLD_MS = 5000;

/** The file of `row` a device of `tier` wears: the highest-tier file at or below it. */
export function variantFor(row, tier) {
  let best = null;
  for (const f of (row && row.files) || []) {
    if (f.tier <= tier && (!best || f.tier > best.tier)) best = f;
  }
  return best;
}

/** The URL of a file for a month (1-12); a monthly file carries `{mm}` in its name. */
export function urlFor(file, month) {
  if (!file) return null;
  if (!file.monthly) return file.file;
  const m = Math.min(12, Math.max(1, Math.round(Number(month) || 1)));
  return file.file.replace('{mm}', String(m).padStart(2, '0'));
}

/** Bytes of a file for a month: a monthly file lists twelve. */
export function bytesFor(file, month) {
  if (!file) return 0;
  if (Array.isArray(file.bytes)) return file.bytes[Math.min(12, Math.max(1, month || 1)) - 1] || 0;
  return file.bytes || 0;
}

/** Every file a visitor boots with: the tier-0 file of each row. What the first-visit gate measures. */
export function bootFiles(rows = TEXTURES) {
  return rows.map((r) => variantFor(r, 0)).filter(Boolean).map((f) => f.file);
}

/**
 * @param {object} opts
 * @param {number}   opts.tier          the tier the device booted at (scene/quality.js chooseTier)
 * @param {Function} opts.load          (url, file) -> Promise<texture>; texture.dispose() frees it
 * @param {object}   opts.targets       { earth, sky, worlds } -- see main.js for the adapters:
 *                                      earth:  { ready(), set(slot, tex|null, file) -> old }
 *                                      sky:    { ready(), set(tex|null) -> old }
 *                                      worlds: { ready(id), set(id, tex|null) -> old, px(id), selected() }
 * @param {Function} [opts.month]       () -> 1..12, the clock's month (UTC)
 * @param {Function} [opts.idle]        (cb) -> void; requestIdleCallback by default
 * @param {object[]} [opts.rows]        the manifest; TEXTURES by default
 * @param {number[]} [opts.slots]       planet 4k slots per tier; TIER_PLANET_SLOTS by default
 */
/**
 * What one file holds on the GPU once uploaded, in MiB: its pixels at four bytes each (one for a
 * `mono` map, uploaded as R8), plus a third for the mipmaps. A WebP or a JPEG is decoded to this
 * whatever it weighed on the wire; a compressed format (KTX2, spec 0056) will have its own row.
 */
export function gpuMiB(file) {
  if (!file || !Array.isArray(file.px)) return 0;
  return (file.px[0] * file.px[1] * (file.format === 'mono' ? 1 : 4) * 4) / 3 / 1048576;
}

/** The live clouds' own picture (scene/liveclouds.js): 2048 x 1024 RGBA, composed in the page. */
export const LIVE_CLOUDS_MIB = gpuMiB({ px: [2048, 1024], format: 'rgba' });

/**
 * The most a device of this tier can hold in maps at once, in MiB, with what it is made of (spec
 * 0056 requirement 4; registry/budgets.yaml tier0/1/2_texture_gpu_mib; tests/test_texture_budget.mjs).
 *
 *   always     every map that is on screen from the start (the Earth's, the Milky Way, the ring's
 *              strip) at this tier's file, and today's clouds
 *   sharp      this tier's planet slots, each holding the largest sharper map there is
 *   worlds     the other worlds allowed a map of their own (`mapsHeld`, scene/worlds.js MAPS_HELD),
 *              less the slots (a world wearing a sharper map has had its own freed), each the
 *              largest tier-0 map
 *   faces      every other face a card can ask for (`when: asked` that is not always on screen),
 *              all at once: a world wearing one keeps its own map too
 */
export function worstCaseGpu(tier, { rows = TEXTURES, slots = TIER_PLANET_SLOTS, mapsHeld } = {}) {
  const onScreen = (r) => r.world === 'earth' || r.world === 'sky' || r.id === 'saturn-ring';
  let always = LIVE_CLOUDS_MIB;
  for (const r of rows) if (onScreen(r)) always += gpuMiB(variantFor(r, tier));
  const others = rows.filter((r) => !onScreen(r));
  const own = others.filter((r) => r.when !== 'asked');
  const nSlots = slots[Math.min(tier, slots.length - 1)] || 0;
  const sharper = own.map((r) => variantFor(r, tier)).filter((f) => f && f.tier > 0).map(gpuMiB).sort((a, b) => b - a);
  const sharp = sharper.slice(0, nSlots).reduce((a, b) => a + b, 0);
  const largestOwn = Math.max(0, ...own.map((r) => gpuMiB(variantFor(r, 0))));
  const worlds = Math.max(0, mapsHeld - Math.min(nSlots, sharper.length)) * largestOwn;
  const faces = others.filter((r) => r.when === 'asked').reduce((a, r) => a + gpuMiB(variantFor(r, tier)), 0);
  return { always, sharp, worlds, faces, total: always + sharp + worlds + faces };
}

export function createTextureTiers(opts = {}) {
  const rows = opts.rows || TEXTURES;
  const targets = opts.targets || {};
  const load = opts.load;
  const monthNow = opts.month || (() => new Date().getUTCMonth() + 1);
  const idle = opts.idle || defaultIdle;
  const slots = opts.slots || TIER_PLANET_SLOTS;
  // OFFLINE (internal #564): a page played from the service worker's copy asks for no sharper map the
  // copy does not hold (a kept trip holds the boot tier's maps, not what a promotion would want).
  // Asked again, by the next tick, the moment the network is back.
  const offline = typeof opts.offline === 'function' ? opts.offline : () => false;
  let tier = Number.isFinite(opts.tier) ? opts.tier : 0;
  let latched = false;
  let started = false;
  let busy = null;          // the row id being fetched
  let queued = false;       // an idle callback is pending
  let fetchedBytes = 0;
  const applied = new Map(); // row id -> { url, tex, file, since }
  const lastBig = new Map(); // world id -> ms it last wanted 4k
  const failed = new Set();  // urls that would not load: never asked for twice
  let month = null;          // the month the day map was chosen for
  let monthSeen = null;
  let monthSince = 0;
  let now = 0;

  function target(row) {
    if (row.world === 'earth') return targets.earth;
    if (row.world === 'sky') return targets.sky;
    return targets.worlds;
  }

  function ready(row) {
    const t = target(row);
    if (!t) return false;
    if (row.world === 'earth' || row.world === 'sky') return !!t.ready();
    return !!t.ready(row.world);
  }

  function put(row, tex, file) {
    const t = target(row);
    if (row.world === 'earth') return t.set(row.slot, tex, file);
    if (row.world === 'sky') return t.set(tex);
    return t.set(row.world, tex);
  }

  function planetSlots() { return slots[Math.min(tier, slots.length - 1)] || 0; }

  function planetsHeld() { return rows.filter((r) => r.when === 'near' && applied.has(r.id)).length; }

  function bigNow(row) {
    const w = targets.worlds;
    if (!w) return false;
    const sel = w.selected ? w.selected() : null;
    return sel === row.world || (w.px ? w.px(row.world) : 0) >= PLANET_4K_AT_PX;
  }

  /** The month the day map should be, with the hold applied. */
  function wantedMonth() {
    const m = monthNow();
    if (m !== monthSeen) { monthSeen = m; monthSince = now; }
    if (month === null) return m;
    return now - monthSince >= MONTH_HOLD_MS ? m : month;
  }

  /** The next row to fetch, or null. */
  function next() {
    if (latched || tier <= 0 || offline()) return null;
    for (const when of ['idle', 'near']) {
      for (const row of rows) {
        if (row.when !== when) continue;
        const file = variantFor(row, tier);
        if (!file || file.tier <= 0) continue;
        if (!ready(row)) continue;
        const m = file.monthly ? wantedMonth() : null;
        const url = urlFor(file, m);
        if (failed.has(url)) continue;
        const have = applied.get(row.id);
        if (have && have.url === url) continue;
        if (when === 'near') {
          if (!bigNow(row)) continue;
          if (!have && planetsHeld() >= planetSlots() && !evictFor(row)) continue;
        }
        return { row, file, url, m };
      }
    }
    return null;
  }

  /** Give a slot back: the held planet that has been small the longest. False when every one is in use. */
  function evictFor(row) {
    let victim = null;
    for (const r of rows) {
      if (r.when !== 'near' || r === row || !applied.has(r.id)) continue;
      if (bigNow(r)) continue;
      const t = lastBig.get(r.world) || 0;
      if (!victim || t < (lastBig.get(victim.world) || 0)) victim = r;
    }
    if (!victim) return false;
    release(victim);
    return true;
  }

  function release(row) {
    const have = applied.get(row.id);
    if (!have) return;
    put(row, null, null);
    applied.delete(row.id);
    if (have.tex && have.tex.dispose) have.tex.dispose();
  }

  function schedule() {
    if (!started || queued || busy || latched) return;
    if (!next()) return;
    queued = true;
    idle(() => { queued = false; pump(); });
  }

  function pump() {
    if (busy || latched) return;
    const job = next();
    if (!job) return;
    const { row, file, url, m } = job;
    busy = row.id;
    let p;
    try { p = Promise.resolve(load(url, file)); } catch (e) { p = Promise.reject(e); }
    p.then((tex) => {
      busy = null;
      // The world may have moved on while the bytes were in flight: latched, or a newer month.
      if (latched || tier <= 0 || !tex) { if (tex && tex.dispose) tex.dispose(); return; }
      fetchedBytes += bytesFor(file, m);
      const before = applied.get(row.id);
      const old = put(row, tex, file);
      // The texture that was on screen: a previous 4k (another month) is ours to free; the boot map
      // is not, but its GPU copy can go -- three uploads it again from its image if it is ever
      // needed, which is only after the latch.
      if (before && before.tex && before.tex !== tex && before.tex.dispose) before.tex.dispose();
      else if (old && old !== tex && old.dispose) old.dispose();
      applied.set(row.id, { url, tex, file, since: now });
      if (m) month = m;
      schedule();
    }, () => {
      busy = null;
      failed.add(url);
      schedule();
    });
  }

  return {
    /** After the first frame: from here on, sharper maps are fetched when the browser is idle. */
    start() { started = true; schedule(); },
    /** About once a second from the loop: planets that grew, a month that changed. */
    tick(nowMs) {
      now = Number(nowMs) || 0;
      if (targets.worlds) {
        for (const r of rows) if (r.when === 'near' && bigNow(r)) lastBig.set(r.world, now);
      }
      schedule();
    },
    /** A promotion (scene/quality.js createTierPromoter). Up only; the latch is the way down. */
    setTier(n) {
      if (latched || !(n > tier)) return tier;
      tier = n;
      schedule();
      return tier;
    },
    /** The frame latch tripped: every world back on its boot map, every 4k texture freed, for good. */
    latch() {
      if (latched) return;
      latched = true;
      tier = 0;
      for (const row of rows) release(row);
    },
    get tier() { return tier; },
    get latched() { return latched; },
    /** For the Sources panel, window.spaceRadar and the probes. */
    state() {
      return {
        tier,
        latched,
        started,
        busy,
        fetchedBytes,
        applied: [...applied.entries()].map(([id, a]) => ({ id, url: a.url, tier: a.file.tier })),
      };
    },
    /** The credit lines of the maps being worn now, for the Sources panel. */
    credits() {
      const out = new Set();
      for (const row of rows) {
        const have = applied.get(row.id);
        const file = have ? have.file : variantFor(row, 0);
        if (file && file.credit) out.add(file.credit);
      }
      return [...out];
    },
  };
}

function defaultIdle(cb) {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(() => cb(), { timeout: 4000 });
  else setTimeout(cb, 200);
}
