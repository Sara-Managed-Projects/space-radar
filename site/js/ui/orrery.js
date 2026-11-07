// ui/orrery.js -- the Planets tab's Size and Distance sliders (forge #145).
//
// Contract: createOrrery(ctx) -> { mount(host), view(), set({ size, dist }, opts), setSize(k), state(),
//                                  fromLink(st), frame(), destroy() }
// The arithmetic is scene/orrery.js (pure, tested); this file builds the two controls, hands the scene
// what they say (scene/orreryplace.js into scene/worlds.js setOrrery, scene/orbitrings.js invalidate) and keeps the address bar
// in step (`#size=`, `#dist=`, ui/urlstate.js).
//
// WHERE. In the Planets tab, under its list of worlds: the tab whose view (the Sun's stage) is the one
// the sliders draw. On a phone the tab is the sheet's content (ui/sheet.js), and a range input is one of
// the controls the sheet never takes a drag from (sheet.js ownsDrag), so the thumb moves under the
// finger at every height of the sheet. Each slider is a native <input type="range">: arrows, Page
// Up/Down, Home and End from the keyboard, and a screen reader hears its name and its value in words
// ("×120", "logarithmic") through aria-valuetext.
//
// WHAT IT CHANGES. Only the Sun's stage. Moved from another stage, a slider takes the camera there
// first (main.js ctx.setStage, ctx.frameSolarSystem), because a control that changes nothing on the
// screen is a control that seems broken. A trip draws everything true: while one runs the scene is
// handed null and the sliders wait, greyed, until it ends. The Distance slider's release re-frames the
// system (its outermost path has moved); the Size slider never moves the camera.
//
// HONEST AT EVERY POSITION. The badge (ui/scalebadge.js) computes its factor from what is drawn and adds
// the Sun's factor and the distance word on a second line; each world's card note (scene/worlds.js
// viewScale(id).note) is written here, from the numbers the scene placed it with.
//
// Never at boot: main.js fetches this the first time the Planets tab is opened, or a link carries
// `size=` or `dist=` (tests/test_orrery.mjs holds both). Its rules are css/worlds.css, which comes with it.

import * as THREE from '../../vendor/three.module.min.js';
import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.later.js';
import { loadCss } from './latercss.js';
import { write as writeUrl } from './urlstate.js';
import {
  SIZE_MAX, SIZE_STEPS, DIST_STEPS, sizeFromU, uFromSize, viewOf, sizeValue, distValue, parseSize, parseDist,
} from '../scene/orrery.js';
import { createPlacer } from '../scene/orreryplace.js';

const KM_PER_AU = 1.495978707e8;
/** The Classroom button: the largest size and the logarithmic distances, Solar System Scope's schematic end. */
export const CLASSROOM = { size: SIZE_MAX, dist: 1 };

/** A slider's value in words, for aria-valuetext and the readout beside it. Pure. `O` is COPY.orrery. */
export function sizeWords(k, O = COPY.orrery) {
  return k > 1 ? t(O.sizeValue, { n: fmt.int(k) }) : O.sizeTrue;
}
export function distWords(d, O = COPY.orrery) {
  if (!(d > 0)) return O.distTrue;
  if (d >= 1) return O.distLog;
  return t(O.distSome, { p: fmt.int(Math.round(d * 100)) });
}

/**
 * The card's note for a world the sliders moved or enlarged, from the numbers the scene used. Pure.
 * `info` is what scene/worlds.js hands over: { k, trueDistKm, drawnDistKm, around: { parent, offKm, drawnOffKm } | null }.
 */
