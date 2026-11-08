// ui/cutaway.js -- Look inside: a world opened to its layers, and a probe that reads down to the centre
// (forge #144).
//
// Contract: createCutaway(ctx, { scene }) -> { open(id), close(), isOpen(), openId(), fromLink(value),
//                                             frame(t), destroy() }
// Pure, for tests/test_cutaway.mjs: KIND_COLOUR, interiorOf(id), layerAt(world, depthKm),
//   probeAt(world, depthKm) -> { layer, index, share, pressure, temperature, density } | null,
//   between(a, b, f), pressureText(gpa), temperatureText(k), densityText(gcc), depthText(km)
//
// WHAT IT SAYS. A panel beside the opened world lists its layers top down, each with its depth range,
// the word for how that depth is known (measured, modelled, inferred) and, on hover and on focus, the
// source it was read from (registry/interiors.yaml). Under the list is the probe: a Depth slider from the
// surface to the centre, which draws an ember line on the cut at that depth and reads out the layer,
// the pressure, the temperature and the density there, each with how that quantity is known for this
// world. A layer pressed moves the probe to its middle, and the source of the layer under the probe is written
// out under the list, so a finger that cannot hover reads it too.
//
// HOW IT IS DRAWN. scene/cutaway.js, one shader for every world; this file takes the world's own mesh
// off the screen while it is open (its layer mask and its children's set to 0, put back exactly on
// close; scene/worlds.js keeps placing it and keeps fetching its maps), except its rings, which stay.
//
// WHERE. On the world's own stage: open() takes the camera there (main.js ctx.setStage, which frames
// it) if it is elsewhere. Leaving that stage, or a trip starting, closes it. `#cut=<id>` opens it from a
// link (ui/urlstate.js) and is written while it is open.
//
// Phones: the panel sits under the top bar, its list scrolls inside a fixed height, every control is
// 44 px tall (css/worlds.css). Keyboard: the panel is a region with a heading; Escape closes it; the
// probe is a native range input with its depth in words. Reduced motion: the wedge appears open.
// Never at boot: main.js fetches this with the first Look inside or a `cut=` link.

import * as THREE from '../../vendor/three.module.min.js';
import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.later.js';
import { loadCss } from './latercss.js';
import { write as writeUrl } from './urlstate.js';
import { INTERIORS } from '../data/interiors.js';
import { createCut } from '../scene/cutaway.js';

/** How long the wedge takes to open, ms: the guide's --sr-slow, twice. A cut under reduced motion. */
export const OPEN_MS = 640;
/** The probe's travel, in steps of the radius. */
export const PROBE_STEPS = 1000;

/**
 * The colours of the faces, by kind of layer: CHOSEN, not measured (the panel says so). Iron warm and
 * lighter the deeper and hotter it is, rock browns, ice pale, water blue, hydrogen beige to violet as it
 * turns metallic, the Sun's zones by heat.
 */
export const KIND_COLOUR = {
  crust: 0x8a6a4f, mantle: 0xc0533a, 'upper-mantle': 0xd2683f, 'lower-mantle': 0xa8432f,
  'outer-core': 0xf0a13c, 'inner-core': 0xffe08a, 'liquid-core': 0xf0a13c, 'iron-core': 0xe8963a,
  'molten-silicate': 0xff6f3a, 'partial-melt': 0xd9603b,
  'ice-shell': 0xdfeefa, ocean: 0x2f6fb0, 'hp-ice': 0x9fc6e0,
  'rock-mantle': 0x8d6b55, 'rock-core': 0x7a5a48, 'hydrated-core': 0x6e6a5a,
  molecular: 0xd8c39a, metallic: 0x8f7bb8, 'dilute-core': 0x6b5a8c, 'ice-mantle': 0x4fa3a8,
  convective: 0xffb347, radiative: 0xff7a1f, 'solar-core': 0xfff1b8,
};

const BY_ID = new Map(INTERIORS.map((w) => [w.id, w]));

/** The interior row of a world, or null. Pure. */
export function interiorOf(id) { return BY_ID.get(id) || null; }

/** The index of the layer at a depth (km below the mean surface), or -1. Pure. */
export function layerAt(world, depthKm) {
  if (!world || !Array.isArray(world.layers) || !(depthKm >= 0) || depthKm > world.radius_km) return -1;
  const i = world.layers.findIndex((l) => depthKm >= l.top_km && depthKm < l.bottom_km);
  return i >= 0 ? i : world.layers.length - 1; // the centre itself belongs to the last
}

