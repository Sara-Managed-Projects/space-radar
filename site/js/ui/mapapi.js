// ui/mapapi.js -- window.srMap: a small, generic scripting API for the map (docs/PLUGINS.md, research train 6b).
//
// Contract: installMapApi(ctx, win?) -> api   sets window.srMap (once), then `document` event `sr:map {version}`
//           createMapApi(ctx, win?) -> api    the same object without installing it (tests)
// Pure, for tests/test_mapapi.mjs: VERSION, cleanPose(p), clockOf(clock), poseToRig(pose, unitKm), binsFrom(deg),
//   sampleBins(fn, n), crossKm(a, b), boxAround(lat, lon, spanKm), cleanDrift(o), driftWords(o), offlineRoute(url, base),
//   cleanVoice(res, tripId), SW_CACHES
//
// Added 2026-11-26 (v1 adds, nothing renamed): picture(), drift, layers, trips, offline, voice, record.start's `corner` and
// `sharp`, and the tool places 'drift' and 'device'. All generic: the platform's Pro and Ultra extras are built on them.
//
// WHAT IT IS. Capabilities anyone may script from the page's console, a bookmarklet or a script of their own: where the
// camera stands and a flight to a pose, the clock (time travel), a recording of the canvas that comes back as a Blob, the
// height of a landing site's ground and its light at an instant, the skyline of "sky from your street" and a way to give
// it a better one, the place in use, the date of an Earth overlay, and a panel or a tool button in the map's own
// chrome. None of it is a paid feature and none of it calls a server: the Space Radar platform (account.spaceradar.ai/v1/
// platform.js, private repository) builds its paid tools on it, and so can anyone else.
//
// WHEN. Imported by main.js after sr:layers-ready and the first visit's gate, never on the boot path and never in an
// embed. Everything heavy behind it (the recorder's encoder, the panel's phone sheet) is a dynamic import on first use.
//
// UNITS, as the rest of the map: degrees for angles (azimuth from north, clockwise), kilometres for the camera's
// distance, metres on a landing site's ground, milliseconds since 1970 (UTC) for the clock. Every call answers plainly
// (null, false or a rejected promise) where the map cannot do it now; nothing throws into the caller's page.

import { COPY } from '../copy/en.js';
import '../copy/en.make.js';
import { icon, iconFrom } from './icons.js';
import { loadCss } from './latercss.js';
import { TOOL_PLACES } from './toolslot.js';

export const VERSION = 1;
const DEG = Math.PI / 180;
const EARTH_R_KM = 6371.0088;
const CAM_QUIET_FRAMES = 12;
const CAM_GIVE_UP_MS = 20000;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:+-]{0,79}$/;

