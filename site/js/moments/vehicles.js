// moments/vehicles.js -- a Moment's vehicle: its model in metres, split into the parts that come apart in flight
// (internal spec 0079 C1; the contract with the model stages is ~/space-radar-handoff/release-1.5/moments-contract.md).
//
// THE MODEL is loaded by the app's own loader (scene/realmodels.js loadRealModel: the same file, the same materials,
// the same cache as the hero layer), cloned, and stood in metres: `lengthM` long up +Y, its base at the origin and
// its axis on x = z = 0, whatever units the file was authored in.
//
// THE PARTS, two ways:
//   named  A file built for Moments (stages C2 to C4) has every separable part as its own node, named in the
//          registry row's `parts:` list. Each is lifted, with its world transform kept, onto a pivot at its own
//          centre, so a separation can push and tumble it about its middle.
//   cuts   A file that is ONE piece (the Saturn V and the lunar module as they are today) is cut by height:
//          `cuts: { "s-ic": [0, 42.1], ... }`, metres up the stack. Every triangle goes to the band its centre is
//          in; the bands share the file's vertex buffers and materials and differ only in their index lists, so a
//          split costs no copy of the geometry. A STUB until the real split lands, and the moment's honesty line says
//          the stages are cut from one model.
//
// What it returns is plain: `parts` (name -> { pivot, centre }), and the flames, chutes and plasma built for them
// (moments/effects.js). moments/player.js poses every pivot each frame from the mission clock.

import * as THREE from '../../vendor/three.module.min.js';
import { loadRealModel } from '../scene/realmodels.js';
import { createFlames, createPuffs, createChutes, createPlasma } from './effects.js';

/** Stand a loaded model in metres: `lengthM` along +Y, base at y = 0, axis through x = z = 0. */
export function standInMetres(model, lengthM) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const h = box.max.y - box.min.y || 1;
  const k = lengthM / h;
  const c = box.getCenter(new THREE.Vector3());
  model.scale.multiplyScalar(k);
  model.position.set(-c.x * k, -box.min.y * k, -c.z * k);
  model.updateMatrixWorld(true);
  return k;
}

/** The meshes of a tree, in traversal order (a clone's are in the same order). */
function meshesOf(root) {
  const out = [];
  root.traverse((n) => { if (n.isMesh) out.push(n); });
  return out;
}

/**
 * Cut a model (already in metres under `holder`) into height bands. Returns name -> { object, lo, hi } where each
 * object is a clone of the model whose meshes draw only their triangles in that band (empty meshes hidden).
 */
