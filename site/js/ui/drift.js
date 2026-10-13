// ui/drift.js -- the drift: the camera wanders from one thing to the next, on its own, with no end
// (spec 0071).
//
// Exports: createDrift(ctx, env) -> { apply(link, from), start(options, from), stop(reason),
//          pause(), resume(), skip(), setOptions(patch), state(), active }, and createBar(doc),
//          lookOf(record, deps), factsOf(record, deps), LAYERS_FOR, STORE_KEY, ROOT_CLASS, BARE_CLASS,
//          DARK_BELOW, PEEK_MS, SMALL_PX, HURRY_MOST.
//
// `#drift=1` in the address (or words: `#drift=worlds,stars,calm`, ui/driftplan.js readOptions), or
// the Drift row at the top of Just watch. Ivan, 2026-10-12: "kind of screensaver, when everything
// closes and camera infinitely nicely and smoothly moves through all objects ... generic movement
// of course, not like tours predefined, and of course random".
//
// IMPORTED ON DEMAND, by main.js, never at boot: this file, its plan and its stylesheet are fetched
// when the link or the row asks (tests/test_boot_diet.mjs).
//
// IT IS A HAND ON THE MAP, NOT A SECOND CAMERA. Every move is main.js select(): the same call a
// tap on a search result makes, with a longer flight. So the stage changes, the lit side, the limb
// in the picture, the distance a thing is met from, the 3D model and the reticle's tag are the
// map's own, and a fix to any of them is a fix here. What this file adds is which thing comes next
// (ui/driftplan.js), how long the camera stays, a slow turn while it does, and, for a hop too long
// for one ease, the curve the camera flies there on (planFlight: paced by what the eye sees).
//
// WHAT IS ON SCREEN. The clear screen (ui/cleanview.js), or the HUD screen when names are wanted:
// the reticle's tag is the "panel on top of the object", in the card's own words. One small bar,
// bottom centre, shows while the pointer moves and goes three seconds after it stops.
//
// ONLY SPACE (Ivan, 2026-10-14: "an option to hide everything: all planet texts, title
// descriptions, dots/icons of objects, so it will be really only space, no solar system lines or
// whatever, space and objects only"). The clear screen takes the panels, the names and the timeline;
// this option also takes what is drawn in the scene and is not the sky or a body: every layer's
// dots and icons, the orbit of the selection, its ground track and its path, the planets' orbits,
// the constellation figures, the shells and marks of the far rungs, the rings and labels of a star
// system. NOTHING IS SWITCHED OFF: no layer setting is touched. Each frame, after the scene has
// placed everything and before it is drawn, bareFrame() hides those objects for that frame (main.js
// calls ctx.bareFrame when there is one), and what each was is kept, so leaving the option, or the
// drift, puts every one back as it was. The models (scene/heroes.js) ask whether a LAYER is on, not
// whether its dots are drawn, so they stay. The bar and the pointer go as they always did, three
// seconds after the pointer stops; here the eye and the share button go with them.
//
// LEAVING. A drag or a wheel on the map is taking the controls: the drift stops where the camera
// is and the panels come back. Escape and H do the same (they are the clear screen's own keys).
// Space pauses; N goes to the next place (the arrows are the camera's, and so take the controls).
//
// LIGHT. One timer, four times a second, on the wall clock (so a starved frame loop cannot strand
// it); one weighted pick per stop; nothing per frame, but for a long flight's curve (the rig asks
// it where the camera is, a few lines of arithmetic) and only space's hook while that option is on.
// The pool is rebuilt only when the number of records on the map changes.
import { COPY } from '../copy/en.js';
import '../copy/en.later.js';
import { realModelFor } from '../scene/realmodels.js';
import { systemOf, positionOf } from '../scene/worlds.js';
import { parseFrame } from '../propagate/frames.js';
import { inEarthShadow } from '../scene/shadow.js';
import { propagate } from '../propagate/index.js';
import { icon } from './icons.js';
import {
  CATEGORIES, PACES, URL_KEY, buildPlaces, createWalk, flightMs, planFlight, dwellFor, readOptions, writeOptions,
} from './driftplan.js';
import { write as writeUrl, clear as clearUrl } from './urlstate.js';

export const ROOT_CLASS = 'sr-drift';
/** On <html> while "only space" is on (css/drift.css). */
export const BARE_CLASS = 'sr-drift--bare';
/** What a star system's stage draws that is not a body (scene/systems.js, scene/systemextras.js). */
const SYSTEM_LINES = /^systems:(ring:|mercury|zone|scale:|label)/;
/** The remembered choices, in this browser only. */
export const STORE_KEY = 'sr:drift';
/** The bar goes this long after the pointer last moved, and the pointer with it. */
export const BAR_IDLE_MS = 3000;
/** How often the drift looks at the clock. */
const TICK_MS = 250;
/** With nothing to visit yet (the layers are still landing) it waits this long, then says so. */
const EMPTY_WAIT_MS = 12000;
/** A flight that has not ended this long after it should have is treated as arrived. */
const FLIGHT_GRACE_MS = 5000;
const AU_KM = 149597870.7;
/** The sine of the Sun's height below which a place on the ground is passed over: ten degrees. */
export const DARK_BELOW = 0.17;
/**
 * A STOP HAS TO BE A PICTURE. Seen 2026-10-12: the drift dwelt on the Lunar Reconnaissance Orbiter
 * as a dot in black (over the Moon's night, its model capped to a few pixels by its height above
 * the ground). So, PEEK_MS after arriving, the drift asks the model layer how many pixels across it
 * is drawing the selection (scene/heroes.js drawnPx); under SMALL_PX, with no sunlit ground behind
 * it either, it goes on instead of staying.
 */
