// ui/whattoshow.js -- the layers, their counts, the colour key and the two settings, as one popover
// behind the tool rail's first button (spec 0061 req 5, design §5).
//
// Contract: createWhatToShow(ctx, opts?) -> { root, refresh(), destroy() }
//   opts.storage: where the open groups are remembered (default: localStorage, if it can be reached)
// Also exported, pure: countText(layer, records, n), layerSwatch(layer) -> {token, hex},
//   groupLayers(layers, groups), groupTally(rows, isOn), defaultOpen(groups, isOn),
//   readOpen(storage), writeOpen(storage, ids), matchesFilter(layer, query), setGroupOn(ctx, layers, on)
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
//
// GROUPED (spec 0068 task 3, 2026-10-02). Twenty-six rows were two screens of a phone. The rows now
// fold under the four headings of registry/layers.yaml `groups:` -- each a <button aria-expanded>
// with "3 of 10" on, and All / None inside -- and only the group holding the most switched-on
// layers starts open, so the first look is one screen. Which groups a visitor opened is remembered
// (localStorage `sr:wts-open`; a storage that throws just means the default every time). Past
// FILTER_MIN_ROWS rows a small field finds a layer by name across every group, the way a settings
// search does. The settings (Colour by, sound, exposure, density) stay rows at the foot, and the last row,
// "Keys" (issue #321), reopens the controls hint (ui/keyhint.js through ctx.keyhint.show()).

import { COPY, t, fmt } from '../copy/en.js';
import { tierLine } from '../scene/quality.js';
import { createColorKey } from './colorkey.js';
import { COLOR_KEYS } from '../data/colorkeys.js';
import { soundButton } from './sound.js';
import { densityPanel } from './density.js';
import { exposurePanel } from './exposure.js';
import { overlayPanel } from './overlaypanel.js';
import { otherLightPanel } from './otherlight.js';
import { LAYER_GROUPS } from '../data/layers.registry.js';

const REFRESH_MS = 1000;
/** Where the open groups are remembered: a JSON list of group ids. */
export const OPEN_KEY = 'sr:wts-open';
/** The filter field appears once the list is longer than this: under it, the eye finds the row. */
export const FILTER_MIN_ROWS = 12;
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

/**
 * The layers in their groups, in the registry's order: [{ id, layers }], empty groups dropped. A
 * layer with a group the list does not name (check_registry.py refuses one) goes in the last group
 * rather than vanishing. Pure.
 */
export function groupLayers(layers, groups = LAYER_GROUPS) {
  const ids = Array.isArray(groups) && groups.length ? groups : ['all'];
  const out = ids.map((id) => ({ id, layers: [] }));
  for (const layer of layers || []) {
    const g = out.find((x) => x.id === layer.group) || out[out.length - 1];
    g.layers.push(layer);
  }
  return out.filter((g) => g.layers.length);
}

/** { on, n } for one group's layers. Pure. */
export function groupTally(layers, isOn) {
  let on = 0;
  for (const l of layers || []) if (isOn(l.id)) on++;
  return { on, n: (layers || []).length };
}

/** The group that starts open: the one holding the most switched-on layers, the first on a tie. Pure. */
export function defaultOpen(groups, isOn) {
  let best = null;
  let most = -1;
  for (const g of groups || []) {
    const { on } = groupTally(g.layers, isOn);
    if (on > most) { best = g.id; most = on; }
  }
  return best;
}

/** The remembered open groups, or null when nothing (readable) is remembered. Never throws. */
export function readOpen(storage) {
  try {
    const raw = storage && storage.getItem(OPEN_KEY);
    if (raw == null) return null;
    const ids = JSON.parse(raw);
    return Array.isArray(ids) ? ids.filter((x) => typeof x === 'string') : null;
  } catch {
    return null;
  }
}

/** Remember the open groups. False when the storage would not take it; never throws. */
export function writeOpen(storage, ids) {
  try {
    if (!storage) return false;
    storage.setItem(OPEN_KEY, JSON.stringify([...ids]));
    return true;
  } catch {
    return false;
  }
}