/**
 * Between a layer's top value `a` and bottom value `b`, a share `f` of the way down. Straight for most;
 * geometric when the two are more than a factor of ten apart (the Sun's densities run from 2e-7 to 0.2
 * g/cm3 through its convection zone, and a straight line would put nearly all of it at the bottom). Pure.
 */
export function between(a, b, f) {
  const u = Math.min(1, Math.max(0, f));
  if (a > 0 && b > 0 && (b / a > 10 || a / b > 10)) return a * (b / a) ** u;
  return a + (b - a) * u;
}

/** What the probe reads at a depth: the layer, and each quantity read between its top and bottom. Pure. */
export function probeAt(world, depthKm) {
  const index = layerAt(world, depthKm);
  if (index < 0) return null;
  const layer = world.layers[index];
  const f = (depthKm - layer.top_km) / (layer.bottom_km - layer.top_km);
  return {
    layer,
    index,
    share: 1 - depthKm / world.radius_km,
    pressure: between(layer.p_gpa[0], layer.p_gpa[1], f),
    temperature: between(layer.t_k[0], layer.t_k[1], f),
    density: between(layer.rho[0], layer.rho[1], f),
  };
}

/** Two significant figures, the most any of these numbers is known to. */
const two = (v) => Number(v.toPrecision(2));
const SUPER = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
/** 2e-7 as "2 × 10⁻⁷". Pure. */
function sci(v) {
  const e = Math.floor(Math.log10(v));
  const m = two(v / 10 ** e);
  const exp = String(e).split('').map((c) => SUPER[c] || c).join('');
  return `${fmt.num(m, m % 1 ? 1 : 0)} × 10${exp}`;
}
/** Two figures, printed with the decimals they need and no more: 0.6, 2.4, 150, 0.0025. */
const num = (v) => { const x = two(v); return fmt.num(x, Math.min(6, (String(x).split('.')[1] || '').length)); };

/** A pressure in GPa as a person reads it: kPa or MPa near a surface, millions of GPa in the Sun. Pure. */
export function pressureText(gpa, U = COPY.cutaway.units) {
  if (!(gpa > 0)) return t(U.gpa, { n: fmt.int(0) });
  if (gpa < 1e-4) return t(U.kpa, { n: num(gpa * 1e6) });
  if (gpa < 0.1) return t(U.mpa, { n: num(gpa * 1e3) });
  if (gpa >= 1e6) return t(U.millionGpa, { n: num(gpa / 1e6) });
  return t(U.gpa, { n: gpa >= 100 ? fmt.int(two(gpa)) : num(gpa) });
}
/** A temperature in kelvin: whole below a million, millions above. Pure. */
export function temperatureText(k, U = COPY.cutaway.units) {
  if (!(k > 0)) return '';
  if (k >= 1e6) return t(U.millionK, { n: num(k / 1e6) });
  return t(U.k, { n: fmt.int(k >= 1000 ? two(k) : Math.round(k)) });
}
/** A density in g/cm3: two figures, or a power of ten below a hundredth. Pure. */
export function densityText(gcc, U = COPY.cutaway.units) {
  if (!(gcc > 0)) return '';
  return t(U.rho, { n: gcc < 0.01 ? sci(gcc) : num(gcc) });
}
/** A depth in km, to a whole km below 10 000 and three figures above. Pure. */
export function depthText(km) {
  return fmt.int(km >= 10000 ? Number(km.toPrecision(3)) : Math.round(km));
}

function el(doc, tag, className, text) {
  const n = doc.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
}

