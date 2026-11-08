// scene/stars3dtiles.js -- AT-HYG's 2.4 million stars on the 3D map, fetched by octree node round the camera
// (forge #140, release 2.0.0 batch f10-stars3d; the tiles are the A1 format of forge #36).
//
// Contract: attachStarTiers(ctx) -> { state(), line(), farLine(), recordAt(i), hold(on), dispose() }   main.js, once, after the first visit
//   It wraps ctx.stars3d.pickAll and ctx.stars3d.physicalOf, so a tap finds an AT-HYG star and its card gets a width,
//   and ctx.stars3d keeps its contract. The arithmetic is scene/stars3dtree.js; the fetching is scene/stars3dworker.js.
//
// WHAT IS DRAWN. HYG's 109 389 stay scene/stars3d.js's (with deep time's motion and the variables, scene/stardeep.js).
// This adds the 2.4 million AT-HYG stars HYG does not have (data/stars3d-athyg/, scripts/build-stars3d-tiles.py), with
// the SAME shader and the SAME uniforms object (scene/stars3d.js's VERT and FRAG; its material's uniforms), so a star of
// one magnitude is the same light in either file, the exposure's limit and the photographs' holes hold for both, and the
// layer's cross-fade fades both. Only on a rung of the ladder (stars3d's TRUE mode): on a world stage the stars are
// directions on a shell sized by their brightness from the Sun, and AT-HYG has nothing brighter than HYG to add there.
//
// HOW MUCH, AND WHEN. The device's quality picks it (stars3dtree.js starTierFor): nothing on Low, after the frame latch or
// with data-saver; on tier 0 (a phone) at most 40 nodes of 8 192, on tier 1 128, on tier 2 256. Nothing is fetched until
// the stars are drawn on a rung, which is after the first frame by construction (main.js imports this after the first
// visit). The worker is started then and asked twice a second, while the camera moves, which nodes it should hold.
//
// ONE DRAW CALL. The nodes share one geometry of `nodes` slots of 8 192 stars: a node that arrives takes a free slot and
// uploads only its own range (addUpdateRange); a node the camera has left gives its slot back, its stars put out of reach
// (magnitude 99: the shader draws nothing fainter than its limit). GPU: 19 bytes a star, 6.2 MB on a phone.
//
// DEEP TIME. AT-HYG's motions are not on the GPU here: while scene/stardeep.js moves HYG's stars (the clock away from
// today), these are not drawn, and the line under the time bar says that the far-time view is HYG's alone (farLine).
//
// HONESTY. A card says which catalogue its star is from and where its distance came from (the source line), and how good
// the distance is: AT-HYG carries no error, so the error is MODELLED from the mission's typical one (stars3dtree.js
// distanceNote), and past 3 kpc the card says plainly that the distance is a guess.

import * as THREE from '../../vendor/three.module.min.js';
import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.startiers.js';
import { STARS3D_VERT, STARS3D_FRAG, starPhysical, LY_KM } from './stars3d.js';
import { starTint } from './starfield.js';
import { createPickIndex } from './pickindex.js';
import { isSaveData } from '../data/tilecloud.js';
import { CAPACITY, starTierFor, sceneToLy, refName, distanceNote, LY_PER_PC } from './stars3dtree.js';

const SUN_INERTIAL = 'sun-inertial';
const POLL_MS = 500;
const PICK_PX = 24;
const OUT_OF_REACH = 99;
const SET_URL = new URL('../../data/stars3d-athyg/set.json', import.meta.url).href;
const MOVE_LY = 0.25;

