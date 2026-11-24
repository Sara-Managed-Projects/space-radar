// The one-model viewer: site/model/index.html?id=<id> (docs/EMBEDDING.md, "One 3D model").
//
// WHAT IT LOADS: the site's vendored three.js, its glTF loader and the meshopt decoder (the three files the app's
// scene/realmodels.js loads on demand), ./models.json (scripts/models_catalog.py: id -> name and file) and one .glb
// from ../models/. Nothing else: no app boot, no service worker, no storage, no third-party request.
//
// PARAMETERS (the query string): id (required: a model of ours, models.spaceradar.ai lists them), turn=0 (no
// auto-turn), bg=none (a transparent page, for a frame over the host's own ground), ui=0 (no name bar).
//
// THE CAMERA is a small orbit of its own (three's OrbitControls is not vendored and this needs 60 lines of it): drag
// to turn, wheel or pinch to zoom, arrow keys and +/- with focus, double-click or the reset button to frame it again.
// The slow auto-turn starts only under prefers-reduced-motion: no-preference, stops for good once the reader takes
// the camera, has a pause button (motion over five seconds, WCAG 2.2.2) and stops drawing while the frame is off
// screen or the tab is hidden.
//
// THE WORDS are ./words.js, in the app's eleven languages (?lang=, else the browser's own list; nothing stored).
//
// VIEW IN YOUR ROOM (forge #559): ./arplan.js decides the way in (WebXR on Android; the viewer on its own page when a
// frame may not use the camera; an honest note on iPhone, where Quick Look needs USDZ files we do not make, and
// elsewhere); ./ar.js, fetched with import() only on the press, runs the session with this page's own three.js. No
// third-party request before the press or after it.

import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/meshopt_decoder.module.js';
import { icon } from '../js/ui/icons.js';
import { WORDS, RTL, pickWordsLanguage, fill, metres } from './words.js';
import { arWay, isIOS, sizeLine, topUrl, widest } from './arplan.js';

const q = new URLSearchParams(location.search);
const id = String(q.get('id') || '').trim().toLowerCase();
const $ = (s) => document.getElementById(s);
const msg = $('msg');
const canvas = $('c');
const PAGE = 'https://models.spaceradar.ai/';
const LANG = pickWordsLanguage(location.search, navigator.languages || [navigator.language]);
const W = WORDS[LANG];
if (LANG !== 'en') {
  document.documentElement.lang = LANG === 'zh' ? 'zh-Hans' : LANG;
  if (RTL.includes(LANG)) document.documentElement.dir = 'rtl';
}
msg.firstElementChild.textContent = W.loading;
$('hint').textContent = W.hintMouse;
canvas.setAttribute('aria-label', W.canvas);
$('reset').setAttribute('aria-label', W.reset);
$('reset').title = W.reset;

if (q.get('bg') === 'none') document.body.classList.add('clear');
if (q.get('ui') === '0') document.querySelector('.bar').hidden = true;

function say(title, text, link) {
  msg.hidden = false;
  msg.replaceChildren();
  const b = document.createElement('b');
  b.textContent = title;
  const s = document.createElement('span');
  s.textContent = text + ' ';
  msg.append(b, s);
  if (link) {
    const a = document.createElement('a');
    a.href = link; a.target = '_blank'; a.rel = 'noopener'; a.textContent = W.seeAll;
    msg.append(a);
  }
}

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let autoTurn = q.get('turn') !== '0' && !reduce.matches;

// A browser that cannot make a WebGL context (switched off, a blocked GPU) throws here, at the top of the module:
// the page then kept "Loading the model…" for ever (review of 16 Nov 2026). It says what happened instead, and stops.
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
} catch (err) {
  say(W.noGlTitle, W.noGlText, PAGE);
  throw err;
}
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);

// LIGHT: a sun from the upper left, a cool fill, and a soft studio environment so foil and metal read as metal.
// The environment is made here (a few glowing panels in a dark room, through PMREM): no HDR file to fetch.
scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x1a1410, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 2.6);
sun.position.set(-3, 4, 5);
scene.add(sun);
const rim = new THREE.DirectionalLight(0x9cc8ff, 0.9);
rim.position.set(4, -1, -4);
scene.add(rim);
{
  const room = new THREE.Scene();
  room.background = new THREE.Color(0x080a10);
  const panel = (color, intensity, pos, size) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); room.add(m);
  };
  panel(0xffffff, 6, [-4, 5, 4], [5, 3]);
  panel(0xbcd8ff, 2.5, [5, 1, -3], [4, 4]);
  panel(0xffd9b0, 1.6, [0, -5, 2], [6, 2]);
  panel(0xffffff, 1.2, [0, 2, -6], [8, 2]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.8;
  pmrem.dispose();
}