export function noteFor(w, info, O = COPY.orrery) {
  if (!w || !info) return '';
  const name = w.display || w.id;
  const parts = [];
  if (w.id === 'sun') return info.k > 1 ? t(O.noteSun, { n: fmt.int(info.k) }) : '';
  if (info.k > 1) parts.push(t(O.noteSize, { name, n: fmt.int(info.k) }));
  const a = info.around;
  if (a && a.offKm > 0 && Math.abs(a.drawnOffKm / a.offKm - 1) > 1e-3) {
    parts.push(t(O.noteMoon, { parent: a.parent.display || a.parent.id, n: fmt.num(a.drawnOffKm / a.offKm, a.drawnOffKm / a.offKm < 10 ? 1 : 0) }));
  } else if (!a && info.trueDistKm > 0 && Math.abs(info.drawnDistKm / info.trueDistKm - 1) > 1e-3) {
    const au = (km) => fmt.num(km / KM_PER_AU, km < 10 * KM_PER_AU ? 2 : 1);
    parts.push(t(O.noteDist, { drawn: au(info.drawnDistKm), au: au(info.trueDistKm) }));
  }
  return parts.join(' ');
}

function el(doc, tag, className, text) {
  const n = doc.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
}

export function createOrrery(ctx, opts = {}) {
  const win = opts.win || window;
  const doc = win.document;
  const O = COPY.orrery;
  loadCss('worlds', doc);
  let size = 1;
  let dist = 0;
  let held = false; // a trip is running: the scene is handed null
  let root = null;
  let sizeIn = null; let distIn = null; let sizeOut = null; let distOut = null; let heldNote = null;

  const tripOn = () => doc.documentElement.classList.contains('sr-trip-mode');

  let view = null;

  function push() {
    view = held ? null : viewOf({ size, dist });
    const placer = view ? createPlacer(view, { THREE, stage: ctx.stage, note: (w, info) => noteFor(w, info, O) }) : null;
    if (ctx.worlds && typeof ctx.worlds.setOrrery === 'function') ctx.worlds.setOrrery(placer);
    if (ctx.orbitRings && typeof ctx.orbitRings.invalidate === 'function') ctx.orbitRings.invalidate();
    if (ctx.scaleBadge && typeof ctx.scaleBadge.refresh === 'function') ctx.scaleBadge.refresh();
  }

  function paint() {
    if (!root) return;
    const su = Math.round(uFromSize(size) * SIZE_STEPS);
    if (Number(sizeIn.value) !== su && sizeFromU(Number(sizeIn.value) / SIZE_STEPS) !== size) sizeIn.value = String(su);
    distIn.value = String(Math.round(dist * DIST_STEPS));
    sizeIn.setAttribute('aria-valuetext', sizeWords(size, O));
    distIn.setAttribute('aria-valuetext', distWords(dist, O));
    sizeOut.textContent = sizeWords(size, O);
    distOut.textContent = distWords(dist, O);
    sizeIn.disabled = held; distIn.disabled = held;
    heldNote.hidden = !held;
  }

  /** Bring the Sun's stage up when a slider moves elsewhere (the header says why). */
  function toSystem() {
    if (!ctx.stage || ctx.stage.worldId === 'sun' || tripOn()) return;
    if (typeof ctx.setStage === 'function' && ctx.setStage('sun') && typeof ctx.frameSolarSystem === 'function') ctx.frameSolarSystem();
  }

  function set(next = {}, { write = true, frame = false } = {}) {
    if (Number.isFinite(next.size)) size = next.size > 1 ? Math.min(SIZE_MAX, next.size) : 1;
    if (Number.isFinite(next.dist)) dist = Math.min(1, Math.max(0, next.dist));
    // Moving the Size slider off ×1 ends True size: the two are one control (ui/scalebadge.js).
    if (size > 1 && ctx.scaleBadge && ctx.scaleBadge.isTrue && ctx.scaleBadge.isTrue()) ctx.scaleBadge.setTrue(false, { cut: true });
    push();
    paint();
    if (write) writeUrl({ size: sizeValue(size), dist: distValue(dist) });
    if (frame && !held && ctx.stage && ctx.stage.worldId === 'sun' && typeof ctx.frameSolarSystem === 'function') {
      // The paths are rebuilt on the next frame; frame the system after it, from where they now are.
      win.requestAnimationFrame(() => win.requestAnimationFrame(() => ctx.frameSolarSystem()));
    }
  }

  function slider(id, label, title, max, onInput, onChange) {
    const row = el(doc, 'div', 'sr-orrery__row');
    const lab = el(doc, 'label', 'sr-orrery__label', label);
    lab.htmlFor = id;
    const out = el(doc, 'output', 'sr-orrery__value');
    out.htmlFor = id;
    out.setAttribute('aria-hidden', 'true'); // the input's own aria-valuetext says it
    const input = doc.createElement('input');
    input.type = 'range';
    input.id = id;
    input.className = 'sr-orrery__range';
    input.min = '0';
    input.max = String(max);
    input.step = '1';
    input.title = title;
    input.addEventListener('input', () => { toSystem(); onInput(Number(input.value)); });
    input.addEventListener('change', () => onChange(Number(input.value)));
    const head = el(doc, 'div', 'sr-orrery__head');
    head.append(lab, out);
    row.append(head, input);
    return { row, input, out };
  }

  function mount(host) {
    if (root || !host) return root;
    root = el(doc, 'section', 'sr-sect sr-orrery');
    root.setAttribute('aria-labelledby', 'sr-orrery-title');
    const h = el(doc, 'h2', 'sr-micro', O.title);
    h.id = 'sr-orrery-title';
    root.appendChild(h);
    const s = slider('sr-orrery-size', O.size, t(O.sizeTitle, { max: fmt.int(SIZE_MAX) }), SIZE_STEPS,
      (v) => set({ size: sizeFromU(v / SIZE_STEPS) }, { write: false }),
      (v) => set({ size: sizeFromU(v / SIZE_STEPS) }));
    const d = slider('sr-orrery-dist', O.dist, O.distTitle, DIST_STEPS,
      (v) => set({ dist: v / DIST_STEPS }, { write: false }),
      (v) => set({ dist: v / DIST_STEPS }, { frame: true }));
    sizeIn = s.input; sizeOut = s.out; distIn = d.input; distOut = d.out;
    root.append(s.row, d.row);
    const presets = el(doc, 'div', 'sr-orrery__presets');
    presets.setAttribute('role', 'group');
    presets.setAttribute('aria-label', O.presets);
    const preset = (text, title, to) => {
      const b = el(doc, 'button', 'sr-btn sr-btn--quiet sr-orrery__preset', text);
      b.type = 'button';
      b.title = title;
      b.addEventListener('click', () => { toSystem(); set(to, { frame: true }); });
      presets.appendChild(b);
    };
    preset(O.presetTrue, O.presetTrueTitle, { size: 1, dist: 0 });
    preset(O.presetClass, t(O.presetClassTitle, { n: fmt.int(CLASSROOM.size) }), CLASSROOM);
    root.appendChild(presets);
    heldNote = el(doc, 'p', 'sr-sect__note', O.held);
    heldNote.hidden = true;
    root.appendChild(heldNote);
    root.appendChild(el(doc, 'p', 'sr-sect__note', O.note));
    host.appendChild(root);
    paint();
    return root;
  }

  /**
   * A link's `size=` and `dist=` (ui/urlstate.js): the Sun's stage, framed, at those settings. A value that
   * is not one is dropped from the address bar and the rest of the link still applies.
   */
  function fromLink(st = {}) {
    const k = st.size !== undefined ? parseSize(st.size) : 1;
    const d = st.dist !== undefined ? parseDist(st.dist) : 0;
    toSystem();
    set({ size: k === null ? 1 : k, dist: d === null ? 0 : d }, { frame: true });
  }

  /** Once a frame from main.js: a trip that starts or ends hands the scene null or the sliders' view. */
  function frame() {
    const h = tripOn();
    if (h === held) return;
    held = h;
    push();
    paint();
  }

  return {
    mount,
    set,
    view: () => view,
    setSize: (k) => set({ size: k }),
    fromLink,
    state: () => ({ size, dist, held }),
    frame,
    destroy() {
      if (ctx.worlds && ctx.worlds.setOrrery) ctx.worlds.setOrrery(null);
      if (root) root.remove();
      root = null;
    },
  };
}