export const PEEK_MS = 4000;
export const SMALL_PX = 24;
/**
 * How many stays running may be left early. A dot now and then is a craft whose model is small or
 * late; this many in a row is the models not being here at all, and the next stay is kept, so the
 * drift never hurries through everything it has.
 */
export const HURRY_MOST = 3;
/** The kinds the model layer draws: only these can turn out to be a dot. */
const MODELLED = ['station', 'satellite', 'telescope', 'probe', 'rocket', 'asteroid', 'comet'];

/**
 * The layers each category is made of. The drift switches on the ones that are off, and puts them
 * back as they were when it stops.
 */
export const LAYERS_FOR = {
  craft: ['stations', 'notable', 'deep-space'],
  worlds: ['worlds'],
  small: ['asteroids', 'comets'],
  stars: ['stars', 'systems'],
  deep: ['deep-sky'],
};

/**
 * Is this record drawn as itself? 2: a real model, a mapped world, a photographed nebula, a star
 * somebody has a line about. 1: drawn as its kind. 0: not worth flying to. `deps.pictures` is
 * scene/nebulae.js PICTURE_FOR when it has arrived; `deps.systemOf(record)` a star system's stage.
 */
export function lookOf(record, deps = {}) {
  const k = record && record.klass;
  const meta = (record && record.meta) || {};
  if (k === 'world') return meta.flat ? 1 : 2;
  if (k === 'station' || k === 'satellite' || k === 'telescope' || k === 'probe' || k === 'rocket' || k === 'site' || k === 'asteroid' || k === 'comet') {
    const model = (deps.modelFor || realModelFor)(record);
    if (model && model.file && !model.generic) return 2;
    // A place with nothing standing on it is a mark; every other kind has a drawn shape.
    return k === 'site' ? 0 : 1;
  }
  if (k === 'star') return meta.why ? 2 : record.name && !/^(HIP|HYG|HD|Gl|GJ)\s?\d/i.test(record.name) ? 1 : 0;
  if (k === 'exoplanet') return deps.systemOf && deps.systemOf(record) ? 2 : 0;
  if (k === 'dso') return deps.pictures && deps.pictures.has(record.id) ? 2 : meta.messier ? 1 : 0;
  if (k === 'exotic') return 1;
  return 0;
}

/** What ui/driftplan.js hoodOf needs to know about a record (it says what each fact is). */
export function factsOf(record, deps = {}) {
  const meta = (record && record.meta) || {};
  if (!record) return {};
  if (record.klass === 'world') {
    const planetOf = (deps.planetOf || systemOf)(record.id);
    // The Moon's planet is the Earth, and the Moon is a neighbourhood of its own.
    const at = deps.sunAu ? deps.sunAu(record) : NaN;
    return { planetOf: record.id === 'moon' ? 'moon' : planetOf, sunAu: at && typeof at === 'object' ? at.sunAu : at };
  }
  if (record.klass === 'dso' || record.klass === 'exotic') return { farLy: Number(meta.distLy) };
  if (record.klass === 'star' || record.klass === 'exoplanet') return {};
  const frame = parseFrame(record.frame);
  if (frame && frame.world === 'earth') return { nearEarth: true, onWorld: 'earth' };
  if (frame && frame.world && frame.world !== 'sun') {
    const w = frame.world === 'moon' ? 'moon' : (deps.planetOf || systemOf)(frame.world);
    return { onWorld: w };
  }
  const at = deps.sunAu ? deps.sunAu(record) : NaN;
  // `sunAu` may answer with both distances at once ({sunAu, earthAu}); a bare number is the Sun's.
  return at && typeof at === 'object' ? { sunAu: at.sunAu, earthAu: at.earthAu } : { sunAu: at };
}