function reducedMotion(win) {
  try { return !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch { return false; }
}

export function createCutaway(ctx, opts = {}) {
  const win = opts.win || window;
  const doc = win.document;
  const C = COPY.cutaway;
  loadCss('worlds', doc);
  let id = null;
  let world = null;
  let cut = null;
  let mesh = null;
  let panel = null;
  let probe = null;
  let readout = null;
  let rows = [];
  let layerSrc = null; // the probed layer's source, in words, for a finger that cannot hover
  let openedAt = 0;
  const masks = new Map(); // object -> the layer mask it had
  const _cam = new THREE.Vector3();
  const _sun = new THREE.Vector3();

  /** Take the world's own drawing off the screen, all but its rings and the cut; again for anything added since. */
  function hide() {
    if (!mesh) return;
    const ring = mesh.userData && mesh.userData.ring;
    const skip = new Set();
    if (ring) ring.traverse((o) => skip.add(o));
    if (cut) cut.group.traverse((o) => skip.add(o));
    mesh.traverse((o) => {
      if (skip.has(o) || masks.has(o)) return;
      masks.set(o, o.layers.mask);
      o.layers.mask = 0;
    });
  }
  function unhide() {
    for (const [o, mask] of masks) o.layers.mask = mask;
    masks.clear();
  }

  function honest(cls) { return (C.cls && C.cls[cls]) || cls; }

  function paintProbe() {
    if (!world || !probe) return;
    const depth = (Number(probe.value) / PROBE_STEPS) * world.radius_km;
    const at = probeAt(world, depth);
    const words = depth >= world.radius_km ? C.atCentre : t(C.depth, { km: depthText(depth) });
    probe.setAttribute('aria-valuetext', words);
    if (!at) return;
    cut.setProbe(at.share);
    cut.setHighlight(at.index);
    rows.forEach((r, i) => r.classList.toggle('is-probed', i === at.index));
    layerSrc.textContent = t(C.clsTitle, { cls: honest(at.layer.cls), source: at.layer.source });
    const v = world.values || {};
    const line = (key, value, cls) => {
      const row = readout.querySelector(`[data-q="${key}"]`);
      row.textContent = cls ? t(C.valueCls, { value, cls: honest(cls) }) : value;
    };
    line('depth', words);
    line('layer', C.kinds[at.layer.kind] || at.layer.kind, at.layer.cls);
    line('pressure', pressureText(at.pressure), v.pressure);
    line('temperature', temperatureText(at.temperature), v.temperature);
    line('density', densityText(at.density), v.density);
  }

  function buildPanel(name) {
    panel = el(doc, 'section', 'sr-cutaway sr-float');
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', 'sr-cutaway-title');
    panel.tabIndex = -1;
    const head = el(doc, 'div', 'sr-cutaway__head');
    const h = el(doc, 'h2', 'sr-cutaway__title', t(C.title, { name }));
    h.id = 'sr-cutaway-title';
    const x = el(doc, 'button', 'sr-btn sr-btn--quiet sr-cutaway__close', '×');
    x.type = 'button';
    x.setAttribute('aria-label', C.close);
    x.title = C.close;
    x.addEventListener('click', () => close());
    head.append(h, x);
    panel.appendChild(head);
    const model = el(doc, 'p', 'sr-cutaway__model');
    model.append(t(C.model, { model: world.model }), ' ');
    const a = el(doc, 'a', 'sr-cutaway__src', C.source);
    a.href = world.source.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = world.source.name;
    model.appendChild(a);
    panel.appendChild(model);
    const list = el(doc, 'ol', 'sr-cutaway__layers');
    list.setAttribute('aria-label', C.layers);
    rows = world.layers.map((l, i) => {
      const li = el(doc, 'li', 'sr-cutaway__layer');
      const b = el(doc, 'button', 'sr-cutaway__layerbtn');
      b.type = 'button';
      const sw = el(doc, 'span', 'sr-cutaway__swatch');
      sw.style.background = `#${(KIND_COLOUR[l.kind] || 0x808080).toString(16).padStart(6, '0')}`;
      sw.setAttribute('aria-hidden', 'true');
      const nm = el(doc, 'span', 'sr-cutaway__name', C.kinds[l.kind] || l.kind);
      const range = l.bottom_km >= world.radius_km
        ? t(C.toCentre, { top: depthText(l.top_km) })
        : t(C.depthRange, { top: depthText(l.top_km), bottom: depthText(l.bottom_km) });
      const rg = el(doc, 'span', 'sr-cutaway__range', range);
      const cl = el(doc, 'span', `sr-cutaway__cls is-${l.cls}`, honest(l.cls));
      b.append(sw, nm, rg, cl);
      // The source on hover and on focus: the title for a pointer, the description for a screen reader.
      b.title = t(C.clsTitle, { cls: honest(l.cls), source: l.source });
      b.setAttribute('aria-description', l.source);
      b.addEventListener('click', () => {
        probe.value = String(Math.round((((l.top_km + l.bottom_km) / 2) / world.radius_km) * PROBE_STEPS));
        paintProbe();
      });
      b.dataset.layer = String(i);
      li.appendChild(b);
      list.appendChild(li);
      return b;
    });
    panel.appendChild(list);
    layerSrc = el(doc, 'p', 'sr-cutaway__layersrc');
    panel.appendChild(layerSrc);
    const pr = el(doc, 'div', 'sr-cutaway__probe');
    const lab = el(doc, 'label', 'sr-cutaway__probelabel', C.probe);
    lab.htmlFor = 'sr-cutaway-probe';
    probe = doc.createElement('input');
    probe.type = 'range';
    probe.id = 'sr-cutaway-probe';
    probe.className = 'sr-cutaway__range';
    probe.min = '0';
    probe.max = String(PROBE_STEPS);
    probe.step = '1';
    probe.value = String(Math.round(PROBE_STEPS * 0.02));
    probe.title = C.probeTitle;
    probe.addEventListener('input', paintProbe);
    pr.append(lab, probe);
    readout = el(doc, 'dl', 'sr-cutaway__read');
    readout.setAttribute('aria-live', 'polite');
    for (const key of ['depth', 'layer', 'pressure', 'temperature', 'density']) {
      readout.appendChild(el(doc, 'dt', '', C[key === 'depth' ? 'probe' : key]));
      const dd = el(doc, 'dd', '');
      dd.dataset.q = key;
      readout.appendChild(dd);
    }
    pr.appendChild(readout);
    panel.appendChild(pr);
    panel.appendChild(el(doc, 'p', 'sr-sect__note', C.note));
    panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
    doc.body.appendChild(panel);
    doc.documentElement.classList.add('sr-cutaway-open');
  }

  function open(nextId, { write = true } = {}) {
    const row = interiorOf(nextId);
    if (!row) {
      if (ctx.sceneNote && typeof ctx.sceneNote.say === 'function') ctx.sceneNote.say(C.unknown);
      writeUrl({ cut: '' });
      return false;
    }
    if (id === nextId && cut) return true;
    close({ write: false });
    if (ctx.stage && ctx.stage.worldId !== nextId && typeof ctx.setStage === 'function') ctx.setStage(nextId);
    const m = ctx.worlds && typeof ctx.worlds.meshFor === 'function' ? ctx.worlds.meshFor(nextId) : null;
    if (!m) return false;
    const w = (ctx.worlds.worlds || []).find((x) => x.id === nextId) || { display: nextId, look: {} };
    id = nextId;
    world = row;
    mesh = m;
    cut = createCut(THREE, mesh, {
      layers: world.layers,
      radiusKm: world.radius_km,
      colours: world.layers.map((l) => KIND_COLOUR[l.kind]),
      tint: w.look && w.look.tint,
      emissive: !!(w.look && w.look.emissive),
    });
    hide();
    openedAt = win.performance.now();
    cut.setOpen(reducedMotion(win) ? 1 : 0);
    buildPanel(w.display || nextId);
    paintProbe();
    if (write) writeUrl({ cut: id });
    win.dispatchEvent(new CustomEvent('sr:cutaway', { detail: { id } }));
    return true;
  }

  function close({ write = true } = {}) {
    if (cut) cut.dispose();
    unhide();
    if (panel) panel.remove();
    doc.documentElement.classList.remove('sr-cutaway-open');
    cut = null; mesh = null; panel = null; probe = null; readout = null; rows = []; world = null; layerSrc = null;
    const was = id;
    id = null;
    if (write && was) writeUrl({ cut: '' });
  }

  /** Once a frame from main.js: the wedge turned to the camera, opening, and closed if the view moved on. */
  function frame() {
    if (!cut) return;
    const tripOn = doc.documentElement.classList.contains('sr-trip-mode');
    if (tripOn || !ctx.stage || ctx.stage.worldId !== id) { close(); return; }
    const u = Math.min(1, (win.performance.now() - openedAt) / OPEN_MS);
    if (u < 1) cut.setOpen(1 - (1 - u) ** 3);
    else cut.setOpen(1);
    hide();
    ctx.camera.getWorldPosition(_cam);
    const sunMesh = ctx.worlds.meshFor('sun');
    if (sunMesh && id !== 'sun') sunMesh.getWorldPosition(_sun); else _sun.copy(_cam);
    cut.update(_cam, _sun);
  }

  /** `#cut=<id>` from a link: once the layers have landed the world is there to open. */
  function fromLink(value) {
    const want = String(value || '').trim().toLowerCase();
    if (!want || want === '0') { close(); return; }
    open(want, { write: false });
  }

  return {
    open, close, frame, fromLink,
    isOpen: () => !!cut,
    openId: () => id,
    destroy() { close({ write: false }); },
  };
}
