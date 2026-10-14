// scene/deep/deepsky.js -- the deep-sky coordinator (internal spec 0075 task 8, design sections 1, 5, 7).
// Imported by main.js (ctx.wantDeep) the first time a rung of the ladder is entered; never at boot.
//
// Contract: createDeepSky(THREE, env) -> {
//   frame(info)                 once a frame from main.js's loop: {camera, renderer, nowMs, dtMs, frameMs, visible}
//   rebuild()                   the stage changed (sr:stage): everything is placed again
//   setExposure(k)              the faint-light gain (scene/exposure.js milkyWay), as the glows wear it
//   radiusPx(id)                a record's projected radius last frame, CSS px (null off the ladder)
//   level(id)                   its level of detail now (scene/deep/lodsize.js)
//   nameRule(record, selId, subjectId)   ui/labels.js asks it of every deep-sky name (data/deepsky.js)
//   pathFor(record, fromTarget, camera)  a flight through the record's parent, or null (main.js flyToRecord)
//   drawnOf(record)             what is drawn for it, most 3D first, its hero's classes included once shipped
//   ready()                     true when nothing the visible heroes and photographs need is in flight
//   whenReady(ms)               a promise of ready(), or false at the timeout
//   stats()                     per holder and hero: level, steps, share, draw calls, CPU ms in this hook
//   debug(opts)                 {gas, glow, holders, force}: switches for probes (`sr.deep.debug`), and
//                               `?deepdebug=1` (tools only, not a visitor URL key) starts with force on
//   dispose()
// }
// env = { scene, records(), recordById(id), pictureShare(id), picturesBusy(), selectedId(), subjectId(),
//         quality() -> {tier, top, latched, scaleStep}, look() -> 'measured'|'film', reduced() -> bool,
//         frozen: bool (?look=1), debug: bool, heroes?: HEROES, glowFor }
//
// NOTHING VANISHES (task 7, internal #773). Until this file, closer than about a third of the arrival
// distance, or 45 degrees off the line it was photographed along, the Helix and the LMC left empty sky:
// the photograph faded (rightly: a flat picture seen from the side is a lie), the point glow was past
// the 420 px a GPU will draw a point at, and the mark had yielded to the glow. So every object large on
// screen gets a HOLDER: the glow's own profile, colour and size as a volume (scene/deep/gasmat.js), its
// ellipsoid oriented by the record's measured viewing angles where there are some (the LMC's, from van
// der Marel & Cioni 2001) or by its catalogue ellipse. It cross-fades with the point glow over the
// glow's own fade (110 to 210 px in radius) and gives way to the photograph by the photograph's own
// share, so the three always sum to the one object. A holder is an illustration and the card says so.
// From inside it the camera sees the gas around it: a selected Tarantula stands in its LMC.
//
// HEROES (task 8). scene/deep/heroes.js lists them, one line each. A hero is fetched at its class's fetch
// radius, built at level 2, and at most two draw at once: the largest on screen (the only one that may
// march at level 3) and one neighbour at level 2. One at level 0 for ten seconds gives its memory back.
// The frame latch drops every hero to level 1 (the photograph and the holder's shells). None ships in
// stage a: their profiles say `shipped: false`, and the seam is proved by the stubs and the tests.
//
// ONE QUALITY MACHINE. The tier, the visitor's choice (Ultra is `top`), the latch and the governor's
// step come from main.js; the steps follow them (gasmat.js marchSteps): fewer steps before a lower
// pixel ratio, never a demotion of its own.

import { stage, isLadderStage } from '../stage.js';
import { glowFor as dsoGlowFor } from '../dsoglow.js';
import { radiusPx as projRadius, levelFor, classOf, THRESHOLDS, createFader } from './lodsize.js';
import { createGasMesh, holderSteps, marchSteps, columnJs, peak2d, noiseTexture, disposeNoise, KINDS } from './gasmat.js';
import * as gas from './gasmat.js';
import { HEROES as LIST } from './heroes.js';
import { nameRule as rule, parentIdOf, drawnOf as drawnClasses, discFrame, enterShare, parentApexDistance, parentPath, NAME_PARENT_PX } from '../../data/deepsky.js';

