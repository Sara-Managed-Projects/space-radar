// ui/hud.js -- the tracked object's HUD (spec 0047): ember corner brackets on the selection, a
// short tick along its motion, a tag with the card's own numbers and honesty line, and a chevron
// at the edge of the screen when the selection is outside the view.
//
// Contract: createHud(ctx, host?) -> { frame(tMs), select(record), clear(), destroy(),
//                                      namesSelection(), state(), stats() }
// Also exported, pure, for tests/test_hud.mjs: reticleBox, tagPlacement, showTick, chevronAt,
// chevronAnchor, firstDigitChanged, leadingDigit, projectedDiameterPx, distanceWords.
//
// WHY. Ivan, 2026-09-28, after orbitalradar.com: "track this object". Theirs is a yellow dot in
// gold corner brackets with the camera locked on. Ours selected, flew, followed and turned the dot
// ember, and said everything else on a card at the edge of the screen; the selection itself carried
// nothing, and when the camera was turned away nothing on screen pointed back at it.
//
// WORDS. None of its own that state a fact. Every number and the honesty line come from
// ui/cards.js tagLines(), which reads the card's own "right now" rows, so the tag and the card
// cannot disagree (spec 0047 req 4); copy/en.js `hud` holds only the joins ("from you", "behind").
//
// COST (req 10). Per frame, for ONE record: one position (main.js positionOfRecord, the one
// follow() uses), two matrix multiplies to project it, one more for the tick's far end, and a few
// `transform` writes. No canvas, no WebGL object, so no draw call (measured in the PR). Text is
// written at most four times a second; sizes are read back on the frame AFTER a write, before this
// frame's writes, so a read never forces a layout between two writes. The labels (ui/labels.js)
// run at 10 Hz on the glyph tick, which is fine for names and visibly lags a moving camera for a
// box drawn round the thing: the reticle is placed every animation frame.
//
// ACCESSIBILITY. The visible tag is aria-hidden: it changes four times a second. A visually hidden
// twin with role="status" is written only when a readout's first significant digit or order of
// magnitude changes (firstDigitChanged), or the selection does. The chevron is a real <button>.

import * as THREE from '../../vendor/three.module.min.js';
import { COPY, t, fmt, UNITS } from '../copy/en.js';
import { tagLines } from './cardgate.js';
import { behindWorld } from './labels.js';
import { propagate } from '../propagate/index.js';
import { stage } from '../scene/stage.js';
import { WORLDS } from '../scene/worlds.js';
import { GLYPH_SIZE_PX } from '../scene/glyphs.js';

// Spec 0047 req 1: box side = max(minimum, drawn diameter + 12 px). The minimum was 28 px; it is
// the guide's 40 (docs/ui-guide.md section 3.12, row D draws 44) since internal issue #318 found
// the two documents disagreeing: four 10 px ticks around 28 px left 8 px of gap a side, a box that
// read as a blob around a dot, and 40 is nearer a finger's target on a phone.
export const RETICLE_MIN_PX = 40;
export const RETICLE_PAD_PX = 12;
// Req 3: the leader runs 24 px out and 24 px up (or down) from the box's corner, at 45 degrees.
export const LEADER_PX = 24;
/** The tag and the chevron's chip keep this far from the edge of the view. */
export const EDGE_PX = 8;
// Req 6: a 20 px tick, hidden under 2 px of projected motion per clock second (a GEO satellite seen
// from the Earth's side, a planet): below that the direction is noise, and it would jitter.
export const TICK_PX = 20;
export const TICK_FLOOR_PX_S = 2;
// Req 7: the chevron sits 16 px inside the nearest edge.
export const CHEVRON_INSET_PX = 16;
// Req 5: readouts at most four times a second.
export const READOUT_MS = 250;
// The selected dot is drawn 1.35x its class size (scene/glyphs.js setSelected).
const SELECTED_DOT = 1.35;
// A box nearly as big as the view (a selected world filling the screen) frames nothing; the
// brackets and the tick go, and the tag stays, slid inside the edges.
const BOX_MAX_SHARE = 0.9;
const LY_KM = UNITS.LIGHT_KM_PER_S * 86400 * 365.25;

// --- pure -----------------------------------------------------------------------------------------

const clamp = (v, lo, hi) => (hi < lo ? lo : Math.min(hi, Math.max(lo, v)));

