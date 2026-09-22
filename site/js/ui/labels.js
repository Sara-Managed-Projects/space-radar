// ui/labels.js -- names over the scene for the few things worth naming (spec 0026 req 5).
//
// Contract: createLabels(ctx, host) -> { update(tMs), destroy() }
// Also exported, pure, so the choice can be tested without a DOM:
//   chooseLabels(candidates, opts) -> the candidates that get a label, in draw order
//
// `#labels` has been in index.html since day one with a CSS rule and no writer. This is the writer.
//
// WHAT GETS A NAME. Never the catalogue: 17 000 labels is a wall of text and a frame budget. Three
// kinds of thing, in this order, capped at twelve on screen:
//   1. the selection -- always, and a trip's subject too, unless it is the ground under the camera.
//      The trip's card names its subject but cannot point at it: MEASURED 2026-09-22 on "To the
//      edge", Proxima was one unlabelled point among hundreds, and at the Sun the nearest name was
//      Voyager 1's;
//   2. the selection's train -- the other members of the same group (a fresh Starlink line is
//      one card with N members, and the names say which is which);
//   3. the nearest notable objects: records a hand-kept list gave a reason (`meta.why`), the worlds,
//      and the crewed stations -- at most ten, nearest to the camera first.
// Two labels closer than 24 px on screen would overprint, so the later one is dropped; that is the
// same forgiveness distance a tap uses (scene/pickrank.js), for the same reason. That test is on
// ANCHORS, before anything is measured, and a name is a box two hundred pixels wide -- so the boxes
// are checked again once they are measured and placed (keepClearOf, below).
//
// COST. Candidates are a few hundred records at most (the notable lists, the worlds, the stations,
// the selection's train), projected in float64 through stage.toScene and camera.project on the
// glyph tick (10 Hz at 1x), never the 17 000. DOM nodes are pooled: twelve <div>s, moved, never
// re-created per frame.

import * as THREE from '../../vendor/three.module.min.js';
import { propagate } from '../propagate/index.js';
import { stage, isLadderStage } from '../scene/stage.js';
import { realModelFor } from '../scene/realmodels.js';
import { WORLDS } from '../scene/worlds.js';

export const LABEL_CAP = 12;
export const NOTABLE_CAP = 10;
export const DEDUPE_PX = 24;
const MAX_NAME = 34;

/** A name a person uses, before the catalogue's string. Mirrors ui/cards.js displayName. */
export function labelName(record) {
  let name = record && record.meta && record.meta.displayName ? String(record.meta.displayName).trim() : '';
  if (!name) {
    let entry = null;
    try { entry = realModelFor(record); } catch { entry = null; }
    // A route's own `displayName` names this exact object even when its shape is generic
    // (Tiangong); otherwise a generic route's `name` is a class ("a Starlink") and renames nothing.
    if (entry && entry.displayName) name = String(entry.displayName).trim();
    else if (entry && !entry.generic && entry.name) name = String(entry.name).trim();
  }
  // Then the hand-kept list's own name (data/layers.js NOTABLE), before the catalogue's string.
  if (!name && record && record.meta && record.meta.listName) name = String(record.meta.listName).trim();
  if (!name) name = record && record.name ? String(record.name).trim() : '';
  if (name.length > MAX_NAME) name = name.slice(0, MAX_NAME - 1).trimEnd() + '…';
  return name;
}

// Classes that are places on the ladder's own scale. On a ladder stage everything else -- the
// planets, the probes, the asteroids -- sits inside one pixel of the Sun, where a label names
// whichever happened to be first: "Uranus" for the Sun from the Pleiades, "Voyager 1" from a
// light-year out (measured 2026-09-22). There the Sun speaks for the whole Solar System.
const LADDER_KLASSES = new Set(['star', 'exoplanet', 'dso', 'exotic']);

/** On a ladder stage, is this record drawn as its own place rather than inside the Sun's pixel? */
export function isOwnPlaceOnLadder(record) {
  if (!record) return false;
  if (record.klass === 'world') return record.id === 'sun';
  return LADDER_KLASSES.has(record.klass);
}

/** Is this a record a hand-kept list, or the app's own structure, made worth naming? */
export function isNotable(record) {
  if (!record) return false;
  if (record.meta && record.meta.why) return true;
  if (record.klass === 'world' || record.klass === 'station') return true;
  return false;
}

