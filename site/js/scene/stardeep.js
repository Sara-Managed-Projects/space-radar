// scene/stardeep.js -- the 3D star map and the orbital view's stars over deep time, and their variable stars on the
// clock (forge #141, #142; release 2.0.0 batch c2-deep). Batch f3-stars did both for the sky from the ground only.
//
// Contract: attachStarDeep(ctx, clock) -> { state(), dispose() }   main.js, once, after the first visit
//   Pure, for tests/test_stardeep.mjs:
//   patchStarShader(src, kind) -> src        kind 'stars3d' | 'starfield': the vertex shader with the motion and the variables in
//   eqToEcl(v), eclToEq(v) -> [x, y, z]      J2000, the obliquity scene/blackhole.js and frames.js use
//   driftOf(m, k, out) -> out                 star k's space velocity over its distance, a year (equatorial): the shell's motion
//   matchStars(dirs, n, motion, m, tolDeg) -> Int32Array   each drawn star's motion record, or -1
//   distanceAt(m, k, years) -> light-years   star k's distance from the Sun then (modelled)
//   SHELL_UNITS                               scene/stars3d.js's shell radius
//
// ON THE GPU. The ground sky moves its stars on the CPU (sky/skyepoch.js), a few thousand points. The 3D map is 109 389
// and the orbital sky 5 044, drawn every frame on phones, so here each star gets one more attribute once, `aMove` (its
// motion a year in the scene's own units; w = 1 where data/starmotion.bin measured it), and the vertex shader puts it
// at `position + aMove.xyz * uYears`. A frame costs two uniforms. On the shell (a world stage) the motion is the
// velocity over the distance, so the shader's normalize() gives the direction a straight line in space is seen in from
// the Sun, exactly sky/starmotion.js moveOne(); on a rung of the ladder it is the true place on that line.
//
// WHAT MOVES AND WHAT DOES NOT, as the ground sky: the 17 207 stars of data/starmotion.bin (to magnitude 7, everything
// faster than half an arcsecond a year, everything within 6.2 pc), matched to the drawn ones by direction (within 0.02
// degrees, matchStars below). Past HIDE_UNMOVED_YEARS from J2000 a star with no measured motion is not
// drawn rather than drawn where it is today. The motions are MEASURED; carrying them for millennia is MODELLED; the
// line under the time bar says both whenever the stars are moved, and the sky view keeps its own readout.
//
// TAPS. A tap is matched on the CPU against the position buffer (scene/pickindex.js), which the shader's motion does not
// touch. So when the clock has stood still for SETTLE_MS the moved places are written into the buffer once (one
// upload) and the shader carries on from there: a star is tapped where it is drawn. A hidden star is never tapped.
//
// THE VARIABLES. data/variables.json's 58 stars at sky/variables.js magAt() of the clock: on the 3D map one more
// attribute, `aDMag` (added to the catalogue's magnitude in the shader, only the 58 entries uploaded); on the orbital
// sky their size and alpha (scene/starfield.js magToSize, magToAlpha). Further than VAR_YEARS from now, and for an
// irregular star, the catalogue's own. Nothing animates by itself: reduced motion has nothing to stop.

import * as THREE from '../../vendor/three.module.min.js';
import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.stars.js';
import '../copy/en.deep.js';
import { motionYears, parseMotion } from '../sky/starmotion.js';
import { HIDE_UNMOVED_YEARS } from '../sky/skyepoch.js';
import { magAt, VAR_YEARS } from '../sky/variables.js';
import { yearOf, yearWords } from '../ui/deeptime.js';
import { magToSize, magToAlpha } from './starfield.js';
import { loadCss } from '../ui/latercss.js';

export const SHELL_UNITS = 1e8; // scene/stars3d.js SHELL_UNITS
const LY_KM = 9460730472580.8;
const OBL = 23.4392911 * Math.PI / 180;
const POLL_MS = 1500;
const SETTLE_MS = 600;
const MATCH_TOL_DEG = 0.02;
const VAR_TOL_COS = Math.cos(0.05 * Math.PI / 180);
const YEAR_MS = 365.25 * 86400e3;

export const eqToEcl = (v) => [v[0], v[1] * Math.cos(OBL) + v[2] * Math.sin(OBL), -v[1] * Math.sin(OBL) + v[2] * Math.cos(OBL)];
export const eclToEq = (v) => [v[0], v[1] * Math.cos(OBL) - v[2] * Math.sin(OBL), v[1] * Math.sin(OBL) + v[2] * Math.cos(OBL)];