/** The reticle's side in px from the drawn diameter of the thing (req 1). */
export function reticleBox(dPx, min = RETICLE_MIN_PX, pad = RETICLE_PAD_PX) {
  const d = Number.isFinite(dPx) && dPx > 0 ? dPx : 0;
  return Math.max(min, d + pad);
}

/**
 * The reticle's side on screen, and whether it is drawn: `{ side, framing }`. Pure.
 *
 * A box nearly as big as the view frames nothing, and for a WORLD filling the screen the brackets
 * go (BOX_MAX_SHARE). For anything else they stay, held at that share of the view: spec 0061 req 9
 * asks for the reticle at every distance, and a model zoomed in on past the edges of the screen is
 * still the selection -- the brackets in the corners say so, where nothing at all said it before.
 */
export function reticleFit(side, vw, vh, isWorld = false) {
  const max = BOX_MAX_SHARE * Math.min(vw, vh);
  if (!(side > max)) return { side, framing: true };
  if (isWorld) return { side, framing: false };
  return { side: max, framing: true };
}

/**
 * Where the tag goes (req 3): up and to the right of the box by preference, flipped left when it
 * would leave the right edge and down when it would leave the top. `area` is the part of the view
 * no panel covers (default: all of it): measured 2026-09-29 at 1440 x 900, the ISS's tag went up and
 * right from a 350 px box straight under the card's rail. When neither side has room (a big box
 * between two rails), the tag goes above or below the box, centred on it (`side: 'centre'`), and in
 * the last resort it is slid inside the area. `px` is the box centre, `tag` the tag's size.
 *
 * @returns {{side: 'right'|'left'|'centre', vert: 'up'|'down', x: number, y: number}} x, y: top left
 */
export function tagPlacement(px, box, tag, vw, vh, leader = LEADER_PX, margin = EDGE_PX, area = null) {
  const a = area || { left: 0, top: 0, right: vw, bottom: vh };
  const L = a.left + margin;
  const R = a.right - margin;
  const T = a.top + margin;
  const B = a.bottom - margin;
  const half = box / 2;
  const w = tag && tag.w > 0 ? tag.w : 0;
  const h = tag && tag.h > 0 ? tag.h : 0;
  const fitsRight = px.x + half + leader + w <= R;
  const fitsLeft = px.x - half - leader - w >= L;
  let side;
  let vert;
  let x;
  let y;
  if (fitsRight || fitsLeft) {
    side = fitsRight ? 'right' : 'left';
    const fitsUp = px.y - half - leader - h >= T;
    const fitsDown = px.y + half + leader + h <= B;
    vert = fitsUp || !fitsDown ? 'up' : 'down';
    x = side === 'right' ? px.x + half + leader : px.x - half - leader - w;
    y = vert === 'up' ? px.y - half - leader - h : px.y + half + leader;
  } else {
    side = 'centre';
    const fitsUp = px.y - half - leader - h >= T;
    const fitsDown = px.y + half + leader + h <= B;
    vert = fitsUp || !fitsDown ? 'up' : 'down';
    x = px.x - w / 2;
    y = vert === 'up' ? px.y - half - leader - h : px.y + half + leader;
  }
  return { side, vert, x: clamp(x, L, R - w), y: clamp(y, T, B - h) };
}

/**
 * The part of the view the panels leave open, from their boxes: a panel wholly in the left half is
 * a left rail, wholly in the right half a right rail, and otherwise a sheet at the top or bottom.
 *
 * A RAIL STANDS, OR HUGS ITS EDGE. Since spec 0061 the time pill is centred on the scene area, so
 * with the sidebar open it sits wholly in the right half: 726 to 1094 px at 1440. Read as a right
 * rail it closed the area to 346 px, under the third of the view the last line asks for, and the
 * whole view came back as "open": at the Moon's arrival the tag went up and right, under the tool
 * rail (internal issue #319, measured 2026-10-03). So a panel in one half is that side's rail only
 * if it is taller than wide or within RAIL_EDGE of that edge; a wide bar away from the edge is a
 * bar, at the top or the bottom.
 */