// THE ORBIT: yaw and pitch round the model's centre, distance in units of the radius that frames it.
const view = { yaw: 0.65, pitch: 0.28, dist: 2.6, radius: 1, centre: new THREE.Vector3() };
const HOME = { yaw: 0.65, pitch: 0.28, dist: 2.6 };
const clampPitch = (p) => Math.max(-1.45, Math.min(1.45, p));
const clampDist = (d) => Math.max(1.15, Math.min(HOME.dist * 4, d));

function place() {
  const r = view.radius * view.dist;
  camera.position.set(
    view.centre.x + r * Math.cos(view.pitch) * Math.sin(view.yaw),
    view.centre.y + r * Math.sin(view.pitch),
    view.centre.z + r * Math.cos(view.pitch) * Math.cos(view.yaw));
  camera.near = Math.max(view.radius * 0.01, r - view.radius * 4);
  camera.far = r + view.radius * 6;
  camera.updateProjectionMatrix();
  camera.lookAt(view.centre);
}

function takeCamera() {
  if (!autoTurn) return;
  autoTurn = false;
  syncTurnButton();
}

const pointers = new Map();
let pinch0 = 0, dist0 = 0;
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = view.dist;
  }
  takeCamera(); hint();
});
canvas.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  if (pointers.size === 1) {
    const h = canvas.clientHeight || 1;
    view.yaw -= ((e.clientX - p.x) / h) * Math.PI;
    view.pitch = clampPitch(view.pitch + ((e.clientY - p.y) / h) * Math.PI);
  }
  p.x = e.clientX; p.y = e.clientY;
  if (pointers.size === 2 && pinch0 > 0) {
    const [a, b] = [...pointers.values()];
    view.dist = clampDist(dist0 * pinch0 / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)));
  }
  wake();
});
const lift = (e) => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch0 = 0; };
canvas.addEventListener('pointerup', lift);
canvas.addEventListener('pointercancel', lift);
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  view.dist = clampDist(view.dist * Math.exp(Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120) * 0.0015));
  takeCamera(); hint(); wake();
}, { passive: false });
canvas.addEventListener('dblclick', () => reset());
canvas.addEventListener('keydown', (e) => {
  const step = 0.12;
  const keys = {
    ArrowLeft: () => { view.yaw += step; }, ArrowRight: () => { view.yaw -= step; },
    ArrowUp: () => { view.pitch = clampPitch(view.pitch + step); }, ArrowDown: () => { view.pitch = clampPitch(view.pitch - step); },
    '+': () => { view.dist = clampDist(view.dist / 1.12); }, '=': () => { view.dist = clampDist(view.dist / 1.12); },
    '-': () => { view.dist = clampDist(view.dist * 1.12); }, '0': () => reset(),
  };
  if (!keys[e.key]) return;
  e.preventDefault(); keys[e.key](); takeCamera(); wake();
});

function reset() {
  Object.assign(view, HOME);
  wake();
}
$('reset').addEventListener('click', reset);

const turnBtn = $('turn');
function syncTurnButton() {
  turnBtn.hidden = reduce.matches && !autoTurn;
  turnBtn.setAttribute('aria-pressed', String(autoTurn));
  turnBtn.setAttribute('aria-label', autoTurn ? W.stop : W.turn);
  turnBtn.title = autoTurn ? W.stop : W.turn;
  turnBtn.innerHTML = autoTurn
    ? '<svg viewBox="0 0 24 24"><path d="M9 6v12M15 6v12"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg>';
}
turnBtn.addEventListener('click', () => { autoTurn = !autoTurn; syncTurnButton(); wake(); });
reduce.addEventListener?.('change', () => { if (reduce.matches) autoTurn = false; syncTurnButton(); });

let hinted = false;
if (matchMedia('(pointer: coarse)').matches) $('hint').textContent = W.hintTouch;
function hint() { if (!hinted) { hinted = true; $('hint').classList.add('gone'); } }
setTimeout(hint, 6000);

// DRAWING only when something moves, and never off screen.
let visible = true, model = null, raf = 0, last = 0, inAR = false;
function resize() {
  const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
}
function frame(t) {
  raf = 0;
  if (!model || !visible || document.hidden || inAR) return;
  const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
  last = t;
  if (autoTurn) view.yaw += dt * 0.16;
  place();
  renderer.render(scene, camera);
  if (autoTurn) wake();
}
function wake() { if (!raf) raf = requestAnimationFrame(frame); }
// A lost context is asked back (preventDefault), and the picture is drawn again when it returns: the canvas used to
// stay blank until the reader moved it.
canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
canvas.addEventListener('webglcontextrestored', wake);
addEventListener('resize', () => { resize(); if (model) { const d = view.dist / HOME.dist; fit(model); view.dist = clampDist(HOME.dist * d); } wake(); });
document.addEventListener('visibilitychange', () => { last = 0; wake(); });
if ('IntersectionObserver' in window) {
  new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); last = 0; wake(); }).observe(canvas);
}