const SUN_INERTIAL = 'sun-inertial';
const HOLD_FROM = 110;          // CSS px of radius: where scene/dsoglow.js's point glow starts to fade (220 px wide)
const HOLD_FULL = 210;          // and where it is gone (420 px wide)
const MAX_HOLDERS = 3;          // the three largest on screen; anything else is small enough for its glow
const HOLDER_KEEP_MS = 5000;    // a holder out of use this long is disposed
const HERO_KEEP_MS = 10000;     // a hero at level 0 this long gives its memory back
const HERO_KINDS = new Set(['galaxy', 'cloud', 'soft', 'shell', 'remnant', 'globular']);
// Thickness of a disc galaxy's holder, of its radius: an illustration (an LMC's disc is about a fifth
// as thick as it is wide; a large spiral's a tenth); stage c and d replace it with the measured.
const THICK = { 'barred-irregular': 0.22, irregular: 0.3, spiral: 0.12, 'barred-spiral': 0.12, lenticular: 0.2 };
const smooth = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function createDeepSky(THREE, env = {}) {
  const group = new THREE.Group();
  group.name = 'deep-sky';
  group.renderOrder = -1;
  if (env.scene) env.scene.add(group);
  const heroesList = env.heroes || LIST;
  // ?look=1 holds the gas's clock (task 10): a function, because main.js's latch is made after this may be asked for.
  const isFrozen = () => (typeof env.frozen === 'function' ? !!env.frozen() : !!env.frozen);
  const glowFor = env.glowFor || dsoGlowFor;
  const px = new Map();            // id -> projected radius, CSS px
  const levels = new Map();        // id -> level (hysteresis)
  const holders = new Map();       // id -> holder
  const heroes = new Map();        // hero id -> { def, profile, mod, hero, level, pending, idleSince }
  const fader = createFader();
  const pending = new Set();
  const debugState = { gas: true, glow: true, holders: true, stars: true, dust: true, force: !!env.debug };
  let gain = 1;
  let builtFor = null;
  let lastCpuMs = 0;
  let lastCalls = 0;
  const _v = new THREE.Vector3();
  const _w = new THREE.Vector3();
  const _c = new THREE.Vector3();

  // The profiles are tiny: read at once, so drawnOf() and `shipped` are known before anything is near.
  for (const def of heroesList) {
    const h = { def, profile: null, mod: null, hero: null, level: 0, share: 0, idleSince: 0 };
    heroes.set(def.id, h);
    const p = Promise.resolve().then(() => def.profile()).then((m) => { h.profile = m.HERO || m.default || null; }).catch((e) => console.warn('deep: no profile for', def.id, e)).finally(() => pending.delete(p));
    pending.add(p);
  }
  const heroOfRecord = (id) => { for (const h of heroes.values()) if (h.def.record === id) return h; return null; };

  // ---------------------------------------------------------------------------- placing a record
  function centreOf(record, out) {
    return !!(record && record.pos && stage.toSceneInto(record.pos, SUN_INERTIAL, out, stage.tMs));
  }
  /** A unit vector in sun-inertial, carried into the scene's axes (the stage's own rotation and remap). */
  function sceneDir(record, dir, out) {
    const k = 1e12; // km: far enough to be a direction, near enough to stay in float64's comfort
    const tip = { x: record.pos.x + dir[0] * k, y: record.pos.y + dir[1] * k, z: record.pos.z + dir[2] * k };
    if (!stage.toSceneInto(tip, SUN_INERTIAL, out, stage.tMs)) return false;
    centreOf(record, _c);
    out.sub(_c).normalize();
    return true;
  }
  /** The holder's world matrix: the unit sphere onto the object's ellipsoid, in scene units. */
  function holderMatrix(record, g, m) {
    const md = record.meta || {};
    const R = g.sizeKm / 2 / stage.unitKm;
    if (!centreOf(record, _v)) return 0;
    const morph = md.morphology || null;
    const thick = md.kind === 'galaxy' ? THICK[morph] || null : null;
    let frame = null;
    if (thick && md.orientation && Number.isFinite(md.orientation.incl_deg)) {
      frame = discFrame(record.pos, md.orientation.pa_deg, md.orientation.incl_deg, md.orientation.near_side);
    } else if (thick && md.majAxArcmin > 0 && md.minAxArcmin > 0 && Number.isFinite(md.posAngDeg)) {
      // No published viewing angles: the inclination the catalogue ellipse implies for a thin disc.
      const q = Math.min(1, md.minAxArcmin / md.majAxArcmin);
      frame = discFrame(record.pos, md.posAngDeg, Math.acos(Math.max(thick, q)) * 180 / Math.PI, null);
    }
    const x = new THREE.Vector3(), y = new THREE.Vector3(), z = new THREE.Vector3();
    if (frame && sceneDir(record, frame.major, x) && sceneDir(record, frame.normal, y)) {
      z.crossVectors(x, y).normalize();
      y.crossVectors(z, x).normalize();
      m.makeBasis(x.multiplyScalar(R), y.multiplyScalar(R * thick), z.multiplyScalar(R));
    } else {
      m.makeScale(R, R, R);
    }
    m.setPosition(_v);
    return R;
  }

  function makeHolder(record) {
    // The galaxy we live in is scene/galaxy.js's model (and its panorama from inside): never a holder.
    if (!record || (record.meta && record.meta.home === true)) return null;
    const g = glowFor(record);
    if (!g || !HERO_KINDS.has(g.kind)) return null;
    const q = env.quality ? env.quality() : { tier: 1 };
    // An irregular or a dwarf spheroidal galaxy has no bright nucleus: the soft profile, not the spiral's.
    const morph = record.meta && record.meta.morphology;
    const kind = g.kind === 'galaxy' && /irregular|spheroidal/.test(String(morph || '')) ? KINDS.soft : KINDS[g.kind] || 0;
    const cloud = g.kind === 'cloud';
    const thin = g.kind === 'shell' || g.kind === 'remnant';
    const march = holderSteps({ tier: q.tier, latched: q.latched, cloud, thin }) > 0;
    const v = createGasMesh(THREE, {
      name: `deep-holder-${record.id}`, kind, colour: g.colour, noisy: cloud, march, holder: true,
      noise: noiseTexture(THREE, q.tier >= 1 ? 64 : 32), seed: (record.id.length * 0.137) % 1,
    });
    v.mesh.matrixAutoUpdate = false;
    const R = holderMatrix(record, g, v.mesh.matrix);
    v.mesh.matrixWorldNeedsUpdate = true;
    const md = record.meta || {};
    const thick = md.kind === 'galaxy' ? THICK[md.morphology] || 1 : 1;
    // The column through the centre, face on, matches the point glow's centre: the hand-over is level.
    // On T0 the column is the soft profile's, in closed form (gasmat.js SOFT_FRAG): normalised as that.
    const nk = march ? kind : KINDS.soft;
    v.material.uniforms.uNorm.value = peak2d(nk) / Math.max(1e-6, columnJs(nk, thick));
    v.material.uniforms.uGain.value = gain;
    group.add(v.mesh);
    const steps = march ? holderSteps({ tier: q.tier, cloud, thin }) : 0;
    if (march) v.setSteps(steps);
    return { id: record.id, record, glow: g, v, R, march, steps, usedAt: 0, share: 0 };
  }

  function rebuild() {
    builtFor = stage.worldId;
    for (const h of holders.values()) h.v.dispose();
    holders.clear();
    for (const h of heroes.values()) if (h.hero) placeHero(h);
  }

  // ------------------------------------------------------------------------------------- heroes
  function placeHero(h) {
    const rec = env.recordById ? env.recordById(h.def.record) : null;
    if (!rec || !h.hero) return;
    const g = glowFor(rec);
    const m = h.hero.group.matrix;
    h.hero.group.matrixAutoUpdate = false;
    // Object units: 1 ly for a nebula, 100 ly for a galaxy (design section 6).
    if (!centreOf(rec, _v)) return;
    const unitLy = (rec.meta && rec.meta.kind === 'galaxy') ? 100 : 1;
    const s = (unitLy * 9460730472580.8) / stage.unitKm;
    m.makeScale(s, s, s).setPosition(_v);
    h.hero.group.matrixWorldNeedsUpdate = true;
    h.R = g ? g.sizeKm / 2 / stage.unitKm : 0;
  }
  function fetchHero(h) {
    if (h.mod || h.loading) return;
    h.loading = Promise.resolve().then(() => h.def.build()).then((mod) => {
      h.mod = mod;
      const rec = env.recordById ? env.recordById(h.def.record) : null;
      h.hero = mod.createHero(THREE, { profile: h.profile, record: rec, gas });
      group.add(h.hero.group);
      placeHero(h);
    }).catch((e) => console.warn('deep: hero', h.def.id, 'did not load', e)).finally(() => { pending.delete(h.loading); h.loading = null; });
    pending.add(h.loading);
  }
  function dropHero(h) {
    if (h.hero) { h.hero.dispose(); if (h.hero.group.parent) h.hero.group.parent.remove(h.hero.group); }
    h.hero = null; h.mod = null; h.level = 0;
  }

  // -------------------------------------------------------------------------------------- frame
  function frame(info = {}) {
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    const camera = info.camera;
    const now = Number(info.nowMs) || 0;
    const ladder = isLadderStage(stage.worldId);
    group.visible = ladder && info.visible !== false && debugState.gas;
    px.clear();
    if (!camera || !ladder) { lastCalls = 0; return; }
    if (builtFor !== stage.worldId) rebuild();
    const viewH = info.renderer && info.renderer.domElement ? info.renderer.domElement.clientHeight || 800 : 800;
    const fovY = (camera.fov * Math.PI) / 180 / (camera.zoom || 1);
    const q = env.quality ? env.quality() : { tier: 1 };
    const look = env.look ? env.look() : 'film';
    const reduced = env.reduced ? env.reduced() : false;
    const selectedId = env.selectedId ? env.selectedId() : null;
    // Every record's size on screen (209 of them: a few microseconds), and its level.
    const big = [];
    for (const r of env.records ? env.records() : []) {
      const g = glowFor(r);
      const sizeKm = g ? g.sizeKm : (r.meta && r.meta.sizeLy > 0 ? r.meta.sizeLy * 9460730472580.8 : 0);
      if (!(sizeKm > 0) || !centreOf(r, _v)) continue;
      const d = _v.distanceTo(camera.position);
      const rp = projRadius(sizeKm / 2 / stage.unitKm, d, fovY, viewH);
      px.set(r.id, rp);
      const lv = levelFor(Math.min(rp, 1e6), levels.get(r.id) || 0, classOf(r));
      levels.set(r.id, lv);
      if (rp >= HOLD_FROM * 0.8 && g && !(r.meta && r.meta.home === true)) big.push({ r, rp });
    }
    big.sort((a, b) => b.rp - a.rp);

    // A shipped hero's drawn classes go on its record once, for the card and the tag (data/deepsky.js drawnOf).
    for (const h of heroes.values()) {
      if (h.stamped || !h.profile) continue;
      const rec = env.recordById ? env.recordById(h.def.record) : null;
      if (!rec) continue;
      if (h.profile.shipped && Array.isArray(h.profile.drawn) && rec.meta) rec.meta.heroDrawn = h.profile.drawn.slice();
      h.stamped = true;
    }
    // Heroes: shipped (or forced), near enough to fetch, at most two drawn.
    let drawnHeroes = 0;
    const heroIds = new Set();
    for (const h of heroes.values()) {
      const shipped = !!(h.profile && h.profile.shipped) || debugState.force;
      const rp = px.get(h.def.record) || 0;
      const rec = env.recordById ? env.recordById(h.def.record) : null;
      const cls = rec ? classOf(rec) : 'other';
      if (!shipped || !rec) { if (h.hero) dropHero(h); continue; }
      if (rp >= (THRESHOLDS[cls] || THRESHOLDS.other).fetch) fetchHero(h);
      let lv = q.latched ? Math.min(1, levels.get(h.def.record) || 0) : levels.get(h.def.record) || 0;
      if (lv >= 2 && drawnHeroes >= 2) lv = 1;
      if (lv >= 3 && drawnHeroes >= 1) lv = 2; // one costly hero at a time
      const share = fader.to(`hero:${h.def.id}`, lv >= 2 ? 1 : 0, now);
      if (h.hero) {
        const steps = lv >= 3 ? marchSteps({ tier: q.tier, top: q.top, latched: q.latched, scaleStep: q.scaleStep, frameMs: info.frameMs, rPx: rp, selected: selectedId === h.def.record }) : 0;
        h.hero.setLevel(share > 0 ? Math.max(2, lv) : lv, share);
        if (share > 0) {
          h.hero.frame({ camera, rPx: rp, steps, look, reduced, frozen: isFrozen(), dtMs: info.dtMs || 0 });
          drawnHeroes += 1;
          heroIds.add(h.def.record);
          h.idleSince = 0;
        } else if (!h.idleSince) h.idleSince = now;
        else if (now - h.idleSince > HERO_KEEP_MS && lv === 0) dropHero(h);
        h.steps = steps;
      }
      h.level = lv;
    }

    // Holders: the largest objects whose glow is fading and whose photograph is not drawing them.
    const want = new Set();
    if (debugState.holders) {
      for (const { r } of big) {
        if (want.size >= MAX_HOLDERS) break;
        if (heroIds.has(r.id)) continue;
        want.add(r.id);
      }
    }
    for (const id of want) if (!holders.has(id)) { const h = makeHolder(env.recordById ? env.recordById(id) : null); if (h) holders.set(id, h); }
    lastCalls = 0;
    for (const [id, h] of holders) {
      // The latch (or Low) after a holder was built marching: built again as shells next frame.
      if (h.march && q.latched) { h.v.dispose(); holders.delete(id); continue; }
      const rp = px.get(id) || 0;
      const photo = env.pictureShare ? Math.min(1, Math.max(0, env.pictureShare(id) || 0)) : 0;
      const target = want.has(id) ? smooth(rp, HOLD_FROM, HOLD_FULL) * (1 - photo) : 0;
      h.share = fader.to(`holder:${id}`, target, now);
      const u = h.v.material.uniforms;
      u.uShare.value = h.share;
      u.uGain.value = gain;
      h.v.mesh.visible = h.share > 0.002;
      if (h.v.mesh.visible) {
        h.usedAt = now;
        h.v.setCamera(camera, h.R);
        h.v.setLook(look, { reduced, frozen: isFrozen(), dtMs: info.dtMs || 0 });
        lastCalls += 1;
      } else if (now - h.usedAt > HOLDER_KEEP_MS && !want.has(id)) {
        h.v.dispose();
        holders.delete(id);
        fader.forget(`holder:${id}`);
      }
    }
    lastCalls += drawnHeroes;
    lastCpuMs = typeof performance !== 'undefined' ? performance.now() - t0 : 0;
  }

  // --------------------------------------------------------------------------- what others ask
  function pathFor(record, fromTarget, camera) {
    const pid = parentIdOf(record);
    const parent = pid && env.recordById ? env.recordById(pid) : null;
    if (!parent || !camera || !fromTarget) return null;
    const pPx = px.get(pid);
    if (Number.isFinite(pPx) && pPx >= NAME_PARENT_PX) return null; // the parent is already large: a plain flight
    const g = glowFor(parent);
    const sizeKm = g ? g.sizeKm : (parent.meta && parent.meta.sizeLy > 0 ? parent.meta.sizeLy * 9460730472580.8 : 0);
    if (!(sizeKm > 0) || !centreOf(parent, _w) || !centreOf(record, _v)) return null;
    const R = sizeKm / 2 / stage.unitKm;
    const at = enterShare(fromTarget, _v, _w, R);
    if (at === null) return null;
    return parentPath({ apex: parentApexDistance(R, camera.fov), at });
  }

  function ready() {
    if (pending.size) return false;
    for (const h of heroes.values()) if (h.hero && h.level >= 2 && !h.hero.ready()) return false;
    return !(env.picturesBusy && env.picturesBusy());
  }

  return {
    group, frame, rebuild,
    setExposure(k) { gain = Number.isFinite(k) && k > 0 ? k : 1; },
    radiusPx: (id) => (px.has(id) ? px.get(id) : null),
    level: (id) => levels.get(id) || 0,
    nameRule: (record, selectedId, subjectId) => rule(record, { parentPx: px.has(parentIdOf(record)) ? px.get(parentIdOf(record)) : null, selectedId, subjectId }),
    pathFor,
    drawnOf: (record) => { const h = record ? heroOfRecord(record.id) : null; return drawnClasses(record, h ? h.profile : null); },
    hero: (id) => { const h = heroes.get(id); return h ? { id, shipped: !!(h.profile && h.profile.shipped), loaded: !!h.hero, level: h.level } : null; },
    ready,
    whenReady(ms = 20000) {
      const until = Date.now() + ms;
      return new Promise((resolve) => { const tick = () => (ready() ? resolve(true) : Date.now() > until ? resolve(false) : setTimeout(tick, 100)); tick(); });
    },
    stats() {
      return {
        calls: lastCalls,
        cpuMs: Math.round(lastCpuMs * 1000) / 1000,
        holders: [...holders.values()].map((h) => ({ id: h.id, share: Math.round(h.share * 100) / 100, rPx: Math.round(px.get(h.id) || 0), march: h.march, steps: h.steps, kind: h.glow.kind })),
        heroes: [...heroes.values()].map((h) => ({ ...(h.hero ? h.hero.stats() : {}), id: h.def.id, stage: h.def.stage, shipped: !!(h.profile && h.profile.shipped), loaded: !!h.hero, level: h.level, steps: h.steps || 0 })),
        pending: pending.size,
      };
    },
    debug(opts = {}) {
      // `stars` and `dust` are the heroes' own (stage b-d); until a hero ships they switch nothing.
      for (const k of ['gas', 'glow', 'holders', 'force', 'stars', 'dust']) if (k in opts) debugState[k] = !!opts[k];
      if ('glow' in opts && env.glowVisible) env.glowVisible(debugState.glow);
      return { ...debugState };
    },
    debugState: () => ({ ...debugState }),
    dispose() {
      for (const h of holders.values()) h.v.dispose();
      holders.clear();
      for (const h of heroes.values()) dropHero(h);
      disposeNoise();
      if (group.parent) group.parent.remove(group);
    },
  };
}