/** Does a layer answer the filter? Its name or id, any case, every word somewhere. Pure. */
export function matchesFilter(layer, query) {
  const words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = `${layer.display || ''} ${layer.id || ''}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

/** All or None for one group: switches only the rows that differ, each through applyLayerOn. */
export function setGroupOn(ctx, layers, on) {
  let changed = 0;
  for (const layer of layers || []) {
    const now = typeof ctx.isLayerOn === 'function' ? !!ctx.isLayerOn(layer.id) : false;
    if (now === on) continue;
    applyLayerOn(ctx, layer, on);
    changed++;
  }
  return changed;
}

/** localStorage, or null where touching it throws (Safari private mode, blocked site data). */
function defaultStorage() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

/** A touch screen is told "Gestures", a keyboard "Keys" -- the same test ui/keyhint.js uses. */
function isTouch() {
  try { return !!(typeof matchMedia === 'function' && matchMedia('(hover: none) and (pointer: coarse)').matches); } catch { return false; }
}

export function createWhatToShow(ctx, opts = {}) {
  const root = el('div', 'sr-show');

  // --- the layers ---------------------------------------------------------------------------------
  root.appendChild(el('h2', 'sr-micro', COPY.controls.layersTitle));
  // Said only while "Colour by" has taken the dots over (keyedBy).
  const keyedNote = el('p', 'sr-show__note sr-show__keyed');
  keyedNote.hidden = true;
  root.appendChild(keyedNote);
  const storage = 'storage' in opts ? opts.storage : defaultStorage();
  const C = COPY.controls;
  const isOn = (id) => (typeof ctx.isLayerOn === 'function' ? !!ctx.isLayerOn(id) : false);
  const shown = layerList(ctx).filter((layer) => layer.enabled !== false); // spec 0026 req 8
  const groups = groupLayers(shown);

  // The filter, only when there are enough rows to lose one.
  let filter = null;
  if (shown.length > FILTER_MIN_ROWS) {
    filter = document.createElement('input');
    filter.type = 'search';
    filter.className = 'sr-show__filter';
    filter.placeholder = C.layerFilter;
    filter.setAttribute('aria-label', C.layerFilter);
    filter.setAttribute('autocomplete', 'off');
    filter.setAttribute('spellcheck', 'false');
    root.appendChild(filter);
  }
  const noMatch = el('p', 'sr-show__note sr-show__nomatch', C.layerFilterEmpty);
  noMatch.hidden = true;
  // A layer that failed (docs/ui-guide.md section 3, the error state): one line saying how many
  // layers that are ON came back with nothing, and the one action, the sources sheet, where each
  // source says what happened to it. The row itself says "empty"; this is where to go about it.
  const failed = el('p', 'sr-show__note sr-show__failed');
  const failedText = el('span', 'sr-show__failedtext');
  const failedWhy = el('button', 'sr-show__failedwhy', C.layersFailedWhy);
  failedWhy.type = 'button';
  failedWhy.addEventListener('click', () => {
    if (ctx && ctx.rail && typeof ctx.rail.closeShow === 'function') ctx.rail.closeShow();
    if (ctx.shell && typeof ctx.shell.openSources === 'function') ctx.shell.openSources();
  });
  failed.append(failedText, failedWhy);
  failed.hidden = true;

  // A list per group, all inside one wrapper the keyed note's ring rule (.is-keyed) hangs off.
  const list = el('div', 'sr-show__list');
  root.appendChild(list);
  root.appendChild(noMatch);
  root.appendChild(failed);
  const rows = new Map();
  const heads = new Map();
  const remembered = readOpen(storage);
  const open = new Set(remembered || [defaultOpen(groups, isOn)].filter(Boolean));
  groups.forEach((group, gi) => {
    const title = (C.groups && C.groups[group.id]) || group.id;
    const sec = el('section', 'sr-show__group');
    sec.dataset.group = group.id;
    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'sr-show__head';
    const bodyId = `sr-show-g${gi}`;
    head.setAttribute('aria-controls', bodyId);
    // The rail focuses this on opening, not the filter: a focused field opens a phone's keyboard
    // over the list the visitor came to read.
    if (gi === 0) head.dataset.autofocus = '';
    const chev = el('span', 'sr-show__chev');
    chev.setAttribute('aria-hidden', 'true');
    const name = el('span', 'sr-show__gname sr-micro', title);
    const tally = el('span', 'sr-show__tally');
    head.append(chev, name, tally);
    sec.appendChild(head);
    const body = el('div', 'sr-show__gbody');
    body.id = bodyId;
    const bulk = el('div', 'sr-show__bulk');
    const allBtn = el('button', 'sr-show__bulkbtn', C.groupAll);
    allBtn.type = 'button';
    allBtn.setAttribute('aria-label', t(C.groupAllLabel, { group: title }));
    const noneBtn = el('button', 'sr-show__bulkbtn', C.groupNone);
    noneBtn.type = 'button';
    noneBtn.setAttribute('aria-label', t(C.groupNoneLabel, { group: title }));
    bulk.append(allBtn, noneBtn);
    body.appendChild(bulk);
    const ul = el('ul', 'sr-show__rows');
    body.appendChild(ul);
    sec.appendChild(body);
    list.appendChild(sec);
    allBtn.addEventListener('click', () => { setGroupOn(ctx, group.layers, true); paint(); });
    noneBtn.addEventListener('click', () => { setGroupOn(ctx, group.layers, false); paint(); });
    head.addEventListener('click', () => {
      if (open.has(group.id)) open.delete(group.id); else open.add(group.id);
      writeOpen(storage, open);
      layout();
    });
    heads.set(group.id, { sec, head, body, bulk, tally, group });

    for (const layer of group.layers) {
      const li = el('li', 'sr-show__row');
      const label = el('label', 'sr-show__label');
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.className = 'sr-show__box';
      const { token, hex, mixed } = layerSwatch(layer);
      const swatch = el('span', `sr-swatch sr-swatch--${token}`);
      if (hex) swatch.style.background = hex;
      swatch.setAttribute('aria-hidden', 'true');
      if (mixed) swatch.title = C.swatchMixed;
      const lname = el('span', 'sr-show__name', layer.display || layer.id);
      lname.title = layer.display || layer.id; // one line, so a long name ends in an ellipsis
      const count = el('span', 'sr-show__count', C.layerCountLoading);
      label.append(box, swatch, lname, count);
      li.appendChild(label);
      ul.appendChild(li);
      box.addEventListener('change', () => { applyLayerOn(ctx, layer, box.checked); paint(); });
      rows.set(layer.id, { box, count, label, layer, swatch, hex, mixed, li, group: group.id });
    }
  });
  if (!rows.size) list.appendChild(el('p', 'sr-show__empty', C.layersEmpty));

  /** Open or shut each group, or -- while the filter has words -- every group with a match, open. */
  function layout() {
    const q = filter ? String(filter.value || '').trim() : '';
    let any = false;
    for (const [id, h] of heads) {
      let hits = 0;
      for (const layer of h.group.layers) {
        const hit = matchesFilter(layer, q);
        rows.get(layer.id).li.hidden = !hit;
        if (hit) hits++;
      }
      any = any || hits > 0;
      const expanded = q ? hits > 0 : open.has(id);
      h.sec.hidden = !!q && hits === 0;
      h.head.setAttribute('aria-expanded', String(expanded));
      h.sec.classList.toggle('is-open', expanded);
      h.body.hidden = !expanded;
      h.bulk.hidden = !!q; // All / None mean the whole group, so not while it is filtered
    }
    noMatch.hidden = !q || any;
  }
  if (filter) filter.addEventListener('input', layout);
  layout();

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
  // The shutter (spec 0067): Eye, Camera, Deep, in the same row shape as Density below it.
  if (ctx && ctx.exposure) {
    const exposure = exposurePanel(ctx.exposure);
    exposure.classList.add('sr-show__section', 'sr-show__setting');
    root.appendChild(exposure);
  }
  // Other light (registry/otherlight.yaml): the sky in infrared, microwaves or gamma rays.
  let otherLight = null;
  if (ctx && ctx.otherLight) {
    otherLight = otherLightPanel(ctx);
    otherLight.classList.add('sr-show__section', 'sr-show__setting');
    root.appendChild(otherLight);
  }
  // Earth data (registry/overlays.yaml): one measured map over the globe, and its legend.
  let overlay = null;
  if (ctx && typeof ctx.setOverlay === 'function') {
    overlay = overlayPanel(ctx);
    overlay.classList.add('sr-show__section');
    root.appendChild(overlay);
  }
  if (ctx && ctx.density) {
    const density = densityPanel(ctx.density);
    density.classList.add('sr-show__section', 'sr-show__setting');
    root.appendChild(density);
  }

  // --- Keys: the controls hint again, on request (issue #321) ----------------------------------
  const touch = isTouch();
  const keys = el('button', 'sr-show__section sr-show__keys', touch ? C.keysRowTouch : C.keysRow);
  keys.type = 'button';
  keys.title = touch ? C.keysRowTitleTouch : C.keysRowTitle;
  keys.appendChild(el('span', 'sr-show__keysgo')).setAttribute('aria-hidden', 'true');
  keys.addEventListener('click', () => {
    // The popover closes first: the hint sits bottom-right and the popover would hide nothing of
    // it, but two floating panels at once is the clutter the rail was made to end.
    if (ctx && ctx.rail && typeof ctx.rail.closeShow === 'function') ctx.rail.closeShow();
    if (ctx && ctx.keyhint && typeof ctx.keyhint.show === 'function') ctx.keyhint.show();
  });
  root.appendChild(keys);

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
    let empties = 0;
    const counted = new Map();
    let all = [];
    try { all = typeof ctx.records === 'function' ? ctx.records() : []; } catch { all = []; }
    for (const r of all) if (r && r.layer) counted.set(r.layer, (counted.get(r.layer) || 0) + 1);
    for (const [id, row] of rows) {
      const on = isOn(id);
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
      const why = waits ? COPY.controls.layerWaitsTitle : n === 0 ? COPY.controls.layerCountEmptyTitle : '';
      if (row.count.title !== why) row.count.title = why;
      if (n === 0 && on) empties += 1;
      // A count that is a sentence wraps under the name instead of pushing the row off the edge
      // (measured: the oddities line is 360 px in a 335 px column).
      const split = text.includes(COPY.punctuation.separator.trim());
      row.label.classList.toggle('is-split', split);
    }
    const failText = !empties ? '' : empties === 1 ? C.layersFailedOne : t(C.layersFailed, { n: fmt.int(empties) });
    if (failedText.textContent !== failText) failedText.textContent = failText;
    failed.hidden = !empties;
    for (const h of heads.values()) {
      const { on, n } = groupTally(h.group.layers, isOn);
      const text = t(C.groupCount, { on: fmt.int(on), n: fmt.int(n) });
      if (h.tally.textContent !== text) h.tally.textContent = text;
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
      if (overlay) overlay.destroy();
      if (otherLight) otherLight.destroy();
      root.remove();
    },
  };
}