const RAIL_EDGE = 0.05;
export function openArea(rects, vw, vh) {
  const a = { left: 0, top: 0, right: vw, bottom: vh };
  for (const r of rects || []) {
    if (!r || !(r.right > r.left) || !(r.bottom > r.top)) continue;
    const stands = r.bottom - r.top >= r.right - r.left;
    if (r.right <= vw / 2 && (stands || r.left <= vw * RAIL_EDGE)) a.left = Math.max(a.left, r.right);
    else if (r.left >= vw / 2 && (stands || vw - r.right <= vw * RAIL_EDGE)) a.right = Math.min(a.right, r.left);
    else if (r.top >= vh / 2) a.bottom = Math.min(a.bottom, r.top);
    else if (r.bottom <= vh / 2) a.top = Math.max(a.top, r.bottom);
  }
  // Panels that leave less than a third of the view are not a frame to fit into: use the view.
  if (a.right - a.left < vw / 3 || a.bottom - a.top < vh / 3) return { left: 0, top: 0, right: vw, bottom: vh };
  return a;
}

/** Is the tick worth drawing? `pxPerS` is the projected motion over one clock second (req 6). */
export function showTick(pxPerS, floor = TICK_FLOOR_PX_S) {
  return Number.isFinite(pxPerS) && pxPerS >= floor;
}

/**
 * Where the off-screen chevron goes (req 7), from the object's projection in NDC as
 * Vector3.project() gives it. Behind the camera the perspective divide mirrors x and y (w < 0), so
 * they are mirrored back first: the chevron then points the way to turn. The direction is taken in
 * PIXELS, not in NDC, so on a wide screen a thing up and to the right is pointed at up and to the
 * right, not squashed towards the side edge by the aspect ratio. Straight behind, it points down.
 *
 * @param {{x:number,y:number,z:number}} ndc
 * @param {boolean} [behind]  defaults to ndc.z > 1, which is what project() gives behind the eye
 * @param {{left, top, right, bottom}} [area]  the view less the panels (openArea); the whole view by default
 * @returns {{x, y, angle, edge: 'left'|'right'|'top'|'bottom'}}  angle in radians, screen axes (y down)
 */
export function chevronAt(ndc, vw, vh, inset = CHEVRON_INSET_PX, behind = ndc.z > 1, area = null) {
  let x = Number.isFinite(ndc.x) ? ndc.x : 0;
  let y = Number.isFinite(ndc.y) ? ndc.y : 0;
  if (behind) { x = -x; y = -y; }
  let dx = (x * vw) / 2;
  let dy = (-y * vh) / 2;
  if (!(Math.hypot(dx, dy) > 1e-9)) { dx = 0; dy = 1; }
  const cx = vw / 2;
  const cy = vh / 2;
  // The edge is the open area's (openArea): a chevron under the card's rail points at nothing.
  let a = area || { left: 0, top: 0, right: vw, bottom: vh };
  if (!(cx > a.left + inset && cx < a.right - inset && cy > a.top + inset && cy < a.bottom - inset)) a = { left: 0, top: 0, right: vw, bottom: vh };
  const kx = Math.abs(dx) > 1e-12 ? ((dx > 0 ? a.right - inset : a.left + inset) - cx) / dx : Infinity;
  const ky = Math.abs(dy) > 1e-12 ? ((dy > 0 ? a.bottom - inset : a.top + inset) - cy) / dy : Infinity;
  const k = Math.max(0, Math.min(kx, ky));
  const edge = kx <= ky ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'bottom' : 'top');
  return { x: cx + dx * k, y: cy + dy * k, angle: Math.atan2(dy, dx), edge };
}

/**
 * The chevron's chip, anchored by the side that faces the edge it points at, and kept inside the
 * view: a chip centred on a point 16 px from the right edge would hang half off it.
 */
export function chevronAnchor(at, chip, vw, vh, margin = EDGE_PX, area = null) {
  const a = area || { left: 0, top: 0, right: vw, bottom: vh };
  const w = chip && chip.w > 0 ? chip.w : 0;
  const h = chip && chip.h > 0 ? chip.h : 0;
  const ax = 0.5 + 0.5 * Math.cos(at.angle);
  const ay = 0.5 + 0.5 * Math.sin(at.angle);
  return { x: clamp(at.x - ax * w, a.left + margin, a.right - margin - w), y: clamp(at.y - ay * h, a.top + margin, a.bottom - margin - h) };
}

/** "27 580" -> "4|2": the order of magnitude and the first significant digit. */
export function leadingDigit(text) {
  const n = Math.abs(Number(String(text === undefined || text === null ? '' : text).replace(/[^\d.]/g, '')));
  if (!Number.isFinite(n) || n === 0) return '0|0';
  const e = Math.floor(Math.log10(n) + 1e-12);
  return `${e}|${Math.floor(n / 10 ** e + 1e-9)}`;
}