/**
 * May this record compete for one of the "nearest notable" labels on this kind of stage? Pure, and
 * the one filter candidatesNow applies, so a test can hold it.
 *
 * A FAMOUS STAR IS NAMED ON THE LADDER ONLY (2026-09-22, registry/stars-notable.yaml). On a rung it
 * is a place the camera can fly past. On a world stage the stars are directions on a shell, and
 * the Sun's stage (1e6 km a unit) puts every star within ~100 light-years inside the far plane, so
 * without this Sirius and Vega would take label slots from the planets on a view that is about the
 * planets. The selection is labelled wherever it is; this is only the notable list.
 */
export function isNotableHere(record, ladder) {
  if (!isNotable(record)) return false;
  if (ladder) return isOwnPlaceOnLadder(record);
  return record.klass !== 'star';
}

/**
 * The choice, pure. `candidates` are already projected: {record, x, y, dist, kind} with x, y in
 * pixels and kind one of 'selection' | 'train' | 'notable'. Returns those that get a label:
 * selection first, then the train, then notable by distance, dropping anything within DEDUPE_PX
 * of a label already kept, capped at LABEL_CAP with at most NOTABLE_CAP notable.
 */
export function chooseLabels(candidates, opts = {}) {
  const cap = opts.cap || LABEL_CAP;
  const notableCap = opts.notableCap || NOTABLE_CAP;
  const dedupe = opts.dedupePx || DEDUPE_PX;
  const order = { selection: 0, train: 1, notable: 2 };
  const list = (Array.isArray(candidates) ? candidates : [])
    .filter((c) => c && c.record && Number.isFinite(c.x) && Number.isFinite(c.y))
    .slice()
    .sort((a, b) => (order[a.kind] - order[b.kind]) || (a.dist - b.dist));
  const out = [];
  let notable = 0;
  for (const c of list) {
    if (out.length >= cap) break;
    if (c.kind === 'notable' && notable >= notableCap) continue;
    let clash = false;
    for (const k of out) {
      if (Math.hypot(k.x - c.x, k.y - c.y) < dedupe) { clash = true; break; }
    }
    if (clash) continue;
    out.push(c);
    if (c.kind === 'notable') notable++;
  }
  return out;
}

/** How far a label keeps off the edge of the window, in CSS pixels. */
export const LABEL_EDGE_PAD = 4;

/**
 * Where to centre a label of `boxWidth` anchored at `x`, so the whole box stays on screen.
 *
 * A label is drawn with `translate(-50%)`, so half of it hangs to the left of the anchor and half
 * to the right. Only the ANCHOR was ever kept on screen, never the box, so a name on an object near
 * the edge was cut off by the edge of the window. MEASURED on a 375 px phone, 2026-09-20: a label
 * ran 311..407 on a 375 px screen, a third of the name off the side. It happens on a desktop too,
 * as a smaller fraction of a wider window, which is why it had not been noticed.
 *
 * A label wider than the window cannot be fully shown; it starts at the left edge rather than being
 * centred on nothing, so the beginning of the name is the part that survives.
 */
export function clampLabelX(x, boxWidth, hostWidth, pad = LABEL_EDGE_PAD) {
  if (!Number.isFinite(x)) return x;
  const half = (Number.isFinite(boxWidth) ? boxWidth : 0) / 2;
  const lo = half + pad;
  const hi = (Number.isFinite(hostWidth) ? hostWidth : 0) - half - pad;
  if (hi < lo) return lo;
  return Math.min(Math.max(x, lo), hi);
}

/** Space kept between two label boxes, in CSS pixels. */
export const LABEL_GAP_PX = 2;

/**
 * Which of these placed boxes to keep, in priority order: the first box always, and each later box
 * only if it overlaps none already kept. `boxes` are {left, top, right, bottom} in CSS pixels, in
 * the order chooseLabels returned them -- selection, train, nearest notable -- so when two collide
 * the more important name is the one that survives.
 *
 * WHY THIS EXISTS. chooseLabels drops a label whose ANCHOR is within 24 px of another's. A label is
 * not an anchor: it is a box as wide as its name. Two payloads from one launch fly metres apart,
 * their anchors land 30-odd pixels apart on the same row, both pass the 24 px test, and their boxes
 * print on top of each other. Seen on the live site on a 390 px phone, 2026-09-21: "Long March 6A |
 * Unknown Payload 1" and "... Payload 2" as one unreadable line. clampLabelX can also slide a box
 * sideways into its neighbour after the anchor test has already passed it. Both need the real width,
 * which only exists after measuring -- so this runs on placed boxes, not anchors.
 */
