// ui/whattoshow.js -- the layers, their counts, the colour key and the two settings, as one popover
// behind the tool rail's first button (spec 0061 req 5, design §5).
//
// Contract: createWhatToShow(ctx) -> { root, refresh(), destroy() }
// Also exported, pure: countText(layer, records, n), layerSwatch(layer) -> {token, hex}
//
// WHY A POPOVER. "What to show" was the second screen of the left panel: fourteen checkboxes under
// the trips and the moment doors, a settings list wrapped around a globe. It is a setting, and a
// setting belongs behind a button, where a map app keeps its layers (Apple Maps, Google Earth, Zoom
// Earth: the stacked-squares button top right). The rows and their counts are the ones the panel
// had, moved here from ui/controls.js without a change of words.
//
// ONE SOURCE OF TRUTH. The panel kept its own map of which layers were on and reconciled it with the
// scene through two events, and it lied twice (2026-09-22: the search switched a layer on and the
// box stayed empty). This paints every box from ctx.isLayerOn(), which is what main.js draws from,
// so the box and the dots cannot disagree. A moment's calm default (main.js setMoment) arrives the
// same way: the next paint shows it.
//
// THE SWATCH IS THE LEGEND. Each row's dot is the colour its marks are drawn in (data/layers.js
// `colour`, which scene/glyphs.js colourOf puts before the class's), so the list of layers is also
// the key to the dots on the globe -- which is 0061 req 10's "a legend for dot colours lives in What
// to show" without a second list. "Colour by" (ui/colorkey.js) sits under it, because it recolours
// those same dots and prints its own legend when it does.
//
// AND IT ONLY CLAIMS WHAT IS TRUE (2026-10-02). Two rows lied: a layer drawn in many colours had one
// -- "Stars" a warm white over 109 389 stars drawn by temperature, "Planets and moons" a pale grey
// over Mars's red disc -- and while "Colour by" was set to anything but "What it is", every swatch
// still showed the layer's colour over dots that were now the key's. A many-coloured layer now has
// a ring (MIXED_DRAW) with the words in its title, and a keyed view rings every swatch and says
// which key the dots are in.

import { COPY, t, fmt } from '../copy/en.js';
import { tierLine } from '../scene/quality.js';
import { createColorKey } from './colorkey.js';
import { COLOR_KEYS } from '../data/colorkeys.js';
import { soundButton } from './sound.js';
import { densityPanel } from './density.js';

const REFRESH_MS = 1000;
/** Layers whose marks are not dots of one colour: the stars by temperature, discs, the galaxy. */
export const MIXED_DRAW = new Set(['stars3d', 'worlds', 'galaxy', 'systems']);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

function layerList(ctx) {
  const l = ctx && ctx.layers;
  if (Array.isArray(l)) return l;
  if (l && Array.isArray(l.LAYERS)) return l.LAYERS;
  return [];
}

function recordsFor(ctx, id) {
  try {
    return (ctx && typeof ctx.recordsFor === 'function' && ctx.recordsFor(id)) || [];
  } catch {
    return [];
  }
}

/**
 * The swatch: a class token for the stylesheet, the layer's own hex when it has one, and `mixed`
 * when its marks are many colours (MIXED_DRAW), so no one colour is claimed for them. Pure.
 */
export function layerSwatch(layer) {
  // layers.js gives `colour` as a hex, not a token name, so `sr-swatch--#7FD1FF` matched no rule
  // and every swatch was the fallback grey until the panel learned this (ui/controls.js, 2026-09).
  const mixed = !!(layer && MIXED_DRAW.has(layer.draw));
  const hex = !mixed && typeof (layer && layer.colour) === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(layer.colour) ? layer.colour : null;
  const token = mixed ? 'mixed' : (hex ? layer.klass : layer && layer.colour) || (layer && layer.klass) || 'satellite';
  return { token, hex, mixed };
}

/** Is the scene coloured by a key other than "What it is"? Then the swatches are not the key. Pure. */
export function keyedBy(ctx) {
  let id = 'class';
  try { id = ctx && typeof ctx.colourKey === 'function' ? ctx.colourKey() || 'class' : 'class'; } catch { id = 'class'; }
  return id === 'class' ? null : id;
}