/**
 * Should the live region speak? Only when the first significant digit or the order of magnitude
 * changes (req 5): 408 -> 409 km is noise to a listener, 1 240 -> 980 km is news. `prev` null: the
 * first reading, which is spoken.
 */
export function firstDigitChanged(prev, next) {
  if (prev === undefined || prev === null) return true;
  return leadingDigit(prev) !== leadingDigit(next);
}

/**
 * A sphere of `radius` scene units at `dist` from the eye, drawn across how many px of a view `h`
 * px tall, for a projection whose [5] element is `f` (1 / tan(fov / 2)).
 */
export function projectedDiameterPx(radius, dist, f, h) {
  if (!(radius > 0) || !(dist > 0) || !(f > 0) || !(h > 0)) return 0;
  return (radius * f * h) / dist;
}

/** The chevron's distance, in the design language's units: km, then au, then light-years. */
export function distanceWords(km) {
  const V = COPY.card.values;
  if (!Number.isFinite(km) || km < 0) return '';
  if (km < 1e7) return t(V.km, { n: fmt.int(km) });
  if (km < LY_KM / 2) return t(V.au, { n: fmt.smart(km / UNITS.AU_KM) });
  return t(V.lightYears, { n: fmt.smart(km / LY_KM) });
}

// --- the HUD -----------------------------------------------------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg';
// Ours: an open chevron pointing right, rotated to point at the object. 24-unit box, stroked.
const CHEVRON_PATH = 'M9 5l7 7-7 7';

function div(className, parent) {
  const node = document.createElement('div');
  node.className = className;
  if (parent) parent.appendChild(node);
  return node;
}