export function attachStarTiers(ctx) {
  const st = {
    base: null, points: null, geo: null, slots: 0, free: [], nodes: new Map(), bySlot: [],
    worker: null, set: null, error: null, plan: starTierFor(null), active: false, builtFor: null, lastCam: null,
    lastNodes: -1, far: false, held: false,
  };
  const index = createPickIndex();
  const color = new THREE.Color();

  function makeGeometry(slots) {
    if (st.points) { st.points.removeFromParent(); st.geo.dispose(); st.points.material.dispose(); }
    st.slots = slots;
    st.free = Array.from({ length: slots }, (_, i) => slots - 1 - i);
    st.nodes.clear();
    st.bySlot = new Array(slots).fill(null);
    if (!slots) { st.points = null; st.geo = null; return; }
    const n = slots * CAPACITY;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const mag = new THREE.BufferAttribute(new Float32Array(n).fill(OUT_OF_REACH), 1);
    geo.setAttribute('aAbsMag', mag);
    geo.setAttribute('aAppMag', mag); // the shell's magnitude: never drawn on the shell, so one buffer serves both names
    geo.setAttribute('aColour', new THREE.BufferAttribute(new Uint8Array(n * 3), 3, true));
    geo.setDrawRange(0, 0);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
    const mat = new THREE.ShaderMaterial({
      vertexShader: STARS3D_VERT, fragmentShader: STARS3D_FRAG, uniforms: st.base.material.uniforms,
      transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    st.points = new THREE.Points(geo, mat);
    st.points.name = 'stars3d:athyg';
    st.points.frustumCulled = false;
    st.points.renderOrder = -1;
    st.points.visible = false;
    st.geo = geo;
    ctx.stars3d.group.add(st.points);
  }

  /** Node `node` (or nothing) into slot `slot`; `placesOnly` after a stage change, when the colours and magnitudes stand. */
  function writeSlot(node, slot, placesOnly = false) {
    const geo = st.geo;
    const pos = geo.getAttribute('position');
    const mag = geo.getAttribute('aAbsMag');
    const col = geo.getAttribute('aColour');
    const o = slot * CAPACITY;
    const A = ctx.stage.affineFrom(SUN_INERTIAL, ctx.stage.tMs);
    for (let i = 0; i < CAPACITY; i += 1) {
      const j = o + i;
      if (!node || i >= node.count || !A) { mag.array[j] = OUT_OF_REACH; pos.array[j * 3] = pos.array[j * 3 + 1] = pos.array[j * 3 + 2] = 0; continue; }
      const kx = node.posLy[i * 3] * LY_KM, ky = node.posLy[i * 3 + 1] * LY_KM, kz = node.posLy[i * 3 + 2] * LY_KM;
      for (let k = 0; k < 3; k += 1) pos.array[j * 3 + k] = A.o[k] + A.x[k] * kx + A.y[k] * ky + A.z[k] * kz;
      if (placesOnly) continue;
      mag.array[j] = node.absMag[i];
      const rgb = starTint(Number.isFinite(node.bv[i]) ? node.bv[i] : 0.65);
      color.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
      col.array[j * 3] = Math.round(color.r * 255); col.array[j * 3 + 1] = Math.round(color.g * 255); col.array[j * 3 + 2] = Math.round(color.b * 255);
    }
    for (const a of placesOnly ? [pos] : [pos, mag, col]) { a.addUpdateRange(o * a.itemSize, CAPACITY * a.itemSize); a.needsUpdate = true; }
    let top = 0;
    st.bySlot.forEach((v, s) => { if (v) top = s + 1; });
    geo.setDrawRange(0, top * CAPACITY);
  }

  function drop(key) {
    const node = st.nodes.get(key);
    if (!node) return;
    st.nodes.delete(key);
    st.bySlot[node.slot] = null;
    st.free.push(node.slot);
    writeSlot(null, node.slot);
  }

  function onMessage(e) {
    const m = e.data || {};
    if (m.type === 'set') st.set = { count: m.count, tiles: m.tiles, bytes: m.bytes };
    else if (m.type === 'error') { if (!m.key) st.error = m.what; else console.warn('stars3d tiers:', m.what); }
    else if (m.type === 'want') { const keep = new Set(m.keys); for (const k of [...st.nodes.keys()]) if (!keep.has(k)) drop(k); }
    else if (m.type === 'node' && st.geo && !st.nodes.has(m.key) && st.free.length) {
      const node = { key: m.key, slot: st.free.pop(), count: m.absMag.length, posLy: m.posLy, absMag: m.absMag, bv: m.bv, ref: m.ref, src: m.src };
      st.nodes.set(m.key, node);
      st.bySlot[node.slot] = node;
      writeSlot(node, node.slot);
    }
  }

  function startWorker() {
    if (st.worker || st.error) return;
    st.worker = new Worker(new URL('./stars3dworker.js', import.meta.url), { type: 'module' });
    st.worker.onmessage = onMessage;
    st.worker.onerror = (e) => { st.error = String((e && e.message) || 'worker'); };
    st.worker.postMessage({ type: 'open', url: SET_URL });
  }

  function farClock() {
    try { return !!(ctx.starDeep && ctx.starDeep.state().years); } catch { return false; }
  }

  function tick() {
    if (!st.base && ctx.stars3d && ctx.stars3d.group) st.base = ctx.stars3d.group.children.find((o) => o.isPoints && o.name === 'stars3d') || null;
    if (!st.base) return;
    st.plan = starTierFor(ctx.quality ? ctx.quality.describe() : null, isSaveData());
    const onRung = ctx.stars3d.mode() === 'true';
    st.far = farClock();
    const want = st.plan.nodes > 0 && onRung && st.base.visible && !st.far && !st.held;
    // The buffers are made the first time they are wanted (a visit that never climbs the ladder allocates nothing), made
    // again when the tier changes how many nodes it holds, and given back when it holds none (Low, the latch, data-saver).
    if ((want || !st.plan.nodes) && st.plan.nodes !== st.lastNodes) {
      st.lastNodes = st.plan.nodes;
      makeGeometry(st.plan.nodes);
      st.lastCam = null;
      if (st.worker) st.worker.postMessage({ type: 'reset' });
    }
    st.active = want && !!st.points;
    if (st.points) st.points.visible = st.active;
    if (!st.active) return;
    startWorker();
    const built = `${ctx.stage.worldId}:${ctx.stars3d.mode()}`;
    if (built !== st.builtFor) { st.builtFor = built; for (const node of st.nodes.values()) writeSlot(node, node.slot, true); }
    const A = ctx.stage.affineFrom(SUN_INERTIAL, ctx.stage.tMs);
    const p = ctx.camera.position;
    const cam = A ? sceneToLy(A, [p.x, p.y, p.z]) : null;
    if (!cam) return;
    const moved = !st.lastCam || Math.hypot(cam[0] - st.lastCam[0], cam[1] - st.lastCam[1], cam[2] - st.lastCam[2]) > MOVE_LY;
    if (!moved || !st.worker) return;
    st.lastCam = cam;
    const limit = Math.min(7.5, Number(st.base.material.uniforms.uMagLimit.value) || 7.5);
    st.worker.postMessage({ type: 'view', cam, limit, nodes: st.plan.nodes });
  }

  // ---- a tap and a card ---------------------------------------------------------------------------------------------
  function recordAt(slotIndex) {
    const node = st.bySlot[Math.floor(slotIndex / CAPACITY)];
    const i = slotIndex % CAPACITY;
    if (!node || i >= node.count) return null;
    const x = node.posLy[i * 3], y = node.posLy[i * 3 + 1], z = node.posLy[i * 3 + 2];
    const distLy = Math.hypot(x, y, z);
    const ref = node.ref[i] >>> 0;
    const T = COPY.starTiers;
    const note = distanceNote(distLy, node.src[i]);
    const err = !note ? T.noError : note.guess ? T.guess
      : note.poe ? t(T.error, { pct: fmt.smart(Math.max(0.1, note.pct)), poe: fmt.int(note.poe), mas: String(note.sigmaMas) }) : T.noError;
    return {
      id: `athyg-${ref}`,
      name: refName(ref) || t(T.unnamed, { n: String(ref) }),
      klass: 'star', layer: 'stars', propagator: 'static', frame: SUN_INERTIAL,
      pos: { x: x * LY_KM, y: y * LY_KM, z: z * LY_KM },
      cls: note && note.guess ? 'inferred' : 'measured',
      meta: {
        catalogue: 'athyg', named: false, distLy: Math.round(distLy * 10) / 10,
        mag: Math.round((node.absMag[i] + 5 * Math.log10(distLy / LY_PER_PC / 10)) * 100) / 100,
        absMag: node.absMag[i], bv: node.bv[i], distFrom: note ? note.from : null, poe: note ? note.poe : null, guess: !!(note && note.guess),
        cite: t(T.cite, { dist: T.from[note ? note.from : 'other'] || T.from.other }),
        distNote: err,
      },
    };
  }

  function pickTiers(ndcX, ndcY, camera, viewport, limit, reachPx) {
    if (!st.active || !st.geo || !camera || !viewport) return [];
    const u = st.base.material.uniforms;
    if (u.uGain.value < 0.15) return []; // stars3d.js PICK_MIN_OPACITY: a ghost of itself is not tapped
    camera.updateMatrixWorld();
    st.points.updateMatrixWorld();
    const e = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(st.points.matrixWorld).elements;
    const pos = st.geo.getAttribute('position');
    const mag = st.geo.getAttribute('aAbsMag').array;
    const cp = camera.position, upp = u.uUnitsPerPc.value, lim = u.uMagLimit.value;
    const out = [];
    index.query(e, pos.array, pos.version, st.geo.drawRange.count, viewport.w * 0.5, viewport.h * 0.5, ndcX, ndcY, reachPx, (i, px, sx, sy, depth) => {
      if (mag[i] >= OUT_OF_REACH) return;
      const dpc = Math.max(1e-9, Math.hypot(pos.array[i * 3] - cp.x, pos.array[i * 3 + 1] - cp.y, pos.array[i * 3 + 2] - cp.z) / upp);
      if (mag[i] + 5 * Math.log10(dpc / 10) > lim) return; // not drawn is not tapped
      out.push({ i, px, sx, sy, depth });
    });
    out.sort((a, b) => a.px - b.px);
    return out.slice(0, Math.max(1, limit)).map((h) => ({ record: recordAt(h.i), px: h.px, score: h.px, sx: h.sx, sy: h.sy, depth: h.depth })).filter((h) => h.record);
  }

  const api = ctx.stars3d;
  const basePick = api.pickAll;
  api.pickAll = function pickAll(ndcX, ndcY, camera, viewport, limit = 6, reachPx = PICK_PX) {
    const a = basePick.call(this, ndcX, ndcY, camera, viewport, limit, reachPx);
    const b = pickTiers(ndcX, ndcY, camera, viewport, limit, reachPx);
    return b.length ? a.concat(b).sort((p, q) => p.px - q.px).slice(0, Math.max(1, limit)) : a;
  };
  const basePhysical = api.physicalOf;
  api.physicalOf = function physicalOf(record) {
    const m = record && record.meta;
    if (m && m.catalogue === 'athyg') return starPhysical(m.absMag, m.bv);
    return basePhysical.call(this, record);
  };

  // ---- the words ----------------------------------------------------------------------------------------------------
  /** The line under the tier's in What to show. */
  function line() {
    const T = COPY.starTiers;
    const p = st.plan;
    if (p.tier !== 'athyg') return [T.lineHyg, T.why[p.why] || '', T.gaiaHeld].filter(Boolean).join(' ');
    const n = st.set ? st.set.count : 2.4e6;
    return [t(T.lineAthyg, { n: fmt.smart(n / 1e6), k: fmt.smart(p.nodes * CAPACITY / 1e6) }), T.gaiaHeld].join(' ');
  }
  /** For scene/stardeep.js's line: said only when the clock is what keeps these stars off. */
  function farLine() {
    return st.far && st.plan.nodes > 0 && ctx.stars3d.mode() === 'true' ? COPY.starTiers.farTime : '';
  }
  let note = null;
  const paintNote = () => {
    const at = ctx.tierNoteEl;
    if (!at || !at.parentNode) return;
    if (!note) { note = document.createElement('p'); note.className = 'sr-show__note'; note.dataset.srStartiers = ''; }
    if (note.previousSibling !== at) at.after(note);
    const text = line();
    if (note.textContent !== text) note.textContent = text;
    note.hidden = at.hidden;
  };
  // What to show is built when it is first opened, so its tier line is looked for on every poll, not only on sr:tier.
  const onTier = () => { tick(); paintNote(); };
  window.addEventListener('sr:tier', onTier);
  const poll = setInterval(onTier, POLL_MS);
  onTier();

  return {
    state: () => ({
      plan: st.plan, active: st.active, far: st.far, set: st.set, error: st.error, slots: st.slots,
      nodes: st.nodes.size, stars: [...st.nodes.values()].reduce((n, v) => n + v.count, 0), drawn: st.geo ? st.geo.drawRange.count : 0,
      camLy: st.lastCam ? st.lastCam.map((v) => Math.round(v * 10) / 10) : null,
    }),
    line,
    farLine,
    recordAt,
    /** For the look run's before-and-after pictures: true draws HYG alone, as the Low setting would, and changes nothing else. */
    hold(on) { st.held = !!on; tick(); },
    dispose() {
      clearInterval(poll);
      window.removeEventListener('sr:tier', onTier);
      if (st.worker) st.worker.terminate();
      if (st.points) { st.points.removeFromParent(); st.geo.dispose(); st.points.material.dispose(); }
      if (note) note.remove();
      api.pickAll = basePick; api.physicalOf = basePhysical;
    },
  };
}
