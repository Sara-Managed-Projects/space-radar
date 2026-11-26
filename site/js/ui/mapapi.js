// ui/mapapi.js -- window.srMap: a small, generic scripting API for the map (docs/PLUGINS.md, research train 6b).
//
// Contract: installMapApi(ctx, win?) -> api   sets window.srMap (once), then `document` event `sr:map {version}`
//           createMapApi(ctx, win?) -> api    the same object without installing it (tests)
// Pure, for tests/test_mapapi.mjs: VERSION, cleanPose(p), clockOf(clock), poseToRig(pose, unitKm), binsFrom(deg),
//   sampleBins(fn, n), crossKm(a, b), boxAround(lat, lon, spanKm)
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
  const EVENTS = { select: 'sr:select', sky: 'sr:sky', observer: 'sr:observer', overlay: 'sr:overlay', layers: 'sr:layers-ready' };
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
    record, terrain, horizon, place, gibs,
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
