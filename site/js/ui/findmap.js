// ui/findmap.js -- what the Find panels do to the map: light one group of objects, and play a cloud's spread
// (forge #152, #153).
//
// Contract: createHighlight(ctx) -> { set({name, test, layers}), clear(), current(), spread(cloud | null), spreading() }
//   set     lights the records `test(record)` says yes to on the satellite and debris layers, and only those:
//           every other dot of those layers is set aside, as the confidence filter sets one aside
//           (scene/glyphs.js setFilter). `layers` are switched on (and loaded, for an on-demand one) first.
//           A pill at the top of the scene says what is lit and has the one button that puts it all back.
//   clear   puts every dot back, and the confidence filter the visitor chose (ui/confidence.js) with it.
//   spread  draws the debris layer's pieces of that cloud where data/clouds.js spreadAt() models them
//           (scene/glyphs.js setPositionSource), or, with null, where they were drawn before.
//
// ONE FILTER AT A TIME. The glyph layers have one filter slot, which "How we know" also uses. While a group is
// lit, the filter here is the visitor's confidence choice AND the group (its predicate is rebuilt from
// ctx.confidence(), the same four classes as ui/confidence.js classOf), so neither undoes the other; the
// confidence panel changed while a group is lit replaces this filter until the next set().

import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.find.js';
import { spreadAt } from '../data/clouds.js';

/** The layers a group can be lit on: things in Earth orbit, from the stations to the debris. */
const ORBIT_KLASSES = new Set(['satellite', 'station', 'debris']);
const CONFIDENCE = ['measured', 'inferred', 'illustrative', 'sample'];
const DEBRIS_LAYER = 'debris-field';

function confidenceTest(classes) {
  if (!Array.isArray(classes) || !classes.length || CONFIDENCE.every((c) => classes.includes(c))) return null;
  const set = new Set(classes);
  return (r) => set.has(CONFIDENCE.includes(r && r.cls) ? r.cls : 'unknown');
}

export function createHighlight(ctx) {
  const st = { name: null, test: null, spread: null };
  const layerOf = (id) => (ctx.layers || []).find((l) => l.id === id) || null;
  const orbitLayers = () => [...(ctx.glyphLayers || new Map()).entries()].filter(([id]) => { const l = layerOf(id); return l && ORBIT_KLASSES.has(l.klass); });

  // The pill: what is lit, and the way back. A region of its own, so it is found by a reader's landmark keys.
  const pill = document.createElement('div');
  pill.className = 'sr-findpill sr-float';
  pill.setAttribute('role', 'region');
  pill.setAttribute('aria-label', COPY.find.title);
  pill.hidden = true;
  const words = document.createElement('span');
  words.className = 'sr-findpill__words';
  words.setAttribute('aria-live', 'polite');
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'sr-findpill__clear';
  clearBtn.textContent = '×';
  clearBtn.setAttribute('aria-label', COPY.find.pillClear);
  clearBtn.title = COPY.find.pillClear;
  clearBtn.addEventListener('click', () => clear());
  pill.append(words, clearBtn);
  document.body.appendChild(pill);

  function count() {
    if (!st.test) return 0;
    const seen = new Set();
    for (const [id] of orbitLayers()) for (const r of (ctx.recordsFor ? ctx.recordsFor(id) : [])) if (st.test(r)) seen.add(r.meta && r.meta.noradId ? r.meta.noradId : r.id);
    return seen.size;
  }

  function apply(counted = true) {
    const conf = confidenceTest(ctx.confidence ? ctx.confidence() : null);
    const test = st.test;
    for (const [, gl] of orbitLayers()) {
      if (!gl.setFilter) continue;
      if (!test) gl.setFilter(conf);
      else gl.setFilter(conf ? (r) => conf(r) && test(r) : test);
    }
    ctx.marksStale = true;
    if (test) {
      // While the group's layers are still loading the count would be a false 0: an ellipsis says "counting".
      const n = counted ? count() : 0;
      words.textContent = t(COPY.find.pill, { name: st.name, n: counted ? fmt.int(n) : COPY.punctuation.ellipsis });
      pill.hidden = false;
      return n;
    }
    pill.hidden = true;
    return 0;
  }

  async function ensureLayer(id) {
    const l = layerOf(id);
    if (!l) return;
    if (typeof ctx.loadLayerNow === 'function') await ctx.loadLayerNow(l);
    if (typeof ctx.isLayerOn === 'function' && !ctx.isLayerOn(id) && typeof ctx.setLayerOn === 'function') {
      ctx.setLayerOn(id, true);
      document.dispatchEvent(new CustomEvent('sr:layer-toggle', { detail: { id, on: true, handled: true, from: 'find' } }));
    }
  }

  /** Light a group. Resolves with how many of its records are drawn, once its layers have landed. */
  async function set({ name, test, layers = [] }) {
    st.name = name;
    st.test = typeof test === 'function' ? test : null;
    if (typeof ctx.rememberView === 'function' && !st.remembered) { ctx.rememberView(); st.remembered = true; }
    if (typeof ctx.frameEarth === 'function' && ctx.stage && ctx.stage.worldId !== 'earth') ctx.frameEarth();
    st.loading = true;
    apply(false);
    try { for (const id of layers) await ensureLayer(id); } finally { st.loading = false; }
    // The filter is per layer object: a layer that has just landed takes it now.
    return st.test ? apply() : 0;
  }

  function clear() {
    spread(null);
    st.name = null;
    st.test = null;
    st.remembered = false;
    apply();
    window.dispatchEvent(new CustomEvent('sr:find-highlight', { detail: { on: false } }));
  }

  /** The cloud's modelled spread on the debris layer, or (null) its pieces back where they were drawn. */
  function spread(cloud) {
    const gl = ctx.glyphLayers && ctx.glyphLayers.get(DEBRIS_LAYER);
    st.spread = cloud || null;
    if (!gl || !gl.setPositionSource) return;
    if (!cloud) { gl.setPositionSource(null); return; }
    const scratch = { x: 0, y: 0, z: 0, frame: 'earth-inertial' };
    gl.setPositionSource((record, tMs) => (spreadAt(record, cloud, tMs, scratch) ? scratch : null));
    ctx.marksStale = true;
  }

  // Layers that land later (the debris layer's 7 MB, the active catalogue) are given the filter as they arrive.
  window.addEventListener('sr:layer', () => { if (st.test && !st.loading) apply(); });

  return { set, clear, current: () => (st.test ? { name: st.name } : null), spread, spreading: () => st.spread, refresh: apply };
}