function el(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function linkCss(doc) {
  try {
    const href = new URL('../../css/drift.css', import.meta.url).href;
    if ([...doc.querySelectorAll('link[rel=stylesheet]')].some((l) => l.href === href)) return;
    const link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    doc.head.appendChild(link);
  } catch { /* a test's document */ }
}

/**
 * The bar: pause, next, the options (a disclosure: what to travel through, real models, names, the
 * pace) and the way out. It reports presses; it decides nothing. `.sr-over-clean` keeps it on the
 * clear screen.
 */
export function createBar(doc, handlers = {}) {
  const D = COPY.drift;
  const host = el(doc, 'div', 'sr-drift__host sr-over-clean');
  const bar = el(doc, 'div', 'sr-drift__bar sr-float');
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', D.name);

  const iconButton = (name, label, onClick, extra = '') => {
    const b = el(doc, 'button', `sr-drift__btn sr-drift__btn--icon ${extra}`.trim());
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.title = label;
    try { b.appendChild(icon(name, 20)); } catch { /* a test's document */ }
    b.addEventListener('click', onClick);
    return b;
  };
  const textButton = (label, title, onClick, extra = '') => {
    const b = el(doc, 'button', `sr-drift__btn ${extra}`.trim(), label);
    b.type = 'button';
    if (title) b.title = title;
    b.addEventListener('click', onClick);
    return b;
  };

  const pause = iconButton('pause', D.pause, () => handlers.pause && handlers.pause());
  const next = iconButton('chevron', D.next, () => handlers.next && handlers.next());
  const options = textButton(D.options, D.optionsTitle, () => setOpen(panel.hidden));
  options.setAttribute('aria-expanded', 'false');
  const leave = iconButton('x', D.leave, () => handlers.leave && handlers.leave());
  const row = el(doc, 'div', 'sr-drift__row');
  row.append(pause, next, options, leave);

  const panel = el(doc, 'div', 'sr-drift__panel');
  panel.hidden = true;
  panel.id = 'sr-drift-options';
  options.setAttribute('aria-controls', panel.id);
  const group = (label) => {
    const g = el(doc, 'div', 'sr-drift__group');
    g.setAttribute('role', 'group');
    g.setAttribute('aria-label', label);
    g.appendChild(el(doc, 'span', 'sr-micro sr-drift__label', label));
    return g;
  };
  const through = group(D.through);
  const cats = new Map();
  for (const c of CATEGORIES) {
    const b = textButton(D.cats[c], '', () => handlers.toggle && handlers.toggle(c));
    b.dataset.cat = c;
    cats.set(c, b);
    through.appendChild(b);
  }
  const show = group(D.show);
  const real = textButton(D.real, D.realTitle, () => handlers.set && handlers.set({ realOnly: real.getAttribute('aria-pressed') !== 'true' }));
  // Names and "only space" are one choice of three: pressing Names leaves only space.
  const names = textButton(D.names, D.namesTitle, () => handlers.set && handlers.set(names.getAttribute('aria-pressed') !== 'true' ? { tags: true, bare: false } : { tags: false }));
  const bare = textButton(D.bare, D.bareTitle, () => handlers.set && handlers.set({ bare: bare.getAttribute('aria-pressed') !== 'true' }));
  show.append(real, names, bare);
  const pace = group(D.pace);
  const paces = new Map();
  for (const p of Object.keys(PACES)) {
    const b = textButton(D.paces[p], '', () => handlers.set && handlers.set({ pace: p }));
    paces.set(p, b);
    pace.appendChild(b);
  }
  panel.append(through, show, pace);
  bar.append(panel, row);
  host.appendChild(bar);

  function setOpen(open) {
    panel.hidden = !open;
    options.setAttribute('aria-expanded', String(open));
    if (handlers.opened) handlers.opened(open);
  }

  /** Paint the choices and whether it is paused. */
  function paint(o, paused) {
    for (const [c, b] of cats) b.setAttribute('aria-pressed', String(o.through.includes(c)));
    // Only space travels through real things only (ui/driftplan.js buildPlaces), and shows no names.
    real.setAttribute('aria-pressed', String(o.realOnly || !!o.bare));
    names.setAttribute('aria-pressed', String(o.tags && !o.bare));
    bare.setAttribute('aria-pressed', String(!!o.bare));
    for (const [p, b] of paces) b.setAttribute('aria-pressed', String(o.pace === p));
    const label = paused ? D.resume : D.pause;
    pause.setAttribute('aria-label', label);
    pause.title = label;
    pause.setAttribute('aria-pressed', String(!!paused));
    try { pause.replaceChildren(icon(paused ? 'play' : 'pause', 20)); } catch { /* a test's document */ }
  }

  return {
    host, bar, panel, paint, setOpen,
    isOpen: () => !panel.hidden,
    focus: () => { try { pause.focus({ preventScroll: true }); } catch { /* not focusable here */ } },
    setIdle: (idle) => host.classList.toggle('is-idle', !!idle),
  };
}

export function createDrift(ctx, env = {}) {
  const doc = env.document || (typeof document !== 'undefined' ? document : null);
  const win = env.window || (doc && doc.defaultView) || (typeof window !== 'undefined' ? window : null);
  const nav = env.navigator || (win && win.navigator) || {};
  const now = env.now || (() => Date.now());
  const rng = env.rng || Math.random;
  const setTick = env.setInterval || ((fn, ms) => setInterval(fn, ms));
  const clearTick = env.clearInterval || ((id) => clearInterval(id));
  const storage = env.storage !== undefined ? env.storage : (() => { try { return win && win.localStorage; } catch { return null; } })();
  const root = doc ? doc.documentElement : null;

  let options = readOptions('1', readStored());
  let active = false;
  let phase = 'idle';       // idle | waiting | flight | dwell | paused
  let before = 'idle';      // the phase a pause interrupted
  let walk = null;
  let pool = [];
  let poolCount = -1;
  let place = null;
  let visits = 0;
  let until = 0;            // when this phase ends, on the wall clock
  let pausedAt = 0;
  let waitingSince = 0;
  let timer = null;
  let bar = null;
  let barTimer = null;
  let offInput = null;
  let screenBefore = 'full';
  let turnedOn = [];
  let pictures = null;
  let lock = null;
  let ownScreen = false;    // true while this file is the one changing the clear screen
  let opener = null;
  let flightFrom = 0;       // when the flight to `place` began, and how long it was asked to take
  let flightFor = 0;
  let hurried = 0;          // how many stays running were left early as a dot (aDot)
  let peekAt = 0;           // when this stay is looked at once (PEEK_MS after arriving); 0: already was
  let bareWas = null;       // while only space is on: what each hidden object's `visible` was

  function readStored() {
    try { return JSON.parse((storage && storage.getItem(STORE_KEY)) || 'null'); } catch { return null; }
  }
  function keep() {
    try { if (storage) storage.setItem(STORE_KEY, JSON.stringify({ through: options.through, realOnly: options.realOnly, tags: options.tags, bare: options.bare, pace: options.pace })); } catch { /* private mode */ }
  }

  // ------------------------------------------------------------------------------- the pool

  const deps = {
    get pictures() { return pictures; },
    systemOf: (record) => (ctx.systems && typeof ctx.systems.stageOfRecord === 'function' ? ctx.systems.stageOfRecord(record) : null),
    sunAu: (record) => {
      try {
        const p = propagate(record, ctx.clock.now());
        if (!p) return NaN;
        const f = parseFrame(p.frame);
        // Only a heliocentric position says how far from the Sun a thing is without more work.
        if (!f || f.world !== 'sun') return NaN;
        const e = positionOf('earth', ctx.clock.now());
        const same = e && e.frame === p.frame;
        return { sunAu: Math.hypot(p.x, p.y, p.z) / AU_KM, earthAu: same ? Math.hypot(p.x - e.x, p.y - e.y, p.z - e.z) / AU_KM : NaN };
      } catch { return NaN; }
    },
  };
  const lookCache = new Map();
  const look = (record) => {
    // The catalogue's answer does not change in a visit; the nebula pictures arriving does.
    const key = record.klass === 'dso' ? null : record.id;
    if (key && lookCache.has(key)) return lookCache.get(key);
    const v = lookOf(record, deps);
    if (key) lookCache.set(key, v);
    return v;
  };

  function recordsOnTheMap() {
    const out = [];
    for (const layer of ctx.layers || []) {
      if (typeof ctx.isLayerOn === 'function' && !ctx.isLayerOn(layer.id)) continue;
      const rows = ctx.recordsFor(layer.id);
      if (rows && rows.length) out.push(rows);
    }
    return out;
  }

  function rebuild(force) {
    const lists = recordsOnTheMap();
    let count = 0;
    for (const l of lists) count += l.length;
    if (!force && count === poolCount) return;
    poolCount = count;
    pool = buildPlaces(lists.flat(), options, look, (r) => factsOf(r, deps));
    walk = createWalk(pool, { rng, startHood: place ? place.hood : hoodHere() });
  }

  /** The neighbourhood the camera is in when the drift starts: what is selected, else the stage. */
  function hoodHere() {
    const sel = typeof ctx.selected === 'function' ? ctx.selected() : null;
    const from = sel ? buildPlaces([sel], { through: CATEGORIES, realOnly: false }, () => 2, (r) => factsOf(r, deps))[0] : null;
    if (from) return from.hood;
    const id = ctx.stage && ctx.stage.worldId;
    if (id === 'stellar' || id === 'galaxy') return id;
    if (id === 'local-group') return 'beyond';
    if (id && String(id).startsWith('system-')) return 'stellar';
    return id === 'sun' ? 'sun' : (id && id !== 'earth' ? (id === 'moon' ? 'moon' : systemOf(id)) : 'earth');
  }

  function wantLayers() {
    for (const c of options.through) {
      for (const id of LAYERS_FOR[c] || []) {
        if (!(ctx.layers || []).some((l) => l.id === id)) continue;
        if (typeof ctx.isLayerOn !== 'function' || ctx.isLayerOn(id)) continue;
        ctx.setLayerOn(id, true);
        turnedOn.push(id);
      }
    }
  }
  function restoreLayers() {
    for (const id of turnedOn) { try { ctx.setLayerOn(id, false); } catch { /* the layer is gone */ } }
    turnedOn = [];
  }

  // ------------------------------------------------------------------------------- the camera

  /** Would main.js select() move the map's centre for this record? Then the cut goes through black. */
  function cuts(record) {
    const id = ctx.stage && ctx.stage.worldId;
    const onLadder = id === 'stellar' || id === 'galaxy' || id === 'local-group';
    const onSystem = !!id && String(id).startsWith('system-');
    const own = deps.systemOf(record);
    if (own) return own !== id;
    const far = ['star', 'exoplanet', 'dso', 'exotic'].includes(record.klass);
    if (far) return !onLadder;
    return (onLadder || onSystem) && !(record.klass === 'world' && record.id === 'sun' && onLadder);
  }

  /**
   * Two places far apart sideways and both met close up: the rig's straight path keeps the camera
   * close the whole way, and the picture is a smear. The flight then pulls back until both are in
   * shot (scene/camera.js `apex`).
   */
  function apexFor(pos, distance) {
    try {
      const from = ctx.cameraRig.saveState();
      const sep = Math.hypot(pos.x - from.target.x, pos.y - from.target.y, pos.z - from.target.z);
      const near = Math.max(from.distance, distance);
      return sep > near * 3 ? { distance: sep * 0.9, at: 0.45 } : null;
    } catch { return null; }
  }

  /**
   * Something standing on a world's night side is a black picture (seen 2026-10-12: Apollo 12 under
   * a waning Moon). It is passed over until the Sun is up there: ten degrees, so the ground has light.
   */
  function inTheDark(record, at) {
    if (record.klass !== 'site' || !ctx.worlds) return false;
    try {
      const f = parseFrame(record.frame);
      const centre = f && f.world ? ctx.worlds.drawnPositionOf(f.world) : null;
      const sun = centre ? ctx.worlds.sunDirOf(f.world) : null;
      if (!centre || !sun || !at) return false;
      const n = { x: at.x - centre.x, y: at.y - centre.y, z: at.z - centre.z };
      const dot = (n.x * sun.x + n.y * sun.y + n.z * sun.z) / (Math.hypot(n.x, n.y, n.z) * Math.hypot(sun.x, sun.y, sun.z) || 1);
      return dot < DARK_BELOW;
    } catch { return false; }
  }

  /** A craft's world, where that world is drawn, where its Sun is and how big it is; null with any missing. */
  function worldUnder(record) {
    if (!ctx.worlds) return null;
    try {
      const f = parseFrame(record.frame);
      if (!f || !f.world || f.world === 'sun') return null;
      const here = ctx.stage && ctx.stage.worldId === f.world;
      const centre = ctx.worlds.drawnPositionOf(f.world) || (here ? { x: 0, y: 0, z: 0 } : null);
      const sun = ctx.worlds.sunDirOf(f.world) || (here && typeof ctx.worlds.sunDirScene === 'function' ? ctx.worlds.sunDirScene() : null);
      const radius = typeof ctx.worlds.drawnRadiusUnits === 'function' ? ctx.worlds.drawnRadiusUnits(f.world) : 0;
      if (!centre || !sun || !(radius > 0) || !(Math.hypot(sun.x, sun.y, sun.z) > 0)) return null;
      return { centre, sun, radius };
    } catch { return null; }
  }

  /**
   * A craft inside its world's shadow is a model nobody can see: the same cylinder the marks dim by
   * (scene/shadow.js inEarthShadow, which is any world's with that world's radius). Passed over
   * until it comes round into the Sun. Something round the Sun itself is never in one.
   */
  function unlit(record, at) {
    if (!MODELLED.includes(record.klass) || !at) return false;
    const w = worldUnder(record);
    if (!w) return false;
    const far = { x: w.centre.x + w.sun.x * 1e9, y: w.centre.y + w.sun.y * 1e9, z: w.centre.z + w.sun.z * 1e9 };
    return inEarthShadow(at, w.centre, far, w.radius);
  }

  /**
   * Is there sunlit ground in the picture with it? Then the stop is a picture even with the craft
   * small in it. The craft has to be close over its world's day side; and, when the camera can be
   * asked, the camera has to be on the day side too with the world's disc near the middle of the
   * view (a craft over daylight seen from the night side is a dot in front of black).
   */
  function overDaylight(record, at) {
    if (record.klass === 'site') return true; // it was passed over if its ground was dark (inTheDark)
    const w = at ? worldUnder(record) : null;
    if (!w) return false;
    const sunLen = Math.hypot(w.sun.x, w.sun.y, w.sun.z);
    const n = { x: at.x - w.centre.x, y: at.y - w.centre.y, z: at.z - w.centre.z };
    const r = Math.hypot(n.x, n.y, n.z);
    if (!(r > 0) || r > w.radius * 2) return false;
    if ((n.x * w.sun.x + n.y * w.sun.y + n.z * w.sun.z) / (r * sunLen) <= DARK_BELOW) return false;
    const cam = ctx.camera && ctx.camera.position;
    if (!cam) return true;
    const c = { x: cam.x - w.centre.x, y: cam.y - w.centre.y, z: cam.z - w.centre.z };
    const d = Math.hypot(c.x, c.y, c.z);
    if (!(d > w.radius)) return true;
    if ((c.x * w.sun.x + c.y * w.sun.y + c.z * w.sun.z) / (d * sunLen) <= 0) return false;
    // The angle at the camera between the craft (the middle of the view) and the world's centre,
    // against the disc's own angular radius and a quarter of a radian of grace.
    const v = { x: at.x - cam.x, y: at.y - cam.y, z: at.z - cam.z };
    const vl = Math.hypot(v.x, v.y, v.z);
    if (!(vl > 0)) return true;
    const cos = (-c.x * v.x - c.y * v.y - c.z * v.z) / (d * vl);
    return Math.acos(Math.max(-1, Math.min(1, cos))) < Math.asin(w.radius / d) + 0.25;
  }

  /** PEEK_MS into a stay: is the thing that was flown to a dot in black (see PEEK_MS)? */
  function aDot() {
    const record = place && place.record;
    if (!record || !(MODELLED.includes(record.klass) || record.klass === 'site')) return false;
    if (!ctx.heroes || typeof ctx.heroes.drawnPx !== 'function') return false;
    let px = 0;
    try {
      px = ctx.heroes.drawnPx(record.id);
      // A model still fading in, or one the layer has put away, is not on the screen at its size yet.
      if (typeof ctx.heroes.drawnOpacity === 'function') px *= Math.min(1, Math.max(0, ctx.heroes.drawnOpacity(record.id)));
    } catch { return false; }
    if (!(px < SMALL_PX)) return false;
    let at = null;
    try { at = ctx.positionOfRecord(record); } catch { at = null; }
    return !overDaylight(record, at);
  }

  function go() {
    rebuild(false);
    let next = null;
    for (let tries = 0; tries < 6 && walk; tries++) {
      const cand = walk.next();
      if (!cand) break;
      // A record with no place right now (a probe before its launch, a layer that went) is passed.
      let at = null;
      try { at = ctx.positionOfRecord(cand.record); } catch { at = null; }
      if ((at && !inTheDark(cand.record, at) && !unlit(cand.record, at)) || (!at && deps.systemOf(cand.record))) { next = cand; break; }
    }
    if (!next) {
      if (phase !== 'waiting') { phase = 'waiting'; waitingSince = now(); }
      return;
    }
    const ms = flightMs(place, next, options.pace);
    place = next;
    visits += 1;
    // A LONG HOP IS PACED BY ITS OWN GEOMETRY (ui/driftplan.js planFlight): the rig asks for the
    // curve once it knows where the camera will stand, and the stay's clock is set by the answer.
    // A short hop gets null back, and flies as it always did: `ms`, the cruise, the apex.
    const path = (hop) => {
      const plan = planFlight({ ...hop, pace: options.pace });
      if (plan && active && place === next) {
        flightFrom = now();
        flightFor = plan.ms;
        until = flightFrom + plan.ms + FLIGHT_GRACE_MS;
      }
      return plan;
    };
    const move = () => {
      if (!active || place !== next) return;
      try { ctx.cameraRig.stopOrbit('replaced'); } catch { /* no turn running */ }
      flightFrom = now();
      until = flightFrom + ms + FLIGHT_GRACE_MS;
      ctx.select(next.record, { fly: true, undo: false, from: 'drift', flyMs: ms, flight: { ease: 'cruise', targetDelay: 0.2, apexFor, path } });
    };
    phase = 'flight';
    flightFrom = now();
    flightFor = ms;
    until = flightFrom + ms + FLIGHT_GRACE_MS;
    if (cuts(next.record) && ctx.veil && typeof ctx.veil.through === 'function') {
      Promise.resolve(ctx.veil.through(move)).catch(() => move());
    } else move();
  }

  function arrive() {
    const d = dwellFor(options.pace, rng);
    phase = 'dwell';
    until = now() + d.ms;
    peekAt = now() + PEEK_MS;
    // The turn. Under reduced motion the rig refuses it, and the stay is a still picture.
    try { ctx.cameraRig.orbit({ deg: d.deg, degPerSec: d.degPerSec }); } catch { /* a still stay */ }
  }

  function tick() {
    if (!active || phase === 'paused' || (doc && doc.hidden)) return;
    const t = now();
    if (phase === 'waiting') {
      rebuild(false);
      if (pool.length) { go(); return; }
      if (t - waitingSince > EMPTY_WAIT_MS) { say(COPY.drift.nothing); stop('empty'); }
      return;
    }
    if (phase === 'flight') {
      const flying = !!(ctx.cameraRig.state && ctx.cameraRig.state.flying);
      const covered = !!(ctx.veil && typeof ctx.veil.covered === 'function' && ctx.veil.covered());
      if ((!flying && !covered && t - flightFrom >= Math.min(flightFor, 900)) || t >= until) arrive();
      return;
    }
    if (phase === 'dwell' && peekAt && t >= peekAt) {
      peekAt = 0;
      if (aDot() && hurried < HURRY_MOST) { hurried += 1; go(); return; }
      hurried = 0;
    }
    if (phase === 'dwell' && t >= until) go();
  }

  // ------------------------------------------------------------------------------- the screen

  function say(line) {
    import('./share.js').then((m) => m.toast(line, 4000)).catch(() => {});
  }

  function setScreen() {
    setBare(!!options.bare);
    if (!ctx.cleanView) return;
    ownScreen = true;
    try { ctx.cleanView.setState(options.tags && !options.bare ? 'hud' : 'clear'); } finally { ownScreen = false; }
  }

  /** Only space, for one frame: called by main.js after the scene is placed and before it is drawn. */
  function bareFrame() {
    if (!bareWas) return;
    const hide = (o) => {
      if (!o || typeof o.visible !== 'boolean') return;
      if (!bareWas.has(o)) bareWas.set(o, o.visible);
      o.visible = false;
    };
    try {
      // The dots and icons. main.js says again, ten times a second, which layers are drawn.
      if (ctx.glyphLayers) for (const gl of ctx.glyphLayers.values()) if (gl && typeof gl.setVisible === 'function') gl.setVisible(false);
      hide(ctx.orbitLine && ctx.orbitLine.line);
      hide(ctx.ephPath && ctx.ephPath.line);
      hide(ctx.groundTrack && ctx.groundTrack.group);
      hide(ctx.orbitRings && ctx.orbitRings.group);
      hide(ctx.figures && ctx.figures.group);
      hide(ctx.pulsars && ctx.pulsars.group);
      const top = ctx.scene && ctx.scene.children;
      if (top) for (const o of top) if (o.name === 'shells') hide(o);
      const system = ctx.systems && ctx.systems.group;
      if (system && system.visible) for (const o of system.children) if (SYSTEM_LINES.test(o.name || '')) hide(o);
    } catch { /* a layer that is not built yet has nothing to hide */ }
  }

  function setBare(on) {
    if (on === !!bareWas) return;
    if (on) {
      bareWas = new Map();
      ctx.bareFrame = bareFrame;
      if (root) root.classList.add(BARE_CLASS);
      try { if (ctx.dsoGlow) ctx.dsoGlow.setMarks(false); } catch { /* no glows here */ }
      bareFrame();
      return;
    }
    const was = bareWas;
    bareWas = null;
    if (ctx.bareFrame === bareFrame) delete ctx.bareFrame;
    if (root) root.classList.remove(BARE_CLASS);
    for (const [o, visible] of was) o.visible = visible;
    // The dots are placed and shown again on the next frame, by the rule that always decided it; the
    // selection's orbit is built again (its line only knows its own record); the deep-sky marks
    // follow the quality, as main.js has them.
    ctx.marksStale = true;
    try { if (ctx.orbitLine) ctx.orbitLine.setRecord(typeof ctx.selected === 'function' ? ctx.selected() : null); } catch { /* no line */ }
    try { if (ctx.dsoGlow) ctx.dsoGlow.setMarks(!(typeof ctx.latched === 'function' ? ctx.latched() : ctx.quality && ctx.quality.stripped)); } catch { /* no glows here */ }
  }

  function wake() {
    try {
      if (!nav.wakeLock || (doc && doc.hidden) || lock) return;
      nav.wakeLock.request('screen').then((l) => {
        lock = l;
        if (l && typeof l.addEventListener === 'function') l.addEventListener('release', () => { lock = null; });
      }, () => { /* refused: a battery saver, or no permission */ });
    } catch { /* not supported */ }
  }
  function sleep() {
    try { if (lock && typeof lock.release === 'function') lock.release(); } catch { /* gone already */ }
    lock = null;
  }

  function showBar() {
    if (!bar || !win) return;
    bar.setIdle(false);
    if (root) root.classList.remove('sr-drift--still');
    win.clearTimeout(barTimer);
    barTimer = win.setTimeout(() => {
      if (!bar || !active) return;
      // Not while the options are open or a key is on the bar: a control never goes from under a hand.
      const held = doc.activeElement && bar.host.contains(doc.activeElement);
      if (bar.isOpen()) return;
      // Only space: a press on the bar leaves the focus on it, which would keep the bar (css/drift.css
      // :focus-within, and the pause below) over a picture that is meant to have nothing on it. The
      // focus is let go; any key or movement brings the bar back.
      if (held && options.bare) { try { doc.activeElement.blur(); } catch { /* nothing to let go */ } }
      else if (held && phase === 'paused') return;
      bar.setIdle(true);
      if (root) root.classList.add('sr-drift--still');
    }, BAR_IDLE_MS);
  }

  function onKey(e) {
    if (!active || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = e.target && e.target.tagName ? String(e.target.tagName).toUpperCase() : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    showBar();
    const onButton = tag === 'BUTTON';
    if (e.key === ' ' && !onButton) { e.preventDefault(); e.stopPropagation(); if (phase === 'paused') resume(); else pause(); }
    else if ((e.key === 'n' || e.key === 'N') && !onButton) { e.preventDefault(); e.stopPropagation(); skip(); }
  }
  const onMove = () => { if (active) showBar(); };
  const onVisible = () => {
    if (!active || !doc || doc.hidden) return;
    wake();
    // Nothing moved while the tab was hidden, so nothing is late: the stay begins again.
    if (phase === 'dwell' || phase === 'flight') until = Math.max(until, now() + 2000);
  };
  /** The clear screen changed under us: H, Shift+H or Escape. Full is leaving; the others are the names. */
  const onClean = (e) => {
    if (!active || ownScreen) return;
    const s = e && e.detail ? e.detail.state : null;
    if (s === 'full') { stop('screen'); return; }
    const tags = s === 'hud';
    // Shift+H asks for the names: that leaves only space too.
    if (tags !== options.tags || (tags && options.bare)) { options = { ...options, tags, bare: tags ? false : options.bare }; setBare(!!options.bare); keep(); paintBar(); writeLink(); if (tags) rebuild(true); }
  };

  function paintBar() { if (bar) bar.paint(options, phase === 'paused'); }
  function writeLink() { try { writeUrl({ [URL_KEY]: writeOptions(options) }); } catch { /* no address here */ } }

  // ------------------------------------------------------------------------------- the mode

  function start(wanted, from) {
    if (wanted) options = { ...options, ...wanted, through: (wanted.through || options.through).slice() };
    if (active) { rebuild(true); setScreen(); paintBar(); writeLink(); return true; }
    // From the ground nothing flies (main.js select); a reel has the screen already.
    if (ctx.skyView && ctx.skyView.active) { say(COPY.drift.notFromGround); return false; }
    if (ctx.autopilot && ctx.autopilot.engaged) return false;
    try { if (ctx.trip && ctx.trip.state && ctx.trip.state.phase !== 'idle') ctx.trip.stop(); } catch { /* no trip */ }
    active = true;
    opener = doc && from === 'row' ? doc.activeElement : null;
    place = null;
    visits = 0;
    lookCache.clear();
    poolCount = -1;
    if (doc) linkCss(doc);
    if (root) root.classList.add(ROOT_CLASS);
    screenBefore = ctx.cleanView ? ctx.cleanView.state() : 'full';
    wantLayers();
    setScreen();
    if (doc && !bar) {
      bar = createBar(doc, {
        pause: () => (phase === 'paused' ? resume() : pause()),
        next: skip,
        leave: () => stop('button'),
        toggle: (c) => {
          const has = options.through.includes(c);
          // One stays on: a drift through nothing is not a choice.
          if (has && options.through.length === 1) return;
          setOptions({ through: has ? options.through.filter((x) => x !== c) : CATEGORIES.filter((x) => x === c || options.through.includes(x)) });
        },
        set: setOptions,
        opened: () => showBar(),
      });
    }
    if (bar && doc && doc.body) { doc.body.appendChild(bar.host); paintBar(); showBar(); }
    if (doc) {
      doc.addEventListener('keydown', onKey, true);
      doc.addEventListener('visibilitychange', onVisible);
    }
    if (win) {
      win.addEventListener('pointermove', onMove, { passive: true });
      win.addEventListener('sr:clean', onClean);
    }
    // A hand on the map takes the controls. Not while the black is over a stage change: the rig
    // reports nothing then, and a press on the bar never reaches the canvas.
    offInput = ctx.cameraRig && typeof ctx.cameraRig.onUserInput === 'function'
      ? ctx.cameraRig.onUserInput(() => { if (active && phase !== 'idle') stop('input'); })
      : null;
    wake();
    writeLink();
    // The nebula photographs say which deep-sky rows have a face; they are a module of their own.
    if (!pictures && options.through.includes('deep')) {
      import('../scene/nebulae.js').then((m) => { pictures = m.PICTURE_FOR; poolCount = -1; }).catch(() => {});
    }
    phase = 'waiting';
    waitingSince = now();
    timer = setTick(tick, TICK_MS);
    if (from === 'row') say(COPY.drift.hint);
    tick();
    return true;
  }

  function stop(reason = 'stopped') {
    if (!active) return;
    active = false;
    phase = 'idle';
    if (timer !== null) clearTick(timer);
    timer = null;
    if (win) {
      win.clearTimeout(barTimer);
      win.removeEventListener('pointermove', onMove);
      win.removeEventListener('sr:clean', onClean);
    }
    if (doc) {
      doc.removeEventListener('keydown', onKey, true);
      doc.removeEventListener('visibilitychange', onVisible);
    }
    if (offInput) offInput();
    offInput = null;
    try { ctx.cameraRig.stopOrbit('cancelled'); } catch { /* no turn running */ }
    if (bar && bar.host.parentNode) bar.host.parentNode.removeChild(bar.host);
    if (bar) bar.setOpen(false);
    if (root) root.classList.remove(ROOT_CLASS, 'sr-drift--still');
    setBare(false);
    restoreLayers();
    sleep();
    try { clearUrl([URL_KEY]); } catch { /* no address here */ }
    // The panels come back as they were, unless the visitor's own key already brought them.
    if (ctx.cleanView && reason !== 'screen') {
      ownScreen = true;
      try { ctx.cleanView.setState(screenBefore === 'full' || reason === 'input' ? 'full' : screenBefore); } finally { ownScreen = false; }
    }
    if (opener && typeof opener.focus === 'function' && doc && doc.contains(opener)) { try { opener.focus({ preventScroll: true }); } catch { /* gone */ } }
    opener = null;
    if (win) win.dispatchEvent(new CustomEvent('sr:drift', { detail: { on: false, reason, visits } }));
  }

  function pause() {
    if (!active || phase === 'paused') return;
    before = phase;
    pausedAt = now();
    phase = 'paused';
    try { ctx.cameraRig.stopOrbit('cancelled'); } catch { /* no turn running */ }
    paintBar();
  }
  function resume() {
    if (!active || phase !== 'paused') return;
    // A flight that was running ran on, and is over by now.
    if (before === 'waiting') { phase = 'waiting'; waitingSince = now(); }
    else if (before === 'flight') arrive();
    else {
      // The stay goes on from where it was, and so does its turn.
      until += now() - pausedAt;
      phase = 'dwell';
      const left = Math.max(0, until - now()) / 1000;
      const turn = (PACES[options.pace] || PACES.steady).turn;
      try { ctx.cameraRig.orbit({ deg: turn * left, degPerSec: turn }); } catch { /* a still stay */ }
    }
    paintBar();
  }
  function skip() {
    if (!active) return;
    if (phase === 'paused') { phase = 'dwell'; paintBar(); }
    go();
  }

  function setOptions(patch) {
    const through = patch && Array.isArray(patch.through) ? CATEGORIES.filter((c) => patch.through.includes(c)) : options.through;
    options = { ...options, ...patch, through: through.length ? through : options.through };
    keep();
    paintBar();
    if (!active) return;
    writeLink();
    if (patch && (patch.tags !== undefined || patch.bare !== undefined)) setScreen();
    // Only space chosen on the bar: the options fold away, or the bar would never go.
    if (patch && patch.bare === true && bar && bar.isOpen()) bar.setOpen(false);
    if (patch && (patch.through !== undefined || patch.realOnly !== undefined || patch.bare !== undefined)) {
      wantLayers();
      if (!pictures && options.through.includes('deep')) {
        import('../scene/nebulae.js').then((m) => { pictures = m.PICTURE_FOR; poolCount = -1; }).catch(() => {});
      }
      rebuild(true);
    }
  }

  /** What the link asks for: `{drift: …}` starts or re-reads the choices, `0` or nothing stops. */
  function apply(link, from) {
    const asked = readOptions(link ? link[URL_KEY] : null, readStored());
    if (!asked.on) { stop('link'); return false; }
    const { on, notes, ...wanted } = asked;
    return start(wanted, from);
  }

  return {
    apply, start, stop, pause, resume, skip, setOptions,
    state: () => ({ active, phase, options: { ...options, through: options.through.slice() }, place: place ? place.id : null, hood: place ? place.hood : null, visits, pool: pool.length, walk: walk ? walk.state() : null, flightMs: flightFor, bare: !!bareWas }),
    get active() { return active; },
  };
}