export function cutByHeight(holder, model, bands) {
  holder.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(holder.matrixWorld).invert();
  const names = Object.keys(bands);
  const meshes = meshesOf(model);
  const v = new THREE.Vector3();
  // Per mesh, per band, the triangle list.
  const lists = meshes.map((mesh) => {
    const g = mesh.geometry;
    const pos = g.attributes.position;
    const m = new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld);
    const index = g.index ? g.index.array : null;
    const n = index ? index.length : pos.count;
    const out = names.map(() => []);
    for (let i = 0; i < n; i += 3) {
      const a = index ? index[i] : i, b = index ? index[i + 1] : i + 1, c = index ? index[i + 2] : i + 2;
      v.set(
        (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3,
        (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3,
        (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3,
      ).applyMatrix4(m);
      let k = names.findIndex((name) => v.y >= bands[name][0] && v.y < bands[name][1]);
      if (k < 0) k = v.y < bands[names[0]][0] ? 0 : names.length - 1;
      out[k].push(a, b, c);
    }
    return out;
  });
  const result = {};
  names.forEach((name, k) => {
    const copy = model.clone(true);
    meshesOf(copy).forEach((mesh, j) => {
      const tri = lists[j][k];
      if (!tri.length) { mesh.visible = false; return; }
      const src = meshes[j].geometry;
      const g = new THREE.BufferGeometry();
      for (const [key, attr] of Object.entries(src.attributes)) g.setAttribute(key, attr);
      const max = src.attributes.position.count;
      g.setIndex(new THREE.BufferAttribute(max > 65535 ? new Uint32Array(tri) : new Uint16Array(tri), 1));
      g.computeBoundingSphere();
      mesh.geometry = g;
    });
    result[name] = { object: copy, lo: bands[name][0], hi: bands[name][1] };
  });
  return result;
}

/**
 * Load one vehicle of a moment. `spec` is its entry in the moment's `vehicles`; `events` the moment's part events
 * (separation motors are built for the events that name them). Resolves to { ok, root, parts, flames, chutes,
 * plasma, puffs, split } -- `ok` false when the file did not load (the path and the effects still draw).
 */
export async function loadVehicle(spec, events = [], { tier = 1 } = {}) {
  const root = new THREE.Group();
  root.name = `moment-vehicle:${spec.id}`;
  const parts = new Map();
  const src = await loadRealModel({ file: `${spec.model}.glb`, colour: spec.colour || 'rocket' });
  let split = 'none';
  if (src) {
    const holder = new THREE.Group();
    const model = src.clone(true);
    holder.add(model);
    standInMetres(model, spec.lengthM);
    const named = Array.isArray(spec.parts) ? spec.parts.filter((n) => model.getObjectByName(n)) : [];
    if (named.length) {
      split = 'named';
      for (const name of named) {
        const node = model.getObjectByName(name);
        const box = new THREE.Box3().setFromObject(node);
        const c = box.getCenter(new THREE.Vector3());
        const pivot = new THREE.Group();
        pivot.name = `part:${name}`;
        pivot.position.copy(c);
        holder.add(pivot);
        holder.updateMatrixWorld(true);
        pivot.attach(node);
        parts.set(name, { pivot, centre: [c.x, c.y, c.z] });
      }
      const rest = new THREE.Group();
      rest.name = 'part:rest';
      rest.add(model);
      parts.set('rest', { pivot: rest, centre: [0, 0, 0] });
    } else if (spec.cuts && Object.keys(spec.cuts).length) {
      split = 'cuts';
      const bands = cutByHeight(holder, model, spec.cuts);
      for (const [name, b] of Object.entries(bands)) {
        const mid = (b.lo + Math.min(b.hi, spec.lengthM)) / 2;
        const pivot = new THREE.Group();
        pivot.name = `part:${name}`;
        const inner = new THREE.Group();
        inner.position.y = -mid;
        inner.add(b.object);
        pivot.add(inner);
        parts.set(name, { pivot, centre: [0, mid, 0] });
      }
    } else {
      const pivot = new THREE.Group();
      pivot.name = 'part:whole';
      pivot.add(model);
      parts.set('whole', { pivot, centre: [0, 0, 0] });
    }
  }
  // Every part's pivot is posed by the player in the stage's frame; none is parented to `root`.
  for (const p of parts.values()) { p.pivot.matrixAutoUpdate = false; root.add(p.pivot); }
  // Flames, one set per engine so a single engine can be cut off (the Saturn V's centre engine at T+135 s).
  const flames = new Map();
  for (const [name, list] of Object.entries(spec.engines || {})) {
    const part = parts.get(name);
    const f = (spec.flames && spec.flames[name]) || { kind: 'kerolox', exitM: 2 };
    const c = part ? part.centre : [0, 0, 0];
    const engines = list.map((p) => {
      const e = createFlames({ points: [[p[0] - c[0], p[1] - c[1], p[2] - c[2]]], kind: f.kind, exitM: f.exitM, tier });
      if (part) part.pivot.add(e.group); else root.add(e.group);
      return e;
    });
    flames.set(name, engines);
  }
  // Separation motors, for the events that carry `puffs`.
  const puffs = [];
  for (const e of events) {
    if (!e.puffs || (e.vehicle && e.vehicle !== spec.id)) continue;
    const part = parts.get(e.puffs.part || e.part);
    const c = part ? part.centre : [0, 0, 0];
    const p = createPuffs({ points: e.puffs.at.map((q) => [q[0] - c[0], q[1] - c[1], q[2] - c[2]]), dir: e.puffs.dir || [0, 1, 0], exitM: e.puffs.exitM || 0.35, dur: e.puffs.dur || 0.8, tier });
    if (part) part.pivot.add(p.group); else root.add(p.group);
    puffs.push({ t: e.t + (e.puffs.lead || 0), fx: p });
  }
  const chutes = new Map();
  for (const [name, c] of Object.entries(spec.chutes || {})) {
    const fx = createChutes(c);
    fx.group.matrixAutoUpdate = false;
    root.add(fx.group);
    chutes.set(name, { spec: c, fx });
  }
  let plasma = null;
  if (spec.plasma) {
    plasma = { spec: spec.plasma, fx: createPlasma({ radiusM: spec.plasma.radiusM || 2 }) };
    plasma.fx.group.matrixAutoUpdate = false;
    root.add(plasma.fx.group);
  }
  return { ok: !!src, root, parts, flames, puffs, chutes, plasma, split };
}

/** Free what loadVehicle made (the file's own geometry and materials are the loader's, and stay cached). */
export function disposeVehicle(v) {
  if (!v) return;
  for (const list of v.flames.values()) for (const f of list) f.dispose();
  for (const p of v.puffs) p.fx.dispose();
  for (const c of v.chutes.values()) c.fx.dispose();
  if (v.plasma) v.plasma.fx.dispose();
  // The cut bands' index lists are left to the collector: disposing them would free the vertex buffers they share
  // with the cached file, which the hero layer may be drawing.
  if (v.root.parent) v.root.parent.remove(v.root);
}