/**
 * One number, or several when one number would hide something. Pure.
 *
 * `oddities` has members in three states -- carrying their own dot, riding on a spacecraft drawn by
 * another layer, and one object nobody can place -- and a single number would either claim dots that
 * are not there or drop the rows that have none. So the LAYER decides, by declaring
 * `counts(records)` in data/layers.js; this renders the parts it returns and drops the zeroes.
 */
export function countText(layer, records, n) {
  const parts = layer && typeof layer.counts === 'function' ? layer.counts(records || []) : null;
  if (Array.isArray(parts)) {
    const text = parts
      .filter((p) => p && p.n > 0 && COPY.controls.layerCountParts[p.key])
      .map((p) => t(COPY.controls.layerCountParts[p.key], { n: fmt.int(p.n) }))
      .join(COPY.punctuation.separator);
    if (text) return text;
  }
  return t(COPY.controls.layerCount, { n: fmt.int(n) });
}

/** Switch a layer through main.js, and say so once so anything else can follow (sr:layer-toggle). */
export function applyLayerOn(ctx, layer, on) {
  let handled = false;
  try {
    if (ctx && typeof ctx.setLayerOn === 'function') { ctx.setLayerOn(layer.id, on); handled = true; }
  } catch {
    handled = false;
  }
  // NEVER `layer.enabled = on` as a fallback: `enabled: false` is the registry's "switched off for
  // good", and the old panel's fallback wrote it at boot for four layers on every visit until
  // 2026-09-22. A missing handler is a wiring fault to shout about.
  if (!handled) console.warn(`layer ${layer.id}: no handler for the switch`);
  try {
    document.dispatchEvent(new CustomEvent('sr:layer-toggle', { detail: { id: layer.id, on, handled, from: 'whattoshow' } }));
  } catch { /* the direct call already did the work */ }
}