export function createHud(ctx, host) {
  if (typeof document === 'undefined') {
    return { frame() {}, select() {}, clear() {}, destroy() {}, namesSelection: () => false, state: () => null, stats: () => null };
  }
  const parent = host || document.body;
  // `sr-hud-keep` on every piece: spec 0046's middle state keeps the HUD and hides the panels. Until
  // that ships the class is inert, and the clear screen (ui/cleanview.js) hides the HUD with
  // everything else on <body>, which is what H means today.
  const root = div('sr-hud sr-hud-keep');
  root.id = 'sr-hud';
  root.hidden = true;

  const reticle = div('sr-reticle sr-hud-keep is-off', root);
  const box = div('sr-reticle__box', reticle);
  const tick = div('sr-tick sr-hud-keep is-off', root);

  const tag = div('sr-tag sr-hud-keep is-off', root);
  tag.setAttribute('aria-hidden', 'true');
  div('sr-tag__leader', tag);
  const nameRow = div('sr-tag__name', tag);
  const glyph = document.createElement('span');
  glyph.className = 'sr-glyph';
  glyph.setAttribute('aria-hidden', 'true');
  nameRow.appendChild(glyph);
  const title = document.createElement('span');
  title.className = 'sr-tag__title';
  nameRow.appendChild(title);
  const readRow = div('sr-tag__readouts', tag);
  const slots = [];
  for (let i = 0; i < 3; i++) {
    const wrap = document.createElement('span');
    wrap.className = 'sr-tag__readout';
    wrap.hidden = true;
    const num = document.createElement('span');
    num.className = 'sr-tag__num sr-num';
    const unit = document.createElement('span');
    unit.className = 'sr-tag__unit';
    const suffix = document.createElement('span');
    suffix.className = 'sr-tag__suffix';
    wrap.appendChild(num);
    wrap.appendChild(unit);
    wrap.appendChild(suffix);
    readRow.appendChild(wrap);
    slots.push({ wrap, num, unit, suffix });
  }
  const behindNote = document.createElement('span');
  behindNote.className = 'sr-tag__behind';
  behindNote.hidden = true;
  readRow.appendChild(behindNote);
  const honesty = div('sr-tag__honesty', tag);

  const chevron = document.createElement('button');
  chevron.type = 'button';
  chevron.className = 'sr-chevron sr-hud-keep is-off';
  const arrow = document.createElementNS(SVG_NS, 'svg');
  arrow.setAttribute('viewBox', '0 0 24 24');
  arrow.setAttribute('width', '14');
  arrow.setAttribute('height', '14');
  arrow.setAttribute('aria-hidden', 'true');
  arrow.setAttribute('focusable', 'false');
  arrow.setAttribute('class', 'sr-chevron__arrow');
  const arrowPath = document.createElementNS(SVG_NS, 'path');
  arrowPath.setAttribute('d', CHEVRON_PATH);
  arrowPath.setAttribute('fill', 'none');
  arrowPath.setAttribute('stroke', 'currentColor');
  arrowPath.setAttribute('stroke-width', '2.4');
  arrowPath.setAttribute('stroke-linecap', 'round');
  arrowPath.setAttribute('stroke-linejoin', 'round');
  arrow.appendChild(arrowPath);
  chevron.appendChild(arrow);
  const chevDist = document.createElement('span');
  chevDist.className = 'sr-chevron__dist sr-num';
  chevron.appendChild(chevDist);
  const chevName = document.createElement('span');
  chevName.className = 'sr-chevron__name';
  chevron.appendChild(chevName);
  chevron.addEventListener('click', () => { if (sel && ctx.flyToRecord) ctx.flyToRecord(sel); });
  root.appendChild(chevron);

  const live = div('sr-hidden-text', root);
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  parent.appendChild(root);

  // --- state -----------------------------------------------------------------------------------------
  let sel = null;
  let acquirePending = false;
  let lastSlow = -Infinity;
  let lines = null;
  let spoken = null;              // {name, nums[]} last said by the live region
  let spheres = [];
  const vel = new THREE.Vector3(); // scene units per clock second, refreshed at 4 Hz
  let velOk = false;
  const tagSize = { w: 0, h: 0 };
  const chipSize = { w: 0, h: 0 };
  let measureTag = false;
  let measureChip = false;
  let vw = 0;
  let vh = 0;
  let mode = 'off';               // 'off' | 'on' (reticle and tag) | 'chevron'
  let area = null;                // the view less the panels, refreshed at 4 Hz
  let last = {};                  // what the last frame drew, for state() and the probes
  const shown = new Map();        // node -> is it shown, so a class is written only on a change
  const cache = new Map();        // node -> last transform string / class values
  const stats = { frames: 0, ms: 0, slow: 0, slowMs: 0 };

  const _p = new THREE.Vector3();
  const _view = new THREE.Vector3();
  const _ndc = new THREE.Vector3();
  const _q = new THREE.Vector3();
  const _a = new THREE.Vector3();
  const _b = new THREE.Vector3();
  const _c = new THREE.Vector3();

  function readViewport() {
    const el = ctx.renderer && ctx.renderer.domElement;
    vw = (el && el.clientWidth) || window.innerWidth;
    vh = (el && el.clientHeight) || window.innerHeight;
  }
  readViewport();
  window.addEventListener('resize', readViewport);

  function show(node, on) {
    if (shown.get(node) === on) return;
    shown.set(node, on);
    node.classList.toggle('is-off', !on);
  }
  function setTransform(node, value) {
    if (cache.get(node) === value) return;
    cache.set(node, value);
    node.style.transform = value;
  }
  function setClass(node, cls, on) {
    if (node.classList.contains(cls) !== on) node.classList.toggle(cls, on);
  }
  function setData(node, key, value) {
    if (node.dataset[key] !== value) node.dataset[key] = value;
  }

  function hideAll() {
    show(reticle, false);
    show(tick, false);
    show(tag, false);
    show(chevron, false);
    mode = 'off';
  }

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /** The ground under the camera is never tracked: the reticle would be the whole screen. */
  function isGround(record) {
    return record.klass === 'world' && record.id === stage.worldId;
  }

  /**
   * A trip draws its own frame (ui/tripframe.js). The HUD stays out of it unless the stop's subject
   * is the selection and the camera has stopped (req 9): the brackets over a flight are clutter.
   */
  function hiddenForTrip() {
    const trip = ctx.trip;
    const st = trip && trip.state;
    if (!st || st.phase === 'idle' || st.phase === undefined) return false;
    if (st.phase !== 'dwell' && st.phase !== 'paused') return true;
    const id = typeof trip.currentRecordId === 'function' ? trip.currentRecordId() : null;
    return !sel || id !== sel.id;
  }

  /** A record's scene position at clock time tMs, for the velocity: not for worlds or systems. */
  function sceneAt(record, tMs, out) {
    let p = null;
    try { p = propagate(record, tMs); } catch { p = null; }
    if (!p || !Number.isFinite(p.x)) return null;
    return stage.toSceneInto(p, p.frame, out, tMs);
  }

  /** The drawn worlds, as spheres the selection can be behind (ui/labels.js does the same). */
  function occluders() {
    const out = [];
    const worlds = ctx.worlds;
    if (!worlds || !worlds.drawnPositionOf || !worlds.drawnRadiusUnits) return out;
    for (const w of WORLDS) {
      const c = worlds.drawnPositionOf(w.id, _c);
      const r = worlds.drawnRadiusUnits(w.id);
      if (c && r > 0) out.push({ id: w.id, x: c.x, y: c.y, z: c.z, r });
    }
    return out;
  }

  /** Which world, if any, is between the camera and `pos`: the same ray-sphere test labels use. */
  function occluderOf(eye, pos) {
    const skip = sel && sel.klass === 'world' ? sel.id : null;
    for (const s of spheres) {
      if (s.id === skip) continue;
      if (behindWorld(eye, pos, [s])) return s.id;
    }
    return null;
  }

  /** How wide the thing the visitor sees is drawn, in px: its model, its disc, or its dot. */
  function drawnDiameterPx(record, dist) {
    const f = ctx.camera.projectionMatrix.elements[5];
    if (record.klass === 'world' && ctx.worlds && ctx.worlds.drawnRadiusUnits) {
      return projectedDiameterPx(ctx.worlds.drawnRadiusUnits(record.id), dist, f, vh);
    }
    const heroes = ctx.heroes;
    if (heroes && heroes.drawnReach && heroes.drawnOpacity && heroes.drawnOpacity(record.id) > 0.5) {
      const reach = heroes.drawnReach(record.id);
      if (reach > 0) return projectedDiameterPx(reach, dist, f, vh);
    }
    const px = record.sizePx || GLYPH_SIZE_PX[record.klass] || GLYPH_SIZE_PX.satellite;
    return px * SELECTED_DOT;
  }

  // --- the 4 Hz half: words, velocity, occluders -----------------------------------------------------

  // What the tag may not sit under. Since spec 0061: the sidebar (which holds the card; on a phone
  // it is the sheet), the rail, the pill, the What-to-show popover while it is open, and the
  // phone's top bar (task 3), and an embed's one link (ui/embed.js).
  const PANELS = '#sr-side, #sr-rail, #sr-time, #sr-card, #sr-show, #sr-top, #sr-embed';
  function panelRects() {
    const out = [];
    if (document.documentElement.classList.contains('sr-clean')) return out;
    for (const node of document.querySelectorAll(PANELS)) {
      if (node.hidden) continue;
      const r = node.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) out.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
    }
    return out;
  }

  function slow(tMs) {
    const t0 = performance.now();
    // Read before anything below writes: the rects cost one layout only if something else dirtied it.
    area = openArea(panelRects(), vw, vh);
    spheres = occluders();
    velOk = false;
    if (sel.klass !== 'world' && !(ctx.systems && ctx.systems.active && ctx.systems.drawnPositionOf(sel.id))) {
      const a = sceneAt(sel, tMs - 500, _a);
      const b = sceneAt(sel, tMs + 500, _b);
      if (a && b) { vel.copy(b).sub(a); velOk = vel.lengthSq() > 0; }
    }
    try { lines = tagLines(sel, ctx); } catch { lines = null; }
    if (lines) writeTag(lines);
    stats.slow += 1;
    stats.slowMs += performance.now() - t0;
  }

  function writeTag(L) {
    if (title.textContent !== L.name) { title.textContent = L.name; measureTag = true; }
    const gcls = `sr-glyph sr-glyph--${L.klass}`;
    if (glyph.className !== gcls) glyph.className = gcls;
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const r = L.readouts[i];
      if (!r) { if (!s.wrap.hidden) { s.wrap.hidden = true; measureTag = true; } continue; }
      if (s.wrap.hidden) { s.wrap.hidden = false; measureTag = true; }
      if (s.num.textContent !== r.num) {
        // Same digit count, same width: the digits are tabular, so only a new count re-measures.
        if (s.num.textContent.length !== r.num.length) measureTag = true;
        s.num.textContent = r.num;
      }
      if (s.unit.textContent !== r.unit) { s.unit.textContent = r.unit; measureTag = true; }
      if (s.suffix.textContent !== r.suffix) { s.suffix.textContent = r.suffix; measureTag = true; }
    }
    if (honesty.textContent !== L.honesty) { honesty.textContent = L.honesty; measureTag = true; }
    speak(L);
  }

  function speak(L) {
    const nums = L.readouts.map((r) => r.num);
    const changed = !spoken || spoken.name !== L.name || nums.length !== spoken.nums.length
      || nums.some((n, i) => firstDigitChanged(spoken.nums[i], n));
    if (!changed) return;
    spoken = { name: L.name, nums };
    const readouts = L.readouts.map((r) => `${r.num} ${r.unit}${r.suffix ? ' ' + r.suffix : ''}`).join(COPY.punctuation.listJoin);
    live.textContent = t(COPY.hud.live, { name: L.name, readouts });
  }

  // --- the per-frame half ----------------------------------------------------------------------------

  function frame(tMs) {
    const t0 = performance.now();
    try { step(tMs, t0); } finally {
      stats.frames += 1;
      stats.ms += performance.now() - t0;
    }
  }

  function step(tMs, wall) {
    if (!sel) return;
    const cam = ctx.camera;
    if (!cam || isGround(sel) || hiddenForTrip()) { hideAll(); return; }
    // Sizes written by the last 4 Hz pass, read now: before any write in this frame.
    if (measureTag && shown.get(tag)) { tagSize.w = tag.offsetWidth; tagSize.h = tag.offsetHeight; measureTag = false; }
    if (measureChip && shown.get(chevron)) { chipSize.w = chevron.offsetWidth; chipSize.h = chevron.offsetHeight; measureChip = false; }

    const p = ctx.positionOfRecord ? ctx.positionOfRecord(sel) : null;
    if (!p || !Number.isFinite(p.x)) { hideAll(); return; }
    _p.copy(p);
    if (wall - lastSlow >= READOUT_MS) { lastSlow = wall; slow(tMs); }

    // One projection, in two halves so the sign of w is known: behind the eye is view-space z >= 0.
    _view.copy(_p).applyMatrix4(cam.matrixWorldInverse);
    const behind = _view.z >= 0;
    _ndc.copy(_view).applyMatrix4(cam.projectionMatrix);
    const dist = _p.distanceTo(cam.position);
    const onScreen = !behind && Math.abs(_ndc.x) <= 1 && Math.abs(_ndc.y) <= 1;

    if (!onScreen) {
      show(reticle, false);
      show(tick, false);
      show(tag, false);
      if (!shown.get(chevron)) measureChip = true;
      show(chevron, true);
      const at = chevronAt(_ndc, vw, vh, CHEVRON_INSET_PX, behind, area);
      const words = distanceWords(dist * stage.unitKm);
      if (chevDist.textContent !== words) { chevDist.textContent = words; measureChip = true; }
      const name = lines ? lines.name : '';
      if (chevName.textContent !== name) { chevName.textContent = name; measureChip = true; }
      const label = t(COPY.hud.offScreen, { name, distance: words });
      if (chevron.getAttribute('aria-label') !== label) chevron.setAttribute('aria-label', label);
      const pos = chevronAnchor(at, chipSize, vw, vh, EDGE_PX, area);
      setTransform(chevron, `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`);
      setTransform(arrow, `rotate(${at.angle.toFixed(3)}rad)`);
      mode = 'chevron';
      last = { mode, chevron: at, behind };
      return;
    }

    show(chevron, false);
    const px = { x: ((_ndc.x + 1) / 2) * vw, y: ((1 - _ndc.y) / 2) * vh };
    const { side, framing } = reticleFit(reticleBox(drawnDiameterPx(sel, dist)), vw, vh, sel.klass === 'world');
    show(reticle, framing);
    if (framing) {
      if (cache.get(box) !== side) {
        cache.set(box, side);
        box.style.width = `${side}px`;
        box.style.height = `${side}px`;
      }
      setTransform(reticle, `translate3d(${(px.x - side / 2).toFixed(2)}px, ${(px.y - side / 2).toFixed(2)}px, 0)`);
      if (acquirePending) {
        // Added a frame after it was taken off (select()), with a style pass between, so the one
        // acquire animation restarts for a new selection; nothing animates after it (req 2).
        acquirePending = false;
        box.classList.add(reducedMotion() ? 'is-acquiring-reduced' : 'is-acquiring');
      }
    }

    // Occluded is said, not hidden (req 8).
    const occ = occluderOf(cam.position, _p);
    setClass(reticle, 'is-occluded', !!occ);
    const behindWords = occ ? t(COPY.hud.behind, { world: COPY.worlds[occ] || occ }) : '';
    if (behindNote.textContent !== behindWords) {
      behindNote.textContent = behindWords;
      behindNote.hidden = !occ;
      measureTag = true;
    }

    // The tick: where the object will be one clock second from now, projected with the same camera.
    let tickShown = false;
    let tickPx = 0;
    if (framing && velOk) {
      _q.copy(_p).add(vel).applyMatrix4(cam.matrixWorldInverse);
      if (_q.z < 0) {
        _q.applyMatrix4(cam.projectionMatrix);
        const dx = ((_q.x + 1) / 2) * vw - px.x;
        const dy = ((1 - _q.y) / 2) * vh - px.y;
        tickPx = Math.hypot(dx, dy);
        tickShown = showTick(tickPx);
        if (tickShown) {
          const ang = Math.atan2(dy, dx);
          // From the box's edge outward, so the tick reads as leaving the brackets, not crossing them.
          const r = side / 2 + 2;
          setTransform(tick, `translate3d(${(px.x + Math.cos(ang) * r).toFixed(1)}px, ${(px.y + Math.sin(ang) * r).toFixed(1)}px, 0) rotate(${ang.toFixed(3)}rad)`);
        }
      }
    }
    show(tick, tickShown);

    // The tag (req 3), beside the box, flipped at the edges.
    const hasTag = !!lines;
    if (hasTag && !shown.get(tag)) measureTag = true;
    show(tag, hasTag);
    let place = null;
    if (hasTag) {
      place = tagPlacement(px, framing ? side : 0, tagSize, vw, vh, LEADER_PX, EDGE_PX, area);
      setData(tag, 'side', place.side);
      setData(tag, 'vert', place.vert);
      setTransform(tag, `translate3d(${place.x.toFixed(1)}px, ${place.y.toFixed(1)}px, 0)`);
      setClass(tag, 'is-over-world', overAWorld(place.x + tagSize.w / 2, place.y + tagSize.h / 2));
    }
    mode = 'on';
    last = { mode, px, box: side, framing, occluded: occ, tick: tickShown, tickPx, tag: place, tagSize: { ...tagSize } };
  }

  /**
   * Is a screen point over a drawn world's disc? The tag's glass is thin over space and the full
   * glass over a world (req 3, 0045 req 2): 13 px dim text on 0.62 glass over a lit cloud is 2.2:1.
   */
  function overAWorld(x, y) {
    const cam = ctx.camera;
    const f = cam.projectionMatrix.elements[5];
    for (const s of spheres) {
      _c.set(s.x, s.y, s.z);
      const d = _c.distanceTo(cam.position);
      _c.applyMatrix4(cam.matrixWorldInverse);
      if (_c.z >= 0) continue;
      _c.applyMatrix4(cam.projectionMatrix);
      const cx = ((_c.x + 1) / 2) * vw;
      const cy = ((1 - _c.y) / 2) * vh;
      const r = projectedDiameterPx(s.r, d, f, vh) / 2;
      if (Math.hypot(x - cx, y - cy) <= r) return true;
    }
    return false;
  }

  // --- selection -------------------------------------------------------------------------------------

  function select(record) {
    if (!record) { clear(); return; }
    const changed = !sel || sel.id !== record.id;
    sel = record;
    root.hidden = false;
    if (changed) {
      lines = null;
      spoken = null;
      lastSlow = -Infinity;
      box.classList.remove('is-acquiring', 'is-acquiring-reduced');
      acquirePending = true;
      measureTag = true;
    }
  }

  function clear() {
    sel = null;
    lines = null;
    spoken = null;
    hideAll();
    root.hidden = true;
    live.textContent = '';
  }

  function destroy() {
    window.removeEventListener('resize', readViewport);
    root.remove();
  }

  const api = {
    frame,
    select,
    clear,
    destroy,
    /** True while the tag names the selection on screen: ui/labels.js then leaves its own label off. */
    namesSelection: () => !!sel && mode === 'on' && !!lines,
    /** What the last frame drew, for a browser probe: {mode, px, box, occluded, tick, tag, chevron}. */
    state: () => ({ ...last, id: sel ? sel.id : null, lines }),
    /** Time spent in frame() and in the 4 Hz pass, in ms, since boot. */
    stats: () => ({ ...stats }),
  };
  return api;
}
