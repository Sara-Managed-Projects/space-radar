// scene/figures3d.js -- constellation figures that draw themselves, between the stars' real places.
//
// Contract: createFigures3d(ctx, opts?) -> { ready, show(spec), clear(), update(camera, renderer),
//             namesTheSky(), state(), dispose() }
//   spec = { figures: ['Ori', ...], names: true, stars: 3, ecliptic: false }
//
// OFF THE FIRST VISIT. main.js imports this file the first time a trip names a figure
// (registry/tours.yaml `figures:`), and nothing here runs before that. It reads the two
// constellation files the sky sphere already fetched (the browser's cache answers) and the 3D
// star binary the Stars layer owns (scene/stars3d.js ensureGeometry).
//
// WHAT IS DRAWN, AND HOW HONEST IT IS. A figure is a human convention (cls illustrative, as
// scene/starfield.js says of its own lines); the corners are measured stars. Each corner is the
// brightest star of the 3D catalogue within a third of a degree of the corner the line file
// gives (sky/figures.js placeFigure), at that star's measured distance. From the Sun the lines
// therefore fall exactly on the figure as it is seen from Earth, and from anywhere else they
// come apart as the stars do. That second half is the thing a dome cannot show.
//
// THE STROKE. One instanced quad per segment, widened in screen space, with the segment's share
// of the stroke (t0, t1) as an attribute; the fragment shader discards what the pen has not
// reached. The pen's head is brighter for the last few per cent while it moves. Reduced motion
// draws every figure whole and fades it in.
//
// TWO FRAMES, ONE FIGURE. On a rung of the ladder the corners are true places (one unit = the
// rung's unit). The naked-eye sky sphere (scene/starfield.js) is drawn in the frame the
// satellites live in, which in 2026 is turned about a third of a degree from J2000, and the 3D
// stars are not; registry/lod.yaml crossfades the two. So the figure's group is turned by the
// same small rotation, in proportion to how much of the sky sphere is showing, and its lines sit
// on whichever stars are on screen. On a world's stage the true places are past the far plane,
// and the figure is drawn as directions on a shell round the camera, like the sky sphere.
//
// NAMES. The figure's name where the line file puts it, and its brightest named stars, as DOM
// labels in #labels (the house rule: a name is DOM). At most LABEL_CAP on screen, the figures'
// names first. While any figure is up ui/labels.js stands down (namesTheSky), so a star is never
// named twice.

import * as THREE from '../../vendor/three.module.min.js';
import { stage, isLadderStage, SUN_INERTIAL } from './stage.js';
import { LY_KM } from './stars3d.js';
import {
  parseFigures, placeFigure, brightIndex, figureProgress, eclipticRing, eqToEcl, dirOf, DRAW_MS, STAGGER_MS,
} from '../sky/figures.js';

/** Names on screen at once: docs/ui-guide.md 3.13's cap, which ui/labels.js keeps for itself. */
export const LABEL_CAP = 8;
/** How long a figure that is no longer asked for takes to go, and a new one's names to come. */
export const FADE_MS = 700;
const LINE_PX = 1.5;
const GAP_PX = 10;
/** The naked-eye stars are drawn this much larger while a figure is up: they are the subject. */
export const STAR_SCALE = 2.5;
const LINE_ALPHA = 0.36; // the stroke stops this short of each star, so the star is not painted over
const LINE_COLOUR = '#B9DCF5'; // the UI's "info" ice (--sr-info): an informational mark, not a class
const ECLIPTIC_COLOUR = '#FFC98A'; // the palette's warm night-light: the Sun's road
const SHELL_UNITS = 9e7; // inside scene/stars3d.js's shell, so a figure's star draws over its line
const RENDER_ORDER = -1;