export function createWhatToShow(ctx) {
  const root = el('div', 'sr-show');

  // --- the layers ---------------------------------------------------------------------------------
  root.appendChild(el('h2', 'sr-micro', COPY.controls.layersTitle));
  // Said only while "Colour by" has taken the dots over (keyedBy).
  const keyedNote = el('p', 'sr-show__note sr-show__keyed');
  keyedNote.hidden = true;
  root.appendChild(keyedNote);
  const list = el('ul', 'sr-show__list');
  root.appendChild(list);
  const rows = new Map();
  for (const layer of layerList(ctx)) {
    if (layer.enabled === false) continue; // the registry switched it off (spec 0026 req 8)
    const li = el('li', 'sr-show__row');
    const label = el('label', 'sr-show__label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'sr-show__box';
    const { token, hex, mixed } = layerSwatch(layer);
    const swatch = el('span', `sr-swatch sr-swatch--${token}`);
    if (hex) swatch.style.background = hex;
    swatch.setAttribute('aria-hidden', 'true');
    if (mixed) swatch.title = COPY.controls.swatchMixed;
    const name = el('span', 'sr-show__name', layer.display || layer.id);
    const count = el('span', 'sr-show__count', COPY.controls.layerCountLoading);
    label.append(box, swatch, name, count);
    li.appendChild(label);
    list.appendChild(li);
    box.addEventListener('change', () => { applyLayerOn(ctx, layer, box.checked); paint(); });
    rows.set(layer.id, { box, count, label, layer, swatch, hex, mixed });
  }
  if (!rows.size) list.appendChild(el('li', 'sr-show__empty', COPY.controls.layersEmpty));

  // Data-saver, the frame-rate latch and the device tier say what they decided (spec 0026 req 18).
  const quality = el('p', 'sr-show__note');
  quality.hidden = true;
  const tier = el('p', 'sr-show__note');
  tier.hidden = true;
  root.append(quality, tier);
  const onQuality = (e) => {
    const d = e && e.detail;
    if (!d) return;
    quality.textContent = d.level === 'data-saver' ? COPY.quality.dataSaver : t(COPY.quality.lowered, { ms: d.medianMs || '' });
    quality.hidden = false;
  };
  const onTier = (e) => {
    const d = e && e.detail;
    if (!d) return;
    tier.textContent = tierLine(d, COPY.quality);
    tier.hidden = false;
  };
  window.addEventListener('sr:quality', onQuality);
  window.addEventListener('sr:tier', onTier);

  // --- colour by (spec 0026 req 11) -------------------------------------------------------------
  const key = createColorKey(ctx);
  key.root.classList.add('sr-show__section');
  root.appendChild(key.root);

  // --- the two settings: sound (spec 0035) and density (spec 0045) --------------------------------
  const sound = el('section', 'sr-show__section sr-show__setting');
  sound.appendChild(el('h2', 'sr-micro', COPY.audio.panelTitle));
  sound.appendChild(soundButton(ctx, 'sr-show__toggle', 'toggle'));
  root.appendChild(sound);
  if (ctx && ctx.density) {
    const density = densityPanel(ctx.density);
    density.classList.add('sr-show__section', 'sr-show__setting');
    root.appendChild(density);
  }

  let keyedWas = undefined;
  /** Ring every swatch while another key colours the dots, and say which; put them back after. */
  function paintKey() {
    const keyed = keyedBy(ctx);
    if (keyed === keyedWas) return;
    keyedWas = keyed;
    list.classList.toggle('is-keyed', !!keyed);
    const k = keyed ? COLOR_KEYS.find((x) => x.id === keyed) : null;
    keyedNote.textContent = keyed ? t(COPY.controls.keyedNote, { key: (k && k.label ? k.label : keyed).toLowerCase() }) : '';
    keyedNote.hidden = !keyed;
    for (const row of rows.values()) {
      row.swatch.style.background = keyed || !row.hex ? '' : row.hex;
    }
  }

  function paint() {
    paintKey();
    const counted = new Map();
    let all = [];
    try { all = typeof ctx.records === 'function' ? ctx.records() : []; } catch { all = []; }
    for (const r of all) if (r && r.layer) counted.set(r.layer, (counted.get(r.layer) || 0) + 1);
    for (const [id, row] of rows) {
      const on = typeof ctx.isLayerOn === 'function' ? !!ctx.isLayerOn(id) : false;
      if (row.box.checked !== on) row.box.checked = on;
      // A layer whose marks are not its records (the stars: 109 389 drawn, ~3 400 named) states its
      // own number; everything else is counted from the records it loaded.
      const own = typeof row.layer.count === 'function' ? row.layer.count() : undefined;
      const n = Number.isFinite(own) ? own : counted.get(id);
      // Three silences, three strings: loads when switched on, still coming, came back empty.
      const waits = row.layer.deferred === true && !on && n === undefined;
      const text = waits ? COPY.controls.layerWaits
        : n === undefined ? COPY.controls.layerCountLoading
          : n === 0 ? COPY.controls.layerCountEmpty : countText(row.layer, recordsFor(ctx, id), n);
      if (row.count.textContent !== text) row.count.textContent = text;
      row.count.classList.toggle('is-empty', !n);
      // A count that is a sentence wraps under the name instead of pushing the row off the edge
      // (measured: the oddities line is 360 px in a 335 px column).
      const split = text.includes(COPY.punctuation.separator.trim());
      row.label.classList.toggle('is-split', split);
    }
  }

  // Painted while it is open, once a second; nothing runs while it is shut.
  let timer = 0;
  const onAny = () => { if (root.isConnected && !root.closest('[hidden]')) paint(); };
  window.addEventListener('sr:layer', onAny);
  window.addEventListener('sr:moment', onAny);
  window.addEventListener('sr:colour-key', onAny);
  document.addEventListener('sr:layer-toggle', onAny);
  paint();

  return {
    root,
    refresh() {
      paint();
      key.refresh();
      if (!timer) timer = setInterval(() => { if (root.closest('[hidden]')) { clearInterval(timer); timer = 0; } else paint(); }, REFRESH_MS);
    },
    destroy() {
      clearInterval(timer);
      window.removeEventListener('sr:quality', onQuality);
      window.removeEventListener('sr:tier', onTier);
      window.removeEventListener('sr:layer', onAny);
      window.removeEventListener('sr:moment', onAny);
      window.removeEventListener('sr:colour-key', onAny);
      document.removeEventListener('sr:layer-toggle', onAny);
      key.destroy();
      root.remove();
    },
  };
}