/** Star k's distance from the Sun, light-years, `years` after J2000 along its straight line in space. Pure. */
export function distanceAt(m, k, years) {
  return Math.hypot(m.dir[k * 3] * m.dist[k] + m.vel[k * 3] * years, m.dir[k * 3 + 1] * m.dist[k] + m.vel[k * 3 + 1] * years, m.dir[k * 3 + 2] * m.dist[k] + m.vel[k * 3 + 2] * years);
}

/** Star k's velocity over its distance (a year, equatorial, unitless): direction(y) = normalize(dir + y * this). */
export function driftOf(m, k, out = [0, 0, 0]) {
  const d = m.dist[k];
  out[0] = m.vel[k * 3] / d; out[1] = m.vel[k * 3 + 1] / d; out[2] = m.vel[k * 3 + 2] / d;
  return out;
}

/**
 * For each of `n` unit directions in `dirs`, the index of the nearest of the `m` in `motion` within `tolDeg`, else -1.
 * A grid of the drawn stars on the unit cube (a cell 0.01 wide, integer keys) asked once for each motion star: 17 207
 * questions of 27 cells, where asking for each of 109 389 drawn stars with sky/starmotion.js's string-keyed matcher
 * was 2.9 million string keys, seconds on a phone. When two motion stars fall on one point, the nearer wins. Pure.
 */
export function matchStars(dirs, n, motion, m, tolDeg) {
  const CELL = 0.01;
  const key = (a, b, c) => ((a + 128) * 256 + (b + 128)) * 256 + (c + 128);
  const grid = new Map();
  for (let i = 0; i < n; i += 1) {
    const k = key(Math.floor(dirs[i * 3] / CELL), Math.floor(dirs[i * 3 + 1] / CELL), Math.floor(dirs[i * 3 + 2] / CELL));
    const list = grid.get(k);
    if (list) list.push(i); else grid.set(k, [i]);
  }
  const chord = 2 * Math.sin((Math.min(0.5, tolDeg) * Math.PI / 180) / 2);
  const out = new Int32Array(n).fill(-1);
  const best = new Float64Array(n).fill(chord * chord);
  for (let j = 0; j < m; j += 1) {
    const x = motion[j * 3], y = motion[j * 3 + 1], z = motion[j * 3 + 2];
    const ci = Math.floor(x / CELL), cj = Math.floor(y / CELL), ck = Math.floor(z / CELL);
    for (let a = -1; a <= 1; a += 1) for (let b = -1; b <= 1; b += 1) for (let c = -1; c <= 1; c += 1) {
      const list = grid.get(key(ci + a, cj + b, ck + c));
      if (!list) continue;
      for (const i of list) {
        const dx = x - dirs[i * 3], dy = y - dirs[i * 3 + 1], dz = z - dirs[i * 3 + 2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 <= best[i]) { best[i] = d2; out[i] = j; }
      }
    }
  }
  return out;
}

const HEAD = 'attribute vec4 aMove;\nattribute float aDMag;\nuniform float uYears;\nuniform float uHideUnmoved;\n';

/** The star shader with the motion (and, on the 3D map, the variables) in. Throws on a shader it does not know. */
export function patchStarShader(src, kind) {
  const at = 'vec4 mv = modelViewMatrix * vec4( position, 1.0 );';
  if (!src.includes(at)) throw new Error('stardeep: not the star shader it was written for');
  let out = src;
  if (kind === 'stars3d') {
    out = out.replace(at, `vec3 srP = position + aMove.xyz * uYears;\n  if ( uShell > 0.5 ) srP = normalize( srP ) * ${SHELL_UNITS.toExponential(1)};\n  vec4 mv = modelViewMatrix * vec4( srP, 1.0 );`)
      .replace('m = aAppMag;', 'm = aAppMag + aDMag;')
      .replace('length( position - cameraPosition )', 'length( srP - cameraPosition )')
      .replace('m = aAbsMag + 5.0', 'm = aAbsMag + aDMag + 5.0');
  } else {
    out = out.replace(at, 'vec4 mv = modelViewMatrix * vec4( normalize( position + aMove.xyz * uYears ), 1.0 );');
  }
  const end = out.lastIndexOf('}');
  out = out.slice(0, end) + '  if ( uHideUnmoved > 0.5 && aMove.w < 0.5 ) vAlpha = 0.0;\n' + out.slice(end);
  return HEAD + out;
}