export function keepClearOf(boxes, gap = LABEL_GAP_PX) {
  const kept = [];
  const out = [];
  for (const b of Array.isArray(boxes) ? boxes : []) {
    const ok = !!b && [b.left, b.top, b.right, b.bottom].every(Number.isFinite) &&
      !kept.some((k) => b.left < k.right + gap && b.right + gap > k.left && b.top < k.bottom + gap && b.bottom + gap > k.top);
    out.push(ok);
    if (ok) kept.push(b);
  }
  return out;
}

/**
 * A world hides the label of anything behind it. Shrunk by this much, so a thing standing ON the
 * surface -- a landing site, seen at a low angle over faceted geometry -- is not hidden by its own
 * ground.
 */
export const OCCLUDER_SHRINK = 0.998;

/**
 * Is `pos` hidden from `eye` behind one of these spheres? Pure; `spheres` are {x, y, z, r, id} in
 * scene units, and the sphere whose `id` is `skipId` is ignored -- a world's label sits on its own
 * centre, which its own surface would otherwise always hide.
 *
 * WHY. A label was placed wherever its point projected, whatever was in front of it. MEASURED in
 * headless Chrome on 2026-09-22, the Moon trip's first stop: seven names -- Ryugu, Bennu, Eros,
 * OSIRIS-APEX, Hera, Hayabusa2, Europa Clipper, every one of them far beyond the Moon in that
 * direction -- printed across the lunar surface around Surveyor 1, as if they were landing sites.
 */
export function behindWorld(eye, pos, spheres, skipId = null) {
  const dx = pos.x - eye.x;
  const dy = pos.y - eye.y;
  const dz = pos.z - eye.z;
  const len = Math.hypot(dx, dy, dz);
  if (!(len > 0) || !Array.isArray(spheres)) return false;
  const ux = dx / len;
  const uy = dy / len;
  const uz = dz / len;
  for (const s of spheres) {
    if (!s || s.id === skipId || !(s.r > 0)) continue;
    const ox = s.x - eye.x;
    const oy = s.y - eye.y;
    const oz = s.z - eye.z;
    const along = ox * ux + oy * uy + oz * uz;
    if (along <= 0) continue; // behind the eye
    const r = s.r * OCCLUDER_SHRINK;
    const off2 = ox * ox + oy * oy + oz * oz - along * along;
    if (off2 >= r * r) continue; // the line of sight passes beside it
    const entry = along - Math.sqrt(r * r - off2);
    if (entry > 0 && entry < len) return true;
  }
  return false;
}

