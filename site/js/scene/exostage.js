// scene/exostage.js -- the plain star stage a drawn world is shown on (internal plan 2026-10-08
// section 4.4, issue #466 phase B).
//
// Contract: createImagineStage(ctx, { scene, onChange }) -> { start(n), show(spec), stop(), render(nowMs),
//   active, setView({ phaseDeg, elevationDeg, fill }), setTier(n), freeze(timeS|null), measure(frames),
//   state(), dispose() }
//
// `#imagine=N` opens "An imagined world no. N": an invented planet from scene/exoface.js
// imaginedWorld(), alone with its invented star against a field of stars that is no part of the
// sky. NOTHING HERE IS MEASURED, and the stage says so in words that stay on screen: the tag
// "Artist's impression", the name (never a real planet's), and "Nothing here is measured. The whole
// world is imagined." The link is the only way in: nothing in the app's chrome points here yet.
//
// show({ row }) puts a REAL planet's row on the same stage, under its own label ("Measured: 1.7
// Earth radii, a 25-day year. The surface is imagined."): what the reel renderer (plan 4.5) frames
// before a system has a stage of its own, and what this package's own pictures were taken with.
//
// HOW IT DRAWS. The app's renderer, a scene and a camera of its own: while the stage is up the
// map's scene is hidden and main.js calls render() here after its own, so nothing of the Solar
// System is drawn or paid for. The planet
// is a unit sphere at the origin; its star stands where the row puts it, at its true size in planet
// radii. The stars behind are a seeded scatter of points, the same for the same world.
//
// COST. Fetched by main.js on `#imagine=`, never at boot; css/exoface.css is linked here.

import * as THREE from '../../vendor/three.module.min.js';
import { COPY } from '../copy/en.js';
import '../copy/en.later.js';
import { imaginedWorld, faceFor, createFace, faceWhy, rng, seedOf } from './exoface.js';

const AU_KM = 149597870.7;
const SUN_RADIUS_KM = 695700;
const EARTH_RADIUS_KM = 6371.0;
const FOV_DEG = 30;
/** The default look: the disc 70 % of the frame's shorter side, lit three-quarters. */
export const DEFAULT_VIEW = { phaseDeg: 52, elevationDeg: 14, fill: 0.7 };
const FILL_RANGE = [0.18, 2.4];
const STAR_COUNT = 1600;

function linkCss(doc) {
  try {
    const href = new URL('../../css/exoface.css', import.meta.url).href;
    if ([...doc.querySelectorAll('link[rel=stylesheet]')].some((l) => l.href === href)) return;
    const link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    doc.head.appendChild(link);
  } catch { /* a test's document */ }
}

function el(doc, tag, cls, text) {
  const node = doc.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
}

/** A seeded scatter of points on a far sphere: a backdrop, not the sky. */
function starPoints(seed) {
  const rnd = rng(seed ^ 0x51ed270b);
  const pos = new Float32Array(STAR_COUNT * 3);
  const col = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    const z = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - z * z);
    pos[i * 3] = r * Math.cos(a) * 9e5; pos[i * 3 + 1] = z * 9e5; pos[i * 3 + 2] = r * Math.sin(a) * 9e5;
    const b = 0.1 + 0.9 * rnd() ** 5; // many faint, a few bright
    const warm = rnd();
    col[i * 3] = b * (0.8 + 0.2 * warm); col[i * 3 + 1] = b * 0.86; col[i * 3 + 2] = b * (1 - 0.25 * warm);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, toneMapped: false, depthWrite: false }));
  points.name = 'exostage:stars';
  points.frustumCulled = false;
  return points;
}

function glowSprite(rgb) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const c = canvas.getContext('2d');
  const g = c.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.22)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color().setRGB(rgb[0], rgb[1], rgb[2]), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }));
  sprite.scale.setScalar(5);
  return sprite;
}

