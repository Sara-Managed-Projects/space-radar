// ui/showmemory.js -- What to show, remembered: the layers a visitor switched, Colour by and the Earth data layer.
//
// Contract:
//   SHOW_KEY                             the localStorage key, 'sr:show'
//   readShow(storage) -> { layers, colour, overlay }      what is kept; empty when nothing is, or storage throws
//   writeShow(storage, patch) -> the same, after the patch; a choice that is the default again is dropped
//   forgetShow(storage)                  remove it all ("Reset to defaults")
//   hasShow(storage) -> boolean          is anything kept
//   restoreShow(ctx, storage, opts?) -> { layers: n, colour, overlay }   apply what is kept to the running map
//   installShowMemory(ctx, storage?)     restore now, and again after a change of moment (main.js)
//
// WHY (review of 16 Nov 2026). A visitor switched the geostationary ring on and the stations off, coloured the dots by
// height and laid the sea ice over the globe; a reload put every one of them back. The panel already remembered which
// groups were open (`sr:wts-open`); it now remembers what the groups hold. The link does not carry these (it never
// did: a shared view is the object, the clock, the stage and the camera), so the browser's own storage is the place.
//
// WHAT IS KEPT. Only a visitor's own presses in What to show (ui/whattoshow.js writes here): a layer's box, All / None
// of a group, the Colour by select, the Earth data select. A layer a link or a search switched on to show its object
// is not a choice and is not kept; nor is what a trip switches for a stop. Each layer is kept as on or off against
// the registry's own default for the opening view, so a choice that equals the default again is forgotten, and a
// visitor who never touched the panel has no key at all.
//
// WHEN IT IS READ. main.js looks for the key once the first view has landed and fetches this module only if it is
// there: a first visit, and every visit that kept nothing, downloads none of it. A layer that only loads when ticked
// (the whole active catalogue, the debris) is then loaded because the visitor asked for it, as a tick would.
// Every storage call is inside a try: a browser that refuses storage is a browser with the defaults every time.

export const SHOW_KEY = 'sr:show';
const VERSION = 1;
const ID = /^[a-z0-9][a-z0-9-]{0,40}$/;

/** localStorage, or null where touching it throws (Safari private mode, blocked site data). */
export function browserStore() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

const empty = () => ({ layers: {}, colour: null, overlay: null });

/** What is kept. Anything that is not this module's own shape reads as nothing kept. Pure but for the read. */
export function readShow(storage) {
  const out = empty();
  let raw = null;
  try { raw = storage ? storage.getItem(SHOW_KEY) : null; } catch { raw = null; }
  if (!raw) return out;
  let doc = null;
  try { doc = JSON.parse(raw); } catch { return out; }
  if (!doc || typeof doc !== 'object' || doc.v !== VERSION) return out;
  if (doc.layers && typeof doc.layers === 'object' && !Array.isArray(doc.layers)) {
    for (const id of Object.keys(doc.layers)) if (ID.test(id) && typeof doc.layers[id] === 'boolean') out.layers[id] = doc.layers[id];
  }
  if (typeof doc.colour === 'string' && ID.test(doc.colour) && doc.colour !== 'class') out.colour = doc.colour;
  if (typeof doc.overlay === 'string' && ID.test(doc.overlay)) out.overlay = doc.overlay;
  return out;
}

const isEmpty = (st) => !Object.keys(st.layers).length && !st.colour && !st.overlay;

/** Is anything kept. */
export function hasShow(storage) {
  return !isEmpty(readShow(storage));
}

/**
 * Keep a choice. `patch`: { layers: { id: on }, colour: id | null, overlay: id | null }, any part of it.
 * `defaults(id) -> boolean` says what a layer is with nothing kept: a choice equal to it is dropped.
 * 'class' is Colour by's own default and is kept as nothing. Returns what is kept afterwards.
 */
export function writeShow(storage, patch, defaults = null) {
  const st = readShow(storage);
  const p = patch || {};
  if (p.layers && typeof p.layers === 'object') {
    for (const id of Object.keys(p.layers)) {
      if (!ID.test(id)) continue;
      const on = !!p.layers[id];
      if (typeof defaults === 'function' && defaults(id) === on) delete st.layers[id];
      else st.layers[id] = on;
    }
  }
  if ('colour' in p) st.colour = typeof p.colour === 'string' && ID.test(p.colour) && p.colour !== 'class' ? p.colour : null;
  if ('overlay' in p) st.overlay = typeof p.overlay === 'string' && ID.test(p.overlay) ? p.overlay : null;
  try {
    if (!storage) return st;
    if (isEmpty(st)) storage.removeItem(SHOW_KEY);
    else storage.setItem(SHOW_KEY, JSON.stringify({ v: VERSION, layers: st.layers, colour: st.colour, overlay: st.overlay }));
  } catch { /* not remembered: the choice still stands for this visit */ }
  return st;
}

/** Forget every choice. */
export function forgetShow(storage) {
  try { if (storage) storage.removeItem(SHOW_KEY); } catch { /* nothing was kept */ }
}

/** A layer's state with nothing kept: the registry's default for the moment (`moments[moment]`), as main.js setMoment sets it. */
export function defaultOn(layer, moment = 'wonder') {
  return !!(layer && layer.moments && layer.moments[moment]);
}

function tell(id, on) {
  try { document.dispatchEvent(new CustomEvent('sr:layer-toggle', { detail: { id, on, handled: true, from: 'memory' } })); } catch { /* no document: a test */ }
}

/**
 * Apply what is kept. Layers the map no longer has, or that the registry switched off for good, are skipped;
 * a colour key or a data layer the map no longer offers is skipped by `opts.colours` / `opts.overlays` (lists of ids,
 * when given). Returns what was applied.
 */
export function restoreShow(ctx, storage, opts = {}) {
  const st = readShow(storage);
  const done = { layers: 0, colour: null, overlay: null };
  if (!ctx) return done;
  const rows = Array.isArray(ctx.layers) ? ctx.layers : [];
  for (const id of Object.keys(st.layers)) {
    const layer = rows.find((l) => l && l.id === id);
    if (!layer || layer.enabled === false || layer.forcedOff) continue;
    const on = st.layers[id];
    if (typeof ctx.isLayerOn === 'function' && !!ctx.isLayerOn(id) === on) continue;
    if (typeof ctx.setLayerOn !== 'function') continue;
    ctx.setLayerOn(id, on);
    tell(id, on);
    done.layers += 1;
  }
  if (opts.layersOnly) return done;
  if (st.colour && (!opts.colours || opts.colours.includes(st.colour)) && typeof ctx.setColourKey === 'function'
    && (typeof ctx.colourKey !== 'function' || ctx.colourKey() !== st.colour)) {
    ctx.setColourKey(st.colour);
    done.colour = st.colour;
    try { window.dispatchEvent(new CustomEvent('sr:colour-key', { detail: { id: st.colour, from: 'memory' } })); } catch { /* a test */ }
  }
  if (st.overlay && (!opts.overlays || opts.overlays.includes(st.overlay)) && typeof ctx.setOverlay === 'function') {
    ctx.setOverlay(st.overlay);
    done.overlay = st.overlay;
  }
  return done;
}

/**
 * Restore now, and put the kept layers back after a change of moment (main.js setMoment lays the moment's own
 * defaults over every layer). Returns what the first restore applied.
 */
export function installShowMemory(ctx, storage = browserStore()) {
  const first = restoreShow(ctx, storage);
  try { window.addEventListener('sr:moment', () => restoreShow(ctx, storage, { layersOnly: true })); } catch { /* a test */ }
  return first;
}