function fit(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  view.centre.copy(sphere.center);
  // The distance that puts the whole sphere inside the narrower of the two fields of view.
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * Math.max(0.5, camera.aspect));
  view.radius = sphere.radius || 1;
  HOME.dist = 0.96 / Math.sin(Math.min(vfov, hfov) / 2);
  view.dist = HOME.dist;
}

async function main() {
  syncTurnButton();
  resize();
  if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(id)) {
    say(W.noIdTitle, W.noIdText, PAGE);
    return;
  }
  // The catalog not arriving (offline, a server error, an answer that is not JSON) is not "no such model".
  let entry;
  try {
    const r = await fetch('./models.json');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    entry = (await r.json()).models[id];
  } catch {
    say(W.noCatTitle, W.noCatText, PAGE);
    return;
  }
  if (!entry) { say(W.notOursTitle, fill(W.notOursText, { id }), PAGE); return; }

  const name = $('name');
  const a = document.createElement('a');
  a.href = `${PAGE}${id}/`; a.target = '_blank'; a.rel = 'noopener'; a.textContent = entry.name;
  const small = document.createElement('small');
  small.textContent = W.credit;
  name.append(a, small);
  document.title = fill(W.docTitle, { name: entry.name });
  canvas.setAttribute('aria-label', fill(W.canvasNamed, { name: entry.name }));

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  try {
    const gltf = await loader.loadAsync(new URL(`../models/${entry.file}`, location.href).href);
    model = gltf.scene;
  } catch {
    say(W.noFileTitle, W.noFileText, PAGE);
    return;
  }
  scene.add(model);
  fit(model);
  msg.hidden = true;
  wake();
  room(entry);
}

// A short line where the hint was, gone after six seconds: AR that did not start is not a broken page.
function tell(text) {
  const h = $('hint');
  h.textContent = text;
  h.classList.remove('gone');
  setTimeout(() => h.classList.add('gone'), 6000);
}

// VIEW IN YOUR ROOM. Which button (or note) this device gets is arplan.js's arWay(); the session is ar.js's.
async function room(entry) {
  let xr = false;
  try { xr = !!(navigator.xr && await navigator.xr.isSessionSupported('immersive-ar')); } catch { xr = false; }
  const framed = window.top !== window.self;
  const policy = document.permissionsPolicy || document.featurePolicy;
  const allowed = policy?.allowsFeature ? policy.allowsFeature('xr-spatial-tracking') : true;
  const ua = navigator.userAgent || '';
  const way = arWay({ xr, framed, allowed, android: /Android/.test(ua), ios: isIOS(ua, navigator.platform, navigator.maxTouchPoints) });
  const wide = widest(new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()));
  const line = sizeLine('real', wide, entry.size_m);
  const sizeText = fill(W[line.key], { m: metres(line.m, LANG) });
  const dress = (el) => {
    el.prepend(icon('house', 20));
    el.querySelector('.ui-btn__label').textContent = W.ar;
    el.setAttribute('aria-label', W.ar);
    if (!el.title) el.title = W.ar;
    el.hidden = false;
  };
  if (way === 'webxr') {
    const btn = $('ar');
    dress(btn);
    btn.title = sizeText;
    const overlay = $('aroverlay');
    overlay.querySelector('[data-ar="done"]').textContent = W.arDone;
    overlay.querySelector('[data-ar="seg"]').setAttribute('aria-label', W.arSize);
    overlay.querySelector('[data-mode="real"]').textContent = W.arReal;
    overlay.querySelector('[data-mode="room"]').textContent = W.arRoom;
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      inAR = true;
      try {
        const { startAR } = await import('./ar.js');
        const r = await startAR({ renderer, scene, model, W, lang: LANG, sizeM: entry.size_m || null, overlay });
        if (!r.ok) tell(W.arFail);
      } catch {
        tell(W.arFail);
      } finally {
        inAR = false;
        btn.disabled = false;
        resize(); fit(model); wake();
      }
    });
    if (q.get('ar') === '1') btn.focus();
    return;
  }
  if (way === 'open-top') {
    const a = $('arout');
    a.href = topUrl(location.href);
    a.title = W.arOut;
    dress(a);
    return;
  }
  // A note, never a button that would fail: iPhone (no USDZ of ours yet), or a device without AR.
  const info = $('arinfo');
  const note = $('arnote');
  dress(info);
  $('arnote-t').textContent = W.arTitle;
  $('arnote-text').textContent = way === 'ios' ? W.arIos : W.arHow;
  $('arnote-size').textContent = sizeText;
  const close = $('arclose');
  close.append(icon('x', 20));
  close.setAttribute('aria-label', W.close);
  close.title = W.close;
  const show = (on) => {
    note.hidden = !on;
    info.setAttribute('aria-expanded', String(on));
    if (on) close.focus(); else info.focus();
  };
  info.addEventListener('click', () => show(note.hidden));
  close.addEventListener('click', () => show(false));
  note.addEventListener('keydown', (e) => { if (e.key === 'Escape') show(false); });
}

main();