export function createLabels(ctx, host) {
  if (!host || typeof document === 'undefined') return { update() {}, destroy() {} };
  const pool = [];
  for (let i = 0; i < LABEL_CAP; i++) {
    const node = document.createElement('div');
    node.className = 'label';
    node.hidden = true;
    const dot = document.createElement('span');
    dot.className = 'dot sr-swatch';
    dot.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.className = 'label__text';
    node.appendChild(dot);
    node.appendChild(text);
    host.appendChild(node);
    pool.push({ node, dot, text, klass: '' });
  }
  const _v = new THREE.Vector3();
  const _c = new THREE.Vector3();
  let spheres = [];

  /** The drawn worlds, as spheres a label can be behind, once per update. */
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

  function project(record, tMs, camera, w, h) {
    const p = propagate(record, tMs);
    if (!p) return null;
    // A world's DISC may sit nearer than its true position (scene/worlds.js compresses the planets
    // from a world stage); the label goes where the disc is drawn.
    let pos = null;
    if (record.klass === 'world' && ctx.worlds && ctx.worlds.drawnPositionOf) pos = ctx.worlds.drawnPositionOf(record.id, _v);
    if (!pos) pos = stage.toSceneInto(p, p.frame, _v, tMs);
    if (!pos) return null;
    if (behindWorld(camera.position, pos, spheres, record.klass === 'world' ? record.id : null)) return null;
    const dist = pos.distanceTo(camera.position);
    pos.project(camera);
    if (pos.z > 1 || pos.z < -1) return null;
    const x = (pos.x + 1) * 0.5 * w;
    const y = (1 - pos.y) * 0.5 * h;
    if (x < -20 || y < -20 || x > w + 20 || y > h + 20) return null;
    return { x, y, dist };
  }

  function candidatesNow(tMs) {
    const camera = ctx.camera;
    if (!camera) return [];
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;
    const out = [];
    const seen = new Set();
    spheres = occluders();
    const inTrip = document.documentElement.classList.contains('sr-trip-mode');
    const selected = typeof ctx.selected === 'function' ? ctx.selected() : null;
    const layerOf = (id) => (ctx.layers || []).find((l) => l.id === id);
    const drawable = (layer) => (ctx.isLayerDrawable ? ctx.isLayerDrawable(layer) : ctx.isLayerOn && ctx.isLayerOn(layer.id));

    const ladder = isLadderStage(stage.worldId);
    const isGround = (r) => r.klass === 'world' && r.id === stage.worldId;
    if (selected && !(inTrip && isGround(selected))) {
      const pr = project(selected, tMs, camera, w, h);
      if (pr) { out.push({ record: selected, kind: 'selection', ...pr }); seen.add(selected.id); }
    }
    // the selection's train: same layer, same group key
    if (selected) {
      const layer = layerOf(selected.layer);
      if (layer && typeof layer.groupBy === 'function') {
        const key = layer.groupBy(selected);
        if (key) {
          for (const r of ctx.recordsFor(layer.id) || []) {
            if (r === selected || seen.has(r.id) || layer.groupBy(r) !== key) continue;
            const pr = project(r, tMs, camera, w, h);
            if (pr) { out.push({ record: r, kind: 'train', ...pr }); seen.add(r.id); }
          }
        }
      }
    }
    // the nearest notable things among what is drawn
    for (const layer of ctx.layers || []) {
      if (!drawable(layer)) continue;
      const records = ctx.recordsFor(layer.id) || [];
      // a layer that is small enough to name entirely, or the hand-kept rows of a big one
      for (const r of records) {
        if (seen.has(r.id) || !isNotableHere(r, ladder)) continue; // on the ladder: not inside the Sun's pixel
        if (isGround(r)) continue; // the ground has no label
        const pr = project(r, tMs, camera, w, h);
        if (pr) { out.push({ record: r, kind: 'notable', ...pr }); seen.add(r.id); }
      }
    }
    return out;
  }

  /**
   * A label is centred on the thing it names, so half of it hangs past that point. Only the ANCHOR
   * was kept on screen (`x > w + 20` in project()), never the box, so a name on an object near the
   * right edge was cut off by the edge of the window.
   *
   * MEASURED on a 375 px phone, 2026-09-20, which is where it shows worst: a label ran 311..407 on
   * a 375 px screen -- a third of the name off the side. The same thing happens on a desktop; it is
   * simply a smaller fraction of a wider window, which is why nobody had seen it.
   *
   * So the box is kept inside the host: the anchor may sit anywhere, the label slides to stay
   * readable, and a label wider than the whole screen still starts at the left edge rather than
   * being centred on nothing.
   */
  function update(tMs) {
    if (host.hidden) return;
    const chosen = chooseLabels(candidatesNow(tMs));
    // Pass one: contents. Pass two: measure and place. Reading offsetWidth invalidates layout, so
    // interleaving it with the writes would re-layout the whole list once per label.
    for (let i = 0; i < pool.length; i++) {
      const slot = pool[i];
      const c = chosen[i];
      if (!c) { if (!slot.node.hidden) slot.node.hidden = true; continue; }
      slot.node.hidden = false;
      const name = labelName(c.record);
      if (slot.text.textContent !== name) slot.text.textContent = name;
      const klass = c.record.klass || 'satellite';
      if (slot.klass !== klass) {
        slot.dot.className = `dot sr-swatch sr-swatch--${klass}`;
        slot.klass = klass;
      }
      slot.node.dataset.kind = c.kind;
    }
    const w = host.clientWidth || window.innerWidth;
    // Measure every box once (one layout), then place, then keep only the boxes that do not overlap
    // one kept before them. The CSS draws a label at translate(-50%, -140%) from its anchor, so the
    // box spans x +- width/2 and from y - 1.4 height to y - 0.4 height.
    const placed = [];
    for (let i = 0; i < pool.length; i++) {
      const c = chosen[i];
      if (!c) break;
      const bw = pool[i].node.offsetWidth;
      const bh = pool[i].node.offsetHeight;
      const x = clampLabelX(c.x, bw, w);
      placed.push({ x, y: c.y, left: x - bw / 2, right: x + bw / 2, top: c.y - 1.4 * bh, bottom: c.y - 0.4 * bh });
    }
    const keep = keepClearOf(placed);
    for (let i = 0; i < placed.length; i++) {
      const slot = pool[i];
      if (!keep[i]) { slot.node.hidden = true; continue; }
      const b = placed[i];
      slot.node.style.transform = `translate(${Math.round(b.x)}px, ${Math.round(b.y)}px) translate(-50%, -140%)`;
    }
  }

  function destroy() {
    for (const slot of pool) slot.node.remove();
    pool.length = 0;
  }

  return { update, destroy };
}