function patchMaterial(mat, kind) {
  if (!mat || mat.userData.starDeep) return;
  mat.vertexShader = patchStarShader(mat.vertexShader, kind);
  mat.uniforms.uYears = { value: 0 };
  mat.uniforms.uHideUnmoved = { value: 0 };
  mat.userData.starDeep = true;
  mat.needsUpdate = true;
}

function addAttrs(geo, n) {
  const mv = new Float32Array(n * 4);
  for (let i = 0; i < n; i += 1) mv[i * 4 + 3] = 1; // until the motions load, every star counts as moved (nothing hides)
  geo.setAttribute('aMove', new THREE.BufferAttribute(mv, 4));
  geo.setAttribute('aDMag', new THREE.BufferAttribute(new Float32Array(n), 1));
}

export function attachStarDeep(ctx, clock) {
  const st = { stars3d: null, sky: null, motion: null, vars: null, years: 0, hide: false, settledAt: 0, line: null, lineText: '' };
  let motionAsked = false;
  let varsAsked = false;
  const here = import.meta.url;

  function askMotion() {
    if (motionAsked) return;
    motionAsked = true;
    fetch(new URL('../../data/starmotion.bin', here)).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((buf) => { const m = parseMotion(buf); st.motion = { m }; if (st.stars3d) st.stars3d.builtFor = null; if (st.sky) fillSky(); })
      .catch((e) => { motionAsked = false; console.warn('stardeep: the star motions did not load', e); });
  }
  function askVars() {
    if (varsAsked) return;
    varsAsked = true;
    fetch(new URL('../../data/variables.json', here)).then((r) => (r.ok ? r.json() : null))
      .then((d) => { st.vars = (d && Array.isArray(d.rows) ? d.rows : []).filter((r) => Number.isFinite(r.ra) && Number.isFinite(r.dec)); })
      .catch(() => { st.vars = []; });
  }
  const radec = (ra, dec) => { const a = ra * Math.PI / 180, d = dec * Math.PI / 180; return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)]; };

  // ---- the 3D map --------------------------------------------------------------------------------------------------
  function bindStars3d(points) {
    const geo = points.geometry;
    const n = geo.getAttribute('position').count;
    addAttrs(geo, n);
    const sun = points.parent && points.parent.getObjectByName('stars3d:sun');
    if (sun) addAttrs(sun.geometry, 1);
    patchMaterial(points.material, 'stars3d');
    const s = { points, geo, n, idx: null, base: 0, version: -1, builtFor: null, varIdx: null, varMag: null, catMag: null, lastVarT: NaN };
    st.stars3d = s;
    // A star the shader hides is not tapped either (TAPS above).
    const api = ctx.stars3d;
    const pick = api.pickAll;
    api.pickAll = (...a) => {
      const out = pick(...a);
      if (!st.hide || !s.idx) return out;
      return out.filter((p) => { const i = p.record && p.record.meta ? p.record.meta.starIndex : -1; return !(i >= 0 && i < s.n) || s.idx[i] >= 0; });
    };
    chain(points, () => frameStars3d(s));
    askVars();
  }

  /** aMove for the stage the buffer was last built for (a rung's true places, or a world stage's shell). */
  function fillStars3d(s) {
    const { m } = st.motion;
    const pos = s.geo.getAttribute('position').array;
    if (!s.idx) {
      // The match is by J2000 direction from the Sun: the binary's own light-year places (stars3d data.posLy), not the
      // buffer, which is the stage's. stars3d keeps them; the direction of the buffer is the same on a rung, so the
      // buffer is read once while the clock is at J2000's places (base 0) and matched in equatorial axes.
      const sunAt = new THREE.Vector3();
      if (ctx.stars3d.mode() !== 'shell') ctx.stage.toSceneInto({ x: 0, y: 0, z: 0 }, 'sun-inertial', sunAt);
      const R = sceneRotation();
      const eq = new Float32Array(s.n * 3);
      for (let i = 0; i < s.n; i += 1) {
        const e = R.toEcl([pos[i * 3] - sunAt.x, pos[i * 3 + 1] - sunAt.y, pos[i * 3 + 2] - sunAt.z]);
        const q = eclToEq(e);
        const l = Math.hypot(q[0], q[1], q[2]) || 1;
        eq[i * 3] = q[0] / l; eq[i * 3 + 1] = q[1] / l; eq[i * 3 + 2] = q[2] / l;
      }
      s.idx = matchStars(eq, s.n, m.dir, m.count, MATCH_TOL_DEG);
    }
    const R = sceneRotation();
    const shell = ctx.stars3d.mode() === 'shell';
    const k = shell ? SHELL_UNITS : LY_KM / ctx.stage.unitKm;
    const mv = s.geo.getAttribute('aMove');
    const a = mv.array;
    const d = [0, 0, 0];
    for (let i = 0; i < s.n; i += 1) {
      const j = s.idx[i];
      if (j < 0) { a[i * 4] = a[i * 4 + 1] = a[i * 4 + 2] = 0; a[i * 4 + 3] = 0; continue; }
      if (shell) driftOf(m, j, d); else { d[0] = m.vel[j * 3]; d[1] = m.vel[j * 3 + 1]; d[2] = m.vel[j * 3 + 2]; }
      const sc = R.toScene(eqToEcl(d));
      a[i * 4] = sc[0] * k; a[i * 4 + 1] = sc[1] * k; a[i * 4 + 2] = sc[2] * k; a[i * 4 + 3] = 1;
    }
    mv.needsUpdate = true;
  }

  /** The stage's rotation from sun-inertial (ecliptic J2000) axes into the scene's, and back. */
  function sceneRotation() {
    const cols = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((u) => {
      const v = ctx.stage.dirToScene({ x: u[0], y: u[1], z: u[2] }, 'sun-inertial', new THREE.Vector3());
      return v ? [v.x, v.y, v.z] : u;
    });
    return {
      toScene: (e) => [0, 1, 2].map((r) => cols[0][r] * e[0] + cols[1][r] * e[1] + cols[2][r] * e[2]),
      toEcl: (v) => cols.map((c) => c[0] * v[0] + c[1] * v[1] + c[2] * v[2]),
    };
  }

  function frameStars3d(s) {
    const u = s.points.material.uniforms;
    const posAttr = s.geo.getAttribute('position');
    // stars3d rebuilt its buffer (a stage change): the catalogue's places again, so the base is J2000 and the motions
    // are worked out again in the new stage's units.
    if (posAttr.version !== s.version) {
      s.version = posAttr.version;
      s.base = 0;
      s.builtFor = null;
      s.idx = null;
    }
    if (st.motion && s.builtFor !== `${ctx.stage.worldId}:${ctx.stars3d.mode()}`) {
      s.builtFor = `${ctx.stage.worldId}:${ctx.stars3d.mode()}`;
      fillStars3d(s);
    }
    u.uYears.value = st.motion ? st.years - s.base : 0;
    u.uHideUnmoved.value = st.motion && st.hide ? 1 : 0;
    // Settled: write the moved places into the buffer once, for the taps.
    if (st.motion && s.idx && st.years !== s.base && performance.now() - st.settledAt > SETTLE_MS) {
      const dy = st.years - s.base;
      const p = posAttr.array;
      const a = s.geo.getAttribute('aMove').array;
      for (let i = 0; i < s.n; i += 1) {
        if (s.idx[i] < 0) continue;
        p[i * 3] += a[i * 4] * dy; p[i * 3 + 1] += a[i * 4 + 1] * dy; p[i * 3 + 2] += a[i * 4 + 2] * dy;
      }
      posAttr.needsUpdate = true;
      s.version = posAttr.version;
      s.base = st.years;
      u.uYears.value = 0;
    }
    varStars3d(s);
  }

  function varStars3d(s) {
    if (!st.vars || !st.vars.length) return;
    const tMs = clock.now();
    if (!s.varIdx) {
      const pos = s.geo.getAttribute('position').array;
      const app = s.geo.getAttribute('aAppMag').array;
      const dirs = st.vars.map((r) => eqToEcl(radec(r.ra, r.dec)));
      const R = sceneRotation();
      const sunAt = new THREE.Vector3();
      if (ctx.stars3d.mode() !== 'shell') ctx.stage.toSceneInto({ x: 0, y: 0, z: 0 }, 'sun-inertial', sunAt);
      s.varIdx = new Int32Array(dirs.length).fill(-1);
      s.catMag = new Float32Array(dirs.length);
      const best = new Float32Array(dirs.length).fill(99);
      for (let i = 0; i < s.n; i += 1) {
        if (app[i] > 8) continue;
        const e = R.toEcl([pos[i * 3] - sunAt.x, pos[i * 3 + 1] - sunAt.y, pos[i * 3 + 2] - sunAt.z]);
        const l = Math.hypot(e[0], e[1], e[2]) || 1;
        for (let k = 0; k < dirs.length; k += 1) {
          const d = dirs[k];
          if ((e[0] * d[0] + e[1] * d[1] + e[2] * d[2]) / l < VAR_TOL_COS || app[i] >= best[k]) continue;
          best[k] = app[i]; s.varIdx[k] = i; s.catMag[k] = app[i];
        }
      }
    }
    if (Math.abs(tMs - s.lastVarT) < 60e3) return; // a minute of the clock moves Algol by a hundredth of a magnitude
    s.lastVarT = tMs;
    const near = Math.abs(tMs - Date.now()) <= VAR_YEARS * YEAR_MS;
    const dm = s.geo.getAttribute('aDMag');
    dm.clearUpdateRanges();
    st.vars.forEach((row, k) => {
      const i = s.varIdx[k];
      if (i < 0) return;
      const v = near ? magAt(row, tMs) : null;
      const delta = v === null ? 0 : v - s.catMag[k];
      if (dm.array[i] === delta) return;
      dm.array[i] = delta;
      dm.addUpdateRange(i, 1);
    });
    dm.needsUpdate = true;
  }

  // ---- the orbital view's naked-eye sky ----------------------------------------------------------------------------
  function bindSky(points) {
    const geo = points.geometry;
    const n = geo.getAttribute('position').count;
    addAttrs(geo, n);
    patchMaterial(points.material, 'starfield');
    st.sky = { points, geo, n, varIdx: null, size0: null, alpha0: null, lastVarT: NaN };
    if (st.motion) fillSky();
    chain(points, () => frameSky(st.sky));
    askVars();
  }

  function fillSky() {
    const s = st.sky;
    const { m } = st.motion;
    const pos = s.geo.getAttribute('position').array;
    const mv = s.geo.getAttribute('aMove');
    const d = [0, 0, 0];
    const idx = matchStars(pos, s.n, m.dir, m.count, MATCH_TOL_DEG);
    for (let i = 0; i < s.n; i += 1) {
      const j = idx[i];
      if (j < 0) { mv.array[i * 4 + 3] = 0; continue; }
      driftOf(m, j, d);
      mv.array[i * 4] = d[0]; mv.array[i * 4 + 1] = d[1]; mv.array[i * 4 + 2] = d[2]; mv.array[i * 4 + 3] = 1;
    }
    mv.needsUpdate = true;
  }

  function frameSky(s) {
    const u = s.points.material.uniforms;
    u.uYears.value = st.motion ? st.years : 0;
    u.uHideUnmoved.value = st.motion && st.hide ? 1 : 0;
    if (!st.vars || !st.vars.length) return;
    const tMs = clock.now();
    const size = s.geo.getAttribute('aSize');
    const alpha = s.geo.getAttribute('aAlpha');
    if (!s.varIdx) {
      const pos = s.geo.getAttribute('position').array;
      s.size0 = size.array.slice();
      s.alpha0 = alpha.array.slice();
      s.varIdx = st.vars.map((r) => {
        const d = radec(r.ra, r.dec);
        let best = -1;
        for (let i = 0; i < s.n; i += 1) {
          if (pos[i * 3] * d[0] + pos[i * 3 + 1] * d[1] + pos[i * 3 + 2] * d[2] < VAR_TOL_COS) continue;
          if (best < 0 || s.size0[i] > s.size0[best]) best = i;
        }
        return best;
      });
    }
    if (Math.abs(tMs - s.lastVarT) < 60e3) return;
    s.lastVarT = tMs;
    const near = Math.abs(tMs - Date.now()) <= VAR_YEARS * YEAR_MS;
    size.clearUpdateRanges(); alpha.clearUpdateRanges();
    st.vars.forEach((row, k) => {
      const i = s.varIdx[k];
      if (i < 0) return;
      const v = near ? magAt(row, tMs) : null;
      size.array[i] = v === null ? s.size0[i] : magToSize(v);
      alpha.array[i] = v === null ? s.alpha0[i] : magToAlpha(v);
      size.addUpdateRange(i, 1); alpha.addUpdateRange(i, 1);
    });
    size.needsUpdate = true; alpha.needsUpdate = true;
  }

  // ---- once a frame: the clock, and the line that says what is drawn ------------------------------------------------
  function chain(obj, fn) {
    const before = obj.onBeforeRender;
    obj.onBeforeRender = function onBeforeRender(...a) { tick(); fn(); return before.apply(this, a); };
  }
  let tickedAt = -1;
  function tick() {
    const now = performance.now();
    if (now === tickedAt) return;
    tickedAt = now;
    const tMs = clock.now();
    const years = motionYears(tMs, Date.now());
    if (years !== st.years) { st.years = years; st.settledAt = now; }
    if (years) askMotion();
    st.hide = Math.abs(years) > HIDE_UNMOVED_YEARS;
    paintLine(tMs);
  }

  // THE SELECTED STAR'S DISTANCE THEN. A card, its label and its tag give the catalogue's distance (today's), and the
  // star's disc stays at its catalogue place; the line says so, and gives the distance at the clock's date from the same
  // straight line in space the points move along (MODELLED): Barnard's Star 3.77 light-years in AD 11 800, not 5.96.
  let selected = null;
  const motionOf = new WeakMap(); // record -> its motion record, or -1
  window.addEventListener('sr:select', (e) => { selected = e && e.detail && e.detail.klass === 'star' ? e.detail : null; st.lineText = null; });
  function selectedDistance() {
    if (!selected || !selected.pos || !st.motion) return null;
    const { m } = st.motion;
    if (!motionOf.has(selected)) {
      const p = selected.pos;
      const q = eclToEq([p.x, p.y, p.z]);
      const l = Math.hypot(q[0], q[1], q[2]) || 1;
      motionOf.set(selected, matchStars(new Float32Array([q[0] / l, q[1] / l, q[2] / l]), 1, m.dir, m.count, MATCH_TOL_DEG)[0]);
    }
    const j = motionOf.get(selected);
    if (!(j >= 0)) return null;
    return { name: selected.name, thenLy: distanceAt(m, j, st.years), todayLy: Number(selected.meta && selected.meta.distLy) || m.dist[j] };
  }

  function paintLine(tMs) {
    const show = !!st.years && !!st.motion && !(ctx.skyView && ctx.skyView.active);
    const near = show ? selectedDistance() : null;
    const text = show ? [t(COPY.starDeep.moved, { year: yearWords(yearOf(tMs), COPY.deepTime) }), st.hide ? COPY.starDeep.hidden : '',
      Math.abs(yearOf(tMs) - 2000) < 2000 ? '' : COPY.starDeep.noPluto,
      near ? t(COPY.starDeep.selected, { name: near.name, d: fmt.smart(near.thenLy), today: fmt.smart(near.todayLy) }) : ''].filter(Boolean).join(' ') : '';
    if (text === st.lineText) return;
    st.lineText = text;
    if (!st.line && text) {
      loadCss('deep');
      st.line = document.createElement('p');
      st.line.className = 'sr-stardeep';
      st.line.setAttribute('role', 'status');
      document.body.appendChild(st.line);
    }
    if (st.line) { st.line.textContent = text; st.line.hidden = !text; }
  }

  // The two star layers arrive in their own time (the 3D map's 2.6 MB binary only when a star could be seen): looked
  // for every POLL_MS until both are bound, which is nothing a frame.
  const poll = setInterval(() => {
    if (!st.stars3d && ctx.stars3d && ctx.stars3d.group) {
      // The group is named 'stars3d' too: the Points is its child of that name.
      const p = ctx.stars3d.group.children.find((o) => o.isPoints && o.name === 'stars3d');
      if (p) bindStars3d(p);
    }
    if (!st.sky && ctx.starfield && ctx.starfield.group) {
      const p = ctx.starfield.group.children.find((o) => o.isPoints && o.name === 'stars');
      if (p) bindSky(p);
    }
    if (st.stars3d && st.sky) clearInterval(poll);
    tick();
  }, POLL_MS);

  return {
    state: () => ({
      years: st.years, hide: st.hide, motion: !!st.motion, line: st.lineText,
      stars3d: st.stars3d ? { bound: true, moved: st.stars3d.idx ? st.stars3d.idx.reduce((n, j) => n + (j >= 0 ? 1 : 0), 0) : 0, base: st.stars3d.base, vars: st.stars3d.varIdx ? st.stars3d.varIdx.filter((i) => i >= 0).length : 0 } : null,
      sky: st.sky ? { bound: true, vars: st.sky.varIdx ? st.sky.varIdx.filter((i) => i >= 0).length : 0 } : null,
    }),
    dispose() { clearInterval(poll); if (st.line) st.line.remove(); },
  };
}