// Lucide (ISC), drawn as ui/icons.js draws: the tools' own glyphs, kept here so a first visit does not carry them.
const GLYPHS = {
  lock: [['rect', { width: 18, height: 11, x: 3, y: 11, rx: 2, ry: 2 }], ['path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }]],
  mountain: [['path', { d: 'm8 3 4 8 5-5 5 15H2L8 3z' }]],
  route: [['circle', { cx: 6, cy: 19, r: 3 }], ['path', { d: 'M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15' }], ['circle', { cx: 18, cy: 5, r: 3 }]],
  film: [['rect', { width: 18, height: 18, x: 3, y: 3, rx: 2 }], ['path', { d: 'M7 3v18' }], ['path', { d: 'M3 7.5h4' }], ['path', { d: 'M3 12h18' }], ['path', { d: 'M3 16.5h4' }], ['path', { d: 'M17 3v18' }], ['path', { d: 'M17 7.5h4' }], ['path', { d: 'M17 16.5h4' }]],
  users: [['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }], ['circle', { cx: 9, cy: 7, r: 4 }], ['path', { d: 'M22 21v-2a4 4 0 0 0-3-3.87' }], ['path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' }]],
  download: [['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }], ['path', { d: 'm7 10 5 5 5-5' }], ['path', { d: 'M12 15V3' }]],
  printer: [['path', { d: 'M6 9V2h12v7' }], ['path', { d: 'M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2' }], ['rect', { width: 12, height: 8, x: 6, y: 14 }]],
  bookmark: [['path', { d: 'm19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z' }]],
  video: [['path', { d: 'm16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5' }], ['rect', { x: 2, y: 6, width: 14, height: 12, rx: 2 }]],
  sunrise: [['path', { d: 'M12 2v8' }], ['path', { d: 'm4.93 10.93 1.41 1.41' }], ['path', { d: 'M2 18h2' }], ['path', { d: 'M20 18h2' }], ['path', { d: 'm19.07 10.93-1.41 1.41' }], ['path', { d: 'M22 22H2' }], ['path', { d: 'm8 6 4-4 4 4' }], ['path', { d: 'M16 18a4 4 0 0 0-8 0' }]],
};
const glyph = (name) => (GLYPHS[name] ? iconFrom(name, GLYPHS[name]) : icon(name));

// ------------------------------------------------------------------------------------------------------------ pure

const fin = (v) => typeof v === 'number' && Number.isFinite(v);

/** A camera pose as asked for, checked: {target?, azimuthDeg?, polarDeg?, distanceKm?}, or null. Pure. */
export function cleanPose(p) {
  if (!p || typeof p !== 'object') return null;
  const out = {};
  if (p.target !== undefined && p.target !== null) {
    if (typeof p.target !== 'string' || !ID_RE.test(p.target)) return null;
    out.target = p.target;
  }
  if (p.azimuthDeg !== undefined) { if (!fin(p.azimuthDeg)) return null; out.azimuthDeg = ((p.azimuthDeg % 360) + 360) % 360; }
  if (p.polarDeg !== undefined) { if (!fin(p.polarDeg)) return null; out.polarDeg = Math.min(179.9, Math.max(0.1, p.polarDeg)); }
  if (p.distanceKm !== undefined) { if (!fin(p.distanceKm) || !(p.distanceKm > 0)) return null; out.distanceKm = p.distanceKm; }
  return out;
}

/** The rig's own units for a checked pose: radians and scene units. Pure. */
export function poseToRig(pose, unitKm) {
  const o = {};
  if (fin(pose.azimuthDeg)) o.azimuth = pose.azimuthDeg * DEG;
  if (fin(pose.polarDeg)) o.polar = pose.polarDeg * DEG;
  if (fin(pose.distanceKm) && unitKm > 0) o.distance = pose.distanceKm / unitKm;
  return o;
}

/** What the clock says, plainly. Pure. */
export function clockOf(clock) {
  return { ms: clock.now(), live: clock.mode === 'live', rate: clock.rate, paused: !!clock.paused };
}

/** 360 degrees of a skyline from any sampler of azimuth (radians) -> altitude (degrees). Pure. */
export function sampleBins(fn, n = 360) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) { const v = fn((i / n) * 2 * Math.PI); out[i] = fin(v) ? v : 0; }
  return out;
}

/** A provided skyline as 360 finite degrees, or null for anything else. Pure. */
export function binsFrom(deg) {
  if (!deg || typeof deg.length !== 'number' || deg.length !== 360) return null;
  const out = new Float32Array(360);
  for (let i = 0; i < 360; i += 1) {
    const v = Number(deg[i]);
    if (!Number.isFinite(v) || v < -90 || v > 90) return null;
    out[i] = v;
  }
  return out;
}

/** Great-circle distance between two {latDeg, lonDeg}, km. Pure. */
export function crossKm(a, b) {
  const p1 = a.latDeg * DEG, p2 = b.latDeg * DEG;
  const dl = (b.lonDeg - a.lonDeg) * DEG;
  const h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * EARTH_R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** A lat/lon box `spanKm` wide round a point (south, west, north, east), clipped to the globe. Pure. */
export function boxAround(latDeg, lonDeg, spanKm) {
  const halfLat = (spanKm / 2 / EARTH_R_KM) / DEG;
  const halfLon = halfLat / Math.max(0.05, Math.cos(latDeg * DEG));
  return { south: Math.max(-90, latDeg - halfLat), north: Math.min(90, latDeg + halfLat), west: Math.max(-180, lonDeg - halfLon), east: Math.min(180, lonDeg + halfLon) };
}

/** The drift's choices as a script gives them, checked (ui/driftplan.js's words), or null. Pure. */
export const DRIFT_CATS = ['craft', 'worlds', 'small', 'stars', 'deep'];
export function cleanDrift(o) {
  if (!o || typeof o !== 'object') return null;
  const out = {};
  if (o.through !== undefined) {
    if (!Array.isArray(o.through)) return null;
    const t = DRIFT_CATS.filter((c) => o.through.includes(c));
    if (!t.length) return null;
    out.through = t;
  }
  for (const k of ['realOnly', 'tags', 'bare']) if (o[k] !== undefined) { if (typeof o[k] !== 'boolean') return null; out[k] = o[k]; }
  if (o.pace !== undefined) { if (!['calm', 'steady', 'brisk'].includes(o.pace)) return null; out.pace = o.pace; }
  if (o.seed !== undefined && o.seed !== null) { if (!Number.isInteger(o.seed) || o.seed < 1 || o.seed > 999999999) return null; out.seed = o.seed; }
  else if (o.seed === null) out.seed = null;
  return out;
}
/** `#drift=`'s words for checked choices (ui/driftplan.js readOptions reads them back). Pure. */
export function driftWords(o) {
  const w = [...(o.through || [])];
  if (o.realOnly === true) w.push('real'); else if (o.realOnly === false) w.push('any');
  if (o.tags === true) w.push('tags'); else if (o.tags === false) w.push('notags');
  if (o.bare === true) w.push('bare'); else if (o.bare === false) w.push('nobare');
  if (o.pace) w.push(o.pace);
  if (o.seed) w.push(`seed${o.seed}`);
  return w.length ? w.join(',') : '1';
}

/** The service worker's caches (site/sw.js ASSET_CACHE, DATA_CACHE): tests/test_mapapi.mjs holds the two files to one name. */
export const SW_CACHES = { asset: 'sr-sw-assets-v1', data: 'sr-sw-data-v1' };
const ASSET_DIRS = ['textures/', 'models/', 'audio/', 'images/', 'og/', 'data/'];
/**
 * Where site/sw.js keeps a file of the map's own: {cache, key} (key: the address with no query or fragment), or null for
 * anything it does not keep that way (another site, the page, js/, a share page). Pure.
 */
export function offlineRoute(url, base) {
  let u, b;
  try { u = new URL(String(url), base); b = new URL(base); } catch { return null; }
  if (u.origin !== b.origin || !u.pathname.startsWith(b.pathname)) return null;
  const rel = u.pathname.slice(b.pathname.length);
  const key = `${u.origin}${u.pathname}`;
  if (rel.startsWith('data/v1/')) return { cache: SW_CACHES.data, key };
  if (ASSET_DIRS.some((d) => rel.startsWith(d)) && rel.length > 0 && !rel.endsWith('/')) return { cache: SW_CACHES.asset, key };
  return null;
}

/**
 * A voice a script gave for one trip, checked: {credit, rows: {'<trip>/<stop>': {file, twin, vtt, seconds}}}, or null.
 * Addresses are https only; a clip is 0.5 to 600 seconds. Pure.
 */
export function cleanVoice(res, tripId) {
  if (!res || typeof res !== 'object' || !res.clips || typeof res.clips !== 'object' || typeof tripId !== 'string') return null;
  const https = (v) => (typeof v === 'string' && /^https:\/\/[^\s]+$/.test(v) && v.length < 2048 ? v : '');
  const rows = {};
  let n = 0;
  for (const [stop, c] of Object.entries(res.clips)) {
    if (!/^[a-z0-9][a-z0-9-]{0,60}$/.test(stop) || !c || typeof c !== 'object') continue;
    const file = https(c.opus) || https(c.file) || https(c.m4a);
    const seconds = Number(c.seconds);
    if (!file || !(seconds >= 0.5 && seconds <= 600)) continue;
    rows[`${tripId}/${stop}`] = { file, twin: https(c.m4a) || file, vtt: https(c.vtt), seconds };
    n += 1;
    if (n >= 80) break;
  }
  return n ? { credit: String(res.credit || '').slice(0, 200), rows } : null;
}

// --------------------------------------------------------------------------------------------------------- the api

export function createMapApi(ctx, win = typeof window !== 'undefined' ? window : null) {
  const doc = win && win.document;
  const safe = (fn, fallback = null) => { try { return fn(); } catch (e) { if (win && win.console) win.console.warn('srMap', e); return fallback; } };
  const P = COPY.plugins || {};

  // -- where the map is ----------------------------------------------------------------------------------------------
  const groundUp = () => !!(ctx.ground && ctx.ground.active);
  const skyUp = () => !!(ctx.skyView && ctx.skyView.active);
  function view() {
    return safe(() => {
      const mode = groundUp() ? 'ground' : skyUp() ? 'sky' : 'orbit';
      const g = groundUp() ? ctx.ground.state() : null;
      const o = ctx.observer;
      return {
        mode,
        stage: ctx.stage ? ctx.stage.worldId : null,
        world: g ? g.world : mode === 'sky' ? 'earth' : (ctx.stage ? ctx.stage.worldId : null),
        ground: g ? g.ground : null,
        selected: typeof ctx.selected === 'function' && ctx.selected() ? ctx.selected().id : null,
        selectedName: typeof ctx.selected === 'function' && ctx.selected() ? String(ctx.selected().name || ctx.selected().id) : null,
        place: o && fin(o.latDeg) && fin(o.lonDeg) ? { latDeg: o.latDeg, lonDeg: o.lonDeg, source: o.source || null } : null,
      };
    });
  }

  // -- events: the map's own, under plain names ----------------------------------------------------------------------
  const EVENTS = { select: 'sr:select', sky: 'sr:sky', observer: 'sr:observer', overlay: 'sr:overlay', layers: 'sr:layers-ready', drift: 'sr:drift' };
  const clockFns = new Set();
  let clockHooked = false;
  function on(name, fn) {
    if (typeof fn !== 'function') return () => {};
    if (name === 'clock') {
      if (!clockHooked && ctx.clock && typeof ctx.clock.onChange === 'function') {
        clockHooked = true;
        ctx.clock.onChange((c) => { for (const f of [...clockFns]) safe(() => f(clockOf(c))); });
      }
      clockFns.add(fn);
      return () => clockFns.delete(fn);
    }
    const type = EVENTS[name];
    if (!type || !win) return () => {};
    const h = (e) => safe(() => fn(e && e.detail !== undefined ? e.detail : null));
    win.addEventListener(type, h);
    return () => win.removeEventListener(type, h);
  }

  // -- the camera ----------------------------------------------------------------------------------------------------
  const rig = () => ctx.cameraRig;
  function cameraGet() {
    return safe(() => {
      if (groundUp() || skyUp()) return { mode: groundUp() ? 'ground' : 'sky' };
      const p = ctx.camPose();
      const sel = typeof ctx.selected === 'function' ? ctx.selected() : null;
      return { mode: 'orbit', target: sel ? sel.id : null, stage: ctx.stage.worldId, azimuthDeg: p.azimuthDeg, polarDeg: p.polarDeg, distanceKm: p.distanceKm, fovDeg: ctx.camera ? ctx.camera.fov : null };
    });
  }
  const raf = (f) => (win && typeof win.requestAnimationFrame === 'function' ? win.requestAnimationFrame(f) : setTimeout(f, 16));
  /** Resolves once the rig has stopped flying for a few frames in a row (main.js applyCam's rule). */
  function landed() {
    return new Promise((resolve) => {
      const began = Date.now();
      let quiet = 0;
      const look = () => {
        const r = rig();
        quiet = r && r.state && r.state.flying ? 0 : quiet + 1;
        if (quiet >= CAM_QUIET_FRAMES || Date.now() - began > CAM_GIVE_UP_MS) { resolve(quiet >= CAM_QUIET_FRAMES); return; }
        raf(look);
      };
      raf(look);
    });
  }
  async function cameraFly(poseIn, { ms = 1500 } = {}) {
    const pose = cleanPose(poseIn);
    const r = rig();
    if (!pose || !r || typeof r.flyTo !== 'function' || groundUp() || skyUp()) return false;
    const sel = typeof ctx.selected === 'function' ? ctx.selected() : null;
    if (pose.target && (!sel || sel.id !== pose.target)) {
      const rec = ctx.recordById(pose.target);
      if (!rec) return false;
      safe(() => ctx.select(rec, { from: 'plugin', undo: false }));
      await landed();
    }
    const rigPose = poseToRig(pose, ctx.stage.unitKm);
    if (!Object.keys(rigPose).length) return true;
    const time = fin(ms) ? Math.max(0, Math.min(60000, ms)) : 1500;
    return new Promise((resolve) => {
      try { r.flyTo({ ...rigPose, ms: time, onArrive: (why) => resolve(why === 'done' || why === 'skipped'), onCancel: () => resolve(false) }); } catch { resolve(false); }
    });
  }

  /**
   * The point of the Earth under a screen point (the middle of the view by default), {latDeg, lonDeg}, or null when the
   * Earth is not there. A ray from the camera against the Earth's sphere, turned into the Earth-fixed frame by the stage's
   * own conversion of three axes (scene/stage.js toScene), so it is right on any stage that draws the Earth.
   */
  function earthPoint(clientX, clientY) {
    return safe(() => {
      if (groundUp() || skyUp()) return null;
      const st = ctx.stage, cam = ctx.camera, el = ctx.renderer && ctx.renderer.domElement;
      if (!st || !cam || !el || typeof st.toScene !== 'function') return null;
      const rect = el.getBoundingClientRect();
      const x = fin(clientX) ? clientX : rect.left + rect.width / 2;
      const y = fin(clientY) ? clientY : rect.top + rect.height / 2;
      const ndc = cam.position.clone().set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1, 0.5).unproject(cam);
      const o = cam.position;
      const d = ndc.sub(o).normalize();
      const R = 6378.137;
      const c = st.toScene({ x: 0, y: 0, z: 0 }, 'earth-fixed');
      const ax = ['x', 'y', 'z'].map((k) => { const v = st.toScene({ x: k === 'x' ? R : 0, y: k === 'y' ? R : 0, z: k === 'z' ? R : 0 }, 'earth-fixed'); return v ? v.sub(c) : null; });
      if (!c || ax.some((v) => !v)) return null;
      const rs = ax[0].length();
      const oc = o.clone().sub(c);
      const b = oc.dot(d), cc = oc.dot(oc) - rs * rs;
      const disc = b * b - cc;
      if (disc < 0) return null;
      const tHit = -b - Math.sqrt(disc);
      if (tHit < 0) return null;
      const p = oc.add(d.multiplyScalar(tHit));
      const ex = p.dot(ax[0]) / (rs * rs), ey = p.dot(ax[1]) / (rs * rs), ez = p.dot(ax[2]) / (rs * rs);
      return { latDeg: Math.atan2(ez, Math.hypot(ex, ey)) / DEG, lonDeg: Math.atan2(ey, ex) / DEG };
    });
  }
  /** The Earth in the middle of the view and how wide the view is across it, {latDeg, lonDeg, spanKm}, or null. */
  function earthView() {
    return safe(() => {
      const mid = earthPoint();
      if (!mid) return null;
      const el = ctx.renderer.domElement;
      const rect = el.getBoundingClientRect();
      const y = rect.top + rect.height / 2;
      let span = null;
      for (const f of [0.02, 0.1, 0.25, 0.4]) {
        const a = earthPoint(rect.left + rect.width * f, y), b = earthPoint(rect.right - rect.width * f, y);
        if (a && b) { span = crossKm(a, b) / (1 - 2 * f); break; }
      }
      if (!span) span = Math.min(12000, (ctx.camPose().distanceKm - EARTH_R_KM) * 2 * Math.tan(((ctx.camera.fov || 45) / 2) * DEG) * (rect.width / rect.height));
      return { ...mid, spanKm: span };
    });
  }

  // -- the clock -----------------------------------------------------------------------------------------------------
  function clockSet(o = {}) {
    return safe(() => {
      const c = ctx.clock;
      if (o.live === true) { c.live(); return clockOf(c); }
      if (fin(o.ms)) c.goTo(o.ms);
      if (fin(o.rate) && o.rate !== 0) c.setRate(o.rate);
      if (typeof o.paused === 'boolean') c.setPaused(o.paused);
      return clockOf(c);
    });
  }

  // -- recording (ui/mapapirecord.js, fetched on first use) ----------------------------------------------------------
  let recMod = null;
  const wantRec = () => recMod || (recMod = import('./mapapirecord.js').catch((e) => { recMod = null; throw e; }));
  const record = {
    can: () => safe(() => {
      const g = win || {};
      const live = typeof g.MediaRecorder === 'function' && !!(doc && doc.createElement('canvas').captureStream);
      return { live, frames: typeof g.VideoEncoder === 'function' || live };
    }, { live: false, frames: false }),
    start: async (opts = {}) => (await wantRec()).startLive(ctx, opts, win),
    frames: async (opts = {}) => (await wantRec()).createFrameEncoder(opts, win),
  };
  /** One still frame of the scene at any size (no chrome, no lines): a canvas. Orbit view only. */
  const picture = async (opts = {}) => {
    if (groundUp() || skyUp()) throw new Error('a picture is of the orbit view');
    return (await wantRec()).picture(ctx, opts, win);
  };

  // -- the drift (ui/drift.js), loaded on the first ask ----------------------------------------------------------------
  const drift = {
    get: () => safe(() => {
      const st = ctx.drift && typeof ctx.drift.state === 'function' ? ctx.drift.state() : null;
      if (!st) return { active: false, options: null, place: null, visits: 0 };
      const o = st.options || {};
      return { active: !!st.active, options: { through: (o.through || []).slice(), realOnly: !!o.realOnly, tags: !!o.tags, bare: !!o.bare, pace: o.pace, seed: Number.isInteger(o.seed) ? o.seed : null }, place: st.place, visits: st.visits };
    }),
    /** Start the drift with these choices, or change them while it runs: resolves true when it is drifting. */
    start: async (o = {}) => {
      const want = cleanDrift(o);
      if (!want || typeof ctx.wantDrift !== 'function') return false;
      if (ctx.drift && ctx.drift.active) return safe(() => !!ctx.drift.start(want, 'plugin'), false);
      const d = await ctx.wantDrift({ drift: driftWords(want) }, 'plugin');
      return !!(d && d.active);
    },
    stop: () => safe(() => { if (ctx.drift && ctx.drift.active) ctx.drift.stop('plugin'); return true; }, false),
  };

  // -- the layers (What to show) ----------------------------------------------------------------------------------------
  const layers = {
    list: () => safe(() => (ctx.layers || []).map((l) => ({ id: l.id, on: typeof ctx.isLayerOn === 'function' ? !!ctx.isLayerOn(l.id) : !!l.on })), []),
    set: (id, on) => safe(() => {
      if (typeof id !== 'string' || typeof on !== 'boolean' || typeof ctx.setLayerOn !== 'function' || !(ctx.layers || []).some((l) => l.id === id)) return false;
      ctx.setLayerOn(id, on);
      return true;
    }, false),
  };

  // -- the trips: their list, and the gate an early trip's Play asks (ui/trip.js, registry/tours.yaml early_until) --------
  const trips = {
    list: () => safe(() => (typeof ctx.trip.tours === 'function' ? ctx.trip.tours() : []).map((x) => ({ id: x.id, title: x.title, group: x.group || null, earlyUntil: x.early_until || null })), []),
    /** `fn({id, title, earlyUntil}) -> boolean | Promise<boolean>`: false keeps the trip shut. Answers the stop function. */
    gate(fn) {
      if (typeof fn !== 'function') return () => {};
      ctx.tripGate = fn;
      return () => { if (ctx.tripGate === fn) ctx.tripGate = null; };
    },
  };

  // -- offline: what the service worker keeps (site/sw.js), kept on purpose ---------------------------------------------
  const pageBase = () => new URL('./', (doc && doc.baseURI) || win.location.href).href;
  const cachesOk = () => !!(win && win.caches && typeof win.caches.open === 'function');
  const offline = {
    /** {worker, persisted, usage, quota}: whether a worker serves this page, and the browser's own estimate (bytes). */
    state: async () => {
      const nav = (win && win.navigator) || {};
      const est = nav.storage && typeof nav.storage.estimate === 'function' ? await nav.storage.estimate().catch(() => ({})) : {};
      const persisted = nav.storage && typeof nav.storage.persisted === 'function' ? await nav.storage.persisted().catch(() => false) : false;
      return { worker: !!(nav.serviceWorker && nav.serviceWorker.controller), caches: cachesOk(), persisted: !!persisted, usage: est.usage || 0, quota: est.quota || 0 };
    },
    /** Ask the browser not to clear what is kept when space is short: resolves true when it agreed. */
    persist: async () => { const nav = (win && win.navigator) || {}; try { return !!(nav.storage && await nav.storage.persist()); } catch { return false; } },
    /** How many of these files are kept already. */
    has: async (urls) => {
      if (!cachesOk()) return 0;
      let n = 0;
      for (const u of Array.isArray(urls) ? urls : []) {
        const r = offlineRoute(u, pageBase());
        if (r) { try { if (await (await win.caches.open(r.cache)).match(r.key)) n += 1; } catch { /* none */ } }
      }
      return n;
    },
    /**
     * Keep these files of the map's own for use with no network, as the worker keeps what a visit used: `{onProgress(done,
     * total, bytes), signal}`. Resolves {kept, already, failed, refused, bytes}. A file of another site is refused.
     */
    keep: async (urls, { onProgress, signal } = {}) => {
      const out = { kept: 0, already: 0, failed: 0, refused: 0, bytes: 0 };
      if (!cachesOk()) { out.refused = Array.isArray(urls) ? urls.length : 0; return out; }
      const list = (Array.isArray(urls) ? urls : []).slice(0, 20000);
      const routes = list.map((u) => offlineRoute(u, pageBase()));
      let done = 0;
      const queue = routes.map((r, i) => [r, i]);
      const work = async () => {
        while (queue.length) {
          if (signal && signal.aborted) return;
          const [r] = queue.shift();
          if (!r) out.refused += 1;
          else {
            try {
              const cache = await win.caches.open(r.cache);
              if (await cache.match(r.key)) out.already += 1;
              else {
                const res = await win.fetch(r.key, { credentials: 'same-origin', signal });
                if (!res.ok || res.status !== 200) throw new Error(String(res.status));
                const len = Number(res.headers.get('content-length')) || 0;
                await cache.put(r.key, res);
                out.kept += 1;
                out.bytes += len;
              }
            } catch { out.failed += 1; }
          }
          done += 1;
          if (typeof onProgress === 'function') safe(() => onProgress(done, list.length, out.bytes));
        }
      };
      await Promise.all(Array.from({ length: 4 }, work));
      return out;
    },
    /** Let these go again (the worker fetches them anew when they are next used). Resolves how many were removed. */
    forget: async (urls) => {
      if (!cachesOk()) return 0;
      let n = 0;
      for (const u of Array.isArray(urls) ? urls : []) {
        const r = offlineRoute(u, pageBase());
        if (r) { try { if (await (await win.caches.open(r.cache)).delete(r.key)) n += 1; } catch { /* none */ } }
      }
      return n;
    },
  };

  // -- a voice in the visitor's language for the trips (audio/narration.js, ui/tripframe.js) ----------------------------
  let voiceFn = null;
  let voiceTrip = '';
  let voiceHooked = false;
  function askVoice(st) {
    const id = st && st.phase !== 'idle' ? st.tourId : null;
    if (!id) { voiceTrip = ''; return; }
    if (!voiceFn || id === voiceTrip) return;
    voiceTrip = id;
    const fn = voiceFn;
    const lang = api.lang;
    const p = Promise.resolve().then(() => fn({ tripId: id, lang })).then((res) => cleanVoice(res, id), () => null)
      .then((table) => { if (voiceFn === fn && voiceTrip === id) ctx.voiceAlt = table; return table; });
    ctx.voiceAlt = p;
  }
  const voice = {
    /** `fn({tripId, lang}) -> {credit, clips: {stopId: {opus, m4a, vtt, seconds}}} | null`, asked once a trip starts. */
    provide(fn) {
      if (typeof fn !== 'function') return () => {};
      voiceFn = fn;
      voiceTrip = '';
      ctx.voiceAlt = null;
      if (!voiceHooked && ctx.trip && typeof ctx.trip.onChange === 'function') { voiceHooked = true; ctx.trip.onChange((st) => safe(() => askVoice(st))); }
      safe(() => askVoice(ctx.trip && ctx.trip.state));
      return () => { if (voiceFn === fn) { voiceFn = null; voiceTrip = ''; ctx.voiceAlt = null; } };
    },
    get: () => safe(() => { const a = ctx.voiceAlt; return a && typeof a.then !== 'function' ? { credit: a.credit, stops: Object.keys(a.rows).length } : null; }),
  };

  // -- a landing site's ground (scene/groundstage.js) ----------------------------------------------------------------
  const tr = () => (groundUp() && typeof ctx.ground.terrain === 'function' ? ctx.ground.terrain() : null);
  const GRAVITY = { moon: 1.625, mars: 3.721, earth: 9.80665, titan: 1.352, europa: 1.315 };
  const terrain = {
    site: () => safe(() => {
      const t = tr();
      if (!t) return null;
      const m = t.manifest;
      return {
        id: m.id, world: m.world, latDeg: m.latDeg, lonDeg: m.lonDeg, radiusKm: m.radiusKm, groundM: m.groundM,
        near: { size: t.near.size, stepM: t.near.step }, far: { size: t.far.size, stepM: t.far.step },
        sources: (m.sources || []).map((s) => ({ what: s.what || s.role || '', credit: s.credit || '', licence: s.licence || '' })),
      };
    }),
    heightAt: (xM, zM) => safe(() => { const t = tr(); return t && fin(xM) && fin(zM) ? t.heightAt(xM, zM) : NaN; }, NaN),
    sample: (latDeg, lonDeg) => safe(() => {
      const t = tr();
      if (!t || !fin(latDeg) || !fin(lonDeg)) return null;
      const [x, z] = t.xz(latDeg, lonDeg);
      const h = t.heightAt(x, z);
      return fin(h) ? { heightM: h, xM: x, zM: z } : null;
    }),
    grid: (which = 'near') => safe(() => {
      const t = tr();
      const g = t ? t[which === 'far' ? 'far' : 'near'] : null;
      return g ? { size: g.size, stepM: g.step, h: Float32Array.from(g.h) } : null;
    }),
    walker: () => safe(() => {
      if (!groundUp()) return null;
      const w = ctx.ground.state().walker;
      const t = tr();
      return { xM: w.x, zM: w.z, yawDeg: w.yawDeg, pitchDeg: w.pitchDeg, heightM: t ? t.heightAt(w.x, w.z) : NaN };
    }),
    lift: (m) => safe(() => (groundUp() && typeof ctx.ground.setLift === 'function' ? ctx.ground.setLift(m) : 0), 0),
    sunAt: (ms) => safe(() => (groundUp() && typeof ctx.ground.sunAt === 'function' && fin(ms) ? ctx.ground.sunAt(ms) : null)),
    skyline: () => safe(() => { const t = tr(); return t && t.profile ? Float32Array.from(t.profile) : null; }),
    gravity: () => safe(() => { const s = view(); return s && s.world && GRAVITY[s.world] ? GRAVITY[s.world] : null; }),
  };

  // -- the skyline of the sky from your street -----------------------------------------------------------------------
  let provider = null;
  let asked = '';
  let given = null; // {key, deg, credit, label}
  function placeKey(o) { return o && fin(o.latDeg) && fin(o.lonDeg) ? `${o.latDeg.toFixed(4)},${o.lonDeg.toFixed(4)}` : ''; }
  function wear() { ctx.horizonOverride = given; if (win) win.dispatchEvent(new CustomEvent('sr:horizon', { detail: given ? { source: 'provided', credit: given.credit, label: given.label } : { source: 'drawn' } })); }
  function askHorizon() {
    if (!provider || !skyUp()) return;
    const o = ctx.observer;
    const key = placeKey(o);
    if (!key || key === asked) return;
    asked = key;
    const fn = provider;
    Promise.resolve().then(() => fn({ latDeg: o.latDeg, lonDeg: o.lonDeg })).then((res) => {
      if (fn !== provider || asked !== key) return;
      const deg = res ? binsFrom(res.deg) : null;
      given = deg ? { key, deg, credit: String(res.credit || '').slice(0, 300), label: String(res.label || '').slice(0, 80) } : null;
      wear();
    }, () => { if (fn === provider && asked === key) { given = null; wear(); } });
  }
  if (win) { win.addEventListener('sr:sky', askHorizon); win.addEventListener('sr:observer', () => { asked = ''; if (given) { given = null; wear(); } askHorizon(); }); }
  const horizon = {
    get: () => safe(() => {
      if (given) return { source: 'provided', deg: Float32Array.from(given.deg), credit: given.credit, label: given.label };
      const s = ctx.skyView && typeof ctx.skyView.skyline === 'function' ? ctx.skyView.skyline() : null;
      return s ? { source: 'drawn', deg: s, credit: '' } : null;
    }),
    provide(fn) {
      if (typeof fn !== 'function') return () => {};
      provider = fn;
      asked = '';
      askHorizon();
      return () => { if (provider === fn) { provider = null; asked = ''; if (given) { given = null; wear(); } } };
    },
  };

  // -- the place in use ----------------------------------------------------------------------------------------------
  const place = {
    get: () => view() && view().place,
    set: (p) => safe(() => {
      if (!p || !fin(p.latDeg) || !fin(p.lonDeg) || Math.abs(p.latDeg) > 90) return false;
      const name = typeof p.name === 'string' ? p.name.slice(0, 60) : '';
      ctx.setObserver({ name, country: '', latDeg: p.latDeg, lonDeg: ((((p.lonDeg + 180) % 360) + 360) % 360) - 180, source: 'set' });
      return true;
    }, false),
  };

  // -- the Earth overlays (scene/earthoverlay.js, NASA GIBS) ----------------------------------------------------------
  let overlays = null;
  const gibs = {
    service: async () => { const m = await import('../data/overlays.js'); return { ...m.OVERLAY_SERVICE }; },
    layers: async () => { overlays = overlays || (await import('../data/overlays.js')).OVERLAYS; return overlays.map((o) => ({ id: o.id, layer: o.layer, title: o.title, rule: { ...o.date }, credit: o.credit })); },
    get: () => safe(() => (typeof ctx.overlayState === 'function' ? (({ id, status, date, credit }) => ({ id, status, date, credit }))(ctx.overlayState()) : null)),
    /** Lay one overlay on (or none), optionally of one day ('YYYY-MM-DD'); resolves with its state once shown or failed. */
    set: (id, { date } = {}) => new Promise((resolve) => {
      if (typeof ctx.setOverlay !== 'function') { resolve(null); return; }
      const day = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
      ctx.setOverlay(id || null);
      if (!id) { resolve(gibs.get()); return; }
      const began = Date.now();
      let dated = !day;
      const wait = () => {
        const o = ctx.earthOverlay;
        // The overlay's module arrives on the first ask (main.js wantOverlay); then the day is asked of it directly.
        if (!dated && o && typeof o.set === 'function') { dated = true; o.set(id, { date: day }); }
        const s = gibs.get();
        if (dated && s && s.id === id && (s.status === 'shown' || s.status === 'failed' || s.status === 'no-earth') && (!day || s.date === day || s.status !== 'shown')) { resolve(s); return; }
        if (Date.now() - began > 30000) { resolve(s); return; }
        setTimeout(wait, 150);
      };
      wait();
    }),
  };

  // -- the map's chrome: a panel, a tool button, a toast --------------------------------------------------------------
  const tools = new Map(); // id -> {spec, els: Set}
  function buttonFor(spec, slot) {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = `${slot.getAttribute('data-sr-tools-btn') || 'ui-btn ui-btn--sm'} sr-tool`;
    b.setAttribute('data-sr-tool', spec.id);
    paintButton(b, spec);
    b.addEventListener('click', () => safe(() => {
      const where = slot.getAttribute('data-sr-tools');
      // In the share sheet a tool is a maker like Record: the sheet closes first, so its panel is not opened under it.
      if (where === 'make' && ctx.share && typeof ctx.share.close === 'function' && (!ctx.share.isOpen || ctx.share.isOpen())) ctx.share.close();
      if (spec.onPress) spec.onPress({ opener: b, where });
    }));
    return b;
  }
  function paintButton(b, spec) {
    b.textContent = '';
    if (spec.icon) b.appendChild(glyph(spec.icon));
    const label = doc.createElement('span');
    label.className = 'sr-tool__label sr-share__label';
    label.textContent = spec.label;
    b.appendChild(label);
    if (spec.locked) { const l = glyph('lock'); l.classList.add('sr-tool__lock'); b.appendChild(l); }
    b.title = spec.title || spec.label;
    if (spec.title) b.setAttribute('aria-label', spec.title); else b.removeAttribute('aria-label');
  }
  function fill(slot) {
    if (!slot || !slot.isConnected) return;
    const where = slot.getAttribute('data-sr-tools');
    for (const t of tools.values()) {
      if (!t.spec.where.includes(where) || [...t.els].some((e) => e.parentNode === slot)) continue;
      const b = buttonFor(t.spec, slot);
      t.els.add(b);
      slot.appendChild(b);
    }
    slot.hidden = !slot.querySelector('[data-sr-tool]');
  }
  const fillAll = () => { if (doc) for (const s of doc.querySelectorAll('[data-sr-tools]')) fill(s); };
  if (doc) doc.addEventListener('sr:slot', (e) => { if (e && e.detail && e.detail.slot === 'tools') fill(e.detail.el); });
  function tool(spec = {}) {
    if (!doc || typeof spec.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,39}$/.test(spec.id) || typeof spec.label !== 'string' || !spec.label.trim()) return null;
    const where = (Array.isArray(spec.where) ? spec.where : [spec.where]).filter((w) => TOOL_PLACES.includes(w));
    if (!where.length) return null;
    if (tools.has(spec.id)) tools.get(spec.id).remove();
    const s = { id: spec.id, where, label: spec.label.trim().slice(0, 40), title: typeof spec.title === 'string' ? spec.title.slice(0, 120) : '', icon: typeof spec.icon === 'string' ? spec.icon : '', locked: !!spec.locked, onPress: spec.onPress };
    const entry = {
      spec: s, els: new Set(),
      update(o = {}) {
        if (typeof o.label === 'string' && o.label.trim()) s.label = o.label.trim().slice(0, 40);
        if (typeof o.title === 'string') s.title = o.title.slice(0, 120);
        if (typeof o.locked === 'boolean') s.locked = o.locked;
        for (const b of entry.els) paintButton(b, s);
      },
      remove() {
        for (const b of entry.els) { const slot = b.parentNode; b.remove(); if (slot) slot.hidden = !slot.querySelector('[data-sr-tool]'); }
        entry.els.clear();
        tools.delete(s.id);
      },
    };
    tools.set(s.id, entry);
    loadCss('plugins', doc);
    fillAll();
    return { update: entry.update, remove: entry.remove };
  }

  const panels = new Map();
  function panel(spec = {}) {
    if (!doc || typeof spec.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,39}$/.test(spec.id)) return null;
    if (panels.has(spec.id)) { const p = panels.get(spec.id); if (typeof spec.title === 'string') p.setTitle(spec.title); return p; }
    const cssReady = loadCss('make', doc).then(() => loadCss('plugins', doc));
    const root = doc.createElement('section');
    root.className = 'sr-make sr-make--small sr-float sr-over-clean ui-pop sr-plugin';
    root.id = `sr-plugin-${spec.id}`;
    root.hidden = true;
    root.setAttribute('aria-labelledby', `${root.id}-title`);
    const head = doc.createElement('div');
    head.className = 'ui-pop__head';
    const title = doc.createElement('h2');
    title.className = 'ui-pop__title';
    title.id = `${root.id}-title`;
    title.tabIndex = -1;
    title.textContent = String(spec.title || '').slice(0, 60);
    const close = doc.createElement('button');
    close.type = 'button';
    close.className = 'ui-close';
    close.appendChild(icon('x'));
    close.title = P.close || 'Close';
    close.setAttribute('aria-label', P.close || 'Close');
    head.append(title, close);
    const body = doc.createElement('div');
    body.className = 'sr-make__body sr-plugin__body';
    root.append(head, body);
    doc.body.appendChild(root);
    let opener = null;
    let sheet = null;
    const closers = new Set();
    const phone = () => doc.documentElement.classList.contains('sr-phone');
    const seat = async () => {
      if (phone() && !sheet) {
        const m = await import('./sheet.js');
        if (!root.hidden && !sheet) sheet = m.createSheet(root, { detents: ['peek', 'half', 'full'], initial: 'half', grab: '.ui-pop__title', scrollers: '.sr-make__body', label: (P.sheet || '{title}').replace('{title}', title.textContent) });
      } else if (!phone() && sheet) { sheet.destroy(); sheet = null; }
      if (sheet) sheet.set('half');
    };
    const api = {
      body, root,
      open(o = {}) {
        opener = o.opener || doc.activeElement;
        root.hidden = false;
        cssReady.then(() => { if (!root.hidden) seat(); });
        title.focus({ preventScroll: true });
      },
      close() {
        if (root.hidden) return;
        root.hidden = true;
        for (const f of [...closers]) safe(() => f());
        if (opener && opener.isConnected) opener.focus({ preventScroll: true });
      },
      isOpen: () => !root.hidden,
      setTitle: (text) => { title.textContent = String(text || '').slice(0, 60); },
      onClose(f) { if (typeof f === 'function') closers.add(f); return () => closers.delete(f); },
    };
    close.addEventListener('click', () => api.close());
    root.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); api.close(); } });
    panels.set(spec.id, api);
    return api;
  }

  async function toast(text, ms = 4000) {
    if (typeof text !== 'string' || !text.trim()) return;
    const m = await import('./share.js');
    m.toast(text.trim().slice(0, 160), Math.max(1500, Math.min(10000, ms)));
  }

  const api = {
    version: VERSION,
    lang: (doc && doc.documentElement.getAttribute('lang')) || 'en',
    view, on,
    camera: { get: cameraGet, fly: cameraFly, set: (p) => cameraFly(p, { ms: 0 }), earthPoint, earthView },
    clock: { get: () => safe(() => clockOf(ctx.clock)), set: clockSet, onChange: (fn) => on('clock', fn) },
    record, picture, terrain, horizon, place, gibs, drift, layers, trips, offline, voice,
    ui: { panel, tool, toast },
  };
  return api;
}

/** Make the API once for this map and say so: `window.srMap` and `document` event `sr:map {version}`. */
export function installMapApi(ctx, win = typeof window !== 'undefined' ? window : null) {
  if (!win) return null;
  if (win.srMap && win.srMap.version === VERSION && win.srMap.__ctx === ctx) return win.srMap;
  const api = createMapApi(ctx, win);
  Object.defineProperty(api, '__ctx', { value: ctx, enumerable: false });
  win.srMap = Object.freeze(api);
  try { win.document.dispatchEvent(new CustomEvent('sr:map', { detail: { version: VERSION } })); } catch { /* an old browser */ }
  return win.srMap;
}