export function createImagineStage(ctx, opts = {}) {
  const doc = document;
  const renderer = ctx.renderer;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020305);
  const camera = new THREE.PerspectiveCamera(FOV_DEG, 1.6, 0.05, 4e6);
  const sunDir = new THREE.Vector3(1, 0, 0);
  const north = new THREE.Vector3(0, 1, 0);
  const size = new THREE.Vector2();
  const view = { ...DEFAULT_VIEW };
  let active = false;
  let world = null; // { name, face, handle, star, stars, imagined, n }
  let tier = ctx.quality && Number.isFinite(ctx.quality.tier) ? ctx.quality.tier : 1;
  let frozen = null;
  let ui = null;
  const frames = [];
  let lastMs = 0;

  function reducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch { return false; }
  }

  function clearWorld() {
    if (!world) return;
    world.handle.dispose();
    scene.remove(world.handle.mesh, world.stars, world.star);
    world.stars.geometry.dispose(); world.stars.material.dispose();
    world.star.traverse((o) => { if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } if (o.geometry) o.geometry.dispose(); });
    world = null;
  }

  function build(name, face, extra) {
    clearWorld();
    const handle = createFace(face, { tier, tag: false }); // the label is the stage's own, in the page
    scene.add(handle.mesh);
    const planetKm = face.radiusEarths * EARTH_RADIUS_KM;
    const star = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(...face.star.rgb), toneMapped: false }));
    star.name = 'exostage:star';
    star.position.copy(sunDir).multiplyScalar((face.aAu * AU_KM) / planetKm);
    star.scale.setScalar((face.star.radiusSuns * SUN_RADIUS_KM) / planetKm);
    star.add(glowSprite(face.star.rgb));
    scene.add(star);
    const stars = starPoints(face.seed);
    scene.add(stars);
    world = { name, face, handle, star, stars, ...extra };
    paintUi();
  }

  function ensureUi() {
    if (ui) return;
    linkCss(doc);
    const E = COPY.exoface;
    const root = el(doc, 'section', 'sr-imagine');
    root.setAttribute('aria-label', E.stageLabel);
    const shield = el(doc, 'div', 'sr-imagine__shield');
    const card = el(doc, 'div', 'sr-imagine__card sr-float');
    const tag = el(doc, 'p', 'sr-imagine__tag', E.tag);
    const name = el(doc, 'h2', 'sr-imagine__name');
    const l1 = el(doc, 'p', 'sr-imagine__line');
    const l2 = el(doc, 'p', 'sr-imagine__line');
    const actions = el(doc, 'div', 'sr-imagine__actions');
    const another = el(doc, 'button', 'sr-btn', E.another);
    const back = el(doc, 'button', 'sr-btn sr-btn--quiet', E.back);
    another.type = 'button'; back.type = 'button';
    actions.append(another, back);
    card.append(tag, name, l1, l2, actions);
    root.append(shield, card);
    doc.body.appendChild(root);
    another.addEventListener('click', () => start(world && world.n ? (world.n % 99999) + 1 : 1));
    back.addEventListener('click', () => stop());
    root.addEventListener('keydown', (e) => { if (e.key === 'Escape') stop(); });
    // Drag turns the camera about the world; the wheel and a pinch bring it nearer.
    let drag = null;
    const pinch = new Map();
    let pinch0 = null;
    shield.addEventListener('pointerdown', (e) => {
      shield.setPointerCapture(e.pointerId);
      pinch.set(e.pointerId, [e.clientX, e.clientY]);
      if (pinch.size === 2) { const [a, b] = [...pinch.values()]; pinch0 = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), fill: view.fill }; drag = null; } else drag = { x: e.clientX, y: e.clientY, phase: view.phaseDeg, el: view.elevationDeg };
    });
    shield.addEventListener('pointermove', (e) => {
      if (!pinch.has(e.pointerId)) return;
      pinch.set(e.pointerId, [e.clientX, e.clientY]);
      if (pinch.size === 2 && pinch0) {
        const [a, b] = [...pinch.values()];
        setView({ fill: pinch0.fill * (Math.hypot(a[0] - b[0], a[1] - b[1]) / Math.max(pinch0.d, 1)) });
      } else if (drag) {
        setView({ phaseDeg: drag.phase - (e.clientX - drag.x) * 0.3, elevationDeg: drag.el + (e.clientY - drag.y) * 0.3 });
      }
    });
    const up = (e) => { pinch.delete(e.pointerId); pinch0 = null; drag = null; };
    shield.addEventListener('pointerup', up);
    shield.addEventListener('pointercancel', up);
    shield.addEventListener('wheel', (e) => { e.preventDefault(); setView({ fill: view.fill * Math.exp(-e.deltaY * 0.0012) }); }, { passive: false });
    ui = { root, name, l1, l2, another, back };
  }

  function paintUi() {
    if (!ui || !world) return;
    const label = world.handle.label;
    ui.name.textContent = world.name;
    ui.l1.textContent = label.measured;
    ui.l2.textContent = label.imagined;
    ui.another.hidden = !world.imagined;
  }

  function setActive(on) {
    active = on;
    // The map's scene is not drawn while the stage is up: main.js's render() then only clears.
    if (opts.scene) opts.scene.visible = !on;
    doc.documentElement.classList.toggle('sr-imagine-on', on);
    if (ui) ui.root.hidden = !on;
  }

  /** Open an imagined world by its number. */
  function start(n) {
    const w = imaginedWorld(n);
    ensureUi();
    build(w.name, w.face, { imagined: true, n: w.n });
    setActive(true);
    if (typeof opts.onChange === 'function') opts.onChange(w.n);
    return state();
  }

  /** Put a real planet's row on the stage, under its own label. Not reachable by a link. */
  function show(spec) {
    const face = spec.face || faceFor(spec.row);
    ensureUi();
    build(spec.name || face.name, face, { imagined: !!face.imagined, n: null });
    setActive(true);
    return state();
  }

  function stop() {
    if (!active) return;
    setActive(false);
    clearWorld();
    if (typeof opts.onChange === 'function') opts.onChange(null);
  }

  function setView(v = {}) {
    if (Number.isFinite(v.phaseDeg)) view.phaseDeg = ((v.phaseDeg % 360) + 360) % 360;
    if (Number.isFinite(v.elevationDeg)) view.elevationDeg = Math.min(80, Math.max(-80, v.elevationDeg));
    if (Number.isFinite(v.fill)) view.fill = Math.min(FILL_RANGE[1], Math.max(FILL_RANGE[0], v.fill));
    if (v.by) view.by = v.by;
    return { ...view };
  }

  function setTier(n) {
    tier = Math.min(2, Math.max(0, n | 0));
    if (world) world.handle.setTier(tier);
  }

  function place() {
    renderer.getSize(size);
    const aspect = size.x / Math.max(size.y, 1);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    // The disc's diameter as a share of the frame's shorter side (or of its height, when asked).
    const share = view.by === 'height' || aspect >= 1 ? view.fill : view.fill * aspect;
    const half = Math.tan((FOV_DEG * Math.PI) / 360);
    const dist = 1 / Math.sin(Math.atan(share * half));
    const ph = (view.phaseDeg * Math.PI) / 180, e = (view.elevationDeg * Math.PI) / 180;
    camera.position.set(Math.cos(ph) * Math.cos(e), Math.sin(e), Math.sin(ph) * Math.cos(e)).multiplyScalar(dist);
    camera.lookAt(0, 0, 0);
    return size.y;
  }

  function drawOnce(timeS) {
    const viewportH = place();
    world.handle.update({ camera, sunDir, north, timeS, viewportH, still: frozen === null && reducedMotion(), tag: false });
    renderer.render(scene, camera);
  }

  /** One frame, called by main.js's loop in place of its own render while the stage is up. */
  function render(nowMs) {
    if (!active || !world) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Number(nowMs) || 0;
    if (lastMs) { frames.push(now - lastMs); if (frames.length > 120) frames.shift(); }
    lastMs = now;
    drawOnce(frozen === null ? now / 1000 : frozen);
  }

  /**
   * What `frames` frames cost, drawn back to back and waited for (gl.finish and a one-pixel read),
   * in milliseconds a frame: the shader's own cost, whatever the display's pacing is.
   */
  function measure(count = 30) {
    if (!active || !world) return null;
    const gl = renderer.getContext();
    const px = new Uint8Array(4);
    drawOnce(frozen || 0); gl.finish();
    const t0 = performance.now();
    for (let i = 0; i < count; i++) {
      drawOnce((frozen || 0) + i * 0.016);
      gl.finish();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    }
    const ms = (performance.now() - t0) / count;
    // The same loop with the world hidden: what the stars, the clear and the wait cost on their own.
    world.handle.mesh.visible = false;
    const b0 = performance.now();
    for (let i = 0; i < count; i++) { renderer.render(scene, camera); gl.finish(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
    const baseMs = (performance.now() - b0) / count;
    world.handle.mesh.visible = true;
    return { msPerFrame: Math.round(ms * 100) / 100, emptyMsPerFrame: Math.round(baseMs * 100) / 100, frames: count, width: size.x, height: size.y, pixelRatio: renderer.getPixelRatio(), tier, calls: renderer.info.render.calls };
  }

  function state() {
    if (!world) return { active, world: null };
    const f = world.face;
    const sorted = frames.slice().sort((a, b) => a - b);
    return {
      active, name: world.name, n: world.n, imagined: !!world.imagined, tier,
      cls: f.cls, climate: f.climate, eyeball: f.eyeball, locked: f.locked, teqK: Math.round(f.teqK),
      label: world.handle.label, why: faceWhy(f), view: { ...view },
      drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
      medianFrameMs: sorted.length ? sorted[sorted.length >> 1] : null,
    };
  }

  function dispose() {
    stop();
    if (ui) { ui.root.remove(); ui = null; }
  }

  return {
    start, show, stop, render, setView, setTier, measure, state, dispose,
    freeze(timeS) { frozen = timeS === null || timeS === undefined ? null : Number(timeS); },
    get active() { return active; },
    get world() { return world; },
    seedOf,
  };
}
