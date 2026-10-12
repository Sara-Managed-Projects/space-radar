// ui/scalebadge.js -- the scale lie made visible: "drawn ×N larger", and True size (public #296).
//
// Contract: createScaleBadge(ctx, opts) -> { root, refresh(), setTrue(on), isTrue(), destroy() }
// Also exported, pure, for tests/test_scalebadge.mjs:
//   trueDiscPx({ radiusKm, distKm, fovDeg, viewportH }) -> CSS px across, or NaN
//   dotFactor(markerPx, truePx) -> how many times wider than true the dot is (1 when the disc wins)
//   roundFactor(n) -> two significant figures, never under 1
//   scaleState({ worlds, markerPx, fovDeg, viewportH, selectedId }) -> null | { least, selected, largest }
//   badgeWords(state, trueOn, C) -> { text, title };  pxText(px) -> one significant figure
//
// WHY. On the Planets tab (the Sun's stage) every planet is drawn as a dot MARKER_PX across,
// because at true size from there every one of them is a fraction of a pixel
// (scene/orbitrings.js says so, with its measurements). The tab's list says "larger than they
// are" in words. The picture did not say BY HOW MUCH, and the picture is what gets shared.
//
// THE NUMBER IS COMPUTED, NEVER TYPED. The dot's width is orbitrings.js MARKER_PX; the planet's
// true width on the screen is its radius (scene/worlds.js WORLDS, registry/worlds.yaml) over its
// distance from the camera THIS FRAME, through the camera's own field of view. The factor is one
// over the other. It changes as the camera moves, and when a true disc outgrows its dot the
// factor is 1 and the planet is no longer counted: nothing is enlarged there (the dot is
// depth-tested behind the disc).
//
// WHICH NUMBER. With a planet selected, that planet's. With none, the LEAST of them ("at least
// ×N"): a statement that is true of every dot on the screen. Jupiter's is the least and
// Mercury's the most, and the range between them is two orders of magnitude; one honest floor
// reads better than a range nobody can hold.
//
// TRUE SIZE. The same button, pressed: the dots are put away (orbitRings.setDotScale(0)) and
// what is left is what is there, the paths and the names. The line then says what was lost: the
// widest planet's true width in pixels, computed the same way. Nothing is remembered: a
// reload draws the dots again, as a first visit does.
//
// Only on the Sun's stage, outside a trip (the trip frame prints its own orbits line) and not
// over a clear screen. Fetched the first time the Sun's stage is entered (main.js), never at boot.

import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.later.js';
import { loadCss } from './latercss.js';

const DEG = Math.PI / 180;
/** How long the dots take to shrink or grow, ms: the guide's --sr-slow. A cut under reduced motion. */
export const TWEEN_MS = 320;
const REFRESH_MS = 500;

/** A ball's true width on the screen, in CSS pixels, at the middle of the view. Pure. */
export function trueDiscPx({ radiusKm, distKm, fovDeg, viewportH } = {}) {
  if (!(radiusKm > 0) || !(distKm > 0) || !(fovDeg > 0) || !(viewportH > 0)) return NaN;
  if (distKm <= radiusKm) return Infinity;
  return ((2 * radiusKm) / distKm) * (viewportH / 2) / Math.tan((fovDeg * DEG) / 2);
}

/** How many times wider than the true disc a dot of `markerPx` is; 1 once the disc is the wider. */
export function dotFactor(markerPx, truePx) {
  if (!(markerPx > 0) || !(truePx > 0)) return NaN;
  return truePx >= markerPx ? 1 : markerPx / truePx;
}

/** Two significant figures (the camera's distance is not known to more), and never under 1. */
export function roundFactor(n) {
  if (!Number.isFinite(n) || n <= 1) return 1;
  const mag = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / mag) * mag;
}

/**
 * What the badge has to say. `worlds` is [{ id, name, radiusKm, distKm }], the camera's distance
 * to each. Null when no dot is wider than its planet. Pure.
 */
export function scaleState({ worlds = [], markerPx, fovDeg, viewportH, selectedId = null } = {}) {
  const rows = [];
  for (const w of Array.isArray(worlds) ? worlds : []) {
    if (!w || !w.id) continue;
    const truePx = trueDiscPx({ radiusKm: w.radiusKm, distKm: w.distKm, fovDeg, viewportH });
    const factor = dotFactor(markerPx, truePx);
    if (Number.isFinite(factor)) rows.push({ id: w.id, name: w.name || w.id, truePx, factor });
  }
  const enlarged = rows.filter((r) => r.factor > 1);
  if (!enlarged.length) return null;
  const least = enlarged.reduce((a, b) => (b.factor < a.factor ? b : a));
  const largest = rows.reduce((a, b) => (b.truePx > a.truePx ? b : a));
  const selected = enlarged.find((r) => r.id === selectedId) || null;
  return { least, selected, largest, count: enlarged.length };
}

/** "0.05", "0.3", "2": a width in pixels to one significant figure below 1, whole above. */
export function pxText(px) {
  if (!(px > 0)) return '';
  if (px >= 1) return fmt.num(px, 0);
  // Rounded to one figure FIRST, then printed with the decimals that figure needs: 0.0097 is
  // "0.01", not "0.010" (three decimals of a number known to one).
  const one = Number(px.toPrecision(1));
  if (one >= 1) return fmt.num(one, 0);
  const digits = Math.min(6, Math.max(1, -Math.floor(Math.log10(one))));
  return fmt.num(one, digits);
}