const VERT = /* glsl */ `
attribute vec3 iA;
attribute vec3 iB;
attribute vec2 iT;
uniform vec2 uResolution;
uniform float uWidth;
uniform float uGap;
varying float vT;
varying float vSide;
void main() {
  vec4 a = projectionMatrix * modelViewMatrix * vec4( iA, 1.0 );
  vec4 b = projectionMatrix * modelViewMatrix * vec4( iB, 1.0 );
  vT = mix( iT.x, iT.y, position.x );
  vSide = position.y;
  float near = 1e-6;
  if ( a.w <= near && b.w <= near ) { gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 ); return; }
  // One end behind the camera: bring it to the near side along the segment.
  if ( a.w <= near ) a = mix( a, b, ( near - a.w ) / ( b.w - a.w ) );
  if ( b.w <= near ) b = mix( b, a, ( near - b.w ) / ( a.w - b.w ) );
  vec2 na = a.xy / a.w;
  vec2 nb = b.xy / b.w;
  vec2 d = ( nb - na ) * uResolution * 0.5;
  float len = length( d );
  vec2 dir = len > 1e-4 ? d / len : vec2( 1.0, 0.0 );
  vec2 nrm = vec2( -dir.y, dir.x );
  float gap = min( uGap, len * 0.25 );
  vec2 px = mix( na, nb, position.x ) * uResolution * 0.5
          + dir * gap * ( 1.0 - 2.0 * position.x )
          + nrm * position.y * uWidth;
  gl_Position = vec4( px / ( uResolution * 0.5 ), 0.0, 1.0 );
}
`;

const FRAG = /* glsl */ `
uniform vec3 uColour;
uniform float uProgress;
uniform float uOpacity;
uniform float uHead;
varying float vT;
varying float vSide;
void main() {
  if ( vT > uProgress ) discard;
  float edge = 1.0 - smoothstep( 0.3, 1.0, abs( vSide ) );
  float head = uHead * smoothstep( uProgress - 0.07, uProgress, vT );
  float alpha = edge * uOpacity * ( 1.0 + 2.2 * head );
  if ( alpha <= 0.002 ) discard;
  gl_FragColor = vec4( uColour, alpha );
  #include <colorspace_fragment>
}
`;

function quadGeometry(segments, toLocal) {
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, -1, 0, 1, -1, 0, 0, 1, 0, 1, 1, 0]), 3));
  geo.setIndex([0, 1, 2, 2, 1, 3]);
  const n = segments.length;
  const a = new Float32Array(n * 3);
  const b = new Float32Array(n * 3);
  const tt = new Float32Array(n * 2);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    toLocal(segments[i].a, v); a[i * 3] = v.x; a[i * 3 + 1] = v.y; a[i * 3 + 2] = v.z;
    toLocal(segments[i].b, v); b[i * 3] = v.x; b[i * 3 + 1] = v.y; b[i * 3 + 2] = v.z;
    tt[i * 2] = segments[i].t0; tt[i * 2 + 1] = segments[i].t1;
  }
  geo.setAttribute('iA', new THREE.InstancedBufferAttribute(a, 3));
  geo.setAttribute('iB', new THREE.InstancedBufferAttribute(b, 3));
  geo.setAttribute('iT', new THREE.InstancedBufferAttribute(tt, 2));
  geo.instanceCount = n;
  return geo;
}

function lineMaterial(colour) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uWidth: { value: LINE_PX },
      uGap: { value: GAP_PX },
      uColour: { value: new THREE.Color(colour) },
      uProgress: { value: 0 },
      uOpacity: { value: 0 },
      uHead: { value: 1 },
    },
    // The opaque list, like every other piece of sky (scene/starfield.js says why): a material
    // flagged transparent with depthTest off would be drawn over the planets.
    transparent: false,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
}

