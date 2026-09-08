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
//   1. the selection -- always, unless a trip is running (the trip's card names its subject);
//   2. the selection's train -- the other members of the same group (a fresh Starlink line is
//      one card with N members, and the names say which is which);
//   3. the nearest notable objects: records a hand-kept list gave a reason (`meta.why`), the worlds,
//      and the crewed stations -- at most ten, nearest to the camera first.
// Two labels closer than 24 px on screen would overprint, so the later one is dropped; that is the
// same forgiveness distance a tap uses (scene/pickrank.js), for the same reason.
//
// COST. Candidates are a few hundred records at most (the notable lists, the worlds, the stations,
// the selection's train), projected in float64 through stage.toScene and camera.project on the
// glyph tick (10 Hz at 1x), never the 17 000. DOM nodes are pooled: twelve <div>s, moved, never
// re-created per frame.

import * as THREE from '../../vendor/three.module.min.js';
import { propagate } from '../propagate/index.js';
import { stage } from '../scene/stage.js';
import { realModelFor } from '../scene/realmodels.js';

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
    if (entry && !entry.generic && entry.name) name = String(entry.name).trim();
  }
  if (!name) name = record && record.name ? String(record.name).trim() : '';
  if (name.length > MAX_NAME) name = name.slice(0, MAX_NAME - 1).trimEnd() + '…';
  return name;
}

/** Is this a record a hand-kept list, or the app's own structure, made worth naming? */
export function isNotable(record) {
  if (!record) return false;
  if (record.meta && record.meta.why) return true;
  if (record.klass === 'world' || record.klass === 'station') return true;
  return false;
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

  function project(record, tMs, camera, w, h) {
    const p = propagate(record, tMs);
    if (!p) return null;
    // A world's DISC may sit nearer than its true position (scene/worlds.js compresses the planets
    // from a world stage); the label goes where the disc is drawn.
    let pos = null;
    if (record.klass === 'world' && ctx.worlds && ctx.worlds.drawnPositionOf) pos = ctx.worlds.drawnPositionOf(record.id, _v);
    if (!pos) pos = stage.toSceneInto(p, p.frame, _v, tMs);
    if (!pos) return null;
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
    const inTrip = document.documentElement.classList.contains('sr-trip-mode');
    const selected = typeof ctx.selected === 'function' ? ctx.selected() : null;
    const layerOf = (id) => (ctx.layers || []).find((l) => l.id === id);
    const drawable = (layer) => (ctx.isLayerDrawable ? ctx.isLayerDrawable(layer) : ctx.isLayerOn && ctx.isLayerOn(layer.id));

    if (selected && !inTrip) {
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
        if (seen.has(r.id) || !isNotable(r)) continue;
        if (r.klass === 'world' && r.id === stage.worldId) continue; // the ground has no label
        const pr = project(r, tMs, camera, w, h);
        if (pr) { out.push({ record: r, kind: 'notable', ...pr }); seen.add(r.id); }
      }
    }
    return out;
  }

  function update(tMs) {
    if (host.hidden) return;
    const chosen = chooseLabels(candidatesNow(tMs));
    for (let i = 0; i < pool.length; i++) {
      const slot = pool[i];
      const c = chosen[i];
      if (!c) { if (!slot.node.hidden) slot.node.hidden = true; continue; }
      slot.node.hidden = false;
      slot.node.style.transform = `translate(${Math.round(c.x)}px, ${Math.round(c.y)}px) translate(-50%, -140%)`;
      const name = labelName(c.record);
      if (slot.text.textContent !== name) slot.text.textContent = name;
      const klass = c.record.klass || 'satellite';
      if (slot.klass !== klass) {
        slot.dot.className = `dot sr-swatch sr-swatch--${klass}`;
        slot.klass = klass;
      }
      slot.node.dataset.kind = c.kind;
    }
  }

  function destroy() {
    for (const slot of pool) slot.node.remove();
    pool.length = 0;
  }

  return { update, destroy };
}