/** The button's words and its tooltip. Pure. `C` is COPY.scale. */
export function badgeWords(state, trueOn, C = COPY.scale) {
  if (!state) return { text: '', title: '' };
  if (trueOn) {
    return { text: t(C.trueLine, { name: state.largest.name, px: pxText(state.largest.truePx) }), title: C.trueTitle };
  }
  const row = state.selected || state.least;
  const n = fmt.int(roundFactor(row.factor));
  return {
    text: state.selected ? t(C.one, { name: row.name, n }) : t(C.least, { n }),
    title: C.title,
  };
}

function reducedMotion(win) {
  try { return !!(win && win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch { return false; }
}

/**
 * @param {Object} ctx  the app: stage, camera, cameraRig, worlds, orbitRings, selected(), trip
 * @param {{ ids: string[], markerPx: number, win?: Window }} opts  the planets the stage dots
 */
export function createScaleBadge(ctx, opts = {}) {
  const win = opts.win || window;
  const doc = win.document;
  const C = COPY.scale;
  const ids = Array.isArray(opts.ids) ? opts.ids : [];
  const markerPx = opts.markerPx;
  const root = document.createElement('button');
  root.type = 'button';
  root.className = 'sr-scalebadge sr-float';
  root.hidden = true;
  // Its rules come with it (css/finishers.css): shown only once they are here.
  let styled = false;
  loadCss('finishers', doc).then(() => { styled = true; refresh(); });
  root.setAttribute('aria-pressed', 'false');
  const label = doc.createElement('span');
  label.className = 'sr-scalebadge__text';
  root.appendChild(label);
  doc.body.appendChild(root);

  let trueOn = false;
  let raf = 0;
  let scale = 1;

  const worldRow = (id) => {
    const list = ctx.worlds && Array.isArray(ctx.worlds.worlds) ? ctx.worlds.worlds : [];
    return list.find((w) => w.id === id) || null;
  };

  /** The camera's distance to each planet now, km. */
  function measure() {
    const cam = ctx.camera;
    const unitKm = ctx.stage && ctx.stage.unitKm;
    if (!cam || !(unitKm > 0) || !ctx.worlds || typeof ctx.worlds.drawnPositionOf !== 'function') return [];
    const out = [];
    for (const id of ids) {
      const w = worldRow(id);
      const p = ctx.worlds.drawnPositionOf(id);
      if (!w || !p) continue;
      out.push({ id, name: w.display || id, radiusKm: w.radiusKm, distKm: p.distanceTo(cam.position) * unitKm });
    }
    return out;
  }

  const here = () => {
    const cls = doc.documentElement.classList;
    return !!ctx.stage && ctx.stage.worldId === 'sun' && !cls.contains('sr-trip-mode') && !cls.contains('sr-clean') && !cls.contains('sr-ambient');
  };

  function refresh() {
    if (!here()) {
      root.hidden = true;
      // Leaving the stage puts the dots back: True size is a look at this view, not a setting.
      if (trueOn) setTrue(false, { cut: true });
      return;
    }
    const sel = typeof ctx.selected === 'function' ? ctx.selected() : null;
    const state = scaleState({
      worlds: measure(), markerPx, fovDeg: ctx.camera.fov, viewportH: win.innerHeight, selectedId: sel ? sel.id : null,
    });
    const words = badgeWords(state, trueOn, C);
    root.hidden = !words.text || !styled;
    if (label.textContent !== words.text) label.textContent = words.text;
    if (root.title !== words.title) root.title = words.title;
  }

  function apply(k) {
    scale = k;
    if (ctx.orbitRings && typeof ctx.orbitRings.setDotScale === 'function') ctx.orbitRings.setDotScale(k);
  }

  function setTrue(on, { cut = false } = {}) {
    trueOn = !!on;
    root.setAttribute('aria-pressed', trueOn ? 'true' : 'false');
    root.classList.toggle('is-true', trueOn);
    const to = trueOn ? 0 : 1;
    if (raf) win.cancelAnimationFrame(raf);
    raf = 0;
    if (cut || reducedMotion(win) || typeof win.requestAnimationFrame !== 'function') { apply(to); return; }
    const from = scale;
    const t0 = win.performance.now();
    const step = (now) => {
      const u = Math.min(1, (now - t0) / TWEEN_MS);
      apply(from + (to - from) * (1 - (1 - u) ** 3));
      raf = u < 1 ? win.requestAnimationFrame(step) : 0;
    };
    raf = win.requestAnimationFrame(step);
  }

  root.addEventListener('click', () => { setTrue(!trueOn); refresh(); });
  const onAny = () => refresh();
  win.addEventListener('sr:stage', onAny);
  win.addEventListener('sr:select', onAny);
  const timer = win.setInterval(refresh, REFRESH_MS);
  refresh();

  return {
    root,
    refresh,
    setTrue,
    isTrue: () => trueOn,
    destroy() {
      win.clearInterval(timer);
      if (raf) win.cancelAnimationFrame(raf);
      win.removeEventListener('sr:stage', onAny);
      win.removeEventListener('sr:select', onAny);
      apply(1);
      root.remove();
    },
  };
}