export function createFigures3d(ctx, opts = {}) {
  const scene = ctx.scene;
  const here = import.meta.url;
  const src = {
    lines: opts.linesJson ?? new URL('../../data/constellations.lines.json', here),
    names: opts.namesJson ?? new URL('../../data/constellation-names.json', here),
  };
  const host = opts.labelHost ?? (typeof document !== 'undefined' ? document.getElementById('labels') : null);
  const reduced = () => !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const group = new THREE.Group(); // the figures: true places on a rung, a shell on a world's stage
  group.name = 'figures3d';
  const skyGroup = new THREE.Group(); // directions only (the ecliptic), always round the camera
  skyGroup.name = 'figures3d:sky';
  scene.add(group, skyGroup);

  let figures = null; // Map id -> parsed figure
  let candidates = null;
  let namedByIndex = new Map(); // star index -> name
  const placed = new Map(); // id -> placeFigure result
  const live = new Map(); // id -> { mesh, order, startedAt, leavingAt, labels }
  let ecliptic = null; // { mesh, on, changedAt }
  let spec = { figures: [], names: true, stars: 3, ecliptic: false };
  let builtFor = null;
  let mode = 'true';
  let failed = null;
  let lastUpdate = 0;

  const ready = (async () => {
    const getJson = async (u) => { const r = await fetch(String(u)); if (!r.ok) throw new Error(`${u}: HTTP ${r.status}`); return r.json(); };
    const [lines, names, data, records] = await Promise.all([
      opts.linesDoc || getJson(src.lines),
      opts.namesDoc || getJson(src.names),
      ctx.stars3d.ensureGeometry(),
      ctx.stars3d.load().catch(() => []),
    ]);
    if (!data) throw new Error('the star distances did not load');
    figures = parseFigures(lines, names);
    candidates = brightIndex(data);
    for (const r of records || []) {
      if (r && r.meta && Number.isFinite(r.meta.starIndex) && r.meta.named && !/^(HIP|HD|Gl|GJ)\b/.test(r.name)) namedByIndex.set(r.meta.starIndex, r.name);
    }
    return true;
  })().catch((e) => { failed = String(e && e.message ? e.message : e); console.warn('figures3d:', e); return false; });

  const _km = { x: 0, y: 0, z: 0 };
  const _o = new THREE.Vector3();
  const _v = new THREE.Vector3();

  /** A place in light-years from the Sun (ecliptic axes) -> this stage's scene, minus the Sun's. */
  function toLocal(ly, out) {
    _km.x = ly[0] * LY_KM; _km.y = ly[1] * LY_KM; _km.z = ly[2] * LY_KM;
    stage.toSceneInto(_km, SUN_INERTIAL, out, stage.tMs);
    out.sub(_o);
    if (mode === 'shell') out.normalize().multiplyScalar(SHELL_UNITS);
    return out;
  }

  function sunOrigin() {
    _km.x = 0; _km.y = 0; _km.z = 0;
    stage.toSceneInto(_km, SUN_INERTIAL, _o, stage.tMs);
  }

  // The rotation from the 3D stars' frame to the sky sphere's, measured: where the sky sphere puts
  // two J2000 directions against where this stage puts the same two.
  const qDelta = new THREE.Quaternion();
  const qTrue = new THREE.Quaternion();
  function measureDelta() {
    const sf = ctx.starfield;
    if (!sf || !sf.group) { qDelta.identity(); return; }
    const basis = [dirOf(0, 0), dirOf(90, 0), dirOf(0, 90)].map((eq) => {
      const e = eqToEcl(eq);
      _km.x = e[0] * LY_KM; _km.y = e[1] * LY_KM; _km.z = e[2] * LY_KM;
      const p = new THREE.Vector3();
      stage.toSceneInto(_km, SUN_INERTIAL, p, stage.tMs);
      return p.sub(_o).normalize();
    });
    // The sky sphere's own local axes are frames.radecToVec's: x to RA 0, y to RA 90, z north.
    qTrue.setFromRotationMatrix(new THREE.Matrix4().makeBasis(basis[0], basis[1], basis[2]));
    qDelta.copy(sf.group.quaternion).multiply(qTrue.clone().invert());
  }

  function disposeMesh(m) {
    if (!m) return;
    if (m.parent) m.parent.remove(m);
    m.geometry.dispose();
    m.material.dispose();
  }

  function buildFigure(id) {
    if (!placed.has(id)) placed.set(id, placeFigure(figures.get(id), candidates));
    const p = placed.get(id);
    const mesh = new THREE.Mesh(quadGeometry(p.segments, toLocal), lineMaterial(LINE_COLOUR));
    mesh.name = `figure:${id}`;
    mesh.frustumCulled = false;
    mesh.renderOrder = RENDER_ORDER;
    group.add(mesh);
    return mesh;
  }

  function buildEcliptic() {
    const ring = eclipticRing(180);
    const segs = [];
    // Dashes: every other step of the ring, so it reads as a drawn road and not a figure's line.
    for (let i = 0; i < ring.length; i += 2) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      segs.push({ a, b, t0: i / ring.length, t1: (i + 1) / ring.length });
    }
    const sf = ctx.starfield;
    const mesh = new THREE.Mesh(
      quadGeometry(segs, (eq, out) => out.set(eq[0], eq[1], eq[2]).multiplyScalar(SHELL_UNITS)),
      lineMaterial(ECLIPTIC_COLOUR),
    );
    mesh.material.uniforms.uGap.value = 0;
    mesh.material.uniforms.uWidth.value = 1.6;
    mesh.material.uniforms.uHead.value = 0;
    mesh.name = 'figure:ecliptic';
    mesh.frustumCulled = false;
    mesh.renderOrder = RENDER_ORDER;
    skyGroup.add(mesh);
    if (sf && sf.group) skyGroup.quaternion.copy(sf.group.quaternion);
    return mesh;
  }

  /** Everything is rebuilt when the stage changes: a place is in this stage's units. */
  function rebuild() {
    const key = `${stage.worldId}`;
    if (key === builtFor) return;
    builtFor = key;
    mode = isLadderStage(stage.worldId) ? 'true' : 'shell';
    sunOrigin();
    measureDelta();
    for (const [id, f] of live) {
      const old = f.mesh;
      f.mesh = buildFigure(id);
      f.mesh.material.uniforms.uProgress.value = old.material.uniforms.uProgress.value;
      f.mesh.material.uniforms.uOpacity.value = old.material.uniforms.uOpacity.value;
      disposeMesh(old);
    }
  }

  // ---- labels ------------------------------------------------------------------------------
  const pool = [];
  function labelNode(i) {
    while (pool.length <= i && host) {
      const node = document.createElement('div');
      node.className = 'label sr-sky-label';
      node.hidden = true;
      host.appendChild(node);
      pool.push({ node, text: '', transform: '', kind: '', opacity: '' });
    }
    return pool[i] || null;
  }

  function labelsOf(id) {
    const p = placed.get(id);
    const out = [];
    if (spec.names !== false) {
      const c = eqToEcl(dirOf(p.centre[0], p.centre[1]));
      out.push({ kind: 'figure', text: p.name, ly: [c[0] * p.medianLy, c[1] * p.medianLy, c[2] * p.medianLy], t: 0.55 });
    }
    const want = Number.isFinite(spec.stars) ? spec.stars : 3;
    let n = 0;
    for (const s of p.stars) {
      if (n >= want) break;
      const name = namedByIndex.get(s.index);
      if (!name) continue;
      // The moment the pen first touches this star.
      let t = 1;
      for (const seg of p.segments) {
        if (seg.a === s.posLy) t = Math.min(t, seg.t0);
        if (seg.b === s.posLy) t = Math.min(t, seg.t1);
      }
      out.push({ kind: 'star', text: name, ly: s.posLy, t, mag: s.mag });
      n++;
    }
    return out;
  }

  function now() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }

  /**
   * Ask for a set of figures. One already up stays as it is; a new one starts its stroke now,
   * STAGGER_MS after the one before it in the list; one no longer named fades out. Safe to call
   * before `ready`: the last spec asked for is the one applied when the data lands.
   */
  function show(next) {
    spec = { figures: [], names: true, stars: 3, ecliptic: false, ...(next || {}) };
    spec.figures = (spec.figures || []).map(String);
    if (!figures) { ready.then((ok) => { if (ok) apply(); }); return; }
    apply();
  }

  function apply() {
    rebuild();
    const t = now();
    const wanted = new Set(spec.figures.filter((id) => figures.has(id)));
    for (const [id, f] of live) {
      if (!wanted.has(id) && !f.leavingAt) f.leavingAt = t;
      if (wanted.has(id) && f.leavingAt) { f.leavingAt = 0; }
    }
    let order = 0;
    for (const id of spec.figures) {
      if (!wanted.has(id)) continue;
      if (!live.has(id)) {
        live.set(id, { mesh: buildFigure(id), order, startedAt: t, leavingAt: 0, labels: null });
        order++;
      }
      live.get(id).labels = labelsOf(id);
    }
    if (spec.ecliptic && !ecliptic) ecliptic = { mesh: buildEcliptic(), on: true, changedAt: t };
    else if (ecliptic && ecliptic.on !== !!spec.ecliptic) { ecliptic.on = !!spec.ecliptic; ecliptic.changedAt = t; }
  }

  function clear() { show({ figures: [], ecliptic: false }); }

  function skyShare(camera) {
    // How much of the sky sphere is showing where the camera is: registry/lod.yaml's own rule.
    if (mode === 'shell') return 1;
    if (!ctx.lod || typeof ctx.lod.factorFor !== 'function') return 1;
    const distKm = camera.position.distanceTo(_o) * stage.unitKm;
    return ctx.lod.factorFor('sky-from-here', distKm);
  }

  const _q = new THREE.Quaternion();
  const _id = new THREE.Quaternion();
  const _p = new THREE.Vector3();
  const _res = new THREE.Vector2();

  function update(camera, renderer) {
    if (!figures || !camera) return;
    if (`${stage.worldId}` !== builtFor) rebuild();
    const t = now();
    const still = reduced();
    if (renderer && renderer.getDrawingBufferSize) renderer.getDrawingBufferSize(_res);
    const dpr = renderer && renderer.getPixelRatio ? renderer.getPixelRatio() : 1;
    const k = skyShare(camera);
    _q.copy(_id).slerp(qDelta, k);
    group.quaternion.copy(_q);
    if (mode === 'shell') group.position.copy(camera.position);
    else group.position.copy(_o);
    skyGroup.position.copy(camera.position);
    if (ctx.starfield && ctx.starfield.group) skyGroup.quaternion.copy(ctx.starfield.group.quaternion);
    group.updateMatrixWorld(true);

    const shown = [];
    for (const [id, f] of live) {
      const u = f.mesh.material.uniforms;
      const elapsed = t - f.startedAt;
      const progress = figureProgress(elapsed, f.order, { reduced: still, drawMs: DRAW_MS, staggerMs: STAGGER_MS });
      const fadeIn = still ? Math.min(1, elapsed / FADE_MS) : 1;
      const fadeOut = f.leavingAt ? 1 - Math.min(1, (t - f.leavingAt) / FADE_MS) : 1;
      u.uProgress.value = progress;
      u.uOpacity.value = LINE_ALPHA * fadeIn * fadeOut;
      u.uHead.value = progress < 1 && !still ? 1 : 0;
      u.uResolution.value.copy(_res);
      u.uWidth.value = LINE_PX * dpr * lineScale;
      u.uGap.value = GAP_PX * dpr;
      f.mesh.visible = u.uOpacity.value > 0.002;
      f.progress = progress;
      if (f.leavingAt && fadeOut <= 0) { disposeMesh(f.mesh); live.delete(id); continue; }
      if (!f.leavingAt && f.labels) for (const l of f.labels) shown.push({ l, f });
    }
    if (ecliptic) {
      const u = ecliptic.mesh.material.uniforms;
      const kk = Math.min(1, (t - ecliptic.changedAt) / (FADE_MS * 2));
      u.uProgress.value = 1;
      u.uOpacity.value = 0.8 * (ecliptic.on ? kk : 1 - kk);
      u.uResolution.value.copy(_res);
      u.uWidth.value = 1.6 * dpr;
      ecliptic.mesh.visible = u.uOpacity.value > 0.002;
      if (!ecliptic.on && kk >= 1) { disposeMesh(ecliptic.mesh); ecliptic = null; }
    }
    // The stars step forward while a figure is up, and back when the last one has gone.
    const sf = ctx.starfield;
    if (sf && sf.setPointScale) {
      const want = live.size && [...live.values()].some((f) => !f.leavingAt) ? STAR_SCALE : 1;
      const have = sf.pointScale();
      const dtMs = Math.min(500, Math.max(0, t - (lastUpdate || t)));
      if (Math.abs(have - want) > 0.002) sf.setPointScale(have + (want - have) * (1 - Math.exp(-dtMs / 500)));
      else if (have !== want) sf.setPointScale(want);
    }
    lastUpdate = t;
    paintLabels(shown, camera, renderer);
  }

  function paintLabels(shown, camera, renderer) {
    if (!host) return;
    const el = renderer && renderer.domElement;
    const w = (el && el.clientWidth) || (typeof window !== 'undefined' ? window.innerWidth : 0);
    const h = (el && el.clientHeight) || (typeof window !== 'undefined' ? window.innerHeight : 0);
    // Figures' names first, then stars by brightness: the cap takes the faint stars.
    shown.sort((x, y) => (x.l.kind === y.l.kind ? (x.l.mag || 0) - (y.l.mag || 0) : x.l.kind === 'figure' ? -1 : 1));
    let used = 0;
    for (const { l, f } of shown) {
      if (used >= LABEL_CAP) break;
      toLocal(l.ly, _p).applyQuaternion(group.quaternion).add(group.position).project(camera);
      if (!(_p.z < 1) || Math.abs(_p.x) > 0.96 || Math.abs(_p.y) > 0.92) continue;
      const slot = labelNode(used++);
      if (!slot) break;
      const x = ((_p.x + 1) / 2) * w;
      const y = ((1 - _p.y) / 2) * h;
      const tr = l.kind === 'figure'
        ? `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`
        : `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(10px, -50%)`;
      if (slot.text !== l.text) { slot.text = l.text; slot.node.textContent = l.text; }
      if (slot.kind !== l.kind) { slot.kind = l.kind; slot.node.dataset.sky = l.kind; }
      if (slot.transform !== tr) { slot.transform = tr; slot.node.style.transform = tr; }
      const op = f.progress >= l.t ? '1' : '0';
      if (slot.opacity !== op) { slot.opacity = op; slot.node.style.opacity = op; }
      if (slot.node.hidden) slot.node.hidden = false;
    }
    for (let i = used; i < pool.length; i++) {
      if (!pool[i].node.hidden) { pool[i].node.hidden = true; pool[i].opacity = ''; pool[i].node.style.opacity = '0'; }
    }
  }

  function dispose() {
    for (const f of live.values()) disposeMesh(f.mesh);
    live.clear();
    if (ctx.starfield && ctx.starfield.setPointScale) ctx.starfield.setPointScale(1);
    if (ecliptic) disposeMesh(ecliptic.mesh);
    ecliptic = null;
    for (const s of pool) s.node.remove();
    pool.length = 0;
    scene.remove(group, skyGroup);
  }

  // A PICTURE'S OWN LINE WIDTH (internal #444). A figure's line is 1.5 px whatever the frame, which
  // reads on a screen and is a hair in a 1200 px share picture shown 300 px wide in a chat. The
  // width is set every frame here, so nothing outside can hold it: tools/trip-frames.probe.js asks
  // for a multiple while it draws a picture and puts it back. Never used by the app itself.
  let lineScale = 1;
  const setLineScale = (k) => { lineScale = Number.isFinite(k) && k > 0 ? Math.min(6, k) : 1; };

  return {
    setLineScale,
    ready,
    show,
    clear,
    update,
    dispose,
    /** True while a figure is up: ui/labels.js names nothing then, so no star is named twice. */
    namesTheSky: () => [...live.values()].some((f) => !f.leavingAt),
    /** For a browser check: what is up, how far each stroke has got, and what is not a measured star. */
    state: () => ({
      ready: !!figures,
      failed,
      mode,
      ecliptic: !!(ecliptic && ecliptic.on),
      figures: [...live.entries()].map(([id, f]) => ({
        id, progress: f.progress || 0, leaving: !!f.leavingAt,
        segments: placed.get(id).segments.length, unplaced: placed.get(id).unplaced, medianLy: placed.get(id).medianLy,
      })),
      labels: pool.filter((s) => !s.node.hidden).map((s) => s.text),
    }),
    group,
  };
}
